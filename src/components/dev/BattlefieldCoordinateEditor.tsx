import { useEffect, useMemo, useState } from 'react';

import {
  ManualExternalMapReferenceAdapter,
  OpenStreetMapReferenceAdapter,
} from '../../battle-replay/adapters/map-reference/index.js';
import {
  applyManualCoordinateOverride,
  parseCoordinateInput,
  serializeFeatureCollection,
} from '../../battle-replay/index.js';
import {
  addRouteWaypoint,
  createRouteDraft,
  deleteRouteWaypoint,
  moveRouteWaypoint,
  reorderRouteWaypoint,
  setRouteSegmentUncertainty,
} from '../../battle-replay/services/routeEditing.js';
import {
  calibrationStorageKey,
  parseCalibrationDraft,
  serializeCalibrationDraft,
  type PersistedCalibrationDraft,
} from '../../battle-replay/services/editorPersistence.js';
import type {
  BattlePackageData,
  BattlePackageManifest,
  AltitudeReference,
  Confidence,
  CoordinateMethod,
  CoordinatePrecision,
  GeoJsonFeatureCollection,
  GroundControlPointDataset,
  ImageryGeoreferencingMetadata,
  LocationFeature,
  LocationProperties,
  Position2D,
  Position,
  RouteFeature,
  RouteNature,
  RouteProperties,
  RouteType,
  Source,
  VerificationStatus,
} from '../../battle-replay/types/index.js';
import {
  validateBattlePackage,
  validateGeospatialCalibration,
  type ValidationDiagnostic,
} from '../../battle-replay/validation/index.js';
import CoordinateReferenceMap from './CoordinateReferenceMap.js';
import './coordinate-editor.css';

type LocationCollection = GeoJsonFeatureCollection<LocationFeature['geometry'], LocationProperties>;
type RouteCollection = GeoJsonFeatureCollection<RouteFeature['geometry'], RouteProperties>;
type CalibrationState = { dataset: GroundControlPointDataset; imagery: ImageryGeoreferencingMetadata[] };

interface Props {
  manifest: BattlePackageManifest;
  initialData: BattlePackageData;
  initialLocations: LocationCollection;
  initialRoutes: RouteCollection;
  initialGroundControlPoints: GroundControlPointDataset;
  initialImagery: ImageryGeoreferencingMetadata[];
}

const coordinateMethods: CoordinateMethod[] = [
  'official-gis', 'government-map', 'field-survey', 'survey',
  'google-map-manual-reference', 'google-earth-manual-reference',
  'satellite-manual-identification', 'aerial-photo-georeference',
  'historical-map-georeference', 'local-knowledge', 'manual-correction',
];
const coordinatePrecisions: CoordinatePrecision[] = ['exact', 'high', 'medium', 'approximate', 'area-only', 'unknown'];
const confidences: Confidence[] = ['confirmed', 'probable', 'estimated', 'disputed', 'unknown'];
const routeNatures: RouteNature[] = ['recorded', 'reconstructed', 'estimated', 'possible', 'unknown'];
const routeTypes: RouteType[] = ['planned', 'actual', 'landing', 'advance', 'retreat', 'supply', 'observation', 'unknown'];
const gcpStatuses: VerificationStatus[] = ['candidate', 'pending-manual-verification', 'manually-verified', 'source-verified', 'estimated', 'disputed', 'unknown'];

function displayText(value?: Record<string, string> | null): string {
  if (!value) return '—';
  return value['zh-Hant'] ?? value.en ?? Object.values(value)[0] ?? '—';
}

function refs(value: string): string[] {
  return value.split(/[,;；]/).map(item => item.trim()).filter(Boolean);
}

