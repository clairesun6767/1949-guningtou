# 1949 古寧頭戰役歷史資料網站 — 架構文件 v3

> **專案定位**：以歷史認知促成和平理解的公開史料網站
> **部署**：GitHub Pages（靜態站）
> **資料來源**：Battlefield_OS 既有結構化資料（30 事件、25 POI、36 人物、47 敘事、123 時間軸…）
> **建立日期**：2026-08-03
> **狀態**：架構定稿，等待進入 Phase 1

---

## 零、核心精神

> **歷史已然發生，無法改變。**
> **但透過理解歷史，我們可以認清戰爭的代價，珍惜和平的可貴。**

本網站不以勝負論英雄，不鼓吹敵我對抗。
目的在於：**呈現事實 → 理解脈絡 → 反思代價 → 珍惜和平**。

---

## 一、網站敘事弧線

```
                    ┌──────────────────────────────────┐
                    │        國際情勢背景（1945-1949）     │
                    │  二戰結束 → 國共內戰 → 兩岸對峙前夜   │
                    └──────────────┬───────────────────┘
                                   │
            ┌──────────────────────┴──────────────────────┐
            │               古寧頭戰役（1949.10.24-27）       │
            │                                              │
            │   [國軍視角]          [共軍視角]               │
            │   防守反擊成功         渡海作戰失利              │
            │   古寧頭大捷           金門戰役                 │
            │                                              │
            └──────────────────────┬──────────────────────┘
                                   │
                    ┌──────────────┴───────────────────┐
                    │        戰後影響（1949-至今）        │
                    │                                  │
                    │  • 兩岸分治格局確立                  │
                    │  • 金門從戰場→戰地政務→觀光文化       │
                    │  • 823 砲戰、單打雙不打（簡述脈絡）    │
                    │  • 兩岸關係演變（軍事對峙→交流→現狀）  │
                    │  • 古寧頭在兩岸歷史記憶中的不同位置     │
                    │  • 今天的古寧頭：和平地景 vs 戰爭遺跡   │
                    │                                  │
                    │           ↓                      │
                    │  【反思】戰爭的代價與和平的可貴       │
                    └──────────────────────────────────┘
```

---

## 二、網站架構（路由）

```
1949-guningtou.tw（GitHub Pages: <user>.github.io/1949-guningtou）
│
├── /                          首頁 — 和平宣言 + 3D 地球主視覺 + 戰役總覽
├── /context                   戰前國際情勢（1945-1949 背景）
├── /timeline                  互動式逐日時間軸（10/24-10/27）
├── /map                       戰役地圖（Leaflet + POI + 路線）
├── /locations                 地點探索（25 POI 列表）
│   └── /locations/:id         單一地點詳情（歷史 + 導覽 + 現況）
├── /figures                   關鍵人物（36 位，ROC/PRC 分類）
│   └── /figures/:id           單一人物詳情
├── /stories                   戰役故事（12 條故事弧線）
│   └── /stories/:id           故事詳情（場景 → 節拍）
├── /aftermath                 戰後影響（兩岸分治、歷史記憶、和平反思）
├── /sources                   史料與來源索引（38 筆 + 證據等級）
└── /about                     關於本站（專案說明、資料政策）
```

---

## 三、視角系統（Perspective System）

網站全域提供三種視角，使用者可隨時切換：

| 視角 | 色調 | 定位 | 覆蓋頁面 |
|---|---|---|---|
| **國軍視角 (ROC)** | 藍/金 `#1a3a5c` / `#c9a44b` | 古寧頭大捷，成功防衛金門 | timeline, map, locations, figures, stories |
| **共軍視角 (PRC)** | 紅/暖 `#8b1a1a` / `#d4a574` | 金門戰役，渡海作戰失利 | 同上 |
| **中立綜觀** | 灰/白 `#2c3e50` / `#f5f0e8` | 歷史事實陳述，無立場 | 所有頁面（預設） |

