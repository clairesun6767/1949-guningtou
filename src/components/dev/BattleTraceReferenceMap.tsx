import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { POI } from '../../data/types';
import type { GeoJsonGeometry, Position } from '../../battle-replay/types/index.js';
import type { HistoricalTraceFeature } from '../../battle-replay/visualization/historicalTraces.js';

interface CanonicalLocationReference {
  id: string;
  name: string;
  coordinate: Position;
}

interface AnchorReference {
  id: string;
  coordinate: Position;
  enabled: boolean;
}

interface Props {
  pois: POI[];
  canonicalLocations: CanonicalLocationReference[];
  anchors: AnchorReference[];
  traces: HistoricalTraceFeature[];
  selectedTraceId: string | null;
  geometryPathIndex: number;
  vertexIndex: number;
  onSelectTrace: (traceId: string) => void;
  onMoveVertex: (pathIndex: number, vertexIndex: number, position: Position) => void;
  onMapClick: (position: Position) => void;
}

const DEFAULT_CENTER: L.LatLngExpression = [24.476, 118.32];

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

function editablePath(geometry: GeoJsonGeometry, pathIndex: number): Position[] {
  const path = geometryPaths(geometry)[pathIndex] ?? [];
  const isArea = geometry.type === 'Polygon' || geometry.type === 'MultiPolygon';
  if (!isArea || path.length < 2) return path;
  const first = path[0];
  const last = path.at(-1);
  if (last && first[0] === last[0] && first[1] === last[1]) return path.slice(0, -1);
  return path;
}

function latLngs(path: Position[]): L.LatLngExpression[] {
  return path.map(([longitude, latitude]) => [latitude, longitude]);
}

function traceColour(trace: HistoricalTraceFeature, selected: boolean) {
  if (trace.properties.side === 'pla') return selected ? '#f07a60' : '#bd5b4e';
  if (trace.properties.side === 'roc') return selected ? '#83c1d8' : '#4e849b';
  return selected ? '#e6c47c' : '#a48754';
}

function vertexIcon(selected: boolean) {
  const size = selected ? 18 : 13;
  const colour = selected ? '#e06d54' : '#f2e4c4';
  return L.divIcon({
    className: 'battle-trace-reference-map__vertex-icon',
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${colour};border:2px solid #1b1c18;box-shadow:0 0 0 2px rgba(242,228,196,.65)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function BattleTraceReferenceMap({
  pois,
  canonicalLocations,
  anchors,
  traces,
  selectedTraceId,
  geometryPathIndex,
  vertexIndex,
  onSelectTrace,
  onMoveVertex,
  onMapClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const callbackRef = useRef({ onSelectTrace, onMoveVertex, onMapClick });

  useEffect(() => {
    callbackRef.current = { onSelectTrace, onMoveVertex, onMapClick };
  }, [onMapClick, onMoveVertex, onSelectTrace]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 14,
      minZoom: 11,
      maxZoom: 19,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const layers = L.layerGroup().addTo(map);
    map.on('click', event => callbackRef.current.onMapClick([event.latlng.lng, event.latlng.lat]));
    mapRef.current = map;
    layerRef.current = layers;
    window.setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layers = layerRef.current;
    if (!layers) return;
    layers.clearLayers();

    pois.forEach(poi => {
      if (!Number.isFinite(poi.latitude) || !Number.isFinite(poi.longitude)) return;
      const isResearch = poi.map_visibility === 'research';
      const marker = L.circleMarker([poi.latitude, poi.longitude], {
        radius: isResearch ? 4 : 5,
        color: isResearch ? '#a39a88' : '#f1e4c8',
        fillColor: isResearch ? '#6d6a5e' : '#9b7849',
        fillOpacity: isResearch ? 0.55 : 0.9,
        weight: 1.5,
        opacity: isResearch ? 0.65 : 1,
      }).addTo(layers);
      marker.bindTooltip(`${poi.poi_id} · ${poi.name_chinese}${isResearch ? ' · research' : ''}`, { sticky: true });
    });

    canonicalLocations.forEach(location => {
      const [longitude, latitude] = location.coordinate;
      L.circleMarker([latitude, longitude], {
        radius: 7,
        color: '#d9f0e7',
        fillColor: '#2e6862',
        fillOpacity: 0.9,
        weight: 2,
      }).bindTooltip(`canonical · ${location.name}`, { sticky: true }).addTo(layers);
    });

    anchors.forEach(anchor => {
      const [longitude, latitude] = anchor.coordinate;
      L.circleMarker([latitude, longitude], {
        radius: anchor.enabled ? 8 : 6,
        color: '#f3e8d4',
        fillColor: anchor.enabled ? '#dd6c54' : '#6d8587',
        fillOpacity: 0.9,
        weight: 2,
      }).bindTooltip(`${anchor.id} · ${anchor.enabled ? 'candidate enabled' : 'needs human confirmation'}`, { sticky: true }).addTo(layers);
    });

    traces.forEach(trace => {
      const selected = trace.id === selectedTraceId;
      const colour = traceColour(trace, selected);
      const weight = selected ? 5 : trace.geometry.type === 'Polygon' || trace.geometry.type === 'MultiPolygon' ? 2 : 3;
      const opacity = selected ? 0.95 : trace.properties.researchOnly ? 0.25 : 0.65;
      geometryPaths(trace.geometry).forEach(path => {
        const isArea = trace.geometry.type === 'Polygon' || trace.geometry.type === 'MultiPolygon';
        const layer = isArea
          ? L.polygon(latLngs(path), { color: colour, fillColor: colour, fillOpacity: selected ? 0.2 : 0.08, weight, opacity })
          : L.polyline(latLngs(path), { color: colour, weight, opacity, dashArray: trace.properties.researchOnly ? '7 6' : undefined });
        layer.addTo(layers);
        layer.bindTooltip(`${trace.properties.visitorLabel?.['zh-Hant'] ?? trace.properties.label?.['zh-Hant'] ?? trace.id} · ${trace.properties.reviewStatus}`, { sticky: true });
        layer.on('click', event => {
          L.DomEvent.stopPropagation(event);
          callbackRef.current.onSelectTrace(trace.id);
        });
      });
    });

    const selectedTrace = traces.find(trace => trace.id === selectedTraceId);
    if (!selectedTrace) return;
    geometryPaths(selectedTrace.geometry).forEach((_, pathIndex) => {
      editablePath(selectedTrace.geometry, pathIndex).forEach(([longitude, latitude], nextVertexIndex) => {
        const marker = L.marker([latitude, longitude], {
          icon: vertexIcon(pathIndex === geometryPathIndex && nextVertexIndex === vertexIndex),
          draggable: true,
          autoPan: true,
          zIndexOffset: 1200,
          title: `trace vertex ${pathIndex + 1}.${nextVertexIndex + 1}`,
        }).addTo(layers);
        marker.on('click', event => L.DomEvent.stopPropagation(event));
        marker.on('dragend', () => {
          const next = marker.getLatLng();
          callbackRef.current.onMoveVertex(pathIndex, nextVertexIndex, [next.lng, next.lat]);
        });
      });
    });
  }, [anchors, canonicalLocations, geometryPathIndex, pois, selectedTraceId, traces, vertexIndex]);

  return <div ref={containerRef} className="battle-trace-reference-map" aria-label="目前 WGS84 POI 與戰役 trace 參考地圖" />;
}
