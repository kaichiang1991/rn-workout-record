# 訓練菜單拖曳排序 - 實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 讓使用者可以透過拖曳來自訂訓練菜單列表的順序

**Architecture:** 在 `training_menus` 表新增 `sortOrder` 欄位，菜單列表改用 `sortOrder ASC` 排序。UI 使用 React Native 的 `Animated` + `PanResponder`（與現有 `menu/[id].tsx` 風格一致）實作拖曳功能。

**Tech Stack:** expo-sqlite, React Native Animated, PanResponder

---

## Task 1: 資料庫 Schema 變更

**Files:**

- Modify: `src/db/client.ts:65-73` (CREATE TABLE)
- Modify: `src/db/client.ts:110-118` (migration section)
- Modify: `src/db/client.ts:222-228` (TrainingMenu interface)

**Step 1: 更新 TrainingMenu 介面**

在 `src/db/client.ts` 第 222-228 行，新增 `sortOrder` 欄位：

```typescript
export interface TrainingMenu {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  lastCompletedAt: string | null;
  sortOrder: number; // 新增
}
```

**Step 2: 新增資料庫遷移邏輯**

在 `src/db/client.ts` 的 `initDatabase` 函數中，`lastCompletedAt` 遷移之後（約第 118 行後），新增：

```typescript
// 遷移：新增 sortOrder 欄位到 training_menus
const hasSortOrder = menusInfo.some((col) => col.name === "sortOrder");

if (!hasSortOrder) {
  await database.execAsync(
    "ALTER TABLE training_menus ADD COLUMN sortOrder INTEGER NOT NULL DEFAULT 0"
  );

  // 初始化現有菜單的 sortOrder（按 createdAt DESC 排序）
  const existingMenus = await database.getAllAsync<{ id: number; createdAt: string }>(
    "SELECT id, createdAt FROM training_menus ORDER BY createdAt DESC"
  );
  for (let i = 0; i < existingMenus.length; i++) {
    await database.runAsync("UPDATE training_menus SET sortOrder = ? WHERE id = ?", [
      i,
      existingMenus[i].id,
    ]);
  }
}
```

**Step 3: 驗證**

執行 app，確認沒有資料庫錯誤。

**Step 4: Commit**

```bash
git add "src/db/client.ts"
git commit -m "feat(db): 新增 training_menus.sortOrder 欄位與遷移"
```

---

## Task 2: 修改 useTrainingMenus Hook

**Files:**

- Modify: `src/hooks/useTrainingMenus.ts`

**Step 1: 更新 fetchMenus 查詢**

在 `src/hooks/useTrainingMenus.ts` 第 27-28 行，修改 SQL 查詢：

```typescript
// 從
"SELECT id, name, description, createdAt, lastCompletedAt FROM training_menus ORDER BY createdAt DESC";

// 改為
"SELECT id, name, description, createdAt, lastCompletedAt, sortOrder FROM training_menus ORDER BY sortOrder ASC";
```

**Step 2: 修改 createMenu 方法**

在 `src/hooks/useTrainingMenus.ts` 第 43-60 行，修改 `createMenu`：

```typescript
const createMenu = useCallback(async (input: CreateMenuInput): Promise<TrainingMenu> => {
  const db = await getDatabase();

  // 所有現有菜單 sortOrder +1（新菜單放最上方）
  await db.runAsync("UPDATE training_menus SET sortOrder = sortOrder + 1");

  const result = await db.runAsync(
    "INSERT INTO training_menus (name, description, sortOrder) VALUES (?, ?, 0)",
    [input.name, input.description || null]
  );

  const newMenu: TrainingMenu = {
    id: result.lastInsertRowId,
    name: input.name,
    description: input.description || null,
    createdAt: new Date().toISOString(),
    lastCompletedAt: null,
    sortOrder: 0,
  };

  setMenus((prev) => [newMenu, ...prev]);
  return newMenu;
}, []);
```

**Step 3: 新增 updateMenusOrder 方法**