**視角影響的內容層面**：
- 時間軸描述文字（國軍「成功阻擊」vs 共軍「登陸受阻」）
- 人物排序與重點人物
- POI 說明中的行動描述
- 故事弧線的敘事角度
- 戰後影響的解讀框架

**視角不影響的內容**：
- 客觀日期、時間、GPS 座標
- 來源引用與證據等級
- 部隊番號、人名
- 地圖空間資料

**實現方式**：

```typescript
// 全域 perspective state（nanostores，Astro 相容）
import { atom } from 'nanostores';
export type Perspective = 'roc' | 'prc' | 'neutral';
export const currentPerspective = atom<Perspective>('neutral');
```

資料層面：Battlefield_OS `data/prc/` 目錄已有獨立 PRC 資料（PLA 時間軸、解放軍人物、戰役分析、交叉比對），可直接用於雙視角渲染。

---

## 四、戰後影響頁（/aftermath）— 新增核心頁面

此為本次定稿新增的核心頁面，承載「從歷史走向和平」的網站使命。

### 4.1 頁面結構

```
/aftermath
│
├── Section 1: 戰役即時後果（1949.10.27 之後數週）
│   ├── 國軍：清掃戰場、俘虜處理、戰報發布
│   ├── 共軍：檢討失利、第十兵團重組、取消再攻計畫
│   └── 雙方傷亡統計（多來源並列）
│
├── Section 2: 兩岸分治格局確立
│   ├── 1949.12 中華民國政府遷台
│   ├── 1950.06 韓戰爆發 → 美國第七艦隊協防台灣海峽
│   ├── 古寧頭作為「台海第一戰」的歷史定位
│   └── 從軍事對峙到長期分治
│
├── Section 3: 金門的變遷
│   ├── 戰地政務時期（1956-1992）
│   ├── 823 砲戰（1958）與「單打雙不打」時期
│   ├── 解除戰地政務 → 開放觀光（1992-）
│   ├── 今天的古寧頭：戰史館、和平紀念公園、北山播音站
│   └── 戰地遺跡 vs 和平地景的共存
│
├── Section 4: 兩岸歷史記憶的差異
│   ├── 台灣：課本中的古寧頭大捷、反共第一勝
│   ├── 中國：金門戰役、解放戰爭中的教訓
│   ├── 紀念方式的不同：戰史館 vs 解放軍戰史記載
│   └── 共同的歷史，不同的敘事
│
├── Section 5: 反思 — 戰爭的代價與和平的可貴
│   ├── 數據可視化：傷亡數字、參戰人數對比
│   ├── 個人故事：雙方士兵的家書、遺物、回憶錄
│   ├── 今日古寧頭照片：海浪拍打當年的登陸灘頭
│   └── 結語：歷史無法改變，但和平可以選擇
│
└── Timeline 組件：1949-2026 大事紀（兩岸關係 + 金門變遷）
```

### 4.2 資料來源

- Battlefield_OS `data/timeline/` 戰後延伸條目（需擴充）
- Battlefield_OS `data/entities/human_consequences.json`
- Battlefield_OS `data/prc/battle_analysis/` 共軍戰後分析
- Battlefield_OS `data/narrative/narratives_v1.json` 中的 `aftermath` narrative
- 公開資料補充（金門縣政府、國家公園史料）

---

## 五、首頁設計 — 和平導向

### 5.1 頁面區塊（由上而下）

