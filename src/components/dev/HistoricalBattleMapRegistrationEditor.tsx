import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import registrationRaw from '../../../data/battles/guningtou-1949/historical-battle-map-registration.json';
import historicalPhasesRaw from '../../../data/battles/guningtou-1949/historical-battle-phases.json?raw';
import tracesRaw from '../../../data/battles/guningtou-1949/historical-battle-map-traces.geojson?raw';
import locationsRaw from '../../../data/battles/guningtou-1949/locations.geojson?raw';
import { historicalTraceSourceLabel, historicalTraceVisitorLabel, parseHistoricalTraceCollection, parseHistoricalTracePhases, type HistoricalTraceCollection, type HistoricalTraceFeature } from '../../battle-replay/visualization/historicalTraces.js';
import type { GeoJsonGeometry, Position } from '../../battle-replay/types/index.js';
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

type TraceFilter = 'all' | 'pla' | 'roc' | 'defense' | 'battle-area';

interface WorkbenchDraft {
  schemaVersion: '0.8.3';
  baseCommit: string;
  savedAt: string;
  lastExportSignature: string;
  anchors: AnchorDraft[];
  traceDrafts: Record<string, HistoricalTraceFeature>;
  selectedTraceId: string | null;
  traceFilter: TraceFilter;
  showSource: boolean;
  showVisitor: boolean;
  sourceOpacity: number;
}

interface EditSnapshot {
  anchors: AnchorDraft[];
  traceDrafts: Record<string, HistoricalTraceFeature>;
  selectedTraceId: string | null;
}

const TRACE_PRIORITY: Record<string, number> = {
  'HBT-ROC-ARROW-01': 1,
  'HBT-ROC-ARROW-02': 2,
  'HBT-ROC-ARROW-03': 3,
  'HBT-ROC-FRONT-01': 4,
  'HBT-ROC-FRONT-02': 5,
  'HBT-PLA-ARROW-01': 6,
  'HBT-PLA-ARROW-02': 7,
  'HBT-PLA-CORRIDOR-01': 8,
};

const sourceMapWidth = 1000;
const sourceMapHeight = 641;
const traceCollection = JSON.parse(tracesRaw) as HistoricalTraceCollection;
const phaseCollection = parseHistoricalTracePhases(historicalPhasesRaw);
const locationCollection = JSON.parse(locationsRaw) as { features: Array<{ id: string; geometry: { coordinates: [number, number] }; properties: { historicalName?: Record<string, string> } }> };
const geographicBounds = { west: 118.28, east: 118.37, south: 24.44, north: 24.5 };
const BASE_COMMIT = '77ebf146bddcf8b4d98bd332a9f512fecbf39252';
const DRAFT_STORAGE_KEY = 'battlefield-os:guningtou:historical-trace-workbench:v0.8.3';

function cloneAnchors(value: readonly AnchorDraft[]): AnchorDraft[] {
  return value.map(anchor => ({
    ...anchor,
    sourcePixel: [...anchor.sourcePixel] as [number, number],
    geographicReference: [...anchor.geographicReference] as [number, number],
  }));
}

const canonicalAnchors = cloneAnchors(registrationRaw.anchors as AnchorDraft[]);

function isTraceFilter(value: unknown): value is TraceFilter {
  return value === 'all' || value === 'pla' || value === 'roc' || value === 'defense' || value === 'battle-area';
}

function isAnchorDraft(value: unknown): value is AnchorDraft {
  if (!value || typeof value !== 'object') return false;
  const anchor = value as Partial<AnchorDraft>;
  return typeof anchor.id === 'string'
    && Array.isArray(anchor.sourcePixel) && anchor.sourcePixel.length === 2
    && Array.isArray(anchor.geographicReference) && anchor.geographicReference.length === 2
    && typeof anchor.enabled === 'boolean'
    && (anchor.status === 'candidate' || anchor.status === 'needs_human_confirmation')
    && (anchor.confidence === 'unknown' || anchor.confidence === 'approximate')
    && typeof anchor.notes === 'string';
}

