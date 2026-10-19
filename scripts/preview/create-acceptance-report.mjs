import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const artifactRoot = path.resolve(process.cwd(), process.env.VISUAL_ARTIFACT_DIR ?? 'artifacts/visual-acceptance');
const resultsPath = path.join(artifactRoot, 'results.json');
const reportPath = path.join(artifactRoot, 'ACCEPTANCE_REPORT.md');
const manifestPath = path.join(artifactRoot, 'acceptance-manifest.json');

function gitValue(args) {
  try { return execFileSync('git', args, { encoding: 'utf8' }).trim(); } catch { return 'unknown'; }
}

async function filesUnder(directory) {
  try { await fs.access(directory); } catch { return []; }
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function collectTests(suite, prefix = []) {
  const rows = [];
  for (const spec of suite?.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const results = test.results ?? [];
      const latest = results.at(-1);
      rows.push({
        title: [...prefix, spec.title].join(' › '),
        project: test.projectName ?? 'unknown',
        status: latest?.status ?? test.status ?? 'unknown',
        durationMs: latest?.duration ?? 0,
      });
    }
  }
  for (const child of suite?.suites ?? []) rows.push(...collectTests(child, [...prefix, suite.title].filter(Boolean)));
  return rows;
}

let results = null;
try { results = JSON.parse(await fs.readFile(resultsPath, 'utf8')); } catch { /* report remains useful when setup fails before Playwright */ }
const tests = (results?.suites ?? []).flatMap((suite) => collectTests(suite));
const screenshots = (await filesUnder(artifactRoot))
  .filter((file) => file.toLowerCase().endsWith('.png'))
  .map((file) => path.relative(artifactRoot, file).split(path.sep).join('/'))
  .sort();
const failed = tests.filter((test) => !['passed', 'skipped'].includes(test.status));
const status = tests.length === 0 ? 'NOT RUN' : failed.length === 0 ? 'PASS' : 'FAIL';
const commitSha = process.env.PREVIEW_COMMIT_SHA || process.env.GITHUB_SHA || gitValue(['rev-parse', 'HEAD']);
const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : null;
const generatedAt = new Date().toISOString();
const previewUrl = process.env.PREVIEW_BASE_URL || 'not configured';

const manifest = {
  schemaVersion: 1,
  status,
  commitSha,
  branch: process.env.PREVIEW_BRANCH || process.env.GITHUB_REF_NAME || gitValue(['branch', '--show-current']),
  previewUrl,
  generatedAt,
  runUrl,
  viewportProjects: ['desktop-1440x900', 'tablet-768x1024', 'mobile-390x844'],
  testCount: tests.length,
  failedCount: failed.length,
  screenshotCount: screenshots.length,
  screenshots,
};

await fs.mkdir(artifactRoot, { recursive: true });
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const testTable = tests.length > 0
  ? tests.map((test) => `| ${test.project} | ${test.title} | ${test.status} | ${test.durationMs} ms |`).join('\n')
  : '| — | Playwright did not start | NOT RUN | — |';
const screenshotList = screenshots.length > 0
  ? screenshots.map((file) => `- [${file}](./${file})`).join('\n')
  : '- No screenshots generated.';

const markdown = `# Remote Preview Visual Acceptance

| Field | Value |
| --- | --- |
| Status | **${status}** |
| Commit | \`${commitSha}\` |
| Branch | \`${manifest.branch}\` |
| Preview URL | ${previewUrl} |
| Generated | ${generatedAt} |
| Workflow run | ${runUrl ? `[${runUrl}](${runUrl})` : 'local / not available'} |
| Viewports | 1440×900 · 768×1024 · 390×844 |

## Test results

| Viewport | Test | Status | Duration |
| --- | --- | --- | ---: |
${testTable}

## Screenshots

${screenshotList}

## Safety boundary

This report is generated from the static preview output after the preview publication guard retained only the manifest-approved public low-resolution aerial POC and removed research-only files. It records the commit and preview metadata so a reviewer can distinguish this run from an older deployment. Android APK validation remains a separate emulator/device task; these browser screenshots are not an Android acceptance substitute.
`;

await fs.writeFile(reportPath, markdown, 'utf8');
console.log(`Wrote ${reportPath}`);
