import type {
  Confidence,
  EntityBase,
  EntityId,
  LocalizedText,
  Period,
  SchemaVersion,
  VerificationStatus,
} from './shared.js';
import type { HistoricalTime } from './time.js';
import type {
  CoordinateProvenance,
  GeoJsonFeature,
  GeoJsonGeometry,
  GeometryAssertion,
  GeometryProvenance,
  ImageryGeoreferencingMetadata,
  LineStringGeometry,
  MultiLineStringGeometry,
  PolygonGeometry,
  MultiPolygonGeometry,
  Position,
} from './geospatial.js';

export interface Battle extends EntityBase {
  slug: string;
  title: LocalizedText;
  startTime: HistoricalTime;
  endTime: HistoricalTime;
  timezone: string;
  geographicExtent: GeoJsonGeometry | null;
  defaultPerspectiveRef?: EntityId;
  phaseRefs: EntityId[];
  factionRefs: EntityId[];
}

export interface BattlePhase extends EntityBase {
  battleId: EntityId;
  name: LocalizedText;
  sequence: number;
  startTime: HistoricalTime;
  endTime: HistoricalTime;
  description?: LocalizedText;
  participatingUnitRefs: EntityId[];
  eventRefs: EntityId[];
}

export interface Faction extends EntityBase {
  name: LocalizedText;
  shortName?: LocalizedText;
  historicalName?: LocalizedText;
  period?: Period;
  aliases: LocalizedText[];
  visualToken?: string;
}

export type FormationLevel =
  | 'army'
  | 'army-group'
  | 'corps'
  | 'division'
  | 'brigade'
  | 'regiment'
  | 'battalion'
  | 'company'
  | 'platoon'
  | 'squad'
  | 'ad-hoc'
  | 'unknown';

export interface Formation extends EntityBase {
  factionId: EntityId;
  parentFormationId?: EntityId;
  name: LocalizedText;
  historicalName?: LocalizedText;
  aliases: LocalizedText[];
  level: FormationLevel;
  commanderRefs: EntityId[];
  childFormationRefs: EntityId[];
  unitRefs: EntityId[];
}

export interface StrengthAssertion {
  value?: number;
  minimum?: number;
  maximum?: number;
  precision: 'exact' | 'range' | 'approximate' | 'unknown';
  asOf?: HistoricalTime;
  sourceRefs: EntityId[];
  confidence: Confidence;
}

export type UnitStatus =
  | 'ready'
  | 'moving'
  | 'engaged'
  | 'disrupted'
  | 'withdrawn'
  | 'destroyed'
  | 'captured'
  | 'unknown';

export interface Unit extends EntityBase {
  factionId: EntityId;
  parentUnitId?: EntityId;
  formationId?: EntityId;
  name: LocalizedText;
  historicalName?: LocalizedText;
  aliases: LocalizedText[];
  unitType: string;
  formationLevel: FormationLevel;
  commanderRefs: EntityId[];
  strength?: StrengthAssertion;
  status: UnitStatus;
}

export interface Commander extends EntityBase {
  personRef?: EntityId;
  name?: LocalizedText;
  formationRefs: EntityId[];
  unitRefs: EntityId[];
  validTime?: HistoricalTime;
}

export type LocationType =
  | 'landing-zone'
  | 'coast'
  | 'beachhead'
  | 'road'
  | 'settlement'
  | 'defensive-position'
  | 'battle-area'
  | 'command-post'
  | 'high-ground'
  | 'coastline'
  | 'military-site'
  | 'unknown';

export interface LocationProperties {
  id: EntityId;
  schemaVersion: SchemaVersion;
  historicalName: LocalizedText;
  modernName?: LocalizedText | null;
  aliases: LocalizedText[];
  localName?: LocalizedText;
  militaryName?: LocalizedText;
  sourceNames: LocalizedText[];
  searchTerms: string[];
  locationType: LocationType;
  coordinateSystem: 'EPSG:4326';
  coordinateProvenance: CoordinateProvenance;
  verificationStatus: VerificationStatus;
  historicalPeriod?: Period;
  sourceRefs: EntityId[];
  confidence: Confidence;
  historicalGeometry?: GeometryAssertion;
  modernReferenceGeometry?: GeometryAssertion;
  notes?: LocalizedText;
  legacyRefs?: EntityId[];
  metadata?: Record<string, unknown>;
}

export type LocationFeature = GeoJsonFeature<GeoJsonGeometry | null, LocationProperties>;

export type RouteNature =
  | 'recorded'
  | 'reconstructed'
  | 'estimated'
  | 'possible'
  | 'unknown';

export type RouteType =
  | 'planned'
  | 'actual'
  | 'landing'
  | 'advance'
  | 'retreat'
  | 'supply'
  | 'observation'
  | 'unknown';

export type RouteTemporalMode =
  | 'spatial-only'
  | 'temporal'
  | 'partial-temporal'
  | 'partially-reconstructed';

export interface RoutePoint {
  id: EntityId;
  routeId: EntityId;
  sequence: number;
  coordinate: Position;
  historicalTime?: HistoricalTime;
  locationRef?: EntityId;
  eventRef?: EntityId;
  sourceRefs: EntityId[];
  verificationStatus: VerificationStatus;
  confidence: Confidence;
  notes?: string;
}

