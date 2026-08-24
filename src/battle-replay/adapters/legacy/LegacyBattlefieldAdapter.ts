import {
  CANONICAL_CRS,
  CURRENT_SCHEMA_VERSION,
  type BattleEvent,
  type Confidence,
  type Faction,
  type FormationLevel,
  type HistoricalTime,
  type LocationFeature,
  type Position,
  type Source,
  type TopologicalConnection,
  type Unit,
} from '../../types/index.js';
import type {
  LegacyAdaptationResult,
  LegacyAdapterIssue,
  LegacyDataInput,
} from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown, preferredKeys: string[]): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [];
  for (const key of preferredKeys) {
    if (Array.isArray(value[key])) return value[key] as unknown[];
  }
  return [];
}

function strings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(item => typeof item === 'string') as string[];
  if (typeof value !== 'string' || !value.trim()) return [];
  return value.split(/[;,；]/).map(item => item.trim()).filter(Boolean);
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function confidence(value: unknown): Confidence {
  switch (String(value).toLowerCase()) {
    case 'verified':
    case 'confirmed':
      return 'confirmed';
    case 'probable':
      return 'probable';
    case 'estimated':
      return 'estimated';
    case 'conflicting_sources':
    case 'disputed':
      return 'disputed';
    default:
      return 'unknown';
  }
}

function unknownTime(notes?: string): HistoricalTime {
  return {
    kind: 'unknown',
    precision: 'unknown',
    timezone: 'Asia/Taipei',
    sourceRefs: [],
    confidence: 'unknown',
    notes,
  };
}

function adaptTime(record: Record<string, unknown>, sourceRefs: string[]): HistoricalTime {
  const raw = text(record.time_start) ?? text(record.time) ?? text(record.date);
  if (!raw) return { ...unknownTime('Legacy record has no machine-usable historical time.'), sourceRefs };
  const isoCandidate = raw.includes('T')
    ? raw
    : raw.includes(' ')
      ? `${raw.replace(' ', 'T')}:00+08:00`
      : `${raw}T00:00:00+08:00`;
  if (Number.isNaN(Date.parse(isoCandidate)) || raw.includes('~')) {
    return { ...unknownTime(`Legacy time preserved without false precision: ${raw}`), sourceRefs };
  }
  const legacyPrecision = text(record.time_precision);
  const precision = legacyPrecision === 'minute'
    ? 'minute'
    : legacyPrecision === 'hour'
      ? 'hour'
      : 'unknown';
  if (precision === 'unknown') {
    return { ...unknownTime(`Legacy value requires temporal review: ${raw}`), sourceRefs };
  }
  return {
    kind: confidence(record.confidence) === 'estimated' ? 'approximate' : 'exact',
    value: isoCandidate,
    precision,
    timezone: 'Asia/Taipei',
    sourceRefs,
    confidence: confidence(record.confidence),
  };
}

function sourceType(raw: unknown): string {
  const value = String(raw ?? '').toLowerCase();
  if (value.includes('網站')) return 'website';
  if (value.includes('檔案')) return 'archive';
  if (value.includes('口述')) return 'oral-history';
  if (value.includes('地圖')) return 'map';
  if (value.includes('論文')) return 'academic-paper';
  if (value.includes('照片')) return 'photo';
  if (value.includes('官方') || value.includes('政府')) return 'official-record';
  if (value.includes('書') || value.includes('專著')) return 'book';
  return 'unknown';
}

