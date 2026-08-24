export const HistoricalCartographicStyle = {
  referenceEra: 'modern_reference',
  terrain: {
    verticalExaggeration: 2.25,
    baseLowColor: 0x817a61,
    baseMiddleColor: 0x94886a,
    baseHighColor: 0xb0a17c,
  },
  surface: {
    agriculture: 0x87935f,
    forest: 0x3f5941,
    settlement: 0xbca27f,
    settlementBlock: 0xc9b99a,
    beach: 0xe0c27e,
    openGround: 0x758766,
    coastline: 0xe3d8bd,
    roadPrimary: 0xd8c9aa,
    roadSecondary: 0xb9aa8d,
    roadLocal: 0x968b74,
  },
  opacity: {
    agriculture: .96,
    forest: .98,
    settlement: .96,
    beach: .98,
    openGround: .76,
    roads: .96,
  },
  heightOffsetWorldUnits: {
    surface: .00035,
    beach: .0006,
    road: .0012,
    coastline: .002,
  },
  roadWidthWorldUnits: {
    primary: .036,
    secondary: .022,
    local: .012,
  },
} as const;

export const CARTOGRAPHIC_LAYER_IDS = [
  'coastline',
  'land-cover',
  'roads',
  'settlements',
  'vegetation',
  'beaches',
] as const;

export type CartographicLayerId = typeof CARTOGRAPHIC_LAYER_IDS[number];
