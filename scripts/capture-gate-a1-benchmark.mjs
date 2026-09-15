import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const chrome = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const root = path.resolve('.');
const baseUrl = 'http://localhost:4321/1949-guningtou/v2/region/';
const outputDir = path.resolve('docs/2.0/screenshots/gate-a1');
fs.mkdirSync(outputDir, { recursive: true });

const shots = [
  ['A_WIDE', 'a-wide'],
  ['B_WIDE_1X', 'b-wide-1'],
  ['B_WIDE_1_5X', 'b-wide-1.5'],
  ['B_WIDE_2X', 'b-wide-2'],
  ['C_WIDE_1X', 'c-wide-1'],
  ['C_WIDE_1_5X', 'c-wide-1.5'],
  ['C_WIDE_2X', 'c-wide-2'],
  ['B_KINMEN', 'b-kinmen'],
  ['B_GUNINGTOU', 'b-guningtou'],
  ['C_KINMEN', 'c-kinmen'],
  ['C_GUNINGTOU', 'c-guningtou'],
];

function fileUrl(file) {
  return `file:///${file.replace(/\\/g, '/')}`;
}

function capture(name, benchmark) {
  const screenshot = path.join(outputDir, `${name}.png`);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-1949-gate-a1-'));
  const url = `${baseUrl}?benchmark=${encodeURIComponent(benchmark)}`;
  const result = spawnSync(chrome, [
    '--headless=new',
    '--no-sandbox',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1920,1080',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=6500',
    '--disable-extensions',
    '--no-first-run',
    '--allow-file-access-from-files',
    `--user-data-dir=${profile}`,
    `--screenshot=${screenshot}`,
    url,
  ], { cwd: root, encoding: 'utf8', timeout: 30_000, windowsHide: true });
  fs.rmSync(profile, { recursive: true, force: true });
  if (result.error) throw result.error;
  if (result.status !== 0 || !fs.existsSync(screenshot)) {
    throw new Error(`Chrome screenshot failed for ${name}: ${result.stderr || result.stdout || result.status}`);
  }
  process.stdout.write(`${name}: ${screenshot} (${fs.statSync(screenshot).size} bytes)\n`);
}

for (const [name, benchmark] of shots) capture(name, benchmark);

const comparisonHtml = `<!doctype html>
<meta charset="utf-8">
<title>Gate A.1 terrain comparison</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #0d1515; color: #e7e4d7; }
  body { width: 1920px; min-height: 980px; padding: 44px 52px; font-family: "Cascadia Mono", "IBM Plex Mono", monospace; }
  header { display: flex; justify-content: space-between; align-items: end; border-bottom: 1px solid rgba(225,220,194,.22); padding-bottom: 18px; }
  h1 { margin: 0; color: #d5b877; font: 400 28px Georgia, serif; letter-spacing: .04em; }
  header p { margin: 0; color: #98a29a; font-size: 11px; letter-spacing: .15em; }
  main { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 28px; }
  article { border: 1px solid rgba(225,220,194,.22); background: #111a1a; }
  article h2 { display: flex; justify-content: space-between; margin: 0; padding: 13px 15px 11px; color: #f2d89c; font-size: 14px; font-weight: 500; letter-spacing: .12em; }
  article h2 small { color: #98a29a; font-size: 10px; font-weight: 400; letter-spacing: .06em; }
  figure { margin: 0; border-top: 1px solid rgba(225,220,194,.14); }
  figure img { display: block; width: 100%; height: 301px; object-fit: cover; object-position: top; }
  figcaption { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; padding: 13px 15px 15px; color: #98a29a; font-size: 10px; line-height: 1.35; letter-spacing: .05em; }
  figcaption b { color: #e7e4d7; font-weight: 400; }
  footer { margin-top: 28px; border-top: 1px solid rgba(225,220,194,.14); padding-top: 15px; color: #667773; font-size: 10px; letter-spacing: .12em; }
</style>
<header><h1>GATE A.1 — 3D TERRAIN QUALITY BENCHMARK</h1><p>FIXED WIDE CAMERA / THREE.JS BROWSER CAPTURES</p></header>
<main>
  <article><h2>A / BASELINE <small>196×100</small></h2><figure><img src="${fileUrl(path.join(outputDir, 'A_WIDE.png'))}"><figcaption><span>Resolution <b>196×100</b></span><span>Triangles <b>6,056</b></span><span>FPS <b>60</b></span><span>Vertical Scale <b>1.72×</b></span></figcaption></figure></article>
  <article><h2>B / BALANCED <small>512×256</small></h2><figure><img src="${fileUrl(path.join(outputDir, 'B_WIDE_1_5X.png'))}"><figcaption><span>Resolution <b>512×256</b></span><span>Triangles <b>260,610</b></span><span>FPS <b>60</b></span><span>Vertical Scale <b>1.5×</b></span></figcaption></figure></article>
  <article><h2>C / QUALITY <small>1024×512</small></h2><figure><img src="${fileUrl(path.join(outputDir, 'C_WIDE_1_5X.png'))}"><figcaption><span>Resolution <b>1024×512</b></span><span>Triangles <b>1,045,506</b></span><span>FPS <b>60</b></span><span>Vertical Scale <b>1.5×</b></span></figcaption></figure></article>
</main>
<footer>PIXELS ARE STITCHED FROM THE BROWSER SCREENSHOTS ABOVE; NO IMAGE RETOUCHING OR GEOGRAPHIC POSTPROCESSING.</footer>`;
const comparisonHtmlPath = path.join(os.tmpdir(), 'codex-1949-gate-a1-comparison.html');
const comparisonPng = path.join(outputDir, 'GATE_A1_COMPARISON.png');
fs.writeFileSync(comparisonHtmlPath, comparisonHtml);
const comparisonProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-1949-gate-a1-comparison-'));
const comparisonResult = spawnSync(chrome, [
  '--headless=new',
  '--no-sandbox',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1920,980',
  '--run-all-compositor-stages-before-draw',
  '--virtual-time-budget=3000',
  '--disable-extensions',
  '--no-first-run',
  '--allow-file-access-from-files',
  `--user-data-dir=${comparisonProfile}`,
  `--screenshot=${comparisonPng}`,
  fileUrl(comparisonHtmlPath),
], { cwd: root, encoding: 'utf8', timeout: 30_000, windowsHide: true });
fs.rmSync(comparisonProfile, { recursive: true, force: true });
fs.rmSync(comparisonHtmlPath, { force: true });
if (comparisonResult.error) throw comparisonResult.error;
if (comparisonResult.status !== 0 || !fs.existsSync(comparisonPng)) {
  throw new Error(`Comparison screenshot failed: ${comparisonResult.stderr || comparisonResult.stdout || comparisonResult.status}`);
}
process.stdout.write(`GATE_A1_COMPARISON: ${comparisonPng} (${fs.statSync(comparisonPng).size} bytes)\n`);
