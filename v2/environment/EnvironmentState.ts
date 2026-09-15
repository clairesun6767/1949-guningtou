import {
  DEFAULT_ENVIRONMENT_CLOUD_CONTROLS,
  DEFAULT_ENVIRONMENT_DEBUG,
  ENVIRONMENT_TIME_PRESETS,
  ENVIRONMENT_WEATHER,
  type EnvironmentCloudControls,
  type EnvironmentDebugState,
  type EnvironmentTimePreset,
  type EnvironmentWeather,
  type EnvironmentVector2,
  type EnvironmentVector3,
} from '../config/environment.js';
import { RegionSun } from './RegionSun.js';

export interface EnvironmentState {
  enabled: boolean;
  weather: EnvironmentWeather;
  time: EnvironmentTimePreset;
  sunDirection: EnvironmentVector3;
  sunColor: string;
  sunIntensity: number;
  exposure: number;
  atmosphereDensity: number;
  cloudCoverage: number;
  cloudOpacity: number;
  cloudAltitude: number;
  windDirection: EnvironmentVector2;
  windSpeed: number;
  cloudShadowStrength: number;
  debug: EnvironmentDebugState;
}

export function createEnvironmentState(input: {
  enabled?: boolean;
  time?: EnvironmentTimePreset;
  weather?: EnvironmentWeather;
  debug?: Partial<EnvironmentDebugState>;
  cloudControls?: Partial<EnvironmentCloudControls>;
} = {}): EnvironmentState {
  const time = input.time ?? 'HISTORICAL_DAYLIGHT';
  const weather = input.weather ?? 'LIGHT_CLOUD';
  const timePreset = ENVIRONMENT_TIME_PRESETS[time].preset;
  const weatherPreset = ENVIRONMENT_WEATHER[weather];
  const controls = {
    ...DEFAULT_ENVIRONMENT_CLOUD_CONTROLS,
    coverage: weatherPreset.coverage,
    opacity: weatherPreset.opacity,
    shadowStrength: weatherPreset.cloudShadowStrength,
    ...input.cloudControls,
  };
  return {
    enabled: input.enabled ?? false,
    weather,
    time,
    sunDirection: { ...new RegionSun(time).snapshot().direction },
    sunColor: timePreset.sunColor,
    sunIntensity: timePreset.sunIntensity,
    exposure: timePreset.exposure,
    atmosphereDensity: timePreset.atmosphereDensity,
    cloudCoverage: Math.min(1, Math.max(0, controls.coverage)),
    cloudOpacity: Math.min(1, Math.max(0, controls.opacity)),
    cloudAltitude: Math.min(40, Math.max(8, controls.altitude)),
    windDirection: { ...timePreset.windDirection },
    windSpeed: Math.min(2, Math.max(0, controls.windSpeed)),
    cloudShadowStrength: Math.min(0.3, Math.max(0, controls.shadowStrength)),
    debug: { ...DEFAULT_ENVIRONMENT_DEBUG, ...input.debug },
  };
}

export function environmentStateWithTime(state: EnvironmentState, time: EnvironmentTimePreset): EnvironmentState {
  const next = createEnvironmentState({ enabled: state.enabled, time, weather: state.weather, debug: state.debug });
  return {
    ...next,
    cloudCoverage: state.cloudCoverage,
    cloudOpacity: state.cloudOpacity,
    cloudAltitude: state.cloudAltitude,
    windSpeed: state.windSpeed,
    cloudShadowStrength: state.cloudShadowStrength,
  };
}

