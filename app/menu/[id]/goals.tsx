import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTrainingMenus, MenuItemWithExercise } from "@/hooks/useTrainingMenus";
import { Icon } from "@/components/Icon";

interface GoalInput {
  mode: "structured" | "text";
  trackingType: "reps" | "time";
  sets: string;
  reps: string;
  duration: string;
  text: string;
}

export default function GoalsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const menuId = parseInt(id!, 10);

  const { menus, getMenuItems, updateMenuItemGoal } = useTrainingMenus();
  const [menuItems, setMenuItems] = useState<MenuItemWithExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [goals, setGoals] = useState<Record<number, GoalInput>>({});

  const menu = menus.find((m) => m.id === menuId);

  const loadMenuItems = useCallback(async () => {
    try {
      setLoading(true);
      const items = await getMenuItems(menuId);
      setMenuItems(items);

      // 初始化 goals，載入已存在的目標
      const initialGoals: Record<number, GoalInput> = {};
      for (const item of items) {
        if (item.targetText) {
          initialGoals[item.id] = {
            mode: "text",
            trackingType: "reps",
            sets: "",
            reps: "",
            duration: "",
            text: item.targetText,
          };
        } else if (item.targetSets || item.targetReps || item.targetDuration) {
          initialGoals[item.id] = {
            mode: "structured",
            trackingType: item.targetDuration ? "time" : "reps",
            sets: item.targetSets?.toString() || "",
            reps: item.targetReps?.toString() || "",
            duration: item.targetDuration?.toString() || "",
            text: "",
          };
        } else {
          initialGoals[item.id] = {
            mode: "structured",
            trackingType: "reps",
            sets: "",
            reps: "",
            duration: "",
            text: "",
          };
        }
      }
      setGoals(initialGoals);
    } finally {
      setLoading(false);
    }
  }, [menuId, getMenuItems]);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  const currentItem = menuItems[currentIndex];
  const currentGoal = currentItem ? goals[currentItem.id] : null;

  const updateCurrentGoal = (updates: Partial<GoalInput>) => {
    if (!currentItem) return;
    setGoals((prev) => ({
      ...prev,
      [currentItem.id]: { ...prev[currentItem.id], ...updates },
    }));
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < menuItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const item of menuItems) {
        const goal = goals[item.id];
        if (!goal) continue;

        if (goal.mode === "text" && goal.text.trim()) {
          await updateMenuItemGoal(item.id, {
            targetSets: null,
            targetReps: null,
            targetDuration: null,
            targetText: goal.text.trim(),
          });
        } else if (goal.mode === "structured") {
          const sets = goal.sets ? parseInt(goal.sets, 10) : null;
          const reps = goal.trackingType === "reps" && goal.reps ? parseInt(goal.reps, 10) : null;
          const duration =
            goal.trackingType === "time" && goal.duration ? parseInt(goal.duration, 10) : null;

          // 只有當有設定值時才更新
          if (sets || reps || duration) {
            await updateMenuItemGoal(item.id, {
              targetSets: sets,
              targetReps: reps,
              targetDuration: duration,
              targetText: null,
            });
          } else {
            // 清除目標
            await updateMenuItemGoal(item.id, {
              targetSets: null,
              targetReps: null,
              targetDuration: null,
              targetText: null,
            });
          }
        }
      }
      router.back();
    } catch {
      Alert.alert("錯誤", "儲存失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  };

  if (!menu) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">找不到菜單</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">載入中...</Text>
      </View>
    );
  }

  if (menuItems.length === 0) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">菜單中沒有項目</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pt-12 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Icon name="arrow-left" size={24} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-800">設定目標</Text>
            <Text className="text-sm text-gray-500">{menu.name}</Text>
          </View>
        </View>
      </View>

      {/* 進度指示器 */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-gray-600">
            {currentIndex + 1} / {menuItems.length}
          </Text>
          <View className="flex-row">
            {menuItems.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full mx-1 ${
                  index === currentIndex ? "bg-primary-500" : "bg-gray-300"
                }`}
              />
            ))}
          </View>
        </View>
      </View>

      {/* 卡片內容 */}
      <ScrollView className="flex-1 p-4">
        <View className="bg-white rounded-2xl p-6 shadow-sm">
          {/* 動作名稱 */}
          <Text className="text-2xl font-bold text-gray-800 text-center mb-6">
            {currentItem?.exerciseName}
          </Text>

          {/* 模式切換 */}
          <View className="flex-row mb-6">
            <TouchableOpacity
              className={`flex-1 py-3 rounded-l-xl border ${
                currentGoal?.mode === "structured"
                  ? "bg-primary-500 border-primary-500"
                  : "bg-white border-gray-300"
              }`}
              onPress={() => updateCurrentGoal({ mode: "structured" })}
            >
              <Text
                className={`text-center font-medium ${
                  currentGoal?.mode === "structured" ? "text-white" : "text-gray-700"
                }`}
              >
                結構化
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 rounded-r-xl border-t border-b border-r ${
                currentGoal?.mode === "text"
                  ? "bg-primary-500 border-primary-500"
                  : "bg-white border-gray-300"
              }`}
              onPress={() => updateCurrentGoal({ mode: "text" })}
            >
              <Text
                className={`text-center font-medium ${
                  currentGoal?.mode === "text" ? "text-white" : "text-gray-700"
                }`}
              >
                自由文字
              </Text>
            </TouchableOpacity>
          </View>

          {currentGoal?.mode === "structured" ? (
            <>
              {/* 追蹤類型切換 */}
              <View className="flex-row mb-4">
                <TouchableOpacity
                  className={`flex-1 py-2 rounded-l-lg border ${
                    currentGoal.trackingType === "reps"
                      ? "bg-primary-100 border-primary-300"
                      : "bg-white border-gray-200"
                  }`}
                  onPress={() => updateCurrentGoal({ trackingType: "reps" })}
                >
                  <Text
                    className={`text-center text-sm ${
                      currentGoal.trackingType === "reps" ? "text-primary-700" : "text-gray-600"
                    }`}
                  >
                    次數型
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-2 rounded-r-lg border-t border-b border-r ${
                    currentGoal.trackingType === "time"
                      ? "bg-primary-100 border-primary-300"
                      : "bg-white border-gray-200"
                  }`}
                  onPress={() => updateCurrentGoal({ trackingType: "time" })}
                >
                  <Text
                    className={`text-center text-sm ${
                      currentGoal.trackingType === "time" ? "text-primary-700" : "text-gray-600"
                    }`}
                  >
                    時間型
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 組數輸入 */}
              <View className="mb-4">
                <Text className="text-gray-600 mb-2">組數</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-lg text-gray-800"
                  placeholder="例如：5"
                  keyboardType="number-pad"
                  value={currentGoal.sets}
                  onChangeText={(text) => updateCurrentGoal({ sets: text })}
                />
              </View>

              {/* 次數或時間輸入 */}
              {currentGoal.trackingType === "reps" ? (
                <View className="mb-4">
                  <Text className="text-gray-600 mb-2">每組次數</Text>
                  <TextInput
                    className="bg-gray-100 rounded-xl px-4 py-3 text-lg text-gray-800"
                    placeholder="例如：10"
                    keyboardType="number-pad"
                    value={currentGoal.reps}
                    onChangeText={(text) => updateCurrentGoal({ reps: text })}
                  />
                </View>
              ) : (
                <View className="mb-4">
                  <Text className="text-gray-600 mb-2">每組秒數</Text>
                  <TextInput
                    className="bg-gray-100 rounded-xl px-4 py-3 text-lg text-gray-800"
                    placeholder="例如：30"
                    keyboardType="number-pad"
                    value={currentGoal.duration}
                    onChangeText={(text) => updateCurrentGoal({ duration: text })}
                  />
                </View>
              )}

              {/* 預覽 */}
              {(currentGoal.sets || currentGoal.reps || currentGoal.duration) && (
                <View className="bg-primary-50 rounded-xl p-4 mt-2">
                  <Text className="text-primary-700 text-center">
                    目標：
                    {currentGoal.sets && `${currentGoal.sets}組`}
                    {currentGoal.sets && (currentGoal.reps || currentGoal.duration) && " × "}
                    {currentGoal.trackingType === "reps" &&
                      currentGoal.reps &&
                      `${currentGoal.reps}下`}
                    {currentGoal.trackingType === "time" &&
                      currentGoal.duration &&
                      `${currentGoal.duration}秒`}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              {/* 自由文字輸入 */}
              <View className="mb-4">
                <Text className="text-gray-600 mb-2">目標描述</Text>
                <TextInput
                  className="bg-gray-100 rounded-xl px-4 py-3 text-lg text-gray-800"
                  placeholder="例如：做到力竭"
                  value={currentGoal?.text}
                  onChangeText={(text) => updateCurrentGoal({ text })}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* 預覽 */}
              {currentGoal?.text && (
                <View className="bg-primary-50 rounded-xl p-4 mt-2">
                  <Text className="text-primary-700 text-center">目標：{currentGoal.text}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* 跳過提示 */}
        <Text className="text-gray-400 text-center text-sm mt-4">留空即表示不設定目標</Text>
      </ScrollView>

      {/* Footer 導航 */}
      <View className="bg-white border-t border-gray-200 p-4">
        <View className="flex-row gap-3">
          <TouchableOpacity
            className={`flex-1 rounded-xl p-4 items-center ${
              currentIndex === 0 ? "bg-gray-100" : "bg-gray-200"
            }`}
            onPress={handlePrevious}
            disabled={currentIndex === 0}
          >
            <Text className={currentIndex === 0 ? "text-gray-400" : "text-gray-700"}>上一個</Text>
          </TouchableOpacity>

          {currentIndex < menuItems.length - 1 ? (
            <TouchableOpacity
              className="flex-1 bg-primary-500 rounded-xl p-4 items-center"
              onPress={handleNext}
            >
              <Text className="text-white font-semibold">下一個</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="flex-1 bg-green-500 rounded-xl p-4 items-center"
              onPress={handleSave}
              disabled={saving}
            >
              <Text className="text-white font-semibold">{saving ? "儲存中..." : "完成"}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
