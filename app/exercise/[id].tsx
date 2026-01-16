import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Switch } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useExercises } from "@/hooks/useExercises";

const categories = [
  { value: "chest", label: "胸部", icon: "🫁" },
  { value: "back", label: "背部", icon: "🔙" },
  { value: "legs", label: "腿部", icon: "🦵" },
  { value: "shoulders", label: "肩膀", icon: "💪" },
  { value: "arms", label: "手臂", icon: "💪" },
  { value: "core", label: "核心", icon: "🎯" },
  { value: "cardio", label: "有氧", icon: "🏃" },
  { value: "other", label: "其他", icon: "🏋️" },
];

export default function EditExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { exercises, updateExercise, deleteExercise } = useExercises();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const exercise = exercises.find((e) => e.id === parseInt(id!, 10));
    if (exercise) {
      setName(exercise.name);
      setCategory(exercise.category || "other");
      setDescription(exercise.description || "");
      setIsActive(exercise.isActive);
      setLoading(false);
    } else if (exercises.length > 0) {
      setLoading(false);
    }
  }, [id, exercises]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("提示", "請輸入項目名稱");
      return;
    }

    setSaving(true);
    try {
      await updateExercise(parseInt(id!, 10), {
        name: name.trim(),
        category,
        description: description.trim() || null,
        isActive,
      });
      router.back();
    } catch {
      Alert.alert("錯誤", "儲存失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "確認刪除",
      "確定要刪除這個健身項目嗎？相關的運動紀錄也會被刪除，此操作無法復原。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "刪除",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExercise(parseInt(id!, 10));
              router.back();
            } catch {
              Alert.alert("錯誤", "刪除失敗");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-500">載入中...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* 名稱 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">項目名稱 *</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-base"
            placeholder="例如：深蹲、臥推、跑步..."
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* 分類 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">分類</Text>
          <View className="flex-row flex-wrap">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                className={`flex-row items-center px-4 py-2 rounded-full mr-2 mb-2 ${
                  category === cat.value ? "bg-primary-500" : "bg-white border border-gray-200"
                }`}
                onPress={() => setCategory(cat.value)}
              >
                <Text className="mr-1">{cat.icon}</Text>
                <Text
                  className={category === cat.value ? "text-white font-medium" : "text-gray-700"}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 描述 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">描述（選填）</Text>
          <TextInput
            className="bg-white rounded-xl p-4 text-base min-h-24"
            placeholder="記錄這個項目的注意事項或說明..."
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* 啟用狀態 */}
        <View className="bg-white rounded-xl p-4 mb-6 flex-row justify-between items-center">
          <View>
            <Text className="text-lg font-medium text-gray-700">啟用項目</Text>
            <Text className="text-sm text-gray-500">停用後不會顯示在新增紀錄中</Text>
          </View>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: "#e5e7eb", true: "#93c5fd" }}
            thumbColor={isActive ? "#3b82f6" : "#9ca3af"}
          />
        </View>

        {/* 儲存按鈕 */}
        <TouchableOpacity
          className={`rounded-xl p-4 items-center mb-4 ${
            saving ? "bg-gray-400" : "bg-primary-500"
          }`}
          onPress={handleSave}
          disabled={saving}
        >
          <Text className="text-white text-lg font-semibold">
            {saving ? "儲存中..." : "儲存變更"}
          </Text>
        </TouchableOpacity>

        {/* 刪除按鈕 */}
        <TouchableOpacity
          className="border border-red-500 rounded-xl p-4 items-center"
          onPress={handleDelete}
        >
          <Text className="text-red-500 font-medium">刪除項目</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
