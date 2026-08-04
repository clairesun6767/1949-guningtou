// ============================================================
// BattleMap — 戰役地圖（Leaflet + 全 25 POI + 路線 + 圖例）
// ============================================================

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { pois } from '../../data/loader';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const CENTER: L.LatLngExpression = [24.475, 118.31];

const CATEGORY_COLORS: Record<string, string> = {
  'Landing Beach': '#dc2626',
  'Village': '#d97706',
  'High Ground': '#ea580c',
  'Command Post': '#2563eb',
  'Memorial': '#16a34a',
  'Military Facility': '#7c3aed',
  'Coastal Defense': '#0891b2',
  'Road': '#78716c',
  'Bunker': '#57534e',
  'Tunnel': '#475569',
};

const LANDING_ROUTES: [number, number][][] = [
  [[24.45, 118.08], [24.455, 118.16], [24.462, 118.24], [24.467, 118.309]],
  [[24.45, 118.08], [24.46, 118.17], [24.472, 118.25], [24.478, 118.316]],
  [[24.45, 118.08], [24.454, 118.19], [24.462, 118.26], [24.471, 118.328]],
];

const COUNTER_ROUTES: [number, number][][] = [
  [[24.460, 118.330], [24.465, 118.325], [24.472, 118.320], [24.478, 118.316]],
];

export default function BattleMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: CENTER,
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
      maxZoom: 18,
      minZoom: 12,
    });

    L.tileLayer(TILE_URL, {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    // POI markers
    pois.forEach((poi) => {
      const color = CATEGORY_COLORS[poi.category ?? ''] ?? '#888';
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 6px rgba(0,0,0,.5)"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });
      const marker = L.marker([poi.latitude, poi.longitude], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family:sans-serif;min-width:180px">
          <strong>${poi.name_chinese}</strong>
          ${poi.name_english ? `<br><small style="color:#888">${poi.name_english}</small>` : ''}
          <br><small style="color:#666">${poi.category ?? ''}</small>
          <p style="margin:6px 0 0;font-size:12px;color:#444">${poi.short_description ?? poi.description ?? ''}</p>
          <a href="./locations/${poi.poi_id}" style="font-size:12px;color:#d97706">查看詳情 →</a>
        </div>
      `);
    });

    // Landing routes
    LANDING_ROUTES.forEach((route, i) => {
      L.polyline(route, {
        color: ['#ef4444', '#f97316', '#dc2626'][i],
        weight: 2,
        opacity: 0.6,
        dashArray: '6 3',
      }).addTo(map);
    });

    // Counter routes
    COUNTER_ROUTES.forEach((route) => {
      L.polyline(route, {
        color: '#3b82f6',
        weight: 2,
        opacity: 0.6,
        dashArray: '4 2',
      }).addTo(map);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 56px)' }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute bottom-6 left-4 z-[1000] bg-white/90 backdrop-blur rounded-lg shadow-lg px-3 py-2 text-xs space-y-1 border border-stone-200">
        <div class="font-bold text-stone-700 mb-1">圖例</div>
        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#dc2626] inline-block"></span>登陸灘頭</div>
        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#d97706] inline-block"></span>村落</div>
        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#2563eb] inline-block"></span>指揮所</div>
        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-[#16a34a] inline-block"></span>紀念地</div>
        <hr class="border-stone-200 my-1" />
        <div class="flex items-center gap-1.5"><span class="w-4 h-0.5 bg-[#ef4444] inline-block"></span>解放軍登陸</div>
        <div class="flex items-center gap-1.5"><span class="w-4 h-0.5 bg-[#3b82f6] inline-block"></span>國軍反擊</div>
      </div>
    </div>
  );
}
