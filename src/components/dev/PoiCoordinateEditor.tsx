import { useEffect, useMemo, useState } from 'react';

import type { POI } from '../../data/types';
import PoiCoordinateMap, { type PoiDraftCoordinate } from './PoiCoordinateMap';
import './poi-coordinate-editor.css';

interface Props {
  pois: POI[];
  dataVersion: string;
}

interface CoordinateChange {
  poi_id: string;
  name_chinese: string;
  previous: PoiDraftCoordinate;
  proposed: PoiDraftCoordinate;
  google_maps_url: string;
}

interface Submission {
  schemaVersion: 'poi-coordinate-submission.v1';
  project: '1949-guningtou';
  submittedAt: string;
  base: {
    dataFile: 'data/poi.json';
    dataVersion: string;
  };
  method: 'manual-map-placement';
  reviewStatus: 'pending-codex-import';
  changes: CoordinateChange[];
  notes: string;
}

const DRAFT_STORAGE_KEY = '1949-guningtou:poi-coordinate-editor:v1';

function coordinateMap(pois: POI[]): Record<string, PoiDraftCoordinate> {
  return Object.fromEntries(pois.map((poi) => [poi.poi_id, { latitude: poi.latitude, longitude: poi.longitude }]));
}

function isValidCoordinate(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180;
}

function googleMapsUrl(coordinate: PoiDraftCoordinate): string {
  return `https://www.google.com/maps/@?api=1&map_action=map&center=${coordinate.latitude},${coordinate.longitude}&zoom=18&basemap=satellite`;
}

