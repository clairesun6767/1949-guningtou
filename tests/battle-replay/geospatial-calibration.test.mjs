import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseCoordinateInput } from '../../node_modules/.cache/battle-replay/services/coordinateParsing.js';
import {
  addRouteWaypoint,
  createRouteDraft,
  deleteRouteWaypoint,
  moveRouteWaypoint,
  reorderRouteWaypoint,
  setRouteSegmentUncertainty,
} from '../../node_modules/.cache/battle-replay/services/routeEditing.js';
import {
  parseFeatureCollection,
  serializeFeatureCollection,
} from '../../node_modules/.cache/battle-replay/services/geoJsonRoundTrip.js';
import {
  calibrationStorageKey,
  parseCalibrationDraft,
  serializeCalibrationDraft,
} from '../../node_modules/.cache/battle-replay/services/editorPersistence.js';
import { validateGeospatialCalibration } from '../../node_modules/.cache/battle-replay/validation/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dataDir = path.join(root, 'data', 'battles', 'guningtou-1949');

function makeImage(overrides = {}) {
  return {
    imageId: 'IMG-TEST',
    imagePath: '/test.png',
    width: 1000,
    height: 800,
    crs: 'unknown',
    bounds: null,
    gcpRefs: [],
    verificationStatus: 'pending-manual-verification',
    transformMethod: 'unknown',
    transformStatus: 'pending',
    errorModel: {
      gcpCount: 0,
      residuals: [],
      rmsePixels: null,
      rmseMeters: null,
      transformType: 'unknown',
      confidence: 'unknown',
      verificationStatus: 'pending-manual-verification',
    },
    ...overrides,
  };
}

function makeGcp(id, imagePixel = [100, 100]) {
  return {
    id,
    imageId: 'IMG-TEST',
    imagePixel,
    coordinate: [118.32, 24.47],
    sourceDescription: 'Manually compared test fixture',
    confidence: 'probable',
    verificationStatus: 'candidate',
  };
}

test('coordinate parser normalizes both common orders and refuses ambiguous pairs', () => {
  const latitudeFirst = parseCoordinateInput('24.4712, 118.3215');
  assert.equal(latitudeFirst.status, 'parsed');
  assert.deepEqual(latitudeFirst.position, [118.3215, 24.4712]);
  assert.equal(latitudeFirst.detectedOrder, 'latitude-longitude');
  assert.equal(parseCoordinateInput('118.3215, 24.4712').status, 'parsed');
  assert.deepEqual(parseCoordinateInput('lng=118.3215 lat=24.4712').position, [118.3215, 24.4712]);
  assert.equal(parseCoordinateInput('24, 25').status, 'ambiguous');
  assert.equal(parseCoordinateInput('not a coordinate').status, 'invalid');
});

test('route editor keeps stable IDs while adding, moving, reordering and deleting waypoints', () => {
  const draft = createRouteDraft({
    id: 'RTE-EDITOR-001', battleId: 'BAT-GUN-1949', routeType: 'advance', nature: 'reconstructed',
    sourceRefs: ['SRC-1'], confidence: 'probable', notes: 'Explicit human-entered test route.',
  });
  assert.equal(draft.geometry, null);

  const withFirst = addRouteWaypoint(draft, [118.31, 24.46]);
  assert.equal(withFirst.geometry, null);
  const withSecond = addRouteWaypoint(withFirst, [118.32, 24.47]);
  assert.deepEqual(withSecond.properties.routePoints.map(point => point.id), ['RTE-EDITOR-001-P0001', 'RTE-EDITOR-001-P0002']);
  assert.deepEqual(withSecond.geometry.coordinates, [[118.31, 24.46], [118.32, 24.47]]);

  const moved = moveRouteWaypoint(withSecond, 'RTE-EDITOR-001-P0001', [118.315, 24.465]);
  assert.deepEqual(moved.geometry.coordinates[0], [118.315, 24.465]);
  const uncertain = setRouteSegmentUncertainty(moved, 1, 'estimated', ['SRC-1'], 'probable', 'Gap in the record.');
  assert.deepEqual(uncertain.properties.uncertaintySegments[0], {
    fromSequence: 1, toSequence: 2, status: 'estimated', sourceRefs: ['SRC-1'], confidence: 'probable', notes: 'Gap in the record.',
  });

  const reordered = reorderRouteWaypoint(uncertain, 'RTE-EDITOR-001-P0002', -1);
  assert.deepEqual(reordered.properties.routePoints.map(point => point.id), ['RTE-EDITOR-001-P0002', 'RTE-EDITOR-001-P0001']);
  assert.deepEqual(reordered.properties.routePoints.map(point => point.sequence), [1, 2]);
  const deleted = deleteRouteWaypoint(reordered, 'RTE-EDITOR-001-P0002');
  assert.equal(deleted.geometry, null);
  assert.equal(deleted.properties.routePoints[0].id, 'RTE-EDITOR-001-P0001');
});

