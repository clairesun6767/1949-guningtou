import type { Viewer } from 'cesium';
import type { Position } from '../../../battle-replay/types/index.js';
import {
  getCesiumVisibleFeatures,
  toCesiumPointFeatures,
} from '../../../battle-replay/visualization/adapters/cesiumAdapter.js';
import type {
  BattleMapFeature,
  CameraPresetId,
  LayerState,
  TimelineFilter,
} from '../../../battle-replay/visualization/types.js';
import { CesiumCameraController } from './CesiumCameraController.js';
import { CesiumLayerController } from './CesiumLayerController.js';
import { applyHistoricalAtmosphere } from './CesiumAtmosphere.js';
import { createPoiDataSource, createStrategicLabelDataSource } from './CesiumPoiLayer.js';
import { configureGeographicReference, type TerrainSetup } from './CesiumTerrainController.js';

type CesiumModule = typeof import('cesium');

interface SceneOptions {
  container: HTMLElement;
  creditContainer: HTMLElement;
  base: string;
  mobile: boolean;
  features: BattleMapFeature[];
  layers: LayerState;
  timeline: TimelineFilter;
  cameraId: CameraPresetId;
  onSelectFeature: (id: string) => void;
  onRenderError: (error: unknown) => void;
}

export class CesiumScene {
  readonly terrainSource: TerrainSetup['terrainSource'];
  private readonly viewer: Viewer;
  private readonly cameraController: CesiumCameraController;
  private readonly layerController: CesiumLayerController;
  private readonly removeRenderErrorListener: () => void;
  private readonly Cesium: CesiumModule;

  private constructor(
    Cesium: CesiumModule,
    viewer: Viewer,
    cameraController: CesiumCameraController,
    layerController: CesiumLayerController,
    terrainSource: TerrainSetup['terrainSource'],
    removeRenderErrorListener: () => void,
  ) {
    this.Cesium = Cesium;
    this.viewer = viewer;
    this.cameraController = cameraController;
    this.layerController = layerController;
    this.terrainSource = terrainSource;
    this.removeRenderErrorListener = removeRenderErrorListener;
  }

  static async create(options: SceneOptions): Promise<CesiumScene> {
    const basePath = options.base.replace(/\/$/, '');
    (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = `${basePath}/cesiumStatic/`;
    const Cesium = await import('cesium');
    (Cesium.buildModuleUrl as typeof Cesium.buildModuleUrl & { setBaseUrl: (value: string) => void })
      .setBaseUrl(`${basePath}/cesiumStatic/`);
    const ionToken = import.meta.env.PUBLIC_CESIUM_ION_TOKEN?.trim();
    if (ionToken) Cesium.Ion.defaultAccessToken = ionToken;

    const viewer = new Cesium.Viewer(options.container, {
      animation: false,
      baseLayer: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      scene3DOnly: true,
      requestRenderMode: true,
      maximumRenderTimeChange: Number.POSITIVE_INFINITY,
      creditContainer: options.creditContainer,
      terrain: ionToken ? Cesium.Terrain.fromWorldTerrain({ requestVertexNormals: true }) : undefined,
      contextOptions: {
        webgl: {
          alpha: false,
          antialias: !options.mobile,
          failIfMajorPerformanceCaveat: true,
          powerPreference: options.mobile ? 'low-power' : 'high-performance',
        },
      },
    });

    applyHistoricalAtmosphere(Cesium, viewer, options.mobile);
    const terrainSetup = await configureGeographicReference(Cesium, viewer, Boolean(ionToken));
    const visible = getCesiumVisibleFeatures(options.features, options.layers, options.timeline);
    const poiSource = await createPoiDataSource(Cesium, viewer, toCesiumPointFeatures(options.features));
    const strategicLabels = await createStrategicLabelDataSource(Cesium, viewer);
    const layerController = new CesiumLayerController(Cesium, viewer, terrainSetup.imageryLayer, poiSource, strategicLabels);
    const cameraController = new CesiumCameraController(Cesium, viewer, options.mobile);
    cameraController.setInitial(options.cameraId);
    layerController.update(options.layers, options.cameraId);
    layerController.updateFeatureVisibility(new Set(visible.map(feature => feature.id)));

    viewer.screenSpaceEventHandler.setInputAction((movement: { position: import('cesium').Cartesian2 }) => {
      const picked = viewer.scene.pick(movement.position) as { id?: { id?: string } } | undefined;
      const entityId = picked?.id?.id;
      if (entityId?.startsWith('battle-poi:')) options.onSelectFeature(entityId.slice('battle-poi:'.length));
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    const removeRenderErrorListener = viewer.scene.renderError.addEventListener((_scene, error) => options.onRenderError(error));
    viewer.scene.requestRender();

    return new CesiumScene(Cesium, viewer, cameraController, layerController, terrainSetup.terrainSource, removeRenderErrorListener);
  }

  updateCamera(cameraId: CameraPresetId, focus?: Position): void {
    this.cameraController.flyTo(cameraId, focus);
  }

  updateLayers(layers: LayerState, cameraId: CameraPresetId): void {
    this.layerController.update(layers, cameraId);
  }

  updateFeatures(features: BattleMapFeature[], layers: LayerState, timeline: TimelineFilter): void {
    const visible = getCesiumVisibleFeatures(features, layers, timeline);
    this.layerController.updateFeatureVisibility(new Set(visible.map(feature => feature.id)));
  }

  resize(): void {
    this.viewer.resize();
    this.viewer.scene.requestRender();
  }

  destroy(): void {
    if (this.viewer.isDestroyed()) return;
    this.viewer.camera.cancelFlight();
    this.viewer.screenSpaceEventHandler.removeInputAction(this.Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.removeRenderErrorListener();
    this.viewer.dataSources.removeAll(true);
    this.viewer.imageryLayers.removeAll(true);
    this.viewer.destroy();
  }
}
