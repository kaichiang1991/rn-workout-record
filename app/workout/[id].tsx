import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useWorkoutSessions } from "@/hooks/useWorkoutSessions";
import { useExerciseStore } from "@/store/exerciseStore";
import { WorkoutSession } from "@/db/client";
import { DIFFICULTY_LEVELS } from "@/utils/constants";
import { getTrackingMode, formatDuration, formatSessionSummary } from "@/utils/tracking";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getSessionById, getRecentDaysByExerciseId, deleteSession } = useWorkoutSessions();
  const exercises = useExerciseStore((s) => s.exercises);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [recentRecords, setRecentRecords] = useState<WorkoutSession[]>([]);
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
      if (data) {
        const recent = await getRecentDaysByExerciseId(data.exerciseId, 7, data.id);
        setRecentRecords(recent);
      }
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

  const getDifficultyInfo = (difficulty: number | null) => {
    if (!difficulty) return { label: "未記錄", color: "#9ca3af" };
    const level = DIFFICULTY_LEVELS.find((l) => l.value === difficulty);
    return level || { label: "未知", color: "#9ca3af" };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-TW", {
      timeZone: "Asia/Taipei",
      month: "short",
      day: "numeric",
      weekday: "short",
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

  const difficultyInfo = getDifficultyInfo(session.difficulty);
  const trackingMode = getTrackingMode(session);
  const totalVolume =
    trackingMode === "reps" && session.setCount && session.reps && session.weight
      ? session.setCount * session.reps * session.weight
      : null;

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
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: difficultyInfo.color }}
              />
              <Text className="text-sm text-gray-500 mt-1">{difficultyInfo.label}</Text>
            </View>
          </View>
        </View>

        {/* 訓練數據 */}
        <View className="flex-row gap-3 mb-4">
          {trackingMode === "time" ? (
            // 時間型：顯示時間
            <View className="flex-1 bg-white rounded-xl p-4">
              <Text className="text-gray-500 text-sm">時間</Text>
              <Text className="text-2xl font-bold text-gray-800">
                {formatDuration(session.duration!)}
              </Text>
            </View>
          ) : (
            // 次數型：顯示重量和次數
            <>
              <View className="flex-1 bg-white rounded-xl p-4">
                <Text className="text-gray-500 text-sm">重量</Text>
                <Text className="text-2xl font-bold text-gray-800">
                  {session.isBodyweight ? "自體" : session.weight ? `${session.weight}kg` : "-"}
                </Text>
              </View>
              <View className="flex-1 bg-white rounded-xl p-4">
                <Text className="text-gray-500 text-sm">次數</Text>
                <Text className="text-2xl font-bold text-gray-800">
                  {session.reps ? `${session.reps}下` : "-"}
                </Text>
              </View>
            </>
          )}
          {/* 組數（兩種類型都顯示） */}
          <View className="flex-1 bg-white rounded-xl p-4">
            <Text className="text-gray-500 text-sm">組數</Text>
            <Text className="text-2xl font-bold text-gray-800">
              {session.setCount ? `${session.setCount}組` : "-"}
            </Text>
          </View>
        </View>

        {/* 總訓練量 */}
        {totalVolume && (
          <View className="bg-primary-500 rounded-xl p-4 mb-4">
            <Text className="text-white/80 text-sm">總訓練量</Text>
            <Text className="text-white text-3xl font-bold">{totalVolume} kg</Text>
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

        {/* 近7天紀錄 */}
        <View className="mt-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">近 7 天紀錄</Text>
          {recentRecords.length > 0 ? (
            <ScrollView
              className="bg-white rounded-xl"
              style={{ maxHeight: 200 }}
              nestedScrollEnabled
            >
              {recentRecords.map((record, index) => {
                const recordDifficulty = getDifficultyInfo(record.difficulty);
                return (
                  <TouchableOpacity
                    key={record.id}
                    className={`p-4 flex-row justify-between items-center ${
                      index < recentRecords.length - 1 ? "border-b border-gray-100" : ""
                    }`}
                    onPress={() => router.push(`/workout/${record.id}`)}
                  >
                    <View className="flex-1">
                      <Text className="text-gray-800 font-medium">
                        {formatShortDate(record.date)}
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        {formatSessionSummary(record)}
                      </Text>
                    </View>
                    <View
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: recordDifficulty.color }}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View className="bg-white rounded-xl p-4">
              <Text className="text-gray-500 text-center">無</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
