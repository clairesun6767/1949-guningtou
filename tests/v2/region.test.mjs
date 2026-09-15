import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { REGION_CONFIG, REGION_TERRAIN_QUALITY, REGION_VARIANTS } from '../../.tmp/v2-tests/v2/config/region.js';
import { clampRegionDistance, clampRegionPolarDegrees, clampRegionTarget, getRegionPreset, targetWithinRegionBounds } from '../../.tmp/v2-tests/v2/prototypes/region/RegionCamera.js';
import { REGION_SCENE_CONTRACT } from '../../.tmp/v2-tests/v2/prototypes/region/RegionScene.js';
import { HttpRegionDataProvider, regionAssetPaths } from '../../.tmp/v2-tests/v2/shared/regionDataProvider.js';

function collectCoordinatePoints(value, points = []) {
  if (!Array.isArray(value) || value.length === 0) return points;
  if (typeof value[0] === 'number') {
    points.push(value);
    return points;
  }
  for (const child of value) collectCoordinatePoints(child, points);
  return points;
}

test('camera constraints keep Region View inside the visitor field geometry', () => {
  assert.equal(clampRegionDistance(1), REGION_CONFIG.camera.minDistance);
  assert.equal(clampRegionDistance(999), REGION_CONFIG.camera.maxDistance);
  assert.equal(clampRegionDistance(1, true), REGION_CONFIG.camera.mobileMinDistance);
  assert.equal(clampRegionDistance(999, true), REGION_CONFIG.camera.mobileMaxDistance);
  assert.equal(clampRegionPolarDegrees(1), REGION_CONFIG.camera.minPolarDegrees);
  assert.equal(clampRegionPolarDegrees(999), REGION_CONFIG.camera.maxPolarDegrees);
  assert.deepEqual(clampRegionTarget({ longitude: 100, latitude: 30 }), {
    longitude: REGION_CONFIG.camera.targetBounds.west,
    latitude: REGION_CONFIG.camera.targetBounds.north,
  });
  assert.equal(targetWithinRegionBounds(REGION_CONFIG.presets.guningtou.target), true);
  assert.equal(targetWithinRegionBounds({ longitude: 117, latitude: 24 }), false);
  assert.equal(getRegionPreset('guningtou').distance, REGION_CONFIG.presets.guningtou.distance);
});

test('Region config declares the geographic relationship and three art variants', () => {
  assert.ok(REGION_CONFIG.camera.targetBounds.west < REGION_CONFIG.presets.xiamen.target.longitude);
  assert.ok(REGION_CONFIG.presets.xiamen.target.longitude < REGION_CONFIG.presets.kinmen.target.longitude);
  assert.equal(REGION_CONFIG.labels.length, 4);
  assert.deepEqual(Object.keys(REGION_VARIANTS), ['neutral', 'cinematic', 'historical']);
  assert.equal(REGION_CONFIG.referenceEra, 'modern_reference');
});

