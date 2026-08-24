import type { GeoJsonGeometry, LocalizedText, Position } from '../types/index.js';

export const HISTORICAL_TRACE_FEATURE_TYPES = [
  'historical_attack_arrow',
  'historical_movement_path',
  'historical_movement_corridor',
  'battle_front',
  'defensive_line',
  'battle_area',
] as const;

export type HistoricalTraceFeatureType = typeof HISTORICAL_TRACE_FEATURE_TYPES[number];
export type HistoricalTraceSide = 'pla' | 'roc' | 'neutral' | 'unknown';
export type HistoricalTraceReviewStatus = 'reviewed' | 'needs_human_confirmation' | 'rejected';
export type HistoricalTraceRegistrationMethod = 'anchor_registered' | 'locally_warped' | 'schematic_only';

export interface HistoricalTraceTimeRange {
  start: string;
  end: string;
  precision?: 'date-level' | 'relative_phase' | 'unknown';
}

export interface SourceGraphicReference {
  imageWidth: number;
  imageHeight: number;
  points: Array<[x: number, y: number]>;
}

export interface HistoricalTraceProperties {
  id: string;
  battleDate: string;
  timeRange?: HistoricalTraceTimeRange;
  side: HistoricalTraceSide;
  featureType: HistoricalTraceFeatureType;
  sourceMapId: string;
  sourceImage: string;
  sourceTraceMethod: 'historical_map_trace';
  registrationMethod: HistoricalTraceRegistrationMethod;
  confidence: 'probable' | 'approximate' | 'interpretive';
  reviewStatus: HistoricalTraceReviewStatus;
  visibility: 'production' | 'research' | 'hidden';
  researchOnly: boolean;
  relatedLocations: string[];
  relatedUnits: string[];
  sourceIds: string[];
  notes: string;
  label?: LocalizedText;
  description?: LocalizedText;
  sourceGraphic?: SourceGraphicReference;
  controlPoints?: Position[];
}

export interface HistoricalTraceFeature {
  type: 'Feature';
  id: string;
  geometry: GeoJsonGeometry;
  properties: HistoricalTraceProperties;
}

export interface HistoricalTraceCollection {
  type: 'FeatureCollection';
  metadata: {
    schemaVersion: string;
    battleId: string;
    sourceMapId: string;
    sourceImage: string;
    sourceTraceMethod: 'historical_map_trace';
    registrationMethod: HistoricalTraceRegistrationMethod;
    registrationStatus: string;
    reviewStatus: string;
    disclaimer: LocalizedText;
    note: string;
  };
  features: HistoricalTraceFeature[];
}

export interface HistoricalTracePhase {
  id: string;
  sequence: number;
  date: string;
  startProgress: number;
  endProgress: number;
  title: LocalizedText;
  summary: LocalizedText;
  traceIds: string[];
  sourceIds: string[];
}

export interface HistoricalTracePhaseCollection {
  schemaVersion: string;
  battleId: string;
  sourceMapId: string;
  timePrecision: 'relative_phase';
  note: string;
  phases: HistoricalTracePhase[];
}

function isLineGeometry(geometry: GeoJsonGeometry) {
  return geometry.type === 'LineString' || geometry.type === 'MultiLineString';
}

function isAreaGeometry(geometry: GeoJsonGeometry) {
  return geometry.type === 'Polygon' || geometry.type === 'MultiPolygon';
}

