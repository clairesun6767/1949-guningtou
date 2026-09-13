import {
  validateHistoricalTime,
  validatePosition,
} from '../validation/validate.js';
import { DiagnosticCollector } from '../validation/diagnostics.js';
import type {
  BattlePackageData,
  EntityId,
  Formation,
  Unit,
} from '../types/index.js';
import { evaluateVerticalSliceGate, meetsEvidenceGate } from './evidenceGate.js';
import type {
  HistoricalClaim,
  HistoricalDataBundle,
  HistoricalDataValidationReport,
  HistoricalEvidenceMatrixRow,
  HumanReviewQueueItem,
  ResearchGap,
  RouteAuditRecord,
  SourceRegistryEntry,
} from './types.js';
import { HISTORICAL_EVIDENCE_LEVELS, HUMAN_REVIEW_ACTIONS } from './types.js';

const evidenceLevels = new Set<string>(HISTORICAL_EVIDENCE_LEVELS);
const claimSubjectTypes = new Set([
  'battle', 'event', 'unit', 'formation', 'location', 'route', 'region', 'source', 'timeline', 'media',
]);
const namespaces = new Set(['canonical', 'legacy']);
const routeStatuses = new Set(['ACTIVE', 'PARTIAL', 'DISABLED_NO_EVIDENCE', 'DISPUTED', 'LEGACY']);
const routeRecommendations = new Set(['KEEP_AS_CANDIDATE', 'MODIFY', 'REMOVE', 'REVIEW']);
const researchEntityTypes = new Set([
  'battle', 'event', 'unit', 'formation', 'location', 'route', 'region', 'source', 'timeline', 'media',
  'route-audit', 'source-catalog',
]);
const researchPriorities = new Set(['P0', 'P1', 'P2']);
const researchStatuses = new Set(['OPEN', 'IN_PROGRESS', 'BLOCKED', 'CLOSED']);
const matrixDimensions = ['event', 'time', 'location', 'unit', 'route'] as const;
const humanReviewDimensions = new Set([
  ...matrixDimensions,
  'source', 'package', 'identity', 'region',
]);
const humanReviewActions = new Set<string>(HUMAN_REVIEW_ACTIONS);

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function localizedHasValue(value: unknown): boolean {
  return typeof value === 'object'
    && value !== null
    && Object.values(value as Record<string, unknown>).some(item => nonEmpty(item));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function idsOf(records: Array<{ id: EntityId }>): Set<string> {
  return new Set(records.map(record => record.id));
}

function packageEntityIds(data: BattlePackageData): Record<string, Set<string>> {
  return {
    battle: idsOf([data.battle]),
    event: idsOf(data.events),
    unit: idsOf(data.units),
    formation: idsOf(data.formations),
    location: new Set(data.locations.map(feature => feature.properties.id)),
    route: new Set(data.routes.map(feature => feature.properties.id)),
    source: idsOf(data.sources),
    region: new Set(data.battleAreas.map(feature => feature.properties.id)),
    media: idsOf(data.media),
    timeline: new Set(),
  };
}

function registerUnique(
  records: Array<{ id?: string }>,
  collection: string,
  collector: DiagnosticCollector,
): Set<string> {
  const ids = new Set<string>();
  records.forEach((record, index) => {
    if (!nonEmpty(record.id)) {
      collector.error('HISTORICAL_ID_REQUIRED', `${collection} requires a stable ID.`, {
        path: `${collection}[${index}].id`,
        domain: 'schema',
      });
      return;
    }
    if (ids.has(record.id)) {
      collector.error('HISTORICAL_DUPLICATE_ID', `Duplicate ${collection} ID: ${record.id}.`, {
        path: `${collection}[${index}].id`,
        entityId: record.id,
        domain: 'integrity',
      });
    }
    ids.add(record.id);
  });
  return ids;
}

function requireSourceIds(
  sourceIds: unknown,
  sourceRegistryIds: Set<string>,
  collector: DiagnosticCollector,
  path: string,
  entityId: string,
  required = true,
): void {
  if (!Array.isArray(sourceIds)) {
    collector.error('HISTORICAL_SOURCE_IDS_REQUIRED', 'Historical evidence references must be an array.', {
      path,
      entityId,
      domain: 'schema',
    });
    return;
  }
  if (required && sourceIds.length === 0) {
    collector.error('HISTORICAL_SOURCE_REQUIRED', 'A historical claim or supported matrix dimension requires at least one source ID.', {
      path,
      entityId,
      domain: 'historical',
    });
  }
  sourceIds.forEach((sourceId, index) => {
    if (!nonEmpty(sourceId) || !sourceRegistryIds.has(sourceId)) {
      collector.error('HISTORICAL_SOURCE_REFERENCE_BROKEN', `Source reference does not resolve: ${String(sourceId)}.`, {
        path: `${path}[${index}]`,
        entityId,
        domain: 'integrity',
      });
    }
  });
}

function hasCycle(records: Array<{ id: string; parentUnitId?: string; parentFormationId?: string }>, parentKey: 'parentUnitId' | 'parentFormationId'): string[] {
  const byId = new Map(records.map(record => [record.id, record]));
  const cycleIds = new Set<string>();
  for (const record of records) {
    const path: string[] = [];
    const seen = new Set<string>();
    let current: typeof record | undefined = record;
    while (current) {
      if (seen.has(current.id)) {
        const start = path.indexOf(current.id);
        path.slice(start < 0 ? 0 : start).forEach(id => cycleIds.add(id));
        break;
      }
      seen.add(current.id);
      path.push(current.id);
      const parentId: string | undefined = current[parentKey];
      current = parentId ? byId.get(parentId) : undefined;
    }
  }
  return [...cycleIds];
}

function validateSourceRegistry(
  registry: SourceRegistryEntry[],
  collector: DiagnosticCollector,
): Set<string> {
  const ids = registerUnique(registry, 'sourceRegistry', collector);
  registry.forEach((source, index) => {
    const path = `sourceRegistry[${index}]`;
    if (!localizedHasValue(source.title)) {
      collector.error('HISTORICAL_LOCALE_MISSING', 'Source registry entry requires at least one localized title.', {
        path: `${path}.title`, entityId: source.id, domain: 'schema',
      });
    }
    if (!source.provenance || !nonEmpty(source.provenance.dataset) || !nonEmpty(source.provenance.legacyId)) {
      collector.error('HISTORICAL_PROVENANCE_REQUIRED', 'Source registry entry requires dataset and legacyId provenance.', {
        path: `${path}.provenance`, entityId: source.id, domain: 'schema',
      });
    }
  });
  return ids;
}

function validateClaim(
  claim: HistoricalClaim,
  index: number,
  sourceIds: Set<string>,
  entityIds: Record<string, Set<string>>,
  collector: DiagnosticCollector,
): void {
  const path = `claims[${index}]`;
  if (!claimSubjectTypes.has(claim.subjectType)) {
    collector.error('HISTORICAL_CLAIM_SUBJECT_TYPE_INVALID', `Unsupported claim subject type: ${claim.subjectType}.`, {
      path: `${path}.subjectType`, entityId: claim.id, domain: 'schema',
    });
  }
  if (!namespaces.has(claim.subjectNamespace)) {
    collector.error('HISTORICAL_CLAIM_NAMESPACE_INVALID', `Unsupported claim subject namespace: ${claim.subjectNamespace}.`, {
      path: `${path}.subjectNamespace`, entityId: claim.id, domain: 'schema',
    });
  }
  if (!nonEmpty(claim.predicate)) {
    collector.error('HISTORICAL_CLAIM_PREDICATE_REQUIRED', 'Historical claim requires a predicate.', {
      path: `${path}.predicate`, entityId: claim.id, domain: 'schema',
    });
  }
  if (claim.value === undefined) {
    collector.error('HISTORICAL_CLAIM_VALUE_REQUIRED', 'Historical claim requires an explicit value; use a documented unknown value instead of omission.', {
      path: `${path}.value`, entityId: claim.id, domain: 'schema',
    });
  }
  if (!evidenceLevels.has(claim.evidenceLevel)) {
    collector.error('HISTORICAL_EVIDENCE_LEVEL_INVALID', `Unsupported evidence level: ${claim.evidenceLevel}.`, {
      path: `${path}.evidenceLevel`, entityId: claim.id, domain: 'schema',
    });
  }
  requireSourceIds(claim.sourceIds, sourceIds, collector, `${path}.sourceIds`, claim.id);
  if (claim.subjectNamespace === 'canonical') {
    const subjectSet = entityIds[claim.subjectType];
    if (!subjectSet?.has(claim.subjectId)) {
      collector.error('HISTORICAL_CLAIM_SUBJECT_BROKEN', `Canonical claim subject does not resolve: ${claim.subjectId}.`, {
        path: `${path}.subjectId`, entityId: claim.id, domain: 'integrity',
      });
    }
  }
  if (claim.coordinate) validatePosition(claim.coordinate, collector, `${path}.coordinate`, claim.id);
  if (claim.time) validateHistoricalTime(claim.time, collector, `${path}.time`, claim.id);
}

function validateDimension(
  dimension: HistoricalEvidenceMatrixRow['dimensions'][keyof HistoricalEvidenceMatrixRow['dimensions']],
  path: string,
  rowId: string,
  sourceIds: Set<string>,
  claimIds: Set<string>,
  collector: DiagnosticCollector,
): void {
  if (!evidenceLevels.has(dimension.level)) {
    collector.error('HISTORICAL_MATRIX_LEVEL_INVALID', `Unsupported matrix evidence level: ${dimension.level}.`, {
      path: `${path}.level`, entityId: rowId, domain: 'schema',
    });
  }
  if (!Array.isArray(dimension.claimIds)) {
    collector.error('HISTORICAL_MATRIX_CLAIMS_REQUIRED', 'Evidence matrix claimIds must be an array.', {
      path: `${path}.claimIds`, entityId: rowId, domain: 'schema',
    });
  } else {
    dimension.claimIds.forEach((claimId, index) => {
      if (!claimIds.has(claimId)) {
        collector.error('HISTORICAL_MATRIX_CLAIM_BROKEN', `Matrix claim reference does not resolve: ${String(claimId)}.`, {
          path: `${path}.claimIds[${index}]`, entityId: rowId, domain: 'integrity',
        });
      }
    });
    if (dimension.level !== 'NO_EVIDENCE' && dimension.claimIds.length === 0) {
      collector.error('HISTORICAL_MATRIX_CLAIM_REQUIRED', 'A non-empty evidence level requires at least one explicit claim.', {
        path: `${path}.claimIds`, entityId: rowId, domain: 'historical',
      });
    }
  }
  if (dimension.sourceIds !== undefined) {
    requireSourceIds(dimension.sourceIds, sourceIds, collector, `${path}.sourceIds`, rowId, dimension.level !== 'NO_EVIDENCE');
  } else if (dimension.level !== 'NO_EVIDENCE') {
    collector.warning('HISTORICAL_MATRIX_SOURCE_IDS_OMITTED', 'Matrix dimension relies on claim source IDs; explicit sourceIds improve reviewability.', {
      path: `${path}.sourceIds`, entityId: rowId, domain: 'historical',
    });
  }
}

function validateSnapshot(
  snapshot: unknown,
  path: string,
  rowId: string,
  collector: DiagnosticCollector,
): void {
  if (!isRecord(snapshot)) {
    collector.error('HISTORICAL_MATRIX_SNAPSHOT_REQUIRED', 'Evidence matrix requires a versioned evidence snapshot.', {
      path, entityId: rowId, domain: 'schema',
    });
    return;
  }
  matrixDimensions.forEach(dimension => {
    if (!evidenceLevels.has(snapshot[dimension] as string)) {
      collector.error('HISTORICAL_MATRIX_SNAPSHOT_LEVEL_INVALID', `Unsupported ${dimension} snapshot evidence level: ${String(snapshot[dimension])}.`, {
        path: `${path}.${dimension}`, entityId: rowId, domain: 'schema',
      });
    }
  });
  if (snapshot.qualification !== 'QUALIFIED' && snapshot.qualification !== 'BLOCKED') {
    collector.error('HISTORICAL_MATRIX_SNAPSHOT_QUALIFICATION_INVALID', `Unsupported snapshot qualification: ${String(snapshot.qualification)}.`, {
      path: `${path}.qualification`, entityId: rowId, domain: 'schema',
    });
  }
}

function validateEvidenceMatrix(
  rows: HistoricalEvidenceMatrixRow[],
  sourceIds: Set<string>,
  claimIds: Set<string>,
  entityIds: Record<string, Set<string>>,
  researchGapIds: Set<string>,
  humanReviewIds: Set<string>,
  collector: DiagnosticCollector,
): void {
  registerUnique(rows, 'evidenceMatrix', collector);
  const eventIds = new Set<string>();
  rows.forEach((row, index) => {
    const path = `evidenceMatrix[${index}]`;
    if (eventIds.has(row.eventId)) {
      collector.error('HISTORICAL_MATRIX_EVENT_DUPLICATE', `Evidence matrix contains duplicate event candidate: ${row.eventId}.`, {
        path: `${path}.eventId`, entityId: row.id, domain: 'integrity',
      });
    }
    eventIds.add(row.eventId);
    if (!namespaces.has(row.eventNamespace)) {
      collector.error('HISTORICAL_MATRIX_NAMESPACE_INVALID', `Unsupported matrix event namespace: ${row.eventNamespace}.`, {
        path: `${path}.eventNamespace`, entityId: row.id, domain: 'schema',
      });
    }
    if (row.eventNamespace === 'canonical' && !entityIds.event.has(row.eventId)) {
      collector.error('HISTORICAL_MATRIX_EVENT_BROKEN', `Canonical matrix event does not resolve: ${row.eventId}.`, {
        path: `${path}.eventId`, entityId: row.id, domain: 'integrity',
      });
    }
    if (!localizedHasValue(row.title)) {
      collector.error('HISTORICAL_LOCALE_MISSING', 'Evidence matrix row requires at least one localized title.', {
        path: `${path}.title`, entityId: row.id, domain: 'schema',
      });
    }
    (['event', 'time', 'location', 'unit', 'route'] as const).forEach(dimension => {
      validateDimension(row.dimensions[dimension], `${path}.dimensions.${dimension}`, row.id, sourceIds, claimIds, collector);
    });
    if (!evidenceLevels.has(row.overall)) {
      collector.error('HISTORICAL_MATRIX_OVERALL_INVALID', `Unsupported matrix overall level: ${row.overall}.`, {
        path: `${path}.overall`, entityId: row.id, domain: 'schema',
      });
    }
    if (!Array.isArray(row.claimIds)) {
      collector.error('HISTORICAL_MATRIX_CLAIM_IDS_REQUIRED', 'V1.3 evidence matrix rows require top-level claimIds for audit tracing.', {
        path: `${path}.claimIds`, entityId: row.id, domain: 'schema',
      });
    } else {
      row.claimIds.forEach((claimId, claimIndex) => {
        if (!claimIds.has(claimId)) {
          collector.error('HISTORICAL_MATRIX_CLAIM_BROKEN', `Matrix top-level claim reference does not resolve: ${String(claimId)}.`, {
            path: `${path}.claimIds[${claimIndex}]`, entityId: row.id, domain: 'integrity',
          });
        }
      });
      if (row.gateStatus === 'QUALIFIED' && row.claimIds.length === 0) {
        collector.error('HISTORICAL_PRODUCTION_CLAIM_REQUIRED', 'A qualified production candidate requires at least one claim reference.', {
          path: `${path}.claimIds`, entityId: row.eventId, domain: 'historical',
        });
      }
    }
    if (!Array.isArray(row.conflicts)) {
      collector.error('HISTORICAL_MATRIX_CONFLICTS_REQUIRED', 'V1.3 evidence matrix rows require an explicit conflicts array.', {
        path: `${path}.conflicts`, entityId: row.id, domain: 'schema',
      });
    }
    if (!Array.isArray(row.gapIds)) {
      collector.error('HISTORICAL_MATRIX_GAPS_REQUIRED', 'V1.3 evidence matrix rows require gap IDs for unresolved dimensions.', {
        path: `${path}.gapIds`, entityId: row.id, domain: 'schema',
      });
    } else {
      row.gapIds.forEach((gapId, gapIndex) => {
        if (!researchGapIds.has(gapId)) {
          collector.error('HISTORICAL_MATRIX_GAP_BROKEN', `Matrix research gap reference does not resolve: ${String(gapId)}.`, {
            path: `${path}.gapIds[${gapIndex}]`, entityId: row.id, domain: 'integrity',
          });
        }
      });
    }
    if (!nonEmpty(row.changeReason)) {
      collector.error('HISTORICAL_MATRIX_CHANGE_REASON_REQUIRED', 'V1.3 evidence matrix rows require a change reason.', {
        path: `${path}.changeReason`, entityId: row.id, domain: 'historical',
      });
    }
    if (!Array.isArray(row.humanDecisionRef)) {
      collector.error('HISTORICAL_MATRIX_HUMAN_REVIEW_REF_REQUIRED', 'V1.3 evidence matrix rows require human review references when evidence remains unresolved.', {
        path: `${path}.humanDecisionRef`, entityId: row.id, domain: 'schema',
      });
    } else {
      row.humanDecisionRef.forEach((reviewId, reviewIndex) => {
        if (!humanReviewIds.has(reviewId)) {
          collector.error('HISTORICAL_MATRIX_HUMAN_REVIEW_REF_BROKEN', `Human review reference does not resolve: ${String(reviewId)}.`, {
            path: `${path}.humanDecisionRef[${reviewIndex}]`, entityId: row.id, domain: 'integrity',
          });
        }
      });
    }
    validateSnapshot(row.v1_2, `${path}.v1_2`, row.id, collector);
    validateSnapshot(row.v1_3, `${path}.v1_3`, row.id, collector);
    if (isRecord(row.v1_3)) {
      matrixDimensions.forEach(dimension => {
        if (row.v1_3[dimension] !== row.dimensions[dimension].level) {
          collector.error('HISTORICAL_MATRIX_V1_3_LEVEL_STALE', `V1.3 snapshot for ${dimension} does not match the current dimension.`, {
            path: `${path}.v1_3.${dimension}`, entityId: row.id, domain: 'integrity',
          });
        }
      });
      if (row.v1_3.qualification !== row.gateStatus) {
        collector.error('HISTORICAL_MATRIX_V1_3_QUALIFICATION_STALE', 'V1.3 snapshot qualification does not match gateStatus.', {
          path: `${path}.v1_3.qualification`, entityId: row.id, domain: 'integrity',
        });
      }
    }
    requireSourceIds(row.sourceIds, sourceIds, collector, `${path}.sourceIds`, row.id, false);
    const evaluation = evaluateVerticalSliceGate(row);
    const expectedStatus = evaluation.pass ? 'QUALIFIED' : 'BLOCKED';
    if (row.gateStatus !== expectedStatus) {
      collector.error('HISTORICAL_GATE_STATUS_STALE', `Matrix gateStatus=${row.gateStatus} does not match explicit dimensions (${expectedStatus}).`, {
        path: `${path}.gateStatus`, entityId: row.id, domain: 'integrity',
      });
    }
    if (row.gateStatus === 'QUALIFIED') {
      if (row.eventNamespace !== 'canonical') {
        collector.error('HISTORICAL_PRODUCTION_EVENT_NOT_CANONICAL', 'A qualified production event must resolve to the canonical package namespace.', {
          path: `${path}.eventNamespace`, entityId: row.eventId, domain: 'integrity',
        });
      }
      if (row.sourceIds.length === 0) {
        collector.error('HISTORICAL_PRODUCTION_SOURCE_REQUIRED', 'A qualified production candidate requires source IDs.', {
          path: `${path}.sourceIds`, entityId: row.eventId, domain: 'historical',
        });
      }
    }
  });
}

function validateRouteAudit(
  rows: RouteAuditRecord[],
  sourceIds: Set<string>,
  collector: DiagnosticCollector,
): void {
  registerUnique(rows.map(row => ({ id: row.routeId })), 'routeAudit', collector);
  rows.forEach((row, index) => {
    const path = `routeAudit[${index}]`;
    if (!routeStatuses.has(row.status)) {
      collector.error('HISTORICAL_ROUTE_STATUS_INVALID', `Unsupported route audit status: ${row.status}.`, {
        path: `${path}.status`, entityId: row.routeId, domain: 'schema',
      });
    }
    if (!routeRecommendations.has(row.recommendation)) {
      collector.error('HISTORICAL_ROUTE_RECOMMENDATION_INVALID', `Unsupported route recommendation: ${row.recommendation}.`, {
        path: `${path}.recommendation`, entityId: row.routeId, domain: 'schema',
      });
    }
    if (row.enabled && row.status !== 'ACTIVE') {
      collector.error('HISTORICAL_ROUTE_ENABLEMENT_INVALID', 'Only ACTIVE routes may be enabled for a canonical presentation.', {
        path: `${path}.enabled`, entityId: row.routeId, domain: 'integrity',
      });
    }
    if (!Array.isArray(row.legacyEventIds) || !Array.isArray(row.legacyUnitIds) || !Array.isArray(row.legacyPoiIds)) {
      collector.error('HISTORICAL_ROUTE_LEGACY_REFS_INVALID', 'Route audit legacy references must be arrays.', {
        path, entityId: row.routeId, domain: 'schema',
      });
    }
    requireSourceIds(row.sourceIds, sourceIds, collector, `${path}.sourceIds`, row.routeId, false);
    if (!nonEmpty(row.notes)) {
      collector.error('HISTORICAL_ROUTE_AUDIT_NOTE_REQUIRED', 'A route audit row requires a reason for its status.', {
        path: `${path}.notes`, entityId: row.routeId, domain: 'historical',
      });
    }
  });
}

function validateResearchGaps(rows: ResearchGap[], collector: DiagnosticCollector): void {
  rows.forEach((gap, index) => {
    const path = `researchGaps[${index}]`;
    if (!researchEntityTypes.has(gap.entityType)) {
      collector.error('RESEARCH_GAP_ENTITY_TYPE_INVALID', `Unsupported research gap entity type: ${gap.entityType}.`, {
        path: `${path}.entityType`, entityId: gap.id, domain: 'schema',
      });
    }
    if (!researchPriorities.has(gap.priority)) {
      collector.error('RESEARCH_GAP_PRIORITY_INVALID', `Unsupported research gap priority: ${gap.priority}.`, {
        path: `${path}.priority`, entityId: gap.id, domain: 'schema',
      });
    }
    if (!researchStatuses.has(gap.status)) {
      collector.error('RESEARCH_GAP_STATUS_INVALID', `Unsupported research gap status: ${gap.status}.`, {
        path: `${path}.status`, entityId: gap.id, domain: 'schema',
      });
    }
    if (!nonEmpty(gap.entityId) || !nonEmpty(gap.question)) {
      collector.error('RESEARCH_GAP_FIELDS_REQUIRED', 'Research gap requires entityId and question.', {
        path, entityId: gap.id, domain: 'schema',
      });
    }
    if (!Array.isArray(gap.requiredEvidence) || gap.requiredEvidence.length === 0) {
      collector.error('RESEARCH_GAP_EVIDENCE_REQUIRED', 'Research gap requires at least one required evidence item.', {
        path: `${path}.requiredEvidence`, entityId: gap.id, domain: 'schema',
      });
    }
  });
}

function validateHumanReviewQueue(
  rows: HumanReviewQueueItem[],
  sourceIds: Set<string>,
  claimIds: Set<string>,
  researchGapIds: Set<string>,
  collector: DiagnosticCollector,
): void {
  rows.forEach((item, index) => {
    const path = `humanReviewQueue[${index}]`;
    if (!nonEmpty(item.candidateId) || !nonEmpty(item.question)) {
      collector.error('HUMAN_REVIEW_FIELDS_REQUIRED', 'Human review queue item requires candidateId and question.', {
        path, entityId: item.id, domain: 'schema',
      });
    }
    if (!humanReviewDimensions.has(item.dimension)) {
      collector.error('HUMAN_REVIEW_DIMENSION_INVALID', `Unsupported human review dimension: ${item.dimension}.`, {
        path: `${path}.dimension`, entityId: item.id, domain: 'schema',
      });
    }
    if (!evidenceLevels.has(item.currentEvidenceLevel)) {
      collector.error('HUMAN_REVIEW_CURRENT_LEVEL_INVALID', `Unsupported current evidence level: ${item.currentEvidenceLevel}.`, {
        path: `${path}.currentEvidenceLevel`, entityId: item.id, domain: 'schema',
      });
    }
    if (!evidenceLevels.has(item.requiredEvidenceLevel)) {
      collector.error('HUMAN_REVIEW_REQUIRED_LEVEL_INVALID', `Unsupported required evidence level: ${item.requiredEvidenceLevel}.`, {
        path: `${path}.requiredEvidenceLevel`, entityId: item.id, domain: 'schema',
      });
    }
    if (item.gapId !== undefined && !researchGapIds.has(item.gapId)) {
      collector.error('HUMAN_REVIEW_GAP_BROKEN', `Human review gap reference does not resolve: ${item.gapId}.`, {
        path: `${path}.gapId`, entityId: item.id, domain: 'integrity',
      });
    }
    requireSourceIds(item.sourceIds, sourceIds, collector, `${path}.sourceIds`, item.id, false);
    if (!Array.isArray(item.claimIds)) {
      collector.error('HUMAN_REVIEW_CLAIMS_REQUIRED', 'Human review queue claimIds must be an array.', {
        path: `${path}.claimIds`, entityId: item.id, domain: 'schema',
      });
    } else {
      item.claimIds.forEach((claimId, claimIndex) => {
        if (!claimIds.has(claimId)) {
          collector.error('HUMAN_REVIEW_CLAIM_BROKEN', `Human review claim reference does not resolve: ${String(claimId)}.`, {
            path: `${path}.claimIds[${claimIndex}]`, entityId: item.id, domain: 'integrity',
          });
        }
      });
    }
    if (item.conflict !== null && !nonEmpty(item.conflict)) {
      collector.error('HUMAN_REVIEW_CONFLICT_INVALID', 'Human review conflict must be null or a non-empty explanation.', {
        path: `${path}.conflict`, entityId: item.id, domain: 'schema',
      });
    }
    if (!Array.isArray(item.possibleActions) || item.possibleActions.length === 0) {
      collector.error('HUMAN_REVIEW_ACTIONS_REQUIRED', 'Human review queue item requires at least one possible action.', {
        path: `${path}.possibleActions`, entityId: item.id, domain: 'schema',
      });
    } else {
      item.possibleActions.forEach((action, actionIndex) => {
        if (!humanReviewActions.has(action)) {
          collector.error('HUMAN_REVIEW_ACTION_INVALID', `Unsupported human review action: ${String(action)}.`, {
            path: `${path}.possibleActions[${actionIndex}]`, entityId: item.id, domain: 'schema',
          });
        }
      });
    }
  });
}

interface ProductionSubject {
  subjectType: 'battle' | 'event' | 'unit' | 'formation' | 'location' | 'route' | 'region';
  subjectId: string;
  sourceRefs: unknown;
  metadata: unknown;
}

function productionSubjects(data: BattlePackageData): ProductionSubject[] {
  return [
    { subjectType: 'battle', subjectId: data.battle.id, sourceRefs: data.battle.sourceRefs, metadata: data.battle.metadata },
    ...data.events.map(event => ({ subjectType: 'event' as const, subjectId: event.id, sourceRefs: event.sourceRefs, metadata: event.metadata })),
    ...data.units.map(unit => ({ subjectType: 'unit' as const, subjectId: unit.id, sourceRefs: unit.sourceRefs, metadata: unit.metadata })),
    ...data.formations.map(formation => ({ subjectType: 'formation' as const, subjectId: formation.id, sourceRefs: formation.sourceRefs, metadata: formation.metadata })),
    ...data.locations.map(feature => ({ subjectType: 'location' as const, subjectId: feature.properties.id, sourceRefs: feature.properties.sourceRefs, metadata: feature.properties.metadata })),
    ...data.routes.map(feature => ({ subjectType: 'route' as const, subjectId: feature.properties.id, sourceRefs: feature.properties.sourceRefs, metadata: undefined })),
    ...data.battleAreas.map(feature => ({ subjectType: 'region' as const, subjectId: feature.properties.id, sourceRefs: feature.properties.sourceRefs, metadata: undefined })),
  ];
}

function validateProductionEnabledEntities(
  bundle: HistoricalDataBundle,
  sourceIds: Set<string>,
  collector: DiagnosticCollector,
): void {
  productionSubjects(bundle.packageData).forEach(subject => {
    if (!isRecord(subject.metadata) || subject.metadata.productionEnabled !== true) return;
    const path = `production.${subject.subjectType}.${subject.subjectId}`;
    const sourceRefs = Array.isArray(subject.sourceRefs) ? subject.sourceRefs : [];
    if (sourceRefs.length === 0) {
      collector.error('HISTORICAL_PRODUCTION_SOURCE_REQUIRED', 'A production-enabled historical entity requires direct sourceRefs.', {
        path: `${path}.sourceRefs`, entityId: subject.subjectId, domain: 'historical',
      });
    }
    sourceRefs.forEach((sourceId, index) => {
      if (!nonEmpty(sourceId) || !sourceIds.has(sourceId)) {
        collector.error('HISTORICAL_PRODUCTION_SOURCE_REFERENCE_BROKEN', `Production source reference does not resolve: ${String(sourceId)}.`, {
          path: `${path}.sourceRefs[${index}]`, entityId: subject.subjectId, domain: 'integrity',
        });
      }
    });
    const claims = bundle.claims.filter(claim => claim.subjectNamespace === 'canonical'
      && claim.subjectType === subject.subjectType
      && claim.subjectId === subject.subjectId);
    if (claims.length === 0) {
      collector.error('HISTORICAL_PRODUCTION_CLAIM_REQUIRED', 'A production-enabled historical entity requires a canonical HistoricalClaim.', {
        path, entityId: subject.subjectId, domain: 'historical',
      });
      return;
    }
    const qualifiedClaims = claims.filter(claim => meetsEvidenceGate(claim.evidenceLevel));
    if (qualifiedClaims.length === 0) {
      collector.error('HISTORICAL_PRODUCTION_CLAIM_NOT_QUALIFIED', 'A production-enabled historical entity requires a Supported or Verified HistoricalClaim.', {
        path, entityId: subject.subjectId, domain: 'historical',
      });
      return;
    }
    if (!qualifiedClaims.some(claim => claim.sourceIds.some(sourceId => sourceRefs.includes(sourceId)))) {
      collector.error('HISTORICAL_PRODUCTION_TRACE_DISCONNECTED', 'Production entity, qualifying claim, and sourceRefs must form one traceable chain.', {
        path, entityId: subject.subjectId, domain: 'integrity',
      });
    }
  });
}

function validateParentCycles(data: BattlePackageData, collector: DiagnosticCollector): void {
  const unitCycles = hasCycle(data.units as Array<Unit & { parentUnitId?: string }>, 'parentUnitId');
  unitCycles.forEach(id => collector.error('CIRCULAR_PARENT_UNIT', `Circular parent unit relationship includes ${id}.`, {
    entityId: id, domain: 'integrity',
  }));
  const formationCycles = hasCycle(data.formations as Array<Formation & { parentFormationId?: string }>, 'parentFormationId');
  formationCycles.forEach(id => collector.error('CIRCULAR_PARENT_FORMATION', `Circular parent formation relationship includes ${id}.`, {
    entityId: id, domain: 'integrity',
  }));
}

export class HistoricalDataValidator {
  validate(bundle: HistoricalDataBundle): HistoricalDataValidationReport {
    const collector = new DiagnosticCollector();
    if (!bundle || !bundle.packageData) {
      collector.error('HISTORICAL_PACKAGE_REQUIRED', 'Historical data validation requires the existing battle package.', {
        domain: 'schema',
      });
      return this.report(collector, bundle);
    }
    const sourceIds = validateSourceRegistry(bundle.sourceRegistry, collector);
    const entityIds = packageEntityIds(bundle.packageData);
    const claimIds = registerUnique(bundle.claims, 'claims', collector);
    const researchGapIds = registerUnique(bundle.researchGaps, 'researchGaps', collector);
    const humanReviewQueue = bundle.humanReviewQueue ?? [];
    const humanReviewIds = registerUnique(humanReviewQueue, 'humanReviewQueue', collector);
    bundle.claims.forEach((claim, index) => validateClaim(claim, index, sourceIds, entityIds, collector));
    validateEvidenceMatrix(bundle.evidenceMatrix, sourceIds, claimIds, entityIds, researchGapIds, humanReviewIds, collector);
    validateRouteAudit(bundle.routeAudit, sourceIds, collector);
    validateResearchGaps(bundle.researchGaps, collector);
    validateHumanReviewQueue(humanReviewQueue, sourceIds, claimIds, researchGapIds, collector);
    validateProductionEnabledEntities(bundle, sourceIds, collector);
    validateParentCycles(bundle.packageData, collector);
    return this.report(collector, bundle);
  }

  private report(
    collector: DiagnosticCollector,
    bundle: HistoricalDataBundle | undefined,
  ): HistoricalDataValidationReport {
    const diagnostics = collector.diagnostics;
    return {
      valid: diagnostics.every(diagnostic => diagnostic.severity !== 'ERROR'),
      errors: diagnostics.filter(diagnostic => diagnostic.severity === 'ERROR').length,
      warnings: diagnostics.filter(diagnostic => diagnostic.severity === 'WARNING').length,
      info: diagnostics.filter(diagnostic => diagnostic.severity === 'INFO').length,
      diagnostics,
      counts: {
        sources: bundle?.sourceRegistry?.length ?? 0,
        claims: bundle?.claims?.length ?? 0,
        evidenceRows: bundle?.evidenceMatrix?.length ?? 0,
        routeAuditRows: bundle?.routeAudit?.length ?? 0,
        researchGaps: bundle?.researchGaps?.length ?? 0,
        humanReviewQueue: bundle?.humanReviewQueue?.length ?? 0,
      },
    };
  }
}

export function validateHistoricalData(bundle: HistoricalDataBundle): HistoricalDataValidationReport {
  return new HistoricalDataValidator().validate(bundle);
}
