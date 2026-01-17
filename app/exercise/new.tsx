import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useExercises } from "@/hooks/useExercises";
import { CATEGORIES } from "@/utils/constants";
import { Icon } from "@/components/Icon";

const categories = Object.entries(CATEGORIES).map(([value, { label, icon }]) => ({
  value,
  label,
  icon,
}));

export default function NewExerciseScreen() {
  const router = useRouter();
  const { createExercise } = useExercises();
  const [name, setName] = useState("");
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  const toggleBodyPart = (value: string) => {
    setSelectedBodyParts((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("提示", "請輸入項目名稱");
      return;
    }

    if (selectedBodyParts.length === 0) {
      Alert.alert("提示", "請至少選擇一個分類");
      return;
    }

    setSaving(true);
    try {
      await createExercise({
        name: name.trim(),
        bodyParts: selectedBodyParts,
        description: description.trim() || null,
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
        {/* 名稱 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">項目名稱 *</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-base"
            placeholder="例如：深蹲、臥推、跑步..."
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        {/* 分類 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">分類（可多選）</Text>
          <View className="flex-row flex-wrap">
            {categories.map((cat) => {
              const isSelected = selectedBodyParts.includes(cat.value);
              return (
                <TouchableOpacity
                  key={cat.value}
                  className={`flex-row items-center px-4 py-2 rounded-full mr-2 mb-2 ${
                    isSelected ? "bg-primary-500" : "bg-white border border-gray-200"
                  }`}
                  onPress={() => toggleBodyPart(cat.value)}
                >
                  <View className="mr-1">
                    <Icon name={cat.icon} size={16} color={isSelected ? "#ffffff" : "#374151"} />
                  </View>
                  <Text className={isSelected ? "text-white font-medium" : "text-gray-700"}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
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

        {/* 儲存按鈕 */}
        <TouchableOpacity
          className={`rounded-xl p-4 items-center ${saving ? "bg-gray-400" : "bg-primary-500"}`}
          onPress={handleSave}
          disabled={saving}
        >
          <Text className="text-white text-lg font-semibold">
            {saving ? "儲存中..." : "儲存項目"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
