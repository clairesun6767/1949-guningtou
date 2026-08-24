// ============================================================
// 共用路由工具
// ============================================================
export const BASE = '/1949-guningtou/';

export function sitePath(path: string, lang?: string): string {
  const clean = path.replace(/^\/+/, '');
  const isFile = /(^|\/)[^/]+\.[^/]+$/.test(clean);
  const route = clean && !isFile && !clean.endsWith('/') ? `${clean}/` : clean;
  if (lang) return `${BASE}${lang}/${route}`;
  return BASE + route;
}

export const LANGS = [
  { code: 'zh-tw', label: '繁體中文', short: '繁' },
  { code: 'zh-cn', label: '简体中文', short: '简' },
  { code: 'en', label: 'English', short: 'EN' },
] as const;
