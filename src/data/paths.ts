// ============================================================
// 共用路由工具
// ============================================================
export const BASE = '/1949-guningtou/';
export function sitePath(path: string): string {
  return BASE + path.replace(/^\/+/, '');
}
