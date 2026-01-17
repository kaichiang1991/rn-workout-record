# 健身項目多分類選擇功能

## 概述

讓新增/編輯健身項目時可以選擇多個分類（部位），例如「硬舉」可以同時選擇「背部」和「腿部」。

## 現況分析

### 資料庫結構（已支援多分類）

- `exercises.category` - 單一分類欄位
- `exercise_body_parts` - 多對多關聯表，支援一個項目對應多個部位

### 現有問題

| 頁面     | 檔案                    | 問題         |
| -------- | ----------------------- | ------------ |
| 新增項目 | `app/exercise/new.tsx`  | 只能單選分類 |
| 編輯項目 | `app/exercise/[id].tsx` | 只能單選分類 |

兩個頁面都只操作 `exercises.category` 欄位，沒有寫入 `exercise_body_parts` 表。

## UI 設計

### 分類選擇行為

- 點擊分類 chip 切換選中/未選中狀態（toggle）
- 已選中：primary 底色 + 白字
- 未選中：白底 + 灰框
- 驗證：至少選擇一個分類

### 範例

```
分類
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│背部 ✓│ │腿部 ✓│ │胸部  │ │肩膀  │  ...
└──────┘ └──────┘ └──────┘ └──────┘
 (選中)   (選中)   (未選)   (未選)
```

## 資料儲存邏輯

### 新增項目

1. 寫入 `exercises` 表（`category` 存第一個選中的分類）
2. 寫入 `exercise_body_parts` 表（所有選中的分類各一筆）

### 編輯項目

1. 更新 `exercises.category` 為第一個選中的分類
2. 刪除該項目在 `exercise_body_parts` 的所有舊資料
3. 重新插入所有選中的分類

### 讀取項目

- 編輯頁面載入時，從 `exercise_body_parts` 取得該項目的所有分類
- 用這些分類初始化多選狀態

## 實作影響

### 需要修改

| 檔案                        | 修改內容                                                               |
| --------------------------- | ---------------------------------------------------------------------- |
| `app/exercise/new.tsx`      | 分類選擇改成多選，儲存時寫入 `exercise_body_parts`                     |
| `app/exercise/[id].tsx`     | 分類選擇改成多選，載入時讀取現有分類，儲存時更新 `exercise_body_parts` |
| `src/hooks/useExercises.ts` | `createExercise` 和 `updateExercise` 處理 `exercise_body_parts`        |

### 不需要修改

- `app/(tabs)/exercises.tsx` - 列表按 `category` 分組，邏輯不變
- `app/workout/new.tsx` - 篩選邏輯已使用 `exercise_body_parts`，正確運作
