# 簡化運動紀錄流程實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 將運動紀錄從「每組各別輸入」簡化為「固定重量/次數 + 組數計數」模式

**Architecture:** 修改資料庫 schema 新增欄位並建立部位關聯表，更新 hooks 支援新資料結構，重寫新增紀錄 UI 為計數器模式

**Tech Stack:** React Native, Expo Router, expo-sqlite, Zustand, NativeWind

---

## Task 1: 新增常數定義

**Files:**

- Modify: `src/utils/constants.ts`

**Step 1: 新增部位與難易度常數**

在 `src/utils/constants.ts` 檔案末尾加入：

```typescript
export const BODY_PARTS = {
  chest: { label: "胸", color: "#ef4444" },
  back: { label: "背", color: "#3b82f6" },
  shoulders: { label: "肩", color: "#8b5cf6" },
  arms: { label: "手臂", color: "#f97316" },
  legs: { label: "腿", color: "#22c55e" },
  core: { label: "核心", color: "#eab308" },
  cardio: { label: "有氧", color: "#06b6d4" },
} as const;

export type BodyPartKey = keyof typeof BODY_PARTS;

export const DIFFICULTY_LEVELS = [
  { value: 1, label: "輕鬆", color: "#22c55e" },
  { value: 2, label: "適中", color: "#84cc16" },
  { value: 3, label: "有挑戰", color: "#eab308" },
  { value: 4, label: "很吃力", color: "#f97316" },
  { value: 5, label: "極限", color: "#ef4444" },
] as const;
```

**Step 2: 驗證 TypeScript**

Run: `npm run typecheck`
Expected: 無錯誤

**Step 3: Commit**

```bash
git add src/utils/constants.ts
git commit -m "feat: 新增部位與難易度常數定義"
```

---

## Task 2: 更新資料庫 Schema 與類型

**Files:**

- Modify: `src/db/client.ts`

**Step 1: 新增 exercise_body_parts 表**

在 `initDatabase` 函數中，`workout_sets` 表建立之後加入：

```typescript
// 建立 ExerciseBodyParts 關聯表
await database.execAsync(`
    CREATE TABLE IF NOT EXISTS exercise_body_parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exerciseId INTEGER NOT NULL,
      bodyPart TEXT NOT NULL,
      FOREIGN KEY (exerciseId) REFERENCES exercises(id) ON DELETE CASCADE
    );
  `);
```

**Step 2: 修改 workout_sessions 表新增欄位**

在 `initDatabase` 函數中，建立完所有表之後、檢查預設資料之前，加入遷移邏輯：

```typescript
// 遷移：新增 workout_sessions 欄位
const columns = await database.getAllAsync<{ name: string }>("PRAGMA table_info(workout_sessions)");
const columnNames = columns.map((c) => c.name);

if (!columnNames.includes("weight")) {
  await database.execAsync("ALTER TABLE workout_sessions ADD COLUMN weight REAL");
}
if (!columnNames.includes("reps")) {
  await database.execAsync("ALTER TABLE workout_sessions ADD COLUMN reps INTEGER");
}
if (!columnNames.includes("setCount")) {
  await database.execAsync("ALTER TABLE workout_sessions ADD COLUMN setCount INTEGER");
}
if (!columnNames.includes("difficulty")) {
  await database.execAsync("ALTER TABLE workout_sessions ADD COLUMN difficulty INTEGER");
}
if (!columnNames.includes("isBodyweight")) {
  await database.execAsync(
    "ALTER TABLE workout_sessions ADD COLUMN isBodyweight INTEGER DEFAULT 0"
  );
}

// 遷移：將現有 mood 資料複製到 difficulty
await database.execAsync(
  "UPDATE workout_sessions SET difficulty = mood WHERE difficulty IS NULL AND mood IS NOT NULL"
);
```

**Step 3: 更新類型定義**

在檔案底部修改 `WorkoutSession` interface：

