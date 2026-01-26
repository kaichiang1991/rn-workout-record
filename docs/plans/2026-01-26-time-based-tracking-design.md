# 時間型訓練記錄功能設計

## 概述

擴展現有訓練記錄系統，支援「時間型」訓練記錄（如平板支撐、側棒式等核心訓練），與現有的「次數型」記錄並存。

## 設計決策

| 項目       | 決策                                          |
| ---------- | --------------------------------------------- |
| 時間單位   | 秒數（整數）                                  |
| 區分方式   | 記錄時由使用者選擇（非運動項目層級）          |
| 資料結構   | `workout_sets` 表新增 `duration` 欄位         |
| UI 切換    | SegmentedControl 切換按鈕                     |
| 顯示格式   | 統一用秒數顯示（如「60 秒」）                 |
| 舊資料兼容 | 現有記錄 `duration` 為 NULL，自動識別為次數型 |

---

## 資料庫變更

### 1. workout_sets 表新增欄位

```sql
ALTER TABLE workout_sets ADD COLUMN duration INTEGER;
```

| 欄位       | 型別      | 說明                  |
| ---------- | --------- | --------------------- |
| `duration` | `INTEGER` | 時間（秒），可為 NULL |

### 2. 記錄類型判斷邏輯

不需要額外的 `trackingType` 欄位，根據資料內容判斷：

- `duration !== null` → 時間型記錄
- `duration === null` → 次數型記錄

### 3. 遷移安全機制

```typescript
// 檢查欄位是否存在
const tableInfo = await database.getAllAsync<{ name: string }>("PRAGMA table_info(workout_sets)");
const hasDuration = tableInfo.some((col) => col.name === "duration");

if (!hasDuration) {
  await database.execAsync("ALTER TABLE workout_sets ADD COLUMN duration INTEGER");
}
```

---

## TypeScript 型別變更

### 1. 更新 WorkoutSet 介面

```typescript
// src/db/client.ts
export interface WorkoutSet {
  id: number;
  sessionId: number;
  setNumber: number;
  reps: number | null;
  weight: number | null;
  duration: number | null; // 新增：時間（秒）
}
```

### 2. 新增追蹤類型輔助型別

```typescript
export type TrackingMode = "reps" | "time";

// 輔助函數：判斷記錄類型
export function getTrackingMode(set: WorkoutSet): TrackingMode {
  return set.duration !== null ? "time" : "reps";
}

// 輔助函數：格式化顯示
export function formatDuration(seconds: number): string {
  return `${seconds} 秒`;
}
```

### 3. 新增 Set 輸入型別

```typescript
export interface WorkoutSetInput {
  setNumber: number;
  reps?: number | null;
  weight?: number | null;
  duration?: number | null;
}
```

---

## UI 變更

### 1. 訓練記錄輸入介面

在每組記錄的輸入區域新增「模式切換」：

```
┌─────────────────────────────────────────┐
│  第 1 組                                │
│  ┌─────────┐ ┌─────────┐               │
│  │  次數   │ │  時間   │  ← SegmentedControl
│  └─────────┘ └─────────┘               │
│                                         │
│  【次數模式】        【時間模式】        │
│  重量: [___] kg      時間: [___] 秒     │
│  次數: [___] 下                         │
└─────────────────────────────────────────┘
```

### 2. 切換行為

- **預設模式**：次數（維持現有習慣）
- **切換時機**：每組可獨立切換（但通常整個 session 會用同一種）
- **資料清除**：切換模式時，清空另一種模式的輸入值

### 3. 歷史記錄顯示

```
【次數型】              【時間型】
臥推                    平板支撐
50kg × 10 下 × 3 組     60 秒 × 3 組
```

---

## 實作順序

1. **資料庫遷移** — 新增 `duration` 欄位與遷移檢查邏輯
2. **型別更新** — 修改 `WorkoutSet` 介面
3. **輔助函數** — 新增 `getTrackingMode`、`formatDuration`
4. **資料層** — 修改新增/編輯 set 的 SQL 語句
5. **UI 元件** — 新增模式切換、修改顯示邏輯

## 需要修改的檔案

- `src/db/client.ts` — 資料庫遷移、型別定義
- `src/components/WorkoutSetInput.tsx`（或相關輸入元件）— 新增模式切換
- `src/components/WorkoutHistoryItem.tsx`（或相關顯示元件）— 修改顯示邏輯
- 相關 hooks — 新增/編輯 set 的邏輯
