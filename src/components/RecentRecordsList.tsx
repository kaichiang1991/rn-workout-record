import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { WorkoutSession } from "@/db/client";
import { DIFFICULTY_LEVELS } from "@/utils/constants";
import { formatSessionSummary } from "@/utils/tracking";
import { Icon } from "./Icon";

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
  const [collapsed, setCollapsed] = useState(false);

  // 切換運動項目（records 更新）時重新展開列表
  useEffect(() => {
    setCollapsed(false);
  }, [records]);

  if (records.length === 0) {
    return null;
  }

  return (
    <View className="mt-3 bg-white rounded-xl p-4">
      <TouchableOpacity
        className="flex-row items-center justify-between"
        onPress={() => setCollapsed((prev) => !prev)}
        activeOpacity={0.6}
      >
        <Text className="text-sm text-gray-500">最近紀錄（點選帶入）</Text>
        <Icon name={collapsed ? "chevron-down" : "chevron-up"} size={20} color="#9ca3af" />
      </TouchableOpacity>
      {!collapsed && (
        <View className="mt-3">
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
      )}
    </View>
  );
}