export function adaptLegacySources(input: unknown): Source[] {
  return asArray(input, ['sources']).flatMap(item => {
    if (!isRecord(item) || !text(item.source_id) || !text(item.title)) return [];
    const id = text(item.source_id)!;
    return [{
      id,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      title: { 'zh-Hant': text(item.title)! },
      author: text(item.author_or_institution) ? { 'zh-Hant': text(item.author_or_institution)! } : undefined,
      date: text(item.publication_date),
      sourceType: sourceType(item.source_type),
      url: text(item.url_or_identifier)?.startsWith('http') ? text(item.url_or_identifier) : undefined,
      archiveId: text(item.url_or_identifier)?.startsWith('http') ? undefined : text(item.url_or_identifier),
      citation: text(item.relevant_pages_or_sections),
      rights: text(item.usage_rights),
      sourceRefs: [],
      confidence: confidence(item.verification_status),
      notes: text(item.notes) ? { 'zh-Hant': text(item.notes)! } : undefined,
      metadata: {
        legacySourceLevel: item.source_level,
        accessDate: item.access_date,
        relevanceSummary: item.relevance_summary,
        legacyVerificationStatus: item.verification_status,
      },
    } satisfies Source];
  });
}

function locationType(category: unknown): LocationFeature['properties']['locationType'] {
  const value = String(category ?? '').toLowerCase();
  if (value.includes('landing')) return 'landing-zone';
  if (value.includes('coast') || value.includes('beach')) return 'coast';
  if (value.includes('road')) return 'road';
  if (value.includes('village') || value.includes('settlement')) return 'settlement';
  if (value.includes('camp') || value.includes('military')) return 'military-site';
  if (value.includes('hill') || value.includes('high')) return 'high-ground';
  return 'unknown';
}

function coordinatePrecision(raw: unknown): LocationFeature['properties']['coordinateProvenance']['coordinatePrecision'] {
  switch (String(raw ?? '').toLowerCase()) {
    case 'exact': return 'high';
    case 'approximate': return 'approximate';
    case 'estimated': return 'approximate';
    default: return 'unknown';
  }
}

export function adaptLegacyLocations(input: unknown, issues: LegacyAdapterIssue[] = []): LocationFeature[] {
  return asArray(input, ['pois']).flatMap(item => {
    if (!isRecord(item) || !text(item.poi_id) || !text(item.name_chinese)) return [];
    const id = text(item.poi_id)!;
    const longitude = typeof item.longitude === 'number' ? item.longitude : undefined;
    const latitude = typeof item.latitude === 'number' ? item.latitude : undefined;
    const coordinate = longitude !== undefined && latitude !== undefined
      ? [longitude, latitude] as Position
      : undefined;
    issues.push({
      severity: 'WARNING',
      code: 'LEGACY_COORDINATE_REQUIRES_MANUAL_REVIEW',
      legacyId: id,
      message: 'Legacy coordinate was retained as a candidate, not promoted to historically verified geometry.',
    });
    return [{
      type: 'Feature',
      id,
      geometry: coordinate ? { type: 'Point', coordinates: coordinate } : null,
      properties: {
        id,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        historicalName: {
          'zh-Hant': text(item.name_chinese)!,
          ...(text(item.name_english) ? { en: text(item.name_english)! } : {}),
        },
        modernName: null,
        aliases: [],
        sourceNames: [],
        searchTerms: [text(item.name_chinese)!, text(item.name_english)].filter(Boolean) as string[],
        locationType: locationType(item.category),
        coordinateSystem: CANONICAL_CRS,
        coordinateProvenance: {
          coordinateSystem: CANONICAL_CRS,
          coordinate,
          coordinateMethod: 'unknown',
          coordinatePrecision: coordinatePrecision(item.coordinate_accuracy),
          verificationStatus: coordinate ? 'pending-manual-verification' : 'unknown',
          sourceRefs: strings(item.related_sources),
          confidence: confidence(item.confidence),
          originalCandidate: coordinate ? {
            coordinate,
            source: 'legacy:data/poi.json',
            method: 'unknown',
          } : undefined,
          candidateSource: 'legacy:data/poi.json',
          notes: `Legacy coordinate_accuracy=${String(item.coordinate_accuracy ?? 'unknown')}; docs/COORDINATE_REVIEW.md remains authoritative for review status.`,
        },
        verificationStatus: coordinate ? 'pending-manual-verification' : 'unknown',
        sourceRefs: strings(item.related_sources),
        confidence: confidence(item.confidence),
        notes: text(item.description) ? { 'zh-Hant': text(item.description)! } : undefined,
        legacyRefs: [id],
        metadata: {
          legacyCoordinateAccuracy: item.coordinate_accuracy,
          legacyVerificationStatus: item.verification_status,
          evidenceLevel: item.evidence_level,
        },
      },
    } satisfies LocationFeature];
  });
}

