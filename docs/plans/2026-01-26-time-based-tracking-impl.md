# 時間型訓練記錄功能實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 讓訓練記錄系統同時支援「次數型」和「時間型」記錄，適用於核心訓練等需要計時的運動。

**Architecture:** 在 `workout_sessions` 表新增 `duration` 欄位（整數秒），UI 新增模式切換按鈕。根據 `duration` 是否為 null 判斷記錄類型。現有資料自動兼容（duration 為 null = 次數型）。

**Tech Stack:** React Native, Expo SQLite, TypeScript, Zustand

---

## Task 1: 資料庫遷移 - 新增 duration 欄位

**Files:**

- Modify: `src/db/client.ts:12-95`

**Step 1: 在 initDatabase 函數中新增遷移邏輯**

在 `src/db/client.ts` 的 `initDatabase` 函數末尾（`seedDatabase` 之前）加入：

```typescript
// 遷移：新增 duration 欄位（時間型訓練記錄）
const tableInfo = await database.getAllAsync<{ name: string }>(
  "PRAGMA table_info(workout_sessions)"
);
const hasDuration = tableInfo.some((col) => col.name === "duration");

if (!hasDuration) {
  await database.execAsync("ALTER TABLE workout_sessions ADD COLUMN duration INTEGER");
}
```

**Step 2: 驗證遷移**

啟動 app 並確認沒有錯誤。可在 console 確認遷移成功。

**Step 3: Commit**

```bash
git add src/db/client.ts
git commit -m "feat(db): 新增 duration 欄位支援時間型訓練記錄"
```

---

## Task 2: 更新 TypeScript 型別定義

**Files:**

- Modify: `src/db/client.ts:157-168`
- Create: `src/utils/tracking.ts`

**Step 1: 更新 WorkoutSession 介面**

在 `src/db/client.ts` 的 `WorkoutSession` 介面新增 `duration` 欄位：

```typescript
export interface WorkoutSession {
  id: number;
  exerciseId: number;
  date: string;
  weight: number | null;
  reps: number | null;
  setCount: number | null;
  difficulty: number | null;
  isBodyweight: number;
  notes: string | null;
  createdAt: string;
  duration: number | null; // 新增：時間（秒）
}
```

**Step 2: 建立追蹤類型輔助函數**

建立新檔案 `src/utils/tracking.ts`：

```typescript
import { WorkoutSession } from "../db/client";

export type TrackingMode = "reps" | "time";

/**
 * 判斷訓練記錄的類型
 */
export function getTrackingMode(session: WorkoutSession): TrackingMode {
  return session.duration !== null ? "time" : "reps";
}

/**
 * 格式化時間顯示（統一用秒數）
 */
export function formatDuration(seconds: number): string {
  return `${seconds} 秒`;
}

/**
 * 格式化訓練記錄的摘要顯示
 */
export function formatSessionSummary(session: WorkoutSession): string {
  const mode = getTrackingMode(session);

  if (mode === "time") {
    return `${formatDuration(session.duration!)} × ${session.setCount}組`;
  }

  // 次數型
  if (session.isBodyweight) {
    return `${session.reps}下 × ${session.setCount}組`;
  }
  return `${session.weight}kg × ${session.reps}下 × ${session.setCount}組`;
}
```

**Step 3: 執行型別檢查**

```bash
npm run typecheck
```

預期：可能有型別錯誤（因為其他地方尚未處理 duration），但 client.ts 和 tracking.ts 本身應無錯誤。

**Step 4: Commit**

```bash
git add src/db/client.ts src/utils/tracking.ts
git commit -m "feat(types): 新增 TrackingMode 型別與輔助函數"
```

---

## Task 3: 更新資料存取層 - useWorkoutSessions Hook

**Files:**

- Modify: `src/hooks/useWorkoutSessions.ts`

**Step 1: 更新 CreateSessionInput 介面**

在 `useWorkoutSessions.ts` 找到 `CreateSessionInput` 介面並新增 `duration`：

```typescript
interface CreateSessionInput {
  exerciseId: number;
  date: string;
  weight: number | null;
  reps: number | null; // 改為可 null
  setCount: number;
  difficulty: number;
  isBodyweight: boolean;
  notes: string | null;
  duration: number | null; // 新增
}
```

**Step 2: 更新 createSession 函數的 SQL**

找到 `createSession` 函數，更新 INSERT 語句：

