import type { GeoJsonGeometry, Position } from '../types/index.js';
import {
  BATTLE_PRIMITIVE_TYPES,
  HISTORICAL_CONFIDENCES,
  HISTORICAL_ROUTE_STATUSES,
  type BattleMapFeature,
  type BattleTimelineStep,
  type LayerState,
  type MapLayerId,
  type TimelineFilter,
} from './types.js';

export const DEFAULT_VISITOR_LAYERS: MapLayerId[] = [
  'terrain',
  'coastline',
  'land-cover',
  'roads',
  'settlements',
  'vegetation',
  'beaches',
  'historical-poi',
  'battle-events',
  'battle-movement',
  'battle-areas',
  'battle-directions',
  'battle-corridors',
  'historical-battle-traces',
  'verified-routes',
  'labels',
];

const GEOMETRY_BY_TYPE: Record<BattleMapFeature['type'], GeoJsonGeometry['type'][] | null> = {
  location: ['Point', 'MultiPoint'],
  event: ['Point', 'MultiPoint', 'Polygon', 'MultiPolygon'],
  area: ['Polygon', 'MultiPolygon'],
  direction: ['Point', 'MultiPoint', 'LineString', 'MultiLineString'],
  corridor: ['Polygon', 'MultiPolygon'],
  front: ['LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'],
  route: ['LineString', 'MultiLineString'],
};

export function validateBattleMapFeature(feature: BattleMapFeature): string[] {
  const errors: string[] = [];
  if (!feature.id?.trim()) errors.push('Feature id is required.');
  if (!BATTLE_PRIMITIVE_TYPES.includes(feature.type)) errors.push(`Unsupported feature type: ${String(feature.type)}`);
  if (!HISTORICAL_CONFIDENCES.includes(feature.confidence)) errors.push(`Unsupported confidence: ${String(feature.confidence)}`);
  if (!Array.isArray(feature.sourceIds)) errors.push('sourceIds must be an array.');
  if (!Array.isArray(feature.relatedLocations)) errors.push('relatedLocations must be an array.');
  if (!Array.isArray(feature.relatedPeople)) errors.push('relatedPeople must be an array.');
  if (feature.timeRange && feature.timeRange.start > feature.timeRange.end) errors.push('timeRange start must not be after end.');

  if (feature.geometry) {
    const allowed = GEOMETRY_BY_TYPE[feature.type];
    if (allowed && !allowed.includes(feature.geometry.type)) {
      errors.push(`${feature.type} does not accept ${feature.geometry.type} geometry.`);
    }
  }

  if (feature.confidence === 'verified') {
    if (feature.sourceIds.length === 0) errors.push('Verified feature requires source IDs.');
    if (!feature.geometry) errors.push('Verified feature requires geometry.');
  }

  if (feature.type === 'route') {
    if (!feature.historicalRouteStatus || !HISTORICAL_ROUTE_STATUSES.includes(feature.historicalRouteStatus)) {
      errors.push('Route requires historicalRouteStatus.');
    }
    if (feature.historicalRouteStatus !== 'verified' && !feature.researchOnly) {
      errors.push('Non-verified route must be researchOnly.');
    }
  } else if (feature.historicalRouteStatus) {
    errors.push('historicalRouteStatus is only valid for route features.');
  }

  return errors;
}

export function layerForFeature(feature: BattleMapFeature): MapLayerId {
  switch (feature.type) {
    case 'location': return 'historical-poi';
    case 'event': return 'battle-events';
    case 'area': return 'battle-areas';
    case 'direction': return 'battle-directions';
    case 'corridor': return 'battle-corridors';
    case 'front': return 'battle-areas';
    case 'route': return feature.historicalRouteStatus === 'verified' ? 'verified-routes' : 'candidate-routes';
  }
}

export function featureMatchesDate(feature: BattleMapFeature, activeDate?: string): boolean {
  if (!activeDate || (!feature.time && !feature.timeRange)) return true;
  if (feature.time) return feature.time.slice(0, 10) === activeDate;
  return Boolean(feature.timeRange && activeDate >= feature.timeRange.start.slice(0, 10) && activeDate <= feature.timeRange.end.slice(0, 10));
}

