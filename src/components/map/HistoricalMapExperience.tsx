import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import locationsRaw from '../../../data/battles/guningtou-1949/locations.geojson?raw';
import movementsRaw from '../../../data/battles/guningtou-1949/battle-movements.geojson?raw';
import historicalTracesRaw from '../../../data/battles/guningtou-1949/historical-battle-map-traces.geojson?raw';
import historicalPhasesRaw from '../../../data/battles/guningtou-1949/historical-battle-phases.json?raw';
import {
  CAMERA_PRESETS,
  DEFAULT_VISITOR_LAYERS,
  GUNINGTOU_TIMELINE_STEPS,
  filterVisibleFeatures,
  movementCollectionToMapFeatures,
  browserSupportsWebGL,
  chooseHistoricalRenderer,
  projectPosition,
  historicalTraceSourceLabel,
  historicalTraceVisitorLabel,
  historicalTraceMatchesDate,
  parseHistoricalTraceCollection,
  parseHistoricalTracePhases,
  phaseAtProgress,
  traceVisualProgressAtProgress,
  type BattleMapFeature,
  type CameraPresetId,
  type HistoricalConfidence,
  type HistoricalRendererMode,
  type MapLayerId,
  type BattleMovementCollection,
} from '../../battle-replay/visualization/index';
import './historical-map.css';

interface Props {
  lang?: string;
  base?: string;
  compact?: boolean;
  rendererMode?: HistoricalRendererMode;
}

interface CanonicalLocation {
  type: 'Feature';
  id: string;
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    id: string;
    historicalName: Record<string, string>;
    locationType: string;
    sourceRefs: string[];
    confidence: 'confirmed' | 'probable' | 'estimated' | 'unknown';
    verificationStatus: string;
    notes?: Record<string, string>;
    coordinateProvenance: {
      coordinatePrecision: string;
      verificationMethod?: string;
      verifiedBy?: string;
      verifiedAt?: string;
      notes?: string;
    };
  };
}

const canonicalCollection = JSON.parse(locationsRaw) as { features: CanonicalLocation[] };
const canonicalLocations = canonicalCollection.features;
const ThreeHistoricalTerrainRenderer = lazy(() => import('./three/ThreeHistoricalTerrainRenderer'));
const CesiumHistoricalRenderer = lazy(() => import('./cesium/CesiumHistoricalRenderer'));

function toHistoricalConfidence(value: CanonicalLocation['properties']['confidence']): HistoricalConfidence {
  if (value === 'confirmed') return 'verified';
  if (value === 'probable') return 'probable';
  return 'approximate';
}

const locationFeatures: BattleMapFeature[] = canonicalLocations.map(location => ({
  id: location.properties.id,
  type: 'location',
  geometry: location.geometry,
  confidence: toHistoricalConfidence(location.properties.confidence),
  sourceIds: [...location.properties.sourceRefs],
  relatedLocations: [],
  relatedPeople: [],
  description: location.properties.notes,
  visibility: 'production',
  researchOnly: false,
  metadata: {
    locationType: location.properties.locationType,
    label: location.properties.historicalName['zh-Hant'],
    verificationStatus: location.properties.verificationStatus,
    coordinatePrecision: location.properties.coordinateProvenance.coordinatePrecision,
    referenceEra: location.properties.confidence === 'confirmed' ? 'historical_verified' : 'historical_approximate',
  },
}));