```typescript
const createSession = async (input: CreateSessionInput): Promise<WorkoutSession> => {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO workout_sessions
     (exerciseId, date, weight, reps, setCount, difficulty, isBodyweight, notes, duration)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.exerciseId,
      input.date,
      input.weight,
      input.reps,
      input.setCount,
      input.difficulty,
      input.isBodyweight ? 1 : 0,
      input.notes,
      input.duration,
    ]
  );

  // ... 後續取得新建記錄的邏輯
};
```

**Step 3: 執行型別檢查**

```bash
npm run typecheck
```

預期：應該會看到 `app/workout/new.tsx` 等呼叫 createSession 的地方出現型別錯誤（缺少 duration 參數），這是預期的。

**Step 4: Commit**

```bash
git add src/hooks/useWorkoutSessions.ts
git commit -m "feat(hooks): useWorkoutSessions 支援 duration 欄位"
```

---

## Task 4: 建立追蹤模式切換元件

**Files:**

- Create: `src/components/TrackingModeSwitch.tsx`

**Step 1: 建立 TrackingModeSwitch 元件**

建立新檔案 `src/components/TrackingModeSwitch.tsx`：

```typescript
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { TrackingMode } from "../utils/tracking";

interface TrackingModeSwitchProps {
  value: TrackingMode;
  onChange: (mode: TrackingMode) => void;
}

export function TrackingModeSwitch({ value, onChange }: TrackingModeSwitchProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.option, value === "reps" && styles.optionActive]}
        onPress={() => onChange("reps")}
      >
        <Text style={[styles.optionText, value === "reps" && styles.optionTextActive]}>
          次數
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.option, value === "time" && styles.optionActive]}
        onPress={() => onChange("time")}
      >
        <Text style={[styles.optionText, value === "time" && styles.optionTextActive]}>
          時間
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 4,
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  optionActive: {
    backgroundColor: "#3b82f6",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  optionTextActive: {
    color: "#ffffff",
  },
});
```

**Step 2: 執行型別檢查**

```bash
npm run typecheck
```

預期：無錯誤

**Step 3: Commit**

```bash
git add src/components/TrackingModeSwitch.tsx
git commit -m "feat(ui): 新增 TrackingModeSwitch 模式切換元件"
```

---

## Task 5: 更新 WorkoutRecordForm 元件

**Files:**

- Modify: `src/components/WorkoutRecordForm.tsx`

**Step 1: 新增 props 支援 tracking mode 和 duration**

更新 `WorkoutRecordFormProps` 介面：

```typescript
import { TrackingMode } from "../utils/tracking";
import { TrackingModeSwitch } from "./TrackingModeSwitch";

interface WorkoutRecordFormProps {
  // 新增
  trackingMode: TrackingMode;
  onTrackingModeChange: (mode: TrackingMode) => void;
  duration: string;
  onDurationChange: (value: string) => void;
  // 現有
  isBodyweight: boolean;
  onIsBodyweightChange: (value: boolean) => void;
  weight: string;
  onWeightChange: (value: string) => void;
  reps: string;
  onRepsChange: (value: string) => void;
  setCount: number;
  onSetCountChange: (value: number) => void;
  difficulty: number;
  onDifficultyChange: (value: number) => void;
  notes: string;
  onNotesChange: (value: string) => void;
}
```

**Step 2: 更新元件內容**

在表單中加入 TrackingModeSwitch，並根據模式顯示不同輸入欄位：