```
┌─────────────────────────────────────────────┐
│  Section 0: 3D 地球主視覺                     │
│  → 地球自轉 → 聚焦金廈海峽 → POI 浮現 →       │
│  → 登陸路線動畫 → 淡入標題                     │
│  Hero 文字：                                  │
│  「1949 年 10 月 25 日凌晨，                    │
│    一萬五千名士兵在此登陸，                       │
│    三天後，近萬人未能離開。」                      │
└─────────────────────────────────────────────┘
         ↓ scroll
┌─────────────────────────────────────────────┐
│  Section 1: 和平宣言                           │
│                                              │
│  歷史已然發生。                                  │
│  我們無意評判對錯，                                │
│  只願呈現那些發生在金門海岸上的真實片刻。               │
│                                              │
│  每一發砲彈落下之處，現在是潮汐來回的沙灘。             │
│  每一處掩體所在之地，現在長滿了木麻黃。                │
│                                              │
│  理解戰爭，是為了不必再經歷戰爭。                     │
│  [進入時間軸]  [探索地圖]                        │
└─────────────────────────────────────────────┘
         ↓ scroll
┌─────────────────────────────────────────────┐
│  Section 2: 四日戰役速覽                         │
│  卡片 ×4：10/24 → 10/25 → 10/26 → 10/27      │
│  每日摘要 + 關鍵事件數 + 跳轉連結                  │
└─────────────────────────────────────────────┘
         ↓ scroll
┌─────────────────────────────────────────────┐
│  Section 3: 關鍵數字                           │
│  30 事件  ·  25 地點  ·  36 人物               │
│  12 故事  ·  123 時間點  ·  38 史料來源          │
│  [視角切換器]                                  │
└─────────────────────────────────────────────┘
         ↓ scroll
┌─────────────────────────────────────────────┐
│  Section 4: 導航入口                           │
│  戰前情勢  │  時間軸  │  戰役地圖                │
│  地點探索  │  人物誌  │  戰後影響                │
└─────────────────────────────────────────────┘
         ↓ scroll
┌─────────────────────────────────────────────┐
│  Section 5: Footer                           │
│  資料來源聲明 · 證據政策 · GitHub · 授權          │
└─────────────────────────────────────────────┘
```

### 5.2 3D 地球技術細節

**庫**：`react-globe.gl`（⭐1,423，基於 Three.js）

**紋理資源**：
- 地球表面：NASA Blue Marble（free）
- 地形 bump map：NASA SRTM 衍生（free）
- 夜間燈光：NASA Black Marble（可選，做晝夜切換效果）

**動畫時序**：
```
t=0.0s    地球出現，緩慢自轉
t=1.0s    開始旋轉至東亞（金門經緯度 24.45, 118.35）
t=2.5s    視角抵達金廈海峽上空
t=3.0s    開始 zoom in，視野從地球級 → 區域級
t=5.0s    zoom in 完成，POI 光點逐一浮現（壟口→北山→南山→林厝…）
t=6.0s    登陸路線弧線動畫（廈門方向 → 古寧頭海岸三箭頭）
t=7.0s    標題淡入：「古寧頭戰役 · 1949 年 10 月」
t=8.0s    所有元素就位，使用者可自由拖曳/縮放
```

**備用方案（Mobile / 低效能）**：
- 偵測裝置效能 → 降級為靜態衛星地圖 + CSS 動畫 zoom in
- 偵測 `navigator.hardwareConcurrency < 4` → 自動降級

---

## 六、技術棧

| 層 | 選擇 | 版本 | 說明 |
|---|---|---|---|
| **框架** | Astro | 5.x | 內容型網站最佳選擇，零 JS 預設，React islands |
| **互動元件** | React 19 + TypeScript | 19.x | 地圖、時間軸、3D 地球 |
| **3D 地球** | react-globe.gl | latest | 首頁主視覺 |
| **地圖** | Leaflet + react-leaflet | latest | POI 互動地圖（OpenStreetMap 免費底圖） |
| **時間軸** | 自訂 Canvas + React | — | 專用設計，支援 123 節點 + 雙視角 |
| **樣式** | Tailwind CSS | 4.x | 快速開發 + 雙視角主題切換 |
| **動畫** | GSAP (ScrollTrigger) | latest | scroll-driven 段落動畫 |
| **全域狀態** | nanostores | latest | 輕量，Astro + React 雙相容 |
| **語系** | 自訂 i18n | — | zh-TW 為主，en 為輔 |
| **部署** | GitHub Pages | — | `gh-pages` 分支，GitHub Actions 自動部署 |
| **網域** | 自訂域名（可選） | — | GitHub Pages 支援 custom domain + HTTPS |