function downloadJson(filename: string, value: unknown): void {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatCoordinate(coordinate?: PoiDraftCoordinate): string {
  if (!coordinate) return '—';
  return `${coordinate.latitude.toFixed(8)}, ${coordinate.longitude.toFixed(8)}`;
}

export default function PoiCoordinateEditor({ pois, dataVersion }: Props) {
  const initialCoordinates = useMemo(() => coordinateMap(pois), [pois]);
  const [coordinates, setCoordinates] = useState<Record<string, PoiDraftCoordinate>>(initialCoordinates);
  const [originalCoordinates] = useState<Record<string, PoiDraftCoordinate>>(initialCoordinates);
  const [selectedPoiId, setSelectedPoiId] = useState(pois[0]?.poi_id ?? '');
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [latitudeInput, setLatitudeInput] = useState('');
  const [longitudeInput, setLongitudeInput] = useState('');
  const [statusMessage, setStatusMessage] = useState('尚未建立人工定位草稿。');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const selectedPoi = pois.find((poi) => poi.poi_id === selectedPoiId) ?? pois[0];
  const editedPoiIds = useMemo(() => new Set(
    pois.filter((poi) => {
      const current = coordinates[poi.poi_id];
      const original = originalCoordinates[poi.poi_id];
      return current && original && (current.latitude !== original.latitude || current.longitude !== original.longitude);
    }).map((poi) => poi.poi_id),
  ), [coordinates, originalCoordinates, pois]);
  const filteredPois = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return pois;
    return pois.filter((poi) => [poi.poi_id, poi.name_chinese, poi.name_english, poi.category].filter(Boolean).join(' ').toLowerCase().includes(normalized));
  }, [pois, query]);
  const selectedCoordinate = selectedPoi ? coordinates[selectedPoi.poi_id] : undefined;

  useEffect(() => {
    if (!selectedPoi) return;
    const current = coordinates[selectedPoi.poi_id];
    setLatitudeInput(current ? String(current.latitude) : '');
    setLongitudeInput(current ? String(current.longitude) : '');
  }, [selectedPoi?.poi_id, coordinates]);

  useEffect(() => {
    try {
      const serialized = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!serialized) return;
      const draft = JSON.parse(serialized) as { coordinates?: Record<string, PoiDraftCoordinate>; notes?: string; savedAt?: string };
      if (!draft.coordinates) return;
      const restored = Object.fromEntries(pois.map((poi) => [poi.poi_id, draft.coordinates?.[poi.poi_id] ?? initialCoordinates[poi.poi_id]]));
      setCoordinates(restored);
      setNotes(draft.notes ?? '');
      setSavedAt(draft.savedAt ?? null);
      setStatusMessage(`已載入本機草稿：${draft.savedAt ? new Date(draft.savedAt).toLocaleString() : '時間未記錄'}。`);
    } catch {
      setStatusMessage('本機草稿無法載入，已使用網站目前資料。');
    }
  }, [initialCoordinates, pois]);

  function selectPoi(poiId: string): void {
    setSelectedPoiId(poiId);
    const coordinate = coordinates[poiId];
    if (coordinate) {
      setLatitudeInput(String(coordinate.latitude));
      setLongitudeInput(String(coordinate.longitude));
    }
  }

  function movePoi(poiId: string, latitude: number, longitude: number): void {
    if (!isValidCoordinate(latitude, longitude)) {
      setStatusMessage('拖曳結果不是有效的 WGS84 座標，未套用。');
      return;
    }
    setCoordinates((current) => ({ ...current, [poiId]: { latitude, longitude } }));
    setStatusMessage(`${poiId} 已建立人工候選位置；尚未送出。`);
  }

  function applyInput(): void {
    if (!selectedPoi) return;
    const latitude = Number(latitudeInput.trim());
    const longitude = Number(longitudeInput.trim());
    if (!isValidCoordinate(latitude, longitude)) {
      setStatusMessage('請輸入有效的緯度（-90 至 90）與經度（-180 至 180）。');
      return;
    }
    movePoi(selectedPoi.poi_id, latitude, longitude);
  }

  function resetSelected(): void {
    if (!selectedPoi) return;
    const original = originalCoordinates[selectedPoi.poi_id];
    setCoordinates((current) => ({ ...current, [selectedPoi.poi_id]: original }));
    setStatusMessage(`${selectedPoi.poi_id} 已還原為網站目前座標。`);
  }

  function saveDraft(): void {
    const nextSavedAt = new Date().toISOString();
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ schemaVersion: '1.0.0', coordinates, notes, savedAt: nextSavedAt }));
    setSavedAt(nextSavedAt);
    setStatusMessage(`本機草稿已儲存：${new Date(nextSavedAt).toLocaleString()}。`);
  }

  function clearDraft(): void {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setCoordinates(initialCoordinates);
    setNotes('');
    setSavedAt(null);
    setStatusMessage('本機草稿已清除，恢復網站目前資料。');
  }

  function submitChanges(): void {
    const changes: CoordinateChange[] = [...editedPoiIds].map((poiId) => {
      const poi = pois.find((item) => item.poi_id === poiId)!;
      const previous = originalCoordinates[poiId];
      const proposed = coordinates[poiId];
      return { poi_id: poiId, name_chinese: poi.name_chinese, previous, proposed, google_maps_url: googleMapsUrl(proposed) };
    });
    if (changes.length === 0) {
      setStatusMessage('尚未有座標變更，請先拖曳標記或輸入座標。');
      return;
    }
    const submission: Submission = {
      schemaVersion: 'poi-coordinate-submission.v1',
      project: '1949-guningtou',
      submittedAt: new Date().toISOString(),
      base: { dataFile: 'data/poi.json', dataVersion },
      method: 'manual-map-placement',
      reviewStatus: 'pending-codex-import',
      changes,
      notes,
    };
    downloadJson(`poi-coordinate-submission-${submission.submittedAt.replace(/[:.]/g, '-')}.json`, submission);
    saveDraft();
    setStatusMessage(`已產生送出檔，包含 ${changes.length} 筆變更。請將下載的 JSON 上傳到 Codex 對話，我會審閱後寫入展示資料。`);
  }

  return (
    <main className="poi-coordinate-editor">
      <header className="poi-coordinate-editor__header">
        <div>
          <p className="poi-coordinate-editor__kicker">INTERNAL TOOL · NOINDEX</p>
          <h1>古寧頭地點人工定位工作台</h1>
          <p>對照 Google Maps 衛星影像與 OpenStreetMap，拖曳選取地點的標記，建立新的 WGS84 候選座標。</p>
        </div>
        <div className="poi-coordinate-editor__warning">
          <strong>這不是直接寫入網站的按鈕</strong>
          <span>GitHub Pages 為靜態部署；送出會下載定位修正 JSON。將檔案交給 Codex 後，才會更新 data/poi.json、測試並發布。</span>
        </div>
      </header>

      <section className="poi-coordinate-editor__status" aria-label="工作台狀態">
        <div><strong>{pois.length}</strong><span>全部 POI</span></div>
        <div><strong>{pois.filter((poi) => poi.map_visibility === 'public').length}</strong><span>公開顯示</span></div>
        <div><strong>{editedPoiIds.size}</strong><span>本次已移動</span></div>
        <div><strong>{dataVersion}</strong><span>資料版本</span></div>
      </section>

      <div className="poi-coordinate-editor__workspace">
        <section className="poi-coordinate-editor__panel">
          <div className="poi-coordinate-editor__section-heading">
            <div><span>01 · SELECT</span><h2>選擇地點</h2></div>
            <span className="poi-coordinate-editor__draft-state">{savedAt ? `草稿 ${new Date(savedAt).toLocaleString()}` : '未儲存草稿'}</span>
          </div>
          <input className="poi-coordinate-editor__search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋 POI、名稱或類別" aria-label="搜尋 POI" />
          <div className="poi-coordinate-editor__poi-list">
            {filteredPois.map((poi) => {
              const edited = editedPoiIds.has(poi.poi_id);
              return <button type="button" key={poi.poi_id} className={poi.poi_id === selectedPoi?.poi_id ? 'is-selected' : ''} onClick={() => selectPoi(poi.poi_id)}>
                <span><strong>{poi.poi_id}</strong> {poi.name_chinese}</span>
                <small>{poi.category ?? '未分類'} · {poi.map_visibility === 'research' ? '研究索引' : '公開'}{edited ? ' · 已移動' : ''}</small>
              </button>;
            })}
          </div>

          {selectedPoi && selectedCoordinate && (
            <div className="poi-coordinate-editor__form">
              <div className="poi-coordinate-editor__section-heading"><div><span>02 · PLACE</span><h2>{selectedPoi.name_chinese}</h2></div><strong>{selectedPoi.poi_id}</strong></div>
              <p className="poi-coordinate-editor__muted">{selectedPoi.name_english} · {selectedPoi.category ?? '未分類'} · {selectedPoi.map_visibility === 'research' ? '研究索引' : '公開顯示'}</p>
              <div className="poi-coordinate-editor__coordinate-readout"><span>目前草稿</span><strong>{formatCoordinate(selectedCoordinate)}</strong></div>
              <div className="poi-coordinate-editor__grid">
                <label>緯度 Latitude<input type="number" step="any" value={latitudeInput} onChange={(event) => setLatitudeInput(event.target.value)} /></label>
                <label>經度 Longitude<input type="number" step="any" value={longitudeInput} onChange={(event) => setLongitudeInput(event.target.value)} /></label>
              </div>
              <div className="poi-coordinate-editor__actions">
                <button type="button" className="poi-coordinate-editor__button poi-coordinate-editor__button--primary" onClick={applyInput}>套用輸入座標</button>
                <button type="button" className="poi-coordinate-editor__button" onClick={resetSelected}>還原此點</button>
                <a className="poi-coordinate-editor__button poi-coordinate-editor__button--link" href={googleMapsUrl(selectedCoordinate)} target="_blank" rel="noreferrer">開啟 Google Maps 衛星圖 ↗</a>
              </div>
              <p className="poi-coordinate-editor__hint">也可以直接在右側地圖拖曳金色標記。座標順序為緯度、經度；每次移動只建立候選，不會立即改寫網站資料。</p>
            </div>
          )}

          <section className="poi-coordinate-editor__submission">
            <div className="poi-coordinate-editor__section-heading"><div><span>03 · SUBMIT</span><h2>送出定位修正</h2></div></div>
            <label>給 Codex 的人工備註<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="例如：依 Google Maps 衛星圖，將入口標記移至營舍主體中央。" /></label>
            <div className="poi-coordinate-editor__actions">
              <button type="button" className="poi-coordinate-editor__button" onClick={saveDraft}>儲存本機草稿</button>
              <button type="button" className="poi-coordinate-editor__button poi-coordinate-editor__button--primary" onClick={submitChanges}>送出並下載修正檔</button>
              <button type="button" className="poi-coordinate-editor__button poi-coordinate-editor__button--quiet" onClick={clearDraft}>清除草稿</button>
            </div>
            <p className="poi-coordinate-editor__message" role="status">{statusMessage}</p>
          </section>
        </section>

        <aside className="poi-coordinate-editor__map-panel">
          <div className="poi-coordinate-editor__map-heading"><div><span>MAP · DRAG MARKER</span><h2>人工放置定點</h2></div><span>OSM reference</span></div>
          <PoiCoordinateMap pois={pois} coordinates={coordinates} selectedPoiId={selectedPoi?.poi_id} editedPoiIds={editedPoiIds} onSelect={selectPoi} onMove={movePoi} />
          <div className="poi-coordinate-editor__map-legend"><span><i className="is-current" />目前位置</span><span><i className="is-edited" />已移動草稿</span><span><i className="is-selected" />拖曳中的地點</span></div>
          <p className="poi-coordinate-editor__map-note">OSM 只作為現代地理參考；Google Maps 衛星圖請用選取地點旁的外部連結人工比對。此工作台不會自動 snap 到道路，也不會修改歷史戰役路線。</p>
        </aside>
      </div>
    </main>
  );
}
