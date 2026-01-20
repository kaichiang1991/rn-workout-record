import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useWorkoutSessions } from "@/hooks/useWorkoutSessions";
import { useExercises } from "@/hooks/useExercises";
import { useStats } from "@/hooks/useStats";
import { StatsCard } from "@/components/charts/StatsCard";
import { DIFFICULTY_LEVELS } from "@/utils/constants";
import { Icon } from "@/components/Icon";

export default function HomeScreen() {
  const router = useRouter();
  const {
    sessions,
    loading: sessionsLoading,
    refresh: refreshSessions,
  } = useWorkoutSessions({ limit: 5 });
  const { exercises, loading: exercisesLoading } = useExercises();
  const { stats, refresh: refreshStats } = useStats();
  const [refreshing, setRefreshing] = useState(false);

  // 當頁面獲得焦點時自動刷新數據
  useFocusEffect(
    useCallback(() => {
      refreshSessions();
      refreshStats();
    }, [refreshSessions, refreshStats])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshSessions(), refreshStats()]);
    setRefreshing(false);
  }, [refreshSessions, refreshStats]);

  const getExerciseName = (exerciseId: number) => {
    const exercise = exercises.find((e) => e.id === exerciseId);
    return exercise?.name || "未知項目";
  };

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

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-TW", {
      month: "long",
      day: "numeric",
    });
  };

  const groupSessionsByDate = () => {
    const grouped: Record<string, typeof sessions> = {};
    sessions.forEach((session) => {
      // 標準化日期格式，只取 YYYY-MM-DD 部分
      const dateKey = session.date.split("T")[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(session);
    });
    return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="p-4">
        {/* 統計卡片區 */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <View className="bg-primary-500 rounded-2xl p-4">
              <Text className="text-white/80 text-sm">本週運動</Text>
              <Text className="text-white text-3xl font-bold mt-1">{stats.thisWeekCount}</Text>
              <Text className="text-white/80 text-sm">天</Text>
            </View>
          </View>
          <View className="flex-1">
            <View className="bg-green-500 rounded-2xl p-4">
              <Text className="text-white/80 text-sm">本月運動</Text>
              <Text className="text-white text-3xl font-bold mt-1">{stats.thisMonthCount}</Text>
              <Text className="text-white/80 text-sm">天</Text>
            </View>
          </View>
        </View>

        {/* 平均難易度 */}
        {stats.averageDifficulty > 0 && (
          <View className="bg-white rounded-xl p-4 mb-4">
            <Text className="text-gray-700 font-medium mb-2">平均難易度</Text>
            <View className="flex-row items-center">
              {renderDifficultyDot(Math.round(stats.averageDifficulty), 28)}
              <Text className="text-gray-600 ml-2">
                {DIFFICULTY_LEVELS.find((l) => l.value === Math.round(stats.averageDifficulty))
                  ?.label || ""}{" "}
                ({stats.averageDifficulty.toFixed(1)})
              </Text>
            </View>
          </View>
        )}

        {/* 最近紀錄 */}
        <View className="mb-4">
          <Text className="text-xl font-bold text-gray-800 mb-3">最近紀錄</Text>
          {sessionsLoading || exercisesLoading ? (
            <View className="bg-white rounded-xl p-4">
              <Text className="text-gray-500 text-center">載入中...</Text>
            </View>
          ) : sessions.length === 0 ? (
            <View className="bg-white rounded-xl p-6">
              <Text className="text-gray-500 text-center">還沒有運動紀錄</Text>
              <Text className="text-gray-400 text-center text-sm mt-1">
                點擊下方 + 按鈕開始記錄你的運動！
              </Text>
            </View>
          ) : (
            groupSessionsByDate().map(([date, dateSessions]) => (
              <View key={date} className="mb-4">
                <Text className="text-gray-600 font-medium mb-2">{formatDateHeader(date)}</Text>
                <View className="bg-white rounded-xl overflow-hidden shadow-sm">
                  {dateSessions.map((session, index) => (
                    <TouchableOpacity
                      key={session.id}
                      className={`p-4 flex-row justify-between items-center ${
                        index < dateSessions.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                      onPress={() => router.push(`/workout/${session.id}`)}
                    >
                      <View className="flex-row items-center flex-1">
                        {renderDifficultyDot(session.difficulty, 20)}
                        <View className="ml-3 flex-1">
                          <Text className="text-base font-medium text-gray-800">
                            {getExerciseName(session.exerciseId)}
                          </Text>
                          {session.notes && (
                            <Text className="text-gray-400 text-sm mt-0.5" numberOfLines={1}>
                              {session.notes}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Icon name="chevron-right" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>

        {sessions.length > 0 && (
          <TouchableOpacity className="py-3" onPress={() => router.push("/(tabs)/history")}>
            <Text className="text-primary-600 text-center font-medium">查看全部紀錄 →</Text>
          </TouchableOpacity>
        )}

        {/* 累計統計 */}
        {stats.totalCount > 0 && (
          <View className="mt-4">
            <StatsCard
              title="累計運動天數"
              value={stats.totalCount}
              subtitle="持續努力中！"
              icon="trophy"
              color="orange"
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
}
