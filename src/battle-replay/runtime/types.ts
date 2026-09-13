import type { Confidence, EntityId, LocalizedText, Position } from '../types/index.js';

export const BATTLEFIELD_MODES = ['EXPLORE', 'STORY', 'BATTLEFIELD'] as const;
export type BattlefieldMode = typeof BATTLEFIELD_MODES[number];

/** Evidence vocabulary used at the runtime boundary. It never upgrades data. */
export const EVIDENCE_LEVELS = ['VERIFIED', 'SUPPORTED', 'PARTIAL', 'DISPUTED', 'NO_EVIDENCE'] as const;
export type EvidenceLevel = typeof EVIDENCE_LEVELS[number];

export type RuntimeUnitSide = 'roc' | 'pla' | 'civilian' | 'unknown';
export type RuntimeUnitStatus = 'ready' | 'moving' | 'engaged' | 'disrupted' | 'withdrawn' | 'destroyed' | 'captured' | 'unknown';
export type RuntimeRouteStatus = 'verified' | 'candidate' | 'deprecated' | 'insufficient_evidence';

export interface RuntimeEvidenceFields {
  sourceIds: EntityId[];
  evidenceIds: EntityId[];
  confidence: EvidenceLevel;
  /** The source model's original vocabulary is retained for auditability. */
  sourceConfidence?: Confidence | string;
  verificationStatus?: string;
  /** Structured provenance is retained at the runtime boundary for inspectors. */
  provenance?: Record<string, unknown>;
  notes?: string;
}

export interface RuntimePoi extends RuntimeEvidenceFields {
  id: EntityId;
  name: LocalizedText;
  position?: Position;
  locationType?: string;
  historicalStatus?: string;
}

export interface RuntimeRoute extends RuntimeEvidenceFields {
  id: EntityId;
  coordinates: Position[];
  startTime?: number;
  endTime?: number;
  historicalRouteStatus: RuntimeRouteStatus;
  researchOnly: boolean;
  geometryProvenance?: string;
  routeType?: string;
  routeNature?: string;
}

export interface RuntimeEvent extends RuntimeEvidenceFields {
  id: EntityId;
  title: LocalizedText;
  eventType: string;
  startTime?: number;
  endTime?: number;
  locationRefs: EntityId[];
  participatingUnitRefs: EntityId[];
  routeRefs: EntityId[];
  visualState?: string;
}

export interface RuntimeUnit extends RuntimeEvidenceFields {
  id: EntityId;
  name: LocalizedText;
  side: RuntimeUnitSide;
  type: string;
  strength?: {
    value?: number;
    minimum?: number;
    maximum?: number;
  };
  position?: Position;
  routeId?: EntityId;
  startTime?: number;
  endTime?: number;
  status: RuntimeUnitStatus;
  researchOnly?: boolean;
}

export interface RuntimeSource extends RuntimeEvidenceFields {
  id: EntityId;
  title: LocalizedText;
  sourceType?: string;
  url?: string;
  rights?: string;
}

export interface RuntimeRegion extends RuntimeEvidenceFields {
  id: EntityId;
  name: LocalizedText;
  parentId?: EntityId;
  poiIds: EntityId[];
  eventIds: EntityId[];
  routeIds: EntityId[];
  unitIds: EntityId[];
  assetIds: EntityId[];
}

export interface RuntimeStoryStep {
  id: EntityId;
  time?: number;
  eventId?: EntityId;
  cameraCommandId?: EntityId;
  narration?: LocalizedText;
}

export interface RuntimeStory extends RuntimeEvidenceFields {
  id: EntityId;
  title: LocalizedText;
  steps: RuntimeStoryStep[];
}

export interface RuntimeBattleData {
  pois: RuntimePoi[];
  events: RuntimeEvent[];
  units: RuntimeUnit[];
  routes: RuntimeRoute[];
  sources: RuntimeSource[];
  regions: RuntimeRegion[];
  stories: RuntimeStory[];
}

export interface CameraState {
  mode: 'orbit' | 'fly-to' | 'follow' | 'look-at' | 'cinematic-path' | 'free-explore';
  presetId?: string;
  target?: Position;
  unitId?: EntityId;
  isAnimating: boolean;
}

export interface BattlefieldState {
  currentTime: number;
  mode: BattlefieldMode;
  researchMode: boolean;
  activeEvents: EntityId[];
  visibleUnits: EntityId[];
  selectedPOI: EntityId | null;
  selectedRegion: EntityId | null;
  cameraState: CameraState;
}

export type BattlefieldAction =
  | { type: 'SET_TIME'; currentTime: number }
  | { type: 'SET_MODE'; mode: BattlefieldMode }
  | { type: 'SET_RESEARCH_MODE'; researchMode: boolean }
  | { type: 'SET_ACTIVE_EVENTS'; eventIds: EntityId[] }
  | { type: 'SET_VISIBLE_UNITS'; unitIds: EntityId[] }
  | { type: 'SELECT_POI'; poiId: EntityId | null }
  | { type: 'SELECT_REGION'; regionId: EntityId | null }
  | { type: 'SET_CAMERA'; cameraState: CameraState }
  | { type: 'RESET'; currentTime?: number };

export interface TimelineSnapshot {
  currentTime: number;
  startTime: number;
  endTime: number;
  speed: number;
  playing: boolean;
}

export interface RuntimeUnitSnapshot {
  unitId: EntityId;
  visible: boolean;
  active: boolean;
  position?: Position;
  routeId?: EntityId;
  progress?: number;
  status: RuntimeUnitStatus;
}

export type CameraCommand =
  | { type: 'orbit'; presetId?: string; target?: Position; durationMs?: number }
  | { type: 'fly-to'; presetId?: string; target: Position; durationMs?: number }
  | { type: 'follow'; unitId: EntityId; durationMs?: number }
  | { type: 'look-at'; target: Position; durationMs?: number }
  | { type: 'cinematic-path'; points: Position[]; durationMs?: number }
  | { type: 'free-explore' };
