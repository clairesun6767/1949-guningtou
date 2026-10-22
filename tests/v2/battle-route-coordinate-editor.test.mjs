import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';

test('battle route workbench compares the historical source map with current coordinate data', () => {
  const page = readFileSync('src/pages/dev/battle-route-coordinate-editor.astro', 'utf8');
  const editor = readFileSync('src/components/dev/HistoricalBattleMapRegistrationEditor.tsx', 'utf8');
  const map = readFileSync('src/components/dev/BattleTraceReferenceMap.tsx', 'utf8');
  const stylesheet = readFileSync('src/components/dev/historical-map-registration.css', 'utf8');
  const pois = JSON.parse(readFileSync('data/poi.json', 'utf8'));
  const traces = JSON.parse(readFileSync('data/battles/guningtou-1949/historical-battle-map-traces.geojson', 'utf8'));

  assert.match(page, /noindex,nofollow/);
  assert.match(page, /HistoricalBattleMapRegistrationEditor client:only="react"/);
  assert.match(editor, /data\/poi\.json/);
  assert.match(editor, /BattleTraceReferenceMap/);
  assert.match(editor, /下載正式 trace dataset/);
  assert.match(editor, /currentPoiRecords/);
  assert.match(map, /tile\.openstreetmap\.org/);
  assert.match(map, /draggable: true/);
  assert.match(map, /onMoveVertex/);
  assert.match(map, /onMapClick/);
  assert.match(stylesheet, /\.battle-trace-reference-map/);
  assert.equal(pois.pois.length, 38);
  assert.equal(traces.features.length, 13);
  assert.ok(existsSync('public/map-data/historical-battle-map.jpg'));
  assert.ok(statSync('public/map-data/historical-battle-map.jpg').size > 1000);
});
