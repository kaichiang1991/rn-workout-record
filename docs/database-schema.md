# 資料庫結構文件

> 最後更新：2026-01-20

## 總覽

本專案使用 SQLite 資料庫（透過 expo-sqlite），資料庫檔案名稱為 `workout.db`。

### 資料表清單

| 表格名稱              | 用途           | 使用狀態    |
| --------------------- | -------------- | ----------- |
| `exercises`           | 訓練動作主表   | ✅ 完全使用 |
| `workout_sessions`    | 訓練課程記錄   | ✅ 完全使用 |
| `workout_sets`        | 訓練組詳情     | ✅ 完全使用 |
| `exercise_body_parts` | 動作與部位關聯 | ✅ 完全使用 |
| `training_menus`      | 訓練菜單       | ✅ 完全使用 |
| `training_menu_items` | 菜單項目       | ✅ 完全使用 |

---

## 表格詳細結構

### 1. exercises（訓練動作）

儲存所有可用的訓練動作。部位分類使用 `exercise_body_parts` 關聯表管理。

| 欄位          | 型別    | 約束                      | 說明            | 狀態 |
| ------------- | ------- | ------------------------- | --------------- | ---- |
| `id`          | INTEGER | PRIMARY KEY AUTOINCREMENT | 主鍵            | ✅   |
| `name`        | TEXT    | NOT NULL                  | 動作名稱        | ✅   |
| `description` | TEXT    | -                         | 動作說明        | ✅   |
| `createdAt`   | TEXT    | DEFAULT CURRENT_TIMESTAMP | 建立時間        | ✅   |
| `isActive`    | INTEGER | DEFAULT 1                 | 是否啟用（0/1） | ✅   |

---

### 2. workout_sessions（訓練課程）

記錄每次訓練課程。

| 欄位           | 型別    | 約束                         | 說明                  | 狀態 |
| -------------- | ------- | ---------------------------- | --------------------- | ---- |
| `id`           | INTEGER | PRIMARY KEY AUTOINCREMENT    | 主鍵                  | ✅   |
| `exerciseId`   | INTEGER | NOT NULL, FK → exercises(id) | 關聯動作              | ✅   |
| `date`         | TEXT    | NOT NULL                     | 訓練日期              | ✅   |
| `notes`        | TEXT    | -                            | 備註                  | ✅   |
| `createdAt`    | TEXT    | DEFAULT CURRENT_TIMESTAMP    | 建立時間              | ✅   |
| `weight`       | REAL    | -                            | 重量（公斤）          | ✅   |
| `reps`         | INTEGER | -                            | 次數                  | ✅   |
| `setCount`     | INTEGER | -                            | 組數                  | ✅   |
| `difficulty`   | INTEGER | -                            | 難度評分（1-5）       | ✅   |
| `isBodyweight` | INTEGER | DEFAULT 0                    | 是否為自重訓練（0/1） | ✅   |

---

### 3. workout_sets（訓練組）

記錄每組訓練的詳細資料。

| 欄位        | 型別    | 約束                                | 說明         | 狀態 |
| ----------- | ------- | ----------------------------------- | ------------ | ---- |
| `id`        | INTEGER | PRIMARY KEY AUTOINCREMENT           | 主鍵         | ✅   |
| `sessionId` | INTEGER | NOT NULL, FK → workout_sessions(id) | 關聯課程     | ✅   |
| `setNumber` | INTEGER | NOT NULL                            | 第幾組       | ✅   |
| `reps`      | INTEGER | -                                   | 次數         | ✅   |
| `weight`    | REAL    | -                                   | 重量（公斤） | ✅   |

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
│ notes               │   │     │ sortOrder           │  │
│ createdAt           │   │     └─────────────────────┘  │
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
└─────────────────┘
```

---

## 相關檔案

- 資料庫初始化與型別定義：`src/db/client.ts`
