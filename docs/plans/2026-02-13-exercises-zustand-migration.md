# Exercises Zustand 遷移實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將 exercises 狀態從各元件獨立的 `useExercises` hook 遷移到 Zustand global store，解決跨頁面資料不同步問題。

**Architecture:** 建立 `exerciseStore`，將 exercises/exerciseBodyParts 的 CRUD 與衍生方法集中管理。各頁面改為從 store 取資料，移除不必要的 `useFocusEffect` 刷新。`selectedBodyPart` 等 UI 狀態留在各頁面 local state。

**Tech Stack:** Zustand, expo-sqlite, React Native

---

### Task 1: 建立 exerciseStore

**Files:**

- Create: `src/store/exerciseStore.ts`

**Step 1: 建立 store 檔案**

```ts
import { create } from "zustand";
import { getDatabase, Exercise, ExerciseBodyPart } from "@/db/client";
import { BodyPartKey } from "@/utils/constants";

interface CreateExerciseInput {
  name: string;
  bodyParts: string[];
  description: string | null;
}

interface UpdateExerciseInput {
  name?: string;
  bodyParts?: string[];
  description?: string | null;
  isActive?: boolean;
}

interface ExerciseStore {
  exercises: Exercise[];
  exerciseBodyParts: ExerciseBodyPart[];
  loading: boolean;
  error: Error | null;

  fetchExercises: () => Promise<void>;
  createExercise: (input: CreateExerciseInput) => Promise<Exercise>;
  updateExercise: (id: number, input: UpdateExerciseInput) => Promise<void>;
  deleteExercise: (id: number) => Promise<void>;
  getExercisesByBodyPart: (bodyPart: BodyPartKey | null) => Exercise[];
  getBodyPartsForExercise: (exerciseId: number) => string[];
}

export const useExerciseStore = create<ExerciseStore>((set, get) => ({
  exercises: [],
  exerciseBodyParts: [],
  loading: true,
  error: null,

  fetchExercises: async () => {
    try {
      set({ loading: true });
      const db = await getDatabase();
      const results = await db.getAllAsync<Exercise>(
        "SELECT id, name, description, createdAt, isActive FROM exercises ORDER BY name ASC"
      );
      const mappedResults = results.map((r) => ({
        ...r,
        isActive: Boolean(r.isActive),
      }));
      const bodyParts = await db.getAllAsync<ExerciseBodyPart>("SELECT * FROM exercise_body_parts");
      set({ exercises: mappedResults, exerciseBodyParts: bodyParts, error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err : new Error("Unknown error") });
    } finally {
      set({ loading: false });
    }
  },

  createExercise: async (input) => {
    const db = await getDatabase();
    const result = await db.runAsync(
      "INSERT INTO exercises (name, description, isActive) VALUES (?, ?, 1)",
      [input.name, input.description]
    );
    for (const bodyPart of input.bodyParts) {
      await db.runAsync("INSERT INTO exercise_body_parts (exerciseId, bodyPart) VALUES (?, ?)", [
        result.lastInsertRowId,
        bodyPart,
      ]);
    }
    const newExercise: Exercise = {
      id: result.lastInsertRowId,
      name: input.name,
      description: input.description,
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    set((state) => ({
      exercises: [...state.exercises, newExercise].sort((a, b) => a.name.localeCompare(b.name)),
      exerciseBodyParts: [
        ...state.exerciseBodyParts,
        ...input.bodyParts.map((bp, idx) => ({
          id: -Date.now() - idx,
          exerciseId: result.lastInsertRowId,
          bodyPart: bp,
        })),
      ],
    }));
    return newExercise;
  },

  updateExercise: async (id, input) => {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    if (input.name !== undefined) {
      updates.push("name = ?");
      values.push(input.name);
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
    if (input.bodyParts !== undefined) {
      await db.runAsync("DELETE FROM exercise_body_parts WHERE exerciseId = ?", [id]);
      for (const bodyPart of input.bodyParts) {
        await db.runAsync("INSERT INTO exercise_body_parts (exerciseId, bodyPart) VALUES (?, ?)", [
          id,
          bodyPart,
        ]);
      }
      set((state) => ({
        exerciseBodyParts: [
          ...state.exerciseBodyParts.filter((bp) => bp.exerciseId !== id),
          ...input.bodyParts!.map((bp, idx) => ({
            id: -Date.now() - idx,
            exerciseId: id,
            bodyPart: bp,
          })),
        ],
      }));
    }
    set((state) => ({
      exercises: state.exercises.map((e) =>
        e.id === id
          ? {
              ...e,
              name: input.name ?? e.name,
              description: input.description !== undefined ? input.description : e.description,
              isActive: input.isActive !== undefined ? input.isActive : e.isActive,
            }
          : e
      ),
    }));
  },

  deleteExercise: async (id) => {
    const db = await getDatabase();
    await db.runAsync(
      "DELETE FROM workout_sets WHERE sessionId IN (SELECT id FROM workout_sessions WHERE exerciseId = ?)",
      [id]
    );
    await db.runAsync("DELETE FROM workout_sessions WHERE exerciseId = ?", [id]);
    await db.runAsync("DELETE FROM exercises WHERE id = ?", [id]);
    set((state) => ({
      exercises: state.exercises.filter((e) => e.id !== id),
      exerciseBodyParts: state.exerciseBodyParts.filter((bp) => bp.exerciseId !== id),
    }));
  },

  getExercisesByBodyPart: (bodyPart) => {
    const { exercises, exerciseBodyParts } = get();
    if (!bodyPart) return exercises.filter((e) => e.isActive);
    const exerciseIds = exerciseBodyParts
      .filter((bp) => bp.bodyPart === bodyPart)
      .map((bp) => bp.exerciseId);
    return exercises.filter((e) => e.isActive && exerciseIds.includes(e.id));
  },

  getBodyPartsForExercise: (exerciseId) => {
    return get()
      .exerciseBodyParts.filter((bp) => bp.exerciseId === exerciseId)
      .map((bp) => bp.bodyPart);
  },
}));
```

