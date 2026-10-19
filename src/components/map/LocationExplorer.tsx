// ============================================================
// LocationExplorer — 地點索引 + 互動迷你地圖
// ============================================================

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { pois as allPois } from '../../data/loader';
import { getPoiCopy } from '../../i18n/historicalContent';

interface Props {
  lang?: string;
}

const BASE = '/1949-guningtou';

export default function LocationExplorer({ lang = 'zh-tw' }: Props) {
  const isEnglish = lang === 'en';
  const isSimplified = lang === 'zh-cn';
  const labels = isEnglish
    ? { categories: 'Location categories', all: 'All', place: 'Location', detail: 'Open record →', locate: 'Select a location to locate it', notSelected: 'No location selected' }
    : isSimplified
      ? { categories: '地点分类', all: '全部', place: '地点', detail: '查看档案 →', locate: '点击地点以定位', notSelected: '尚未选择地点' }
      : { categories: '地點分類', all: '全部', place: '地點', detail: '查看檔案 →', locate: '點選地點以定位', notSelected: '尚未選取地點' };
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
    const selectedName = getPoiCopy(selectedPoi, lang).name;
    marker.bindPopup(`<strong>${selectedName}</strong><br><small>${selectedPoi.latitude}, ${selectedPoi.longitude}</small>`).openPopup();
    markerRef.current = marker;
    map.flyTo([selectedPoi.latitude, selectedPoi.longitude], 16, { duration: 0.8 });
  }, [selectedPoi]);

  const categories = [...new Set(allPois.map((poi) => getPoiCopy(poi, lang).category).filter(Boolean))] as string[];
  const filtered = filter ? allPois.filter((poi) => getPoiCopy(poi, lang).category === filter) : allPois;

  return (
    <div className="museum-location-explorer">
      <div className="museum-location-explorer__list">
        <div className="museum-filter-row" role="group" aria-label={labels.categories}>
          <button type="button" className={`museum-filter ${!filter ? 'museum-filter--active' : ''}`} onClick={() => setFilter('')}>{labels.all} ({allPois.length})</button>
          {categories.map((category) => (
            <button key={category} type="button" className={`museum-filter ${category === filter ? 'museum-filter--active' : ''}`} onClick={() => setFilter(category === filter ? '' : category)}>{category}</button>
          ))}
        </div>

        <div className="museum-grid museum-grid--2">
          {filtered.map((poi) => (
            (() => {
              const copy = getPoiCopy(poi, lang);
              return (
            <article key={poi.poi_id} className={`museum-card museum-location-result ${selectedPoi?.poi_id === poi.poi_id ? 'museum-location-result--active' : ''}`}>
              <button type="button" className="museum-location-result__select" onClick={() => setSelectedPoi(poi)} aria-pressed={selectedPoi?.poi_id === poi.poi_id}>
                <span className="museum-kicker">{copy.category || labels.place} · {poi.poi_id}</span>
                <h3>{copy.name}</h3>
                {poi.name_english && lang !== 'en' && <span className="museum-citation">{poi.name_english}</span>}
                <p>{copy.shortDescription}</p>
                <span className="museum-meta">{poi.latitude.toFixed(4)}, {poi.longitude.toFixed(4)}</span>
              </button>
              <a className="museum-link museum-location-result__detail" href={`${BASE}/${lang}/locations/${poi.poi_id}/`}>{labels.detail}</a>
            </article>
              );
            })()
          ))}
        </div>
      </div>

      <aside className="museum-location-explorer__map">
        <div className="museum-map-header-inline"><span className="museum-kicker">LOCATION INDEX</span><span>{labels.locate}</span></div>
        <div ref={containerRef} />
        <div className="museum-citation museum-location-explorer__coordinates">{selectedPoi ? `${getPoiCopy(selectedPoi, lang).name} · ${selectedPoi.latitude.toFixed(4)}, ${selectedPoi.longitude.toFixed(4)}` : labels.notSelected}</div>
      </aside>
    </div>
  );
}
