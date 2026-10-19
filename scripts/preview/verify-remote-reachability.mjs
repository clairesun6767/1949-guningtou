import fs from 'node:fs/promises';
import path from 'node:path';

const previewUrl = (process.argv[2] || process.env.PREVIEW_BASE_URL || '').replace(/\/+$/, '');
const expectedSha = process.argv[3] || process.env.PREVIEW_COMMIT_SHA || '';
const basePath = process.env.PREVIEW_BASE_PATH || '/1949-guningtou';
const outputPath = process.env.REMOTE_REACHABILITY_OUTPUT;

if (!previewUrl) throw new Error('A preview URL is required. Set PREVIEW_BASE_URL or pass it as the first argument.');
const parsed = new URL(previewUrl);
if (process.env.CI && parsed.protocol !== 'https:') {
  throw new Error(`Remote reachability verification requires HTTPS; received ${parsed.protocol}`);
}

const routes = [
  `${basePath}/preview-metadata.json`,
  `${basePath}/`,
  `${basePath}/zh-tw/then-and-now/`,
  `${basePath}/zh-tw/map/`,
  `${basePath}/zh-tw/locations/POI-0016/`,
];

const checks = [];
let metadata = null;
for (const route of routes) {
  const url = `${previewUrl}${route.startsWith('/') ? route : `/${route}`}`;
  const response = await fetch(url, { headers: { accept: route.endsWith('.json') ? 'application/json' : 'text/html' } });
  const check = { route, status: response.status, ok: response.ok };
  checks.push(check);
  if (!response.ok) throw new Error(`Remote preview returned HTTP ${response.status} for ${url}`);
  if (route.endsWith('preview-metadata.json')) {
    metadata = await response.json();
    if (expectedSha && metadata.commitSha !== expectedSha) {
      throw new Error(`Remote preview metadata serves ${metadata.commitSha}, expected ${expectedSha}`);
    }
  }
}

const result = {
  schemaVersion: 1,
  status: 'PASS',
  previewUrl,
  expectedSha: expectedSha || null,
  servedSha: metadata?.commitSha ?? null,
  branch: metadata?.branch ?? null,
  checkedAt: new Date().toISOString(),
  runner: process.env.RUNNER_OS || process.platform,
  routes: checks,
};

if (outputPath) {
  const absoluteOutputPath = path.resolve(outputPath);
  await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
  await fs.writeFile(absoluteOutputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify(result));
