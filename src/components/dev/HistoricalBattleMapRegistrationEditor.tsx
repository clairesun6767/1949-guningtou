import { useMemo, useRef, useState, type MouseEvent } from 'react';
import registrationRaw from '../../../data/battles/guningtou-1949/historical-battle-map-registration.json';
import tracesRaw from '../../../data/battles/guningtou-1949/historical-battle-map-traces.geojson?raw';
import locationsRaw from '../../../data/battles/guningtou-1949/locations.geojson?raw';
import type { HistoricalTraceCollection, HistoricalTraceFeature } from '../../battle-replay/visualization/historicalTraces.js';
import './historical-map-registration.css';

interface AnchorDraft {
  id: string;
  sourcePixel: [number, number];
  geographicReference: [number, number];
  enabled: boolean;
  status: 'needs_human_confirmation' | 'candidate';
  confidence: 'unknown' | 'approximate';
  notes: string;
}

interface Props {
  base?: string;
}

const sourceMapWidth = 1000;
const sourceMapHeight = 641;
const traceCollection = JSON.parse(tracesRaw) as HistoricalTraceCollection;
const locationCollection = JSON.parse(locationsRaw) as { features: Array<{ id: string; geometry: { coordinates: [number, number] }; properties: { historicalName?: Record<string, string> } }> };
const geographicBounds = { west: 118.28, east: 118.37, south: 24.44, north: 24.5 };

