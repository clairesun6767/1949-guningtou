import type {
  Confidence,
  EntityId,
  LocalizedText,
  VerificationStatus,
} from './shared.js';

export const CANONICAL_CRS = 'EPSG:4326' as const;
export type CanonicalCrs = typeof CANONICAL_CRS;

export type Position2D = [longitude: number, latitude: number];
export type Position3D = [longitude: number, latitude: number, altitude: number];
export type Position = Position2D | Position3D;

export interface PointGeometry {
  type: 'Point';
  coordinates: Position;
}
export interface MultiPointGeometry {
  type: 'MultiPoint';
  coordinates: Position[];
}
export interface LineStringGeometry {
  type: 'LineString';
  coordinates: Position[];
}
export interface MultiLineStringGeometry {
  type: 'MultiLineString';
  coordinates: Position[][];
}
export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Position[][];
}
export interface MultiPolygonGeometry {
  type: 'MultiPolygon';
  coordinates: Position[][][];
}

export type GeoJsonGeometry =
  | PointGeometry
  | MultiPointGeometry
  | LineStringGeometry
  | MultiLineStringGeometry
  | PolygonGeometry
  | MultiPolygonGeometry;

export interface GeoJsonFeature<G extends GeoJsonGeometry | null, P> {
  type: 'Feature';
  id?: EntityId;
  geometry: G;
  properties: P;
  bbox?: number[];
}

export interface GeoJsonFeatureCollection<
  G extends GeoJsonGeometry | null,
  P,
> {
  type: 'FeatureCollection';
  features: Array<GeoJsonFeature<G, P>>;
  bbox?: number[];
}

export type CoordinatePrecision =
  | 'exact'
  | 'high'
  | 'medium'
  | 'approximate'
  | 'area-only'
  | 'unknown';

export type CoordinateMethod =
  | 'official-gis'
  | 'government-map'
  | 'field-survey'
  | 'survey'
  | 'google-map-manual-reference'
  | 'google-earth-manual-reference'
  | 'satellite-manual-identification'
  | 'aerial-photo-georeference'
  | 'historical-map-georeference'
  | 'local-knowledge'
  | 'manual-correction'
  | 'estimated'
  | 'unknown';

export interface CoordinateCandidate {
  coordinate: Position;
  source: string;
  method: CoordinateMethod;
  capturedAt?: string;
  notes?: string;
}

export interface CoordinateProvenance {
  coordinateSystem: CanonicalCrs;
  coordinate?: Position;
  coordinateMethod: CoordinateMethod;
  coordinatePrecision: CoordinatePrecision;
  verificationStatus: VerificationStatus;
  sourceRefs: EntityId[];
  verifiedBy?: string;
  verifiedAt?: string;
  confidence: Confidence;
  notes?: string;
  originalCandidate?: CoordinateCandidate;
  candidateSource?: string;
  finalCoordinate?: Position;
  verificationMethod?: CoordinateMethod;
}

export type GeometryTemporalContext =
  | 'historical'
  | 'modern-reference'
  | 'reconstructed'
  | 'unknown';

export interface GeometryProvenance {
  coordinateSystem: CanonicalCrs;
  temporalContext: GeometryTemporalContext;
  coordinateMethod: CoordinateMethod;
  coordinatePrecision: CoordinatePrecision;
  verificationStatus: VerificationStatus;
  sourceRefs: EntityId[];
  validFrom?: string;
  validTo?: string;
  estimatedErrorMeters?: number;
  confidence: Confidence;
  notes?: string;
}

export interface GeometryAssertion {
  geometry: GeoJsonGeometry;
  provenance: GeometryProvenance;
}

export interface GroundControlPoint {
  id: EntityId;
  imageId: EntityId;
  imagePixel: [x: number, y: number];
  coordinate: Position;
  altitudeReference?: AltitudeReference;
  sourceRef?: EntityId;
  sourceDescription?: string;
  confidence: Confidence;
  verificationStatus: VerificationStatus;
  notes?: string;
}

export interface GroundControlPointDataset {
  schemaVersion: string;
  datasetId: EntityId;
  battleId: EntityId;
  controlPoints: GroundControlPoint[];
  notes?: LocalizedText;
}

export type GeoreferenceTransformStatus =
  | 'pending'
  | 'insufficient-gcps'
  | 'ready-for-fit'
  | 'fitted'
  | 'verified'
  | 'rejected';

export interface GroundControlPointResidual {
  gcpId: EntityId;
  errorPixels?: number;
  errorMeters?: number;
}

export interface GeoreferenceErrorModel {
  gcpCount: number;
  residuals: GroundControlPointResidual[];
  rmsePixels?: number | null;
  rmseMeters?: number | null;
  transformType: 'affine' | 'homography' | 'gis-georeference' | 'unknown';
  confidence: Confidence;
  verificationStatus: VerificationStatus;
}

export interface ImageryGeoreferencingMetadata {
  imageId: EntityId;
  imagePath: string;
  width: number;
  height: number;
  crs: string;
  bounds?: [west: number, south: number, east: number, north: number] | null;
  gcpRefs: EntityId[];
  pixelSize?: [x: number, y: number];
  rotationDegrees?: number;
  sourceRef?: EntityId;
  sourceDescription?: string;
  captureDate?: string;
  accuracyMeters?: number;
  verificationStatus: VerificationStatus;
  transformMethod?: 'affine' | 'homography' | 'gis-georeference' | 'unknown';
  transformStatus: GeoreferenceTransformStatus;
  errorModel: GeoreferenceErrorModel;
  notes?: LocalizedText;
}

export type AltitudeReference =
  | 'ellipsoidal'
  | 'orthometric'
  | 'terrain-relative'
  | 'unknown';
