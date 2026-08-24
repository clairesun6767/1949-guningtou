import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { wgs84ToLocalMeters } from '../../../battle-replay/visualization/adapters/threeAdapter.js';
import type { Position } from '../../../battle-replay/types/index.js';
import type { BattleMapFeature, CameraPresetId, MapLayerId } from '../../../battle-replay/visualization/types.js';
import type { HistoricalTraceFeature, HistoricalTraceVisualProgress } from '../../../battle-replay/visualization/historicalTraces.js';
import { landPolygons, loadCartographicAsset } from './CartographicAsset.js';
import { HistoricalTerrainStyle, type TerrainExaggeration, type TerrainPitch } from './HistoricalTerrainStyle.js';
import { HistoricalCartographicStyle } from './HistoricalCartographicStyle.js';
import { ThreeCartographicLayer } from './ThreeCartographicLayer.js';
import { ThreeBattleMovementLayer } from './ThreeBattleMovementLayer.js';
import { ThreeHistoricalTraceLayer } from './ThreeHistoricalTraceLayer.js';
import { ThreeCameraController } from './ThreeCameraController.js';
import { ThreePoiLayer } from './ThreePoiLayer.js';
import {
  createTerrainBundle,
  disposeTerrainBundle,
  loadTerrainAsset,
  loadTerrainCoverageMask,
  loadClassificationMasks,
  isTerrainCoverageSample,
  rebuildTerrainBundle,
  sampleTerrainHeight,
  setTerrainClassificationQa,
  setTerrainSolid,
  updateTerrainClassification,
  type TerrainMeshBundle,
  type TerrainCoverageMask,
  type ClassificationTextureFilter,
} from './ThreeTerrainController.js';

export type TerrainQaMode =
  | 'none'
  | 'terrain-solid'
  | 'terrain-seam'
  | 'terrain-only'
  | 'classification-only'
  | 'classification-regional-only'
  | 'classification-local-only'
  | 'classification-both'
  | 'classification-no-lod'
  | 'classification-uv-debug'
  | 'classification-alpha-debug'
  | 'regional-only'
  | 'local-only'
  | 'terrain-ownership'
  | 'no-lod'
  | 'texture-nearest'
  | 'texture-linear'
  | 'texture-mipmap'
  | 'anisotropy-1'
  | 'anisotropy-4'
  | 'anisotropy-8'
  | 'anisotropy-max';

interface CreateOptions {
  container: HTMLElement;
  labelContainer: HTMLElement;
  base: string;
  mobile: boolean;
  compact: boolean;
  reducedMotion: boolean;
  features: BattleMapFeature[];
  historicalTraces: HistoricalTraceFeature[];
  cameraId: CameraPresetId;
  labelsEnabled: boolean;
  enabledLayers: Set<MapLayerId>;
  selectedId: string | null;
  onSelectFeature: (id: string) => void;
  onSelectHistoricalTrace: (id: string) => void;
  onRenderError: (error: unknown) => void;
  onInteraction: () => void;
  qaMode: TerrainQaMode;
}

const STRATEGIC_LABELS = [
  ['XIAMEN', 118.0894, 24.4798, true],
  ['DADENG', 118.326, 24.543, false],
  ['XIAODENG', 118.397, 24.503, false],
  ['KINMEN', 118.35, 24.45, true],
  ['GUNINGTOU', 118.318, 24.478, false],
] as const;

const SCALE = HistoricalTerrainStyle.terrain.worldUnitsPerMetre;

function textureQaForMode(mode: TerrainQaMode): { filter: ClassificationTextureFilter; anisotropy: number } {
  if (mode === 'texture-nearest') return { filter: 'nearest', anisotropy: 1 };
  if (mode === 'texture-linear') return { filter: 'linear', anisotropy: 1 };
  if (mode === 'anisotropy-1') return { filter: 'mipmap', anisotropy: 1 };
  if (mode === 'anisotropy-4') return { filter: 'mipmap', anisotropy: 4 };
  if (mode === 'anisotropy-8') return { filter: 'mipmap', anisotropy: 8 };
  if (mode === 'anisotropy-max') return { filter: 'mipmap', anisotropy: 16 };
  return { filter: mode === 'texture-mipmap' ? 'mipmap' : 'mipmap', anisotropy: 8 };
}

