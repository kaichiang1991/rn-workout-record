# 數據視覺化功能實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 新增進步趨勢圖和訓練分佈雷達圖，讓用戶能夠視覺化追蹤運動進度和訓練均衡度。

**Architecture:** 使用 react-native-gifted-charts 取代現有的 chart-kit。新增兩個 hooks 處理資料查詢，兩個圖表元件處理渲染。進步趨勢圖放在獨立頁面，雷達圖整合到首頁。

**Tech Stack:** React Native, Expo, react-native-gifted-charts, @react-native-community/datetimepicker, SQLite

---

## Task 1: 環境準備 - 套件變更

**Files:**

- Modify: `package.json`

**Step 1: 移除舊的圖表套件**

```bash
npm uninstall react-native-chart-kit
```

**Step 2: 安裝新的圖表套件**

```bash
npm install react-native-gifted-charts@^1.4.52
```

**Step 3: 安裝日期選擇器**

```bash
npm install @react-native-community/datetimepicker@^8.3.0
```

**Step 4: 驗證安裝成功**

Run: `npm run typecheck`
Expected: 通過（可能有未使用的 import 警告，稍後處理）

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: 更換圖表套件為 gifted-charts，新增 datetimepicker"
```

---

## Task 2: 移除舊圖表元件的引用

**Files:**

- Delete: `src/components/charts/ProgressChart.tsx`（如果存在）
- Review: 確認沒有其他檔案引用 react-native-chart-kit

**Step 1: 檢查是否有舊圖表元件**

```bash
ls src/components/charts/
```

**Step 2: 搜尋 chart-kit 引用**

```bash
grep -r "react-native-chart-kit" src/ app/
```

**Step 3: 若有引用，移除相關檔案和 import**

若 `ProgressChart.tsx` 存在且使用 chart-kit，刪除它。

**Step 4: 驗證**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit（如有變更）**

```bash
git add -A
git commit -m "chore: 移除 react-native-chart-kit 相關引用"
```

---

## Task 3: 建立 useProgressTrend Hook

**Files:**

- Create: `src/hooks/useProgressTrend.ts`

**Step 1: 建立型別定義和 Hook 骨架**

```typescript
import { useState, useCallback } from "react";
import { getDatabase, WorkoutSession, WorkoutSet } from "@/db/client";

export interface ProgressDataPoint {
  date: string;
  maxWeight: number;
  volume: number;
  estimated1RM: number;
}

interface UseProgressTrendParams {
  exerciseId: number;
  startDate: string;
  endDate: string;
}

