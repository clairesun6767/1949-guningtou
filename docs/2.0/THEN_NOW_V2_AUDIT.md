# 《昔日戰場・今日古寧頭》V2.0 稽核紀錄

## Scope

- Repository: `D:\Hermes\Projects\1949`
- Remote: `https://github.com/clairesun6767/1949-guningtou`
- Base commit: `3e1020bc83ac604c4137586ecef38cb3672f5e73`
- Working branch: `feature/guningtou-then-now-v2`
- Existing compatible route: `/zh-tw/postwar/`
- New route decision: keep `/postwar/` as the canonical compatibility route and add `/then-and-now/` as an alias that preserves the same page without breaking old links.

## Git and protected surface

The working tree was clean before this branch was created. `main`, the existing 1.x pages, `src/battle-replay/`, `data/`, canonical locations, terrain, route geometry, historical traces, and the Battlefield OS runtime are protected. This branch is the only V2.0 implementation surface; no reset, rebase, force push, or direct `main` edit is allowed.

## Existing architecture reused

| Area | Existing implementation | V2.0 use |
| --- | --- | --- |
| Static site | Astro 7 + React islands + GitHub Pages base `/1949-guningtou/` | Reuse `MainLayout`, `sitePath`, three language routes, and existing museum tokens |
| Home | `src/pages/[lang]/index.astro` + `HeroMap` | Add a small photo-led entry; keep the 1949 battle homepage unchanged in purpose |
| Existing post-war page | `src/pages/[lang]/postwar.astro` | Replace the text-only presentation with the Then & Now page while retaining the URL |
| Archive | `src/pages/[lang]/archive.astro` + `src/data/mediaCatalog.ts` | Extend the existing media catalog; no second image database |
| Map | `LocationExplorer` and `HistoricalMapExperience` | Use `LocationExplorer` for the exploration section and link to the full battle map; do not change renderer or canonical geometry |
| Canonical POI | `data/poi.json`, existing `/locations/[id]/` pages | Reference existing `poiId` values only; unresolved W011/W016/W027 records remain visibly research/pending |

## Historical and evidence boundary

The page distinguishes four states: 1949 battle location, post-war military facility, post-war memorial, and conservation/adaptive reuse. No post-war construction date is inferred from a place name. W011, W012, W013, W016, and W027 are shown with source status; only existing canonical POIs are linked. “北山共軍指揮所” remains a research item until its official name, location, and evidence are independently confirmed.

## Official research findings

| Subject | Evidence used | V2.0 treatment |
| --- | --- | --- |
| W013 安東一營區 | Taiwan National Parks report opening on 2016-02-02; describes W013, its relation to W011/W012, 1970s reconstruction, and adaptive reuse | Published as an activated site with source link; no claim that the present structure is an original 1949 building |
| W011 / W012 relationship | W013 official report states the three Andong sites were in the same company; W012 official/operator material describes later coast-guard use and adaptive reuse | Presented as an Andong series; W012 operator material is marked current-use context, not sole historical proof |
| W012 安東二營區 | Kinmen National Park recreation-site record and the operator site | Current activation link is provided; historical claims remain source-labelled |
| W027 湖下一營區 | Taiwan National Parks material records the coastal defensive role, 1986–1988 construction, hand-dug tunnels, and public opening | Presented as a post-war military facility and later reuse, not as a 1949 original bunker |
| 古寧頭戰史館 | Taiwan National Parks material records 1984 construction, transfer to Kinmen National Park in 2000/2001-era accounts, and recent renovation/reopening | Museum card uses official source links and an openly licensed current photograph |
| 北山聚落、北山斷崖、文化景觀 | Taiwan National Parks cultural-landscape and Beishan material | Used for landscape interpretation; cliff is not labelled as a camp |
| 1958 八二三、戰地政務、小三通 | Outside V2.0 narrative scope | Linked only as future research context where appropriate; no detailed timeline added |

## Published image source and rights audit

The following newly downloaded images are Wikimedia Commons files with explicit CC licences. The page keeps author, date, source-page, licence, and “changes made” metadata in the existing archive catalog. Files are resized display copies; the Commons source page remains the authoritative record.

| Asset | Subject | Author / date | Licence | Site use |
| --- | --- | --- | --- | --- |
| `g-battle-museum-2013.jpg` | 古寧頭戰史館 | Mnb · 2013-02-03 | CC BY-SA 4.0 | Hero, museum and image comparison |
| `beishan-cliff-2022.jpg` | 北山斷崖 | 人人生來平等 · 2022-06-22 | CC BY-SA 4.0 | Landscape and traces |
| `beishan-broadcast-wall-2013.jpg` | 北山播音站／播音牆 | Mnb · 2013-02-03 | CC BY-SA 4.0 | Military heritage activation |
| `beishan-old-house-2018.jpg` | 北山古洋樓 | 張雅倫 · 2018-05-11 | CC BY-SA 4.0 | Traces and settlement context |
| `guningtou-arch-2012.jpg` | 古寧頭紀念牌樓 | Rolfmueller · 2012-12-15 | CC BY-SA 3.0 | Traces and visitor route |

Existing user-authorized or previously published project assets remain in their existing folders. Official National Park and tourism photographs are linked as sources but are not copied without an explicit reuse licence. W012 and W027 pages therefore retain source links and research status when no reusable local image is available.

## Known gaps retained visibly

- No openly licensed image was found for W011, W012, W016, W027, the Peace Memorial Park, or Li Guangqian Shrine during this pass; the page does not substitute an unrelated photograph.
- W016 and the “Beishan PLA command post” require a dedicated official-register / field-verification pass.
- Existing 1944 imagery is a pre-battle landscape reference and remains labelled by its actual year; it is not presented as a 1949 photograph or precision georeference.
- English and Simplified Chinese are translated for the new interface and editorial copy; source quotations and proper names remain linked to their original records for later human review.

## Acceptance intent

The page is accepted only when all five navigation anchors contain real content, the priority sites have either a sourced presentation or an explicit evidence gap, images load from local public assets, three language routes build, the old `/postwar/` URL remains valid, and the protected battle data and renderer tests remain unchanged.
