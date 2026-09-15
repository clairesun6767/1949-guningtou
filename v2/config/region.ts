export type RegionPresetId = 'hero' | 'xiamen' | 'kinmen' | 'guningtou';
export type RegionPerformanceTier = 'HIGH' | 'MEDIUM' | 'LOW';
export type RegionVariantId = 'neutral' | 'cinematic' | 'historical';
export type RegionTerrainQualityId = 'A' | 'B' | 'C';
export type RegionTerrainQualitySource = 'benchmark' | 'composition';
export type RegionLightingMode = 'CURRENT' | 'RELIEF';
export type RegionContourMode = 'OFF' | 'SUBTLE' | 'STRONG';

export interface GeographicPoint {
  longitude: number;
  latitude: number;
}

export interface GeographicBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface RegionPreset {
  label: string;
  shortLabel: string;
  target: GeographicPoint;
  distance: number;
  azimuthDegrees: number;
  polarDegrees: number;
}

export interface RegionPerformanceSettings {
  maxPixelRatio: number;
  antialias: boolean;
  shadows: boolean;
  oceanSegments: number;
  fogDensity: number;
}

export const REGION_COMPOSITION_BOUNDS = {
  west: 117.84,
  south: 24.28,
  east: 118.60,
  north: 24.72,
} satisfies GeographicBounds;

export const REGION_CONFIG = {
  id: 'gate-a-kinmen-xiamen-strategic-terrain',
  coordinateSystem: 'EPSG:4326' as const,
  referenceEra: 'modern_reference' as const,
  referenceOrigin: { longitude: 118.24, latitude: 24.49 },
  worldUnitsPerMetre: 0.001,
  terrain: {
    verticalExaggeration: 1.72,
    seaLevelWorld: -0.035,
    maxElevationWorld: 0.67,
  },
  camera: {
    fovDegrees: 43,
    near: 0.05,
    far: 180,
    minDistance: 11.8,
    maxDistance: 66,
    mobileMinDistance: 13.2,
    mobileMaxDistance: 58,
    minPolarDegrees: 28,
    maxPolarDegrees: 76,
    targetBounds: {
      west: 117.86,
      south: 24.29,
      east: 118.58,
      north: 24.71,
    } satisfies GeographicBounds,
  },
  presets: {
    hero: {
      label: 'STRATEGIC WIDE',
      shortLabel: 'WIDE',
      target: { longitude: 118.21, latitude: 24.49 },
      distance: 56,
      azimuthDegrees: 322,
      polarDegrees: 48,
    },
    xiamen: {
      label: 'XIAMEN / 廈門',
      shortLabel: 'XIAMEN',
      target: { longitude: 118.105, latitude: 24.49 },
      distance: 24,
      azimuthDegrees: 320,
      polarDegrees: 50,
    },
    kinmen: {
      label: 'KINMEN / 金門',
      shortLabel: 'KINMEN',
      target: { longitude: 118.35, latitude: 24.45 },
      distance: 18,
      azimuthDegrees: 326,
      polarDegrees: 50,
    },
    guningtou: {
      label: 'GUNINGTOU / 古寧頭',
      shortLabel: 'GUNINGTOU',
      target: { longitude: 118.318, latitude: 24.478 },
      distance: 11.8,
      azimuthDegrees: 326,
      polarDegrees: 53,
    },
  } satisfies Record<RegionPresetId, RegionPreset>,
  labels: [
    { id: 'xiamen', text: 'XIAMEN', chinese: '廈門', point: { longitude: 118.105, latitude: 24.49 }, kind: 'major', minDistance: 14, maxDistance: 70, offset: 'west' },
    { id: 'kinmen', text: 'KINMEN', chinese: '金門', point: { longitude: 118.35, latitude: 24.45 }, kind: 'major', minDistance: 13.5, maxDistance: 66, offset: 'east' },
    { id: 'lieyu', text: 'LIEYU', chinese: '烈嶼', point: { longitude: 118.24, latitude: 24.425 }, kind: 'minor', minDistance: 8, maxDistance: 35, offset: 'south' },
    { id: 'guningtou', text: 'GUNINGTOU', chinese: '古寧頭', point: { longitude: 118.318, latitude: 24.478 }, kind: 'focus', minDistance: 7, maxDistance: 28, offset: 'north' },
    { id: 'dadeng', text: 'DADENG', chinese: '大嶝', point: { longitude: 118.335, latitude: 24.549 }, kind: 'minor', minDistance: 15, maxDistance: 42, offset: 'north' },
  ] as const,
  performance: {
    high: { maxPixelRatio: 1.55, antialias: true, shadows: true, oceanSegments: 32, fogDensity: 0.0065 },
    medium: { maxPixelRatio: 1.25, antialias: true, shadows: true, oceanSegments: 22, fogDensity: 0.0075 },
    low: { maxPixelRatio: 1, antialias: false, shadows: false, oceanSegments: 12, fogDensity: 0.009 },
  } satisfies Record<Lowercase<RegionPerformanceTier>, RegionPerformanceSettings>,
} as const;