export function isFeatureVisible(
  feature: BattleMapFeature,
  layers: LayerState,
  timeline: TimelineFilter = {},
): boolean {
  if (feature.visibility === 'hidden') return false;
  if ((feature.researchOnly || feature.visibility === 'research') && !layers.researchMode) return false;
  if (!layers.enabled.has(layerForFeature(feature))) return false;
  if (!featureMatchesDate(feature, timeline.activeDate)) return false;
  if (feature.type === 'route' && feature.historicalRouteStatus !== 'verified' && !layers.researchMode) return false;
  if (feature.type === 'route' && feature.historicalRouteStatus === 'verified' && feature.confidence !== 'verified') return false;
  return true;
}

export function filterVisibleFeatures(
  features: BattleMapFeature[],
  layers: LayerState,
  timeline: TimelineFilter = {},
): BattleMapFeature[] {
  return features.filter(feature => validateBattleMapFeature(feature).length === 0 && isFeatureVisible(feature, layers, timeline));
}

export const GUNINGTOU_TIMELINE_STEPS: BattleTimelineStep[] = [
  {
    id: 'BTL-1949-10-25',
    date: '1949-10-25',
    label: { 'zh-Hant': '登陸與灘岸戰鬥', en: 'Landing and coastal battle' },
    summary: { 'zh-Hant': '第一梯隊在金門北岸多點登陸。現有資料支持登陸與向內陸展開，但不足以建立精確行軍線。', en: 'The first echelon landed across multiple northern beaches. Existing evidence does not support precise movement lines.' },
    confidence: 'approximate',
    sourceIds: ['SRC-0004', 'SRC-0027'],
    eventIds: ['EVT-0001', 'EVT-0009', 'EVT-0010', 'EVT-0011'],
    relatedLocations: ['LOC-GUN-0001', 'LOC-GUN-0002'],
  },
  {
    id: 'BTL-1949-10-26',
    date: '1949-10-26',
    label: { 'zh-Hant': '反擊與戰線收縮', en: 'Counterattack and contraction' },
    summary: { 'zh-Hant': '國軍反攻並收復林厝、南山。地圖只呈現已核定位置與事件關係，不生成未證實反攻路線。', en: 'ROC forces counterattacked and recaptured Lincuo and Nanshan. No unverified counterattack route is generated.' },
    confidence: 'approximate',
    sourceIds: ['SRC-0004', 'SRC-0027'],
    eventIds: ['EVT-0004', 'EVT-0017', 'EVT-0019', 'EVT-0020'],
    relatedLocations: ['LOC-GUN-0005'],
  },
  {
    id: 'BTL-1949-10-27',
    date: '1949-10-27',
    label: { 'zh-Hant': '北端戰鬥與戰役收束', en: 'Northern endgame' },
    summary: { 'zh-Hant': '北端戰鬥、投降與清剿構成戰役收束；目前沒有獲准顯示的中心至海岸精確路線。', en: 'Fighting, surrender, and clearing operations marked the endgame; no precise centre-to-coast route is approved.' },
    confidence: 'approximate',
    sourceIds: ['SRC-0004', 'SRC-0027'],
    eventIds: ['EVT-0005', 'EVT-0021', 'EVT-0023', 'EVT-0024'],
    relatedLocations: [],
  },
];

export interface ProjectionBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export const GUNINGTOU_SCENE_BOUNDS: ProjectionBounds = {
  west: 118.300,
  south: 24.458,
  east: 118.358,
  north: 24.484,
};

export function projectPosition(
  position: Position,
  bounds: ProjectionBounds = GUNINGTOU_SCENE_BOUNDS,
): { x: number; y: number } {
  const [longitude, latitude] = position;
  const x = ((longitude - bounds.west) / (bounds.east - bounds.west)) * 100;
  const y = ((bounds.north - latitude) / (bounds.north - bounds.south)) * 100;
  return { x, y };
}
