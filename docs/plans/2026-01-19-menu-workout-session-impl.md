# 菜單訓練功能實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 讓用戶可以從訓練菜單開始訓練，依清單完成每個項目並追蹤進度

**Architecture:** 抽取 WorkoutRecordForm 元件供兩個頁面共用，新增 useMenuSession hook 管理訓練進度（AsyncStorage），建立菜單訓練頁面處理清單總覽和 Bottom Sheet 記錄

**Tech Stack:** React Native, Expo Router, AsyncStorage, NativeWind

---

## Task 1: 抽取 WorkoutRecordForm 元件

**Files:**

- Create: `src/components/WorkoutRecordForm.tsx`

**Step 1: 建立 WorkoutRecordForm 元件**

從 `app/workout/new.tsx` 抽取重量、次數、組數、難易度、備註的輸入區塊：

```tsx
import { View, Text, TextInput, Switch } from "react-native";
import { SetCounter } from "./SetCounter";
import { DifficultySelector } from "./DifficultySelector";

interface WorkoutRecordFormProps {
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

export function WorkoutRecordForm({
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
    <View>
      {/* 重量設定 */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-gray-700 mb-3">重量</Text>
        <View className="bg-white rounded-xl p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-700">自體重量</Text>
            <Switch value={isBodyweight} onValueChange={onIsBodyweightChange} />
          </View>
          {!isBodyweight && (
            <View className="flex-row items-center">
              <TextInput
                className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-lg"
                placeholder="0"
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={onWeightChange}
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
              onChangeText={onRepsChange}
            />
            <Text className="text-gray-600 text-lg ml-3">下</Text>
          </View>
        </View>
      </View>

      {/* 組數計數器 */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-gray-700 mb-3">完成組數</Text>
        <View className="bg-white rounded-xl p-6 items-center">
          <SetCounter value={setCount} onChange={onSetCountChange} />
        </View>
      </View>

      {/* 難易度選擇 */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-gray-700 mb-3">今天難易度</Text>
        <DifficultySelector value={difficulty} onChange={onDifficultyChange} />
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
          onChangeText={onNotesChange}
        />
      </View>
    </View>
  );
}
```

**Step 2: 執行類型檢查**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/WorkoutRecordForm.tsx
git commit -m "feat: 新增 WorkoutRecordForm 元件"
```

---

## Task 2: 重構 workout/new.tsx 使用新元件

**Files:**

- Modify: `app/workout/new.tsx`

**Step 1: 匯入並使用 WorkoutRecordForm**

將 `app/workout/new.tsx` 中的表單區塊替換為 WorkoutRecordForm 元件：

```tsx
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useExercises } from "@/hooks/useExercises";
import { useWorkoutSessions } from "@/hooks/useWorkoutSessions";
import { BodyPartSelector } from "@/components/BodyPartSelector";
import { RecentRecordsList } from "@/components/RecentRecordsList";
import { WorkoutRecordForm } from "@/components/WorkoutRecordForm";
import { BodyPartKey } from "@/utils/constants";
import { WorkoutSession } from "@/db/client";