const COPY = {
  'zh-tw': {
    eyebrow: 'INTERACTIVE HISTORICAL ATLAS · 1949', title: '1949 金廈戰略空間',
    intro: '從金廈海域進入古寧頭，以地點、時間與史料可信度理解戰役。',
    enter: '進入古寧頭戰場', explore: '戰場 3D', timeline: '時間', locations: '地點', stories: '故事', layers: '戰役圖層', reset: '金廈全覽',
    scaleStrategic: '戰略尺度', scaleBattlefield: '古寧頭地景', research: 'Historical Evidence Mode',
    schematic: '現代地理與 SRTM 高程參照 · 地形 2.25× · 非 1949 地貌復原', imageryPending: '1944 航照 · 尚未完成 georeference',
    tour: '歷史導覽', nextPoi: '下一個地點', close: '關閉', noData: 'canonical package 尚無可顯示資料',
    date: '歷史日期', people: '人物', events: '相關事件', media: '影像／文件', sources: '來源', confidence: '史料可信度',
    missing: 'canonical package 尚未提供', allLocations: '已人工驗證地點', mapMeaning: '這不是精確行軍圖',
    mapMeaningBody: 'Production map 預設只顯示 verified Locations。方向、範圍、走廊與路線必須等待可追溯史料。',
    researchShort: '史料模式', geographicReference: '現代地理參考', ellipsoid: 'WGS84 橢球基準', worldTerrain: 'Cesium World Terrain',
    battleMovement: '戰役行動', verifiedRoute: '已確認路徑', movementCorridor: '行動走廊', attackAxis: '攻擊方向',
    corridorNote: '大致行動範圍，非精確行軍路線', noMovementGeometry: '目前史料不足以建立可信的 10/27 行動幾何',
    interactionHint: '左鍵旋轉 · 滾輪縮放 · 中鍵平移',
    candidateEmpty: '目前沒有經審查的候選路線幾何。', rendererFallback: '3D 渲染無法使用，已切換備援模式。', visitor3d: '訪客 3D', atlasFallback: 'Atlas 備援',
    sourceTrace: '戰役圖例', sourceMap: '歷史戰役圖', sourceMapRegistration: 'Schematic historical map · registration approximate', sourceTraceDisclaimer: '依歷史戰役圖描繪，位置為示意性套準，非精密測量路徑。',
    battleLegend: '戰役圖例', plaAttack: '共軍進攻', rocCounterattack: '國軍反擊', rocDefense: '國軍防線', battleArea: '戰鬥／行動區域',
    play: '播放', pause: '暫停', previousPhase: '上一階段', nextPhase: '下一階段', followBattle: '跟隨戰況', sourceReview: '來源圖檢視',
  },
  'zh-cn': {
    eyebrow: 'INTERACTIVE HISTORICAL ATLAS · 1949', title: '1949 金厦战略空间',
    intro: '从金厦海域进入古宁头，以地点、时间与史料可信度理解战役。',
    enter: '进入古宁头战场', explore: '战场 3D', timeline: '时间', locations: '地点', stories: '故事', layers: '战役图层', reset: '金厦全览',
    scaleStrategic: '战略尺度', scaleBattlefield: '古宁头地景', research: 'Historical Evidence Mode',
    schematic: '现代地理与 SRTM 高程参考 · 地形 2.25× · 非 1949 地貌复原', imageryPending: '1944 航照 · 尚未完成 georeference',
    tour: '历史导览', nextPoi: '下一个地点', close: '关闭', noData: 'canonical package 尚无可显示资料',
    date: '历史日期', people: '人物', events: '相关事件', media: '影像／文件', sources: '来源', confidence: '史料可信度',
    missing: 'canonical package 尚未提供', allLocations: '已人工验证地点', mapMeaning: '这不是精确行军图',
    mapMeaningBody: 'Production map 默认只显示 verified Locations。方向、范围、走廊与路线必须等待可追溯史料。',
    researchShort: '史料模式', geographicReference: '现代地理参考', ellipsoid: 'WGS84 椭球基准', worldTerrain: 'Cesium World Terrain',
    battleMovement: '战役行动', verifiedRoute: '已确认路径', movementCorridor: '行动走廊', attackAxis: '攻击方向',
    corridorNote: '大致行动范围，非精确行军路线', noMovementGeometry: '目前史料不足以建立可信的 10/27 行动几何',
    interactionHint: '左键旋转 · 滚轮缩放 · 中键平移',
    candidateEmpty: '目前没有经审查的候选路线几何。', rendererFallback: '3D 渲染无法使用，已切换备用模式。', visitor3d: '访客 3D', atlasFallback: 'Atlas 备用',
    sourceTrace: '战役图例', sourceMap: '历史战役图', sourceMapRegistration: 'Schematic historical map · registration approximate', sourceTraceDisclaimer: '依历史战役图描绘，位置为示意性套准，非精密测量路径。',
    battleLegend: '战役图例', plaAttack: '共军进攻', rocCounterattack: '国军反击', rocDefense: '国军防线', battleArea: '战斗／行动区域',
    play: '播放', pause: '暂停', previousPhase: '上一阶段', nextPhase: '下一阶段', followBattle: '跟随战况', sourceReview: '来源图检视',
  },
  en: {
    eyebrow: 'INTERACTIVE HISTORICAL ATLAS · 1949', title: 'The Kinmen–Xiamen Strategic Space',
    intro: 'Move from the maritime theatre into Guningtou through place, time, and explicit historical confidence.',
    enter: 'Enter the Guningtou battlefield', explore: 'Battlefield 3D', timeline: 'Timeline', locations: 'Locations', stories: 'Stories', layers: 'Battle layers', reset: 'Kinmen–Xiamen overview',
    scaleStrategic: 'Strategic scale', scaleBattlefield: 'Guningtou landscape', research: 'Historical Evidence Mode',
    schematic: 'Modern geography and SRTM elevation · 2.25× relief · not a 1949 reconstruction', imageryPending: '1944 aerial · georeference pending',
    tour: 'Guided tour', nextPoi: 'Next location', close: 'Close', noData: 'No canonical data available',
    date: 'Historical date', people: 'People', events: 'Related events', media: 'Images / documents', sources: 'Sources', confidence: 'Historical confidence',
    missing: 'Not yet available in the canonical package', allLocations: 'Manually verified locations', mapMeaning: 'This is not a precise troop-route map',
    mapMeaningBody: 'The visitor map shows verified Locations by default. Directions, areas, corridors, and routes require traceable evidence.',
    researchShort: 'Evidence mode', geographicReference: 'Modern geographic reference', ellipsoid: 'WGS84 ellipsoid baseline', worldTerrain: 'Cesium World Terrain',
    battleMovement: 'Battle Movement', verifiedRoute: 'Verified Route', movementCorridor: 'Movement Corridor', attackAxis: 'Attack Axis',
    corridorNote: 'Approximate movement area, not an exact route.', noMovementGeometry: 'Insufficient evidence to establish credible 10/27 movement geometry.',
    interactionHint: 'Left drag rotate · Wheel zoom · Middle drag pan',
    candidateEmpty: 'No reviewed candidate route geometry available.', rendererFallback: '3D rendering unavailable; a fallback renderer is active.', visitor3d: 'Visitor 3D', atlasFallback: 'Atlas fallback',
    sourceTrace: 'Battle legend', sourceMap: 'Historical Battle Map', sourceMapRegistration: 'Schematic historical map · registration approximate', sourceTraceDisclaimer: 'Traced from a historical battle map; positions are schematically registered, not precision-measured routes.',
    battleLegend: 'Battle legend', plaAttack: 'PLA attack', rocCounterattack: 'ROC counterattack', rocDefense: 'ROC defensive line', battleArea: 'Battle / action area',
    play: 'Play', pause: 'Pause', previousPhase: 'Previous phase', nextPhase: 'Next phase', followBattle: 'Follow battle', sourceReview: 'Source review',
  },
} as const;

const LAYER_DEFINITIONS: Array<{ id: MapLayerId; label: string; dataCount: number }> = [
  { id: 'terrain', label: 'Terrain', dataCount: 1 },
  { id: 'coastline', label: 'Coastline', dataCount: 33 },
  { id: 'land-cover', label: 'Land Cover', dataCount: 208 },
  { id: 'roads', label: 'Roads', dataCount: 811 },
  { id: 'settlements', label: 'Settlements', dataCount: 369 },
  { id: 'vegetation', label: 'Vegetation', dataCount: 113 },
  { id: 'beaches', label: 'Beaches', dataCount: 60 },
  { id: 'historical-poi', label: 'Historical POI', dataCount: canonicalLocations.length },
  { id: 'battle-events', label: 'Battle Events', dataCount: 0 },
  { id: 'battle-movement', label: 'Battle Movement', dataCount: 4 },
  { id: 'verified-routes', label: '  Verified Route', dataCount: 0 },
  { id: 'battle-corridors', label: '  Movement Corridor', dataCount: 2 },
  { id: 'battle-directions', label: '  Attack Axis', dataCount: 2 },
  { id: 'historical-battle-traces', label: 'Historical Map Traces', dataCount: 11 },
  { id: 'historical-battle-map', label: 'Historical Battle Map', dataCount: 1 },
  { id: 'historical-imagery', label: 'Historical Imagery', dataCount: 1 },
  { id: 'labels', label: 'Labels', dataCount: 5 + canonicalLocations.length },
  { id: 'research-layer', label: 'Research Layer', dataCount: canonicalLocations.length },
];

