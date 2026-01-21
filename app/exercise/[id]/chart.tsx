import { View, Text, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useState } from "react";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useExercises } from "@/hooks/useExercises";
import { ProgressTrendChart } from "@/components/charts/ProgressTrendChart";

export default function ExerciseChartScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  const handleStartDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === "ios");
    if (selectedDate) {
      if (selectedDate > endDate) {
        setEndDate(selectedDate);
      }
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === "ios");
    if (selectedDate) {
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
