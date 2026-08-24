import {
  CANONICAL_CRS,
  CURRENT_SCHEMA_VERSION,
  type Confidence,
  type Position,
  type RouteFeature,
  type RouteNature,
  type RoutePoint,
  type RouteType,
  type VerificationStatus,
} from '../types/index.js';
import { DiagnosticCollector, validatePosition } from '../validation/index.js';

export interface CreateRouteDraftInput {
  id: string;
  battleId: string;
  phaseId?: string;
  unitId?: string;
  routeType: RouteType;
  nature: RouteNature;
  sourceRefs: string[];
  confidence: Confidence;
  notes?: string;
}

function resequence(points: RoutePoint[]): RoutePoint[] {
  return points.map((point, index) => ({ ...point, sequence: index + 1 }));
}

function withExplicitGeometry(route: RouteFeature, points: RoutePoint[]): RouteFeature {
  const ordered = resequence(points);
  return {
    ...route,
    geometry: ordered.length >= 2
      ? { type: 'LineString', coordinates: ordered.map(point => [...point.coordinate] as Position) }
      : null,
    properties: { ...route.properties, routePoints: ordered },
  };
}

function nextPointId(route: RouteFeature): string {
  const used = new Set(route.properties.routePoints.map(point => point.id));
  let sequence = 1;
  while (used.has(`${route.properties.id}-P${String(sequence).padStart(4, '0')}`)) sequence += 1;
  return `${route.properties.id}-P${String(sequence).padStart(4, '0')}`;
}

export function createRouteDraft(input: CreateRouteDraftInput): RouteFeature {
  if (!input.id.trim() || !input.battleId.trim()) throw new Error('Route draft requires stable route and battle IDs.');
  return {
    type: 'Feature',
    id: input.id,
    geometry: null,
    properties: {
      id: input.id,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      battleId: input.battleId,
      phaseId: input.phaseId || undefined,
      unitId: input.unitId || undefined,
      routeType: input.routeType,
      nature: input.nature,
      temporalMode: 'spatial-only',
      routePoints: [],
      uncertaintySegments: [],
      sourceRefs: [...input.sourceRefs],
      confidence: input.confidence,
      verificationStatus: 'pending-manual-verification',
      geometryProvenance: {
        coordinateSystem: CANONICAL_CRS,
        temporalContext: input.nature === 'recorded'
          ? 'historical'
          : input.nature === 'reconstructed'
            ? 'reconstructed'
            : 'unknown',
        coordinateMethod: 'manual-correction',
        coordinatePrecision: 'unknown',
        verificationStatus: 'pending-manual-verification',
        sourceRefs: [...input.sourceRefs],
        confidence: input.confidence,
        notes: 'Geometry contains only waypoints explicitly entered by a human reviewer.',
      },
      status: 'draft',
      notes: input.notes ? { 'zh-Hant': input.notes } : undefined,
    },
  };
}

export function addRouteWaypoint(
  route: RouteFeature,
  coordinate: Position,
  options: {
    sourceRefs?: string[];
    confidence?: Confidence;
    verificationStatus?: VerificationStatus;
    notes?: string;
  } = {},
): RouteFeature {
  const collector = new DiagnosticCollector();
  if (!validatePosition(coordinate, collector, 'routePoint.coordinate', route.properties.id)) {
    throw new Error(collector.diagnostics.map(item => item.message).join(' '));
  }
  const point: RoutePoint = {
    id: nextPointId(route),
    routeId: route.properties.id,
    sequence: route.properties.routePoints.length + 1,
    coordinate: [...coordinate] as Position,
    sourceRefs: options.sourceRefs ? [...options.sourceRefs] : [...route.properties.sourceRefs],
    verificationStatus: options.verificationStatus ?? 'pending-manual-verification',
    confidence: options.confidence ?? route.properties.confidence,
    notes: options.notes,
  };
  return withExplicitGeometry(route, [...route.properties.routePoints, point]);
}

export function moveRouteWaypoint(route: RouteFeature, pointId: string, coordinate: Position): RouteFeature {
  const collector = new DiagnosticCollector();
  if (!validatePosition(coordinate, collector, 'routePoint.coordinate', route.properties.id)) {
    throw new Error(collector.diagnostics.map(item => item.message).join(' '));
  }
  if (!route.properties.routePoints.some(point => point.id === pointId)) throw new Error(`Unknown route point: ${pointId}`);
  return withExplicitGeometry(route, route.properties.routePoints.map(point => (
    point.id === pointId ? { ...point, coordinate: [...coordinate] as Position } : point
  )));
}

export function deleteRouteWaypoint(route: RouteFeature, pointId: string): RouteFeature {
  if (!route.properties.routePoints.some(point => point.id === pointId)) throw new Error(`Unknown route point: ${pointId}`);
  return withExplicitGeometry(route, route.properties.routePoints.filter(point => point.id !== pointId));
}

export function reorderRouteWaypoint(route: RouteFeature, pointId: string, direction: -1 | 1): RouteFeature {
  const points = [...route.properties.routePoints];
  const index = points.findIndex(point => point.id === pointId);
  const target = index + direction;
  if (index < 0) throw new Error(`Unknown route point: ${pointId}`);
  if (target < 0 || target >= points.length) return route;
  [points[index], points[target]] = [points[target], points[index]];
  return withExplicitGeometry(route, points);
}

export function setRouteSegmentUncertainty(
  route: RouteFeature,
  fromSequence: number,
  status: 'unknown' | 'estimated' | 'reconstructed' | 'disputed',
  sourceRefs: string[] = [],
  confidence: Confidence = 'unknown',
  notes?: string,
): RouteFeature {
  if (!Number.isInteger(fromSequence) || fromSequence < 1 || fromSequence >= route.properties.routePoints.length) {
    throw new Error('Uncertainty segment must refer to two adjacent, existing route points.');
  }
  const segment = { fromSequence, toSequence: fromSequence + 1, status, sourceRefs: [...sourceRefs], confidence, notes };
  return {
    ...route,
    properties: {
      ...route.properties,
      uncertaintySegments: [
        ...route.properties.uncertaintySegments.filter(item => item.fromSequence !== fromSequence),
        segment,
      ].sort((a, b) => a.fromSequence - b.fromSequence),
    },
  };
}
