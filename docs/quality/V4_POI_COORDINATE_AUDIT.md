# V4.0 POI 座標與地點身份稽核

## Decision rule

The canonical `data/poi.json` coordinates were not recalculated or replaced in V4. A modern map result is a candidate identity check, not permission to change a 1949 historical coordinate. A POI remains public research data while `verification_status` is `partially_verified`.

Official area and identity references used for review include the [金寧鄉公所古寧村概述](https://jinning.kinmen.gov.tw/cp.aspx?n=294E18ABEC7F5E5D), [金門縣政府古寧頭戰史館資料](https://kccad.kinmen.gov.tw/cp.aspx?n=4A45E684CAC9627B), [金門國家公園湖南高地資料](https://www.kmnp.gov.tw/ch/touristInfo/recreation-sites/46), and the [金門特定區計畫人文歷史資源報告](https://urban.kinmen.gov.tw/kmgis/integration/uplan/draft/192/report.pdf). OpenStreetMap/Nominatim results were used only as candidate map identities and are not treated as historical evidence.

## All canonical POIs

| ID | Name | Current WGS84 | Current accuracy/status | Independent review result | V4 decision |
| --- | --- | --- | --- | --- | --- |
| POI-0001 | 嚨口 / Longkou | 24.467, 118.309 | Estimated / partial | Search result ambiguous; no safe point match | Keep; human review |
| POI-0002 | 古寧頭海灘（北山段） | 24.478, 118.316 | Estimated / partial | Coast is an area, not a single point | Keep; human review |
| POI-0003 | 湖尾 / Huwei | 24.471, 118.328 | Estimated / partial | Nearby water feature result is not a village/high-ground proof | Keep; human review |
| POI-0004 | 后沙 / Housha | 24.464, 118.319 | Estimated / partial | Search result ambiguous | Keep; human review |
| POI-0005 | 蘭厝 / Lantso | 24.463, 118.310 | Approximate / partial | No independent exact match | Keep; human review |
| POI-0006 | 古寧頭（北山） | 24.478, 118.316 | Exact label / partial status | Village extent cannot be represented by one unreviewed point | Keep; human review |
| POI-0007 | 林厝 / Lincuo | 24.475, 118.313 | Exact label / partial status | OSM candidate around 24.47695, 118.31376; official area references corroborate identity, not the exact battle point | Do not import; human review |
| POI-0008 | 南山 / Nanshan | 24.476, 118.318 | Exact label / partial status | Search results are ambiguous | Keep; human review |
| POI-0009 | 埔頭 / Putou | 24.481, 118.310 | Approximate / partial | Search results returned an ambiguous Little Kinmen match | Keep; human review |
| POI-0010 | 湖南高地 / Hunan Heights | 24.460, 118.330 | Estimated / partial | OSM candidate around 24.45528, 118.33120; official sources identify Hunan Heights but do not validate this canonical point | Do not import; human review |
| POI-0011 | 水頭碼頭 / Shuitou Pier | 24.446, 118.308 | Exact / partial | Modern pier identity is not enough to establish the 1949 arrival point | Keep; human review |
| POI-0012 | 瓊林 / Qionglin | 24.452, 118.340 | Approximate / partial | Modern village result is not a wartime command-post proof | Keep; human review |
| POI-0013 | 觀音亭山 / Kuanyin Pavilion Hill | 24.467, 118.320 | Approximate / partial | No independent exact match | Keep; human review |
| POI-0014 | 雙乳山 / Shuangru Hill | 24.455, 118.323 | Estimated / partial | Modern hill result needs local identity confirmation | Keep; human review |
| POI-0015 | 湖尾高地 / Huwei Heights | 24.472, 118.326 | Approximate / partial | Must remain separate from Hunan Heights; official KNP material identifies Hunan Heights as a different site | Do not merge; human review |
| POI-0016 | 古寧頭戰史館 | 24.477, 118.320 | Exact / partial | OSM candidate around 24.48309, 118.32111; official museum identity corroborated, exact public point still needs review | Do not import; human review |
| POI-0017 | 李光前將軍廟 | 24.473, 118.315 | Estimated / partial | OSM candidate around 24.46838, 118.31701; official memorial references corroborate the temple, not the exact coordinate | Do not import; human review |
| POI-0018 | 金門和平紀念園區 | 24.477, 118.321 | Exact / partial | Park/building boundary must be separated from memorial and fortification claims | Keep; human review |
| POI-0019 | 安東一營區 | 24.477, 118.320 | Exact / partial | Official sources establish the heritage/activity context, not this point as a surveyed compound | Keep; human review |
| POI-0020 | 古寧頭播音站 | 24.479, 118.317 | Estimated / partial | Broadcast-wall identity needs a dedicated point source | Keep; human review |
| POI-0021 | 北山斷崖 | 24.483, 118.315 | Estimated / partial | OSM candidate around 24.48924, 118.31371; cliff is an extent, not a single point | Do not import; human review |
| POI-0022 | 古寧頭牌樓 | 24.475, 118.318 | Exact / partial | Modern landmark identity needs a direct map or official point source | Keep; human review |
| POI-0023 | 安東二營區道路 | 24.470, 118.310 | Approximate / partial | Road centreline cannot be promoted to a 1949 movement route | Keep; human review |
| POI-0024 | 古寧頭地區防禦碉堡遺跡 | 24.476, 118.317 | Approximate / partial | Dispersed remains cannot be represented as one invented bunker | Keep; human review |
| POI-0025 | 太武山（徐博躲藏處） | 24.430, 118.350 | Approximate / partial | Broad aftermath area; no cave point is established | Keep; human review |

## Result

- Canonical coordinate mutations: **0**.
- Publicly verified POIs after V4: **0/25**.
- Candidate modern map matches retained only in this audit: **5**, all requiring human approval.
- `湖尾高地` and `湖南高地` are **not merged**. Their names, roles, and source relationships remain separate until a human-reviewed identity decision.
