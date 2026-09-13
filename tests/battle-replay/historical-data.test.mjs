import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  adaptLegacyHistoricalCatalog,
  adaptLegacySources,
  adaptLegacySourceRegistry,
  evaluateVerticalSliceGate,
  HistoricalDataValidator,
  selectFirstQualifiedHistoricalEvent,
} from '../../node_modules/.cache/battle-replay/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packageDirectory = path.join(root, 'data', 'battles', 'guningtou-1949');
const readJson = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const readPackage = key => readJson(path.join(packageDirectory, key));

function currentHistoricalBundle() {
  const manifest = readPackage('manifest.json');
  const sourceCatalog = readJson(path.join(root, 'data', 'sources.json'));
  return {
    manifest,
    packageData: {
      battle: readPackage('battle.json'),
      phases: readPackage('phases.json'),
      factions: readPackage('factions.json'),
      formations: readPackage('formations.json'),
      units: readPackage('units.json'),
      commanders: readPackage('commanders.json'),
      locations: readPackage('locations.geojson').features,
      routes: readPackage('routes.geojson').features,
      battleAreas: readPackage('battle-areas.geojson').features,
      events: readPackage('events.json'),
      evidence: readPackage('evidence.json'),
      sources: adaptLegacySources(sourceCatalog),
      perspectives: readPackage('perspectives.json'),
      uncertainties: readPackage('uncertainties.json'),
      media: readPackage('media.json'),
      cameraCues: readPackage('camera-cues.json'),
    },
    sourceRegistry: adaptLegacySourceRegistry(sourceCatalog),
    claims: readPackage('historical-claims.json'),
    evidenceMatrix: readPackage('evidence-matrix.json'),
    routeAudit: readPackage('route-audit.json'),
    researchGaps: readPackage('research-gaps.json'),
  };
}

test('V1.2 historical package supplements validate without promoting incomplete evidence', () => {
  const bundle = currentHistoricalBundle();
  const report = new HistoricalDataValidator().validate(bundle);

  assert.equal(report.valid, true);
  assert.equal(report.errors, 0);
  assert.deepEqual(report.counts, {
    sources: 38,
    claims: 13,
    evidenceRows: 5,
    routeAuditRows: 12,
    researchGaps: 9,
  });

  const selection = selectFirstQualifiedHistoricalEvent(bundle.evidenceMatrix);
  assert.equal(selection.selected, undefined);
  assert.deepEqual(selection.qualifiedEventIds, []);
  assert.ok(selection.evaluations.every(result => result.pass === false));
});

test('Evidence Gate checks explicit dimensions and does not average away a missing Location', () => {
  const row = currentHistoricalBundle().evidenceMatrix[0];
  const result = evaluateVerticalSliceGate(row);

  assert.equal(result.pass, false);
  assert.deepEqual(result.failures, ['location', 'unit']);
  assert.equal(result.presentation, 'blocked');

  const staticContextRow = {
    ...row,
    dimensions: {
      ...row.dimensions,
      event: { ...row.dimensions.event, level: 'SUPPORTED' },
      time: { ...row.dimensions.time, level: 'SUPPORTED' },
      location: { ...row.dimensions.location, level: 'SUPPORTED' },
      unit: { ...row.dimensions.unit, level: 'SUPPORTED' },
    },
    routePresentation: 'static-context-only',
  };
  const staticResult = evaluateVerticalSliceGate(staticContextRow);
  assert.equal(staticResult.pass, true);
  assert.equal(staticResult.presentation, 'static-context-only');
  assert.deepEqual(evaluateVerticalSliceGate(staticContextRow, { requireRoute: true }).failures, ['route']);
});

test('Legacy adapter preserves the migration boundary and promotes zero routes', () => {
  const input = {
    poi: readJson(path.join(root, 'data', 'poi.json')),
    sources: readJson(path.join(root, 'data', 'sources.json')),
    units: readJson(path.join(root, 'data', 'unit_index.json')),
    events: readJson(path.join(root, 'data', 'events.json')),
    timeline: readJson(path.join(root, 'data', 'timeline.json')),
    routes: readJson(path.join(root, 'data', 'route_database.json')),
  };
  const result = adaptLegacyHistoricalCatalog(input);

  assert.equal(result.sourceRegistry.length, 38);
  assert.equal(result.adapted.units, 25);
  assert.equal(result.adapted.events, 30);
  assert.equal(result.adapted.promotedRoutes, 0);
  assert.equal(result.migration.promotionPolicy, 'explicit-review-only');
  assert.ok(result.issues.some(issue => issue.code === 'LEGACY_ROUTES_RETAINED_AS_TOPOLOGY'));
});

test('HistoricalDataValidator rejects a canonical claim with a broken reference', () => {
  const bundle = currentHistoricalBundle();
  const invalid = {
    ...bundle,
    claims: [...bundle.claims, {
      ...bundle.claims[0],
      id: 'CLM-BROKEN-REFERENCE',
      subjectNamespace: 'canonical',
      subjectType: 'event',
      subjectId: 'EVENT-DOES-NOT-EXIST',
    }],
  };
  const report = new HistoricalDataValidator().validate(invalid);

  assert.equal(report.valid, false);
  assert.ok(report.diagnostics.some(diagnostic => diagnostic.code === 'HISTORICAL_CLAIM_SUBJECT_BROKEN'));
});

test('HistoricalDataValidator catches circular parent units', () => {
  const bundle = currentHistoricalBundle();
  const invalid = {
    ...bundle,
    packageData: {
      ...bundle.packageData,
      units: [
        { id: 'U-CYCLE-A', parentUnitId: 'U-CYCLE-B' },
        { id: 'U-CYCLE-B', parentUnitId: 'U-CYCLE-A' },
      ],
    },
  };
  const report = new HistoricalDataValidator().validate(invalid);

  assert.equal(report.valid, false);
  assert.ok(report.diagnostics.some(diagnostic => diagnostic.code === 'CIRCULAR_PARENT_UNIT'));
});
