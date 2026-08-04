// ============================================================
// 資料載入器 — 靜態 import JSON，提供輔助查詢函數
// Astro/Vite 內建 JSON import，無需額外處理
// ============================================================

import type {
  TimelineEntry,
  Event,
  POI,
  HistoricalPerson,
  Source,
  StoryArc,
  Scene,
  NarrativeBeat,
  Narrative,
  AudioGuide,
  TimelineSegment,
  SpatialNode,
  PRCTimelineEntry,
  PRCPersonnel,
} from './types';

// --- 核心資料 ---
import timelineData from '../../data/timeline.json';
import eventsData from '../../data/events.json';
import poiData from '../../data/poi.json';
import personsData from '../../data/persons.json';
import sourcesData from '../../data/sources.json';
import storyArcsData from '../../data/story_arcs.json';
import scenesData from '../../data/scenes.json';
import narrativeBeatsData from '../../data/narrative_beats.json';
import narrativesData from '../../data/narratives.json';
import audioGuidesData from '../../data/audio_guides.json';
import interactiveTimelineData from '../../data/interactive_timeline.json';
import spatialNetworkData from '../../data/spatial_network.json';
import routeDatabaseData from '../../data/route_database.json';
import terrainDatabaseData from '../../data/terrain_database.json';
import personRelationshipsData from '../../data/person_relationships.json';
import unitIndexData from '../../data/unit_index.json';

// --- PRC 資料 ---
import plaTimelineData from '../../data/prc/pla_timeline.json';
import plaPersonnelData from '../../data/prc/pla_personnel.json';
import battleAnalysisData from '../../data/prc/battle_analysis.json';
import crossSourceComparisonData from '../../data/prc/cross_source_comparison.json';
import commandStructureData from '../../data/prc/command_structure.json';

// ============================================================
// 型別安全提取器（各 JSON 檔案結構略有不同）
// ============================================================

function extractArray<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const k of Object.keys(obj)) {
      if (Array.isArray(obj[k]) && obj[k].length > 0) return obj[k] as T[];
    }
    // 若無明顯陣列，搜尋所有 key
    for (const k of Object.keys(obj)) {
      if (Array.isArray(obj[k])) return obj[k] as T[];
    }
  }
  return [];
}

// ============================================================
// 匯出資料集
// ============================================================

export const timeline: TimelineEntry[] = extractArray<TimelineEntry>(timelineData, 'records');
export const events: Event[] = extractArray<Event>(eventsData, 'events');
export const pois: POI[] = extractArray<POI>(poiData, 'pois');
export const persons: HistoricalPerson[] = extractArray<HistoricalPerson>(personsData, 'persons');
export const sources: Source[] = extractArray<Source>(sourcesData, 'sources');
export const storyArcs: StoryArc[] = extractArray<StoryArc>(storyArcsData, 'arcs');
export const scenes: Scene[] = extractArray<Scene>(scenesData, 'scenes');
export const narrativeBeats: NarrativeBeat[] = extractArray<NarrativeBeat>(narrativeBeatsData, 'beats');
export const narratives: Narrative[] = extractArray<Narrative>(narrativesData, 'narratives');
export const audioGuides: AudioGuide[] = extractArray<AudioGuide>(audioGuidesData, 'guides');
export const interactiveTimeline: TimelineSegment[] = extractArray<TimelineSegment>(interactiveTimelineData, 'segments');

// 空間資料（結構各異）
export const spatialNodes: SpatialNode[] = (spatialNetworkData as { nodes?: SpatialNode[] })?.nodes ?? [];

// PRC 資料
export const plaTimeline: PRCTimelineEntry[] = extractArray<PRCTimelineEntry>(plaTimelineData, 'records');
export const plaPersonnel: PRCPersonnel[] = extractArray<PRCPersonnel>(plaPersonnelData, 'personnel');

