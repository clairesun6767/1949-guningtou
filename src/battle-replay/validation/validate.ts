import {
  CANONICAL_CRS,
  CURRENT_SCHEMA_VERSION,
  type BattlePackageData,
  type BattlePackageManifest,
  type HistoricalTime,
  type GroundControlPointDataset,
  type ImageryGeoreferencingMetadata,
  type LocationFeature,
  type RouteFeature,
} from '../types/index.js';
import {
  DiagnosticCollector,
  type ValidationDiagnostic,
  type ValidationReport,
} from './diagnostics.js';

const verificationStatuses = new Set([
  'unverified',
  'candidate',
  'pending-manual-verification',
  'manually-verified',
  'source-verified',
  'estimated',
  'disputed',
  'unknown',
]);

const confidenceValues = new Set([
  'confirmed',
  'probable',
  'estimated',
  'disputed',
  'unknown',
]);

const coordinateMethods = new Set([
  'official-gis', 'government-map', 'field-survey', 'survey',
  'google-map-manual-reference', 'google-earth-manual-reference',
  'satellite-manual-identification', 'aerial-photo-georeference',
  'historical-map-georeference', 'local-knowledge', 'manual-correction',
  'estimated', 'unknown',
]);

const coordinatePrecisions = new Set([
  'exact', 'high', 'medium', 'approximate', 'area-only', 'unknown',
]);

const unresolvedStatuses = new Set([
  'unverified',
  'candidate',
  'pending-manual-verification',
  'estimated',
  'disputed',
  'unknown',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validatePosition(
  value: unknown,
  collector = new DiagnosticCollector(),
  path = 'coordinate',
  entityId?: string,
): boolean {
  if (!Array.isArray(value) || (value.length !== 2 && value.length !== 3)) {
    collector.error('COORDINATE_SHAPE_INVALID', 'Coordinate must be [longitude, latitude, altitude?].', {
      path,
      entityId,
      domain: 'technical',
    });
    return false;
  }

  const [longitude, latitude, altitude] = value;
  let valid = true;
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    collector.error('LONGITUDE_OUT_OF_RANGE', 'Longitude must be a finite number between -180 and 180.', {
      path: `${path}[0]`,
      entityId,
      domain: 'technical',
    });
    valid = false;
  }
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    collector.error('LATITUDE_OUT_OF_RANGE', 'Latitude must be a finite number between -90 and 90.', {
      path: `${path}[1]`,
      entityId,
      domain: 'technical',
    });
    valid = false;
  }
  if (value.length === 3 && (typeof altitude !== 'number' || !Number.isFinite(altitude))) {
    collector.error('ALTITUDE_INVALID', 'Altitude must be a finite number when present.', {
      path: `${path}[2]`,
      entityId,
      domain: 'technical',
    });
    valid = false;
  }
  return valid;
}

function validatePositionList(
  positions: unknown,
  collector: DiagnosticCollector,
  path: string,
  entityId?: string,
): boolean {
  if (!Array.isArray(positions)) {
    collector.error('GEOJSON_COORDINATES_INVALID', 'Geometry coordinates must be an array.', {
      path,
      entityId,
      domain: 'technical',
    });
    return false;
  }
  return positions.map((position, index) => validatePosition(position, collector, `${path}[${index}]`, entityId)).every(Boolean);
}

function positionsEqual(a: unknown, b: unknown): boolean {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => value === b[index]);
}

export function validateGeoJsonGeometry(
  geometry: unknown,
  collector = new DiagnosticCollector(),
  path = 'geometry',
  entityId?: string,
): boolean {
  if (!isRecord(geometry) || !nonEmptyString(geometry.type) || !('coordinates' in geometry)) {
    collector.error('GEOJSON_GEOMETRY_INVALID', 'Geometry requires a supported type and coordinates.', {
      path,
      entityId,
      domain: 'technical',
    });
    return false;
  }
  const coordinates = geometry.coordinates;
  switch (geometry.type) {
    case 'Point':
      return validatePosition(coordinates, collector, `${path}.coordinates`, entityId);
    case 'MultiPoint':
      return validatePositionList(coordinates, collector, `${path}.coordinates`, entityId);
    case 'LineString': {
      if (!Array.isArray(coordinates) || coordinates.length < 2) {
        collector.error('LINESTRING_TOO_SHORT', 'LineString requires at least two positions.', { path, entityId, domain: 'technical' });
        return false;
      }
      return validatePositionList(coordinates, collector, `${path}.coordinates`, entityId);
    }
    case 'MultiLineString': {
      if (!Array.isArray(coordinates) || coordinates.length === 0) {
        collector.error('MULTILINESTRING_EMPTY', 'MultiLineString requires at least one line.', { path, entityId, domain: 'technical' });
        return false;
      }
      return coordinates.map((line, index) => {
        if (!Array.isArray(line) || line.length < 2) {
          collector.error('LINESTRING_TOO_SHORT', 'Each MultiLineString line requires at least two positions.', {
            path: `${path}.coordinates[${index}]`, entityId, domain: 'technical',
          });
          return false;
        }
        return validatePositionList(line, collector, `${path}.coordinates[${index}]`, entityId);
      }).every(Boolean);
    }
    case 'Polygon': {
      if (!Array.isArray(coordinates) || coordinates.length === 0) {
        collector.error('POLYGON_EMPTY', 'Polygon requires at least one linear ring.', { path, entityId, domain: 'technical' });
        return false;
      }
      return coordinates.map((ring, ringIndex) => {
        if (!Array.isArray(ring) || ring.length < 4) {
          collector.error('POLYGON_RING_TOO_SHORT', 'A polygon ring requires at least four positions.', {
            path: `${path}.coordinates[${ringIndex}]`, entityId, domain: 'technical',
          });
          return false;
        }
        const valid = validatePositionList(ring, collector, `${path}.coordinates[${ringIndex}]`, entityId);
        if (!positionsEqual(ring[0], ring[ring.length - 1])) {
          collector.error('POLYGON_RING_NOT_CLOSED', 'The first and last position of a polygon ring must match.', {
            path: `${path}.coordinates[${ringIndex}]`, entityId, domain: 'technical',
          });
          return false;
        }
        return valid;
      }).every(Boolean);
    }
    case 'MultiPolygon': {
      if (!Array.isArray(coordinates) || coordinates.length === 0) {
        collector.error('MULTIPOLYGON_EMPTY', 'MultiPolygon requires at least one polygon.', { path, entityId, domain: 'technical' });
        return false;
      }
      return coordinates.map((polygon, index) => validateGeoJsonGeometry(
        { type: 'Polygon', coordinates: polygon }, collector, `${path}.coordinates[${index}]`, entityId,
      )).every(Boolean);
    }
    default:
      collector.error('GEOJSON_GEOMETRY_TYPE_UNSUPPORTED', `Unsupported geometry type: ${geometry.type}.`, {
        path: `${path}.type`, entityId, domain: 'technical',
      });
      return false;
  }
}

