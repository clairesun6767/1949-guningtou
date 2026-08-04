// ============================================================
// BattleTimeline — 互動時間軸元件
// 四日分頁 + 可點擊時間節點展開詳情
// ============================================================

import { useState, useMemo } from 'react';
import type { TimelineEntry } from '../../data/types';

interface Props {
  entries: TimelineEntry[];
}

const DAY_TABS = [
  { key: 'all', label: '全部', start: '', end: '' },
  { key: '10-24', label: '10/24 第一日', start: '1949-10-24', end: '1949-10-24' },
  { key: '10-25', label: '10/25 第二日', start: '1949-10-25', end: '1949-10-25' },
  { key: '10-26', label: '10/26 第三日', start: '1949-10-26', end: '1949-10-26' },
  { key: '10-27', label: '10/27 第四日', start: '1949-10-27', end: '1949-10-27' },
];

export default function BattleTimeline({ entries }: Props) {
  const [activeTab, setActiveTab] = useState('10-25');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const tab = DAY_TABS.find((t) => t.key === activeTab);
    let result = tab && tab.start
      ? entries.filter((e) => e.date >= tab.start && e.date <= tab.end)
      : entries;

    // 排序：提取時間中的數字部分進行比較
    return [...result].sort((a, b) => {
      const getSortTime = (t: string | undefined): number => {
        if (!t) return 9999;
        // 提取 HH:MM 格式的數字部分
        const match = t.match(/(\d{1,2}):(\d{2})/);
        if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
        // 「夜間」、「上午」、「下午」等文字時間放最後
        if (/夜|晚|上午|下午|傍晚|黃昏|拂曉|黎明/.test(t)) return 9000;
        return 9999;
      };
      return getSortTime(a.time) - getSortTime(b.time);
    });
  }, [entries, activeTab]);

  return (
    <div>
      {/* Day tabs */}
      <div className="flex gap-1 mb-8 overflow-x-auto">
        {DAY_TABS.filter((t) => t.key !== 'all').map((tab) => {
          const count = entries.filter(
            (e) => e.date >= tab.start && e.date <= tab.end,
          ).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setExpandedId(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-300'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Timeline entries */}
      <div className="relative border-l-2 border-amber-200 ml-3">
        {filtered.map((entry, idx) => {
          const isExpanded = expandedId === entry.timeline_id;
          const hasTime = !!entry.time;
          return (
            <div key={entry.timeline_id} className="mb-1 pl-6 relative">
              {/* Dot on timeline */}
              <div
                className={`absolute left-[-5px] top-4 w-2.5 h-2.5 rounded-full border-2 transition ${
                  isExpanded
                    ? 'bg-amber-500 border-amber-500'
                    : 'bg-white border-amber-300'
                }`}
              />

              {/* Entry */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : entry.timeline_id)}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-stone-50 transition group"
              >
                <div className="flex items-baseline gap-3">
                  {hasTime && (
                    <span className="text-xs font-mono text-amber-600 whitespace-nowrap shrink-0">
                      {entry.time}
                    </span>
                  )}
                  <span className="text-sm font-medium text-stone-800 group-hover:text-amber-700">
                    {entry.title}
                  </span>
                </div>
                {entry.location && (
                  <span className="text-xs text-stone-400 ml-0 mt-0.5 block">
                    📍 {entry.location}
                  </span>
                )}
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="ml-0 mt-1 mb-3 p-4 bg-amber-50 rounded-lg border border-amber-100 text-sm">
                  {entry.description && (
                    <p className="text-stone-700 leading-relaxed mb-3">
                      {entry.description}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-500">
                    {entry.roc_units && (
                      <div>
                        <span className="font-medium text-stone-600">國軍：</span>
                        {entry.roc_units}
                      </div>
                    )}
                    {entry.pla_units && (
                      <div>
                        <span className="font-medium text-stone-600">解放軍：</span>
                        {entry.pla_units}
                      </div>
                    )}
                    {entry.key_figures && (
                      <div className="col-span-2">
                        <span className="font-medium text-stone-600">關鍵人物：</span>
                        {entry.key_figures}
                      </div>
                    )}
                  </div>
                  {entry.evidence_level && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`evidence-badge evidence-${entry.evidence_level}`}>
                        證據等級 {entry.evidence_level}
                      </span>
                      {entry.verification_status && (
                        <span className="text-xs text-stone-400">
                          {entry.verification_status}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-stone-400 py-8">此日期尚無時間軸資料</p>
      )}
    </div>
  );
}
