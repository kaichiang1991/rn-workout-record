# 運動項目歷史紀錄快速帶入 - 實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 選擇運動項目後顯示近三次紀錄，點選可快速帶入重量和次數

**Architecture:** 新增 hook 方法查詢特定項目歷史紀錄，建立獨立元件顯示紀錄列表，整合至新增紀錄頁面

**Tech Stack:** React Native, Expo SQLite, NativeWind (TailwindCSS)

---

## Task 1: 新增查詢特定項目歷史紀錄的 Hook 方法

**Files:**

- Modify: `src/hooks/useWorkoutSessions.ts:58-65`

**Step 1: 在 useWorkoutSessions hook 中新增 getRecentByExerciseId 方法**

在 `getSessionById` 方法後面新增：

```typescript
const getRecentByExerciseId = useCallback(
  async (exerciseId: number, limit: number = 3): Promise<WorkoutSession[]> => {
    const db = await getDatabase();
    const results = await db.getAllAsync<WorkoutSession>(
      "SELECT * FROM workout_sessions WHERE exerciseId = ? ORDER BY date DESC, createdAt DESC LIMIT ?",
      [exerciseId, limit]
    );
    return results;
  },
  []
);
```

**Step 2: 在 return 物件中加入新方法**

修改 return 區塊（約第 111-119 行）：

```typescript
return {
  sessions,
  loading,
  error,
  refresh: fetchSessions,
  getSessionById,
  getRecentByExerciseId,
  createSession,
  deleteSession,
};
```

**Step 3: 執行 TypeScript 型別檢查**

Run: `npm run typecheck`
Expected: 無錯誤

**Step 4: Commit**

```bash
git add src/hooks/useWorkoutSessions.ts
git commit -m "feat: 新增 getRecentByExerciseId 方法查詢特定項目歷史紀錄"
```

---

## Task 2: 建立 RecentRecordsList 元件

**Files:**

- Create: `src/components/RecentRecordsList.tsx`

**Step 1: 建立元件檔案**

```tsx
import { View, Text, TouchableOpacity } from "react-native";
import { WorkoutSession } from "@/db/client";
import { DIFFICULTY_LEVELS } from "@/utils/constants";

interface RecentRecordsListProps {
  records: WorkoutSession[];
  onSelect: (record: WorkoutSession) => void;
}

export function RecentRecordsList({ records, onSelect }: RecentRecordsListProps) {
  if (records.length === 0) {
    return null;
  }

  const formatRecord = (record: WorkoutSession): string => {
    const parts: string[] = [];

    // 重量（自體重量則省略）
    if (!record.isBodyweight && record.weight) {
      parts.push(`${record.weight}kg`);
    }

    // 次數
    if (record.reps) {
      parts.push(`${record.reps}下`);
    }

    // 組數
    if (record.setCount) {
      parts.push(`${record.setCount}組`);
    }

    return parts.join(" × ");
  };

  const getDifficultyColor = (difficulty: number | null): string => {
    if (!difficulty) return "#9ca3af";
    const level = DIFFICULTY_LEVELS.find((l) => l.value === difficulty);
    return level?.color || "#9ca3af";
  };

  return (
    <View className="mt-3 bg-white rounded-xl p-4">
      <Text className="text-sm text-gray-500 mb-3">最近紀錄（點選帶入）</Text>
      {records.map((record) => (
        <TouchableOpacity
          key={record.id}
          className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
          onPress={() => onSelect(record)}
          activeOpacity={0.6}
        >
          <Text className="text-gray-700 text-base">{formatRecord(record)}</Text>
          <View
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: getDifficultyColor(record.difficulty) }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

**Step 2: 執行 TypeScript 型別檢查和 Lint**

Run: `npm run typecheck && npm run lint`
Expected: 無錯誤

**Step 3: Commit**

```bash
git add src/components/RecentRecordsList.tsx
git commit -m "feat: 新增 RecentRecordsList 元件顯示歷史紀錄"
```

---

## Task 3: 整合 RecentRecordsList 到新增紀錄頁面

**Files:**

- Modify: `app/workout/new.tsx`

**Step 1: 新增 import 和 state**

在檔案頂部新增 import：

```tsx
import { RecentRecordsList } from "@/components/RecentRecordsList";
import { WorkoutSession } from "@/db/client";
```

**Step 2: 從 useWorkoutSessions 取得新方法並新增 state**

修改 useWorkoutSessions 解構和新增 state：

```tsx
const { createSession, getRecentByExerciseId } = useWorkoutSessions();

const [recentRecords, setRecentRecords] = useState<WorkoutSession[]>([]);
```

**Step 3: 新增載入歷史紀錄的 effect**

在 `handleBodyPartChange` 函數後新增：

```tsx
useEffect(() => {
  const loadRecentRecords = async () => {
    if (selectedExerciseId) {
      const records = await getRecentByExerciseId(selectedExerciseId);
      setRecentRecords(records);
    } else {
      setRecentRecords([]);
    }
  };
  loadRecentRecords();
}, [selectedExerciseId, getRecentByExerciseId]);
```

**Step 4: 新增選擇歷史紀錄的處理函數**

在 `handleSave` 函數前新增：

```tsx
const handleSelectRecentRecord = (record: WorkoutSession) => {
  // 帶入重量設定
  if (record.isBodyweight) {
    setIsBodyweight(true);
    setWeight("");
  } else {
    setIsBodyweight(false);
    setWeight(record.weight?.toString() || "");
  }

  // 帶入次數
  setReps(record.reps?.toString() || "");

  // 組數歸零
  setSetCount(0);
};
```

**Step 5: 在 UI 中加入 RecentRecordsList**

在「運動項目選擇」區塊的 `</View>` 結束標籤前（約第 112 行），加入：

```tsx
{
  selectedExerciseId && recentRecords.length > 0 && (
    <RecentRecordsList records={recentRecords} onSelect={handleSelectRecentRecord} />
  );
}
```

**Step 6: 執行 TypeScript 型別檢查和 Lint**

Run: `npm run typecheck && npm run lint`
Expected: 無錯誤

**Step 7: Commit**

```bash
git add app/workout/new.tsx
git commit -m "feat: 整合歷史紀錄快速帶入功能到新增紀錄頁面"
```

---

## Task 4: 手動測試驗證

**Step 1: 啟動開發伺服器**

Run: `npm run start`

**Step 2: 測試檢查清單**

- [ ] 選擇一個有歷史紀錄的運動項目，確認顯示最近紀錄
- [ ] 選擇一個沒有歷史紀錄的項目，確認不顯示紀錄區塊
- [ ] 點選一筆紀錄，確認重量和次數正確帶入
- [ ] 確認組數歸零
- [ ] 確認難易度沒有被改變
- [ ] 測試自體重量紀錄的帶入
- [ ] 切換不同項目，確認紀錄正確更新

**Step 3: 最終 Commit（如有修正）**

```bash
git add -A
git commit -m "fix: 修正歷史紀錄功能問題"
```

---

## 檔案變更摘要

| 檔案                                   | 變更類型 | 說明                              |
| -------------------------------------- | -------- | --------------------------------- |
| `src/hooks/useWorkoutSessions.ts`      | 修改     | 新增 `getRecentByExerciseId` 方法 |
| `src/components/RecentRecordsList.tsx` | 新增     | 歷史紀錄列表元件                  |
| `app/workout/new.tsx`                  | 修改     | 整合歷史紀錄功能                  |
