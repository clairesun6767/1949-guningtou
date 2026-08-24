import type { Position } from '../../types/index.js';
import type {
  BattleMapFeature,
  CameraPresetId,
  GeographicCameraDestination,
  HistoricalRendererMode,
  LayerState,
  TimelineFilter,
} from '../types.js';
import { filterVisibleFeatures } from '../engine.js';

export interface CesiumPointFeature {
  id: string;
  longitude: number;
  latitude: number;
  confidence: BattleMapFeature['confidence'];
  sourceIds: string[];
  label?: string;
  locationType?: string;
}

export interface StrategicGeographicLabel {
  id: string;
  label: string;
  longitude: number;
  latitude: number;
  major: boolean;
}

export const STRATEGIC_GEOGRAPHIC_LABELS: StrategicGeographicLabel[] = [
  { id: 'xiamen', label: 'XIAMEN', longitude: 118.0894, latitude: 24.4798, major: true },
  { id: 'dadeng', label: 'DADENG', longitude: 118.326, latitude: 24.543, major: false },
  { id: 'xiaodeng', label: 'XIAODENG', longitude: 118.397, latitude: 24.503, major: false },
  { id: 'kinmen', label: 'KINMEN', longitude: 118.35, latitude: 24.45, major: true },
  { id: 'guningtou', label: 'GUNINGTOU', longitude: 118.318, latitude: 24.478, major: false },
];

const DESKTOP_CAMERAS: Record<CameraPresetId, GeographicCameraDestination> = {
  strategic: { longitude: 118.205, latitude: 24.49, height: 132000, headingDegrees: 8, pitchDegrees: -48, rollDegrees: 0, durationMs: 1400 },
  kinmen: { longitude: 118.315, latitude: 24.472, height: 36000, headingDegrees: 350, pitchDegrees: -48, rollDegrees: 0, durationMs: 1450 },
  guningtou: { longitude: 118.329, latitude: 24.472, height: 9200, headingDegrees: 354, pitchDegrees: -43, rollDegrees: 0, durationMs: 1550 },
  landing_coast: { longitude: 118.348, latitude: 24.466, height: 3300, headingDegrees: 328, pitchDegrees: -39, rollDegrees: 0, durationMs: 1150 },
  battle_overview: { longitude: 118.329, latitude: 24.472, height: 7600, headingDegrees: 350, pitchDegrees: -44, rollDegrees: 0, durationMs: 1100 },
  poi_focus: { longitude: 118.329, latitude: 24.472, height: 2400, headingDegrees: 348, pitchDegrees: -36, rollDegrees: 0, durationMs: 950 },
  story_mode: { longitude: 118.329, latitude: 24.472, height: 5400, headingDegrees: 352, pitchDegrees: -40, rollDegrees: 0, durationMs: 1200 },
};

export function getCesiumCameraDestination(
  presetId: CameraPresetId,
  options: { mobile?: boolean; reducedMotion?: boolean; focus?: Position } = {},
): GeographicCameraDestination {
  const base = DESKTOP_CAMERAS[presetId];
  const focus = options.focus;
  const mobileHeightMultiplier = options.mobile ? 1.32 : 1;
  return {
    ...base,
    longitude: focus?.[0] ?? base.longitude,
    latitude: focus?.[1] ?? base.latitude,
    height: base.height * mobileHeightMultiplier,
    pitchDegrees: options.mobile ? Math.min(-42, base.pitchDegrees - 4) : base.pitchDegrees,
    durationMs: options.reducedMotion ? 0 : Math.round(base.durationMs * (options.mobile ? .68 : 1)),
  };
}

export function toCesiumPointFeatures(features: BattleMapFeature[]): CesiumPointFeature[] {
  return features.flatMap(feature => {
    if (feature.type !== 'location' || feature.geometry?.type !== 'Point') return [];
    const coordinates = feature.geometry.coordinates;
    return [{
      id: feature.id,
      longitude: coordinates[0],
      latitude: coordinates[1],
      confidence: feature.confidence,
      sourceIds: [...feature.sourceIds],
      label: typeof feature.metadata?.label === 'string' ? feature.metadata.label : undefined,
      locationType: typeof feature.metadata?.locationType === 'string' ? feature.metadata.locationType : undefined,
    }];
  });
}

export function getCesiumVisibleFeatures(
  features: BattleMapFeature[],
  layers: LayerState,
  timeline: TimelineFilter,
): BattleMapFeature[] {
  return filterVisibleFeatures(features, layers, timeline);
}

export function chooseHistoricalRenderer(options: {
  preferred?: HistoricalRendererMode;
  webglAvailable: boolean;
  initializationFailed?: boolean;
  lowCapability?: boolean;
}): HistoricalRendererMode {
  if (options.preferred === 'atlas') return 'atlas';
  if (!options.webglAvailable || options.initializationFailed || options.lowCapability) return 'atlas';
  return options.preferred === 'cesium' ? 'cesium' : 'three';
}

export function browserSupportsWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
