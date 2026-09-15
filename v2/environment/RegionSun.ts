import type { EnvironmentTimePreset, EnvironmentVector3 } from '../config/environment.js';
import { ENVIRONMENT_TIME_PRESETS } from '../config/environment.js';

export interface RegionSunState {
  direction: EnvironmentVector3;
  color: string;
  intensity: number;
  exposure: number;
}

export function normalizeSunDirection(direction: EnvironmentVector3): EnvironmentVector3 {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  if (!Number.isFinite(length) || length < 0.0001) return { x: 0, y: 1, z: 0 };
  return { x: direction.x / length, y: direction.y / length, z: direction.z / length };
}

export function sunStateForTime(time: EnvironmentTimePreset): RegionSunState {
  const preset = ENVIRONMENT_TIME_PRESETS[time].preset;
  return {
    direction: normalizeSunDirection(preset.sunDirection),
    color: preset.sunColor,
    intensity: preset.sunIntensity,
    exposure: preset.exposure,
  };
}

export class RegionSun {
  private time: EnvironmentTimePreset;
  private state: RegionSunState;

  constructor(time: EnvironmentTimePreset = 'HISTORICAL_DAYLIGHT') {
    this.time = time;
    this.state = sunStateForTime(time);
  }

  setTime(time: EnvironmentTimePreset) {
    this.time = time;
    this.state = sunStateForTime(time);
  }

  getTime() {
    return this.time;
  }

  snapshot() {
    return {
      direction: { ...this.state.direction },
      color: this.state.color,
      intensity: this.state.intensity,
      exposure: this.state.exposure,
    };
  }
}

