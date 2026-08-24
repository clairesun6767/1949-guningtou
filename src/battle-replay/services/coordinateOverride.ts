import {
  CANONICAL_CRS,
  type CoordinateCandidate,
  type CoordinateMethod,
  type LocationFeature,
  type Position,
  type Confidence,
} from '../types/index.js';
import { DiagnosticCollector, validatePosition } from '../validation/index.js';

export interface ManualCoordinateOverrideInput {
  finalCoordinate: Position;
  verificationMethod: Extract<
    CoordinateMethod,
    | 'google-map-manual-reference'
    | 'google-earth-manual-reference'
    | 'official-gis'
    | 'government-map'
    | 'field-survey'
    | 'survey'
    | 'satellite-manual-identification'
    | 'aerial-photo-georeference'
    | 'historical-map-georeference'
    | 'local-knowledge'
    | 'manual-correction'
  >;
  verifiedBy: string;
  verifiedAt: string;
  notes: string;
  candidateSource?: string;
  originalCandidate?: CoordinateCandidate;
  confidence?: Confidence;
  sourceRefs?: string[];
}

export function applyManualCoordinateOverride(
  location: LocationFeature,
  input: ManualCoordinateOverrideInput,
): LocationFeature {
  const collector = new DiagnosticCollector();
  if (!validatePosition(input.finalCoordinate, collector, 'finalCoordinate', location.properties.id)) {
    throw new Error(collector.diagnostics.map(item => item.message).join(' '));
  }
  if (!input.verifiedBy.trim() || !input.verifiedAt.trim() || Number.isNaN(Date.parse(input.verifiedAt))) {
    throw new Error('Manual coordinate override requires verifiedBy and a parseable verifiedAt value.');
  }
  if (!input.notes.trim()) {
    throw new Error('Manual coordinate override requires review notes.');
  }

  const originalCandidate = input.originalCandidate
    ?? location.properties.coordinateProvenance.originalCandidate
    ?? (location.geometry?.type === 'Point'
      ? {
          coordinate: [...location.geometry.coordinates] as Position,
          source: location.properties.coordinateProvenance.candidateSource ?? 'existing-location-geometry',
          method: location.properties.coordinateProvenance.coordinateMethod,
        }
      : undefined);

  return {
    ...location,
    geometry: {
      type: 'Point',
      coordinates: [...input.finalCoordinate] as Position,
    },
    properties: {
      ...location.properties,
      coordinateSystem: CANONICAL_CRS,
      verificationStatus: 'manually-verified',
      confidence: input.confidence ?? location.properties.confidence,
      sourceRefs: input.sourceRefs ?? location.properties.sourceRefs,
      coordinateProvenance: {
        ...location.properties.coordinateProvenance,
        coordinateSystem: CANONICAL_CRS,
        coordinate: [...input.finalCoordinate] as Position,
        finalCoordinate: [...input.finalCoordinate] as Position,
        coordinateMethod: 'manual-correction',
        coordinatePrecision: location.properties.coordinateProvenance.coordinatePrecision === 'unknown'
          ? 'approximate'
          : location.properties.coordinateProvenance.coordinatePrecision,
        verificationStatus: 'manually-verified',
        confidence: input.confidence ?? location.properties.coordinateProvenance.confidence,
        sourceRefs: input.sourceRefs ?? location.properties.coordinateProvenance.sourceRefs,
        verificationMethod: input.verificationMethod,
        verifiedBy: input.verifiedBy,
        verifiedAt: input.verifiedAt,
        candidateSource: input.candidateSource
          ?? originalCandidate?.source
          ?? location.properties.coordinateProvenance.candidateSource,
        originalCandidate,
        notes: input.notes,
      },
    },
  };
}
