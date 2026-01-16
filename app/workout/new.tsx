import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useExercises } from "@/hooks/useExercises";
import { useWorkoutSessions } from "@/hooks/useWorkoutSessions";

interface WorkoutSet {
  setNumber: number;
  reps: string;
  weight: string;
  notes: string;
}

export default function NewWorkoutScreen() {
  const router = useRouter();
  const { exercises } = useExercises();
  const { createSession } = useWorkoutSessions();
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [mood, setMood] = useState<number>(3);
  const [notes, setNotes] = useState("");
  const [sets, setSets] = useState<WorkoutSet[]>([
    { setNumber: 1, reps: "", weight: "", notes: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const activeExercises = exercises.filter((e) => e.isActive);

  const moods = [
    { value: 1, emoji: "😢", label: "很差" },
    { value: 2, emoji: "😕", label: "不好" },
    { value: 3, emoji: "😐", label: "普通" },
    { value: 4, emoji: "🙂", label: "不錯" },
    { value: 5, emoji: "😄", label: "很棒" },
  ];

  const addSet = () => {
    setSets([...sets, { setNumber: sets.length + 1, reps: "", weight: "", notes: "" }]);
  };

  const removeSet = (index: number) => {
    if (sets.length > 1) {
      const newSets = sets.filter((_, i) => i !== index);
      setSets(newSets.map((s, i) => ({ ...s, setNumber: i + 1 })));
    }
  };

  const updateSet = (index: number, field: keyof WorkoutSet, value: string) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets(newSets);
  };

  const handleSave = async () => {
    if (!selectedExerciseId) {
      Alert.alert("提示", "請選擇健身項目");
      return;
    }

    const validSets = sets.filter((s) => s.reps || s.weight);
    if (validSets.length === 0) {
      Alert.alert("提示", "請至少填寫一組數據");
      return;
    }

    setSaving(true);
    try {
      await createSession({
        exerciseId: selectedExerciseId,
        date: new Date().toISOString(),
        mood,
        notes: notes.trim() || null,
        sets: validSets.map((s) => ({
          setNumber: s.setNumber,
          reps: s.reps ? parseInt(s.reps, 10) : null,
          weight: s.weight ? parseFloat(s.weight) : null,
          duration: null,
          notes: s.notes.trim() || null,
        })),
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
        {/* 選擇健身項目 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">選擇健身項目</Text>
          {activeExercises.length === 0 ? (
            <View className="bg-white rounded-xl p-4">
              <Text className="text-gray-500 text-center">還沒有健身項目</Text>
              <TouchableOpacity className="mt-2" onPress={() => router.push("/exercise/new")}>
                <Text className="text-primary-600 text-center">新增項目 →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {activeExercises.map((exercise) => (
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
        </View>

        {/* 心情選擇 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">今天感覺如何？</Text>
          <View className="flex-row justify-around bg-white rounded-xl p-4">
            {moods.map((m) => (
              <TouchableOpacity
                key={m.value}
                className={`items-center p-2 rounded-lg ${
                  mood === m.value ? "bg-primary-100" : ""
                }`}
                onPress={() => setMood(m.value)}
              >
                <Text className="text-3xl">{m.emoji}</Text>
                <Text
                  className={`text-xs mt-1 ${
                    mood === m.value ? "text-primary-600 font-medium" : "text-gray-500"
                  }`}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 組數輸入 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">運動組數</Text>
          {sets.map((set, index) => (
            <View key={index} className="bg-white rounded-xl p-4 mb-3">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-lg font-medium text-gray-700">第 {set.setNumber} 組</Text>
                {sets.length > 1 && (
                  <TouchableOpacity onPress={() => removeSet(index)}>
                    <Text className="text-red-500">移除</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">次數</Text>
                  <TextInput
                    className="border border-gray-200 rounded-lg px-3 py-2 text-base"
                    placeholder="0"
                    keyboardType="number-pad"
                    value={set.reps}
                    onChangeText={(v) => updateSet(index, "reps", v)}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500 mb-1">重量 (kg)</Text>
                  <TextInput
                    className="border border-gray-200 rounded-lg px-3 py-2 text-base"
                    placeholder="0"
                    keyboardType="decimal-pad"
                    value={set.weight}
                    onChangeText={(v) => updateSet(index, "weight", v)}
                  />
                </View>
              </View>
              <View className="mt-3">
                <Text className="text-sm text-gray-500 mb-1">備註</Text>
                <TextInput
                  className="border border-gray-200 rounded-lg px-3 py-2 text-base"
                  placeholder="選填..."
                  value={set.notes}
                  onChangeText={(v) => updateSet(index, "notes", v)}
                />
              </View>
            </View>
          ))}
          <TouchableOpacity
            className="border-2 border-dashed border-gray-300 rounded-xl p-4 items-center"
            onPress={addSet}
          >
            <Text className="text-gray-500">＋ 新增一組</Text>
          </TouchableOpacity>
        </View>

        {/* 備註 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">整體備註</Text>
          <TextInput
            className="bg-white rounded-xl p-4 text-base min-h-24"
            placeholder="記錄今天的運動心得..."
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
