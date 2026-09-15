import { useEffect, useRef, useState } from 'react';
import type {
  RegionContourMode,
  RegionLightingMode,
  RegionPresetId,
  RegionPerformanceTier,
  RegionTerrainQualityId,
  RegionVariantId,
} from '../config/region.js';
import {
  HISTORICAL_AERIAL_MODES,
  type HistoricalAerialMode,
} from '../config/historicalAerial.js';
import { REGION_CONFIG, REGION_TERRAIN_QUALITY, REGION_VARIANTS } from '../config/region.js';
import { REGION_COMPOSITION_QUALITY } from '../config/region.js';
import { RegionScene, type RegionDebugState, type RegionLoadingStage, type RegionSceneStats } from '../prototypes/region/RegionScene.js';
import { chooseRegionTier } from '../prototypes/region/RegionPerformance.js';

type AppStage = 'shell' | RegionLoadingStage;

const STAGE_COPY: Record<AppStage, { label: string; detail: string; progress: number }> = {
  shell: { label: '介面外殼', detail: '準備戰略地理視圖', progress: 12 },
  terrain: { label: '區域地形', detail: '載入現代高程輪廓', progress: 38 },
  material: { label: '地形材質', detail: '套用地圖分類遮罩', progress: 58 },
  atmosphere: { label: '海面／大氣', detail: '建立金廈海域的空間層次', progress: 78 },
  labels: { label: '地理標註', detail: '平衡尺度感知地名', progress: 92 },
  ready: { label: 'GATE A.3 可審查', detail: '歷史航照藝術方向／無影像佔位', progress: 100 },
};

const DEFAULT_DEBUG: RegionDebugState = {
  wireframe: false,
  texture: true,
  ocean: true,
  fog: true,
  shadow: true,
  postProcessing: true,
  labels: true,
};

const VERTICAL_OPTIONS = [1, 1.5, REGION_CONFIG.terrain.verticalExaggeration, 2, 2.5] as const;
const QUALITY_OPTIONS: RegionTerrainQualityId[] = ['A', 'B', 'C'];

interface ReviewConfiguration {
  preset: RegionPresetId;
  variant: RegionVariantId;
  quality: RegionTerrainQualityId;
  vertical: number;
  lighting: RegionLightingMode;
  historicalMode?: HistoricalAerialMode;
}

interface Props {
  base?: string;
}

function deviceProfile() {
  if (typeof window === 'undefined') return { mobile: false, reducedMotion: false, tier: 'HIGH' as RegionPerformanceTier };
  const mobile = window.matchMedia('(max-width: 820px)').matches;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const tier = chooseRegionTier({
    mobile,
    deviceMemory: memory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    pixelRatio: window.devicePixelRatio,
  });
  return { mobile, reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches, tier };
}

