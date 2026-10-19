import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const metrics = JSON.parse(fs.readFileSync(path.join(root, 'docs/quality/V5_AUDIT_METRICS.json'), 'utf8'));

test('V5 covers every canonical timeline record with English editorial copy', () => {
  assert.equal(metrics.translation.englishTimeline.covered, metrics.translation.englishTimeline.total);
  assert.deepEqual(metrics.translation.englishTimeline.missing, []);
  assert.deepEqual(metrics.translation.englishTimeline.cjkInEnglishCopy, []);
});

test('V5 classifies every POI as a modern site, historical area, or unresolved area', () => {
  assert.equal(metrics.coordinates.allPoiClassified, true);
  assert.equal(metrics.canonicalCounts.pois, 38);
  assert.equal(metrics.coordinates.userSpecifiedCount, 38);
  assert.equal(metrics.coordinates.sourceCount, 38);
});

test('V5 does not publish missing or local-only media references', () => {
  assert.deepEqual(metrics.media.missingPublicAssets, []);
  assert.ok(metrics.media.researchLocalReferencesExcluded > 0);
  assert.equal(metrics.media.publicCollectionsExcludeLocal, true);
  assert.ok(metrics.media.publicImageFiles >= 20);
  assert.equal(metrics.media.peopleWithPublishedPortraits, 3);
});
