import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const chrome = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const root = path.resolve('.');
const outputDir = path.resolve('docs/2.0/screenshots/gate-a2');
const candidate = path.join(outputDir, 'A2_CANDIDATE_MODERATE.png');
const selected = path.join(outputDir, 'A2_WIDE.png');
const output = path.join(outputDir, 'A2_CANDIDATE_COMPARISON.png');
if (!fs.existsSync(candidate) || !fs.existsSync(selected)) throw new Error('Candidate comparison inputs are missing.');
function fileUrl(file) { return 'file:///' + file.replace(/\\/g, '/'); }
const html = [
  '<!doctype html><meta charset="utf-8"><title>A.2 bounds candidate comparison</title>',
  '<style>*{box-sizing:border-box}html,body{margin:0;background:#0d1515;color:#e7e4d7}body{width:1920px;height:1080px;padding:36px 44px;font-family:monospace}h1{margin:0 0 24px;color:#d5b877;font:400 28px Georgia,serif}main{display:grid;grid-template-columns:1fr 1fr;gap:24px}article{border:1px solid rgba(225,220,194,.24);background:#111a1a}h2{margin:0;padding:14px;color:#f2d89c;font-size:14px;letter-spacing:.1em}img{display:block;width:100%;height:850px;object-fit:cover;object-position:top;border-top:1px solid rgba(225,220,194,.14)}p{margin:0;padding:12px 14px;color:#98a29a;font-size:10px;letter-spacing:.04em}</style>',
  '<h1>GATE A.2 — CANDIDATE BOUNDS BROWSER COMPARE</h1>',
  '<main>',
  '<article><h2>REJECTED / MODERATE</h2><img src="' + fileUrl(candidate) + '"><p>117.90–118.60E / 24.30–24.70N · 592×336 · less west/north mainland context</p></article>',
  '<article><h2>SELECTED / STRATEGIC</h2><img src="' + fileUrl(selected) + '"><p>117.84–118.60E / 24.28–24.72N · 640×368 · stronger west/north relationship</p></article>',
  '</main>',
].join('\n');
const htmlPath = path.join(os.tmpdir(), 'codex-1949-gate-a2-candidate-comparison.html');
fs.writeFileSync(htmlPath, html);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-1949-gate-a2-candidate-compare-'));
const result = spawnSync(chrome, ['--headless=new','--no-sandbox','--hide-scrollbars','--force-device-scale-factor=1','--window-size=1920,1080','--run-all-compositor-stages-before-draw','--virtual-time-budget=3000','--disable-extensions','--no-first-run','--allow-file-access-from-files','--user-data-dir=' + profile,'--screenshot=' + output,fileUrl(htmlPath)], { cwd: root, encoding: 'utf8', timeout: 30_000, windowsHide: true });
fs.rmSync(profile, { recursive: true, force: true });
fs.rmSync(htmlPath, { force: true });
if (result.error) throw result.error;
if (result.status !== 0 || !fs.existsSync(output)) throw new Error('Candidate comparison screenshot failed: ' + (result.stderr || result.stdout || result.status));
process.stdout.write('A2_CANDIDATE_COMPARISON: ' + output + ' (' + fs.statSync(output).size + ' bytes)\n');