function sourceUrl(base: string) {
  return base.replace(/\/$/, '') + '/map-data/historical-battle-map.jpg';
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function geographicPoint([longitude, latitude]: [number, number]) {
  return {
    x: ((longitude - geographicBounds.west) / (geographicBounds.east - geographicBounds.west)) * 100,
    y: ((geographicBounds.north - latitude) / (geographicBounds.north - geographicBounds.south)) * 100,
  };
}

export default function HistoricalBattleMapRegistrationEditor({ base = '/1949-guningtou' }: Props) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [anchors, setAnchors] = useState<AnchorDraft[]>(registrationRaw.anchors as AnchorDraft[]);
  const [pendingSource, setPendingSource] = useState<[number, number] | null>(null);
  const [message, setMessage] = useState('點擊左側來源圖，再點擊右側現代參考圖建立一組停用的候選 anchor。');
  const [selectedTraceId, setSelectedTraceId] = useState(traceCollection.features[0]?.id ?? null);
  const [traceDrafts, setTraceDrafts] = useState<Record<string, HistoricalTraceFeature>>({});
  const [controlPointIndex, setControlPointIndex] = useState(0);
  const [editControlPoint, setEditControlPoint] = useState(false);

  const selectedTrace = traceCollection.features.find(feature => feature.id === selectedTraceId) ?? null;
  const selectedTraceDraft = selectedTrace ? traceDrafts[selectedTrace.id] ?? selectedTrace : null;
  const enabledAnchors = anchors.filter(anchor => anchor.enabled);
  const traceList = useMemo(() => traceCollection.features, []);

  function handleSourceClick(event: MouseEvent<HTMLDivElement>) {
    const image = imageRef.current;
    if (!image) return;
    const rect = image.getBoundingClientRect();
    const source: [number, number] = [
      Math.round(((event.clientX - rect.left) / rect.width) * sourceMapWidth),
      Math.round(((event.clientY - rect.top) / rect.height) * sourceMapHeight),
    ];
    if (editControlPoint && selectedTraceDraft?.properties.sourceGraphic) {
      const points = selectedTraceDraft.properties.sourceGraphic.points.map(point => [...point] as [number, number]);
      const index = Math.max(0, Math.min(points.length - 1, controlPointIndex));
      points[index] = source;
      setTraceDrafts(current => ({
        ...current,
        [selectedTraceDraft.id]: {
          ...selectedTraceDraft,
          properties: {
            ...selectedTraceDraft.properties,
            sourceGraphic: { ...selectedTraceDraft.properties.sourceGraphic!, points },
          },
        },
      }));
      setMessage('已移動目前 trace draft 的 source control point；尚未寫回正式 GeoJSON。');
      return;
    }
    setPendingSource(source);
    setMessage('已選來源像素 ' + source.join(', ') + '；請在右側點選對應的現代參考位置。');
  }

  function handleReferenceClick(event: MouseEvent<SVGSVGElement>) {
    if (!pendingSource) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    const geographic: [number, number] = [
      geographicBounds.west + (x / 100) * (geographicBounds.east - geographicBounds.west),
      geographicBounds.north - (y / 100) * (geographicBounds.north - geographicBounds.south),
    ];
    const id = 'ANCHOR-MANUAL-' + String(anchors.length + 1).padStart(2, '0');
    setAnchors(current => [...current, {
      id,
      sourcePixel: pendingSource,
      geographicReference: geographic,
      enabled: false,
      status: 'needs_human_confirmation',
      confidence: 'unknown',
      notes: 'Human-created candidate; review identity before enabling.',
    }]);
    setPendingSource(null);
    setMessage(id + ' 已建立，預設停用；請先確認來源圖與現代位置是否真為同一地物。');
  }

  function removeAnchor(id: string) {
    setAnchors(current => current.filter(anchor => anchor.id !== id));
  }

  function updateAnchor(id: string, enabled: boolean) {
    setAnchors(current => current.map(anchor => anchor.id === id ? { ...anchor, enabled, status: enabled ? 'candidate' : 'needs_human_confirmation' } : anchor));
  }

  function selectTrace(id: string) {
    setSelectedTraceId(id);
    setControlPointIndex(0);
    setEditControlPoint(false);
  }

  function setTraceReviewStatus(status: HistoricalTraceFeature['properties']['reviewStatus']) {
    if (!selectedTraceDraft) return;
    setTraceDrafts(current => ({
      ...current,
      [selectedTraceDraft.id]: { ...selectedTraceDraft, properties: { ...selectedTraceDraft.properties, reviewStatus: status } },
    }));
  }

  return (
    <main className="historical-registration" data-enabled-anchor-count={enabledAnchors.length}>
      <header className="historical-registration__masthead">
        <div>
          <span>DEVELOPMENT ONLY · V0.8</span>
          <h1>Historical Battle Map Registration</h1>
          <p>來源圖：古寧頭戰役路線圖.jpg · 目前是 schematic_only，不是精密地理套準。</p>
        </div>
        <div className="historical-registration__actions">
          <button type="button" onClick={() => downloadJson('historical-battle-map-registration.draft.json', { ...registrationRaw, anchors })}>保存 anchor set</button>
          <button type="button" onClick={() => downloadJson('historical-battle-map-traces.review-draft.geojson', { ...traceCollection, features: traceList.map(feature => traceDrafts[feature.id] ?? feature) })}>下載 trace review draft</button>
        </div>
      </header>

      <section className="historical-registration__status">
        <strong>{enabledAnchors.length}</strong><span>enabled anchors</span>
        <strong>{enabledAnchors.length >= 3 ? 'READY FOR REVIEW' : 'NOT ENOUGH'}</strong><span>transform gate</span>
        <strong>NONE</strong><span>auto-selected transform</span>
        <strong>{registrationRaw.registrationMethod}</strong><span>registration method</span>
      </section>

      <div className="historical-registration__comparison">
        <section className="historical-registration__panel">
          <header><span>SOURCE IMAGE · 1000×641</span><strong>Historical battle drawing</strong></header>
          <div className="historical-registration__source" onClick={handleSourceClick}>
            <img ref={imageRef} src={sourceUrl(base)} alt="古寧頭戰役路線圖" />
            {pendingSource && <span className="historical-registration__pending-point" style={{ left: (pendingSource[0] / sourceMapWidth) * 100 + '%', top: (pendingSource[1] / sourceMapHeight) * 100 + '%' }} />}
            {selectedTraceDraft?.properties.sourceGraphic && <svg viewBox="0 0 1000 641" aria-hidden="true">
              <polyline points={selectedTraceDraft.properties.sourceGraphic.points.map(point => point.join(',')).join(' ')} />
              {selectedTraceDraft.properties.sourceGraphic.points.map((point, index) => <circle key={index} cx={point[0]} cy={point[1]} r={index === controlPointIndex ? 8 : 5} />)}
            </svg>}
          </div>
          <p className="historical-registration__notice">{message}</p>
        </section>

        <section className="historical-registration__panel">
          <header><span>MODERN REFERENCE · WGS84</span><strong>Canonical locations / schematic reference</strong></header>
          <svg className="historical-registration__reference" viewBox="0 0 100 100" onClick={handleReferenceClick} role="img" aria-label="現代地理參考圖">
            <rect width="100" height="100" fill="#20251f" />
            <path d="M0 14 C18 10 27 22 41 18 S70 5 100 14 M0 80 C20 70 36 78 54 68 S82 64 100 70" fill="none" stroke="#647467" strokeWidth=".8" strokeDasharray="2 2" />
            {locationCollection.features.map(location => {
              const point = geographicPoint(location.geometry.coordinates);
              return <g key={location.id}><circle cx={point.x} cy={point.y} r="1.5" fill="#cfad6a" /><text x={point.x + 2} y={point.y - 2} fill="#e2dac6" fontSize="2.5">{location.properties.historicalName?.['zh-Hant'] ?? location.id}</text></g>;
            })}
            {anchors.map(anchor => {
              const point = geographicPoint(anchor.geographicReference);
              return <circle key={anchor.id} cx={point.x} cy={point.y} r={anchor.enabled ? 2.6 : 2} fill={anchor.enabled ? '#dd6c54' : '#6d8587'} stroke="#f3e8d4" strokeWidth=".5" />;
            })}
          </svg>
          <p className="historical-registration__notice">右圖不是自動配準結果；它只是讓研究者人工判斷來源圖位置與現代參考是否可能對應。</p>
        </section>
      </div>

      <section className="historical-registration__workspace">
        <section className="historical-registration__panel">
          <header><span>ANCHOR SET</span><strong>候選控制點</strong></header>
          <div className="historical-registration__anchor-list">
            {anchors.map(anchor => <article key={anchor.id}>
              <div><strong>{anchor.id}</strong><span>{anchor.sourcePixel.join(', ')} → {anchor.geographicReference.map(value => value.toFixed(6)).join(', ')}</span></div>
              <label><input type="checkbox" checked={anchor.enabled} onChange={event => updateAnchor(anchor.id, event.target.checked)} />enable after human review</label>
              <button type="button" onClick={() => removeAnchor(anchor.id)}>remove</button>
            </article>)}
            {!anchors.length && <p>尚無人工建立的 anchor。這是目前正確的安全狀態。</p>}
          </div>
          <div className="historical-registration__residual">
            <strong>Residual display</strong>
            <span>{enabledAnchors.length < 3 ? 'N/A · affine 至少需要 3 個人工確認 anchor。' : '候選點數量足夠；仍不自動 fit，也不自動選最低殘差模型。'}</span>
          </div>
        </section>

        <section className="historical-registration__panel historical-registration__trace-review">
          <header><span>TRACE REVIEW</span><strong>來源線條逐條檢視</strong></header>
          <div className="historical-registration__trace-list">
            {traceList.map(trace => <button type="button" key={trace.id} className={trace.id === selectedTraceId ? 'is-selected' : ''} onClick={() => selectTrace(trace.id)}><span>{trace.properties.side}</span><strong>{trace.properties.label?.['zh-Hant'] ?? trace.id}</strong><small>{trace.properties.featureType} · {trace.properties.confidence}</small></button>)}
          </div>
          {selectedTraceDraft && <div className="historical-registration__trace-detail">
            <h2>{selectedTraceDraft.properties.label?.['zh-Hant'] ?? selectedTraceDraft.id}</h2>
            <p>{selectedTraceDraft.properties.notes}</p>
            <dl><div><dt>sourceMapId</dt><dd>{selectedTraceDraft.properties.sourceMapId}</dd></div><div><dt>registration</dt><dd>{selectedTraceDraft.properties.registrationMethod}</dd></div><div><dt>status</dt><dd>{selectedTraceDraft.properties.reviewStatus}</dd></div><div><dt>relatedUnits</dt><dd>{selectedTraceDraft.properties.relatedUnits.join(' · ') || 'none · needs human confirmation'}</dd></div></dl>
            <div className="historical-registration__actions">
              <button type="button" onClick={() => setTraceReviewStatus('reviewed')}>approve review draft</button>
              <button type="button" onClick={() => setTraceReviewStatus('needs_human_confirmation')}>needs human confirmation</button>
              {selectedTraceDraft.properties.sourceGraphic && <button type="button" onClick={() => setEditControlPoint(value => !value)}>{editControlPoint ? 'finish control-point edit' : 'move source control point'}</button>}
            </div>
            {editControlPoint && selectedTraceDraft.properties.sourceGraphic && <div className="historical-registration__control-points">{selectedTraceDraft.properties.sourceGraphic.points.map((point, index) => <button type="button" key={index} className={index === controlPointIndex ? 'is-selected' : ''} onClick={() => setControlPointIndex(index)}>P{index + 1} · {point.join(', ')}</button>)}</div>}
          </div>}
        </section>
      </section>

      <footer className="historical-registration__footer">依歷史戰役圖描繪，位置為示意性套準，非精密測量路徑。所有下載內容都是人工 review draft，正式資料仍須另行審查。</footer>
    </main>
  );
}
