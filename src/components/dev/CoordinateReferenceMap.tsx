import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { OpenStreetMapReferenceAdapter } from '../../battle-replay/adapters/map-reference/index.js';
import type { LocationFeature, Position2D, RouteFeature } from '../../battle-replay/types/index.js';

interface Props {
  locations: LocationFeature[];
  routes: RouteFeature[];
  selectedLocationId?: string;
  candidate?: Position2D;
  onCandidate: (position: Position2D) => void;
}

const referenceAdapter = new OpenStreetMapReferenceAdapter();
const DEVELOPMENT_VIEW_CENTER: L.LatLngExpression = [24.475, 118.31];

export default function CoordinateReferenceMap({
  locations,
  routes,
  selectedLocationId,
  candidate,
  onCandidate,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onCandidateRef = useRef(onCandidate);

  useEffect(() => { onCandidateRef.current = onCandidate; }, [onCandidate]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: DEVELOPMENT_VIEW_CENTER,
      zoom: 14,
      minZoom: 11,
      maxZoom: 19,
      zoomControl: true,
    });
    L.tileLayer(referenceAdapter.tileUrl, {
      maxZoom: 19,
      attribution: referenceAdapter.attribution,
    }).addTo(map);
    const layers = L.layerGroup().addTo(map);
    map.on('click', event => onCandidateRef.current([event.latlng.lng, event.latlng.lat]));
    mapRef.current = map;
    layerRef.current = layers;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layerRef.current;
    if (!map || !layers) return;
    layers.clearLayers();

    locations.forEach(location => {
      if (location.geometry?.type !== 'Point') return;
      const [longitude, latitude] = location.geometry.coordinates;
      const selected = location.properties.id === selectedLocationId;
      L.circleMarker([latitude, longitude], {
        radius: selected ? 8 : 5,
        color: selected ? '#f0d79b' : '#d0c3a5',
        fillColor: selected ? '#9f7842' : '#5f675f',
        fillOpacity: 0.9,
        weight: 2,
      }).bindTooltip(location.properties.historicalName['zh-Hant'] ?? location.properties.id).addTo(layers);
    });

    routes.forEach(route => {
      if (route.geometry?.type !== 'LineString') return;
      L.polyline(route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]), {
        color: route.properties.nature === 'recorded' ? '#d0c3a5' : '#a88452',
        weight: 3,
        dashArray: route.properties.nature === 'recorded' ? undefined : '7 5',
        opacity: 0.85,
      }).bindTooltip(`${route.properties.id} · ${route.properties.nature}`).addTo(layers);
    });

    if (candidate) {
      const [longitude, latitude] = candidate;
      L.circleMarker([latitude, longitude], {
        radius: 9,
        color: '#f7e9bc',
        fillColor: '#9c473c',
        fillOpacity: 0.9,
        weight: 3,
      }).bindTooltip('尚未儲存的人工候選點').addTo(layers);
      map.panTo([latitude, longitude]);
    }
  }, [locations, routes, selectedLocationId, candidate]);

  return (
    <div className="coordinate-reference-map">
      <div ref={containerRef} className="coordinate-reference-map__canvas" aria-label="現代 OpenStreetMap 人工參考地圖" />
      <p className="coordinate-reference-map__notice">
        現代 OSM 參考層 · 點擊只建立候選值，不會自動寫入史料。現代道路與海岸不代表 1949 狀態。
      </p>
    </div>
  );
}