export function validateHistoricalTraceFeature(feature: HistoricalTraceFeature): string[] {
  const errors: string[] = [];
  const properties = feature.properties;
  if (!feature.id?.trim() || properties.id !== feature.id) errors.push('Historical trace id must be present and stable.');
  if (!HISTORICAL_TRACE_FEATURE_TYPES.includes(properties.featureType)) errors.push('Unsupported historical trace type: ' + String(properties.featureType));
  if (!properties.battleDate?.trim()) errors.push('Historical trace battleDate is required.');
  if (!['pla', 'roc', 'neutral', 'unknown'].includes(properties.side)) errors.push('Historical trace side is invalid.');
  if (properties.sourceTraceMethod !== 'historical_map_trace') errors.push('Historical trace must declare historical_map_trace.');
  if (!properties.sourceMapId?.trim() || !properties.sourceImage?.trim()) errors.push('Historical trace source map identity is required.');
  if (!['anchor_registered', 'locally_warped', 'schematic_only'].includes(properties.registrationMethod)) errors.push('Historical trace registrationMethod is invalid.');
  if (!['probable', 'approximate', 'interpretive'].includes(properties.confidence)) errors.push('Historical trace confidence is invalid.');
  if (!['reviewed', 'needs_human_confirmation', 'rejected'].includes(properties.reviewStatus)) errors.push('Historical trace reviewStatus is invalid.');
  if (!Array.isArray(properties.relatedLocations) || !Array.isArray(properties.relatedUnits) || !Array.isArray(properties.sourceIds)) errors.push('Historical trace relationship fields must be arrays.');
  if (!properties.notes?.trim()) errors.push('Historical trace notes are required.');
  if (!feature.geometry) errors.push('Historical trace geometry is required.');
  const isAreaFeature = properties.featureType === 'battle_area' || properties.featureType === 'historical_movement_corridor';
  if (isAreaFeature && !isAreaGeometry(feature.geometry)) errors.push(properties.featureType + ' must use polygon geometry.');
  if (!isAreaFeature && !isLineGeometry(feature.geometry)) errors.push(properties.featureType + ' must use line geometry.');
  if (properties.researchOnly !== (properties.visibility === 'research')) errors.push('researchOnly and visibility must agree for source traces.');
  if (properties.timeRange && properties.timeRange.start > properties.timeRange.end) errors.push('Historical trace timeRange is reversed.');
  if (properties.sourceGraphic) {
    if (properties.sourceGraphic.imageWidth <= 0 || properties.sourceGraphic.imageHeight <= 0) errors.push('sourceGraphic image dimensions must be positive.');
    if (properties.sourceGraphic.points.length < 2) errors.push('sourceGraphic needs at least two source points.');
  }
  return errors;
}

export function validateHistoricalTraceCollection(collection: HistoricalTraceCollection): string[] {
  const errors: string[] = [];
  if (collection.type !== 'FeatureCollection') errors.push('Historical trace collection must be a FeatureCollection.');
  if (collection.metadata?.sourceTraceMethod !== 'historical_map_trace') errors.push('Historical trace collection sourceTraceMethod is invalid.');
  if (collection.metadata?.registrationMethod !== 'schematic_only') errors.push('The current source map collection must remain schematic_only until human registration review.');
  const ids = new Set<string>();
  for (const feature of collection.features ?? []) {
    if (ids.has(feature.id)) errors.push('Duplicate historical trace id: ' + feature.id);
    ids.add(feature.id);
    errors.push(...validateHistoricalTraceFeature(feature).map(error => feature.id + ': ' + error));
  }
  return errors;
}

export function historicalTraceMatchesDate(feature: HistoricalTraceFeature, activeDate?: string) {
  if (!activeDate) return true;
  const range = feature.properties.timeRange;
  if (range) return activeDate >= range.start.slice(0, 10) && activeDate <= range.end.slice(0, 10);
  return feature.properties.battleDate.slice(0, 10) === activeDate;
}

export function historicalTraceLabel(feature: HistoricalTraceFeature, locale = 'zh-Hant') {
  return feature.properties.label?.[locale] ?? feature.properties.label?.['zh-Hant'] ?? feature.properties.label?.en ?? feature.id;
}

export function phaseAtProgress(phases: HistoricalTracePhase[], progress: number) {
  const normalized = Math.max(0, Math.min(1, progress));
  return phases.find((phase, index) => normalized >= phase.startProgress && (normalized < phase.endProgress || index === phases.length - 1))
    ?? phases.at(-1);
}

export function traceProgressAtProgress(featureId: string, phases: HistoricalTracePhase[], progress: number) {
  const normalized = Math.max(0, Math.min(1, progress));
  const phase = phases.find(candidate => candidate.traceIds.includes(featureId));
  if (!phase) return 0;
  if (normalized >= phase.endProgress) return 1;
  if (normalized < phase.startProgress) return 0;
  const localRange = Math.max(.0001, phase.endProgress - phase.startProgress);
  return Math.max(0, Math.min(1, (normalized - phase.startProgress) / localRange));
}

export function parseHistoricalTraceCollection(raw: string): HistoricalTraceCollection {
  const collection = JSON.parse(raw) as HistoricalTraceCollection;
  const errors = validateHistoricalTraceCollection(collection);
  if (errors.length) throw new Error('Historical trace data invalid: ' + errors.join(' | '));
  return collection;
}

export function parseHistoricalTracePhases(raw: string): HistoricalTracePhaseCollection {
  const collection = JSON.parse(raw) as HistoricalTracePhaseCollection;
  if (!Array.isArray(collection.phases) || collection.phases.length === 0) throw new Error('Historical phase data must contain phases.');
  if (collection.phases.some(phase => phase.startProgress < 0 || phase.endProgress > 1 || phase.startProgress > phase.endProgress)) {
    throw new Error('Historical phase progress ranges are invalid.');
  }
  return collection;
}
