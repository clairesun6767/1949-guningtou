import type {
  BattleEvent,
  BattlePackageData,
  Confidence,
  GeoJsonGeometry,
  LocationFeature,
  Position,
  RouteFeature,
} from '../types/index.js';
import type { HistoricalConfidence } from '../visualization/types.js';
import type {
  EvidenceLevel,
  RuntimeBattleData,
  RuntimeEvent,
  RuntimePoi,
  RuntimeRoute,
  RuntimeSource,
  RuntimeUnit,
} from './types.js';

export function confidenceToEvidenceLevel(value: Confidence | HistoricalConfidence | string | undefined): EvidenceLevel {
  switch (value) {
    case 'confirmed':
    case 'verified':
      return 'VERIFIED';
    case 'probable':
    case 'supported':
      return 'SUPPORTED';
    case 'estimated':
    case 'approximate':
    case 'partial':
    case 'interpretive':
      return 'PARTIAL';
    case 'disputed':
      return 'DISPUTED';
    default:
      return 'NO_EVIDENCE';
  }
}

function parseHistoricalInstant(value: string | undefined) {
  if (!value?.trim()) return undefined;
  const normalized = value.trim().replace(' ', 'T');
  const withTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized)
    ? normalized
    : `${normalized}${normalized.length === 10 ? 'T00:00:00' : ''}+08:00`;
  const parsed = Date.parse(withTimezone);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function runtimeTime(time: { value?: string; earliest?: string; latest?: string }, boundary: 'start' | 'end') {
  const value = boundary === 'start' ? time.value ?? time.earliest : time.value ?? time.latest ?? time.earliest;
  return parseHistoricalInstant(value);
}

function positionGeometry(geometry: GeoJsonGeometry | null): Position | undefined {
  return geometry?.type === 'Point' ? geometry.coordinates : undefined;
}

function lineGeometry(geometry: RouteFeature['geometry']): Position[] {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return [...geometry.coordinates];
  return geometry.coordinates.flatMap(line => [...line]);
}

function poi(location: LocationFeature): RuntimePoi {
  const properties = location.properties;
  return {
    id: properties.id,
    name: properties.historicalName,
    position: positionGeometry(location.geometry),
    locationType: properties.locationType,
    historicalStatus: properties.verificationStatus,
    sourceIds: [...properties.sourceRefs],
    evidenceIds: [],
    confidence: confidenceToEvidenceLevel(properties.confidence),
    sourceConfidence: properties.confidence,
    verificationStatus: properties.verificationStatus,
    provenance: { ...properties.coordinateProvenance },
    notes: properties.notes ? Object.values(properties.notes).join(' ') : undefined,
  };
}

function event(value: BattleEvent): RuntimeEvent {
  return {
    id: value.id,
    title: value.title,
    eventType: value.eventType,
    startTime: runtimeTime(value.historicalTime, 'start'),
    endTime: runtimeTime(value.historicalTime, 'end'),
    locationRefs: [...value.locationRefs],
    participatingUnitRefs: [...value.participatingUnitRefs],
    routeRefs: [...value.routeRefs],
    sourceIds: [...value.sourceRefs],
    evidenceIds: [...value.evidenceRefs],
    confidence: confidenceToEvidenceLevel(value.confidence),
    sourceConfidence: value.confidence,
    notes: value.summary ? Object.values(value.summary).join(' ') : undefined,
  };
}

function unit(value: BattlePackageData['units'][number]): RuntimeUnit {
  return {
    id: value.id,
    name: value.name,
    side: 'unknown',
    type: value.unitType,
    strength: value.strength ? {
      value: value.strength.value,
      minimum: value.strength.minimum,
      maximum: value.strength.maximum,
    } : undefined,
    sourceIds: [...value.sourceRefs],
    evidenceIds: [],
    confidence: confidenceToEvidenceLevel(value.confidence),
    sourceConfidence: value.confidence,
    provenance: { factionId: value.factionId, formationId: value.formationId },
    status: value.status,
    researchOnly: false,
  };
}

function route(value: RouteFeature): RuntimeRoute {
  const properties = value.properties;
  const coordinates = lineGeometry(value.geometry);
  const verified = properties.verificationStatus === 'source-verified'
    && properties.status === 'approved'
    && properties.confidence === 'confirmed';
  const historicalRouteStatus = verified
    ? 'verified'
    : properties.status === 'rejected' || properties.verificationStatus === 'disputed'
      ? 'deprecated'
      : 'candidate';
  return {
    id: properties.id,
    coordinates,
    startTime: properties.startTime ? runtimeTime(properties.startTime, 'start') : undefined,
    endTime: properties.endTime ? runtimeTime(properties.endTime, 'end') : undefined,
    historicalRouteStatus,
    researchOnly: !verified,
    geometryProvenance: properties.geometryProvenance.coordinateMethod,
    routeType: properties.routeType,
    routeNature: properties.nature,
    sourceIds: [...properties.sourceRefs],
    evidenceIds: [],
    confidence: confidenceToEvidenceLevel(properties.confidence),
    sourceConfidence: properties.confidence,
    verificationStatus: properties.verificationStatus,
    provenance: { ...properties.geometryProvenance },
    notes: properties.notes ? Object.values(properties.notes).join(' ') : undefined,
  };
}

function source(value: BattlePackageData['sources'][number]): RuntimeSource {
  return {
    id: value.id,
    title: value.title,
    sourceType: value.sourceType,
    url: value.url,
    rights: value.rights,
    sourceIds: [...value.sourceRefs],
    evidenceIds: [],
    confidence: confidenceToEvidenceLevel(value.confidence),
    sourceConfidence: value.confidence,
  };
}

/** Adapts the existing package in memory; no source JSON is rewritten or promoted. */
export function adaptBattlePackage(data: BattlePackageData): RuntimeBattleData {
  return {
    pois: data.locations.map(poi),
    events: data.events.map(event),
    units: data.units.map(unit),
    routes: data.routes.map(route),
    sources: data.sources.map(source),
    regions: [],
    stories: [],
  };
}
