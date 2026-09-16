import type { GeographicBounds, GeographicPoint } from '../config/region.js';

export interface HistoricalAerialTileRange {
  z: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface HistoricalAerialUV {
  u: number;
  v: number;
  inBounds: boolean;
}

export interface HistoricalAerialMosaicGrid {
  tileRange: HistoricalAerialTileRange;
  bounds: GeographicBounds;
  width: number;
  height: number;
  tileSize: number;
}

const WEB_MERCATOR_LIMIT = 85.0511287798066;
const BOUNDS_EPSILON = 1e-10;

function webMercatorLatitude(y: number, z: number) {
  const scale = 2 ** Math.max(0, Math.floor(z));
  const normalized = 1 - (2 * y) / scale;
  return (Math.atan(Math.sinh(Math.PI * normalized)) * 180) / Math.PI;
}

export function tileXYZToLonLat(x: number, y: number, z: number): GeographicPoint {
  const zoom = Math.max(0, Math.floor(z));
  const scale = 2 ** zoom;
  return {
    longitude: (x / scale) * 360 - 180,
    latitude: Math.max(-WEB_MERCATOR_LIMIT, Math.min(WEB_MERCATOR_LIMIT, webMercatorLatitude(y, zoom))),
  };
}

export function tileRangeToBounds(range: HistoricalAerialTileRange): GeographicBounds {
  const northWest = tileXYZToLonLat(range.minX, range.minY, range.z);
  const southEast = tileXYZToLonLat(range.maxX + 1, range.maxY + 1, range.z);
  return {
    west: northWest.longitude,
    south: southEast.latitude,
    east: southEast.longitude,
    north: northWest.latitude,
  };
}

export function geographicBoundsEqual(left: GeographicBounds, right: GeographicBounds, epsilon = BOUNDS_EPSILON) {
  return Math.abs(left.west - right.west) <= epsilon
    && Math.abs(left.south - right.south) <= epsilon
    && Math.abs(left.east - right.east) <= epsilon
    && Math.abs(left.north - right.north) <= epsilon;
}

/**
 * Convert a terrain lon/lat to the top-down pixel convention used by an XYZ
 * mosaic whose first row is the northern edge. With Texture.flipY=false,
 * WebGL v=0 addresses that first image row, so north deliberately maps to v=0.
 */
export function geographicToAerialUV(point: GeographicPoint, bounds: GeographicBounds): HistoricalAerialUV {
  const longitudeSpan = bounds.east - bounds.west;
  const latitudeSpan = bounds.north - bounds.south;
  if (!(longitudeSpan > 0) || !(latitudeSpan > 0)) return { u: 0, v: 0, inBounds: false };
  const u = (point.longitude - bounds.west) / longitudeSpan;
  const v = (bounds.north - point.latitude) / latitudeSpan;
  return {
    u,
    v,
    inBounds: u >= 0 && u <= 1 && v >= 0 && v <= 1,
  };
}

export function outsideBoundsReturnsBase(point: GeographicPoint, bounds: GeographicBounds) {
  return !geographicToAerialUV(point, bounds).inBounds;
}

/**
 * A smart composite can use a common geographic tile grid when every source
 * mosaic is internally consistent and shares zoom/tile size. Different
 * footprints are valid: the caller unions their tile ranges on this grid.
 */
export function smartCompositeUsesCommonGeographicGrid(mosaics: readonly HistoricalAerialMosaicGrid[]) {
  if (!mosaics.length) return false;
  const first = mosaics[0];
  return mosaics.every(mosaic => {
    const expectedWidth = (mosaic.tileRange.maxX - mosaic.tileRange.minX + 1) * mosaic.tileSize;
    const expectedHeight = (mosaic.tileRange.maxY - mosaic.tileRange.minY + 1) * mosaic.tileSize;
    return mosaic.tileRange.z === first.tileRange.z
      && mosaic.tileSize === first.tileSize
      && mosaic.width === expectedWidth
      && mosaic.height === expectedHeight
      && geographicBoundsEqual(mosaic.bounds, tileRangeToBounds(mosaic.tileRange));
  });
}
