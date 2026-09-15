import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const chrome = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const root = path.resolve('.');
const baseUrl = 'http://localhost:4321/1949-guningtou/v2/region/';
const safeDir = path.resolve('docs/2.0/screenshots/gate-a3p');
const localDir = path.resolve('.local/aerial-poc/screenshots/gate-a3p');
fs.mkdirSync(safeDir, { recursive: true });
fs.mkdirSync(localDir, { recursive: true });

const shots = [
  {
    name: 'A3P_P0_BASELINE',
    query: '?historical=H0&environment=P0&time=T0&weather=W0&camera=guningtou&debug=closed',
    privacy: 'safe',
    note: 'P0 modern DEM and baseline environment; no aerial pixels requested.',
  },
  {
    name: 'A3P_P1_ENVIRONMENT',
    query: '?historical=H0&environment=P1&time=T1&weather=W2&camera=guningtou&debug=closed',
    privacy: 'safe',
    note: 'P1 environment benchmark with T1 dawn and W2 cloud preset.',
  },
  {
    name: 'A3P_OCEAN_BASELINE',
    query: '?historical=H0&environment=P0&time=T0&weather=W0&camera=guningtou&debug=closed',
    privacy: 'safe',
    note: 'Ocean before: P0 baseline sea shell without enhanced environment response.',
  },
  {
    name: 'A3P_OCEAN_ENHANCED',
    query: '?historical=H0&environment=P1&time=T0&weather=W1&camera=guningtou&debug=closed',
    privacy: 'safe',
    note: 'Ocean after: P1 enhanced sea response with unified sun, motion and atmosphere.',
  },
  {
    name: 'A3P_DAYLIGHT_T0',
    query: '?historical=H0&environment=P1&time=T0&weather=W1&camera=guningtou&debug=closed',
    privacy: 'safe',
    note: 'Unified daylight T0 proof without aerial pixels.',
  },
  {
    name: 'A3P_DAWN_T1',
    query: '?historical=H0&environment=P1&time=T1&weather=W1&camera=guningtou&debug=closed',
    privacy: 'safe',
    note: 'Unified battlefield dawn T1 proof without aerial pixels.',
  },
  {
    name: 'A3P_PERFORMANCE_DEBUG',
    query: '?historical=H0&environment=P1&time=T0&weather=W1&camera=guningtou&debug=open',
    privacy: 'safe',
    note: 'P0/P1 performance readout: FPS, frame time, calls, triangles and readiness.',
  },
  {
    name: 'A3P_COVERAGE_MASK',
    query: '?historical=H0&environment=P0&coverage=on&camera=guningtou&debug=closed',
    privacy: 'safe',
    note: 'Metadata-only 1944/1945/1958 KML coverage review; no aerial pixels requested.',
  },
  {
    name: 'A3P_P1_DEBUG',
    query: '?historical=H0&environment=P1&time=T0&weather=W1&camera=guningtou&debug=open',
    privacy: 'safe',
    note: 'P1 debug panel with CPU frame and environment controls.',
  },
  {
    name: 'A3P_P2_LOCAL',
    query: '?historical=H3&aerial=local&environment=P2&time=T2&weather=W0&camera=guningtou&debug=closed',
    privacy: 'local-only',
    note: 'Local-only P2 review; pixels are excluded from GitHub.',
  },
  {
    name: 'A3P_P3_LOCAL',
    query: '?historical=H7&aerial=local&environment=P3&time=T0&weather=W1&camera=guningtou&debug=closed',
    privacy: 'local-only',
    note: 'Local-only P3 review; pixels are excluded from GitHub.',
  },
  {
    name: 'A3P_H1_1944_LOCAL',
    query: '?historical=H1&aerial=local&environment=P2&time=T2&weather=W0&camera=guningtou&view=top&debug=closed',
    privacy: 'local-only',
    note: 'Local-only 1944 single-year review.',
  },
  {
    name: 'A3P_H2_1945_LOCAL',
    query: '?historical=H2&aerial=local&environment=P2&time=T2&weather=W0&camera=guningtou&view=top&debug=closed',
    privacy: 'local-only',
    note: 'Local-only 1945 single-year review.',
  },
  {
    name: 'A3P_H3_1958_LOCAL',
    query: '?historical=H3&aerial=local&environment=P2&time=T2&weather=W0&camera=guningtou&view=top&debug=closed',
    privacy: 'local-only',
    note: 'Local-only 1958 fallback review.',
  },
  {
    name: 'A3P_H4_SMART_LOCAL',
    query: '?historical=H4&aerial=local&environment=P2&time=T2&weather=W0&camera=guningtou&view=top&debug=closed',
    privacy: 'local-only',
    note: 'Local-only smart 1944/1945 primary review.',
  },
  {
    name: 'A3P_H6_RELIEF_LOCAL',
    query: '?historical=H6&aerial=local&environment=P2&time=T2&weather=W0&camera=guningtou&view=top&debug=closed',
    privacy: 'local-only',
    note: 'Local-only smart aerial plus relief review.',
  },
  {
    name: 'A3P_H7_ENVIRONMENT_LOCAL',
    query: '?historical=H7&aerial=local&environment=P3&time=T0&weather=W1&camera=guningtou&view=top&debug=closed',
    privacy: 'local-only',
    note: 'Local-only smart aerial plus environment review.',
  },
  {
    name: 'A3P_SOURCE_DISTRIBUTION_LOCAL',
    query: '?historical=H4&aerial=local&environment=P3&mode=distribution&time=T0&weather=W1&camera=guningtou&debug=open',
    privacy: 'local-only',
    note: 'Local-only 1944/1945/1958/BASE source mask review.',
  },
  {
    name: 'A3P_CLOUD_T0_LOCAL',
    query: '?historical=H7&aerial=local&environment=P3&time=T0&weather=W1&camera=guningtou&debug=closed',
    privacy: 'local-only',
    note: 'Local-only cloud and shadow T0 review.',
  },
  {
    name: 'A3P_CLOUD_T1_LOCAL',
    query: '?historical=H7&aerial=local&environment=P3&time=T1&weather=W1&camera=guningtou&debug=closed',
    privacy: 'local-only',
    note: 'Local-only cloud and shadow T1 review.',
  },
];

