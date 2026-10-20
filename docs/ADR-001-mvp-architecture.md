# ADR-001: Walk 我可遛 MVP 架構

**Status:** Accepted
**Date:** 2026-10-20
**Deciders:** 產品負責人（duicn187532）

## Context

原專案 [`duicn187532/walk6`](https://github.com/duicn187532/walk6) 是單一 190KB 的 `index.html` 靜態 Mockup（V3），
用 GitHub Pages 部署。它已經把產品概念畫得很完整：

- **雙角色**：飼主（6 頁：總覽、毛孩檔案、AI 信任媒合、預約與路線、即時守護、照護報告）與遛狗者（6 頁：工作台、信任履歷、接單、行程、現況回報、收益）。
- **核心規則**：媒合適配分數（評價、準時率、放鳥/取消扣分、毛孩特性）、可服務時段檢查、免費/付費模式、條件加給、透明抽成（飼主 +5%、遛狗者 −10%）。
- **限制**：所有資料是寫死的陣列 + `localStorage`；兩個角色不共享狀態；GPS、照片 AI、報告都是假的。

這次目標是「**可以實際體驗的 MVP**」：兩個角色要真的透過同一份資料互動，資料庫預先放好模擬資料，
但**不追求上線等級**的資安、錯誤處理與擴展性。

已知的環境限制（本機）：

| 項目 | 狀態 |
|---|---|
| Node.js | v22.19（內建 `node:sqlite`） |
| Docker | 已安裝但 daemon 未啟動 |
| Ollama | 運行中，已有 `qwen3.5:4b`（支援 vision、繁中）等模型 |
| 5173 / 8000 port | 已被佔用 |

## Decision

採用 **單機三件式**：React SPA + Node API（內含 SQLite）+ 本機 Ollama。一個指令 `npm run dev` 啟動。

```
┌────────────── Browser ──────────────┐
│ React 18 + Vite（:5180）             │
│  飼主 / 遛狗者 雙角色、Leaflet 地圖    │
└──────────────┬──────────────────────┘
               │ /api（Vite proxy，輪詢 3s）
┌──────────────▼──────────────────────┐
│ Express API（:4100）                 │
│  ├ pricing.js   透明收費（5% / 10%）  │
│  ├ matching.js  適配分數 + 因子拆解   │
│  ├ simulator.js GPS 模擬器（每 3s）   │
│  ├ ai.js        Ollama 封裝 + 後備文案│
│  └ uploads/     照片檔                │
└──────┬───────────────────┬──────────┘
       │ node:sqlite       │ HTTP
┌──────▼──────┐    ┌───────▼─────────┐
│ walk.db     │    │ Ollama :11434    │
│ seed.js 預載│    │ qwen3.5:4b       │
└─────────────┘    └─────────────────┘
```

AI 只用在「有價值且失敗也不會壞流程」的地方，Ollama 沒開時一律回退到模板文字：

1. **媒合理由**：依毛孩檔案 + 遛狗者履歷生成 2–3 句推薦說明。
2. **面談問題建議**：依毛孩特性產生 3 個面談時該問的問題。
3. **照片現況檢查**：遛狗者上傳照片 → vision 模型產生標籤並判斷是否需要飼主關注。
4. **照護報告**：散步結束後，依 GPS 距離、回報紀錄自動撰寫給飼主的報告。

## Options Considered

### Option A：Node + SQLite（`node:sqlite`）+ 本機 Ollama ✅ 採用

| Dimension | Assessment |
|---|---|
| Complexity | Low：零外部服務、零原生編譯 |
| Cost | 免費、本機 |
| Scalability | 單機、單寫入者；MVP 足夠 |
| Team familiarity | 前後端同語言（JS） |

**Pros:** `npm install` 完就能跑；DB 是單一檔案，`npm run seed` 一鍵重置；Schema 只用標準 SQL，之後搬到 Postgres 成本低。
**Cons:** `node:sqlite` 仍標示 experimental；不支援多實例；沒有即時推播（以輪詢代替）。

### Option B：Docker Compose（Postgres + FastAPI + Ollama 容器）

| Dimension | Assessment |
|---|---|
| Complexity | Med：需啟動 Docker Desktop、WSL、映像下載 |
| Cost | 免費，但 Ollama 容器要重新下載模型（數 GB） |
| Scalability | 較接近正式環境 |
| Team familiarity | 前後端兩種語言 |

**Pros:** 和正式上線架構一致；Postgres 有 PostGIS 可做地理查詢。
**Cons:** 目前 daemon 沒開；Windows 上 GPU 直通 Ollama 容器麻煩；對「先體驗」的目標而言過重。

### Option C：維持純前端 + localStorage（只重構 UI）

**Pros:** 最快。 **Cons:** 兩個角色無法真正互動，不符合「可實際體驗」的要求。不採用。

## Trade-off Analysis

決定的關鍵是「**第一次就能跑起來**」比「像正式環境」更重要。Option B 的好處（Postgres、容器化）在 MVP 階段沒有被用到，
卻要付出啟動 Docker、重抓模型的成本。Option A 把所有商業規則集中到後端（收費、媒合、時段檢查），
這正是之後換資料庫或拆服務時最需要被保留的部分，所以未來遷移時損失很小。

即時性用 3 秒輪詢取代 WebSocket：散步監控的資料更新頻率本來就是秒級，輪詢足夠且少一個元件。

## Consequences

- **變容易**：兩個角色共享真實資料（預約→接單→開始散步→回報→報告→評價→結算全流程可走完）；收費與媒合規則可測、可調。
- **變困難**：多人同時寫入、雲端部署（GitHub Pages 不能再承載這版，需要有 Node 的主機）。
- **刻意不做**：真實登入/權限（以「切換身分」下拉選單代替）、金流、真實 GPS、輸入驗證與錯誤處理細節、HTTPS。
- **之後要重新評估**：上線前改 Postgres + 真實 Auth；輪詢改 SSE/WebSocket；照片改物件儲存；AI 判斷需加入人工覆核流程。

## Action Items

1. [x] 後端：Schema + 種子資料（8 位遛狗者、6 位飼主、10 隻毛孩、約 60 筆歷史訂單與評價）
2. [x] 後端：收費、媒合、時段檢查、GPS 模擬器、Ollama 封裝
3. [x] 前端：React 重構雙角色 12 頁；飼主封面改柯基、遛狗者封面改德牧
4. [x] 一鍵啟動腳本與 README
5. [ ] （後續）真實帳號與權限、Postgres 遷移、部署方案
