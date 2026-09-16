import type { GeographicBounds } from '../config/region.js';
import type { HistoricalAerialCoordinateOrder, HistoricalAerialDataset } from './historicalAerialDataset.js';
import {
  tileRangeToBounds,
} from './historicalAerialGeoreference.js';

export {
  geographicBoundsEqual,
  geographicToAerialUV,
  outsideBoundsReturnsBase,
  smartCompositeUsesCommonGeographicGrid,
  tileRangeToBounds,
  tileXYZToLonLat,
} from './historicalAerialGeoreference.js';
export type { HistoricalAerialMosaicGrid, HistoricalAerialTileRange } from './historicalAerialGeoreference.js';

export interface HistoricalAerialTileCoordinate {
  z: number;
  x: number;
  y: number;
  xyzY: number;
}

export interface HistoricalAerialTileBounds extends GeographicBounds {
  z: number;
  x: number;
  y: number;
}

export const HISTORICAL_AERIAL_DOWNLOAD_BUDGET = {
  maxTilesTotal: 128,
  maxBytesTotal: 50 * 1024 * 1024,
  maxTilesPerDataset: 64,
  maxConcurrency: 1,
  delayMs: 250,
  preferredZoom: 12,
} as const;

function clampLatitude(latitude: number) {
  return Math.max(-85.05112878, Math.min(85.05112878, latitude));
}

