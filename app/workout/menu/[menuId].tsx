import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTrainingMenus, MenuItemWithExercise } from "@/hooks/useTrainingMenus";
import { useMenuSession } from "@/hooks/useMenuSession";
import { useWorkoutSessions } from "@/hooks/useWorkoutSessions";
import { WorkoutRecordForm } from "@/components/WorkoutRecordForm";
import { RecentRecordsList } from "@/components/RecentRecordsList";
import { Icon } from "@/components/Icon";
import { WorkoutSession } from "@/db/client";

export default function MenuWorkoutScreen() {
  const router = useRouter();
  const { menuId: menuIdParam } = useLocalSearchParams<{ menuId: string }>();
  const menuId = parseInt(menuIdParam!, 10);

  const { menus, getMenuItems } = useTrainingMenus();
  const { createSession, getRecentByExerciseId, getSessionById } = useWorkoutSessions();
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
    // 載入最近 3 筆紀錄
    const records = await getRecentByExerciseId(item.exerciseId, 3);
    setRecentRecords(records);
    // 預填最近一筆
    if (records.length > 0) {
      const recent = records[0];
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
        date: new Date().toISOString(),
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
            {/* 最近紀錄 */}
            <RecentRecordsList records={recentRecords} onSelect={handleSelectRecentRecord} />

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
