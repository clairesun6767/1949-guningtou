import type {
  EvidenceGateResult,
  EvidenceDimension,
  HistoricalEvidenceLevel,
  HistoricalEvidenceMatrixRow,
} from './types.js';

const evidenceRank: Record<HistoricalEvidenceLevel, number> = {
  NO_EVIDENCE: 0,
  PARTIAL: 1,
  SUPPORTED: 2,
  VERIFIED: 3,
  DISPUTED: -1,
};

export function historicalEvidenceRank(level: HistoricalEvidenceLevel): number {
  return evidenceRank[level];
}

/** A disputed claim never satisfies a positive evidence threshold. */
export function meetsEvidenceGate(
  level: HistoricalEvidenceLevel,
  minimum: Exclude<HistoricalEvidenceLevel, 'DISPUTED'> = 'SUPPORTED',
): boolean {
  return level !== 'DISPUTED' && evidenceRank[level] >= evidenceRank[minimum];
}

function requiredFailures(
  dimensions: HistoricalEvidenceMatrixRow['dimensions'],
  routeRequired: boolean,
): EvidenceGateResult['failures'] {
  const required: Array<['event' | 'time' | 'location' | 'unit' | 'route', EvidenceDimension]> = [
    ['event', dimensions.event],
    ['time', dimensions.time],
    ['location', dimensions.location],
    ['unit', dimensions.unit],
  ];
  if (routeRequired) required.push(['route', dimensions.route]);
  return required
    .filter(([, dimension]) => !meetsEvidenceGate(dimension.level))
    .map(([name]) => name);
}

export interface EvidenceGateOptions {
  /** Exact historical movement animation requires route evidence. */
  requireRoute?: boolean;
}

/**
 * Evaluate a matrix row using explicit dimensions only.  `overall` is not
 * averaged and cannot be used to rescue a missing event, location, unit, or
 * route dimension.
 */
export function evaluateVerticalSliceGate(
  row: HistoricalEvidenceMatrixRow,
  options: EvidenceGateOptions = {},
): EvidenceGateResult {
  const routeRequired = options.requireRoute ?? row.routePresentation === 'exact-route-animation';
  const failures = requiredFailures(row.dimensions, routeRequired);
  const pass = failures.length === 0;
  const presentation = pass
    ? routeRequired
      ? 'evidence-backed'
      : 'static-context-only'
    : 'blocked';
  return {
    eventId: row.eventId,
    pass,
    routeRequired,
    failures,
    dimensions: row.dimensions,
    presentation,
    reason: pass
      ? routeRequired
        ? 'Event, time, location, unit, and route meet the Supported threshold.'
        : 'Event, time, location, and unit meet the Supported threshold; route animation remains out of scope.'
      : `Evidence Gate blocked by: ${failures.join(', ')}.`,
  };
}

export interface HistoricalCandidateSelection {
  selected?: HistoricalEvidenceMatrixRow;
  evaluations: EvidenceGateResult[];
  qualifiedEventIds: string[];
}

export function selectFirstQualifiedHistoricalEvent(
  rows: HistoricalEvidenceMatrixRow[],
  options: EvidenceGateOptions = {},
): HistoricalCandidateSelection {
  const evaluations = rows.map(row => evaluateVerticalSliceGate(row, options));
  const qualifiedEventIds = evaluations.filter(result => result.pass).map(result => result.eventId);
  const selected = rows.find(row => evaluations.find(result => result.eventId === row.eventId)?.pass);
  return { selected, evaluations, qualifiedEventIds };
}
