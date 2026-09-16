import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  HISTORICAL_AERIAL_CONFIG,
  type HistoricalAerialMode,
} from '../../config/historicalAerial.js';
import type {
  EnvironmentBenchmarkMode,
  EnvironmentCloudControls,
  EnvironmentDebugState,
  EnvironmentTimePreset,
  EnvironmentWeather,
} from '../../config/environment.js';
import type { HistoricalAerialYear } from '../../shared/historicalAerialDataset.js';
import type { HistoricalAerialSelectionMode } from '../../shared/historicalAerialSelection.js';
import { HISTORICAL_AERIAL_DATASETS } from '../../config/historicalAerialRegistry.js';
import {
  REGION_CONFIG,
  type RegionContourMode,
  type RegionLightingMode,
  type RegionPerformanceTier,
  type RegionPresetId,
  type RegionTerrainQualityId,
  type RegionTerrainQualitySource,
  type RegionVariantId,
} from '../../config/region.js';
import {
  createRegionDataProvider,
  type RegionDataProvider,
  type RegionDataset,
  type RegionCompositionDataset,
  type RegionQualityTerrainAsset,
} from '../../shared/regionDataProvider.js';
import { lonLatToWorld } from '../../shared/geo.js';
import type { RegionAtmosphereHandle } from './RegionAtmosphere.js';
import { RegionCamera, type RegionCameraConstraintSnapshot } from './RegionCamera.js';
import { createRegionLabels, type RegionLabelsHandle } from './RegionLabels.js';
import type { RegionOceanHandle } from './RegionOcean.js';
import { RegionPerformanceMonitor, type RegionRenderStats, tierSettings } from './RegionPerformance.js';
import { createRegionQualityTerrain } from './RegionQualityTerrain.js';
import { HistoricalAerialLayer } from './HistoricalAerialLayer.js';
import { createRegionEnvironmentSystem, type RegionEnvironmentStats, type RegionEnvironmentSystemHandle } from '../../environment/RegionEnvironmentSystem.js';
import {
  createRegionTerrain,
  sampleRegionTerrainHeight,
  type RegionTerrainHandle,
  type RegionTerrainTextures,
} from './RegionTerrain.js';

export type RegionLoadingStage = 'terrain' | 'material' | 'atmosphere' | 'labels' | 'ready';
const BENCHMARK_CLASSIFICATION_PAYLOAD_BYTES = 31_127 + 14_160;
const COMPOSITION_CLASSIFICATION_PAYLOAD_BYTES = 38_703 + 15_228;

export const REGION_SCENE_CONTRACT = {
  id: REGION_CONFIG.id,
  stages: ['terrain', 'material', 'atmosphere', 'labels', 'ready'] as const,
  requiredModules: ['RegionTerrain', 'RegionQualityTerrain', 'RegionOcean', 'RegionAtmosphere', 'RegionCamera', 'RegionLabels', 'RegionControls', 'RegionPerformance', 'RegionDataProvider', 'HistoricalAerialLayer', 'HistoricalAerialProvider'] as const,
  environmentModules: ['RegionEnvironmentSystem', 'RegionSun', 'RegionClouds', 'RegionCloudShadow'] as const,
};

export interface RegionSceneOptions {
  container: HTMLElement;
  labelContainer: HTMLElement;
  base: string;
  mobile: boolean;
  reducedMotion: boolean;
  tier: RegionPerformanceTier;
  variant: RegionVariantId;
  labelsVisible: boolean;
  onStage: (stage: RegionLoadingStage) => void;
  onReady: () => void;
  onInteraction: () => void;
  onError: (error: unknown) => void;
  qualitySource?: RegionTerrainQualitySource;
  initialQuality?: RegionTerrainQualityId;
  initialVerticalExaggeration?: number;
  initialLightingMode?: RegionLightingMode;
  initialHistoricalMode?: HistoricalAerialMode;
  initialHistoricalToneEnabled?: boolean;
  initialAerialOpacity?: number;
  environmentMode?: EnvironmentBenchmarkMode;
  initialEnvironmentTime?: EnvironmentTimePreset;
  initialEnvironmentWeather?: EnvironmentWeather;
  initialEnvironmentDebug?: Partial<EnvironmentDebugState>;
  initialEnvironmentCloudControls?: Partial<EnvironmentCloudControls>;
  initialAerialYear?: HistoricalAerialYear;
  initialAerialSelectionMode?: HistoricalAerialSelectionMode;
  initialAerialYears?: HistoricalAerialYear[];
  allowLocalAerialPoc?: boolean;
  fixedCamera?: boolean;
}