在 `src/hooks/useTrainingMenus.ts` 的 `markMenuCompleted` 方法後（約第 205 行後），新增：

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
    setMenus((prev) => {
      const orderMap = new Map(orderedMenus.map((m) => [m.id, m.sortOrder]));
      return [...prev]
        .map((m) => ({ ...m, sortOrder: orderMap.get(m.id) ?? m.sortOrder }))
        .sort((a, b) => a.sortOrder - b.sortOrder);
    });
  },
  []
);
```

**Step 4: 更新 return 物件**

在 return 物件中加入 `updateMenusOrder`：

```typescript
return {
  menus,
  loading,
  error,
  refresh: fetchMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  getMenuItems,
  addMenuItem,
  removeMenuItem,
  updateMenuItemsOrder,
  updateMenuItemGoal,
  getMenuItemCount,
  markMenuCompleted,
  updateMenusOrder, // 新增
};
```

**Step 5: 驗證**

執行 app，確認菜單列表正常顯示。

**Step 6: Commit**

```bash
git add "src/hooks/useTrainingMenus.ts"
git commit -m "feat(hook): 新增 updateMenusOrder 並修改 createMenu 支援排序"
```

---

## Task 3: 實作菜單列表拖曳 UI

**Files:**

- Modify: `app/(tabs)/menus.tsx`

**Step 1: 新增必要的 imports**

在 `app/(tabs)/menus.tsx` 頂部，更新 imports：

```typescript
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useCallback, useState, useEffect, useMemo, useRef } from "react";
```

**Step 2: 新增常數**

在 imports 之後，加入：

```typescript
const MENU_CARD_HEIGHT = 120; // 菜單卡片的估計高度
```

**Step 3: 建立 DraggableMenuCard 元件**

在 `MenusScreen` 元件之前，新增可拖曳的菜單卡片元件：

```typescript
interface DraggableMenuCardProps {
  menu: TrainingMenu;
  index: number;
  itemCount: number;
  progress: MenuProgress | undefined;
  colorRank: string | undefined;
  onDragStart: (index: number) => void;
  onDragMove: (index: number, dy: number) => void;
  onDragEnd: (index: number) => void;
  onEdit: () => void;
  onStartWorkout: () => void;
  draggedIndex: number | null;
}

