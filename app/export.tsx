import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { useExportData, ExportData } from "@/hooks/useExportData";
import { Icon } from "@/components/Icon";

type ExportFormat = "chart" | "text";

interface DatePreset {
  label: string;
  getRange: () => { start: Date; end: Date };
}

const DATE_PRESETS: DatePreset[] = [
  {
    label: "今日",
    getRange: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return { start: today, end: today };
    },
  },
  {
    label: "7 天",
    getRange: () => {
      const end = new Date();
      end.setHours(0, 0, 0, 0);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { start, end };
    },
  },
  {
    label: "30 天",
    getRange: () => {
      const end = new Date();
      end.setHours(0, 0, 0, 0);
      const start = new Date(end);
      start.setDate(start.getDate() - 29);
      return { start, end };
    },
  },
  {
    label: "本月",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date();
      end.setHours(0, 0, 0, 0);
      return { start, end };
    },
  },
  {
    label: "上個月",
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start, end };
    },
  },
];

export default function ExportScreen() {
  const { fetchExportData, loading } = useExportData();
  const chartRef = useRef<View>(null);

  // 日期選擇狀態
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [startDate, setStartDate] = useState<Date>(() => DATE_PRESETS[0].getRange().start);
  const [endDate, setEndDate] = useState<Date>(() => DATE_PRESETS[0].getRange().end);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // 格式選擇
  const [format, setFormat] = useState<ExportFormat>("chart");

  // 資料
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [sharing, setSharing] = useState(false);

  // 當日期變更時重新載入資料
  useEffect(() => {
    const loadData = async () => {
      const data = await fetchExportData(startDate, endDate);
      setExportData(data);
    };
    loadData();
  }, [fetchExportData, startDate, endDate]);

  const handlePresetSelect = (index: number) => {
    setSelectedPreset(index);
    const { start, end } = DATE_PRESETS[index].getRange();
    setStartDate(start);
    setEndDate(end);
  };

  const handleStartDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowStartPicker(Platform.OS === "ios");
    if (date) {
      setStartDate(date);
      setSelectedPreset(-1);
      if (date > endDate) {
        setEndDate(date);
      }
    }
  };

  const handleEndDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowEndPicker(Platform.OS === "ios");
    if (date) {
      setEndDate(date);
      setSelectedPreset(-1);
      if (date < startDate) {
        setStartDate(date);
      }
    }
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handleShare = async () => {
    if (!exportData) return;

    try {
      setSharing(true);

      if (format === "chart") {
        if (chartRef.current) {
          const uri = await captureRef(chartRef, {
            format: "png",
            quality: 1,
          });

          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri);
          } else {
            Alert.alert("無法分享", "此裝置不支援分享功能");
          }
        }
      } else {
        // 文字分享
        const text = generateExportText(exportData);
        await Share.share({
          message: text,
          title: "訓練紀錄",
        });
      }
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("分享失敗", "請稍後再試");
    } finally {
      setSharing(false);
    }
  };

  // 產生匯出文字
  const generateExportText = (data: ExportData): string => {
    const { stats, dailyDetails } = data;
    const formatDate = (dateStr: string) => dateStr.replace(/-/g, "/");

    const lines: string[] = [
      "📋 訓練紀錄",
      `${formatDate(stats.startDate)} ~ ${formatDate(stats.endDate)}`,
      `共訓練 ${stats.totalDays} 天 ｜ 總計 ${stats.totalSets} 組`,
      "",
    ];

    for (const day of dailyDetails) {
      lines.push("────────────────────");
      lines.push(`📅 ${formatDate(day.date)}（${day.dayOfWeek}）`);
      lines.push("────────────────────");

      for (const item of day.items) {
        let line = `• ${item.exerciseName}｜${item.sets}組 × ${item.reps}下`;
        if (item.weight != null && item.weight > 0) {
          line += `｜${item.weight}kg`;
        }
        lines.push(line);

        if (item.notes) {
          lines.push(`  └ ${item.notes}`);
        }
      }

      lines.push("");
    }

    return lines.join("\n");
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="p-4">
          {/* 日期選擇區 */}
          <View className="bg-white rounded-xl p-4 mb-4">
            <Text className="text-gray-700 font-medium mb-3">選擇時段</Text>

            {/* 快捷選項 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              <View className="flex-row gap-2">
                {DATE_PRESETS.map((preset, index) => (
                  <TouchableOpacity
                    key={preset.label}
                    className={`px-4 py-2 rounded-full ${
                      selectedPreset === index ? "bg-primary-500" : "bg-gray-100"
                    }`}
                    onPress={() => handlePresetSelect(index)}
                  >
                    <Text
                      className={
                        selectedPreset === index ? "text-white font-medium" : "text-gray-600"
                      }
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* 自訂日期 */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
                onPress={() => setShowStartPicker(true)}
              >
                <Text className="text-gray-500 text-sm">起始</Text>
                <Text className="text-gray-700">{formatDateDisplay(startDate)}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 flex-row items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
                onPress={() => setShowEndPicker(true)}
              >
                <Text className="text-gray-500 text-sm">結束</Text>
                <Text className="text-gray-700">{formatDateDisplay(endDate)}</Text>
              </TouchableOpacity>
            </View>

            {/* 日期選擇器 */}
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleStartDateChange}
                maximumDate={new Date()}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleEndDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>

          {/* 格式選擇區 */}
          <View className="bg-white rounded-xl p-4 mb-4">
            <Text className="text-gray-700 font-medium mb-3">匯出格式</Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className={`flex-1 flex-row items-center justify-center py-3 rounded-lg border-2 ${
                  format === "chart"
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-200 bg-white"
                }`}
                onPress={() => setFormat("chart")}
              >
                <Icon name="chart" size={20} color={format === "chart" ? "#3b82f6" : "#9ca3af"} />
                <Text
                  className={`ml-2 font-medium ${
                    format === "chart" ? "text-primary-600" : "text-gray-500"
                  }`}
                >
                  圖表
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 flex-row items-center justify-center py-3 rounded-lg border-2 ${
                  format === "text"
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-200 bg-white"
                }`}
                onPress={() => setFormat("text")}
              >
                <Icon
                  name="file-text"
                  size={20}
                  color={format === "text" ? "#3b82f6" : "#9ca3af"}
                />
                <Text
                  className={`ml-2 font-medium ${
                    format === "text" ? "text-primary-600" : "text-gray-500"
                  }`}
                >
                  文字
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 預覽區 */}
          <View className="mb-4">
            <Text className="text-gray-700 font-medium mb-3">預覽</Text>

            {loading ? (
              <View className="bg-white rounded-xl p-8 items-center">
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text className="text-gray-500 mt-2">載入中...</Text>
              </View>
            ) : exportData ? (
              format === "chart" ? (
                <View ref={chartRef} className="bg-white rounded-xl p-4">
                  {/* 簡化的圖表預覽 */}
                  <Text className="text-xl font-bold text-gray-800 text-center mb-1">訓練統計</Text>
                  <Text className="text-gray-500 text-center text-sm mb-2">
                    {exportData.stats.startDate.replace(/-/g, "/")} ~{" "}
                    {exportData.stats.endDate.replace(/-/g, "/")}
                  </Text>
                  <Text className="text-gray-600 text-center mb-4">
                    共訓練 {exportData.stats.totalDays} 天 ｜ 總計 {exportData.stats.totalSets} 組
                  </Text>
                  <View className="h-px bg-gray-200 mb-4" />
                  {exportData.stats.exerciseStats.slice(0, 5).map((exercise, index) => {
                    const maxSets = Math.max(
                      ...exportData.stats.exerciseStats.map((e) => e.totalSets),
                      1
                    );
                    const barWidth = (exercise.totalSets / maxSets) * 100;
                    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
                    return (
                      <View key={exercise.exerciseId} className="mb-3">
                        <View className="flex-row justify-between mb-1">
                          <Text className="text-gray-700">{exercise.exerciseName}</Text>
                          <Text className="text-gray-500 text-sm">
                            {exercise.totalSets}組 / {exercise.totalReps}下
                          </Text>
                        </View>
                        <View className="h-5 bg-gray-100 rounded-full overflow-hidden">
                          <View
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(barWidth, 5)}%`,
                              backgroundColor: colors[index % colors.length],
                            }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <ScrollView className="bg-white rounded-xl max-h-96">
                  <View className="p-4">
                    <Text className="text-lg font-bold text-gray-800">訓練紀錄</Text>
                    <Text className="text-gray-500 text-sm">
                      {exportData.stats.startDate.replace(/-/g, "/")} ~{" "}
                      {exportData.stats.endDate.replace(/-/g, "/")}
                    </Text>
                    <Text className="text-gray-600 text-sm mt-1 mb-3">
                      共訓練 {exportData.stats.totalDays} 天 ｜ 總計 {exportData.stats.totalSets} 組
                    </Text>
                    {exportData.dailyDetails.map((day) => (
                      <View key={day.date} className="mb-4">
                        <View className="border-t border-gray-200 pt-3 mb-2">
                          <Text className="text-gray-700 font-medium">
                            {day.date.replace(/-/g, "/")}（{day.dayOfWeek}）
                          </Text>
                        </View>
                        {day.items.map((item, index) => (
                          <View key={`${day.date}-${index}`} className="ml-2 mb-1">
                            <Text className="text-gray-600">
                              • {item.exerciseName}｜{item.sets}組 × {item.reps}下
                              {item.weight != null && item.weight > 0 && `｜${item.weight}kg`}
                            </Text>
                            {item.notes && (
                              <Text className="text-gray-400 text-xs ml-3">└ {item.notes}</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )
            ) : (
              <View className="bg-white rounded-xl p-8 items-center">
                <Text className="text-gray-500">無法載入資料</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 分享按鈕 */}
      <View className="p-4 bg-white border-t border-gray-200">
        <TouchableOpacity
          className={`py-4 rounded-xl items-center ${
            exportData && !sharing ? "bg-primary-500" : "bg-gray-300"
          }`}
          onPress={handleShare}
          disabled={!exportData || sharing}
        >
          {sharing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View className="flex-row items-center">
              <Icon name="share" size={20} color="#fff" />
              <Text className="text-white font-bold text-lg ml-2">分享</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