export function lonLatToXyzTile(longitude: number, latitude: number, z: number): HistoricalAerialTileCoordinate {
  const zoom = Math.max(0, Math.floor(z));
  const scale = 2 ** zoom;
  const safeLatitude = clampLatitude(latitude);
  const x = Math.floor(((longitude + 180) / 360) * scale);
  const radians = (safeLatitude * Math.PI) / 180;
  const y = Math.floor(((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * scale);
  return {
    z: zoom,
    x: Math.max(0, Math.min(scale - 1, x)),
    y: Math.max(0, Math.min(scale - 1, y)),
    xyzY: Math.max(0, Math.min(scale - 1, y)),
  };
}

export function tileYForOrder(xyzY: number, z: number, order: HistoricalAerialCoordinateOrder) {
  const scale = 2 ** Math.max(0, Math.floor(z));
  return order === 'TMS' ? scale - 1 - xyzY : xyzY;
}

export function tileBounds(tile: Pick<HistoricalAerialTileCoordinate, 'z' | 'x' | 'y'>, order: HistoricalAerialCoordinateOrder = 'XYZ'): HistoricalAerialTileBounds {
  const scale = 2 ** tile.z;
  const xyzY = order === 'TMS' ? scale - 1 - tile.y : tile.y;
  const bounds = tileRangeToBounds({ z: tile.z, minX: tile.x, maxX: tile.x, minY: xyzY, maxY: xyzY });
  return { z: tile.z, x: tile.x, y: tile.y, ...bounds };
}

export function enumerateHistoricalAerialTiles(bounds: GeographicBounds, z: number, order: HistoricalAerialCoordinateOrder = 'XYZ') {
  const northwest = lonLatToXyzTile(bounds.west, bounds.north, z);
  const southeast = lonLatToXyzTile(bounds.east, bounds.south, z);
  const tiles: HistoricalAerialTileCoordinate[] = [];
  for (let x = northwest.x; x <= southeast.x; x += 1) {
    for (let xyzY = northwest.xyzY; xyzY <= southeast.xyzY; xyzY += 1) {
      tiles.push({ z: northwest.z, x, xyzY, y: tileYForOrder(xyzY, northwest.z, order) });
    }
  }
  return tiles;
}

/**
 * Enumerate an already-resolved XYZ tile range without re-running geographic
 * floor() at the east/south edge. This is used by small local review grids
 * whose bounds are deliberately the exact union of the requested tiles.
 */
export function enumerateHistoricalAerialTileRange(
  range: { z: number; minX: number; maxX: number; minY: number; maxY: number },
  order: HistoricalAerialCoordinateOrder = 'XYZ',
) {
  const tiles: HistoricalAerialTileCoordinate[] = [];
  for (let x = range.minX; x <= range.maxX; x += 1) {
    for (let xyzY = range.minY; xyzY <= range.maxY; xyzY += 1) {
      tiles.push({ z: range.z, x, xyzY, y: tileYForOrder(xyzY, range.z, order) });
    }
  }
  return tiles;
}

/**
 * Resolve a compact, deterministic tile window around a geographic point.
 * An even-sized window keeps the point in the south/east half so the target
 * remains inside the returned footprint while the request stays bounded.
 */
export function tileRangeAroundLonLat(
  longitude: number,
  latitude: number,
  z: number,
  columns = 2,
  rows = 2,
) {
  const center = lonLatToXyzTile(longitude, latitude, z);
  const width = Math.max(1, Math.floor(columns));
  const height = Math.max(1, Math.floor(rows));
  const scale = 2 ** center.z;
  const minX = Math.max(0, Math.min(scale - width, center.x - Math.floor(width / 2)));
  const minY = Math.max(0, Math.min(scale - height, center.y - Math.floor(height / 2)));
  return {
    z: center.z,
    minX,
    maxX: Math.min(scale - 1, minX + width - 1),
    minY,
    maxY: Math.min(scale - 1, minY + height - 1),
  };
}

export function expandHistoricalAerialTileTemplate(template: string, tile: HistoricalAerialTileCoordinate) {
  return template
    .replace(/\{\{z\}\}/g, String(tile.z))
    .replace(/\{\{x\}\}/g, String(tile.x))
    .replace(/\{\{y\}\}/g, String(tile.y));
}

export function tileTemplateHasCoordinatePlaceholders(template: string) {
  return ['{{z}}', '{{x}}', '{{y}}'].every(value => template.includes(value));
}

export function validateHistoricalAerialTileRequest(dataset: HistoricalAerialDataset, tile: HistoricalAerialTileCoordinate) {
  const scale = 2 ** tile.z;
  return tile.z >= dataset.minLevel
    && tile.z <= dataset.maxLevel
    && tile.x >= 0
    && tile.x < scale
    && tile.y >= 0
    && tile.y < scale
    && tileTemplateHasCoordinatePlaceholders(dataset.tileTemplate);
}

export function isLikelyPlaceholderTile(bytes: Uint8Array | ArrayBuffer, contentType = '') {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const type = contentType.toLowerCase();
  if (type.includes('gif') && data.length <= 256) return true;
  if (data.length <= 128) return true;
  const isGif1x1 = data.length >= 10 && data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[6] === 1 && data[7] === 0 && data[8] === 1 && data[9] === 0;
  return isGif1x1;
}

export function estimateTileBudget(datasets: HistoricalAerialDataset[], bounds: GeographicBounds, z = HISTORICAL_AERIAL_DOWNLOAD_BUDGET.preferredZoom) {
  const perDataset = datasets.map(dataset => ({
    id: dataset.id,
    year: dataset.year,
    tiles: enumerateHistoricalAerialTiles(bounds, z, dataset.coordinateOrder === 'UNKNOWN' ? 'XYZ' : dataset.coordinateOrder).filter(tile => validateHistoricalAerialTileRequest(dataset, tile)),
  }));
  return {
    perDataset,
    totalTiles: perDataset.reduce((sum, item) => sum + item.tiles.length, 0),
    withinBudget: perDataset.every(item => item.tiles.length <= HISTORICAL_AERIAL_DOWNLOAD_BUDGET.maxTilesPerDataset)
      && perDataset.reduce((sum, item) => sum + item.tiles.length, 0) <= HISTORICAL_AERIAL_DOWNLOAD_BUDGET.maxTilesTotal,
  };
}
