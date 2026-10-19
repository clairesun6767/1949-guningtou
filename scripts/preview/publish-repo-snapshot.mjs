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
  commitSha: process.env.PREVIEW_COMMIT_SHA || process.env.GITHUB_SHA || 'unknown',
  branch: process.env.PREVIEW_BRANCH || process.env.GITHUB_REF_NAME || 'unknown',
  previewUrl: process.env.PREVIEW_BASE_URL || 'not configured',
  capturedAt: new Date().toISOString(),
  source: 'Playwright visual acceptance artifact; selected PNGs only',
  screenshots: selectedNames,
};
await fs.writeFile(path.join(destination, 'manifest.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
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
  'These are selected review images only. The complete per-run set remains in the GitHub Actions artifact.',
  '',
];
await fs.writeFile(path.join(destination, 'README.md'), lines.join('\n'), 'utf8');
console.log(`Published ${selectedNames.length} selected screenshots to ${path.relative(root, destination)}`);
