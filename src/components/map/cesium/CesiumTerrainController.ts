import type { ImageryLayer, Viewer } from 'cesium';

type CesiumModule = typeof import('cesium');

export interface TerrainSetup {
  imageryLayer: ImageryLayer;
  terrainSource: 'ellipsoid' | 'cesium-world-terrain';
}

export async function configureGeographicReference(
  Cesium: CesiumModule,
  viewer: Viewer,
  hasWorldTerrain: boolean,
): Promise<TerrainSetup> {
  const provider = await Cesium.TileMapServiceImageryProvider.fromUrl(
    Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII'),
  );
  const imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
  imageryLayer.brightness = .46;
  imageryLayer.contrast = 1.08;
  imageryLayer.saturation = .06;
  imageryLayer.gamma = .84;

  return {
    imageryLayer,
    terrainSource: hasWorldTerrain ? 'cesium-world-terrain' : 'ellipsoid',
  };
}