function factionId(side: unknown): string {
  const normalized = String(side ?? '').toLowerCase();
  if (normalized.includes('nationalist') || normalized.includes('roc')) return 'FAC-ROC';
  if (normalized.includes('communist') || normalized.includes('pla')) return 'FAC-PLA';
  return 'FAC-UNKNOWN';
}

function levelFromName(name: string): FormationLevel {
  if (name.includes('兵團') || name.includes('軍團')) return 'army-group';
  if (name.includes('軍')) return 'corps';
  if (name.includes('師')) return 'division';
  if (name.includes('旅')) return 'brigade';
  if (name.includes('團')) return 'regiment';
  if (name.includes('營')) return 'battalion';
  if (name.includes('連')) return 'company';
  if (name.includes('排')) return 'platoon';
  return 'unknown';
}

export function adaptLegacyUnits(input: unknown, issues: LegacyAdapterIssue[] = []): { factions: Faction[]; units: Unit[] } {
  const units = asArray(input, ['units']).flatMap(item => {
    if (!isRecord(item) || !text(item.unit_id) || !(text(item.unit_name_normalized) ?? text(item.unit_name_original))) return [];
    const id = text(item.unit_id)!;
    const name = text(item.unit_name_normalized) ?? text(item.unit_name_original)!;
    if (strings(item.related_sources).length === 0) {
      issues.push({ severity: 'WARNING', code: 'LEGACY_UNIT_UNSOURCED', legacyId: id, message: 'Legacy unit identity has no source reference and remains confidence unknown.' });
    }
    return [{
      id,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      factionId: factionId(item.side),
      name: { 'zh-Hant': name },
      historicalName: text(item.unit_name_original) ? { 'zh-Hant': text(item.unit_name_original)! } : undefined,
      aliases: [],
      unitType: text(item.unit_type) ?? 'unknown',
      formationLevel: levelFromName(name),
      commanderRefs: [],
      status: 'unknown',
      sourceRefs: strings(item.related_sources),
      confidence: strings(item.related_sources).length > 0 ? 'probable' : 'unknown',
      metadata: {
        legacyParentUnitName: item.parent_unit,
        legacyRelatedPersons: item.related_persons,
        legacyRelatedEvents: item.related_events,
      },
    } satisfies Unit];
  });
  const usedFactionIds = new Set(units.map(unit => unit.factionId));
  const factionDefinitions: Record<string, Faction> = {
    'FAC-ROC': {
      id: 'FAC-ROC', schemaVersion: CURRENT_SCHEMA_VERSION,
      name: { 'zh-Hant': '中華民國國軍' }, shortName: { 'zh-Hant': '國軍' }, aliases: [],
      sourceRefs: [], confidence: 'unknown',
      metadata: { generatedFromLegacySideVocabulary: true },
    },
    'FAC-PLA': {
      id: 'FAC-PLA', schemaVersion: CURRENT_SCHEMA_VERSION,
      name: { 'zh-Hant': '中國人民解放軍' }, shortName: { 'zh-Hant': '解放軍' }, aliases: [],
      sourceRefs: [], confidence: 'unknown',
      metadata: { generatedFromLegacySideVocabulary: true },
    },
    'FAC-UNKNOWN': {
      id: 'FAC-UNKNOWN', schemaVersion: CURRENT_SCHEMA_VERSION,
      name: { en: 'Unknown faction' }, aliases: [], sourceRefs: [], confidence: 'unknown',
      metadata: { generatedFromLegacySideVocabulary: true },
    },
  };
  return { factions: [...usedFactionIds].map(id => factionDefinitions[id]), units };
}

