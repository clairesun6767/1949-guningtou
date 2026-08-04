// ============================================================
// LanguageSwitcher — 三語切換按鈕
// ============================================================

import { useStore } from '@nanostores/react';
import { currentLang, type Lang } from '../../store/lang';

const LABELS: Record<Lang, string> = {
  'zh-TW': '繁',
  'zh-CN': '简',
  'en': 'EN',
};

const LANGS: Lang[] = ['zh-TW', 'zh-CN', 'en'];

export default function LanguageSwitcher() {
  const lang = useStore(currentLang);

  return (
    <div className="flex items-center gap-0.5 text-xs">
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => currentLang.set(l)}
          className={`px-1.5 py-0.5 rounded transition ${
            lang === l
              ? 'bg-amber-600 text-white font-bold'
              : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
