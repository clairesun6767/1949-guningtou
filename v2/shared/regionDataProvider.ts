import {
  REGION_COMPOSITION_QUALITY,
  REGION_TERRAIN_QUALITY,
  type RegionTerrainQualityId,
  type RegionTerrainQualitySource,
} from '../config/region.js';

export interface RegionTerrainSourceTile {
  id: string;
  sourceUrl: string;
  sha256: string;
  compressedBytes: number;
  rawBytes: number;
  nativeGrid: string;
  approximateNativeResolutionMetres: number;
  latitudeTile: number;
  longitudeTile: number;
}

export interface RegionTerrainSource {
  id: string;
  title: string;
  sourceUrl: string;
  registryUrl: string;
  attribution: string;
  acquiredAt: string;
  retrievedAt?: string;
  downloadSha256?: string;
  nativeGrid: string;
  approximateNativeResolutionMetres: number;
  temporalScope: string;
  tiles?: RegionTerrainSourceTile[];
}

export interface RegionTerrainDerivation {
  method: string;
  minElevationMetres: number;
  maxElevationMetres: number;
  visualVerticalExaggerationAppliedAtRuntime: boolean;
  runtimeLandMask: string;
  landNeighbourRadius?: number;
  seaConnectivityEdge?: string | null;
  sourceGrid?: string;
  approximateSourceResolutionMetres?: number;
  sourceSampleInterpolation?: string;
  coastlineResolution?: string;
  coastlineWidth?: number;
  coastlineHeight?: number;
}

export interface RegionTerrainAsset {
  schemaVersion: string;
  id: string;
  coordinateSystem: 'EPSG:4326';
  bounds: { west: number; south: number; east: number; north: number };
  grid: { width: number; height: number };
  elevationUnit: 'metre';
  source: RegionTerrainSource;
  derivation: RegionTerrainDerivation;
  heights: number[];
  land: number[];
}

export interface RegionQualityTerrainAsset {
  schemaVersion: string;
  id: string;
  quality: Exclude<RegionTerrainQualityId, 'A'>;
  coordinateSystem: 'EPSG:4326';
  bounds: { west: number; south: number; east: number; north: number };
  grid: { width: number; height: number };
  elevationUnit: 'metre';
  source: RegionTerrainSource;
  derivation: RegionTerrainDerivation;
  heights: number[];
}

export interface RegionGeoJsonFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: unknown;
  };
}

export interface RegionCoastlineAsset {
  type: 'FeatureCollection';
  metadata: {
    version: string;
    source: { name: string; url: string; license: string; acquired: string; referenceEra: string };
    bounds: [number, number, number, number];
    scale: string;
    note: string;
  };
  features: RegionGeoJsonFeature[];
}

export interface RegionClassificationManifest {
  version: string;
  scope: 'regional' | 'regional-composition';
  coordinateSystem: 'EPSG:4326';
  bounds: { west: number; south: number; east: number; north: number };
  width: number;
  height: number;
  channels: Record<string, Record<string, string>>;
  source: { name: string; url: string; license: string; acquired: string; referenceEra: string };
  note: string;
}

export interface RegionDataset {
  terrain: RegionTerrainAsset;
  coastline: RegionCoastlineAsset;
  classification: RegionClassificationManifest;
  assets: {
    terrain: string;
    terrainB: string;
    terrainC: string;
    compositionTerrainB: string;
    compositionTerrainC: string;
    coastline: string;
    compositionCoastline: string;
    compositionClassificationA: string;
    compositionClassificationB: string;
    classificationA: string;
    classificationB: string;
  };
}

export interface RegionCompositionDataset {
  coastline: RegionCoastlineAsset;
  coastlinePayloadBytes: number;
  assets: {
    terrainB: string;
    terrainC: string;
    coastline: string;
    classificationA: string;
    classificationB: string;
  };
}

export interface RegionDataProvider {
  load(): Promise<RegionDataset>;
  loadComposition(): Promise<RegionCompositionDataset>;
  loadQuality(quality: Exclude<RegionTerrainQualityId, 'A'>, source?: RegionTerrainQualitySource): Promise<RegionQualityTerrainAsset>;
}

const COMPOSITION_COASTLINE_PAYLOAD_BYTES = 110_412;

