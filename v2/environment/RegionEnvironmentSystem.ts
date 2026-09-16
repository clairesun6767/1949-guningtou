import * as THREE from 'three';
import {
  createEnvironmentState,
  environmentStateWithTime,
  type EnvironmentState,
} from './EnvironmentState.js';
import { createCloudShadowState, type CloudShadowState } from './RegionCloudShadow.js';
import { RegionSun } from './RegionSun.js';
import { createRegionClouds, type RegionCloudsHandle } from './RegionClouds.js';
import type {
  EnvironmentBenchmarkMode,
  EnvironmentCloudControls,
  EnvironmentDebugState,
  EnvironmentTimePreset,
  EnvironmentWeather,
} from '../config/environment.js';
import type { RegionPerformanceTier, RegionVariantId } from '../config/region.js';
import { createRegionAtmosphere, type RegionAtmosphereHandle } from '../prototypes/region/RegionAtmosphere.js';
import { createRegionOcean, type RegionOceanHandle } from '../prototypes/region/RegionOcean.js';

export interface RegionEnvironmentSystemOptions {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  tier: RegionPerformanceTier;
  variant: RegionVariantId;
  mode?: EnvironmentBenchmarkMode;
  time?: EnvironmentTimePreset;
  weather?: EnvironmentWeather;
  debug?: Partial<EnvironmentDebugState>;
  cloudControls?: Partial<EnvironmentCloudControls>;
}

export interface RegionEnvironmentStats {
  mode: EnvironmentBenchmarkMode;
  time: EnvironmentTimePreset;
  weather: EnvironmentWeather;
  enabled: boolean;
  cloudsVisible: boolean;
  cloudLayerPosition: string;
  cloudShadowEnabled: boolean;
  cloudCoverage: number;
  cloudShadowStrength: number;
  sunDirection: string;
  environmentReadyMs: number | null;
}

export interface RegionEnvironmentSystemHandle {
  ocean: RegionOceanHandle;
  atmosphere: RegionAtmosphereHandle;
  clouds: RegionCloudsHandle;
  setVariant(variant: RegionVariantId): void;
  setBenchmarkMode(mode: EnvironmentBenchmarkMode): void;
  setTime(time: EnvironmentTimePreset): void;
  setWeather(weather: EnvironmentWeather): void;
  setCloudControls(controls: Partial<EnvironmentCloudControls>): void;
  setDebug(debug: Partial<EnvironmentDebugState>): void;
  snapshot(): EnvironmentState;
  cloudShadowState(): CloudShadowState;
  getStats(): RegionEnvironmentStats;
  tick(now: number, cameraPosition?: THREE.Vector3): void;
  dispose(): void;
}

function benchmarkEnvironmentEnabled(mode: EnvironmentBenchmarkMode) {
  return mode === 'P1' || mode === 'P3';
}

