import type {
  BattlePackageData,
  BattlePackageManifest,
  LocalizedText,
  Position,
} from '../types/index.js';

/**
 * Evidence vocabulary used by the historical-data boundary.
 *
 * This is intentionally separate from the lower-level `Confidence` values
 * used by the BR-1 package.  A claim may retain its source confidence while
 * the evidence gate exposes a conservative product-facing level.
 */
export const HISTORICAL_EVIDENCE_LEVELS = [
  'VERIFIED',
  'SUPPORTED',
  'PARTIAL',
  'DISPUTED',
  'NO_EVIDENCE',
] as const;

export type HistoricalEvidenceLevel = typeof HISTORICAL_EVIDENCE_LEVELS[number];

export type HistoricalClaimSubjectType =
  | 'battle'
  | 'event'
  | 'unit'
  | 'formation'
  | 'location'
  | 'route'
  | 'region'
  | 'source'
  | 'timeline'
  | 'media';

export type HistoricalEntityNamespace = 'canonical' | 'legacy';

export type SourceRegistryType =
  | 'BOOK'
  | 'ARCHIVE'
  | 'OFFICIAL_RECORD'
  | 'MAP'
  | 'PHOTO'
  | 'ARTICLE'
  | 'WEBSITE'
  | 'ORAL_HISTORY'
  | 'RESEARCH'
  | 'UNKNOWN';

export interface SourceRegistryEntry {
  id: string;
  title: LocalizedText;
  type: SourceRegistryType;
  author?: LocalizedText;
  publisher?: LocalizedText;
  year?: string;
  page?: string;
  url?: string;
  archiveId?: string;
  citation?: string;
  notes?: LocalizedText;
  legacyVerificationStatus?: string;
  provenance: {
    dataset: string;
    legacyId: string;
  };
  metadata?: Record<string, unknown>;
}

export interface HistoricalClaim {
  id: string;
  subjectType: HistoricalClaimSubjectType;
  subjectId: string;
  subjectNamespace: HistoricalEntityNamespace;
  predicate: string;
  value: unknown;
  sourceIds: string[];
  evidenceLevel: HistoricalEvidenceLevel;
  notes?: string | LocalizedText;
  coordinate?: Position;
  time?: import('../types/time.js').HistoricalTime;
}

export interface EvidenceDimension {
  level: HistoricalEvidenceLevel;
  claimIds: string[];
  sourceIds?: string[];
  notes?: string;
}

export interface HistoricalEvidenceMatrixRow {
  id: string;
  eventId: string;
  eventNamespace: HistoricalEntityNamespace;
  title: LocalizedText;
  dimensions: {
    event: EvidenceDimension;
    time: EvidenceDimension;
    location: EvidenceDimension;
    unit: EvidenceDimension;
    route: EvidenceDimension;
  };
  overall: HistoricalEvidenceLevel;
  routePresentation: 'exact-route-animation' | 'static-context-only' | 'not-available';
  gateStatus: 'QUALIFIED' | 'BLOCKED';
  sourceIds: string[];
  notes?: string;
}

export type RouteAuditStatus =
  | 'ACTIVE'
  | 'PARTIAL'
  | 'DISABLED_NO_EVIDENCE'
  | 'DISPUTED'
  | 'LEGACY';

export type RouteAuditRecommendation = 'KEEP_AS_CANDIDATE' | 'MODIFY' | 'REMOVE' | 'REVIEW';

export interface RouteAuditRecord {
  routeId: string;
  sourceDataset: string;
  status: RouteAuditStatus;
  enabled: boolean;
  recommendation: RouteAuditRecommendation;
  legacyEventIds: string[];
  legacyUnitIds: string[];
  legacyPoiIds: string[];
  sourceIds: string[];
  geometryStatus: 'not-promoted' | 'source-preserved' | 'canonical';
  notes: string;
}

export type ResearchGapEntityType =
  | HistoricalClaimSubjectType
  | 'route-audit'
  | 'source-catalog';

export type ResearchGapPriority = 'P0' | 'P1' | 'P2';
export type ResearchGapStatus = 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'CLOSED';

export interface ResearchGap {
  id: string;
  entityType: ResearchGapEntityType;
  entityId: string;
  question: string;
  requiredEvidence: string[];
  priority: ResearchGapPriority;
  status: ResearchGapStatus;
  notes?: string;
}

export interface HistoricalDataBundle {
  packageData: BattlePackageData;
  manifest?: BattlePackageManifest;
  sourceRegistry: SourceRegistryEntry[];
  claims: HistoricalClaim[];
  evidenceMatrix: HistoricalEvidenceMatrixRow[];
  routeAudit: RouteAuditRecord[];
  researchGaps: ResearchGap[];
}

export interface EvidenceGateResult {
  eventId: string;
  pass: boolean;
  routeRequired: boolean;
  failures: Array<'event' | 'time' | 'location' | 'unit' | 'route'>;
  dimensions: HistoricalEvidenceMatrixRow['dimensions'];
  presentation: 'evidence-backed' | 'static-context-only' | 'blocked';
  reason: string;
}

export interface HistoricalDataValidationReport {
  valid: boolean;
  errors: number;
  warnings: number;
  info: number;
  diagnostics: import('../validation/diagnostics.js').ValidationDiagnostic[];
  counts: {
    sources: number;
    claims: number;
    evidenceRows: number;
    routeAuditRows: number;
    researchGaps: number;
  };
}

export interface LegacyHistoricalCatalogResult {
  sourceRegistry: SourceRegistryEntry[];
  adapted: {
    sources: number;
    locations: number;
    factions: number;
    units: number;
    events: number;
    topologicalConnections: number;
    promotedRoutes: number;
  };
  issues: Array<{
    severity: 'WARNING' | 'INFO';
    code: string;
    legacyId?: string;
    message: string;
  }>;
  unresolvedReferences: string[];
  migration: {
    authoritativeSource: string;
    destination: string;
    promotionPolicy: 'explicit-review-only';
  };
}
