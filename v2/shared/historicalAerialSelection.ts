import { REGION_COMPOSITION_BOUNDS, type GeographicBounds } from '../config/region.js';
import {
  historicalAerialBoundsContain,
  type HistoricalAerialDataset,
  type HistoricalAerialSourceType,
  type HistoricalAerialYear,
} from './historicalAerialDataset.js';
import { qualityFromManifest } from './historicalAerialQuality.js';

export type HistoricalAerialSelectionMode = 'smart' | 'single' | 'comparison' | 'distribution';
export type HistoricalAerialSourceYear = HistoricalAerialYear | 'BASE';

export interface HistoricalAerialSourceAt {
  dataset?: HistoricalAerialDataset;
  year: HistoricalAerialSourceYear;
  quality: number;
  fallback: boolean;
  coverage: boolean;
  sourceType: HistoricalAerialSourceType;
  reason: string;
}

export interface HistoricalAerialAvailability {
  year: HistoricalAerialYear;
  available: boolean;
  quality?: Partial<HistoricalAerialDataset['qualityMetadata']>;
}

export interface HistoricalAerialSelectionOptions {
  regionBounds?: GeographicBounds;
  mode?: HistoricalAerialSelectionMode;
  selectedYear?: HistoricalAerialYear;
  availability?: Partial<Record<HistoricalAerialYear, boolean>>;
  quality?: Partial<Record<HistoricalAerialYear, Partial<HistoricalAerialDataset['qualityMetadata']>>>;
  columns?: number;
  rows?: number;
  neighborPasses?: number;
  hysteresis?: number;
}

export interface HistoricalAerialSourceMaskCell {
  row: number;
  column: number;
  bounds: GeographicBounds;
  year: HistoricalAerialSourceYear;
  feather: number;
  quality: number;
}

export interface HistoricalAerialSourceMask {
  bounds: GeographicBounds;
  columns: number;
  rows: number;
  cells: HistoricalAerialSourceMaskCell[];
  mode: HistoricalAerialSelectionMode;
  getHistoricalAerialSourceAt(longitude: number, latitude: number): HistoricalAerialSourceAt;
  distribution(): Record<HistoricalAerialSourceYear, number>;
}

const PRIMARY_YEARS: HistoricalAerialYear[] = [1944, 1945];

function clamp01(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function unionBounds(datasets: HistoricalAerialDataset[], fallback: GeographicBounds) {
  if (!datasets.length) return fallback;
  return datasets.reduce((bounds, dataset) => ({
    west: Math.min(bounds.west, dataset.bounds.west),
    south: Math.min(bounds.south, dataset.bounds.south),
    east: Math.max(bounds.east, dataset.bounds.east),
    north: Math.max(bounds.north, dataset.bounds.north),
  }), { ...datasets[0].bounds });
}

function sourceQuality(dataset: HistoricalAerialDataset, quality: HistoricalAerialSelectionOptions['quality']) {
  return quality?.[dataset.year]?.normalizedScore ?? dataset.qualityMetadata.normalizedScore;
}

function isAvailable(dataset: HistoricalAerialDataset, options: HistoricalAerialSelectionOptions) {
  const explicit = options.availability?.[dataset.year];
  if (explicit !== undefined) return explicit;
  const quality = options.quality?.[dataset.year] ?? dataset.qualityMetadata;
  return (quality.validPixelRatio ?? 0) > 0.01 && (quality.alphaValidRatio ?? 0) > 0.01;
}

function baseSource(reason: string): HistoricalAerialSourceAt {
  return { year: 'BASE', quality: 0, fallback: true, coverage: false, sourceType: 'modern-dem', reason };
}

function pickSource(
  longitude: number,
  latitude: number,
  datasets: HistoricalAerialDataset[],
  options: HistoricalAerialSelectionOptions,
): HistoricalAerialSourceAt {
  const mode = options.mode ?? 'smart';
  const covered = datasets.filter(dataset => historicalAerialBoundsContain(dataset, longitude, latitude));
  if (mode === 'single') {
    const selected = covered.find(dataset => dataset.year === options.selectedYear && isAvailable(dataset, options));
    return selected
      ? { dataset: selected, year: selected.year, quality: sourceQuality(selected, options.quality), fallback: selected.year === 1958, coverage: true, sourceType: 'historical-aerial', reason: `single year ${selected.year}` }
      : baseSource(options.selectedYear ? `single year ${options.selectedYear} unavailable at point` : 'single year not selected');
  }
  const primary = covered
    .filter(dataset => PRIMARY_YEARS.includes(dataset.year) && isAvailable(dataset, options))
    .sort((left, right) => sourceQuality(right, options.quality) - sourceQuality(left, options.quality));
  if (primary[0]) {
    return { dataset: primary[0], year: primary[0].year, quality: sourceQuality(primary[0], options.quality), fallback: false, coverage: true, sourceType: 'historical-aerial', reason: 'highest measured primary quality' };
  }
  const fallback = covered.find(dataset => dataset.year === 1958 && isAvailable(dataset, options));
  return fallback
    ? { dataset: fallback, year: 1958, quality: sourceQuality(fallback, options.quality), fallback: true, coverage: true, sourceType: 'historical-aerial', reason: '1958 fallback: no valid primary pixel' }
    : baseSource(covered.length ? 'coverage exists but all pixels are invalid or unavailable' : 'outside historical aerial coverage');
}

function neighborYears(cells: HistoricalAerialSourceMaskCell[], row: number, column: number, rows: number, columns: number) {
  const result: HistoricalAerialSourceYear[] = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (rowOffset === 0 && columnOffset === 0) continue;
      const neighbor = cells.find(cell => cell.row === row + rowOffset && cell.column === column + columnOffset);
      if (neighbor && neighbor.row >= 0 && neighbor.row < rows && neighbor.column >= 0 && neighbor.column < columns) result.push(neighbor.year);
    }
  }
  return result;
}

