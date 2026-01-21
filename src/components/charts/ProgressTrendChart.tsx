import { View, Text, TouchableOpacity } from "react-native";
import { useState } from "react";
import { LineChart } from "react-native-gifted-charts";
import { useProgressTrend, ProgressDataPoint } from "@/hooks/useProgressTrend";

type MetricType = "maxWeight" | "volume" | "estimated1RM";

interface ProgressTrendChartProps {
  exerciseId: number;
  startDate: string;
  endDate: string;
}

const METRIC_OPTIONS: { key: MetricType; label: string; unit: string }[] = [
  { key: "maxWeight", label: "最大重量", unit: "kg" },
  { key: "volume", label: "訓練量", unit: "kg" },
  { key: "estimated1RM", label: "估算 1RM", unit: "kg" },
];

export function ProgressTrendChart({ exerciseId, startDate, endDate }: ProgressTrendChartProps) {
  const [metric, setMetric] = useState<MetricType>("maxWeight");
  const { data, isLoading, error } = useProgressTrend({
    exerciseId,
    startDate,
    endDate,
  });

  const formatChartData = (rawData: ProgressDataPoint[], selectedMetric: MetricType) => {
    return rawData.map((point, index) => ({
      value: point[selectedMetric],
      label: index === 0 || index === rawData.length - 1 ? point.date.slice(5) : "",
      dataPointText: point[selectedMetric].toString(),
    }));
  };

  const chartData = formatChartData(data, metric);
  const currentOption = METRIC_OPTIONS.find((opt) => opt.key === metric);

  if (isLoading) {
    return (
      <View className="bg-white rounded-xl p-4">
        <Text className="text-gray-500 text-center">載入中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="bg-white rounded-xl p-4">
        <Text className="text-red-500 text-center">載入失敗：{error.message}</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View className="bg-white rounded-xl p-6">
        <Text className="text-gray-500 text-center">此期間沒有紀錄</Text>
        <Text className="text-gray-400 text-center text-sm mt-1">試著調整日期範圍看看</Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-xl p-4">
      {/* 指標選擇器 */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-bold text-gray-800">進步趨勢</Text>
        <View className="flex-row bg-gray-100 rounded-lg p-1">
          {METRIC_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              className={`px-3 py-1.5 rounded-md ${
                metric === option.key ? "bg-white shadow-sm" : ""
              }`}
              onPress={() => setMetric(option.key)}
            >
              <Text
                className={`text-sm ${
                  metric === option.key ? "text-primary-600 font-medium" : "text-gray-600"
                }`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 圖表 */}
      <View className="items-center">
        <LineChart
          data={chartData}
          width={280}
          height={200}
          spacing={data.length > 10 ? 25 : 40}
          color="#3b82f6"
          thickness={2}
          dataPointsColor="#3b82f6"
          dataPointsRadius={4}
          startFillColor="rgba(59, 130, 246, 0.2)"
          endFillColor="rgba(59, 130, 246, 0.01)"
          areaChart
          curved
          yAxisTextStyle={{ color: "#6b7280", fontSize: 10 }}
          xAxisLabelTextStyle={{ color: "#6b7280", fontSize: 10 }}
          hideRules
          yAxisColor="transparent"
          xAxisColor="#e5e7eb"
        />
      </View>

      {/* 統計摘要 */}
      {data.length > 1 && (
        <View className="flex-row justify-around mt-4 pt-4 border-t border-gray-100">
          <View className="items-center">
            <Text className="text-gray-500 text-xs">起始</Text>
            <Text className="text-gray-800 font-medium">
              {data[0][metric]} {currentOption?.unit}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-500 text-xs">最新</Text>
            <Text className="text-gray-800 font-medium">
              {data[data.length - 1][metric]} {currentOption?.unit}
            </Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-500 text-xs">變化</Text>
            <Text
              className={`font-medium ${
                data[data.length - 1][metric] >= data[0][metric] ? "text-green-600" : "text-red-600"
              }`}
            >
              {data[data.length - 1][metric] >= data[0][metric] ? "+" : ""}
              {(data[data.length - 1][metric] - data[0][metric]).toFixed(1)} {currentOption?.unit}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