export function createRegionEnvironmentSystem(options: RegionEnvironmentSystemOptions): RegionEnvironmentSystemHandle {
  let activeVariant = options.variant;
  let activeMode = options.mode ?? 'P0';
  let state = createEnvironmentState({
    enabled: benchmarkEnvironmentEnabled(activeMode),
    time: options.time,
    weather: options.weather,
    debug: options.debug,
    cloudControls: options.cloudControls,
  });
  const sun = new RegionSun(state.time);
  const ocean = createRegionOcean(options.tier);
  const atmosphere = createRegionAtmosphere(options.scene, options.renderer, options.tier, activeVariant);
  const clouds = createRegionClouds(options.tier);
  options.scene.add(ocean.mesh, clouds.mesh);
  const startedAt = performance.now();
  // LOW tier already uses the smallest cloud field (8×8 subdivisions). Keep
  // that lightweight layer visible so the historical-daylight composition does
  // not lose its atmospheric cue merely because the browser reports a low tier.
  const cloudsAllowed = true;
  let shadowState = createCloudShadowState({
    enabled: state.enabled && state.debug.cloudShadows,
    coverage: state.cloudCoverage,
    strength: state.cloudShadowStrength,
    sunDirection: state.sunDirection,
    cloudAltitude: state.cloudAltitude,
    windDirection: state.windDirection,
    windSpeed: state.windSpeed,
  });
  let readyAt: number | null = null;

  function applyState() {
    const environmentVisible = state.enabled;
    const debug = state.debug;
    ocean.setVisible(debug.ocean);
    ocean.setEnhanced(environmentVisible);
    ocean.setEnvironmentState(state);
    ocean.setFeature('coastalDepth', debug.coastalDepth);
    ocean.setFeature('oceanMotion', debug.oceanMotion);
    ocean.setFeature('sunGlint', debug.sunGlint);
    ocean.setCloudShadow(shadowState);
    clouds.setState(state);
    clouds.setVisible(cloudsAllowed && environmentVisible && debug.clouds && state.cloudOpacity > 0 && state.cloudCoverage > 0);
    atmosphere.setSunState(state);
    atmosphere.setExposure(debug.postProcessing ? state.exposure : 1);
    atmosphere.setAtmosphereDensity(debug.atmosphere ? state.atmosphereDensity : 0.0005);
    atmosphere.setFogEnabled(debug.atmosphere && debug.fog);
    atmosphere.setShadowsEnabled(debug.shadow);
    atmosphere.setPostProcessingEnabled(debug.postProcessing);
    shadowState = createCloudShadowState({
      enabled: environmentVisible && debug.cloudShadows,
      coverage: state.cloudCoverage,
      strength: state.cloudShadowStrength,
      sunDirection: state.sunDirection,
      cloudAltitude: state.cloudAltitude,
      time: shadowState.time,
      windDirection: state.windDirection,
      windSpeed: state.windSpeed,
    });
    ocean.setCloudShadow(shadowState);
  }

  applyState();

  return {
    ocean,
    atmosphere,
    clouds,
    setVariant(variant) {
      activeVariant = variant;
      ocean.setVariant(variant);
      atmosphere.setVariant(variant);
    },
    setBenchmarkMode(mode) {
      activeMode = mode;
      state = { ...state, enabled: benchmarkEnvironmentEnabled(mode) };
      applyState();
    },
    setTime(time) {
      sun.setTime(time);
      const next = environmentStateWithTime(state, time);
      state = { ...next, enabled: state.enabled, debug: state.debug };
      applyState();
    },
    setWeather(weather) {
      state = createEnvironmentState({ enabled: state.enabled, time: state.time, weather, debug: state.debug, cloudControls: state });
      applyState();
    },
    setCloudControls(controls) {
      state = createEnvironmentState({ enabled: state.enabled, time: state.time, weather: state.weather, debug: state.debug, cloudControls: { ...state, ...controls } });
      applyState();
    },
    setDebug(debug) {
      state = { ...state, debug: { ...state.debug, ...debug } };
      applyState();
    },
    snapshot() {
      return { ...state, debug: { ...state.debug }, sunDirection: { ...state.sunDirection }, windDirection: { ...state.windDirection } };
    },
    cloudShadowState() {
      return { ...shadowState, offset: { ...shadowState.offset }, windDirection: { ...shadowState.windDirection } };
    },
    getStats() {
      return {
        mode: activeMode,
        time: state.time,
        weather: state.weather,
        enabled: state.enabled,
        cloudsVisible: clouds.mesh.visible,
        cloudLayerPosition: `${clouds.mesh.position.x.toFixed(1)},${clouds.mesh.position.y.toFixed(1)},${clouds.mesh.position.z.toFixed(1)}`,
        cloudShadowEnabled: shadowState.enabled,
        cloudCoverage: state.cloudCoverage,
        cloudShadowStrength: state.cloudShadowStrength,
        sunDirection: `${state.sunDirection.x.toFixed(2)},${state.sunDirection.y.toFixed(2)},${state.sunDirection.z.toFixed(2)}`,
        environmentReadyMs: readyAt,
      };
    },
    tick(now, cameraPosition) {
      shadowState.time = now;
      clouds.tick(now, cameraPosition);
      ocean.tick(now, cameraPosition);
      if (readyAt === null) readyAt = performance.now() - startedAt;
    },
    dispose() {
      options.scene.remove(ocean.mesh, clouds.mesh);
      ocean.dispose();
      clouds.dispose();
      atmosphere.dispose();
    },
  };
}
