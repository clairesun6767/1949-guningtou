import type { GeoJsonGeometry, LocalizedText } from '../types/index.js';

export const BATTLE_PRIMITIVE_TYPES = [
  'location',
  'event',
  'area',
  'direction',
  'corridor',
  'front',
  'route',
] as const;

export type BattlePrimitiveType = typeof BATTLE_PRIMITIVE_TYPES[number];

export const HISTORICAL_CONFIDENCES = [
  'verified',
  'probable',
  'approximate',
  'interpretive',
] as const;

export type HistoricalConfidence = typeof HISTORICAL_CONFIDENCES[number];

export const HISTORICAL_ROUTE_STATUSES = [
  'verified',
  'candidate',
  'deprecated',
  'insufficient_evidence',
] as const;

export type HistoricalRouteStatus = typeof HISTORICAL_ROUTE_STATUSES[number];

export type MapFeatureSide = 'roc' | 'pla' | 'civilian' | 'neutral' | 'unknown';
export type MapFeatureVisibility = 'production' | 'research' | 'hidden';
export type ReferenceEra = 'modern_reference' | 'historical_verified' | 'historical_approximate' | 'interpretive_cartography';

export interface BattleMapFeature {
  id: string;
  type: BattlePrimitiveType;
  geometry: GeoJsonGeometry | null;
  time?: string;
  timeRange?: {
    start: string;
    end: string;
  };
  side?: MapFeatureSide;
  confidence: HistoricalConfidence;
  sourceIds: string[];
  relatedLocations: string[];
  relatedPeople: string[];
  description?: LocalizedText;
  visibility: MapFeatureVisibility;
  researchOnly: boolean;
  historicalRouteStatus?: HistoricalRouteStatus;
  metadata?: Record<string, unknown>;
}

export const MAP_LAYER_IDS = [
  'terrain',
  'coastline',
  'land-cover',
  'roads',
  'settlements',
  'vegetation',
  'beaches',
  'modern-reference',
  'historical-poi',
  'battle-events',
  'battle-movement',
  'battle-areas',
  'battle-directions',
  'battle-corridors',
  'verified-routes',
  'candidate-routes',
  'historical-imagery',
  'historical-battle-traces',
  'historical-battle-map',
  'labels',
  'research-layer',
] as const;

export type MapLayerId = typeof MAP_LAYER_IDS[number];

export interface LayerState {
  enabled: Set<MapLayerId>;
  researchMode: boolean;
}

export interface TimelineFilter {
  activeDate?: string;
}

export interface CameraPreset {
  id: CameraPresetId;
  scale: number;
  translateX: number;
  translateY: number;
  tiltDegrees: number;
  durationMs: number;
  detailLevel: 'low' | 'medium' | 'high';
  atmosphere: 'full' | 'reduced' | 'minimal';
}

export type HistoricalRendererMode = 'three' | 'cesium' | 'atlas';

export interface GeographicCameraDestination {
  longitude: number;
  latitude: number;
  height: number;
  headingDegrees: number;
  pitchDegrees: number;
  rollDegrees: number;
  durationMs: number;
}

export type CameraPresetId =
  | 'strategic'
  | 'kinmen'
  | 'guningtou'
  | 'landing_coast'
  | 'battle_overview'
  | 'poi_focus'
  | 'story_mode';

export interface BattleTimelineStep {
  id: string;
  date: string;
  label: LocalizedText;
  summary: LocalizedText;
  confidence: HistoricalConfidence;
  sourceIds: string[];
  eventIds: string[];
  relatedLocations: string[];
}
