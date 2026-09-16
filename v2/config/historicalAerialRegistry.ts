import {
  HistoricalAerialKmlParser,
  datasetIdForYear,
  type HistoricalAerialDataset,
  type HistoricalAerialYear,
} from '../shared/historicalAerialDataset.js';
import { tileRangeAroundLonLat } from '../shared/historicalAerialTiles.js';
import { tileRangeToBounds, type HistoricalAerialTileRange } from '../shared/historicalAerialGeoreference.js';
import {
  REGION_CONFIG,
  type GeographicBounds,
} from './region.js';

export type { HistoricalAerialYear } from '../shared/historicalAerialDataset.js';

/**
 * Metadata-only KML mirrors. They contain no raster pixels; the local POC
 * validator re-parses the user-supplied KML files before any tile request.
 */
const KML_METADATA_MIRRORS: Record<HistoricalAerialYear, string> = {
  1944: `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><Document><GroundOverlay><name>金門舊航照影像(1944)</name><Icon><href>data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEaaa==</href></Icon><LatLonBox><north>24.5208965</north><south>24.3932995</south><east>118.4750534</east><west>118.1987492</west></LatLonBox><gx:MapTilePyramid><Link><href>https://gis.sinica.edu.tw/kinmen/file-exists.php?img=Kinmen_1944-png-{{z}}-{{x}}-{{y}}</href></Link><gx:minLevel>0</gx:minLevel><gx:maxLevel>19</gx:maxLevel></gx:MapTilePyramid></GroundOverlay></Document></kml>`,
  1945: `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><Document><GroundOverlay><name>金門舊航照影像(1945)</name><Icon><href>data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEaaa==</href></Icon><LatLonBox><north>24.5362935</north><south>24.3437997</south><east>118.4966956</east><west>118.2727648</west></LatLonBox><gx:MapTilePyramid><Link><href>https://gis.sinica.edu.tw/kinmen/file-exists.php?img=Kinmen_1945-png-{{z}}-{{x}}-{{y}}</href></Link><gx:minLevel>0</gx:minLevel><gx:maxLevel>19</gx:maxLevel></gx:MapTilePyramid></GroundOverlay></Document></kml>`,
  1958: `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><Document><GroundOverlay><name>金門舊航照圖(1958.09.10)</name><Icon><href>data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEaaa==</href></Icon><LatLonBox><north>24.5542212</north><south>24.3789698</south><east>118.4924002</east><west>118.1973476</west></LatLonBox><gx:MapTilePyramid><Link><href>https://gis.sinica.edu.tw/kinmen/file-exists.php?img=Kinmen_aerialphoto_1958-png-{{z}}-{{x}}-{{y}}</href></Link><gx:minLevel>0</gx:minLevel><gx:maxLevel>19</gx:maxLevel></gx:MapTilePyramid></GroundOverlay></Document></kml>`,
};

const SOURCE_PAGES: Record<HistoricalAerialYear, string> = {
  1944: 'https://gis.sinica.edu.tw/showwmts/index.php?s=kinmen&l=Kinmen_1944',
  1945: 'https://gis.sinica.edu.tw/showwmts/index.php?s=kinmen&l=Kinmen_1945',
  1958: 'https://gis.sinica.edu.tw/showwmts/index.php?s=kinmen&l=Kinmen_aerialphoto_1958',
};

export const HISTORICAL_AERIAL_KML_PATHS: Record<HistoricalAerialYear, string> = {
  1944: 'public/research/kinmen-kml/kinmen-1944.kml',
  1945: 'public/research/kinmen-kml/kinmen-1945.kml',
  1958: 'public/research/kinmen-kml/kinmen-1958.kml',
};

function createDataset(year: HistoricalAerialYear): HistoricalAerialDataset {
  return HistoricalAerialKmlParser.parse(KML_METADATA_MIRRORS[year], {
    id: datasetIdForYear(year),
    source: {
      sourcePageUrl: SOURCE_PAGES[year],
      acquiredAt: '2026-09-15',
    },
    attribution: '中央研究院人社中心／地理資訊科學研究專題中心（官方服務；本機 POC 不代表再散布授權）',
    rightsStatus: 'BLOCKED — RIGHTS UNCLEAR',
    usageStatus: 'not-verified',
    historicalRole: year === 1958 ? 'FALLBACK' : 'PRIMARY',
    coordinateOrder: 'UNKNOWN',
    sourceKmlPath: HISTORICAL_AERIAL_KML_PATHS[year],
  });
}

export const HISTORICAL_AERIAL_DATASETS: readonly HistoricalAerialDataset[] = [
  createDataset(1944),
  createDataset(1945),
  createDataset(1958),
];

export const HISTORICAL_AERIAL_DATASET_REGISTRY = new Map(
  HISTORICAL_AERIAL_DATASETS.map(dataset => [dataset.id, dataset]),
);

export const HISTORICAL_AERIAL_YEARS: readonly HistoricalAerialYear[] = [1944, 1945, 1958];

/**
 * Authoritative local Gate A.3P POC request footprint. The tile range is
 * derived from this geographic request at runtime; it is not a visual offset.
 * The east edge intentionally includes one additional z12 tile column so a
 * Guningtou higher-zoom review keeps a same-year context across the eastern
 * Kinmen peninsula instead of revealing the modern DEM fallback mid-island.
 */
