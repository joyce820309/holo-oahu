



### Plan: 行程匯出功能（文字版 + TXT 下載）
目標是先做第一版可用功能：在行程頁新增匯出入口，產出與 exportTemp.md 同風格的每日文字行程，內容包含 flights + activities，並可下載 .txt。
你已確認的方向我都納入了：先做純文字、一定含機票、第一版要下載檔案、API 指的是前端內部函式 API。

### Steps

#### Phase A - 定義前端 Export API 規格
- 新增匯出核心模組（建議 src/lib/exportItinerary.js），定義輸入與輸出契約。
- 輸入契約包含 activities、flights、lang、tripStartDate、tripEndDate。
- 輸出契約為單一字串，每天一行，格式對齊 exportTemp.md。
#### Phase B - 文字格式引擎
- 實作資料正規化：雙語 fallback、日期時間清洗、缺欄位容錯。
- 實作依日期分桶與排序（先 flight 再 activity，activity 依 startTime）。
- 實作每日行文字渲染：DayN + (M/D) + 該日項目串接。
#### Phase C - UI 串接
- 在 ActivitiesPage.jsx 新增匯出按鈕（沿用現有按鈕風格）。
- 點擊匯出時組裝輸入 payload，呼叫匯出 API 產生文字。
- 用 Blob + URL.createObjectURL 下載 txt，檔名格式 itinerary-YYYYMMDD-HHmm.txt。
- 加上成功/失敗 toast 與執行中保護。
#### Phase D - i18n
- 在 zh-TW.json 與 en.json 補 export 相關 key（按鈕、訊息）。
- 匯出內容語言依目前語系（zh-TW 或 en）輸出。
#### Phase E - 驗證
- 用你提供格式範本比對結果結構（Day1-Day9 文字行）。
- 驗證離線情境（曾同步過資料後斷網）仍可匯出，不影響頁面互動。
- 驗證既有功能不回歸（tab/filter、編輯模式、卡片操作、刪除等）。

### Relevant files

- exportTemp.md — 匯出格式基準
- ActivitiesPage.jsx — 匯出按鈕與下載流程
- useActivities.js — activities 資料來源
- useFlights.js — flights 資料來源
- tripCalendar.js — trip 日期範圍與 day 順序
- syncFlightActivities.js — 日期時間解析可重用模式
- zh-TW.json — 中文文案
- en.json — 英文文案
- src/lib/exportItinerary.js — 新增的匯出 API 模組

### Verification

- 匯出文字檢查：每天一行，格式貼近 exportTemp.md。
- 排序檢查：同日先 flight 後 activity，activity 依時間。
- 容錯檢查：缺時間、缺雙語欄位、跨日 flight 不會破格式。
- 下載檢查：成功產生 txt，檔名符合規則。
- 語系檢查：zh-TW/en 切換後輸出語言正確。
- 離線檢查：離線狀態下（已有本地資料）可正常匯出。

### Decisions

- Included: 純文字匯出、含 flights + activities、下載 txt。
- Excluded (v1): JSON 匯出、後端 HTTP 匯出 API、PDF/Email。
- API 定位：前端內部函式 API（不是後端 endpoint）。

### API Prompt（可直接給後續實作代理）
請在前端新增行程匯出功能，輸出純文字並可下載 txt。格式必須對齊 exportTemp.md 的 DayN 每日一行風格。請建立 
src/lib/exportItinerary.js，並提供以下函式：

- createItineraryExportText(input) -> string
- normalizeExportItem(raw, lang) -> normalized item
- groupByTripDay(items, tripStartDate, tripEndDate) -> ordered day buckets
- renderDayLine(dayBucket, dayIndex, lang) -> string
- renderFullItinerary(dayBuckets, lang) -> string

### 輸入 payload 欄位：

- activities array
- flights array
- lang
- tripStartDate
- tripEndDate

### 規則：

- 只匯出 confirmed activities。
- 先按 date，再按 startTime 排序。
- 同一天先輸出 flights，再輸出 activities。
- 雙語欄位 fallback：目前語系 -> 另一語系 -> 空字串。
- 時間缺值要容錯，不能壞掉整行格式。
- 保持中文標點與空白風格貼近範本。

### 頁面整合請在 ActivitiesPage.jsx：

- 新增 Export 按鈕。
- 點擊後組裝 payload 呼叫 createItineraryExportText。
- 用 Blob 下載 text/plain;charset=utf-8。
- 檔名格式 itinerary-YYYYMMDD-HHmm.txt。
- 成功/失敗顯示 toast。
- 不可影響現有行程頁互動（tabs、edit mode、卡片操作）。