function DraggableMenuCard({
  menu,
  index,
  itemCount,
  progress,
  colorRank,
  onDragStart,
  onDragMove,
  onDragEnd,
  onEdit,
  onStartWorkout,
  draggedIndex,
}: DraggableMenuCardProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const zIndex = useRef(new Animated.Value(0)).current;

  const isDragging = draggedIndex === index;
  const isOtherDragging = draggedIndex !== null && draggedIndex !== index;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 只有垂直移動超過 10px 才啟動拖曳
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        onDragStart(index);
        Animated.parallel([
          Animated.spring(scale, { toValue: 1.03, useNativeDriver: true }),
          Animated.timing(zIndex, { toValue: 100, duration: 0, useNativeDriver: true }),
        ]).start();
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: 0, y: gestureState.dy });
        onDragMove(index, gestureState.dy);
      },
      onPanResponderRelease: () => {
        onDragEnd(index);
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
          Animated.timing(zIndex, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]).start();
      },
    })
  ).current;

  const hasProgress = progress && progress.completedCount > 0;

  return (
    <Animated.View
      style={{
        transform: [{ translateY: pan.y }, { scale }],
        zIndex: isDragging ? 100 : 0,
        opacity: isOtherDragging ? 0.6 : 1,
      }}
      {...panResponder.panHandlers}
    >
      <View className="bg-white rounded-xl mb-3 shadow-sm overflow-hidden flex-row">
        {/* 側邊色條 */}
        {colorRank && <View style={{ width: 4, backgroundColor: colorRank }} />}

        {/* 卡片內容 */}
        <View className="flex-1 p-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-800">{menu.name}</Text>
              {menu.description && (
                <Text className="text-gray-500 text-sm mt-1" numberOfLines={1}>
                  {menu.description}
                </Text>
              )}
              {menu.lastCompletedAt && (
                <Text className="text-xs text-gray-400 mt-1">
                  上次完成：{formatRelativeDate(menu.lastCompletedAt)}
                </Text>
              )}
            </View>
            <View className="bg-blue-100 rounded-full px-3 py-1">
              <Text className="text-blue-600 font-medium">{itemCount} 項目</Text>
            </View>
          </View>

          {/* 按鈕區 */}
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="flex-1 bg-gray-100 rounded-lg py-2 items-center"
              onPress={onEdit}
            >
              <Text className="text-gray-700 font-medium">編輯</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 rounded-lg py-2 items-center ${
                itemCount === 0 ? "bg-gray-300" : "bg-primary-500"
              }`}
              onPress={onStartWorkout}
              disabled={itemCount === 0}
            >
              <Text
                className={`font-medium ${itemCount === 0 ? "text-gray-500" : "text-white"}`}
              >
                {hasProgress
                  ? `繼續 (${progress.completedCount}/${progress.totalCount})`
                  : "開始訓練"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
```

**Step 4: 更新 MenusScreen 元件**

修改 `MenusScreen` 元件，加入拖曳邏輯：

```typescript
export default function MenusScreen() {
  const router = useRouter();
  const { menus, loading, refresh, getMenuItemCount, updateMenusOrder } = useTrainingMenus();
  const [refreshing, setRefreshing] = useState(false);
  const [menuCounts, setMenuCounts] = useState<Record<number, number>>({});
  const [menuProgress, setMenuProgress] = useState<Record<number, MenuProgress>>({});

  // 拖曳狀態
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [localMenus, setLocalMenus] = useState(menus);

  // 當 menus 變更時同步 localMenus
  useEffect(() => {
    setLocalMenus(menus);
  }, [menus]);

  // ... 保留原有的 useFocusEffect, onRefresh, useEffect (fetchCounts, checkProgress), menuColorRanks ...

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragMove = useCallback((fromIndex: number, dy: number) => {
    const moveCount = Math.round(dy / MENU_CARD_HEIGHT);
    if (moveCount === 0) return;

    const toIndex = Math.max(0, Math.min(localMenus.length - 1, fromIndex + moveCount));
    if (toIndex === fromIndex) return;

    setLocalMenus((prev) => {
      const newList = [...prev];
      const [removed] = newList.splice(fromIndex, 1);
      newList.splice(toIndex, 0, removed);
      return newList;
    });
    setDraggedIndex(toIndex);
  }, [localMenus.length]);

  const handleDragEnd = useCallback(async () => {
    setDraggedIndex(null);

    // 儲存新順序到資料庫
    const newOrder = localMenus.map((menu, index) => ({
      id: menu.id,
      sortOrder: index,
    }));

    try {
      await updateMenusOrder(newOrder);
    } catch {
      // 錯誤時還原
      setLocalMenus(menus);
    }
  }, [localMenus, menus, updateMenusOrder]);

  const handleStartWorkout = (menuId: number) => {
    router.push(`/workout/menu/${menuId}`);
  };

  // ... 保留原有的 menuColorRanks ...

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      scrollEnabled={draggedIndex === null}  // 拖曳時禁用滾動
    >
      <View className="p-4">
        {/* 新增按鈕 */}
        <TouchableOpacity
          className="bg-primary-500 rounded-xl p-4 mb-6 flex-row items-center justify-center"
          onPress={() => router.push("/menu/new")}
        >
          <Text className="text-white text-lg font-semibold">＋ 新增訓練菜單</Text>
        </TouchableOpacity>

        {loading ? (
          <View className="bg-white rounded-xl p-4">
            <Text className="text-gray-500 text-center">載入中...</Text>
          </View>
        ) : localMenus.length === 0 ? (
          <View className="bg-white rounded-xl p-6">
            <Text className="text-gray-500 text-center">還沒有訓練菜單</Text>
            <Text className="text-gray-400 text-center text-sm mt-1">
              建立你的專屬訓練菜單，規劃每天的訓練內容！
            </Text>
          </View>
        ) : (
          localMenus.map((menu, index) => {
            const itemCount = menuCounts[menu.id] ?? 0;
            const progress = menuProgress[menu.id];
            const colorRank = menuColorRanks[menu.id];

            return (
              <DraggableMenuCard
                key={menu.id}
                menu={menu}
                index={index}
                itemCount={itemCount}
                progress={progress}
                colorRank={colorRank}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onEdit={() => router.push(`/menu/${menu.id}`)}
                onStartWorkout={() => handleStartWorkout(menu.id)}
                draggedIndex={draggedIndex}
              />
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
```

**Step 5: 新增 TrainingMenu import**

確保 import `TrainingMenu` 型別：

```typescript
import { useTrainingMenus } from "@/hooks/useTrainingMenus";
import { TrainingMenu } from "@/db/client";
```

**Step 6: 驗證**

執行 app：

1. 長按菜單卡片應可拖曳
2. 拖曳到其他位置後放開，順序應更新
3. 重新開啟 app，順序應保持

**Step 7: Commit**

```bash
git add "app/(tabs)/menus.tsx"
git commit -m "feat(ui): 實作訓練菜單列表拖曳排序功能"
```

---

## Task 4: 程式碼檢查與最終驗證

**Step 1: 執行型別檢查**

```bash
npm run typecheck
```

**Step 2: 執行 lint 檢查**

```bash
npm run lint
```

**Step 3: 執行格式化**

```bash
npm run format
```

**Step 4: 最終手動測試**

測試清單：

- [ ] 新建菜單出現在最上方
- [ ] 長按菜單卡片可拖曳
- [ ] 拖曳時卡片有放大效果
- [ ] 拖曳過程中其他卡片變淡
- [ ] 放開後順序正確更新
- [ ] 重啟 app 後順序保持
- [ ] 側邊色條仍按完成時間顯示（與排序無關）

**Step 5: 最終 Commit**

```bash
git add -A
git commit -m "chore: 程式碼格式化與最終調整"
```

---

## 影響範圍摘要

| 檔案                            | 變更                                              |
| ------------------------------- | ------------------------------------------------- |
| `src/db/client.ts`              | 新增 sortOrder 欄位、遷移邏輯、型別更新           |
| `src/hooks/useTrainingMenus.ts` | 新增 updateMenusOrder、修改 createMenu/fetchMenus |
| `app/(tabs)/menus.tsx`          | 新增 DraggableMenuCard 元件、拖曳邏輯             |
