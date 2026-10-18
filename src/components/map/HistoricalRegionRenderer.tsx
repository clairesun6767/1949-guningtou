import { useEffect, useRef, useState } from 'react';
import type { Position } from '../../battle-replay/types/index.js';
import type { BattleMapFeature, CameraPresetId } from '../../battle-replay/visualization/types.js';
import type { HistoricalTraceFeature, HistoricalTraceVisualProgress } from '../../battle-replay/visualization/historicalTraces.js';
import type { EnvironmentDebugState, EnvironmentTimePreset, EnvironmentWeather } from '../../../v2/config/environment.js';
import type { HistoricalAerialYear } from '../../../v2/config/historicalAerialRegistry.js';
import type { HistoricalAerialMode } from '../../../v2/config/historicalAerial.js';
import { chooseRegionTier } from '../../../v2/prototypes/region/RegionPerformance.js';
import { RegionScene } from '../../../v2/prototypes/region/RegionScene.js';

interface Props {
  base: string;
  compact: boolean;
  features: BattleMapFeature[];
  historicalTraces: HistoricalTraceFeature[];
  historicalTraceProgress: Map<string, HistoricalTraceVisualProgress>;
  cameraId: CameraPresetId;
  activeDate: string;
  focus?: Position;
  labelsEnabled: boolean;
  selectedId: string | null;
  locale: string;
  onSelectFeature: (id: string) => void;
  onSelectHistoricalTrace: (id: string) => void;
  onInteraction: () => void;
  onReady: () => void;
  onError: (error: unknown) => void;
}

type Profile = { mobile: boolean; reducedMotion: boolean; tier: 'HIGH' | 'MEDIUM' | 'LOW' };

const CAMERA_PRESETS: Record<CameraPresetId, 'hero' | 'kinmen' | 'guningtou'> = {
  strategic: 'hero',
  kinmen: 'kinmen',
  guningtou: 'guningtou',
  landing_coast: 'guningtou',
  battle_overview: 'guningtou',
  poi_focus: 'guningtou',
  story_mode: 'guningtou',
};

const COPY = {
  'zh-tw': { aerial: '歷史衛星／航照', off: '關閉', opacity: '透明度', note: '1944／1945／1958 公開低解析度 POC' },
  'zh-cn': { aerial: '历史卫星／航照', off: '关闭', opacity: '透明度', note: '1944／1945／1958 公开低分辨率 POC' },
  en: { aerial: 'Historical aerial', off: 'Off', opacity: 'Opacity', note: 'Public low-resolution 1944 / 1945 / 1958 POC' },
} as const;

const ENVIRONMENT_DEBUG: Partial<EnvironmentDebugState> = {
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
};

function deviceProfile(): Profile {
  if (typeof window === 'undefined') return { mobile: false, reducedMotion: false, tier: 'HIGH' };
  const mobile = window.matchMedia('(max-width: 820px)').matches;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return {
    mobile,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    tier: chooseRegionTier({
      mobile,
      deviceMemory: memory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      pixelRatio: window.devicePixelRatio,
    }),
  };
}

function initialYear(): HistoricalAerialYear {
  if (typeof window !== 'undefined') {
    const year = Number(new URLSearchParams(window.location.search).get('year'));
    if (year === 1944 || year === 1945 || year === 1958) return year;
  }
  return 1945;
}