export const HISTORICAL_AERIAL_POC_REQUEST = {
  areaBounds: {
    west: 118.278,
    south: 24.438,
    east: 118.475,
    north: 24.52,
  } satisfies GeographicBounds,
  zoom: 12,
  coordinateOrder: 'XYZ' as const,
};

/**
 * Gate A.3P.2b is intentionally a separate, compact review request. It uses
 * the existing Guningtou preset target so the higher-zoom grid is tied to
 * current geographic data, not a hand-moved visual anchor.
 */
export const GUNINGTOU_GEO_REVIEW_CAMERA = 'GEO_REVIEW_GUNINGTOU_01' as const;
export const GUNINGTOU_GEOREFERENCE_TARGET = REGION_CONFIG.presets.guningtou.target;
export const GUNINGTOU_HIGHER_ZOOMS = [15, 16, 17] as const;
export type GuningtouHigherZoom = typeof GUNINGTOU_HIGHER_ZOOMS[number];

export function guningtouHigherZoomTileRange(zoom: GuningtouHigherZoom): HistoricalAerialTileRange {
  return tileRangeAroundLonLat(
    GUNINGTOU_GEOREFERENCE_TARGET.longitude,
    GUNINGTOU_GEOREFERENCE_TARGET.latitude,
    zoom,
    2,
    2,
  );
}

export function guningtouHigherZoomBounds(zoom: GuningtouHigherZoom) {
  return tileRangeToBounds(guningtouHigherZoomTileRange(zoom));
}

/**
 * Review landmarks are existing modern/reference candidates, not historical
 * GCPs. Their precision is kept explicit so the screen can show the right
 * places without implying that the aerial source is orthorectified.
 */
export const GUNINGTOU_GEO_REVIEW_LANDMARKS = [
  {
    id: 'guningtou',
    label: '古寧頭',
    englishLabel: 'GUNINGTOU',
    longitude: GUNINGTOU_GEOREFERENCE_TARGET.longitude,
    latitude: GUNINGTOU_GEOREFERENCE_TARGET.latitude,
    provenance: 'REGION_CONFIG.presets.guningtou',
    coordinateStatus: 'modern review target',
  },
  {
    id: 'beishan',
    label: '北山',
    englishLabel: 'BEISHAN',
    longitude: 118.31120658183592,
    latitude: 24.47935230569504,
    provenance: 'data/battles/guningtou-1949/locations.geojson · LOC-GUN-0006',
    coordinateStatus: 'probable modern reference',
  },
  {
    id: 'nanshan',
    label: '南山',
    englishLabel: 'NANSHAN',
    longitude: 118.30743595990603,
    latitude: 24.47855303214236,
    provenance: 'data/battles/guningtou-1949/locations.geojson · LOC-GUN-0005',
    coordinateStatus: 'probable modern reference',
  },
  {
    id: 'lincuo',
    label: '林厝',
    englishLabel: 'LINCUO',
    longitude: 118.313,
    latitude: 24.475,
    provenance: 'data/poi.json · POI-0007',
    coordinateStatus: 'partial / approximate source POI',
  },
  {
    id: 'north-coast',
    label: '北側海岸',
    englishLabel: 'NORTH COAST',
    longitude: 118.31186,
    latitude: 24.4901,
    provenance: 'public/map-data/guningtou-coastline.geojson · modern mean-high-water coastline',
    coordinateStatus: 'modern coastline reference',
  },
] as const;

export const HISTORICAL_AERIAL_SOURCE_REGISTRY = HISTORICAL_AERIAL_DATASETS.map(dataset => ({
  id: dataset.id,
  year: dataset.year,
  name: dataset.name,
  sourceKmlPath: dataset.sourceKmlPath,
  sourcePageUrl: dataset.source.sourcePageUrl,
  rightsStatus: dataset.rightsStatus,
  historicalRole: dataset.historicalRole,
  bounds: { ...dataset.bounds },
}));

export function listHistoricalAerialDatasets() {
  return HISTORICAL_AERIAL_DATASETS.map(dataset => ({ ...dataset, bounds: { ...dataset.bounds } }));
}

export function getHistoricalAerialDataset(idOrYear: string | number) {
  const id = typeof idOrYear === 'number' ? datasetIdForYear(idOrYear as HistoricalAerialYear) : idOrYear;
  return HISTORICAL_AERIAL_DATASET_REGISTRY.get(id);
}

export function historicalAerialDatasetByYear(year: HistoricalAerialYear) {
  return HISTORICAL_AERIAL_DATASET_REGISTRY.get(datasetIdForYear(year));
}

export function validateHistoricalAerialRegistry() {
  return HISTORICAL_AERIAL_YEARS.every(year => {
    const dataset = historicalAerialDatasetByYear(year);
    return dataset?.year === year
      && dataset.minLevel === 0
      && dataset.maxLevel === 19
      && dataset.tileTemplate.includes('{{z}}')
      && dataset.tileTemplate.includes('{{x}}')
      && dataset.tileTemplate.includes('{{y}}')
      && dataset.sourceKmlPath === HISTORICAL_AERIAL_KML_PATHS[year];
  });
}
