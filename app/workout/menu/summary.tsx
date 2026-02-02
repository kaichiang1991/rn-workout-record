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
  const { menuId, startedAt, completedCount } = useLocalSearchParams<{
    menuId: string;
    startedAt: string;
    completedCount: string;
  }>();

  const menuIdNum = parseInt(menuId!, 10);
  const { menus, getMenuItems, markMenuCompleted } = useTrainingMenus();
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
    await markMenuCompleted(menuIdNum);
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
              <Text className="text-2xl font-bold text-primary-500">{calculateDuration()}</Text>
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
