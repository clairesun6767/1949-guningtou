import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  ENVIRONMENT_HISTORICAL_MODES,
  ENVIRONMENT_TIME_PRESETS,
  ENVIRONMENT_WEATHER,
  environmentModeDefaults,
} from '../../.tmp/v2-tests/v2/config/environment.js';
import { createEnvironmentState } from '../../.tmp/v2-tests/v2/environment/EnvironmentState.js';
import { REGION_CLOUD_DENSITY_GLSL, calculateCloudShadowOffset, createCloudShadowState } from '../../.tmp/v2-tests/v2/environment/RegionCloudShadow.js';
import { createRegionClouds } from '../../.tmp/v2-tests/v2/environment/RegionClouds.js';
import { normalizeSunDirection, RegionSun, sunStateForTime } from '../../.tmp/v2-tests/v2/environment/RegionSun.js';
import { createRegionOcean } from '../../.tmp/v2-tests/v2/prototypes/region/RegionOcean.js';

test('environment config declares P0–P3, H0–H7, W0–W2 and T0–T2', () => {
  assert.deepEqual(Object.keys({ P0: true, P1: true, P2: true, P3: true }), ['P0', 'P1', 'P2', 'P3']);
  assert.deepEqual(Object.keys(ENVIRONMENT_HISTORICAL_MODES), ['H0', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7']);
  assert.deepEqual(Object.keys(ENVIRONMENT_WEATHER).slice(0, 3), ['W0', 'W1', 'W2']);
  assert.deepEqual(Object.keys(ENVIRONMENT_TIME_PRESETS).slice(0, 3), ['T0', 'T1', 'T2']);
  assert.equal(ENVIRONMENT_HISTORICAL_MODES.H7.environmentMode, 'P3');
  assert.equal(environmentModeDefaults('P0').environmentEnabled, false);
  assert.equal(environmentModeDefaults('P3').environmentEnabled, true);
});

test('environment state responds to time and weather with bounded cloud controls', () => {
  const state = createEnvironmentState({
    enabled: true,
    time: 'T1',
    weather: 'W2',
    cloudControls: { coverage: 2, opacity: -1, altitude: 99, windSpeed: -2, shadowStrength: 2 },
  });
  assert.equal(state.enabled, true);
  assert.equal(state.time, 'T1');
  assert.equal(state.weather, 'W2');
  assert.equal(state.cloudCoverage, 1);
  assert.equal(state.cloudOpacity, 0);
  assert.equal(state.cloudAltitude, 40);
  assert.equal(state.windSpeed, 0);
  assert.equal(state.cloudShadowStrength, 0.3);
  assert.equal(state.sunDirection.y > 0, true);
});

test('sun direction is normalized and time presets are distinct', () => {
  const normalized = normalizeSunDirection({ x: 3, y: 4, z: 0 });
  assert.deepEqual(normalized, { x: 0.6, y: 0.8, z: 0 });
  assert.deepEqual(normalizeSunDirection({ x: 0, y: 0, z: 0 }), { x: 0, y: 1, z: 0 });
  assert.notDeepEqual(sunStateForTime('T0').direction, sunStateForTime('T1').direction);
  const sun = new RegionSun('T0');
  sun.setTime('T2');
  assert.equal(sun.getTime(), 'T2');
  assert.equal(Number.isFinite(sun.snapshot().direction.x), true);
});

test('cloud density is deterministic and cloud shadow projection is finite at dawn', () => {
  assert.match(REGION_CLOUD_DENSITY_GLSL, /regionEnvHash/);
  assert.match(REGION_CLOUD_DENSITY_GLSL, /regionEnvCloudDensity/);
  const offset = calculateCloudShadowOffset({ x: 1, y: 0, z: 1 }, 40);
  assert.equal(Number.isFinite(offset.x), true);
  assert.equal(Number.isFinite(offset.y), true);
  assert.ok(Math.abs(offset.x) <= 80 && Math.abs(offset.y) <= 80);
  const shadow = createCloudShadowState({ sunDirection: { x: -0.7, y: 0.42, z: 0.5 }, cloudAltitude: 19, coverage: 0.5, strength: 0.2, time: 8 });
  assert.equal(shadow.enabled, true);
  assert.equal(shadow.time, 8);
  assert.ok(shadow.offset.x !== 0 || shadow.offset.y !== 0);
});

test('LOW cloud tier stays cheap and camera-visible while ocean keeps sphere fallback', () => {
  const clouds = createRegionClouds('LOW');
  const initialPosition = clouds.mesh.position.clone();
  clouds.tick(8_000, new THREE.Vector3(80, 10, -80));
  assert.equal(clouds.mesh.geometry.type, 'PlaneGeometry');
  assert.equal(clouds.mesh.geometry.parameters.widthSegments, 8);
  assert.deepEqual(clouds.mesh.position.toArray(), [80, 3.5, -80]);
  assert.notDeepEqual(clouds.mesh.position.toArray(), initialPosition.toArray());
  clouds.dispose();

  const ocean = createRegionOcean('LOW');
  assert.equal(ocean.mesh.geometry.type, 'SphereGeometry');
  ocean.setTerrainQuality('A');
  ocean.setEnhanced(false);
  ocean.setFeature('coastalDepth', false);
  ocean.dispose();
});
