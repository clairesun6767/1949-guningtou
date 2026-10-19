// ============================================================
// 共用路由工具
// ============================================================
export const BASE = '/1949-guningtou/';

export function sitePath(path: string, lang?: string): string {
  const clean = path.replace(/^\/+/, '');
  const suffixStart = clean.search(/[?#]/);
  const pathname = suffixStart >= 0 ? clean.slice(0, suffixStart) : clean;
  const suffix = suffixStart >= 0 ? clean.slice(suffixStart) : '';
  const isFile = /(^|\/)[^/]+\.[^/]+$/.test(pathname);
  const route = pathname && !isFile && !pathname.endsWith('/') ? `${pathname}/` : pathname;
  if (lang) return `${BASE}${lang}/${route}${suffix}`;
  return `${BASE}${route}${suffix}`;
}

export const LANGS = [
  { code: 'zh-tw', label: '繁體中文', short: '繁' },
  { code: 'zh-cn', label: '简体中文', short: '简' },
  { code: 'en', label: 'English', short: 'EN' },
] as const;
