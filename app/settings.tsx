import { View, Text, Switch, TextInput } from "react-native";
import { useSettingsStore } from "@/store/settingsStore";

export default function SettingsScreen() {
  const restTimerEnabled = useSettingsStore((s) => s.restTimerEnabled);
  const restTimerMinutes = useSettingsStore((s) => s.restTimerMinutes);
  const restTimerSeconds = useSettingsStore((s) => s.restTimerSeconds);
  const toggleRestTimer = useSettingsStore((s) => s.toggleRestTimer);
  const setRestTimerMinutes = useSettingsStore((s) => s.setRestTimerMinutes);
  const setRestTimerSeconds = useSettingsStore((s) => s.setRestTimerSeconds);

  const handleMinutesChange = (text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num)) {
      setRestTimerMinutes(num);
    } else if (text === "") {
      setRestTimerMinutes(0);
    }
  };

  const handleSecondsChange = (text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num)) {
      setRestTimerSeconds(num);
    } else if (text === "") {
      setRestTimerSeconds(0);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white mt-4 mx-4 rounded-xl px-4">
        {/* Rest timer toggle */}
        <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
          <Text className="text-base text-gray-800">組間計時</Text>
          <Switch
            value={restTimerEnabled}
            onValueChange={toggleRestTimer}
            trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
            thumbColor={restTimerEnabled ? "#3b82f6" : "#f4f3f4"}
          />
        </View>

        {/* Duration inputs - conditionally shown */}
        {restTimerEnabled && (
          <View className="flex-row items-center justify-between py-4 pl-4">
            <Text className="text-base text-gray-600">計時時間</Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                className="w-12 h-10 border border-gray-300 rounded-lg text-center text-base"
                value={String(restTimerMinutes)}
                onChangeText={handleMinutesChange}
                keyboardType="numeric"
                maxLength={1}
              />
              <Text className="text-base text-gray-600">分</Text>
              <TextInput
                className="w-12 h-10 border border-gray-300 rounded-lg text-center text-base"
                value={String(restTimerSeconds)}
                onChangeText={handleSecondsChange}
                keyboardType="numeric"
                maxLength={2}
              />
              <Text className="text-base text-gray-600">秒</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
