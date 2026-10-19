import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const outputRoot = path.resolve(projectRoot, process.env.PREVIEW_OUTPUT_DIR ?? 'dist');

function gitValue(args) {
  try {
    return execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const commitSha = process.env.PREVIEW_COMMIT_SHA
  || process.env.CF_PAGES_COMMIT_SHA
  || process.env.COMMIT_REF
  || process.env.GITHUB_SHA
  || gitValue(['rev-parse', 'HEAD'])
  || 'unknown';
const branch = process.env.PREVIEW_BRANCH
  || process.env.CF_PAGES_BRANCH
  || process.env.BRANCH
  || process.env.GITHUB_REF_NAME
  || gitValue(['branch', '--show-current'])
  || 'unknown';
const previewUrl = process.env.PREVIEW_BASE_URL
  || process.env.DEPLOY_PRIME_URL
  || process.env.DEPLOY_URL
  || null;

const metadata = {
  schemaVersion: 1,
  commitSha,
  branch,
  builtAt: new Date().toISOString(),
  basePath: '/1949-guningtou',
  outputDirectory: 'dist',
  previewUrl,
  repository: process.env.GITHUB_REPOSITORY || 'clairesun6767/1949-guningtou',
};

await fs.writeFile(path.join(outputRoot, 'preview-metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(metadata));
