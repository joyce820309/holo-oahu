# Holo — UI/UX Conventions

## 表單設計原則

### 雙語欄位（BilingualField）

需要中英雙語輸入的欄位（標題、地點、地址、備註）一律使用 `BilingualField` component，不拆成兩個獨立 input。

- label 右側有 `中 / EN` chip，切換當前輸入語言
- **語言 state（`inputLang`）是 page 層級的全域 state**，切換一次整個表單同步，不需逐欄切換
- component 定義在 module 最上層（非 render 函式內），避免 React unmount/remount 導致 focus 消失

```jsx
// ✅ 正確：定義在 module 頂層
function BilingualField({ label, inputLang, setInputLang, zhValue, enValue, onZhChange, onEnChange }) { ... }

// ❌ 錯誤：定義在 component 內部（每次 render 重建，游標消失）
export default function MyPage() {
  const BilingualField = () => { ... }
}
```

---

### 下拉選單（CustomSelect）

原生 `<select>` 在 iOS 的樣式無法客製化，一律使用 `CustomSelect`。

**實作重點：**
- 用 `createPortal` 把 dropdown panel 渲染到 `document.body`，避免被 `backdrop-filter` 的 stacking context 截斷（z-index 失效問題）
- 位置用 `getBoundingClientRect()` 動態計算，配合 `position: absolute` + `window.scrollY`
- hover 狀態用 `onMouseEnter`/`onMouseLeave` + local state，因為 inline style 無法使用 CSS `:hover`
- 選中項目顯示 `Check` icon + accent 色；hover 顯示 8% accent 底色

**日期選單：** 顯示格式為 `MM-DD 第N天`，value 為 `YYYY-MM-DD`
```js
const TRIP_DAYS = Array.from({ length: 9 }, (_, i) => {
  // value: '2026-07-18', label: '07-18 第1天'
})
```

**時間選單（TimeSelect）：** 小時和分鐘拆成兩個並排的 `CustomSelect`
- 小時：`00`–`23`，24 小時制
- 分鐘：`00`, `15`, `30`, `45`（四個固定選項）
- 更新任一個不影響另一個已選的值

---

### 進階設定（AdvancedToggle）

非必填、一般使用者不常用的欄位（緯度、經度、地圖連結）用 toggle switch 收合。

- 預設**收起**
- UI 為 pill-style toggle switch（寬 40px、高 22px），開啟時顯示 accent 色
- 展開後 `children` 在下方以 `space-y-3` 排列

```jsx
<AdvancedToggle>
  <InputField label="緯度" ... />
  <InputField label="經度" ... />
  <InputField label="地圖連結" ... />
</AdvancedToggle>
```

---

## 活動列表（ActivitiesPage）時間軸

### 結構

```
[序號圓點]  [activity card]
[時間]
            [交通 connector row]
[序號圓點]  [activity card]
```

- 左側垂直線：`position: absolute, left: 19px`，連接所有圓點
- 序號圓點：accent 色，直徑 24px，數字從 1 開始（按 startTime 排序）
- 時間顯示在圓點正下方，10px 字體

### 交通 connector row

兩張卡片**之間**永遠顯示 connector row（包含沒設定交通的情況）：

| 狀態 | 顯示 |
|------|------|
| 已設定交通 | `[icon] [交通方式] · [分鐘]` + 右側 `EllipsisVertical` 按鈕 |
| 未設定 | 虛線框 `+ 設定交通` 按鈕 |

點擊任一個都進入 `/trip/activities/:id/transport`（TransportEditPage）。

### 滑動刪除（SwipeableCard）

手機（`< md`）：左滑露出「編輯」（accent）+ 「刪除」（#e05555）按鈕，各 64px 寬。

**實作注意：**
- action buttons 用 `position: absolute` + `translateX(ACTION_WIDTH + offset)` 跟著卡片移動，**不能**用 `overflow: hidden` 包住（會裁掉按鈕）
- `touchmove` listener 設為 `passive: false` 才能呼叫 `e.preventDefault()` 阻止垂直捲動干擾

---

## 交通編輯（TransportEditPage）

從 ActivitiesPage 的 connector row 進入，路由：`/trip/activities/:id/transport`。

- 頂部顯示「離開 [活動名稱] → 前往下一站」的上下文 context card
- 交通方式：3×2 grid，每個選項有 icon + 文字，選中時顯示 accent 色框 + 淡底色
- 時間（分鐘）和備註只在選擇非「無」時顯示
- 備註支援中英雙語（同 BilingualField 的 `中 / EN` chip 設計）
- **交通設定不在 ActivityFormPage 內**，完全分離為獨立頁

---

## 設計 Token 對照

| 用途 | Token |
|------|-------|
| 主色 | `var(--accent)` |
| 卡片背景 | `var(--glass-bg)` / `var(--mini-bg)` |
| 邊框 | `var(--glass-border)` / `var(--mini-border)` |
| 主文字 | `var(--text-primary)` |
| 次要文字 | `var(--text-secondary)` |
| focus ring | `color-mix(in srgb, var(--accent) 20%, transparent)` |
| hover 底色 | `color-mix(in srgb, var(--accent) 8%, transparent)` |
| 選中底色 | `color-mix(in srgb, var(--accent) 15%, transparent)` |
