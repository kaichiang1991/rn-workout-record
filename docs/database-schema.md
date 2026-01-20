# 資料庫結構文件

> 最後更新：2026-01-20

## 總覽

本專案使用 SQLite 資料庫（透過 expo-sqlite），資料庫檔案名稱為 `workout.db`。

### 資料表清單

| 表格名稱              | 用途           | 使用狀態             |
| --------------------- | -------------- | -------------------- |
| `exercises`           | 訓練動作主表   | ✅ 完全使用          |
| `workout_sessions`    | 訓練課程記錄   | ⚠️ 有 1 個棄用欄位   |
| `workout_sets`        | 訓練組詳情     | ⚠️ 有 2 個未使用欄位 |
| `exercise_body_parts` | 動作與部位關聯 | ✅ 完全使用          |
| `training_menus`      | 訓練菜單       | ✅ 完全使用          |
| `training_menu_items` | 菜單項目       | ✅ 完全使用          |

---

## 表格詳細結構

### 1. exercises（訓練動作）

儲存所有可用的訓練動作。

| 欄位          | 型別    | 約束                      | 說明                      | 狀態 |
| ------------- | ------- | ------------------------- | ------------------------- | ---- |
| `id`          | INTEGER | PRIMARY KEY AUTOINCREMENT | 主鍵                      | ✅   |
| `name`        | TEXT    | NOT NULL                  | 動作名稱                  | ✅   |
| `category`    | TEXT    | -                         | 分類（如 legs, chest 等） | ✅   |
| `description` | TEXT    | -                         | 動作說明                  | ✅   |
| `createdAt`   | TEXT    | DEFAULT CURRENT_TIMESTAMP | 建立時間                  | ✅   |
| `isActive`    | INTEGER | DEFAULT 1                 | 是否啟用（0/1）           | ✅   |

---

### 2. workout_sessions（訓練課程）

記錄每次訓練課程。

| 欄位           | 型別    | 約束                         | 說明                  | 狀態            |
| -------------- | ------- | ---------------------------- | --------------------- | --------------- |
| `id`           | INTEGER | PRIMARY KEY AUTOINCREMENT    | 主鍵                  | ✅              |
| `exerciseId`   | INTEGER | NOT NULL, FK → exercises(id) | 關聯動作              | ✅              |
| `date`         | TEXT    | NOT NULL                     | 訓練日期              | ✅              |
| `mood`         | INTEGER | -                            | 心情評分              | ❌ **建議刪除** |
| `notes`        | TEXT    | -                            | 備註                  | ✅              |
| `createdAt`    | TEXT    | DEFAULT CURRENT_TIMESTAMP    | 建立時間              | ✅              |
| `weight`       | REAL    | -                            | 重量（公斤）          | ✅              |
| `reps`         | INTEGER | -                            | 次數                  | ✅              |
| `setCount`     | INTEGER | -                            | 組數                  | ✅              |
| `difficulty`   | INTEGER | -                            | 難度評分（1-5）       | ✅              |
| `isBodyweight` | INTEGER | DEFAULT 0                    | 是否為自重訓練（0/1） | ✅              |

> **注意**：`mood` 欄位已被 `difficulty` 取代，目前僅保留以維持向下相容性。資料庫遷移時會自動將 `mood` 的值複製到 `difficulty`。

---

### 3. workout_sets（訓練組）

記錄每組訓練的詳細資料。

| 欄位        | 型別    | 約束                                | 說明           | 狀態            |
| ----------- | ------- | ----------------------------------- | -------------- | --------------- |
| `id`        | INTEGER | PRIMARY KEY AUTOINCREMENT           | 主鍵           | ✅              |
| `sessionId` | INTEGER | NOT NULL, FK → workout_sessions(id) | 關聯課程       | ✅              |
| `setNumber` | INTEGER | NOT NULL                            | 第幾組         | ✅              |
| `reps`      | INTEGER | -                                   | 次數           | ✅              |
| `weight`    | REAL    | -                                   | 重量（公斤）   | ✅              |
| `duration`  | INTEGER | -                                   | 持續時間（秒） | ❌ **建議刪除** |
| `notes`     | TEXT    | -                                   | 備註           | ❌ **建議刪除** |

> **注意**：`duration` 和 `notes` 欄位已定義但完全未在程式中使用。

---

### 4. exercise_body_parts（動作部位關聯）

建立訓練動作與身體部位的多對多關聯。

| 欄位         | 型別    | 約束                         | 說明     | 狀態 |
| ------------ | ------- | ---------------------------- | -------- | ---- |
| `id`         | INTEGER | PRIMARY KEY AUTOINCREMENT    | 主鍵     | ✅   |
| `exerciseId` | INTEGER | NOT NULL, FK → exercises(id) | 關聯動作 | ✅   |
| `bodyPart`   | TEXT    | NOT NULL                     | 身體部位 | ✅   |

