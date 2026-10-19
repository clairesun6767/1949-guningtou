# Independent preview setup checklist

## Astro contract

- `site`: `https://clairesun6767.github.io`
- `base`: `/1949-guningtou`
- `output`: `static`
- preview build: `npm run build:preview`
- publish directory: `dist`
- metadata: `/1949-guningtou/preview-metadata.json`

The base path is intentionally preserved. A preview origin is only the host, such as `https://branch.project.pages.dev`; page URLs include `/1949-guningtou/`.

## Cloudflare Pages Git integration

Use a separate Pages project from the existing GitHub Pages site. Set `main` as production and allow the feature branch as a preview branch. Cloudflare's Git integration updates the branch preview on subsequent pushes and leaves the production project untouched.

The GitHub Actions workflow does not deploy Pages. It waits for the Pages branch alias to serve the same SHA and then runs browser acceptance. This separation makes a stale preview visible as a failed SHA check instead of silently testing an older page.

## Artifact contract

Each run uploads:

- `ACCEPTANCE_REPORT.md`;
- `acceptance-manifest.json`;
- Playwright JSON and HTML reports;
- full viewport screenshots;
- traces only when a test fails;
- the build's `preview-metadata.json`.

Artifact names include the commit SHA. The report also links to the exact Actions run.

## Public-output safety

`npm run preview:guard` retains only the explicitly approved `public/.local/aerial-poc` low-resolution bundle after checking its manifest, removes research-only KML/Xiamen directories, and rejects environment files, cache/attachment directories, raw DEM/GIS extensions, and other forbidden paths. The root `.local/aerial-poc` remains development-only and is never copied by the static build. This guard runs before both local preview review and the remote Pages build.

Do not add private source material to `public/` and rely on `.gitignore` alone: ignored files can still be copied by a static build. Keep source caches outside the published tree or add an explicit guard rule.

## External verification policy

Remote acceptance requires HTTPS and a commit-matching metadata file. The local server is useful for development but cannot mark a remote preview PASS. The workflow also checks the same preview origin from Ubuntu and Windows runners and records both results as artifacts. Reviewers should open the preview from at least two network/browser contexts when available; if a platform blocks an automated browser, use the commit-bound GitHub artifact plus the checked-in selected snapshot.
