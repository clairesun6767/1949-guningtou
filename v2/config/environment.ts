import type { HistoricalAerialMode } from './historicalAerial.js';

export type EnvironmentBenchmarkMode = 'P0' | 'P1' | 'P2' | 'P3';
export type EnvironmentWeather = 'W0' | 'W1' | 'W2' | 'CLEAR' | 'LIGHT_CLOUD' | 'BROKEN_CLOUD';
export type EnvironmentTimePreset = 'T0' | 'T1' | 'T2' | 'HISTORICAL_DAYLIGHT' | 'BATTLEFIELD_DAWN' | 'AERIAL_ARCHIVE';
export type HistoricalBenchmarkMode = 'H0' | 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6' | 'H7';

export interface EnvironmentVector3 {
  x: number;
  y: number;
  z: number;
}

export interface EnvironmentVector2 {
  x: number;
  y: number;
}

export interface EnvironmentPreset {
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
}

export interface EnvironmentDebugState {
  ocean: boolean;
  coastalDepth: boolean;
  oceanMotion: boolean;
  sunGlint: boolean;
  clouds: boolean;
  cloudShadows: boolean;
  atmosphere: boolean;
  fog: boolean;
  shadow: boolean;
  postProcessing: boolean;
}

export interface EnvironmentCloudControls {
  coverage: number;
  opacity: number;
  altitude: number;
  windSpeed: number;
  shadowStrength: number;
}

export const ENVIRONMENT_MODES: Record<EnvironmentBenchmarkMode, {
  label: string;
  englishLabel: string;
  description: string;
  environmentEnabled: boolean;
  aerialEnabled: boolean;
  aerialMode: HistoricalAerialMode;
}> = {
  P0: {
    label: 'P0 基線',
    englishLabel: 'BASELINE',
    description: 'A.3 歷史地形／簡化環境',
    environmentEnabled: false,
    aerialEnabled: false,
    aerialMode: 'OFF',
  },
  P1: {
    label: 'P1 環境',
    englishLabel: 'ENVIRONMENT',
    description: '增強海面／雲／雲影／大氣',
    environmentEnabled: true,
    aerialEnabled: false,
    aerialMode: 'OFF',
  },
  P2: {
    label: 'P2 1945 航照',
    englishLabel: '1945 AERIAL',
    description: '本機低解析航照／簡化環境',
    environmentEnabled: false,
    aerialEnabled: true,
    aerialMode: 'AERIAL',
  },
  P3: {
    label: 'P3 航照＋環境',
    englishLabel: 'AERIAL + ENVIRONMENT',
    description: '本機航照／海面／雲／雲影／大氣',
    environmentEnabled: true,
    aerialEnabled: true,
    aerialMode: 'AERIAL_RELIEF',
  },
};

export const ENVIRONMENT_WEATHER: Record<EnvironmentWeather, {
  label: string;
  englishLabel: string;
  coverage: number;
  opacity: number;
  cloudShadowStrength: number;
}> = {
  W0: { label: '晴朗', englishLabel: 'W0 CLEAR', coverage: 0, opacity: 0, cloudShadowStrength: 0 },
  W1: { label: '薄雲', englishLabel: 'W1 LIGHT CLOUD', coverage: 0.42, opacity: 0.46, cloudShadowStrength: 0.12 },
  W2: { label: '多雲', englishLabel: 'W2 BROKEN CLOUD', coverage: 0.68, opacity: 0.58, cloudShadowStrength: 0.2 },
  CLEAR: { label: '晴朗', englishLabel: 'CLEAR', coverage: 0, opacity: 0, cloudShadowStrength: 0 },
  LIGHT_CLOUD: { label: '薄雲', englishLabel: 'LIGHT CLOUD', coverage: 0.42, opacity: 0.46, cloudShadowStrength: 0.12 },
  BROKEN_CLOUD: { label: '多雲', englishLabel: 'BROKEN CLOUD', coverage: 0.68, opacity: 0.58, cloudShadowStrength: 0.2 },
};

