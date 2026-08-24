import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CAMERA_PRESETS,
  DEFAULT_VISITOR_LAYERS,
  GUNINGTOU_TIMELINE_STEPS,
  filterVisibleFeatures,
  chooseHistoricalRenderer,
  getCesiumCameraDestination,
  getThreeCameraDestination,
  getCesiumVisibleFeatures,
  isFeatureVisible,
  projectPosition,
  validateBattleMapFeature,
  validateCameraPresets,
  validateBattleMovementCollection,
  movementCollectionToMapFeatures,
  parseHistoricalTraceCollection,
  parseHistoricalTracePhases,
  phaseAtProgress,
  traceProgressAtProgress,
  validateHistoricalTraceCollection,
  toCesiumPointFeatures,
  toThreePointFeatures,
  wgs84ToLocalMeters,
} from '../../node_modules/.cache/battle-replay/visualization/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function makeLocation(overrides = {}) {
  return {
    id: 'LOC-TEST',
    type: 'location',
    geometry: { type: 'Point', coordinates: [118.32, 24.47] },
    confidence: 'verified',
    sourceIds: ['SRC-TEST'],
    relatedLocations: [],
    relatedPeople: [],
    visibility: 'production',
    researchOnly: false,
    ...overrides,
  };
}

function makeRoute(overrides = {}) {
  return {
    id: 'RTE-TEST',
    type: 'route',
    geometry: { type: 'LineString', coordinates: [[118.31, 24.46], [118.32, 24.47]] },
    confidence: 'verified',
    sourceIds: ['SRC-TEST'],
    relatedLocations: [],
    relatedPeople: [],
    visibility: 'production',
    researchOnly: false,
    historicalRouteStatus: 'verified',
    ...overrides,
  };
}

test('battle primitive schema accepts sourced points and rejects false confidence', () => {
  assert.deepEqual(validateBattleMapFeature(makeLocation()), []);
  assert.ok(validateBattleMapFeature(makeLocation({ confidence: 'certain' })).some(message => message.includes('confidence')));
  assert.ok(validateBattleMapFeature(makeLocation({ confidence: 'verified', sourceIds: [] })).some(message => message.includes('source')));
  assert.ok(validateBattleMapFeature(makeLocation({ type: 'area' })).some(message => message.includes('does not accept Point')));
});

test('camera registry contains every required preset with valid centralized values', () => {
  assert.deepEqual(validateCameraPresets(), []);
  assert.deepEqual(Object.keys(CAMERA_PRESETS).sort(), [
    'battle_overview', 'guningtou', 'kinmen', 'landing_coast', 'poi_focus', 'story_mode', 'strategic',
  ]);
});

test('candidate routes are research-only and cannot leak into visitor mode', () => {
  const candidate = makeRoute({
    id: 'RTE-CANDIDATE',
    confidence: 'approximate',
    historicalRouteStatus: 'candidate',
    visibility: 'research',
    researchOnly: true,
  });
  assert.deepEqual(validateBattleMapFeature(candidate), []);
  const visitorLayers = { enabled: new Set([...DEFAULT_VISITOR_LAYERS, 'candidate-routes']), researchMode: false };
  assert.equal(isFeatureVisible(candidate, visitorLayers), false);
  const researchLayers = { enabled: new Set([...DEFAULT_VISITOR_LAYERS, 'candidate-routes', 'research-layer']), researchMode: true };
  assert.equal(isFeatureVisible(candidate, researchLayers), true);
});

test('production route visibility requires verified status and verified confidence', () => {
  const layers = { enabled: new Set(DEFAULT_VISITOR_LAYERS), researchMode: false };
  assert.equal(isFeatureVisible(makeRoute(), layers), true);
  assert.equal(isFeatureVisible(makeRoute({ confidence: 'probable' }), layers), false);
  assert.ok(validateBattleMapFeature(makeRoute({ historicalRouteStatus: 'candidate', researchOnly: false })).length > 0);
});

