import type { GeographicBounds } from '../config/region.js';

export type HistoricalAerialYear = 1944 | 1945 | 1958;
export type HistoricalAerialSourceType = 'historical-aerial' | 'modern-dem' | 'modern-coastline' | 'map-reference';
export type HistoricalAerialRightsStatus = 'BLOCKED — RIGHTS UNCLEAR' | 'LOCAL POC — NOT REDISTRIBUTABLE' | 'APPROVED';
export type HistoricalAerialUsageStatus = 'not-verified' | 'local-poc' | 'production-approved';
export type HistoricalAerialHistoricalRole = 'PRIMARY' | 'FALLBACK' | 'REFERENCE';
export type HistoricalAerialCoordinateOrder = 'XYZ' | 'TMS' | 'UNKNOWN';
export type DeclaredDatasetExtent = GeographicBounds;
export type ActualMosaicExtent = GeographicBounds;

export interface HistoricalAerialSourceReference {
  provider: string;
  collection: string;
  sourceUrl: string;
  sourcePageUrl: string;
  license: string;
  acquiredAt: string;
}

export interface HistoricalAerialQualityMetadata {
  normalizedScore: number;
  sharpness: number;
  contrast: number;
  entropy: number;
  alphaValidRatio: number;
  informationDensity: number;
  validPixelRatio: number;
  sampleCount: number;
  confidence: 'unmeasured' | 'measured-local-poc' | 'verified';
  measuredAt?: string;
}

export interface HistoricalAerialCoverageGeometry {
  type: 'Polygon';
  coordinates: Array<Array<[number, number]>>;
}

export interface HistoricalAerialDataset {
  id: string;
  name: string;
  year: HistoricalAerialYear;
  date: string;
  /** Declared KML LatLonBox. It is not the pixel/mosaic footprint. */
  bounds: DeclaredDatasetExtent;
  coverageGeometry: HistoricalAerialCoverageGeometry;
  tileTemplate: string;
  minLevel: number;
  maxLevel: number;
  tileSize: number;
  projection: string;
  source: HistoricalAerialSourceReference;
  attribution: string;
  rightsStatus: HistoricalAerialRightsStatus;
  usageStatus: HistoricalAerialUsageStatus;
  qualityMetadata: HistoricalAerialQualityMetadata;
  historicalRole: HistoricalAerialHistoricalRole;
  coordinateOrder: HistoricalAerialCoordinateOrder;
  sourceKmlPath?: string;
  iconHref?: string;
}

export interface HistoricalAerialKmlParserOptions {
  id?: string;
  year?: HistoricalAerialYear;
  date?: string;
  source?: Partial<HistoricalAerialSourceReference>;
  attribution?: string;
  rightsStatus?: HistoricalAerialRightsStatus;
  usageStatus?: HistoricalAerialUsageStatus;
  historicalRole?: HistoricalAerialHistoricalRole;
  coordinateOrder?: HistoricalAerialCoordinateOrder;
  sourceKmlPath?: string;
}

export class HistoricalAerialKmlParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HistoricalAerialKmlParserError';
  }
}

const DEFAULT_SOURCE: HistoricalAerialSourceReference = {
  provider: '中央研究院人社中心／地理資訊科學研究專題中心',
  collection: '金門百年歷史地圖 WMTS',
  sourceUrl: 'https://gis.sinica.edu.tw/kinmen/wmts',
  sourcePageUrl: 'https://gis.sinica.edu.tw/kinmen/',
  license: '官方服務權利與衍生使用條件尚待確認。',
  acquiredAt: new Date().toISOString().slice(0, 10),
};

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function tagValue(block: string, tag: string) {
  const expression = new RegExp(`<(?:(?:[\\w-]+):)?${tag}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[\\w-]+):)?${tag}>`, 'i');
  const match = block.match(expression);
  return match ? decodeXml(match[1].trim()) : undefined;
}