function withBase(base: string, path: string) {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${path.replace(/^\//, '')}`;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Region data request failed (${response.status}): ${url}`);
  return response.json() as Promise<T>;
}

function validateTerrain(asset: RegionTerrainAsset) {
  const expectedSamples = asset.grid.width * asset.grid.height;
  if (asset.id !== 'kinmen-xiamen-regional' || asset.coordinateSystem !== 'EPSG:4326') {
    throw new Error('Gate A requires the isolated regional EPSG:4326 terrain asset.');
  }
  if (asset.heights.length !== expectedSamples || asset.land.length !== expectedSamples) {
    throw new Error(`Regional terrain grid is incomplete: expected ${expectedSamples} samples.`);
  }
  if (asset.bounds.west >= asset.bounds.east || asset.bounds.south >= asset.bounds.north) {
    throw new Error('Regional terrain bounds are invalid.');
  }
}

function parseGrid(value: string) {
  const match = /^(\d+)×(\d+)$/.exec(value);
  if (!match) throw new Error('Terrain quality grid metadata is invalid.');
  return [Number(match[1]), Number(match[2])] as const;
}

function sameBounds(left: RegionTerrainAsset['bounds'], right: RegionTerrainAsset['bounds']) {
  return left.west === right.west && left.south === right.south && left.east === right.east && left.north === right.north;
}

function validateCompositionQuality(asset: RegionQualityTerrainAsset, expectedQuality: Exclude<RegionTerrainQualityId, 'A'>) {
  if (!sameBounds(asset.bounds, REGION_COMPOSITION_QUALITY[expectedQuality].bounds)) {
    throw new Error('Gate A.2 composition bounds do not match the selected regional composition.');
  }
  if (!asset.source.tiles || asset.source.tiles.length < 2) {
    throw new Error('Gate A.2 composition terrain must retain every required HGT tile provenance.');
  }
  for (const tile of asset.source.tiles) {
    if (!tile.id || !tile.sourceUrl || !/^[a-f0-9]{64}$/i.test(tile.sha256) || tile.nativeGrid !== '3601x3601') {
      throw new Error('Gate A.2 composition terrain contains incomplete HGT tile provenance.');
    }
  }
  if (!asset.derivation.method.includes('cross-tile')) {
    throw new Error('Gate A.2 composition terrain must document cross-tile sampling.');
  }
}

function validateQualityTerrain(asset: RegionQualityTerrainAsset, expectedQuality: Exclude<RegionTerrainQualityId, 'A'>, source: RegionTerrainQualitySource = 'benchmark') {
  const expectedSamples = asset.grid.width * asset.grid.height;
  const expectedGrid = parseGrid(source === 'composition' ? REGION_COMPOSITION_QUALITY[expectedQuality].grid : REGION_TERRAIN_QUALITY[expectedQuality].grid);
  if (asset.quality !== expectedQuality || asset.coordinateSystem !== 'EPSG:4326') {
    throw new Error(`Gate A.1 requires the isolated ${expectedQuality} EPSG:4326 terrain asset.`);
  }
  if (asset.grid.width !== expectedGrid[0] || asset.grid.height !== expectedGrid[1] || asset.heights.length !== expectedSamples) {
    throw new Error(`${expectedQuality} terrain grid is incomplete: expected ${expectedGrid[0]}×${expectedGrid[1]} samples.`);
  }
  if (asset.bounds.west >= asset.bounds.east || asset.bounds.south >= asset.bounds.north) {
    throw new Error(`${expectedQuality} terrain bounds are invalid.`);
  }
  if (!asset.derivation.method.includes('native') || !asset.derivation.method.includes('not an upsample of the 196x100')) {
    throw new Error(`${expectedQuality} terrain must document direct native-source sampling rather than a Gate A upsample.`);
  }
}

function validateCoastline(asset: RegionCoastlineAsset) {
  if (asset.type !== 'FeatureCollection' || asset.features.length === 0) {
    throw new Error('Regional coastline FeatureCollection is empty.');
  }
  if (asset.metadata.source.referenceEra !== 'modern_reference') {
    throw new Error('Gate A coastline must retain its modern-reference provenance.');
  }
}

export class HttpRegionDataProvider implements RegionDataProvider {
  private readonly root: string;
  private readonly qualityCache = new Map<string, RegionQualityTerrainAsset>();

  constructor(base = '') {
    this.root = base;
  }

  async load(): Promise<RegionDataset> {
    const assets = {
      terrain: withBase(this.root, 'terrain/kinmen-xiamen-regional.json'),
      terrainB: withBase(this.root, 'terrain/kinmen-xiamen-regional-quality-b.json'),
      terrainC: withBase(this.root, 'terrain/kinmen-xiamen-regional-quality-c.json'),
      compositionTerrainB: withBase(this.root, REGION_COMPOSITION_QUALITY.B.terrainAsset),
      compositionTerrainC: withBase(this.root, REGION_COMPOSITION_QUALITY.C.terrainAsset),
      coastline: withBase(this.root, 'map-data/regional-coastline.geojson'),
      compositionCoastline: withBase(this.root, REGION_COMPOSITION_QUALITY.B.coastlineAsset),
      compositionClassificationA: withBase(this.root, 'map-data/regional-composition-classification-a.png'),
      compositionClassificationB: withBase(this.root, 'map-data/regional-composition-classification-b.png'),
      classificationA: withBase(this.root, 'map-data/regional-classification-a.png'),
      classificationB: withBase(this.root, 'map-data/regional-classification-b.png'),
    };
    const [terrain, coastline, classification] = await Promise.all([
      getJson<RegionTerrainAsset>(assets.terrain),
      getJson<RegionCoastlineAsset>(assets.coastline),
      getJson<RegionClassificationManifest>(withBase(this.root, 'map-data/regional-classification.json')),
    ]);
    validateTerrain(terrain);
    validateCoastline(coastline);
    if (classification.coordinateSystem !== 'EPSG:4326' || classification.scope !== 'regional') {
      throw new Error('Regional classification manifest does not match Gate A.');
    }
    return { terrain, coastline, classification, assets };
  }

  async loadComposition(): Promise<RegionCompositionDataset> {
    const assets = regionAssetPaths(this.root);
    const coastline = await getJson<RegionCoastlineAsset>(assets.compositionCoastline);
    validateCoastline(coastline);
    return {
      coastline,
      coastlinePayloadBytes: COMPOSITION_COASTLINE_PAYLOAD_BYTES,
      assets: {
        terrainB: assets.compositionTerrainB,
        terrainC: assets.compositionTerrainC,
        coastline: assets.compositionCoastline,
        classificationA: assets.compositionClassificationA,
        classificationB: assets.compositionClassificationB,
      },
    };
  }

  async loadQuality(
    quality: Exclude<RegionTerrainQualityId, 'A'>,
    source: RegionTerrainQualitySource = 'benchmark',
  ): Promise<RegionQualityTerrainAsset> {
    const cacheKey = source + ':' + quality;
    const cached = this.qualityCache.get(cacheKey);
    if (cached) return cached;
    const assets = regionAssetPaths(this.root);
    const url = source === 'composition'
      ? quality === 'B' ? assets.compositionTerrainB : assets.compositionTerrainC
      : quality === 'B' ? assets.terrainB : assets.terrainC;
    const terrain = await getJson<RegionQualityTerrainAsset>(url);
    validateQualityTerrain(terrain, quality, source);
    if (source === 'composition') validateCompositionQuality(terrain, quality);
    this.qualityCache.set(cacheKey, terrain);
    return terrain;
  }
}

export function createRegionDataProvider(base = ''): RegionDataProvider {
  return new HttpRegionDataProvider(base);
}

export function regionAssetPaths(base = '') {
  return {
    terrain: withBase(base, 'terrain/kinmen-xiamen-regional.json'),
    terrainB: withBase(base, 'terrain/kinmen-xiamen-regional-quality-b.json'),
    terrainC: withBase(base, 'terrain/kinmen-xiamen-regional-quality-c.json'),
    compositionTerrainB: withBase(base, REGION_COMPOSITION_QUALITY.B.terrainAsset),
    compositionTerrainC: withBase(base, REGION_COMPOSITION_QUALITY.C.terrainAsset),
    coastline: withBase(base, 'map-data/regional-coastline.geojson'),
    compositionCoastline: withBase(base, REGION_COMPOSITION_QUALITY.B.coastlineAsset),
    compositionClassificationA: withBase(base, 'map-data/regional-composition-classification-a.png'),
    compositionClassificationB: withBase(base, 'map-data/regional-composition-classification-b.png'),
    classificationA: withBase(base, 'map-data/regional-classification-a.png'),
    classificationB: withBase(base, 'map-data/regional-classification-b.png'),
  };
}
