import { View, Text, Pressable } from "react-native";
import { useState } from "react";
import Svg, { Path, Circle, Line, Text as SvgText } from "react-native-svg";
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

// 自訂 SVG 折線圖元件
function SimpleLineChart({
  data,
  width,
  height,
  color,
}: {
  data: { value: number; label: string }[];
  width: number;
  height: number;
  color: string;
}) {
  if (data.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  // 計算點的位置
  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1 || 1)) * chartWidth,
    y: padding.top + chartHeight - ((d.value - minValue) / valueRange) * chartHeight,
    value: d.value,
    label: d.label,
  }));

  // 建立路徑
  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");

  // 建立填充區域路徑
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  // Y 軸刻度
  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round(minValue + (valueRange / yTicks) * i)
  );

  return (
    <Svg width={width} height={height}>
      {/* Y 軸刻度線 */}
      {yTickValues.map((tick, i) => {
        const y = padding.top + chartHeight - ((tick - minValue) / valueRange) * chartHeight;
        return (
          <Line
            key={`grid-${i}`}
            x1={padding.left}
            y1={y}
            x2={width - padding.right}
            y2={y}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        );
      })}

      {/* Y 軸標籤 */}
      {yTickValues.map((tick, i) => {
        const y = padding.top + chartHeight - ((tick - minValue) / valueRange) * chartHeight;
        return (
          <SvgText
            key={`ytick-${i}`}
            x={padding.left - 8}
            y={y + 4}
            fontSize={10}
            fill="#6b7280"
            textAnchor="end"
          >
            {tick}
          </SvgText>
        );
      })}

      {/* 填充區域 */}
      <Path d={areaD} fill="rgba(59, 130, 246, 0.15)" />

      {/* 折線 */}
      <Path d={pathD} stroke={color} strokeWidth={2} fill="none" />

      {/* 資料點 */}
      {points.map((p, i) => (
        <Circle key={`point-${i}`} cx={p.x} cy={p.y} r={4} fill={color} />
      ))}

      {/* X 軸標籤（只顯示第一個和最後一個） */}
      {points.map((p, i) => {
        if (i !== 0 && i !== points.length - 1) return null;
        return (
          <SvgText
            key={`xlabel-${i}`}
            x={p.x}
            y={height - 8}
            fontSize={10}
            fill="#6b7280"
            textAnchor="middle"
          >
            {p.label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

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
            <Pressable
              key={option.key}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: metric === option.key ? "#fff" : "transparent",
              }}
              onPress={() => setMetric(option.key)}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: metric === option.key ? "#2563eb" : "#4b5563",
                  fontWeight: metric === option.key ? "500" : "400",
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 圖表 */}
      <View className="items-center">
        <SimpleLineChart data={chartData} width={300} height={200} color="#3b82f6" />
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
