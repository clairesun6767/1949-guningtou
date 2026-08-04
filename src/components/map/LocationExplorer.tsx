// ============================================================
// LocationExplorer — 地點列表 + 互動迷你地圖
// ============================================================

import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { pois as allPois } from '../../data/loader';

export default function LocationExplorer() {
  const [selectedPoi, setSelectedPoi] = useState<typeof allPois[0] | null>(null);
  const [filter, setFilter] = useState('');
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [24.475, 118.31],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPoi) return;
    if (markerRef.current) markerRef.current.remove();

    const icon = L.divIcon({
      className: '',
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#d97706;border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,.6)"></div>',
      iconSize: [14, 14], iconAnchor: [7, 7],
    });
    const marker = L.marker([selectedPoi.latitude, selectedPoi.longitude], { icon }).addTo(map);
    marker.bindPopup(`<strong>${selectedPoi.name_chinese}</strong><br>${selectedPoi.latitude}, ${selectedPoi.longitude}`).openPopup();
    markerRef.current = marker;
    map.flyTo([selectedPoi.latitude, selectedPoi.longitude], 16, { duration: 0.8 });
  }, [selectedPoi]);

  const categories = [...new Set(allPois.map(p => p.category).filter(Boolean))] as string[];
  const filtered = filter ? allPois.filter(p => p.category === filter) : allPois;

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setFilter('')}
            className={`px-3 py-1 rounded-full text-sm transition ${!filter ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
            全部 ({allPois.length})
          </button>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat === filter ? '' : cat)}
              className={`px-3 py-1 rounded-full text-sm transition ${cat === filter ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
              {cat}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map(poi => (
            <div key={poi.poi_id} onClick={() => setSelectedPoi(poi)}
              className={`cursor-pointer bg-white p-4 rounded-lg border transition hover:shadow-md ${
                selectedPoi?.poi_id === poi.poi_id ? 'border-amber-400 ring-1 ring-amber-200 shadow-md' : 'border-stone-200'
              }`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-stone-800 text-sm">{poi.name_chinese}</h3>
                  {poi.name_english && <div className="text-xs text-stone-400">{poi.name_english}</div>}
                </div>
                <a href={`./locations/${poi.poi_id}`} onClick={e => e.stopPropagation()}
                  className="text-xs text-amber-600 hover:underline shrink-0 ml-2">詳情 →</a>
              </div>
              <p className="text-xs text-stone-500 mt-2 line-clamp-2">{poi.short_description ?? poi.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-stone-100 px-1.5 py-0.5 rounded">{poi.category}</span>
                <span className="text-xs text-stone-400 font-mono">{poi.latitude.toFixed(4)}, {poi.longitude.toFixed(4)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-80 shrink-0">
        <div className="sticky top-20 rounded-xl overflow-hidden border border-stone-200 shadow-sm">
          <div className="bg-stone-50 px-4 py-2 text-xs text-stone-500 font-medium border-b border-stone-200">
            📍 點擊地點名稱查看位置
          </div>
          <div ref={containerRef} className="w-full h-80 lg:h-[500px]" />
          <div className="bg-stone-50 px-4 py-1.5 text-xs text-stone-400 text-center font-mono">
            {selectedPoi
              ? `${selectedPoi.name_chinese}  ${selectedPoi.latitude.toFixed(4)}, ${selectedPoi.longitude.toFixed(4)}`
              : '尚未選取地點'}
          </div>
        </div>
      </div>
    </div>
  );
}
