# Walk 我可遛 · MVP

雙向媒合遛狗平台的可體驗 MVP。由原本的單檔靜態 Mockup（[duicn187532/walk6](https://github.com/duicn187532/walk6)）重構為
**React + Express + SQLite + 本機 Ollama**，飼主與遛狗者兩個角色共用同一份資料庫，完整流程都能實際操作。

架構決策請見 [docs/ADR-001-mvp-architecture.md](docs/ADR-001-mvp-architecture.md)。

## 快速開始

需求：Node.js ≥ 22.13（使用內建 `node:sqlite`）。Ollama 為選配。

```bash
npm install
npm run dev
```

- 前端：http://localhost:5180
- API：http://localhost:4100/api
- 第一次啟動會自動建立 `data/walk.db` 並灌入模擬資料；之後可隨時 `npm run seed` 或在側欄點「重置模擬資料」。

### 一鍵啟動與對外分享（Windows）

雙擊 **`start-walk.bat`**：自動安裝套件 → 建置 → 開啟「Walk-Server」與「Walk-Tunnel」兩個視窗。
ngrok 連結會顯示在 Walk-Tunnel 視窗並存到 `share-links.txt`，兩位體驗者各用一個：

| 連結 | 身分 |
|---|---|
| `https://<ngrok 網域>/owner?as=A` | 體驗者 A：小晴（飼主兼遛狗者） |
| `https://<ngrok 網域>/walker?as=B` | 體驗者 B：林以安（遛狗者兼飼主） |

雙擊 **`stop-walk.bat`** 停止（只關本專案的程序，不會關到其他專案的 ngrok）。
免費 ngrok 帳號只有一個網域；若被其他專案佔用，把另一個帳號的 authtoken 或保留網域填進 `.env.ngrok`（範本：`.env.ngrok.example`）。

**自行註冊**：沒登入時會看到註冊／登入頁，用 Email＋密碼（至少 6 碼）建立帳號，可選「找人遛狗／當遛狗者／兩個都要」；選遛狗者會自動建立預設信任履歷。密碼以 scrypt 雜湊存放。示範帳號（如 `qing@example.com`）的密碼都是 `walk1234`，登入頁也有一鍵體驗按鈕；`?as=A`／`?as=B` 連結仍會直接登入兩位體驗者。⚠ 「重置模擬資料」會清除所有自行註冊的帳號。

**角色可兼任**：每個帳號都能在側欄切換「我是飼主／我是遛狗者」；單一身分的帳號點另一個身分會詢問是否開通。

### AI（選配）

```bash
ollama pull qwen3.5:4b
```

啟動後側欄會顯示「AI 已連線」。沒有 Ollama 時所有 AI 功能自動改用規則模板，流程不受影響。
可用環境變數切換：`OLLAMA_URL`、`OLLAMA_MODEL`（需支援 vision 才能判讀照片）。

| 功能 | 位置 |
|---|---|
| 推薦理由（依毛孩檔案 × 遛狗者履歷） | 飼主 › AI 信任媒合 |
| 面談問題建議 | 飼主 › 面談訊息 |
| 散步照片狀態判讀（vision） | 遛狗者 › 散步現況回報 |
| 散步照護報告 | 飼主 › 照護報告與評價 |

## 建議體驗路線（約 5 分鐘）

1. **飼主 小晴** › 總覽：柯基封面、Lucky 正在散步中 → 點進 **散步即時守護**，看 GPS 每 3 秒移動，可按「模擬 GPS 偏離」。
2. **AI 信任媒合**：換毛孩（奶茶／Lucky／布丁）看排序與 AI 推薦理由改變；點「聊天面談」。
3. **預約與路線**：選 林以安、勾選照護加給、選地圖路線 → 送出預約邀請。
4. 左上切到 **我是遛狗者**（德牧封面）› 工作台：接受剛剛的邀請 → **行程與交接** › 開始散步。
5. **散步現況回報**：上傳一張照片＋文字（AI 會判讀照片）→ 回到飼主端即時守護頁可看到 → 結束散步。
6. 飼主 › **照護報告與評價**：AI 自動產生報告 → 評分並結單 → 遛狗者 › **收益與評價** 立即入帳。

右上角的名字是下拉選單，可切換成其他示範飼主／遛狗者。

## 模擬資料

| 類別 | 內容 |
|---|---|
| 飼主 | 6 位（小晴、阿哲、美玲、志明、佳穎、宗翰） |
| 遛狗者 | 8 位，各有不同專長、時段、收費、交通與地區 |
| 毛孩 | 10 隻（柯基、黃金獵犬、柴犬、德牧、拉布拉多、貴賓…） |
| 歷史訂單 | 約 93 筆已結單散步與評價、放鳥／臨時取消紀錄（信任分數由此計算） |
| 進行中情境 | 1 趟散步中、1 趟待評價、2 筆指定邀請、3 筆公開任務、面談訊息 |

## 專案結構

```
server/
  index.js       Express API（所有路由）
  domain.js      收費（飼主 +5% / 遛狗者 −10%）、媒合分數、時段檢查、台北散步路線
  ai.js          Ollama 封裝與後備文案
  simulator.js   GPS 模擬器（SIM_SPEED=10 → 60 分鐘散步 6 分鐘播完）
  seed.js        模擬資料
  db.js          SQLite schema
web/src/
  pages/owner/*  飼主 6 頁 + Chat
  pages/walker/* 遛狗者 6 頁
  components/    Covers（柯基／德牧 SVG 封面）、WalkMap（Leaflet）、ui
data/            walk.db 與上傳照片（git 忽略）
legacy/          原始 V3 Mockup
```

## MVP 刻意不做的事

真實登入與權限（以「切換示範帳號」代替）、金流、真實 GPS、輸入驗證與完整錯誤處理、HTTPS、多實例部署。
詳見 ADR 的 Consequences 段落。
