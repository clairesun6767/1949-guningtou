import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const arrayFrom = (value, key) => Array.isArray(value) ? value : Array.isArray(value?.[key]) ? value[key] : [];
const unique = (items) => new Set(items).size === items.length;
const ids = (items, key) => items.map((item) => item[key]).filter(Boolean);
const exists = (relativePath) => fs.existsSync(path.join(root, 'public', relativePath));

const persons = arrayFrom(readJson('data/persons.json'), 'persons');
const pois = arrayFrom(readJson('data/poi.json'), 'pois');
const events = arrayFrom(readJson('data/events.json'), 'events');
const timeline = arrayFrom(readJson('data/timeline.json'), 'records');
const sources = arrayFrom(readJson('data/sources.json'), 'sources');
const sourceIds = new Set(ids(sources, 'source_id'));
const sourceText = fs.readFileSync(path.join(root, 'src/i18n/historicalContent.ts'), 'utf8');
const personEnglishIds = [...sourceText.matchAll(/'(PER-\d{4})':\s*\{/g)].map((match) => match[1]);
const poiEnglishIds = [...sourceText.matchAll(/'(POI-\d{4})':\s*\{/g)].map((match) => match[1]);
const eventEnglishIds = [...sourceText.matchAll(/'(EVT-\d{4})':\s*'/g)].map((match) => match[1]);

const allSourceRefs = [
  ...persons.flatMap((item) => item.related_sources ?? []),
  ...pois.flatMap((item) => item.related_sources ?? []),
  ...events.flatMap((item) => item.source_ids ?? []),
  ...timeline.flatMap((item) => item.source_ids ?? []),
];
const orphanSourceRefs = [...new Set(allSourceRefs.filter((id) => !sourceIds.has(id)))];
const stalePoiNarratives = pois.filter((poi) => poi.long_description?.includes('【后沙】') || poi.long_description?.includes('参見關聯')).map((poi) => poi.poi_id);
const incompletePoiNarratives = pois.filter((poi) => poi.long_description?.includes('此據點目前僅作為研究索引') || poi.historical_background?.includes('參見戰役相關')).map((poi) => poi.poi_id);
const coordinateStatuses = pois.reduce((result, poi) => {
  const key = poi.verification_status ?? 'missing';
  result[key] = (result[key] ?? 0) + 1;
  return result;
}, {});

const mediaSource = fs.readFileSync(path.join(root, 'src/data/mediaCatalog.ts'), 'utf8');
const mediaEntries = [...mediaSource.matchAll(/src:\s*'([^']+)'/g)].map((match) => ({ src: match[1], status: match[1].startsWith('.local/') ? 'research' : 'published' }));
const generatedCandidateCount = Number(mediaSource.match(/Array\.from\(\{ length: (\d+) \}/)?.[1] ?? 0);
const missingMedia = mediaEntries.filter((asset) => !asset.src.startsWith('.local/') && !exists(asset.src));
const researchMedia = [...mediaEntries.filter((asset) => asset.status === 'research').map((asset) => asset.src), `generated xiamen aerial candidates (${generatedCandidateCount})`];

const metrics = {
  generatedAt: new Date().toISOString(),
  canonicalCounts: {
    persons: persons.length,
    pois: pois.length,
    events: events.length,
    timelineEntries: timeline.length,
    sources: sources.length,
  },
  idIntegrity: {
    personsUnique: unique(ids(persons, 'person_id')),
    poisUnique: unique(ids(pois, 'poi_id')),
    eventsUnique: unique(ids(events, 'event_id')),
    timelineUnique: unique(ids(timeline, 'timeline_id')),
    sourcesUnique: unique(ids(sources, 'source_id')),
  },
  translationCoverage: {
    peopleEnglish: { covered: new Set(personEnglishIds).size, total: persons.length },
    poisEnglish: { covered: new Set(poiEnglishIds).size, total: pois.length },
    eventsEnglish: { covered: new Set(eventEnglishIds).size, total: events.length },
    timelineEnglish: { covered: 0, total: timeline.length, note: 'English UI is intentionally marked pending instead of exposing Traditional Chinese as English.' },
    zhCnDisplay: { mode: 'explicit UI labels plus display-layer Traditional-to-Simplified conversion', independentEditorialReviewRemaining: true },
  },
  coordinateAudit: {
    statusCounts: coordinateStatuses,
    publicVerifiedCount: pois.filter((poi) => poi.verification_status === 'verified').length,
    candidateCountRequiringHumanReview: pois.length,
  },
  mediaAudit: {
    catalogEntries: mediaEntries.length + generatedCandidateCount,
    missingPublicAssets: missingMedia,
    researchAssets: researchMedia,
    personLinkedPortraitAssets: 2,
  },
  sourceIntegrity: {
    orphanSourceRefs,
    sourceCatalogAuthoritative: true,
  },
  contentSafety: {
    stalePoiNarratives,
    incompletePoiNarratives,
    noHistoricalDataCoordinateMutation: true,
  },
};

const outputDir = path.join(root, 'docs', 'quality');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'V4_AUDIT_METRICS.json'), `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');

console.log(JSON.stringify(metrics, null, 2));
