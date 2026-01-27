import { View, Text } from "react-native";
import { forwardRef } from "react";
import type { ExportStats } from "@/hooks/useExportData";

interface ExportChartProps {
  stats: ExportStats;
}

// 預設顏色組
const COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

export const ExportChart = forwardRef<View, ExportChartProps>(({ stats }, ref) => {
  const { startDate, endDate, totalDays, totalSets, exerciseStats } = stats;

  // 找出最大組數用於計算長條比例
  const maxSets = Math.max(...exerciseStats.map((e) => e.totalSets), 1);

  // 格式化日期顯示
  const formatDate = (dateStr: string) => {
    return dateStr.replace(/-/g, "/");
  };

  if (exerciseStats.length === 0) {
    return (
      <View ref={ref} className="bg-white p-6 rounded-xl">
        <Text className="text-gray-500 text-center">此時段內沒有訓練紀錄</Text>
      </View>
    );
  }

  return (
    <View ref={ref} className="bg-white p-5">
      {/* 標題區 */}
      <View className="mb-4">
        <Text className="text-xl font-bold text-gray-800 text-center mb-1">訓練統計</Text>
        <Text className="text-gray-500 text-center text-sm">
          {formatDate(startDate)} ~ {formatDate(endDate)}
        </Text>
        <Text className="text-gray-600 text-center mt-2">
          共訓練 <Text className="font-bold text-primary-600">{totalDays}</Text> 天{" ｜ "}
          總計 <Text className="font-bold text-primary-600">{totalSets}</Text> 組
        </Text>
      </View>

      {/* 分隔線 */}
      <View className="h-px bg-gray-200 my-3" />

      {/* 長條圖區 */}
      <View className="mt-2">
        {exerciseStats.map((exercise, index) => {
          const barWidth = (exercise.totalSets / maxSets) * 100;
          const color = COLORS[index % COLORS.length];

          return (
            <View key={exercise.exerciseId} className="mb-3">
              {/* 項目名稱 */}
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-gray-700 font-medium" numberOfLines={1}>
                  {exercise.exerciseName}
                </Text>
                <Text className="text-gray-500 text-sm">
                  {exercise.totalSets}組 / {exercise.totalReps}下
                </Text>
              </View>

              {/* 長條 */}
              <View className="h-6 bg-gray-100 rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(barWidth, 5)}%`,
                    backgroundColor: color,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* 底部浮水印 */}
      <View className="mt-4 pt-3 border-t border-gray-100">
        <Text className="text-gray-400 text-xs text-center">Workout Record App</Text>
      </View>
    </View>
  );
});

ExportChart.displayName = "ExportChart";
