// ============================================================
// SearchBar — 全站搜尋元件
// ============================================================

import { useState, useEffect, useRef } from 'react';

interface SearchResult {
  type: string;
  title: string;
  href: string;
  subtitle?: string;
}

// Inline data for instant client-side search
const SEARCH_DATA: SearchResult[] = [];

async function loadData() {
  if (SEARCH_DATA.length > 0) return;
  
  const prefix = '/1949-guningtou';
  
  // Load locale data
  try {
    const [respTL, respEN, respCN] = await Promise.all([
      fetch(`${prefix}/zh-tw/`).then(r => r.text()),
      fetch(`${prefix}/en/`).then(r => r.text()),
      fetch(`${prefix}/zh-cn/`).then(r => r.text()),
    ]);
    
    // Extract nav links from any page as search targets
    const links = [
      { type: '頁面', title: '首頁', href: '/zh-tw/' },
      { type: '頁面', title: '世界局勢與戰役背景', href: '/zh-tw/context/' },
      { type: '頁面', title: '戰役解析', href: '/zh-tw/analysis/' },
      { type: '頁面', title: '戰後影響', href: '/zh-tw/aftermath/' },
      { type: '頁面', title: '四日時間軸', href: '/zh-tw/timeline/' },
      { type: '頁面', title: '戰役地圖', href: '/zh-tw/map/' },
      { type: '頁面', title: '戰役故事', href: '/zh-tw/stories/' },
      { type: '頁面', title: '人物', href: '/zh-tw/figures/' },
      { type: '頁面', title: '地點', href: '/zh-tw/locations/' },
      { type: '頁面', title: '武器', href: '/zh-tw/weapons/' },
      { type: '頁面', title: '文物', href: '/zh-tw/artifacts/' },
      { type: '頁面', title: '多元觀點', href: '/zh-tw/perspectives/' },
      { type: '頁面', title: '文獻資料庫', href: '/zh-tw/sources/' },
      { type: '頁面', title: '數位典藏', href: '/zh-tw/archive/' },
      { type: '頁面', title: '戰後至今', href: '/zh-tw/peace/' },
      { type: '頁面', title: 'Battlefield OS', href: '/zh-tw/battlefield-os/' },
      { type: '頁面', title: '關於本站', href: '/zh-tw/about/' },
    ];
    
    // Add some key search terms
    const terms = [
      { type: '地點', title: '嚨口', href: '/zh-tw/locations/POI-0001/', subtitle: '登陸灘頭' },
      { type: '地點', title: '古寧頭', href: '/zh-tw/locations/', subtitle: '戰役核心區域' },
      { type: '地點', title: '北山', href: '/zh-tw/locations/', subtitle: '村落戰場' },
      { type: '人物', title: '熊震球', href: '/zh-tw/figures/', subtitle: '戰車射手' },
      { type: '人物', title: '胡璉', href: '/zh-tw/figures/', subtitle: '金防部司令' },
      { type: '人物', title: '葉飛', href: '/zh-tw/figures/', subtitle: '第十兵團司令' },
      { type: '武器', title: 'M5A1 輕戰車', href: '/zh-tw/weapons/', subtitle: '66號車' },
      { type: '事件', title: '第一砲', href: '/zh-tw/timeline/', subtitle: '1949-10-25 00:30' },
      { type: '事件', title: '登陸作戰', href: '/zh-tw/analysis/', subtitle: '第一梯隊' },
      { type: '事件', title: '古寧頭戰役', href: '/zh-tw/', subtitle: '1949年10月' },
      { type: '頁面', title: '多元史觀', href: '/zh-tw/perspectives/', subtitle: '比較各方記載' },
    ];
    
    SEARCH_DATA.push(...links, ...terms);
  } catch (e) {
    // Fallback to static links
    SEARCH_DATA.push(...links);
  }
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => { loadData().then(() => setLoaded(true)); }, []);
  
  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  
  const handleSearch = (q: string) => {
    setQuery(q);
    if (q.trim().length < 1) { setResults([]); setOpen(false); return; }
    const filtered = SEARCH_DATA.filter(item =>
      item.title.includes(q) || (item.subtitle && item.subtitle.includes(q))
    ).slice(0, 8);
    setResults(filtered);
    setOpen(filtered.length > 0);
  };
  
  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => handleSearch(e.target.value)}
        onFocus={e => handleSearch(e.target.value)}
        placeholder="搜尋..."
        className="w-32 md:w-40 px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-300 focus:bg-white transition placeholder-stone-400"
      />
      {open && results.length > 0 && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-stone-200 rounded-lg shadow-xl z-[9999] overflow-hidden">
          {results.map((r, i) => (
            <a
              key={i}
              href={r.href}
              onClick={() => { setOpen(false); setQuery(''); }}
              className="flex items-start gap-2 px-4 py-2.5 hover:bg-amber-50 no-underline border-b border-stone-50 last:border-0"
            >
              <span className="text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded shrink-0 mt-0.5">{r.type}</span>
              <div className="min-w-0">
                <div className="text-sm text-stone-700 truncate">{r.title}</div>
                {r.subtitle && <div className="text-xs text-stone-400 truncate">{r.subtitle}</div>}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