const CARTOGRAPHIC_STORY_ZONES = {
  guningtou_overview: { label: '古寧頭總覽', cameraId: 'battle_overview' as CameraPresetId, focus: [118.329, 24.47] as [number, number] },
  north_south_villages: { label: '南北山聚落', cameraId: 'story_mode' as CameraPresetId, focus: [118.3095, 24.479] as [number, number] },
  landing_coast: { label: '登陸海岸', cameraId: 'landing_coast' as CameraPresetId, focus: [118.351, 24.465] as [number, number] },
  anqi_sector: { label: '安岐地區', cameraId: 'story_mode' as CameraPresetId, focus: [118.329, 24.466] as [number, number] },
} as const;

const locationTypeLabel: Record<string, string> = {
  'landing-zone': 'Landing Area', coast: 'Coastal Feature', settlement: 'Village', 'military-site': 'Defensive Position',
};

function localized(value: Record<string, string> | undefined, lang: string): string | undefined {
  if (!value) return undefined;
  return value[lang === 'zh-tw' ? 'zh-Hant' : lang === 'zh-cn' ? 'zh-Hant' : 'en'] ?? value['zh-Hant'] ?? Object.values(value)[0];
}

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

const movementFeatures = movementCollectionToMapFeatures(JSON.parse(movementsRaw) as BattleMovementCollection);
const historicalTraceCollection = parseHistoricalTraceCollection(historicalTracesRaw);
const historicalPhaseCollection = parseHistoricalTracePhases(historicalPhasesRaw);
const historicalTraceFeatures = historicalTraceCollection.features;
const historicalPhases = historicalPhaseCollection.phases;

function getInitialCameraId(): CameraPresetId {
  if (typeof window !== 'undefined' && import.meta.env.DEV && new URLSearchParams(window.location.search).get('qa') === 'camera-kinmen') {
    return 'kinmen';
  }
  return 'strategic';
}

