import { useEffect, useRef, useState } from 'react';
import type { Position } from '../../../battle-replay/types/index.js';
import type {
  BattleMapFeature,
  CameraPresetId,
  LayerState,
  TimelineFilter,
} from '../../../battle-replay/visualization/types.js';
import { CesiumScene } from './CesiumScene.js';
import 'cesium/Build/Cesium/Widgets/widgets.css';

interface Props {
  base: string;
  compact: boolean;
  features: BattleMapFeature[];
  cameraId: CameraPresetId;
  focus?: Position;
  layers: LayerState;
  timeline: TimelineFilter;
  onSelectFeature: (id: string) => void;
  onReady: (terrainSource: 'ellipsoid' | 'cesium-world-terrain') => void;
  onError: (error: unknown) => void;
}

export default function CesiumHistoricalRenderer({
  base,
  compact,
  features,
  cameraId,
  focus,
  layers,
  timeline,
  onSelectFeature,
  onReady,
  onError,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const creditRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CesiumScene | null>(null);
  const callbackRef = useRef({ onSelectFeature, onError });
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  callbackRef.current = { onSelectFeature, onError };

  useEffect(() => {
    let disposed = false;
    let scene: CesiumScene | null = null;
    const handleResize = () => scene?.resize();

    async function initialize() {
      if (!containerRef.current || !creditRef.current) return;
      try {
        scene = await CesiumScene.create({
          container: containerRef.current,
          creditContainer: creditRef.current,
          base,
          mobile: window.matchMedia('(max-width: 820px)').matches,
          features,
          layers,
          timeline,
          cameraId,
          onSelectFeature: id => callbackRef.current.onSelectFeature(id),
          onRenderError: error => callbackRef.current.onError(error),
        });
        if (disposed) {
          scene.destroy();
          return;
        }
        sceneRef.current = scene;
        window.addEventListener('resize', handleResize, { passive: true });
        setStatus('ready');
        onReady(scene.terrainSource);
      } catch (error) {
        if (!disposed) callbackRef.current.onError(error);
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
  }, [cameraId, focus?.[0], focus?.[1]]);

  useEffect(() => {
    sceneRef.current?.updateLayers(layers, cameraId);
  }, [layers, cameraId]);

  useEffect(() => {
    sceneRef.current?.updateFeatures(features, layers, timeline);
  }, [features, layers, timeline.activeDate]);

  return (
    <div className={`cesium-historical-renderer cesium-historical-renderer--${status}`} data-renderer="cesium" data-status={status}>
      <div ref={containerRef} className="cesium-historical-renderer__canvas" aria-label="Cesium 3D geographic scene" />
      <div ref={creditRef} className="cesium-historical-renderer__credits" aria-label="Map credits" />
      {status === 'loading' && <div className="cesium-historical-renderer__loading" aria-live="polite">LOADING GEOGRAPHIC RENDERER</div>}
    </div>
  );
}
