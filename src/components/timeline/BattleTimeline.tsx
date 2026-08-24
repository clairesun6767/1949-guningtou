// ============================================================
// BattleTimeline — 互動時間軸
// 保留四日篩選與節點展開，統一為時間軌與證據閱讀模式。
// ============================================================

import { useMemo, useState } from 'react';
import type { TimelineEntry } from '../../data/types';

interface Props {
  entries: TimelineEntry[];
}

const DAY_TABS = [
  { key: '10-24', label: '10/24 · 第一日', start: '1949-10-24', end: '1949-10-24' },
  { key: '10-25', label: '10/25 · 第二日', start: '1949-10-25', end: '1949-10-25' },
  { key: '10-26', label: '10/26 · 第三日', start: '1949-10-26', end: '1949-10-26' },
  { key: '10-27', label: '10/27 · 第四日', start: '1949-10-27', end: '1949-10-27' },
];

function sortTime(value?: string) {
  if (!value) return 9999;
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  if (/夜|晚|上午|下午|傍晚|黃昏|拂曉|黎明/.test(value)) return 9000;
  return 9999;
}

export default function BattleTimeline({ entries }: Props) {
  const [activeTab, setActiveTab] = useState('10-25');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const tab = DAY_TABS.find((item) => item.key === activeTab);
    const result = tab
      ? entries.filter((entry) => entry.date >= tab.start && entry.date <= tab.end)
      : entries;
    return [...result].sort((a, b) => sortTime(a.time) - sortTime(b.time));
  }, [entries, activeTab]);

  return (
    <div>
      <div className="museum-timeline-tabs" role="tablist" aria-label="戰役日期">
        {DAY_TABS.map((tab) => {
          const count = entries.filter((entry) => entry.date >= tab.start && entry.date <= tab.end).length;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              aria-pressed={active}
              className="museum-timeline-tab"
              onClick={() => { setActiveTab(tab.key); setExpandedId(null); }}
            >
              {tab.label} <span aria-label={`${count} 個事件`}>({count})</span>
            </button>
          );
        })}
      </div>

      <div className="museum-timeline-rail">
        {filtered.map((entry) => {
          const isExpanded = expandedId === entry.timeline_id;
          return (
            <div key={entry.timeline_id} className="museum-timeline-entry">
              <button
                type="button"
                className="museum-timeline-entry__button"
                aria-expanded={isExpanded}
                onClick={() => setExpandedId(isExpanded ? null : entry.timeline_id)}
              >
                <span className="museum-timeline-entry__time">
                  {entry.time || '時間未詳'} · {entry.timeline_id}
                </span>
                <span className="museum-timeline-entry__title">{entry.title}</span>
                {entry.location && <span className="museum-citation">地點：{entry.location}</span>}
              </button>

              {isExpanded && (
                <div className="museum-timeline-entry__detail">
                  {entry.description && <p className="museum-timeline-entry__description">{entry.description}</p>}
                  <div className="museum-meta-grid museum-timeline-entry__meta">
                    {entry.roc_units && <dl className="museum-meta"><dt>國軍單位</dt><dd>{entry.roc_units}</dd></dl>}
                    {entry.pla_units && <dl className="museum-meta"><dt>解放軍單位</dt><dd>{entry.pla_units}</dd></dl>}
                    {entry.key_figures && <dl className="museum-meta"><dt>關鍵人物</dt><dd>{entry.key_figures}</dd></dl>}
                    {entry.source_ids && <dl className="museum-meta"><dt>來源</dt><dd>{entry.source_ids.join(' · ')}</dd></dl>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 museum-timeline-entry__status">
                    {entry.evidence_level && <span className={`evidence-badge evidence-${entry.evidence_level}`}>證據 {entry.evidence_level}</span>}
                    {entry.verification_status && <span className="museum-citation">{entry.verification_status}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && <p className="museum-card museum-empty-state">此日期尚無時間軸資料。</p>}
    </div>
  );
}
