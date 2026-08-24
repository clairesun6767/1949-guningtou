import type {
  CoordinateCandidate,
  MapReferenceAdapter,
  MapReferenceProvider,
  MapSearchRequest,
  Position,
} from '../../types/index.js';

type ManualProvider = Extract<MapReferenceProvider, 'google-maps-manual' | 'google-earth-manual'>;

export class ManualExternalMapReferenceAdapter implements MapReferenceAdapter {
  readonly developmentOnly = true as const;

  constructor(readonly provider: ManualProvider) {}

  async searchCandidates(_request: MapSearchRequest): Promise<CoordinateCandidate[]> {
    return [];
  }

  async inspectCoordinate(coordinate: Position): Promise<{ providerReference: string; notes: string }> {
    const [longitude, latitude] = coordinate;
    return {
      providerReference: this.provider === 'google-earth-manual'
        ? `https://earth.google.com/web/search/${latitude},${longitude}`
        : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      notes: 'External manual reference only. No content is scraped, cached, or promoted automatically.',
    };
  }
}
