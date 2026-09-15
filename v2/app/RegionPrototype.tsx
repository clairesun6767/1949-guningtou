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
import {
  ENVIRONMENT_HISTORICAL_MODES,
  type EnvironmentBenchmarkMode,
  type EnvironmentCloudControls,
  type EnvironmentDebugState,
  type EnvironmentTimePreset,
  type EnvironmentWeather,
  type HistoricalBenchmarkMode,
} from '../config/environment.js';
import { HISTORICAL_AERIAL_YEARS, type HistoricalAerialYear } from '../config/historicalAerialRegistry.js';
import type { HistoricalAerialSelectionMode } from '../shared/historicalAerialSelection.js';
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
  ready: { label: 'GATE A.3P 可審查', detail: '多年度航照／統一環境／權利邊界', progress: 100 },
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
const HISTORICAL_BENCHMARK_OPTIONS: HistoricalBenchmarkMode[] = ['H0', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7'];
const ENVIRONMENT_MODE_OPTIONS: EnvironmentBenchmarkMode[] = ['P0', 'P1', 'P2', 'P3'];
const ENVIRONMENT_TIME_OPTIONS: EnvironmentTimePreset[] = ['T0', 'T1', 'T2'];
const ENVIRONMENT_WEATHER_OPTIONS: EnvironmentWeather[] = ['W0', 'W1', 'W2'];
const HISTORICAL_SELECTION_OPTIONS: HistoricalAerialSelectionMode[] = ['smart', 'single', 'comparison', 'distribution'];

function firstQueryValue<T extends string>(value: string | null | undefined, values: readonly T[], fallback: T) {
  return value && values.includes(value as T) ? value as T : fallback;
}

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
  const queryParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const localAerialPoc = queryParams.get('aerial') === 'local';
  const queryHistoricalBenchmark = firstQueryValue(queryParams.get('historical')?.toUpperCase(), HISTORICAL_BENCHMARK_OPTIONS, localAerialPoc ? 'H4' : 'H0');
  const queryEnvironmentMode = firstQueryValue(queryParams.get('environment')?.toUpperCase(), ENVIRONMENT_MODE_OPTIONS, ENVIRONMENT_HISTORICAL_MODES[queryHistoricalBenchmark].environmentMode);
  const queryEnvironmentTime = firstQueryValue(queryParams.get('time')?.toUpperCase(), ENVIRONMENT_TIME_OPTIONS, 'T0');
  const queryEnvironmentWeather = firstQueryValue(queryParams.get('weather')?.toUpperCase(), ENVIRONMENT_WEATHER_OPTIONS, 'W1');
  const querySelectionMode = firstQueryValue(queryParams.get('mode')?.toLowerCase(), HISTORICAL_SELECTION_OPTIONS, ENVIRONMENT_HISTORICAL_MODES[queryHistoricalBenchmark].selectionMode ?? 'smart');
  const queryYear = Number(queryParams.get('year'));
  const queryAerialYear: HistoricalAerialYear = queryYear === 1944 || queryYear === 1958 ? queryYear : 1945;
  const benchmarkMode = queryParams.has('benchmark');
  const compositionMode = !benchmarkMode;
  const historicalReviewMode = !benchmarkMode && !queryParams.has('composition');
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
  const [historicalMode, setHistoricalMode] = useState<HistoricalAerialMode>(ENVIRONMENT_HISTORICAL_MODES[queryHistoricalBenchmark].aerialMode);
  const [aerialOpacity, setAerialOpacity] = useState(localAerialPoc ? 65 : 0);
  const [historicalBenchmarkMode, setHistoricalBenchmarkMode] = useState<HistoricalBenchmarkMode>(queryHistoricalBenchmark);
  const [environmentMode, setEnvironmentMode] = useState<EnvironmentBenchmarkMode>(queryEnvironmentMode);
  const [environmentTime, setEnvironmentTime] = useState<EnvironmentTimePreset>(queryEnvironmentTime);
  const [environmentWeather, setEnvironmentWeather] = useState<EnvironmentWeather>(queryEnvironmentWeather);
  const [historicalSelectionMode, setHistoricalSelectionMode] = useState<HistoricalAerialSelectionMode>(querySelectionMode);
  const [aerialYear, setAerialYear] = useState<HistoricalAerialYear>(queryAerialYear);
  const [aerialYears, setAerialYears] = useState<HistoricalAerialYear[]>([1944, 1945]);
  const [coverageMaskDebug, setCoverageMaskDebug] = useState(false);
  const [contourMode, setContourMode] = useState<RegionContourMode>('SUBTLE');
  const [aoEnabled, setAoEnabled] = useState(true);
  const [coastDebug, setCoastDebug] = useState(false);
  const [debug, setDebug] = useState<RegionDebugState>(DEFAULT_DEBUG);
  const [environmentDebug, setEnvironmentDebug] = useState<EnvironmentDebugState>({
    ocean: true,
    coastalDepth: true,
    oceanMotion: true,
    sunGlint: true,
    clouds: true,
    cloudShadows: true,
    atmosphere: true,
    fog: true,
    shadow: true,
    postProcessing: true,
  });
  const [cloudControls, setCloudControls] = useState<EnvironmentCloudControls>({ coverage: 0.42, opacity: 0.46, altitude: 18, windSpeed: 0.42, shadowStrength: 0.12 });
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
    const requestedHistoricalBenchmark = firstQueryValue(params.get('historical')?.toUpperCase(), HISTORICAL_BENCHMARK_OPTIONS, queryHistoricalBenchmark);
    const requestedEnvironmentMode = firstQueryValue(params.get('environment')?.toUpperCase(), ENVIRONMENT_MODE_OPTIONS, queryEnvironmentMode);
    const requestedEnvironmentTime = firstQueryValue(params.get('time')?.toUpperCase(), ENVIRONMENT_TIME_OPTIONS, queryEnvironmentTime);
    const requestedEnvironmentWeather = firstQueryValue(params.get('weather')?.toUpperCase(), ENVIRONMENT_WEATHER_OPTIONS, queryEnvironmentWeather);
    const requestedSelectionMode = firstQueryValue(params.get('mode')?.toLowerCase(), HISTORICAL_SELECTION_OPTIONS, querySelectionMode);
    const requestedCoverage = params.get('coverage')?.toLowerCase() === 'on';
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
    const historicalBenchmarkConfig = ENVIRONMENT_HISTORICAL_MODES[requestedHistoricalBenchmark];
    setHistoricalBenchmarkMode(requestedHistoricalBenchmark);
    setEnvironmentMode(requestedEnvironmentMode);
    setEnvironmentTime(requestedEnvironmentTime);
    setEnvironmentWeather(requestedEnvironmentWeather);
    setHistoricalSelectionMode(requestedSelectionMode);
    setCoverageMaskDebug(requestedCoverage);
    setAerialYear(queryYear === 1944 || queryYear === 1958 ? queryYear : 1945);
    sceneRef.current?.setEnvironmentBenchmarkMode(requestedEnvironmentMode);
    sceneRef.current?.setEnvironmentTime(requestedEnvironmentTime);
    sceneRef.current?.setEnvironmentWeather(requestedEnvironmentWeather);
    sceneRef.current?.setHistoricalSelectionMode(requestedSelectionMode);
    sceneRef.current?.setCoverageMaskDebug(requestedCoverage);
    sceneRef.current?.setHistoricalYear(queryAerialYear);
    if (historicalBenchmarkConfig && (historical?.match(/^H[0-7]$/i) || localAerialPoc || params.has('environment'))) {
      setHistoricalMode(historicalBenchmarkConfig.aerialMode);
      sceneRef.current?.setHistoricalMode(historicalBenchmarkConfig.aerialMode);
      if (historicalBenchmarkConfig.year) {
        setAerialYear(historicalBenchmarkConfig.year);
        sceneRef.current?.setHistoricalYear(historicalBenchmarkConfig.year);
      }
      if (!params.has('environment') && historicalBenchmarkConfig.environmentMode !== requestedEnvironmentMode) {
        setEnvironmentMode(historicalBenchmarkConfig.environmentMode);
        sceneRef.current?.setEnvironmentBenchmarkMode(historicalBenchmarkConfig.environmentMode);
      }
      if (historicalBenchmarkConfig.aerialMode === 'AERIAL_RELIEF') {
        setLightingMode('RELIEF');
        sceneRef.current?.setLightingMode('RELIEF');
      }
    }
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
    if (params.get('view') === 'top') {
      window.setTimeout(() => sceneRef.current?.setReviewPolar(74), 1_250);
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
          environmentMode,
          initialEnvironmentTime: environmentTime,
          initialEnvironmentWeather: environmentWeather,
          initialEnvironmentDebug: environmentDebug,
          initialEnvironmentCloudControls: cloudControls,
          initialAerialYear: aerialYear,
          initialAerialSelectionMode: historicalSelectionMode,
          initialAerialYears: aerialYears,
          allowLocalAerialPoc: localAerialPoc,
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

  function chooseHistoricalBenchmark(nextMode: HistoricalBenchmarkMode) {
    const preset = ENVIRONMENT_HISTORICAL_MODES[nextMode];
    setHistoricalBenchmarkMode(nextMode);
    setEnvironmentMode(preset.environmentMode);
    setHistoricalMode(preset.aerialMode);
    sceneRef.current?.setEnvironmentBenchmarkMode(preset.environmentMode);
    sceneRef.current?.setHistoricalMode(preset.aerialMode);
    if (preset.selectionMode) {
      setHistoricalSelectionMode(preset.selectionMode);
      sceneRef.current?.setHistoricalSelectionMode(preset.selectionMode);
    }
    if (preset.year) {
      setAerialYear(preset.year);
      sceneRef.current?.setHistoricalYear(preset.year);
    }
    if (nextMode === 'H0') chooseAerialOpacity(0);
    else if (aerialOpacity === 0) chooseAerialOpacity(65);
    if (nextMode === 'H6' || nextMode === 'H7') chooseLighting('RELIEF');
    refreshStats();
  }

  function chooseEnvironmentMode(nextMode: EnvironmentBenchmarkMode) {
    setEnvironmentMode(nextMode);
    sceneRef.current?.setEnvironmentBenchmarkMode(nextMode);
    refreshStats();
  }

  function chooseEnvironmentTime(nextTime: EnvironmentTimePreset) {
    setEnvironmentTime(nextTime);
    sceneRef.current?.setEnvironmentTime(nextTime);
    refreshStats();
  }

  function chooseEnvironmentWeather(nextWeather: EnvironmentWeather) {
    setEnvironmentWeather(nextWeather);
    sceneRef.current?.setEnvironmentWeather(nextWeather);
    refreshStats();
  }

  function chooseHistoricalSelectionMode(nextMode: HistoricalAerialSelectionMode) {
    setHistoricalSelectionMode(nextMode);
    sceneRef.current?.setHistoricalSelectionMode(nextMode);
    refreshStats();
  }

  function chooseAerialYear(nextYear: HistoricalAerialYear) {
    setAerialYear(nextYear);
    sceneRef.current?.setHistoricalYear(nextYear);
    refreshStats();
  }

  function chooseSingleAerialYear(nextYear: HistoricalAerialYear) {
    const benchmark = nextYear === 1944 ? 'H1' : nextYear === 1945 ? 'H2' : 'H3';
    setHistoricalBenchmarkMode(benchmark);
    setHistoricalMode('AERIAL');
    setEnvironmentMode('P2');
    setHistoricalSelectionMode('single');
    chooseAerialYear(nextYear);
    sceneRef.current?.setHistoricalMode('AERIAL');
    sceneRef.current?.setEnvironmentBenchmarkMode('P2');
    sceneRef.current?.setHistoricalSelectionMode('single');
  }

  function toggleAerialYear(nextYear: HistoricalAerialYear) {
    setAerialYears(current => {
      const next = current.includes(nextYear) ? current.filter(year => year !== nextYear) : [...current, nextYear];
      const normalized = next.length ? next : [nextYear];
      sceneRef.current?.setHistoricalYears(normalized);
      refreshStats();
      return normalized;
    });
  }

  function toggleEnvironmentFeature(key: keyof EnvironmentDebugState) {
    setEnvironmentDebug(current => {
      const next = { ...current, [key]: !current[key] };
      sceneRef.current?.setEnvironmentDebug({ [key]: next[key] });
      refreshStats();
      return next;
    });
  }

  function chooseCloudControl(key: keyof EnvironmentCloudControls, value: number) {
    setCloudControls(current => {
      const next = { ...current, [key]: value };
      sceneRef.current?.setEnvironmentCloudControls({ [key]: value });
      refreshStats();
      return next;
    });
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
          <strong>GATE A.3P</strong>
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

          <div className="region-viewport__source-card">
            <span>{stats?.aerialYear ?? aerialYear} 航空照片／低解析 POC</span>
            <strong>歷史影像來源審查</strong>
            <small>中央研究院人社中心／地理資訊科學研究專題中心<br />MODERN DEM 保留；航照像素僅供本機檢視</small>
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
          <section className="region-history-panel" aria-label="歷史航照圖層控制">
            <div className="region-variant-picker__label"><span>歷史圖層</span><small>HISTORICAL AERIAL／資料層</small></div>
            <div className="region-history-cards">
              {HISTORICAL_AERIAL_YEARS.map(year => (
                <button type="button" className={`region-history-card ${aerialYears.includes(year) ? 'is-selected' : ''}`} onClick={() => chooseSingleAerialYear(year)} key={year}>
                  <span className={`region-history-card__thumb region-history-card__thumb--${year}`} aria-hidden="true"><i /></span>
                  <span className="region-history-card__copy"><strong>{year} 航照</strong><small>{year === 1958 ? '後期 fallback／LOCAL POC' : '歷史航空影像／LOCAL POC'}</small></span>
                  <i className="region-history-card__check" />
                </button>
              ))}
            </div>
            <div className="region-history-year-toggles" aria-label="可用歷史年度">
              {HISTORICAL_AERIAL_YEARS.map(year => <button type="button" className={aerialYears.includes(year) ? 'is-on' : ''} onClick={() => toggleAerialYear(year)} key={year}>{year}<i /></button>)}
            </div>
            <div className="region-history-inline">
              <button type="button" className={historicalMode !== 'OFF' ? 'is-on' : ''} onClick={() => chooseHistoricalMode(historicalMode === 'OFF' ? 'AERIAL' : 'OFF')}>航照 ON／OFF <i /></button>
              <button type="button" className={coverageMaskDebug ? 'is-on' : ''} onClick={toggleCoverageMaskDebug}>顯示範圍 <i /></button>
            </div>
            <div className="region-debug__range-label"><span>航照透明度</span><output>{aerialOpacity}%</output></div>
            <input className="region-debug__range" type="range" min="0" max="100" step="1" value={aerialOpacity} onChange={event => chooseAerialOpacity(Number(event.currentTarget.value))} aria-label="航照透明度" />
            <div className="region-history-modes">
              {HISTORICAL_SELECTION_OPTIONS.map(mode => <button type="button" className={historicalSelectionMode === mode ? 'is-selected' : ''} onClick={() => chooseHistoricalSelectionMode(mode)} key={mode}>{mode === 'smart' ? 'A 智慧' : mode === 'single' ? 'B 單年' : mode === 'comparison' ? 'C 比較' : 'D 來源圖'}</button>)}
            </div>
            {historicalSelectionMode === 'distribution' && localAerialPoc && stats?.aerialSourceMaskUrl && (
              <div className="region-source-map-preview">
                <div><span>來源分布／SOURCE MAP</span><small>LOCAL REVIEW</small></div>
                <img src={stats.aerialSourceMaskUrl} alt="1944、1945、1958 與現代基線來源分布" />
                <p><i className="is-1944" />44 <i className="is-1945" />45 <i className="is-1958" />58 <i className="is-base" />BASE</p>
              </div>
            )}
            <p className="region-history-note">1944＋1945 PRIMARY／1958 僅作缺值 fallback<br />TILE-BOUND ALIGNED／NOT VERIFIED ORTHORECTIFIED</p>
          </section>
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
          <div className="region-side-rail__foot"><span>資料界線／DATA BOUNDARY</span><strong>現代地形參考 × 歷史航照</strong><small>DEM 高程／現代海岸線／1944・1945・1958</small></div>
          <div className="region-data-legend">
            <div><i className="is-terrain" /><span>地形高程<small>現代參考</small></span></div>
            <div><i className="is-coast" /><span>海岸線<small>現代 OSM 參考</small></span></div>
            <div><i className="is-aerial" /><span>1944・1945・1958 航照<small>本機 POC／權利審查</small></span></div>
            <div><i className="is-battle" /><span>戰役資料<small>尚未載入</small></span></div>
          </div>
          <div className="region-source-panel">
            <div><span>歷史來源／SOURCE</span><strong>{historicalSelectionMode === 'smart' ? '44＋45 PRIMARY／58 FALLBACK' : `${aerialYear}／LOCAL POC`}</strong></div>
            <p>中央研究院人社中心／地理資訊科學研究專題中心<br />KML MapTilePyramid · PNG · EPSG:3857</p>
            <small>{localAerialPoc ? '本機 POC：像素不公開；權利狀態仍為確認中' : '權利狀態：資料授權確認中／不請求像素'}</small>
          </div>
          <div className="region-source-panel region-source-panel--research">
            <div><span>廈門研究／XIAMEN</span><strong>MAP ONLY／NO AERIAL</strong></div>
            <p>目前僅確認 1938–1946 歷史地圖候選；尚無已驗證的 1943–45 航照 flight／frame／spot。</p>
            <small>候選：Amoy 10K 1938 · Amoy 12.5K 1946 · RG 373 JX</small>
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
            <div className="region-debug__section-label"><span>歷史影像層 <small>HISTORICAL AERIAL</small></span><small>{localAerialPoc ? 'LOCAL POC／RIGHTS REVIEW' : 'SOURCE REVIEW／NO PIXELS'}</small></div>
            <div className="region-debug__choices region-debug__choices--five">
              {HISTORICAL_BENCHMARK_OPTIONS.slice(0, 5).map(id => <button type="button" className={historicalBenchmarkMode === id ? 'is-selected' : ''} onClick={() => chooseHistoricalBenchmark(id)} key={id}>{id}<small>{ENVIRONMENT_HISTORICAL_MODES[id].label}</small></button>)}
            </div>
            <div className="region-debug__choices region-debug__choices--three">
              {HISTORICAL_BENCHMARK_OPTIONS.slice(5).map(id => <button type="button" className={historicalBenchmarkMode === id ? 'is-selected' : ''} onClick={() => chooseHistoricalBenchmark(id)} key={id}>{id}<small>{ENVIRONMENT_HISTORICAL_MODES[id].label}</small></button>)}
            </div>
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
            <p className="region-debug__blocked">1944／1945 為 primary，1958 僅在缺值時 fallback。{localAerialPoc ? '本次為本機低量 POC，像素不會進入 GitHub。' : '未開啟 local POC，不請求、不快取航照像素。'}</p>
          </div>
          <div className="region-debug__section">
            <div className="region-debug__section-label"><span>環境 benchmark <small>ENVIRONMENT／P0–P3</small></span><small>統一太陽／海面／雲／雲影／大氣</small></div>
            <div className="region-debug__choices region-debug__choices--four">
              {ENVIRONMENT_MODE_OPTIONS.map(id => <button type="button" className={environmentMode === id ? 'is-selected' : ''} onClick={() => chooseEnvironmentMode(id)} key={id}>{id}<small>{id === 'P0' ? '基線' : id === 'P1' ? '環境' : id === 'P2' ? '航照' : '航照＋環境'}</small></button>)}
            </div>
            <div className="region-debug__choices region-debug__choices--three">
              {ENVIRONMENT_TIME_OPTIONS.map(id => <button type="button" className={environmentTime === id ? 'is-selected' : ''} onClick={() => chooseEnvironmentTime(id)} key={id}>{id}<small>{id === 'T0' ? '日間' : id === 'T1' ? '晨曦' : '檔案'}</small></button>)}
            </div>
            <div className="region-debug__choices region-debug__choices--three">
              {ENVIRONMENT_WEATHER_OPTIONS.map(id => <button type="button" className={environmentWeather === id ? 'is-selected' : ''} onClick={() => chooseEnvironmentWeather(id)} key={id}>{id}<small>{id === 'W0' ? '晴朗' : id === 'W1' ? '薄雲' : '多雲'}</small></button>)}
            </div>
            <div className="region-debug__grid">
              {(['ocean', 'coastalDepth', 'oceanMotion', 'sunGlint', 'clouds', 'cloudShadows', 'atmosphere'] as Array<keyof EnvironmentDebugState>).map(key => <button type="button" className={environmentDebug[key] ? 'is-on' : ''} onClick={() => toggleEnvironmentFeature(key)} key={key}>{key === 'ocean' ? '海面' : key === 'coastalDepth' ? '海岸深度' : key === 'oceanMotion' ? '海面動態' : key === 'sunGlint' ? '日光閃爍' : key === 'clouds' ? '雲' : key === 'cloudShadows' ? '雲影' : '大氣'}<i /></button>)}
            </div>
            <div className="region-debug__range-label"><span>雲覆蓋</span><output>{Math.round(cloudControls.coverage * 100)}%</output></div>
            <input className="region-debug__range" type="range" min="0" max="100" value={Math.round(cloudControls.coverage * 100)} onChange={event => chooseCloudControl('coverage', Number(event.currentTarget.value) / 100)} aria-label="雲覆蓋" />
            <div className="region-debug__range-label"><span>雲影強度</span><output>{Math.round(cloudControls.shadowStrength * 100)}%</output></div>
            <input className="region-debug__range" type="range" min="0" max="30" value={Math.round(cloudControls.shadowStrength * 100)} onChange={event => chooseCloudControl('shadowStrength', Number(event.currentTarget.value) / 100)} aria-label="雲影強度" />
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
          {stats && <div className="region-debug__metric-strip">CPU frame {stats.frameTimeMs.toFixed(1)} ms · GPU frame —（WebGL 未暴露）</div>}
          {stats && <div className="region-debug__stats">品質 {stats.quality} · 網格 {stats.regionGrid}<br />{stats.regionVertices.toLocaleString()} 頂點 · {stats.regionTriangles.toLocaleString()} 三角 · DRAW {stats.calls}<br />材質 {stats.textures} · GPU 約 {Math.round(stats.gpuEstimateBytes / 1024)} KB · 載荷 {Math.round(stats.assetPayloadBytes / 1024)} KB<br />海岸 {stats.coastlineResolution}<br />來源 {stats.terrainSource}<br />鏡頭 {stats.cameraPosition} → {stats.cameraTarget} · 距離 {stats.cameraConstraints.distance.toFixed(1)}<br />垂直 {stats.verticalExaggeration.toFixed(2)}× · 光影 {stats.lightingMode} · 等高線 {stats.contourMode}<br />航照 {stats.aerialStatus} · 年代 {stats.aerialYear} · 年份 {stats.aerialYears} · 透明度 {stats.aerialOpacity}%<br />選擇 {stats.aerialSelectionMode} · 分布 {stats.aerialSourceDistribution}<br />航照解析度 {stats.aerialTextureResolution} · tiles {stats.aerialTileCount} · bytes {stats.aerialDownloadedBytes}<br />航照範圍 {stats.aerialBounds}<br />對齊 {stats.aerialAlignment} · payload {stats.aerialPayloadBytes} B<br />環境 {stats.environmentMode}／{stats.environmentTime}／{stats.environmentWeather} · 雲影 {stats.environment.cloudShadowEnabled ? 'ON' : 'OFF'}<br />日光 {stats.environment.sunDirection} · 雲 {Math.round(stats.environment.cloudCoverage * 100)}% · 環境 ready {stats.environment.environmentReadyMs?.toFixed(0) ?? '—'}ms<br />3D {stats.firstMeaningful3dMs?.toFixed(0) ?? '—'}ms · READY {stats.gateReadyMs?.toFixed(0) ?? '—'}ms</div>}
        </aside>
      )}
      {import.meta.env.DEV && !debugOpen && <button type="button" className="region-debug-reopen" onClick={() => setDebugOpen(true)}>QA</button>}

      <footer className="region-footer"><span>GATE A.3／歷史航照藝術方向</span><span>戰役資料尚未載入</span><span>1949 — 2.0 原型</span></footer>
    </div>
  );
}
