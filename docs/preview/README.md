# Remote preview and visual acceptance

This is the repository index for the reusable preview contract. The production GitHub Pages workflows remain unchanged; preview validation runs against an independent HTTPS deployment and never treats `localhost` as remote evidence.

## Current review snapshot

The checked-in selected images for the latest explicitly published review are in [`current/`](./current/). The complete screenshot set and Playwright HTML/JSON report are uploaded by the [`Remote preview visual acceptance` workflow](../../actions/workflows/visual-preview.yml) as an artifact named `visual-acceptance-<commit-sha>`.

Every report records:

- exact Git commit SHA and branch;
- HTTPS preview origin and metadata endpoint;
- UTC test time and GitHub Actions run URL;
- the three viewport projects: 1440×900, 768×1024, and 390×844;
- screenshots for the homepage, all five then-and-now sections, map, and location detail;
- image loading, horizontal overflow, same-origin HTTP errors, JavaScript errors, and interaction checks.

## Chosen remote host

The preferred host is Cloudflare Pages Git integration. Connect this repository as a Pages project, keep `main` as the production branch, enable preview deployments for `feature/guningtou-then-now-v2` (or all non-production branches), set the build command to `npm run build:preview`, and set the output directory to `dist`.

The only repository-side value needed by the acceptance workflow is the Actions repository variable `CLOUDFLARE_PAGES_PREVIEW_BASE_URL`, containing the HTTPS origin of the selected branch preview, for example `https://<branch>.<project>.pages.dev`. The test appends `/1949-guningtou/` itself. Do not put tokens in the repository; Git integration authorization is performed in Cloudflare's dashboard.

Cloudflare Pages creates a branch alias that follows later commits without changing the production deployment. The workflow waits for `/1949-guningtou/preview-metadata.json` to report the exact current commit before Playwright starts.

## One-time operator action

1. In Cloudflare Pages, connect `clairesun6767/1949-guningtou` through GitHub and authorize repository access.
2. Set production branch to `main`; enable preview deployments for the feature branch.
3. Set the Pages build command to `npm run build:preview` and output directory to `dist`.
4. Add the resulting HTTPS branch-preview origin as the GitHub Actions repository variable `CLOUDFLARE_PAGES_PREVIEW_BASE_URL`.

No `main` merge, DNS change, Cloudflare API token, or GitHub Pages setting change is required.

## Local usage

```text
npm run visual:acceptance:local
npm run visual:report
npm run visual:snapshot
```

`visual:acceptance:local` builds a sanitized `dist`, starts Astro preview through Playwright, and writes artifacts under `artifacts/visual-acceptance`. `visual:snapshot` is an explicit human-reviewed action: it copies only selected PNG screenshots into `docs/preview/current/`; it does not copy source media, research files, credentials, or raw geospatial data. The preview guard keeps only the manifest-approved low-resolution aerial POC already marked for public repository review.

## Provider decision and fallback

Cloudflare Pages was chosen over Netlify for this repository because its Git integration supplies preview deployments and branch aliases for non-production branches without adding a deploy token or site ID to GitHub Actions. Netlify remains a valid fallback: connect the repository, enable a branch deploy or Deploy Preview context, and point its build command to `npm run build:preview` with `dist` as publish directory. Netlify Deploy Preview URLs are tied to pull requests; branch deploys are tied to persistent branches, so the latter is the closer match for this feature branch.

## Reuse by AI Lover

The contract is framework-neutral:

- build a static preview into `dist` (or set the output directory in one project variable);
- emit `preview-metadata.json` with `commitSha`, `branch`, `builtAt`, `basePath`, and `previewUrl`;
- run the same Playwright projects and health checks against an HTTPS `PREVIEW_BASE_URL`;
- upload screenshots and JSON/HTML reports as Actions artifacts;
- use `visual:snapshot` only after reviewing the public-safe screenshot set.

For React/Vite, keep the app base and asset paths aligned with the preview origin and point the same config at the Vite output directory. Android Web UI can reuse the browser contract; an Android native APK must have a separate emulator or real-device test job. Browser screenshots are never an APK acceptance substitute.