function readWorkbenchDraft(): WorkbenchDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<WorkbenchDraft>;
    if (draft.schemaVersion !== '0.8.3' || draft.baseCommit !== BASE_COMMIT) return null;
    if (!Array.isArray(draft.anchors) || !draft.anchors.every(isAnchorDraft) || !draft.traceDrafts || typeof draft.traceDrafts !== 'object') return null;
    if (!isTraceFilter(draft.traceFilter)) return null;
    return {
      schemaVersion: '0.8.3',
      baseCommit: BASE_COMMIT,
      savedAt: typeof draft.savedAt === 'string' ? draft.savedAt : new Date().toISOString(),
      lastExportSignature: typeof draft.lastExportSignature === 'string' ? draft.lastExportSignature : '',
      anchors: cloneAnchors(draft.anchors as AnchorDraft[]),
      traceDrafts: draft.traceDrafts as Record<string, HistoricalTraceFeature>,
      selectedTraceId: typeof draft.selectedTraceId === 'string' ? draft.selectedTraceId : null,
      traceFilter: draft.traceFilter,
      showSource: draft.showSource !== false,
      showVisitor: draft.showVisitor !== false,
      sourceOpacity: typeof draft.sourceOpacity === 'number' ? Math.max(0, Math.min(1, draft.sourceOpacity)) : 1,
    };
  } catch {
    return null;
  }
}

