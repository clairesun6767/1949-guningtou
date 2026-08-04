// ============================================================
// 全域視角狀態（nanostores — Astro + React 雙相容）
// ============================================================
import { atom } from 'nanostores';
import type { Perspective } from '../data/types';

export const currentPerspective = atom<Perspective>('neutral');