```tsx
export function WorkoutRecordForm({
  trackingMode,
  onTrackingModeChange,
  duration,
  onDurationChange,
  isBodyweight,
  onIsBodyweightChange,
  weight,
  onWeightChange,
  reps,
  onRepsChange,
  setCount,
  onSetCountChange,
  difficulty,
  onDifficultyChange,
  notes,
  onNotesChange,
}: WorkoutRecordFormProps) {
  return (
    <View style={styles.container}>
      {/* 追蹤模式切換 */}
      <View style={styles.section}>
        <Text style={styles.label}>記錄類型</Text>
        <TrackingModeSwitch value={trackingMode} onChange={onTrackingModeChange} />
      </View>

      {/* 根據模式顯示不同輸入 */}
      {trackingMode === "reps" ? (
        <>
          {/* 自體重量開關 */}
          <View style={styles.switchRow}>
            <Text style={styles.label}>自體重量</Text>
            <Switch value={isBodyweight} onValueChange={onIsBodyweightChange} />
          </View>

          {/* 重量輸入（非自體重量時顯示） */}
          {!isBodyweight && (
            <View style={styles.section}>
              <Text style={styles.label}>重量 (kg)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={onWeightChange}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
          )}

          {/* 次數輸入 */}
          <View style={styles.section}>
            <Text style={styles.label}>次數</Text>
            <TextInput
              style={styles.input}
              value={reps}
              onChangeText={onRepsChange}
              keyboardType="number-pad"
              placeholder="0"
            />
          </View>
        </>
      ) : (
        /* 時間模式 */
        <View style={styles.section}>
          <Text style={styles.label}>時間 (秒)</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={onDurationChange}
            keyboardType="number-pad"
            placeholder="0"
          />
        </View>
      )}

      {/* 組數（兩種模式都需要） */}
      <View style={styles.section}>
        <Text style={styles.label}>組數</Text>
        <SetCounter value={setCount} onChange={onSetCountChange} />
      </View>

      {/* 難易度（兩種模式都需要） */}
      <View style={styles.section}>
        <Text style={styles.label}>難易度</Text>
        <DifficultySelector value={difficulty} onChange={onDifficultyChange} />
      </View>

      {/* 備註（兩種模式都需要） */}
      <View style={styles.section}>
        <Text style={styles.label}>備註</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={onNotesChange}
          placeholder="選填"
          multiline
        />
      </View>
    </View>
  );
}
```

**Step 3: 執行型別檢查**

```bash
npm run typecheck
```

預期：會有錯誤（因為使用 WorkoutRecordForm 的地方還沒更新），這是預期的。

**Step 4: Commit**

```bash
git add src/components/WorkoutRecordForm.tsx
git commit -m "feat(ui): WorkoutRecordForm 支援時間型記錄輸入"
```

---

## Task 6: 更新新增訓練記錄頁面

**Files:**

- Modify: `app/workout/new.tsx`

**Step 1: 新增 trackingMode 和 duration 狀態**

在 `new.tsx` 元件中新增狀態：

```typescript
import { TrackingMode } from "../../src/utils/tracking";

// 在元件內部
const [trackingMode, setTrackingMode] = useState<TrackingMode>("reps");
const [duration, setDuration] = useState("");
```

**Step 2: 更新 WorkoutRecordForm 呼叫**

```tsx
<WorkoutRecordForm
  trackingMode={trackingMode}
  onTrackingModeChange={setTrackingMode}
  duration={duration}
  onDurationChange={setDuration}
  isBodyweight={isBodyweight}
  onIsBodyweightChange={setIsBodyweight}
  weight={weight}
  onWeightChange={setWeight}
  reps={reps}
  onRepsChange={setReps}
  setCount={setCount}
  onSetCountChange={setSetCount}
  difficulty={difficulty}
  onDifficultyChange={setDifficulty}
  notes={notes}
  onNotesChange={setNotes}
/>
```

**Step 3: 更新 createSession 呼叫**

找到儲存按鈕的 onPress handler，更新 createSession 呼叫：

```typescript
const handleSave = async () => {
  await createSession({
    exerciseId: selectedExerciseId!,
    date: new Date().toISOString().split("T")[0],
    weight: trackingMode === "reps" && !isBodyweight ? parseFloat(weight) : null,
    reps: trackingMode === "reps" ? parseInt(reps, 10) : null,
    setCount,
    difficulty,
    isBodyweight: trackingMode === "reps" && isBodyweight,
    notes: notes || null,
    duration: trackingMode === "time" ? parseInt(duration, 10) : null,
  });
  // ... 後續邏輯
};
```

**Step 4: 更新驗證邏輯**

更新儲存按鈕的 disabled 條件：

```typescript
const isValid = () => {
  if (!selectedExerciseId) return false;
  if (setCount < 1) return false;

  if (trackingMode === "reps") {
    if (!reps || parseInt(reps, 10) <= 0) return false;
    if (!isBodyweight && (!weight || parseFloat(weight) <= 0)) return false;
  } else {
    if (!duration || parseInt(duration, 10) <= 0) return false;
  }

  return true;
};
```

**Step 5: 執行型別檢查與 lint**

```bash
npm run typecheck && npm run lint
```

預期：應該通過

**Step 6: Commit**

```bash
git add "app/workout/new.tsx"
git commit -m "feat(ui): 新增訓練記錄頁面支援時間型記錄"
```

