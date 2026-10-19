// ============================================================
// BattleTimeline — 互動時間軸
// 保留四日篩選與節點展開，統一為時間軌與證據閱讀模式。
// ============================================================

import { useMemo, useState } from 'react';
import type { TimelineEntry } from '../../data/types';
import { getTimelineCopy } from '../../i18n/historicalContent';

interface Props {
  entries: TimelineEntry[];
  lang?: string;
}

const DAY_TABS = [
  { key: '10-24', zh: '10/24 · 第一天', zhCn: '10/24 · 第一天', en: '10/24 · Day one', start: '1949-10-24', end: '1949-10-24' },
  { key: '10-25', zh: '10/25 · 第二天', zhCn: '10/25 · 第二天', en: '10/25 · Day two', start: '1949-10-25', end: '1949-10-25' },
  { key: '10-26', zh: '10/26 · 第三天', zhCn: '10/26 · 第三天', en: '10/26 · Day three', start: '1949-10-26', end: '1949-10-26' },
  { key: '10-27', zh: '10/27 · 第四天', zhCn: '10/27 · 第四天', en: '10/27 · Day four', start: '1949-10-27', end: '1949-10-27' },
];

function sortTime(value?: string) {
  if (!value) return 9999;
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  if (/夜|晚|上午|下午|傍晚|黃昏|拂曉|黎明/.test(value)) return 9000;
  return 9999;
}

export default function BattleTimeline({ entries, lang = 'zh-tw' }: Props) {
  const isEnglish = lang === 'en';
  const isSimplified = lang === 'zh-cn';
  const [activeTab, setActiveTab] = useState('10-25');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const tab = DAY_TABS.find((item) => item.key === activeTab);
    const result = tab
      ? entries.filter((entry) => entry.date >= tab.start && entry.date <= tab.end)
      : entries;
    return [...result].sort((a, b) => sortTime(a.time) - sortTime(b.time));
  }, [entries, activeTab]);

  const labels = isEnglish ? {
    tabCount: 'events', unknownTime: 'Time unknown', location: 'Location', roc: 'ROC units', pla: 'PLA units', figures: 'Key figures', sources: 'Sources', evidence: 'Evidence', empty: 'No timeline records for this date.',
  } : isSimplified ? {
    tabCount: '个事件', unknownTime: '时间未详', location: '地点', roc: '国军单位', pla: '解放军单位', figures: '关键人物', sources: '来源', evidence: '证据', empty: '此日期暂无时间轴资料。',
  } : {
    tabCount: '個事件', unknownTime: '時間未詳', location: '地點', roc: '國軍單位', pla: '解放軍單位', figures: '關鍵人物', sources: '來源', evidence: '證據', empty: '此日期尚無時間軸資料。',
  };

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
              {isEnglish ? tab.en : isSimplified ? tab.zhCn : tab.zh} <span aria-label={`${count} ${labels.tabCount}`}>({count})</span>
            </button>
          );
        })}
      </div>

      <div className="museum-timeline-rail">
        {filtered.map((entry) => {
          const isExpanded = expandedId === entry.timeline_id;
          const copy = getTimelineCopy(entry, lang);
          return (
            <div key={entry.timeline_id} className="museum-timeline-entry">
              <button
                type="button"
                className="museum-timeline-entry__button"
                aria-expanded={isExpanded}
                onClick={() => setExpandedId(isExpanded ? null : entry.timeline_id)}
              >
                <span className="museum-timeline-entry__time">
                  {entry.time || labels.unknownTime} · {entry.timeline_id}
                </span>
                <span className="museum-timeline-entry__title">{copy.title}</span>
                {copy.location && <span className="museum-citation">{labels.location}: {copy.location}</span>}
              </button>

              {isExpanded && (
                <div className="museum-timeline-entry__detail">
                  {copy.description && <p className="museum-timeline-entry__description">{copy.description}</p>}
                  <div className="museum-meta-grid museum-timeline-entry__meta">
                    {copy.rocUnits && <dl className="museum-meta"><dt>{labels.roc}</dt><dd>{copy.rocUnits}</dd></dl>}
                    {copy.plaUnits && <dl className="museum-meta"><dt>{labels.pla}</dt><dd>{copy.plaUnits}</dd></dl>}
                    {copy.keyFigures && <dl className="museum-meta"><dt>{labels.figures}</dt><dd>{copy.keyFigures}</dd></dl>}
                    {entry.source_ids && <dl className="museum-meta"><dt>{labels.sources}</dt><dd>{entry.source_ids.join(' · ')}</dd></dl>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 museum-timeline-entry__status">
                    {entry.evidence_level && <span className={`evidence-badge evidence-${entry.evidence_level}`}>{labels.evidence} {entry.evidence_level}</span>}
                    {entry.verification_status && <span className="museum-citation">{entry.verification_status}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && <p className="museum-card museum-empty-state">{labels.empty}</p>}
    </div>
  );
}
