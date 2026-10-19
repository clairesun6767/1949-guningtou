# Guningtou Then & Now V2.0 Acceptance

## Implementation outcome

**PASS — implementation complete on the isolated branch.** The existing `/postwar/` URL remains available, while `/then-and-now/` provides the same five-section page in `zh-tw`, `zh-cn`, and `en`. The 1949 battle homepage, canonical locations, terrain, route geometry, traces, and renderer were not modified.

## Routes

- `/1949-guningtou/zh-tw/postwar/`
- `/1949-guningtou/zh-cn/postwar/`
- `/1949-guningtou/en/postwar/`
- `/1949-guningtou/zh-tw/then-and-now/`
- `/1949-guningtou/zh-cn/then-and-now/`
- `/1949-guningtou/en/then-and-now/`

## Delivered sections

1. 1949 and today: pre-battle 1944 aerial reference, museum, canonical location link, and evidence boundary.
2. Battlefield image comparison: source-labelled comparison slider and archive gallery.
3. Explore the battlefield: existing `LocationExplorer` and link to the canonical battle map.
4. Military-site activation: W013, W012, W011, W016, W027, and the Battle Museum, with present use, evidence status, source links, and explicit pending-image states.
5. Traces that remain: Beishan Cliff, broadcasting wall, Peace Memorial Park, Li Guangqian Shrine, Beishan command-post research entry, and Beishan Old House.

## Image and rights closure

The five new display copies are CC-licensed Wikimedia Commons files and retain author, date, licence, and source-page metadata in `src/data/mediaCatalog.ts`:

- [Guningtou Battle Museum · Mnb · CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:2013-02-03_%E5%8F%A4%E5%AF%A7%E9%A0%AD%E6%88%B0%E5%8F%B2%E9%A4%A8%E6%AD%A3%E9%9D%A2.jpg)
- [Beishan Cliff · 人人生來平等 · CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:2022.06.22_Beishan_Cliff_in_Kinmen_National_Park.jpg)
- [Beishan Broadcasting Station · Mnb · CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:%E9%87%91%E9%96%80%E5%8C%97%E5%B1%B1%E6%92%AD%E9%9F%B3%E7%AB%99.jpg)
- [Beishan Old House · 張雅倫 · CC BY-SA 4.0](https://commons.wikimedia.org/wiki/File:%E5%8F%A4%E5%AF%A7%E9%A0%AD%E5%8C%97%E5%B1%B1%E5%8F%A4%E6%B4%8B%E6%A8%93.jpg)
- [Guningtou Memorial Arch · Rolfmueller · CC BY-SA 3.0](https://commons.wikimedia.org/wiki/File:Kinmen_Guningtou_Arch.jpg)

Official National Park and tourism pages remain source links. Their photographs were not copied where an explicit reuse licence was not confirmed. W011, W012, W016, W027, the Peace Memorial Park, and Li Guangqian Shrine therefore show honest research or image-pending states instead of unrelated substitutions.

## Verification

| Check | Result |
| --- | --- |
| `npm run validate:battle-data` | PASS · 0 errors; existing calibration warnings retained |
| `npm run test:battle-data` | PASS · 71/71 |
| `npm run test:v2` | PASS · 55/55 |
| `npm run typecheck` | PASS · 0 errors, 0 warnings, 0 hints |
| `npm run build` | PASS · 286 pages, static output |
| Protected battle/terrain/renderer surface | PASS · no changes in the V2 diff |
| Local browser visual check | ENVIRONMENT-LIMITED · browser could not connect to the local background server; static output and route contracts were checked instead |

## Remaining human review

- Confirm the official register/name/access status and reusable images for W011 and W016.
- Confirm the complete W012 camp location rather than treating the existing POI-0023 road record as a camp coordinate.
- Confirm current reusable images and management information for W027, Peace Memorial Park, and Li Guangqian Shrine.
- Verify the “Beishan PLA command post” name and location before creating any canonical Location.