### 為何選 Astro 而非純 React SPA

| 需求 | Astro | React SPA |
|---|---|---|
| 內容為主（文字、圖片） | ✅ 零 JS 輸出 | ❌ 全量 JS bundle |
| SEO / Open Graph | ✅ 原生 SSR/SSG | ⚠️ 需額外設定 |
| 載入速度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 互動元件（地圖、3D） | ✅ React island | ✅ |
| 資料靜態 JSON | ✅ 直接 import | ✅ 直接 import |
| 部署 GitHub Pages | ✅ 純靜態輸出 | ✅ 純靜態輸出 |
| 學習成本 | 略高於純 React | 團隊已熟悉 |

結論：Astro 輸出 HTML 為主的靜態內容頁面，僅在需要互動的區塊（地圖、時間軸、3D 地球）掛載 React，大幅減少 JS 體積，對歷史資料網站是最佳解。

---

## 七、擴充性設計

### 7.1 資料層擴充

```
data/
├── events.json           ← 替換為 events_v3.json 即可擴充
├── timeline.json         ← 時間軸可向戰前/戰後延伸
├── poi.json              ← 新 POI 直接 append
├── persons.json          ← 新人物直接 append
├── stories/              ← 預留目錄，目前從 narrative/* 載入
│   └── ...               ← 未來可新增 custom stories
├── prc/                  ← PRC 資料獨立目錄，結構對稱
│   ├── events.json
│   ├── timeline.json
│   └── persons.json
└── media/                ← 預留（Phase 後期）
    └── index.json        ← 照片/影片索引，目前無實際媒體檔案
```

**擴充規則**：
- 所有 ID 前綴保留（EVT-XXXX、POI-XXXX、PER-XXXX…）
- 新資料直接添加至對應 JSON array，不覆蓋現有條目
- 新增資料型別（如 `oral_histories.json`）只需：定義型別 → 建立頁面路由 → 加入導航
- 跨來源引用保持 ID 字串格式（`related_events: "EVT-0001; EVT-0005"`）

### 7.2 頁面層擴充

新增頁面只需：
1. `src/pages/新頁面.astro`（或 `.md` / `.mdx`）
2. Astro 自動基於檔案路由，無需手動設定 router
3. 若需互動元件：在 Astro 頁面中 `client:load` 掛載 React component

```astro
---
// src/pages/oral-histories.astro（未來擴充範例）
import OralHistoryTimeline from '../components/OralHistoryTimeline';
---
<MainLayout title="口述歷史">
  <h1>口述歷史</h1>
  <OralHistoryTimeline client:load />
</MainLayout>
```

### 7.3 內容層擴充

- **多語系**：`src/i18n/` 目錄，新增語言只需新增 JSON 檔
- **戰役範圍**：目前鎖定古寧頭，若未來擴充至 823 砲戰，新增 `data/battle_823/` 目錄 + 對應路由群組
- **媒體內容**：`data/media/` 預留照片/影片索引，Phase 後期可加入 `src/pages/gallery/`

### 7.4 部署層擴充

- GitHub Pages 支援 custom domain（`1949-guningtou.tw` 或其他）
- 從 GitHub Pages 遷移至 Cloudflare Pages / Vercel 只需改 DNS 指向
- 靜態輸出（`dist/`）可部署至任何靜態主機

---

## 八、GitHub Pages 部署方案

### 8.1 部署架構

```
GitHub Repo: <username>/1949-guningtou
│
├── main 分支          ← 原始碼（Astro + React）
└── gh-pages 分支      ← 建置輸出（dist/），GitHub Pages 讀取此分支
```

### 8.2 GitHub Actions 自動部署

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 8.3 GitHub Pages 設定

- **Repository Settings → Pages**
  - Source: `Deploy from a branch`
  - Branch: `gh-pages` / `/(root)`