test('timeline filter keeps timeless locations and filters dated battle features', () => {
  const datedEvent = {
    ...makeLocation({ id: 'EVT-MAP', type: 'event', confidence: 'approximate' }),
    time: '1949-10-26T12:00:00+08:00',
  };
  const layers = { enabled: new Set(DEFAULT_VISITOR_LAYERS), researchMode: false };
  const onDate = filterVisibleFeatures([makeLocation(), datedEvent], layers, { activeDate: '1949-10-26' });
  assert.deepEqual(onDate.map(feature => feature.id).sort(), ['EVT-MAP', 'LOC-TEST']);
  const otherDate = filterVisibleFeatures([makeLocation(), datedEvent], layers, { activeDate: '1949-10-27' });
  assert.deepEqual(otherDate.map(feature => feature.id), ['LOC-TEST']);
  assert.deepEqual(GUNINGTOU_TIMELINE_STEPS.map(step => step.date), ['1949-10-25', '1949-10-26', '1949-10-27']);
});

test('projection reads canonical coordinates without mutating or replacing them', () => {
  const locationsPath = path.join(root, 'data', 'battles', 'guningtou-1949', 'locations.geojson');
  const collection = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
  const before = structuredClone(collection);
  const points = collection.features.map(feature => projectPosition(feature.geometry.coordinates));
  assert.ok(points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
  assert.ok(points.every(point => point.x >= 0 && point.x <= 100 && point.y >= 0 && point.y <= 100));
  assert.deepEqual(collection, before);
});

test('mobile smoke contract includes a bottom sheet, reduced detail and scroll-safe viewport', () => {
  const css = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'historical-map.css'), 'utf8');
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /touch-action:\s*pan-y/);
  assert.match(css, /historical-map__poi-card[\s\S]*bottom:/);
  assert.match(css, /prefers-reduced-motion/);
});

test('Cesium adapter preserves all six canonical WGS84 coordinates exactly', () => {
  const locationsPath = path.join(root, 'data', 'battles', 'guningtou-1949', 'locations.geojson');
  const collection = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
  const features = collection.features.map(feature => makeLocation({
    id: feature.id,
    geometry: structuredClone(feature.geometry),
    confidence: feature.properties.confidence === 'confirmed' ? 'verified' : 'probable',
    sourceIds: [...feature.properties.sourceRefs],
  }));
  const before = structuredClone(collection.features.map(feature => feature.geometry.coordinates));
  const mapped = toCesiumPointFeatures(features);
  assert.equal(mapped.length, 6);
  assert.deepEqual(mapped.map(point => [point.longitude, point.latitude]), before);
  assert.deepEqual(collection.features.map(feature => feature.geometry.coordinates), before);
});

test('Cesium camera adapter retains preset names and geographic destinations across mobile variants', () => {
  for (const id of Object.keys(CAMERA_PRESETS)) {
    const desktop = getCesiumCameraDestination(id);
    const mobile = getCesiumCameraDestination(id, { mobile: true });
    assert.equal(mobile.longitude, desktop.longitude);
    assert.equal(mobile.latitude, desktop.latitude);
    assert.ok(mobile.height > desktop.height);
    assert.ok(mobile.durationMs < desktop.durationMs);
  }
  const focused = getCesiumCameraDestination('poi_focus', { focus: [118.30743595990603, 24.47855303214236] });
  assert.equal(focused.longitude, 118.30743595990603);
  assert.equal(focused.latitude, 24.47855303214236);
});

test('renderer selection falls back for unavailable WebGL, failed initialization, and low capability', () => {
  assert.equal(chooseHistoricalRenderer({ webglAvailable: true }), 'three');
  assert.equal(chooseHistoricalRenderer({ preferred: 'cesium', webglAvailable: true }), 'cesium');
  assert.equal(chooseHistoricalRenderer({ webglAvailable: false }), 'atlas');
  assert.equal(chooseHistoricalRenderer({ webglAvailable: true, initializationFailed: true }), 'atlas');
  assert.equal(chooseHistoricalRenderer({ webglAvailable: true, lowCapability: true }), 'atlas');
  assert.equal(chooseHistoricalRenderer({ preferred: 'atlas', webglAvailable: true }), 'atlas');
});

