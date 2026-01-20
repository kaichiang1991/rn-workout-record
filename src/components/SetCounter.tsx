import { View, Text, TouchableOpacity, Vibration } from "react-native";
import { useRef } from "react";

interface SetCounterProps {
  value: number;
  onChange: (value: number) => void;
}

export function SetCounter({ value, onChange }: SetCounterProps) {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef(false);

  const handlePress = () => {
    if (longPressTriggered.current) {
      return;
    }
    onChange(value + 1);
  };

  const handleLongPress = () => {
    longPressTriggered.current = true;
    if (value > 0) {
      Vibration.vibrate(50);
      onChange(value - 1);
    }
  };

  const handlePressIn = () => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      handleLongPress();
    }, 500);
  };

  const handlePressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <View className="items-center">
      <TouchableOpacity
        className="w-24 h-24 rounded-full bg-primary-500 items-center justify-center shadow-lg"
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <Text className="text-white text-4xl font-bold">{value}</Text>
      </TouchableOpacity>
      <Text className="text-gray-600 text-base mt-1">組</Text>
      <Text className="text-gray-400 text-xs mt-0.5">點擊 +1 ｜ 長按 -1</Text>
    </View>
  );
}
