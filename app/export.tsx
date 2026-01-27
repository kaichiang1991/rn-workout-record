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
import { ExportChart } from "@/components/export/ExportChart";
import { ExportTextPreview, generateExportText } from "@/components/export/ExportTextPreview";
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
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    const data = await fetchExportData(startDate, endDate);
    setExportData(data);
  };

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
      setSelectedPreset(-1); // 取消預設選擇
      // 確保開始日期不大於結束日期
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
      // 確保結束日期不小於開始日期
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
        // 截圖分享
        if (chartRef.current) {
          const uri = await captureRef(chartRef, {
            format: "png",
            quality: 1,
          });

          // 檢查是否可以分享
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri);
          } else {
            Alert.alert("無法分享", "此裝置不支援分享功能");
          }
        }
      } else {
        // 文字分享 - 使用 React Native 的 Share API
        const text = generateExportText(exportData.stats, exportData.dailyDetails);

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
                <View className="rounded-xl overflow-hidden shadow-sm">
                  <ExportChart ref={chartRef} stats={exportData.stats} />
                </View>
              ) : (
                <ExportTextPreview
                  stats={exportData.stats}
                  dailyDetails={exportData.dailyDetails}
                />
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
