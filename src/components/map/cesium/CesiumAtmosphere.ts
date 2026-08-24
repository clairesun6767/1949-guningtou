import type { Viewer } from 'cesium';

type CesiumModule = typeof import('cesium');

export function applyHistoricalAtmosphere(Cesium: CesiumModule, viewer: Viewer, mobile: boolean): void {
  const scene = viewer.scene;
  scene.backgroundColor = Cesium.Color.fromCssColorString('#111818');
  scene.globe.baseColor = Cesium.Color.fromCssColorString('#394039');
  scene.globe.enableLighting = true;
  scene.globe.showGroundAtmosphere = true;
  scene.globe.maximumScreenSpaceError = mobile ? 4 : 2;
  scene.globe.tileCacheSize = mobile ? 80 : 160;
  scene.fog.enabled = true;
  scene.fog.density = mobile ? .00012 : .0002;
  scene.fog.minimumBrightness = .04;
  if (scene.skyAtmosphere) {
    scene.skyAtmosphere.hueShift = -.06;
    scene.skyAtmosphere.saturationShift = -.48;
    scene.skyAtmosphere.brightnessShift = -.38;
  }
  if (scene.sun) scene.sun.show = true;
  if (scene.moon) scene.moon.show = false;
  scene.highDynamicRange = false;
  scene.screenSpaceCameraController.minimumZoomDistance = 450;
  scene.screenSpaceCameraController.maximumZoomDistance = 480000;
}
