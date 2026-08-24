import type { EntityId } from './shared.js';
import type {
  CoordinateCandidate,
  GeoJsonGeometry,
  Position,
} from './geospatial.js';

export type MapReferenceProvider =
  | 'google-maps-manual'
  | 'google-earth-manual'
  | 'openstreetmap'
  | 'government-gis'
  | 'orthophoto'
  | 'custom-aerial'
  | 'historical-georeferenced-map';

export interface MapSearchRequest {
  historicalName: string;
  modernName?: string;
  aliases: string[];
  approximateArea?: GeoJsonGeometry;
}

export interface MapReferenceAdapter {
  readonly provider: MapReferenceProvider;
  readonly developmentOnly: true;
  searchCandidates(request: MapSearchRequest): Promise<CoordinateCandidate[]>;
  inspectCoordinate(coordinate: Position): Promise<{
    providerReference: string;
    notes?: string;
  }>;
}

export interface CoordinateEditorDraft {
  locationId: EntityId;
  selectedCandidate?: CoordinateCandidate;
  manualCoordinate?: Position;
  routeWaypoints: Position[];
  dirty: boolean;
}
