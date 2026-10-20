import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('internal POI coordinate editor is available without entering the public navigation', () => {
  const route = readFileSync('src/pages/dev/poi-coordinate-editor.astro', 'utf8');
  const editor = readFileSync('src/components/dev/PoiCoordinateEditor.tsx', 'utf8');
  const map = readFileSync('src/components/dev/PoiCoordinateMap.tsx', 'utf8');
  assert.match(route, /noindex,nofollow/);
  assert.match(route, /PoiCoordinateEditor client:only="react"/);
  assert.match(editor, /poi-coordinate-submission\.v1/);
  assert.match(editor, /pending-codex-import/);
  assert.match(editor, /送出並下載修正檔/);
  assert.match(editor, /data\/poi\.json/);
  assert.match(map, /draggable: true/);
  assert.match(map, /dragend/);
});