**身體部位可用值**：

- `legs` - 腿部
- `chest` - 胸部
- `back` - 背部
- `shoulders` - 肩部
- `arms` - 手臂
- `core` - 核心
- `cardio` - 有氧

---

### 5. training_menus（訓練菜單）

儲存使用者自訂的訓練菜單。

| 欄位          | 型別    | 約束                      | 說明     | 狀態 |
| ------------- | ------- | ------------------------- | -------- | ---- |
| `id`          | INTEGER | PRIMARY KEY AUTOINCREMENT | 主鍵     | ✅   |
| `name`        | TEXT    | NOT NULL                  | 菜單名稱 | ✅   |
| `description` | TEXT    | -                         | 菜單說明 | ✅   |
| `createdAt`   | TEXT    | DEFAULT CURRENT_TIMESTAMP | 建立時間 | ✅   |

---

### 6. training_menu_items（菜單項目）

記錄菜單中包含的訓練動作及排序。

| 欄位         | 型別    | 約束                              | 說明     | 狀態 |
| ------------ | ------- | --------------------------------- | -------- | ---- |
| `id`         | INTEGER | PRIMARY KEY AUTOINCREMENT         | 主鍵     | ✅   |
| `menuId`     | INTEGER | NOT NULL, FK → training_menus(id) | 關聯菜單 | ✅   |
| `exerciseId` | INTEGER | NOT NULL, FK → exercises(id)      | 關聯動作 | ✅   |
| `sortOrder`  | INTEGER | NOT NULL, DEFAULT 0               | 排序順序 | ✅   |

---

## 表格關係圖

```
┌─────────────────┐
│    exercises    │
│─────────────────│
│ id (PK)         │◄─────────────────────┐
│ name            │                      │
│ category        │                      │
│ description     │                      │
│ createdAt       │                      │
│ isActive        │                      │
└────────┬────────┘                      │
         │                               │
         │ 1:N                           │
         ▼                               │
┌─────────────────────┐                  │
│ exercise_body_parts │                  │
│─────────────────────│                  │
│ id (PK)             │                  │
│ exerciseId (FK)     │                  │
│ bodyPart            │                  │
└─────────────────────┘                  │
                                         │
         ┌───────────────────────────────┤
         │                               │
         │ 1:N                           │ 1:N
         ▼                               │
┌─────────────────────┐         ┌────────┴────────────┐
│  workout_sessions   │         │ training_menu_items │
│─────────────────────│         │─────────────────────│
│ id (PK)             │◄──┐     │ id (PK)             │
│ exerciseId (FK)     │   │     │ menuId (FK)         │──┐
│ date                │   │     │ exerciseId (FK)     │  │
│ mood ❌             │   │     │ sortOrder           │  │
│ notes               │   │     └─────────────────────┘  │
│ createdAt           │   │                              │
│ weight              │   │                              │
│ reps                │   │     ┌─────────────────┐      │
│ setCount            │   │     │ training_menus  │      │
│ difficulty          │   │     │─────────────────│      │
│ isBodyweight        │   │     │ id (PK)         │◄─────┘
└──────────┬──────────┘   │     │ name            │
           │              │     │ description     │
           │ 1:N          │     │ createdAt       │
           ▼              │     └─────────────────┘
┌─────────────────┐       │
│  workout_sets   │       │
│─────────────────│       │
│ id (PK)         │       │
│ sessionId (FK)  │───────┘
│ setNumber       │
│ reps            │
│ weight          │
│ duration ❌     │
│ notes ❌        │
└─────────────────┘
```

---

## 建議刪除清單

以下欄位建議在未來版本中移除：

| 表格               | 欄位       | 原因                                           | 優先級 |
| ------------------ | ---------- | ---------------------------------------------- | ------ |
| `workout_sessions` | `mood`     | 已被 `difficulty` 取代，遷移邏輯已處理資料轉換 | 中     |
| `workout_sets`     | `duration` | 定義了但從未使用                               | 高     |
| `workout_sets`     | `notes`    | 定義了但從未使用                               | 高     |

### 刪除步驟建議

1. **確認無資料依賴**：執行查詢確認這些欄位沒有有效資料

   ```sql
   SELECT COUNT(*) FROM workout_sessions WHERE mood IS NOT NULL;
   SELECT COUNT(*) FROM workout_sets WHERE duration IS NOT NULL;
   SELECT COUNT(*) FROM workout_sets WHERE notes IS NOT NULL;
   ```

2. **更新 TypeScript 型別**：從 `src/db/client.ts` 移除對應的 interface 欄位

3. **SQLite 限制**：SQLite 不支援直接刪除欄位，需要透過以下步驟：
   - 建立新表（不含要刪除的欄位）
   - 複製資料
   - 刪除舊表
   - 重新命名新表

---

## 相關檔案

- 資料庫初始化與型別定義：`src/db/client.ts`
