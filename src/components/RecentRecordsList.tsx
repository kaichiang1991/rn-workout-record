import { View, Text, TouchableOpacity } from "react-native";
import { WorkoutSession } from "@/db/client";
import { DIFFICULTY_LEVELS } from "@/utils/constants";

interface RecentRecordsListProps {
  records: WorkoutSession[];
  onSelect: (record: WorkoutSession) => void;
}

const formatRecord = (record: WorkoutSession): string => {
  const parts: string[] = [];

  // 重量（自體重量則省略）
  if (!record.isBodyweight && record.weight) {
    parts.push(`${record.weight}kg`);
  }

  // 次數
  if (record.reps) {
    parts.push(`${record.reps}下`);
  }

  // 組數
  if (record.setCount) {
    parts.push(`${record.setCount}組`);
  }

  return parts.join(" × ");
};

const getDifficultyColor = (difficulty: number | null): string => {
  if (!difficulty) return "#9ca3af";
  const level = DIFFICULTY_LEVELS.find((l) => l.value === difficulty);
  return level?.color || "#9ca3af";
};

export function RecentRecordsList({ records, onSelect }: RecentRecordsListProps) {
  if (records.length === 0) {
    return null;
  }

  return (
    <View className="mt-3 bg-white rounded-xl p-4">
      <Text className="text-sm text-gray-500 mb-3">最近紀錄（點選帶入）</Text>
      {records.map((record) => (
        <TouchableOpacity
          key={record.id}
          className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
          onPress={() => onSelect(record)}
          activeOpacity={0.6}
        >
          <Text className="text-gray-700 text-base">{formatRecord(record)}</Text>
          <View
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: getDifficultyColor(record.difficulty) }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}
