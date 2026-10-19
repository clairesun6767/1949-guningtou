const previewUrl = (process.argv[2] || process.env.PREVIEW_BASE_URL || '').replace(/\/+$/, '');
const expectedSha = process.argv[3] || process.env.PREVIEW_COMMIT_SHA || '';
const metadataPath = process.env.PREVIEW_METADATA_PATH || '/1949-guningtou/preview-metadata.json';
const timeoutMs = Number(process.env.PREVIEW_WAIT_TIMEOUT_MS || 600_000);
const intervalMs = Number(process.env.PREVIEW_WAIT_INTERVAL_MS || 5_000);

if (!previewUrl) throw new Error('A preview URL is required. Set PREVIEW_BASE_URL or pass it as the first argument.');
const parsed = new URL(previewUrl);
if (process.env.CI && parsed.protocol !== 'https:') {
  throw new Error(`Remote acceptance requires HTTPS; received ${parsed.protocol}`);
}

const target = `${previewUrl}${metadataPath.startsWith('/') ? metadataPath : `/${metadataPath}`}`;
const deadline = Date.now() + timeoutMs;
let lastMessage = 'not reached';

while (Date.now() < deadline) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(intervalMs * 2, 20_000));
  try {
    const response = await fetch(target, { signal: controller.signal, headers: { accept: 'application/json' } });
    if (response.ok) {
      const metadata = await response.json();
      if (!expectedSha || metadata.commitSha === expectedSha) {
        console.log(`Preview ready: ${previewUrl}`);
        console.log(JSON.stringify(metadata));
        if (process.env.GITHUB_OUTPUT) {
          const fs = await import('node:fs/promises');
          await fs.appendFile(process.env.GITHUB_OUTPUT, `preview_url=${previewUrl}\ncommit_sha=${metadata.commitSha}\n`, 'utf8');
        }
        process.exit(0);
      }
      lastMessage = `served commit ${metadata.commitSha}, waiting for ${expectedSha}`;
    } else {
      lastMessage = `HTTP ${response.status}`;
    }
  } catch (error) {
    lastMessage = error instanceof Error ? error.message : String(error);
  } finally {
    clearTimeout(timer);
  }
  console.log(`Waiting for preview metadata (${lastMessage})`);
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}

throw new Error(`Preview did not serve commit ${expectedSha || '(any)'} within ${timeoutMs}ms: ${target}`);
