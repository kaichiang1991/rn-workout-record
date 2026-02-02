# 訓練菜單最後完成日期功能設計

## 概述

在訓練菜單列表上顯示「上一次完成該菜單的日期」，並用側邊色條根據相對排序來區分時間遠近，讓使用者能快速辨識哪些菜單最近有使用。

## 需求

1. **完成定義**：使用者在總結頁面點擊「返回首頁」時，記錄該菜單的完成日期
2. **顏色邏輯**：相對排序（不看實際天數，純粹根據菜單間的相對時間）
3. **視覺呈現**：側邊色條（Trello 標籤風格）

## 實作細節

### 1. 資料庫變更

在 `training_menus` 表新增 `lastCompletedAt` 欄位：

```sql
ALTER TABLE training_menus ADD COLUMN lastCompletedAt TEXT;
```

更新 `TrainingMenu` 型別：

```typescript
export interface TrainingMenu {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  lastCompletedAt: string | null; // 新增
}
```

### 2. Hook 方法

在 `useTrainingMenus.ts` 新增 `markMenuCompleted` 方法：

```typescript
const markMenuCompleted = useCallback(
  async (menuId: number) => {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync("UPDATE training_menus SET lastCompletedAt = ? WHERE id = ?", [now, menuId]);
    await refresh();
  },
  [refresh]
);
```

### 3. Summary 頁面整合

在 `summary.tsx` 的 `handleFinish` 呼叫：

```typescript
const handleFinish = async () => {
  await markMenuCompleted(menuIdNum); // 記錄完成日期
  await clearProgress();
  router.replace("/(tabs)");
};
```

### 4. 菜單列表 UI

#### 顏色邏輯（相對排序）

將有完成記錄的菜單按 `lastCompletedAt` 排序：

- 最近完成的 = 綠色 (`#22c55e`)
- 第二新的 = 黃色 (`#eab308`)
- 第三新的 = 橘色 (`#f97316`)
- 更早的 = 灰色 (`#9ca3af`)
- 從未完成 = 無色條

#### 卡片樣式

```jsx
<View className="bg-white rounded-xl mb-3 shadow-sm overflow-hidden flex-row">
  {/* 側邊色條 */}
  {colorRank && <View style={{ width: 4, backgroundColor: colorRank }} />}

  {/* 原本的內容 */}
  <View className="flex-1 p-4">
    {/* ... 原有內容 ... */}

    {/* 顯示上次完成日期 */}
    {menu.lastCompletedAt && (
      <Text className="text-xs text-gray-400 mt-1">
        上次完成：{formatRelativeDate(menu.lastCompletedAt)}
      </Text>
    )}
  </View>
</View>
```

## 檔案變更清單

1. `src/db/client.ts` - 資料庫遷移 + 型別更新
2. `src/hooks/useTrainingMenus.ts` - 新增 `markMenuCompleted` 方法
3. `app/workout/menu/summary.tsx` - 呼叫 `markMenuCompleted`
4. `app/(tabs)/menus.tsx` - 側邊色條 + 日期顯示
5. `src/utils/date.ts` (新增) - `formatRelativeDate` 工具函數