export function adaptLegacyEvents(input: unknown, battleId: string, issues: LegacyAdapterIssue[] = []): BattleEvent[] {
  return asArray(input, ['events', 'records']).flatMap(item => {
    if (!isRecord(item) || !(text(item.event_id) ?? text(item.timeline_id)) || !text(item.title)) return [];
    const id = text(item.event_id) ?? text(item.timeline_id)!;
    const sourceRefs = strings(item.source_ids);
    if (text(item.roc_units) || text(item.pla_units) || text(item.location)) {
      issues.push({
        severity: 'WARNING',
        code: 'LEGACY_EVENT_FREE_TEXT_REFERENCES_UNRESOLVED',
        legacyId: id,
        message: 'Free-text unit/location names were preserved in metadata and were not guessed into stable ID references.',
      });
    }
    return [{
      id,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      battleId,
      eventType: text(item.event_type) ?? 'unknown',
      title: { 'zh-Hant': text(item.title)! },
      historicalTime: adaptTime(item, sourceRefs),
      locationRefs: [],
      participatingUnitRefs: [],
      routeRefs: [],
      summary: text(item.description) ? { 'zh-Hant': text(item.description)! } : undefined,
      perspectiveRefs: [],
      evidenceRefs: [],
      uncertaintyRefs: [],
      mediaRefs: [],
      tags: [],
      sourceRefs,
      confidence: confidence(item.confidence),
      notes: text(item.notes) ? { 'zh-Hant': text(item.notes)! } : undefined,
      metadata: {
        legacyLocationText: item.location,
        legacyRocUnits: item.roc_units,
        legacyPlaUnits: item.pla_units,
        legacyParticipants: item.participants,
        legacyVerificationStatus: item.verification_status,
      },
    } satisfies BattleEvent];
  });
}

export function adaptLegacyTopologicalConnections(input: unknown): TopologicalConnection[] {
  if (!isRecord(input) || !isRecord(input.routes)) return [];
  const connections: TopologicalConnection[] = [];
  for (const records of Object.values(input.routes)) {
    for (const item of asArray(records, [])) {
      if (!isRecord(item) || !text(item.from_poi) || !text(item.to_poi)) continue;
      connections.push({
        fromLocationRef: text(item.from_poi)!,
        toLocationRef: text(item.to_poi)!,
        label: text(item.route_name),
        distanceMeters: typeof item.distance_meters === 'number' ? item.distance_meters : undefined,
        source: 'legacy-route-database',
      });
    }
  }
  return connections;
}

export function adaptLegacyBattlefieldData(input: LegacyDataInput, battleId = 'BAT-GUN-1949'): LegacyAdaptationResult {
  const issues: LegacyAdapterIssue[] = [];
  const sources = adaptLegacySources(input.sources);
  const locations = adaptLegacyLocations(input.poi, issues);
  const { factions, units } = adaptLegacyUnits(input.units, issues);
  const events = adaptLegacyEvents(input.events, battleId, issues);
  const topologicalConnections = adaptLegacyTopologicalConnections(input.routes);
  const sourceIds = new Set(sources.map(source => source.id));
  const locationIds = new Set(locations.map(location => location.properties.id));
  const unresolvedReferences = new Set<string>();
  for (const entity of [...locations.map(item => item.properties), ...units, ...events]) {
    for (const sourceRef of entity.sourceRefs) {
      if (!sourceIds.has(sourceRef)) unresolvedReferences.add(sourceRef);
    }
  }
  for (const connection of topologicalConnections) {
    if (!locationIds.has(connection.fromLocationRef)) unresolvedReferences.add(connection.fromLocationRef);
    if (!locationIds.has(connection.toLocationRef)) unresolvedReferences.add(connection.toLocationRef);
  }
  issues.push({
    severity: 'INFO',
    code: 'LEGACY_ROUTES_RETAINED_AS_TOPOLOGY',
    message: `${topologicalConnections.length} legacy connections were retained as topology; zero were promoted to historical Route geometry.`,
  });
  return {
    sources,
    locations,
    factions,
    units,
    events,
    topologicalConnections,
    routes: [],
    issues,
    unresolvedReferences: [...unresolvedReferences].sort(),
  };
}
