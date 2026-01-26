# 訓練菜單目標設定功能設計

## 概述

擴充訓練菜單功能，讓使用者可以為每個動作設定期望目標（如「5組 × 5下」），並在訓練時顯示菜單描述和動作目標。

## 需求

1. **Modal Header 增強**：在記錄訓練的 Modal 中，菜單名稱下方顯示菜單描述
2. **動作目標設定**：
   - 混合模式：結構化輸入（組數 + 次數/時間）+ 可切換為自由文字
   - 顯示在動作名稱旁，例如「深蹲 (5組 × 5下)」
   - 目標為空時不顯示括號
3. **編輯流程改進**：
   - 第一步：編輯項目（現有的拖曳功能）
   - 第二步：點「下一步」→ 卡片式頁面逐項設定每個動作的目標

---

## 資料模型

擴充 `training_menu_items` 表：

```sql
ALTER TABLE training_menu_items ADD COLUMN targetSets INTEGER;
ALTER TABLE training_menu_items ADD COLUMN targetReps INTEGER;
ALTER TABLE training_menu_items ADD COLUMN targetDuration INTEGER;
ALTER TABLE training_menu_items ADD COLUMN targetText TEXT;
```

| 欄位           | 類型            | 說明                   |
| -------------- | --------------- | ---------------------- |
| targetSets     | INTEGER \| null | 目標組數               |
| targetReps     | INTEGER \| null | 目標次數（次數型）     |
| targetDuration | INTEGER \| null | 目標時間（秒，時間型） |
| targetText     | TEXT \| null    | 自由文字目標           |

**TypeScript 介面**：

```typescript
interface MenuItemWithGoal extends MenuItemWithExercise {
  targetSets: number | null;
  targetReps: number | null;
  targetDuration: number | null;
  targetText: string | null;
}
```

---

## UI 設計

### 1. 編輯頁面修改 (`app/menu/[id].tsx`)

在頁面底部新增「下一步：設定目標」按鈕：

- 菜單項目為空時，按鈕顯示為禁用狀態
- 點擊後導航到 `app/menu/[id]/goals.tsx`

### 2. 目標設定頁面 (`app/menu/[id]/goals.tsx`)

卡片式逐項設定：

```
┌─────────────────────────────────┐
│  [返回]    設定目標     [完成]   │
├─────────────────────────────────┤
│         1 / 3                   │
│    ┌───────────────────────┐    │
│    │        深蹲           │    │
│    │   ┌─────┐  ┌─────┐    │    │
│    │   │  5  │  │  5  │    │    │
│    │   │ 組  │  │ 下  │    │    │
│    │   └─────┘  └─────┘    │    │
│    │   [次數型 ▼]          │    │
│    │   □ 改用自由文字       │    │
│    └───────────────────────┘    │
│     [上一個]        [下一個]     │
└─────────────────────────────────┘
```

**行為**：

- 左右滑動或按鈕切換不同動作
- 每個欄位都可為空（直接跳過）
- 勾選「改用自由文字」後，結構化輸入隱藏，顯示文字輸入框
- 點擊「完成」儲存所有目標並返回菜單列表

### 3. 訓練 Modal 修改 (`app/workout/menu/[menuId].tsx`)

**Header 區域**：

```
│         增肌訓練菜單             │  ← 菜單名稱
│    每週三次，專注大肌群訓練        │  ← 菜單描述（較小字、灰色）
```

**動作名稱顯示**：

```
│   深蹲 (5組 × 5下)        [⇄]   │
```

---

## 目標格式化邏輯

```typescript
// src/utils/goals.ts

export function formatGoal(item: MenuItemWithGoal): string {
  // 優先使用自由文字
  if (item.targetText) {
    return item.targetText;
  }

  // 結構化目標
  if (item.targetSets && item.targetReps) {
    return `${item.targetSets}組 × ${item.targetReps}下`;
  }
  if (item.targetSets && item.targetDuration) {
    return `${item.targetSets}組 × ${item.targetDuration}秒`;
  }
  if (item.targetSets) {
    return `${item.targetSets}組`;
  }

  return "";
}

export function formatExerciseWithGoal(exerciseName: string, item: MenuItemWithGoal): string {
  const goalText = formatGoal(item);
  return goalText ? `${exerciseName} (${goalText})` : exerciseName;
}
```

---

## 實作檔案清單

| 檔案                            | 變更類型 | 說明                                          |
| ------------------------------- | -------- | --------------------------------------------- |
| `src/db/client.ts`              | 修改     | 新增 migration，擴充 `training_menu_items` 表 |
| `src/hooks/useTrainingMenus.ts` | 修改     | 新增目標相關的 CRUD 方法                      |
| `app/menu/[id].tsx`             | 修改     | 新增「下一步：設定目標」按鈕                  |
| `app/menu/[id]/goals.tsx`       | **新增** | 目標設定頁面（卡片式）                        |
| `app/workout/menu/[menuId].tsx` | 修改     | Modal header 顯示描述、動作名稱顯示目標       |
| `src/utils/goals.ts`            | **新增** | 目標格式化工具函數                            |

## 實作順序

1. **資料層**：DB migration + hooks 擴充
2. **目標設定頁面**：新增 `goals.tsx`
3. **編輯頁面**：加入「下一步」按鈕
4. **訓練頁面**：修改 Modal 顯示
