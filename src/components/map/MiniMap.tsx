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
      html: '<div style="width:14px;height:14px;border-radius:50%;background:#a78a5b;border:3px solid #f6f2e9;box-shadow:0 0 0 4px rgba(23,23,19,.18)"></div>',
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
    <div className="museum-mini-map">
      <div className="museum-mini-map__head"><span className="museum-kicker">LOCATION MAP</span></div>
      <div ref={containerRef} className="museum-mini-map__canvas" />
      <div className="museum-mini-map__foot museum-citation">
        {lat.toFixed(4)}, {lng.toFixed(4)}
      </div>
    </div>
  );
}
