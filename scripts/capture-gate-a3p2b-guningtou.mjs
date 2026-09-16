import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const chrome = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const root = path.resolve('.');
const baseUrl = 'http://localhost:4321/1949-guningtou/v2/region/';
const safeDir = path.resolve('docs/2.0/screenshots/gate-a3p2b');
const localDir = path.resolve('.local/aerial-poc/screenshots/gate-a3p2b');
const camera = 'geo_review_guningtou_01';
const years = [
  { year: 1944, historical: 'H1' },
  { year: 1945, historical: 'H2' },
  { year: 1958, historical: 'H3' },
];
const zooms = [15, 16, 17];

fs.mkdirSync(safeDir, { recursive: true });
fs.mkdirSync(localDir, { recursive: true });

const safeShot = {
  name: 'GUNINGTOU_TILE_GRID_Z17',
  query: '?historical=H0&environment=P0&time=T0&weather=W0&aerialZoom=17&aerialDebug=tile&camera=' + camera + '&debug=closed',
  privacy: 'safe',
  note: 'Metadata-only higher-zoom XYZ grid. No local aerial asset is requested.',
};

const shots = [
  safeShot,
  ...years.flatMap(({ year, historical }) => zooms.map(zoom => ({
    name: 'GUNINGTOU_' + year + '_Z' + zoom,
    query: '?historical=' + historical + '&aerial=local&aerialZoom=' + zoom + '&year=' + year + '&mode=single&opacity=65&aerialDebug=tile&camera=' + camera + '&debug=closed',
    privacy: 'local-only',
    note: year + ' single-year local-only review at z' + zoom + '; smart composite disabled.',
  }))),
];

function capture(shot) {
  const outputDir = shot.privacy === 'safe' ? safeDir : localDir;
  const screenshot = path.join(outputDir, shot.name + '.png');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-1949-gate-a3p2b-'));
  const result = spawnSync(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1920,1080',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=10000',
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
const safeResults = results.filter(item => item.privacy === 'safe');
const localResults = results.filter(item => item.privacy === 'local-only');

fs.writeFileSync(path.join(safeDir, 'manifest.json'), JSON.stringify({
  generatedAt,
  gate: 'A.3P.2b',
  camera: 'GEO_REVIEW_GUNINGTOU_01',
  privacy: 'safe metadata screenshot only; no aerial pixels',
  screenshots: safeResults,
}, null, 2) + '\n');

fs.writeFileSync(path.join(localDir, 'manifest.json'), JSON.stringify({
  generatedAt,
  gate: 'A.3P.2b',
  camera: 'GEO_REVIEW_GUNINGTOU_01',
  privacy: 'LOCAL ONLY — rights-unclear aerial pixels are ignored by Git',
  smartComposite: false,
  screenshots: localResults,
}, null, 2) + '\n');
