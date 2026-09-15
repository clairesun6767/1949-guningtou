import { useEffect, useState } from 'react';
import {
  XIAMEN_1943_AERIAL_PHOTOS,
  XIAMEN_WWII_AERIAL_UNVERIFIED_01,
} from '../config/xiamen1943Aerial.js';
import { XIAMEN_GCP_REGISTRATION_EXPERIMENT } from '../config/xiamenGcpWorkflow.js';

interface Props {
  base: string;
}

type LocalAssetStatus = 'checking' | 'available' | 'missing';

function assetUrl(base: string, assetPath: string) {
  return `${base.replace(/\/?$/, '/')}${assetPath.replace(/^\/+/, '')}`;
}

function initialAssetStatus() {
  return Object.fromEntries(
    XIAMEN_1943_AERIAL_PHOTOS.map(photo => [photo.id, import.meta.env.DEV ? 'checking' : 'missing']),
  ) as Record<string, LocalAssetStatus>;
}

export default function XiamenHistoricalAerialPanel({ base }: Props) {
  const [selectedId, setSelectedId] = useState(XIAMEN_1943_AERIAL_PHOTOS[0].id);
  const [assetStatus, setAssetStatus] = useState<Record<string, LocalAssetStatus>>(initialAssetStatus);
  const selected = XIAMEN_1943_AERIAL_PHOTOS.find(photo => photo.id === selectedId) ?? XIAMEN_1943_AERIAL_PHOTOS[0];
  const selectedStatus = assetStatus[selected.id] ?? 'missing';
  const selectedUrl = assetUrl(base, selected.localAssetPath);

  useEffect(() => {
    let cancelled = false;
    const checkLocalAssets = async () => {
      if (!import.meta.env.DEV) {
        setAssetStatus(Object.fromEntries(XIAMEN_1943_AERIAL_PHOTOS.map(photo => [photo.id, 'missing'])) as Record<string, LocalAssetStatus>);
        return;
      }
      const results = await Promise.all(XIAMEN_1943_AERIAL_PHOTOS.map(async photo => {
        try {
          const response = await fetch(assetUrl(base, photo.localAssetPath), { method: 'HEAD', cache: 'no-store' });
          return [photo.id, response.ok ? 'available' : 'missing'] as const;
        } catch {
          return [photo.id, 'missing'] as const;
        }
      }));
      if (!cancelled) setAssetStatus(Object.fromEntries(results) as Record<string, LocalAssetStatus>);
    };
    void checkLocalAssets();
    return () => {
      cancelled = true;
    };
  }, [base]);

  function markMissing(id: string) {
    setAssetStatus(current => ({ ...current, [id]: 'missing' }));
  }

  function renderPixelPlaceholder(status: LocalAssetStatus, label: string) {
    return (
      <div className="region-xiamen-aerial-panel__pixel-fallback" role="img" aria-label={`${label} ${status === 'checking' ? '正在檢查 local-only 像素' : 'local-only 像素不存在'}`}>
        <span>{status === 'checking' ? 'CHECKING LOCAL PIXEL' : 'LOCAL PIXEL NOT FOUND'}</span>
        <strong>{label}</strong>
      </div>
    );
  }

  return (
    <section className="region-source-panel region-source-panel--research region-xiamen-aerial-panel" aria-label="廈門二戰時期航照候選資料">
      <div className="region-xiamen-aerial-panel__heading">
        <span>{XIAMEN_WWII_AERIAL_UNVERIFIED_01.label}</span>
        <strong>{XIAMEN_WWII_AERIAL_UNVERIFIED_01.dateStatus}</strong>
      </div>
      <p>Dataset ID：{XIAMEN_WWII_AERIAL_UNVERIFIED_01.id}。claimedDate {XIAMEN_WWII_AERIAL_UNVERIFIED_01.claimedDate} 僅作使用者 provenance；verifiedDate 為 null。八張 JPEG 僅存在本機 ignored 目錄，Git／GitHub 不保存 pixels。</p>
      <figure className="region-xiamen-aerial-panel__preview">
        {selectedStatus === 'available'
          ? <a href={selectedUrl} target="_blank" rel="noreferrer" aria-label={`開啟 ${selected.label} local-only 原圖`}><img src={selectedUrl} alt={selected.alt} loading="lazy" onError={() => markMissing(selected.id)} /></a>
          : renderPixelPlaceholder(selectedStatus, selected.label)}
        <figcaption>
          <span>{selected.label}／{selected.batch === 'initial-five' ? '第一批五張' : '後續三張'}</span>
          {selectedStatus === 'available' ? <a href={selectedUrl} target="_blank" rel="noreferrer">開啟 local 原圖 ↗</a> : <span>LOCAL ONLY／不可用</span>}
        </figcaption>
      </figure>
      <div className="region-xiamen-aerial-panel__thumbs" aria-label="八張廈門航照候選圖縮圖">
        {XIAMEN_1943_AERIAL_PHOTOS.map(photo => {
          const status = assetStatus[photo.id] ?? 'missing';
          const url = assetUrl(base, photo.localAssetPath);
          return (
            <button type="button" className={photo.id === selected.id ? 'is-selected' : ''} onClick={() => setSelectedId(photo.id)} aria-label={`檢視 ${photo.label}`} aria-current={photo.id === selected.id ? 'true' : undefined} key={photo.id}>
              {status === 'available'
                ? <img src={url} alt="" loading="lazy" onError={() => markMissing(photo.id)} />
                : <span className="region-xiamen-aerial-panel__thumb-fallback">{status === 'checking' ? '…' : '—'}</span>}
              <span>{photo.label}</span>
            </button>
          );
        })}
      </div>
      <div className="region-xiamen-aerial-panel__workflow">
        <div><span>GCP CANDIDATE WORKFLOW</span><strong>A-01／SINGLE IMAGE</strong></div>
        <p>{XIAMEN_GCP_REGISTRATION_EXPERIMENT.status}</p>
        <ul>
          {XIAMEN_GCP_REGISTRATION_EXPERIMENT.candidateFeatures.slice(0, 4).map(feature => <li key={feature.id}>{feature.label}</li>)}
        </ul>
        <small>先做 registration QA；QA 未通過前不做 mosaic、不做 terrain projection。Gulangyu／islands 目前只列候選，不作確認。</small>
      </div>
      <small>{XIAMEN_WWII_AERIAL_UNVERIFIED_01.status} · {XIAMEN_WWII_AERIAL_UNVERIFIED_01.alignmentStatus} · {XIAMEN_WWII_AERIAL_UNVERIFIED_01.rightsStatus} · {XIAMEN_WWII_AERIAL_UNVERIFIED_01.applicationMode}</small>
    </section>
  );
}
