import {
  HistoricalAerialKmlParser,
  datasetIdForYear,
  type HistoricalAerialDataset,
  type HistoricalAerialYear,
} from '../shared/historicalAerialDataset.js';

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
      && dataset.tileTemplate.includes('{{y}}');
  });
}
