import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';

const inventory = JSON.parse(readFileSync('data/then-now/site-inventory.json', 'utf8'));
const sources = JSON.parse(readFileSync('data/sources.json', 'utf8')).sources;
const pois = JSON.parse(readFileSync('data/poi.json', 'utf8')).pois;
const catalog = readFileSync('src/data/thenNowCatalog.ts', 'utf8');
const mediaCatalog = readFileSync('src/data/mediaCatalog.ts', 'utf8');
const page = readFileSync('src/components/then-now/ThenNowPage.astro', 'utf8');

test('site inventory is source-linked and coordinate-neutral', () => {
  assert.equal(inventory.schemaVersion, '3.0.0');
  assert.equal(new Set(inventory.sites.map((site) => site.siteId)).size, inventory.sites.length);
  const sourceIds = new Set(sources.map((source) => source.source_id));
  const poiIds = new Set(pois.map((poi) => poi.poi_id));
  for (const site of inventory.sites) {
    assert.equal(site.location.coordinates, null, `${site.siteId} must not introduce coordinates`);
    assert.ok(site.sourceIds.every((sourceId) => sourceIds.has(sourceId)), `${site.siteId} source references must resolve`);
    if (site.location.canonicalPoiId) assert.ok(poiIds.has(site.location.canonicalPoiId), `${site.siteId} canonical POI must resolve`);
    assert.ok(site.location.relatedPoiIds.every((poiId) => poiIds.has(poiId)), `${site.siteId} related POIs must resolve`);
  }
});

test('place-name ambiguity stays explicit', () => {
  const huawei = inventory.sites.find((site) => site.siteId === 'TN-HUWEI-HIGH');
  const hunan = inventory.sites.find((site) => site.siteId === 'TN-HUNAN-HIGH');
  assert.ok(huawei);
  assert.ok(hunan);
  assert.equal(huawei.location.canonicalPoiId, 'POI-0015');
  assert.notEqual(huawei.siteId, hunan.siteId);
  assert.equal(hunan.officialName['zh-tw'], '湖南高地');
  assert.match(catalog, /古寧頭三營區/);
  assert.match(JSON.stringify(inventory), /W16 對應/);
});

test('new public media exists and is catalogued with licences', () => {
  const files = [
    'guningtou-beach-2015.jpg',
    'li-guangqian-shrine-2014.jpg',
    'peace-li-ancestral-hall-2019.jpg',
    'lincuo-memorial-2019.jpg',
  ];
  for (const file of files) {
    const path = `public/media/guningtou/then-now/${file}`;
    assert.equal(existsSync(path), true, `${path} should exist`);
    assert.ok(statSync(path).size > 1000, `${path} should not be empty`);
  }
  for (const id of ['TN-MEDIA-GUNINGTOU-BEACH-2015', 'TN-MEDIA-LI-SHRINE-2014', 'TN-MEDIA-PEACE-ANCESTRAL-HALL-2019', 'TN-MEDIA-LINCUO-MEMORIAL-2019']) {
    assert.match(mediaCatalog, new RegExp(id));
  }
  assert.match(mediaCatalog, /CC BY 3\.0/);
  assert.match(mediaCatalog, /CC BY-SA 4\.0/);
});

test('inventory validator and map comparison are wired into the page', () => {
  const output = execFileSync(process.execPath, ['scripts/validate-then-now-inventory.mjs'], { encoding: 'utf8' });
  assert.match(output, /PASS/);
  assert.match(page, /ThenNowMapCompare client:only="react"/);
  assert.match(page, /site-inventory\.json/);
  assert.match(page, /then-now-inventory-grid/);
});
