import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTrainingMenus } from "@/hooks/useTrainingMenus";

export default function NewMenuScreen() {
  const router = useRouter();
  const { createMenu } = useTrainingMenus();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("提示", "請輸入菜單名稱");
      return;
    }

    setSaving(true);
    try {
      const menu = await createMenu({
        name: name.trim(),
        description: description.trim() || null,
      });
      // 建立後直接進入編輯頁面
      router.replace(`/menu/${menu.id}`);
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
          <Text className="text-lg font-bold text-gray-700 mb-3">菜單名稱 *</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-base"
            placeholder="例如：胸背日、腿日、推拉腿第一天..."
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        {/* 描述 */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-700 mb-3">描述（選填）</Text>
          <TextInput
            className="bg-white rounded-xl p-4 text-base min-h-24"
            placeholder="記錄這個菜單的訓練目標或注意事項..."
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
            {saving ? "建立中..." : "建立菜單"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
