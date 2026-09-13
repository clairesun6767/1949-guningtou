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
    humanReviewQueue: readPackage('human-review-queue.json'),
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
    humanReviewQueue: 9,
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

test('V1.3 evidence matrix preserves the audit trail without changing qualification', () => {
  const bundle = currentHistoricalBundle();

  for (const row of bundle.evidenceMatrix) {
    assert.ok(row.claimIds.length > 0);
    assert.ok(Array.isArray(row.conflicts));
    assert.ok(row.gapIds.length > 0);
    assert.deepEqual(row.v1_3, {
      event: row.dimensions.event.level,
      time: row.dimensions.time.level,
      location: row.dimensions.location.level,
      unit: row.dimensions.unit.level,
      route: row.dimensions.route.level,
      qualification: row.gateStatus,
    });
    assert.ok(row.humanDecisionRef.length > 0);
    assert.equal(row.v1_2.qualification, 'BLOCKED');
    assert.equal(row.v1_3.qualification, 'BLOCKED');
  }
  assert.ok(bundle.routeAudit.every(route => route.enabled === false));
});

test('partial, unsupported, and disputed dimensions cannot qualify; all supported dimensions can', () => {
  const row = currentHistoricalBundle().evidenceMatrix[0];
  const baseDimensions = Object.fromEntries(Object.entries(row.dimensions).map(([key, dimension]) => [
    key,
    { ...dimension, level: 'SUPPORTED' },
  ]));
  const fullySupported = evaluateVerticalSliceGate({
    ...row,
    dimensions: baseDimensions,
    routePresentation: 'exact-route-animation',
  });
  assert.equal(fullySupported.pass, true);
  assert.deepEqual(fullySupported.failures, []);

  for (const level of ['PARTIAL', 'NO_EVIDENCE', 'DISPUTED']) {
    const result = evaluateVerticalSliceGate({
      ...row,
      dimensions: {
        ...baseDimensions,
        location: { ...baseDimensions.location, level },
      },
      routePresentation: 'static-context-only',
    });
    assert.equal(result.pass, false);
    assert.ok(result.failures.includes('location'));
  }
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

test('production-enabled historical entities require a qualified claim and source trace', () => {
  const bundle = currentHistoricalBundle();
  const entity = {
    id: 'EVT-CANONICAL-TEST',
    sourceRefs: ['SRC-0004'],
    metadata: { productionEnabled: true },
  };
  const withEntity = {
    ...bundle,
    packageData: { ...bundle.packageData, events: [entity] },
  };
  const withoutClaim = new HistoricalDataValidator().validate(withEntity);
  assert.equal(withoutClaim.valid, false);
  assert.ok(withoutClaim.diagnostics.some(diagnostic => diagnostic.code === 'HISTORICAL_PRODUCTION_CLAIM_REQUIRED'));

  const qualifiedClaim = {
    ...bundle.claims[0],
    id: 'CLM-CANONICAL-TEST',
    subjectType: 'event',
    subjectId: entity.id,
    subjectNamespace: 'canonical',
    evidenceLevel: 'SUPPORTED',
    sourceIds: ['SRC-0004'],
  };
  const valid = new HistoricalDataValidator().validate({
    ...withEntity,
    claims: [...bundle.claims, qualifiedClaim],
  });
  assert.equal(valid.valid, true);

  const noSourceEntity = { ...entity, id: 'EVT-CANONICAL-NO-SOURCE', sourceRefs: [] };
  const noSourceClaim = { ...qualifiedClaim, id: 'CLM-CANONICAL-NO-SOURCE', subjectId: noSourceEntity.id };
  const noSource = new HistoricalDataValidator().validate({
    ...bundle,
    packageData: { ...bundle.packageData, events: [noSourceEntity] },
    claims: [...bundle.claims, noSourceClaim],
  });
  assert.equal(noSource.valid, false);
  assert.ok(noSource.diagnostics.some(diagnostic => diagnostic.code === 'HISTORICAL_PRODUCTION_SOURCE_REQUIRED'));
});

test('V1.3 leaves canonical and presentation geometry counts unchanged', () => {
  assert.equal(readPackage('locations.geojson').features.length, 6);
  assert.equal(readPackage('events.json').length, 0);
  assert.equal(readPackage('units.json').length, 0);
  assert.equal(readPackage('routes.geojson').features.length, 0);
  assert.equal(readPackage('battle-movements.geojson').features.length, 5);
  assert.equal(readPackage('historical-battle-map-traces.geojson').features.length, 13);
});