function downloadJson(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function nextStableId(prefix: string, ids: string[]): string {
  let index = 1;
  const used = new Set(ids);
  while (used.has(`${prefix}${String(index).padStart(4, '0')}`)) index += 1;
  return `${prefix}${String(index).padStart(4, '0')}`;
}

export default function BattlefieldCoordinateEditor({
  manifest,
  initialData,
  initialLocations,
  initialRoutes,
  initialGroundControlPoints,
  initialImagery,
}: Props) {
  const [mode, setMode] = useState<'locations' | 'routes' | 'gcp'>('locations');
  const [locations, setLocations] = useState<LocationCollection>(initialLocations);
  const [routes, setRoutes] = useState<RouteCollection>(initialRoutes);
  const [groundControlPoints, setGroundControlPoints] = useState(initialGroundControlPoints);
  const [imagery, setImagery] = useState(initialImagery);
  const [selectedLocationIndex, setSelectedLocationIndex] = useState(0);
  const [candidate, setCandidate] = useState<Position2D | undefined>();
  const [coordinateInput, setCoordinateInput] = useState('');
  const [parseMessage, setParseMessage] = useState('尚未輸入候選座標。');
  const [coordinateMethod, setCoordinateMethod] = useState<CoordinateMethod>('manual-correction');
  const [coordinatePrecision, setCoordinatePrecision] = useState<CoordinatePrecision>('unknown');
  const [locationConfidence, setLocationConfidence] = useState<Confidence>('unknown');
  const [locationSourceRefs, setLocationSourceRefs] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [locationNotes, setLocationNotes] = useState('');
  const [diagnostics, setDiagnostics] = useState<ValidationDiagnostic[]>([]);
  const [saveMessage, setSaveMessage] = useState('尚無本機草稿變更。');
  const [referenceLinks, setReferenceLinks] = useState<Array<{ label: string; href: string }>>([]);

  const [routeDraft, setRouteDraft] = useState<RouteFeature | null>(null);
  const [routePointInput, setRoutePointInput] = useState('');
  const [routeCandidate, setRouteCandidate] = useState<Position2D | undefined>();
  const [selectedRoutePointId, setSelectedRoutePointId] = useState('');
  const [routeType, setRouteType] = useState<RouteType>('unknown');
  const [routeNature, setRouteNature] = useState<RouteNature>('unknown');
  const [routeConfidence, setRouteConfidence] = useState<Confidence>('unknown');
  const [routeSourceRefs, setRouteSourceRefs] = useState('');
  const [routeNotes, setRouteNotes] = useState('');

  const [gcpImageId, setGcpImageId] = useState(initialImagery[0]?.imageId ?? '');
  const [gcpPixelX, setGcpPixelX] = useState('');
  const [gcpPixelY, setGcpPixelY] = useState('');
  const [gcpCoordinateInput, setGcpCoordinateInput] = useState('');
  const [gcpCandidate, setGcpCandidate] = useState<Position2D | undefined>();
  const [gcpAltitude, setGcpAltitude] = useState('');
  const [gcpAltitudeReference, setGcpAltitudeReference] = useState<AltitudeReference>('unknown');
  const [gcpSourceRef, setGcpSourceRef] = useState('');
  const [gcpSourceDescription, setGcpSourceDescription] = useState('');
  const [gcpConfidence, setGcpConfidence] = useState<Confidence>('unknown');
  const [gcpStatus, setGcpStatus] = useState<VerificationStatus>('candidate');
  const [gcpNotes, setGcpNotes] = useState('');

  const selectedLocation = locations.features[selectedLocationIndex] ?? locations.features[0];
  const sourceIds = useMemo(() => new Set(initialData.sources.map(source => source.id)), [initialData.sources]);

  const status = useMemo(() => ({
    verified: locations.features.filter(item => ['manually-verified', 'source-verified'].includes(item.properties.verificationStatus)).length,
    pending: locations.features.filter(item => ['unverified', 'candidate', 'pending-manual-verification', 'unknown'].includes(item.properties.verificationStatus)).length,
    estimated: locations.features.filter(item => item.properties.verificationStatus === 'estimated').length,
    disputed: locations.features.filter(item => item.properties.verificationStatus === 'disputed').length,
  }), [locations]);

  const packageWith = (nextLocations: LocationCollection, nextRoutes: RouteCollection): BattlePackageData => ({
    ...initialData,
    locations: nextLocations.features,
    routes: nextRoutes.features,
  });

  function persist(
    nextLocations = locations,
    nextRoutes = routes,
    nextDataset = groundControlPoints,
    nextImagery = imagery,
  ): void {
    const draft: PersistedCalibrationDraft<LocationCollection, RouteCollection, CalibrationState> = {
      schemaVersion: '1.0.0',
      packageId: manifest.packageId,
      savedAt: new Date().toISOString(),
      locations: nextLocations,
      routes: nextRoutes,
      groundControlPoints: { dataset: nextDataset, imagery: nextImagery },
    };
    localStorage.setItem(calibrationStorageKey(manifest.packageId), serializeCalibrationDraft(draft));
    setSaveMessage(`本機草稿已儲存：${new Date(draft.savedAt).toLocaleString()}`);
  }

  useEffect(() => {
    const serialized = localStorage.getItem(calibrationStorageKey(manifest.packageId));
    if (!serialized) return;
    try {
      const draft = parseCalibrationDraft<LocationCollection, RouteCollection, CalibrationState>(serialized, manifest.packageId);
      setLocations(draft.locations);
      setRoutes(draft.routes);
      setGroundControlPoints(draft.groundControlPoints.dataset);
      setImagery(draft.groundControlPoints.imagery);
      setSaveMessage(`已載入本機草稿：${new Date(draft.savedAt).toLocaleString()}`);
    } catch (error) {
      setSaveMessage(`本機草稿無法載入：${error instanceof Error ? error.message : String(error)}`);
    }
  }, [manifest.packageId]);

  useEffect(() => {
    if (!selectedLocation) return;
    const current = selectedLocation.geometry?.type === 'Point'
      ? selectedLocation.geometry.coordinates.slice(0, 2) as Position2D
      : undefined;
    setCandidate(current);
    setCoordinateInput(current ? `${current[1]}, ${current[0]}` : '');
    setCoordinateMethod(selectedLocation.properties.coordinateProvenance.verificationMethod
      ?? selectedLocation.properties.coordinateProvenance.coordinateMethod);
    setCoordinatePrecision(selectedLocation.properties.coordinateProvenance.coordinatePrecision);
    setLocationConfidence(selectedLocation.properties.confidence);
    setLocationSourceRefs(selectedLocation.properties.sourceRefs.join(', '));
    setReviewer(selectedLocation.properties.coordinateProvenance.verifiedBy ?? '');
    setLocationNotes(selectedLocation.properties.coordinateProvenance.notes ?? '');
    setParseMessage(current ? `目前 canonical 值：[${current[0]}, ${current[1]}]。` : '此地點尚無 canonical coordinate。');
  }, [selectedLocation?.properties.id]);

  useEffect(() => {
    if (!candidate) {
      setReferenceLinks([]);
      return;
    }
    const adapters = [
      { label: 'OpenStreetMap', adapter: new OpenStreetMapReferenceAdapter() },
      { label: 'Google Maps（外部人工參考）', adapter: new ManualExternalMapReferenceAdapter('google-maps-manual') },
      { label: 'Google Earth（外部人工參考）', adapter: new ManualExternalMapReferenceAdapter('google-earth-manual') },
    ];
    Promise.all(adapters.map(async item => ({ label: item.label, href: (await item.adapter.inspectCoordinate(candidate)).providerReference })))
      .then(setReferenceLinks);
  }, [candidate]);

  function parseCandidate(raw = coordinateInput): Position2D | undefined {
    const result = parseCoordinateInput(raw);
    setParseMessage(result.message);
    if (result.status !== 'parsed') {
      setCandidate(undefined);
      return undefined;
    }
    setCandidate(result.position);
    return result.position;
  }

  function resetLocationForm(): void {
    if (!selectedLocation) return;
    const current = selectedLocation.geometry?.type === 'Point'
      ? selectedLocation.geometry.coordinates.slice(0, 2) as Position2D
      : undefined;
    setCandidate(current);
    setCoordinateInput(current ? `${current[1]}, ${current[0]}` : '');
    setCoordinateMethod(selectedLocation.properties.coordinateProvenance.verificationMethod
      ?? selectedLocation.properties.coordinateProvenance.coordinateMethod);
    setCoordinatePrecision(selectedLocation.properties.coordinateProvenance.coordinatePrecision);
    setLocationConfidence(selectedLocation.properties.confidence);
    setLocationSourceRefs(selectedLocation.properties.sourceRefs.join(', '));
    setReviewer(selectedLocation.properties.coordinateProvenance.verifiedBy ?? '');
    setLocationNotes(selectedLocation.properties.coordinateProvenance.notes ?? '');
    setParseMessage('表單已重設為目前本機草稿值。');
  }

  function handleMapCandidate(position: Position2D): void {
    setCandidate(position);
    setCoordinateInput(`${position[1].toFixed(6)}, ${position[0].toFixed(6)}`);
    setParseMessage(`地圖點選候選：longitude ${position[0].toFixed(6)}, latitude ${position[1].toFixed(6)}。尚未儲存。`);
  }

  function saveLocation(): void {
    if (!selectedLocation || !candidate) {
      setSaveMessage('儲存失敗：必須先提供並辨識人工候選座標。');
      return;
    }
    try {
      const prepared: LocationFeature = {
        ...selectedLocation,
        properties: {
          ...selectedLocation.properties,
          confidence: locationConfidence,
          sourceRefs: refs(locationSourceRefs),
          coordinateProvenance: {
            ...selectedLocation.properties.coordinateProvenance,
            coordinatePrecision,
            confidence: locationConfidence,
            sourceRefs: refs(locationSourceRefs),
          },
        },
      };
      const updated = applyManualCoordinateOverride(prepared, {
        finalCoordinate: candidate,
        verificationMethod: coordinateMethod as Exclude<CoordinateMethod, 'estimated' | 'unknown'>,
        verifiedBy: reviewer,
        verifiedAt: new Date().toISOString(),
        notes: locationNotes,
        candidateSource: 'battlefield-coordinate-editor:human-input',
        confidence: locationConfidence,
        sourceRefs: refs(locationSourceRefs),
      });
      const nextLocations: LocationCollection = {
        ...locations,
        features: locations.features.map(item => item.properties.id === updated.properties.id ? updated : item),
      };
      const report = validateBattlePackage(packageWith(nextLocations, routes), manifest);
      setDiagnostics(report.diagnostics);
      if (!report.valid) {
        setSaveMessage(`儲存被阻止：${report.errors} 個 ERROR。`);
        return;
      }
      setLocations(nextLocations);
      persist(nextLocations);
    } catch (error) {
      setSaveMessage(`儲存失敗：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function resetAllDrafts(): void {
    localStorage.removeItem(calibrationStorageKey(manifest.packageId));
    setLocations(initialLocations);
    setRoutes(initialRoutes);
    setGroundControlPoints(initialGroundControlPoints);
    setImagery(initialImagery);
    setRouteDraft(null);
    setDiagnostics([]);
    setSaveMessage('本機草稿已清除；canonical repository 檔案從未被瀏覽器直接改寫。');
  }

  function beginRouteDraft(): void {
    const id = nextStableId('RTE-GUN-', routes.features.map(item => item.properties.id));
    setRouteDraft(createRouteDraft({
      id, battleId: initialData.battle.id, phaseId: initialData.phases[0]?.id,
      routeType, nature: routeNature, sourceRefs: refs(routeSourceRefs), confidence: routeConfidence, notes: routeNotes,
    }));
    setSelectedRoutePointId('');
  }

  function parseRoutePoint(): Position2D | undefined {
    const result = parseCoordinateInput(routePointInput);
    setParseMessage(result.message);
    if (result.status !== 'parsed') {
      setRouteCandidate(undefined);
      return undefined;
    }
    setRouteCandidate(result.position);
    return result.position;
  }

  function selectExistingRoute(routeId: string): void {
    const selected = routes.features.find(item => item.properties.id === routeId) ?? null;
    setRouteDraft(selected ? structuredClone(selected) : null);
    if (selected) {
      setRouteType(selected.properties.routeType);
      setRouteNature(selected.properties.nature);
      setRouteConfidence(selected.properties.confidence);
      setRouteSourceRefs(selected.properties.sourceRefs.join(', '));
      setRouteNotes(displayText(selected.properties.notes));
    }
  }

  function addWaypoint(): void {
    const point = parseRoutePoint();
    if (!routeDraft || !point) return;
    const next = addRouteWaypoint(routeDraft, point, {
      sourceRefs: refs(routeSourceRefs), confidence: routeConfidence,
      verificationStatus: 'pending-manual-verification', notes: 'Human-entered waypoint candidate.',
    });
    setRouteDraft(next);
    setSelectedRoutePointId(next.properties.routePoints.at(-1)?.id ?? '');
  }

  function moveWaypoint(): void {
    const point = parseRoutePoint();
    if (!routeDraft || !selectedRoutePointId || !point) return;
    setRouteDraft(moveRouteWaypoint(routeDraft, selectedRoutePointId, point));
  }

  function saveRoute(): void {
    if (!routeDraft) return;
    const prepared: RouteFeature = {
      ...routeDraft,
      properties: {
        ...routeDraft.properties,
        routeType,
        nature: routeNature,
        confidence: routeConfidence,
        sourceRefs: refs(routeSourceRefs),
        notes: routeNotes ? { 'zh-Hant': routeNotes } : undefined,
        geometryProvenance: {
          ...routeDraft.properties.geometryProvenance,
          confidence: routeConfidence,
          sourceRefs: refs(routeSourceRefs),
        },
      },
    };
    const nextRoutes: RouteCollection = {
      ...routes,
      features: routes.features.some(item => item.properties.id === prepared.properties.id)
        ? routes.features.map(item => item.properties.id === prepared.properties.id ? prepared : item)
        : [...routes.features, prepared],
    };
    const report = validateBattlePackage(packageWith(locations, nextRoutes), manifest);
    setDiagnostics(report.diagnostics);
    if (!report.valid) {
      setSaveMessage(`Route 儲存被阻止：${report.errors} 個 ERROR。`);
      return;
    }
    setRoutes(nextRoutes);
    persist(locations, nextRoutes);
  }

  function addGcp(): void {
    const parsed = parseCoordinateInput(gcpCoordinateInput);
    if (parsed.status !== 'parsed') {
      setSaveMessage(`GCP 儲存失敗：${parsed.message}`);
      return;
    }
    setGcpCandidate(parsed.position);
    const altitude = gcpAltitude.trim() === '' ? undefined : Number(gcpAltitude);
    if (altitude !== undefined && !Number.isFinite(altitude)) {
      setSaveMessage('GCP 儲存失敗：Altitude 必須是有限數值。');
      return;
    }
    const coordinate: Position = altitude === undefined
      ? parsed.position
      : [parsed.position[0], parsed.position[1], altitude];
    const id = nextStableId('GCP-GUN-', groundControlPoints.controlPoints.map(item => item.id));
    const nextDataset: GroundControlPointDataset = {
      ...groundControlPoints,
      controlPoints: [...groundControlPoints.controlPoints, {
        id,
        imageId: gcpImageId,
        imagePixel: [Number(gcpPixelX), Number(gcpPixelY)],
        coordinate,
        altitudeReference: altitude === undefined ? undefined : gcpAltitudeReference,
        sourceRef: gcpSourceRef || undefined,
        sourceDescription: gcpSourceDescription || undefined,
        confidence: gcpConfidence,
        verificationStatus: gcpStatus,
        notes: gcpNotes || undefined,
      }],
    };
    const nextImagery = imagery.map(image => image.imageId === gcpImageId ? {
      ...image,
      gcpRefs: [...image.gcpRefs, id],
      transformStatus: image.gcpRefs.length + 1 >= 3 ? 'ready-for-fit' as const : 'insufficient-gcps' as const,
      errorModel: { ...image.errorModel, gcpCount: image.gcpRefs.length + 1 },
    } : image);
    const report = validateGeospatialCalibration(nextDataset, nextImagery, sourceIds);
    setDiagnostics(report.diagnostics);
    if (!report.valid) {
      setSaveMessage(`GCP 儲存被阻止：${report.errors} 個 ERROR。`);
      return;
    }
    setGroundControlPoints(nextDataset);
    setImagery(nextImagery);
    persist(locations, routes, nextDataset, nextImagery);
  }

  const mapRoutes = routeDraft ? [...routes.features.filter(item => item.properties.id !== routeDraft.properties.id), routeDraft] : routes.features;

  return (
    <div className="coordinate-editor" data-testid="coordinate-editor">
      <header className="coordinate-editor__masthead">
        <div>
          <div className="coordinate-editor__kicker">DEVELOPMENT TOOL · BR-1.5</div>
          <h1>Battlefield Coordinate Editor</h1>
          <p>人工校準古寧頭地點、路線 waypoint 與 1944 航照 GCP。此工具不會搜尋或自動填入史實座標。</p>
        </div>
        <button className="coordinate-editor__button coordinate-editor__button--quiet" onClick={resetAllDrafts}>清除本機草稿</button>
      </header>

      <section className="coordinate-editor__status" aria-label="校準狀態">
        <div><strong>{locations.features.length}</strong><span>Locations</span></div>
        <div><strong>{status.verified}</strong><span>Verified</span></div>
        <div><strong>{status.pending}</strong><span>Pending</span></div>
        <div><strong>{status.estimated}</strong><span>Estimated</span></div>
        <div><strong>{status.disputed}</strong><span>Disputed</span></div>
        <div><strong>{routes.features.length}</strong><span>Routes</span></div>
        <div><strong>{groundControlPoints.controlPoints.length}</strong><span>GCP</span></div>
      </section>

      <nav className="coordinate-editor__tabs" aria-label="Editor sections">
        <button aria-pressed={mode === 'locations'} onClick={() => setMode('locations')}>Location</button>
        <button aria-pressed={mode === 'routes'} onClick={() => setMode('routes')}>Route / Waypoint</button>
        <button aria-pressed={mode === 'gcp'} onClick={() => setMode('gcp')}>1944 GCP</button>
      </nav>

      <div className="coordinate-editor__workspace">
        <main className="coordinate-editor__panel">
          {mode === 'locations' && selectedLocation && (
            <>
              <div className="coordinate-editor__section-heading">
                <div><span>LOCATION {selectedLocationIndex + 1}/{locations.features.length}</span><h2>{displayText(selectedLocation.properties.historicalName)}</h2></div>
                <button className="coordinate-editor__button" onClick={() => setSelectedLocationIndex((selectedLocationIndex + 1) % locations.features.length)}>下一地點 →</button>
              </div>
              <label>選擇地點<select value={selectedLocation.properties.id} onChange={event => setSelectedLocationIndex(locations.features.findIndex(item => item.properties.id === event.target.value))}>{locations.features.map(item => <option key={item.properties.id} value={item.properties.id}>{displayText(item.properties.historicalName)} · {item.properties.id}</option>)}</select></label>
              <div className="coordinate-editor__identity">
                <dl><dt>Modern name</dt><dd>{displayText(selectedLocation.properties.modernName)}</dd></dl>
                <dl><dt>Aliases</dt><dd>{selectedLocation.properties.aliases.map(displayText).join('、') || '—'}</dd></dl>
                <dl><dt>Current geometry</dt><dd>{selectedLocation.geometry ? JSON.stringify(selectedLocation.geometry) : 'null · pending'}</dd></dl>
                <dl><dt>Status</dt><dd>{selectedLocation.properties.verificationStatus}</dd></dl>
              </div>
              <label className="coordinate-editor__wide">貼上座標<input value={coordinateInput} onChange={event => setCoordinateInput(event.target.value)} placeholder="24.xxxxxx, 118.xxxxxx 或 118.xxxxxx, 24.xxxxxx" /></label>
              <div className="coordinate-editor__actions"><button className="coordinate-editor__button" onClick={() => parseCandidate()}>辨識順序</button><span className="coordinate-editor__message">{parseMessage}</span></div>
              <div className="coordinate-editor__grid">
                <label>Longitude<input type="number" step="0.000001" value={candidate?.[0] ?? ''} onChange={event => setCandidate([Number(event.target.value), candidate?.[1] ?? NaN])} /></label>
                <label>Latitude<input type="number" step="0.000001" value={candidate?.[1] ?? ''} onChange={event => setCandidate([candidate?.[0] ?? NaN, Number(event.target.value)])} /></label>
                <label>Method<select value={coordinateMethod} onChange={event => setCoordinateMethod(event.target.value as CoordinateMethod)}>{coordinateMethods.map(item => <option key={item}>{item}</option>)}</select></label>
                <label>Precision<select value={coordinatePrecision} onChange={event => setCoordinatePrecision(event.target.value as CoordinatePrecision)}>{coordinatePrecisions.map(item => <option key={item}>{item}</option>)}</select></label>
                <label>Confidence<select value={locationConfidence} onChange={event => setLocationConfidence(event.target.value as Confidence)}>{confidences.map(item => <option key={item}>{item}</option>)}</select></label>
                <label>Reviewer<input value={reviewer} onChange={event => setReviewer(event.target.value)} placeholder="required" /></label>
              </div>
              <label>Source refs<input list="source-ids" value={locationSourceRefs} onChange={event => setLocationSourceRefs(event.target.value)} placeholder="SRC-0001, SRC-0002" /></label>
              <label>Review notes<textarea value={locationNotes} onChange={event => setLocationNotes(event.target.value)} placeholder="required · 比對方法、限制與判斷理由" /></label>
              <div className="coordinate-editor__actions">
                <button className="coordinate-editor__button coordinate-editor__button--primary" onClick={saveLocation}>確認並儲存本機草稿</button>
                <button className="coordinate-editor__button" onClick={resetLocationForm}>重設表單</button>
                <button className="coordinate-editor__button" onClick={() => downloadJson('locations.geojson', serializeFeatureCollection(locations))}>下載 locations.geojson</button>
              </div>
              <div className="coordinate-editor__reference-links">{referenceLinks.map(link => <a key={link.label} href={link.href} target="_blank" rel="noreferrer">{link.label} ↗</a>)}</div>
            </>
          )}

          {mode === 'routes' && (
            <>
              <div className="coordinate-editor__section-heading"><div><span>ROUTE DRAFT</span><h2>{routeDraft?.properties.id ?? '尚未建立路線草稿'}</h2></div><button className="coordinate-editor__button" onClick={beginRouteDraft}>建立新草稿</button></div>
              <label>載入已儲存 route<select value={routeDraft?.properties.id ?? ''} onChange={event => selectExistingRoute(event.target.value)}><option value="">—</option>{routes.features.map(route => <option key={route.properties.id} value={route.properties.id}>{route.properties.id} · {route.properties.nature}</option>)}</select></label>
              <div className="coordinate-editor__grid">
                <label>Route type<select value={routeType} onChange={event => setRouteType(event.target.value as RouteType)}>{routeTypes.map(item => <option key={item}>{item}</option>)}</select></label>
                <label>Segment status<select value={routeNature} onChange={event => setRouteNature(event.target.value as RouteNature)}>{routeNatures.map(item => <option key={item}>{item}</option>)}</select></label>
                <label>Confidence<select value={routeConfidence} onChange={event => setRouteConfidence(event.target.value as Confidence)}>{confidences.map(item => <option key={item}>{item}</option>)}</select></label>
                <label>Unit optional<select disabled={initialData.units.length === 0}><option>{initialData.units.length === 0 ? 'No canonical units available' : 'Select unit'}</option></select></label>
              </div>
              <label>Source refs<input value={routeSourceRefs} onChange={event => setRouteSourceRefs(event.target.value)} placeholder="可留空，但 validator 會警告" /></label>
              <label>Notes<textarea value={routeNotes} onChange={event => setRouteNotes(event.target.value)} /></label>
              <label>Waypoint coordinate<input value={routePointInput} onChange={event => setRoutePointInput(event.target.value)} placeholder="每個 waypoint 必須由人工作業加入" /></label>
              <div className="coordinate-editor__actions"><button className="coordinate-editor__button" disabled={!routeDraft} onClick={addWaypoint}>加入 waypoint</button><button className="coordinate-editor__button" disabled={!routeDraft || !selectedRoutePointId} onClick={moveWaypoint}>移動選取 waypoint</button></div>
              <div className="coordinate-editor__waypoints">
                {routeDraft?.properties.routePoints.map((point, index) => <div key={point.id} className={selectedRoutePointId === point.id ? 'is-selected' : ''}>
                  <button onClick={() => { setSelectedRoutePointId(point.id); setRoutePointInput(`${point.coordinate[1]}, ${point.coordinate[0]}`); }}>#{point.sequence} · {point.coordinate[0].toFixed(6)}, {point.coordinate[1].toFixed(6)}</button>
                  <span><button aria-label="上移" onClick={() => setRouteDraft(reorderRouteWaypoint(routeDraft, point.id, -1))}>↑</button><button aria-label="下移" onClick={() => setRouteDraft(reorderRouteWaypoint(routeDraft, point.id, 1))}>↓</button><button aria-label="刪除" onClick={() => setRouteDraft(deleteRouteWaypoint(routeDraft, point.id))}>×</button></span>
                  {index < routeDraft.properties.routePoints.length - 1 && <select aria-label={`Segment ${index + 1} uncertainty`} defaultValue="unknown" onChange={event => setRouteDraft(setRouteSegmentUncertainty(routeDraft, index + 1, event.target.value as 'unknown' | 'estimated' | 'reconstructed' | 'disputed', refs(routeSourceRefs), routeConfidence))}><option>unknown</option><option>estimated</option><option>reconstructed</option><option>disputed</option></select>}
                </div>)}
                {!routeDraft?.properties.routePoints.length && <p>沒有 waypoint。Editor 不會由起點與終點自動生成路線。</p>}
              </div>
              <div className="coordinate-editor__actions"><button className="coordinate-editor__button coordinate-editor__button--primary" disabled={!routeDraft} onClick={saveRoute}>驗證並儲存 route draft</button><button className="coordinate-editor__button" onClick={() => downloadJson('routes.geojson', serializeFeatureCollection(routes))}>下載 routes.geojson</button></div>
            </>
          )}

          {mode === 'gcp' && (
            <>
              <div className="coordinate-editor__section-heading"><div><span>GROUND CONTROL POINT</span><h2>1944 航照校準準備</h2></div></div>
              <label>Image<select value={gcpImageId} onChange={event => setGcpImageId(event.target.value)}>{imagery.map(image => <option key={image.imageId} value={image.imageId}>{image.imageId} · {image.width}×{image.height}</option>)}</select></label>
              <div className="coordinate-editor__grid"><label>Pixel X<input type="number" min="0" value={gcpPixelX} onChange={event => setGcpPixelX(event.target.value)} /></label><label>Pixel Y<input type="number" min="0" value={gcpPixelY} onChange={event => setGcpPixelY(event.target.value)} /></label></div>
              <label>WGS84 coordinate<input value={gcpCoordinateInput} onChange={event => setGcpCoordinateInput(event.target.value)} placeholder="人工辨識後輸入，不自動生成" /></label>
              <div className="coordinate-editor__grid"><label>Altitude optional<input type="number" value={gcpAltitude} onChange={event => setGcpAltitude(event.target.value)} placeholder="留空，不以 0 代替未知" /></label><label>Height reference<select value={gcpAltitudeReference} disabled={!gcpAltitude.trim()} onChange={event => setGcpAltitudeReference(event.target.value as AltitudeReference)}><option>unknown</option><option>ellipsoidal</option><option>orthometric</option><option>terrain-relative</option></select></label></div>
              <div className="coordinate-editor__grid">
                <label>Source ref<input value={gcpSourceRef} onChange={event => setGcpSourceRef(event.target.value)} /></label>
                <label>Source description<input value={gcpSourceDescription} onChange={event => setGcpSourceDescription(event.target.value)} /></label>
                <label>Confidence<select value={gcpConfidence} onChange={event => setGcpConfidence(event.target.value as Confidence)}>{confidences.map(item => <option key={item}>{item}</option>)}</select></label>
                <label>Status<select value={gcpStatus} onChange={event => setGcpStatus(event.target.value as VerificationStatus)}>{gcpStatuses.map(item => <option key={item}>{item}</option>)}</select></label>
              </div>
              <label>Notes<textarea value={gcpNotes} onChange={event => setGcpNotes(event.target.value)} /></label>
              <div className="coordinate-editor__actions"><button className="coordinate-editor__button coordinate-editor__button--primary" onClick={addGcp}>驗證並加入 GCP</button><button className="coordinate-editor__button" onClick={() => downloadJson('ground-control-points.json', `${JSON.stringify(groundControlPoints, null, 2)}\n`)}>下載 GCP dataset</button><button className="coordinate-editor__button" onClick={() => downloadJson('imagery-georeferencing.json', `${JSON.stringify(imagery, null, 2)}\n`)}>下載 imagery metadata</button></div>
              <div className="coordinate-editor__imagery-status">{imagery.map(image => <dl key={image.imageId}><dt>{image.imageId}</dt><dd>{image.gcpRefs.length} GCP · {image.transformStatus} · RMSE {image.errorModel.rmseMeters ?? 'pending'}</dd></dl>)}</div>
              {gcpCandidate && <p className="coordinate-editor__message">最近 GCP 候選：[longitude {gcpCandidate[0]}, latitude {gcpCandidate[1]}]</p>}
            </>
          )}

          <datalist id="source-ids">{initialData.sources.map((source: Source) => <option key={source.id} value={source.id}>{displayText(source.title)}</option>)}</datalist>
          <footer className="coordinate-editor__save-status"><strong>Save status</strong><span>{saveMessage}</span></footer>
          {diagnostics.length > 0 && <section className="coordinate-editor__diagnostics"><h3>Validation diagnostics</h3>{diagnostics.slice(0, 20).map((item, index) => <p key={`${item.code}-${index}`} data-severity={item.severity}><strong>{item.severity}</strong> {item.code} · {item.entityId ?? item.path ?? ''} · {item.message}</p>)}</section>}
        </main>

        <aside className="coordinate-editor__map-panel">
          <CoordinateReferenceMap
            locations={locations.features}
            routes={mapRoutes}
            selectedLocationId={selectedLocation?.properties.id}
            candidate={mode === 'gcp' ? gcpCandidate : mode === 'routes' ? routeCandidate : candidate}
            onCandidate={mode === 'gcp'
              ? position => { setGcpCandidate(position); setGcpCoordinateInput(`${position[1].toFixed(6)}, ${position[0].toFixed(6)}`); }
              : mode === 'routes'
                ? position => { setRouteCandidate(position); setRoutePointInput(`${position[1].toFixed(6)}, ${position[0].toFixed(6)}`); setParseMessage('地圖點選 route waypoint 候選；尚未加入路線。'); }
                : handleMapCandidate}
          />
          <div className="coordinate-editor__policy"><strong>人工校準閘門</strong><p>Map click、貼上座標與外部連結都只建立候選值。只有 Reviewer、method、notes 與 validation 完整時才可保存草稿；正式 repository 仍需人工審查後替換下載檔。</p></div>
        </aside>
      </div>
    </div>
  );
}
