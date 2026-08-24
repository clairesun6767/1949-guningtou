import type { Confidence, EntityId } from './shared.js';

export type HistoricalTimeKind =
  | 'exact'
  | 'approximate'
  | 'range'
  | 'before'
  | 'after'
  | 'sequence-only'
  | 'unknown';

export type HistoricalTimePrecision =
  | 'second'
  | 'minute'
  | 'hour'
  | 'approximate-hour'
  | 'time-range'
  | 'sequence-only'
  | 'unknown';

export interface HistoricalTime {
  kind: HistoricalTimeKind;
  value?: string;
  earliest?: string;
  latest?: string;
  precision: HistoricalTimePrecision;
  timezone: string;
  sequence?: number;
  relativeToEventRef?: EntityId;
  sourceRefs: EntityId[];
  confidence: Confidence;
  notes?: string;
}

export interface TemporalExtent {
  start: HistoricalTime;
  end: HistoricalTime;
}
