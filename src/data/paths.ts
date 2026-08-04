// ============================================================
// 共用路由工具
// ============================================================
export const BASE = '/1949-guningtou/';

export function sitePath(path: string, lang?: string): string {
  const clean = path.replace(/^\/+/, '');
  if (lang) return `${BASE}${lang}/${clean}`;
  return BASE + clean;
}

export const LANGS = [
  { code: 'zh-tw', label: '繁體中文', short: '繁' },
  { code: 'zh-cn', label: '简体中文', short: '简' },
  { code: 'en', label: 'English', short: 'EN' },
] as const;