```typescript
export interface WorkoutSession {
  id: number;
  exerciseId: number;
  date: string;
  mood: number | null; // 保留相容性
  weight: number | null;
  reps: number | null;
  setCount: number | null;
  difficulty: number | null;
  isBodyweight: number; // SQLite 使用 0/1
  notes: string | null;
  createdAt: string;
}

export interface ExerciseBodyPart {
  id: number;
  exerciseId: number;
  bodyPart: string;
}
```

**Step 4: 更新 seedDatabase 加入部位關聯**

修改 `seedDatabase` 函數，在插入 exercise 後加入部位關聯：

```typescript
async function seedDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  const defaultExercises = [
    { name: "深蹲", bodyParts: ["legs"], description: "經典下肢訓練動作" },
    { name: "臥推", bodyParts: ["chest"], description: "胸部主要訓練動作" },
    { name: "硬舉", bodyParts: ["back", "legs"], description: "全身性複合動作" },
    { name: "肩推", bodyParts: ["shoulders"], description: "肩部訓練動作" },
    { name: "引體向上", bodyParts: ["back", "arms"], description: "背部訓練經典動作" },
    { name: "二頭彎舉", bodyParts: ["arms"], description: "二頭肌孤立訓練" },
    { name: "三頭下壓", bodyParts: ["arms"], description: "三頭肌訓練" },
    { name: "腿推", bodyParts: ["legs"], description: "腿部機械訓練" },
    { name: "划船", bodyParts: ["back"], description: "背部水平拉動作" },
    { name: "平板支撐", bodyParts: ["core"], description: "核心穩定訓練" },
    { name: "跑步", bodyParts: ["cardio"], description: "有氧運動" },
    { name: "飛鳥", bodyParts: ["chest"], description: "胸部孤立訓練" },
  ];

  for (const exercise of defaultExercises) {
    const result = await database.runAsync(
      "INSERT INTO exercises (name, category, description, isActive) VALUES (?, ?, ?, 1)",
      [exercise.name, exercise.bodyParts[0], exercise.description]
    );

    // 插入部位關聯
    for (const bodyPart of exercise.bodyParts) {
      await database.runAsync(
        "INSERT INTO exercise_body_parts (exerciseId, bodyPart) VALUES (?, ?)",
        [result.lastInsertRowId, bodyPart]
      );
    }
  }
}
```

**Step 5: 驗證 TypeScript**

Run: `npm run typecheck`
Expected: 無錯誤

**Step 6: Commit**

```bash
git add src/db/client.ts
git commit -m "feat: 更新資料庫 schema 支援簡化紀錄模式"
```

---

## Task 3: 更新 useExercises Hook

**Files:**

- Modify: `src/hooks/useExercises.ts`

**Step 1: 新增部位相關功能**

在檔案開頭 import 區加入：

```typescript
import { useState, useEffect, useCallback } from "react";
import { getDatabase, Exercise, ExerciseBodyPart } from "@/db/client";
import { BodyPartKey } from "@/utils/constants";
```

修改 `useExercises` 函數，加入部位篩選：

```typescript
export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseBodyParts, setExerciseBodyParts] = useState<ExerciseBodyPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPartKey | null>(null);

  const fetchExercises = useCallback(async () => {
    try {
      setLoading(true);
      const db = await getDatabase();
      const results = await db.getAllAsync<Exercise>(
        "SELECT id, name, category, description, createdAt, isActive FROM exercises ORDER BY name ASC"
      );
      const mappedResults = results.map((r) => ({
        ...r,
        isActive: Boolean(r.isActive),
      }));
      setExercises(mappedResults);

      // 取得所有部位關聯
      const bodyParts = await db.getAllAsync<ExerciseBodyPart>(
        "SELECT * FROM exercise_body_parts"
      );
      setExerciseBodyParts(bodyParts);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  // 依部位篩選運動項目
  const getExercisesByBodyPart = useCallback(
    (bodyPart: BodyPartKey | null): Exercise[] => {
      if (!bodyPart) return exercises.filter((e) => e.isActive);

      const exerciseIds = exerciseBodyParts
        .filter((bp) => bp.bodyPart === bodyPart)
        .map((bp) => bp.exerciseId);

      return exercises.filter((e) => e.isActive && exerciseIds.includes(e.id));
    },
    [exercises, exerciseBodyParts]
  );

  // 取得運動項目的所有部位
  const getBodyPartsForExercise = useCallback(
    (exerciseId: number): string[] => {
      return exerciseBodyParts
        .filter((bp) => bp.exerciseId === exerciseId)
        .map((bp) => bp.bodyPart);
    },
    [exerciseBodyParts]
  );

  // ... 保留原有的 createExercise, updateExercise, deleteExercise ...
```

