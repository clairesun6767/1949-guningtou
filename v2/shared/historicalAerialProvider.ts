import {
  HISTORICAL_AERIAL_1945,
  type HistoricalAerialProviderMode,
  type HistoricalSourceMetadata,
} from '../config/historicalAerial.js';

export interface HistoricalAerialLoadResult {
  status: 'disabled' | 'rights-blocked';
  metadata: HistoricalSourceMetadata;
  reason: string;
}

export interface HistoricalAerialProvider {
  readonly mode: HistoricalAerialProviderMode;
  readonly metadata: HistoricalSourceMetadata;
  loadMetadata(year?: number): Promise<HistoricalSourceMetadata>;
  loadLayer(year?: number): Promise<HistoricalAerialLoadResult>;
  canUsePixels(): boolean;
}

export function clampHistoricalAerialOpacity(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function validateHistoricalSourceMetadata(metadata: HistoricalSourceMetadata) {
  const { bounds } = metadata;
  if (!metadata.provider || !metadata.dataset || !metadata.layerName || !metadata.sourceUrl) return false;
  if (!Number.isInteger(metadata.year) || metadata.year < 1900 || metadata.year > 2100) return false;
  if (!Number.isFinite(bounds.west) || !Number.isFinite(bounds.south) || !Number.isFinite(bounds.east) || !Number.isFinite(bounds.north)) return false;
  if (bounds.west >= bounds.east || bounds.south >= bounds.north) return false;
  return Boolean(metadata.crs && metadata.imageFormat && metadata.tileMatrixSet && metadata.rightsStatus);
}

export function createHistoricalAerialProvider(mode: HistoricalAerialProviderMode = 'disabled'): HistoricalAerialProvider {
  const metadata = { ...HISTORICAL_AERIAL_1945, usageMode: mode };
  if (!validateHistoricalSourceMetadata(metadata)) throw new Error('Invalid historical aerial source metadata.');
  return {
    mode,
    metadata,
    async loadMetadata(year = metadata.year) {
      if (year !== metadata.year) throw new Error(`Historical aerial year ${year} is not configured for this prototype.`);
      return metadata;
    },
    async loadLayer(year = metadata.year) {
      const loadedMetadata = await this.loadMetadata(year);
      return {
        status: mode === 'disabled' ? 'disabled' : 'rights-blocked',
        metadata: loadedMetadata,
        reason: 'No aerial pixels are requested or bundled until written runtime and redistribution permission is confirmed.',
      };
    },
    canUsePixels() {
      return false;
    },
  };
}
