import type { Position } from '../../types/index.js';
import type { BattleMapFeature, CameraPresetId } from '../types.js';

export const THREE_LOCAL_ORIGIN = [118.275, 24.49] as const;
const EARTH_RADIUS_METRES = 6_378_137;

export interface LocalTangentPoint {
  eastMetres: number;
  northMetres: number;
}

export interface ThreePointFeature extends LocalTangentPoint {
  id: string;
  longitude: number;
  latitude: number;
  confidence: BattleMapFeature['confidence'];
  sourceIds: string[];
  label?: string;
  locationType?: string;
}

export interface ThreeCameraDestination {
  longitude: number;
  latitude: number;
  rangeMetres: number;
  pitchDegrees: number;
  headingDegrees: number;
  durationMs: number;
}

const CAMERA_DESTINATIONS: Record<CameraPresetId, ThreeCameraDestination> = {
  strategic: { longitude: 118.255, latitude: 24.49, rangeMetres: 64_000, pitchDegrees: 45, headingDegrees: 326, durationMs: 1500 },
  kinmen: { longitude: 118.35, latitude: 24.455, rangeMetres: 24_000, pitchDegrees: 45, headingDegrees: 340, durationMs: 1450 },
  guningtou: { longitude: 118.325, latitude: 24.47, rangeMetres: 8_600, pitchDegrees: 45, headingDegrees: 344, durationMs: 1550 },
  landing_coast: { longitude: 118.35, latitude: 24.465, rangeMetres: 4_600, pitchDegrees: 43, headingDegrees: 326, durationMs: 1050 },
  battle_overview: { longitude: 118.329, latitude: 24.47, rangeMetres: 7_400, pitchDegrees: 45, headingDegrees: 342, durationMs: 1050 },
  poi_focus: { longitude: 118.329, latitude: 24.47, rangeMetres: 3_800, pitchDegrees: 43, headingDegrees: 338, durationMs: 900 },
  story_mode: { longitude: 118.329, latitude: 24.47, rangeMetres: 6_200, pitchDegrees: 45, headingDegrees: 342, durationMs: 1100 },
};

export function wgs84ToLocalMeters(position: Position, origin: Position = [...THREE_LOCAL_ORIGIN]): LocalTangentPoint {
  const [longitude, latitude] = position;
  const [originLongitude, originLatitude] = origin;
  const radians = Math.PI / 180;
  return {
    eastMetres: (longitude - originLongitude) * radians * EARTH_RADIUS_METRES * Math.cos(originLatitude * radians),
    northMetres: (latitude - originLatitude) * radians * EARTH_RADIUS_METRES,
  };
}

export function getThreeCameraDestination(
  presetId: CameraPresetId,
  options: { mobile?: boolean; reducedMotion?: boolean; focus?: Position; pitchDegrees?: number } = {},
): ThreeCameraDestination {
  const base = CAMERA_DESTINATIONS[presetId];
  const mobileRangeMultiplier = presetId === 'strategic' || presetId === 'kinmen'
    ? 1.28
    : ['guningtou', 'battle_overview', 'story_mode'].includes(presetId)
      ? 1.85
      : presetId === 'landing_coast'
        ? 2
        : 1.8;
  return {
    ...base,
    longitude: options.focus?.[0] ?? base.longitude,
    latitude: options.focus?.[1] ?? base.latitude,
    rangeMetres: base.rangeMetres * (options.mobile ? mobileRangeMultiplier : 1),
    pitchDegrees: options.pitchDegrees ?? base.pitchDegrees,
    durationMs: options.reducedMotion ? 0 : Math.round(base.durationMs * (options.mobile ? .72 : 1)),
  };
}

export function toThreePointFeatures(features: BattleMapFeature[]): ThreePointFeature[] {
  return features.flatMap(feature => {
    if (feature.type !== 'location' || feature.geometry?.type !== 'Point') return [];
    const [longitude, latitude] = feature.geometry.coordinates;
    const local = wgs84ToLocalMeters([longitude, latitude]);
    return [{
      ...local,
      id: feature.id,
      longitude,
      latitude,
      confidence: feature.confidence,
      sourceIds: [...feature.sourceIds],
      label: typeof feature.metadata?.label === 'string' ? feature.metadata.label : undefined,
      locationType: typeof feature.metadata?.locationType === 'string' ? feature.metadata.locationType : undefined,
    }];
  });
}
