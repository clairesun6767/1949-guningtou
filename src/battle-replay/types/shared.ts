export const CURRENT_SCHEMA_VERSION = '1.0.0' as const;

export type SchemaVersion = typeof CURRENT_SCHEMA_VERSION;
export type EntityId = string;
export type LocalizedText = Record<string, string>;

export type Confidence =
  | 'confirmed'
  | 'probable'
  | 'estimated'
  | 'disputed'
  | 'unknown';

export type VerificationStatus =
  | 'unverified'
  | 'candidate'
  | 'pending-manual-verification'
  | 'manually-verified'
  | 'source-verified'
  | 'estimated'
  | 'disputed'
  | 'unknown';

export interface EntityBase {
  id: EntityId;
  schemaVersion: SchemaVersion;
  sourceRefs: EntityId[];
  confidence: Confidence;
  notes?: LocalizedText;
  metadata?: Record<string, unknown>;
}

export interface Period {
  validFrom?: string;
  validTo?: string;
  label?: LocalizedText;
}

export type DataQualityStatus =
  | 'Verified'
  | 'Needs Review'
  | 'Incomplete'
  | 'Conflicted'
  | 'Invalid';
