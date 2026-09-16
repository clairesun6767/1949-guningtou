import * as THREE from 'three';
import {
  HISTORICAL_AERIAL_CONFIG,
  type HistoricalAerialAlignmentStatus,
  type HistoricalAerialMode,
  type HistoricalSourceMetadata,
} from '../../config/historicalAerial.js';
import {
  getHistoricalAerialDataset,
  HISTORICAL_AERIAL_DATASETS,
  type GuningtouHigherZoom,
} from '../../config/historicalAerialRegistry.js';
import { clampHistoricalAerialOpacity, createHistoricalAerialProvider } from '../../shared/historicalAerialProvider.js';
import type { ActualMosaicExtent, DeclaredDatasetExtent, HistoricalAerialDataset, HistoricalAerialYear } from '../../shared/historicalAerialDataset.js';
import type { HistoricalAerialTileRange } from '../../shared/historicalAerialGeoreference.js';
import type { HistoricalAerialSelectionMode, HistoricalAerialSourceYear } from '../../shared/historicalAerialSelection.js';
import type { RegionAerialBinding } from './RegionTerrain.js';

export type HistoricalAerialLayerStatus = 'SOURCE REVIEW' | 'RIGHTS BLOCKED' | 'LOCAL READY / RIGHTS REVIEW';

