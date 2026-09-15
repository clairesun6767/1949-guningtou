import { useState } from 'react';
import { XIAMEN_1943_AERIAL_PHOTOS, XIAMEN_1943_AERIAL_POC } from '../config/xiamen1943Aerial.js';

interface Props {
  base: string;
}

function assetUrl(base: string, assetPath: string) {
  return `${base.replace(/\/?$/, '/')}${assetPath.replace(/^\/+/, '')}`;
}

export default function XiamenHistoricalAerialPanel({ base }: Props) {
  const [selectedId, setSelectedId] = useState(XIAMEN_1943_AERIAL_PHOTOS[0].id);
  const selected = XIAMEN_1943_AERIAL_PHOTOS.find(photo => photo.id === selectedId) ?? XIAMEN_1943_AERIAL_PHOTOS[0];
  const selectedUrl = assetUrl(base, selected.assetPath);

  return (
    <section className="region-source-panel region-source-panel--research region-xiamen-aerial-panel" aria-label="廈門 1943 航照研究原型圖層">
      <div className="region-xiamen-aerial-panel__heading">
        <span>廈門航照／XIAMEN AERIAL</span>
        <strong>1943-11-22 POC</strong>
      </div>
      <p>八張使用者提供影像已納入研究圖層。此版本只做證據瀏覽與影像比對，尚未完成館藏反查、地理配準或無縫拼接。</p>
      <figure className="region-xiamen-aerial-panel__preview">
        <a href={selectedUrl} target="_blank" rel="noreferrer" aria-label={`開啟 ${selected.label} 原圖`}>
          <img src={selectedUrl} alt={selected.alt} loading="lazy" />
        </a>
        <figcaption><span>{selected.label}／{selected.batch === 'initial-five' ? '第一批五張' : '後續三張'}</span><a href={selectedUrl} target="_blank" rel="noreferrer">開啟原圖 ↗</a></figcaption>
      </figure>
      <div className="region-xiamen-aerial-panel__thumbs" aria-label="八張廈門航照縮圖">
        {XIAMEN_1943_AERIAL_PHOTOS.map(photo => {
          const url = assetUrl(base, photo.assetPath);
          return (
            <button type="button" className={photo.id === selected.id ? 'is-selected' : ''} onClick={() => setSelectedId(photo.id)} aria-label={`檢視 ${photo.label}`} aria-current={photo.id === selected.id ? 'true' : undefined} key={photo.id}>
              <img src={url} alt="" loading="lazy" />
              <span>{photo.label}</span>
            </button>
          );
        })}
      </div>
      <small>{XIAMEN_1943_AERIAL_POC.status} · {XIAMEN_1943_AERIAL_POC.alignmentStatus} · {XIAMEN_1943_AERIAL_POC.rightsStatus}</small>
    </section>
  );
}