export default function HistoricalMapExperience({ lang = 'zh-tw', base = '/1949-guningtou', compact = false, rendererMode = 'three' }: Props) {
  const dictionary = COPY[lang as keyof typeof COPY] ?? COPY['zh-tw'];
  const qaMode = import.meta.env.DEV && typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('qa')
    : null;
  const terrainIsolationQa = qaMode === 'terrain-solid';
  const [cameraId, setCameraId] = useState<CameraPresetId>(getInitialCameraId);
  const [detailReady, setDetailReady] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [storyFocus, setStoryFocus] = useState<[number, number] | undefined>();
  const [tourIndex, setTourIndex] = useState(-1);
  const [activeDay, setActiveDay] = useState(0);
  const [researchMode, setResearchMode] = useState(false);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);
  const [playbackModeActive, setPlaybackModeActive] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [followBattle, setFollowBattle] = useState(false);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [sourceMapOpacity, setSourceMapOpacity] = useState(.55);
  const [interactionHintVisible, setInteractionHintVisible] = useState(true);
  const [enabledLayers, setEnabledLayers] = useState<Set<MapLayerId>>(() => new Set(DEFAULT_VISITOR_LAYERS));
  const [openPanel, setOpenPanel] = useState<'layers' | 'locations' | null>(null);
  const [rendererRequested, setRendererRequested] = useState(false);
  const [preferredRenderer] = useState<HistoricalRendererMode>(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('renderer') === 'cesium') return 'cesium';
    return rendererMode === 'atlas' ? 'atlas' : 'three';
  });
  const [activeRenderer, setActiveRenderer] = useState<HistoricalRendererMode>('atlas');
  const [rendererStatus, setRendererStatus] = useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle');
  const [terrainSource, setTerrainSource] = useState<'srtm-reference' | 'ellipsoid' | 'cesium-world-terrain'>('srtm-reference');
  const viewportRef = useRef<HTMLDivElement>(null);
  const playbackFrameRef = useRef<number | null>(null);
  const lastPlaybackFrameRef = useRef<number | null>(null);
  const playbackProgressRef = useRef(0);

  const preset = CAMERA_PRESETS[cameraId];
  const activePhase = phaseAtProgress(historicalPhases, playbackProgress);
  const playbackPhaseDay = GUNINGTOU_TIMELINE_STEPS.findIndex(step => step.date === activePhase?.date);
  const effectiveDay = playbackPlaying || playbackProgress > 0 ? Math.max(0, playbackPhaseDay) : activeDay;
  const activeStep = GUNINGTOU_TIMELINE_STEPS[effectiveDay];
  const selectedLocation = canonicalLocations.find(item => item.id === selectedId) ?? null;
  const selectedTrace = historicalTraceFeatures.find(feature => feature.id === selectedTraceId) ?? null;
  const rendererFeatures = useMemo(() => [...locationFeatures, ...(researchMode ? movementFeatures : [])].map(feature => {
    const location = canonicalLocations.find(item => item.id === feature.id);
    const movementLabel = feature.metadata?.label as Record<string, string> | undefined;
    return { ...feature, metadata: { ...feature.metadata, label: localized(location?.properties.historicalName ?? movementLabel, lang) ?? feature.id } };
  }), [lang, researchMode]);
  const visibleFeatures = useMemo(() => filterVisibleFeatures(rendererFeatures, {
    enabled: enabledLayers,
    researchMode,
  }, { activeDate: activeStep.date }), [rendererFeatures, enabledLayers, researchMode, activeStep.date]);
  const labelsEnabled = enabledLayers.has('labels');
  const poiEnabled = enabledLayers.has('historical-poi');
  const imageryEnabled = enabledLayers.has('historical-imagery');
  const sourceMapEnabled = !terrainIsolationQa && enabledLayers.has('historical-battle-map');
  const terrainEnabled = enabledLayers.has('terrain');
  const activeMovements = visibleFeatures.filter(feature => ['direction', 'corridor', 'route'].includes(feature.type));
  const productionMovements = activeMovements.filter(feature => !feature.researchOnly && feature.visibility === 'production');
  const activeMovementTypes = new Set(productionMovements.map(feature => feature.type));
  const playbackTraceMode = playbackModeActive || playbackPlaying || playbackProgress > 0;
  const activeHistoricalTraces = useMemo(() => {
    if (terrainIsolationQa) return [];
    if (!enabledLayers.has('historical-battle-traces')) return [];
    return historicalTraceFeatures.filter(feature => (
      feature.properties.reviewStatus === 'reviewed'
      && (!feature.properties.researchOnly || researchMode)
      && (playbackTraceMode || historicalTraceMatchesDate(feature, activeStep.date))
    ));
  }, [activeStep.date, enabledLayers, playbackModeActive, playbackTraceMode, researchMode, terrainIsolationQa]);
  const historicalTraceProgress = useMemo(() => {
    const progress = new Map<string, ReturnType<typeof traceVisualProgressAtProgress>>();
    activeHistoricalTraces.forEach(feature => {
      progress.set(feature.id, playbackTraceMode ? traceVisualProgressAtProgress(feature, historicalPhases, playbackProgress) : { reveal: 1, opacity: 1 });
    });
    return progress;
  }, [activeHistoricalTraces, playbackProgress, playbackTraceMode]);
  const productionHistoricalTraces = activeHistoricalTraces.filter(feature => !feature.properties.researchOnly);
  const activeHistoricalSides = new Set(productionHistoricalTraces.map(feature => feature.properties.side));
  const activeHistoricalTraceTypes = new Set(productionHistoricalTraces.map(feature => feature.properties.featureType));

  useEffect(() => {
    playbackProgressRef.current = playbackProgress;
  }, [playbackProgress]);

  useEffect(() => {
    if (!playbackPlaying) {
      if (playbackFrameRef.current !== null) cancelAnimationFrame(playbackFrameRef.current);
      playbackFrameRef.current = null;
      lastPlaybackFrameRef.current = null;
      return;
    }
    const tick = (now: number) => {
      const previous = lastPlaybackFrameRef.current ?? now;
      const elapsed = Math.max(0, now - previous);
      lastPlaybackFrameRef.current = now;
      const next = Math.min(1, playbackProgressRef.current + (elapsed / 18000) * playbackSpeed);
      playbackProgressRef.current = next;
      setPlaybackProgress(next);
      if (next >= 1) {
        setPlaybackPlaying(false);
        playbackFrameRef.current = null;
        lastPlaybackFrameRef.current = null;
        return;
      }
      playbackFrameRef.current = requestAnimationFrame(tick);
    };
    playbackFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (playbackFrameRef.current !== null) cancelAnimationFrame(playbackFrameRef.current);
      playbackFrameRef.current = null;
      lastPlaybackFrameRef.current = null;
    };
  }, [playbackPlaying, playbackSpeed]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const mode = preferredRenderer === 'cesium' ? 'cesium' : chooseHistoricalRenderer({
      preferred: preferredRenderer,
      webglAvailable: browserSupportsWebGL(),
      lowCapability: typeof memory === 'number' && memory < 2,
    });
    if (mode === 'atlas') {
      setActiveRenderer('atlas');
      setRendererStatus(preferredRenderer === 'atlas' ? 'idle' : 'fallback');
      return;
    }
    if (rendererRequested) {
      setActiveRenderer(mode);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      setRendererRequested(true);
      setActiveRenderer(mode);
      setRendererStatus('loading');
      observer.disconnect();
    }, { rootMargin: '160px' });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [preferredRenderer, rendererRequested]);

  const sceneStyle = {
    '--camera-scale': preset.scale,
    '--camera-x': `${preset.translateX}%`,
    '--camera-y': `${preset.translateY}%`,
    '--camera-tilt': `${preset.tiltDegrees}deg`,
    '--camera-duration': `${preset.durationMs}ms`,
  } as CSSProperties;

  async function enterBattlefield() {
    if (isFlying) return;
    setIsFlying(true);
    setDetailReady(true);
    setStoryFocus(undefined);
    setCameraId('kinmen');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobile = window.matchMedia('(max-width: 820px)').matches;
    await wait(reduced ? 20 : mobile ? 1000 : 1500);
    setCameraId('guningtou');
    await wait(reduced ? 20 : mobile ? 1100 : 1600);
    setIsFlying(false);
  }

  function resetCamera() {
    setSelectedId(null);
    setStoryFocus(undefined);
    setTourIndex(-1);
    setCameraId('strategic');
    setPlaybackModeActive(false);
    playbackProgressRef.current = 0;
    setPlaybackProgress(0);
    setPlaybackPlaying(false);
    setOpenPanel(null);
  }

  function focusLocation(location: CanonicalLocation, index = canonicalLocations.findIndex(item => item.id === location.id)) {
    setDetailReady(true);
    setSelectedId(location.id);
    setStoryFocus(undefined);
    setTourIndex(index);
    setCameraId(location.properties.locationType === 'landing-zone' || location.properties.locationType === 'coast' ? 'landing_coast' : 'poi_focus');
    setOpenPanel(null);
  }

  function nextTourLocation() {
    const next = (tourIndex + 1 + canonicalLocations.length) % canonicalLocations.length;
    focusLocation(canonicalLocations[next], next);
  }

  function focusStoryZone(zone: (typeof CARTOGRAPHIC_STORY_ZONES)[keyof typeof CARTOGRAPHIC_STORY_ZONES]) {
    setDetailReady(true);
    setSelectedId(null);
    setStoryFocus(zone.focus);
    setCameraId(zone.cameraId);
    setOpenPanel(null);
  }

  function toggleLayer(id: MapLayerId) {
    setEnabledLayers(current => {
      const next = new Set(current);
      if (id === 'battle-movement') {
        const children: MapLayerId[] = ['verified-routes', 'battle-corridors', 'battle-directions'];
        if (next.has(id)) {
          next.delete(id);
          children.forEach(child => next.delete(child));
        } else {
          next.add(id);
          children.forEach(child => next.add(child));
        }
      } else if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        if (['verified-routes', 'battle-corridors', 'battle-directions'].includes(id)) next.add('battle-movement');
      }
      return next;
    });
  }

  function toggleResearchMode() {
    setResearchMode(value => {
      const next = !value;
      setEnabledLayers(current => {
        const layers = new Set(current);
        if (next) layers.add('research-layer');
        else {
          layers.delete('research-layer');
          layers.delete('candidate-routes');
          layers.delete('historical-battle-map');
        }
        return layers;
      });
      return next;
    });
  }

  function setPlaybackPosition(progress: number, play = false) {
    const next = Math.max(0, Math.min(1, progress));
    playbackProgressRef.current = next;
    setPlaybackModeActive(true);
    setPlaybackProgress(next);
    setPlaybackPlaying(play);
  }

  function movePlaybackPhase(direction: -1 | 1) {
    const currentIndex = Math.max(0, historicalPhases.findIndex(phase => phase.id === activePhase?.id));
    const nextIndex = Math.max(0, Math.min(historicalPhases.length - 1, currentIndex + direction));
    setPlaybackPosition(historicalPhases[nextIndex]?.startProgress ?? 0);
  }

  return (
    <section
      className={`historical-map ${compact ? 'historical-map--compact' : ''}`}
      data-camera={cameraId}
      data-renderer={activeRenderer}
      data-renderer-status={rendererStatus}
      data-research-mode={researchMode ? 'on' : 'off'}
      data-battle-focus={cameraId !== 'strategic' && enabledLayers.has('battle-movement') ? 'on' : 'off'}
      aria-label={dictionary.title}
    >
      <div ref={viewportRef} className="historical-map__viewport" style={sceneStyle}>
        {rendererRequested && activeRenderer === 'three' && (
          <Suspense fallback={null}>
            <ThreeHistoricalTerrainRenderer
              base={base}
              compact={compact}
              features={visibleFeatures}
              historicalTraces={activeHistoricalTraces}
              historicalTraceProgress={historicalTraceProgress}
              cameraId={cameraId}
              activeDate={activeStep.date}
              focus={selectedLocation?.geometry.coordinates ?? storyFocus}
              labelsEnabled={labelsEnabled}
              layers={{ enabled: enabledLayers, researchMode }}
              selectedId={selectedId}
              onInteraction={() => {
                setInteractionHintVisible(false);
                setFollowBattle(false);
              }}
              onSelectFeature={id => {
                const location = canonicalLocations.find(item => item.id === id);
                if (location) focusLocation(location);
              }}
              onSelectHistoricalTrace={id => {
                setSelectedTraceId(id);
                setResearchMode(true);
                setDetailReady(true);
              }}
              onReady={() => {
                setTerrainSource('srtm-reference');
                setRendererStatus('ready');
              }}
              onError={() => {
                setActiveRenderer('atlas');
                setRendererStatus('fallback');
              }}
            />
          </Suspense>
        )}
        {rendererRequested && activeRenderer === 'cesium' && (
          <Suspense fallback={null}>
            <CesiumHistoricalRenderer
              base={base}
              compact={compact}
              features={rendererFeatures}
              cameraId={cameraId}
              focus={selectedLocation?.geometry.coordinates ?? storyFocus}
              layers={{ enabled: enabledLayers, researchMode }}
              timeline={{ activeDate: activeStep.date }}
              onSelectFeature={id => {
                const location = canonicalLocations.find(item => item.id === id);
                if (location) focusLocation(location);
              }}
              onReady={source => {
                setTerrainSource(source);
                setRendererStatus('ready');
              }}
              onError={() => {
                setActiveRenderer('atlas');
                setRendererStatus('fallback');
              }}
            />
          </Suspense>
        )}
        <div className="historical-map__atmosphere" aria-hidden="true" />
        <div className={`historical-map__world ${terrainEnabled ? '' : 'historical-map__world--flat'} ${rendererStatus === 'ready' ? 'historical-map__world--renderer-hidden' : ''}`} aria-hidden={rendererStatus === 'ready'}>
          <div className="historical-map__strategic" aria-hidden={cameraId !== 'strategic'}>
            <svg className="historical-map__strategic-svg" viewBox="0 0 1000 620" role="img" aria-label="金廈戰略空間示意圖">
              <defs>
                <linearGradient id="sea-depth" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#202a2b"/><stop offset="1" stopColor="#111817"/></linearGradient>
                <linearGradient id="land-relief" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7c7868"/><stop offset="1" stopColor="#4c4b40"/></linearGradient>
                <filter id="atlas-shadow"><feDropShadow dx="0" dy="18" stdDeviation="15" floodColor="#070908" floodOpacity=".48"/></filter>
              </defs>
              <rect width="1000" height="620" fill="url(#sea-depth)"/>
              <g className="historical-map__soundings" fill="none" stroke="#9aa092" strokeOpacity=".12">
                <path d="M35 145 C240 72 420 98 610 40 S880 20 980 70"/><path d="M22 232 C235 155 443 188 646 112 S870 92 995 134"/>
                <path d="M0 420 C210 350 425 398 610 324 S824 286 1000 324"/><path d="M5 520 C190 470 390 515 575 452 S815 412 1000 462"/>
              </g>
              <path className="historical-map__land historical-map__land--mainland" filter="url(#atlas-shadow)" d="M0 0 H315 C300 55 326 112 286 156 C250 195 272 242 230 280 C189 318 218 367 164 410 C118 447 127 510 85 548 C55 576 24 586 0 590 Z" fill="url(#land-relief)"/>
              <path className="historical-map__land" filter="url(#atlas-shadow)" d="M610 198 C676 158 786 162 854 210 C902 244 929 309 892 358 C846 418 742 428 659 394 C594 368 558 311 579 259 C587 235 598 214 610 198 Z" fill="url(#land-relief)"/>
              <path className="historical-map__islet" d="M481 162 C512 144 555 148 571 171 C582 190 561 210 523 210 C490 209 459 187 481 162 Z"/>
              <path className="historical-map__islet" d="M574 132 C598 119 631 125 640 146 C647 164 626 180 599 177 C571 174 555 147 574 132 Z"/>
              <path className="historical-map__islet" d="M372 340 C401 320 446 328 458 350 C471 377 435 393 400 385 C370 378 351 356 372 340 Z"/>
              <path className="historical-map__flow" d="M254 230 C372 188 476 232 606 264" fill="none"/>
              {labelsEnabled && <g className="historical-map__strategic-labels">
                <text x="330" y="130">XIAMEN</text><text x="508" y="145">DADENG</text><text x="598" y="112">XIAODENG</text>
                <text x="721" y="303" className="historical-map__strategic-label--major">KINMEN</text><text x="646" y="214">GUNINGTOU</text>
              </g>}
              <circle className="historical-map__guningtou-beacon" cx="651" cy="226" r="8"/>
            </svg>
          </div>

          <div className={`historical-map__detail ${detailReady ? 'historical-map__detail--ready' : ''}`} aria-hidden={!detailReady}>
            {imageryEnabled && detailReady && <img className="historical-map__aerial" src={`${base.replace(/\/$/, '')}/aerial-1944.png`} alt="" loading="lazy" />}
            <div className="historical-map__detail-wash" aria-hidden="true" />
            {terrainEnabled && <svg className="historical-map__contours" viewBox="0 0 1000 620" aria-hidden="true">
              <g fill="none" stroke="currentColor">
                <path d="M88 494 C210 390 345 445 443 344 S690 225 892 286"/><path d="M72 530 C224 414 368 478 472 372 S724 250 925 314"/>
                <path d="M120 430 C240 348 337 380 418 300 S646 190 846 246"/><path d="M170 376 C274 314 354 324 432 264 S618 182 792 208"/>
                <path d="M238 310 C322 266 392 270 462 220 S601 158 728 170"/>
              </g>
            </svg>}
            {enabledLayers.has('modern-reference') && <div className="historical-map__graticule" aria-label="Modern reference grid" />}

            {rendererStatus !== 'ready' && poiEnabled && visibleFeatures.map(feature => {
              const location = canonicalLocations.find(item => item.id === feature.id);
              if (!location) return null;
              const point = projectPosition(location.geometry.coordinates);
              const active = selectedId === location.id;
              const related = activeStep.relatedLocations.includes(location.id);
              return (
                <button
                  type="button"
                  key={location.id}
                  className={`historical-map__poi historical-map__poi--${location.properties.locationType} ${active ? 'historical-map__poi--active' : ''} ${related ? 'historical-map__poi--related' : ''}`}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  onClick={() => focusLocation(location)}
                  aria-label={`${localized(location.properties.historicalName, lang)} · ${location.properties.id}`}
                >
                  <span className="historical-map__poi-dot" />
                  {labelsEnabled && <span className="historical-map__poi-label">{localized(location.properties.historicalName, lang)}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {sourceMapEnabled && detailReady && (
          <figure className="historical-map__source-overlay" style={{ opacity: sourceMapOpacity }} aria-label={dictionary.sourceMap}>
            <img src={base.replace(/\/$/, '') + '/map-data/historical-battle-map.jpg'} alt="古寧頭戰役路線圖（示意性套準）" />
            <figcaption>
              <strong>{dictionary.sourceMap}</strong>
              <span>{dictionary.sourceMapRegistration}</span>
              <label><span>OPACITY</span><input type="range" min="0" max="1" step=".05" value={sourceMapOpacity} onChange={event => setSourceMapOpacity(Number(event.target.value))} aria-label="Historical battle map opacity" /></label>
            </figcaption>
          </figure>
        )}

        <div className={`historical-map__intro ${cameraId === 'strategic' ? '' : 'historical-map__intro--departed'}`}>
          <p className="historical-map__eyebrow">{dictionary.eyebrow}</p>
          <h1>{dictionary.title}</h1>
          <p className="historical-map__lede">{dictionary.intro}</p>
          <button type="button" className="historical-map__primary-action" onClick={enterBattlefield} disabled={isFlying}>
            <span>{isFlying ? 'CAMERA FLY-TO…' : dictionary.enter}</span><span aria-hidden="true">↘</span>
          </button>
          <p className="historical-map__schematic">{dictionary.schematic}</p>
        </div>

        <div className="historical-map__scale" aria-live="polite">
          <span>{cameraId === 'strategic' || cameraId === 'kinmen' ? dictionary.scaleStrategic : dictionary.scaleBattlefield}</span>
          <i /><strong>{cameraId === 'strategic' ? '01' : cameraId === 'kinmen' ? '02' : '03'}</strong>
        </div>

        {detailReady && imageryEnabled && <div className="historical-map__imagery-status">{dictionary.imageryPending}</div>}
        {rendererStatus === 'ready' && <div className="historical-map__geographic-status"><span>{activeRenderer === 'three' ? 'CARTOGRAPHIC TERRAIN · 2.25× RELIEF' : dictionary.geographicReference}</span><strong>{terrainSource === 'srtm-reference' ? 'OSM SURFACE · SRTM ELEVATION · MODERN REFERENCE' : terrainSource === 'cesium-world-terrain' ? dictionary.worldTerrain : dictionary.ellipsoid}</strong></div>}
        {rendererStatus === 'fallback' && <div className="historical-map__renderer-fallback" role="status">{dictionary.rendererFallback}</div>}
        {rendererStatus === 'ready' && interactionHintVisible && <aside className="historical-map__interaction-hint" aria-label="Map interaction help">{dictionary.interactionHint}</aside>}
        {!terrainIsolationQa && cameraId !== 'strategic' && enabledLayers.has('historical-battle-traces') && <aside className="historical-map__source-trace-legend" aria-label={dictionary.battleLegend}>
          <strong>{dictionary.battleLegend.toUpperCase()}</strong>
          {activeHistoricalSides.has('pla') && <span><i className="is-pla" />{dictionary.plaAttack}</span>}
          {activeHistoricalSides.has('roc') && <span><i className="is-roc" />{dictionary.rocCounterattack}</span>}
          {([...activeHistoricalTraceTypes].some(type => ['battle_front', 'defensive_line'].includes(type))) && <span><i className="is-front" />{dictionary.rocDefense}</span>}
          {([...activeHistoricalTraceTypes].some(type => ['battle_area', 'historical_movement_corridor'].includes(type))) && <span><i className="is-area" />{dictionary.battleArea}</span>}
          <small>{productionHistoricalTraces.length} reviewed traces · {dictionary.sourceTraceDisclaimer}</small>
        </aside>}
        {!terrainIsolationQa && cameraId !== 'strategic' && enabledLayers.has('battle-movement') && (productionMovements.length > 0 || researchMode) && <aside className="historical-map__movement-legend" aria-label="Battle movement legend">
          <strong>{dictionary.battleMovement.toUpperCase()}</strong>
          {activeMovementTypes.has('direction') && <span><i className="is-axis" />{dictionary.attackAxis}</span>}
          {activeMovementTypes.has('corridor') && <span className="historical-map__movement-legend-item"><i className="is-corridor" /><b>{dictionary.movementCorridor}</b><small>{dictionary.corridorNote}</small></span>}
          {activeMovementTypes.has('route') && <span><i className="is-route" />{dictionary.verifiedRoute}</span>}
          <small>{productionMovements.length ? `${activeStep.date} · ${productionMovements.length} approved` : dictionary.noMovementGeometry}</small>
        </aside>}
        {!terrainIsolationQa && cameraId !== 'strategic' && enabledLayers.has('battle-movement') && !productionMovements.length && !productionHistoricalTraces.length && <aside className="historical-map__empty-movement-note" role="status">{dictionary.noMovementGeometry}</aside>}
        {rendererStatus === 'ready' && detailReady && imageryEnabled && <figure className="historical-map__imagery-preview">
          <img src={`${base.replace(/\/$/, '')}/aerial-1944.png`} alt="1944 Aerial Photograph" loading="lazy" />
          <figcaption><strong>1944 AERIAL PHOTOGRAPH</strong><span>GEOREFERENCE PENDING</span></figcaption>
        </figure>}

        <nav className="historical-map__controls" aria-label="Historical map controls">
          <button type="button" onClick={enterBattlefield}>{dictionary.explore}</button>
          <button type="button" onClick={() => document.getElementById('battle-map-timeline')?.scrollIntoView({ block: 'nearest' })}>{dictionary.timeline}</button>
          <button type="button" onClick={() => setOpenPanel(openPanel === 'locations' ? null : 'locations')} aria-expanded={openPanel === 'locations'}>{dictionary.locations}</button>
          <a href={`${base.replace(/\/$/, '')}/${lang}/stories/`}>{dictionary.stories}</a>
          <button type="button" onClick={() => setOpenPanel(openPanel === 'layers' ? null : 'layers')} aria-expanded={openPanel === 'layers'}>{dictionary.layers}</button>
          <button type="button" onClick={toggleResearchMode} aria-pressed={researchMode}>{dictionary.researchShort}</button>
          <button type="button" onClick={resetCamera}>{dictionary.reset}</button>
        </nav>

        {openPanel === 'layers' && (
          <aside className="historical-map__layer-panel" aria-label="Layer Manager">
            <div className="historical-map__panel-head"><span>LAYER MANAGER</span><button type="button" onClick={() => setOpenPanel(null)} aria-label={dictionary.close}>×</button></div>
            <button type="button" className={`historical-map__research-toggle ${researchMode ? 'is-active' : ''}`} onClick={toggleResearchMode} aria-pressed={researchMode}>
              <span>{dictionary.research}</span><i>{researchMode ? 'ON' : 'OFF'}</i>
            </button>
            <div className="historical-map__layer-list">
              {LAYER_DEFINITIONS.map(layer => {
                const gated = layer.id === 'historical-imagery' || (layer.id === 'research-layer' && !researchMode) || (layer.id === 'historical-battle-map' && !researchMode);
                const layerLabel = layer.id === 'battle-movement' ? dictionary.battleMovement : layer.id === 'historical-battle-traces' ? dictionary.sourceTrace : layer.id === 'historical-battle-map' ? dictionary.sourceMap : layer.id === 'verified-routes' ? `↳ ${dictionary.verifiedRoute}` : layer.id === 'battle-corridors' ? `↳ ${dictionary.movementCorridor}` : layer.id === 'battle-directions' ? `↳ ${dictionary.attackAxis}` : layer.label;
                return <button type="button" key={layer.id} disabled={gated} onClick={() => toggleLayer(layer.id)} aria-pressed={enabledLayers.has(layer.id)}>
                  <span className="historical-map__layer-check">{enabledLayers.has(layer.id) ? '●' : '○'}</span><span>{layerLabel}</span><small>{layer.dataCount || '—'}</small>
                </button>;
              })}
            </div>
            {researchMode && <div className="historical-map__movement-research">
              <p>MODERN REFERENCE · OSM / ODbL · ACQUIRED 2026-08-23<br />SRTM / USGS · ELEVATION ONLY</p>
              {activeMovements.map(feature => <article key={feature.id}>
                <strong>{String(feature.metadata?.label ?? feature.id)}</strong>
                <span>{String(feature.metadata?.movementType)} · {feature.confidence} · {String(feature.metadata?.status)} · {feature.historicalRouteStatus ?? 'not-a-route'}</span>
                <small>SOURCE {feature.sourceIds.join(' · ')}<br />EVIDENCE {(feature.metadata?.evidenceIds as string[] | undefined)?.join(' · ') || 'NONE'}<br />{String(feature.metadata?.provenance)}</small>
              </article>)}
            </div>}
          </aside>
        )}

        {openPanel === 'locations' && (
          <aside className="historical-map__location-panel" aria-label={dictionary.allLocations}>
            <div className="historical-map__panel-head"><span>{dictionary.allLocations}</span><button type="button" onClick={() => setOpenPanel(null)} aria-label={dictionary.close}>×</button></div>
            <div className="historical-map__story-zone-list">{Object.entries(CARTOGRAPHIC_STORY_ZONES).map(([id, zone]) => <button type="button" key={id} onClick={() => focusStoryZone(zone)}><span>ZONE</span><strong>{zone.label}</strong><small>{id}</small></button>)}</div>
            {canonicalLocations.map((location, index) => <button type="button" key={location.id} onClick={() => focusLocation(location, index)}>
              <span>{String(index + 1).padStart(2, '0')}</span><strong>{localized(location.properties.historicalName, lang)}</strong><small>{locationTypeLabel[location.properties.locationType] ?? location.properties.locationType}</small>
            </button>)}
          </aside>
        )}

        {selectedLocation && (
          <aside className="historical-map__poi-card" aria-live="polite">
            <div className="historical-map__poi-card-head">
              <span>{locationTypeLabel[selectedLocation.properties.locationType] ?? selectedLocation.properties.locationType} · {selectedLocation.id}</span>
              <button type="button" onClick={() => setSelectedId(null)} aria-label={dictionary.close}>×</button>
            </div>
            <h2>{localized(selectedLocation.properties.historicalName, lang)}</h2>
            <p>{localized(selectedLocation.properties.notes, lang) ?? selectedLocation.properties.coordinateProvenance.notes ?? dictionary.missing}</p>
            <dl className="historical-map__poi-data">
              <div><dt>{dictionary.date}</dt><dd>{dictionary.missing}</dd></div>
              <div><dt>{dictionary.people}</dt><dd>{dictionary.missing}</dd></div>
              <div><dt>{dictionary.events}</dt><dd>{dictionary.missing}</dd></div>
              <div><dt>{dictionary.media}</dt><dd>{dictionary.missing}</dd></div>
              <div><dt>{dictionary.sources}</dt><dd>{selectedLocation.properties.sourceRefs.join(' · ')}</dd></div>
              <div><dt>{dictionary.confidence}</dt><dd><span className={`historical-map__confidence historical-map__confidence--${toHistoricalConfidence(selectedLocation.properties.confidence)}`}>{toHistoricalConfidence(selectedLocation.properties.confidence)}</span></dd></div>
            </dl>
            {researchMode && <div className="historical-map__research-meta">
              <span>POINT · EPSG:4326</span><code>{selectedLocation.geometry.coordinates.join(', ')}</code>
              <span>{selectedLocation.properties.verificationStatus} · {selectedLocation.properties.coordinateProvenance.coordinatePrecision}</span>
              <span>{String(locationFeatures.find(feature => feature.id === selectedLocation.id)?.metadata?.referenceEra ?? 'historical_approximate')}</span>
            </div>}
            <button type="button" className="historical-map__tour-button" onClick={nextTourLocation}>{tourIndex < 0 ? dictionary.tour : dictionary.nextPoi} <span>→</span></button>
          </aside>
        )}

        {selectedTrace && (
          <aside className="historical-map__trace-card" aria-live="polite">
            <div className="historical-map__poi-card-head">
              <span>{dictionary.sourceReview} · {selectedTrace.id}</span>
              <button type="button" onClick={() => setSelectedTraceId(null)} aria-label={dictionary.close}>×</button>
            </div>
            <h2>{historicalTraceVisitorLabel(selectedTrace, lang === 'zh-tw' ? 'zh-Hant' : lang)}</h2>
            <p className="historical-map__trace-source-label">{historicalTraceSourceLabel(selectedTrace, lang === 'zh-tw' ? 'zh-Hant' : lang)}</p>
            <p>{selectedTrace.properties.notes}</p>
            <dl className="historical-map__poi-data">
              <div><dt>VISITOR LABEL</dt><dd>{historicalTraceVisitorLabel(selectedTrace, lang === 'zh-tw' ? 'zh-Hant' : lang)}</dd></div>
              <div><dt>SOURCE LABEL</dt><dd>{historicalTraceSourceLabel(selectedTrace, lang === 'zh-tw' ? 'zh-Hant' : lang)}</dd></div>
              <div><dt>SOURCE TRACE ID</dt><dd>{selectedTrace.id}</dd></div>
              <div><dt>FEATURE</dt><dd>{selectedTrace.properties.featureType}</dd></div>
              <div><dt>SIDE</dt><dd>{selectedTrace.properties.side}</dd></div>
              <div><dt>CONFIDENCE</dt><dd>{selectedTrace.properties.confidence}</dd></div>
              <div><dt>REGISTRATION</dt><dd>{selectedTrace.properties.registrationMethod}</dd></div>
              <div><dt>SOURCE IMAGE</dt><dd>{selectedTrace.properties.sourceImage}</dd></div>
              <div><dt>SOURCE</dt><dd>{selectedTrace.properties.sourceIds.join(' · ')}</dd></div>
            </dl>
            <p className="historical-map__trace-disclaimer">{dictionary.sourceTraceDisclaimer}</p>
            {researchMode && <img src={base.replace(/\/$/, '') + '/map-data/historical-battle-map.jpg'} alt={dictionary.sourceMap} loading="lazy" />}
          </aside>
        )}

        {!selectedLocation && cameraId !== 'strategic' && <aside className="historical-map__integrity-note"><strong>{dictionary.mapMeaning}</strong><span>{dictionary.mapMeaningBody}</span></aside>}
      </div>

      <div id="battle-map-timeline" className="historical-map__timeline">
        <div className="historical-map__timeline-copy">
          <span>{activeStep.date}</span><strong>{localized(activeStep.label, lang)}</strong><p>{activeStep.date === '1949-10-27' ? dictionary.noMovementGeometry : localized(activeStep.summary, lang)}</p>
          <small>{activeStep.eventIds.join(' · ')} · {activeStep.sourceIds.join(' · ')}</small>
        </div>
        <div className="historical-map__timeline-control">
          <input type="range" min="0" max="2" step="1" value={effectiveDay} onChange={event => { const index = Number(event.target.value); setActiveDay(index); setPlaybackPosition(historicalPhases.find(phase => phase.date === GUNINGTOU_TIMELINE_STEPS[index].date)?.startProgress ?? 0); }} aria-label="Battle timeline date" />
          <div>{GUNINGTOU_TIMELINE_STEPS.map((step, index) => <button type="button" key={step.id} className={index === effectiveDay ? 'is-active' : ''} onClick={() => { setActiveDay(index); setPlaybackPosition(historicalPhases.find(phase => phase.date === step.date)?.startProgress ?? 0); }}>{step.date.slice(5)}</button>)}</div>
        </div>
        <div className="historical-map__playback" data-playback-state={playbackPlaying ? 'playing' : 'paused'} data-playback-progress={playbackProgress.toFixed(3)}>
          <div className="historical-map__playback-head">
            <span>{activePhase?.date ?? activeStep.date}</span>
            <strong>{localized(activePhase?.title, lang) ?? localized(activeStep.label, lang)}</strong>
            <small>{researchMode ? activePhase?.id ?? '—' : `${Math.round(playbackProgress * 100)}%`}</small>
          </div>
          <div className="historical-map__playback-controls">
            <button type="button" onClick={() => movePlaybackPhase(-1)} aria-label={dictionary.previousPhase}>←</button>
            <button type="button" className="is-primary" onClick={() => setPlaybackPosition(playbackProgress >= 1 ? 0 : playbackProgress, !playbackPlaying)}>{playbackPlaying ? dictionary.pause : dictionary.play}</button>
            <button type="button" onClick={() => movePlaybackPhase(1)} aria-label={dictionary.nextPhase}>→</button>
            <span className="historical-map__playback-speed" aria-label="Playback speed">
              {[0.5, 1, 2].map(speed => <button type="button" key={speed} className={playbackSpeed === speed ? 'is-active' : ''} onClick={() => setPlaybackSpeed(speed as 0.5 | 1 | 2)}>{speed}×</button>)}
            </span>
            <label className="historical-map__follow-toggle"><input type="checkbox" checked={followBattle} onChange={event => { setFollowBattle(event.target.checked); if (event.target.checked) setCameraId('battle_overview'); }} />{dictionary.followBattle}</label>
          </div>
          <input type="range" min="0" max="1000" step="1" value={Math.round(playbackProgress * 1000)} onChange={event => setPlaybackPosition(Number(event.target.value) / 1000)} aria-label="Continuous battle progress" />
          <div className="historical-map__phase-strip">{historicalPhases.map(phase => <button type="button" key={phase.id} className={phase.id === activePhase?.id ? 'is-active' : ''} onClick={() => setPlaybackPosition(phase.startProgress)}>{localized(phase.title, lang)}</button>)}</div>
        </div>
      </div>
    </section>
  );
}
