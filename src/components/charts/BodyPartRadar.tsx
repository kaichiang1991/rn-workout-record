import { View, Text } from "react-native";
import Svg, { Polygon, Line, Circle, Text as SvgText } from "react-native-svg";
import { useBodyPartDistribution } from "@/hooks/useBodyPartDistribution";

export function BodyPartRadar() {
  const { data, isLoading, error } = useBodyPartDistribution();

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
        <Text className="text-red-500 text-center">載入失敗</Text>
      </View>
    );
  }

  // 找出最大值用於正規化
  const maxDays = Math.max(...data.map((d) => d.trainingDays), 1);

  // 雷達圖參數
  const size = 280;
  const center = size / 2;
  const radius = 100;
  const levels = 4;
  const angleStep = (2 * Math.PI) / data.length;

  // 計算多邊形頂點
  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2; // 從頂部開始
    const normalizedValue = (value / maxDays) * radius;
    return {
      x: center + normalizedValue * Math.cos(angle),
      y: center + normalizedValue * Math.sin(angle),
    };
  };

  // 資料多邊形的點
  const dataPoints = data.map((d, i) => getPoint(i, d.trainingDays));
  const dataPolygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // 背景網格的點（同心多邊形）
  const gridPolygons = Array.from({ length: levels }, (_, levelIndex) => {
    const levelRadius = ((levelIndex + 1) / levels) * radius;
    const points = data
      .map((_, i) => {
        const angle = angleStep * i - Math.PI / 2;
        return `${center + levelRadius * Math.cos(angle)},${center + levelRadius * Math.sin(angle)}`;
      })
      .join(" ");
    return points;
  });

  // 軸線的終點
  const axisEndPoints = data.map((_, i) => getPoint(i, maxDays));

  // 標籤位置（稍微偏移）
  const labelPoints = data.map((_, i) => {
    const angle = angleStep * i - Math.PI / 2;
    const labelRadius = radius + 25;
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle),
    };
  });

  return (
    <View className="bg-white rounded-xl p-4">
      <Text className="text-lg font-bold text-gray-800 mb-2">訓練分佈（近 4 週）</Text>

      <View className="items-center">
        <Svg width={size} height={size}>
          {/* 背景網格 */}
          {gridPolygons.map((points, i) => (
            <Polygon
              key={`grid-${i}`}
              points={points}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          ))}

          {/* 軸線 */}
          {axisEndPoints.map((point, i) => (
            <Line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={point.x}
              y2={point.y}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          ))}

          {/* 資料多邊形 */}
          <Polygon
            points={dataPolygonPoints}
            fill="rgba(59, 130, 246, 0.2)"
            stroke="#3b82f6"
            strokeWidth={2}
          />

          {/* 資料點 */}
          {dataPoints.map((point, i) => (
            <Circle key={`point-${i}`} cx={point.x} cy={point.y} r={4} fill={data[i].color} />
          ))}

          {/* 標籤 */}
          {labelPoints.map((point, i) => (
            <SvgText
              key={`label-${i}`}
              x={point.x}
              y={point.y}
              fontSize={12}
              fill="#374151"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {data[i].label}
            </SvgText>
          ))}
        </Svg>
      </View>

      {/* 圖例 */}
      <View className="flex-row flex-wrap justify-center mt-2 gap-x-4 gap-y-1">
        {data.map((item) => (
          <View key={item.bodyPart} className="flex-row items-center">
            <View className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: item.color }} />
            <Text className="text-gray-600 text-xs">
              {item.label}: {item.trainingDays}天
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