export default function NewWorkoutScreen() {
  const router = useRouter();
  const { filteredExercises, selectedBodyPart, setSelectedBodyPart } = useExercises();
  const { createSession, getRecentByExerciseId } = useWorkoutSessions();

  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [recentRecords, setRecentRecords] = useState<WorkoutSession[]>([]);
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

  const handleSelectRecentRecord = (record: WorkoutSession) => {
    if (record.isBodyweight) {
      setIsBodyweight(true);
      setWeight("");
    } else {
      setIsBodyweight(false);
      setWeight(record.weight?.toString() || "");
    }
    setReps(record.reps?.toString() || "");
    setSetCount(0);
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
        date: new Date().toISOString().split("T")[0],
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
          {selectedExerciseId && recentRecords.length > 0 && (
            <RecentRecordsList records={recentRecords} onSelect={handleSelectRecentRecord} />
          )}
        </View>

        {/* 記錄表單 */}
        <WorkoutRecordForm
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

**Step 2: 執行類型檢查**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/workout/new.tsx
git commit -m "refactor: workout/new 使用 WorkoutRecordForm 元件"
```

---

## Task 3: 建立 useMenuSession hook

**Files:**

- Create: `src/hooks/useMenuSession.ts`

**Step 1: 建立進度管理 hook**

```tsx
import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_PREFIX = "menu_session_";

interface SessionRecord {
  exerciseId: number;
  sessionIds: number[];
}

interface MenuSessionProgress {
  menuId: number;
  startedAt: string;
  records: SessionRecord[];
}

interface UseMenuSessionOptions {
  menuId: number;
}

export function useMenuSession({ menuId }: UseMenuSessionOptions) {
  const [progress, setProgress] = useState<MenuSessionProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const storageKey = `${STORAGE_KEY_PREFIX}${menuId}`;

  // 載入進度
  const loadProgress = useCallback(async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        setProgress(JSON.parse(stored));
      } else {
        setProgress(null);
      }
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // 開始新訓練
  const startSession = useCallback(async () => {
    const newProgress: MenuSessionProgress = {
      menuId,
      startedAt: new Date().toISOString(),
      records: [],
    };
    await AsyncStorage.setItem(storageKey, JSON.stringify(newProgress));
    setProgress(newProgress);
    return newProgress;
  }, [menuId, storageKey]);

  // 記錄完成的項目
  const recordExercise = useCallback(
    async (exerciseId: number, sessionId: number) => {
      if (!progress) return;

      const existingRecord = progress.records.find((r) => r.exerciseId === exerciseId);
      let updatedRecords: SessionRecord[];

      if (existingRecord) {
        updatedRecords = progress.records.map((r) =>
          r.exerciseId === exerciseId ? { ...r, sessionIds: [...r.sessionIds, sessionId] } : r
        );
      } else {
        updatedRecords = [...progress.records, { exerciseId, sessionIds: [sessionId] }];
      }

      const updatedProgress: MenuSessionProgress = {
        ...progress,
        records: updatedRecords,
      };

      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedProgress));
      setProgress(updatedProgress);
    },
    [progress, storageKey]
  );

  // 檢查項目是否已完成
  const isExerciseCompleted = useCallback(
    (exerciseId: number): boolean => {
      if (!progress) return false;
      return progress.records.some((r) => r.exerciseId === exerciseId);
    },
    [progress]
  );

  // 取得項目的 session IDs
  const getExerciseSessionIds = useCallback(
    (exerciseId: number): number[] => {
      if (!progress) return [];
      const record = progress.records.find((r) => r.exerciseId === exerciseId);
      return record?.sessionIds || [];
    },
    [progress]
  );

  // 清除進度
  const clearProgress = useCallback(async () => {
    await AsyncStorage.removeItem(storageKey);
    setProgress(null);
  }, [storageKey]);

  // 取得完成數量
  const completedCount = progress?.records.length || 0;

  // 取得開始時間
  const startedAt = progress?.startedAt || null;

  // 是否有進行中的訓練
  const hasActiveSession = progress !== null;

  return {
    loading,
    progress,
    hasActiveSession,
    completedCount,
    startedAt,
    startSession,
    recordExercise,
    isExerciseCompleted,
    getExerciseSessionIds,
    clearProgress,
    refresh: loadProgress,
  };
}
```

**Step 2: 執行類型檢查**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/hooks/useMenuSession.ts
git commit -m "feat: 新增 useMenuSession hook 管理訓練進度"
```

---

## Task 4: 建立菜單訓練頁面

**Files:**

- Create: `app/workout/menu/[menuId].tsx`

**Step 1: 建立頁面基本結構**