export interface RouteUncertaintySegment {
  fromSequence: number;
  toSequence: number;
  status: 'unknown' | 'estimated' | 'reconstructed' | 'disputed';
  sourceRefs: EntityId[];
  confidence: Confidence;
  notes?: string;
}

export interface RouteProperties {
  id: EntityId;
  schemaVersion: SchemaVersion;
  battleId: EntityId;
  unitId?: EntityId;
  phaseId?: EntityId;
  routeType: RouteType;
  nature: RouteNature;
  temporalMode: RouteTemporalMode;
  routePoints: RoutePoint[];
  uncertaintySegments: RouteUncertaintySegment[];
  startTime?: HistoricalTime;
  endTime?: HistoricalTime;
  sourceRefs: EntityId[];
  confidence: Confidence;
  verificationStatus: VerificationStatus;
  geometryProvenance: GeometryProvenance;
  status: 'draft' | 'review' | 'approved' | 'rejected' | 'unresolved';
  notes?: LocalizedText;
}

export type RouteFeature = GeoJsonFeature<
  LineStringGeometry | MultiLineStringGeometry | null,
  RouteProperties
>;

export type EventType =
  | 'landing'
  | 'movement'
  | 'contact'
  | 'engagement'
  | 'attack'
  | 'defense'
  | 'withdrawal'
  | 'capture'
  | 'loss'
  | 'command'
  | 'communication'
  | 'logistics'
  | 'observation'
  | 'unknown'
  | (string & {});

export interface BattleEvent extends EntityBase {
  battleId: EntityId;
  phaseId?: EntityId;
  eventType: EventType;
  title: LocalizedText;
  historicalTime: HistoricalTime;
  locationRefs: EntityId[];
  participatingUnitRefs: EntityId[];
  routeRefs: EntityId[];
  summary?: LocalizedText;
  perspectiveRefs: EntityId[];
  evidenceRefs: EntityId[];
  uncertaintyRefs: EntityId[];
  mediaRefs: EntityId[];
  tags: string[];
}

export type PerspectiveKind =
  | 'roc'
  | 'pla'
  | 'neutral-editorial'
  | 'disputed'
  | 'unknown'
  | 'research-note'
  | 'local-oral-account';

export interface PerspectiveAccount {
  id: EntityId;
  perspectiveRef: EntityId;
  text: LocalizedText;
  evidenceRefs: EntityId[];
  sourceRefs: EntityId[];
  confidence: Confidence;
  notes?: LocalizedText;
}

export interface Perspective extends EntityBase {
  kind: PerspectiveKind;
  label: LocalizedText;
  accounts: PerspectiveAccount[];
}

export interface Evidence extends EntityBase {
  sourceId: EntityId;
  evidenceType: string;
  citation?: string;
  page?: string;
  excerptReference?: string;
  claim: LocalizedText;
  relatedEntityRefs: EntityId[];
  perspectiveRef?: EntityId;
  reliability: Confidence;
}

export interface Source extends EntityBase {
  title: LocalizedText;
  author?: LocalizedText;
  publisher?: LocalizedText;
  date?: string;
  sourceType: string;
  language?: string;
  url?: string;
  archiveId?: string;
  citation?: string;
  rights?: string;
}

export interface Uncertainty extends EntityBase {
  status: Confidence;
  dimensions: Array<
    | 'time'
    | 'location'
    | 'route'
    | 'identity'
    | 'strength'
    | 'casualty'
    | 'interpretation'
    | 'geometry'
  >;
  explanation: LocalizedText;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface MediaReference extends EntityBase {
  mediaType: 'image' | 'audio' | 'video' | 'map' | 'document' | 'model' | 'other';
  title: LocalizedText;
  uri: string;
  rights?: string;
  credit?: string;
  capturedAt?: string;
  georeferencing?: ImageryGeoreferencingMetadata;
}

export interface CameraCue extends EntityBase {
  triggerTime?: HistoricalTime;
  eventRef?: EntityId;
  locationRef?: EntityId;
  routeRef?: EntityId;
  unitRef?: EntityId;
  mode:
    | 'overview'
    | 'landing'
    | 'route-overview'
    | 'event-focus'
    | 'location-focus'
    | 'follow-unit'
    | 'manual';
  behavior: 'auto' | 'guided' | 'manual';
  label?: LocalizedText;
}

export type BattleAreaFeature = GeoJsonFeature<
  PolygonGeometry | MultiPolygonGeometry | null,
  {
    id: EntityId;
    schemaVersion: SchemaVersion;
    battleId: EntityId;
    name: LocalizedText;
    sourceRefs: EntityId[];
    confidence: Confidence;
    verificationStatus: VerificationStatus;
    geometryProvenance?: GeometryProvenance;
  }
>;

export interface BattlePackageData {
  battle: Battle;
  phases: BattlePhase[];
  factions: Faction[];
  formations: Formation[];
  units: Unit[];
  commanders: Commander[];
  locations: LocationFeature[];
  routes: RouteFeature[];
  battleAreas: BattleAreaFeature[];
  events: BattleEvent[];
  evidence: Evidence[];
  sources: Source[];
  perspectives: Perspective[];
  uncertainties: Uncertainty[];
  media: MediaReference[];
  cameraCues: CameraCue[];
}

export interface TopologicalConnection {
  fromLocationRef: EntityId;
  toLocationRef: EntityId;
  label?: string;
  distanceMeters?: number;
  source: 'legacy-route-database';
}
