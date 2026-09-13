# 1949 古寧頭數位戰爭博物館

「1949 古寧頭數位戰爭博物館」是以資料、時間軸、地圖、人物與檔案為核心的歷史知識網站，提供繁體中文、簡體中文與英文路由。網站保留多重來源、事件證據與研究狀態，讓使用者從戰役經過延伸閱讀至記憶、影響與和平反思。

## 技術架構

- Astro 7 static output
- React 19：時間軸、Leaflet 地圖、搜尋等互動元件
- Tailwind CSS v4 + `src/styles/global.css` 語意化設計 token
- GitHub Pages base path：`/1949-guningtou/`
- 主要資料來源：`data/*.json`，由 `src/data/loader.ts` 統一載入

## 本機開發

```text
npm install
npm run dev
npm run build
npm run preview
npm run astro -- check
```

依工作區慣例，若要以背景模式啟動：

```text
astro dev --background
astro dev status
astro dev logs
astro dev stop
```

## 路由

每種語言都使用相同的資訊架構：

- `/zh-tw/`
- `/zh-cn/`
- `/en/`

核心頁面包含首頁、四日時間軸、戰役地圖、人物、地點、故事、檔案、來源與研究、戰役分析、戰後影響及 Battlefield OS。動態人物、地點與故事頁面由既有 JSON 資料產生。

## 資料與內容原則

- UI 重構不改寫歷史資料、事件數值或來源主張。
- 內容呈現應沿用資料中的證據層級、驗證狀態與引用。
- 新增翻譯或歷史敘述前，應先取得對應來源，不以設計需求推測內容。

## 設計文件

- [設計系統總覽](docs/design-system/DIGITAL_WAR_MUSEUM_DESIGN_SYSTEM.md)
- [設計 tokens](docs/design-system/DESIGN_TOKENS.md)
- [UI 架構](docs/design-system/UI_ARCHITECTURE.md)
- [元件指南](docs/design-system/COMPONENT_GUIDE.md)
- [原始 UI / UX 缺口報告](docs/UI_GAP_REPORT.md)
- [本次 UI 重構報告](docs/DIGITAL_WAR_MUSEUM_UI_REFACTOR_REPORT.md)
- [V1.1 架構總覽](docs/ARCHITECTURE.md)
- [Battlefield Engine](docs/BATTLEFIELD_ENGINE.md)
- [歷史資料邊界](docs/HISTORICAL_DATA_SCHEMA.md)
- [V1.1 垂直切片報告](docs/VERTICAL_SLICE_REPORT.md)
- [V1.1 驗收報告](docs/V1_1_ACCEPTANCE_REPORT.md)
- [Historical Source Registry](docs/SOURCE_REGISTRY.md)
- [Historical Data Inventory](docs/HISTORICAL_DATA_INVENTORY.md)
- [Historical Evidence Matrix](docs/HISTORICAL_EVIDENCE_MATRIX.md)
- [Historical Research Backlog](docs/HISTORICAL_RESEARCH_BACKLOG.md)
- [V1.2 驗收報告](docs/V1_2_ACCEPTANCE_REPORT.md)

## 部署

專案使用靜態輸出，建置結果位於 `dist/`；GitHub Pages 部署設定位於 `.github/workflows/`。部署前請確認 base path、三語言首頁與動態詳情頁連結皆使用 `src/data/paths.ts` 的路徑工具。
