import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  DiagnosticCollector,
  validateBattlePackage,
  validateGeoJsonGeometry,
  validateHistoricalTime,
  validatePosition,
} from '../../node_modules/.cache/battle-replay/validation/index.js';
import {
  adaptLegacyBattlefieldData,
  adaptLegacySources,
} from '../../node_modules/.cache/battle-replay/adapters/legacy/index.js';
import { applyManualCoordinateOverride } from '../../node_modules/.cache/battle-replay/services/coordinateOverride.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const schemaVersion = '1.0.0';
const exact = value => ({
  kind: 'exact', value, precision: 'minute', timezone: 'Asia/Taipei',
  sourceRefs: ['SRC-TEST'], confidence: 'confirmed',
});

function makePackage() {
  const source = {
    id: 'SRC-TEST', schemaVersion, title: { en: 'Test source' }, sourceType: 'official-record',
    sourceRefs: [], confidence: 'confirmed',
  };
  const perspective = {
    id: 'PER-TEST', schemaVersion, kind: 'neutral-editorial', label: { en: 'Editorial' },
    accounts: [], sourceRefs: ['SRC-TEST'], confidence: 'confirmed',
  };
  const location = {
    type: 'Feature', id: 'LOC-TEST', geometry: { type: 'Point', coordinates: [118.3, 24.46] },
    properties: {
      id: 'LOC-TEST', schemaVersion, historicalName: { en: 'Test location' }, modernName: null,
      aliases: [], sourceNames: [], searchTerms: ['test'], locationType: 'unknown',
      coordinateSystem: 'EPSG:4326',
      coordinateProvenance: {
        coordinateSystem: 'EPSG:4326', coordinate: [118.3, 24.46], coordinateMethod: 'official-gis',
        coordinatePrecision: 'high', verificationStatus: 'source-verified',
        sourceRefs: ['SRC-TEST'], confidence: 'confirmed',
      },
      verificationStatus: 'source-verified', sourceRefs: ['SRC-TEST'], confidence: 'confirmed',
    },
  };
  const faction = {
    id: 'FAC-TEST', schemaVersion, name: { en: 'Test faction' }, aliases: [],
    sourceRefs: ['SRC-TEST'], confidence: 'confirmed',
  };
  const unit = {
    id: 'UNT-TEST', schemaVersion, factionId: 'FAC-TEST', name: { en: 'Test unit' }, aliases: [],
    unitType: 'test', formationLevel: 'company', commanderRefs: [], status: 'unknown',
    sourceRefs: ['SRC-TEST'], confidence: 'confirmed',
  };
  const route = {
    type: 'Feature', id: 'RTE-TEST', geometry: { type: 'LineString', coordinates: [[118.3, 24.46], [118.31, 24.47]] },
    properties: {
      id: 'RTE-TEST', schemaVersion, battleId: 'BAT-TEST', unitId: 'UNT-TEST', phaseId: 'PHA-TEST',
      routeType: 'actual', nature: 'recorded', temporalMode: 'spatial-only',
      routePoints: [
        { id: 'RPT-001', routeId: 'RTE-TEST', sequence: 1, coordinate: [118.3, 24.46], sourceRefs: ['SRC-TEST'], verificationStatus: 'source-verified', confidence: 'confirmed' },
        { id: 'RPT-002', routeId: 'RTE-TEST', sequence: 2, coordinate: [118.31, 24.47], sourceRefs: ['SRC-TEST'], verificationStatus: 'source-verified', confidence: 'confirmed' },
      ],
      uncertaintySegments: [], sourceRefs: ['SRC-TEST'], confidence: 'confirmed', verificationStatus: 'source-verified',
      geometryProvenance: {
        coordinateSystem: 'EPSG:4326', temporalContext: 'historical', coordinateMethod: 'official-gis',
        coordinatePrecision: 'high', verificationStatus: 'source-verified', sourceRefs: ['SRC-TEST'], confidence: 'confirmed',
      },
      status: 'approved',
    },
  };
  const evidence = {
    id: 'EVD-TEST', schemaVersion, sourceId: 'SRC-TEST', evidenceType: 'citation',
    claim: { en: 'Test claim' }, relatedEntityRefs: ['EVT-TEST'], reliability: 'confirmed',
    sourceRefs: ['SRC-TEST'], confidence: 'confirmed',
  };
  const event = {
    id: 'EVT-TEST', schemaVersion, battleId: 'BAT-TEST', phaseId: 'PHA-TEST', eventType: 'movement',
    title: { en: 'Test event' }, historicalTime: exact('1949-10-25T02:00:00+08:00'),
    locationRefs: ['LOC-TEST'], participatingUnitRefs: ['UNT-TEST'], routeRefs: ['RTE-TEST'],
    perspectiveRefs: ['PER-TEST'], evidenceRefs: ['EVD-TEST'], uncertaintyRefs: [], mediaRefs: [], tags: [],
    sourceRefs: ['SRC-TEST'], confidence: 'confirmed',
  };
  const phase = {
    id: 'PHA-TEST', schemaVersion, battleId: 'BAT-TEST', name: { en: 'Test phase' }, sequence: 1,
    startTime: exact('1949-10-25T01:00:00+08:00'), endTime: exact('1949-10-25T03:00:00+08:00'),
    participatingUnitRefs: ['UNT-TEST'], eventRefs: ['EVT-TEST'], sourceRefs: ['SRC-TEST'], confidence: 'confirmed',
  };
  return {
    battle: {
      id: 'BAT-TEST', schemaVersion, slug: 'test', title: { en: 'Test battle' },
      startTime: exact('1949-10-25T00:00:00+08:00'), endTime: exact('1949-10-25T04:00:00+08:00'),
      timezone: 'Asia/Taipei', geographicExtent: null, defaultPerspectiveRef: 'PER-TEST',
      phaseRefs: ['PHA-TEST'], factionRefs: ['FAC-TEST'], sourceRefs: ['SRC-TEST'], confidence: 'confirmed',
    },
    phases: [phase], factions: [faction], formations: [], units: [unit], commanders: [],
    locations: [location], routes: [route], battleAreas: [], events: [event], evidence: [evidence],
    sources: [source], perspectives: [perspective], uncertainties: [], media: [], cameraCues: [],
  };
}