export default function RegionPrototype({ base = import.meta.env.BASE_URL }: Props) {
  const benchmarkMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('benchmark');
  const compositionMode = !benchmarkMode;
  const historicalReviewMode = !benchmarkMode && !(typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('composition'));
  const [profile, setProfile] = useState({ mobile: false, reducedMotion: false, tier: 'HIGH' as RegionPerformanceTier });
  const [profileReady, setProfileReady] = useState(false);
  const sceneMountRef = useRef<HTMLDivElement>(null);
  const labelMountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<RegionScene | null>(null);
  const [stage, setStage] = useState<AppStage>('shell');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<RegionPresetId>('hero');
  const [variant, setVariant] = useState<RegionVariantId>('neutral');
  const [terrainQuality, setTerrainQuality] = useState<RegionTerrainQualityId>('B');
  const [verticalExaggeration, setVerticalExaggeration] = useState<number>(1.5);
  const [lightingMode, setLightingMode] = useState<RegionLightingMode>('CURRENT');
  const [historicalMode, setHistoricalMode] = useState<HistoricalAerialMode>('OFF');
  const [aerialOpacity, setAerialOpacity] = useState(0);
  const [coverageMaskDebug, setCoverageMaskDebug] = useState(false);
  const [contourMode, setContourMode] = useState<RegionContourMode>('SUBTLE');
  const [aoEnabled, setAoEnabled] = useState(true);
  const [coastDebug, setCoastDebug] = useState(false);
  const [debug, setDebug] = useState<RegionDebugState>(DEFAULT_DEBUG);
  const [debugOpen, setDebugOpen] = useState(import.meta.env.DEV);
  const [stats, setStats] = useState<RegionSceneStats | null>(null);
  const [battlefieldNotice, setBattlefieldNotice] = useState(false);
  const stageCopy = STAGE_COPY[stage];

  useEffect(() => {
    setProfile(deviceProfile());
    setProfileReady(true);
  }, []);

  useEffect(() => {
    if (status !== 'ready') return undefined;
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    const benchmark = params.get('benchmark');
    const composition = params.get('composition');
    const historical = params.get('historical');
    const requestedPreset = params.get('camera');
    const requestedVariant = params.get('variant');
    const requestedQuality = params.get('quality')?.toUpperCase();
    const requestedVertical = Number(params.get('vertical'));
    const shotConfigs: Record<string, ReviewConfiguration> = {
      wide: { preset: 'hero', variant: 'neutral', quality: 'A', vertical: REGION_CONFIG.terrain.verticalExaggeration, lighting: 'CURRENT', historicalMode: 'OFF' },
      kinmen: { preset: 'kinmen', variant: 'cinematic', quality: 'A', vertical: REGION_CONFIG.terrain.verticalExaggeration, lighting: 'CURRENT', historicalMode: 'OFF' },
      guningtou: { preset: 'guningtou', variant: 'historical', quality: 'A', vertical: REGION_CONFIG.terrain.verticalExaggeration, lighting: 'CURRENT', historicalMode: 'OFF' },
      mobile: { preset: 'hero', variant: 'neutral', quality: 'A', vertical: REGION_CONFIG.terrain.verticalExaggeration, lighting: 'CURRENT', historicalMode: 'OFF' },
    };
    const benchmarkConfigs: Record<string, ReviewConfiguration> = {
      'a-wide': { preset: 'hero', variant: 'neutral', quality: 'A', vertical: REGION_CONFIG.terrain.verticalExaggeration, lighting: 'CURRENT', historicalMode: 'OFF' },
      'b-wide-1': { preset: 'hero', variant: 'neutral', quality: 'B', vertical: 1, lighting: 'RELIEF', historicalMode: 'OFF' },
      'b-wide-1.5': { preset: 'hero', variant: 'neutral', quality: 'B', vertical: 1.5, lighting: 'RELIEF', historicalMode: 'OFF' },
      'b-wide-2': { preset: 'hero', variant: 'neutral', quality: 'B', vertical: 2, lighting: 'RELIEF', historicalMode: 'OFF' },
      'c-wide-1': { preset: 'hero', variant: 'neutral', quality: 'C', vertical: 1, lighting: 'RELIEF', historicalMode: 'OFF' },
      'c-wide-1.5': { preset: 'hero', variant: 'neutral', quality: 'C', vertical: 1.5, lighting: 'RELIEF', historicalMode: 'OFF' },
      'c-wide-2': { preset: 'hero', variant: 'neutral', quality: 'C', vertical: 2, lighting: 'RELIEF', historicalMode: 'OFF' },
      'b-kinmen': { preset: 'kinmen', variant: 'cinematic', quality: 'B', vertical: 1.5, lighting: 'RELIEF', historicalMode: 'OFF' },
      'b-guningtou': { preset: 'guningtou', variant: 'historical', quality: 'B', vertical: 1.5, lighting: 'RELIEF', historicalMode: 'OFF' },
      'c-kinmen': { preset: 'kinmen', variant: 'cinematic', quality: 'C', vertical: 1.5, lighting: 'RELIEF', historicalMode: 'OFF' },
      'c-guningtou': { preset: 'guningtou', variant: 'historical', quality: 'C', vertical: 1.5, lighting: 'RELIEF', historicalMode: 'OFF' },
    };
    const compositionConfigs: Record<string, ReviewConfiguration> = {
      'a2-wide': { preset: 'hero', variant: 'neutral', quality: 'B', vertical: 1.5, lighting: 'RELIEF', historicalMode: 'OFF' },
      'a2-xiamen': { preset: 'xiamen', variant: 'neutral', quality: 'B', vertical: 1.5, lighting: 'RELIEF', historicalMode: 'OFF' },
      'a2-kinmen': { preset: 'kinmen', variant: 'neutral', quality: 'B', vertical: 1.5, lighting: 'RELIEF', historicalMode: 'OFF' },
      'a2-guningtou': { preset: 'guningtou', variant: 'historical', quality: 'B', vertical: 1.5, lighting: 'RELIEF', historicalMode: 'OFF' },
      'a2-rotated-wide': { preset: 'hero', variant: 'neutral', quality: 'B', vertical: 1.5, lighting: 'RELIEF', historicalMode: 'OFF' },
    };
    const historicalConfigs: Record<string, ReviewConfiguration> = {
      'a3-wide-historical-daylight': { preset: 'hero', variant: 'neutral', quality: 'B', vertical: 1.5, lighting: 'CURRENT', historicalMode: 'OFF' },
      'a3-wide-aerial-archive': { preset: 'hero', variant: 'historical', quality: 'B', vertical: 1.5, lighting: 'RELIEF', historicalMode: 'AERIAL' },
      'a3-kinmen-base': { preset: 'kinmen', variant: 'neutral', quality: 'B', vertical: 1.5, lighting: 'CURRENT', historicalMode: 'OFF' },
      'a3-kinmen-aerial': { preset: 'kinmen', variant: 'historical', quality: 'B', vertical: 1.5, lighting: 'CURRENT', historicalMode: 'AERIAL' },
      'a3-guningtou-base': { preset: 'guningtou', variant: 'neutral', quality: 'B', vertical: 1.5, lighting: 'CURRENT', historicalMode: 'OFF' },
      'a3-guningtou-aerial': { preset: 'guningtou', variant: 'historical', quality: 'B', vertical: 1.5, lighting: 'CURRENT', historicalMode: 'AERIAL' },
      'a3-guningtou-aerial-relief': { preset: 'guningtou', variant: 'historical', quality: 'B', vertical: 1.5, lighting: 'RELIEF', historicalMode: 'AERIAL_RELIEF' },
      'a3-mobile': { preset: 'hero', variant: 'neutral', quality: 'B', vertical: 1.5, lighting: 'CURRENT', historicalMode: 'OFF' },
    };
    const shotConfig = shot ? shotConfigs[shot] : undefined;
    const benchmarkConfig = benchmark ? benchmarkConfigs[benchmark] : undefined;
    const compositionConfig = composition ? compositionConfigs[composition] : undefined;
    const historicalConfig = historical ? historicalConfigs[historical] : undefined;
    const queryConfig = historicalConfig ?? benchmarkConfig ?? compositionConfig ?? shotConfig;
    if (queryConfig || params.get('debug') === 'closed') setDebugOpen(false);
    if (params.get('debug') === 'open') setDebugOpen(true);
    const presetIds: RegionPresetId[] = ['hero', 'xiamen', 'kinmen', 'guningtou'];
    const variantIds: RegionVariantId[] = ['neutral', 'cinematic', 'historical'];
    const nextPreset = presetIds.includes(requestedPreset as RegionPresetId)
      ? requestedPreset as RegionPresetId
      : queryConfig?.preset ?? null;
    const nextVariant = variantIds.includes(requestedVariant as RegionVariantId)
      ? requestedVariant as RegionVariantId
      : queryConfig?.variant ?? null;
    const nextQuality = QUALITY_OPTIONS.includes(requestedQuality as RegionTerrainQualityId)
      ? requestedQuality as RegionTerrainQualityId
      : queryConfig?.quality ?? null;
    const nextVertical = Number.isFinite(requestedVertical) && requestedVertical >= 1 && requestedVertical <= 2.5
      ? requestedVertical
      : queryConfig?.vertical ?? null;
    const nextLighting = queryConfig?.lighting ?? null;
    const nextHistoricalMode = queryConfig?.historicalMode ?? null;
    if (nextPreset) {
      setPreset(nextPreset);
      sceneRef.current?.flyTo(nextPreset);
    }
    if (nextVariant) {
      setVariant(nextVariant);
      sceneRef.current?.setVariant(nextVariant);
    }
    if (nextHistoricalMode) {
      setHistoricalMode(nextHistoricalMode);
      sceneRef.current?.setHistoricalMode(nextHistoricalMode);
    }
    if (nextQuality) void chooseTerrainQuality(nextQuality, nextVertical ?? undefined, nextLighting ?? undefined);
    else if (nextVertical) chooseVertical(nextVertical);
    if (composition === 'a2-rotated-wide') {
      window.setTimeout(() => sceneRef.current?.setReviewRotation(58), 1_250);
    }
    return undefined;
  }, [status]);

  useEffect(() => {
    const mount = sceneMountRef.current;
    const labelMount = labelMountRef.current;
    if (!mount || !labelMount || !profileReady) return undefined;
    let disposed = false;
    let scene: RegionScene | null = null;
    const handleResize = () => scene?.resize();
    const initialize = async () => {
      try {
        scene = await RegionScene.create({
          container: mount,
          labelContainer: labelMount,
          base,
          mobile: profile.mobile,
          reducedMotion: profile.reducedMotion,
          tier: profile.tier,
          variant,
          labelsVisible: true,
          qualitySource: benchmarkMode ? 'benchmark' : 'composition',
          initialQuality: benchmarkMode ? 'A' : 'B',
          initialVerticalExaggeration: benchmarkMode ? REGION_CONFIG.terrain.verticalExaggeration : 1.5,
          initialLightingMode: 'CURRENT',
          initialHistoricalMode: historicalMode,
          initialHistoricalToneEnabled: historicalReviewMode,
          initialAerialOpacity: aerialOpacity,
          onStage: nextStage => {
            if (!disposed) setStage(nextStage);
          },
          onReady: () => {
            if (!disposed) setStatus('ready');
          },
          onInteraction: () => setBattlefieldNotice(false),
          onError: nextError => {
            if (!disposed) {
              setError(nextError instanceof Error ? nextError.message : String(nextError));
              setStatus('error');
            }
          },
        });
        if (disposed) {
          scene.dispose();
          return;
        }
        sceneRef.current = scene;
        scene.resize();
        scene.setDebugState(debug);
      } catch (nextError) {
        if (!disposed) {
          setError(nextError instanceof Error ? nextError.message : String(nextError));
          setStatus('error');
        }
      }
    };
    void initialize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      sceneRef.current = null;
      scene?.dispose();
    };
  }, [base, profile.mobile, profile.reducedMotion, profile.tier, profileReady]);

  useEffect(() => {
    if (!sceneRef.current) return undefined;
    const interval = window.setInterval(() => setStats(sceneRef.current?.getStats() ?? null), 500);
    return () => window.clearInterval(interval);
  }, [status, debugOpen]);

  function flyTo(nextPreset: RegionPresetId) {
    setPreset(nextPreset);
    setBattlefieldNotice(false);
    sceneRef.current?.flyTo(nextPreset);
  }

  function reset() {
    setPreset('hero');
    setBattlefieldNotice(false);
    sceneRef.current?.reset();
  }

  function chooseVariant(nextVariant: RegionVariantId) {
    setVariant(nextVariant);
    sceneRef.current?.setVariant(nextVariant);
  }

  function chooseVertical(nextVertical: number) {
    setVerticalExaggeration(nextVertical);
    sceneRef.current?.setVerticalExaggeration(nextVertical);
    refreshStats();
  }

  function chooseLighting(nextLighting: RegionLightingMode) {
    setLightingMode(nextLighting);
    sceneRef.current?.setLightingMode(nextLighting);
    refreshStats();
  }

  function chooseContour(nextContour: RegionContourMode) {
    setContourMode(nextContour);
    sceneRef.current?.setContourMode(nextContour);
    refreshStats();
  }

  function chooseHistoricalMode(nextMode: HistoricalAerialMode) {
    setHistoricalMode(nextMode);
    sceneRef.current?.setHistoricalMode(nextMode);
    if (nextMode === 'AERIAL_RELIEF') chooseLighting('RELIEF');
    refreshStats();
  }

  function chooseAerialOpacity(nextOpacity: number) {
    const next = Math.min(100, Math.max(0, Math.round(nextOpacity)));
    setAerialOpacity(next);
    sceneRef.current?.setAerialOpacity(next);
    refreshStats();
  }

  function toggleCoverageMaskDebug() {
    setCoverageMaskDebug(current => {
      const next = !current;
      sceneRef.current?.setCoverageMaskDebug(next);
      refreshStats();
      return next;
    });
  }

  function toggleAo() {
    setAoEnabled(current => {
      const next = !current;
      sceneRef.current?.setAmbientOcclusionEnabled(next);
      refreshStats();
      return next;
    });
  }

  function toggleCoastDebug() {
    setCoastDebug(current => {
      const next = !current;
      sceneRef.current?.setCoastDebug(next);
      refreshStats();
      return next;
    });
  }

  function refreshStats() {
    const scene = sceneRef.current;
    if (scene) setStats(scene.getStats());
  }

  async function chooseTerrainQuality(nextQuality: RegionTerrainQualityId, preferredVertical?: number, preferredLighting?: RegionLightingMode) {
    const nextVertical = preferredVertical ?? (nextQuality === 'A' ? REGION_CONFIG.terrain.verticalExaggeration : 1.5);
    const nextLighting = preferredLighting ?? (nextQuality === 'A' ? 'CURRENT' : 'RELIEF');
    setTerrainQuality(nextQuality);
    setVerticalExaggeration(nextVertical);
    setLightingMode(nextLighting);
    sceneRef.current?.setLightingMode(nextLighting);
    await sceneRef.current?.setTerrainQuality(nextQuality);
    sceneRef.current?.setVerticalExaggeration(nextVertical);
    refreshStats();
  }

  function toggleDebug(key: keyof RegionDebugState) {
    setDebug(current => {
      const next = { ...current, [key]: !current[key] };
      sceneRef.current?.setDebugState({ [key]: next[key] });
      return next;
    });
  }

  function enterBattlefield() {
    setPreset('guningtou');
    setBattlefieldNotice(true);
    sceneRef.current?.flyTo('guningtou');
  }

  const statsText = stats
    ? `${Math.round(stats.fps || 0)} FPS · ${stats.calls} CALLS · ${stats.triangles.toLocaleString()} TRI`
    : 'MEASURING RENDER';
  const qualityConfig = terrainQuality === 'A' || !compositionMode ? REGION_TERRAIN_QUALITY[terrainQuality] : REGION_COMPOSITION_QUALITY[terrainQuality];

  return (
    <div className="region-app">
      <div className="region-app__grain" aria-hidden="true" />
      <header className="region-topbar">
        <div className="region-mark">
          <span className="region-mark__index">1949</span>
          <span className="region-mark__name">古寧頭／歷史地形原型</span>
        </div>
        <div className="region-breadcrumb">
          <span>藝術方向</span>
          <i />
          <span>區域</span>
          <i />
          <strong>GATE A.3</strong>
        </div>
        <div className="region-topbar__status">
          <span className={`region-status-dot region-status-dot--${status}`} />
          <span>{status === 'ready' ? '即時渲染／THREE.JS' : status === 'error' ? '渲染錯誤' : stageCopy.label}</span>
        </div>
      </header>

      <main className="region-main">
        <section className="region-viewport" aria-label="金門廈門戰略地形原型">
          <div ref={sceneMountRef} className="region-scene-mount" />
          <div ref={labelMountRef} className="region-label-mount" />
          <div className="region-viewport__wash" aria-hidden="true" />
          <div className="region-viewport__grid" aria-hidden="true" />
          <div className="region-viewport__vignette" aria-hidden="true" />

          <div className="region-hero-copy">
            <p className="region-kicker"><span /> 戰略地形／01 <small>STRATEGIC TERRAIN</small></p>
            <h1>金門 <em>—</em> 廈門</h1>
            <p className="region-hero-copy__english">KINMEN — XIAMEN</p>
            <p className="region-hero-copy__lede">一水之隔，兩岸對峙。<br />從金廈海域，重新理解古寧頭戰場的地理尺度。</p>
            <div className="region-hero-copy__rule" />
            <p className="region-hero-copy__caption">歷史地形原型／1945 航照來源審查<br /><span>REALTIME BROWSER PROTOTYPE · MODERN ELEVATION REFERENCE</span></p>
          </div>

          <div className="region-source-callout">
            <span>1945 航照影像</span>
            <strong>資料授權確認中</strong>
            <small>中央研究院人社中心／地理資訊科學研究專題中心</small>
          </div>

          <div className="region-compass" aria-hidden="true">
            <span className="region-compass__ring" />
            <span className="region-compass__north">N</span>
            <span className="region-compass__needle" />
            <span className="region-compass__scale">5 km</span>
          </div>

          <div className="region-map-meta">
            <div><span>24°</span><span>24°</span><span>24°</span></div>
            <p>金廈海域／東亞</p>
          </div>

          <div className="region-stage-status" aria-live="polite">
            <div className="region-stage-status__top"><span>LOAD {String(stageCopy.progress).padStart(3, '0')}</span><span>{stageCopy.label}</span></div>
            <div className="region-progress"><span style={{ width: `${stageCopy.progress}%` }} /></div>
            <p>{stageCopy.detail}</p>
          </div>

          <div className="region-camera-dock" aria-label="鏡頭控制">
            <button type="button" className={preset === 'hero' ? 'is-active' : ''} onClick={() => flyTo('hero')}>全域</button>
            <button type="button" className={preset === 'xiamen' ? 'is-active' : ''} onClick={() => flyTo('xiamen')}>廈門</button>
            <button type="button" className={preset === 'kinmen' ? 'is-active' : ''} onClick={() => flyTo('kinmen')}>金門</button>
            <button type="button" className={preset === 'guningtou' ? 'is-active' : ''} onClick={() => flyTo('guningtou')}>古寧頭</button>
            <button type="button" className="region-camera-dock__reset" onClick={reset} aria-label="重設全域鏡頭">↺</button>
          </div>

          <div className="region-controls-hint">
            <span>拖曳</span> 旋轉 <i /> <span>滾輪</span> 縮放 <i /> <span>中鍵</span> 平移
          </div>

          <div className="region-enter-card">
            <span className="region-enter-card__eyebrow">下一尺度／WS2</span>
            <strong>進入古寧頭戰場</strong>
            <p>朝古寧頭海岸前進<br />測試尺度邊界。</p>
            <button type="button" onClick={enterBattlefield}>進入探索 <span>↗</span></button>
            {battlefieldNotice && <div className="region-enter-card__notice">戰場原型<br />— 尚未載入</div>}
          </div>

          {status === 'error' && <div className="region-error" role="alert">{error ?? 'Unable to initialize the Gate A renderer.'}</div>}
        </section>

        <aside className="region-side-rail">
          <div className="region-side-rail__heading"><span>01</span><div><strong>區域</strong><small>GEOGRAPHIC RELATIONSHIP</small></div></div>
          <p className="region-side-rail__body">第一道藝術關卡不是近距離地圖，而是廈門、金門、烈嶼與戰役起點海岸之間的距離。</p>
          <div className="region-side-rail__line" />
          <div className="region-variant-picker">
            <div className="region-variant-picker__label"><span>光影模式</span><small>LIGHTING STUDIES／選擇模式</small></div>
            {(Object.entries(REGION_VARIANTS) as Array<[RegionVariantId, typeof REGION_VARIANTS[RegionVariantId]]>).map(([id, item], index) => (
              <button type="button" className={variant === id ? 'is-selected' : ''} onClick={() => chooseVariant(id)} key={id}>
                <span className="region-variant-picker__index">{String.fromCharCode(65 + index)}</span>
                <span><strong>{item.label}<em>{item.englishLabel}</em></strong><small>{item.description}<br />{item.englishDescription}</small></span>
                <i />
              </button>
            ))}
          </div>
          <div className="region-side-rail__foot"><span>資料界線／DATA BOUNDARY</span><strong>現代地形參考</strong><small>地形高程／海岸線／分類遮罩</small></div>
          <div className="region-data-legend">
            <div><i className="is-terrain" /><span>地形高程<small>現代參考</small></span></div>
            <div><i className="is-coast" /><span>海岸線<small>現代 OSM 參考</small></span></div>
            <div><i className="is-aerial" /><span>1945 航照<small>歷史影像／尚待授權</small></span></div>
            <div><i className="is-battle" /><span>戰役資料<small>尚未載入</small></span></div>
          </div>
          <div className="region-source-panel">
            <div><span>歷史來源／SOURCE</span><strong>Kinmen_1945／1945</strong></div>
            <p>中央研究院人社中心／地理資訊科學研究專題中心<br />OGC WMTS · PNG · EPSG:3857</p>
            <small>權利狀態：資料授權確認中／不載入像素</small>
          </div>
        </aside>
      </main>

      {import.meta.env.DEV && debugOpen && (
        <aside className="region-debug" aria-label="僅開發環境顯示的區域除錯面板">
          <div className="region-debug__title"><strong>開發／藝術審查 <small>DEV / ART REVIEW</small></strong><button type="button" onClick={() => setDebugOpen(false)}>×</button></div>
          <div className="region-debug__readout"><span>{statsText}</span><span>{profile.tier} 等級 · {terrainQuality} / {verticalExaggeration.toFixed(2)}×</span></div>
          <div className="region-debug__section">
            <div className="region-debug__section-label"><span>地形品質 <small>TERRAIN QUALITY</small></span><small>{qualityConfig.description}</small></div>
            <div className="region-debug__choices">
              {QUALITY_OPTIONS.map(id => (
                <button type="button" className={terrainQuality === id ? 'is-selected' : ''} onClick={() => void chooseTerrainQuality(id)} key={id}>{id}<small>{id === 'A' || !compositionMode ? REGION_TERRAIN_QUALITY[id].grid : REGION_COMPOSITION_QUALITY[id].grid}</small></button>
              ))}
            </div>
          </div>
          <div className="region-debug__section">
            <div className="region-debug__section-label"><span>垂直比例 <small>VERTICAL SCALE</small></span><small>僅渲染時誇張</small></div>
            <div className="region-debug__choices region-debug__choices--five">
              {VERTICAL_OPTIONS.map(value => (
                <button type="button" className={Math.abs(verticalExaggeration - value) < 0.001 ? 'is-selected' : ''} onClick={() => chooseVertical(value)} key={value}>{value === REGION_CONFIG.terrain.verticalExaggeration ? 'A 原始' : `${value.toFixed(1)}×`}</button>
              ))}
            </div>
          </div>
          <div className="region-debug__section">
            <div className="region-debug__section-label"><span>光影／等高線 <small>LIGHT / CONTOUR</small></span><small>優先檢視地形起伏</small></div>
            <div className="region-debug__choices">
              {(['CURRENT', 'RELIEF'] as RegionLightingMode[]).map(value => <button type="button" className={lightingMode === value ? 'is-selected' : ''} onClick={() => chooseLighting(value)} key={value}>{value === 'CURRENT' ? '歷史日光' : '地形浮雕'}</button>)}
            </div>
            <div className="region-debug__choices region-debug__choices--three">
              {(['OFF', 'SUBTLE', 'STRONG'] as RegionContourMode[]).map(value => <button type="button" className={contourMode === value ? 'is-selected' : ''} onClick={() => chooseContour(value)} key={value}>{value === 'OFF' ? '關閉' : value === 'SUBTLE' ? '細緻' : '強化'}</button>)}
            </div>
          </div>
          <div className="region-debug__section region-debug__historical">
            <div className="region-debug__section-label"><span>歷史影像層 <small>HISTORICAL AERIAL</small></span><small>1945／SOURCE REVIEW</small></div>
            <div className="region-debug__choices">
              {HISTORICAL_AERIAL_MODES.map(item => (
                <button type="button" className={historicalMode === item.id ? 'is-selected' : ''} onClick={() => chooseHistoricalMode(item.id)} key={item.id}>{item.label}<small>{item.englishLabel}</small></button>
              ))}
            </div>
            <div className="region-debug__range-label"><span>航照不透明度</span><output>{aerialOpacity}%</output></div>
            <input className="region-debug__range" type="range" min="0" max="100" step="1" value={aerialOpacity} onChange={event => chooseAerialOpacity(Number(event.currentTarget.value))} aria-label="1945 航照不透明度" />
            <div className="region-debug__choices region-debug__choices--five region-debug__opacity-steps">
              {[0, 25, 50, 75, 100].map(value => <button type="button" className={aerialOpacity === value ? 'is-selected' : ''} onClick={() => chooseAerialOpacity(value)} key={value}>{value}%</button>)}
            </div>
            <button type="button" className={`region-debug__coverage ${coverageMaskDebug ? 'is-on' : ''}`} onClick={toggleCoverageMaskDebug}>資料範圍界線／COVERAGE MASK <i /></button>
            <p className="region-debug__blocked">1945 航照 — 資料授權確認中。此狀態不請求、不快取航照像素。</p>
          </div>
          <div className="region-debug__grid">
            {([
              ['wireframe', '地形線框／WIREFRAME'], ['texture', '材質遮罩／TEXTURES'], ['ocean', '海面著色／OCEAN'],
              ['fog', '距離霧／FOG'], ['shadow', '日光陰影／SHADOW'], ['postProcessing', '色調映射／TONE'], ['labels', '地名標註／LABELS'],
            ] as Array<[keyof RegionDebugState, string]>).map(([key, label]) => (
              <button type="button" className={debug[key] ? 'is-on' : ''} onClick={() => toggleDebug(key)} key={key}>{label}<i /></button>
            ))}
            <button type="button" className={aoEnabled ? 'is-on' : ''} onClick={toggleAo}>環境／接觸 AO<i /></button>
            <button type="button" className={coastDebug ? 'is-on' : ''} onClick={toggleCoastDebug}>海岸 {coastDebug ? '除錯' : '正常'}<i /></button>
          </div>
          {stats && <div className="region-debug__stats">品質 {stats.quality} · 網格 {stats.regionGrid}<br />{stats.regionVertices.toLocaleString()} 頂點 · {stats.regionTriangles.toLocaleString()} 三角 · DRAW {stats.calls}<br />材質 {stats.textures} · GPU 約 {Math.round(stats.gpuEstimateBytes / 1024)} KB · 載荷 {Math.round(stats.assetPayloadBytes / 1024)} KB<br />海岸 {stats.coastlineResolution}<br />來源 {stats.terrainSource}<br />鏡頭 {stats.cameraPosition} → {stats.cameraTarget} · 距離 {stats.cameraConstraints.distance.toFixed(1)}<br />垂直 {stats.verticalExaggeration.toFixed(2)}× · 光影 {stats.lightingMode} · 等高線 {stats.contourMode}<br />1945 {stats.aerialStatus} · 年代 {stats.aerialYear} · 透明度 {stats.aerialOpacity}%<br />航照解析度 {stats.aerialTextureResolution}<br />航照範圍 {stats.aerialBounds}<br />對齊 {stats.aerialAlignment} · payload {stats.aerialPayloadBytes} B<br />3D {stats.firstMeaningful3dMs?.toFixed(0) ?? '—'}ms · READY {stats.gateReadyMs?.toFixed(0) ?? '—'}ms</div>}
        </aside>
      )}
      {import.meta.env.DEV && !debugOpen && <button type="button" className="region-debug-reopen" onClick={() => setDebugOpen(true)}>QA</button>}

      <footer className="region-footer"><span>GATE A.3／歷史航照藝術方向</span><span>戰役資料尚未載入</span><span>1949 — 2.0 原型</span></footer>
    </div>
  );
}