function capture(shot) {
  const outputDir = shot.privacy === 'safe' ? safeDir : localDir;
  const screenshot = path.join(outputDir, shot.name + '.png');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-1949-gate-a3p-'));
  const result = spawnSync(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1920,1080',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=9000',
    '--disable-extensions',
    '--no-first-run',
    '--allow-file-access-from-files',
    '--user-data-dir=' + profile,
    '--screenshot=' + screenshot,
    baseUrl + shot.query,
  ], { cwd: root, encoding: 'utf8', timeout: 30_000, windowsHide: true });
  fs.rmSync(profile, { recursive: true, force: true });
  if (result.error) throw result.error;
  if (result.status !== 0 || !fs.existsSync(screenshot)) {
    throw new Error('Chrome screenshot failed for ' + shot.name + ': ' + (result.stderr || result.stdout || result.status));
  }
  const item = {
    name: shot.name,
    query: shot.query,
    privacy: shot.privacy,
    note: shot.note,
    path: path.relative(root, screenshot).replace(/\\/g, '/'),
    bytes: fs.statSync(screenshot).size,
  };
  process.stdout.write(item.name + ': ' + item.path + ' (' + item.bytes + ' bytes, ' + item.privacy + ')\n');
  return item;
}

const results = shots.map(capture);
const generatedAt = new Date().toISOString();
fs.writeFileSync(path.join(safeDir, 'manifest.json'), JSON.stringify({
  generatedAt,
  browser: 'Chrome headless actual page output',
  privacy: 'safe screenshots only; local-only screenshots remain ignored',
  screenshots: results.filter(item => item.privacy === 'safe'),
}, null, 2) + '\n');
fs.writeFileSync(path.join(localDir, 'manifest.json'), JSON.stringify({
  generatedAt,
  browser: 'Chrome headless actual page output',
  privacy: 'local-only; do not publish',
  screenshots: results.filter(item => item.privacy === 'local-only'),
}, null, 2) + '\n');
