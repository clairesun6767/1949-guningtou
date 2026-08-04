// ============================================================
// 古寧頭戰役網站 — 全域型別定義
// 基於 Battlefield_OS 既有 Schema，對應 data/ 目錄 JSON 結構
// ============================================================

// --- 視角 ---
export type Perspective = 'roc' | 'prc' | 'neutral';

// --- 證據等級 ---
export type EvidenceLevel = 'A' | 'B' | 'C' | 'D' | 'E';
export type VerificationStatus =
  | 'verified'
  | 'partially_verified'
  | 'conflicting_sources'
  | 'needs_human_review';

// --- 時間軸 (timeline.json) ---
export interface TimelineEntry {
  timeline_id: string; // TIM-XXXX
  date: string;
  time?: string;
  time_precision?: string;
  title: string;
  description: string;
  location?: string;
  roc_units?: string;
  pla_units?: string;
  key_figures?: string;
  source_ids?: string[];
  alternative_versions?: string;
  confidence?: string;
  evidence_level?: EvidenceLevel;
  evidence_summary?: string;
  verification_status?: VerificationStatus;
}

// --- 事件 (events.json) ---
export interface Event {
  event_id: string; // EVT-XXXX
  date: string;
  time_start?: string;
  time_end?: string;
  time_precision?: string;
  title: string;
  description: string;
  location?: string;
  participants?: string;
  roc_units?: string;
  pla_units?: string;
  commanders?: string;
  event_type?: string;
  source_ids?: string[];
  citations?: string[];
  conflicting_accounts?: string;
  confidence?: string;
  verification_status?: VerificationStatus;
  needs_human_review?: boolean;
  evidence_level?: EvidenceLevel;
  evidence_summary?: string;
  notes?: string;
}

// --- POI (poi.json) ---
export interface POI {
  poi_id: string; // POI-XXXX
  name_chinese: string;
  name_english?: string;
  category?: string;
  description?: string;
  short_description?: string;
  long_description?: string;
  historical_background?: string;
  battle_role?: string;
  historical_context?: string;
  historical_importance?: string;
  latitude: number;
  longitude: number;
  coordinate_accuracy?: string;
  related_events?: string;
  related_timeline?: string;
  related_persons?: string;
  related_sources?: string[];
  evidence_level?: EvidenceLevel;
  evidence_summary?: string;
  verification_status?: VerificationStatus;
  adjacent_pois?: string[];
  connected_roads?: string[];
  defense_network?: string;
  landing_route?: string;
  retreat_route?: string;
  supply_route?: string;
  open_status?: string;
  accessibility?: string;
  visiting_time?: string;
  nearby_parking?: string;
  nearby_pois?: string[];
  game_applications?: string[];
  has_3d_model?: boolean;
  photo_count?: number;
  document_count?: number;
  created_date?: string;
  updated_date?: string;
}

// --- 歷史人物 (persons.json) ---
export interface HistoricalPerson {
  person_id: string; // PER-XXXX
  name_zh: string;
  name_en?: string;
  name_variants?: string[];
  aliases?: string[];
  gender?: string;
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  death_place?: string;
  nationality_or_affiliation?: string;
  organization?: string;
  military_branch?: string;
  unit?: string;
  rank_at_event?: string;
  highest_known_rank?: string;
  primary_category?: string;
  secondary_categories?: string[];
  role_in_battle?: string;
  biographical_summary?: string;
  battle_actions?: string;
  command_relationships?: string;
  related_persons?: string;
  related_events?: string;
  related_timeline?: string;
  related_pois?: string;
  related_routes?: string;
  related_sources?: string[];
  evidence_level?: EvidenceLevel;
  evidence_summary?: string;
  verification_status?: VerificationStatus;
  short_bio?: string;
  standard_bio?: string;
  battle_role_summary?: string;
  key_actions_list?: string[];
  person_type?: 'core' | 'standard';
  notes?: string;
}

// --- 來源 (sources.json) ---
export interface Source {
  source_id: string; // SRC-XXXX
  title: string;
  author_or_institution: string;
  publication_date?: string;
  source_type?: string;
  source_level?: number;
  url_or_identifier: string;
  access_date?: string;
  relevant_pages_or_sections?: string;
  relevance_summary?: string;
  usage_rights?: string;
  verification_status?: string;
  notes?: string;
}

// --- 故事弧線 (story_arcs.json) ---
export interface StoryArc {
  story_arc_id: string; // ARC-XXXX
  title: string;
  theme?: string;
  historical_scope?: string;
  start_state?: string;
  turning_points?: string;
  climax?: string;
  resolution?: string;
  related_narratives?: string;
  related_events?: string;
  related_pois?: string;
  related_persons?: string;
  related_routes?: string;
  evidence_level?: EvidenceLevel;
  verification_status?: VerificationStatus;
  content_type?: string;
  target_applications?: string;
  notes?: string;
}

