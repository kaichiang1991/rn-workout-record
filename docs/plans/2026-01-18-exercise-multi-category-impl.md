# 健身項目多分類選擇 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 讓新增/編輯健身項目時可以選擇多個分類（部位）

**Architecture:** 修改 useExercises hook 支援多分類的 CRUD，更新新增/編輯頁面的 UI 為多選模式

**Tech Stack:** React Native, Expo SQLite, TypeScript

---

## Task 1: 更新 useExercises hook - createExercise

**Files:**

- Modify: `src/hooks/useExercises.ts:5-9` (CreateExerciseInput interface)
- Modify: `src/hooks/useExercises.ts:55-73` (createExercise function)

**Step 1: 更新 CreateExerciseInput interface**

```typescript
interface CreateExerciseInput {
  name: string;
  bodyParts: string[]; // 改成陣列
  description: string | null;
}
```

**Step 2: 更新 createExercise function**

```typescript
const createExercise = useCallback(async (input: CreateExerciseInput): Promise<Exercise> => {
  const db = await getDatabase();
  const primaryCategory = input.bodyParts[0] || "other";

  const result = await db.runAsync(
    "INSERT INTO exercises (name, category, description, isActive) VALUES (?, ?, ?, 1)",
    [input.name, primaryCategory, input.description]
  );

  // 插入所有部位關聯
  for (const bodyPart of input.bodyParts) {
    await db.runAsync("INSERT INTO exercise_body_parts (exerciseId, bodyPart) VALUES (?, ?)", [
      result.lastInsertRowId,
      bodyPart,
    ]);
  }

  const newExercise: Exercise = {
    id: result.lastInsertRowId,
    name: input.name,
    category: primaryCategory,
    description: input.description,
    createdAt: new Date().toISOString(),
    isActive: true,
  };

  // 更新本地狀態
  setExercises((prev) => [...prev, newExercise].sort((a, b) => a.name.localeCompare(b.name)));
  setExerciseBodyParts((prev) => [
    ...prev,
    ...input.bodyParts.map((bp, idx) => ({
      id: -Date.now() - idx, // 暫時 ID，下次 fetch 會更新
      exerciseId: result.lastInsertRowId,
      bodyPart: bp,
    })),
  ]);

  return newExercise;
}, []);
```

**Step 3: 驗證編譯**

Run: `npm run typecheck`
Expected: 會有錯誤（因為呼叫端還沒更新），這是預期的

**Step 4: Commit**

```bash
git add src/hooks/useExercises.ts
git commit -m "feat(useExercises): createExercise 支援多分類"
```

---

## Task 2: 更新 useExercises hook - updateExercise

**Files:**

- Modify: `src/hooks/useExercises.ts:11-16` (UpdateExerciseInput interface)
- Modify: `src/hooks/useExercises.ts:75-116` (updateExercise function)

**Step 1: 更新 UpdateExerciseInput interface**

```typescript
interface UpdateExerciseInput {
  name?: string;
  bodyParts?: string[]; // 改成陣列
  description?: string | null;
  isActive?: boolean;
}
```

**Step 2: 更新 updateExercise function**

```typescript
const updateExercise = useCallback(
  async (id: number, input: UpdateExerciseInput): Promise<void> => {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (input.name !== undefined) {
      updates.push("name = ?");
      values.push(input.name);
    }
    if (input.bodyParts !== undefined && input.bodyParts.length > 0) {
      updates.push("category = ?");
      values.push(input.bodyParts[0]); // 主要分類
    }
    if (input.description !== undefined) {
      updates.push("description = ?");
      values.push(input.description);
    }
    if (input.isActive !== undefined) {
      updates.push("isActive = ?");
      values.push(input.isActive ? 1 : 0);
    }

    if (updates.length > 0) {
      values.push(id);
      await db.runAsync(`UPDATE exercises SET ${updates.join(", ")} WHERE id = ?`, values);
    }

    // 更新部位關聯
    if (input.bodyParts !== undefined) {
      // 刪除舊的關聯
      await db.runAsync("DELETE FROM exercise_body_parts WHERE exerciseId = ?", [id]);
      // 插入新的關聯
      for (const bodyPart of input.bodyParts) {
        await db.runAsync("INSERT INTO exercise_body_parts (exerciseId, bodyPart) VALUES (?, ?)", [
          id,
          bodyPart,
        ]);
      }

      // 更新本地狀態
      setExerciseBodyParts((prev) => {
        const filtered = prev.filter((bp) => bp.exerciseId !== id);
        const newParts = input.bodyParts!.map((bp, idx) => ({
          id: -Date.now() - idx,
          exerciseId: id,
          bodyPart: bp,
        }));
        return [...filtered, ...newParts];
      });
    }

    setExercises((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              name: input.name ?? e.name,
              category: input.bodyParts?.[0] ?? e.category,
              description: input.description !== undefined ? input.description : e.description,
              isActive: input.isActive !== undefined ? input.isActive : e.isActive,
            }
          : e
      )
    );
  },
  []
);
```

**Step 3: 驗證編譯**

Run: `npm run typecheck`
Expected: 會有錯誤（呼叫端還沒更新）

**Step 4: Commit**

```bash
git add src/hooks/useExercises.ts
git commit -m "feat(useExercises): updateExercise 支援多分類"
```

---

## Task 3: 更新新增項目頁面 UI

**Files:**

- Modify: `app/exercise/new.tsx`

**Step 1: 將 category state 改成 selectedBodyParts 陣列**

替換第 18 行：

```typescript
// 原本
const [category, setCategory] = useState("other");

// 改成
const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);
```

**Step 2: 新增 toggle function**