export const REGION_TERRAIN_QUALITY: Record<RegionTerrainQualityId, {
  label: string;
  description: string;
  grid: string;
  terrainAsset: string;
  coastlineResolution: string;
}> = {
  A: {
    label: 'A / BASELINE',
    description: 'Gate A current regional grid',
    grid: '196×100',
    terrainAsset: 'terrain/kinmen-xiamen-regional.json',
    coastlineResolution: '196×100 grid mask / OSM polygon test',
  },
  B: {
    label: 'B / BALANCED',
    description: 'Native-source sampled balanced target',
    grid: '512×256',
    terrainAsset: 'terrain/kinmen-xiamen-regional-quality-b.json',
    coastlineResolution: '2048×1041 alpha mask / OSM vector',
  },
  C: {
    label: 'C / QUALITY',
    description: 'Native-source sampled quality target',
    grid: '1024×512',
    terrainAsset: 'terrain/kinmen-xiamen-regional-quality-c.json',
    coastlineResolution: '2048×1041 alpha mask / OSM vector',
  },
};

export const REGION_COMPOSITION_QUALITY: Record<Exclude<RegionTerrainQualityId, 'A'>, {
  label: string;
  description: string;
  grid: string;
  terrainAsset: string;
  coastlineAsset: string;
  coastlineResolution: string;
  bounds: GeographicBounds;
}> = {
  B: {
    label: 'B / BALANCED / A.2',
    description: 'Strategic composition balanced target',
    grid: '640×368',
    terrainAsset: 'terrain/kinmen-xiamen-regional-composition-quality-b.json',
    coastlineAsset: 'map-data/regional-composition-coastline.geojson',
    coastlineResolution: '2048×1184 alpha mask / OSM vector + mainland crop',
    bounds: REGION_COMPOSITION_BOUNDS,
  },
  C: {
    label: 'C / QUALITY / A.2',
    description: 'Strategic composition quality target',
    grid: '1280×736',
    terrainAsset: 'terrain/kinmen-xiamen-regional-composition-quality-c.json',
    coastlineAsset: 'map-data/regional-composition-coastline.geojson',
    coastlineResolution: '2048×1184 alpha mask / OSM vector + mainland crop',
    bounds: REGION_COMPOSITION_BOUNDS,
  },
};

export const REGION_PERFORMANCE_TIERS: Record<RegionPerformanceTier, RegionPerformanceSettings> = {
  HIGH: REGION_CONFIG.performance.high,
  MEDIUM: REGION_CONFIG.performance.medium,
  LOW: REGION_CONFIG.performance.low,
};

export const REGION_VARIANTS: Record<RegionVariantId, {
  label: string;
  description: string;
  skyTop: string;
  skyBottom: string;
  fog: string;
  sun: string;
  terrainTint: string;
  terrainMix: number;
  oceanDeep: string;
  oceanShallow: string;
}> = {
  neutral: {
    label: 'NEUTRAL STRATEGIC',
    description: 'Clear daylight / geographic relationship',
    skyTop: '#172528',
    skyBottom: '#70837c',
    fog: '#49605b',
    sun: '#f2d7a2',
    terrainTint: '#a6aa82',
    terrainMix: 0.12,
    oceanDeep: '#142f39',
    oceanShallow: '#47716e',
  },
  cinematic: {
    label: 'CINEMATIC DAWN',
    description: 'Low sun / long shadow / atmospheric depth',
    skyTop: '#211f2d',
    skyBottom: '#bc8065',
    fog: '#705754',
    sun: '#f3b56e',
    terrainTint: '#b57f65',
    terrainMix: 0.22,
    oceanDeep: '#1d2b3e',
    oceanShallow: '#7c665d',
  },
  historical: {
    label: 'HISTORICAL HYBRID',
    description: 'Terrain relief / map-paper warmth / restrained contrast',
    skyTop: '#222b27',
    skyBottom: '#9a9b7c',
    fog: '#626954',
    sun: '#e7d39a',
    terrainTint: '#c4aa78',
    terrainMix: 0.3,
    oceanDeep: '#23393a',
    oceanShallow: '#667665',
  },
};

export function regionTierKey(tier: RegionPerformanceTier): Lowercase<RegionPerformanceTier> {
  return tier.toLowerCase() as Lowercase<RegionPerformanceTier>;
}
