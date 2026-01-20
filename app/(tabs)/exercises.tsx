import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useExercises } from "@/hooks/useExercises";
import { BODY_PARTS, BodyPartKey } from "@/utils/constants";
import { Icon, BODY_PART_ICONS, type IconName } from "@/components/Icon";

export default function ExercisesScreen() {
  const router = useRouter();
  const { exercises, exerciseBodyParts, loading, refresh } = useExercises();
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

  const activeExercises = exercises.filter((e) => e.isActive);
  const inactiveExercises = exercises.filter((e) => !e.isActive);

  // 使用 exerciseBodyParts 來分組，以第一個部位為主要分類
  const groupedExercises = activeExercises.reduce(
    (acc, exercise) => {
      const bodyParts = exerciseBodyParts.filter((bp) => bp.exerciseId === exercise.id);
      // 沒有設定部位的項目放在 core（核心）分類下
      const primaryBodyPart = bodyParts.length > 0 ? bodyParts[0].bodyPart : "core";
      if (!acc[primaryBodyPart]) {
        acc[primaryBodyPart] = [];
      }
      acc[primaryBodyPart].push(exercise);
      return acc;
    },
    {} as Record<string, typeof exercises>
  );

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="p-4">
        {/* 新增按鈕 */}
        <TouchableOpacity
          className="bg-primary-500 rounded-xl p-4 mb-6 flex-row items-center justify-center"
          onPress={() => router.push("/exercise/new")}
        >
          <Text className="text-white text-lg font-semibold">＋ 新增健身項目</Text>
        </TouchableOpacity>

        {loading ? (
          <View className="bg-white rounded-xl p-4">
            <Text className="text-gray-500 text-center">載入中...</Text>
          </View>
        ) : activeExercises.length === 0 ? (
          <View className="bg-white rounded-xl p-6">
            <Text className="text-gray-500 text-center">還沒有健身項目</Text>
            <Text className="text-gray-400 text-center text-sm mt-1">
              點擊上方按鈕新增你的第一個項目！
            </Text>
          </View>
        ) : (
          Object.entries(groupedExercises).map(([category, items]) => (
            <View key={category} className="mb-6">
              <View className="flex-row items-center mb-3">
                <View className="mr-2">
                  <Icon
                    name={(BODY_PART_ICONS[category] || "core") as IconName}
                    size={20}
                    color="#374151"
                  />
                </View>
                <Text className="text-lg font-bold text-gray-700">
                  {BODY_PARTS[category as BodyPartKey]?.label || category}
                </Text>
                <Text className="text-gray-400 ml-2">({items.length})</Text>
              </View>
              {items.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  className="bg-white rounded-xl p-4 mb-2 shadow-sm"
                  onPress={() => router.push(`/exercise/${exercise.id}`)}
                >
                  <Text className="text-lg font-medium text-gray-800">{exercise.name}</Text>
                  {exercise.description && (
                    <Text className="text-gray-500 text-sm mt-1" numberOfLines={2}>
                      {exercise.description}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}

        {/* 已停用項目 */}
        {inactiveExercises.length > 0 && (
          <View className="mt-4">
            <Text className="text-lg font-bold text-gray-400 mb-3">
              已停用 ({inactiveExercises.length})
            </Text>
            {inactiveExercises.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                className="bg-gray-100 rounded-xl p-4 mb-2 opacity-60"
                onPress={() => router.push(`/exercise/${exercise.id}`)}
              >
                <Text className="text-lg font-medium text-gray-600">{exercise.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
