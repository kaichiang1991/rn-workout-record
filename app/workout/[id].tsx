import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useWorkoutSessions } from "@/hooks/useWorkoutSessions";
import { useExercises } from "@/hooks/useExercises";
import { WorkoutSessionWithSets, WorkoutSet } from "@/db/client";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getSessionById, deleteSession } = useWorkoutSessions();
  const { exercises } = useExercises();
  const [session, setSession] = useState<WorkoutSessionWithSets | null>(null);
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

  const getMoodEmoji = (mood: number | null) => {
    const moods = ["😢", "😕", "😐", "🙂", "😄"];
    return mood ? moods[mood - 1] : "❓";
  };

  const getMoodLabel = (mood: number | null) => {
    const labels = ["很差", "不好", "普通", "不錯", "很棒"];
    return mood ? labels[mood - 1] : "未記錄";
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

  const totalReps = session.sets?.reduce((sum: number, s: WorkoutSet) => sum + (s.reps || 0), 0);
  const maxWeight = Math.max(...(session.sets?.map((s: WorkoutSet) => s.weight || 0) || [0]));

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
              <Text className="text-4xl">{getMoodEmoji(session.mood)}</Text>
              <Text className="text-sm text-gray-500 mt-1">{getMoodLabel(session.mood)}</Text>
            </View>
          </View>
        </View>

        {/* 統計摘要 */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-white rounded-xl p-4">
            <Text className="text-gray-500 text-sm">總組數</Text>
            <Text className="text-2xl font-bold text-gray-800">{session.sets?.length || 0}</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4">
            <Text className="text-gray-500 text-sm">總次數</Text>
            <Text className="text-2xl font-bold text-gray-800">{totalReps}</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4">
            <Text className="text-gray-500 text-sm">最大重量</Text>
            <Text className="text-2xl font-bold text-gray-800">
              {maxWeight > 0 ? `${maxWeight}kg` : "-"}
            </Text>
          </View>
        </View>

        {/* 詳細組數 */}
        {session.sets && session.sets.length > 0 && (
          <View className="mb-4">
            <Text className="text-lg font-bold text-gray-700 mb-3">運動組數</Text>
            {session.sets.map((set: WorkoutSet, index: number) => (
              <View key={index} className="bg-white rounded-xl p-4 mb-2">
                <View className="flex-row justify-between items-center">
                  <Text className="text-lg font-medium text-gray-700">第 {set.setNumber} 組</Text>
                  <View className="flex-row gap-4">
                    {set.reps !== null && (
                      <View className="items-center">
                        <Text className="text-xl font-bold text-primary-600">{set.reps}</Text>
                        <Text className="text-xs text-gray-500">次</Text>
                      </View>
                    )}
                    {set.weight !== null && (
                      <View className="items-center">
                        <Text className="text-xl font-bold text-primary-600">{set.weight}</Text>
                        <Text className="text-xs text-gray-500">kg</Text>
                      </View>
                    )}
                  </View>
                </View>
                {set.notes && <Text className="text-gray-500 text-sm mt-2">{set.notes}</Text>}
              </View>
            ))}
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
