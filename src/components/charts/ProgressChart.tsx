import { View, Text, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";

interface ProgressChartProps {
  title: string;
  data: number[];
  labels: string[];
  yAxisSuffix?: string;
}

const screenWidth = Dimensions.get("window").width;

export function ProgressChart({ title, data, labels, yAxisSuffix = "" }: ProgressChartProps) {
  if (data.length === 0) {
    return (
      <View className="bg-white rounded-xl p-4">
        <Text className="text-lg font-bold text-gray-700 mb-3">{title}</Text>
        <View className="h-40 justify-center items-center">
          <Text className="text-gray-400">還沒有足夠的數據</Text>
        </View>
      </View>
    );
  }

  // 確保至少有 2 個數據點
  const chartData = data.length === 1 ? [data[0], data[0]] : data;
  const chartLabels = labels.length === 1 ? [labels[0], labels[0]] : labels;

  return (
    <View className="bg-white rounded-xl p-4">
      <Text className="text-lg font-bold text-gray-700 mb-3">{title}</Text>
      <LineChart
        data={{
          labels: chartLabels.slice(-6), // 最多顯示 6 個標籤
          datasets: [
            {
              data: chartData.slice(-6),
            },
          ],
        }}
        width={screenWidth - 64}
        height={180}
        yAxisSuffix={yAxisSuffix}
        chartConfig={{
          backgroundColor: "#ffffff",
          backgroundGradientFrom: "#ffffff",
          backgroundGradientTo: "#ffffff",
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: "#3b82f6",
          },
        }}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
      />
    </View>
  );
}
