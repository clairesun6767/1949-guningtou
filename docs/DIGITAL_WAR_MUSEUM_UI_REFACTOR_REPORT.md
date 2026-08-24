# DIGITAL WAR MUSEUM UI REFACTOR REPORT

## Executive Summary

本次重構將既有 Astro 歷史知識網站整理為「博物館／檔案館」視覺系統：深色展廳底、檔案紙張與戰地地圖色、青銅色年份標記、清楚的證據與 metadata 語彙。重構保留原有資料模型、JSON 內容、三語言路由、Leaflet 地圖、時間軸互動與 GitHub Pages base path。

完成項目：

- 建立語意化設計 tokens、版面 primitives、共用 museum 元件與文件。
- 重寫全站 shell、桌面導覽、行動版 Drawer、搜尋區、頁尾與語言切換。
- 重構首頁、時間軸、地圖、檔案、來源、人物、地點與故事等核心流程。
- 將次要內容頁納入同一套頁首、標題、卡片、metadata 與來源呈現。
- 補上 base-safe 動態連結、焦點樣式、減少動態效果、響應式規則與 reduced-motion 支援。

## Existing Architecture

- Astro 7、React 19、Tailwind CSS v4、Leaflet / React Leaflet。
- Static output；語言路由位於 `src/pages/[lang]/`，目前為 `zh-tw`、`zh-cn`、`en`。
- `src/data/loader.ts` 集中載入 timeline、events、POIs、persons、sources、stories 與研究資料。
- `src/data/paths.ts` 管理 GitHub Pages base path 與語言路徑。
- 互動核心維持 React island：`BattleTimeline`、`BattleMap`、`LocationExplorer`、`HeroMap`、`SearchBar`。

## Design Problems Found

1. 原本白底、圓角卡片與高亮 hover 讀起來像一般內容入口，缺少歷史檔案的重量與層次。
2. 桌面 hover 導覽沒有可靠的行動版操作，且項目過多造成 header 擁擠。
3. 時間軸、地圖、人物與來源頁各自使用不同的 metadata、證據與卡片語彙。
4. 一些詳情頁連結沒有經過 base path，部署至 GitHub Pages 時存在失效風險。
5. 全域 focus、reduced-motion、窄螢幕溢位與標題層級沒有明確規則。
6. 部分次要頁使用 emoji 作為主要圖示；英文路由仍有既有內容翻譯未完成的情況。

## Design System

設計系統集中於 `src/styles/global.css`，並以 `docs/design-system/` 作為維護規格：

- 色彩：`--bg-primary`、`--bg-paper`、`--bg-elevated`、`--text-primary`、`--border-subtle`、`--historical`、`--geographic`、`--combat`、`--archive`。
- 字體：Noto Serif 用於歷史敘事，Noto Sans 用於介面，IBM Plex Mono 用於日期、ID、座標與來源 metadata。
- 版面：8px spacing scale、有限的 reading width、museum container、metadata grid 與 map / timeline shell。
- 形狀與動態：小幅圓角、低強度陰影、短 transition；`prefers-reduced-motion` 時移除非必要動畫。
- 共用 class：`museum-page`、`museum-section`、`museum-card`、`museum-panel`、`museum-meta`、`museum-button`、`museum-reading`。

## Components

新增或重構的共用元件包括：

- `SectionHeading`：kicker、標題、導言與可選 h1 / h2 層級。
- `MetadataRow`：日期、ID、座標、狀態等檔案 metadata。
- `SourceCitation`：來源與引用呈現。
- `HistoricImage`：歷史影像的 caption、source 與 archive treatment。
- `PersonCard`、`EventCard`、`LocationCard`、`EvidenceCard`：跨頁一致的資料卡片。
- `MainLayout`：頁首、舊有五組分層導覽、行動版 Drawer、語言切換與頁尾。
- `HeroMap`、`BattleTimeline`、`BattleMap`、`LocationExplorer`：保留資料與互動行為，改用 museum visual language。

## Pages

- 首頁：檔案式 hero、戰役定位、地圖導覽、四日時間軸、人物、證據、事件與和平反思。
- 時間軸：保留日期篩選、事件展開、metadata、來源與 evidence panel。
- 地圖：保留 Leaflet POI、路線、圖例與地點連結；補上 route-safe links 與 map chrome。
- 檔案與來源：以 archive paper、provenance、source status 與資料類型分組。
- 人物、地點、故事：共用卡片、metadata、來源與詳情頁結構。
- 分析、背景、戰後、觀點、武器、文物、關於與 Battlefield OS：移除主要 emoji 視覺依賴，納入共用頁面 shell。

## Responsive and Accessibility

- header 在窄螢幕切換為原生 `<details>` Drawer，保留鍵盤可操作的 summary / link 結構。
- 桌面恢復舊有五組導覽架構，將內容分為認識戰役、走進戰場、人物與現場、史料研究、和平與計畫。
- 主要內容保留 `main#main-content`，共用 focus-visible outline、跳轉目標與 aria-current。
- 時間軸 tab 與事件展開保留 tablist / aria-expanded 語意。
- 地圖保留 OSM attribution、圖例與文字化資訊；非地圖內容不依賴顏色單獨傳達狀態。
- 檢查 390×844 行動版：header、Drawer、hero、timeline tabs、地圖 legend 均可用，並抑制非預期水平溢位。

## Performance

- 保留 Astro static output 與 islands，沒有把整站改成 client-rendered app。
- hero / archive 圖像沿用既有 public asset；歷史影像使用可控的 object-fit 與 caption。
- 建置仍提示至少一個 minified chunk 超過 500 kB，主要可能來自 Leaflet / React 互動 bundle；這是後續可做 dynamic import / code splitting 的優化項目。

## Remaining Issues

- 英文與簡體中文部分歷史內容仍是既有翻譯狀態，應由內容研究流程處理，不在本次 UI 重構中臆補。
- archive 類別中標示為 planned 的資料仍需實際檔案、影像或文件 record 才能上線。
- Leaflet / React chunk 尚可拆分；目前不影響成功建置與頁面輸出。
- 專案沒有既有 lint 或 test script；應在功能穩定後補上自動化檢查。
- 本次安裝 Astro check 依賴時 npm 回報 dependency tree 有 1 個 high severity audit finding；未自動執行可能改動版本的 `npm audit fix`。

## Files Changed

- Global foundation：`src/styles/global.css`、`src/layouts/MainLayout.astro`、`src/i18n/ui.ts`、`src/data/loader.ts`、`README.md`。
- Interactive components：`src/components/hero/`、`src/components/map/`、`src/components/shared/`、`src/components/timeline/`。
- Museum primitives：`src/components/museum/`。
- Core and secondary pages：`src/pages/[lang]/` 下首頁、timeline、map、archive、sources、figures、locations、stories 與其餘內容頁。
- Documentation：`docs/design-system/`、`docs/UI_GAP_REPORT.md`、本報告。
- Tooling：`package.json`、`package-lock.json` 新增 `@astrojs/check` 與 `typescript` 作為 development dependencies。

## Verification

| Check | Result |
| --- | --- |
| `npm.cmd run astro -- check` | Pass；0 errors、0 warnings、0 hints |
| `npm.cmd run build` | Pass；274 pages built |
| Browser visual QA | Pass；desktop 核心頁面與 390×844 mobile 檢查首頁、Drawer、timeline、map、archive、figures |
| Lint | Not configured in repository |
| Test | Not configured in repository |
| Git whitespace check | 僅有既有 CRLF line-ending notice，未發現 whitespace error |