interface UseProgressTrendResult {
  data: ProgressDataPoint[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useProgressTrend({
  exerciseId,
  startDate,
  endDate,
}: UseProgressTrendParams): UseProgressTrendResult {
  const [data, setData] = useState<ProgressDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!exerciseId || !startDate || !endDate) return;

    setIsLoading(true);
    setError(null);

    try {
      const db = await getDatabase();

      // 查詢指定日期範圍內的 sessions
      const sessions = await db.getAllAsync<WorkoutSession>(
        `SELECT * FROM workout_sessions
         WHERE exerciseId = ? AND date >= ? AND date <= ?
         ORDER BY date ASC`,
        [exerciseId, startDate, endDate]
      );

      const dataPoints: ProgressDataPoint[] = [];

      for (const session of sessions) {
        // 取得該 session 的所有 sets
        const sets = await db.getAllAsync<WorkoutSet>(
          "SELECT * FROM workout_sets WHERE sessionId = ?",
          [session.id]
        );

        // 計算指標
        let maxWeight = session.weight || 0;
        let totalVolume = 0;
        let bestEstimated1RM = 0;

        if (sets.length > 0) {
          for (const set of sets) {
            const weight = set.weight || 0;
            const reps = set.reps || 0;

            if (weight > maxWeight) maxWeight = weight;
            totalVolume += weight * reps;

            // Epley 公式計算 1RM
            if (weight > 0 && reps > 0) {
              const estimated1RM = weight * (1 + reps / 30);
              if (estimated1RM > bestEstimated1RM) bestEstimated1RM = estimated1RM;
            }
          }
        } else {
          // 沒有 sets 資料時，使用 session 的資料
          const weight = session.weight || 0;
          const reps = session.reps || 0;
          const setCount = session.setCount || 1;
          totalVolume = weight * reps * setCount;
          if (weight > 0 && reps > 0) {
            bestEstimated1RM = weight * (1 + reps / 30);
          }
        }

        dataPoints.push({
          date: session.date.split("T")[0],
          maxWeight,
          volume: totalVolume,
          estimated1RM: Math.round(bestEstimated1RM * 10) / 10,
        });
      }

      setData(dataPoints);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [exerciseId, startDate, endDate]);

  // 初始載入
  useState(() => {
    fetchData();
  });

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
```

**Step 2: 驗證型別正確**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/hooks/useProgressTrend.ts
git commit -m "feat: 新增 useProgressTrend hook 計算進步趨勢資料"
```

---

## Task 4: 建立 useBodyPartDistribution Hook

**Files:**

- Create: `src/hooks/useBodyPartDistribution.ts`

**Step 1: 建立 Hook**

```typescript
import { useState, useEffect, useCallback } from "react";
import { getDatabase } from "@/db/client";
import { BODY_PARTS, BodyPartKey } from "@/utils/constants";

export interface BodyPartStat {
  bodyPart: BodyPartKey;
  label: string;
  trainingDays: number;
  color: string;
}

interface UseBodyPartDistributionResult {
  data: BodyPartStat[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useBodyPartDistribution(): UseBodyPartDistributionResult {
  const [data, setData] = useState<BodyPartStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const db = await getDatabase();

      // 計算 4 週前的日期
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      const startDate = fourWeeksAgo.toISOString().split("T")[0];

      // 查詢近 4 週每個身體部位的訓練天數
      const results = await db.getAllAsync<{ bodyPart: string; trainingDays: number }>(
        `SELECT
           ebp.bodyPart,
           COUNT(DISTINCT DATE(ws.date)) as trainingDays
         FROM workout_sessions ws
         JOIN exercise_body_parts ebp ON ws.exerciseId = ebp.exerciseId
         WHERE DATE(ws.date) >= ?
         GROUP BY ebp.bodyPart`,
        [startDate]
      );

      // 建立完整的資料陣列（包含沒有訓練的部位）
      const statsMap = new Map<string, number>();
      for (const result of results) {
        statsMap.set(result.bodyPart, result.trainingDays);
      }

      const allStats: BodyPartStat[] = Object.entries(BODY_PARTS).map(([key, value]) => ({
        bodyPart: key as BodyPartKey,
        label: value.label,
        trainingDays: statsMap.get(key) || 0,
        color: value.color,
      }));

      setData(allStats);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
```

**Step 2: 驗證型別正確**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/hooks/useBodyPartDistribution.ts
git commit -m "feat: 新增 useBodyPartDistribution hook 計算訓練分佈"
```

---

## Task 5: 建立 ProgressTrendChart 元件

**Files:**

- Create: `src/components/charts/ProgressTrendChart.tsx`

**Step 1: 建立元件**

```typescript
import { View, Text, TouchableOpacity } from "react-native";
import { useState, useEffect } from "react";
import { LineChart } from "react-native-gifted-charts";
import { useProgressTrend, ProgressDataPoint } from "@/hooks/useProgressTrend";

type MetricType = "maxWeight" | "volume" | "estimated1RM";

interface ProgressTrendChartProps {
  exerciseId: number;
  exerciseName: string;
  startDate: string;
  endDate: string;
}

const METRIC_OPTIONS: { key: MetricType; label: string; unit: string }[] = [
  { key: "maxWeight", label: "最大重量", unit: "kg" },
  { key: "volume", label: "訓練量", unit: "kg" },
  { key: "estimated1RM", label: "估算 1RM", unit: "kg" },
];

export function ProgressTrendChart({
  exerciseId,
  exerciseName,
  startDate,
  endDate,
}: ProgressTrendChartProps) {
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
        <Text className="text-gray-400 text-center text-sm mt-1">
          試著調整日期範圍看看
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-xl p-4">
      {/* 指標選擇器 */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-bold text-gray-800">📈 進步趨勢</Text>
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
          width={300}
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
          pointerConfig={{
            pointerStripColor: "#3b82f6",
            pointerStripWidth: 1,
            pointerColor: "#3b82f6",
            radius: 6,
            pointerLabelWidth: 100,
            pointerLabelHeight: 40,
            pointerLabelComponent: (items: { value: number }[]) => (
              <View className="bg-gray-800 px-3 py-1.5 rounded-lg">
                <Text className="text-white text-sm font-medium">
                  {items[0].value} {currentOption?.unit}
                </Text>
              </View>
            ),
          }}
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
                data[data.length - 1][metric] >= data[0][metric]
                  ? "text-green-600"
                  : "text-red-600"
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
```

**Step 2: 驗證型別正確**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/charts/ProgressTrendChart.tsx
git commit -m "feat: 新增 ProgressTrendChart 折線圖元件"
```

---

## Task 6: 建立 BodyPartRadar 元件

**Files:**

- Create: `src/components/charts/BodyPartRadar.tsx`

**Step 1: 建立元件**

```typescript
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
      <Text className="text-lg font-bold text-gray-800 mb-2">🎯 訓練分佈（近 4 週）</Text>

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
            <Circle
              key={`point-${i}`}
              cx={point.x}
              cy={point.y}
              r={4}
              fill={data[i].color}
            />
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
            <View
              className="w-3 h-3 rounded-full mr-1"
              style={{ backgroundColor: item.color }}
            />
            <Text className="text-gray-600 text-xs">
              {item.label}: {item.trainingDays}天
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
```

**Step 2: 驗證型別正確**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/charts/BodyPartRadar.tsx
git commit -m "feat: 新增 BodyPartRadar 雷達圖元件"
```

---

## Task 7: 建立進步趨勢圖頁面

**Files:**

- Create: `app/exercise/[id]/chart.tsx`

**Step 1: 建立頁面**

```typescript
import { View, Text, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useState, useEffect } from "react";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useExercises } from "@/hooks/useExercises";
import { ProgressTrendChart } from "@/components/charts/ProgressTrendChart";
import { Icon } from "@/components/Icon";

export default function ExerciseChartScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { exercises } = useExercises();
  const exercise = exercises.find((e) => e.id === parseInt(id!, 10));

  // 預設日期範圍：3 個月
  const today = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const [startDate, setStartDate] = useState(threeMonthsAgo);
  const [endDate, setEndDate] = useState(today);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const handleStartDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === "ios");
    if (selectedDate) {
      // 確保開始日期不晚於結束日期
      if (selectedDate > endDate) {
        setEndDate(selectedDate);
      }
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === "ios");
    if (selectedDate) {
      // 確保結束日期不早於開始日期
      if (selectedDate < startDate) {
        setStartDate(selectedDate);
      }
      setEndDate(selectedDate);
    }
  };