function validateIsoValue(
  value: unknown,
  collector: DiagnosticCollector,
  path: string,
  entityId?: string,
): boolean {
  if (!nonEmptyString(value) || Number.isNaN(Date.parse(value))) {
    collector.error('HISTORICAL_TIME_FORMAT_INVALID', 'Historical time values must be parseable ISO 8601 strings.', {
      path,
      entityId,
      domain: 'technical',
    });
    return false;
  }
  return true;
}

export function validateHistoricalTime(
  value: unknown,
  collector = new DiagnosticCollector(),
  path = 'historicalTime',
  entityId?: string,
): boolean {
  if (!isRecord(value)) {
    collector.error('HISTORICAL_TIME_REQUIRED', 'HistoricalTime must be an object.', { path, entityId, domain: 'schema' });
    return false;
  }

  const kinds = new Set(['exact', 'approximate', 'range', 'before', 'after', 'sequence-only', 'unknown']);
  const precisions = new Set(['second', 'minute', 'hour', 'approximate-hour', 'time-range', 'sequence-only', 'unknown']);
  let valid = true;
  if (!kinds.has(String(value.kind))) {
    collector.error('HISTORICAL_TIME_KIND_INVALID', `Unsupported HistoricalTime kind: ${String(value.kind)}.`, {
      path: `${path}.kind`, entityId, domain: 'schema',
    });
    valid = false;
  }
  if (!precisions.has(String(value.precision))) {
    collector.error('HISTORICAL_TIME_PRECISION_INVALID', `Unsupported time precision: ${String(value.precision)}.`, {
      path: `${path}.precision`, entityId, domain: 'schema',
    });
    valid = false;
  }
  if (!nonEmptyString(value.timezone)) {
    collector.error('HISTORICAL_TIME_TIMEZONE_REQUIRED', 'HistoricalTime requires an explicit timezone policy.', {
      path: `${path}.timezone`, entityId, domain: 'schema',
    });
    valid = false;
  }

  if (value.kind === 'exact' || value.kind === 'approximate') {
    valid = validateIsoValue(value.value, collector, `${path}.value`, entityId) && valid;
  } else if (value.kind === 'range') {
    valid = validateIsoValue(value.earliest, collector, `${path}.earliest`, entityId) && valid;
    valid = validateIsoValue(value.latest, collector, `${path}.latest`, entityId) && valid;
    if (valid && Date.parse(String(value.earliest)) > Date.parse(String(value.latest))) {
      collector.error('HISTORICAL_TIME_RANGE_REVERSED', 'HistoricalTime earliest must not be after latest.', {
        path, entityId, domain: 'technical',
      });
      valid = false;
    }
  } else if (value.kind === 'before') {
    valid = validateIsoValue(value.latest ?? value.value, collector, `${path}.latest`, entityId) && valid;
  } else if (value.kind === 'after') {
    valid = validateIsoValue(value.earliest ?? value.value, collector, `${path}.earliest`, entityId) && valid;
  } else if (value.kind === 'sequence-only') {
    if (!Number.isInteger(value.sequence)) {
      collector.error('HISTORICAL_TIME_SEQUENCE_REQUIRED', 'sequence-only time requires an integer sequence.', {
        path: `${path}.sequence`, entityId, domain: 'schema',
      });
      valid = false;
    }
    if (value.precision !== 'sequence-only') {
      collector.error('HISTORICAL_TIME_SEQUENCE_PRECISION', 'sequence-only kind requires sequence-only precision.', {
        path: `${path}.precision`, entityId, domain: 'schema',
      });
      valid = false;
    }
  } else if (value.kind === 'unknown' && value.precision !== 'unknown') {
    collector.warning('HISTORICAL_TIME_UNKNOWN_PRECISION', 'Unknown historical time should use unknown precision.', {
      path: `${path}.precision`, entityId, domain: 'historical',
    });
  }

  if (!Array.isArray(value.sourceRefs)) {
    collector.error('SOURCE_REFS_REQUIRED', 'HistoricalTime sourceRefs must be an array, even when empty.', {
      path: `${path}.sourceRefs`, entityId, domain: 'schema',
    });
    valid = false;
  }
  if (!confidenceValues.has(String(value.confidence))) {
    collector.error('CONFIDENCE_INVALID', `Unsupported confidence: ${String(value.confidence)}.`, {
      path: `${path}.confidence`, entityId, domain: 'schema',
    });
    valid = false;
  }
  return valid;
}

function validateCoordinateProvenance(
  provenance: unknown,
  collector: DiagnosticCollector,
  path: string,
  entityId: string,
  hasGeometry: boolean,
): void {
  if (!isRecord(provenance)) {
    collector.error('COORDINATE_PROVENANCE_REQUIRED', 'Location requires machine-readable coordinate provenance.', {
      path, entityId, domain: 'schema',
    });
    return;
  }
  if (provenance.coordinateSystem !== CANONICAL_CRS) {
    collector.error('CANONICAL_CRS_INVALID', `Canonical coordinates must use ${CANONICAL_CRS}.`, {
      path: `${path}.coordinateSystem`, entityId, domain: 'technical',
    });
  }
  if (!verificationStatuses.has(String(provenance.verificationStatus))) {
    collector.error('VERIFICATION_STATUS_INVALID', `Unsupported verification status: ${String(provenance.verificationStatus)}.`, {
      path: `${path}.verificationStatus`, entityId, domain: 'schema',
    });
  } else if (unresolvedStatuses.has(String(provenance.verificationStatus))) {
    collector.warning('COORDINATE_HISTORICALLY_UNVERIFIED', 'Coordinate is technically representable but not historically verified.', {
      path, entityId, domain: 'historical',
    });
  }
  if (!coordinateMethods.has(String(provenance.coordinateMethod))) {
    collector.error('COORDINATE_METHOD_INVALID', `Unsupported coordinate method: ${String(provenance.coordinateMethod)}.`, {
      path: `${path}.coordinateMethod`, entityId, domain: 'schema',
    });
  }
  if (!coordinatePrecisions.has(String(provenance.coordinatePrecision))) {
    collector.error('COORDINATE_PRECISION_INVALID', `Unsupported coordinate precision: ${String(provenance.coordinatePrecision)}.`, {
      path: `${path}.coordinatePrecision`, entityId, domain: 'schema',
    });
  }
  if (!confidenceValues.has(String(provenance.confidence))) {
    collector.error('CONFIDENCE_INVALID', `Unsupported confidence: ${String(provenance.confidence)}.`, {
      path: `${path}.confidence`, entityId, domain: 'schema',
    });
  }
  if (!Array.isArray(provenance.sourceRefs)) {
    collector.error('SOURCE_REFS_REQUIRED', 'Coordinate provenance sourceRefs must be an array.', {
      path: `${path}.sourceRefs`, entityId, domain: 'schema',
    });
  }
  if (hasGeometry && provenance.coordinate === undefined && provenance.finalCoordinate === undefined) {
    collector.error('COORDINATE_PROVENANCE_VALUE_MISSING', 'Geometry exists but provenance has no coordinate or finalCoordinate.', {
      path, entityId, domain: 'schema',
    });
  }
  if (provenance.coordinate !== undefined) {
    validatePosition(provenance.coordinate, collector, `${path}.coordinate`, entityId);
  }
  if (provenance.finalCoordinate !== undefined) {
    validatePosition(provenance.finalCoordinate, collector, `${path}.finalCoordinate`, entityId);
  }
  if (provenance.verificationStatus === 'manually-verified') {
    for (const field of ['verifiedBy', 'verifiedAt', 'verificationMethod']) {
      if (!nonEmptyString(provenance[field])) {
        collector.error('MANUAL_VERIFICATION_AUDIT_REQUIRED', `Manually verified coordinate requires ${field}.`, {
          path: `${path}.${field}`, entityId, domain: 'schema',
        });
      }
    }
  }
}

