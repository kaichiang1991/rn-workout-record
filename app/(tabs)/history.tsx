import { View, Text, ScrollView, TouchableOpacity, TextInput, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useWorkoutSessions } from "@/hooks/useWorkoutSessions";
import { useExercises } from "@/hooks/useExercises";
import { Icon } from "@/components/Icon";
import { DIFFICULTY_LEVELS } from "@/utils/constants";
import { formatSessionSummary } from "@/utils/tracking";

export default function HistoryScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const { sessions, loading, refresh } = useWorkoutSessions({
    exerciseId: selectedExerciseId ?? undefined,
  });
  const { exercises, loading: exercisesLoading } = useExercises();
  const [refreshing, setRefreshing] = useState(false);

  // 當頁面獲得焦點時自動刷新數據
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const getExerciseName = (exerciseId: number) => {
    const exercise = exercises.find((e) => e.id === exerciseId);
    return exercise?.name || "未知項目";
  };

  const getDifficultyInfo = (difficulty: number | null) => {
    if (!difficulty) return { label: "-", color: "#9ca3af" };
    const level = DIFFICULTY_LEVELS.find((l) => l.value === difficulty);
    return level || { label: "-", color: "#9ca3af" };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  };

  const filteredSessions = sessions.filter((session) => {
    const exerciseName = getExerciseName(session.exerciseId).toLowerCase();
    const notes = (session.notes || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return exerciseName.includes(query) || notes.includes(query);
  });

  // 按月份分組
  const groupedSessions = filteredSessions.reduce(
    (acc, session) => {
      const date = new Date(session.date);
      const monthKey = `${date.getFullYear()}年${date.getMonth() + 1}月`;
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(session);
      return acc;
    },
    {} as Record<string, typeof sessions>
  );

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="p-4">
        {/* 搜尋列 */}
        <View className="bg-white rounded-xl mb-4 px-4 py-3 flex-row items-center shadow-sm">
          <View className="mr-2">
            <Icon name="search" size={20} color="#9ca3af" />
          </View>
          <TextInput
            className="flex-1 text-base text-gray-800"
            placeholder="搜尋運動紀錄..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Icon name="x" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* 項目篩選 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <TouchableOpacity
            className={`px-4 py-2 rounded-full mr-2 ${
              selectedExerciseId === null ? "bg-primary-500" : "bg-white border border-gray-200"
            }`}
            onPress={() => setSelectedExerciseId(null)}
          >
            <Text
              className={selectedExerciseId === null ? "text-white font-medium" : "text-gray-600"}
            >
              全部
            </Text>
          </TouchableOpacity>
          {exercises
            .filter((e) => e.isActive)
            .map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                className={`px-4 py-2 rounded-full mr-2 ${
                  selectedExerciseId === exercise.id
                    ? "bg-primary-500"
                    : "bg-white border border-gray-200"
                }`}
                onPress={() => setSelectedExerciseId(exercise.id)}
              >
                <Text
                  className={
                    selectedExerciseId === exercise.id ? "text-white font-medium" : "text-gray-600"
                  }
                >
                  {exercise.name}
                </Text>
              </TouchableOpacity>
            ))}
        </ScrollView>

        {/* 紀錄列表 */}
        {loading || exercisesLoading ? (
          <View className="bg-white rounded-xl p-4">
            <Text className="text-gray-500 text-center">載入中...</Text>
          </View>
        ) : filteredSessions.length === 0 ? (
          <View className="bg-white rounded-xl p-6">
            <Text className="text-gray-500 text-center">沒有找到紀錄</Text>
            {searchQuery && (
              <Text className="text-gray-400 text-center text-sm mt-1">試試其他搜尋關鍵字</Text>
            )}
          </View>
        ) : (
          Object.entries(groupedSessions).map(([month, monthSessions]) => (
            <View key={month} className="mb-6">
              <Text className="text-lg font-bold text-gray-700 mb-3">{month}</Text>
              {monthSessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  className="bg-white rounded-xl p-4 mb-2 shadow-sm"
                  onPress={() => router.push(`/workout/${session.id}`)}
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-800">
                        {getExerciseName(session.exerciseId)}
                      </Text>
                      <Text className="text-primary-600 text-sm mt-1">
                        {formatSessionSummary(session)}
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">{formatDate(session.date)}</Text>
                      {session.notes && (
                        <Text className="text-gray-400 text-sm mt-1" numberOfLines={1}>
                          {session.notes}
                        </Text>
                      )}
                    </View>
                    <View
                      className="px-2 py-1 rounded"
                      style={{
                        backgroundColor: getDifficultyInfo(session.difficulty).color + "20",
                      }}
                    >
                      <Text
                        className="text-sm font-medium"
                        style={{ color: getDifficultyInfo(session.difficulty).color }}
                      >
                        {getDifficultyInfo(session.difficulty).label}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