  if (!exercise) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-500">找不到此運動項目</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${exercise.name} - 進步趨勢`,
          headerBackTitle: "返回",
        }}
      />
      <ScrollView className="flex-1 bg-gray-50">
        <View className="p-4">
          {/* 日期選擇器 */}
          <View className="bg-white rounded-xl p-4 mb-4">
            <Text className="text-gray-700 font-medium mb-3">日期範圍</Text>
            <View className="flex-row justify-between">
              <TouchableOpacity
                className="flex-1 mr-2 bg-gray-100 rounded-lg p-3"
                onPress={() => setShowStartPicker(true)}
              >
                <Text className="text-gray-500 text-xs mb-1">開始日期</Text>
                <Text className="text-gray-800 font-medium">{formatDate(startDate)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 ml-2 bg-gray-100 rounded-lg p-3"
                onPress={() => setShowEndPicker(true)}
              >
                <Text className="text-gray-500 text-xs mb-1">結束日期</Text>
                <Text className="text-gray-800 font-medium">{formatDate(endDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 圖表 */}
          <ProgressTrendChart
            exerciseId={parseInt(id!, 10)}
            exerciseName={exercise.name}
            startDate={startDate.toISOString().split("T")[0]}
            endDate={endDate.toISOString().split("T")[0]}
          />

          {/* DateTimePicker modals */}
          {showStartPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleStartDateChange}
              maximumDate={today}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={endDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleEndDateChange}
              maximumDate={today}
            />
          )}
        </View>
      </ScrollView>
    </>
  );
}
```

**Step 2: 驗證型別正確**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add "app/exercise/[id]/chart.tsx"
git commit -m "feat: 新增運動項目進步趨勢圖頁面"
```

