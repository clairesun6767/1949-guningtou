import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

const inventory = readJson('data/then-now/site-inventory.json');
const sourceDocument = readJson('data/sources.json');
const poiDocument = readJson('data/poi.json');
const mediaCatalogSource = fs.readFileSync(path.join(root, 'src/data/mediaCatalog.ts'), 'utf8');

const sources = sourceDocument.sources ?? [];
const pois = poiDocument.pois ?? [];
const sourceIds = new Set(sources.map((source) => source.source_id));
const poiIds = new Set(pois.map((poi) => poi.poi_id));
const mediaIds = new Set([...mediaCatalogSource.matchAll(/\bid:\s*'([^']+)'/g)].map((match) => match[1]));
const errors = [];

const error = (message) => errors.push(message);
const assertArray = (value, label) => {
  if (!Array.isArray(value)) error(`${label} must be an array`);
};

if (inventory.schemaVersion !== '3.0.0') error(`unexpected schemaVersion: ${inventory.schemaVersion}`);
assertArray(inventory.sites, 'sites');
assertArray(inventory.evidenceStatuses, 'evidenceStatuses');
assertArray(inventory.priorityTiers, 'priorityTiers');

const unique = (values, label) => {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length > 0) error(`${label} contains duplicate values: ${[...new Set(duplicates)].join(', ')}`);
};

unique(inventory.sites.map((site) => site.siteId), 'siteId');
unique(inventory.sites.map((site) => site.code).filter(Boolean), 'code');

const collectSourceIds = (value, result = []) => {
  if (!value || typeof value !== 'object') return result;
  if (Array.isArray(value)) {
    value.forEach((item) => collectSourceIds(item, result));
    return result;
  }
  Object.entries(value).forEach(([key, child]) => {
    if (key === 'sourceIds' && Array.isArray(child)) result.push(...child);
    collectSourceIds(child, result);
  });
  return result;
};

const collectMediaIds = (value, result = []) => {
  if (!value || typeof value !== 'object') return result;
  if (Array.isArray(value)) {
    value.forEach((item) => collectMediaIds(item, result));
    return result;
  }
  Object.entries(value).forEach(([key, child]) => {
    if (key === 'mediaIds' || key === 'historical' || key === 'restoration' || key === 'current' || key === 'candidate') {
      if (Array.isArray(child)) result.push(...child.filter((item) => typeof item === 'string' && item.startsWith('TN-MEDIA-')));
    }
    collectMediaIds(child, result);
  });
  return result;
};

for (const site of inventory.sites ?? []) {
  if (!site.siteId || !site.officialName || !site.evidenceStatus || !site.priority) error('site is missing required identity/evidence fields');
  if (!inventory.evidenceStatuses.includes(site.evidenceStatus)) error(`${site.siteId}: invalid evidenceStatus ${site.evidenceStatus}`);
  if (!inventory.priorityTiers.includes(site.priority)) error(`${site.siteId}: invalid priority ${site.priority}`);

  const location = site.location ?? {};
  if (location.coordinates !== null) error(`${site.siteId}: coordinates must remain null in research inventory`);
  if (location.canonicalPoiId && !poiIds.has(location.canonicalPoiId)) error(`${site.siteId}: unknown canonicalPoiId ${location.canonicalPoiId}`);
  for (const relatedPoiId of location.relatedPoiIds ?? []) {
    if (!poiIds.has(relatedPoiId)) error(`${site.siteId}: unknown relatedPoiId ${relatedPoiId}`);
  }

  for (const sourceId of collectSourceIds(site)) {
    if (!sourceIds.has(sourceId)) error(`${site.siteId}: unknown sourceId ${sourceId}`);
  }
  for (const mediaId of collectMediaIds(site)) {
    if (!mediaIds.has(mediaId)) error(`${site.siteId}: unknown mediaId ${mediaId}`);
  }

  if ('route' in site || 'routes' in site || 'terrain' in site || 'geometry' in site) {
    error(`${site.siteId}: inventory must not introduce route, terrain, or geometry data`);
  }
  if (site.evidenceStatus === 'SUPPORTED' && collectSourceIds(site).length === 0) {
    error(`${site.siteId}: SUPPORTED inventory item must retain at least one sourceId`);
  }
}

if (errors.length > 0) {
  console.error(`Then/Now inventory validation: FAIL (${errors.length} error${errors.length === 1 ? '' : 's'})`);
  errors.forEach((message) => console.error(`- ${message}`));
  process.exitCode = 1;
} else {
  console.log(`Then/Now inventory validation: PASS (${inventory.sites.length} sites, ${sourceIds.size} source records, ${poiIds.size} canonical POI references available)`);
}
