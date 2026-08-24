import type { GeoJsonFeatureCollection, GeoJsonGeometry } from '../types/index.js';

export function serializeFeatureCollection<G extends GeoJsonGeometry | null, P>(
  collection: GeoJsonFeatureCollection<G, P>,
): string {
  return `${JSON.stringify(collection, null, 2)}\n`;
}

export function parseFeatureCollection<G extends GeoJsonGeometry | null, P>(
  serialized: string,
): GeoJsonFeatureCollection<G, P> {
  const parsed: unknown = JSON.parse(serialized);
  if (
    typeof parsed !== 'object'
    || parsed === null
    || (parsed as { type?: unknown }).type !== 'FeatureCollection'
    || !Array.isArray((parsed as { features?: unknown }).features)
  ) {
    throw new Error('GeoJSON root must be a FeatureCollection with a features array.');
  }
  return parsed as GeoJsonFeatureCollection<G, P>;
}