---

## Task 8: 修改運動項目編輯頁 - 加入圖表按鈕

**Files:**

- Modify: `app/exercise/[id].tsx`

**Step 1: 在 Header 右側加入圖表按鈕**

在 `app/exercise/[id].tsx` 中，import `Stack` 並加入 headerRight：

在檔案頂部新增：

```typescript
import { Stack } from "expo-router";
```

在 `return` 語句中，`<ScrollView>` 之前加入：

```typescript
<Stack.Screen
  options={{
    title: name || "編輯項目",
    headerRight: () => (
      <TouchableOpacity
        className="mr-2 p-2"
        onPress={() => router.push(`/exercise/${id}/chart`)}
      >
        <Icon name="chart" size={24} color="#3b82f6" />
      </TouchableOpacity>
    ),
  }}
/>
```

**Step 2: 驗證型別正確**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add "app/exercise/[id].tsx"
git commit -m "feat: 運動項目編輯頁 Header 加入圖表按鈕"
```

---

## Task 9: 在 Icon 元件加入 chart 圖示

**Files:**

- Modify: `src/components/Icon.tsx`

**Step 1: 檢查現有 Icon 元件並加入 chart**

查看 Icon.tsx 的結構，在 iconMap 中加入：

```typescript
chart: "bar-chart", // 或其他適合的圖示名稱
```

**Step 2: 驗證型別正確**

Run: `npm run typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/Icon.tsx
git commit -m "feat: Icon 元件新增 chart 圖示"
```

---

## Task 10: 在首頁加入訓練分佈雷達圖

**Files:**

- Modify: `app/(tabs)/index.tsx`

**Step 1: Import BodyPartRadar**

在檔案頂部加入：

```typescript
import { BodyPartRadar } from "@/components/charts/BodyPartRadar";
```

**Step 2: 在統計卡片區下方加入雷達圖**

在 `{/* 統計卡片區 */}` 的 `</View>` 後面加入：

```typescript
{/* 訓練分佈雷達圖 */}
<View className="mt-4">
  <BodyPartRadar />
</View>
```

**Step 3: 驗證型別正確**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add "app/(tabs)/index.tsx"
git commit -m "feat: 首頁新增訓練分佈雷達圖"
```

---

## Task 11: 最終驗證與測試

**Step 1: 執行完整的型別檢查**

Run: `npm run typecheck`
Expected: PASS

**Step 2: 執行 lint 檢查**

Run: `npm run lint`
Expected: PASS（或只有 warnings）

**Step 3: 格式化程式碼**

Run: `npm run format`

**Step 4: 啟動開發伺服器測試**

Run: `npm run start`

手動測試：

1. 首頁是否顯示訓練分佈雷達圖
2. 進入任一運動項目編輯頁，確認右上角有圖表按鈕
3. 點擊圖表按鈕，確認進步趨勢圖頁面正常顯示
4. 測試日期選擇器功能
5. 測試指標切換功能

**Step 5: 最終 Commit（如有格式化變更）**

```bash
git add -A
git commit -m "style: 格式化程式碼"
```

---

## 完成檢查清單

- [ ] 套件安裝：gifted-charts 和 datetimepicker
- [ ] 套件移除：react-native-chart-kit
- [ ] Hook：useProgressTrend
- [ ] Hook：useBodyPartDistribution
- [ ] 元件：ProgressTrendChart
- [ ] 元件：BodyPartRadar
- [ ] 頁面：app/exercise/[id]/chart.tsx
- [ ] 修改：app/exercise/[id].tsx 加入圖表按鈕
- [ ] 修改：app/(tabs)/index.tsx 加入雷達圖
- [ ] 修改：Icon.tsx 加入 chart 圖示
- [ ] TypeScript 檢查通過
- [ ] Lint 檢查通過
- [ ] 手動測試通過