export interface RegionDebugState {
  wireframe: boolean;
  texture: boolean;
  ocean: boolean;
  fog: boolean;
  shadow: boolean;
  postProcessing: boolean;
  labels: boolean;
}

export interface RegionSceneStats extends RegionRenderStats {
  stage: RegionLoadingStage;
  regionVertices: number;
  regionTriangles: number;
  regionGrid: string;
  assetPayloadBytes: number;
  cameraConstraints: RegionCameraConstraintSnapshot;
  variant: RegionVariantId;
  quality: RegionTerrainQualityId;
  verticalExaggeration: number;
  lightingMode: RegionLightingMode;
  contourMode: RegionContourMode;
  aoEnabled: boolean;
  coastDebug: boolean;
  coastlineResolution: string;
  terrainSource: string;
  gpuEstimateBytes: number;
  historicalMode: HistoricalAerialMode;
  aerialOpacity: number;
  aerialStatus: 'SOURCE REVIEW' | 'RIGHTS BLOCKED' | 'LOCAL READY / RIGHTS REVIEW';
  aerialYear: HistoricalAerialYear;
  aerialYears: string;
  aerialSelectionMode: HistoricalAerialSelectionMode;
  aerialSourceDistribution: string;
  aerialSourceMaskUrl: string;
  aerialTileCount: number;
  aerialDownloadedBytes: number;
  aerialTextureReadyMs: number | null;
  aerialTextureResolution: string;
  aerialPayloadBytes: number;
  aerialBounds: string;
  aerialAlignment: string;
  coverageMaskDebug: boolean;
  environmentMode: EnvironmentBenchmarkMode;
  environmentTime: EnvironmentTimePreset;
  environmentWeather: EnvironmentWeather;
  environment: RegionEnvironmentStats;
}

