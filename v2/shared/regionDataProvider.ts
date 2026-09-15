import type { RegionTerrainQualityId } from '../config/region.js';

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
  scope: 'regional';
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
    coastline: string;
    classificationA: string;
    classificationB: string;
  };
}

export interface RegionDataProvider {
  load(): Promise<RegionDataset>;
  loadQuality(quality: Exclude<RegionTerrainQualityId, 'A'>): Promise<RegionQualityTerrainAsset>;
}

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

function validateQualityTerrain(asset: RegionQualityTerrainAsset, expectedQuality: Exclude<RegionTerrainQualityId, 'A'>) {
  const expectedSamples = asset.grid.width * asset.grid.height;
  const expectedGrid = expectedQuality === 'B' ? [512, 256] : [1024, 512];
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
  private readonly qualityCache = new Map<Exclude<RegionTerrainQualityId, 'A'>, RegionQualityTerrainAsset>();

  constructor(base = '') {
    this.root = base;
  }

  async load(): Promise<RegionDataset> {
    const assets = {
      terrain: withBase(this.root, 'terrain/kinmen-xiamen-regional.json'),
      terrainB: withBase(this.root, 'terrain/kinmen-xiamen-regional-quality-b.json'),
      terrainC: withBase(this.root, 'terrain/kinmen-xiamen-regional-quality-c.json'),
      coastline: withBase(this.root, 'map-data/regional-coastline.geojson'),
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

  async loadQuality(quality: Exclude<RegionTerrainQualityId, 'A'>): Promise<RegionQualityTerrainAsset> {
    const cached = this.qualityCache.get(quality);
    if (cached) return cached;
    const assets = regionAssetPaths(this.root);
    const url = quality === 'B' ? assets.terrainB : assets.terrainC;
    const terrain = await getJson<RegionQualityTerrainAsset>(url);
    validateQualityTerrain(terrain, quality);
    this.qualityCache.set(quality, terrain);
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
    coastline: withBase(base, 'map-data/regional-coastline.geojson'),
    classificationA: withBase(base, 'map-data/regional-classification-a.png'),
    classificationB: withBase(base, 'map-data/regional-classification-b.png'),
  };
}
