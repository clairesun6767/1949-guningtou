import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';

const catalogPath = 'src/data/thenNowCatalog.ts';
const pagePath = 'src/components/then-now/ThenNowPage.astro';
const stylePath = 'src/styles/global.css';
const catalog = readFileSync(catalogPath, 'utf8');
const page = readFileSync(pagePath, 'utf8');
const styles = readFileSync(stylePath, 'utf8');

test('then-and-now has five anchored sections and three language records', () => {
  for (const id of ['overview', 'images', 'explore', 'activation', 'traces']) {
    assert.match(catalog, new RegExp(`id: '${id}'`), `${id} should be catalogued`);
    assert.match(page, new RegExp(`id="${id}"`), `${id} should be rendered as an anchor`);
  }
  for (const locale of ["'zh-tw'", "'zh-cn'", 'en']) {
    assert.ok(catalog.includes(locale), `${locale} should have localized copy`);
  }
});

test('military-site reading band retains requested site codes and user-specified coordinates', () => {
  for (const code of ['W011', 'W012', 'W013', 'W016', 'W027']) {
    assert.match(catalog, new RegExp(`id: '${code}'`), `${code} should be present`);
    assert.match(catalog, new RegExp(`code: '${code}'`), `${code} should retain its code`);
  }
  assert.match(catalog, /user-specified coordinate/);
  assert.match(catalog, /24\.4738, 118\.3325/);
  assert.match(catalog, /TN-MEDIA-W012-ENTRANCE-2026/);
  assert.match(page, /imagePending/);
});

test('published then-and-now image bundle exists and carries explicit attribution metadata', () => {
  const imageNames = [
    'g-battle-museum-2013.jpg',
    'beishan-cliff-2022.jpg',
    'beishan-broadcast-wall-2013.jpg',
    'beishan-old-house-2018.jpg',
    'guningtou-arch-2012.jpg',
    'w012-entrance.jpg',
    'w012-exterior.jpg',
  ];
  for (const name of imageNames) {
    const path = `public/media/guningtou/then-now/${name}`;
    assert.equal(existsSync(path), true, `${path} should be tracked`);
    assert.ok(statSync(path).size > 1000, `${path} should not be an empty placeholder`);
  }
  for (const id of ['TN-MEDIA-MUSEUM-2013', 'TN-MEDIA-BEISHAN-CLIFF-2022', 'TN-MEDIA-BROADCAST-WALL-2013', 'TN-MEDIA-BEISHAN-HOUSE-2018', 'TN-MEDIA-ARCH-2012', 'TN-MEDIA-W012-ENTRANCE-2026', 'TN-MEDIA-W012-EXTERIOR-2026']) {
    assert.match(readFileSync('src/data/mediaCatalog.ts', 'utf8'), new RegExp(id));
  }
  assert.match(readFileSync('src/data/mediaCatalog.ts', 'utf8'), /CC BY-SA 4\.0/);
  assert.match(readFileSync('src/data/mediaCatalog.ts', 'utf8'), /licenseUrl/);
});

test('old postwar URL and the new then-and-now URL share the same page implementation', () => {
  const oldRoute = readFileSync('src/pages/[lang]/postwar.astro', 'utf8');
  const newRoute = readFileSync('src/pages/[lang]/then-and-now.astro', 'utf8');
  assert.match(oldRoute, /ThenNowPage/);
  assert.match(newRoute, /ThenNowPage/);
  assert.match(page, /LocationExplorer client:only="react"/);
  assert.match(page, /sitePath\(`locations\/\$\{site\.poiId\}`, lang\)/);
  assert.doesNotMatch(page, /1949-guningtou\/zh-tw\/locations/);
});

test('responsive layout covers small screens and does not rely on fixed-width page overflow', () => {
  assert.match(styles, /\.then-now-index__grid/);
  assert.match(styles, /\.then-now-site-grid--traces/);
  assert.match(styles, /@media \(max-width: 720px\)/);
  assert.match(styles, /\.then-now-index__grid,\r?\n  \.then-now-overview-grid,\r?\n  \.then-now-site-grid/);
  assert.match(page, /loading="lazy"/);
});
