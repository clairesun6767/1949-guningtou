import fs from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const outputRoot = path.resolve(projectRoot, process.env.PREVIEW_OUTPUT_DIR ?? 'dist');

const privateDirectories = [
  'research/kinmen-kml',
  'research/xiamen-1943',
];

const forbiddenPatterns = [
  /(^|[\\/])\.env(?:$|[.\\/])/i,
  /(^|[\\/])(?:\.git|\.hermes|\.codex-remote-attachments|node_modules)(?:[\\/]|$)/i,
  /(^|[\\/])\.local(?:[\\/](?!aerial-poc(?:[\\/]|$))|$)/i,
  /(^|[\\/])research[\\/]kinmen-kml(?:[\\/]|$)/i,
  /(^|[\\/])research[\\/]xiamen-1943(?:[\\/]|$)/i,
  /\.(?:dem|hgt|tif|tiff|geotiff|img|asc|bil|vrt|las|laz|gpkg|pbf|mbtiles)$/i,
];

const toRelative = (value) => path.relative(outputRoot, value).split(path.sep).join('/');

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(absolute)));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

await fs.access(outputRoot);

const publicAerialRoot = path.resolve(outputRoot, '.local', 'aerial-poc');
try {
  const manifestPath = path.join(publicAerialRoot, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const approved = manifest.rightsStatus === 'APPROVED'
    && manifest.publication?.status === 'PUBLIC LOW-RES POC'
    && manifest.publication?.authorization
    && Number(manifest.publication?.maximumPublishedZoom) <= 12;
  if (!approved) {
    throw new Error('The published aerial manifest is not explicitly approved for the public low-resolution POC boundary.');
  }
  console.log('Approved public aerial bundle retained: .local/aerial-poc');
} catch (error) {
  if (error?.code === 'ENOENT') {
    // The main site may omit the optional public aerial bundle; absence is safe.
  } else {
    throw new Error(`Public aerial safety check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const removedDirectories = [];
for (const relative of privateDirectories) {
  const absolute = path.resolve(outputRoot, relative);
  const relativeCheck = path.relative(outputRoot, absolute);
  if (relativeCheck.startsWith('..') || path.isAbsolute(relativeCheck)) {
    throw new Error(`Refusing to remove a path outside preview output: ${absolute}`);
  }
  try {
    await fs.rm(absolute, { recursive: true, force: true });
    removedDirectories.push(relative);
  } catch (error) {
    throw new Error(`Could not sanitize ${relative}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const files = await walk(outputRoot);
const forbiddenFiles = files
  .map(toRelative)
  .filter((relative) => forbiddenPatterns.some((pattern) => pattern.test(relative)));

if (forbiddenFiles.length > 0) {
  throw new Error(`Preview output contains forbidden files:\n${forbiddenFiles.join('\n')}`);
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  outputDirectory: 'dist',
  fileCount: files.length,
  removedPrivateDirectories: removedDirectories,
  forbiddenFiles: [],
};

await fs.writeFile(path.join(outputRoot, 'preview-publication-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Preview output verified: ${files.length} files; private directories removed: ${removedDirectories.join(', ') || 'none'}`);
