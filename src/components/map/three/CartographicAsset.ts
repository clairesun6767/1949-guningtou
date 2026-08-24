import type { Position } from '../../../battle-replay/types/index.js';

export type CartographicReferenceEra =
  | 'modern_reference'
  | 'historical_verified'
  | 'historical_approximate'
  | 'interpretive_cartography';

export interface CartographicFeature {
  type: 'Feature';
  properties: {
    id: string;
    layer: 'coastline' | 'land-cover' | 'roads' | 'settlements' | 'vegetation' | 'beaches';
    category: string;
    name?: string | null;
    referenceEra: CartographicReferenceEra;
    source: string;
    license: string;
  };
  geometry:
    | { type: 'Polygon'; coordinates: Position[][] }
    | { type: 'MultiPolygon'; coordinates: Position[][][] }
    | { type: 'LineString'; coordinates: Position[] }
    | { type: 'MultiLineString'; coordinates: Position[][] };
}

export interface CartographicAsset {
  type: 'FeatureCollection';
  metadata: {
    version: string;
    source: {
      name: string;
      url: string;
      license: string;
      acquired: string;
      referenceEra: CartographicReferenceEra;
    };
    bounds: [number, number, number, number];
    scale: string;
    simplificationToleranceDegrees: number;
    note: string;
  };
  features: CartographicFeature[];
}

export async function loadCartographicAsset(url: string): Promise<CartographicAsset> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cartographic asset failed: ${response.status} ${url}`);
  const asset = await response.json() as CartographicAsset;
  if (asset.type !== 'FeatureCollection' || !Array.isArray(asset.features) || asset.metadata?.source?.referenceEra !== 'modern_reference') {
    throw new Error(`Cartographic asset schema invalid: ${url}`);
  }
  return asset;
}

export function landPolygons(asset: CartographicAsset): Position[][] {
  return asset.features.flatMap(feature => {
    if (feature.properties.layer !== 'coastline') return [];
    if (feature.geometry.type === 'Polygon') return [feature.geometry.coordinates[0]];
    if (feature.geometry.type === 'MultiPolygon') return feature.geometry.coordinates.map(polygon => polygon[0]);
    return [];
  });
}