test('Three adapter preserves canonical WGS84 input and maps it to a local tangent plane', () => {
  const locationsPath = path.join(root, 'data', 'battles', 'guningtou-1949', 'locations.geojson');
  const collection = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
  const features = collection.features.map(feature => makeLocation({
    id: feature.id,
    geometry: structuredClone(feature.geometry),
    sourceIds: [...feature.properties.sourceRefs],
  }));
  const before = structuredClone(collection.features.map(feature => feature.geometry.coordinates));
  const mapped = toThreePointFeatures(features);
  assert.equal(mapped.length, 6);
  assert.deepEqual(mapped.map(point => [point.longitude, point.latitude]), before);
  assert.ok(mapped.every(point => Number.isFinite(point.eastMetres) && Number.isFinite(point.northMetres)));
  assert.deepEqual(collection.features.map(feature => feature.geometry.coordinates), before);
  assert.deepEqual(wgs84ToLocalMeters([118.275, 24.49]), { eastMetres: 0, northMetres: 0 });
});

test('Three camera uses the required visitor field geometry and mobile range policy', () => {
  const desktop = getThreeCameraDestination('strategic');
  const mobile = getThreeCameraDestination('strategic', { mobile: true });
  assert.equal(desktop.pitchDegrees, 45);
  assert.ok(mobile.rangeMetres > desktop.rangeMetres);
  assert.ok(mobile.durationMs < desktop.durationMs);
  const focus = [118.30743595990603, 24.47855303214236];
  const focused = getThreeCameraDestination('poi_focus', { focus });
  assert.deepEqual([focused.longitude, focused.latitude], focus);
  const guningtouMobile = getThreeCameraDestination('guningtou', { mobile: true });
  assert.equal(guningtouMobile.rangeMetres, getThreeCameraDestination('guningtou').rangeMetres * 1.85);
});

test('derived Three terrain assets are two valid SRTM-backed LODs', () => {
  for (const filename of ['kinmen-xiamen-regional.json', 'guningtou-local.json']) {
    const asset = JSON.parse(fs.readFileSync(path.join(root, 'public', 'terrain', filename), 'utf8'));
    assert.equal(asset.coordinateSystem, 'EPSG:4326');
    assert.equal(asset.heights.length, asset.grid.width * asset.grid.height);
    assert.equal(asset.land.length, asset.heights.length);
    assert.match(asset.source.temporalScope, /not a 1949 terrain reconstruction/);
    assert.ok(asset.heights.some(value => value > 0));
    assert.ok(asset.land.some(value => value === 0));
    assert.ok(asset.land.some(value => value === 1));
  }
  const local = JSON.parse(fs.readFileSync(path.join(root, 'public', 'terrain', 'guningtou-local.json'), 'utf8'));
  assert.deepEqual(local.grid, { width: 320, height: 256 });
  assert.match(local.derivation.runtimeLandMask, /OpenStreetMap coastline mask/);
});

test('V0.5 coastline assets are independent, closed OSM land polygons', () => {
  for (const filename of ['regional-coastline.geojson', 'guningtou-coastline.geojson']) {
    const asset = JSON.parse(fs.readFileSync(path.join(root, 'public', 'map-data', filename), 'utf8'));
    assert.equal(asset.type, 'FeatureCollection');
    assert.equal(asset.metadata.source.license, 'Open Database License (ODbL) 1.0');
    assert.equal(asset.metadata.source.acquired, '2026-08-23');
    assert.equal(asset.metadata.source.referenceEra, 'modern_reference');
    assert.ok(asset.features.length > 0);
    for (const feature of asset.features) {
      assert.equal(feature.geometry.type, 'Polygon');
      assert.equal(feature.properties.layer, 'coastline');
      assert.equal(feature.properties.referenceEra, 'modern_reference');
      assert.deepEqual(feature.geometry.coordinates[0][0], feature.geometry.coordinates[0].at(-1));
    }
  }
  const terrainController = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'three', 'ThreeTerrainController.ts'), 'utf8');
  assert.match(terrainController, /alphaMap:\s*landMask/);
  assert.doesNotMatch(terrainController, /asset\.land\[a\]/);
});

