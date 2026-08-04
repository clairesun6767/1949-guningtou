// ============================================================
// HeroMap — 1944 航照 Hero
// 靜態航照背景 + 手動標註（非 GPS）
// 圖片放 public/aerial-1944.png 即自動顯示
// ============================================================

import { useEffect, useState } from 'react';

export default function HeroMap({ base = '' }: { base?: string }) {
  const [titleVisible, setTitleVisible] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const url = `${base}/aerial-1944.png`;
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageError(true);
    img.src = url;
  }, [base]);

  useEffect(() => {
    setTimeout(() => setTitleVisible(true), 800);
    setTimeout(() => setSubtitleVisible(true), 2000);
  }, []);

  return (
    <div className="relative w-full h-screen min-h-[600px] max-h-[900px] overflow-hidden bg-stone-900">
      {/* 1944 航照背景 */}
      {imageLoaded ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${base}/aerial-1944.png)` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-stone-800 via-stone-900 to-stone-950 flex items-center justify-center">
          {imageError && (
            <p className="text-stone-400 text-sm">
              請將 1944 航照匯出為 public/aerial-1944.png
            </p>
          )}
        </div>
      )}

      {/* 暗色覆蓋層 */}
      <div className="absolute inset-0 bg-gradient-to-b from-stone-900/40 via-transparent to-stone-900/80 pointer-events-none z-10" />

      {/* 手動標註層（放在航照上方，CSS 定位） */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {/* 嚨口 — 左下區域 */}
        <div className="absolute bottom-[35%] left-[20%]">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-lg" />
          <span className="ml-1.5 text-white text-xs font-bold drop-shadow-md bg-black/50 px-1.5 py-0.5 rounded">嚨口</span>
        </div>
        {/* 北山 — 中上區域 */}
        <div className="absolute top-[25%] right-[35%]">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow-lg" />
          <span className="ml-1.5 text-white text-xs font-bold drop-shadow-md bg-black/50 px-1.5 py-0.5 rounded">北山</span>
        </div>
        {/* 林厝 — 中央偏右 */}
        <div className="absolute top-[40%] right-[40%]">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-500 border-2 border-white shadow-lg" />
          <span className="ml-1.5 text-white text-xs font-bold drop-shadow-md bg-black/50 px-1.5 py-0.5 rounded">林厝</span>
        </div>
        {/* 南山 — 中央 */}
        <div className="absolute top-[48%] right-[45%]">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow-lg" />
          <span className="ml-1.5 text-white text-xs font-bold drop-shadow-md bg-black/50 px-1.5 py-0.5 rounded">南山</span>
        </div>
        {/* 湖尾 — 右下 */}
        <div className="absolute bottom-[30%] right-[15%]">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-lg" />
          <span className="ml-1.5 text-white text-xs font-bold drop-shadow-md bg-black/50 px-1.5 py-0.5 rounded">湖尾</span>
        </div>
        {/* 北山斷崖 — 上方 */}
        <div className="absolute top-[15%] right-[30%]">
          <span className="inline-block w-3 h-3 rounded-full bg-cyan-500 border-2 border-white shadow-lg" />
          <span className="ml-1.5 text-white text-xs font-bold drop-shadow-md bg-black/50 px-1.5 py-0.5 rounded">北山斷崖</span>
        </div>
        {/* 湖南高地 — 中下偏右 */}
        <div className="absolute bottom-[25%] right-[25%]">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
          <span className="ml-1.5 text-white text-xs font-bold drop-shadow-md bg-black/50 px-1.5 py-0.5 rounded">湖南高地</span>
        </div>
      </div>

      {/* 來源標註 */}
      <div className="absolute top-4 right-4 z-30 text-white/50 text-xs bg-black/50 px-2 py-1 rounded">
        1944 年航照 · 中央研究院 GIS 中心
      </div>

      {/* 標題 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
        <h1
          className={`text-4xl md:text-6xl font-serif font-bold text-white text-center leading-tight transition-all duration-1000 ${titleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ textShadow: '0 0 60px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.7)' }}
        >
          古寧頭戰役<br /><span className="text-amber-400">1949 年 10 月</span>
        </h1>
        <p
          className={`mt-6 text-lg md:text-xl text-stone-200 max-w-2xl text-center leading-relaxed transition-all duration-1000 delay-500 ${subtitleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
          style={{ textShadow: '0 0 40px rgba(0,0,0,0.9)' }}
        >
          近九千名士兵在此登陸<br />
          <span className="text-stone-400">三天後，數千人未能離開</span>
        </p>
      </div>

      {subtitleVisible && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce pointer-events-none">
          <div className="text-stone-300 text-sm flex flex-col items-center gap-1 drop-shadow-lg">
            <span>向下捲動</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        </div>
      )}
    </div>
  );
}
