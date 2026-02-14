# 編輯運動紀錄日期時間

## 目標

在每筆歷史運動紀錄的詳情頁中，允許使用者點擊日期時間來修改紀錄的發生日期。

## 使用者互動流程

1. 進入 `/workout/[id]` 詳情頁
2. 點擊日期文字 → 彈出日期選擇器（年月日）
3. 確認日期後 → 彈出時間選擇器（時分）
4. 確認後更新資料庫，頁面即時刷新

## 技術方案

使用 `@react-native-community/datetimepicker`，分兩步驟選擇日期和時間。

## 修改範圍

### 1. 安裝依賴

- `@react-native-community/datetimepicker`

### 2. `src/hooks/useWorkoutSessions.ts`

新增 `updateSessionDate(id: number, newDate: string)` 方法：

- 執行 `UPDATE workout_sessions SET date = ? WHERE id = ?`
- 同步更新 sessions state

### 3. `app/workout/[id].tsx`

- 日期文字用 `TouchableOpacity` 包裹，視覺提示可點擊
- 新增 DateTimePicker state 管理（showDatePicker, showTimePicker, tempDate）
- 流程：點擊日期 → 選日期 → 選時間 → 儲存
- 儲存後更新本地 state
