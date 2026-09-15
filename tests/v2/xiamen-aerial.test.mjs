import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

import {
  XIAMEN_1943_AERIAL_PHOTOS,
  XIAMEN_WWII_AERIAL_UNVERIFIED_01,
} from '../../.tmp/v2-tests/v2/config/xiamen1943Aerial.js';
import {
  XIAMEN_GCP_REGISTRATION_EXPERIMENT,
  evaluateXiamenRegistrationQa,
} from '../../.tmp/v2-tests/v2/config/xiamenGcpWorkflow.js';

test('Xiamen dataset stays unverified and keeps provenance clues literal', () => {
  assert.equal(XIAMEN_WWII_AERIAL_UNVERIFIED_01.id, 'XIAMEN_WWII_AERIAL_UNVERIFIED_01');
  assert.equal(XIAMEN_WWII_AERIAL_UNVERIFIED_01.label, '廈門二戰時期航照候選資料');
  assert.equal(XIAMEN_WWII_AERIAL_UNVERIFIED_01.dateStatus, 'DATE UNVERIFIED');
  assert.equal(XIAMEN_WWII_AERIAL_UNVERIFIED_01.claimedDate, '1943-11-22');
  assert.equal(XIAMEN_WWII_AERIAL_UNVERIFIED_01.verifiedDate, null);
  assert.deepEqual(XIAMEN_WWII_AERIAL_UNVERIFIED_01.provenanceClues, ['53-8-12', '53-8-20']);
  assert.equal(XIAMEN_WWII_AERIAL_UNVERIFIED_01.assetPolicy, 'LOCAL ONLY — PIXELS NOT IN GIT');
});

test('Xiamen pixels stay outside public research metadata', () => {
  const publicDir = 'public/research/xiamen-1943';
  const manifest = JSON.parse(readFileSync(`${publicDir}/manifest.json`, 'utf8'));
  assert.equal(manifest.id, 'XIAMEN_WWII_AERIAL_UNVERIFIED_01');
  assert.equal(manifest.verifiedDate, null);
  assert.equal(manifest.photos.length, 8);
  assert.ok(manifest.photos.every(photo => photo.localAssetPath.startsWith('.local/aerial-poc/xiamen/')));
  assert.deepEqual(readdirSync(publicDir).filter(name => /\.(jpe?g|png)$/i.test(name)), []);
  assert.ok(XIAMEN_1943_AERIAL_PHOTOS.every(photo => existsSync(photo.localAssetPath)));
});

test('single-image GCP experiment is blocked until verified targets and residual QA exist', () => {
  assert.equal(XIAMEN_GCP_REGISTRATION_EXPERIMENT.imageId, 'amoy-1943-11-22-set-a-01');
  assert.equal(XIAMEN_GCP_REGISTRATION_EXPERIMENT.qaStatus, 'NOT PASSED');
  assert.equal(XIAMEN_GCP_REGISTRATION_EXPERIMENT.qa.mosaicAllowed, false);
  assert.equal(XIAMEN_GCP_REGISTRATION_EXPERIMENT.qa.terrainProjectionAllowed, false);
  const blocked = evaluateXiamenRegistrationQa(XIAMEN_GCP_REGISTRATION_EXPERIMENT.candidateFeatures);
  assert.equal(blocked.status, 'BLOCKED');
  assert.equal(blocked.pass, false);
  const passed = evaluateXiamenRegistrationQa(XIAMEN_GCP_REGISTRATION_EXPERIMENT.candidateFeatures, 4, [2.1, 3.2, 4.7, 5.8]);
  assert.equal(passed.status, 'PASS');
  assert.equal(passed.mosaicAllowed, true);
  assert.equal(passed.terrainProjectionAllowed, true);
});
