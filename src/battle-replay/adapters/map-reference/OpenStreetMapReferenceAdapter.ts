import type {
  CoordinateCandidate,
  MapReferenceAdapter,
  MapSearchRequest,
  Position,
} from '../../types/index.js';

export class OpenStreetMapReferenceAdapter implements MapReferenceAdapter {
  readonly provider = 'openstreetmap' as const;
  readonly developmentOnly = true as const;
  readonly tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  readonly attribution = '&copy; OpenStreetMap contributors';

  async searchCandidates(_request: MapSearchRequest): Promise<CoordinateCandidate[]> {
    return [];
  }

  async inspectCoordinate(coordinate: Position): Promise<{ providerReference: string; notes: string }> {
    const [longitude, latitude] = coordinate;
    return {
      providerReference: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`,
      notes: 'Modern OSM reference only; not evidence of a 1949 historical location.',
    };
  }
}