在 return 前加入篩選後的結果：

```typescript
const filteredExercises = getExercisesByBodyPart(selectedBodyPart);

return {
  exercises,
  filteredExercises,
  exerciseBodyParts,
  loading,
  error,
  selectedBodyPart,
  setSelectedBodyPart,
  refresh: fetchExercises,
  createExercise,
  updateExercise,
  deleteExercise,
  getExercisesByBodyPart,
  getBodyPartsForExercise,
};
```

**Step 2: 驗證 TypeScript**

Run: `npm run typecheck`
Expected: 無錯誤

**Step 3: Commit**

```bash
git add src/hooks/useExercises.ts
git commit -m "feat: useExercises 新增部位篩選功能"
```

---

## Task 4: 更新 useWorkoutSessions Hook

**Files:**

- Modify: `src/hooks/useWorkoutSessions.ts`

**Step 1: 更新 CreateSessionInput 介面**

將原有的 `CreateSessionInput` 改為支援新格式：

```typescript
interface CreateSessionInput {
  exerciseId: number;
  date: string;
  weight: number | null;
  reps: number;
  setCount: number;
  difficulty: number;
  isBodyweight: boolean;
  notes: string | null;
}
```

**Step 2: 更新 createSession 函數**

```typescript
const createSession = useCallback(async (input: CreateSessionInput): Promise<WorkoutSession> => {
  const db = await getDatabase();

  const sessionResult = await db.runAsync(
    `INSERT INTO workout_sessions
       (exerciseId, date, weight, reps, setCount, difficulty, isBodyweight, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.exerciseId,
      input.date,
      input.isBodyweight ? null : input.weight,
      input.reps,
      input.setCount,
      input.difficulty,
      input.isBodyweight ? 1 : 0,
      input.notes,
    ]
  );

  const newSession: WorkoutSession = {
    id: sessionResult.lastInsertRowId,
    exerciseId: input.exerciseId,
    date: input.date,
    mood: null,
    weight: input.isBodyweight ? null : input.weight,
    reps: input.reps,
    setCount: input.setCount,
    difficulty: input.difficulty,
    isBodyweight: input.isBodyweight ? 1 : 0,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };

  setSessions((prev) => [newSession, ...prev]);
  return newSession;
}, []);
```

**Step 3: 移除 getSessionById 中的 sets 查詢（簡化模式不需要）**

```typescript
const getSessionById = useCallback(async (id: number): Promise<WorkoutSession | null> => {
  const db = await getDatabase();
  const session = await db.getFirstAsync<WorkoutSession>(
    "SELECT * FROM workout_sessions WHERE id = ?",
    [id]
  );
  return session || null;
}, []);
```

**Step 4: 移除不需要的 imports 和 types**

移除檔案開頭的 `WorkoutSet, WorkoutSessionWithSets` import。

**Step 5: 驗證 TypeScript**

Run: `npm run typecheck`
Expected: 無錯誤

**Step 6: Commit**

```bash
git add src/hooks/useWorkoutSessions.ts
git commit -m "feat: useWorkoutSessions 改用簡化紀錄格式"
```

---

## Task 5: 建立難易度選擇元件

**Files:**

- Create: `src/components/DifficultySelector.tsx`

**Step 1: 建立元件**

```typescript
import { View, Text, TouchableOpacity } from "react-native";
import { DIFFICULTY_LEVELS } from "@/utils/constants";

