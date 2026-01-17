import { View, Text, TouchableOpacity } from "react-native";
import { DIFFICULTY_LEVELS } from "@/utils/constants";

interface DifficultySelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  return (
    <View className="flex-row justify-around bg-white rounded-xl p-4">
      {DIFFICULTY_LEVELS.map((level) => (
        <TouchableOpacity
          key={level.value}
          className={`items-center p-2 rounded-lg ${value === level.value ? "bg-gray-100" : ""}`}
          onPress={() => onChange(level.value)}
        >
          <View className="w-7 h-7 rounded-full mb-1" style={{ backgroundColor: level.color }} />
          <Text
            className={`text-xs ${
              value === level.value ? "font-bold text-gray-800" : "text-gray-500"
            }`}
          >
            {level.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
