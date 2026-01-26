import { View, Text, TouchableOpacity } from "react-native";
import { WorkoutSession } from "@/db/client";
import { DIFFICULTY_LEVELS } from "@/utils/constants";
import { formatSessionSummary } from "@/utils/tracking";

interface RecentRecordsListProps {
  records: WorkoutSession[];
  onSelect: (record: WorkoutSession) => void;
}

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
          <Text className="text-gray-700 text-base">{formatSessionSummary(record)}</Text>
          <View
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: getDifficultyColor(record.difficulty) }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}