在 state 宣告後新增：

```typescript
const toggleBodyPart = (value: string) => {
  setSelectedBodyParts((prev) =>
    prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
  );
};
```

**Step 3: 更新 handleSave 驗證和呼叫**

```typescript
const handleSave = async () => {
  if (!name.trim()) {
    Alert.alert("提示", "請輸入項目名稱");
    return;
  }

  if (selectedBodyParts.length === 0) {
    Alert.alert("提示", "請至少選擇一個分類");
    return;
  }

  setSaving(true);
  try {
    await createExercise({
      name: name.trim(),
      bodyParts: selectedBodyParts,
      description: description.trim() || null,
    });
    router.back();
  } catch {
    Alert.alert("錯誤", "儲存失敗，請稍後再試");
  } finally {
    setSaving(false);
  }
};
```

**Step 4: 更新分類選擇 UI（多選 toggle）**

替換分類區塊的 JSX（約第 59-85 行）：

```tsx
{
  /* 分類 */
}
<View className="mb-6">
  <Text className="text-lg font-bold text-gray-700 mb-3">分類（可多選）</Text>
  <View className="flex-row flex-wrap">
    {categories.map((cat) => {
      const isSelected = selectedBodyParts.includes(cat.value);
      return (
        <TouchableOpacity
          key={cat.value}
          className={`flex-row items-center px-4 py-2 rounded-full mr-2 mb-2 ${
            isSelected ? "bg-primary-500" : "bg-white border border-gray-200"
          }`}
          onPress={() => toggleBodyPart(cat.value)}
        >
          <View className="mr-1">
            <Icon name={cat.icon} size={16} color={isSelected ? "#ffffff" : "#374151"} />
          </View>
          <Text className={isSelected ? "text-white font-medium" : "text-gray-700"}>
            {cat.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>;
```

**Step 5: 驗證編譯**

Run: `npm run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add app/exercise/new.tsx
git commit -m "feat(exercise/new): 分類選擇改為多選"
```

---

## Task 4: 更新編輯項目頁面 UI

**Files:**

- Modify: `app/exercise/[id].tsx`

**Step 1: 修改 imports 和 state**

新增 getBodyPartsForExercise 到 useExercises 解構：

```typescript
const { exercises, updateExercise, deleteExercise, getBodyPartsForExercise } = useExercises();
```

替換 category state：

```typescript
// 原本
const [category, setCategory] = useState("other");

// 改成
const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);
```

**Step 2: 新增 toggle function**

```typescript
const toggleBodyPart = (value: string) => {
  setSelectedBodyParts((prev) =>
    prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
  );
};
```

**Step 3: 更新 useEffect 載入邏輯**

```typescript
useEffect(() => {
  const exercise = exercises.find((e) => e.id === parseInt(id!, 10));
  if (exercise) {
    setName(exercise.name);
    const bodyParts = getBodyPartsForExercise(exercise.id);
    setSelectedBodyParts(bodyParts.length > 0 ? bodyParts : [exercise.category || "other"]);
    setDescription(exercise.description || "");
    setIsActive(exercise.isActive);
    setLoading(false);
  } else if (exercises.length > 0) {
    setLoading(false);
  }
}, [id, exercises, getBodyPartsForExercise]);
```

**Step 4: 更新 handleSave**

```typescript
const handleSave = async () => {
  if (!name.trim()) {
    Alert.alert("提示", "請輸入項目名稱");
    return;
  }

  if (selectedBodyParts.length === 0) {
    Alert.alert("提示", "請至少選擇一個分類");
    return;
  }

  setSaving(true);
  try {
    await updateExercise(parseInt(id!, 10), {
      name: name.trim(),
      bodyParts: selectedBodyParts,
      description: description.trim() || null,
      isActive,
    });
    router.back();
  } catch {
    Alert.alert("錯誤", "儲存失敗，請稍後再試");
  } finally {
    setSaving(false);
  }
};
```

**Step 5: 更新分類選擇 UI**

替換分類區塊的 JSX：

```tsx
{
  /* 分類 */
}
<View className="mb-6">
  <Text className="text-lg font-bold text-gray-700 mb-3">分類（可多選）</Text>
  <View className="flex-row flex-wrap">
    {categories.map((cat) => {
      const isSelected = selectedBodyParts.includes(cat.value);
      return (
        <TouchableOpacity
          key={cat.value}
          className={`flex-row items-center px-4 py-2 rounded-full mr-2 mb-2 ${
            isSelected ? "bg-primary-500" : "bg-white border border-gray-200"
          }`}
          onPress={() => toggleBodyPart(cat.value)}
        >
          <View className="mr-1">
            <Icon name={cat.icon} size={16} color={isSelected ? "#ffffff" : "#374151"} />
          </View>
          <Text className={isSelected ? "text-white font-medium" : "text-gray-700"}>
            {cat.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>;
```

**Step 6: 驗證編譯**

Run: `npm run typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add app/exercise/[id].tsx
git commit -m "feat(exercise/edit): 分類選擇改為多選並載入現有分類"
```

---

## Task 5: 驗證與最終確認

**Step 1: 執行完整檢查**

Run: `npm run typecheck && npm run lint`
Expected: PASS

**Step 2: 手動測試**

1. 開啟 app，新增一個健身項目，選擇多個分類
2. 確認儲存成功，並在項目列表正確顯示
3. 編輯該項目，確認分類正確載入
4. 修改分類，儲存，確認更新成功
5. 到新增運動紀錄頁面，選擇任一分類，確認項目正確顯示

**Step 3: Final Commit（如有修正）**

```bash
git add .
git commit -m "fix: 修正多分類功能問題"
```
