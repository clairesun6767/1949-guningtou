import type { GeographicBounds } from './region.js';

export type HistoricalAerialMode = 'OFF' | 'AERIAL' | 'AERIAL_RELIEF';
export type HistoricalAerialProviderMode = 'disabled' | 'local' | 'remote';
export type HistoricalAerialRightsStatus = 'BLOCKED — RIGHTS UNCLEAR' | 'APPROVED';
export type HistoricalAerialAlignmentStatus = 'SOURCE REVIEW' | 'EXPERIMENTAL ALIGNMENT' | 'VERIFIED';

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
  license: '中央研究院版權所有；非經允許，不得作為商業使用。GitHub／衍生材質／公開 runtime 權利未確認。',
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
  rightsStatus: 'BLOCKED — RIGHTS UNCLEAR',
  alignmentStatus: 'SOURCE REVIEW',
  imageFormat: 'image/png',
  tileMatrixSet: 'GoogleMapsCompatible',
  resourceTemplate: 'https://gis.sinica.edu.tw/kinmen/file-exists.php?img=Kinmen_1945-png-{TileMatrix}-{TileCol}-{TileRow}',
};

export const HISTORICAL_AERIAL_CONFIG = {
  defaultYear: 1945,
  defaultMode: 'OFF' as HistoricalAerialMode,
  defaultOpacity: 0,
  defaultToneEnabled: true,
  coverageMaskDebugDefault: false,
  rightsStatus: 'BLOCKED — RIGHTS UNCLEAR' as HistoricalAerialRightsStatus,
  source: HISTORICAL_AERIAL_1945,
} as const;

export const HISTORICAL_AERIAL_MODES: Array<{
  id: HistoricalAerialMode;
  label: string;
  englishLabel: string;
  description: string;
}> = [
  { id: 'OFF', label: '歷史地形', englishLabel: 'HISTORICAL TERRAIN', description: '現代 DEM × 檔案色調' },
  { id: 'AERIAL', label: '1945 航照', englishLabel: '1945 AERIAL', description: '來源審查中；不載入影像' },
  { id: 'AERIAL_RELIEF', label: '航照 × 地形', englishLabel: 'AERIAL + RELIEF', description: '來源審查中；保留地形陰影' },
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
