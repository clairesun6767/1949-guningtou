import {
  HISTORICAL_AERIAL_CONFIG,
  type HistoricalAerialAlignmentStatus,
  type HistoricalAerialMode,
  type HistoricalSourceMetadata,
} from '../../config/historicalAerial.js';
import { clampHistoricalAerialOpacity, createHistoricalAerialProvider } from '../../shared/historicalAerialProvider.js';

export interface HistoricalAerialLayerStats {
  year: number;
  status: 'SOURCE REVIEW' | 'RIGHTS BLOCKED';
  opacity: number;
  textureResolution: string;
  payloadBytes: number;
  alignment: HistoricalAerialAlignmentStatus;
  bounds: string;
  coverageMaskDebug: boolean;
}

export interface HistoricalAerialLayerOptions {
  year?: number;
  mode?: HistoricalAerialMode;
  opacity?: number;
  toneEnabled?: boolean;
}

/**
 * Gate A.3 source-safe adapter. It owns state and metadata, but deliberately has
 * no Three texture or tile request while the Sinica rights review is blocked.
 */
export class HistoricalAerialLayer {
  readonly metadata: HistoricalSourceMetadata;
  readonly provider = createHistoricalAerialProvider('disabled');
  private mode: HistoricalAerialMode;
  private opacity: number;
  private toneEnabled: boolean;
  private coverageMaskDebug = false;
  private disposed = false;

  constructor(options: HistoricalAerialLayerOptions = {}) {
    if (options.year !== undefined && options.year !== HISTORICAL_AERIAL_CONFIG.defaultYear) {
      throw new Error(`Historical aerial year ${options.year} is not configured for Gate A.3.`);
    }
    this.metadata = this.provider.metadata;
    this.mode = options.mode ?? HISTORICAL_AERIAL_CONFIG.defaultMode;
    this.opacity = clampHistoricalAerialOpacity(options.opacity ?? HISTORICAL_AERIAL_CONFIG.defaultOpacity);
    this.toneEnabled = options.toneEnabled ?? HISTORICAL_AERIAL_CONFIG.defaultToneEnabled;
  }

  get historicalMode() {
    return this.mode;
  }

  get aerialOpacity() {
    return this.opacity;
  }

  get archivalToneEnabled() {
    return this.toneEnabled;
  }

  setMode(mode: HistoricalAerialMode) {
    this.assertActive();
    this.mode = mode;
  }

  setOpacity(value: number) {
    this.assertActive();
    this.opacity = clampHistoricalAerialOpacity(value);
  }

  setToneEnabled(enabled: boolean) {
    this.assertActive();
    this.toneEnabled = enabled;
  }

  setCoverageMaskDebug(enabled: boolean) {
    this.assertActive();
    this.coverageMaskDebug = enabled;
  }

  getStats(): HistoricalAerialLayerStats {
    return {
      year: this.metadata.year,
      status: 'RIGHTS BLOCKED',
      opacity: this.opacity,
      textureResolution: this.metadata.resolution,
      payloadBytes: 0,
      alignment: this.metadata.alignmentStatus,
      bounds: `${this.metadata.bounds.west}–${this.metadata.bounds.east}E / ${this.metadata.bounds.south}–${this.metadata.bounds.north}N`,
      coverageMaskDebug: this.coverageMaskDebug,
    };
  }

  dispose() {
    this.disposed = true;
  }

  private assertActive() {
    if (this.disposed) throw new Error('HistoricalAerialLayer has been disposed.');
  }
}
