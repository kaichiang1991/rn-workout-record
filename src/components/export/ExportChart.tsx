import { View, Text } from "react-native";
import { forwardRef } from "react";
import type { ExportStats, ExerciseExportStat } from "@/hooks/useExportData";
import { formatExportSummary, formatExerciseStat } from "@/utils/exportFormat";

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

// 時間型長條：每 100 分鐘為一輪，超過就以下一個顏色疊加
const MINUTES_PER_LAP = 100;

const barTrackStyle = {
  height: 20,
  backgroundColor: "#f3f4f6",
  borderRadius: 10,
  overflow: "hidden",
} as const;

// 時間型：長度以 100 分鐘為單位，超過 100 分鐘就換下一個顏色疊上去
function DurationBar({ totalSeconds, index }: { totalSeconds: number; index: number }) {
  const minutes = totalSeconds / 60;
  const laps = Math.floor(minutes / MINUTES_PER_LAP);
  const remainderPct = ((minutes % MINUTES_PER_LAP) / MINUTES_PER_LAP) * 100;
  // 每一輪依序取用顏色，從該項目自己的顏色開始輪替
  const colorAt = (lap: number) => COLORS[(index + lap) % COLORS.length];

  return (
    <View style={barTrackStyle}>
      {/* 已滿的上一輪鋪滿整條當底色 */}
      {laps > 0 && (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: "100%",
            backgroundColor: colorAt(laps - 1),
          }}
        />
      )}
      {/* 目前這一輪的進度疊在上面 */}
      {remainderPct > 0 && (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${laps === 0 ? Math.max(remainderPct, 5) : remainderPct}%`,
            backgroundColor: colorAt(laps),
            borderTopRightRadius: 10,
            borderBottomRightRadius: 10,
          }}
        />
      )}
    </View>
  );
}

// 次數型：以最大組數為基準的相對比例
function SetsBar({
  exercise,
  maxSets,
  index,
}: {
  exercise: ExerciseExportStat;
  maxSets: number;
  index: number;
}) {
  const barWidth = (exercise.totalSets / maxSets) * 100;
  return (
    <View style={barTrackStyle}>
      <View
        style={{
          height: "100%",
          width: `${Math.max(barWidth, 5)}%`,
          backgroundColor: COLORS[index % COLORS.length],
          borderRadius: 10,
        }}
      />
    </View>
  );
}

// 全部使用 inline style，確保 react-native-view-shot 截圖正確
export const ExportChart = forwardRef<View, ExportChartProps>(({ stats }, ref) => {
  const { startDate, endDate, exerciseStats } = stats;

  // 找出最大組數用於計算長條比例
  const maxSets = Math.max(...exerciseStats.map((e) => e.totalSets), 1);

  // 格式化日期顯示
  const formatDate = (dateStr: string) => {
    return dateStr.replace(/-/g, "/");
  };

  if (exerciseStats.length === 0) {
    return (
      <View
        ref={ref}
        collapsable={false}
        style={{ backgroundColor: "#ffffff", borderRadius: 12, padding: 24 }}
      >
        <Text style={{ color: "#6b7280", textAlign: "center" }}>此時段內沒有訓練紀錄</Text>
      </View>
    );
  }

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{ backgroundColor: "#ffffff", borderRadius: 12, padding: 16 }}
    >
      {/* 標題區 */}
      <Text
        style={{
          fontSize: 20,
          fontWeight: "bold",
          color: "#1f2937",
          textAlign: "center",
          marginBottom: 4,
        }}
      >
        訓練統計
      </Text>
      <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 8 }}>
        {formatDate(startDate)} ~ {formatDate(endDate)}
      </Text>
      <Text style={{ fontSize: 14, color: "#4b5563", textAlign: "center", marginBottom: 16 }}>
        {formatExportSummary(stats)}
      </Text>

      {/* 分隔線 */}
      <View style={{ height: 1, backgroundColor: "#e5e7eb", marginBottom: 16 }} />

      {/* 長條圖區 */}
      {exerciseStats.map((exercise, index) => {
        const isTimeMode = exercise.totalDuration > 0 && exercise.totalSets === 0;

        return (
          <View key={exercise.exerciseId} style={{ marginBottom: 12 }}>
            {/* 項目名稱 */}
            <View
              style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}
            >
              <Text style={{ color: "#374151" }} numberOfLines={1}>
                {exercise.exerciseName}
              </Text>
              <Text style={{ color: "#6b7280", fontSize: 14 }}>{formatExerciseStat(exercise)}</Text>
            </View>

            {/* 長條 */}
            {isTimeMode ? (
              <DurationBar totalSeconds={exercise.totalDuration} index={index} />
            ) : (
              <SetsBar exercise={exercise} maxSets={maxSets} index={index} />
            )}
          </View>
        );
      })}

      {/* 底部浮水印 */}
      <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6" }}>
        <Text style={{ color: "#9ca3af", fontSize: 12, textAlign: "center" }}>
          Workout Record App
        </Text>
      </View>
    </View>
  );
});

ExportChart.displayName = "ExportChart";
