import { REGION_CONFIG, type GeographicBounds, type GeographicPoint } from '../config/region.js';

const METRES_PER_DEGREE_LATITUDE = 110_540;
const METRES_PER_DEGREE_LONGITUDE = 111_320;

export interface RegionWorldPoint {
  x: number;
  y: number;
  z: number;
}

export function lonLatToWorld(point: GeographicPoint, y = 0): RegionWorldPoint {
  const origin = REGION_CONFIG.referenceOrigin;
  const latitudeScale = Math.cos((origin.latitude * Math.PI) / 180);
  return {
    x: (point.longitude - origin.longitude) * METRES_PER_DEGREE_LONGITUDE * latitudeScale * REGION_CONFIG.worldUnitsPerMetre,
    y,
    z: -(point.latitude - origin.latitude) * METRES_PER_DEGREE_LATITUDE * REGION_CONFIG.worldUnitsPerMetre,
  };
}

export function worldToLonLat(point: Pick<RegionWorldPoint, 'x' | 'z'>): GeographicPoint {
  const origin = REGION_CONFIG.referenceOrigin;
  const latitudeScale = Math.cos((origin.latitude * Math.PI) / 180);
  return {
    longitude: origin.longitude + point.x / (METRES_PER_DEGREE_LONGITUDE * latitudeScale * REGION_CONFIG.worldUnitsPerMetre),
    latitude: origin.latitude - point.z / (METRES_PER_DEGREE_LATITUDE * REGION_CONFIG.worldUnitsPerMetre),
  };
}

export function geographicBoundsToWorld(bounds: GeographicBounds) {
  const southwest = lonLatToWorld({ longitude: bounds.west, latitude: bounds.south });
  const northeast = lonLatToWorld({ longitude: bounds.east, latitude: bounds.north });
  return {
    minX: Math.min(southwest.x, northeast.x),
    maxX: Math.max(southwest.x, northeast.x),
    minZ: Math.min(southwest.z, northeast.z),
    maxZ: Math.max(southwest.z, northeast.z),
  };
}

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function clampGeographicPoint(point: GeographicPoint, bounds: GeographicBounds): GeographicPoint {
  return {
    longitude: clamp(point.longitude, bounds.west, bounds.east),
    latitude: clamp(point.latitude, bounds.south, bounds.north),
  };
}