function majorityYear(years: HistoricalAerialSourceYear[]) {
  const counts = new Map<HistoricalAerialSourceYear, number>();
  for (const year of years) counts.set(year, (counts.get(year) ?? 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
}

function cellAt(cells: HistoricalAerialSourceMaskCell[], row: number, column: number) {
  return cells.find(cell => cell.row === row && cell.column === column);
}

export function createHistoricalAerialSourceMask(datasets: HistoricalAerialDataset[], options: HistoricalAerialSelectionOptions = {}): HistoricalAerialSourceMask {
  const bounds = options.regionBounds ?? unionBounds(datasets, REGION_COMPOSITION_BOUNDS);
  const columns = Math.max(2, Math.floor(options.columns ?? 8));
  const rows = Math.max(2, Math.floor(options.rows ?? 6));
  const mode = options.mode ?? 'smart';
  const cells: HistoricalAerialSourceMaskCell[] = [];
  for (let row = 0; row < rows; row += 1) {
    const south = bounds.south + (row / rows) * (bounds.north - bounds.south);
    const north = bounds.south + ((row + 1) / rows) * (bounds.north - bounds.south);
    for (let column = 0; column < columns; column += 1) {
      const west = bounds.west + (column / columns) * (bounds.east - bounds.west);
      const east = bounds.west + ((column + 1) / columns) * (bounds.east - bounds.west);
      const center = { longitude: (west + east) / 2, latitude: (south + north) / 2 };
      const source = pickSource(center.longitude, center.latitude, datasets, options);
      cells.push({ row, column, bounds: { west, south, east, north }, year: source.year, feather: 0.06, quality: source.quality });
    }
  }
  const passes = Math.max(0, Math.floor(options.neighborPasses ?? 2));
  for (let pass = 0; pass < passes; pass += 1) {
    const nextYears = new Map<string, HistoricalAerialSourceYear>();
    for (const cell of cells) {
      const neighbors = neighborYears(cells, cell.row, cell.column, rows, columns);
      const majority = majorityYear(neighbors);
      if (majority && majority !== cell.year && neighbors.filter(year => year === majority).length >= 5) {
        nextYears.set(`${cell.row}:${cell.column}`, majority);
      }
    }
    for (const [key, year] of nextYears) {
      const [row, column] = key.split(':').map(Number);
      const cell = cellAt(cells, row, column);
      if (cell) cell.year = year;
    }
  }
  return {
    bounds,
    columns,
    rows,
    cells,
    mode,
    getHistoricalAerialSourceAt(longitude, latitude) {
      const column = Math.min(columns - 1, Math.max(0, Math.floor(((longitude - bounds.west) / (bounds.east - bounds.west)) * columns)));
      const row = Math.min(rows - 1, Math.max(0, Math.floor(((latitude - bounds.south) / (bounds.north - bounds.south)) * rows)));
      const cell = cellAt(cells, row, column);
      if (!cell || longitude < bounds.west || longitude > bounds.east || latitude < bounds.south || latitude > bounds.north) return baseSource('outside source mask bounds');
      const dataset = cell.year === 'BASE' ? undefined : datasets.find(item => item.year === cell.year);
      return dataset
        ? { dataset, year: dataset.year, quality: cell.quality, fallback: dataset.year === 1958, coverage: true, sourceType: 'historical-aerial', reason: mode === 'single' ? 'single year mask cell' : 'neighbor-smoothed geographic source mask cell' }
        : baseSource('modern DEM baseline cell');
    },
    distribution() {
      const counts: Record<HistoricalAerialSourceYear, number> = { 1944: 0, 1945: 0, 1958: 0, BASE: 0 };
      for (const cell of cells) counts[cell.year] += 1;
      const total = Math.max(1, cells.length);
      return { 1944: clamp01(counts[1944] / total) * 100, 1945: clamp01(counts[1945] / total) * 100, 1958: clamp01(counts[1958] / total) * 100, BASE: clamp01(counts.BASE / total) * 100 };
    },
  };
}

export function getHistoricalAerialSourceAt(
  longitude: number,
  latitude: number,
  datasets: HistoricalAerialDataset[],
  options: HistoricalAerialSelectionOptions = {},
) {
  return createHistoricalAerialSourceMask(datasets, { ...options, columns: 8, rows: 6 }).getHistoricalAerialSourceAt(longitude, latitude);
}

export function availabilityFromDatasetManifest(dataset: HistoricalAerialDataset, manifest: Partial<HistoricalAerialDataset['qualityMetadata']>): HistoricalAerialAvailability {
  const quality = qualityFromManifest(manifest);
  return { year: dataset.year, available: quality.validPixelRatio > 0.01 && quality.alphaValidRatio > 0.01, quality };
}