```tsx
import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTrainingMenus, MenuItemWithExercise } from "@/hooks/useTrainingMenus";
import { useMenuSession } from "@/hooks/useMenuSession";
import { useWorkoutSessions } from "@/hooks/useWorkoutSessions";
import { WorkoutRecordForm } from "@/components/WorkoutRecordForm";
import { Icon } from "@/components/Icon";
import { WorkoutSession } from "@/db/client";

export default function MenuWorkoutScreen() {
  const router = useRouter();
  const { menuId: menuIdParam } = useLocalSearchParams<{ menuId: string }>();
  const menuId = parseInt(menuIdParam!, 10);

  const { menus, getMenuItems } = useTrainingMenus();
  const { createSession, getRecentByExerciseId } = useWorkoutSessions();
  const {
    loading: sessionLoading,
    hasActiveSession,
    completedCount,
    startedAt,
    startSession,
    recordExercise,
    isExerciseCompleted,
    getExerciseSessionIds,
    clearProgress,
  } = useMenuSession({ menuId });

  const [menuItems, setMenuItems] = useState<MenuItemWithExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<MenuItemWithExercise | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [completedSessions, setCompletedSessions] = useState<Record<number, WorkoutSession[]>>({});

  // 表單狀態
  const [isBodyweight, setIsBodyweight] = useState(false);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [setCount, setSetCount] = useState(0);
  const [difficulty, setDifficulty] = useState(3);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const menu = menus.find((m) => m.id === menuId);

  // 載入菜單項目
  const loadMenuItems = useCallback(async () => {
    try {
      setLoading(true);
      const items = await getMenuItems(menuId);
      setMenuItems(items);
    } finally {
      setLoading(false);
    }
  }, [menuId, getMenuItems]);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  // 初始化或繼續訓練
  useEffect(() => {
    if (!sessionLoading && !hasActiveSession && menuItems.length > 0) {
      startSession();
    }
  }, [sessionLoading, hasActiveSession, menuItems.length, startSession]);

  // 載入已完成的 sessions
  const loadCompletedSessions = useCallback(async () => {
    const sessions: Record<number, WorkoutSession[]> = {};
    for (const item of menuItems) {
      const sessionIds = getExerciseSessionIds(item.exerciseId);
      if (sessionIds.length > 0) {
        const { getSessionById } = useWorkoutSessions();
        const itemSessions: WorkoutSession[] = [];
        for (const id of sessionIds) {
          const session = await getSessionById(id);
          if (session) {
            itemSessions.push(session);
          }
        }
        sessions[item.exerciseId] = itemSessions;
      }
    }
    setCompletedSessions(sessions);
  }, [menuItems, getExerciseSessionIds]);

  useEffect(() => {
    if (!sessionLoading && menuItems.length > 0) {
      loadCompletedSessions();
    }
  }, [sessionLoading, menuItems, loadCompletedSessions]);

  const handleOpenRecord = async (item: MenuItemWithExercise) => {
    setSelectedExercise(item);
    // 載入最近紀錄來預填
    const recentRecords = await getRecentByExerciseId(item.exerciseId, 1);
    if (recentRecords.length > 0) {
      const recent = recentRecords[0];
      setIsBodyweight(Boolean(recent.isBodyweight));
      setWeight(recent.weight?.toString() || "");
      setReps(recent.reps?.toString() || "");
    } else {
      setIsBodyweight(false);
      setWeight("");
      setReps("");
    }
    setSetCount(0);
    setDifficulty(3);
    setNotes("");
    setShowRecordModal(true);
  };

  const handleSaveRecord = async () => {
    if (!selectedExercise) return;

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
      const session = await createSession({
        exerciseId: selectedExercise.exerciseId,
        date: new Date().toISOString().split("T")[0],
        weight: isBodyweight ? null : parseFloat(weight),
        reps: parseInt(reps, 10),
        setCount,
        difficulty,
        isBodyweight,
        notes: notes.trim() || null,
      });
      await recordExercise(selectedExercise.exerciseId, session.id);

      // 更新已完成的 sessions
      setCompletedSessions((prev) => ({
        ...prev,
        [selectedExercise.exerciseId]: [...(prev[selectedExercise.exerciseId] || []), session],
      }));

      setShowRecordModal(false);
      setSelectedExercise(null);
    } catch {
      Alert.alert("錯誤", "儲存失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = (exerciseId: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  const handleBack = () => {
    if (completedCount > 0 && completedCount < menuItems.length) {
      Alert.alert("離開訓練", "要保留目前的進度嗎？", [
        {
          text: "保留進度",
          onPress: () => router.back(),
        },
        {
          text: "不保留",
          style: "destructive",
          onPress: async () => {
            await clearProgress();
            router.back();
          },
        },
        { text: "取消", style: "cancel" },
      ]);
    } else {
      router.back();
    }
  };

  const handleFinish = () => {
    router.replace({
      pathname: "/workout/menu/summary",
      params: {
        menuId: menuId.toString(),
        startedAt: startedAt || "",
        completedCount: completedCount.toString(),
        totalCount: menuItems.length.toString(),
      },
    });
  };

  const formatSessionRecord = (session: WorkoutSession): string => {
    const parts: string[] = [];
    if (!session.isBodyweight && session.weight) {
      parts.push(`${session.weight}kg`);
    }
    if (session.reps) {
      parts.push(`${session.reps}下`);
    }
    if (session.setCount) {
      parts.push(`${session.setCount}組`);
    }
    return parts.join(" × ");
  };

  if (!menu) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">找不到菜單</Text>
      </View>
    );
  }

  const progressPercent = menuItems.length > 0 ? (completedCount / menuItems.length) * 100 : 0;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pt-12 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={handleBack} className="mr-3">
            <Icon name="arrow-left" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800 flex-1">{menu.name}</Text>
        </View>
      </View>

      {/* 進度列 */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <Text className="text-sm text-gray-600 mb-2">
          進度：{completedCount}/{menuItems.length} 完成
        </Text>
        <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <View
            className="h-full bg-primary-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </View>
      </View>

      {/* 項目清單 */}
      <ScrollView className="flex-1">
        <View className="p-4">
          {loading ? (
            <Text className="text-gray-500 text-center">載入中...</Text>
          ) : (
            menuItems.map((item) => {
              const isCompleted = isExerciseCompleted(item.exerciseId);
              const isExpanded = expandedItems.has(item.exerciseId);
              const sessions = completedSessions[item.exerciseId] || [];

              return (
                <View key={item.id} className="bg-white rounded-xl mb-3 overflow-hidden">
                  <TouchableOpacity
                    className="flex-row items-center p-4"
                    onPress={() => {
                      if (isCompleted) {
                        toggleExpand(item.exerciseId);
                      } else {
                        handleOpenRecord(item);
                      }
                    }}
                  >
                    {/* 完成狀態 */}
                    <View
                      className={`w-6 h-6 rounded-full mr-3 items-center justify-center ${
                        isCompleted ? "bg-green-500" : "border-2 border-gray-300"
                      }`}
                    >
                      {isCompleted && <Icon name="check" size={14} color="#fff" />}
                    </View>

                    {/* 項目名稱 */}
                    <Text
                      className={`flex-1 text-base ${
                        isCompleted ? "text-gray-500" : "text-gray-800 font-medium"
                      }`}
                    >
                      {item.exerciseName}
                    </Text>

                    {/* 操作按鈕 */}
                    {isCompleted ? (
                      <Icon
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#9ca3af"
                      />
                    ) : (
                      <View className="bg-primary-100 rounded-full px-3 py-1">
                        <Text className="text-primary-600 text-sm font-medium">記錄</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* 展開的記錄詳情 */}
                  {isCompleted && isExpanded && sessions.length > 0 && (
                    <View className="px-4 pb-4 pt-0">
                      <View className="border-t border-gray-100 pt-3">
                        {sessions.map((session) => (
                          <Text key={session.id} className="text-gray-600 text-sm mb-1">
                            {formatSessionRecord(session)}
                          </Text>
                        ))}
                        <TouchableOpacity className="mt-2" onPress={() => handleOpenRecord(item)}>
                          <Text className="text-primary-500 text-sm">+ 再記一筆</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* 完成按鈕 */}
      {completedCount === menuItems.length && menuItems.length > 0 && (
        <View className="p-4 bg-white border-t border-gray-200">
          <TouchableOpacity
            className="bg-green-500 rounded-xl p-4 items-center"
            onPress={handleFinish}
          >
            <Text className="text-white text-lg font-semibold">完成訓練</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 記錄 Modal */}
      <Modal
        visible={showRecordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRecordModal(false)}
      >
        <View className="flex-1 bg-gray-50">
          {/* Modal Header */}
          <View className="bg-white border-b border-gray-200 px-4 pt-4 pb-3 flex-row items-center justify-between">
            <TouchableOpacity onPress={() => setShowRecordModal(false)}>
              <Text className="text-gray-600 text-base">取消</Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-800">
              {selectedExercise?.exerciseName}
            </Text>
            <TouchableOpacity onPress={handleSaveRecord} disabled={saving}>
              <Text
                className={`text-base font-semibold ${
                  saving ? "text-gray-400" : "text-primary-500"
                }`}
              >
                {saving ? "儲存中..." : "儲存"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 表單 */}
          <ScrollView className="flex-1 p-4">
            <WorkoutRecordForm
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
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
```

