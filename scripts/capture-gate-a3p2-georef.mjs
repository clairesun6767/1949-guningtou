import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const chrome = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const root = path.resolve('.');
const baseUrl = 'http://localhost:4321/1949-guningtou/v2/region/';
const safeDir = path.resolve('docs/2.0/screenshots/gate-a3p2');
const localDir = path.resolve('.local/aerial-poc/screenshots/gate-a3p2');
const reviewCamera = 'camera=art-review-kinmen-xiamen-01';
fs.mkdirSync(safeDir, { recursive: true });
fs.mkdirSync(localDir, { recursive: true });

const shots = [
  {
    name: 'GEO_01_TILE_FOOTPRINT',
    query: `?historical=H0&environment=P0&time=T0&weather=W0&aerialDebug=tile&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: '安全 metadata-only tile footprint：XYZ z/x/y、tile bounds、year labels；未載入航照 pixels。',
  },
  {
    name: 'GEO_02_1944',
    query: `?historical=H1&aerial=local&environment=P2&time=T2&weather=W0&opacity=65&${reviewCamera}&debug=closed`,
    privacy: 'local-only',
    note: 'LOCAL ONLY：1944 single-year actual mosaic bounds。',
  },
  {
    name: 'GEO_03_1945',
    query: `?historical=H2&aerial=local&environment=P2&time=T2&weather=W0&opacity=65&${reviewCamera}&debug=closed`,
    privacy: 'local-only',
    note: 'LOCAL ONLY：1945 single-year actual mosaic bounds。',
  },
  {
    name: 'GEO_04_1958',
    query: `?historical=H3&aerial=local&environment=P2&time=T2&weather=W0&opacity=65&${reviewCamera}&debug=closed`,
    privacy: 'local-only',
    note: 'LOCAL ONLY：1958 missing-data fallback／actual mosaic bounds。',
  },
  {
    name: 'GEO_05_SMART',
    query: `?historical=H4&aerial=local&environment=P2&time=T2&weather=W0&opacity=65&${reviewCamera}&debug=closed`,
    privacy: 'local-only',
    note: 'LOCAL ONLY：1944/1945 smart composite on common geographic grid。',
  },
  {
    name: 'GEO_06_SMART_ENVIRONMENT',
    query: `?historical=H7&aerial=local&environment=P3&time=T0&weather=W1&opacity=65&${reviewCamera}&debug=closed`,
    privacy: 'local-only',
    note: 'LOCAL ONLY：smart composite × P3 environment × fixed review camera。',
  },
  {
    name: 'GEO_COVERAGE',
    query: `?historical=H0&environment=P0&time=T0&weather=W0&coverage=on&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: '安全 KML declared coverage outline；未載入航照 pixels。',
  },
  {
    name: 'GEO_SOURCE_MAP',
    query: `?historical=H4&aerial=local&environment=P3&mode=distribution&time=T0&weather=W1&opacity=65&${reviewCamera}&debug=open`,
    privacy: 'local-only',
    note: 'LOCAL ONLY：smart source-year mask／distribution review。',
  },
  {
    name: 'GEO_P0',
    query: `?historical=H0&environment=P0&time=T0&weather=W0&${reviewCamera}&debug=open`,
    privacy: 'safe',
    note: '安全 P0 baseline performance。',
  },
  {
    name: 'GEO_P1',
    query: `?historical=H0&environment=P1&time=T0&weather=W1&${reviewCamera}&debug=open`,
    privacy: 'safe',
    note: '安全 P1 enhanced environment performance。',
  },
  {
    name: 'GEO_P2',
    query: `?historical=H6&aerial=local&environment=P2&time=T2&weather=W0&opacity=65&${reviewCamera}&debug=open`,
    privacy: 'local-only',
    note: 'LOCAL ONLY：P2 aerial/relief performance。',
  },
  {
    name: 'GEO_P3',
    query: `?historical=H7&aerial=local&environment=P3&time=T0&weather=W1&opacity=65&${reviewCamera}&debug=open`,
    privacy: 'local-only',
    note: 'LOCAL ONLY：P3 aerial/environment performance。',
  },
  {
    name: 'GEO_CLOUD_T0',
    query: `?historical=H7&aerial=local&environment=P3&time=T0&weather=W1&opacity=65&${reviewCamera}&debug=closed`,
    privacy: 'local-only',
    note: 'LOCAL ONLY：Cloud T0 with georeferenced smart aerial。',
  },
  {
    name: 'GEO_CLOUD_T1',
    query: `?historical=H7&aerial=local&environment=P3&time=T1&weather=W1&opacity=65&${reviewCamera}&debug=closed`,
    privacy: 'local-only',
    note: 'LOCAL ONLY：Cloud T1/dawn with georeferenced smart aerial。',
  },
  {
    name: 'GEO_OCEAN_BEFORE',
    query: `?historical=H0&environment=P0&time=T0&weather=W0&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: '安全 Ocean before／P0 baseline。',
  },
  {
    name: 'GEO_OCEAN_AFTER',
    query: `?historical=H0&environment=P1&time=T0&weather=W1&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: '安全 Ocean after／P1 enhanced environment。',
  },
  {
    name: 'GEO_DAYLIGHT_T0',
    query: `?historical=H0&environment=P1&time=T0&weather=W1&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: '安全 unified daylight T0。',
  },
  {
    name: 'GEO_DAWN_T1',
    query: `?historical=H0&environment=P1&time=T1&weather=W1&${reviewCamera}&debug=closed`,
    privacy: 'safe',
    note: '安全 battlefield dawn T1。',
  },
];

function capture(shot) {
  const outputDir = shot.privacy === 'safe' ? safeDir : localDir;
  const screenshot = path.join(outputDir, shot.name + '.png');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-1949-gate-a3p2-'));
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
  gate: 'GATE A.3P.2 — READY FOR GEOREFERENCE REVIEW',
};
fs.writeFileSync(path.join(safeDir, 'manifest.json'), JSON.stringify({
  ...common,
  privacy: 'safe screenshots only; local-only screenshots remain ignored',
  screenshots: results.filter(item => item.privacy === 'safe'),
}, null, 2) + '\n');
fs.writeFileSync(path.join(localDir, 'manifest.json'), JSON.stringify({
  ...common,
  privacy: 'LOCAL ONLY — do not publish; screenshots contain rights-unclear Kinmen aerial pixels',
  screenshots: results.filter(item => item.privacy === 'local-only'),
}, null, 2) + '\n');
