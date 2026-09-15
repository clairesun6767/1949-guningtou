# 1949 2.0 Art Direction Plan

This document freezes the 2.0 workstream boundary for the prototype branch. Only WS1 / Gate A has executable implementation in this milestone.

## WS1 — REGION

**Purpose:** Geographic Relationship.

**Scope:** Xiamen, Kinmen, Lieyu, surrounding relevant islands, and surrounding sea.

**Gate A direction:** Cinematic Strategic Terrain — a high-quality military strategic sand table × historical-map sensibility × cinematic light. The implementation uses a real-time Three.js DEM mesh, coastline mask, procedural material, lightweight ocean shader, lighting, atmosphere, constrained camera, labels, and performance instrumentation.

## WS2 — BATTLEFIELD

**Purpose:** Battle Routes / Timeline / Units / Events.

**Future scope:** Nanshan, Beishan, Lincuo, Guningtou coast, Longkou, and the main battle area.

**Milestone status:** Placeholder only. Gate A's `ENTER BATTLEFIELD` action flies the camera toward Guningtou and reports `BATTLEFIELD PROTOTYPE — NOT LOADED`; it does not load routes, units, timeline, or canonical events.

## WS3 — VILLAGE

**Purpose:** Interactive Historical Scene.

**Future research:** Photo-to-3D, photogrammetry, AI 3D, GLB, and modular Kinmen buildings.

**Candidate assets:** Erheyuan, sanheyuan, historic houses, damaged houses, stone walls, bunkers, trenches, rail-beam obstacles, roads, and battle damage.

**Milestone status:** Placeholder only. No building, photo, village, or battlefield-detail asset is preloaded by Gate A.

## WS4 — UI

**Purpose:** One consistent Digital Battlefield Experience from REGION → BATTLEFIELD → VILLAGE → EVENT.

**Milestone status:** Gate A provides only the Region art-review shell, camera controls, visual variants, debug panel, and a non-loading Battlefield placeholder. It does not start the 2.0 website migration or change the existing 279-page UI.

## Gate A acceptance boundary

- Real browser Three.js render only.
- At least Xiamen, Kinmen, Lieyu, and Guningtou labels.
- Rotate, zoom, pan, fly-to, reset, and bounded target envelope.
- Progressive stages: shell → terrain → material → ocean/atmosphere → labels.
- HIGH / MEDIUM / LOW tiers.
- Development-only debug instrumentation.
- Browser screenshots must be captured from the running prototype without post-processing.
- Final status remains `READY FOR HUMAN REVIEW` or `NOT READY`; no automated approval is claimed.
