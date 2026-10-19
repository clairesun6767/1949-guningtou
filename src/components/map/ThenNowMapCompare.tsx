import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { pois as allPois } from '../../data/loader';

interface Props {
  lang?: string;
}

const BASE = '/1949-guningtou';

const copy = {
  'zh-tw': {
    then: '昔日 · 1944 航照參考',
    now: '今日 · canonical POI 地圖',
    note: '兩側使用同一古寧頭區域中心閱讀；航照尚未完成 GCP 套準，不代表精確疊合。',
    opacity: '昔日航照透明度',
    markerNote: '現代地圖顯示使用者指定、已查證或代表性位置；標記依地點資料表呈現。',
    selected: '目前選取',
    none: '點選地圖標記查看地點',
  },
  'zh-cn': {
    then: '昔日 · 1944 航照参考',
    now: '今日 · canonical POI 地图',
    note: '两侧使用同一古宁头区域中心阅读；航照尚未完成 GCP 套准，不代表精确叠合。',
    opacity: '昔日航照透明度',
    markerNote: '现代地图显示用户指定、已查证或代表性位置；标记依地点资料表呈现。',
    selected: '目前选取',
    none: '点击地图标记查看地点',
  },
  en: {
    then: 'THEN · 1944 aerial reference',
    now: 'NOW · canonical POI map',
    note: 'Both panels use the same Guningtou-area centre for reading. The aerial is not GCP-aligned and is not an exact overlay.',
    opacity: 'Historical image opacity',
    markerNote: 'The modern map shows user-specified, verified, or representative points from the location table.',
    selected: 'Selected',
    none: 'Select a map marker to inspect a place',
  },
} as const;

export default function ThenNowMapCompare({ lang = 'zh-tw' }: Props) {
  const isEnglish = lang === 'en';
  const language = lang === 'zh-cn' ? 'zh-cn' : isEnglish ? 'en' : 'zh-tw';
  const labels = copy[language];
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const [opacity, setOpacity] = useState(62);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const hasPublicCoordinate = (poi: typeof allPois[0]) =>
    (poi.map_visibility ?? (poi.coordinate_status === 'modern_verified' || poi.coordinate_status === 'representative' ? 'public' : 'research')) === 'public';

  const selectedPoi = allPois.find((poi) => poi.poi_id === selectedPoiId && hasPublicCoordinate(poi)) ?? null;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [24.475, 118.31],
      zoom: 14,
      minZoom: 12,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const resize = () => map.invalidateSize();
    requestAnimationFrame(resize);
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      map.remove();
      markerLayerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();
    allPois.filter(hasPublicCoordinate).forEach((poi) => {
      const name = isEnglish ? poi.name_english ?? poi.name_chinese : poi.name_chinese;
      const marker = L.circleMarker([poi.latitude, poi.longitude], {
        radius: poi.poi_id === selectedPoiId ? 8 : 5,
        color: poi.poi_id === selectedPoiId ? '#f4ead5' : '#1f2d2a',
        weight: poi.poi_id === selectedPoiId ? 3 : 2,
        fillColor: '#b89458',
        fillOpacity: .95,
      }).addTo(markerLayer);
      marker.bindTooltip(name, {
        permanent: true,
        direction: 'top',
        offset: [0, -6],
        className: 'then-now-map-label',
      });
      marker.on('click', () => {
        setSelectedPoiId(poi.poi_id);
        map.flyTo([poi.latitude, poi.longitude], Math.max(map.getZoom(), 15), { duration: .45 });
      });
    });
  }, [isEnglish, selectedPoiId]);

  return (
    <div className="then-now-map-compare">
      <div className="then-now-map-compare__panels">
        <figure className="then-now-map-compare__panel then-now-map-compare__panel--historical">
          <div className="then-now-map-compare__image-wrap">
            <img
              src={`${BASE}/aerial-1944a.png`}
              alt={isEnglish ? '1944 aerial reference of the Guningtou area' : '1944 年古寧頭地區航照參考'}
              style={{ opacity: opacity / 100 }}
              loading="lazy"
              decoding="async"
            />
            <span className="then-now-map-compare__panel-label">{labels.then}</span>
          </div>
          <figcaption>{labels.note}</figcaption>
        </figure>
        <figure className="then-now-map-compare__panel then-now-map-compare__panel--map">
          <div className="then-now-map-compare__map-wrap">
            <div ref={mapContainerRef} />
            <span className="then-now-map-compare__panel-label">{labels.now}</span>
          </div>
          <figcaption>{labels.markerNote}</figcaption>
        </figure>
      </div>
      <label className="then-now-map-compare__control">
        <span>{labels.opacity}</span>
        <input
          type="range"
          min="0"
          max="100"
          value={opacity}
          onChange={(event) => setOpacity(Number(event.target.value))}
          aria-label={labels.opacity}
        />
        <output>{opacity}%</output>
      </label>
      <div className="then-now-map-compare__selection" aria-live="polite">
        <span className="museum-kicker">{labels.selected}</span>
        <strong>{selectedPoi ? (isEnglish ? selectedPoi.name_english ?? selectedPoi.name_chinese : selectedPoi.name_chinese) : labels.none}</strong>
        {selectedPoi && <span>{selectedPoi.poi_id} · {selectedPoi.latitude.toFixed(4)}, {selectedPoi.longitude.toFixed(4)}</span>}
      </div>
    </div>
  );
}