// --- 場景 (scenes.json) ---
export interface Scene {
  scene_id: string; // SCN-XXXX
  scene_title: string;
  scene_type?: string;
  story_arc_id?: string;
  sequence_number?: number;
  start_datetime?: string;
  end_datetime?: string;
  location_poi_ids?: string[];
  route_ids?: string[];
  terrain_types?: string[];
  participating_person_ids?: string[];
  participating_unit_ids?: string[];
  event_ids?: string[];
  timeline_ids?: string[];
  media_asset_ids?: string[];
  scene_summary?: string;
  historical_actions?: string;
  environment_description?: string;
  visible_elements?: string;
  audio_environment?: string;
  interaction_opportunities?: string;
  camera_recommendations?: string;
  evidence_level?: EvidenceLevel;
  verification_status?: VerificationStatus;
  content_type?: string;
  uncertain_elements?: string;
  prohibited_reconstruction_elements?: string;
  historical_confidence_score?: number;
}

// --- 敘事節拍 (narrative_beats.json) ---
export interface NarrativeBeat {
  beat_id: string; // BEAT-XXXX
  scene_id?: string;
  sequence_number?: number;
  beat_type?: string;
  time_reference?: string;
  location_reference?: string;
  action?: string;
  historical_claim?: string;
  narration_text?: string;
  source_ids?: string[];
  evidence_level?: EvidenceLevel;
  verification_status?: VerificationStatus;
  content_type?: string;
  uncertainty_label?: string;
  interaction_trigger?: string;
  duration_seconds?: number;
  notes?: string;
}

// --- 敘事 (narratives.json) ---
export interface Narrative {
  narrative_id: string; // NAR-XXXX
  title_zh: string;
  title_en?: string;
  narrative_type?: string;
  target_audience?: string;
  application_context?: string;
  summary?: string;
  main_text?: string;
  short_text?: string;
  audio_guide_text?: string;
  historical_period?: string;
  start_datetime?: string;
  end_datetime?: string;
  primary_location?: string;
  related_timeline?: string;
  related_events?: string;
  related_pois?: string;
  related_persons?: string;
  related_units?: string;
  related_routes?: string;
  related_media?: string;
  related_sources?: string;
  evidence_level?: EvidenceLevel;
  verification_status?: VerificationStatus;
  content_type?: string;
  historical_fact_ratio?: number;
  inference_ratio?: number;
  dramatic_reconstruction_ratio?: number;
  uncertainty_notes?: string;
  conflicting_accounts?: string;
  citation_notes?: string;
  historical_confidence_score?: number;
  language?: string;
  reading_time_seconds?: number;
  recommended_audio_duration_seconds?: number;
  age_rating?: string;
  sensitivity_flags?: string[];
}

// --- POI 語音導覽 (audio_guides.json) ---
export interface AudioGuide {
  poi_id: string;
  poi_name?: string;
  quick_guide_seconds?: number;
  standard_guide_seconds?: number;
  extended_guide_seconds?: number;
  quick_guide_narration?: string;
  standard_guide_narration?: string;
  extended_guide_narration?: string;
  narrative_ids?: string;
  source_ids?: string[];
  evidence_level?: EvidenceLevel;
  verification_status?: VerificationStatus;
  uncertainty_notes?: string;
}

// --- 互動時間軸 (interactive_timeline.json) ---
export interface TimelineSegment {
  segment_id: string; // TLS-XXXX
  segment_type: string;
  title: string;
  start_datetime?: string;
  end_datetime?: string;
  timeline_ids?: string[];
  event_ids?: string[];
  poi_ids?: string[];
  route_ids?: string[];
  person_ids?: string[];
  map_focus?: string;
  camera_focus?: string;
  narration_text?: string;
  media_cues?: unknown;
  uncertainty_notes?: string;
  duration_seconds?: number;
  evidence_level?: EvidenceLevel;
  verification_status?: VerificationStatus;
}

// --- 空間網路 (spatial_network.json) ---
export interface SpatialNode {
  spatial_id: string;
  poi_id: string;
  name_chinese: string;
  parent_area?: string;
  sub_area?: string;
  connected_pois?: Array<{
    target_poi: string;
    connection_type: string;
    route_name?: string;
    distance_meters?: number;
  }>;
  terrain_type?: string;
  elevation?: number;
  visibility?: string;
  accessibility?: string;
  military_importance?: string;
  civilian_importance?: string;
  distance_to_nearest_poi?: number;
}

// --- PRC 資料 ---
export interface PRCTimelineEntry {
  timeline_id: string;
  date: string;
  time?: string;
  title: string;
  description?: string;
  location?: string;
  pla_units?: string;
  key_figures?: string;
  source_ids?: string[];
  evidence_level?: EvidenceLevel;
  verification_status?: VerificationStatus;
}

export interface PRCPersonnel {
  person_id: string;
  name_zh: string;
  name_en?: string;
  rank_at_event?: string;
  unit?: string;
  role_in_battle?: string;
  biographical_summary?: string;
  battle_actions?: string;
  related_sources?: string[];
  evidence_level?: EvidenceLevel;
  verification_status?: VerificationStatus;
}
