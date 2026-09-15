import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const chrome = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const root = path.resolve('.');
const baseUrl = 'http://localhost:4321/1949-guningtou/v2/region/';
const outputDir = path.resolve('docs/2.0/screenshots/gate-a2');
fs.mkdirSync(outputDir, { recursive: true });

const shots = [
  ['A2_WIDE', 'a2-wide'],
  ['A2_XIAMEN', 'a2-xiamen'],
  ['A2_KINMEN', 'a2-kinmen'],
  ['A2_GUNINGTOU', 'a2-guningtou'],
  ['A2_ROTATED_WIDE', 'a2-rotated-wide'],
];

function fileUrl(file) {
  return 'file:///' + file.replace(/\\/g, '/');
}

function capture(name, composition) {
  const screenshot = path.join(outputDir, name + '.png');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-1949-gate-a2-'));
  const url = baseUrl + '?composition=' + encodeURIComponent(composition) + '&debug=closed';
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
    '--user-data-dir=' + profile,
    '--screenshot=' + screenshot,
    url,
  ], { cwd: root, encoding: 'utf8', timeout: 30_000, windowsHide: true });
  fs.rmSync(profile, { recursive: true, force: true });
  if (result.error) throw result.error;
  if (result.status !== 0 || !fs.existsSync(screenshot)) {
    throw new Error('Chrome screenshot failed for ' + name + ': ' + (result.stderr || result.stdout || result.status));
  }
  process.stdout.write(name + ': ' + screenshot + ' (' + fs.statSync(screenshot).size + ' bytes)\n');
}

for (const [name, composition] of shots) capture(name, composition);

const previousWide = path.resolve('docs/2.0/screenshots/gate-a1/B_WIDE_1_5X.png');
const currentWide = path.join(outputDir, 'A2_WIDE.png');
if (!fs.existsSync(previousWide) || !fs.existsSync(currentWide)) {
  throw new Error('Before/after screenshots are missing.');
}
const comparisonHtml = [
  '<!doctype html>',
  '<meta charset="utf-8">',
  '<title>Gate A.2 regional composition comparison</title>',
  '<style>',
  '* { box-sizing: border-box; }',
  'html, body { margin: 0; background: #0d1515; color: #e7e4d7; }',
  'body { width: 1920px; height: 1080px; padding: 36px 44px; font-family: "Cascadia Mono", "IBM Plex Mono", monospace; }',
  'header { display: flex; justify-content: space-between; align-items: end; border-bottom: 1px solid rgba(225,220,194,.22); padding-bottom: 16px; }',
  'h1 { margin: 0; color: #d5b877; font: 400 27px Georgia, serif; letter-spacing: .04em; }',
  'header p { margin: 0; color: #98a29a; font-size: 11px; letter-spacing: .13em; }',
  'main { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; }',
  'article { border: 1px solid rgba(225,220,194,.22); background: #111a1a; }',
  'h2 { display: flex; justify-content: space-between; margin: 0; padding: 13px 15px 11px; color: #f2d89c; font-size: 14px; font-weight: 500; letter-spacing: .12em; }',
  'h2 small { color: #98a29a; font-size: 10px; font-weight: 400; letter-spacing: .06em; }',
  'figure { margin: 0; border-top: 1px solid rgba(225,220,194,.14); }',
  'figure img { display: block; width: 100%; height: 815px; object-fit: cover; object-position: top; }',
  'figcaption { display: flex; justify-content: space-between; padding: 12px 15px 14px; color: #98a29a; font-size: 10px; line-height: 1.35; letter-spacing: .05em; }',
  'figcaption b { color: #e7e4d7; font-weight: 400; }',
  'footer { margin-top: 19px; color: #667773; font-size: 10px; letter-spacing: .10em; }',
  '</style>',
  '<header><h1>GATE A.2 — REGIONAL COMPOSITION / INFINITE OCEAN</h1><p>ACTUAL CHROME SCREENSHOTS / FIXED STRATEGIC VIEW</p></header>',
  '<main>',
  '<article><h2>PREVIOUS / GATE A.1 B <small>512×256 · 1.5×</small></h2><figure><img src="' + fileUrl(previousWide) + '"><figcaption><span>Bounds <b>117.97–118.58E / 24.34–24.65N</b></span><span>Finite plane <b>present</b></span></figcaption></figure></article>',
  '<article><h2>NEW / GATE A.2 B <small>640×368 · 1.5×</small></h2><figure><img src="' + fileUrl(currentWide) + '"><figcaption><span>Bounds <b>117.84–118.60E / 24.28–24.72N</b></span><span>Atmospheric shell <b>active</b></span></figcaption></figure></article>',
  '</main>',
  '<footer>NO IMAGE RETOUCHING OR GEOGRAPHIC POSTPROCESSING — BOTH PANELS ARE BROWSER OUTPUTS.</footer>',
].join('\n');
const comparisonHtmlPath = path.join(os.tmpdir(), 'codex-1949-gate-a2-comparison.html');
const comparisonPng = path.join(outputDir, 'GATE_A2_COMPARISON.png');
fs.writeFileSync(comparisonHtmlPath, comparisonHtml);
const comparisonProfile = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-1949-gate-a2-comparison-'));
const comparisonResult = spawnSync(chrome, [
  '--headless=new',
  '--no-sandbox',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1920,1080',
  '--run-all-compositor-stages-before-draw',
  '--virtual-time-budget=3000',
  '--disable-extensions',
  '--no-first-run',
  '--allow-file-access-from-files',
  '--user-data-dir=' + comparisonProfile,
  '--screenshot=' + comparisonPng,
  fileUrl(comparisonHtmlPath),
], { cwd: root, encoding: 'utf8', timeout: 30_000, windowsHide: true });
fs.rmSync(comparisonProfile, { recursive: true, force: true });
fs.rmSync(comparisonHtmlPath, { force: true });
if (comparisonResult.error) throw comparisonResult.error;
if (comparisonResult.status !== 0 || !fs.existsSync(comparisonPng)) {
  throw new Error('Comparison screenshot failed: ' + (comparisonResult.stderr || comparisonResult.stdout || comparisonResult.status));
}
process.stdout.write('GATE_A2_COMPARISON: ' + comparisonPng + ' (' + fs.statSync(comparisonPng).size + ' bytes)\n');
