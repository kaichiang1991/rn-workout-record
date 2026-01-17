# 簡化運動紀錄流程設計

## 概述

將運動紀錄流程從「每組各別輸入」簡化為「固定重量/次數 + 組數計數」模式，降低使用者輸入負擔。

## 目標

- 簡化紀錄流程，減少輸入步驟
- 改善運動項目選擇體驗（依部位篩選）
- 將「心情」改為更實用的「難易度」評分

## 新流程

```
選擇部位 → 選擇項目 → 設定重量/次數 → 點擊計數完成組數 → 選擇難易度 → 儲存
```

---

## UI 設計

### 1. 運動項目選擇

**選擇流程：**

1. 上方顯示部位標籤列（橫向滾動）
2. 點選部位後，下方篩選顯示相關項目
3. 點選「全部」可顯示所有項目

**部位分類：**

- 胸、背、肩、手臂、腿、核心、有氧

**特點：**

- 每個項目可對應多個部位（例如：硬舉 → 背、腿）

### 2. 重量與次數設定

**重量設定：**

- 數字輸入框 + 單位「kg」
- 「自體重量」切換按鈕
- 選擇自體重量後，隱藏數字輸入框

**次數設定：**

- 數字輸入框 + 單位「下」

### 3. 組數計數器

**UI：**

- 畫面中央大型圓形按鈕
- 顯示目前完成組數（大字體）
- 下方文字標示「組」

**互動：**

- 點擊 → 組數 +1
- 長按 → 組數 -1（附震動回饋）
- 最小值為 0，無上限

```
        ┌─────────┐
        │         │
        │    3    │
        │         │
        └─────────┘
            組

    [點擊 +1]  [長按 -1]
```

### 4. 難易度選擇

**5 級難易度：**

| 等級 | 標籤   | 顏色 | 說明           |
| ---- | ------ | ---- | -------------- |
| 1    | 輕鬆   | 綠色 | 還有很多餘力   |
| 2    | 適中   | 淺綠 | 適當的訓練強度 |
| 3    | 有挑戰 | 黃色 | 需要專注完成   |
| 4    | 很吃力 | 橘色 | 接近力竭       |
| 5    | 極限   | 紅色 | 完全力竭       |

**UI：**

- 橫向排列 5 個選項
- 每個選項顯示顏色圓點 + 標籤
- 點選後高亮顯示

### 5. 備註

- 多行文字輸入框
- Placeholder：「記錄今天的訓練心得...」
- 選填

### 6. 儲存

**驗證規則：**

- 必須選擇運動項目
- 組數必須 ≥ 1
- 重量：若非自體重量，必須 > 0

---

## 資料庫變更

### 新增表：`exercise_body_parts`

```sql
CREATE TABLE exercise_body_parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exerciseId INTEGER NOT NULL,
  bodyPart TEXT NOT NULL,
  FOREIGN KEY (exerciseId) REFERENCES exercises(id) ON DELETE CASCADE
);
```

### 修改表：`workout_sessions`

新增欄位：

```sql
ALTER TABLE workout_sessions ADD COLUMN weight REAL;
ALTER TABLE workout_sessions ADD COLUMN reps INTEGER;
ALTER TABLE workout_sessions ADD COLUMN setCount INTEGER;
ALTER TABLE workout_sessions ADD COLUMN difficulty INTEGER;
ALTER TABLE workout_sessions ADD COLUMN isBodyweight INTEGER DEFAULT 0;
```

欄位說明：

- `weight` - 固定重量（kg），null 表示自體重量
- `reps` - 固定次數
- `setCount` - 完成組數
- `difficulty` - 難易度 1-5
- `isBodyweight` - 是否為自體重量（0/1）

### 棄用

- `workout_sets` 表 - 簡化模式不再需要每組細節
- `workout_sessions.mood` - 由 `difficulty` 取代

---

## 類型定義

```typescript
// 部位類型
type BodyPart = "chest" | "back" | "shoulders" | "arms" | "legs" | "core" | "cardio";

// 部位對應中文
const BODY_PART_LABELS: Record<BodyPart, string> = {
  chest: "胸",
  back: "背",
  shoulders: "肩",
  arms: "手臂",
  legs: "腿",
  core: "核心",
  cardio: "有氧",
};

// 難易度類型
interface DifficultyLevel {
  value: number;
  label: string;
  color: string;
}

const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  { value: 1, label: "輕鬆", color: "#22c55e" }, // green-500
  { value: 2, label: "適中", color: "#84cc16" }, // lime-500
  { value: 3, label: "有挑戰", color: "#eab308" }, // yellow-500
  { value: 4, label: "很吃力", color: "#f97316" }, // orange-500
  { value: 5, label: "極限", color: "#ef4444" }, // red-500
];

// 更新後的 WorkoutSession
interface WorkoutSession {
  id: number;
  exerciseId: number;
  date: string;
  weight: number | null; // null = 自體重量
  reps: number;
  setCount: number;
  difficulty: number; // 1-5
  isBodyweight: boolean;
  notes: string | null;
  createdAt: string;
}

// Exercise 與 BodyPart 關聯
interface ExerciseBodyPart {
  id: number;
  exerciseId: number;
  bodyPart: BodyPart;
}
```

---

## 檔案修改清單

| 檔案                              | 修改內容                                                                    |
| --------------------------------- | --------------------------------------------------------------------------- |
| `src/db/client.ts`                | 新增 `exercise_body_parts` 表、修改 `workout_sessions` schema、更新類型定義 |
| `app/workout/new.tsx`             | 重寫新增流程 UI（部位選擇、組數計數器、難易度選擇）                         |
| `app/workout/[id].tsx`            | 調整詳情顯示（顯示重量/次數/組數、難易度取代心情）                          |
| `src/hooks/useWorkoutSessions.ts` | 更新 CRUD 操作適配新欄位                                                    |
| `src/hooks/useExercises.ts`       | 新增依部位篩選功能、管理 exercise_body_parts                                |
| `app/(tabs)/index.tsx`            | 調整統計顯示（mood → difficulty）                                           |
| `src/components/Icon.tsx`         | 新增難易度顏色圓點元件                                                      |
| `src/utils/constants.ts`          | 新增 BODY_PART_LABELS、DIFFICULTY_LEVELS 常數                               |

---

## 資料遷移

現有資料處理：

1. `workout_sessions.mood` 值遷移至 `difficulty`（數值相同，語意不同但可接受）
2. 現有紀錄的 `weight`、`reps`、`setCount` 設為 null（表示舊格式資料）
3. `workout_sets` 表資料保留但不再使用，可在未來版本清理

---

## 未來擴展考量

- 可新增「進階模式」切換，恢復每組詳細輸入功能
- 可新增「範本」功能，快速套用常用重量/次數組合
- 可新增組間休息計時器
