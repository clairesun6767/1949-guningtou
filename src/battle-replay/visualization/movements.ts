import type { GeoJsonGeometry, LocalizedText } from '../types/index.js';
import type { BattleMapFeature, HistoricalConfidence, MapFeatureSide, MapFeatureVisibility } from './types.js';

export const BATTLE_MOVEMENT_TYPES = [
  'VERIFIED_ROUTE',
  'MOVEMENT_CORRIDOR',
  'ATTACK_AXIS',
  'RESEARCH_ONLY',
] as const;

export type BattleMovementType = typeof BATTLE_MOVEMENT_TYPES[number];

interface MovementProperties {
  id: string;
  movementType: BattleMovementType;
  side: MapFeatureSide;
  date: string;
  timeRange: { start: string; end: string };
  confidence: HistoricalConfidence;
  visibility: MapFeatureVisibility;
  researchOnly: boolean;
  historicalRouteStatus?: 'verified' | 'candidate' | 'deprecated' | 'insufficient_evidence';
  label: LocalizedText;
  description: LocalizedText;
  sourceIds: string[];
  evidenceIds: string[];
  relatedLocations: string[];
  geometryProvenance: 'surveyed' | 'source_traced' | 'human_interpreted' | 'approximate_axis';
  provenanceNote: string;
  reviewStatus: 'draft' | 'reviewed' | 'approved' | 'rejected';
}

interface MovementFeature {
  type: 'Feature';
  id: string;
  properties: MovementProperties;
  geometry: GeoJsonGeometry;
}

export interface BattleMovementCollection {
  type: 'FeatureCollection';
  metadata: Record<string, unknown>;
  features: MovementFeature[];
}

export function validateBattleMovementCollection(collection: BattleMovementCollection): string[] {
  const errors: string[] = [];
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) return ['Movement data must be a FeatureCollection.'];
  const ids = new Set<string>();
  for (const feature of collection.features) {
    const properties = feature.properties;
    if (!properties?.id || feature.id !== properties.id) errors.push(`${feature.id || 'unknown'}: feature/property id mismatch.`);
    if (ids.has(feature.id)) errors.push(`${feature.id}: duplicate id.`);
    ids.add(feature.id);
    if (!BATTLE_MOVEMENT_TYPES.includes(properties.movementType)) errors.push(`${feature.id}: unsupported movementType.`);
    if (!properties.sourceIds.length) errors.push(`${feature.id}: at least one source is required.`);
    if (!['surveyed', 'source_traced', 'human_interpreted', 'approximate_axis'].includes(properties.geometryProvenance)) errors.push(`${feature.id}: geometryProvenance is required.`);
    if (!properties.provenanceNote.trim()) errors.push(`${feature.id}: provenance note is required.`);
    if (!['draft', 'reviewed', 'approved', 'rejected'].includes(properties.reviewStatus)) errors.push(`${feature.id}: reviewStatus is required.`);
    if (properties.timeRange.start.slice(0, 10) !== properties.date || properties.timeRange.end.slice(0, 10) !== properties.date) {
      errors.push(`${feature.id}: date must match its time range.`);
    }
    if (properties.movementType === 'VERIFIED_ROUTE' && (properties.confidence !== 'verified' || properties.historicalRouteStatus !== 'verified')) {
      errors.push(`${feature.id}: verified routes require verified confidence and route status.`);
    }
    if (properties.movementType === 'MOVEMENT_CORRIDOR' && !['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) {
      errors.push(`${feature.id}: movement corridors require polygon geometry.`);
    }
    if (['ATTACK_AXIS', 'VERIFIED_ROUTE', 'RESEARCH_ONLY'].includes(properties.movementType) && !['LineString', 'MultiLineString'].includes(feature.geometry.type)) {
      errors.push(`${feature.id}: line-based movement requires line geometry.`);
    }
    if (properties.visibility === 'production' && properties.researchOnly) errors.push(`${feature.id}: production movement cannot be researchOnly.`);
    if (properties.visibility === 'production' && properties.reviewStatus !== 'approved') errors.push(`${feature.id}: production movement must be approved.`);
  }
  return errors;
}

export function movementCollectionToMapFeatures(collection: BattleMovementCollection): BattleMapFeature[] {
  const errors = validateBattleMovementCollection(collection);
  if (errors.length) throw new Error(`Battle movement data invalid:\n${errors.join('\n')}`);
  return collection.features.map(feature => {
    const properties = feature.properties;
    const type = properties.movementType === 'MOVEMENT_CORRIDOR'
      ? 'corridor'
      : properties.movementType === 'ATTACK_AXIS'
        ? 'direction'
        : 'route';
    return {
      id: feature.id,
      type,
      geometry: feature.geometry,
      timeRange: properties.timeRange,
      side: properties.side,
      confidence: properties.confidence,
      sourceIds: [...properties.sourceIds],
      relatedLocations: [...properties.relatedLocations],
      relatedPeople: [],
      description: properties.description,
      visibility: properties.visibility,
      researchOnly: properties.researchOnly,
      historicalRouteStatus: type === 'route' ? properties.historicalRouteStatus : undefined,
      metadata: {
        movementType: properties.movementType,
        label: properties.label,
        evidenceIds: [...properties.evidenceIds],
        geometryProvenance: properties.geometryProvenance,
        provenance: properties.provenanceNote,
        status: properties.reviewStatus,
      },
    };
  });
}