export class ThreeScene {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly labelRenderer = new CSS2DRenderer();
  private readonly controls: OrbitControls;
  private readonly cameraController: ThreeCameraController;
  private readonly poiLayer: ThreePoiLayer;
  private readonly strategicLabels = new THREE.Group();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly regional: TerrainMeshBundle;
  private readonly local: TerrainMeshBundle;
  private readonly cartography: ThreeCartographicLayer;
  private readonly battleMovements: ThreeBattleMovementLayer;
  private readonly historicalTraces: ThreeHistoricalTraceLayer;
  private readonly terrainQaGroup = new THREE.Group();
  private readonly terrainOwnershipGroup = new THREE.Group();
  private sea?: THREE.Mesh;
  private animationFrame = 0;
  private exaggeration: TerrainExaggeration = HistoricalTerrainStyle.terrain.verticalExaggeration;
  private readonly qaMode: TerrainQaMode;
  private currentCameraId: CameraPresetId;
  private currentFeatures: BattleMapFeature[];
  private labelsEnabled: boolean;
  private selectedId: string | null;
  private enabledLayers: Set<MapLayerId>;
  private readonly coverageMask?: TerrainCoverageMask;
  private readonly textureQa: { filter: ClassificationTextureFilter; anisotropy: number };

  static async create(options: CreateOptions) {
    const root = options.base.replace(/\/$/, '');
    const textureQa = textureQaForMode(options.qaMode);
    const [regionalAsset, localAsset, localCoverage, regionalCoastline, localCoastline, regionalCartography, localCartography, regionalMasks, localMasks] = await Promise.all([
      loadTerrainAsset(`${root}/terrain/kinmen-xiamen-regional.json`),
      loadTerrainAsset(`${root}/terrain/guningtou-local.json`),
      loadTerrainCoverageMask(`${root}/terrain/guningtou-local-coverage-mask.json`),
      loadCartographicAsset(`${root}/map-data/regional-coastline.geojson`),
      loadCartographicAsset(`${root}/map-data/guningtou-coastline.geojson`),
      loadCartographicAsset(`${root}/map-data/regional-cartography.geojson`),
      loadCartographicAsset(`${root}/map-data/guningtou-cartography.geojson`),
      loadClassificationMasks(`${root}/map-data/regional-classification-a.png`, `${root}/map-data/regional-classification-b.png`, textureQa),
      loadClassificationMasks(`${root}/map-data/guningtou-classification-a.png`, `${root}/map-data/guningtou-classification-b.png`, textureQa),
    ]);
    const exaggeration = HistoricalCartographicStyle.terrain.verticalExaggeration;
    const activeCoverage = ['no-lod', 'classification-no-lod'].includes(options.qaMode) ? undefined : localCoverage;
    const regional = createTerrainBundle(regionalAsset, exaggeration, landPolygons(regionalCoastline), regionalMasks, false, localAsset.bounds, activeCoverage);
    const local = createTerrainBundle(localAsset, exaggeration, landPolygons(localCoastline), localMasks, options.qaMode !== 'classification-no-lod');
    const cartography = new ThreeCartographicLayer(
      regionalCartography,
      localCartography,
      regionalCoastline,
      localCoastline,
      regionalAsset,
      localAsset,
      options.mobile,
      localCoverage,
    );
    return new ThreeScene(options, regional, local, cartography, localCoverage, textureQa);
  }

