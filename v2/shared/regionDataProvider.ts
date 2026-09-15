export interface RegionTerrainAsset {
  schemaVersion: string;
  id: string;
  coordinateSystem: 'EPSG:4326';
  bounds: { west: number; south: number; east: number; north: number };
  grid: { width: number; height: number };
  elevationUnit: 'metre';
  source: {
    id: string;
    title: string;
    sourceUrl: string;
    registryUrl: string;
    attribution: string;
    acquiredAt: string;
    nativeGrid: string;
    approximateNativeResolutionMetres: number;
    temporalScope: string;
  };
  derivation: {
    method: string;
    minElevationMetres: number;
    maxElevationMetres: number;
    visualVerticalExaggerationAppliedAtRuntime: boolean;
    runtimeLandMask: string;
  };
  heights: number[];
  land: number[];
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
    coastline: string;
    classificationA: string;
    classificationB: string;
  };
}

export interface RegionDataProvider {
  load(): Promise<RegionDataset>;
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

  constructor(base = '') {
    this.root = base;
  }

  async load(): Promise<RegionDataset> {
    const assets = {
      terrain: withBase(this.root, 'terrain/kinmen-xiamen-regional.json'),
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
}

export function createRegionDataProvider(base = ''): RegionDataProvider {
  return new HttpRegionDataProvider(base);
}

export function regionAssetPaths(base = '') {
  return {
    terrain: withBase(base, 'terrain/kinmen-xiamen-regional.json'),
    coastline: withBase(base, 'map-data/regional-coastline.geojson'),
    classificationA: withBase(base, 'map-data/regional-classification-a.png'),
    classificationB: withBase(base, 'map-data/regional-classification-b.png'),
  };
}