test('canonical domain package validates with event-unit, route-unit and evidence-source links', () => {
  const report = validateBattlePackage(makePackage());
  assert.equal(report.errors, 0, JSON.stringify(report.diagnostics, null, 2));
  assert.equal(report.qualityStatus, 'Verified');
});

test('coordinate range validation distinguishes technical errors', () => {
  const collector = new DiagnosticCollector();
  assert.equal(validatePosition([181, 24], collector), false);
  assert.equal(validatePosition([118, -91], collector), false);
  assert.ok(collector.diagnostics.every(item => item.domain === 'technical'));
});

test('unverified coordinate is a historical warning, not a technical failure', () => {
  const fixture = makePackage();
  fixture.locations[0].properties.verificationStatus = 'pending-manual-verification';
  fixture.locations[0].properties.coordinateProvenance.verificationStatus = 'pending-manual-verification';
  const report = validateBattlePackage(fixture);
  assert.equal(report.errors, 0);
  assert.ok(report.diagnostics.some(item => item.code === 'COORDINATE_HISTORICALLY_UNVERIFIED' && item.severity === 'WARNING'));
});

test('GeoJSON validation covers invalid polygons and valid lines', () => {
  const good = new DiagnosticCollector();
  assert.equal(validateGeoJsonGeometry({ type: 'LineString', coordinates: [[118, 24], [118.1, 24.1]] }, good), true);
  const bad = new DiagnosticCollector();
  assert.equal(validateGeoJsonGeometry({ type: 'Polygon', coordinates: [[[118, 24], [119, 24], [119, 25], [118, 25]]] }, bad), false);
  assert.ok(bad.diagnostics.some(item => item.code === 'POLYGON_RING_NOT_CLOSED'));
});

