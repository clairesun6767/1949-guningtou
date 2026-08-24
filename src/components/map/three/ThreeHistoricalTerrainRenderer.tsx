import { useEffect, useRef, useState } from 'react';
import type { Position } from '../../../battle-replay/types/index.js';
import type { BattleMapFeature, CameraPresetId, LayerState, MapLayerId } from '../../../battle-replay/visualization/types.js';
import type { HistoricalTraceFeature } from '../../../battle-replay/visualization/historicalTraces.js';
import { ThreeScene, type TerrainQaMode } from './ThreeScene.js';

interface Props {
  base: string;
  compact: boolean;
  features: BattleMapFeature[];
  historicalTraces: HistoricalTraceFeature[];
  historicalTraceProgress: Map<string, number>;
  cameraId: CameraPresetId;
  activeDate: string;
  focus?: Position;
  labelsEnabled: boolean;
  layers: LayerState;
  selectedId: string | null;
  onSelectFeature: (id: string) => void;
  onSelectHistoricalTrace: (id: string) => void;
  onInteraction: () => void;
  onReady: () => void;
  onError: (error: unknown) => void;
}

export default function ThreeHistoricalTerrainRenderer({
  base,
  compact,
  features,
  historicalTraces,
  historicalTraceProgress,
  cameraId,
  activeDate,
  focus,
  labelsEnabled,
  layers,
  selectedId,
  onSelectFeature,
  onSelectHistoricalTrace,
  onInteraction,
  onReady,
  onError,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ThreeScene | null>(null);
  const callbacksRef = useRef({ onSelectFeature, onSelectHistoricalTrace, onError, onReady });
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [capture, setCapture] = useState<string | null>(null);
  const [debugVisible, setDebugVisible] = useState(() => import.meta.env.DEV && new URLSearchParams(window.location.search).has('qa'));
  const [qaLayers, setQaLayers] = useState<Set<MapLayerId>>(() => new Set(layers.enabled));
  const [stats, setStats] = useState<ReturnType<ThreeScene['getStats']> | null>(null);
  const [qaMode] = useState<TerrainQaMode>(() => {
    if (!import.meta.env.DEV) return 'none';
    const value = new URLSearchParams(window.location.search).get('qa');
    return ['terrain-solid', 'terrain-seam', 'terrain-only', 'classification-only', 'classification-regional-only', 'classification-local-only', 'classification-both', 'classification-no-lod', 'classification-uv-debug', 'classification-alpha-debug', 'regional-only', 'local-only', 'terrain-ownership', 'no-lod', 'texture-nearest', 'texture-linear', 'texture-mipmap', 'anisotropy-1', 'anisotropy-4', 'anisotropy-8', 'anisotropy-max'].includes(value ?? '')
      ? value as TerrainQaMode
      : 'none';
  });
  callbacksRef.current = { onSelectFeature, onSelectHistoricalTrace, onError, onReady };

  useEffect(() => {
    let disposed = false;
    let scene: ThreeScene | null = null;
    const handleResize = () => scene?.resize();
    async function initialize() {
      if (!containerRef.current || !labelRef.current) return;
      try {
        scene = await ThreeScene.create({
          container: containerRef.current,
          labelContainer: labelRef.current,
          base,
          mobile: window.matchMedia('(max-width: 820px)').matches,
          compact,
          reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          features,
          historicalTraces,
          cameraId,
          qaMode,
          labelsEnabled,
          enabledLayers: layers.enabled,
          selectedId,
          onSelectFeature: id => callbacksRef.current.onSelectFeature(id),
          onSelectHistoricalTrace: id => callbacksRef.current.onSelectHistoricalTrace(id),
          onInteraction,
          onRenderError: error => callbacksRef.current.onError(error),
        });
        if (disposed) {
          scene.destroy();
          return;
        }
        sceneRef.current = scene;
        window.addEventListener('resize', handleResize, { passive: true });
        setStatus('ready');
        setStats(scene.getStats());
        if (!['strategic', 'kinmen'].includes(cameraId)) scene.fitBattleMovement(features);
        callbacksRef.current.onReady();
      } catch (error) {
        if (!disposed) callbacksRef.current.onError(error);
      }
    }
    void initialize();
    return () => {
      disposed = true;
      window.removeEventListener('resize', handleResize);
      sceneRef.current = null;
      scene?.destroy();
    };
  }, [base, compact]);

  useEffect(() => {
    sceneRef.current?.updateCamera(cameraId, focus);
    setCapture(null);
  }, [cameraId, focus?.[0], focus?.[1]]);

  useEffect(() => {
    if (!sceneRef.current || ['strategic', 'kinmen'].includes(cameraId)) return;
    sceneRef.current.fitBattleMovement(features);
  }, [activeDate, cameraId]);

  useEffect(() => {
    sceneRef.current?.updateFeatures(features, labelsEnabled, selectedId);
  }, [features, labelsEnabled, selectedId]);

  useEffect(() => {
    sceneRef.current?.updateHistoricalTraces(historicalTraces, labelsEnabled);
  }, [historicalTraces, labelsEnabled]);

  useEffect(() => {
    sceneRef.current?.updateHistoricalTraceProgress(historicalTraceProgress);
  }, [historicalTraceProgress]);

  useEffect(() => {
    setQaLayers(new Set(layers.enabled));
    sceneRef.current?.updateLayers(layers.enabled);
  }, [layers.enabled]);

  function toggleQaLayer(id: MapLayerId) {
    setQaLayers(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      sceneRef.current?.updateLayers(next);
      return next;
    });
  }

  function freezeCapture() {
    const scene = sceneRef.current;
    if (!scene) return;
    setCapture(scene.captureDataUrl());
    setStats(scene.getStats());
  }

  return (
    <div
      className={`three-historical-renderer three-historical-renderer--${status}`}
      data-renderer="three"
      data-status={status}
      data-pitch="45"
      data-exaggeration="2.25"
      data-qa-mode={qaMode}
    >
      <div ref={containerRef} className="three-historical-renderer__stage" />
      <div ref={labelRef} className="three-historical-renderer__label-stage" />
      {capture && <img className="three-historical-renderer__capture" src={capture} alt="Three.js terrain render capture" />}
      {status === 'loading' && <div className="three-historical-renderer__loading" aria-live="polite">BUILDING HISTORICAL TERRAIN</div>}
      <div className="three-historical-renderer__credits">© OpenStreetMap contributors · ODbL · Mapzen / SRTM courtesy USGS</div>
      {import.meta.env.DEV && status === 'ready' && debugVisible && (
        <aside className="three-terrain-debug" aria-label="Three terrain visual debug panel">
          <strong>VISUAL QA</strong>
          <small>45° CAMERA · 2.25× RELIEF · MODERN REFERENCE</small>
          <div className="three-terrain-debug__layers">
            {([
              ['coastline', 'COAST'], ['land-cover', 'FARMLAND'], ['vegetation', 'FOREST'],
              ['settlements', 'VILLAGES'], ['roads', 'ROADS'], ['beaches', 'BEACH'],
              ['historical-poi', 'POI'], ['labels', 'LABELS'],
            ] as Array<[MapLayerId, string]>).map(([id, label]) => (
              <button type="button" className={qaLayers.has(id) ? 'is-active' : ''} key={id} onClick={() => toggleQaLayer(id)}>{label}</button>
            ))}
          </div>
          <button type="button" className="three-terrain-debug__capture" onClick={freezeCapture}>{capture ? 'REFRESH CAPTURE' : 'FREEZE CAPTURE'}</button>
          {capture && <button type="button" className="three-terrain-debug__clear" onClick={() => setCapture(null)}>LIVE VIEW</button>}
          <button type="button" className="three-terrain-debug__hide" onClick={() => setDebugVisible(false)}>HIDE QA</button>
          {stats && <small>{stats.triangles.toLocaleString()} TRI · {stats.calls} CALLS · DEM {stats.regionalGrid} / {stats.localGrid}<br />OSM R {Object.values(stats.cartographicCounts.regional).reduce((a, b) => a + b, 0)} · L {Object.values(stats.cartographicCounts.local).reduce((a, b) => a + b, 0)}<br />QA {stats.qaMode} · OWN R {stats.terrainOwnership.regionalOwnerSamples} · L {stats.terrainOwnership.localOwnerSamples} · NONE {stats.terrainOwnership.noOwnerSamples} · OVERLAP {stats.terrainOwnership.overlapSamples}<br />TEXTURE {stats.textureQa.filter} · ANISO {stats.textureQa.anisotropy}</small>}
        </aside>
      )}
    </div>
  );
}
