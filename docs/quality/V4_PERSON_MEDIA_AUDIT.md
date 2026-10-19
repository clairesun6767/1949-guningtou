# V4.0 人物肖像與媒體授權稽核

## Inventory

| Item | Count / result |
| --- | ---: |
| Canonical person records | 36 |
| Canonical `portrait_assets` entries | 0 |
| Existing person-linked media assets | 2, both linked to `PER-0003` |
| People with a legally attributable portrait in the catalog | 1 (`胡璉 / Hu Lien`) |
| People without a cleared portrait | 35 |
| AI-generated portraits | 0 |
| Statue or memorial substituted as a portrait | 0 |

The two Hu Lien contextual images are the existing [portrait](https://tcmb.culture.tw/zh-tw/detail?id=501760&indexCode=Culture_Object) and [1933 wedding photograph](https://tcmb.culture.tw/zh-tw/detail?id=662582&indexCode=Culture_Object), both recorded as CC BY-NC 3.0 TW+ in `src/data/mediaCatalog.ts`. They are contextual images, not 1949 battlefield photographs.

## V4 presentation rule

Cards and detail pages now show a neutral archival placeholder for people without a legally publishable portrait. The placeholder explicitly says that no publishable portrait is currently available. This prevents a battlefield photograph, monument, or unrelated person from being presented as a portrait.

## Human review queue

For each of the remaining 35 people, a reviewer must either provide a source record and licence/permission, or approve continued use of the neutral placeholder. A portrait may not be promoted merely because it appears in a search result or because the person is historically important.