test('RegionDataProvider loads only the regional modern-reference boundary', async () => {
  const terrain = JSON.parse(readFileSync('public/terrain/kinmen-xiamen-regional.json', 'utf8'));
  const coastline = JSON.parse(readFileSync('public/map-data/regional-coastline.geojson', 'utf8'));
  const classification = JSON.parse(readFileSync('public/map-data/regional-classification.json', 'utf8'));
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    const value = String(url);
    const payload = value.endsWith('kinmen-xiamen-regional.json') ? terrain : value.endsWith('regional-coastline.geojson') ? coastline : classification;
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const data = await new HttpRegionDataProvider('/1949-guningtou/').load();
    assert.equal(data.terrain.id, 'kinmen-xiamen-regional');
    assert.equal(data.terrain.coordinateSystem, 'EPSG:4326');
    assert.equal(data.coastline.metadata.source.referenceEra, 'modern_reference');
    assert.equal(data.classification.scope, 'regional');
    assert.match(data.assets.terrain, /\/1949-guningtou\/terrain\/kinmen-xiamen-regional\.json$/);
    assert.equal('routes' in data, false);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('RegionDataProvider paths preserve the Astro base path', () => {
  const paths = regionAssetPaths('/1949-guningtou');
  assert.equal(paths.classificationA, '/1949-guningtou/map-data/regional-classification-a.png');
  assert.equal(paths.classificationB, '/1949-guningtou/map-data/regional-classification-b.png');
  assert.equal(paths.terrainB, '/1949-guningtou/terrain/kinmen-xiamen-regional-quality-b.json');
  assert.equal(paths.terrainC, '/1949-guningtou/terrain/kinmen-xiamen-regional-quality-c.json');
});

test('basic RegionScene initialization contract is split by stage and module boundary', () => {
  assert.equal(typeof REGION_SCENE_CONTRACT.id, 'string');
  assert.deepEqual(REGION_SCENE_CONTRACT.stages, ['terrain', 'material', 'atmosphere', 'labels', 'ready']);
  assert.equal(REGION_SCENE_CONTRACT.requiredModules.length, 9);
  assert.ok(REGION_SCENE_CONTRACT.requiredModules.includes('RegionDataProvider'));
  assert.ok(REGION_SCENE_CONTRACT.requiredModules.includes('RegionQualityTerrain'));
});

test('Gate A.1 declares traceable A/B/C quality targets without changing the A baseline', () => {
  assert.deepEqual(Object.keys(REGION_TERRAIN_QUALITY), ['A', 'B', 'C']);
  assert.equal(REGION_TERRAIN_QUALITY.A.grid, '196×100');
  assert.equal(REGION_TERRAIN_QUALITY.B.grid, '512×256');
  assert.equal(REGION_TERRAIN_QUALITY.C.grid, '1024×512');
  assert.match(REGION_TERRAIN_QUALITY.B.coastlineResolution, /2048×1041/);
  assert.match(REGION_TERRAIN_QUALITY.C.coastlineResolution, /OSM vector/);
});

test('B/C assets are native-source sampled grids with complete payloads', () => {
  const expected = {
    B: { file: 'public/terrain/kinmen-xiamen-regional-quality-b.json', width: 512, height: 256 },
    C: { file: 'public/terrain/kinmen-xiamen-regional-quality-c.json', width: 1024, height: 512 },
  };
  for (const [quality, item] of Object.entries(expected)) {
    const asset = JSON.parse(readFileSync(item.file, 'utf8'));
    assert.equal(asset.quality, quality);
    assert.deepEqual(asset.grid, { width: item.width, height: item.height });
    assert.equal(asset.heights.length, item.width * item.height);
    assert.equal(asset.source.nativeGrid, '3601x3601');
    assert.match(asset.derivation.method, /direct bilinear sampling from the native/);
    assert.match(asset.derivation.method, /not an upsample of the 196x100/);
    assert.equal(asset.derivation.visualVerticalExaggerationAppliedAtRuntime, true);
  }
});

test('quality provider validates B and C lazily and keeps source provenance', async () => {
  const assets = {
    B: JSON.parse(readFileSync('public/terrain/kinmen-xiamen-regional-quality-b.json', 'utf8')),
    C: JSON.parse(readFileSync('public/terrain/kinmen-xiamen-regional-quality-c.json', 'utf8')),
  };
  const previousFetch = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async url => {
    const value = String(url);
    requested.push(value);
    const quality = value.includes('quality-b') ? 'B' : 'C';
    return new Response(JSON.stringify(assets[quality]), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const provider = new HttpRegionDataProvider('/1949-guningtou/');
    const balanced = await provider.loadQuality('B');
    const quality = await provider.loadQuality('C');
    assert.equal(balanced.quality, 'B');
    assert.equal(quality.quality, 'C');
    assert.equal(requested.length, 2);
    assert.match(balanced.source.sourceUrl, /N24E118\.hgt\.gz$/);
    assert.equal(balanced.source.temporalScope.includes('not a 1949'), true);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('quality grids preserve fixed geographic bounds for camera consistency', () => {
  const baseline = JSON.parse(readFileSync('public/terrain/kinmen-xiamen-regional.json', 'utf8'));
  for (const file of ['public/terrain/kinmen-xiamen-regional-quality-b.json', 'public/terrain/kinmen-xiamen-regional-quality-c.json']) {
    const asset = JSON.parse(readFileSync(file, 'utf8'));
    assert.deepEqual(asset.bounds, baseline.bounds);
    assert.equal(asset.coordinateSystem, REGION_CONFIG.coordinateSystem);
  }
});

test('coastline validation keeps the independent OSM vector source inside the review bounds', () => {
  const coastline = JSON.parse(readFileSync('public/map-data/regional-coastline.geojson', 'utf8'));
  const qualityAsset = JSON.parse(readFileSync('public/terrain/kinmen-xiamen-regional-quality-b.json', 'utf8'));
  const points = coastline.features.flatMap(feature => collectCoordinatePoints(feature.geometry.coordinates));
  assert.equal(coastline.type, 'FeatureCollection');
  assert.equal(coastline.features.length, 32);
  assert.equal(points.length, 2608);
  const tolerance = 0.03;
  assert.ok(points.every(([longitude, latitude]) => (
    longitude >= qualityAsset.bounds.west - tolerance
      && longitude <= qualityAsset.bounds.east + tolerance
      && latitude >= qualityAsset.bounds.south - tolerance
      && latitude <= qualityAsset.bounds.north + tolerance
  )));
});

test('quality switching disposes the replaced terrain and retains one camera/listener lifecycle', () => {
  const sceneSource = readFileSync('v2/prototypes/region/RegionScene.ts', 'utf8');
  assert.match(sceneSource, /this\.scene\.remove\(previous\.group\)/);
  assert.match(sceneSource, /previous\.dispose\(\)/);
  assert.match(sceneSource, /this\.scene\.add\(this\.terrain\.group\)/);
  assert.match(sceneSource, /this\.ocean\?\.setTerrainQuality\(quality\)/);
  assert.match(sceneSource, /this\.controls\.dispose\(\)/);
  assert.match(sceneSource, /this\.renderer\.domElement\.removeEventListener\('webglcontextlost'/);
  assert.match(sceneSource, /this\.renderer\.dispose\(\)/);
});

test('vertical exaggeration remains a render-time transform and ocean quality response is gated', () => {
  const terrainSource = readFileSync('v2/prototypes/region/RegionTerrain.ts', 'utf8');
  const qualityTerrainSource = readFileSync('v2/prototypes/region/RegionQualityTerrain.ts', 'utf8');
  const oceanSource = readFileSync('v2/prototypes/region/RegionOcean.ts', 'utf8');
  assert.match(terrainSource, /setVerticalExaggeration\(/);
  assert.match(qualityTerrainSource, /setVerticalExaggeration\(nextVerticalExaggeration\)/);
  assert.match(qualityTerrainSource, /visualVerticalExaggerationAppliedAtRuntime|verticalExaggeration/);
  assert.match(oceanSource, /vOceanFresnel/);
  assert.match(oceanSource, /vOceanSunResponse/);
  assert.match(oceanSource, /quality === 'A' \? 0 : 1/);
});
