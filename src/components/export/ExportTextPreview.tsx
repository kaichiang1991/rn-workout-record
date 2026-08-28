import { View, Text, ScrollView } from "react-native";
import type { ExportStats, DailyDetail } from "@/hooks/useExportData";
import { formatExportSummary, formatDetailItem } from "@/utils/exportFormat";

interface ExportTextPreviewProps {
  stats: ExportStats;
  dailyDetails: DailyDetail[];
}

export function ExportTextPreview({ stats, dailyDetails }: ExportTextPreviewProps) {
  const { startDate, endDate } = stats;

  // 格式化日期顯示
  const formatDate = (dateStr: string) => {
    return dateStr.replace(/-/g, "/");
  };

  if (dailyDetails.length === 0) {
    return (
      <View className="bg-white p-6 rounded-xl">
        <Text className="text-gray-500 text-center">此時段內沒有訓練紀錄</Text>
      </View>
    );
  }

  return (
    <ScrollView className="bg-white rounded-xl max-h-96">
      <View className="p-4">
        {/* 標題區 */}
        <View className="mb-3">
          <Text className="text-lg font-bold text-gray-800">訓練紀錄</Text>
          <Text className="text-gray-500 text-sm">
            {formatDate(startDate)} ~ {formatDate(endDate)}
          </Text>
          <Text className="text-gray-600 text-sm mt-1">{formatExportSummary(stats)}</Text>
        </View>

        {/* 每日明細 */}
        {dailyDetails.map((day) => (
          <View key={day.date} className="mb-4">
            {/* 日期標題 */}
            <View className="border-t border-gray-200 pt-3 mb-2">
              <Text className="text-gray-700 font-medium">
                {formatDate(day.date)}（{day.dayOfWeek}）
              </Text>
            </View>

            {/* 項目列表 */}
            {day.items.map((item, index) => (
              <View key={`${day.date}-${index}`} className="ml-2 mb-1">
                <Text className="text-gray-600">• {formatDetailItem(item)}</Text>
                {item.notes && <Text className="text-gray-400 text-xs ml-3">└ {item.notes}</Text>}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// 產生分享用的純文字
export function generateExportText(stats: ExportStats, dailyDetails: DailyDetail[]): string {
  const { startDate, endDate } = stats;

  const formatDate = (dateStr: string) => dateStr.replace(/-/g, "/");

  const lines: string[] = [
    "📋 訓練紀錄",
    `${formatDate(startDate)} ~ ${formatDate(endDate)}`,
    formatExportSummary(stats),
    "",
  ];

  for (const day of dailyDetails) {
    lines.push("────────────────────");
    lines.push(`📅 ${formatDate(day.date)}（${day.dayOfWeek}）`);
    lines.push("────────────────────");

    for (const item of day.items) {
      lines.push(`• ${formatDetailItem(item)}`);

      if (item.notes) {
        lines.push(`  └ ${item.notes}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}