function validateCommonEntity(entity: unknown, collector: DiagnosticCollector, path: string): void {
  if (!isRecord(entity)) {
    collector.error('ENTITY_INVALID', 'Entity must be an object.', { path, domain: 'schema' });
    return;
  }
  const id = nonEmptyString(entity.id) ? entity.id : undefined;
  if (!id) {
    collector.error('ID_REQUIRED', 'Entity requires a non-empty stable ID.', { path: `${path}.id`, domain: 'schema' });
  }
  if (!Array.isArray(entity.sourceRefs)) {
    collector.error('SOURCE_REFS_REQUIRED', 'Entity sourceRefs must be an array, even when empty.', {
      path: `${path}.sourceRefs`, entityId: id, domain: 'schema',
    });
  }
  if (!confidenceValues.has(String(entity.confidence))) {
    collector.error('CONFIDENCE_INVALID', `Unsupported confidence: ${String(entity.confidence)}.`, {
      path: `${path}.confidence`, entityId: id, domain: 'schema',
    });
  }
}

function getComparableStart(time: HistoricalTime | undefined): number | undefined {
  if (!time) return undefined;
  const raw = time.value ?? time.earliest;
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function getComparableEnd(time: HistoricalTime | undefined): number | undefined {
  if (!time) return undefined;
  const raw = time.value ?? time.latest;
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function validateSchemaVersion(value: unknown, collector: DiagnosticCollector, path: string, entityId?: string): void {
  if (value !== CURRENT_SCHEMA_VERSION) {
    collector.error('SCHEMA_VERSION_UNSUPPORTED', `Expected schemaVersion ${CURRENT_SCHEMA_VERSION}; received ${String(value)}.`, {
      path, entityId, domain: 'schema',
    });
  }
}

function requireRef(
  ref: unknown,
  ids: Set<string>,
  collector: DiagnosticCollector,
  path: string,
  kind: string,
  entityId?: string,
): void {
  if (!nonEmptyString(ref) || !ids.has(ref)) {
    collector.error('BROKEN_REFERENCE', `${kind} reference does not resolve: ${String(ref)}.`, {
      path, entityId, domain: 'integrity',
    });
  }
}

function requireRefs(
  refs: unknown,
  ids: Set<string>,
  collector: DiagnosticCollector,
  path: string,
  kind: string,
  entityId?: string,
): void {
  if (!Array.isArray(refs)) {
    collector.error('REFERENCE_ARRAY_REQUIRED', `${kind} references must be an array.`, {
      path, entityId, domain: 'schema',
    });
    return;
  }
  refs.forEach((ref, index) => requireRef(ref, ids, collector, `${path}[${index}]`, kind, entityId));
}

function collectIds(
  data: BattlePackageData,
  collector: DiagnosticCollector,
): { all: Set<string>; byKind: Record<string, Set<string>> } {
  const all = new Set<string>();
  const byKind: Record<string, Set<string>> = {};
  const register = (kind: string, records: unknown[], readId: (record: unknown) => unknown): void => {
    const ids = new Set<string>();
    byKind[kind] = ids;
    records.forEach((record, index) => {
      const id = readId(record);
      if (!nonEmptyString(id)) {
        collector.error('ID_REQUIRED', `${kind} requires a non-empty stable ID.`, {
          path: `${kind}[${index}].id`, domain: 'schema',
        });
        return;
      }
      if (all.has(id)) {
        collector.error('DUPLICATE_ID', `Duplicate entity ID: ${id}.`, {
          path: `${kind}[${index}].id`, entityId: id, domain: 'integrity',
        });
      }
      all.add(id);
      ids.add(id);
    });
  };

  register('battle', data.battle ? [data.battle] : [], record => isRecord(record) ? record.id : undefined);
  register('phases', asArray(data.phases), record => isRecord(record) ? record.id : undefined);
  register('factions', asArray(data.factions), record => isRecord(record) ? record.id : undefined);
  register('formations', asArray(data.formations), record => isRecord(record) ? record.id : undefined);
  register('units', asArray(data.units), record => isRecord(record) ? record.id : undefined);
  register('commanders', asArray(data.commanders), record => isRecord(record) ? record.id : undefined);
  register('locations', asArray(data.locations), record => isRecord(record) && isRecord(record.properties) ? record.properties.id : undefined);
  register('routes', asArray(data.routes), record => isRecord(record) && isRecord(record.properties) ? record.properties.id : undefined);
  register('battleAreas', asArray(data.battleAreas), record => isRecord(record) && isRecord(record.properties) ? record.properties.id : undefined);
  register('events', asArray(data.events), record => isRecord(record) ? record.id : undefined);
  register('evidence', asArray(data.evidence), record => isRecord(record) ? record.id : undefined);
  register('sources', asArray(data.sources), record => isRecord(record) ? record.id : undefined);
  register('perspectives', asArray(data.perspectives), record => isRecord(record) ? record.id : undefined);
  register('uncertainties', asArray(data.uncertainties), record => isRecord(record) ? record.id : undefined);
  register('media', asArray(data.media), record => isRecord(record) ? record.id : undefined);
  register('cameraCues', asArray(data.cameraCues), record => isRecord(record) ? record.id : undefined);

  return { all, byKind };
}

function validateLocation(feature: LocationFeature, collector: DiagnosticCollector, index: number): void {
  const path = `locations[${index}]`;
  if (!feature || feature.type !== 'Feature' || !isRecord(feature.properties)) {
    collector.error('GEOJSON_FEATURE_INVALID', 'Location must be a GeoJSON Feature.', { path, domain: 'schema' });
    return;
  }
  const id = String(feature.properties.id ?? '');
  validateSchemaVersion(feature.properties.schemaVersion, collector, `${path}.properties.schemaVersion`, id);
  if (feature.properties.coordinateSystem !== CANONICAL_CRS) {
    collector.error('CANONICAL_CRS_INVALID', `Location must use ${CANONICAL_CRS}.`, {
      path: `${path}.properties.coordinateSystem`, entityId: id, domain: 'technical',
    });
  }
  if (!verificationStatuses.has(feature.properties.verificationStatus)) {
    collector.error('VERIFICATION_STATUS_INVALID', `Unsupported verification status: ${String(feature.properties.verificationStatus)}.`, {
      path: `${path}.properties.verificationStatus`, entityId: id, domain: 'schema',
    });
  }
  if (feature.geometry === null) {
    collector.warning('HISTORICAL_GEOMETRY_UNAVAILABLE', 'Location has no approved geometry and must not be rendered as an exact point.', {
      path: `${path}.geometry`, entityId: id, domain: 'historical',
    });
  } else {
    validateGeoJsonGeometry(feature.geometry, collector, `${path}.geometry`, id);
  }
  validateCoordinateProvenance(feature.properties.coordinateProvenance, collector, `${path}.properties.coordinateProvenance`, id, feature.geometry !== null);
  if (feature.properties.verificationStatus === 'manually-verified' && feature.properties.sourceRefs.length === 0) {
    collector.warning('MANUAL_VERIFICATION_ONLY', 'Location is manually verified but has no historical source reference.', {
      path: `${path}.properties.sourceRefs`, entityId: id, domain: 'historical',
    });
  }
  if (feature.properties.modernReferenceGeometry) {
    collector.info('MODERN_REFERENCE_GEOMETRY_PRESENT', 'Modern reference geometry is separate from historical geometry.', {
      path: `${path}.properties.modernReferenceGeometry`, entityId: id, domain: 'historical',
    });
  }
}

function validateRoute(route: RouteFeature, collector: DiagnosticCollector, index: number): void {
  const path = `routes[${index}]`;
  if (!route || route.type !== 'Feature' || !isRecord(route.properties)) {
    collector.error('GEOJSON_FEATURE_INVALID', 'Route must be a GeoJSON Feature.', { path, domain: 'schema' });
    return;
  }
  const id = String(route.properties.id ?? '');
  validateSchemaVersion(route.properties.schemaVersion, collector, `${path}.properties.schemaVersion`, id);
  if (!new Set(['recorded', 'reconstructed', 'estimated', 'possible', 'unknown']).has(route.properties.nature)) {
    collector.error('ROUTE_NATURE_INVALID', `Unsupported route nature: ${String(route.properties.nature)}.`, {
      path: `${path}.properties.nature`, entityId: id, domain: 'schema',
    });
  }
  if (!new Set(['planned', 'actual', 'landing', 'advance', 'retreat', 'supply', 'observation', 'unknown']).has(route.properties.routeType)) {
    collector.error('ROUTE_TYPE_INVALID', `Unsupported route type: ${String(route.properties.routeType)}.`, {
      path: `${path}.properties.routeType`, entityId: id, domain: 'schema',
    });
  }
  if (!verificationStatuses.has(route.properties.verificationStatus)) {
    collector.error('VERIFICATION_STATUS_INVALID', `Unsupported verification status: ${String(route.properties.verificationStatus)}.`, {
      path: `${path}.properties.verificationStatus`, entityId: id, domain: 'schema',
    });
  }
  const geometryProvenance = route.properties.geometryProvenance;
  if (!geometryProvenance || geometryProvenance.coordinateSystem !== CANONICAL_CRS) {
    collector.error('GEOMETRY_PROVENANCE_REQUIRED', `Route geometry provenance must use ${CANONICAL_CRS}.`, {
      path: `${path}.properties.geometryProvenance`, entityId: id, domain: 'schema',
    });
  }
  if (route.geometry === null) {
    collector.warning('ROUTE_GEOMETRY_UNAVAILABLE', 'Route has no geometry and cannot be displayed or animated.', {
      path: `${path}.geometry`, entityId: id, domain: 'historical',
    });
  } else {
    validateGeoJsonGeometry(route.geometry, collector, `${path}.geometry`, id);
    if (route.geometry.type !== 'LineString' && route.geometry.type !== 'MultiLineString') {
      collector.error('ROUTE_GEOMETRY_TYPE_INVALID', 'Route geometry must be LineString or MultiLineString.', {
        path: `${path}.geometry.type`, entityId: id, domain: 'technical',
      });
    }
  }
  const points = asArray(route.properties.routePoints);
  if (route.properties.sourceRefs.length === 0) {
    collector.warning('ROUTE_WITHOUT_HISTORICAL_SOURCE', 'Route draft has no historical source reference.', {
      path: `${path}.properties.sourceRefs`, entityId: id, domain: 'historical',
    });
  }
  let lastSequence = -Infinity;
  const pointIds = new Set<string>();
  points.forEach((point, pointIndex) => {
    const pointPath = `${path}.properties.routePoints[${pointIndex}]`;
    if (!isRecord(point)) {
      collector.error('ROUTE_POINT_INVALID', 'RoutePoint must be an object.', { path: pointPath, entityId: id, domain: 'schema' });
      return;
    }
    if (!nonEmptyString(point.id) || pointIds.has(String(point.id))) {
      collector.error('ROUTE_POINT_ID_INVALID', `RoutePoint ID is missing or duplicated: ${String(point.id)}.`, {
        path: `${pointPath}.id`, entityId: id, domain: 'integrity',
      });
    }
    pointIds.add(String(point.id));
    if (!Number.isInteger(point.sequence) || Number(point.sequence) <= lastSequence) {
      collector.error('ROUTE_WAYPOINT_ORDER_INVALID', 'RoutePoint sequence must be strictly increasing.', {
        path: `${pointPath}.sequence`, entityId: id, domain: 'integrity',
      });
    }
    lastSequence = Number(point.sequence);
    if (point.routeId !== id) {
      collector.error('ROUTE_POINT_ROUTE_MISMATCH', 'RoutePoint.routeId must match its containing Route.', {
        path: `${pointPath}.routeId`, entityId: id, domain: 'integrity',
      });
    }
    validatePosition(point.coordinate, collector, `${pointPath}.coordinate`, id);
    if (!Array.isArray(point.sourceRefs)) {
      collector.error('SOURCE_REFS_REQUIRED', 'RoutePoint sourceRefs must be an array.', {
        path: `${pointPath}.sourceRefs`, entityId: id, domain: 'schema',
      });
    }
    if (!verificationStatuses.has(String(point.verificationStatus))) {
      collector.error('VERIFICATION_STATUS_INVALID', `Unsupported RoutePoint verification status: ${String(point.verificationStatus)}.`, {
        path: `${pointPath}.verificationStatus`, entityId: id, domain: 'schema',
      });
    }
    if (!confidenceValues.has(String(point.confidence))) {
      collector.error('CONFIDENCE_INVALID', `Unsupported RoutePoint confidence: ${String(point.confidence)}.`, {
        path: `${pointPath}.confidence`, entityId: id, domain: 'schema',
      });
    }
    if (point.historicalTime) validateHistoricalTime(point.historicalTime, collector, `${pointPath}.historicalTime`, id);
  });
  if (route.geometry?.type === 'LineString') {
    const coordinates = route.geometry.coordinates;
    const geometryMatchesPoints = coordinates.length === points.length
      && coordinates.every((coordinate, pointIndex) => positionsEqual(coordinate, points[pointIndex]?.coordinate));
    if (!geometryMatchesPoints) {
      collector.error('ROUTE_GEOMETRY_POINT_MISMATCH', 'LineString coordinates must match routePoints in sequence order.', {
        path: `${path}.geometry.coordinates`, entityId: id, domain: 'integrity',
      });
    }
  }
  const allowedSegmentStatuses = new Set(['unknown', 'estimated', 'reconstructed', 'disputed']);
  asArray(route.properties.uncertaintySegments).forEach((segment, segmentIndex) => {
    const segmentPath = `${path}.properties.uncertaintySegments[${segmentIndex}]`;
    if (!isRecord(segment)
      || !Number.isInteger(segment.fromSequence)
      || !Number.isInteger(segment.toSequence)
      || Number(segment.toSequence) !== Number(segment.fromSequence) + 1
      || Number(segment.fromSequence) < 1
      || Number(segment.toSequence) > points.length) {
      collector.error('ROUTE_UNCERTAINTY_SEGMENT_INVALID', 'Route uncertainty must identify two adjacent, existing waypoint sequences.', {
        path: segmentPath, entityId: id, domain: 'integrity',
      });
      return;
    }
    if (!allowedSegmentStatuses.has(String(segment.status))) {
      collector.error('ROUTE_UNCERTAINTY_STATUS_INVALID', `Unsupported route uncertainty status: ${String(segment.status)}.`, {
        path: `${segmentPath}.status`, entityId: id, domain: 'schema',
      });
    }
    if (!Array.isArray(segment.sourceRefs)) {
      collector.error('SOURCE_REFS_REQUIRED', 'Route uncertainty sourceRefs must be an array.', {
        path: `${segmentPath}.sourceRefs`, entityId: id, domain: 'schema',
      });
    }
    if (!confidenceValues.has(String(segment.confidence))) {
      collector.error('CONFIDENCE_INVALID', `Unsupported route uncertainty confidence: ${String(segment.confidence)}.`, {
        path: `${segmentPath}.confidence`, entityId: id, domain: 'schema',
      });
    }
  });
  if ((route.properties.nature === 'reconstructed' || route.properties.nature === 'estimated')
    && route.properties.confidence === 'confirmed') {
    collector.error('ROUTE_CONFIDENCE_OVERCLAIMED', 'Reconstructed or estimated routes cannot be marked confirmed.', {
      path: `${path}.properties.confidence`, entityId: id, domain: 'historical',
    });
  }
  if (route.properties.nature === 'reconstructed' || route.properties.nature === 'estimated') {
    collector.warning('ROUTE_RECONSTRUCTED_OR_ESTIMATED', `Route nature is ${route.properties.nature}.`, {
      path: `${path}.properties.nature`, entityId: id, domain: 'historical',
    });
  }
}

export function validateGeospatialCalibration(
  dataset: GroundControlPointDataset,
  imagery: ImageryGeoreferencingMetadata[],
  sourceIds: Set<string> = new Set(),
): ValidationReport {
  const collector = new DiagnosticCollector();
  validateSchemaVersion(dataset?.schemaVersion, collector, 'groundControlPoints.schemaVersion', dataset?.datasetId);
  if (!dataset?.datasetId || !dataset?.battleId || !Array.isArray(dataset?.controlPoints)) {
    collector.error('GCP_DATASET_INVALID', 'GCP dataset requires datasetId, battleId and a controlPoints array.', {
      path: 'groundControlPoints', domain: 'schema',
    });
    return finalizeReport(collector, [], [], {});
  }

  const imageById = new Map(imagery.map(item => [item.imageId, item]));
  const pointIds = new Set<string>();
  dataset.controlPoints.forEach((point, index) => {
    const path = `groundControlPoints.controlPoints[${index}]`;
    if (!point.id || pointIds.has(point.id)) {
      collector.error('GCP_ID_INVALID', `GCP ID is missing or duplicated: ${String(point.id)}.`, {
        path: `${path}.id`, entityId: point.id, domain: 'integrity',
      });
    }
    pointIds.add(point.id);
    const image = imageById.get(point.imageId);
    if (!image) {
      collector.error('GCP_IMAGE_REFERENCE_BROKEN', `GCP image does not resolve: ${point.imageId}.`, {
        path: `${path}.imageId`, entityId: point.id, domain: 'integrity',
      });
    }
    if (!Array.isArray(point.imagePixel) || point.imagePixel.length !== 2 || point.imagePixel.some(value => !Number.isFinite(value) || value < 0)) {
      collector.error('GCP_PIXEL_INVALID', 'GCP imagePixel must contain two non-negative finite values.', {
        path: `${path}.imagePixel`, entityId: point.id, domain: 'technical',
      });
    } else if (image && (point.imagePixel[0] > image.width || point.imagePixel[1] > image.height)) {
      collector.error('GCP_PIXEL_OUTSIDE_IMAGE', 'GCP imagePixel lies outside the image dimensions.', {
        path: `${path}.imagePixel`, entityId: point.id, domain: 'technical',
      });
    }
    validatePosition(point.coordinate, collector, `${path}.coordinate`, point.id);
    const altitudeReferences = new Set(['ellipsoidal', 'orthometric', 'terrain-relative', 'unknown']);
    if (point.coordinate.length === 3 && !altitudeReferences.has(String(point.altitudeReference))) {
      collector.error('ALTITUDE_REFERENCE_REQUIRED', 'A three-dimensional GCP coordinate requires an explicit altitudeReference.', {
        path: `${path}.altitudeReference`, entityId: point.id, domain: 'schema',
      });
    }
    if (point.coordinate.length === 3 && point.altitudeReference === 'unknown') {
      collector.warning('ALTITUDE_REFERENCE_UNKNOWN', 'GCP altitude is present but its vertical reference remains unknown.', {
        path: `${path}.altitudeReference`, entityId: point.id, domain: 'historical',
      });
    }
    if (point.coordinate.length === 2 && point.altitudeReference && point.altitudeReference !== 'unknown') {
      collector.error('ALTITUDE_VALUE_REQUIRED', 'GCP altitudeReference cannot assert a vertical datum without an altitude value.', {
        path: `${path}.coordinate`, entityId: point.id, domain: 'schema',
      });
    }
    if (!point.sourceRef && !point.sourceDescription?.trim()) {
      collector.error('GCP_SOURCE_REQUIRED', 'Every GCP requires a source reference or source description.', {
        path, entityId: point.id, domain: 'schema',
      });
    }
    if (point.sourceRef && sourceIds.size > 0 && !sourceIds.has(point.sourceRef)) {
      collector.error('BROKEN_REFERENCE', `GCP Source reference does not resolve: ${point.sourceRef}.`, {
        path: `${path}.sourceRef`, entityId: point.id, domain: 'integrity',
      });
    }
    if (!verificationStatuses.has(point.verificationStatus)) {
      collector.error('VERIFICATION_STATUS_INVALID', `Unsupported GCP verification status: ${point.verificationStatus}.`, {
        path: `${path}.verificationStatus`, entityId: point.id, domain: 'schema',
      });
    }
    if (!confidenceValues.has(point.confidence)) {
      collector.error('CONFIDENCE_INVALID', `Unsupported GCP confidence: ${point.confidence}.`, {
        path: `${path}.confidence`, entityId: point.id, domain: 'schema',
      });
    }
  });

  imagery.forEach((image, index) => {
    const path = `imagery[${index}]`;
    if (!image.imageId || !image.imagePath || !Number.isInteger(image.width) || image.width <= 0 || !Number.isInteger(image.height) || image.height <= 0) {
      collector.error('IMAGERY_METADATA_INVALID', 'Imagery requires ID, path and positive integer dimensions.', {
        path, entityId: image.imageId, domain: 'schema',
      });
    }
    if (image.bounds) {
      const [west, south, east, north] = image.bounds;
      if (!validatePosition([west, south], collector, `${path}.bounds.southWest`, image.imageId)
        || !validatePosition([east, north], collector, `${path}.bounds.northEast`, image.imageId)
        || west > east || south > north) {
        collector.error('IMAGERY_BOUNDS_INVALID', 'Imagery bounds must be ordered WGS84 west/south/east/north.', {
          path: `${path}.bounds`, entityId: image.imageId, domain: 'technical',
        });
      }
    }
    const imagePoints = image.gcpRefs.map(ref => dataset.controlPoints.find(point => point.id === ref));
    image.gcpRefs.forEach((ref, refIndex) => {
      const point = imagePoints[refIndex];
      if (!point || point.imageId !== image.imageId) {
        collector.error('IMAGERY_GCP_REFERENCE_BROKEN', `Imagery GCP reference does not resolve to this image: ${ref}.`, {
          path: `${path}.gcpRefs[${refIndex}]`, entityId: image.imageId, domain: 'integrity',
        });
      }
    });
    if (image.errorModel.gcpCount !== image.gcpRefs.length) {
      collector.error('GCP_COUNT_MISMATCH', 'Georeference errorModel.gcpCount must equal gcpRefs length.', {
        path: `${path}.errorModel.gcpCount`, entityId: image.imageId, domain: 'integrity',
      });
    }
    image.errorModel.residuals.forEach((residual, residualIndex) => {
      if (!image.gcpRefs.includes(residual.gcpId)) {
        collector.error('GCP_RESIDUAL_REFERENCE_BROKEN', `Residual references an unknown image GCP: ${residual.gcpId}.`, {
          path: `${path}.errorModel.residuals[${residualIndex}]`, entityId: image.imageId, domain: 'integrity',
        });
      }
    });
    const minimumPoints = image.errorModel.transformType === 'homography' ? 4 : 3;
    if (image.transformStatus === 'verified') {
      if (image.gcpRefs.length < minimumPoints) {
        collector.error('GCP_COUNT_INSUFFICIENT_FOR_VERIFICATION', `Verified ${image.errorModel.transformType} transform requires at least ${minimumPoints} GCPs.`, {
          path: `${path}.transformStatus`, entityId: image.imageId, domain: 'technical',
        });
      }
      if (!Number.isFinite(image.errorModel.rmseMeters) && !Number.isFinite(image.errorModel.rmsePixels)) {
        collector.error('GEOREFERENCE_RMSE_REQUIRED', 'Verified georeference requires a finite RMSE value.', {
          path: `${path}.errorModel`, entityId: image.imageId, domain: 'technical',
        });
      }
    } else if (image.gcpRefs.length < minimumPoints) {
      collector.warning('GCP_COUNT_INSUFFICIENT', `Image has ${image.gcpRefs.length} GCPs; at least ${minimumPoints} are needed for ${image.errorModel.transformType}.`, {
        path: `${path}.gcpRefs`, entityId: image.imageId, domain: 'historical',
      });
    }
    if (image.crs === 'unknown' || image.verificationStatus === 'pending-manual-verification') {
      collector.warning('IMAGERY_GEOREFERENCE_PENDING', 'Imagery georeference remains pending and must not be treated as aligned terrain.', {
        path, entityId: image.imageId, domain: 'historical',
      });
    }
  });

  const unresolved = imagery.filter(item => item.transformStatus !== 'verified').map(item => item.imageId);
  return finalizeReport(collector, unresolved, [], {});
}

export function validateBattlePackage(
  data: BattlePackageData,
  manifest?: BattlePackageManifest,
): ValidationReport {
  const collector = new DiagnosticCollector();
  if (!data || !isRecord(data)) {
    collector.error('BATTLE_PACKAGE_REQUIRED', 'Battle package data must be an object.', { domain: 'schema' });
    return finalizeReport(collector, [], [], {});
  }
  if (!data.battle || !isRecord(data.battle)) {
    collector.error('BATTLE_REQUIRED', 'Battle package requires one Battle entity.', { path: 'battle', domain: 'schema' });
    return finalizeReport(collector, [], [], {});
  }

  const { all, byKind } = collectIds(data, collector);
  const battle = data.battle;
  validateCommonEntity(battle, collector, 'battle');
  const commonCollections: Array<[string, any[]]> = [
    ['phases', asArray(data.phases)], ['factions', asArray(data.factions)],
    ['formations', asArray(data.formations)], ['units', asArray(data.units)],
    ['commanders', asArray(data.commanders)], ['events', asArray(data.events)],
    ['evidence', asArray(data.evidence)], ['sources', asArray(data.sources)],
    ['perspectives', asArray(data.perspectives)], ['uncertainties', asArray(data.uncertainties)],
    ['media', asArray(data.media)], ['cameraCues', asArray(data.cameraCues)],
  ];
  for (const [kind, entities] of commonCollections) {
    entities.forEach((entity, index) => validateCommonEntity(entity, collector, `${kind}[${index}]`));
  }
  asArray(data.locations).forEach((feature, index) => validateCommonEntity(feature?.properties, collector, `locations[${index}].properties`));
  asArray(data.routes).forEach((feature, index) => validateCommonEntity(feature?.properties, collector, `routes[${index}].properties`));
  asArray(data.battleAreas).forEach((feature, index) => validateCommonEntity(feature?.properties, collector, `battleAreas[${index}].properties`));
  validateSchemaVersion(battle.schemaVersion, collector, 'battle.schemaVersion', battle.id);
  validateHistoricalTime(battle.startTime, collector, 'battle.startTime', battle.id);
  validateHistoricalTime(battle.endTime, collector, 'battle.endTime', battle.id);
  if (battle.geographicExtent !== null) validateGeoJsonGeometry(battle.geographicExtent, collector, 'battle.geographicExtent', battle.id);
  requireRefs(battle.phaseRefs, byKind.phases, collector, 'battle.phaseRefs', 'Phase', battle.id);
  requireRefs(battle.factionRefs, byKind.factions, collector, 'battle.factionRefs', 'Faction', battle.id);
  requireRefs(battle.sourceRefs, byKind.sources, collector, 'battle.sourceRefs', 'Source', battle.id);
  if (battle.defaultPerspectiveRef) requireRef(battle.defaultPerspectiveRef, byKind.perspectives, collector, 'battle.defaultPerspectiveRef', 'Perspective', battle.id);

  const battleStart = getComparableStart(battle.startTime);
  const battleEnd = getComparableEnd(battle.endTime);

  asArray(data.phases).forEach((phase, index) => {
    const path = `phases[${index}]`;
    validateSchemaVersion(phase.schemaVersion, collector, `${path}.schemaVersion`, phase.id);
    requireRef(phase.battleId, byKind.battle, collector, `${path}.battleId`, 'Battle', phase.id);
    requireRefs(phase.participatingUnitRefs, byKind.units, collector, `${path}.participatingUnitRefs`, 'Unit', phase.id);
    requireRefs(phase.eventRefs, byKind.events, collector, `${path}.eventRefs`, 'Event', phase.id);
    requireRefs(phase.sourceRefs, byKind.sources, collector, `${path}.sourceRefs`, 'Source', phase.id);
    validateHistoricalTime(phase.startTime, collector, `${path}.startTime`, phase.id);
    validateHistoricalTime(phase.endTime, collector, `${path}.endTime`, phase.id);
    const start = getComparableStart(phase.startTime);
    const end = getComparableEnd(phase.endTime);
    if (start !== undefined && end !== undefined && start > end) {
      collector.error('PHASE_BOUNDARY_REVERSED', 'Phase start must not be after phase end.', { path, entityId: phase.id, domain: 'integrity' });
    }
    if (battleStart !== undefined && start !== undefined && start < battleStart || battleEnd !== undefined && end !== undefined && end > battleEnd) {
      collector.error('PHASE_OUTSIDE_BATTLE_BOUNDARY', 'Phase time lies outside the Battle temporal extent.', { path, entityId: phase.id, domain: 'integrity' });
    }
  });

  asArray(data.factions).forEach((entity, index) => {
    validateSchemaVersion(entity.schemaVersion, collector, `factions[${index}].schemaVersion`, entity.id);
    requireRefs(entity.sourceRefs, byKind.sources, collector, `factions[${index}].sourceRefs`, 'Source', entity.id);
  });
  asArray(data.formations).forEach((entity, index) => {
    const path = `formations[${index}]`;
    validateSchemaVersion(entity.schemaVersion, collector, `${path}.schemaVersion`, entity.id);
    requireRef(entity.factionId, byKind.factions, collector, `${path}.factionId`, 'Faction', entity.id);
    if (entity.parentFormationId) requireRef(entity.parentFormationId, byKind.formations, collector, `${path}.parentFormationId`, 'Formation', entity.id);
    requireRefs(entity.commanderRefs, byKind.commanders, collector, `${path}.commanderRefs`, 'Commander', entity.id);
    requireRefs(entity.childFormationRefs, byKind.formations, collector, `${path}.childFormationRefs`, 'Formation', entity.id);
    requireRefs(entity.unitRefs, byKind.units, collector, `${path}.unitRefs`, 'Unit', entity.id);
    requireRefs(entity.sourceRefs, byKind.sources, collector, `${path}.sourceRefs`, 'Source', entity.id);
  });
  asArray(data.units).forEach((entity, index) => {
    const path = `units[${index}]`;
    validateSchemaVersion(entity.schemaVersion, collector, `${path}.schemaVersion`, entity.id);
    requireRef(entity.factionId, byKind.factions, collector, `${path}.factionId`, 'Faction', entity.id);
    if (entity.parentUnitId) requireRef(entity.parentUnitId, byKind.units, collector, `${path}.parentUnitId`, 'Unit', entity.id);
    if (entity.formationId) requireRef(entity.formationId, byKind.formations, collector, `${path}.formationId`, 'Formation', entity.id);
    requireRefs(entity.commanderRefs, byKind.commanders, collector, `${path}.commanderRefs`, 'Commander', entity.id);
    requireRefs(entity.sourceRefs, byKind.sources, collector, `${path}.sourceRefs`, 'Source', entity.id);
  });
  asArray(data.commanders).forEach((entity, index) => {
    const path = `commanders[${index}]`;
    validateSchemaVersion(entity.schemaVersion, collector, `${path}.schemaVersion`, entity.id);
    requireRefs(entity.formationRefs, byKind.formations, collector, `${path}.formationRefs`, 'Formation', entity.id);
    requireRefs(entity.unitRefs, byKind.units, collector, `${path}.unitRefs`, 'Unit', entity.id);
    requireRefs(entity.sourceRefs, byKind.sources, collector, `${path}.sourceRefs`, 'Source', entity.id);
    if (entity.validTime) validateHistoricalTime(entity.validTime, collector, `${path}.validTime`, entity.id);
  });

  asArray(data.locations).forEach((feature, index) => validateLocation(feature, collector, index));
  asArray(data.routes).forEach((feature, index) => validateRoute(feature, collector, index));
  asArray(data.battleAreas).forEach((feature, index) => {
    const path = `battleAreas[${index}]`;
    if (feature.geometry !== null) validateGeoJsonGeometry(feature.geometry, collector, `${path}.geometry`, feature.properties.id);
    requireRef(feature.properties.battleId, byKind.battle, collector, `${path}.properties.battleId`, 'Battle', feature.properties.id);
    requireRefs(feature.properties.sourceRefs, byKind.sources, collector, `${path}.properties.sourceRefs`, 'Source', feature.properties.id);
  });

  asArray(data.routes).forEach((route, index) => {
    const path = `routes[${index}].properties`;
    const id = route.properties.id;
    requireRef(route.properties.battleId, byKind.battle, collector, `${path}.battleId`, 'Battle', id);
    if (route.properties.phaseId) requireRef(route.properties.phaseId, byKind.phases, collector, `${path}.phaseId`, 'Phase', id);
    if (route.properties.unitId) requireRef(route.properties.unitId, byKind.units, collector, `${path}.unitId`, 'Unit', id);
    requireRefs(route.properties.sourceRefs, byKind.sources, collector, `${path}.sourceRefs`, 'Source', id);
    route.properties.routePoints.forEach((point: any, pointIndex: number) => {
      if (point.locationRef) requireRef(point.locationRef, byKind.locations, collector, `${path}.routePoints[${pointIndex}].locationRef`, 'Location', id);
      if (point.eventRef) requireRef(point.eventRef, byKind.events, collector, `${path}.routePoints[${pointIndex}].eventRef`, 'Event', id);
      requireRefs(point.sourceRefs, byKind.sources, collector, `${path}.routePoints[${pointIndex}].sourceRefs`, 'Source', id);
    });
    route.properties.uncertaintySegments.forEach((segment: any, segmentIndex: number) => {
      requireRefs(segment.sourceRefs, byKind.sources, collector, `${path}.uncertaintySegments[${segmentIndex}].sourceRefs`, 'Source', id);
    });
  });

  asArray(data.events).forEach((event, index) => {
    const path = `events[${index}]`;
    validateSchemaVersion(event.schemaVersion, collector, `${path}.schemaVersion`, event.id);
    requireRef(event.battleId, byKind.battle, collector, `${path}.battleId`, 'Battle', event.id);
    if (event.phaseId) requireRef(event.phaseId, byKind.phases, collector, `${path}.phaseId`, 'Phase', event.id);
    requireRefs(event.locationRefs, byKind.locations, collector, `${path}.locationRefs`, 'Location', event.id);
    requireRefs(event.participatingUnitRefs, byKind.units, collector, `${path}.participatingUnitRefs`, 'Unit', event.id);
    requireRefs(event.routeRefs, byKind.routes, collector, `${path}.routeRefs`, 'Route', event.id);
    requireRefs(event.perspectiveRefs, byKind.perspectives, collector, `${path}.perspectiveRefs`, 'Perspective', event.id);
    requireRefs(event.evidenceRefs, byKind.evidence, collector, `${path}.evidenceRefs`, 'Evidence', event.id);
    requireRefs(event.uncertaintyRefs, byKind.uncertainties, collector, `${path}.uncertaintyRefs`, 'Uncertainty', event.id);
    requireRefs(event.mediaRefs, byKind.media, collector, `${path}.mediaRefs`, 'Media', event.id);
    requireRefs(event.sourceRefs, byKind.sources, collector, `${path}.sourceRefs`, 'Source', event.id);
    validateHistoricalTime(event.historicalTime, collector, `${path}.historicalTime`, event.id);
  });

  asArray(data.evidence).forEach((entity, index) => {
    const path = `evidence[${index}]`;
    validateSchemaVersion(entity.schemaVersion, collector, `${path}.schemaVersion`, entity.id);
    requireRef(entity.sourceId, byKind.sources, collector, `${path}.sourceId`, 'Source', entity.id);
    requireRefs(entity.relatedEntityRefs, all, collector, `${path}.relatedEntityRefs`, 'Entity', entity.id);
    if (entity.perspectiveRef) requireRef(entity.perspectiveRef, byKind.perspectives, collector, `${path}.perspectiveRef`, 'Perspective', entity.id);
  });
  asArray(data.sources).forEach((entity, index) => validateSchemaVersion(entity.schemaVersion, collector, `sources[${index}].schemaVersion`, entity.id));
  asArray(data.perspectives).forEach((entity, index) => {
    const path = `perspectives[${index}]`;
    validateSchemaVersion(entity.schemaVersion, collector, `${path}.schemaVersion`, entity.id);
    requireRefs(entity.sourceRefs, byKind.sources, collector, `${path}.sourceRefs`, 'Source', entity.id);
    entity.accounts.forEach((account: any, accountIndex: number) => {
      requireRef(account.perspectiveRef, byKind.perspectives, collector, `${path}.accounts[${accountIndex}].perspectiveRef`, 'Perspective', entity.id);
      requireRefs(account.evidenceRefs, byKind.evidence, collector, `${path}.accounts[${accountIndex}].evidenceRefs`, 'Evidence', entity.id);
      requireRefs(account.sourceRefs, byKind.sources, collector, `${path}.accounts[${accountIndex}].sourceRefs`, 'Source', entity.id);
    });
  });
  asArray(data.uncertainties).forEach((entity, index) => {
    validateSchemaVersion(entity.schemaVersion, collector, `uncertainties[${index}].schemaVersion`, entity.id);
    requireRefs(entity.sourceRefs, byKind.sources, collector, `uncertainties[${index}].sourceRefs`, 'Source', entity.id);
  });
  asArray(data.media).forEach((entity, index) => {
    validateSchemaVersion(entity.schemaVersion, collector, `media[${index}].schemaVersion`, entity.id);
    requireRefs(entity.sourceRefs, byKind.sources, collector, `media[${index}].sourceRefs`, 'Source', entity.id);
  });
  asArray(data.cameraCues).forEach((entity, index) => {
    const path = `cameraCues[${index}]`;
    validateSchemaVersion(entity.schemaVersion, collector, `${path}.schemaVersion`, entity.id);
    if (entity.eventRef) requireRef(entity.eventRef, byKind.events, collector, `${path}.eventRef`, 'Event', entity.id);
    if (entity.locationRef) requireRef(entity.locationRef, byKind.locations, collector, `${path}.locationRef`, 'Location', entity.id);
    if (entity.routeRef) requireRef(entity.routeRef, byKind.routes, collector, `${path}.routeRef`, 'Route', entity.id);
    if (entity.unitRef) requireRef(entity.unitRef, byKind.units, collector, `${path}.unitRef`, 'Unit', entity.id);
  });

  if (manifest) {
    validateSchemaVersion(manifest.schemaVersion, collector, 'manifest.schemaVersion', manifest.packageId);
    if (manifest.battleId !== battle.id) {
      collector.error('MANIFEST_BATTLE_MISMATCH', 'Manifest battleId must match Battle.id.', {
        path: 'manifest.battleId', entityId: manifest.packageId, domain: 'integrity',
      });
    }
    if (manifest.sourceCatalog.adapter !== 'legacy-battlefield-sources') {
      collector.error('SOURCE_ADAPTER_REQUIRED', 'BR-1 packages must resolve the existing source catalog through the legacy adapter.', {
        path: 'manifest.sourceCatalog.adapter', entityId: manifest.packageId, domain: 'schema',
      });
    }
  }

  const unresolved = asArray(data.locations)
    .filter(location => location.geometry === null || unresolvedStatuses.has(location.properties.verificationStatus))
    .map(location => location.properties.id);
  const unverifiedCoordinates = asArray(data.locations)
    .filter(location => unresolvedStatuses.has(location.properties.coordinateProvenance.verificationStatus))
    .map(location => location.properties.id);
  const routeStatus: Record<string, number> = {};
  asArray(data.routes).forEach(route => {
    const status = route.properties.status;
    routeStatus[status] = (routeStatus[status] ?? 0) + 1;
  });

  return finalizeReport(collector, unresolved, unverifiedCoordinates, routeStatus);
}

function finalizeReport(
  collector: DiagnosticCollector,
  unresolvedEntityIds: string[],
  unverifiedCoordinateIds: string[],
  routeStatus: Record<string, number>,
): ValidationReport {
  const errors = collector.diagnostics.filter(item => item.severity === 'ERROR').length;
  const warnings = collector.diagnostics.filter(item => item.severity === 'WARNING').length;
  const info = collector.diagnostics.filter(item => item.severity === 'INFO').length;
  const conflicted = collector.diagnostics.some(item => item.code.includes('DISPUTED'));
  const qualityStatus = errors > 0
    ? 'Invalid'
    : conflicted
      ? 'Conflicted'
      : unresolvedEntityIds.length > 0
        ? 'Incomplete'
        : warnings > 0
          ? 'Needs Review'
          : 'Verified';
  return {
    valid: errors === 0,
    qualityStatus,
    errors,
    warnings,
    info,
    diagnostics: collector.diagnostics,
    unresolvedEntityIds: [...new Set(unresolvedEntityIds)].sort(),
    unverifiedCoordinateIds: [...new Set(unverifiedCoordinateIds)].sort(),
    routeStatus,
  };
}

export function diagnosticsBySeverity(
  report: ValidationReport,
  severity: ValidationDiagnostic['severity'],
): ValidationDiagnostic[] {
  return report.diagnostics.filter(item => item.severity === severity);
}