interface DifficultySelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  return (
    <View className="flex-row justify-around bg-white rounded-xl p-4">
      {DIFFICULTY_LEVELS.map((level) => (
        <TouchableOpacity
          key={level.value}
          className={`items-center p-2 rounded-lg ${
            value === level.value ? "bg-gray-100" : ""
          }`}
          onPress={() => onChange(level.value)}
        >
          <View
            className="w-7 h-7 rounded-full mb-1"
            style={{ backgroundColor: level.color }}
          />
          <Text
            className={`text-xs ${
              value === level.value ? "font-bold text-gray-800" : "text-gray-500"
            }`}
          >
            {level.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

**Step 2: 驗證 TypeScript**

Run: `npm run typecheck`
Expected: 無錯誤

**Step 3: Commit**

```bash
git add src/components/DifficultySelector.tsx
git commit -m "feat: 新增難易度選擇元件"
```

---

## Task 6: 建立部位選擇元件

**Files:**

- Create: `src/components/BodyPartSelector.tsx`

**Step 1: 建立元件**

```typescript
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { BODY_PARTS, BodyPartKey } from "@/utils/constants";

interface BodyPartSelectorProps {
  value: BodyPartKey | null;
  onChange: (value: BodyPartKey | null) => void;
}

export function BodyPartSelector({ value, onChange }: BodyPartSelectorProps) {
  const bodyPartEntries = Object.entries(BODY_PARTS) as [BodyPartKey, (typeof BODY_PARTS)[BodyPartKey]][];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <TouchableOpacity
        className={`px-4 py-2 rounded-full mr-2 ${
          value === null ? "bg-primary-500" : "bg-gray-200"
        }`}
        onPress={() => onChange(null)}
      >
        <Text className={value === null ? "text-white font-medium" : "text-gray-700"}>
          全部
        </Text>
      </TouchableOpacity>
      {bodyPartEntries.map(([key, part]) => (
        <TouchableOpacity
          key={key}
          className={`px-4 py-2 rounded-full mr-2 ${
            value === key ? "bg-primary-500" : "bg-gray-200"
          }`}
          onPress={() => onChange(key)}
        >
          <Text className={value === key ? "text-white font-medium" : "text-gray-700"}>
            {part.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
```

**Step 2: 驗證 TypeScript**

Run: `npm run typecheck`
Expected: 無錯誤

**Step 3: Commit**

```bash
git add src/components/BodyPartSelector.tsx
git commit -m "feat: 新增部位選擇元件"
```

---

## Task 7: 建立組數計數器元件

**Files:**

- Create: `src/components/SetCounter.tsx`

**Step 1: 建立元件**

```typescript
import { View, Text, TouchableOpacity, Vibration } from "react-native";
import { useRef } from "react";

interface SetCounterProps {
  value: number;
  onChange: (value: number) => void;
}

export function SetCounter({ value, onChange }: SetCounterProps) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handlePress = () => {
    onChange(value + 1);
  };

  const handleLongPress = () => {
    if (value > 0) {
      Vibration.vibrate(50);
      onChange(value - 1);
    }
  };

  const handlePressIn = () => {
    longPressTimer.current = setTimeout(() => {
      handleLongPress();
    }, 500);
  };

  const handlePressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <View className="items-center">
      <TouchableOpacity
        className="w-32 h-32 rounded-full bg-primary-500 items-center justify-center shadow-lg"
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <Text className="text-white text-5xl font-bold">{value}</Text>
      </TouchableOpacity>
      <Text className="text-gray-600 text-lg mt-2">組</Text>
      <Text className="text-gray-400 text-sm mt-1">點擊 +1 ｜ 長按 -1</Text>
    </View>
  );
}
```

**Step 2: 驗證 TypeScript**

Run: `npm run typecheck`
Expected: 無錯誤

**Step 3: Commit**

```bash
git add src/components/SetCounter.tsx
git commit -m "feat: 新增組數計數器元件"
```

---

## Task 8: 重寫新增運動紀錄頁面

**Files:**

- Modify: `app/workout/new.tsx`

**Step 1: 完全重寫頁面**

```typescript
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Switch } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useExercises } from "@/hooks/useExercises";
import { useWorkoutSessions } from "@/hooks/useWorkoutSessions";
import { BodyPartSelector } from "@/components/BodyPartSelector";
import { DifficultySelector } from "@/components/DifficultySelector";
import { SetCounter } from "@/components/SetCounter";
import { BodyPartKey } from "@/utils/constants";

export default function NewWorkoutScreen() {
  const router = useRouter();
  const { filteredExercises, selectedBodyPart, setSelectedBodyPart } = useExercises();
  const { createSession } = useWorkoutSessions();

  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [isBodyweight, setIsBodyweight] = useState(false);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [setCount, setSetCount] = useState(0);
  const [difficulty, setDifficulty] = useState(3);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleBodyPartChange = (bodyPart: BodyPartKey | null) => {
    setSelectedBodyPart(bodyPart);
    setSelectedExerciseId(null);
  };

  const handleSave = async () => {
    if (!selectedExerciseId) {
      Alert.alert("提示", "請選擇健身項目");
      return;
    }

    if (setCount < 1) {
      Alert.alert("提示", "請至少完成一組");
      return;
    }

    if (!isBodyweight && (!weight || parseFloat(weight) <= 0)) {
      Alert.alert("提示", "請輸入重量");
      return;
    }

    if (!reps || parseInt(reps, 10) <= 0) {
      Alert.alert("提示", "請輸入次數");
      return;
    }

    setSaving(true);
    try {
      await createSession({
        exerciseId: selectedExerciseId,
        date: new Date().toISOString(),
        weight: isBodyweight ? null : parseFloat(weight),
        reps: parseInt(reps, 10),
        setCount,
        difficulty,
        isBodyweight,
        notes: notes.trim() || null,
      });
      router.back();
    } catch {
      Alert.alert("錯誤", "儲存失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* 部位選擇 */}
        <View className="mb-4">
          <Text className="text-lg font-bold text-gray-700 mb-3">選擇部位</Text>
          <BodyPartSelector value={selectedBodyPart} onChange={handleBodyPartChange} />
        </View>

        {/* 運動項目選擇 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">選擇項目</Text>
          {filteredExercises.length === 0 ? (
            <View className="bg-white rounded-xl p-4">
              <Text className="text-gray-500 text-center">此部位沒有項目</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {filteredExercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  className={`px-4 py-3 rounded-xl mr-2 ${
                    selectedExerciseId === exercise.id
                      ? "bg-primary-500"
                      : "bg-white border border-gray-200"
                  }`}
                  onPress={() => setSelectedExerciseId(exercise.id)}
                >
                  <Text
                    className={
                      selectedExerciseId === exercise.id
                        ? "text-white font-medium"
                        : "text-gray-700"
                    }
                  >
                    {exercise.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* 重量設定 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">重量</Text>
          <View className="bg-white rounded-xl p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-gray-700">自體重量</Text>
              <Switch value={isBodyweight} onValueChange={setIsBodyweight} />
            </View>
            {!isBodyweight && (
              <View className="flex-row items-center">
                <TextInput
                  className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-lg"
                  placeholder="0"
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={setWeight}
                />
                <Text className="text-gray-600 text-lg ml-3">kg</Text>
              </View>
            )}
          </View>
        </View>

        {/* 次數設定 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">每組次數</Text>
          <View className="bg-white rounded-xl p-4">
            <View className="flex-row items-center">
              <TextInput
                className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-lg"
                placeholder="0"
                keyboardType="number-pad"
                value={reps}
                onChangeText={setReps}
              />
              <Text className="text-gray-600 text-lg ml-3">下</Text>
            </View>
          </View>
        </View>

        {/* 組數計數器 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">完成組數</Text>
          <View className="bg-white rounded-xl p-6 items-center">
            <SetCounter value={setCount} onChange={setSetCount} />
          </View>
        </View>

        {/* 難易度選擇 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">今天難易度</Text>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
        </View>

        {/* 備註 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">備註</Text>
          <TextInput
            className="bg-white rounded-xl p-4 text-base min-h-24"
            placeholder="記錄今天的訓練心得..."
            multiline
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* 儲存按鈕 */}
        <TouchableOpacity
          className={`rounded-xl p-4 items-center ${saving ? "bg-gray-400" : "bg-primary-500"}`}
          onPress={handleSave}
          disabled={saving}
        >
          <Text className="text-white text-lg font-semibold">
            {saving ? "儲存中..." : "儲存紀錄"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
```

**Step 2: 驗證 TypeScript**

Run: `npm run typecheck`
Expected: 無錯誤

**Step 3: Commit**

```bash
git add app/workout/new.tsx
git commit -m "feat: 重寫新增運動紀錄頁面為簡化模式"
```

---

## Task 9: 更新運動紀錄詳情頁面

**Files:**

- Modify: `app/workout/[id].tsx`

**Step 1: 重寫詳情頁面**

```typescript
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useWorkoutSessions } from "@/hooks/useWorkoutSessions";
import { useExercises } from "@/hooks/useExercises";
import { WorkoutSession } from "@/db/client";
import { DIFFICULTY_LEVELS } from "@/utils/constants";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getSessionById, deleteSession } = useWorkoutSessions();
  const { exercises } = useExercises();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, [id]);

  const loadSession = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getSessionById(parseInt(id, 10));
      setSession(data);
    } catch {
      Alert.alert("錯誤", "載入紀錄失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("確認刪除", "確定要刪除這筆紀錄嗎？此操作無法復原。", [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSession(parseInt(id!, 10));
            router.back();
          } catch {
            Alert.alert("錯誤", "刪除失敗");
          }
        },
      },
    ]);
  };

  const getExerciseName = (exerciseId: number) => {
    const exercise = exercises.find((e) => e.id === exerciseId);
    return exercise?.name || "未知項目";
  };

  const getDifficultyInfo = (difficulty: number | null) => {
    if (!difficulty) return { label: "未記錄", color: "#9ca3af" };
    const level = DIFFICULTY_LEVELS.find((l) => l.value === difficulty);
    return level || { label: "未知", color: "#9ca3af" };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-500">載入中...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-500">找不到紀錄</Text>
        <TouchableOpacity className="mt-4" onPress={() => router.back()}>
          <Text className="text-primary-600">返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const difficultyInfo = getDifficultyInfo(session.difficulty);
  const totalVolume =
    session.setCount && session.reps && session.weight
      ? session.setCount * session.reps * session.weight
      : null;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* 標題區 */}
        <View className="bg-white rounded-2xl p-5 mb-4">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-800">
                {getExerciseName(session.exerciseId)}
              </Text>
              <Text className="text-gray-500 mt-1">{formatDate(session.date)}</Text>
            </View>
            <View className="items-center">
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: difficultyInfo.color }}
              />
              <Text className="text-sm text-gray-500 mt-1">{difficultyInfo.label}</Text>
            </View>
          </View>
        </View>

        {/* 訓練數據 */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-white rounded-xl p-4">
            <Text className="text-gray-500 text-sm">重量</Text>
            <Text className="text-2xl font-bold text-gray-800">
              {session.isBodyweight ? "自體" : session.weight ? `${session.weight}kg` : "-"}
            </Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4">
            <Text className="text-gray-500 text-sm">次數</Text>
            <Text className="text-2xl font-bold text-gray-800">
              {session.reps ? `${session.reps}下` : "-"}
            </Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4">
            <Text className="text-gray-500 text-sm">組數</Text>
            <Text className="text-2xl font-bold text-gray-800">
              {session.setCount ? `${session.setCount}組` : "-"}
            </Text>
          </View>
        </View>

        {/* 總訓練量 */}
        {totalVolume && (
          <View className="bg-primary-500 rounded-xl p-4 mb-4">
            <Text className="text-white/80 text-sm">總訓練量</Text>
            <Text className="text-white text-3xl font-bold">{totalVolume} kg</Text>
          </View>
        )}

        {/* 備註 */}
        {session.notes && (
          <View className="mb-4">
            <Text className="text-lg font-bold text-gray-700 mb-3">備註</Text>
            <View className="bg-white rounded-xl p-4">
              <Text className="text-gray-700">{session.notes}</Text>
            </View>
          </View>
        )}

        {/* 刪除按鈕 */}
        <TouchableOpacity
          className="border border-red-500 rounded-xl p-4 items-center mt-4"
          onPress={handleDelete}
        >
          <Text className="text-red-500 font-medium">刪除紀錄</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
```

**Step 2: 驗證 TypeScript**

Run: `npm run typecheck`
Expected: 無錯誤

**Step 3: Commit**

```bash
git add app/workout/[id].tsx
git commit -m "feat: 更新運動紀錄詳情頁面適配簡化模式"
```

---

## Task 10: 更新首頁統計顯示

**Files:**

- Modify: `app/(tabs)/index.tsx`

**Step 1: 更新統計區顯示難易度**

找到 `renderMoodIcon` 函數，改為 `renderDifficultyDot`：

```typescript
import { DIFFICULTY_LEVELS } from "@/utils/constants";

// 移除 MoodIcon import，加入 DIFFICULTY_LEVELS

const renderDifficultyDot = (difficulty: number | null, size: number = 24) => {
  if (!difficulty) return <View className="w-6 h-6 rounded-full bg-gray-300" />;
  const level = DIFFICULTY_LEVELS.find((l) => l.value === difficulty);
  return (
    <View
      className="rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: level?.color || "#9ca3af",
      }}
    />
  );
};
```

**Step 2: 更新 session 列表渲染**

將 `renderMoodIcon(session.mood, 24)` 替換為：

```typescript
{
  renderDifficultyDot(session.difficulty, 24);
}
```

**Step 3: 更新平均心情區塊為平均難易度**

```typescript
{/* 平均難易度 */}
{stats.averageMood > 0 && (
  <View className="bg-white rounded-xl p-4 mb-4">
    <Text className="text-gray-700 font-medium mb-2">平均難易度</Text>
    <View className="flex-row items-center">
      {renderDifficultyDot(Math.round(stats.averageMood), 28)}
      <Text className="text-gray-600 ml-2">
        {DIFFICULTY_LEVELS.find((l) => l.value === Math.round(stats.averageMood))?.label || ""}
        {" "}({stats.averageMood.toFixed(1)})
      </Text>
    </View>
  </View>
)}
```

**Step 4: 驗證 TypeScript**

Run: `npm run typecheck`
Expected: 無錯誤

**Step 5: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: 首頁統計改用難易度顯示"
```

---

## Task 11: 最終驗證

**Step 1: 執行所有檢查**

Run: `npm run typecheck && npm run lint && npm run format:check`
Expected: 全部通過

**Step 2: 如有格式問題，修正**

Run: `npm run format`

**Step 3: 最終 Commit（如有格式修正）**

```bash
git add -A
git commit -m "chore: 格式化程式碼"
```

---

## 完成檢查清單

- [ ] Task 1: 常數定義
- [ ] Task 2: 資料庫 Schema
- [ ] Task 3: useExercises Hook
- [ ] Task 4: useWorkoutSessions Hook
- [ ] Task 5: DifficultySelector 元件
- [ ] Task 6: BodyPartSelector 元件
- [ ] Task 7: SetCounter 元件
- [ ] Task 8: 新增紀錄頁面
- [ ] Task 9: 紀錄詳情頁面
- [ ] Task 10: 首頁統計
- [ ] Task 11: 最終驗證