test('V0.5 cartography provides every required local semantic category with eras', () => {
  const local = JSON.parse(fs.readFileSync(path.join(root, 'public', 'map-data', 'guningtou-cartography.geojson'), 'utf8'));
  const categories = new Set(local.features.map(feature => feature.properties.category));
  for (const category of ['agriculture', 'forest', 'settlement', 'settlement-block', 'beach', 'open-ground', 'road-primary', 'road-secondary', 'road-local']) {
    assert.ok(categories.has(category), `Missing ${category}`);
  }
  const allowedEras = new Set(['modern_reference', 'historical_verified', 'historical_approximate', 'interpretive_cartography']);
  assert.ok(local.features.every(feature => allowedEras.has(feature.properties.referenceEra)));
});

test('V0.5 visitor layer policy defaults semantic context on and unregistered research layers off', () => {
  for (const id of ['terrain', 'coastline', 'land-cover', 'roads', 'settlements', 'vegetation', 'beaches', 'historical-poi', 'labels']) {
    assert.ok(DEFAULT_VISITOR_LAYERS.includes(id), `${id} should be on by default`);
  }
  for (const id of ['modern-reference', 'candidate-routes', 'historical-imagery', 'research-layer']) {
    assert.equal(DEFAULT_VISITOR_LAYERS.includes(id), false, `${id} should be off by default`);
  }
});

test('V0.5 cartographic context introduces no battle geometry', () => {
  const battleDir = path.join(root, 'data', 'battles', 'guningtou-1949');
  const routes = JSON.parse(fs.readFileSync(path.join(battleDir, 'routes.geojson'), 'utf8'));
  const areas = JSON.parse(fs.readFileSync(path.join(battleDir, 'battle-areas.geojson'), 'utf8'));
  assert.equal(routes.features.length, 0);
  assert.equal(areas.features.length, 0);
  for (const filename of ['regional-cartography.geojson', 'guningtou-cartography.geojson']) {
    const asset = JSON.parse(fs.readFileSync(path.join(root, 'public', 'map-data', filename), 'utf8'));
    assert.ok(asset.features.every(feature => feature.properties.referenceEra === 'modern_reference'));
    assert.ok(asset.features.every(feature => !['route', 'battle-event', 'battle-area', 'battle-direction'].includes(feature.properties.layer)));
  }
});

test('Cesium visibility consumes the shared layer and timeline engine', () => {
  const event = makeLocation({ id: 'EVT-CESIUM', type: 'event', confidence: 'approximate', time: '1949-10-26T06:00:00+08:00' });
  const layers = { enabled: new Set(DEFAULT_VISITOR_LAYERS), researchMode: false };
  assert.deepEqual(getCesiumVisibleFeatures([makeLocation(), event], layers, { activeDate: '1949-10-26' }).map(item => item.id), ['LOC-TEST', 'EVT-CESIUM']);
  assert.deepEqual(getCesiumVisibleFeatures([makeLocation(), event], layers, { activeDate: '1949-10-27' }).map(item => item.id), ['LOC-TEST']);
});

test('Cesium renderer creates no route polyline when canonical routes are empty', () => {
  const routesPath = path.join(root, 'data', 'battles', 'guningtou-1949', 'routes.geojson');
  const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
  assert.equal(routes.features.length, 0);
  assert.equal(toCesiumPointFeatures(routes.features).length, 0);
  const poiLayer = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'cesium', 'CesiumPoiLayer.ts'), 'utf8');
  assert.doesNotMatch(poiLayer, /polyline\s*:/i);
});

