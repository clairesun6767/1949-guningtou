import type { CustomDataSource, ImageryLayer, Viewer } from 'cesium';
import type { CameraPresetId, LayerState } from '../../../battle-replay/visualization/types.js';

type CesiumModule = typeof import('cesium');

export class CesiumLayerController {
  constructor(
    private readonly Cesium: CesiumModule,
    private readonly viewer: Viewer,
    private readonly imageryLayer: ImageryLayer,
    private readonly poiSource: CustomDataSource,
    private readonly strategicLabels: CustomDataSource,
  ) {}

  update(layers: LayerState, cameraId: CameraPresetId): void {
    const terrain = layers.enabled.has('terrain');
    const modern = layers.enabled.has('modern-reference');
    const labels = layers.enabled.has('labels');
    const strategic = cameraId === 'strategic' || cameraId === 'kinmen';

    this.imageryLayer.show = terrain || modern;
    this.imageryLayer.brightness = modern ? .72 : .46;
    this.imageryLayer.saturation = modern ? .34 : .06;
    this.viewer.scene.globe.enableLighting = terrain;
    this.poiSource.show = layers.enabled.has('historical-poi') && !strategic;
    this.strategicLabels.show = labels && strategic;
    for (const entity of this.poiSource.entities.values) {
      if (entity.label) entity.label.show = new this.Cesium.ConstantProperty(labels);
    }
    this.viewer.scene.requestRender();
  }

  updateFeatureVisibility(visibleIds: Set<string>): void {
    for (const entity of this.poiSource.entities.values) {
      const featureId = entity.id.startsWith('battle-poi:') ? entity.id.slice('battle-poi:'.length) : entity.id;
      entity.show = visibleIds.has(featureId);
    }
    this.viewer.scene.requestRender();
  }
}
