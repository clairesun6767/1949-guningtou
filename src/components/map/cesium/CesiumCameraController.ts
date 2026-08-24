import type { Viewer } from 'cesium';
import type { Position } from '../../../battle-replay/types/index.js';
import { getCesiumCameraDestination } from '../../../battle-replay/visualization/adapters/cesiumAdapter.js';
import type { CameraPresetId } from '../../../battle-replay/visualization/types.js';

type CesiumModule = typeof import('cesium');

export class CesiumCameraController {
  constructor(
    private readonly Cesium: CesiumModule,
    private readonly viewer: Viewer,
    private readonly mobile: boolean,
  ) {}

  setInitial(presetId: CameraPresetId): void {
    this.apply(presetId, undefined, true);
  }

  flyTo(presetId: CameraPresetId, focus?: Position): void {
    this.apply(presetId, focus, false);
  }

  private apply(presetId: CameraPresetId, focus: Position | undefined, immediate: boolean): void {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const destination = getCesiumCameraDestination(presetId, { mobile: this.mobile, reducedMotion, focus });
    const cameraOptions = {
      destination: this.Cesium.Cartesian3.fromDegrees(destination.longitude, destination.latitude, destination.height),
      orientation: {
        heading: this.Cesium.Math.toRadians(destination.headingDegrees),
        pitch: this.Cesium.Math.toRadians(destination.pitchDegrees),
        roll: this.Cesium.Math.toRadians(destination.rollDegrees),
      },
    };

    this.viewer.camera.cancelFlight();
    if (immediate || destination.durationMs === 0) {
      this.viewer.camera.setView(cameraOptions);
      this.viewer.scene.requestRender();
      return;
    }

    this.viewer.camera.flyTo({
      ...cameraOptions,
      duration: destination.durationMs / 1000,
      easingFunction: this.Cesium.EasingFunction.CUBIC_IN_OUT,
    });
  }
}