test('Cesium static deployment and runtime lifecycle are explicitly configured', () => {
  const config = fs.readFileSync(path.join(root, 'astro.config.mjs'), 'utf8');
  for (const directory of ['Workers', 'ThirdParty', 'Assets', 'Widgets']) assert.match(config, new RegExp(directory));
  const scene = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'cesium', 'CesiumScene.ts'), 'utf8');
  assert.match(scene, /await import\('cesium'\)/);
  assert.match(scene, /cameraController/);
  assert.match(scene, /viewer\.destroy\(\)/);
  assert.match(scene, /removeInputAction/);
});

test('V0.6 movement dataset is sourced, typed and historically bounded', () => {
  const battleDir = path.join(root, 'data', 'battles', 'guningtou-1949');
  const collection = JSON.parse(fs.readFileSync(path.join(battleDir, 'battle-movements.geojson'), 'utf8'));
  assert.deepEqual(validateBattleMovementCollection(collection), []);
  const counts = collection.features.reduce((result, feature) => {
    result[feature.properties.movementType] = (result[feature.properties.movementType] ?? 0) + 1;
    return result;
  }, {});
  assert.deepEqual(counts, { ATTACK_AXIS: 2, MOVEMENT_CORRIDOR: 2, RESEARCH_ONLY: 1 });
  assert.ok(collection.features.every(feature => feature.properties.sourceIds.length > 0));
  assert.ok(collection.features.every(feature => feature.properties.geometryProvenance && feature.properties.provenanceNote && feature.properties.reviewStatus));
  assert.equal(collection.features.filter(feature => feature.properties.movementType === 'VERIFIED_ROUTE').length, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(battleDir, 'routes.geojson'), 'utf8')).features.length, 0);
});

test('V0.6 movement timeline shows only approved date-level interpretation', () => {
  const collection = JSON.parse(fs.readFileSync(path.join(root, 'data', 'battles', 'guningtou-1949', 'battle-movements.geojson'), 'utf8'));
  const features = movementCollectionToMapFeatures(collection);
  const visitor = { enabled: new Set(DEFAULT_VISITOR_LAYERS), researchMode: false };
  assert.deepEqual(filterVisibleFeatures(features, visitor, { activeDate: '1949-10-25' }).map(feature => feature.id), [
    'MOV-GUN-1025-PLA-LANDING-AXIS', 'MOV-GUN-1025-PLA-INLAND-CORRIDOR',
  ]);
  assert.deepEqual(filterVisibleFeatures(features, visitor, { activeDate: '1949-10-26' }).map(feature => feature.id), [
    'MOV-GUN-1026-ROC-COUNTERATTACK-AXIS', 'MOV-GUN-1026-PLA-NORTH-RETREAT-CORRIDOR',
  ]);
  assert.deepEqual(filterVisibleFeatures(features, visitor, { activeDate: '1949-10-27' }), []);
  const research = { enabled: new Set([...DEFAULT_VISITOR_LAYERS, 'candidate-routes', 'research-layer']), researchMode: true };
  assert.ok(filterVisibleFeatures(features, research, { activeDate: '1949-10-25' }).some(feature => feature.id === 'MOV-R01-ANQI-BEISHAN-RESEARCH'));
});

test('V0.6 classification masks replace semantic surface polygon meshes', () => {
  for (const scope of ['regional', 'guningtou']) {
    const metadata = JSON.parse(fs.readFileSync(path.join(root, 'public', 'map-data', `${scope}-classification.json`), 'utf8'));
    assert.ok(metadata.width >= 2048 && metadata.width <= 4096);
    assert.ok(metadata.height >= 1024);
    for (const suffix of ['a', 'b']) assert.ok(fs.statSync(path.join(root, 'public', 'map-data', `${scope}-classification-${suffix}.png`)).size > 1000);
  }
  const terrain = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'three', 'ThreeTerrainController.ts'), 'utf8');
  assert.match(terrain, /LinearMipmapLinearFilter/);
  assert.match(terrain, /classificationMaskA/);
  const cartography = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'three', 'ThreeCartographicLayer.ts'), 'utf8');
  assert.doesNotMatch(cartography, /function buildPolygonMesh/);
});

