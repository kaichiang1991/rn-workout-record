import { View, Text, Switch } from "react-native";
import { useSettingsStore } from "@/store/settingsStore";

export default function SettingsScreen() {
  const restTimerEnabled = useSettingsStore((s) => s.restTimerEnabled);
  const toggleRestTimer = useSettingsStore((s) => s.toggleRestTimer);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white mt-4 mx-4 rounded-xl px-4">
        <View className="flex-row items-center justify-between py-4">
          <Text className="text-base text-gray-800">組間計時</Text>
          <Switch
            value={restTimerEnabled}
            onValueChange={toggleRestTimer}
            trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
            thumbColor={restTimerEnabled ? "#3b82f6" : "#f4f3f4"}
          />
        </View>
      </View>
    </View>
  );
}
