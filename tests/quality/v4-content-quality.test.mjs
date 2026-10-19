import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const arrayFrom = (value, key) => Array.isArray(value) ? value : Array.isArray(value?.[key]) ? value[key] : [];
const unique = (items) => new Set(items).size === items.length;
const ids = (items, key) => items.map((item) => item[key]).filter(Boolean);

test('V4 canonical IDs remain unique', () => {
  const persons = arrayFrom(readJson('data/persons.json'), 'persons');
  const pois = arrayFrom(readJson('data/poi.json'), 'pois');
  const events = arrayFrom(readJson('data/events.json'), 'events');
  const timeline = arrayFrom(readJson('data/timeline.json'), 'records');
  assert.equal(unique(ids(persons, 'person_id')), true);
  assert.equal(unique(ids(pois, 'poi_id')), true);
  assert.equal(unique(ids(events, 'event_id')), true);
  assert.equal(unique(ids(timeline, 'timeline_id')), true);
});

test('V4 never exposes the previously duplicated Housha narrative', () => {
  const pois = arrayFrom(readJson('data/poi.json'), 'pois');
  const stale = pois.filter((poi) => poi.long_description?.includes('【后沙】') || poi.long_description?.includes('參見關聯'));
  assert.deepEqual(stale, []);
});

test('all canonical people retain an English presentation record', () => {
  const persons = arrayFrom(readJson('data/persons.json'), 'persons');
  const source = fs.readFileSync(path.join(root, 'src/i18n/historicalContent.ts'), 'utf8');
  const idsInSource = new Set([...source.matchAll(/'(PER-\d{4})':\s*\{/g)].map((match) => match[1]));
  const missing = persons.map((person) => person.person_id).filter((id) => !idsInSource.has(id));
  assert.deepEqual(missing, []);
});

test('all canonical POIs retain a cautious English presentation record', () => {
  const pois = arrayFrom(readJson('data/poi.json'), 'pois');
  const source = fs.readFileSync(path.join(root, 'src/i18n/historicalContent.ts'), 'utf8');
  const idsInSource = new Set([...source.matchAll(/'(POI-\d{4})':\s*\{/g)].map((match) => match[1]));
  const missing = pois.map((poi) => poi.poi_id).filter((id) => !idsInSource.has(id));
  assert.deepEqual(missing, []);
});

test('coordinate uncertainty remains visible instead of being promoted', () => {
  const pois = arrayFrom(readJson('data/poi.json'), 'pois');
  assert.deepEqual(pois.filter((poi) => poi.verification_status === 'verified').map((poi) => poi.poi_id), []);
  assert.equal(pois.every((poi) => poi.coordinate_status === 'user_specified'), true);
  assert.equal(pois.every((poi) => poi.map_visibility === 'public'), true);
  assert.equal(pois.every((poi) => poi.coordinate_accuracy), true);
});

test('catalogued static media files exist', () => {
  const mediaSource = fs.readFileSync(path.join(root, 'src/data/mediaCatalog.ts'), 'utf8');
  const paths = [...mediaSource.matchAll(/src:\s*'([^']+)'/g)].map((match) => match[1]);
  const missing = paths.filter((assetPath) => !fs.existsSync(path.join(root, 'public', assetPath)));
  assert.deepEqual(missing, []);
});

test('historical map assets remain parseable and present', () => {
  const mapFiles = [
    'public/map-data/historical-battle-map.jpg',
    'public/map-data/guningtou-cartography.geojson',
    'public/map-data/guningtou-coastline.geojson',
    'public/map-data/regional-cartography.geojson',
    'data/battles/guningtou-1949/historical-battle-map-traces.geojson',
  ];
  for (const relativePath of mapFiles) assert.equal(fs.existsSync(path.join(root, relativePath)), true, relativePath);
  for (const relativePath of mapFiles.filter((file) => file.endsWith('.geojson'))) {
    const parsed = JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
    assert.ok(parsed.type, relativePath);
  }
});

test('all data source references resolve to the authoritative catalog', () => {
  const sources = arrayFrom(readJson('data/sources.json'), 'sources');
  const sourceIds = new Set(ids(sources, 'source_id'));
  const datasets = [
    [arrayFrom(readJson('data/persons.json'), 'persons'), 'related_sources'],
    [arrayFrom(readJson('data/poi.json'), 'pois'), 'related_sources'],
    [arrayFrom(readJson('data/events.json'), 'events'), 'source_ids'],
    [arrayFrom(readJson('data/timeline.json'), 'records'), 'source_ids'],
  ];
  const orphaned = [];
  for (const [items, key] of datasets) {
    for (const item of items) for (const sourceId of item[key] ?? []) if (!sourceIds.has(sourceId)) orphaned.push(sourceId);
  }
  assert.deepEqual([...new Set(orphaned)], []);
});