---

## Task 7: 更新歷史記錄顯示

**Files:**

- Modify: `app/(tabs)/history.tsx`
- Modify: `src/components/RecentRecordsList.tsx`

**Step 1: 更新 history.tsx 的記錄顯示**

找到顯示訓練記錄的地方，使用新的 formatSessionSummary 函數：

```typescript
import { formatSessionSummary } from "../../src/utils/tracking";

// 在 renderItem 或顯示記錄的地方
<Text style={styles.recordSummary}>
  {formatSessionSummary(session)}
</Text>
```

**Step 2: 更新 RecentRecordsList.tsx**

```typescript
import { formatSessionSummary } from "../utils/tracking";

// 更新 formatRecord 函數或直接使用 formatSessionSummary
const formatRecord = (record: WorkoutSession): string => {
  return formatSessionSummary(record);
};
```

**Step 3: 執行型別檢查與 lint**

```bash
npm run typecheck && npm run lint
```

**Step 4: Commit**

```bash
git add "app/(tabs)/history.tsx" src/components/RecentRecordsList.tsx
git commit -m "feat(ui): 歷史記錄頁面支援顯示時間型記錄"
```

---

## Task 8: 更新訓練記錄詳情頁

**Files:**

- Modify: `app/workout/[id].tsx`

**Step 1: 更新詳情頁的顯示邏輯**

使用 `getTrackingMode` 判斷記錄類型，顯示對應資訊：

```typescript
import { getTrackingMode, formatDuration, formatSessionSummary } from "../../src/utils/tracking";

// 在顯示區域
const trackingMode = getTrackingMode(session);

{trackingMode === "time" ? (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>時間</Text>
    <Text style={styles.detailValue}>{formatDuration(session.duration!)}</Text>
  </View>
) : (
  <>
    {!session.isBodyweight && (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>重量</Text>
        <Text style={styles.detailValue}>{session.weight} kg</Text>
      </View>
    )}
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>次數</Text>
      <Text style={styles.detailValue}>{session.reps} 下</Text>
    </View>
  </>
)}

<View style={styles.detailRow}>
  <Text style={styles.detailLabel}>組數</Text>
  <Text style={styles.detailValue}>{session.setCount} 組</Text>
</View>
```

**Step 2: 更新訓練量計算（僅次數型有訓練量）**

```typescript
// 訓練量只對次數型有意義
{trackingMode === "reps" && session.weight && (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>總訓練量</Text>
    <Text style={styles.detailValue}>
      {session.setCount! * session.reps! * session.weight!} kg
    </Text>
  </View>
)}
```

**Step 3: 執行型別檢查與 lint**

```bash
npm run typecheck && npm run lint
```

**Step 4: Commit**

```bash
git add "app/workout/[id].tsx"
git commit -m "feat(ui): 訓練記錄詳情頁支援顯示時間型記錄"
```

---

## Task 9: 最終驗證與整合測試

**Files:**

- All modified files

**Step 1: 執行完整檢查**

```bash
npm run typecheck && npm run lint && npm run format:check
```

**Step 2: 手動測試流程**

1. 啟動 app: `npm run start`
2. 新增一筆「次數型」記錄（如：臥推 50kg × 10下 × 3組）
3. 確認歷史記錄正確顯示
4. 新增一筆「時間型」記錄（如：平板支撐 60秒 × 3組）
5. 確認歷史記錄正確顯示
6. 確認詳情頁兩種類型都能正確顯示

**Step 3: 確認舊資料兼容**

確認之前的訓練記錄仍能正確顯示（duration 為 null = 次數型）

**Step 4: Final Commit（如有格式修正）**

```bash
git add -A
git commit -m "chore: 格式化與整理"
```

---

## 摘要

| Task | 說明                    | 預估複雜度 |
| ---- | ----------------------- | ---------- |
| 1    | 資料庫遷移              | 低         |
| 2    | TypeScript 型別         | 低         |
| 3    | useWorkoutSessions Hook | 中         |
| 4    | TrackingModeSwitch 元件 | 低         |
| 5    | WorkoutRecordForm 元件  | 中         |
| 6    | 新增記錄頁面            | 中         |
| 7    | 歷史記錄顯示            | 低         |
| 8    | 記錄詳情頁              | 低         |
| 9    | 最終驗證                | 低         |

**設計文件參考：** `docs/plans/2026-01-26-time-based-tracking-design.md`
