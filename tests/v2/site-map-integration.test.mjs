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
