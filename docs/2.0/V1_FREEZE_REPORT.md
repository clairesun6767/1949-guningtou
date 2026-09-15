# V1 Freeze Report

## Frozen baseline

- Branch: `feature/battlefield-engine`
- Commit: `d4eefed59fc8a7fe1754d79b169ef39d8682a2c9`
- Tag: `v1.3-frozen`
- Tag object: `1e523b181cd644f12bed133f0d8294423ab8f68a1`
- Tag message: `1949 Guningtou 1.x frozen baseline before 2.0 Art Direction development`
- Remote: `origin` → `https://github.com/clairesun6767/1949-guningtou.git`
- Remote sync: normal push succeeded; `origin/feature/battlefield-engine` resolved to `d4eefed`.
- V1.2 checkpoint: `00c184a172b04e8dec77679d12aa99b012890cd4`
- V1.1 remote checkpoint: `030c5e5d0eea50d9066214a0d4e53efffc81f92b`

## Baseline checks

| Check | Result | Evidence |
| --- | --- | --- |
| Validation | PASS | `npm run validate:battle-data`; 0 errors; existing calibration warnings retained as warnings |
| Tests | PASS | `npm run test:battle-data`; 71/71 passed |
| Typecheck | PASS | `npm run typecheck`; 129 files, 0 errors, 0 warnings, 0 hints |
| Astro build | PASS | `npm run build`; 279 pages built |

Timestamp: 2026-09-15 12:49 (Asia/Taipei).

The frozen branch and tag are preserved. No reset, rebase, force push, history deletion, canonical-data rewrite, or `main` modification was performed.
