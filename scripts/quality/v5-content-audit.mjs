import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const timeline = readJson('data/timeline.json').records;
const poiDocument = readJson('data/poi.json');
const pois = poiDocument.pois;
const timelineSource = fs.readFileSync(path.join(root, 'src/i18n/timelineEnglish.ts'), 'utf8');
const timelineMatches = [...timelineSource.matchAll(/'(?<id>TIM-\d{4})': \{ title: '(?<title>[^']+)', description: '(?<description>[^']+)' \}/g)];
const timelineEnglish = new Map(timelineMatches.map((match) => [match.groups.id, match.groups]));
const cjk = /[\u3400-\u9fff]/u;
const allMediaRefs = [...fs.readFileSync(path.join(root, 'src/data/mediaCatalog.ts'), 'utf8').matchAll(/src: '([^']+)'/g)].map((match) => match[1]);
const mediaSource = fs.readFileSync(path.join(root, 'src/data/mediaCatalog.ts'), 'utf8');
const localMediaRefs = allMediaRefs.filter((src) => src.startsWith('.local/'));
const publicMediaRefs = allMediaRefs.filter((src) => !src.startsWith('.local/'));
const missingMedia = publicMediaRefs.filter((src) => !fs.existsSync(path.join(root, 'public', src)));
const publicImageFiles = [];
const walk = (directory) => {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (/\.(?:jpg|jpeg|png|webp|svg)$/i.test(entry.name)) publicImageFiles.push(absolute);
  }
};
walk(path.join(root, 'public', 'media'));
for (const file of ['public/aerial-1944.png', 'public/aerial-1944a.png']) if (fs.existsSync(path.join(root, file))) publicImageFiles.push(path.join(root, file));
const portraitPersonIds = [...mediaSource.matchAll(/kind: 'portrait',[\s\S]*?personIds: \[(.*?)\]/g)]
  .flatMap((match) => [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]));

const canonicalTimelineIds = new Set(timeline.map((entry) => entry.timeline_id));
const missingTimelineTranslations = [...canonicalTimelineIds].filter((id) => !timelineEnglish.has(id));
const untranslatedTimelineFields = [...timelineEnglish.values()]
  .filter((entry) => cjk.test(entry.title) || cjk.test(entry.description))
  .map((entry) => entry.id);
const coordinateStatusCounts = Object.fromEntries(
  [...new Set(pois.map((poi) => poi.coordinate_status ?? 'unclassified'))]
    .map((status) => [status, pois.filter((poi) => (poi.coordinate_status ?? 'unclassified') === status).length]),
);
const coordinateSourceCount = pois.filter((poi) => Boolean(poi.coordinate_source)).length;
const publicVerifiedModernCount = pois.filter((poi) => poi.coordinate_status === 'modern_verified').length;
const representativeCount = pois.filter((poi) => poi.coordinate_status === 'representative').length;
const userSpecifiedCount = pois.filter((poi) => poi.coordinate_status === 'user_specified').length;
const unresolvedCount = pois.filter((poi) => ['unresolved', 'historical_review'].includes(poi.coordinate_status)).length;

const metrics = {
  generatedAt: new Date().toISOString(),
  canonicalCounts: {
    timelineEntries: timeline.length,
    pois: pois.length,
  },
  translation: {
    englishTimeline: {
      covered: [...canonicalTimelineIds].filter((id) => timelineEnglish.has(id)).length,
      total: canonicalTimelineIds.size,
      missing: missingTimelineTranslations,
      cjkInEnglishCopy: untranslatedTimelineFields,
    },
  },
  coordinates: {
    allPoiClassified: pois.every((poi) => Boolean(poi.location_class && poi.coordinate_status)),
    statusCounts: coordinateStatusCounts,
    sourceCount: coordinateSourceCount,
    modernVerifiedCount: publicVerifiedModernCount,
    representativeCount,
    userSpecifiedCount,
    unresolvedOrHistoricalReviewCount: unresolvedCount,
    modernVerifiedIds: pois.filter((poi) => poi.coordinate_status === 'modern_verified').map((poi) => poi.poi_id),
  },
  media: {
    catalogPublicReferences: publicMediaRefs.length,
    missingPublicAssets: missingMedia,
    researchLocalReferencesExcluded: localMediaRefs.length,
    publicCollectionsExcludeLocal: true,
    publicImageFiles: publicImageFiles.length,
    peopleWithPublishedPortraits: [...new Set(portraitPersonIds)].length,
    peopleWithoutPublishedPortraits: Math.max(0, (readJson('data/persons.json').persons?.length ?? 0) - [...new Set(portraitPersonIds)].length),
  },
  status: {
    pass: missingTimelineTranslations.length === 0
      && untranslatedTimelineFields.length === 0
      && pois.length === 38
      && pois.every((poi) => Boolean(poi.location_class && poi.coordinate_status))
      && missingMedia.length === 0
      && localMediaRefs.length > 0,
  },
};

fs.mkdirSync(path.join(root, 'docs/quality'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/quality/V5_AUDIT_METRICS.json'), JSON.stringify(metrics, null, 2) + '\n');
console.log(JSON.stringify(metrics, null, 2));
if (!metrics.status.pass) process.exitCode = 1;