// 原始資料（供進階查詢）
export const rawSpatialNetwork = spatialNetworkData;
export const rawRouteDatabase = routeDatabaseData;
export const rawTerrainDatabase = terrainDatabaseData;
export const rawPersonRelationships = personRelationshipsData;
export const rawUnitIndex = unitIndexData;
export const rawBattleAnalysis = battleAnalysisData;
export const rawCrossSourceComparison = crossSourceComparisonData;
export const rawCommandStructure = commandStructureData;

// ============================================================
// 輔助查詢函數
// ============================================================

/** 以 ID 查詢 */
export function getById<T extends { [key: string]: unknown }>(
  items: T[],
  idKey: string,
  id: string,
): T | undefined {
  return items.find((item) => item[idKey] === id);
}

/** 以日期範圍過濾時間軸 */
export function filterTimelineByDate(
  start: string,
  end?: string,
): TimelineEntry[] {
  return timeline.filter((t) => {
    if (end) return t.date >= start && t.date <= end;
    return t.date === start;
  }).sort((a, b) => {
    const ta = a.time ?? '00:00';
    const tb = b.time ?? '00:00';
    return ta.localeCompare(tb);
  });
}

/** 取得某事件關聯的所有 POI */
export function getEventPOIs(eventId: string): POI[] {
  return pois.filter(
    (p) => p.related_events?.includes(eventId),
  );
}

/** 取得某 POI 關聯的所有事件 */
export function getPOIEvents(poiId: string): Event[] {
  return events.filter(
    (e) => {
      // related_pois could be stored in multiple ways
      return false; // 需從事件中反向查詢
    },
  );
}

/** 以類別篩選 POI */
export function filterPOIByCategory(category: string): POI[] {
  return pois.filter((p) => p.category === category);
}

/** 取得所有 POI 類別 */
export function getPOICategories(): string[] {
  return [...new Set(pois.map((p) => p.category).filter(Boolean))] as string[];
}

/** 取得人物分類統計 */
export function getPersonCategoryStats(): Record<string, number> {
  const stats: Record<string, number> = {};
  for (const p of persons) {
    const cat = p.primary_category ?? '未分類';
    stats[cat] = (stats[cat] ?? 0) + 1;
  }
  return stats;
}

/** 取得證據等級分布 */
export function getEvidenceDistribution<T extends { evidence_level?: string }>(
  items: T[],
): Record<string, number> {
  const dist: Record<string, number> = {};
  for (const item of items) {
    const lv = item.evidence_level ?? 'unknown';
    dist[lv] = (dist[lv] ?? 0) + 1;
  }
  return dist;
}

/** 取得某故事弧線的所有場景（依序排列） */
export function getArcScenes(arcId: string): Scene[] {
  return scenes
    .filter((s) => s.story_arc_id === arcId)
    .sort((a, b) => (a.sequence_number ?? 0) - (b.sequence_number ?? 0));
}

/** 取得某場景的所有節拍（依序排列） */
export function getSceneBeats(sceneId: string): NarrativeBeat[] {
  return narrativeBeats
    .filter((b) => b.scene_id === sceneId)
    .sort((a, b) => (a.sequence_number ?? 0) - (b.sequence_number ?? 0));
}

/** 以日期篩選事件 */
export function getEventsByDate(date: string): Event[] {
  return events.filter((e) => {
    if (e.date.includes('~')) {
      const [start, end] = e.date.split('~');
      return date >= start && date <= end;
    }
    return e.date === date;
  });
}

// ============================================================
// 統計摘要
// ============================================================

export const STATS = {
  totalTimeline: timeline.length,
  totalEvents: events.length,
  totalPOIs: pois.length,
  totalPersons: persons.length,
  totalSources: sources.length,
  totalStoryArcs: storyArcs.length,
  totalScenes: scenes.length,
  totalBeats: narrativeBeats.length,
  totalNarratives: narratives.length,
  totalAudioGuides: audioGuides.length,
};