test('HistoricalTime supports range and rejects false or malformed precision', () => {
  const range = new DiagnosticCollector();
  assert.equal(validateHistoricalTime({
    kind: 'range', earliest: '1949-10-25T01:00:00+08:00', latest: '1949-10-25T03:00:00+08:00',
    precision: 'time-range', timezone: 'Asia/Taipei', sourceRefs: [], confidence: 'probable',
  }, range), true);
  const invalid = new DiagnosticCollector();
  assert.equal(validateHistoricalTime({ kind: 'exact', precision: 'minute', timezone: 'Asia/Taipei', sourceRefs: [], confidence: 'confirmed' }, invalid), false);
});

test('reference integrity and duplicate IDs fail invalid fixtures', () => {
  const broken = makePackage();
  broken.events[0].participatingUnitRefs = ['UNT-MISSING'];
  broken.factions[0].id = 'SRC-TEST';
  broken.units[0].confidence = 'certain';
  const report = validateBattlePackage(broken);
  assert.equal(report.valid, false);
  assert.ok(report.diagnostics.some(item => item.code === 'BROKEN_REFERENCE'));
  assert.ok(report.diagnostics.some(item => item.code === 'DUPLICATE_ID'));
  assert.ok(report.diagnostics.some(item => item.code === 'CONFIDENCE_INVALID'));
});

test('route waypoint ordering is validated and waypoints need not all have time', () => {
  const good = validateBattlePackage(makePackage());
  assert.equal(good.diagnostics.some(item => item.code === 'ROUTE_WAYPOINT_ORDER_INVALID'), false);
  const bad = makePackage();
  bad.routes[0].properties.routePoints[1].sequence = 1;
  const report = validateBattlePackage(bad);
  assert.ok(report.diagnostics.some(item => item.code === 'ROUTE_WAYPOINT_ORDER_INVALID'));
});

test('route geometry, waypoint identity and uncertainty segment integrity are enforced', () => {
  const broken = makePackage();
  broken.routes[0].geometry.coordinates[1] = [118.5, 24.5];
  broken.routes[0].properties.routePoints[1].id = 'RPT-001';
  broken.routes[0].properties.uncertaintySegments = [{
    fromSequence: 1, toSequence: 3, status: 'estimated', sourceRefs: ['SRC-MISSING'], confidence: 'probable',
  }];
  const report = validateBattlePackage(broken);
  assert.ok(report.diagnostics.some(item => item.code === 'ROUTE_GEOMETRY_POINT_MISMATCH'));
  assert.ok(report.diagnostics.some(item => item.code === 'ROUTE_POINT_ID_INVALID'));
  assert.ok(report.diagnostics.some(item => item.code === 'ROUTE_UNCERTAINTY_SEGMENT_INVALID'));
  assert.ok(report.diagnostics.some(item => item.code === 'BROKEN_REFERENCE'));
});

test('reconstructed or estimated routes cannot overclaim confirmed confidence', () => {
  const broken = makePackage();
  broken.routes[0].properties.nature = 'reconstructed';
  broken.routes[0].properties.confidence = 'confirmed';
  const report = validateBattlePackage(broken);
  assert.ok(report.diagnostics.some(item => item.code === 'ROUTE_CONFIDENCE_OVERCLAIMED'));
});

