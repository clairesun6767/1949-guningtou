import type { EnvironmentVector2, EnvironmentVector3 } from '../config/environment.js';

/**
 * The same deterministic field is injected into the cloud and terrain shaders.
 * It intentionally stays small: no texture upload, no per-cloud shadow map.
 */
export const REGION_CLOUD_DENSITY_GLSL = `
float regionEnvHash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
}

float regionEnvNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  local = local * local * (3.0 - 2.0 * local);
  float a = regionEnvHash(cell);
  float b = regionEnvHash(cell + vec2(1.0, 0.0));
  float c = regionEnvHash(cell + vec2(0.0, 1.0));
  float d = regionEnvHash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
}

float regionEnvFbm(vec2 point) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 4; octave += 1) {
    value += regionEnvNoise(point) * amplitude;
    point = point * 2.03 + vec2(17.0, -11.0);
    amplitude *= 0.5;
  }
  return value;
}

float regionEnvFbm2(vec2 point) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 2; octave += 1) {
    value += regionEnvNoise(point) * amplitude;
    point = point * 2.03 + vec2(17.0, -11.0);
    amplitude *= 0.5;
  }
  return value;
}

float regionEnvCloudDensity(vec2 point, float coverage) {
  // The macro field establishes kilometre-scale cloud bodies, while the
  // medium field cuts visible pockets into each body. Keeping both fields
  // deterministic lets terrain, ocean and the cloud card share the same
  // low-contrast shadow language without a shadow-map allocation.
  float macro = regionEnvFbm(point * 0.72 + vec2(7.2, -3.4));
  float medium = regionEnvFbm(point * 1.62 + vec2(-2.5, 4.1));
  float fine = regionEnvFbm(point * 3.18 + vec2(3.6, 1.7));
  // The FBM range is intentionally compressed toward the middle; these
  // thresholds map W1/W2 to roughly 20–35% / 45–65% visible coverage.
  float threshold = mix(0.57, 0.47, clamp(coverage, 0.0, 1.0));
  float body = smoothstep(threshold - 0.065, threshold + 0.075, macro);
  float breakup = smoothstep(0.30, 0.72, medium);
  float pockets = smoothstep(0.36, 0.70, fine);
  float shapedBody = body * mix(0.34, 1.0, breakup);
  return clamp(shapedBody * mix(0.76, 1.08, pockets), 0.0, 1.0);
}

float regionEnvCloudShadowDensity(vec2 point, float coverage) {
  // Terrain receives a cheaper two-octave proxy. The visible cloud layer
  // keeps the full macro/medium/fine FBM; shadows only need a soft, broad
  // correspondence and should not consume a full shadow-map budget.
  float macro = regionEnvFbm2(point * 0.72 + vec2(7.2, -3.4));
  float medium = regionEnvFbm2(point * 1.34 + vec2(-2.5, 4.1));
  float threshold = mix(0.57, 0.47, clamp(coverage, 0.0, 1.0));
  float body = smoothstep(threshold - 0.11, threshold + 0.10, macro);
  float breakup = smoothstep(0.28, 0.76, medium);
  return clamp(body * mix(0.48, 0.92, breakup), 0.0, 1.0);
}
`;

export interface CloudShadowState {
  enabled: boolean;
  coverage: number;
  strength: number;
  offset: EnvironmentVector2;
  time: number;
  windDirection: EnvironmentVector2;
  windSpeed: number;
}

export function clampEnvironmentCoverage(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export function clampEnvironmentOpacity(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export function clampCloudShadowStrength(value: number) {
  return Number.isFinite(value) ? Math.min(0.3, Math.max(0, value)) : 0;
}

/**
 * Projects the cloud field along the sun ray. The vertical component is
 * clamped so a low dawn sun cannot produce an infinite or NaN shadow offset.
 */
export function calculateCloudShadowOffset(sunDirection: EnvironmentVector3, cloudAltitude: number): EnvironmentVector2 {
  const vertical = Math.max(0.12, Math.abs(sunDirection.y));
  const altitude = Math.min(40, Math.max(0, Number.isFinite(cloudAltitude) ? cloudAltitude : 0));
  const offset = {
    x: (-sunDirection.x / vertical) * altitude,
    y: (-sunDirection.z / vertical) * altitude,
  };
  return {
    x: Number.isFinite(offset.x) ? Math.max(-80, Math.min(80, offset.x)) : 0,
    y: Number.isFinite(offset.y) ? Math.max(-80, Math.min(80, offset.y)) : 0,
  };
}

export function createCloudShadowState(input: {
  enabled?: boolean;
  coverage?: number;
  strength?: number;
  sunDirection: EnvironmentVector3;
  cloudAltitude: number;
  time?: number;
  windDirection?: EnvironmentVector2;
  windSpeed?: number;
}): CloudShadowState {
  return {
    enabled: input.enabled ?? true,
    coverage: clampEnvironmentCoverage(input.coverage ?? 0),
    strength: clampCloudShadowStrength(input.strength ?? 0),
    offset: calculateCloudShadowOffset(input.sunDirection, input.cloudAltitude),
    time: Number.isFinite(input.time) ? input.time ?? 0 : 0,
    windDirection: input.windDirection ?? { x: 0.86, y: 0.5 },
    windSpeed: Math.max(0, Number.isFinite(input.windSpeed) ? input.windSpeed ?? 0 : 0),
  };
}
