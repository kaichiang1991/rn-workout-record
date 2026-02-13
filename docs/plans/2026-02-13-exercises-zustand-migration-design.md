# Exercises 狀態管理遷移至 Zustand

## 背景

`useExercises` hook 被 9+ 頁面使用，每個頁面各自維護獨立的 state，導致：

- 跨頁面資料不同步（如：在健身項目 tab 更新後，首頁不會自動反映）
- 重複 DB 查詢
- 需要 `useFocusEffect` 手動刷新

## 設計

### Store 結構 (`src/store/exerciseStore.ts`)

```ts
interface ExerciseStore {
  // State
  exercises: Exercise[];
  exerciseBodyParts: ExerciseBodyPart[];
  loading: boolean;
  error: Error | null;

  // Actions
  fetchExercises: () => Promise<void>;
  createExercise: (input: CreateExerciseInput) => Promise<Exercise>;
  updateExercise: (id: number, input: UpdateExerciseInput) => Promise<void>;
  deleteExercise: (id: number) => Promise<void>;

  // Derived helpers
  getExercisesByBodyPart: (bodyPart: BodyPartKey | null) => Exercise[];
  getBodyPartsForExercise: (exerciseId: number) => string[];
}
```

### 各頁面改動

| 頁面                            | 改動                                                    |
| ------------------------------- | ------------------------------------------------------- |
| 所有讀取頁面                    | `useExercises()` → `useExerciseStore(s => s.exercises)` |
| exercises.tsx                   | 移除 `useFocusEffect` 刷 exercises                      |
| workout/new.tsx                 | `selectedBodyPart` 改用 local `useState`，從 store 篩選 |
| exercise/new.tsx, exercise/[id] | CRUD 操作改呼叫 store actions                           |

### 刷新策略

- App 啟動時 fetch 一次
- CRUD 操作後 store 內部樂觀更新 state
- 不再需要 `useFocusEffect` 刷 exercises

### 移除項目

- 刪除 `src/hooks/useExercises.ts`
