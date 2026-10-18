import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';

test('production language map routes mount the V2 aerial environment renderer', () => {
  const route = readFileSync('src/pages/[lang]/map.astro', 'utf8');
  const battleMap = readFileSync('src/components/map/BattleMap.tsx', 'utf8');
  const experience = readFileSync('src/components/map/HistoricalMapExperience.tsx', 'utf8');
  const renderer = readFileSync('src/components/map/HistoricalRegionRenderer.tsx', 'utf8');
  assert.match(route, /BattleMap client:only="react"/);
  assert.match(battleMap, /rendererMode="v2"/);
  assert.match(experience, /activeRenderer === 'v2'/);
  assert.match(experience, /HistoricalRegionRenderer/);
  assert.match(renderer, /initialHistoricalMode: 'AERIAL'/);
  assert.match(renderer, /initialEnvironmentDebug: ENVIRONMENT_DEBUG/);
  assert.match(renderer, /\[1944, 1945, 1958\]/);
  assert.match(renderer, /setHistoricalYear\(year\)/);
});

test('production map keeps the authorized year-aware low-resolution aerial bundle', () => {
  for (const year of [1944, 1945, 1958]) {
    const mosaic = `public/.local/aerial-poc/${year}/mosaic-z12.png`;
    const mask = `public/.local/aerial-poc/${year}/valid-mask-z12.png`;
    assert.ok(statSync(mosaic).size > 1000, `${mosaic} should be published`);
    assert.ok(statSync(mask).size > 1000, `${mask} should be published`);
  }
});

test('production map keeps controls and battle timeline in one map control deck', () => {
  const experience = readFileSync('src/components/map/HistoricalMapExperience.tsx', 'utf8');
  const layout = readFileSync('src/layouts/MainLayout.astro', 'utf8');
  const controlDeckIndex = experience.indexOf('className="historical-map__control-deck"');
  const controlsIndex = experience.indexOf('className="historical-map__controls"', controlDeckIndex);
  const timelineIndex = experience.indexOf('id="battle-map-timeline"', controlsIndex);
  assert.ok(controlDeckIndex >= 0, 'map control deck should exist');
  assert.ok(controlsIndex > controlDeckIndex, 'map controls should be inside the deck');
  assert.ok(timelineIndex > controlsIndex, 'battle timeline should follow the map controls');
  assert.match(layout, /museum-brand__tagline.*footerPeace/);
  assert.match(layout, /museum-footer__meta museum-footer__meta--single-line/);
});
