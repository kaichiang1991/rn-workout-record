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
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pt-12 pb-3 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-gray-600 text-base">取消</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-800">新增運動紀錄</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text
            className={`text-base font-semibold ${saving ? "text-gray-400" : "text-primary-500"}`}
          >
            {saving ? "儲存中..." : "儲存"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
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
        </View>
      </ScrollView>
    </View>
  );
}
