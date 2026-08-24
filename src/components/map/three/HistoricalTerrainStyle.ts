export const HistoricalTerrainStyle = {
  camera: {
    fovDegrees: 36,
    defaultPitchDegrees: 45,
    minPolarDegrees: 45,
    maxPolarDegrees: 45,
  },
  terrain: {
    verticalExaggeration: 2.25,
    worldUnitsPerMetre: .001,
    lowColor: 0x817a61,
    middleColor: 0x94886a,
    highColor: 0xb0a17c,
    coastlineColor: 0xe3d8bd,
    roughness: .96,
  },
  sea: {
    color: 0x31494a,
    opacity: .96,
    levelMetres: -.75,
  },
  scene: {
    background: 0xa4aaa0,
    fog: 0xa4aaa0,
    fogNear: 80,
    fogFar: 150,
  },
  lighting: {
    hemisphereSky: 0xd6d8cc,
    hemisphereGround: 0x3b3c35,
    hemisphereIntensity: 2.15,
    sunColor: 0xffe4bc,
    sunIntensity: 3.1,
  },
  labels: {
    strategicMinRangeMetres: 12_000,
    localMaxRangeMetres: 30_000,
  },
  poi: {
    verifiedColor: 0xb99a62,
    probableColor: 0xb7a173,
    militaryColor: 0x7d8e8a,
  },
} as const;

export type TerrainExaggeration = number;
export type TerrainPitch = 35 | 45 | 55;
