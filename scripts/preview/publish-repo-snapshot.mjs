import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const artifacts = path.resolve(root, process.env.VISUAL_ARTIFACT_DIR ?? 'artifacts/visual-acceptance');
const destination = path.resolve(root, 'docs/preview/current');
const selectedNames = [
  'desktop-1440x900-homepage.png',
  'desktop-1440x900-then-now-overview.png',
  'desktop-1440x900-then-now-images.png',
  'desktop-1440x900-map.png',
  'mobile-390x844-homepage.png',
  'mobile-390x844-map.png',
  'desktop-1440x900-location-detail.png',
];

function gitValue(args) {
  try { return execFileSync('git', args, { encoding: 'utf8' }).trim(); } catch { return 'unknown'; }
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

const allPngs = await walk(artifacts).catch(() => []);
const byName = new Map(allPngs.map((file) => [path.basename(file), file]));
const missing = selectedNames.filter((name) => !byName.has(name));
if (missing.length > 0) throw new Error(`Missing selected screenshots: ${missing.join(', ')}`);

await fs.rm(destination, { recursive: true, force: true });
await fs.mkdir(destination, { recursive: true });
for (const name of selectedNames) await fs.copyFile(byName.get(name), path.join(destination, name));

const metadata = {
  schemaVersion: 1,
  commitSha: process.env.PREVIEW_COMMIT_SHA || process.env.GITHUB_SHA || gitValue(['rev-parse', 'HEAD']),
  branch: process.env.PREVIEW_BRANCH || process.env.GITHUB_REF_NAME || gitValue(['branch', '--show-current']),
  previewUrl: process.env.PREVIEW_BASE_URL || 'not configured',
  capturedAt: new Date().toISOString(),
  source: 'Playwright visual acceptance artifact; selected PNGs only',
  screenshots: selectedNames,
};
await fs.writeFile(path.join(destination, 'manifest.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
let acceptance = {};
try {
  acceptance = JSON.parse(await fs.readFile(path.join(artifacts, 'acceptance-manifest.json'), 'utf8'));
} catch {
  // A local snapshot can still be published when report generation was skipped.
}
const lines = [
  '# Current visual snapshot',
  '',
  `- Commit: \`${metadata.commitSha}\``,
  `- Branch: \`${metadata.branch}\``,
  `- Preview URL: ${metadata.previewUrl}`,
  `- Captured: ${metadata.capturedAt}`,
  '',
  ...selectedNames.map((name) => `![${name}](${name})`),
  '',
  '[Commit-bound acceptance report](./ACCEPTANCE_REPORT.md)',
  '',
  'These are selected review images only. The complete per-run set remains in the GitHub Actions artifact.',
  '',
];
await fs.writeFile(path.join(destination, 'README.md'), lines.join('\n'), 'utf8');
const reportLines = [
  '# Commit-bound visual acceptance',
  '',
  '| Field | Value |',
  '| --- | --- |',
  `| Status | **${acceptance.status ?? 'NOT RUN'}** |`,
  `| Commit | \`${acceptance.commitSha ?? metadata.commitSha}\` |`,
  `| Branch | \`${acceptance.branch ?? metadata.branch}\` |`,
  `| Preview URL | ${acceptance.previewUrl ?? metadata.previewUrl} |`,
  `| Generated | ${acceptance.generatedAt ?? metadata.capturedAt} |`,
  '| Viewports | 1440×900 · 768×1024 · 390×844 |',
  `| Tests | ${acceptance.testCount ?? '—'} total · ${acceptance.failedCount ?? '—'} failed |`,
  '',
  '## Selected screenshots',
  '',
  ...selectedNames.map((name) => `- [${name}](./${name})`),
  '',
  'The full Playwright HTML/JSON report and all viewport screenshots are retained in the matching GitHub Actions artifact. A remote PASS additionally requires an HTTPS preview URL and commit-matching `preview-metadata.json`.',
  '',
];
await fs.writeFile(path.join(destination, 'ACCEPTANCE_REPORT.md'), reportLines.join('\n'), 'utf8');
console.log(`Published ${selectedNames.length} selected screenshots to ${path.relative(root, destination)}`);
