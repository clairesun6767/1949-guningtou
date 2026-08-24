import type {
  BattleEvent,
  Faction,
  LocationFeature,
  Source,
  TopologicalConnection,
  Unit,
} from '../../types/index.js';

export interface LegacyDataInput {
  poi?: unknown;
  sources?: unknown;
  units?: unknown;
  events?: unknown;
  timeline?: unknown;
  routes?: unknown;
}

export interface LegacyAdapterIssue {
  severity: 'WARNING' | 'INFO';
  code: string;
  legacyId?: string;
  message: string;
}

export interface LegacyAdaptationResult {
  sources: Source[];
  locations: LocationFeature[];
  factions: Faction[];
  units: Unit[];
  events: BattleEvent[];
  topologicalConnections: TopologicalConnection[];
  routes: [];
  issues: LegacyAdapterIssue[];
  unresolvedReferences: string[];
}