function createNeutralTexture() {
  const data = new Uint8Array([128, 128, 128, 255]);
  const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

async function loadMaskTexture(url: string, fallback: THREE.Texture) {
  try {
    const texture = await new THREE.TextureLoader().loadAsync(url);
    texture.colorSpace = THREE.NoColorSpace;
    texture.flipY = true;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  } catch (error) {
    console.warn('Gate A classification texture fallback:', error);
    return fallback;
  }
}

export class RegionScene {
  private readonly scene = new THREE.Scene();
  private readonly coverageGroup = new THREE.Group();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly labelRenderer = new CSS2DRenderer();
  private readonly controls: OrbitControls;
  private readonly cameraController: RegionCamera;
  private readonly performance: RegionPerformanceMonitor;
  private terrain: RegionTerrainHandle;
  private readonly data: RegionDataset;
  private readonly provider: RegionDataProvider;
  private readonly qualitySource: RegionTerrainQualitySource;
  private readonly qualityAssets = new Map<string, RegionQualityTerrainAsset>();
  private readonly historicalAerial: HistoricalAerialLayer;
  private environment?: RegionEnvironmentSystemHandle;
  private composition?: RegionCompositionDataset;
  private compositionPromise?: Promise<RegionCompositionDataset>;
  private coastlinePayloadBytes = 66_868;
  private classificationPayloadBytes = BENCHMARK_CLASSIFICATION_PAYLOAD_BYTES;
  private classificationTextures: RegionTerrainTextures;
  private ocean?: RegionOceanHandle;
  private atmosphere?: RegionAtmosphereHandle;
  private labels?: RegionLabelsHandle;
  private animationFrame = 0;
  private destroyed = false;
  private stage: RegionLoadingStage = 'terrain';
  private variant: RegionVariantId;
  private quality: RegionTerrainQualityId = 'A';
  private verticalExaggeration: number = REGION_CONFIG.terrain.verticalExaggeration;
  private lightingMode: RegionLightingMode = 'CURRENT';
  private historicalMode: HistoricalAerialMode = HISTORICAL_AERIAL_CONFIG.defaultMode;
  private historicalToneEnabled = false;
  private environmentMode: EnvironmentBenchmarkMode = 'P0';
  private environmentTime: EnvironmentTimePreset = 'T0';
  private environmentWeather: EnvironmentWeather = 'W1';
  private contourMode: RegionContourMode = 'SUBTLE';
  private aoEnabled = true;
  private coastDebug = false;
  private qualityRequest = 0;
  private labelsVisible: boolean;
  private debugState: RegionDebugState = {
    wireframe: false,
    texture: true,
    ocean: true,
    fog: true,
    shadow: true,
    postProcessing: true,
    labels: true,
  };

  static async create(options: RegionSceneOptions) {
    const provider = createRegionDataProvider(options.base);
    const data = await provider.load();
    options.onStage('terrain');
    const fallbackA = createNeutralTexture();
    const fallbackB = createNeutralTexture();
    const scene = new RegionScene(options, provider, data, fallbackA, fallbackB);
    scene.start();
    const classificationAssets = options.qualitySource === 'composition'
      ? { classificationA: data.assets.compositionClassificationA, classificationB: data.assets.compositionClassificationB }
      : { classificationA: data.assets.classificationA, classificationB: data.assets.classificationB };
    const [classificationA, classificationB] = await Promise.all([
      loadMaskTexture(classificationAssets.classificationA, fallbackA),
      loadMaskTexture(classificationAssets.classificationB, fallbackB),
    ]);
    scene.setClassificationTextures(classificationA, classificationB);
    options.onStage('material');
    scene.attachEnvironment();
    if (options.initialQuality && options.initialQuality !== 'A') {
      await scene.setTerrainQuality(options.initialQuality);
    }
    await scene.loadLocalAerial();
    options.onStage('atmosphere');
    scene.attachLabels();
    options.onStage('labels');
    scene.stage = 'ready';
    scene.performance.markGateReady();
    options.onStage('ready');
    options.onReady();
    return scene;
  }

  private constructor(
    private readonly options: RegionSceneOptions,
    provider: RegionDataProvider,
    data: RegionDataset,
    fallbackA: THREE.Texture,
    fallbackB: THREE.Texture,
  ) {
    this.provider = provider;
    this.data = data;
    this.qualitySource = options.qualitySource ?? 'benchmark';
    this.classificationPayloadBytes = this.qualitySource === 'composition'
      ? COMPOSITION_CLASSIFICATION_PAYLOAD_BYTES
      : BENCHMARK_CLASSIFICATION_PAYLOAD_BYTES;
    this.classificationTextures = { classificationA: fallbackA, classificationB: fallbackB };
    this.variant = options.variant;
    this.labelsVisible = options.labelsVisible;
    this.verticalExaggeration = options.initialVerticalExaggeration ?? REGION_CONFIG.terrain.verticalExaggeration;
    this.lightingMode = options.initialLightingMode ?? 'CURRENT';
    this.historicalMode = options.initialHistoricalMode ?? HISTORICAL_AERIAL_CONFIG.defaultMode;
    this.historicalToneEnabled = options.initialHistoricalToneEnabled ?? false;
    this.environmentMode = options.environmentMode ?? 'P0';
    this.environmentTime = options.initialEnvironmentTime ?? 'T0';
    this.environmentWeather = options.initialEnvironmentWeather ?? 'W1';
    this.historicalAerial = new HistoricalAerialLayer({
      year: options.initialAerialYear ?? HISTORICAL_AERIAL_CONFIG.defaultYear as HistoricalAerialYear,
      mode: this.historicalMode,
      opacity: options.initialAerialOpacity ?? HISTORICAL_AERIAL_CONFIG.defaultOpacity,
      toneEnabled: this.historicalToneEnabled,
      selectionMode: options.initialAerialSelectionMode ?? 'smart',
      enabledYears: options.initialAerialYears ?? [1944, 1945],
      providerMode: options.allowLocalAerialPoc ? 'local' : 'disabled',
      localBaseUrl: options.base,
      allowLocalPixels: options.allowLocalAerialPoc,
    });
    this.performance = new RegionPerformanceMonitor(options.tier);
    const settings = tierSettings(options.tier);
    this.camera = new THREE.PerspectiveCamera(REGION_CONFIG.camera.fovDegrees, 1, REGION_CONFIG.camera.near, REGION_CONFIG.camera.far);
    this.camera.position.set(0, 25, 24);
    this.camera.userData.regionTarget = new THREE.Vector3(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({
      antialias: settings.antialias,
      alpha: false,
      powerPreference: options.mobile ? 'default' : 'high-performance',
      preserveDrawingBuffer: import.meta.env.DEV,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.maxPixelRatio));
    this.renderer.shadowMap.enabled = settings.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.className = 'region-scene__canvas';
    this.renderer.domElement.setAttribute('aria-label', 'Three.js Cinematic Strategic Terrain');
    this.renderer.domElement.dataset.controls = 'drag-rotate middle-drag-pan wheel-zoom pinch-zoom';
    options.container.appendChild(this.renderer.domElement);

    this.labelRenderer.domElement.className = 'region-scene__label-canvas';
    options.labelContainer.appendChild(this.labelRenderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.cameraController = new RegionCamera(this.camera, this.controls, {
      mobile: options.mobile,
      reducedMotion: options.reducedMotion,
      tier: options.tier,
      fixedCamera: options.fixedCamera,
    });
    this.terrain = createRegionTerrain(data.terrain, data.coastline, this.classificationTextures, {
      verticalExaggeration: this.verticalExaggeration,
      historicalToneEnabled: this.historicalToneEnabled,
      historicalMode: this.historicalMode,
      aerialOpacity: this.historicalAerial.aerialOpacity,
    });
    this.scene.add(this.terrain.group);
    this.coverageGroup.name = 'v2-region-historical-aerial-coverage-outlines';
    for (const dataset of HISTORICAL_AERIAL_DATASETS) {
      const points = [
        { longitude: dataset.bounds.west, latitude: dataset.bounds.north },
        { longitude: dataset.bounds.east, latitude: dataset.bounds.north },
        { longitude: dataset.bounds.east, latitude: dataset.bounds.south },
        { longitude: dataset.bounds.west, latitude: dataset.bounds.south },
      ].map(point => {
        const world = lonLatToWorld(point, 0.16);
        return new THREE.Vector3(world.x, world.y, world.z);
      });
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: dataset.year === 1944 ? '#c49754' : dataset.year === 1945 ? '#68a496' : '#ab75b1',
        transparent: true,
        opacity: 0.58,
        depthTest: false,
      });
      const line = new THREE.LineLoop(geometry, material);
      line.name = `v2-historical-aerial-coverage-${dataset.year}`;
      line.visible = false;
      this.coverageGroup.add(line);
    }
    this.scene.add(this.coverageGroup);
    this.cameraController.reset();
    this.controls.addEventListener('start', options.onInteraction);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
  }

  private setClassificationTextures(classificationA: THREE.Texture, classificationB: THREE.Texture) {
    this.classificationTextures = { classificationA, classificationB };
    this.terrain.setTextures(this.classificationTextures);
  }

  private attachEnvironment() {
    this.environment = createRegionEnvironmentSystem({
      scene: this.scene,
      renderer: this.renderer,
      tier: this.options.tier,
      variant: this.variant,
      mode: this.environmentMode,
      time: this.environmentTime,
      weather: this.environmentWeather,
      debug: {
        ...this.options.initialEnvironmentDebug,
        fog: this.debugState.fog,
        shadow: this.debugState.shadow,
        postProcessing: this.debugState.postProcessing,
      },
      cloudControls: this.options.initialEnvironmentCloudControls,
    });
    this.ocean = this.environment.ocean;
    this.atmosphere = this.environment.atmosphere;
    this.ocean.setTerrainQuality(this.quality);
    this.terrain.setVariant(this.variant);
    this.terrain.setLightingMode(this.lightingMode);
    this.terrain.setContourMode(this.contourMode);
    this.terrain.setAoEnabled(this.aoEnabled);
    this.atmosphere.setLightingMode(this.lightingMode);
    this.atmosphere.setAmbientOcclusionEnabled(this.aoEnabled);
    this.terrain.setCloudShadow(this.environment.cloudShadowState());
  }

  private attachLabels() {
    this.labels = createRegionLabels(this.labelRenderer, (longitude, latitude) => sampleRegionTerrainHeight(this.data.terrain, longitude, latitude));
    this.scene.add(this.labels.group);
    this.labels.update(this.camera, this.labelsVisible && this.debugState.labels);
  }

  private applyHistoricalAerialBinding() {
    this.terrain.setAerialTexture(this.historicalAerial.getTextureBinding());
    this.terrain.setCoverageMaskDebug(this.historicalAerial.getStats().coverageMaskDebug);
  }

  private async loadLocalAerial() {
    try {
      await this.historicalAerial.loadLocalPoc(this.options.base);
      this.applyHistoricalAerialBinding();
    } catch (error) {
      console.warn('Gate A.3P local aerial POC unavailable; keeping source-safe terrain:', error);
      this.applyHistoricalAerialBinding();
    }
  }

  private start() {
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number) => {
    if (this.destroyed) return;
    this.cameraController.update(now);
    this.environment?.tick(now, this.camera.position);
    this.terrain.setCloudShadowTime(now);
    this.labels?.update(this.camera, this.labelsVisible && this.debugState.labels);
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    this.performance.markFirstMeaningful3d();
    this.performance.sample(now);
    this.animationFrame = requestAnimationFrame(this.tick);
  };

  private readonly handleContextLost = (event: Event) => {
    event.preventDefault();
    this.options.onError(new Error('Three.js WebGL context lost in Gate A Region prototype.'));
  };

  resize() {
    const width = Math.max(1, this.options.container.clientWidth);
    const height = Math.max(1, this.options.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.labelRenderer.setSize(width, height);
  }

  flyTo(preset: RegionPresetId) {
    this.cameraController.flyTo(preset);
  }

  reset() {
    this.cameraController.reset();
  }

  setReviewRotation(degrees: number) {
    this.cameraController.setReviewAzimuth(degrees);
  }

  setReviewPolar(degrees: number) {
    this.cameraController.setReviewPolar(degrees);
  }

  setVariant(variant: RegionVariantId) {
    this.variant = variant;
    this.terrain.setVariant(variant);
    this.environment?.setVariant(variant);
  }

  async setTerrainQuality(quality: RegionTerrainQualityId) {
    const request = ++this.qualityRequest;
    if (quality === this.quality) return;
    let nextTerrain: RegionTerrainHandle;
    let nextCoastline = this.data.coastline;
    let nextCoastlinePayloadBytes = 66_868;
    if (quality === 'A') {
      nextTerrain = createRegionTerrain(this.data.terrain, this.data.coastline, this.classificationTextures, {
        verticalExaggeration: this.verticalExaggeration,
        historicalToneEnabled: this.historicalToneEnabled,
        historicalMode: this.historicalMode,
        aerialOpacity: this.historicalAerial.aerialOpacity,
      });
    } else {
      if (this.qualitySource === 'composition') {
        const composition = await this.loadComposition();
        if (request !== this.qualityRequest || this.destroyed) return;
        nextCoastline = composition.coastline;
        nextCoastlinePayloadBytes = composition.coastlinePayloadBytes;
      }
      const cacheKey = this.qualitySource + ':' + quality;
      let asset = this.qualityAssets.get(cacheKey);
      if (!asset) {
        asset = await this.provider.loadQuality(quality, this.qualitySource);
        if (request !== this.qualityRequest || this.destroyed) return;
        this.qualityAssets.set(cacheKey, asset);
      }
      nextTerrain = createRegionQualityTerrain(asset, nextCoastline, this.classificationTextures, {
        verticalExaggeration: this.verticalExaggeration,
        historicalToneEnabled: this.historicalToneEnabled,
        historicalMode: this.historicalMode,
        aerialOpacity: this.historicalAerial.aerialOpacity,
      });
    }
    if (request !== this.qualityRequest || this.destroyed) {
      nextTerrain.dispose();
      return;
    }
    nextTerrain.setTextureEnabled(this.debugState.texture);
    nextTerrain.setVariant(this.variant);
    nextTerrain.setWireframe(this.debugState.wireframe);
    nextTerrain.setContourMode(this.contourMode);
    nextTerrain.setAoEnabled(this.aoEnabled);
    nextTerrain.setCoastDebug(this.coastDebug);
    nextTerrain.setLightingMode(this.lightingMode);
    nextTerrain.setHistoricalToneEnabled(this.historicalToneEnabled);
    nextTerrain.setHistoricalMode(this.historicalMode);
    nextTerrain.setAerialOpacity(this.historicalAerial.aerialOpacity);
    nextTerrain.setAerialTexture(this.historicalAerial.getTextureBinding());
    nextTerrain.setCoverageMaskDebug(this.historicalAerial.getStats().coverageMaskDebug);
    nextTerrain.setCloudShadow(this.environment?.cloudShadowState() ?? {
      enabled: false,
      coverage: 0,
      strength: 0,
      offset: { x: 0, y: 0 },
      time: 0,
      windDirection: { x: 0.86, y: 0.5 },
      windSpeed: 0,
    });
    const previous = this.terrain;
    this.scene.remove(previous.group);
    previous.dispose();
    this.terrain = nextTerrain;
    this.scene.add(this.terrain.group);
    this.ocean?.setTerrainQuality(quality);
    this.quality = quality;
    this.coastlinePayloadBytes = nextCoastlinePayloadBytes;
  }

  private async loadComposition() {
    if (this.composition) return this.composition;
    this.compositionPromise ??= this.provider.loadComposition();
    this.composition = await this.compositionPromise;
    return this.composition;
  }

  setVerticalExaggeration(verticalExaggeration: number) {
    this.verticalExaggeration = verticalExaggeration;
    this.terrain.setVerticalExaggeration(verticalExaggeration);
  }

  setLightingMode(mode: RegionLightingMode) {
    this.lightingMode = mode;
    this.terrain.setLightingMode(mode);
    this.atmosphere?.setLightingMode(mode);
  }

  setContourMode(mode: RegionContourMode) {
    this.contourMode = mode;
    this.terrain.setContourMode(mode);
  }

  setAmbientOcclusionEnabled(enabled: boolean) {
    this.aoEnabled = enabled;
    this.terrain.setAoEnabled(enabled);
    this.atmosphere?.setAmbientOcclusionEnabled(enabled);
  }

  setCoastDebug(enabled: boolean) {
    this.coastDebug = enabled;
    this.terrain.setCoastDebug(enabled);
  }

  setHistoricalMode(mode: HistoricalAerialMode) {
    this.historicalMode = mode;
    this.historicalAerial.setMode(mode);
    this.terrain.setHistoricalMode(mode);
  }

  setHistoricalToneEnabled(enabled: boolean) {
    this.historicalToneEnabled = enabled;
    this.historicalAerial.setToneEnabled(enabled);
    this.terrain.setHistoricalToneEnabled(enabled);
  }

  setAerialOpacity(opacity: number) {
    this.historicalAerial.setOpacity(opacity);
    this.terrain.setAerialOpacity(this.historicalAerial.aerialOpacity);
  }

  setCoverageMaskDebug(enabled: boolean) {
    this.historicalAerial.setCoverageMaskDebug(enabled);
    this.terrain.setCoverageMaskDebug(enabled);
    this.coverageGroup.visible = enabled;
  }

  setHistoricalYear(year: HistoricalAerialYear) {
    this.historicalAerial.setYear(year);
    void this.loadLocalAerial();
  }

  setHistoricalSelectionMode(mode: HistoricalAerialSelectionMode) {
    this.historicalAerial.setSelectionMode(mode);
    void this.loadLocalAerial();
  }

  setHistoricalYears(years: HistoricalAerialYear[]) {
    this.historicalAerial.setEnabledYears(years);
    void this.loadLocalAerial();
  }

  setEnvironmentBenchmarkMode(mode: EnvironmentBenchmarkMode) {
    this.environmentMode = mode;
    this.environment?.setBenchmarkMode(mode);
    this.terrain.setCloudShadow(this.environment?.cloudShadowState() ?? {
      enabled: false,
      coverage: 0,
      strength: 0,
      offset: { x: 0, y: 0 },
      time: 0,
      windDirection: { x: 0.86, y: 0.5 },
      windSpeed: 0,
    });
  }

  setEnvironmentTime(time: EnvironmentTimePreset) {
    this.environmentTime = time;
    this.environment?.setTime(time);
    this.terrain.setCloudShadow(this.environment?.cloudShadowState() ?? {
      enabled: false,
      coverage: 0,
      strength: 0,
      offset: { x: 0, y: 0 },
      time: 0,
      windDirection: { x: 0.86, y: 0.5 },
      windSpeed: 0,
    });
  }

  setEnvironmentWeather(weather: EnvironmentWeather) {
    this.environmentWeather = weather;
    this.environment?.setWeather(weather);
    this.terrain.setCloudShadow(this.environment?.cloudShadowState() ?? {
      enabled: false,
      coverage: 0,
      strength: 0,
      offset: { x: 0, y: 0 },
      time: 0,
      windDirection: { x: 0.86, y: 0.5 },
      windSpeed: 0,
    });
  }

  setEnvironmentCloudControls(controls: Partial<EnvironmentCloudControls>) {
    this.environment?.setCloudControls(controls);
    this.terrain.setCloudShadow(this.environment?.cloudShadowState() ?? {
      enabled: false,
      coverage: 0,
      strength: 0,
      offset: { x: 0, y: 0 },
      time: 0,
      windDirection: { x: 0.86, y: 0.5 },
      windSpeed: 0,
    });
  }

  setEnvironmentDebug(debug: Partial<EnvironmentDebugState>) {
    this.environment?.setDebug(debug);
    this.terrain.setCloudShadow(this.environment?.cloudShadowState() ?? {
      enabled: false,
      coverage: 0,
      strength: 0,
      offset: { x: 0, y: 0 },
      time: 0,
      windDirection: { x: 0.86, y: 0.5 },
      windSpeed: 0,
    });
  }

  setDebugState(next: Partial<RegionDebugState>) {
    this.debugState = { ...this.debugState, ...next };
    this.terrain.setWireframe(this.debugState.wireframe);
    this.terrain.setTextureEnabled(this.debugState.texture);
    this.ocean?.setVisible(this.debugState.ocean);
    this.atmosphere?.setFogEnabled(this.debugState.fog);
    this.atmosphere?.setShadowsEnabled(this.debugState.shadow);
    this.atmosphere?.setPostProcessingEnabled(this.debugState.postProcessing);
    this.environment?.setDebug({
      ocean: this.debugState.ocean,
      fog: this.debugState.fog,
      shadow: this.debugState.shadow,
      postProcessing: this.debugState.postProcessing,
    });
    this.terrain.setCloudShadow(this.environment?.cloudShadowState() ?? {
      enabled: false,
      coverage: 0,
      strength: 0,
      offset: { x: 0, y: 0 },
      time: 0,
      windDirection: { x: 0.86, y: 0.5 },
      windSpeed: 0,
    });
    this.labelsVisible = this.debugState.labels;
  }

  setLabelsVisible(visible: boolean) {
    this.labelsVisible = visible;
    this.debugState.labels = visible;
  }

  getStats(): RegionSceneStats {
    const base = this.performance.snapshot(this.renderer, this.camera, this.terrain.textureEstimateBytes);
    const assetPayloadBytes = this.terrain.assetPayloadBytes + this.coastlinePayloadBytes + this.classificationPayloadBytes;
    const gpuEstimateBytes = this.terrain.textureEstimateBytes + this.terrain.vertices * 56 + this.terrain.triangles * 3 * 4;
    const aerial = this.historicalAerial.getStats();
    const environment = this.environment?.getStats() ?? {
      mode: this.environmentMode,
      time: this.environmentTime,
      weather: this.environmentWeather,
      enabled: false,
      cloudsVisible: false,
      cloudShadowEnabled: false,
      cloudCoverage: 0,
      cloudShadowStrength: 0,
      sunDirection: '—',
      environmentReadyMs: null,
    } satisfies RegionEnvironmentStats;
    return {
      ...base,
      stage: this.stage,
      regionVertices: this.terrain.vertices,
      regionTriangles: this.terrain.triangles,
      regionGrid: this.terrain.grid,
      assetPayloadBytes,
      cameraConstraints: this.cameraController.snapshot(),
      variant: this.variant,
      quality: this.quality,
      verticalExaggeration: this.verticalExaggeration,
      lightingMode: this.lightingMode,
      contourMode: this.contourMode,
      aoEnabled: this.aoEnabled,
      coastDebug: this.coastDebug,
      coastlineResolution: this.terrain.coastlineResolution,
      terrainSource: this.terrain.sourceLabel,
      gpuEstimateBytes,
      historicalMode: this.historicalMode,
      aerialOpacity: aerial.opacity,
      aerialStatus: aerial.status,
      aerialYear: aerial.year,
      aerialYears: aerial.years,
      aerialSelectionMode: aerial.selectionMode,
      aerialSourceDistribution: aerial.sourceDistribution,
      aerialSourceMaskUrl: aerial.sourceMaskUrl,
      aerialTileCount: aerial.tileCount,
      aerialDownloadedBytes: aerial.downloadedBytes,
      aerialTextureReadyMs: aerial.textureReadyMs,
      aerialTextureResolution: aerial.textureResolution,
      aerialPayloadBytes: aerial.payloadBytes,
      aerialBounds: aerial.bounds,
      aerialAlignment: aerial.alignment,
      coverageMaskDebug: aerial.coverageMaskDebug,
      environmentMode: environment.mode,
      environmentTime: environment.time,
      environmentWeather: environment.weather,
      environment,
    };
  }

  dispose() {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.animationFrame);
    this.controls.removeEventListener('start', this.options.onInteraction);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.controls.dispose();
    this.labels?.dispose();
    this.environment?.dispose();
    this.coverageGroup.traverse(object => {
      if (object instanceof THREE.Line) {
        object.geometry.dispose();
        (object.material as THREE.Material).dispose();
      }
    });
    this.scene.remove(this.coverageGroup);
    this.terrain.dispose();
    this.historicalAerial.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();
  }
}