test('V0.6 keeps a continuous regional world and hides renderer switching from visitors', () => {
  const scene = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'three', 'ThreeScene.ts'), 'utf8');
  const camera = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'three', 'ThreeCameraController.ts'), 'utf8');
  const experience = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'HistoricalMapExperience.tsx'), 'utf8');
  assert.match(scene, /createTerrainBundle\(regionalAsset[\s\S]*localAsset\.bounds/);
  assert.match(scene, /this\.local\.terrainMaterial\.opacity = 1/);
  assert.match(scene, /const localMix/);
  assert.match(camera, /maxDistance = 105/);
  assert.doesNotMatch(experience, /historical-map__renderer-switch/);
  assert.match(experience, /get\('renderer'\) === 'cesium'/);
});

test('V0.7 regional terrain owns a real local-footprint hole', () => {
  const terrain = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'three', 'ThreeTerrainController.ts'), 'utf8');
  const scene = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'three', 'ThreeScene.ts'), 'utf8');
  assert.match(terrain, /triangleOverlapsBounds/);
  assert.match(terrain, /triangleStats/);
  assert.match(terrain, /holeBounds/);
  assert.match(scene, /regionalTrianglesUnderLocalFootprint: 0/);
  assert.match(scene, /qa-regional-terrain-wireframe/);
  assert.match(scene, /qa-local-footprint/);
});

test('V0.7 Three interaction maps middle drag to pan and keeps touch gestures usable', () => {
  const scene = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'three', 'ThreeScene.ts'), 'utf8');
  const camera = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'three', 'ThreeCameraController.ts'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'historical-map.css'), 'utf8');
  assert.match(scene, /mouseButtons\.LEFT = THREE\.MOUSE\.ROTATE/);
  assert.match(scene, /mouseButtons\.MIDDLE = THREE\.MOUSE\.PAN/);
  assert.match(scene, /touches\.TWO = THREE\.TOUCH\.DOLLY_PAN/);
  assert.match(scene, /preventMiddleAutoScroll/);
  assert.match(camera, /LOCAL_PAN_BOUNDS/);
  assert.match(camera, /STRATEGIC_PAN_BOUNDS/);
  assert.match(camera, /applyPanBounds/);
  assert.match(css, /touch-action:\s*none/);
});

test('V0.7 movement foreground includes readable symbols, labels, fit camera and honest empty note', () => {
  const movement = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'three', 'ThreeBattleMovementLayer.ts'), 'utf8');
  const scene = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'three', 'ThreeScene.ts'), 'utf8');
  const experience = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'HistoricalMapExperience.tsx'), 'utf8');
  assert.match(movement, /taperedRibbon/);
  assert.match(movement, /three-battle-movement-label/);
  assert.match(movement, /soft-border/);
  assert.match(scene, /fitBattleMovement/);
  assert.match(scene, /fitGeographicBounds/);
  assert.match(experience, /noMovementGeometry/);
  assert.match(experience, /activeMovementTypes/);
});

