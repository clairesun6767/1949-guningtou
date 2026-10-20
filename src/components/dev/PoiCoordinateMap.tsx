import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { POI } from '../../data/types';

export interface PoiDraftCoordinate {
  latitude: number;
  longitude: number;
}

interface Props {
  pois: POI[];
  coordinates: Record<string, PoiDraftCoordinate>;
  selectedPoiId?: string;
  editedPoiIds: Set<string>;
  onSelect: (poiId: string) => void;
  onMove: (poiId: string, latitude: number, longitude: number) => void;
}

const DEFAULT_CENTER: L.LatLngExpression = [24.475, 118.32];

function markerIcon(selected: boolean, edited: boolean): L.DivIcon {
  const color = selected ? '#f2d08a' : edited ? '#d27d5f' : '#68756c';
  const border = selected ? '#fff4d1' : '#e7e0d1';
  const size = selected ? 18 : 12;
  return L.divIcon({
    className: 'poi-coordinate-marker',
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid ${border};box-shadow:0 0 0 4px rgba(23,23,19,.26)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function PoiCoordinateMap({
  pois,
  coordinates,
  selectedPoiId,
  editedPoiIds,
  onSelect,
  onMove,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const callbackRef = useRef({ onSelect, onMove });
  const hasFitBoundsRef = useRef(false);

  useEffect(() => {
    callbackRef.current = { onSelect, onMove };
  }, [onSelect, onMove]);

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

    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      hasFitBoundsRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layerRef.current;
    if (!map || !layers) return;

    layers.clearLayers();
    const bounds: L.LatLngTuple[] = [];

    pois.forEach((poi) => {
      const coordinate = coordinates[poi.poi_id];
      if (!coordinate || !Number.isFinite(coordinate.latitude) || !Number.isFinite(coordinate.longitude)) return;

      const position: L.LatLngTuple = [coordinate.latitude, coordinate.longitude];
      bounds.push(position);
      const isSelected = poi.poi_id === selectedPoiId;
      const isEdited = editedPoiIds.has(poi.poi_id);
      const label = `${poi.poi_id} · ${poi.name_chinese}${isEdited ? ' · 草稿已移動' : ''}`;

      if (isSelected) {
        const marker = L.marker(position, {
          icon: markerIcon(true, isEdited),
          draggable: true,
          autoPan: true,
          title: label,
        }).addTo(layers);
        marker.bindTooltip('拖曳此點調整位置').openTooltip();
        marker.on('dragend', () => {
          const next = marker.getLatLng();
          callbackRef.current.onMove(poi.poi_id, next.lat, next.lng);
        });
        marker.on('click', () => callbackRef.current.onSelect(poi.poi_id));
      } else {
        const marker = L.circleMarker(position, {
          radius: isEdited ? 7 : 5,
          color: isEdited ? '#d27d5f' : '#e7e0d1',
          fillColor: isEdited ? '#d27d5f' : '#68756c',
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(layers);
        marker.bindTooltip(label);
        marker.on('click', () => callbackRef.current.onSelect(poi.poi_id));
      }
    });

    if (!hasFitBoundsRef.current && bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [28, 28], maxZoom: 14 });
      hasFitBoundsRef.current = true;
    }

    if (selectedPoiId && coordinates[selectedPoiId]) {
      const selected = coordinates[selectedPoiId];
      map.panTo([selected.latitude, selected.longitude], { animate: true, duration: 0.35 });
    }
  }, [coordinates, editedPoiIds, pois, selectedPoiId]);

  return <div ref={containerRef} className="poi-coordinate-map" aria-label="POI 座標人工定位地圖" />;
}
