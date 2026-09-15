import { useEffect, useRef, useState } from 'react';
import type {
  RegionContourMode,
  RegionLightingMode,
  RegionPresetId,
  RegionPerformanceTier,
  RegionTerrainQualityId,
  RegionVariantId,
} from '../config/region.js';
import { REGION_CONFIG, REGION_TERRAIN_QUALITY, REGION_VARIANTS } from '../config/region.js';
import { RegionScene, type RegionDebugState, type RegionLoadingStage, type RegionSceneStats } from '../prototypes/region/RegionScene.js';
import { chooseRegionTier } from '../prototypes/region/RegionPerformance.js';

type AppStage = 'shell' | RegionLoadingStage;

const STAGE_COPY: Record<AppStage, { label: string; detail: string; progress: number }> = {
  shell: { label: 'INTERFACE SHELL', detail: 'Preparing the strategic view', progress: 12 },
  terrain: { label: 'LOW-DETAIL TERRAIN', detail: 'Loading regional elevation silhouette', progress: 38 },
  material: { label: 'TERRAIN MATERIAL', detail: 'Applying cartographic classification masks', progress: 58 },
  atmosphere: { label: 'OCEAN / ATMOSPHERE', detail: 'Bringing the Strait into relief', progress: 78 },
  labels: { label: 'GEOGRAPHIC LABELS', detail: 'Balancing scale-aware place names', progress: 92 },
  ready: { label: 'GATE A READY', detail: 'Cinematic Strategic Terrain', progress: 100 },
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
  const [terrainQuality, setTerrainQuality] = useState<RegionTerrainQualityId>('A');
  const [verticalExaggeration, setVerticalExaggeration] = useState<number>(REGION_CONFIG.terrain.verticalExaggeration);
  const [lightingMode, setLightingMode] = useState<RegionLightingMode>('CURRENT');
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
    const requestedPreset = params.get('camera');
    const requestedVariant = params.get('variant');
    const requestedQuality = params.get('quality')?.toUpperCase();
    const requestedVertical = Number(params.get('vertical'));
    const shotConfigs: Record<string, ReviewConfiguration> = {
      wide: { preset: 'hero', variant: 'neutral', quality: 'A', vertical: REGION_CONFIG.terrain.verticalExaggeration, lighting: 'CURRENT' },
      kinmen: { preset: 'kinmen', variant: 'cinematic', quality: 'A', vertical: REGION_CONFIG.terrain.verticalExaggeration, lighting: 'CURRENT' },
      guningtou: { preset: 'guningtou', variant: 'historical', quality: 'A', vertical: REGION_CONFIG.terrain.verticalExaggeration, lighting: 'CURRENT' },
      mobile: { preset: 'hero', variant: 'neutral', quality: 'A', vertical: REGION_CONFIG.terrain.verticalExaggeration, lighting: 'CURRENT' },
    };
    const benchmarkConfigs: Record<string, ReviewConfiguration> = {
      'a-wide': { preset: 'hero', variant: 'neutral', quality: 'A', vertical: REGION_CONFIG.terrain.verticalExaggeration, lighting: 'CURRENT' },
      'b-wide-1': { preset: 'hero', variant: 'neutral', quality: 'B', vertical: 1, lighting: 'RELIEF' },
      'b-wide-1.5': { preset: 'hero', variant: 'neutral', quality: 'B', vertical: 1.5, lighting: 'RELIEF' },
      'b-wide-2': { preset: 'hero', variant: 'neutral', quality: 'B', vertical: 2, lighting: 'RELIEF' },
      'c-wide-1': { preset: 'hero', variant: 'neutral', quality: 'C', vertical: 1, lighting: 'RELIEF' },
      'c-wide-1.5': { preset: 'hero', variant: 'neutral', quality: 'C', vertical: 1.5, lighting: 'RELIEF' },
      'c-wide-2': { preset: 'hero', variant: 'neutral', quality: 'C', vertical: 2, lighting: 'RELIEF' },
      'b-kinmen': { preset: 'kinmen', variant: 'cinematic', quality: 'B', vertical: 1.5, lighting: 'RELIEF' },
      'b-guningtou': { preset: 'guningtou', variant: 'historical', quality: 'B', vertical: 1.5, lighting: 'RELIEF' },
      'c-kinmen': { preset: 'kinmen', variant: 'cinematic', quality: 'C', vertical: 1.5, lighting: 'RELIEF' },
      'c-guningtou': { preset: 'guningtou', variant: 'historical', quality: 'C', vertical: 1.5, lighting: 'RELIEF' },
    };
    const shotConfig = shot ? shotConfigs[shot] : undefined;
    const benchmarkConfig = benchmark ? benchmarkConfigs[benchmark] : undefined;
    const queryConfig = benchmarkConfig ?? shotConfig;
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
    if (nextPreset) {
      setPreset(nextPreset);
      sceneRef.current?.flyTo(nextPreset);
    }
    if (nextVariant) {
      setVariant(nextVariant);
      sceneRef.current?.setVariant(nextVariant);
    }
    if (nextQuality) void chooseTerrainQuality(nextQuality, nextVertical ?? undefined, nextLighting ?? undefined);
    else if (nextVertical) chooseVertical(nextVertical);
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

  return (
    <div className="region-app">
      <div className="region-app__grain" aria-hidden="true" />
      <header className="region-topbar">
        <div className="region-mark">
          <span className="region-mark__index">1949</span>
          <span className="region-mark__name">GUNINGTOU / 古寧頭</span>
        </div>
        <div className="region-breadcrumb">
          <span>ART DIRECTION</span>
          <i />
          <span>REGION</span>
          <i />
          <strong>GATE A.1</strong>
        </div>
        <div className="region-topbar__status">
          <span className={`region-status-dot region-status-dot--${status}`} />
          <span>{status === 'ready' ? 'REALTIME / THREE.JS' : status === 'error' ? 'RENDER ERROR' : stageCopy.label}</span>
        </div>
      </header>

      <main className="region-main">
        <section className="region-viewport" aria-label="Kinmen Xiamen strategic terrain prototype">
          <div ref={sceneMountRef} className="region-scene-mount" />
          <div ref={labelMountRef} className="region-label-mount" />
          <div className="region-viewport__wash" aria-hidden="true" />
          <div className="region-viewport__grid" aria-hidden="true" />
          <div className="region-viewport__vignette" aria-hidden="true" />

          <div className="region-hero-copy">
            <p className="region-kicker"><span /> STRATEGIC TERRAIN / 01</p>
            <h1>KINMEN<br /><em>—</em> XIAMEN</h1>
            <p className="region-hero-copy__lede">One strait. Two shores.<br />A battlefield seen at geographic scale.</p>
            <div className="region-hero-copy__rule" />
            <p className="region-hero-copy__caption">CINEMATIC STRATEGIC TERRAIN<br /><span>REALTIME BROWSER PROTOTYPE · MODERN ELEVATION REFERENCE</span></p>
          </div>

          <div className="region-compass" aria-hidden="true">
            <span className="region-compass__ring" />
            <span className="region-compass__north">N</span>
            <span className="region-compass__needle" />
            <span className="region-compass__scale">5 km</span>
          </div>

          <div className="region-map-meta">
            <div><span>24°</span><span>24°</span><span>24°</span></div>
            <p>TAIWAN STRAIT / EAST ASIA</p>
          </div>

          <div className="region-stage-status" aria-live="polite">
            <div className="region-stage-status__top"><span>LOAD {String(stageCopy.progress).padStart(3, '0')}</span><span>{stageCopy.label}</span></div>
            <div className="region-progress"><span style={{ width: `${stageCopy.progress}%` }} /></div>
            <p>{stageCopy.detail}</p>
          </div>

          <div className="region-camera-dock" aria-label="Camera controls">
            <button type="button" className={preset === 'hero' ? 'is-active' : ''} onClick={() => flyTo('hero')}>WIDE</button>
            <button type="button" className={preset === 'xiamen' ? 'is-active' : ''} onClick={() => flyTo('xiamen')}>XIAMEN</button>
            <button type="button" className={preset === 'kinmen' ? 'is-active' : ''} onClick={() => flyTo('kinmen')}>KINMEN</button>
            <button type="button" className={preset === 'guningtou' ? 'is-active' : ''} onClick={() => flyTo('guningtou')}>GUNINGTOU</button>
            <button type="button" className="region-camera-dock__reset" onClick={reset} aria-label="Reset hero camera">↺</button>
          </div>

          <div className="region-controls-hint">
            <span>DRAG</span> ROTATE <i /> <span>WHEEL</span> ZOOM <i /> <span>MIDDLE</span> PAN
          </div>

          <div className="region-enter-card">
            <span className="region-enter-card__eyebrow">NEXT SCALE / WS2</span>
            <strong>ENTER BATTLEFIELD</strong>
            <p>Fly toward the Guningtou coast<br />and test the scale boundary.</p>
            <button type="button" onClick={enterBattlefield}>EXPLORE <span>↗</span></button>
            {battlefieldNotice && <div className="region-enter-card__notice">BATTLEFIELD PROTOTYPE<br />— NOT LOADED</div>}
          </div>

          {status === 'error' && <div className="region-error" role="alert">{error ?? 'Unable to initialize the Gate A renderer.'}</div>}
        </section>

        <aside className="region-side-rail">
          <div className="region-side-rail__heading"><span>01</span><div><strong>REGION</strong><small>GEOGRAPHIC RELATIONSHIP</small></div></div>
          <p className="region-side-rail__body">The first art gate is not a close-up map. It is the distance between Xiamen, Kinmen, Lieyu, and the coast where the battle begins.</p>
          <div className="region-side-rail__line" />
          <div className="region-variant-picker">
            <div className="region-variant-picker__label"><span>LIGHTING STUDIES</span><small>SELECT ONE</small></div>
            {(Object.entries(REGION_VARIANTS) as Array<[RegionVariantId, typeof REGION_VARIANTS[RegionVariantId]]>).map(([id, item], index) => (
              <button type="button" className={variant === id ? 'is-selected' : ''} onClick={() => chooseVariant(id)} key={id}>
                <span className="region-variant-picker__index">{String.fromCharCode(65 + index)}</span>
                <span><strong>{item.label}</strong><small>{item.description}</small></span>
                <i />
              </button>
            ))}
          </div>
          <div className="region-side-rail__foot"><span>DATA BOUNDARY</span><strong>MODERN REFERENCE</strong><small>DEM / COASTLINE / CLASSIFICATION</small></div>
        </aside>
      </main>

      {import.meta.env.DEV && debugOpen && (
        <aside className="region-debug" aria-label="Development only region debug panel">
          <div className="region-debug__title"><strong>DEV / ART REVIEW</strong><button type="button" onClick={() => setDebugOpen(false)}>×</button></div>
          <div className="region-debug__readout"><span>{statsText}</span><span>{profile.tier} TIER · {terrainQuality} / {verticalExaggeration.toFixed(2)}×</span></div>
          <div className="region-debug__section">
            <div className="region-debug__section-label"><span>TERRAIN QUALITY</span><small>{REGION_TERRAIN_QUALITY[terrainQuality].description}</small></div>
            <div className="region-debug__choices">
              {QUALITY_OPTIONS.map(id => (
                <button type="button" className={terrainQuality === id ? 'is-selected' : ''} onClick={() => void chooseTerrainQuality(id)} key={id}>{id}<small>{REGION_TERRAIN_QUALITY[id].grid}</small></button>
              ))}
            </div>
          </div>
          <div className="region-debug__section">
            <div className="region-debug__section-label"><span>VERTICAL SCALE</span><small>render-only exaggeration</small></div>
            <div className="region-debug__choices region-debug__choices--five">
              {VERTICAL_OPTIONS.map(value => (
                <button type="button" className={Math.abs(verticalExaggeration - value) < 0.001 ? 'is-selected' : ''} onClick={() => chooseVertical(value)} key={value}>{value === REGION_CONFIG.terrain.verticalExaggeration ? 'A CURRENT' : `${value.toFixed(1)}×`}</button>
              ))}
            </div>
          </div>
          <div className="region-debug__section">
            <div className="region-debug__section-label"><span>LIGHT / CONTOUR</span><small>relief-first review</small></div>
            <div className="region-debug__choices">
              {(['CURRENT', 'RELIEF'] as RegionLightingMode[]).map(value => <button type="button" className={lightingMode === value ? 'is-selected' : ''} onClick={() => chooseLighting(value)} key={value}>{value}</button>)}
            </div>
            <div className="region-debug__choices region-debug__choices--three">
              {(['OFF', 'SUBTLE', 'STRONG'] as RegionContourMode[]).map(value => <button type="button" className={contourMode === value ? 'is-selected' : ''} onClick={() => chooseContour(value)} key={value}>{value}</button>)}
            </div>
          </div>
          <div className="region-debug__grid">
            {([
              ['wireframe', 'TERRAIN WIREFRAME'], ['texture', 'TEXTURE MASKS'], ['ocean', 'OCEAN SHADER'],
              ['fog', 'DISTANCE HAZE'], ['shadow', 'SUN SHADOW'], ['postProcessing', 'TONE MAPPING'], ['labels', 'LABELS'],
            ] as Array<[keyof RegionDebugState, string]>).map(([key, label]) => (
              <button type="button" className={debug[key] ? 'is-on' : ''} onClick={() => toggleDebug(key)} key={key}>{label}<i /></button>
            ))}
            <button type="button" className={aoEnabled ? 'is-on' : ''} onClick={toggleAo}>AMBIENT / CONTACT AO<i /></button>
            <button type="button" className={coastDebug ? 'is-on' : ''} onClick={toggleCoastDebug}>COAST {coastDebug ? 'DEBUG' : 'NORMAL'}<i /></button>
          </div>
          {stats && <div className="region-debug__stats">QUALITY {stats.quality} · GRID {stats.regionGrid}<br />{stats.regionVertices.toLocaleString()} VTX · {stats.regionTriangles.toLocaleString()} TRI · DRAW {stats.calls}<br />TEX {stats.textures} · GPU EST {Math.round(stats.gpuEstimateBytes / 1024)} KB · PAYLOAD {Math.round(stats.assetPayloadBytes / 1024)} KB<br />COAST {stats.coastlineResolution}<br />SOURCE {stats.terrainSource}<br />CAM {stats.cameraPosition} → {stats.cameraTarget} · RANGE {stats.cameraConstraints.distance.toFixed(1)}<br />VERT {stats.verticalExaggeration.toFixed(2)}× · LIGHT {stats.lightingMode} · CONTOUR {stats.contourMode}<br />3D {stats.firstMeaningful3dMs?.toFixed(0) ?? '—'}ms · READY {stats.gateReadyMs?.toFixed(0) ?? '—'}ms</div>}
        </aside>
      )}
      {import.meta.env.DEV && !debugOpen && <button type="button" className="region-debug-reopen" onClick={() => setDebugOpen(true)}>QA</button>}

      <footer className="region-footer"><span>GATE A.1 / TERRAIN QUALITY BENCHMARK</span><span>NO BATTLEFIELD DATA LOADED</span><span>1949 — 2.0 PROTOTYPE</span></footer>
    </div>
  );
}
