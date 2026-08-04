// ============================================================
// MiniMap — POI 詳情頁迷你地圖
// ============================================================

import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface Props {
  lat: number;
  lng: number;
  name: string;
}

export default function MiniMap({ lat, lng, name }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Marker
    const icon = L.divIcon({
      className: '',
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#d97706;border:3px solid white;box-shadow:0 0 8px rgba(0,0,0,.5)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    L.marker([lat, lng], { icon }).addTo(map)
      .bindPopup(`<strong>${name}</strong><br><small>${lat}, ${lng}</small>`)
      .openPopup();

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lng, name]);

  return (
    <div className="rounded-xl overflow-hidden border border-stone-200 shadow-sm sticky top-20">
      <div className="bg-stone-50 px-4 py-2 text-xs text-stone-500 font-medium border-b border-stone-200">
        📍 地圖位置
      </div>
      <div ref={containerRef} className="w-full h-72" />
      <div className="bg-stone-50 px-4 py-1.5 text-xs text-stone-400 font-mono text-center">
        {lat.toFixed(4)}, {lng.toFixed(4)}
      </div>
    </div>
  );
}
