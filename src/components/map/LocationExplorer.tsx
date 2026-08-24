// ============================================================
// LocationExplorer — 地點索引 + 互動迷你地圖
// ============================================================

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { pois as allPois } from '../../data/loader';

interface Props {
  lang?: string;
}

const BASE = '/1949-guningtou';

export default function LocationExplorer({ lang = 'zh-tw' }: Props) {
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
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#a78a5b;border:3px solid #f6f2e9;box-shadow:0 0 0 4px rgba(23,23,19,.18)"></div>',
      iconSize: [14, 14], iconAnchor: [7, 7],
    });
    const marker = L.marker([selectedPoi.latitude, selectedPoi.longitude], { icon }).addTo(map);
    marker.bindPopup(`<strong>${selectedPoi.name_chinese}</strong><br><small>${selectedPoi.latitude}, ${selectedPoi.longitude}</small>`).openPopup();
    markerRef.current = marker;
    map.flyTo([selectedPoi.latitude, selectedPoi.longitude], 16, { duration: 0.8 });
  }, [selectedPoi]);

  const categories = [...new Set(allPois.map((poi) => poi.category).filter(Boolean))] as string[];
  const filtered = filter ? allPois.filter((poi) => poi.category === filter) : allPois;

  return (
    <div className="museum-location-explorer">
      <div className="museum-location-explorer__list">
        <div className="museum-filter-row" role="group" aria-label="地點分類">
          <button type="button" className={`museum-filter ${!filter ? 'museum-filter--active' : ''}`} onClick={() => setFilter('')}>全部 ({allPois.length})</button>
          {categories.map((category) => (
            <button key={category} type="button" className={`museum-filter ${category === filter ? 'museum-filter--active' : ''}`} onClick={() => setFilter(category === filter ? '' : category)}>{category}</button>
          ))}
        </div>

        <div className="museum-grid museum-grid--2">
          {filtered.map((poi) => (
            <article key={poi.poi_id} className={`museum-card museum-location-result ${selectedPoi?.poi_id === poi.poi_id ? 'museum-location-result--active' : ''}`}>
              <button type="button" className="museum-location-result__select" onClick={() => setSelectedPoi(poi)} aria-pressed={selectedPoi?.poi_id === poi.poi_id}>
                <span className="museum-kicker">{poi.category || '地點'} · {poi.poi_id}</span>
                <h3>{poi.name_chinese}</h3>
                {poi.name_english && <span className="museum-citation">{poi.name_english}</span>}
                <p>{poi.short_description ?? poi.description}</p>
                <span className="museum-meta">{poi.latitude.toFixed(4)}, {poi.longitude.toFixed(4)}</span>
              </button>
              <a className="museum-link museum-location-result__detail" href={`${BASE}/${lang}/locations/${poi.poi_id}/`}>查看檔案 →</a>
            </article>
          ))}
        </div>
      </div>

      <aside className="museum-location-explorer__map">
        <div className="museum-map-header-inline"><span className="museum-kicker">LOCATION INDEX</span><span>點選地點以定位</span></div>
        <div ref={containerRef} />
        <div className="museum-citation museum-location-explorer__coordinates">{selectedPoi ? `${selectedPoi.name_chinese} · ${selectedPoi.latitude.toFixed(4)}, ${selectedPoi.longitude.toFixed(4)}` : '尚未選取地點'}</div>
      </aside>
    </div>
  );
}
