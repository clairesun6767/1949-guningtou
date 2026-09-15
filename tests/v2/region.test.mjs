import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { REGION_CONFIG, REGION_VARIANTS } from '../../.tmp/v2-tests/v2/config/region.js';
import { clampRegionDistance, clampRegionPolarDegrees, clampRegionTarget, getRegionPreset, targetWithinRegionBounds } from '../../.tmp/v2-tests/v2/prototypes/region/RegionCamera.js';
import { REGION_SCENE_CONTRACT } from '../../.tmp/v2-tests/v2/prototypes/region/RegionScene.js';
import { HttpRegionDataProvider, regionAssetPaths } from '../../.tmp/v2-tests/v2/shared/regionDataProvider.js';

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
});

test('basic RegionScene initialization contract is split by stage and module boundary', () => {
  assert.equal(typeof REGION_SCENE_CONTRACT.id, 'string');
  assert.deepEqual(REGION_SCENE_CONTRACT.stages, ['terrain', 'material', 'atmosphere', 'labels', 'ready']);
  assert.equal(REGION_SCENE_CONTRACT.requiredModules.length, 8);
  assert.ok(REGION_SCENE_CONTRACT.requiredModules.includes('RegionDataProvider'));
});