export interface HistoricalAerialManifestDataset {
  id: string;
  year: HistoricalAerialYear;
  /** Declared KML LatLonBox; never use this as the raster sample extent. */
  bounds: DeclaredDatasetExtent;
  requestedTileRange?: HistoricalAerialTileRange;
  actualMosaicBounds?: ActualMosaicExtent;
  validPixelMask?: {
    url?: string;
    localPath?: string;
    width: number;
    height: number;
    bytes?: number;
    encoding: 'alpha>8';
  };
  status: string;
  rightsStatus?: string;
  tileCount?: number;
  readyTileCount?: number;
  qualityMetadata?: Partial<HistoricalAerialDataset['qualityMetadata']>;
  mosaic?: {
    url: string;
    /** Actual XYZ tile footprint used to build this image. */
    bounds: ActualMosaicExtent;
    actualMosaicBounds?: ActualMosaicExtent;
    tileRange?: HistoricalAerialTileRange;
    validPixelMask?: HistoricalAerialManifestDataset['validPixelMask'];
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
    bounds?: ActualMosaicExtent;
    compositeMosaicBounds?: ActualMosaicExtent;
    tileRange?: HistoricalAerialTileRange;
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

export interface HistoricalAerialHigherZoomManifest {
  schemaVersion: number;
  localOnly: boolean;
  rightsStatus: string;
  target: {
    longitude: number;
    latitude: number;
  };
  request: {
    zooms: number[];
    maxTilesPerZoom: number;
    coordinateOrder: 'XYZ';
    tileWindow: string;
  };
  zooms: Record<string, {
    zoom: number;
    tileRange: HistoricalAerialTileRange;
    bounds: ActualMosaicExtent;
    tileCount: number;
    tileGeographicSize?: {
      longitudeDegrees: number;
      latitudeDegrees: number;
    };
    datasets: HistoricalAerialManifestDataset[];
    totals?: {
      requestedTiles?: number;
      downloadedBytes?: number;
      withinBudget?: boolean;
    };
  }>;
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
  /** Gate A.3P.2b only: read one compact Guningtou higher-zoom manifest. */
  aerialZoom?: GuningtouHigherZoom;
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
  private contextTexture: THREE.Texture | null = null;
  private manifest: HistoricalAerialManifest | null = null;
  private activeBounds: HistoricalAerialDataset['bounds'] | null = null;
  private contextBounds: ActualMosaicExtent | null = null;
  private contextPayloadBytes = 0;
  private contextDownloadedBytes = 0;
  private textureReadyMs: number | null = null;
  private localBaseUrl: string;
  private allowLocalPixels: boolean;
  private readonly aerialZoom?: GuningtouHigherZoom;
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
    this.aerialZoom = options.aerialZoom;
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
    const manifestPath = this.aerialZoom
      ? 'guningtou-higher-zoom-manifest.json'
      : 'manifest.json';
    const sourceManifest = await this.fetchManifest(baseUrl, manifestPath);
    const manifest = this.manifestForRequestedZoom(sourceManifest);
    if (!manifest.localOnly || manifest.rightsStatus === 'APPROVED') throw new Error('Local aerial POC manifest failed the rights boundary.');
    const url = this.textureUrlForManifest(manifest);
    if (!url) throw new Error('Local aerial POC has no valid mosaic for the selected mode.');
    const texture = await this.loadTexture(url);

    let contextTexture: THREE.Texture | null = null;
    let contextBounds: ActualMosaicExtent | null = null;
    let contextPayloadBytes = 0;
    let contextDownloadedBytes = 0;
    if (this.aerialZoom) {
      try {
        const contextManifest = await this.fetchManifest(baseUrl, 'manifest.json') as HistoricalAerialManifest;
        if (!contextManifest.localOnly || contextManifest.rightsStatus === 'APPROVED') {
          throw new Error('Base local aerial POC manifest failed the rights boundary.');
        }
        const contextDataset = manifestDataset(contextManifest, this.year);
        const contextUrl = contextDataset?.mosaic?.url;
        contextBounds = contextDataset?.actualMosaicBounds
          ?? contextDataset?.mosaic?.actualMosaicBounds
          ?? contextDataset?.mosaic?.bounds
          ?? null;
        if (contextUrl && contextBounds) {
          contextTexture = await this.loadTexture(contextUrl);
          contextPayloadBytes = contextDataset.mosaic?.bytes ?? 0;
          contextDownloadedBytes = contextDataset.mosaic?.bytes ?? 0;
        }
      } catch (error) {
        console.warn('Gate A.3P higher-zoom context unavailable; keeping detail mosaic only:', error);
        contextTexture = null;
        contextBounds = null;
        contextPayloadBytes = 0;
        contextDownloadedBytes = 0;
      }
    }

    this.texture?.dispose();
    this.contextTexture?.dispose();
    this.texture = texture;
    this.contextTexture = contextTexture;
    this.manifest = manifest;
    this.activeBounds = this.boundsForManifest(manifest);
    this.contextBounds = contextBounds;
    this.contextPayloadBytes = contextPayloadBytes;
    this.contextDownloadedBytes = contextDownloadedBytes;
    this.textureReadyMs = performance.now() - startedAt;
    return true;
  }

  private async fetchManifest(baseUrl: string, manifestPath: string) {
    const response = await fetch(baseUrl.replace(/\/?$/, '/') + '.local/aerial-poc/' + manifestPath);
    if (!response.ok) throw new Error('Local aerial POC manifest unavailable (' + response.status + ').');
    return await response.json() as HistoricalAerialManifest | HistoricalAerialHigherZoomManifest;
  }

  private async loadTexture(url: string) {
    const texture = await new THREE.TextureLoader().loadAsync(url);
    texture.colorSpace = THREE.SRGBColorSpace;
    // Mosaic row 0 is XYZ north. With flipY=false, shader v=0 samples row 0.
    texture.flipY = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }

  private manifestForRequestedZoom(sourceManifest: HistoricalAerialManifest | HistoricalAerialHigherZoomManifest): HistoricalAerialManifest {
    if (!this.aerialZoom) return sourceManifest as HistoricalAerialManifest;
    const selected = (sourceManifest as HistoricalAerialHigherZoomManifest).zooms?.[String(this.aerialZoom)];
    if (!selected) throw new Error('Higher-zoom Guningtou manifest has no z' + this.aerialZoom + ' entry.');
    return {
      schemaVersion: sourceManifest.schemaVersion,
      localOnly: sourceManifest.localOnly,
      rightsStatus: sourceManifest.rightsStatus,
      datasets: selected.datasets,
      totals: selected.totals ?? sourceManifest.totals,
    };
  }

  private textureUrlForManifest(manifest: HistoricalAerialManifest) {
    if (this.aerialZoom) return manifestDataset(manifest, this.year)?.mosaic?.url;
    const hasBothPrimaryYears = this.enabledYears.includes(1944) && this.enabledYears.includes(1945);
    if ((this.selectionMode === 'smart' || this.selectionMode === 'distribution') && hasBothPrimaryYears) return manifest.smartComposite?.url;
    return manifestDataset(manifest, this.year)?.mosaic?.url;
  }

  private boundsForManifest(manifest: HistoricalAerialManifest) {
    if (this.aerialZoom) {
      const dataset = manifestDataset(manifest, this.year);
      return dataset?.actualMosaicBounds ?? dataset?.mosaic?.actualMosaicBounds ?? dataset?.mosaic?.bounds ?? null;
    }
    const hasBothPrimaryYears = this.enabledYears.includes(1944) && this.enabledYears.includes(1945);
    if ((this.selectionMode === 'smart' || this.selectionMode === 'distribution') && hasBothPrimaryYears) {
      return manifest.smartComposite?.compositeMosaicBounds ?? manifest.smartComposite?.bounds ?? null;
    }
    const dataset = manifestDataset(manifest, this.year);
    return dataset?.actualMosaicBounds ?? dataset?.mosaic?.actualMosaicBounds ?? dataset?.mosaic?.bounds ?? getHistoricalAerialDataset(this.year)?.bounds ?? null;
  }

  getTextureBinding(): RegionAerialBinding | null {
    if (!this.texture || !this.activeBounds) return null;
    const activeDataset = manifestDataset(this.manifest, this.year);
    const smart = this.manifest?.smartComposite;
    return {
      texture: this.texture,
      bounds: this.activeBounds,
      contextTexture: this.contextTexture ?? undefined,
      contextBounds: this.contextBounds ?? undefined,
      declaredBounds: activeDataset?.bounds,
      actualMosaicBounds: smart?.compositeMosaicBounds ?? activeDataset?.actualMosaicBounds ?? activeDataset?.mosaic?.actualMosaicBounds,
      requestedTileRange: smart?.tileRange ?? activeDataset?.requestedTileRange ?? activeDataset?.mosaic?.tileRange,
      available: true,
    };
  }

  getStats(): HistoricalAerialLayerStats {
    const activeDataset = manifestDataset(this.manifest, this.year);
    const dataset = getHistoricalAerialDataset(this.year) ?? HISTORICAL_AERIAL_DATASETS[1];
    const distribution = this.manifest?.smartComposite?.distribution;
    const hasBothPrimaryYears = this.enabledYears.includes(1944) && this.enabledYears.includes(1945);
    const usingSmartComposite = !this.aerialZoom
      && (this.selectionMode === 'smart' || this.selectionMode === 'distribution')
      && hasBothPrimaryYears;
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
        : activeDataset?.mosaic
        ? String(activeDataset.mosaic.width) + '×' + String(activeDataset.mosaic.height) + (this.contextTexture ? ' + z12 context' : '')
        : '未載入／本機 POC',
      payloadBytes: (smartComposite?.bytes ?? activeDataset?.mosaic?.bytes ?? 0) + this.contextPayloadBytes,
      alignment: this.texture ? 'TILE-BOUND ALIGNED / NOT VERIFIED ORTHORECTIFIED' : 'SOURCE REVIEW',
      bounds: formatBounds(this.activeBounds ?? dataset.bounds),
      coverageMaskDebug: this.coverageMaskDebug,
      selectionMode: this.selectionMode,
      sourceDistribution,
      sourceMaskUrl: this.manifest?.smartComposite?.sourceMaskUrl ?? '',
      tileCount: usingSmartComposite
        ? this.manifest?.datasets.reduce((total, item) => total + (item.readyTileCount ?? item.tileCount ?? 0), 0) ?? 0
        : activeDataset?.readyTileCount ?? activeDataset?.tileCount ?? 0,
      downloadedBytes: (this.manifest?.totals?.downloadedBytes ?? 0) + this.contextDownloadedBytes,
      rightsStatus: this.manifest?.rightsStatus ?? 'BLOCKED — RIGHTS UNCLEAR',
      textureReadyMs: this.textureReadyMs,
    };
  }

  dispose() {
    this.disposed = true;
    this.texture?.dispose();
    this.contextTexture?.dispose();
    this.texture = null;
    this.contextTexture = null;
    this.contextBounds = null;
    this.contextPayloadBytes = 0;
    this.contextDownloadedBytes = 0;
  }

  private assertActive() {
    if (this.disposed) throw new Error('HistoricalAerialLayer has been disposed.');
  }
}
