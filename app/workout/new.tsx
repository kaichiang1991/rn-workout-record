import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Switch } from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useExercises } from "@/hooks/useExercises";
import { useWorkoutSessions } from "@/hooks/useWorkoutSessions";
import { BodyPartSelector } from "@/components/BodyPartSelector";
import { DifficultySelector } from "@/components/DifficultySelector";
import { SetCounter } from "@/components/SetCounter";
import { RecentRecordsList } from "@/components/RecentRecordsList";
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
        date: new Date().toISOString(),
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

        {/* 重量設定 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">重量</Text>
          <View className="bg-white rounded-xl p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-gray-700">自體重量</Text>
              <Switch value={isBodyweight} onValueChange={setIsBodyweight} />
            </View>
            {!isBodyweight && (
              <View className="flex-row items-center">
                <TextInput
                  className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-lg"
                  placeholder="0"
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={setWeight}
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
                onChangeText={setReps}
              />
              <Text className="text-gray-600 text-lg ml-3">下</Text>
            </View>
          </View>
        </View>

        {/* 組數計數器 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">完成組數</Text>
          <View className="bg-white rounded-xl p-6 items-center">
            <SetCounter value={setCount} onChange={setSetCount} />
          </View>
        </View>

        {/* 難易度選擇 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">今天難易度</Text>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />
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
            onChangeText={setNotes}
          />
        </View>

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
