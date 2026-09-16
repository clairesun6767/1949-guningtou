import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const chrome = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const root = path.resolve('.');
const baseUrl = 'http://localhost:4321/1949-guningtou/v2/region/';
const safeDir = path.resolve('docs/2.0/screenshots/gate-a3p1');
const localDir = path.resolve('.local/aerial-poc/screenshots/gate-a3p1');
const reviewCamera = 'camera=art-review-kinmen-xiamen-01';
fs.mkdirSync(safeDir, { recursive: true });
fs.mkdirSync(localDir, { recursive: true });

const shots = [
  {
    name: 'A01_BASE',
    query: `?historical=H0&environment=P0&time=T0&weather=W0&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: 'BASE：現代 DEM／P0／W0，固定 ART_REVIEW_KINMEN_XIAMEN_01。',
  },
  {
    name: 'A02_AERIAL',
    query: `?historical=H6&aerial=local&environment=P2&time=T2&weather=W0&opacity=65&${reviewCamera}&debug=closed`,
    privacy: 'local-only',
    note: 'LOCAL ONLY：SMART aerial＋RELIEF，1944／1945 primary、1958 fallback。',
  },
  {
    name: 'A03_OCEAN',
    query: `?historical=H0&environment=P0&time=T0&weather=W0&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: 'Ocean before：P0 baseline sea shell。',
  },
  {
    name: 'OCEAN_ENHANCED',
    query: `?historical=H0&environment=P1&time=T0&weather=W0&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: 'Ocean after：P1 enhanced sea shell／coastal depth proxy。',
  },
  {
    name: 'A04_CLOUD',
    query: `?historical=H0&environment=P1&time=T0&weather=W1&disable=cloudShadows&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: 'Cloud after：P1／W1，關閉 cloud shadow 以隔離雲層形狀。',
  },
  {
    name: 'A05_CLOUD_SHADOW',
    query: `?historical=H0&environment=P1&time=T0&weather=W1&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: 'Cloud shadow：P1／W1，雲層與低對比投影同步。',
  },
  {
    name: 'A06_FULL_DAY',
    query: `?historical=H7&aerial=local&environment=P3&time=T0&weather=W1&opacity=65&${reviewCamera}&debug=closed`,
    privacy: 'local-only',
    note: 'LOCAL ONLY：完整 SMART composite／RELIEF／T0 daylight／W1。',
  },
  {
    name: 'A07_FULL_DAWN',
    query: `?historical=H7&aerial=local&environment=P3&time=T1&weather=W1&opacity=65&${reviewCamera}&debug=closed`,
    privacy: 'local-only',
    note: 'LOCAL ONLY：完整 SMART composite／RELIEF／T1 dawn／W1。',
  },
  {
    name: 'DAYLIGHT_T0',
    query: `?historical=H0&environment=P1&time=T0&weather=W1&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: 'Historical Daylight／P1／W1 art review。',
  },
  {
    name: 'DAWN_T1',
    query: `?historical=H0&environment=P1&time=T1&weather=W1&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: 'Battlefield Dawn／P1／W1 art review。',
  },
  {
    name: 'OCEAN_SHALLOW_DEEP',
    query: `?historical=H0&environment=P1&time=T0&weather=W0&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: '固定鏡位海面深度分層：SHALLOW／INTERMEDIATE／DEEP coastal proxy。',
  },
  {
    name: 'CLOUD_W0',
    query: `?historical=H0&environment=P1&time=T0&weather=W0&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: 'W0 clear：雲覆蓋 0%。',
  },
  {
    name: 'CLOUD_W1',
    query: `?historical=H0&environment=P1&time=T0&weather=W1&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: 'W1 light cloud：目標視覺覆蓋約 20–35%。',
  },
  {
    name: 'CLOUD_W2',
    query: `?historical=H0&environment=P1&time=T0&weather=W2&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: 'W2 broken cloud：目標視覺覆蓋約 45–65%。',
  },
  {
    name: 'COVERAGE',
    query: `?historical=H0&environment=P0&time=T0&weather=W0&coverage=on&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: 'Coverage outline：公開安全的範圍界線檢視。',
  },
  {
    name: 'SOURCE_MAP',
    query: `?historical=H7&aerial=local&environment=P3&time=T0&weather=W1&opacity=65&mode=distribution&${reviewCamera}&debug=open`,
    privacy: 'local-only',
    note: 'LOCAL ONLY：source-year mask／distribution map review。',
  },
  {
    name: 'PERFORMANCE_FULL_DAY',
    query: `?historical=H0&environment=P1&time=T0&weather=W1&${reviewCamera}&debug=open`,
    privacy: 'safe',
    note: 'P1 full-day performance readout：FPS／frame time／draw／triangles／ready。',
  },
  {
    name: 'PERF_P0',
    query: `?historical=H0&environment=P0&time=T0&weather=W0&${reviewCamera}&debug=open`,
    privacy: 'safe',
    note: 'P0 performance readout。',
  },
  {
    name: 'PERF_P1',
    query: `?historical=H0&environment=P1&time=T0&weather=W1&${reviewCamera}&debug=open`,
    privacy: 'safe',
    note: 'P1 performance readout。',
  },
  {
    name: 'PERF_P2',
    query: `?historical=H6&aerial=local&environment=P2&time=T2&weather=W0&opacity=65&${reviewCamera}&debug=open`,
    privacy: 'local-only',
    note: 'LOCAL ONLY：P2 performance readout with aerial／relief。',
  },
  {
    name: 'PERF_P3',
    query: `?historical=H7&aerial=local&environment=P3&time=T0&weather=W1&opacity=65&${reviewCamera}&debug=open`,
    privacy: 'local-only',
    note: 'LOCAL ONLY：P3 performance readout with aerial／environment。',
  },
  ...[50, 65, 80, 95].map(opacity => ({
    name: `AERIAL_OPACITY_${opacity}`,
    query: `?historical=H7&aerial=local&environment=P3&time=T0&weather=W1&opacity=${opacity}&${reviewCamera}&debug=closed`,
    privacy: 'local-only',
    note: `LOCAL ONLY：航照 opacity ${opacity}% review。`,
  })),
  ...[
    ['LOW', 1],
    ['MEDIUM', 1.5],
    ['HIGH', 2],
  ].map(([label, vertical]) => ({
    name: `RELIEF_${label}`,
    query: `?historical=H7&aerial=local&environment=P3&time=T0&weather=W1&opacity=65&vertical=${vertical}&${reviewCamera}&debug=closed`,
    privacy: 'local-only',
    note: `LOCAL ONLY：RELIEF ${label}／vertical ${vertical}× review。`,
  })),
];

function capture(shot) {
  const outputDir = shot.privacy === 'safe' ? safeDir : localDir;
  const screenshot = path.join(outputDir, shot.name + '.png');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-1949-gate-a3p1-'));
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
  ], { cwd: root, encoding: 'utf8', timeout: 45_000, windowsHide: true });
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
const common = {
  generatedAt,
  browser: 'Chrome headless actual page output',
  camera: 'ART_REVIEW_KINMEN_XIAMEN_01',
  viewport: '1920×1080',
  deterministicSeed: 'shader constants / no random runtime input',
};
fs.writeFileSync(path.join(safeDir, 'manifest.json'), JSON.stringify({
  ...common,
  privacy: 'safe screenshots only; local-only screenshots remain ignored',
  screenshots: results.filter(item => item.privacy === 'safe'),
}, null, 2) + '\n');
fs.writeFileSync(path.join(localDir, 'manifest.json'), JSON.stringify({
  ...common,
  privacy: 'LOCAL ONLY — do not publish; some screenshots contain rights-unclear aerial pixels',
  screenshots: results.filter(item => item.privacy === 'local-only'),
}, null, 2) + '\n');
