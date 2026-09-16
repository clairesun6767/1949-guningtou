import type { GeographicBounds } from './region.js';

export type HistoricalAerialMode = 'OFF' | 'AERIAL' | 'AERIAL_RELIEF';
export type HistoricalAerialProviderMode = 'disabled' | 'local' | 'remote';
export type HistoricalAerialRightsStatus = 'BLOCKED — RIGHTS UNCLEAR' | 'APPROVED';
export type HistoricalAerialAlignmentStatus = 'SOURCE REVIEW' | 'TILE-BOUND ALIGNED / NOT VERIFIED ORTHORECTIFIED' | 'VERIFIED';

export interface HistoricalSourceMetadata {
  provider: string;
  dataset: string;
  year: number;
  layerName: string;
  serviceType: string;
  sourceUrl: string;
  sourcePageUrl: string;
  license: string;
  attribution: string;
  bounds: GeographicBounds;
  crs: string;
  resolution: string;
  coverage: string;
  acquiredAt: string;
  usageMode: HistoricalAerialProviderMode;
  rightsStatus: HistoricalAerialRightsStatus;
  alignmentStatus: HistoricalAerialAlignmentStatus;
  imageFormat: string;
  tileMatrixSet: string;
  resourceTemplate: string;
}

export const HISTORICAL_AERIAL_1945: HistoricalSourceMetadata = {
  provider: '中央研究院人社中心／地理資訊科學研究專題中心',
  dataset: '金門百年歷史地圖 WMTS 服務',
  year: 1945,
  layerName: '金門舊航照影像(1945) / Kinmen_1945',
  serviceType: 'OGC WMTS 1.0.0',
  sourceUrl: 'https://gis.sinica.edu.tw/kinmen/wmts',
  sourcePageUrl: 'https://gis.sinica.edu.tw/showwmts/index.php?s=kinmen&l=Kinmen_1945',
  license: '中央研究院來源資料；本專案已取得使用者授權，僅公開低解析度 z12 衍生 POC，不公開原始／高解析度 tile。',
  attribution: '中央研究院人社中心／地理資訊科學研究專題中心（官方 tile attribution：Academia Sinica contributors）',
  bounds: {
    west: 118.2727648,
    south: 24.3437997,
    east: 118.4966956,
    north: 24.5362935,
  },
  crs: 'WGS84 layer bounds; EPSG:3857 GoogleMapsCompatible tiles',
  resolution: 'PNG 256×256 tiles; WMTS matrix 0–21; preview metadata minzoom 0 / maxzoom 19; native ground resolution not declared',
  coverage: '官方 bounds 內的金門東南／中部候選覆蓋；不延伸為整個 A.2 戰略區域。',
  acquiredAt: '2026-09-15',
  usageMode: 'disabled',
  rightsStatus: 'APPROVED',
  alignmentStatus: 'SOURCE REVIEW',
  imageFormat: 'image/png',
  tileMatrixSet: 'GoogleMapsCompatible',
  resourceTemplate: 'https://gis.sinica.edu.tw/kinmen/file-exists.php?img=Kinmen_1945-png-{TileMatrix}-{TileCol}-{TileRow}',
};

export const HISTORICAL_AERIAL_1944: HistoricalSourceMetadata = {
  ...HISTORICAL_AERIAL_1945,
  year: 1944,
  layerName: '金門舊航照影像(1944) / Kinmen_1944',
  sourcePageUrl: 'https://gis.sinica.edu.tw/showwmts/index.php?s=kinmen&l=Kinmen_1944',
  bounds: { west: 118.1987492, south: 24.3932995, east: 118.4750534, north: 24.5208965 },
  resourceTemplate: 'https://gis.sinica.edu.tw/kinmen/file-exists.php?img=Kinmen_1944-png-{TileMatrix}-{TileCol}-{TileRow}',
};

export const HISTORICAL_AERIAL_1958: HistoricalSourceMetadata = {
  ...HISTORICAL_AERIAL_1945,
  year: 1958,
  layerName: '金門舊航照圖(1958.09.10) / Kinmen_aerialphoto_1958',
  sourcePageUrl: 'https://gis.sinica.edu.tw/showwmts/index.php?s=kinmen&l=Kinmen_aerialphoto_1958',
  bounds: { west: 118.1973476, south: 24.3789698, east: 118.4924002, north: 24.5542212 },
  resourceTemplate: 'https://gis.sinica.edu.tw/kinmen/file-exists.php?img=Kinmen_aerialphoto_1958-png-{TileMatrix}-{TileCol}-{TileRow}',
};

export const HISTORICAL_AERIAL_SOURCE_YEARS = [1944, 1945, 1958] as const;

export const HISTORICAL_AERIAL_CONFIG = {
  defaultYear: 1945,
  defaultMode: 'OFF' as HistoricalAerialMode,
  defaultOpacity: 0,
  defaultToneEnabled: true,
  coverageMaskDebugDefault: false,
  rightsStatus: 'APPROVED' as HistoricalAerialRightsStatus,
  source: HISTORICAL_AERIAL_1945,
} as const;

export const HISTORICAL_AERIAL_MODES: Array<{
  id: HistoricalAerialMode;
  label: string;
  englishLabel: string;
  description: string;
}> = [
  { id: 'OFF', label: '歷史地形', englishLabel: 'HISTORICAL TERRAIN', description: '現代 DEM × 檔案色調' },
  { id: 'AERIAL', label: '多年度航照', englishLabel: '1944 / 1945 / 1958 AERIAL', description: '1944＋1945 primary；1958 fallback' },
  { id: 'AERIAL_RELIEF', label: '航照 × 地形', englishLabel: 'AERIAL + RELIEF', description: '保留現代 DEM 地形陰影' },
];

export const HISTORICAL_ART_PALETTE = {
  low: '#849084',
  middle: '#b2aa8b',
  high: '#d7c09d',
  paper: '#d8c9aa',
  charcoal: '#293938',
  oceanDeep: '#3b5a63',
  oceanShallow: '#7d9a95',
  skyTop: '#3f5558',
  skyBottom: '#9ba69e',
  fog: '#7d877f',
  sun: '#f0d7a0',
} as const;