- 網站 URL: `https://<username>.github.io/1949-guningtou/`
- 自訂域名（可選）：在 repo 設定中填入，並在 DNS 新增 CNAME 記錄

### 8.4 Astro 的 GitHub Pages 適配

```javascript
// astro.config.mjs
export default defineConfig({
  site: 'https://<username>.github.io',
  base: '/1949-guningtou',  // 若使用自訂域名則改為 '/'
  output: 'static',
});
```

---

## 九、Phase 規劃

| Phase | 內容 | 交付物 | 預估 |
|---|---|---|---|
| **P0** | 專案初始化：Astro + React + Tailwind + 資料複製 | 可執行的空白網站 | 1 回合 |
| **P1** | 首頁：3D 地球主視覺 + 和平宣言 + 戰役總覽 | 首頁可見 | 2-3 回合 |
| **P2** | 時間軸頁 + 戰前國際情勢頁 | 時間軸可互動 | 2 回合 |
| **P3** | Leaflet 地圖 + POI 列表/詳情頁 | 地圖頁面完成 | 2 回合 |
| **P4** | 人物列表/詳情頁 + 視角切換器 | 雙視角運作 | 2 回合 |
| **P5** | 故事弧線頁面 + 戰後影響頁 | 核心內容完成 | 2 回合 |
| **P6** | 來源索引 + 語系 + SEO + 響應式 + GitHub Actions | 可部署 | 2 回合 |
| **P7** | 部署 GitHub Pages + 效能優化 + Lighthouse | 上線 | 1 回合 |

---

## 十、參考專案與技術

### 設計靈感

| 專案 | 參考點 |
|---|---|
| [American Battlefield Trust](https://www.battlefields.org/) | 互動地圖 + 時間軸整合 |
| [Omniatlas](https://omniatlas.com/) | 歷史地圖動畫、時序推移 |
| [The Fallen of WWII](https://www.fallen.io/) | 數據敘事、scroll-driven storytelling |
| [Pacific War Animated](http://pacificwaranimated.com/) | 部隊移動箭頭動畫 |
| [Stanford ORBIS](https://orbis.stanford.edu/) | 學術歷史 GIS 網站 |

### 核心技術庫

| 庫 | ⭐ | 用途 |
|---|---|---|
| `react-globe.gl` | 1,423 | 3D 地球主視覺 |
| `Leaflet` + `react-leaflet` | 42K+ | POI 互動地圖 |
| `GSAP` + `ScrollTrigger` | 20K+ | scroll-driven 動畫 |
| `nanostores` | 5K+ | 全域 perspective 狀態 |
| `Astro` | 50K+ | 靜態網站框架 |

### 地圖底圖

- OpenStreetMap（免費、無需 API key）
- 備用：CartoDB Positron（淺色學術風格）

---

## 十一、統計摘要

| 既有 Battlefield_OS 資料 | 數量 | 用途 |
|---|---|---|
| Timeline 時間軸 | 123 條 | /timeline 頁面 |
| Events 事件 | 30 個 | /timeline 展開詳情 |
| POI 地點 | 25 個 | /map + /locations |
| Persons 人物 | 36 位 | /figures（ROC/PRC 各半） |
| Story Arcs 故事弧線 | 12 條 | /stories |
| Scenes 場景 | 33 個 | /stories/:id 展開 |
| Narrative Beats 節拍 | 115 個 | /stories/:id 內容 |
| Narratives 敘事文本 | 47 篇 | 各頁面文字內容 |
| POI Audio Guides 導覽 | 25 篇 ×3 段 | /locations/:id 語音稿 |
| Sources 來源 | 38 筆 | /sources 引用索引 |
| Spatial Network 空間網路 | 完整 | /map 路線繪製 |
| PRC 獨立資料 | 8 模組 | 雙視角系統 |

---

> **下一步**：使用者確認架構 → 進入 Phase 0（初始化專案骨架）