**Step 2: 執行類型檢查**

Run: `npm run typecheck`
Expected: 可能會有錯誤需要修正（例如 getSessionById 的使用方式）

**Step 3: 修正問題並 Commit**

```bash
git add app/workout/menu/[menuId].tsx
git commit -m "feat: 新增菜單訓練頁面"
```

---

## Task 5: 建立訓練摘要頁面

**Files:**

- Create: `app/workout/menu/summary.tsx`

**Step 1: 建立摘要頁面**

```tsx
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { useTrainingMenus } from "@/hooks/useTrainingMenus";
import { useMenuSession } from "@/hooks/useMenuSession";
import { useWorkoutSessions } from "@/hooks/useWorkoutSessions";
import { Icon } from "@/components/Icon";
import { WorkoutSession } from "@/db/client";

export default function WorkoutSummaryScreen() {
  const router = useRouter();
  const { menuId, startedAt, completedCount, totalCount } = useLocalSearchParams<{
    menuId: string;
    startedAt: string;
    completedCount: string;
    totalCount: string;
  }>();

  const menuIdNum = parseInt(menuId!, 10);
  const { menus, getMenuItems } = useTrainingMenus();
  const { getExerciseSessionIds, clearProgress } = useMenuSession({ menuId: menuIdNum });
  const { getSessionById } = useWorkoutSessions();

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  const menu = menus.find((m) => m.id === menuIdNum);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const items = await getMenuItems(menuIdNum);
        const allSessions: WorkoutSession[] = [];

        for (const item of items) {
          const sessionIds = getExerciseSessionIds(item.exerciseId);
          for (const id of sessionIds) {
            const session = await getSessionById(id);
            if (session) {
              allSessions.push(session);
            }
          }
        }

        setSessions(allSessions);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [menuIdNum, getMenuItems, getExerciseSessionIds, getSessionById]);

  const handleFinish = async () => {
    await clearProgress();
    router.replace("/(tabs)");
  };

  // 計算統計資料
  const totalSets = sessions.reduce((sum, s) => sum + (s.setCount || 0), 0);
  const totalReps = sessions.reduce((sum, s) => sum + (s.reps || 0) * (s.setCount || 0), 0);

  // 計算訓練時長
  const calculateDuration = (): string => {
    if (!startedAt) return "--";
    const start = new Date(startedAt);
    const end = new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return `${diffMins} 分鐘`;
    }
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours} 小時 ${mins} 分鐘`;
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* 完成標題 */}
        <View className="items-center py-8">
          <View className="w-20 h-20 rounded-full bg-green-500 items-center justify-center mb-4">
            <Icon name="check" size={40} color="#fff" />
          </View>
          <Text className="text-2xl font-bold text-gray-800">訓練完成！</Text>
          {menu && <Text className="text-gray-500 mt-1">{menu.name}</Text>}
        </View>

        {/* 統計卡片 */}
        <View className="bg-white rounded-xl p-4 mb-4">
          <Text className="text-lg font-bold text-gray-800 mb-4">本次訓練統計</Text>

          <View className="flex-row mb-4">
            <View className="flex-1 items-center">
              <Text className="text-3xl font-bold text-primary-500">{completedCount}</Text>
              <Text className="text-gray-500 text-sm">完成項目</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-3xl font-bold text-primary-500">{totalSets}</Text>
              <Text className="text-gray-500 text-sm">總組數</Text>
            </View>
          </View>

          <View className="flex-row">
            <View className="flex-1 items-center">
              <Text className="text-3xl font-bold text-primary-500">{calculateDuration()}</Text>
              <Text className="text-gray-500 text-sm">訓練時長</Text>
            </View>
            <View className="flex-1 items-center">
              <Text className="text-3xl font-bold text-primary-500">{totalReps}</Text>
              <Text className="text-gray-500 text-sm">總次數</Text>
            </View>
          </View>
        </View>

        {/* 訓練明細 */}
        {!loading && sessions.length > 0 && (
          <View className="bg-white rounded-xl p-4 mb-4">
            <Text className="text-lg font-bold text-gray-800 mb-3">訓練明細</Text>
            {sessions.map((session) => (
              <View
                key={session.id}
                className="flex-row justify-between py-2 border-b border-gray-100 last:border-b-0"
              >
                <Text className="text-gray-700">
                  {session.isBodyweight ? "自體重量" : `${session.weight}kg`} × {session.reps}下
                </Text>
                <Text className="text-gray-500">{session.setCount}組</Text>
              </View>
            ))}
          </View>
        )}

        {/* 返回按鈕 */}
        <TouchableOpacity
          className="bg-primary-500 rounded-xl p-4 items-center"
          onPress={handleFinish}
        >
          <Text className="text-white text-lg font-semibold">返回首頁</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