test('GeoJSON round-trip preserves IDs, order and provenance fields', () => {
  const collection = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature', id: 'LOC-1', geometry: { type: 'Point', coordinates: [118.3, 24.4] },
      properties: { id: 'LOC-1', sourceRefs: ['SRC-1'], confidence: 'probable', sequence: 2 },
    }],
  };
  const serialized = serializeFeatureCollection(collection);
  const parsed = parseFeatureCollection(serialized);
  assert.deepEqual(parsed, collection);
  assert.ok(serialized.endsWith('\n'));
});

test('editor persistence round-trip is package-scoped and rejects mismatches', () => {
  const draft = {
    schemaVersion: '1.0.0', packageId: 'BR-GUN-1949', savedAt: '2026-08-12T00:00:00.000Z',
    locations: { type: 'FeatureCollection', features: [] },
    routes: { type: 'FeatureCollection', features: [] },
    groundControlPoints: { schemaVersion: '1.0.0', datasetId: 'GCPSET-GUN-1944', battleId: 'BAT-GUN-1949', controlPoints: [] },
  };
  assert.equal(calibrationStorageKey('BR-GUN-1949'), 'battlefield-coordinate-editor:BR-GUN-1949:v1');
  assert.deepEqual(parseCalibrationDraft(serializeCalibrationDraft(draft), 'BR-GUN-1949'), draft);
  assert.throws(() => parseCalibrationDraft(serializeCalibrationDraft(draft), 'BR-OTHER'), /does not match/);
});

test('repository imagery skeleton is honest, valid and still incomplete', () => {
  const dataset = JSON.parse(fs.readFileSync(path.join(dataDir, 'ground-control-points.json'), 'utf8'));
  const imagery = JSON.parse(fs.readFileSync(path.join(dataDir, 'imagery-georeferencing.json'), 'utf8'));
  const report = validateGeospatialCalibration(dataset, imagery);
  assert.equal(dataset.controlPoints.length, 0);
  assert.equal(report.errors, 0, JSON.stringify(report.diagnostics, null, 2));
  assert.equal(report.qualityStatus, 'Incomplete');
  assert.equal(report.diagnostics.filter(item => item.code === 'IMAGERY_GEOREFERENCE_PENDING').length, 2);
});

test('GCP validation rejects pixels outside imagery and unsubstantiated verified transforms', () => {
  const outsideDataset = {
    schemaVersion: '1.0.0', datasetId: 'GCPSET-TEST', battleId: 'BAT-TEST',
    controlPoints: [makeGcp('GCP-1', [1001, 100])],
  };
  const outsideImage = makeImage({ gcpRefs: ['GCP-1'], errorModel: { ...makeImage().errorModel, gcpCount: 1 } });
  const outsideReport = validateGeospatialCalibration(outsideDataset, [outsideImage]);
  assert.ok(outsideReport.diagnostics.some(item => item.code === 'GCP_PIXEL_OUTSIDE_IMAGE'));

  const onePoint = makeGcp('GCP-1');
  const verifiedImage = makeImage({
    crs: 'EPSG:4326', gcpRefs: ['GCP-1'], verificationStatus: 'source-verified', transformStatus: 'verified',
    errorModel: {
      ...makeImage().errorModel, gcpCount: 1, transformType: 'affine', verificationStatus: 'source-verified',
    },
  });
  const verifiedReport = validateGeospatialCalibration({ ...outsideDataset, controlPoints: [onePoint] }, [verifiedImage]);
  assert.ok(verifiedReport.diagnostics.some(item => item.code === 'GCP_COUNT_INSUFFICIENT_FOR_VERIFICATION'));
  assert.ok(verifiedReport.diagnostics.some(item => item.code === 'GEOREFERENCE_RMSE_REQUIRED'));
});

test('three-dimensional GCP coordinates require an explicit altitude reference', () => {
  const point = { ...makeGcp('GCP-3D'), coordinate: [118.32, 24.47, 12.5] };
  const dataset = {
    schemaVersion: '1.0.0', datasetId: 'GCPSET-TEST', battleId: 'BAT-TEST', controlPoints: [point],
  };
  const image = makeImage({ gcpRefs: ['GCP-3D'], errorModel: { ...makeImage().errorModel, gcpCount: 1 } });
  const missingReference = validateGeospatialCalibration(dataset, [image]);
  assert.ok(missingReference.diagnostics.some(item => item.code === 'ALTITUDE_REFERENCE_REQUIRED'));

  point.altitudeReference = 'unknown';
  const explicitUnknown = validateGeospatialCalibration(dataset, [image]);
  assert.equal(explicitUnknown.diagnostics.some(item => item.code === 'ALTITUDE_REFERENCE_REQUIRED'), false);
  assert.ok(explicitUnknown.diagnostics.some(item => item.code === 'ALTITUDE_REFERENCE_UNKNOWN'));
});
