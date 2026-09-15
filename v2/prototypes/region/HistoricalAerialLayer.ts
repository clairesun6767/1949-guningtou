import * as THREE from 'three';
import {
  HISTORICAL_AERIAL_CONFIG,
  type HistoricalAerialAlignmentStatus,
  type HistoricalAerialMode,
  type HistoricalSourceMetadata,
} from '../../config/historicalAerial.js';
import { getHistoricalAerialDataset, HISTORICAL_AERIAL_DATASETS } from '../../config/historicalAerialRegistry.js';
import { clampHistoricalAerialOpacity, createHistoricalAerialProvider } from '../../shared/historicalAerialProvider.js';
import type { HistoricalAerialDataset, HistoricalAerialYear } from '../../shared/historicalAerialDataset.js';
import type { HistoricalAerialSelectionMode, HistoricalAerialSourceYear } from '../../shared/historicalAerialSelection.js';
import type { RegionAerialBinding } from './RegionTerrain.js';

export type HistoricalAerialLayerStatus = 'SOURCE REVIEW' | 'RIGHTS BLOCKED' | 'LOCAL READY / RIGHTS REVIEW';

export interface HistoricalAerialManifestDataset {
  id: string;
  year: HistoricalAerialYear;
  bounds: HistoricalAerialDataset['bounds'];
  status: string;
  rightsStatus?: string;
  tileCount?: number;
  readyTileCount?: number;
  qualityMetadata?: Partial<HistoricalAerialDataset['qualityMetadata']>;
  mosaic?: {
    url: string;
    bounds: HistoricalAerialDataset['bounds'];
    width: number;
    height: number;
    bytes: number;
  };
}

export interface HistoricalAerialManifest {
  schemaVersion: number;
  localOnly: boolean;
  rightsStatus: string;
  datasets: HistoricalAerialManifestDataset[];
  smartComposite?: {
    status: string;
    url?: string;
    sourceMaskUrl?: string;
    bounds?: HistoricalAerialDataset['bounds'];
    width?: number;
    height?: number;
    bytes?: number;
    distribution?: Partial<Record<HistoricalAerialSourceYear, number>>;
    selectionGranularity?: string;
    selectionPolicy?: string;
  };
  totals?: {
    requestedTiles?: number;
    downloadedBytes?: number;
    withinBudget?: boolean;
  };
}

export interface HistoricalAerialLayerStats {
  year: HistoricalAerialYear;
  years: string;
  status: HistoricalAerialLayerStatus;
  opacity: number;
  textureResolution: string;
  payloadBytes: number;
  alignment: HistoricalAerialAlignmentStatus;
  bounds: string;
  coverageMaskDebug: boolean;
  selectionMode: HistoricalAerialSelectionMode;
  sourceDistribution: string;
  sourceMaskUrl: string;
  tileCount: number;
  downloadedBytes: number;
  rightsStatus: string;
  textureReadyMs: number | null;
}

export interface HistoricalAerialLayerOptions {
  year?: HistoricalAerialYear;
  mode?: HistoricalAerialMode;
  opacity?: number;
  toneEnabled?: boolean;
  selectionMode?: HistoricalAerialSelectionMode;
  enabledYears?: HistoricalAerialYear[];
  providerMode?: 'disabled' | 'local';
  localBaseUrl?: string;
  allowLocalPixels?: boolean;
}

function isDevBuild() {
  return typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
}

function formatBounds(bounds: HistoricalAerialDataset['bounds']) {
  return `${bounds.west.toFixed(5)}–${bounds.east.toFixed(5)}E / ${bounds.south.toFixed(5)}–${bounds.north.toFixed(5)}N`;
}

function manifestDataset(manifest: HistoricalAerialManifest | null, year: HistoricalAerialYear) {
  return manifest?.datasets.find(dataset => dataset.year === year);
}

/**
 * Source-safe historical adapter. Production makes no Three texture or tile request
 * until rights are cleared; an explicit local POC
 * query is the only path that reads the ignored local manifest and pixels.
 */
