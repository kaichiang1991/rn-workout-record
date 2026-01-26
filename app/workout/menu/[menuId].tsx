import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTrainingMenus, MenuItemWithExercise } from "@/hooks/useTrainingMenus";
import { useMenuSession } from "@/hooks/useMenuSession";
import { useWorkoutSessions } from "@/hooks/useWorkoutSessions";
import { useExercises } from "@/hooks/useExercises";
import { WorkoutRecordForm } from "@/components/WorkoutRecordForm";
import { RecentRecordsList } from "@/components/RecentRecordsList";
import { ExercisePickerModal } from "@/components/ExercisePickerModal";
import { Icon } from "@/components/Icon";
import { TrackingMode, formatSessionSummary } from "@/utils/tracking";
import { formatExerciseWithGoal } from "@/utils/goals";
import { WorkoutSession, Exercise } from "@/db/client";

export default function MenuWorkoutScreen() {
  const router = useRouter();
  const { menuId: menuIdParam } = useLocalSearchParams<{ menuId: string }>();
  const menuId = parseInt(menuIdParam!, 10);

  const { menus, getMenuItems } = useTrainingMenus();
  const { createSession, getRecentByExerciseId, getSessionById } = useWorkoutSessions();
  const { exercises, exerciseBodyParts, getBodyPartsForExercise } = useExercises();
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
  const [currentExercise, setCurrentExercise] = useState<{ id: number; name: string } | null>(null);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [completedSessions, setCompletedSessions] = useState<Record<number, WorkoutSession[]>>({});
  // 追蹤本次訓練中替換的動作 (原 exerciseId -> 替換後的動作)
  const [swappedExercises, setSwappedExercises] = useState<
    Record<number, { id: number; name: string }>
  >({});

  // 表單狀態
  const [trackingMode, setTrackingMode] = useState<TrackingMode>("reps");
  const [isBodyweight, setIsBodyweight] = useState(false);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [duration, setDuration] = useState("");
  const [setCount, setSetCount] = useState(0);
  const [difficulty, setDifficulty] = useState(3);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [recentRecords, setRecentRecords] = useState<WorkoutSession[]>([]);

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
  }, [menuItems, getExerciseSessionIds, getSessionById]);

  useEffect(() => {
    if (!sessionLoading && menuItems.length > 0) {
      loadCompletedSessions();
    }
  }, [sessionLoading, menuItems, loadCompletedSessions]);

  const handleOpenRecord = async (item: MenuItemWithExercise) => {
    setSelectedExercise(item);
    // 如果之前有替換過，使用替換後的動作
    const swapped = swappedExercises[item.exerciseId];
    const exerciseToUse = swapped || { id: item.exerciseId, name: item.exerciseName };
    setCurrentExercise(exerciseToUse);
    // 載入最近 3 筆紀錄供參考（使用實際記錄的動作 ID）
    const records = await getRecentByExerciseId(exerciseToUse.id, 3);
    setRecentRecords(records);
    // 重置表單（不自動帶入預設值）
    setTrackingMode("reps");
    setIsBodyweight(false);
    setWeight("");
    setReps("");
    setDuration("");
    setSetCount(0);
    setDifficulty(3);
    setNotes("");
    setShowRecordModal(true);
  };

  const handleExerciseSwap = async (exercise: Exercise) => {
    setCurrentExercise({ id: exercise.id, name: exercise.name });
    // 載入新動作的最近紀錄
    const records = await getRecentByExerciseId(exercise.id, 3);
    setRecentRecords(records);
    // 重置表單
    setTrackingMode("reps");
    setIsBodyweight(false);
    setWeight("");
    setReps("");
    setDuration("");
    setSetCount(0);
  };

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

  const handleSaveRecord = async () => {
    if (!selectedExercise || !currentExercise) return;

    if (setCount < 1) {
      Alert.alert("提示", "請至少完成一組");
      return;
    }

    if (trackingMode === "reps") {
      if (!isBodyweight && (!weight || parseFloat(weight) <= 0)) {
        Alert.alert("提示", "請輸入重量");
        return;
      }

      if (!reps || parseInt(reps, 10) <= 0) {
        Alert.alert("提示", "請輸入次數");
        return;
      }
    } else {
      if (!duration || parseInt(duration, 10) <= 0) {
        Alert.alert("提示", "請輸入時間");
        return;
      }
    }

    setSaving(true);
    try {
      const session = await createSession({
        exerciseId: currentExercise.id,
        date: new Date().toISOString(),
        weight: trackingMode === "reps" && !isBodyweight ? parseFloat(weight) : null,
        reps: trackingMode === "reps" ? parseInt(reps, 10) : null,
        setCount,
        difficulty,
        isBodyweight: trackingMode === "reps" && isBodyweight,
        notes: notes.trim() || null,
        duration: trackingMode === "time" ? parseInt(duration, 10) : null,
      });
      // 使用原本菜單項目的 exerciseId 來標記完成
      await recordExercise(selectedExercise.exerciseId, session.id);

      // 更新已完成的 sessions（使用原本的 exerciseId）
      setCompletedSessions((prev) => ({
        ...prev,
        [selectedExercise.exerciseId]: [...(prev[selectedExercise.exerciseId] || []), session],
      }));

      // 如果有替換動作，記錄下來供列表顯示
      if (currentExercise.id !== selectedExercise.exerciseId) {
        setSwappedExercises((prev) => ({
          ...prev,
          [selectedExercise.exerciseId]: currentExercise,
        }));
      }

      setShowRecordModal(false);
      setSelectedExercise(null);
      setCurrentExercise(null);
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
    return formatSessionSummary(session);
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
              // 檢查是否有替換動作
              const swapped = swappedExercises[item.exerciseId];
              const displayName = swapped ? swapped.name : item.exerciseName;

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

                    {/* 項目名稱 - 顯示替換後的名稱（如果有替換） */}
                    <Text
                      className={`flex-1 text-base ${
                        isCompleted ? "text-gray-500" : "text-gray-800 font-medium"
                      }`}
                    >
                      {displayName}
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
          {/* Modal Header - 顯示菜單名稱與描述 */}
          <View className="bg-white border-b border-gray-200 px-4 pt-4 pb-3">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={() => setShowRecordModal(false)}>
                <Text className="text-gray-600 text-base">取消</Text>
              </TouchableOpacity>
              <View className="items-center flex-1 mx-4">
                <Text className="text-lg font-bold text-gray-800">{menu?.name}</Text>
                {menu?.description && (
                  <Text className="text-sm text-gray-500 mt-1">{menu.description}</Text>
                )}
              </View>
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
          </View>

          {/* 表單 */}
          <ScrollView className="flex-1 p-4">
            {/* 動作名稱區塊（含目標） */}
            <View className="bg-white rounded-xl px-4 py-3 mb-3 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-800">
                {selectedExercise && currentExercise
                  ? formatExerciseWithGoal(currentExercise.name, selectedExercise)
                  : currentExercise?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowExercisePicker(true)} className="p-2">
                <Icon name="swap" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* 最近紀錄 */}
            <RecentRecordsList records={recentRecords} onSelect={handleSelectRecentRecord} />

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
          </ScrollView>

          {/* 動作選擇 Modal - 放在記錄 Modal 內部以支援嵌套 */}
          <ExercisePickerModal
            visible={showExercisePicker}
            onClose={() => setShowExercisePicker(false)}
            onSelect={handleExerciseSwap}
            exercises={exercises}
            exerciseBodyParts={exerciseBodyParts}
            currentExerciseBodyParts={
              currentExercise ? getBodyPartsForExercise(currentExercise.id) : []
            }
          />
        </View>
      </Modal>
    </View>
  );
}
