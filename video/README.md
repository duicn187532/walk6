# Walk 我可遛 宣傳片（Remotion）

48 秒、1920×1080、30fps、繁體中文。用 video-shotcraft「自主自由創作」流程製作，畫面全部來自 app 的真實頁面截圖（虛構示範資料）。

| 成片 | 說明 |
|---|---|
| `out/promo.mp4` | 帶 BGM（house-vibez，Mixkit）＋音效 |
| `out/promo-nobgm.mp4` | 只有音效，方便自行配樂 |

## 常用指令

```bash
npm install
npm run dev            # Remotion Studio 預覽
npm run render         # 輸出 out/promo.mp4
npm run render:nobgm   # 輸出 out/promo-nobgm.mp4
npm run capture        # 重新截取 app 頁面（app 需在 http://localhost:4100 運行）
```

## 結構

- `src/walk/timeline.ts`：唯一時間來源——鏡頭邊界（以 BGM 拍號 `beatF(n)` 表示）、字幕、字卡文案、音效釘帧表
- `src/walk/scenes/*`：10 個鏡頭（各檔開頭註明參考的鏡頭卡與保留的關鍵參數）
- `src/walk/layout.json` + `public/textures/live/`：`npm run capture` 產生的頁面截圖與元素座標
- `src/workbench.ts`：動效工作台清單（文案、顏色、字號可視化調整）
- `docs/design-spec.md`：產品簡報、視覺 tokens、音樂結構、分鏡與終檢修訂紀錄
- `analysis/`：BGM 節拍分析、渲後音畫對齊回測（`render_check.txt`）、音效峰值量測

改文案：直接改 `timeline.ts` 的 `TITLE_CARDS` / `CAPTIONS`，或各場景檔的 `*_DEFAULTS`，再 `npm run render`。
