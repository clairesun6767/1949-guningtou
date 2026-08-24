import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { adaptLegacyBattlefieldData, adaptLegacySources } from '../node_modules/.cache/battle-replay/adapters/legacy/index.js';
import { validateBattlePackage, validateGeospatialCalibration } from '../node_modules/.cache/battle-replay/validation/index.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, '..');
const packageDirectory = path.join(root, 'data', 'battles', 'guningtou-1949');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listLegacyJsonFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'battles' ? [] : listLegacyJsonFiles(absolute);
    }
    return entry.isFile() && entry.name.endsWith('.json') ? [absolute] : [];
  });
}

function loadCanonicalPackage() {
  const manifest = readJson(path.join(packageDirectory, 'manifest.json'));
  const load = key => readJson(path.join(packageDirectory, manifest.files[key]));
  const sourceCatalogPath = path.resolve(packageDirectory, manifest.sourceCatalog.path);
  const sources = adaptLegacySources(readJson(sourceCatalogPath));
  return {
    manifest,
    calibration: {
      groundControlPoints: load('groundControlPoints'),
      imagery: load('imageryGeoreferencing'),
    },
    data: {
      battle: load('battle'),
      phases: load('phases'),
      factions: load('factions'),
      formations: load('formations'),
      units: load('units'),
      commanders: load('commanders'),
      locations: load('locations').features,
      routes: load('routes').features,
      battleAreas: load('battleAreas').features,
      events: load('events'),
      evidence: load('evidence'),
      sources,
      perspectives: load('perspectives'),
      uncertainties: load('uncertainties'),
      media: load('media'),
      cameraCues: load('cameraCues'),
    },
  };
}

function loadLegacyAdapterReport() {
  const dataDirectory = path.join(root, 'data');
  const files = listLegacyJsonFiles(dataDirectory);
  const parseFailures = [];
  for (const file of files) {
    try {
      readJson(file);
    } catch (error) {
      parseFailures.push({ file: path.relative(root, file), message: error.message });
    }
  }
  const input = {
    poi: readJson(path.join(dataDirectory, 'poi.json')),
    sources: readJson(path.join(dataDirectory, 'sources.json')),
    units: readJson(path.join(dataDirectory, 'unit_index.json')),
    events: readJson(path.join(dataDirectory, 'events.json')),
    timeline: readJson(path.join(dataDirectory, 'timeline.json')),
    routes: readJson(path.join(dataDirectory, 'route_database.json')),
  };
  const adapted = adaptLegacyBattlefieldData(input);
  return {
    filesInspected: files.length,
    parseFailures,
    adaptedCounts: {
      sources: adapted.sources.length,
      locations: adapted.locations.length,
      factions: adapted.factions.length,
      units: adapted.units.length,
      events: adapted.events.length,
      topologicalConnections: adapted.topologicalConnections.length,
      promotedRoutes: adapted.routes.length,
    },
    unresolvedReferences: adapted.unresolvedReferences,
    issues: adapted.issues,
  };
}

const { manifest, calibration, data } = loadCanonicalPackage();
const validation = validateBattlePackage(data, manifest);
const calibrationValidation = validateGeospatialCalibration(
  calibration.groundControlPoints,
  calibration.imagery,
  new Set(data.sources.map(source => source.id)),
);
const legacy = loadLegacyAdapterReport();
const result = {
  packageId: manifest.packageId,
  schemaVersion: manifest.schemaVersion,
  validation,
  calibrationValidation,
  legacy,
};

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  console.log(`Battle package: ${result.packageId} (schema ${result.schemaVersion})`);
  console.log(`Quality: ${validation.qualityStatus}; errors=${validation.errors}, warnings=${validation.warnings}, info=${validation.info}`);
  console.log(`Calibration: ${calibrationValidation.qualityStatus}; errors=${calibrationValidation.errors}, warnings=${calibrationValidation.warnings}, GCPs=${calibration.groundControlPoints.controlPoints.length}`);
  console.log(`Legacy JSON: ${legacy.filesInspected} parsed, failures=${legacy.parseFailures.length}`);
  console.log(`Adapter: ${JSON.stringify(legacy.adaptedCounts)}`);
  console.log(`Unresolved entities: ${validation.unresolvedEntityIds.join(', ') || 'none'}`);
  console.log(`Unverified coordinates: ${validation.unverifiedCoordinateIds.join(', ') || 'none'}`);
  console.log(`Unresolved legacy references: ${legacy.unresolvedReferences.join(', ') || 'none'}`);
  for (const diagnostic of validation.diagnostics) {
    console.log(`${diagnostic.severity} [${diagnostic.domain}/${diagnostic.code}] ${diagnostic.entityId ? `${diagnostic.entityId}: ` : ''}${diagnostic.message}`);
  }
  for (const diagnostic of calibrationValidation.diagnostics) {
    console.log(`${diagnostic.severity} [calibration/${diagnostic.code}] ${diagnostic.entityId ? `${diagnostic.entityId}: ` : ''}${diagnostic.message}`);
  }
  for (const failure of legacy.parseFailures) {
    console.log(`ERROR [legacy/JSON_PARSE_FAILED] ${failure.file}: ${failure.message}`);
  }
}

if (!validation.valid || !calibrationValidation.valid || legacy.parseFailures.length > 0) process.exitCode = 1;