export class HistoricalAerialLayer {
  readonly metadata: HistoricalSourceMetadata;
  readonly provider = createHistoricalAerialProvider('disabled');
  private mode: HistoricalAerialMode;
  private opacity: number;
  private toneEnabled: boolean;
  private year: HistoricalAerialYear;
  private selectionMode: HistoricalAerialSelectionMode;
  private enabledYears: HistoricalAerialYear[];
  private coverageMaskDebug = false;
  private disposed = false;
  private texture: THREE.Texture | null = null;
  private manifest: HistoricalAerialManifest | null = null;
  private activeBounds: HistoricalAerialDataset['bounds'] | null = null;
  private textureReadyMs: number | null = null;
  private localBaseUrl: string;
  private allowLocalPixels: boolean;
  private loadPromise: Promise<boolean> | null = null;

  constructor(options: HistoricalAerialLayerOptions = {}) {
    this.metadata = this.provider.metadata;
    this.year = options.year ?? 1945;
    this.mode = options.mode ?? HISTORICAL_AERIAL_CONFIG.defaultMode;
    this.opacity = clampHistoricalAerialOpacity(options.opacity ?? HISTORICAL_AERIAL_CONFIG.defaultOpacity);
    this.toneEnabled = options.toneEnabled ?? HISTORICAL_AERIAL_CONFIG.defaultToneEnabled;
    this.selectionMode = options.selectionMode ?? 'smart';
    this.enabledYears = [...new Set(options.enabledYears ?? [1944, 1945])].filter(year => year === 1944 || year === 1945 || year === 1958);
    this.localBaseUrl = options.localBaseUrl ?? '/1949-guningtou/';
    this.allowLocalPixels = Boolean(options.allowLocalPixels && options.providerMode === 'local');
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

  get selectedYear() {
    return this.year;
  }

  get sourceSelectionMode() {
    return this.selectionMode;
  }

  get selectedYears() {
    return [...this.enabledYears];
  }

  get isLocalReady() {
    return Boolean(this.texture && this.manifest);
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

  setYear(year: HistoricalAerialYear) {
    this.assertActive();
    this.year = year;
    if (this.selectionMode === 'single') void this.loadLocalPoc();
  }

  setSelectionMode(mode: HistoricalAerialSelectionMode) {
    this.assertActive();
    this.selectionMode = mode;
    if (this.isLocalReady) void this.loadLocalPoc();
  }

  setEnabledYears(years: HistoricalAerialYear[]) {
    this.assertActive();
    this.enabledYears = [...new Set(years)];
    if (this.isLocalReady) void this.loadLocalPoc();
  }

  setCoverageMaskDebug(enabled: boolean) {
    this.assertActive();
    this.coverageMaskDebug = enabled;
  }

  async loadLocalPoc(baseUrl = this.localBaseUrl) {
    this.assertActive();
    if (!this.allowLocalPixels || !isDevBuild()) return false;
    if (this.loadPromise) return this.loadPromise;
    this.localBaseUrl = baseUrl;
    this.loadPromise = this.loadLocalPocInternal(baseUrl).finally(() => {
      this.loadPromise = null;
    });
    return this.loadPromise;
  }

  private async loadLocalPocInternal(baseUrl: string) {
    const startedAt = performance.now();
    const response = await fetch(`${baseUrl.replace(/\/?$/, '/')}.local/aerial-poc/manifest.json`);
    if (!response.ok) throw new Error(`Local aerial POC manifest unavailable (${response.status}).`);
    const manifest = await response.json() as HistoricalAerialManifest;
    if (!manifest.localOnly || manifest.rightsStatus === 'APPROVED') throw new Error('Local aerial POC manifest failed the rights boundary.');
    const url = this.textureUrlForManifest(manifest);
    if (!url) throw new Error('Local aerial POC has no valid mosaic for the selected mode.');
    const texture = await new THREE.TextureLoader().loadAsync(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    this.texture?.dispose();
    this.texture = texture;
    this.manifest = manifest;
    this.activeBounds = this.boundsForManifest(manifest);
    this.textureReadyMs = performance.now() - startedAt;
    return true;
  }

  private textureUrlForManifest(manifest: HistoricalAerialManifest) {
    const hasBothPrimaryYears = this.enabledYears.includes(1944) && this.enabledYears.includes(1945);
    if ((this.selectionMode === 'smart' || this.selectionMode === 'distribution') && hasBothPrimaryYears) return manifest.smartComposite?.url;
    return manifestDataset(manifest, this.year)?.mosaic?.url;
  }

  private boundsForManifest(manifest: HistoricalAerialManifest) {
    const hasBothPrimaryYears = this.enabledYears.includes(1944) && this.enabledYears.includes(1945);
    if ((this.selectionMode === 'smart' || this.selectionMode === 'distribution') && hasBothPrimaryYears) return manifest.smartComposite?.bounds ?? null;
    return manifestDataset(manifest, this.year)?.mosaic?.bounds ?? getHistoricalAerialDataset(this.year)?.bounds ?? null;
  }

  getTextureBinding(): RegionAerialBinding | null {
    if (!this.texture || !this.activeBounds) return null;
    return { texture: this.texture, bounds: this.activeBounds, available: true };
  }

  getStats(): HistoricalAerialLayerStats {
    const activeDataset = manifestDataset(this.manifest, this.year);
    const dataset = getHistoricalAerialDataset(this.year) ?? HISTORICAL_AERIAL_DATASETS[1];
    const distribution = this.manifest?.smartComposite?.distribution;
    const hasBothPrimaryYears = this.enabledYears.includes(1944) && this.enabledYears.includes(1945);
    const usingSmartComposite = (this.selectionMode === 'smart' || this.selectionMode === 'distribution') && hasBothPrimaryYears;
    const smartComposite = usingSmartComposite ? this.manifest?.smartComposite : undefined;
    const sourceDistribution = distribution
      ? `1944 ${distribution[1944] ?? 0}% · 1945 ${distribution[1945] ?? 0}% · 1958 ${distribution[1958] ?? 0}% · BASE ${distribution.BASE ?? 0}%`
      : '1944 — · 1945 — · 1958 — · BASE 100%';
    return {
      year: this.year,
      years: this.enabledYears.join(' + '),
      status: this.texture ? 'LOCAL READY / RIGHTS REVIEW' : 'RIGHTS BLOCKED',
      opacity: this.opacity,
      textureResolution: smartComposite?.width && smartComposite.height
        ? `${smartComposite.width}×${smartComposite.height}`
        : activeDataset?.mosaic ? `${activeDataset.mosaic.width}×${activeDataset.mosaic.height}` : '未載入／本機 POC',
      payloadBytes: smartComposite?.bytes ?? activeDataset?.mosaic?.bytes ?? 0,
      alignment: this.texture ? 'EXPERIMENTAL ALIGNMENT' : 'SOURCE REVIEW',
      bounds: formatBounds(this.activeBounds ?? dataset.bounds),
      coverageMaskDebug: this.coverageMaskDebug,
      selectionMode: this.selectionMode,
      sourceDistribution,
      sourceMaskUrl: this.manifest?.smartComposite?.sourceMaskUrl ?? '',
      tileCount: usingSmartComposite
        ? this.manifest?.datasets.reduce((total, item) => total + (item.readyTileCount ?? item.tileCount ?? 0), 0) ?? 0
        : activeDataset?.readyTileCount ?? activeDataset?.tileCount ?? 0,
      downloadedBytes: this.manifest?.totals?.downloadedBytes ?? 0,
      rightsStatus: this.manifest?.rightsStatus ?? 'BLOCKED — RIGHTS UNCLEAR',
      textureReadyMs: this.textureReadyMs,
    };
  }

  dispose() {
    this.disposed = true;
    this.texture?.dispose();
    this.texture = null;
  }

  private assertActive() {
    if (this.disposed) throw new Error('HistoricalAerialLayer has been disposed.');
  }
}
