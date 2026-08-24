# Guningtou Battle Movement Gap Audit V0.7

## Purpose

This is a phase-2 gap audit. It does not replace the R01–R12 decisions in `Guningtou_Battle_Movement_Audit_V0.6.md`, and it does not create production geometry. The table records relationships that remain visually or historically incomplete after the four approved production features are shown.

`routes.geojson` remains empty. Any row marked `INSUFFICIENT` or `NEEDS_SOURCE_REVIEW` is prohibited from visitor geometry until the missing evidence is reviewed.

## Missing relationship table

| ID | Date | Side | Known start area | Known end / target area | Related event IDs | Available source IDs | Current evidence strength | Recommended geometry type | Missing evidence required | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G01 | 1949-10-25 | PLA | Northern sea / multiple northern landing sectors | Longkou, Guningtou, and Huwei/Lake Tail landing areas | EVT-0001, EVT-0009, EVT-0010, EVT-0011, EVT-0029 | SRC-0004, SRC-0006, SRC-0008, SRC-0010, SRC-0011, SRC-0018, SRC-0027, SRC-0029, SRC-0032 | Conflicting overall account; individual beach engagements partially verified | MOVEMENT_CORRIDOR | A source-backed landing-sector map or archival beach-to-unit linkage distinguishing the already approved Longkou axis from other landings | NEEDS_SOURCE_REVIEW |
| G02 | 1949-10-25 | ROC | Northern coast / defensive fire positions | PLA landing flotilla in the northern offshore approach | EVT-0007, EVT-0012, EVT-0013 | SRC-0004, SRC-0006, SRC-0008, SRC-0010, SRC-0011, SRC-0018, SRC-0027, SRC-0029, SRC-0032 | Naval and air operations are described, but vessel positions and movement endpoints are not georeferenced | ATTACK_AXIS | Archival operation maps, sortie/ship position records, or a source that identifies a bounded offshore start/end relationship | INSUFFICIENT |
| G03 | 1949-10-25 | ROC | General west-Kinmen defensive positions | Lincuo / Longkou / Guningtou battle sectors | EVT-0002, EVT-0003, EVT-0009, EVT-0010, EVT-0014, EVT-0015 | SRC-0004, SRC-0027, SRC-0010, SRC-0011, SRC-0018, SRC-0032 | Battle and counterattack are documented, but no traceable start area and sequence support a new line | MOVEMENT_CORRIDOR | Unit-level order of advance, operation map, or time-stamped source connecting a bounded defensive origin to a target sector | INSUFFICIENT |
| G04 | 1949-10-26 | PLA | Northern coast / Huwei–Lake Tail approach | Guningtou landing area | EVT-0004, EVT-0016, EVT-0017 | SRC-0004, SRC-0027 | Second-echelon reinforcement failure is described at area scale; no exact route is supported | MOVEMENT_CORRIDOR | Independent source review of the reinforcement landing sector and the bounded area of attempted advance | SUFFICIENT_FOR_CORRIDOR |
| G05 | 1949-10-26 | ROC | Lincuo and Nanshan sectors | Guningtou encirclement area | EVT-0004, EVT-0017, EVT-0019, EVT-0020 | SRC-0004, SRC-0027 | Recapture and encirclement are partially verified; the existing counterattack axis covers only the directional relationship | MOVEMENT_CORRIDOR | A reviewed operation map or unit chronology defining the encirclement envelope without duplicating the existing axis or north-contraction corridor | SUFFICIENT_FOR_CORRIDOR |
| G06 | 1949-10-27 | PLA | Northern cliff / final battle area | Shuangrushan and surrender locations | EVT-0005, EVT-0021, EVT-0023, EVT-0024 | SRC-0004, SRC-0027 | Final engagements are partially verified, but the only mapped relationship is a narrative area, not a movement sequence | MOVEMENT_CORRIDOR | Primary or official battle map, surrender chronology, and bounded start/end areas for the final contraction | INSUFFICIENT |
| G07 | 1949-10-27 | PLA | Northern shore / last reinforcement landing | Northern cliff and final battle area | EVT-0005, EVT-0021, EVT-0022 | SRC-0004, SRC-0027 | Last reinforcement is reported at broad coast scale with no reliable landing point or onward relation | ATTACK_AXIS | Landing point evidence and source-backed connection to the final battle area; do not infer from coastline proximity | NEEDS_SOURCE_REVIEW |

## Current production implication

- Approved production movement remains: 2 `MOVEMENT_CORRIDOR`, 2 `ATTACK_AXIS`.
- Verified production routes remain: 0.
- Research-only geometry remains hidden in Visitor Mode.
- G04 and G05 are plausible corridor candidates for a later reviewed merge, not authorization to add duplicate geometry in V0.7.
- G01–G03 and G06–G07 remain audit records only; no geometry is generated from them.

## V0.8 historical battle map reconciliation

The uploaded historical battle map is now tracked separately in historical-battle-map-traces.geojson. It does not replace or mutate the V0.6/V0.7 movement package, and it does not promote any geometry into routes.geojson.

| Gap | Historical map supports | Trace candidate | Recommended review |
| --- | --- | --- | --- |
| G01 | PARTIAL | YES | Review the red landing/inland arrows against the source image; keep schematic-only wording. |
| G02 | PARTIAL | YES | Review blue western/northern branches and their possible named places. |
| G03 | PARTIAL | YES | Preserve separate blue/red movement graphics; do not merge into one axis. |
| G04 | PARTIAL | YES | Review northern red branch and the source-map phase association. |
| G05 | NO | NO | Keep 1949-10-27 source-trace phase empty until another dated source is reviewed. |
| G06 | PARTIAL | NO | Readable unit labels are not enough to create canonical unit links; human confirmation required. |
| G07 | NO | NO | Do not snap historical graphics to OSM roads or call them verified GIS routes. |

The V0.8 trace candidates are an auditable source interpretation, not automatic production promotion. See Guningtou_Historical_Battle_Map_Audit_V0.8.md and Guningtou_Historical_Battle_Map_Transcription_V0.8.md.