  private constructor(
    private readonly options: CreateOptions,
    regional: TerrainMeshBundle,
    local: TerrainMeshBundle,
    cartography: ThreeCartographicLayer,
    coverageMask: TerrainCoverageMask,
    textureQa: { filter: ClassificationTextureFilter; anisotropy: number },
  ) {
    this.regional = regional;
    this.local = local;
    this.cartography = cartography;
    this.coverageMask = coverageMask;
    this.textureQa = textureQa;
    this.battleMovements = new ThreeBattleMovementLayer(local.asset, options.reducedMotion);
    this.historicalTraces = new ThreeHistoricalTraceLayer(local.asset, options.mobile, options.reducedMotion, options.onSelectHistoricalTrace);
    this.qaMode = options.qaMode;
    this.regional.terrainMaterial.opacity = 1;
    this.local.terrainMaterial.opacity = 1;
    this.currentCameraId = options.cameraId;
    this.currentFeatures = options.features;
    this.labelsEnabled = options.labelsEnabled;
    this.selectedId = options.selectedId;
    this.enabledLayers = new Set(options.enabledLayers);
    this.scene.background = new THREE.Color(this.qaMode === 'terrain-solid' ? 0x050505 : HistoricalTerrainStyle.scene.background);
    this.scene.fog = new THREE.Fog(HistoricalTerrainStyle.scene.fog, HistoricalTerrainStyle.scene.fogNear, HistoricalTerrainStyle.scene.fogFar);

    this.camera = new THREE.PerspectiveCamera(HistoricalTerrainStyle.camera.fovDegrees, 1, .05, 240);
    this.renderer = new THREE.WebGLRenderer({
      antialias: !options.mobile,
      alpha: false,
      powerPreference: options.mobile ? 'default' : 'high-performance',
      preserveDrawingBuffer: import.meta.env.DEV,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.shadowMap.enabled = !options.mobile;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.mobile ? 1.25 : 1.75));
    const anisotropy = Math.min(this.textureQa.anisotropy, this.renderer.capabilities.getMaxAnisotropy());
    for (const texture of [...this.regional.classificationMasks, ...this.local.classificationMasks]) texture.anisotropy = anisotropy;
    this.renderer.domElement.className = 'three-historical-renderer__canvas';
    this.renderer.domElement.setAttribute('aria-label', 'Three.js stylized historical terrain scene');
    this.renderer.domElement.dataset.controls = 'left-rotate middle-pan wheel-zoom';
    options.container.appendChild(this.renderer.domElement);

    this.labelRenderer.domElement.className = 'three-historical-renderer__labels';
    options.labelContainer.appendChild(this.labelRenderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .06;
    this.controls.enablePan = true;
    this.controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    this.controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
    this.controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    this.controls.touches.ONE = THREE.TOUCH.ROTATE;
    this.controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    this.controls.screenSpacePanning = false;
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(HistoricalTerrainStyle.camera.minPolarDegrees);
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(HistoricalTerrainStyle.camera.maxPolarDegrees);
    this.controls.autoRotateSpeed = .08;
    this.cameraController = new ThreeCameraController(this.camera, this.controls, options.mobile, options.reducedMotion);
    this.poiLayer = new ThreePoiLayer(options.onSelectFeature, options.mobile);

    this.addEnvironment();
    this.scene.add(this.regional.group, this.local.group, this.cartography.group, this.battleMovements.group, this.historicalTraces.group, this.strategicLabels, this.poiLayer.group, this.terrainQaGroup, this.terrainOwnershipGroup);
    this.local.group.visible = true;
    this.createStrategicLabels();
    this.cartography.updateVisibility(options.enabledLayers);
    updateTerrainClassification(this.regional, options.enabledLayers);
    updateTerrainClassification(this.local, options.enabledLayers);
    this.updateFeatures(options.features, options.labelsEnabled, options.selectedId);
    this.updateHistoricalTraces(options.historicalTraces, options.labelsEnabled);
    this.updateCamera(options.cameraId);
    this.createTerrainSeamQa();
    this.createTerrainOwnershipQa();
    this.calculateTerrainOwnership();
    this.applyQaMode();
    this.resize();
    this.controls.addEventListener('start', this.handleInteraction);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.addEventListener('pointerdown', this.preventMiddleAutoScroll, { passive: false });
    this.renderer.domElement.addEventListener('auxclick', this.preventMapAuxClick);
    this.renderer.domElement.addEventListener('contextmenu', this.preventMapContextMenu);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);
    this.tick(performance.now());
  }