function sourceUrl(base: string) {
  return base.replace(/\/$/, '') + '/map-data/historical-battle-map.jpg';
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function serializeEditState(anchors: AnchorDraft[], traceDrafts: Record<string, HistoricalTraceFeature>) {
  const features = traceCollection.features.map(feature => traceDrafts[feature.id] ?? feature);
  return JSON.stringify({ anchors, features });
}

const canonicalEditSignature = serializeEditState(canonicalAnchors, {});

function geographicPoint([longitude, latitude]: Position) {
  return {
    x: ((longitude - geographicBounds.west) / (geographicBounds.east - geographicBounds.west)) * 100,
    y: ((geographicBounds.north - latitude) / (geographicBounds.north - geographicBounds.south)) * 100,
  };
}

function geometryPaths(geometry: GeoJsonGeometry): Position[][] {
  switch (geometry.type) {
    case 'LineString': return [geometry.coordinates];
    case 'MultiLineString': return geometry.coordinates;
    case 'Polygon': return geometry.coordinates;
    case 'MultiPolygon': return geometry.coordinates.flat();
    case 'Point': return [[geometry.coordinates]];
    case 'MultiPoint': return geometry.coordinates.map(coordinate => [coordinate]);
  }
}

function isAreaGeometry(geometry: GeoJsonGeometry) {
  return geometry.type === 'Polygon' || geometry.type === 'MultiPolygon';
}

function isClosedPath(geometry: GeoJsonGeometry) {
  return isAreaGeometry(geometry);
}

function editablePath(geometry: GeoJsonGeometry, pathIndex: number) {
  const path = geometryPaths(geometry)[pathIndex] ?? [];
  if (!isClosedPath(geometry) || path.length < 2) return path;
  const first = path[0];
  const last = path.at(-1);
  if (last && first[0] === last[0] && first[1] === last[1]) return path.slice(0, -1);
  return path;
}

function replaceGeometryPath(geometry: GeoJsonGeometry, pathIndex: number, path: Position[]): GeoJsonGeometry {
  switch (geometry.type) {
    case 'LineString': return { ...geometry, coordinates: path };
    case 'MultiLineString': return { ...geometry, coordinates: geometry.coordinates.map((value, index) => index === pathIndex ? path : value) };
    case 'Polygon': return { ...geometry, coordinates: geometry.coordinates.map((value, index) => index === pathIndex ? path : value) };
    case 'MultiPolygon': {
      let current = 0;
      return {
        ...geometry,
        coordinates: geometry.coordinates.map(polygon => polygon.map(value => {
          const next = current === pathIndex ? path : value;
          current += 1;
          return next;
        })),
      };
    }
    case 'Point': return { ...geometry, coordinates: path[0] ?? geometry.coordinates };
    case 'MultiPoint': return { ...geometry, coordinates: path as Position[] };
  }
}

function replaceEditablePath(geometry: GeoJsonGeometry, pathIndex: number, path: Position[]) {
  const nextPath = isClosedPath(geometry) && path.length > 0 ? [...path, path[0]] : path;
  return replaceGeometryPath(geometry, pathIndex, nextPath);
}

function referencePosition(event: ReactPointerEvent<SVGSVGElement>): Position {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
  const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
  return [
    geographicBounds.west + (x / 100) * (geographicBounds.east - geographicBounds.west),
    geographicBounds.north - (y / 100) * (geographicBounds.north - geographicBounds.south),
  ];
}

function traceMatchesFilter(feature: HistoricalTraceFeature, filter: TraceFilter) {
  if (filter === 'all') return true;
  if (filter === 'pla') return feature.properties.side === 'pla';
  if (filter === 'roc') return feature.properties.side === 'roc';
  if (filter === 'defense') return feature.properties.featureType === 'defensive_line' || feature.properties.featureType === 'battle_front';
  return feature.properties.featureType === 'battle_area' || feature.properties.featureType === 'historical_movement_corridor';
}

function traceClass(feature: HistoricalTraceFeature) {
  if (feature.properties.featureType === 'battle_area' || feature.properties.featureType === 'historical_movement_corridor') return 'area';
  return feature.properties.side;
}

export default function HistoricalBattleMapRegistrationEditor({ base = '/1949-guningtou' }: Props) {
  const imageRef = useRef<HTMLImageElement>(null);
  const traceImportRef = useRef<HTMLInputElement>(null);
  const registrationImportRef = useRef<HTMLInputElement>(null);
  const [restoredDraft] = useState<WorkbenchDraft | null>(() => readWorkbenchDraft());
  const [anchors, setAnchors] = useState<AnchorDraft[]>(() => cloneAnchors(restoredDraft?.anchors ?? canonicalAnchors));
  const [pendingSource, setPendingSource] = useState<[number, number] | null>(null);
  const [message, setMessage] = useState('點擊左側來源圖，再點擊右側現代參考圖建立一組停用的候選 anchor。');
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(restoredDraft?.selectedTraceId ?? traceCollection.features[0]?.id ?? null);
  const [traceDrafts, setTraceDrafts] = useState<Record<string, HistoricalTraceFeature>>(() => restoredDraft?.traceDrafts ?? {});
  const [sourceControlPointIndex, setSourceControlPointIndex] = useState(0);
  const [geometryPathIndex, setGeometryPathIndex] = useState(0);
  const [vertexIndex, setVertexIndex] = useState(0);
  const [draggingVertex, setDraggingVertex] = useState<{ pathIndex: number; vertexIndex: number } | null>(null);
  const [editControlPoint, setEditControlPoint] = useState(false);
  const [traceFilter, setTraceFilter] = useState<TraceFilter>(restoredDraft?.traceFilter ?? 'all');
  const [showSource, setShowSource] = useState(restoredDraft?.showSource ?? true);
  const [showVisitor, setShowVisitor] = useState(restoredDraft?.showVisitor ?? true);
  const [sourceOpacity, setSourceOpacity] = useState(restoredDraft?.sourceOpacity ?? 1);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(restoredDraft?.savedAt ?? null);
  const [lastExportSignature, setLastExportSignature] = useState(restoredDraft?.lastExportSignature || canonicalEditSignature);
  const [undoStack, setUndoStack] = useState<EditSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditSnapshot[]>([]);

  const selectedTrace = traceCollection.features.find(feature => feature.id === selectedTraceId) ?? null;
  const selectedTraceDraft = selectedTrace ? traceDrafts[selectedTrace.id] ?? selectedTrace : null;
  const enabledAnchors = anchors.filter(anchor => anchor.enabled);
  const traceList = useMemo(() => traceCollection.features
    .filter(feature => traceMatchesFilter(feature, traceFilter))
    .sort((left, right) => (TRACE_PRIORITY[left.id] ?? 99) - (TRACE_PRIORITY[right.id] ?? 99)), [traceFilter]);
  const selectedGeometryPaths = selectedTraceDraft ? geometryPaths(selectedTraceDraft.geometry) : [];
  const selectedEditablePath = selectedTraceDraft ? editablePath(selectedTraceDraft.geometry, geometryPathIndex) : [];

  function draftFeatures() {
    return traceCollection.features.map(feature => traceDrafts[feature.id] ?? feature);
  }

  const currentEditSignature = useMemo(() => serializeEditState(anchors, traceDrafts), [anchors, traceDrafts]);
  const hasUnexportedChanges = currentEditSignature !== lastExportSignature;
  const hasBrowserSessionState = currentEditSignature !== canonicalEditSignature
    || selectedTraceId !== (traceCollection.features[0]?.id ?? null)
    || traceFilter !== 'all'
    || !showSource
    || !showVisitor
    || sourceOpacity !== 1;
  const draftStatus = hasUnexportedChanges
    ? '有未匯出的修改 · 已儲存至瀏覽器草稿'
    : lastSavedAt
      ? '已儲存至瀏覽器草稿'
      : '目前使用 GitHub 版本';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!hasBrowserSessionState) {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      return;
    }
    const savedAt = new Date().toISOString();
    const draft: WorkbenchDraft = {
      schemaVersion: '0.8.3',
      baseCommit: BASE_COMMIT,
      savedAt,
      lastExportSignature,
      anchors,
      traceDrafts,
      selectedTraceId,
      traceFilter,
      showSource,
      showVisitor,
      sourceOpacity,
    };
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setLastSavedAt(savedAt);
    } catch {
      setMessage('瀏覽器草稿儲存失敗；請改用「匯出修改」保存檔案。');
    }
  }, [anchors, hasBrowserSessionState, lastExportSignature, selectedTraceId, showSource, showVisitor, sourceOpacity, traceDrafts, traceFilter]);

  function currentSnapshot(): EditSnapshot {
    return {
      anchors: cloneAnchors(anchors),
      traceDrafts: { ...traceDrafts },
      selectedTraceId,
    };
  }

  function pushHistory() {
    setUndoStack(current => [...current, currentSnapshot()].slice(-60));
    setRedoStack([]);
  }

  function restoreSnapshot(snapshot: EditSnapshot) {
    setAnchors(cloneAnchors(snapshot.anchors));
    setTraceDrafts({ ...snapshot.traceDrafts });
    setSelectedTraceId(snapshot.selectedTraceId);
    setPendingSource(null);
    setDraggingVertex(null);
  }

  function undo() {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setRedoStack(current => [...current, currentSnapshot()].slice(-60));
    setUndoStack(current => current.slice(0, -1));
    restoreSnapshot(previous);
    setMessage('已復原上一個人工編修動作。');
  }

  function redo() {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack(current => [...current, currentSnapshot()].slice(-60));
    setRedoStack(current => current.slice(0, -1));
    restoreSnapshot(next);
    setMessage('已重做上一個人工編修動作。');
  }

  function updateSelectedTraceDraft(updater: (feature: HistoricalTraceFeature) => HistoricalTraceFeature, recordHistory = true) {
    if (!selectedTraceDraft) return;
    if (recordHistory) pushHistory();
    const next = updater(selectedTraceDraft);
    setTraceDrafts(current => ({ ...current, [next.id]: next }));
  }

  function traceVertexCount(feature: HistoricalTraceFeature) {
    return geometryPaths(feature.geometry).reduce((count, path) => count + path.length, 0);
  }

  function modifiedTraceIds() {
    return traceCollection.features
      .filter(feature => JSON.stringify(feature) !== JSON.stringify(traceDrafts[feature.id] ?? feature))
      .map(feature => feature.id);
  }

  function exportModifiedFiles() {
    const features = draftFeatures();
    const registrationChanged = JSON.stringify(anchors) !== JSON.stringify(canonicalAnchors);
    const baseVertexCount = traceCollection.features.reduce((count, feature) => count + traceVertexCount(feature), 0);
    const currentVertexCount = features.reduce((count, feature) => count + traceVertexCount(feature), 0);
    const changedIds = modifiedTraceIds();
    downloadJson('historical-battle-map-traces.geojson', { ...traceCollection, features });
    if (registrationChanged) downloadJson('historical-battle-map-registration.json', { ...registrationRaw, anchors });
    downloadJson('trace-edit-summary.json', {
      baseCommit: BASE_COMMIT,
      timestamp: new Date().toISOString(),
      modifiedTraceIds: changedIds,
      addedVertices: Math.max(0, currentVertexCount - baseVertexCount),
      removedVertices: Math.max(0, baseVertexCount - currentVertexCount),
      registrationChanged,
    });
    setLastExportSignature(currentEditSignature);
    setMessage(registrationChanged
      ? '已匯出 trace dataset、registration JSON 與 trace-edit-summary；檔案尚未寫回 GitHub。'
      : '已匯出 trace dataset 與 trace-edit-summary；檔案尚未寫回 GitHub。');
  }

  function resetToCanonical() {
    if (typeof window !== 'undefined' && !window.confirm('重新載入目前 GitHub 版本？這會清除本瀏覽器中的人工編修草稿。')) return;
    pushHistory();
    setAnchors(cloneAnchors(canonicalAnchors));
    setTraceDrafts({});
    setSelectedTraceId(traceCollection.features[0]?.id ?? null);
    setTraceFilter('all');
    setShowSource(true);
    setShowVisitor(true);
    setSourceOpacity(1);
    setLastExportSignature(canonicalEditSignature);
    setLastSavedAt(null);
    if (typeof window !== 'undefined') window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    setMessage('已重新載入目前 GitHub 版本；瀏覽器草稿已清除。');
  }

  function handleTraceImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    void file.text().then(raw => {
      try {
        const imported = parseHistoricalTraceCollection(raw);
        const canonicalIds = new Set(traceCollection.features.map(feature => feature.id));
        if (imported.features.length !== traceCollection.features.length || imported.features.some(feature => !canonicalIds.has(feature.id))) {
          throw new Error('請匯入與目前專案相同 trace IDs 的完整 GeoJSON dataset。');
        }
        pushHistory();
        setTraceDrafts(Object.fromEntries(imported.features.map(feature => [feature.id, feature])));
        setMessage(`已匯入 ${imported.features.length} 條 trace；請確認後再按「匯出修改」。`);
      } catch (error) {
        setMessage('trace GeoJSON 匯入失敗：' + (error instanceof Error ? error.message : String(error)));
      }
    });
  }

  function handleRegistrationImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    void file.text().then(raw => {
      try {
        const imported = JSON.parse(raw) as { anchors?: unknown };
        if (!Array.isArray(imported.anchors) || !imported.anchors.every(isAnchorDraft)) {
          throw new Error('registration JSON 必須包含格式正確的 anchors 陣列。');
        }
        pushHistory();
        setAnchors(cloneAnchors(imported.anchors));
        setMessage(`已匯入 ${imported.anchors.length} 個 anchor；請確認後再按「匯出修改」。`);
      } catch (error) {
        setMessage('registration JSON 匯入失敗：' + (error instanceof Error ? error.message : String(error)));
      }
    });
  }

  function handleSourceClick(event: MouseEvent<HTMLDivElement>) {
    const image = imageRef.current;
    if (!image) return;
    const rect = image.getBoundingClientRect();
    const source: [number, number] = [
      Math.round(((event.clientX - rect.left) / rect.width) * sourceMapWidth),
      Math.round(((event.clientY - rect.top) / rect.height) * sourceMapHeight),
    ];
    if (editControlPoint && selectedTraceDraft?.properties.sourceGraphic) {
      pushHistory();
      const points = selectedTraceDraft.properties.sourceGraphic.points.map(point => [...point] as [number, number]);
      const index = Math.max(0, Math.min(points.length - 1, sourceControlPointIndex));
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
    pushHistory();
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
    pushHistory();
    setAnchors(current => current.filter(anchor => anchor.id !== id));
  }

  function updateAnchor(id: string, enabled: boolean) {
    pushHistory();
    setAnchors(current => current.map(anchor => anchor.id === id ? { ...anchor, enabled, status: enabled ? 'candidate' : 'needs_human_confirmation' } : anchor));
  }

  function selectTrace(id: string) {
    setSelectedTraceId(id);
    setSourceControlPointIndex(0);
    setGeometryPathIndex(0);
    setVertexIndex(0);
    setEditControlPoint(false);
    setDraggingVertex(null);
  }

  function setTraceReviewStatus(status: HistoricalTraceFeature['properties']['reviewStatus']) {
    if (!selectedTraceDraft) return;
    pushHistory();
    setTraceDrafts(current => ({
      ...current,
      [selectedTraceDraft.id]: { ...selectedTraceDraft, properties: { ...selectedTraceDraft.properties, reviewStatus: status } },
    }));
  }

  function updateGeometryVertex(pathIndex: number, nextVertexIndex: number, position: Position) {
    if (!selectedTraceDraft) return;
    const path = editablePath(selectedTraceDraft.geometry, pathIndex);
    if (!path[nextVertexIndex]) return;
    const nextPath = path.map((value, index) => index === nextVertexIndex ? position : value);
    updateSelectedTraceDraft(feature => ({ ...feature, geometry: replaceEditablePath(feature.geometry, pathIndex, nextPath) }), false);
  }

  function handleReferencePointerDown(event: ReactPointerEvent<SVGCircleElement>, pathIndex: number, nextVertexIndex: number) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pushHistory();
    setGeometryPathIndex(pathIndex);
    setVertexIndex(nextVertexIndex);
    setDraggingVertex({ pathIndex, vertexIndex: nextVertexIndex });
    setMessage('拖曳目前 visitor map vertex 修正路徑；欄位 provenance、confidence 與 canonical Locations 不會被改動。');
  }

  function handleReferencePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!draggingVertex) return;
    updateGeometryVertex(draggingVertex.pathIndex, draggingVertex.vertexIndex, referencePosition(event));
  }

  function handleReferencePointerUp() {
    if (!draggingVertex) return;
    setDraggingVertex(null);
    setMessage('visitor map vertex 已移動；請按「下載正式 trace dataset」保存人工修正結果。');
  }

  function addGeometryVertex() {
    if (!selectedTraceDraft || selectedEditablePath.length < 2) return;
    const insertAfter = Math.max(0, Math.min(selectedEditablePath.length - 1, vertexIndex));
    const nextIndex = (insertAfter + 1) % selectedEditablePath.length;
    const start = selectedEditablePath[insertAfter];
    const end = selectedEditablePath[nextIndex];
    const midpoint: Position = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    const nextPath = [...selectedEditablePath];
    nextPath.splice(insertAfter + 1, 0, midpoint);
    updateSelectedTraceDraft(feature => ({ ...feature, geometry: replaceEditablePath(feature.geometry, geometryPathIndex, nextPath) }));
    setVertexIndex(insertAfter + 1);
    setMessage('已新增 visitor map vertex；請拖曳節點到來源圖對應位置。');
  }

  function deleteGeometryVertex() {
    if (!selectedTraceDraft) return;
    const minimum = isClosedPath(selectedTraceDraft.geometry) ? 3 : 2;
    if (selectedEditablePath.length <= minimum) {
      setMessage(`目前 geometry 至少需要 ${minimum} 個 vertex，未刪除。`);
      return;
    }
    const nextPath = selectedEditablePath.filter((_, index) => index !== vertexIndex);
    updateSelectedTraceDraft(feature => ({ ...feature, geometry: replaceEditablePath(feature.geometry, geometryPathIndex, nextPath) }));
    setVertexIndex(Math.max(0, Math.min(vertexIndex, nextPath.length - 1)));
    setMessage('已刪除 visitor map vertex；請確認路徑仍符合來源圖。');
  }

  return (
    <main className="historical-registration" data-enabled-anchor-count={enabledAnchors.length} data-draft-status={hasUnexportedChanges ? 'unexported' : 'saved'}>
      <header className="historical-registration__masthead">
        <div>
          <span>RESEARCH WORKBENCH · V0.8.3</span>
          <h1>研究編修工具</h1>
          <h2>Historical Battle Map Registration</h2>
          <p>來源圖：古寧頭戰役路線圖.jpg · 目前是 schematic_only，不是精密地理套準。</p>
          <p className="historical-registration__draft-banner">目前修改儲存在此瀏覽器，尚未寫入 GitHub 專案。<strong>{draftStatus}</strong></p>
        </div>
        <div className="historical-registration__actions">
          <button type="button" onClick={exportModifiedFiles}>匯出修改</button>
          <button type="button" onClick={() => traceImportRef.current?.click()}>匯入 trace GeoJSON</button>
          <button type="button" onClick={() => registrationImportRef.current?.click()}>匯入 registration JSON</button>
          <button type="button" onClick={resetToCanonical}>重新載入 GitHub 版本</button>
          <button type="button" onClick={undo} disabled={!undoStack.length}>復原</button>
          <button type="button" onClick={redo} disabled={!redoStack.length}>重做</button>
          <button type="button" onClick={() => downloadJson('historical-battle-map-registration.draft.json', { ...registrationRaw, anchors })}>保存 anchor set</button>
          <button type="button" onClick={() => downloadJson('historical-battle-map-traces.review-draft.geojson', { ...traceCollection, features: draftFeatures() })}>下載 trace review draft</button>
          <input ref={traceImportRef} className="historical-registration__file-input" type="file" accept=".geojson,.json,application/geo+json,application/json" onChange={handleTraceImport} aria-label="匯入 trace GeoJSON" />
          <input ref={registrationImportRef} className="historical-registration__file-input" type="file" accept=".json,application/json" onChange={handleRegistrationImport} aria-label="匯入 registration JSON" />
        </div>
      </header>

      <section className="historical-registration__status">
        <strong>{enabledAnchors.length}</strong><span>enabled anchors</span>
        <strong>{enabledAnchors.length >= 3 ? 'READY FOR REVIEW' : 'NOT ENOUGH'}</strong><span>transform gate</span>
        <strong>NONE</strong><span>auto-selected transform</span>
        <strong>{registrationRaw.registrationMethod}</strong><span>registration method</span>
        <strong>MANUAL</strong><span>trace correction priority</span>
        <strong>{phaseCollection.phases.length}</strong><span>historical phases loaded</span>
      </section>

      <div className="historical-registration__comparison">
        <section className="historical-registration__panel">
          <header><span>SOURCE IMAGE · 1000×641</span><strong>Historical battle drawing</strong></header>
          <div className="historical-registration__view-toggle">
            <button type="button" className={showSource ? 'is-selected' : ''} onClick={() => setShowSource(value => !value)}>{showSource ? '隱藏 source map' : '顯示 source map'}</button>
            <small>選 trace 後可在圖上檢視 sourceGraphic</small>
          </div>
          <label className="historical-registration__opacity-control">source overlay opacity
            <input type="range" min="0" max="1" step="0.05" value={sourceOpacity} onChange={event => setSourceOpacity(Number(event.target.value))} />
            <output>{Math.round(sourceOpacity * 100)}%</output>
          </label>
          <div className={`historical-registration__source ${showSource ? '' : 'is-hidden'}`} onClick={handleSourceClick}>
            <img ref={imageRef} src={sourceUrl(base)} alt="古寧頭戰役路線圖" style={{ opacity: sourceOpacity }} />
            {pendingSource && <span className="historical-registration__pending-point" style={{ left: (pendingSource[0] / sourceMapWidth) * 100 + '%', top: (pendingSource[1] / sourceMapHeight) * 100 + '%' }} />}
            {showSource && selectedTraceDraft?.properties.sourceGraphic && <svg viewBox="0 0 1000 641" aria-hidden="true">
              <polyline points={selectedTraceDraft.properties.sourceGraphic.points.map(point => point.join(',')).join(' ')} />
              {selectedTraceDraft.properties.sourceGraphic.points.map((point, index) => <circle key={index} cx={point[0]} cy={point[1]} r={index === sourceControlPointIndex ? 8 : 5} />)}
            </svg>}
            {!showSource && <span className="historical-registration__map-hidden">SOURCE MAP OVERLAY HIDDEN</span>}
          </div>
          <p className="historical-registration__notice">{message}</p>
        </section>

        <section className="historical-registration__panel">
          <header><span>VISITOR MAP · WGS84</span><strong>Visitor map / source trace overlay</strong></header>
          <div className="historical-registration__view-toggle">
            <button type="button" className={showVisitor ? 'is-selected' : ''} onClick={() => setShowVisitor(value => !value)}>{showVisitor ? '隱藏 visitor traces' : '顯示 visitor traces'}</button>
            <small>拖曳選取的節點；點擊空白處仍可建立停用 anchor candidate</small>
          </div>
          <svg className={`historical-registration__reference ${draggingVertex ? 'is-dragging' : ''}`} viewBox="0 0 100 100" onClick={handleReferenceClick} onPointerMove={handleReferencePointerMove} onPointerUp={handleReferencePointerUp} role="img" aria-label="現代地理參考圖">
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
            {showVisitor && traceList.map(trace => {
              const draft = traceDrafts[trace.id] ?? trace;
              return geometryPaths(draft.geometry).map((path, pathIndex) => {
                const points = path.map(point => { const projected = geographicPoint(point); return `${projected.x},${projected.y}`; }).join(' ');
                const area = isAreaGeometry(draft.geometry);
                return area
                  ? <polygon key={`${trace.id}-${pathIndex}`} className={`historical-registration__visitor-trace historical-registration__visitor-trace--${traceClass(draft)} ${trace.id === selectedTraceId ? 'is-selected' : ''}`} points={points} />
                  : <polyline key={`${trace.id}-${pathIndex}`} className={`historical-registration__visitor-trace historical-registration__visitor-trace--${traceClass(draft)} ${trace.id === selectedTraceId ? 'is-selected' : ''}`} points={points} />;
              });
            })}
            {selectedTraceDraft && selectedGeometryPaths.map((_, pathIndex) => editablePath(selectedTraceDraft.geometry, pathIndex).map((position, nextVertexIndex) => {
              const point = geographicPoint(position);
              return <circle key={`vertex-${pathIndex}-${nextVertexIndex}`} className={`historical-registration__vertex ${pathIndex === geometryPathIndex && nextVertexIndex === vertexIndex ? 'is-selected' : ''}`} cx={point.x} cy={point.y} r={pathIndex === geometryPathIndex && nextVertexIndex === vertexIndex ? 2.7 : 1.8} onPointerDown={event => handleReferencePointerDown(event, pathIndex, nextVertexIndex)} />;
            }))}
          </svg>
          <p className="historical-registration__notice">Visitor map 直接顯示目前 trace dataset 的 geometry；選取 trace 後可拖曳、增加或刪除 vertex。它仍是 schematic / approximate，不會自動 snap 到 OSM。</p>
        </section>
      </div>

      <section className="historical-registration__checklist">
        <header><span>MANUAL REVIEW MODE</span><strong>人工修正流程</strong></header>
        <ol>
          <li>開啟 historical source map overlay，選擇一條既有 trace。</li>
          <li>對照來源戰役圖、visitor map 與 canonical location 參考。</li>
          <li>拖曳節點；需要時新增或刪除 vertex，再檢查路線方向。</li>
          <li>按「匯出修改」下載 GeoJSON；若跨電腦，先匯入 trace／registration JSON。</li>
          <li>回正式 map 檢查 10/25 與 10/26；不需要時用「重新載入 GitHub 版本」清除草稿。</li>
        </ol>
        <p>優先順序：國軍反擊方向 → 國軍防線 → 共軍登陸後向內陸推進。sourceIds、confidence、provenance、visitorLabel、sourceLabel 與 canonical Locations 不得任意改動。</p>
      </section>

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
          <div className="historical-registration__filter-row" role="group" aria-label="Trace side and type filters">
            {([
              ['all', '全部'], ['pla', 'PLA'], ['roc', 'ROC'], ['defense', '防線'], ['battle-area', '戰鬥區域'],
            ] as Array<[TraceFilter, string]>).map(([filter, label]) => <button type="button" key={filter} className={traceFilter === filter ? 'is-selected' : ''} onClick={() => setTraceFilter(filter)}>{label}</button>)}
          </div>
          <div className="historical-registration__trace-list">
            {traceList.map(trace => <button type="button" key={trace.id} className={trace.id === selectedTraceId ? 'is-selected' : ''} onClick={() => selectTrace(trace.id)}><span>{trace.properties.side}</span><strong>{historicalTraceVisitorLabel(trace, 'zh-Hant')}</strong><small>{historicalTraceSourceLabel(trace, 'zh-Hant')} · {trace.properties.featureType} · {trace.properties.confidence}</small></button>)}
            {!traceList.length && <p className="historical-registration__empty-filter">目前篩選沒有 trace。</p>}
          </div>
          {selectedTraceDraft && <div className="historical-registration__trace-detail">
            <h2>{historicalTraceVisitorLabel(selectedTraceDraft, 'zh-Hant')}</h2>
            <p className="historical-registration__source-label">SOURCE · {historicalTraceSourceLabel(selectedTraceDraft, 'zh-Hant')}</p>
            <p>{selectedTraceDraft.properties.notes}</p>
            <dl><div><dt>sourceMapId</dt><dd>{selectedTraceDraft.properties.sourceMapId}</dd></div><div><dt>registration</dt><dd>{selectedTraceDraft.properties.registrationMethod}</dd></div><div><dt>status</dt><dd>{selectedTraceDraft.properties.reviewStatus}</dd></div><div><dt>side / feature</dt><dd>{selectedTraceDraft.properties.side} · {selectedTraceDraft.properties.featureType}</dd></div><div><dt>confidence</dt><dd>{selectedTraceDraft.properties.confidence}</dd></div><div><dt>sourceIds</dt><dd>{selectedTraceDraft.properties.sourceIds.join(' · ')}</dd></div><div><dt>relatedUnits</dt><dd>{selectedTraceDraft.properties.relatedUnits.join(' · ') || 'none · needs human confirmation'}</dd></div><div><dt>canonical locations</dt><dd>{selectedTraceDraft.properties.relatedLocations.join(' · ') || 'none'}</dd></div></dl>
            <div className="historical-registration__actions">
              <button type="button" onClick={() => setTraceReviewStatus('reviewed')}>approve review draft</button>
              <button type="button" onClick={() => setTraceReviewStatus('needs_human_confirmation')}>needs human confirmation</button>
              {selectedTraceDraft.properties.sourceGraphic && <button type="button" onClick={() => setEditControlPoint(value => !value)}>{editControlPoint ? 'finish control-point edit' : 'move source control point'}</button>}
            </div>
            {editControlPoint && selectedTraceDraft.properties.sourceGraphic && <div className="historical-registration__control-points">{selectedTraceDraft.properties.sourceGraphic.points.map((point, index) => <button type="button" key={index} className={index === sourceControlPointIndex ? 'is-selected' : ''} onClick={() => setSourceControlPointIndex(index)}>P{index + 1} · {point.join(', ')}</button>)}</div>}
            <div className="historical-registration__geometry-editor">
              <strong>VISITOR GEOMETRY · {selectedTraceDraft.geometry.type}</strong>
              <span>path {geometryPathIndex + 1} · vertex {selectedEditablePath.length ? vertexIndex + 1 : 0} / {selectedEditablePath.length}</span>
              {selectedGeometryPaths.length > 1 && <div className="historical-registration__control-points">{selectedGeometryPaths.map((_, index) => <button type="button" key={index} className={index === geometryPathIndex ? 'is-selected' : ''} onClick={() => { setGeometryPathIndex(index); setVertexIndex(0); }}>PATH {index + 1}</button>)}</div>}
              <div className="historical-registration__actions"><button type="button" onClick={addGeometryVertex}>新增 vertex</button><button type="button" onClick={deleteGeometryVertex}>刪除 selected vertex</button></div>
              <div className="historical-registration__control-points">{selectedEditablePath.map((point, index) => <button type="button" key={index} className={index === vertexIndex ? 'is-selected' : ''} onClick={() => { setVertexIndex(index); setGeometryPathIndex(geometryPathIndex); }}>V{index + 1} · {point[0].toFixed(5)}, {point[1].toFixed(5)}</button>)}</div>
            </div>
          </div>}
        </section>
      </section>

      <footer className="historical-registration__footer">正式 map 直接讀取 <code>data/battles/guningtou-1949/historical-battle-map-traces.geojson</code>。本工具只在瀏覽器保存草稿與下載檔案，不會寫入 GitHub；由研究者審查後再替換資料檔並執行 validation / tests / typecheck / build。不修改 canonical Locations。</footer>
    </main>
  );
}
