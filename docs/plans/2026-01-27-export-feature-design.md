# 匯出訓練紀錄功能設計

## 概述

在首頁 header 右側新增「匯出」按鈕，導航至匯出頁面，讓使用者可以選擇時段並匯出訓練紀錄（圖表或文字格式），透過系統分享功能分享。

## 功能需求

### 1. 首頁 Header 修改

- 在首頁 header 右側新增「匯出」圖示按鈕
- 點擊後導航至 `/export` 頁面

### 2. 匯出頁面 UI

```
┌─────────────────────────┐
│  ← 匯出訓練紀錄          │  ← Header
├─────────────────────────┤
│  📅 選擇時段             │
│  [今日] [7天] [30天] ... │  ← 快捷選項 Chips
│  起始：2025-01-01  📅    │  ← 自訂日期（可選）
│  結束：2025-01-27  📅    │
├─────────────────────────┤
│  📊 匯出格式             │
│  ○ 圖表（統計長條圖）    │
│  ○ 文字（每日明細）      │
├─────────────────────────┤
│     [ 預覽 / 分享 ]      │  ← 主要 CTA 按鈕
└─────────────────────────┘
```

### 3. 日期選擇

**快捷選項：**

- 今日（預設）
- 最近 7 天
- 最近 30 天
- 本月
- 上個月

**自訂日期：**

- 起始日期選擇器
- 結束日期選擇器

### 4. 匯出格式

#### 4.1 圖表（水平長條圖 + 統計摘要）

```
┌─────────────────────────────────┐
│   📊 訓練統計                    │
│   2025/01/01 ~ 2025/01/27       │
│   共訓練 12 天 ｜ 總計 45 組     │
├─────────────────────────────────┤
│                                 │
│  臥推   ████████████  12組/96下 │
│  深蹲   █████████     9組/72下  │
│  硬舉   ██████        6組/48下  │
│  肩推   █████         5組/40下  │
│  划船   ████          4組/32下  │
│                                 │
└─────────────────────────────────┘
```

- 長條長度代表訓練量（組數）
- 右側顯示精確資訊（組數/次數）
- 上方顯示總覽摘要（訓練天數、總組數）

#### 4.2 文字（每日明細）

```
📋 訓練紀錄
2025/01/20 ~ 2025/01/27
共訓練 4 天 ｜ 總計 23 組

────────────────────
📅 2025/01/27（一）
────────────────────
• 臥推｜3組 × 8下｜50kg
• 臥推｜2組 × 6下｜60kg
• 飛鳥｜3組 × 12下｜12kg
• 三頭下壓｜3組 × 15下

────────────────────
📅 2025/01/25（六）
────────────────────
• 深蹲｜3組 × 8下｜70kg
• 深蹲｜1組 × 5下｜80kg
• 腿推｜3組 × 12下｜120kg
```

**資料分組邏輯：**

- 依「日期 + 項目 + 重量」分組
- 同一天同項目但重量不同 → 分成多列
- 自重訓練或無重量 → 不顯示重量欄位
- 若有備註，在項目下方顯示

### 5. 輸出方式

- 使用系統分享功能（`expo-sharing`）
- 圖表：截圖為圖片後分享
- 文字：直接分享文字內容

## 技術實作

### 新增/修改的檔案

| 檔案                                      | 說明                                   |
| ----------------------------------------- | -------------------------------------- |
| `app/(tabs)/_layout.tsx`                  | 修改首頁的 `headerRight`，新增匯出按鈕 |
| `app/export.tsx`                          | 新增匯出頁面                           |
| `app/_layout.tsx`                         | 註冊 export 路由                       |
| `src/hooks/useExportData.ts`              | 查詢指定時段的訓練資料並整理格式       |
| `src/components/export/ExportChart.tsx`   | 水平長條圖元件                         |
| `src/components/export/ExportPreview.tsx` | 匯出預覽元件                           |

### 需要安裝的套件

- `expo-sharing` — 系統分享功能
- `react-native-view-shot` — 將 View 截圖成圖片
- `@react-native-community/datetimepicker` — 日期選擇器（如尚未安裝）

### 資料結構

```typescript
// 匯出用的統計資料
interface ExportStats {
  startDate: string;
  endDate: string;
  totalDays: number; // 訓練天數
  totalSets: number; // 總組數
  exerciseStats: ExerciseExportStat[];
}

interface ExerciseExportStat {
  exerciseId: number;
  exerciseName: string;
  totalSets: number;
  totalReps: number;
}

// 每日明細資料
interface DailyDetail {
  date: string;
  dayOfWeek: string;
  items: DailyDetailItem[];
}

interface DailyDetailItem {
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number | null;
  notes: string | null;
}
```

## 實作步驟

1. 安裝必要套件（expo-sharing, react-native-view-shot）
2. 建立 `useExportData` hook
3. 建立 `ExportChart` 元件（水平長條圖）
4. 建立 `ExportPreview` 元件
5. 建立 `app/export.tsx` 頁面
6. 修改 `app/(tabs)/_layout.tsx` 新增 header 按鈕
7. 註冊路由至 `app/_layout.tsx`