test('manual override preserves original candidate and audit fields without mutating input', () => {
  const original = makePackage().locations[0];
  const updated = applyManualCoordinateOverride(original, {
    finalCoordinate: [118.32, 24.48], verificationMethod: 'government-map',
    verifiedBy: 'reviewer-1', verifiedAt: '2026-08-12T12:00:00+08:00', notes: 'Compared against an approved GIS reference.',
    confidence: 'probable', sourceRefs: ['SRC-TEST'],
  });
  assert.deepEqual(original.geometry.coordinates, [118.3, 24.46]);
  assert.deepEqual(updated.geometry.coordinates, [118.32, 24.48]);
  assert.deepEqual(updated.properties.coordinateProvenance.originalCandidate.coordinate, [118.3, 24.46]);
  assert.equal(updated.properties.coordinateProvenance.verificationStatus, 'manually-verified');
  assert.equal(updated.properties.coordinateProvenance.confidence, 'probable');
  assert.deepEqual(updated.properties.coordinateProvenance.sourceRefs, ['SRC-TEST']);
});

test('legacy adapter preserves sources and candidates but never promotes topology to routes', () => {
  const legacyInput = {
    sources: { sources: [{ source_id: 'SRC-1', title: '來源', source_type: '官方網站' }] },
    poi: { pois: [{ poi_id: 'POI-1', name_chinese: '候選地點', longitude: 118.3, latitude: 24.4, coordinate_accuracy: 'Exact', related_sources: ['SRC-1'] }] },
    units: { units: [{ unit_id: 'U-1', unit_name_normalized: '某團', side: 'Nationalist', related_sources: ['SRC-1'] }] },
    events: { events: [{ event_id: 'EVT-1', title: '事件', roc_units: '某團', location: '某地', source_ids: ['SRC-1'] }] },
    routes: { routes: { 'Road Connection': [{ from_poi: 'POI-1', to_poi: 'POI-1', route_name: '拓撲' }] } },
  };
  const before = structuredClone(legacyInput);
  const adapted = adaptLegacyBattlefieldData(legacyInput, 'BAT-TEST');
  assert.equal(adapted.sources.length, 1);
  assert.equal(adapted.locations[0].properties.verificationStatus, 'pending-manual-verification');
  assert.equal(adapted.routes.length, 0);
  assert.equal(adapted.topologicalConnections.length, 1);
  assert.deepEqual(adapted.events[0].participatingUnitRefs, []);
  assert.deepEqual(legacyInput, before);
});

test('Guningtou package contains six manually calibrated locations and no fabricated routes', () => {
  const dir = path.join(root, 'data', 'battles', 'guningtou-1949');
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const load = key => JSON.parse(fs.readFileSync(path.join(dir, manifest.files[key]), 'utf8'));
  const sourceCatalog = JSON.parse(fs.readFileSync(path.resolve(dir, manifest.sourceCatalog.path), 'utf8'));
  const data = {
    battle: load('battle'), phases: load('phases'), factions: load('factions'), formations: load('formations'),
    units: load('units'), commanders: load('commanders'), locations: load('locations').features,
    routes: load('routes').features, battleAreas: load('battleAreas').features, events: load('events'),
    evidence: load('evidence'), sources: adaptLegacySources(sourceCatalog), perspectives: load('perspectives'),
    uncertainties: load('uncertainties'), media: load('media'), cameraCues: load('cameraCues'),
  };
  const report = validateBattlePackage(data, manifest);
  assert.equal(report.errors, 0, JSON.stringify(report.diagnostics, null, 2));
  assert.equal(data.locations.length, 6);
  assert.ok(data.locations.every(item => item.geometry?.type === 'Point'));
  assert.ok(data.locations.every(item => item.properties.verificationStatus === 'manually-verified'));
  assert.ok(data.locations.every(item => (
    JSON.stringify(item.geometry.coordinates)
    === JSON.stringify(item.properties.coordinateProvenance.finalCoordinate)
  )));
  assert.equal(data.routes.length, 0);
  assert.equal(report.qualityStatus, 'Verified');
});

test('invalid manual override is rejected', () => {
  assert.throws(() => applyManualCoordinateOverride(makePackage().locations[0], {
    finalCoordinate: [999, 24], verificationMethod: 'manual-correction',
    verifiedBy: 'reviewer', verifiedAt: '2026-08-12T12:00:00+08:00', notes: 'Invalid fixture',
  }), /Longitude/);
});