```

**Step 2: 執行類型檢查**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/workout/menu/summary.tsx
git commit -m "feat: 新增訓練摘要頁面"
```

---

## Task 6: 修改菜單列表頁面

**Files:**

- Modify: `app/(tabs)/menus.tsx`

**Step 1: 加入「開始訓練」按鈕**

```tsx
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import { useTrainingMenus } from "@/hooks/useTrainingMenus";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface MenuProgress {
  menuId: number;
  completedCount: number;
  totalCount: number;
}

export default function MenusScreen() {
  const router = useRouter();
  const { menus, loading, refresh, getMenuItemCount } = useTrainingMenus();
  const [refreshing, setRefreshing] = useState(false);
  const [menuCounts, setMenuCounts] = useState<Record<number, number>>({});
  const [menuProgress, setMenuProgress] = useState<Record<number, MenuProgress>>({});

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // 取得每個菜單的項目數量
  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<number, number> = {};
      for (const menu of menus) {
        counts[menu.id] = await getMenuItemCount(menu.id);
      }
      setMenuCounts(counts);
    };
    fetchCounts();
  }, [menus, getMenuItemCount]);

  // 檢查菜單進度
  useEffect(() => {
    const checkProgress = async () => {
      const progress: Record<number, MenuProgress> = {};
      for (const menu of menus) {
        const stored = await AsyncStorage.getItem(`menu_session_${menu.id}`);
        if (stored) {
          const data = JSON.parse(stored);
          const totalCount = menuCounts[menu.id] || 0;
          progress[menu.id] = {
            menuId: menu.id,
            completedCount: data.records?.length || 0,
            totalCount,
          };
        }
      }
      setMenuProgress(progress);
    };
    if (Object.keys(menuCounts).length > 0) {
      checkProgress();
    }
  }, [menus, menuCounts]);

  const handleStartWorkout = (menuId: number) => {
    router.push(`/workout/menu/${menuId}`);
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
        ) : menus.length === 0 ? (
          <View className="bg-white rounded-xl p-6">
            <Text className="text-gray-500 text-center">還沒有訓練菜單</Text>
            <Text className="text-gray-400 text-center text-sm mt-1">
              建立你的專屬訓練菜單，規劃每天的訓練內容！
            </Text>
          </View>
        ) : (
          menus.map((menu) => {
            const itemCount = menuCounts[menu.id] ?? 0;
            const progress = menuProgress[menu.id];
            const hasProgress = progress && progress.completedCount > 0;

            return (
              <View key={menu.id} className="bg-white rounded-xl p-4 mb-3 shadow-sm">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-800">{menu.name}</Text>
                    {menu.description && (
                      <Text className="text-gray-500 text-sm mt-1" numberOfLines={1}>
                        {menu.description}
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
                    onPress={() => router.push(`/menu/${menu.id}`)}
                  >
                    <Text className="text-gray-700 font-medium">編輯</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 bg-primary-500 rounded-lg py-2 items-center"
                    onPress={() => handleStartWorkout(menu.id)}
                    disabled={itemCount === 0}
                  >
                    <Text className="text-white font-medium">
                      {hasProgress
                        ? `繼續 (${progress.completedCount}/${progress.totalCount})`
                        : "開始訓練"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
```

**Step 2: 執行類型檢查**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/\(tabs\)/menus.tsx
git commit -m "feat: 菜單列表頁面加入開始訓練按鈕"
```

---

## Task 7: 最終檢查與整合測試

**Step 1: 執行完整檢查**

```bash
npm run typecheck
npm run lint
npm run format:check
```

Expected: 全部 PASS

**Step 2: 手動測試流程**

1. 進入菜單列表，確認「開始訓練」按鈕顯示
2. 點擊「開始訓練」進入訓練頁面
3. 記錄一個項目，確認狀態更新
4. 中途離開，確認詢問是否保留進度
5. 重新進入，確認進度恢復
6. 完成所有項目，確認摘要頁面顯示

**Step 3: 最終 Commit**

如果有需要修正的問題：

```bash
git add -A
git commit -m "fix: 修正菜單訓練功能問題"
```
