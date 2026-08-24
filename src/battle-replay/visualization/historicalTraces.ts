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
  /** Optional explicit presentation fields; legacy `label` remains the raw source label. */
  sourceLabel?: LocalizedText;
  visitorLabel?: LocalizedText;
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

export interface HistoricalTraceVisualProgress {
  reveal: number;
  opacity: number;
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

export function historicalTraceSourceLabel(feature: HistoricalTraceFeature, locale = 'zh-Hant') {
  const label = feature.properties.sourceLabel ?? feature.properties.label;
  return label?.[locale] ?? label?.['zh-Hant'] ?? label?.en ?? feature.id;
}

const VISITOR_TRACE_LABELS: Record<string, LocalizedText> = {
  'HBT-PLA-ARROW-01': { 'zh-Hant': '共軍登陸', 'zh-Hans': '共军登陆', en: 'PLA landing' },
  'HBT-PLA-ARROW-02': { 'zh-Hant': '共軍向內陸推進', 'zh-Hans': '共军向内陆推进', en: 'PLA inland advance' },
  'HBT-PLA-CORRIDOR-01': { 'zh-Hant': '共軍行動區域', 'zh-Hans': '共军行动区域', en: 'PLA action area' },
  'HBT-PLA-ARROW-03': { 'zh-Hant': '共軍北向推進', 'zh-Hans': '共军北向推进', en: 'PLA northward advance' },
  'HBT-ROC-ARROW-01': { 'zh-Hant': '國軍反擊', 'zh-Hans': '国军反击', en: 'ROC counterattack' },
  'HBT-ROC-ARROW-02': { 'zh-Hant': '國軍反擊方向', 'zh-Hans': '国军反击方向', en: 'ROC counterattack direction' },
  'HBT-ROC-ARROW-03': { 'zh-Hant': '國軍防線', 'zh-Hans': '国军防线', en: 'ROC defensive line' },
  'HBT-ROC-FRONT-01': { 'zh-Hant': '國軍防線', 'zh-Hans': '国军防线', en: 'ROC defensive line' },
  'HBT-ROC-FRONT-02': { 'zh-Hant': '國軍防線', 'zh-Hans': '国军防线', en: 'ROC defensive line' },
  'HBT-BATTLE-AREA-01': { 'zh-Hant': '戰鬥／行動區域', 'zh-Hans': '战斗／行动区域', en: 'Battle / action area' },
  'HBT-BATTLE-AREA-02': { 'zh-Hant': '戰鬥／行動區域', 'zh-Hans': '战斗／行动区域', en: 'Battle / action area' },
  'HBT-RESEARCH-BRANCH-01': { 'zh-Hant': '研究用待確認分支', 'zh-Hans': '研究用待确认分支', en: 'Research unresolved branch' },
  'HBT-RESEARCH-BRANCH-02': { 'zh-Hant': '研究用待確認範圍', 'zh-Hans': '研究用待确认范围', en: 'Research unresolved area' },
};

export function historicalTraceVisitorLabel(feature: HistoricalTraceFeature, locale = 'zh-Hant') {
  const label = feature.properties.visitorLabel ?? VISITOR_TRACE_LABELS[feature.id];
  if (label) return label[locale] ?? label['zh-Hant'] ?? label.en ?? feature.id;
  if (feature.properties.featureType === 'battle_front' || feature.properties.featureType === 'defensive_line') {
    return locale === 'en' ? 'ROC defensive line' : locale === 'zh-Hans' ? '国军防线' : '國軍防線';
  }
  if (feature.properties.side === 'pla') return locale === 'en' ? 'PLA attack' : locale === 'zh-Hans' ? '共军进攻' : '共軍進攻';
  if (feature.properties.side === 'roc') return locale === 'en' ? 'ROC counterattack' : locale === 'zh-Hans' ? '国军反击' : '國軍反擊';
  return locale === 'en' ? 'Battle / action area' : locale === 'zh-Hans' ? '战斗／行动区域' : '戰鬥／行動區域';
}

/** Backwards-compatible alias: historicalTraceLabel always means the raw source label. */
export function historicalTraceLabel(feature: HistoricalTraceFeature, locale = 'zh-Hant') {
  return historicalTraceSourceLabel(feature, locale);
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

function smoothProgress(value: number) {
  const normalized = Math.max(0, Math.min(1, value));
  return normalized * normalized * (3 - 2 * normalized);
}

export function traceVisualProgressAtProgress(feature: HistoricalTraceFeature, phases: HistoricalTracePhase[], progress: number): HistoricalTraceVisualProgress {
  const normalized = Math.max(0, Math.min(1, progress));
  const isFront = feature.properties.featureType === 'battle_front' || feature.properties.featureType === 'defensive_line';
  if (!isFront) {
    const reveal = traceProgressAtProgress(feature.id, phases, normalized);
    return { reveal, opacity: reveal };
  }

  const relatedPhases = phases.filter(phase => phase.traceIds.includes(feature.id));
  let opacity = 0;
  for (const phase of relatedPhases) {
    const fade = Math.min(.045, Math.max(.018, (phase.endProgress - phase.startProgress) * .25));
    if (normalized < phase.startProgress || normalized > phase.endProgress + fade) continue;
    if (normalized < phase.startProgress + fade) {
      opacity = Math.max(opacity, smoothProgress((normalized - phase.startProgress) / fade));
    } else if (normalized <= phase.endProgress) {
      opacity = 1;
    } else {
      opacity = Math.max(opacity, 1 - smoothProgress((normalized - phase.endProgress) / fade));
    }
  }
  return { reveal: opacity > .001 ? 1 : 0, opacity };
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