export default function HistoricalRegionRenderer({
  base,
  compact,
  features,
  historicalTraces,
  historicalTraceProgress,
  cameraId,
  activeDate,
  focus,
  labelsEnabled,
  selectedId,
  locale,
  onSelectFeature,
  onSelectHistoricalTrace,
  onInteraction,
  onReady,
  onError,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelMountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<RegionScene | null>(null);
  const callbacksRef = useRef({ onSelectFeature, onSelectHistoricalTrace, onInteraction, onReady, onError });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [aerialYear, setAerialYear] = useState<HistoricalAerialYear>(initialYear);
  const [aerialEnabled, setAerialEnabled] = useState(true);
  const [aerialOpacity, setAerialOpacity] = useState(65);
  const copy = COPY[locale as keyof typeof COPY] ?? COPY['zh-tw'];

  callbacksRef.current = { onSelectFeature, onSelectHistoricalTrace, onInteraction, onReady, onError };

  useEffect(() => {
    setProfile(deviceProfile());
  }, []);

  useEffect(() => {
    if (!profile || !mountRef.current || !labelMountRef.current) return undefined;
    let disposed = false;
    let scene: RegionScene | null = null;
    const handleResize = () => scene?.resize();
    const initialize = async () => {
      try {
        scene = await RegionScene.create({
          container: mountRef.current!,
          labelContainer: labelMountRef.current!,
          base,
          mobile: profile.mobile,
          reducedMotion: profile.reducedMotion,
          tier: profile.tier,
          variant: 'historical',
          labelsVisible: true,
          qualitySource: 'composition',
          initialQuality: 'B',
          initialVerticalExaggeration: 1.5,
          initialLightingMode: 'RELIEF',
          initialHistoricalMode: 'AERIAL' as HistoricalAerialMode,
          initialHistoricalToneEnabled: true,
          initialAerialOpacity: aerialOpacity,
          environmentMode: 'P3',
          initialEnvironmentTime: 'T0' as EnvironmentTimePreset,
          initialEnvironmentWeather: 'W1' as EnvironmentWeather,
          initialEnvironmentDebug: ENVIRONMENT_DEBUG,
          initialEnvironmentCloudControls: { coverage: 0.42, opacity: 0.46, altitude: 18, windSpeed: 0.42, shadowStrength: 0.12 },
          initialAerialYear: aerialYear,
          initialAerialSelectionMode: 'single',
          initialAerialYears: [aerialYear],
          allowLocalAerialPoc: true,
          initialCameraPreset: CAMERA_PRESETS[cameraId],
          battleFeatures: features,
          historicalTraces,
          historicalTraceProgress,
          battleLabelsVisible: labelsEnabled,
          battleLocale: locale === 'en' ? 'en' : locale === 'zh-cn' ? 'zh-Hans' : 'zh-Hant',
          locale,
          onSelectBattleFeature: id => callbacksRef.current.onSelectFeature(id),
          onSelectHistoricalTrace: id => callbacksRef.current.onSelectHistoricalTrace(id),
          onStage: () => undefined,
          onReady: () => {
            if (!disposed) {
              setStatus('ready');
              callbacksRef.current.onReady();
            }
          },
          onInteraction: () => callbacksRef.current.onInteraction(),
          onError: error => {
            if (!disposed) {
              setStatus('error');
              callbacksRef.current.onError(error);
            }
          },
        });
        if (disposed) {
          scene.dispose();
          return;
        }
        sceneRef.current = scene;
        scene.resize();
      } catch (error) {
        if (!disposed) {
          setStatus('error');
          callbacksRef.current.onError(error);
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
  }, [base, profile?.mobile, profile?.reducedMotion, profile?.tier]);

  useEffect(() => {
    sceneRef.current?.flyTo(CAMERA_PRESETS[cameraId]);
  }, [cameraId, focus?.[0], focus?.[1]]);

  useEffect(() => {
    sceneRef.current?.updateBattleFeatures(features, labelsEnabled, selectedId);
  }, [features, labelsEnabled, selectedId]);

  useEffect(() => {
    sceneRef.current?.updateHistoricalTraces(historicalTraces, labelsEnabled);
  }, [historicalTraces, labelsEnabled]);

  useEffect(() => {
    sceneRef.current?.updateHistoricalTraceProgress(historicalTraceProgress);
  }, [historicalTraceProgress]);

  function chooseYear(year: HistoricalAerialYear) {
    setAerialYear(year);
    setAerialEnabled(true);
    sceneRef.current?.setHistoricalMode('AERIAL');
    sceneRef.current?.setHistoricalYear(year);
    sceneRef.current?.setAerialOpacity(aerialOpacity);
  }

  function toggleAerial() {
    const next = !aerialEnabled;
    setAerialEnabled(next);
    sceneRef.current?.setHistoricalMode(next ? 'AERIAL' : 'OFF');
  }

  function changeOpacity(value: number) {
    setAerialOpacity(value);
    sceneRef.current?.setAerialOpacity(value);
  }

  return (
    <div className={`historical-region-renderer historical-region-renderer--${status} ${compact ? 'historical-region-renderer--compact' : ''}`} data-renderer="v2-region" data-status={status} data-active-date={activeDate}>
      <div ref={mountRef} className="historical-region-renderer__stage" />
      <div ref={labelMountRef} className="historical-region-renderer__label-stage" />
      <aside className="historical-region-renderer__aerial-switcher" aria-label={copy.aerial}>
        <div className="historical-region-renderer__aerial-head"><strong>{copy.aerial}</strong><button type="button" onClick={toggleAerial} aria-pressed={aerialEnabled}>{aerialEnabled ? 'ON' : copy.off}</button></div>
        <div className="historical-region-renderer__aerial-years">
          {([1944, 1945, 1958] as HistoricalAerialYear[]).map(year => <button type="button" key={year} className={aerialEnabled && aerialYear === year ? 'is-active' : ''} onClick={() => chooseYear(year)} aria-pressed={aerialEnabled && aerialYear === year}>{year}</button>)}
        </div>
        <label className="historical-region-renderer__aerial-opacity"><span>{copy.opacity}</span><output>{aerialOpacity}%</output><input type="range" min="0" max="100" step="1" value={aerialOpacity} onChange={event => changeOpacity(Number(event.currentTarget.value))} aria-label={copy.opacity} /></label>
        <small>{copy.note}</small>
      </aside>
      {status === 'loading' && <div className="historical-region-renderer__loading" aria-live="polite">BUILDING HISTORICAL TERRAIN</div>}
      {status === 'error' && <div className="historical-region-renderer__error" role="status">V2 TERRAIN UNAVAILABLE · ATLAS FALLBACK</div>}
      <div className="historical-region-renderer__credits">© OpenStreetMap contributors · ODbL · SRTM / USGS elevation reference</div>
    </div>
  );
}
