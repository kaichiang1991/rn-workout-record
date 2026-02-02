# 訓練菜單拖曳排序功能設計

## 概述

讓使用者可以透過拖曳來自訂訓練菜單列表的順序，例如把常用的菜單拖到最上方。

## 需求

| 項目       | 決定                                         |
| ---------- | -------------------------------------------- |
| 功能       | 菜單列表可拖曳排序                           |
| 側邊色條   | 保持原樣，根據最後完成時間顯示（與排序無關） |
| 新菜單位置 | 放在最上方（sortOrder = 0）                  |

## 資料庫變更

### Schema 變更

在 `training_menus` 表新增欄位：

```sql
ALTER TABLE training_menus ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0;
```

### 資料遷移邏輯

現有菜單需要初始化 `sortOrder`，規則：

- 按 `createdAt DESC` 排序（最新的在前）
- 依序給予 sortOrder = 0, 1, 2, 3...

```sql
UPDATE training_menus
SET sortOrder = (
  SELECT COUNT(*)
  FROM training_menus t2
  WHERE t2.createdAt > training_menus.createdAt
);
```

### 查詢變更

菜單列表查詢從：

```sql
SELECT ... FROM training_menus ORDER BY createdAt DESC
```

改為：

```sql
SELECT ... FROM training_menus ORDER BY sortOrder ASC
```

## Hook 變更

### `useTrainingMenus.ts`

#### 1. 新增 `updateMenusOrder` 方法

拖曳結束後呼叫，批次更新所有菜單的順序：

```typescript
const updateMenusOrder = useCallback(
  async (orderedMenus: { id: number; sortOrder: number }[]): Promise<void> => {
    const db = await getDatabase();
    for (const menu of orderedMenus) {
      await db.runAsync("UPDATE training_menus SET sortOrder = ? WHERE id = ?", [
        menu.sortOrder,
        menu.id,
      ]);
    }
    // 更新本地狀態
    setMenus((prev) =>
      [...prev].sort((a, b) => {
        const orderA = orderedMenus.find((m) => m.id === a.id)?.sortOrder ?? 0;
        const orderB = orderedMenus.find((m) => m.id === b.id)?.sortOrder ?? 0;
        return orderA - orderB;
      })
    );
  },
  []
);
```

#### 2. 修改 `createMenu` 方法

新菜單放最上方，其他菜單順序 +1：

```typescript
const createMenu = useCallback(async (name: string, description?: string) => {
  const db = await getDatabase();
  // 所有現有菜單 sortOrder +1
  await db.runAsync("UPDATE training_menus SET sortOrder = sortOrder + 1");
  // 新菜單 sortOrder = 0
  const result = await db.runAsync(
    "INSERT INTO training_menus (name, description, sortOrder) VALUES (?, ?, 0)",
    [name, description ?? null]
  );
  // ...
}, []);
```

#### 3. 修改 `fetchMenus` 方法

查詢改為按 `sortOrder ASC` 排序。

## UI 變更

### `app/(tabs)/menus.tsx`

#### 使用套件

- `react-native-gesture-handler` - 手勢處理（已安裝）
- `react-native-reanimated` - 動畫效果（已安裝）

#### 拖曳實作

參考現有的 `app/menu/[id].tsx` 中 `DraggableMenuItem` 的模式：

```typescript
// 拖曳狀態
const [isDragging, setIsDragging] = useState(false);
const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

// 長按啟動拖曳
const longPressGesture = Gesture.LongPress()
  .minDuration(200)
  .onStart(() => {
    setIsDragging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  });

// 拖曳手勢
const panGesture = Gesture.Pan()
  .onUpdate((e) => {
    // 計算新位置，更新動畫
  })
  .onEnd(() => {
    // 計算最終順序，呼叫 updateMenusOrder
    setIsDragging(false);
  });
```

#### 視覺回饋

- 長按時：卡片輕微放大 + 陰影加深
- 拖曳中：卡片跟隨手指移動，其他卡片自動讓位
- 放下時：平滑動畫歸位

## 邊界情況處理

### 特殊情況

1. **只有一個菜單**
   - 拖曳功能仍可用，但無實際效果

2. **拖曳過程中發生錯誤**
   - 資料庫更新失敗時，還原本地狀態到拖曳前
   - 顯示 Toast 提示「排序更新失敗」

3. **刪除菜單後**
   - 不需要重新整理 sortOrder（數字可以不連續）

4. **空列表**
   - 顯示現有的空狀態提示，無需變更

### 效能考量

拖曳結束時一次性更新所有 sortOrder，而非每次移動都更新：

```typescript
const newOrder = items.map((item, index) => ({
  id: item.id,
  sortOrder: index,
}));
await updateMenusOrder(newOrder);
```

## 影響範圍

| 檔案                            | 變更類型                                           |
| ------------------------------- | -------------------------------------------------- |
| `src/db/client.ts`              | Schema 新增 sortOrder 欄位 + 遷移邏輯              |
| `src/hooks/useTrainingMenus.ts` | 新增 updateMenusOrder、修改 createMenu、fetchMenus |
| `app/(tabs)/menus.tsx`          | 新增拖曳 UI 功能                                   |

## 型別變更

```typescript
// 更新 TrainingMenu 介面
export interface TrainingMenu {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  lastCompletedAt: string | null;
  sortOrder: number; // 新增
}
```