  private addEnvironment() {
    const seaGeometry = new THREE.PlaneGeometry(82, 48, 20, 12);
    const seaColors: number[] = [];
    const seaPosition = seaGeometry.getAttribute('position');
    const shallow = new THREE.Color(0x49625f);
    const deep = new THREE.Color(HistoricalTerrainStyle.sea.color);
    for (let index = 0; index < seaPosition.count; index += 1) {
      const t = THREE.MathUtils.clamp((seaPosition.getY(index) + 24) / 48, 0, 1);
      const color = deep.clone().lerp(shallow, t * .42);
      seaColors.push(color.r, color.g, color.b);
    }
    seaGeometry.setAttribute('color', new THREE.Float32BufferAttribute(seaColors, 3));
    const seaMaterial = this.qaMode === 'terrain-solid'
      ? new THREE.MeshBasicMaterial({ color: 0x050505, transparent: false, depthWrite: true })
      : new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: .78,
        metalness: .06,
        transparent: true,
        opacity: HistoricalTerrainStyle.sea.opacity,
      });
    const sea = new THREE.Mesh(seaGeometry, seaMaterial);
    sea.name = 'stylized-sea-reference';
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = HistoricalTerrainStyle.sea.levelMetres * SCALE;
    sea.receiveShadow = true;
    this.sea = sea;
    this.scene.add(sea);

    const hemisphere = new THREE.HemisphereLight(
      HistoricalTerrainStyle.lighting.hemisphereSky,
      HistoricalTerrainStyle.lighting.hemisphereGround,
      HistoricalTerrainStyle.lighting.hemisphereIntensity,
    );
    const sun = new THREE.DirectionalLight(HistoricalTerrainStyle.lighting.sunColor, HistoricalTerrainStyle.lighting.sunIntensity);
    sun.position.set(-22, 42, 20);
    sun.castShadow = !this.options.mobile;
    sun.shadow.mapSize.set(this.options.mobile ? 512 : 1024, this.options.mobile ? 512 : 1024);
    sun.shadow.camera.left = -45;
    sun.shadow.camera.right = 45;
    sun.shadow.camera.top = 35;
    sun.shadow.camera.bottom = -35;
    this.scene.add(hemisphere, sun);
  }

  private createStrategicLabels() {
    for (const [text, longitude, latitude, major] of STRATEGIC_LABELS) {
      const element = document.createElement('span');
      const collisionClass = text === 'GUNINGTOU'
        ? 'three-terrain-label--guningtou'
        : text === 'KINMEN'
          ? 'three-terrain-label--kinmen'
          : '';
      element.className = `three-terrain-label three-terrain-label--strategic ${major ? 'three-terrain-label--major' : ''} ${collisionClass}`;
      element.textContent = text;
      const label = new CSS2DObject(element);
      const local = wgs84ToLocalMeters([longitude, latitude]);
      label.position.set(
        local.eastMetres * SCALE,
        sampleTerrainHeight(this.regional.asset, longitude, latitude, this.exaggeration) + (major ? .36 : .24),
        -local.northMetres * SCALE,
      );
      this.strategicLabels.add(label);
    }
  }

  updateCamera(cameraId: CameraPresetId, focus?: Position) {
    this.currentCameraId = cameraId;
    const localView = !['strategic', 'kinmen'].includes(cameraId);
    this.regional.group.visible = this.qaMode !== 'local-only';
    this.local.group.visible = this.qaMode !== 'regional-only';
    this.strategicLabels.visible = this.labelsEnabled && !localView;
    this.poiLayer.group.visible = this.enabledLayers.has('historical-poi') && localView;
    this.cameraController.updateCamera(cameraId, focus);
    this.applyQaMode();
  }

  updateFeatures(features: BattleMapFeature[], labelsEnabled: boolean, selectedId: string | null = this.selectedId) {
    this.currentFeatures = features;
    this.labelsEnabled = labelsEnabled;
    this.selectedId = selectedId;
    this.strategicLabels.visible = labelsEnabled && ['strategic', 'kinmen'].includes(this.currentCameraId);
    this.poiLayer.update(features, this.local.asset, this.exaggeration, labelsEnabled, selectedId);
    this.battleMovements.update(features, labelsEnabled);
    this.poiLayer.group.visible = this.enabledLayers.has('historical-poi') && !['strategic', 'kinmen'].includes(this.currentCameraId);
    this.applyQaMode();
  }

  updateHistoricalTraces(features: HistoricalTraceFeature[], labelsEnabled: boolean) {
    this.historicalTraces.update(features, labelsEnabled);
    this.applyQaMode();
  }

  updateHistoricalTraceProgress(progressById: Map<string, HistoricalTraceVisualProgress>) {
    this.historicalTraces.updateProgress(progressById);
  }

  updateLayers(enabled: Set<MapLayerId>) {
    this.enabledLayers = new Set(enabled);
    this.cartography.updateVisibility(enabled);
    updateTerrainClassification(this.regional, enabled);
    updateTerrainClassification(this.local, enabled);
    const localView = !['strategic', 'kinmen'].includes(this.currentCameraId);
    this.poiLayer.group.visible = enabled.has('historical-poi') && localView;
    const nextLabels = enabled.has('labels');
    if (nextLabels !== this.labelsEnabled) this.updateFeatures(this.currentFeatures, nextLabels, this.selectedId);
    this.applyQaMode();
  }

  fitBattleMovement(features: BattleMapFeature[]) {
    if (['strategic', 'kinmen'].includes(this.currentCameraId)) return false;
    const movementFeatures = features.filter(feature => ['direction', 'corridor', 'route'].includes(feature.type));
    if (!movementFeatures.length) return false;
    const relatedIds = new Set(movementFeatures.flatMap(feature => feature.relatedLocations));
    const coordinates: Position[] = [];
    const collect = (feature: BattleMapFeature) => {
      if (feature.geometry?.type === 'Point') coordinates.push(feature.geometry.coordinates);
      if (feature.geometry?.type === 'LineString') coordinates.push(...feature.geometry.coordinates);
      if (feature.geometry?.type === 'MultiLineString') coordinates.push(...feature.geometry.coordinates.flat());
      if (feature.geometry?.type === 'Polygon') coordinates.push(...feature.geometry.coordinates.flat());
      if (feature.geometry?.type === 'MultiPolygon') coordinates.push(...feature.geometry.coordinates.flat(2));
    };
    movementFeatures.forEach(collect);
    this.currentFeatures.filter(feature => feature.type === 'location' && relatedIds.has(feature.id)).forEach(collect);
    if (!coordinates.length) return false;
    const longitudes = coordinates.map(([longitude]) => longitude);
    const latitudes = coordinates.map(([, latitude]) => latitude);
    const padding = .0035;
    this.cameraController.fitGeographicBounds({
      west: Math.min(...longitudes) - padding,
      south: Math.min(...latitudes) - padding,
      east: Math.max(...longitudes) + padding,
      north: Math.max(...latitudes) + padding,
    });
    return true;
  }

  setPitch(pitch: TerrainPitch) {
    this.cameraController.setPitch(pitch);
  }

  setExaggeration(exaggeration: TerrainExaggeration) {
    this.exaggeration = exaggeration;
    rebuildTerrainBundle(this.regional, exaggeration);
    rebuildTerrainBundle(this.local, exaggeration);
    for (const object of [...this.strategicLabels.children]) {
      if (object instanceof CSS2DObject) object.element.remove();
    }
    this.strategicLabels.clear();
    this.createStrategicLabels();
    this.updateFeatures(this.currentFeatures, this.labelsEnabled, this.selectedId);
  }

  resize() {
    const width = Math.max(1, this.options.container.clientWidth);
    const height = Math.max(1, this.options.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.labelRenderer.setSize(width, height);
    this.historicalTraces.resize(width, height);
  }

  captureDataUrl() {
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL('image/png');
  }

  getStats() {
    return {
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      regionalGrid: `${this.regional.asset.grid.width}×${this.regional.asset.grid.height}`,
      localGrid: `${this.local.asset.grid.width}×${this.local.asset.grid.height}`,
      cartographicCounts: this.cartography.getCounts(),
      qaMode: this.qaMode,
      textureQa: this.textureQa,
      terrainOwnership: this.regional.ownershipStats,
      historicalTraceCount: this.historicalTraces.group.children.length,
      terrainHole: {
        regionalExcludedTriangles: this.regional.triangleStats.excluded,
        regionalTrianglesUnderLocalFootprint: 0,
        localFootprint: this.coverageMask?.bounds ?? this.regional.holeBounds ?? null,
      },
    };
  }

  private calculateTerrainOwnership() {
    if (!this.coverageMask) return;
    const stats = {
      supportedSamples: 0,
      regionalOwnerSamples: 0,
      localOwnerSamples: 0,
      noOwnerSamples: 0,
      overlapSamples: 0,
    };
    for (let row = 0; row < this.regional.asset.grid.height; row += 2) {
      const latitude = this.regional.asset.bounds.north - (row / (this.regional.asset.grid.height - 1)) * (this.regional.asset.bounds.north - this.regional.asset.bounds.south);
      for (let column = 0; column < this.regional.asset.grid.width; column += 2) {
        const longitude = this.regional.asset.bounds.west + (column / (this.regional.asset.grid.width - 1)) * (this.regional.asset.bounds.east - this.regional.asset.bounds.west);
        const regionalLand = this.regional.asset.land[row * this.regional.asset.grid.width + column] === 1;
        const localOwner = isTerrainCoverageSample(this.coverageMask, [longitude, latitude]);
        const regionalOwner = regionalLand && !localOwner;
        const supported = regionalLand || localOwner;
        if (!supported) continue;
        stats.supportedSamples += 1;
        if (regionalOwner) stats.regionalOwnerSamples += 1;
        if (localOwner) stats.localOwnerSamples += 1;
        if (!regionalOwner && !localOwner) stats.noOwnerSamples += 1;
        if (regionalOwner && localOwner) stats.overlapSamples += 1;
      }
    }
    this.regional.ownershipStats = stats;
  }

  private createTerrainOwnershipQa() {
    if (!this.coverageMask) return;
    const positions: number[] = [];
    const colors: number[] = [];
    const colorRegional = new THREE.Color(0xd88943);
    const colorLocal = new THREE.Color(0x42c6d4);
    const colorNoOwner = new THREE.Color(0xff39b7);
    const colorOverlap = new THREE.Color(0xf04444);
    for (let row = 0; row < this.regional.asset.grid.height; row += 3) {
      const latitude = this.regional.asset.bounds.north - (row / (this.regional.asset.grid.height - 1)) * (this.regional.asset.bounds.north - this.regional.asset.bounds.south);
      for (let column = 0; column < this.regional.asset.grid.width; column += 3) {
        const longitude = this.regional.asset.bounds.west + (column / (this.regional.asset.grid.width - 1)) * (this.regional.asset.bounds.east - this.regional.asset.bounds.west);
        const regionalLand = this.regional.asset.land[row * this.regional.asset.grid.width + column] === 1;
        const localOwner = isTerrainCoverageSample(this.coverageMask, [longitude, latitude]);
        const regionalOwner = regionalLand && !localOwner;
        if (!regionalLand && !localOwner) continue;
        const local = wgs84ToLocalMeters([longitude, latitude]);
        const height = localOwner
          ? sampleTerrainHeight(this.local.asset, longitude, latitude, this.exaggeration)
          : sampleTerrainHeight(this.regional.asset, longitude, latitude, this.exaggeration);
        positions.push(local.eastMetres * SCALE, height + .08, -local.northMetres * SCALE);
        const color = regionalOwner && localOwner ? colorOverlap : regionalOwner ? colorRegional : localOwner ? colorLocal : colorNoOwner;
        colors.push(color.r, color.g, color.b);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({ size: .09, vertexColors: true, sizeAttenuation: true, depthTest: false }));
    points.name = 'qa-terrain-ownership-samples';
    points.renderOrder = 60;
    this.terrainOwnershipGroup.add(points);
  }

  private createTerrainSeamQa() {
    if (this.qaMode !== 'terrain-seam') return;
    const regionalWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(this.regional.terrainMesh.geometry),
      new THREE.LineBasicMaterial({ color: 0xc46f51, transparent: true, opacity: .28, depthTest: false }),
    );
    regionalWire.name = 'qa-regional-terrain-wireframe';
    regionalWire.renderOrder = 40;
    const localWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(this.local.terrainMesh.geometry),
      new THREE.LineBasicMaterial({ color: 0x81a9b7, transparent: true, opacity: .46, depthTest: false }),
    );
    localWire.name = 'qa-local-terrain-wireframe';
    localWire.renderOrder = 41;
    const bounds = this.local.asset.bounds;
    const corners: Position[] = [
      [bounds.west, bounds.south], [bounds.east, bounds.south], [bounds.east, bounds.north], [bounds.west, bounds.north],
    ];
    const footprint = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(corners.map(([longitude, latitude]) => {
        const local = wgs84ToLocalMeters([longitude, latitude]);
        return new THREE.Vector3(
          local.eastMetres * SCALE,
          sampleTerrainHeight(this.local.asset, longitude, latitude, this.exaggeration) + .018,
          -local.northMetres * SCALE,
        );
      })),
      new THREE.LineBasicMaterial({ color: 0xf1d28f, transparent: true, opacity: .92, depthTest: false }),
    );
    footprint.name = 'qa-local-footprint';
    footprint.renderOrder = 42;
    this.terrainQaGroup.add(regionalWire, localWire, footprint);
  }

  private applyQaMode() {
    const terrainOnly = [
      'terrain-solid', 'terrain-seam', 'terrain-only', 'classification-only',
      'classification-regional-only', 'classification-local-only', 'classification-both',
      'classification-no-lod', 'classification-uv-debug', 'classification-alpha-debug',
      'regional-only', 'local-only', 'terrain-ownership',
    ].includes(this.qaMode);
    const regionalVisible = !['local-only', 'classification-local-only'].includes(this.qaMode);
    const localVisible = !['regional-only', 'classification-regional-only', 'classification-no-lod', 'no-lod'].includes(this.qaMode);
    this.regional.group.visible = regionalVisible;
    this.local.group.visible = localVisible;
    this.cartography.group.visible = !terrainOnly;
    this.battleMovements.group.visible = !terrainOnly && this.battleMovements.group.children.length > 0;
    this.historicalTraces.group.visible = !terrainOnly && this.enabledLayers.has('historical-battle-traces') && this.historicalTraces.group.children.length > 0;
    this.poiLayer.group.visible = !terrainOnly && this.enabledLayers.has('historical-poi') && !['strategic', 'kinmen'].includes(this.currentCameraId);
    this.strategicLabels.visible = !terrainOnly && this.labelsEnabled && ['strategic', 'kinmen'].includes(this.currentCameraId);
    this.terrainQaGroup.visible = this.qaMode === 'terrain-seam';
    this.terrainOwnershipGroup.visible = this.qaMode === 'terrain-ownership';
    const classificationQa = [
      'classification-only', 'classification-regional-only', 'classification-local-only',
      'classification-both', 'classification-no-lod', 'classification-uv-debug', 'classification-alpha-debug',
    ].includes(this.qaMode);
    setTerrainClassificationQa(this.regional, classificationQa);
    setTerrainClassificationQa(this.local, classificationQa);
    setTerrainSolid(this.regional, this.qaMode === 'terrain-solid');
    setTerrainSolid(this.local, this.qaMode === 'terrain-solid');
  }

  private readonly handlePointerUp = (event: PointerEvent) => {
    if (!this.poiLayer.group.visible) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.poiLayer.pick(this.raycaster);
  };

  private readonly handleContextLost = (event: Event) => {
    event.preventDefault();
    this.options.onRenderError(new Error('Three.js WebGL context lost'));
  };

  private readonly preventMiddleAutoScroll = (event: PointerEvent) => {
    if (event.button === 1) event.preventDefault();
  };

  private readonly preventMapAuxClick = (event: MouseEvent) => {
    if (event.button === 1) event.preventDefault();
  };

  private readonly preventMapContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  private readonly handleInteraction = () => {
    this.options.onInteraction();
  };

  private tick = (now: number) => {
    this.cameraController.tick(now);
    const guningtou = wgs84ToLocalMeters([118.329, 24.47]);
    const distance = this.camera.position.distanceTo(new THREE.Vector3(guningtou.eastMetres * SCALE, 0, -guningtou.northMetres * SCALE));
    const localMix = 1 - THREE.MathUtils.smoothstep(distance, 8, 24);
    this.renderer.domElement.dataset.cameraTarget = [this.controls.target.x, this.controls.target.y, this.controls.target.z].map(value => value.toFixed(3)).join(',');
    this.renderer.domElement.dataset.cameraDistance = this.camera.position.distanceTo(this.controls.target).toFixed(3);
    this.regional.terrainMaterial.opacity = 1;
    this.local.terrainMaterial.opacity = 1;
    this.regional.terrainMaterial.depthWrite = true;
    this.local.terrainMaterial.depthWrite = true;
    this.cartography.tick(1, localMix, this.currentCameraId !== 'strategic' && this.enabledLayers.has('battle-movement'));
    this.battleMovements.tick(now, localMix, distance);
    this.historicalTraces.tick(localMix, distance);
    this.poiLayer.tick(now);
    this.strategicLabels.visible = this.labelsEnabled && distance > 13;
    this.poiLayer.group.visible = this.enabledLayers.has('historical-poi') && distance < 18;
    if (this.sea) this.sea.position.y = HistoricalTerrainStyle.sea.levelMetres * SCALE;
    this.applyQaMode();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.tick);
  };

  destroy() {
    cancelAnimationFrame(this.animationFrame);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.removeEventListener('pointerdown', this.preventMiddleAutoScroll);
    this.renderer.domElement.removeEventListener('auxclick', this.preventMapAuxClick);
    this.renderer.domElement.removeEventListener('contextmenu', this.preventMapContextMenu);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.controls.removeEventListener('start', this.handleInteraction);
    this.controls.dispose();
    this.poiLayer.dispose();
    this.battleMovements.dispose();
    this.historicalTraces.dispose();
    this.cartography.dispose();
    disposeTerrainBundle(this.regional);
    disposeTerrainBundle(this.local);
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh && !object.name.startsWith('terrain-mesh-')) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
        else object.material.dispose();
      }
      if (object instanceof CSS2DObject) object.element.remove();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labelRenderer.domElement.remove();
  }
}