**Step 2: 執行 typecheck 確認無錯誤**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/store/exerciseStore.ts
git commit -m "feat: 建立 exerciseStore Zustand store"
```

---

### Task 2: 遷移首頁 (index.tsx)

**Files:**

- Modify: `app/(tabs)/index.tsx`

**改動：**

1. 移除 `import { useExercises }`
2. 新增 `import { useExerciseStore } from "@/store/exerciseStore"`
3. 將 `const { exercises, loading: exercisesLoading } = useExercises()` 改為：
   ```ts
   const exercises = useExerciseStore((s) => s.exercises);
   const exercisesLoading = useExerciseStore((s) => s.loading);
   ```
4. 在第一個 `useFocusEffect` 加入 `fetchExercises` 呼叫：
   ```ts
   const fetchExercises = useExerciseStore((s) => s.fetchExercises);
   // 在 useFocusEffect 中：
   refreshSessions();
   refreshStats();
   fetchExercises();
   ```

**Step 1: 修改 import 與 state 取法**

**Step 2: 執行 typecheck**

Run: `npm run typecheck`

**Step 3: Commit**

```bash
git add "app/(tabs)/index.tsx"
git commit -m "refactor: 首頁改用 exerciseStore"
```

---

### Task 3: 遷移健身項目頁 (exercises.tsx)

**Files:**

- Modify: `app/(tabs)/exercises.tsx`

**改動：**

1. 移除 `useExercises` import，改用 `useExerciseStore`
2. 替換解構：
   ```ts
   const exercises = useExerciseStore((s) => s.exercises);
   const exerciseBodyParts = useExerciseStore((s) => s.exerciseBodyParts);
   const loading = useExerciseStore((s) => s.loading);
   const fetchExercises = useExerciseStore((s) => s.fetchExercises);
   ```
3. `useFocusEffect` 中的 `refresh()` 改為 `fetchExercises()`
4. `onRefresh` 中的 `refresh()` 改為 `fetchExercises()`

**Step 1: 修改檔案**

**Step 2: 執行 typecheck**

**Step 3: Commit**

```bash
git add "app/(tabs)/exercises.tsx"
git commit -m "refactor: 健身項目頁改用 exerciseStore"
```

---

### Task 4: 遷移歷史紀錄頁 (history.tsx)

**Files:**

- Modify: `app/(tabs)/history.tsx`

**改動：**

1. 替換 import 為 `useExerciseStore`
2. 替換解構：
   ```ts
   const exercises = useExerciseStore((s) => s.exercises);
   const exerciseBodyParts = useExerciseStore((s) => s.exerciseBodyParts);
   const exercisesLoading = useExerciseStore((s) => s.loading);
   ```

**Commit:**

```bash
git add "app/(tabs)/history.tsx"
git commit -m "refactor: 歷史紀錄頁改用 exerciseStore"
```

---

### Task 5: 遷移新增紀錄頁 (workout/new.tsx)

**Files:**

- Modify: `app/workout/new.tsx`

**改動（這個最複雜，因為要把 `selectedBodyPart` 改為 local state）：**

1. 替換 import 為 `useExerciseStore`
2. 新增 local state:
   ```ts
   const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPartKey | null>(null);
   ```
3. 從 store 取 `getExercisesByBodyPart`：
   ```ts
   const getExercisesByBodyPart = useExerciseStore((s) => s.getExercisesByBodyPart);
   ```
4. 用 `useMemo` 計算 filteredExercises：
   ```ts
   const filteredExercises = useMemo(
     () => getExercisesByBodyPart(selectedBodyPart),
     [selectedBodyPart, getExercisesByBodyPart]
   );
   ```
5. 新增 import: `useMemo` 和 `BodyPartKey`

**Commit:**

```bash
git add app/workout/new.tsx
git commit -m "refactor: 新增紀錄頁改用 exerciseStore，selectedBodyPart 改為 local state"
```

---

### Task 6: 遷移新增健身項目頁 (exercise/new.tsx)

**Files:**

- Modify: `app/exercise/new.tsx`

**改動：**

1. 替換 import
2. `const { createExercise } = useExercises()` → `const createExercise = useExerciseStore((s) => s.createExercise)`

**Commit:**

```bash
git add app/exercise/new.tsx
git commit -m "refactor: 新增健身項目頁改用 exerciseStore"
```

---

### Task 7: 遷移編輯健身項目頁 (exercise/[id]/index.tsx)

**Files:**

- Modify: `app/exercise/[id]/index.tsx`

**改動：**

1. 替換 import
2. 解構改為：
   ```ts
   const exercises = useExerciseStore((s) => s.exercises);
   const updateExercise = useExerciseStore((s) => s.updateExercise);
   const deleteExercise = useExerciseStore((s) => s.deleteExercise);
   const getBodyPartsForExercise = useExerciseStore((s) => s.getBodyPartsForExercise);
   ```

**Commit:**

```bash
git add "app/exercise/[id]/index.tsx"
git commit -m "refactor: 編輯健身項目頁改用 exerciseStore"
```

---

### Task 8: 遷移圖表頁 (exercise/[id]/chart.tsx)

**Files:**

- Modify: `app/exercise/[id]/chart.tsx`

**改動：**

1. 替換 import
2. `const { exercises } = useExercises()` → `const exercises = useExerciseStore((s) => s.exercises)`

**Commit:**

```bash
git add "app/exercise/[id]/chart.tsx"
git commit -m "refactor: 圖表頁改用 exerciseStore"
```

---

### Task 9: 遷移訓練詳情頁 (workout/[id].tsx)

**Files:**

- Modify: `app/workout/[id].tsx`

**改動：**

1. 替換 import
2. `const { exercises } = useExercises()` → `const exercises = useExerciseStore((s) => s.exercises)`

**Commit:**

```bash
git add "app/workout/[id].tsx"
git commit -m "refactor: 訓練詳情頁改用 exerciseStore"
```

---

### Task 10: 遷移菜單訓練頁 (workout/menu/[menuId].tsx)

**Files:**

- Modify: `app/workout/menu/[menuId].tsx`

**改動：**

1. 替換 import
2. 解構改為：
   ```ts
   const exercises = useExerciseStore((s) => s.exercises);
   const exerciseBodyParts = useExerciseStore((s) => s.exerciseBodyParts);
   const getBodyPartsForExercise = useExerciseStore((s) => s.getBodyPartsForExercise);
   ```

**Commit:**

```bash
git add "app/workout/menu/[menuId].tsx"
git commit -m "refactor: 菜單訓練頁改用 exerciseStore"
```

---

### Task 11: 遷移菜單編輯頁 (menu/[id].tsx)

**Files:**

- Modify: `app/menu/[id].tsx`

**改動：**

1. 替換 import
2. `const { getExercisesByBodyPart } = useExercises()` → `const getExercisesByBodyPart = useExerciseStore((s) => s.getExercisesByBodyPart)`

**Commit:**

```bash
git add "app/menu/[id].tsx"
git commit -m "refactor: 菜單編輯頁改用 exerciseStore"
```

---

### Task 12: 刪除 useExercises hook 並確保初始化

**Files:**

- Delete: `src/hooks/useExercises.ts`

**Step 1: 確認沒有任何檔案還在 import useExercises**

Run: `grep -r "useExercises" src/ app/ --include="*.ts" --include="*.tsx"`
Expected: 只有 `src/hooks/useExercises.ts` 自己

**Step 2: 刪除 hook 檔案**

```bash
rm src/hooks/useExercises.ts
```

**Step 3: 執行完整檢查**

Run: `npm run typecheck && npm run lint`
Expected: PASS

**Step 4: Commit**

```bash
git add src/hooks/useExercises.ts
git commit -m "refactor: 移除已棄用的 useExercises hook，exercises 遷移至 Zustand 完成"
```
