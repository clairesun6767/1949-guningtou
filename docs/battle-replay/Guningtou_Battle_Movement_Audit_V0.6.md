# Guningtou Battle Movement Audit V0.6

## Audit rule

Candidate topology is not historical proof. A feature enters production only when event/source records support the relationship, its geometry is no more precise than that evidence, and source, confidence, provenance, and review status are explicit. `routes.geojson` remains empty because no candidate meets the verified-route threshold.

## R01–R12 decision table

| ID | Historical evidence / source IDs | Start area | End area | Supported precision | Classification | Production status |
| --- | --- | --- | --- | --- | --- | --- |
| R01 | Supplied KML only; no linked event, unit, time, or bibliographic source | Anqi | Beishan | Approximate drawn line only; historical linkage unsupported | RESEARCH_ONLY | Research Mode only; source-traced coordinates retained without recomputation |
| R02 | EVT-0001, EVT-0011, EVT-0029; SRC-0004, SRC-0027 | Longkou landing area | Guningtou settlement area | Broad post-landing expansion | MOVEMENT_CORRIDOR | Approved, merged into MOV-GUN-1025-PLA-INLAND-CORRIDOR |
| R03 | Duplicates R01/R02; no independent evidence | Anqi/landing context | Beishan context | None independently supported | NO_EVIDENCE | Rejected duplicate |
| R04 | EVT-0011, EVT-0029; SRC-0004, SRC-0027 support landing-to-inland relationship, not an Anqi origin | Landing area | Nanshan area | Broad area only | MOVEMENT_CORRIDOR | Approved only as part of the R02 corridor; original line rejected |
| R05 | Route database contains a modern road relation only | Beishan | Lincuo | No historical troop movement precision | NO_EVIDENCE | Rejected |
| R06 | EVT-0011/EVT-0019; SRC-0004, SRC-0027 support battle/convergence around villages | Lincuo area | Guningtou area | General battlefield relationship | MOVEMENT_CORRIDOR | Covered by approved date-level corridors; no separate geometry |
| R07 | EVT-0019 and TIM-0089/TIM-0090 broadly support northward contraction, but candidate duplicates R11 | Village battle area | North coast | Broad retreat area | MOVEMENT_CORRIDOR | Rejected as duplicate; represented once by R11-derived corridor |
| R08 | EVT-0004, EVT-0017, TIM-0080, TIM-0081; SRC-0004, SRC-0027 | Putou area | Lincuo / Guningtou | General attack direction | ATTACK_AXIS | Approved as MOV-GUN-1026-ROC-COUNTERATTACK-AXIS |
| R09 | Assumed eastern origin; duplicates the R08 relationship | Unsupported eastern origin | Guningtou | Start unsupported | NO_EVIDENCE | Rejected |
| R10 | No traceable event/source establishes the proposed direction | Unverified | Unverified | None | NO_EVIDENCE | Rejected |
| R11 | EVT-0019, TIM-0089, TIM-0090, TIM-0093; SRC-0004, SRC-0027 | Lincuo / Nanshan / Guningtou | Northern cliff coast | Broad contraction envelope | MOVEMENT_CORRIDOR | Approved as MOV-GUN-1026-PLA-NORTH-RETREAT-CORRIDOR |
| R12 | Records establish battle outcome, not a new movement | Final battle area | — | No movement geometry supported | NO_EVIDENCE | Rejected |

## Additional reviewed feature

The first-echelon approach to Longkou is represented by `MOV-GUN-1025-PLA-LANDING-AXIS`. EVT-0001, EVT-0010, and EVT-0029 support an offshore-to-coast relationship. The broad arrow is deliberately generalized and is not a vessel track.

## Counts and non-inflation

- Production verified routes: 0
- Production movement corridors: 2
- Production attack axes: 2
- Research-only geometries: 1
- Rejected original candidates: 6 (R03, R05, R07 duplicate, R09, R10, R12)

R04 and R06 are not counted as additional displayed features because their support is already represented by a broader approved corridor. This avoids double-counting evidence and duplicate geometry.
