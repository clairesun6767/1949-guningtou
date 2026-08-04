// ============================================================
// 多元史觀資料載入器
// ============================================================
import landing from './perspectives/first-wave-landing.json';
import longkou from './perspectives/longkou-first-shot.json';
import village from './perspectives/village-combat.json';
import casualties from './perspectives/casualties.json';
import significance from './perspectives/battle-significance.json';

export interface PerspectiveEvent {
  id: string;
  title: { 'zh-tw': string; 'zh-cn': string; en: string };
  summary: { 'zh-tw': string; 'zh-cn'?: string; en?: string };
  viewpoints: Record<string, { 'zh-tw': string; 'zh-cn'?: string; en?: string }>;
  disputes?: { topic: string; 'zh-tw': string; 'zh-cn'?: string; en?: string }[];
  evidenceStatus?: string;
}

export const perspectiveEvents: PerspectiveEvent[] = [
  landing,
  longkou,
  village,
  casualties,
  significance,
] as PerspectiveEvent[];