test('V0.8 historical source trace dataset is separate, typed and explicitly schematic', () => {
  const dir = path.join(root, 'data', 'battles', 'guningtou-1949');
  const traces = parseHistoricalTraceCollection(fs.readFileSync(path.join(dir, 'historical-battle-map-traces.geojson'), 'utf8'));
  assert.deepEqual(validateHistoricalTraceCollection(traces), []);
  assert.equal(traces.metadata.registrationMethod, 'schematic_only');
  assert.ok(traces.features.length >= 13);
  assert.ok(traces.features.every(feature => feature.properties.sourceTraceMethod === 'historical_map_trace'));
  assert.ok(traces.features.every(feature => feature.properties.sourceMapId === 'IMG-HIST-GUN-ROUTE-001'));
  assert.ok(traces.features.every(feature => feature.properties.relatedUnits.length === 0));
  const movementFeatureTypes = ['historical_attack_arrow', 'historical_movement_path', 'historical_movement_corridor'];
  assert.equal(traces.features.filter(feature => feature.properties.side === 'pla' && movementFeatureTypes.includes(feature.properties.featureType) && !feature.properties.researchOnly).length, 4);
  assert.equal(traces.features.filter(feature => feature.properties.side === 'roc' && movementFeatureTypes.includes(feature.properties.featureType) && !feature.properties.researchOnly).length, 3);
  assert.equal(traces.features.filter(feature => ['battle_front', 'defensive_line'].includes(feature.properties.featureType) && !feature.properties.researchOnly).length, 2);
  assert.equal(traces.features.filter(feature => feature.properties.featureType === 'battle_area' && !feature.properties.researchOnly).length, 2);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'routes.geojson'), 'utf8')).features.length, 0);
});

test('V0.8 historical phase playback preserves an honest empty 10/27 phase', () => {
  const dir = path.join(root, 'data', 'battles', 'guningtou-1949');
  const phases = parseHistoricalTracePhases(fs.readFileSync(path.join(dir, 'historical-battle-phases.json'), 'utf8')).phases;
  assert.equal(phases.length, 6);
  assert.equal(phaseAtProgress(phases, .84).id, 'HMP-06');
  assert.deepEqual(phases.at(-1).traceIds, []);
  const firstTrace = phases[0].traceIds[0];
  assert.equal(traceProgressAtProgress(firstTrace, phases, 0), 0);
  assert.equal(traceProgressAtProgress(firstTrace, phases, 1), 1);
});

test('V0.8 local terrain ownership uses an explicit coverage mask', () => {
  const maskPath = path.join(root, 'public', 'terrain', 'guningtou-local-coverage-mask.json');
  const mask = JSON.parse(fs.readFileSync(maskPath, 'utf8'));
  assert.equal(mask.coordinateSystem, 'EPSG:4326');
  assert.equal(mask.values.length, mask.grid.width * mask.grid.height);
  assert.match(mask.method, /DEM finite samples/);
  assert.ok(mask.validSampleCount > 0);
  assert.ok(mask.validSampleCount < mask.values.length);
  const terrainController = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'three', 'ThreeTerrainController.ts'), 'utf8');
  const scene = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'three', 'ThreeScene.ts'), 'utf8');
  assert.match(terrainController, /triangleHasCoverage/);
  assert.match(terrainController, /loadTerrainCoverageMask/);
  assert.match(scene, /terrain-ownership/);
  assert.match(scene, /noOwnerSamples/);
});

test('V0.8.1 terrain-solid isolates terrain from cartographic and battle overlays', () => {
  const scene = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'three', 'ThreeScene.ts'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'three', 'ThreeHistoricalTerrainRenderer.tsx'), 'utf8');
  const experience = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'HistoricalMapExperience.tsx'), 'utf8');
  const terrain = fs.readFileSync(path.join(root, 'src', 'components', 'map', 'three', 'ThreeTerrainController.ts'), 'utf8');
  assert.match(scene, /'terrain-solid'/);
  assert.match(scene, /new THREE\.MeshBasicMaterial\(\{ color: 0x050505/);
  assert.match(scene, /setTerrainSolid\(this\.regional/);
  assert.match(renderer, /'terrain-solid'/);
  assert.match(experience, /terrainIsolationQa/);
  assert.match(terrain, /solidTerrain/);
  assert.match(terrain, /vec3\(0\.96, 0\.96, 0\.96\)/);
});