export const ENVIRONMENT_TIME_PRESETS: Record<EnvironmentTimePreset, {
  label: string;
  englishLabel: string;
  preset: EnvironmentPreset;
}> = {
  T0: {
    label: '日間',
    englishLabel: 'T0 DAYLIGHT',
    preset: {
      sunDirection: { x: -0.46, y: 0.78, z: 0.34 },
      sunColor: '#f0d7a0',
      sunIntensity: 3.1,
      exposure: 1.18,
      atmosphereDensity: 0.0068,
      cloudCoverage: 0.42,
      cloudOpacity: 0.46,
      cloudAltitude: 18,
      windDirection: { x: 0.86, y: 0.5 },
      windSpeed: 0.42,
      cloudShadowStrength: 0.12,
    },
  },
  T1: {
    label: '戰地晨曦',
    englishLabel: 'T1 DAWN',
    preset: {
      sunDirection: { x: -0.72, y: 0.42, z: 0.55 },
      sunColor: '#efaa72',
      sunIntensity: 3.35,
      exposure: 1.14,
      atmosphereDensity: 0.0082,
      cloudCoverage: 0.52,
      cloudOpacity: 0.5,
      cloudAltitude: 19,
      windDirection: { x: 0.86, y: 0.5 },
      windSpeed: 0.42,
      cloudShadowStrength: 0.16,
    },
  },
  T2: {
    label: '航照檔案',
    englishLabel: 'T2 AERIAL ARCHIVE',
    preset: {
      sunDirection: { x: -0.34, y: 0.85, z: 0.38 },
      sunColor: '#e6d2a1',
      sunIntensity: 2.9,
      exposure: 1.12,
      atmosphereDensity: 0.0074,
      cloudCoverage: 0.32,
      cloudOpacity: 0.36,
      cloudAltitude: 18,
      windDirection: { x: 0.86, y: 0.5 },
      windSpeed: 0.32,
      cloudShadowStrength: 0.1,
    },
  },
  HISTORICAL_DAYLIGHT: {
    label: '歷史日光',
    englishLabel: 'HISTORICAL DAYLIGHT',
    preset: {
      sunDirection: { x: -0.46, y: 0.78, z: 0.34 },
      sunColor: '#f0d7a0',
      sunIntensity: 3.1,
      exposure: 1.18,
      atmosphereDensity: 0.0068,
      cloudCoverage: 0.42,
      cloudOpacity: 0.46,
      cloudAltitude: 18,
      windDirection: { x: 0.86, y: 0.5 },
      windSpeed: 0.42,
      cloudShadowStrength: 0.12,
    },
  },
  BATTLEFIELD_DAWN: {
    label: '戰地晨曦',
    englishLabel: 'BATTLEFIELD DAWN',
    preset: {
      sunDirection: { x: -0.72, y: 0.42, z: 0.55 },
      sunColor: '#efaa72',
      sunIntensity: 3.35,
      exposure: 1.14,
      atmosphereDensity: 0.0082,
      cloudCoverage: 0.52,
      cloudOpacity: 0.5,
      cloudAltitude: 19,
      windDirection: { x: 0.86, y: 0.5 },
      windSpeed: 0.42,
      cloudShadowStrength: 0.16,
    },
  },
  AERIAL_ARCHIVE: {
    label: '航照檔案',
    englishLabel: 'AERIAL ARCHIVE',
    preset: {
      sunDirection: { x: -0.34, y: 0.85, z: 0.38 },
      sunColor: '#e6d2a1',
      sunIntensity: 2.9,
      exposure: 1.12,
      atmosphereDensity: 0.0074,
      cloudCoverage: 0.32,
      cloudOpacity: 0.36,
      cloudAltitude: 18,
      windDirection: { x: 0.86, y: 0.5 },
      windSpeed: 0.32,
      cloudShadowStrength: 0.1,
    },
  },
};

export const DEFAULT_ENVIRONMENT_DEBUG: EnvironmentDebugState = {
  ocean: true,
  coastalDepth: true,
  oceanMotion: true,
  sunGlint: true,
  clouds: true,
  cloudShadows: true,
  atmosphere: true,
  fog: true,
  shadow: true,
  postProcessing: true,
};

export const DEFAULT_ENVIRONMENT_CLOUD_CONTROLS: EnvironmentCloudControls = {
  coverage: ENVIRONMENT_TIME_PRESETS.HISTORICAL_DAYLIGHT.preset.cloudCoverage,
  opacity: ENVIRONMENT_TIME_PRESETS.HISTORICAL_DAYLIGHT.preset.cloudOpacity,
  altitude: ENVIRONMENT_TIME_PRESETS.HISTORICAL_DAYLIGHT.preset.cloudAltitude,
  windSpeed: ENVIRONMENT_TIME_PRESETS.HISTORICAL_DAYLIGHT.preset.windSpeed,
  shadowStrength: ENVIRONMENT_TIME_PRESETS.HISTORICAL_DAYLIGHT.preset.cloudShadowStrength,
};

export function environmentModeDefaults(mode: EnvironmentBenchmarkMode) {
  return ENVIRONMENT_MODES[mode];
}

export const ENVIRONMENT_HISTORICAL_MODES: Record<HistoricalBenchmarkMode, {
  label: string;
  englishLabel: string;
  description: string;
  aerialMode: HistoricalAerialMode;
  environmentMode: EnvironmentBenchmarkMode;
  year?: 1944 | 1945 | 1958;
  selectionMode?: 'smart' | 'single' | 'comparison' | 'distribution';
}> = {
  H0: { label: '歷史基線', englishLabel: 'HISTORICAL BASE', description: '現代 DEM／不載入航照', aerialMode: 'OFF', environmentMode: 'P0' },
  H1: { label: '1944 航照', englishLabel: '1944 AERIAL', description: '單年度本機 POC', aerialMode: 'AERIAL', environmentMode: 'P2', year: 1944, selectionMode: 'single' },
  H2: { label: '1945 航照', englishLabel: '1945 AERIAL', description: '單年度本機 POC', aerialMode: 'AERIAL', environmentMode: 'P2', year: 1945, selectionMode: 'single' },
  H3: { label: '1958 航照', englishLabel: '1958 AERIAL', description: '後期 fallback／比較', aerialMode: 'AERIAL', environmentMode: 'P2', year: 1958, selectionMode: 'single' },
  H4: { label: '44＋45 智慧合成', englishLabel: '44 + 45 SMART', description: '1944／1945 primary', aerialMode: 'AERIAL', environmentMode: 'P2', selectionMode: 'smart' },
  H5: { label: '智慧＋1958 fallback', englishLabel: 'SMART + 58 FALLBACK', description: 'primary 缺值時回退', aerialMode: 'AERIAL', environmentMode: 'P2', selectionMode: 'smart' },
  H6: { label: '智慧＋地形浮雕', englishLabel: 'SMART + RELIEF', description: '航照 × DEM relief', aerialMode: 'AERIAL_RELIEF', environmentMode: 'P2', selectionMode: 'smart' },
  H7: { label: '智慧＋環境', englishLabel: 'SMART + ENVIRONMENT', description: '完整 P3 環境 benchmark', aerialMode: 'AERIAL_RELIEF', environmentMode: 'P3', selectionMode: 'smart' },
};
