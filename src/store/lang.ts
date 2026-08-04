// ============================================================
// 語言狀態 (nanostores)
// ============================================================
import { atom } from 'nanostores';

export type Lang = 'zh-TW' | 'zh-CN' | 'en';

function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'zh-TW';
  const stored = localStorage.getItem('lang');
  if (stored === 'zh-TW' || stored === 'zh-CN' || stored === 'en') return stored;
  // Detect browser language
  const nav = navigator.language;
  if (nav.startsWith('zh')) return nav.includes('CN') || nav.includes('Hans') ? 'zh-CN' : 'zh-TW';
  return 'en';
}

export const currentLang = atom<Lang>(getInitialLang());

// Persist to localStorage
currentLang.subscribe((lang) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lang', lang);
  }
});