function numberTag(block: string, tag: string, fallback?: number) {
  const value = tagValue(block, tag);
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseYear(value: string, explicitYear?: HistoricalAerialYear): HistoricalAerialYear {
  if (explicitYear !== undefined) return explicitYear;
  const match = value.match(/(1944|1945|1958)/);
  if (!match) throw new HistoricalAerialKmlParserError(`KML name does not declare a supported year: ${value}`);
  return Number(match[1]) as HistoricalAerialYear;
}

function parseDate(name: string, year: HistoricalAerialYear, explicitDate?: string) {
  if (explicitDate) return explicitDate;
  const match = name.match(/(1944|1945|1958)[./-](\d{1,2})[./-](\d{1,2})/);
  if (!match) return String(year);
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
}

function normalizeTileTemplate(href: string) {
  const decoded = decodeXml(href).replace(/\s+/g, '');
  if (!decoded) throw new HistoricalAerialKmlParserError('KML MapTilePyramid Link has an empty href.');
  const hasZ = /\{\{?z\}\}?|\{TileMatrix\}/i.test(decoded);
  const hasX = /\{\{?x\}\}?|\{TileCol\}/i.test(decoded);
  const hasY = /\{\{?y\}\}?|\{TileRow\}/i.test(decoded);
  if (!hasZ || !hasX || !hasY) throw new HistoricalAerialKmlParserError(`KML tile href is missing z/x/y placeholders: ${decoded}`);
  return decoded
    .replace(/\{\{?z\}\}?/gi, '{{z}}')
    .replace(/\{\{?x\}\}?/gi, '{{x}}')
    .replace(/\{\{?y\}\}?/gi, '{{y}}')
    .replace(/\{TileMatrix\}/gi, '{{z}}')
    .replace(/\{TileCol\}/gi, '{{x}}')
    .replace(/\{TileRow\}/gi, '{{y}}');
}

function coverageFromBounds(bounds: GeographicBounds): HistoricalAerialCoverageGeometry {
  return {
    type: 'Polygon',
    coordinates: [[
      [bounds.west, bounds.north],
      [bounds.east, bounds.north],
      [bounds.east, bounds.south],
      [bounds.west, bounds.south],
      [bounds.west, bounds.north],
    ]],
  };
}

function idForYear(year: HistoricalAerialYear) {
  return `KINMEN_${year}`;
}

function sourcePageForYear(year: HistoricalAerialYear) {
  const layer = year === 1958 ? 'Kinmen_aerialphoto_1958' : `Kinmen_${year}`;
  return `https://gis.sinica.edu.tw/showwmts/index.php?s=kinmen&l=${layer}`;
}

export class HistoricalAerialKmlParser {
  static parse(text: string, options: HistoricalAerialKmlParserOptions = {}): HistoricalAerialDataset {
    if (!text.trim()) throw new HistoricalAerialKmlParserError('KML is empty.');
    const overlayBlocks = [...text.matchAll(/<GroundOverlay\b[^>]*>([\s\S]*?)<\/GroundOverlay>/gi)].map(match => match[1]);
    const overlay = overlayBlocks.find(block => /<MapTilePyramid\b|<gx:MapTilePyramid\b/i.test(block));
    if (!overlay) throw new HistoricalAerialKmlParserError('KML FILE NOT FOUND OR NO MAP TILE PYRAMID');
    const name = tagValue(overlay, 'name') ?? tagValue(text, 'name');
    if (!name) throw new HistoricalAerialKmlParserError('KML GroundOverlay has no name.');
    const year = parseYear(name, options.year);
    const box = tagValue(overlay, 'LatLonBox');
    if (!box) throw new HistoricalAerialKmlParserError(`KML ${name} has no LatLonBox.`);
    const north = numberTag(box, 'north');
    const south = numberTag(box, 'south');
    const east = numberTag(box, 'east');
    const west = numberTag(box, 'west');
    if ([north, south, east, west].some(value => value === undefined) || west! >= east! || south! >= north!) {
      throw new HistoricalAerialKmlParserError(`KML ${name} has invalid LatLonBox bounds.`);
    }
    const pyramid = overlay.match(/<(?:(?:[\w-]+):)?MapTilePyramid\b[^>]*>([\s\S]*?)<\/(?:(?:[\w-]+):)?MapTilePyramid>/i)?.[1] ?? '';
    const href = tagValue(pyramid, 'href');
    if (!href) throw new HistoricalAerialKmlParserError(`KML ${name} has no MapTilePyramid Link href.`);
    const minLevel = numberTag(pyramid, 'minLevel', 0) ?? 0;
    const maxLevel = numberTag(pyramid, 'maxLevel', 19) ?? 19;
    const tileSize = numberTag(pyramid, 'tileSize', 256) ?? 256;
    const iconHref = tagValue(overlay, 'href');
    const bounds: GeographicBounds = { west: west!, south: south!, east: east!, north: north! };
    const mergedSource = { ...DEFAULT_SOURCE, ...options.source, sourcePageUrl: options.source?.sourcePageUrl ?? sourcePageForYear(year) };
    return {
      id: options.id ?? idForYear(year),
      name,
      year,
      date: parseDate(name, year, options.date),
      bounds,
      coverageGeometry: coverageFromBounds(bounds),
      tileTemplate: normalizeTileTemplate(href),
      minLevel: Math.max(0, Math.floor(minLevel)),
      maxLevel: Math.max(Math.floor(minLevel), Math.floor(maxLevel)),
      tileSize: Math.max(1, Math.floor(tileSize)),
      projection: 'EPSG:3857 / GoogleMapsCompatible',
      source: mergedSource,
      attribution: options.attribution ?? `${mergedSource.provider}／${mergedSource.collection}`,
      rightsStatus: options.rightsStatus ?? 'BLOCKED — RIGHTS UNCLEAR',
      usageStatus: options.usageStatus ?? 'not-verified',
      qualityMetadata: {
        normalizedScore: 0,
        sharpness: 0,
        contrast: 0,
        entropy: 0,
        alphaValidRatio: 0,
        informationDensity: 0,
        validPixelRatio: 0,
        sampleCount: 0,
        confidence: 'unmeasured',
      },
      historicalRole: options.historicalRole ?? (year === 1958 ? 'FALLBACK' : 'PRIMARY'),
      coordinateOrder: options.coordinateOrder ?? 'UNKNOWN',
      sourceKmlPath: options.sourceKmlPath,
      iconHref,
    };
  }
}

export function datasetIdForYear(year: HistoricalAerialYear) {
  return idForYear(year);
}

export function isHistoricalAerialYear(value: number): value is HistoricalAerialYear {
  return value === 1944 || value === 1945 || value === 1958;
}

export function historicalAerialBoundsContain(dataset: HistoricalAerialDataset, longitude: number, latitude: number) {
  return longitude >= dataset.bounds.west
    && longitude <= dataset.bounds.east
    && latitude >= dataset.bounds.south
    && latitude <= dataset.bounds.north;
}

export function historicalAerialBoundsOverlap(left: GeographicBounds, right: GeographicBounds) {
  return left.west <= right.east
    && left.east >= right.west
    && left.south <= right.north
    && left.north >= right.south;
}
