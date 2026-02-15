import { View, Text, TextInput, Switch } from "react-native";
import { SetCounter } from "./SetCounter";
import { DifficultySelector } from "./DifficultySelector";
import { TrackingModeSwitch } from "./TrackingModeSwitch";
import { TrackingMode } from "../utils/tracking";

interface WorkoutRecordFormProps {
  trackingMode: TrackingMode;
  onTrackingModeChange: (mode: TrackingMode) => void;
  minutes: string;
  onMinutesChange: (value: string) => void;
  seconds: string;
  onSecondsChange: (value: string) => void;
  isBodyweight: boolean;
  onIsBodyweightChange: (value: boolean) => void;
  weight: string;
  onWeightChange: (value: string) => void;
  reps: string;
  onRepsChange: (value: string) => void;
  setCount: number;
  onSetCountChange: (value: number) => void;
  difficulty: number;
  onDifficultyChange: (value: number) => void;
  notes: string;
  onNotesChange: (value: string) => void;
}

export function WorkoutRecordForm({
  trackingMode,
  onTrackingModeChange,
  minutes,
  onMinutesChange,
  seconds,
  onSecondsChange,
  isBodyweight,
  onIsBodyweightChange,
  weight,
  onWeightChange,
  reps,
  onRepsChange,
  setCount,
  onSetCountChange,
  difficulty,
  onDifficultyChange,
  notes,
  onNotesChange,
}: WorkoutRecordFormProps) {
  return (
    <View>
      {/* 記錄類型切換 */}
      <View className="mb-4">
        <Text className="text-base font-bold text-gray-700 mb-2">記錄類型</Text>
        <TrackingModeSwitch value={trackingMode} onChange={onTrackingModeChange} />
      </View>

      {/* 次數模式：自體重量開關、重量、次數 */}
      {trackingMode === "reps" && (
        <>
          {/* 自體重量開關 */}
          <View className="bg-white rounded-xl px-4 py-3 mb-3 flex-row items-center justify-between">
            <Text className="text-gray-700">自體重量</Text>
            <Switch value={isBodyweight} onValueChange={onIsBodyweightChange} />
          </View>

          {/* 重量與次數 - 同一列 */}
          <View className="flex-row mb-4">
            {/* 重量 */}
            <View className="flex-1 mr-2">
              <Text className="text-base font-bold text-gray-700 mb-2">重量</Text>
              <View className="bg-white rounded-xl px-3 py-2 flex-row items-center">
                <TextInput
                  className="flex-1 text-lg"
                  placeholder="0"
                  keyboardType="decimal-pad"
                  value={isBodyweight ? "" : weight}
                  onChangeText={onWeightChange}
                  editable={!isBodyweight}
                />
                <Text className="text-gray-600 text-base ml-2">kg</Text>
              </View>
            </View>

            {/* 次數 */}
            <View className="flex-1 ml-2">
              <Text className="text-base font-bold text-gray-700 mb-2">每組次數</Text>
              <View className="bg-white rounded-xl px-3 py-2 flex-row items-center">
                <TextInput
                  className="flex-1 text-lg"
                  placeholder="0"
                  keyboardType="number-pad"
                  value={reps}
                  onChangeText={onRepsChange}
                />
                <Text className="text-gray-600 text-base ml-2">下</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* 時間模式：分鐘與秒鐘輸入 */}
      {trackingMode === "time" && (
        <View className="flex-row mb-4">
          {/* 分鐘 */}
          <View className="flex-1 mr-2">
            <Text className="text-base font-bold text-gray-700 mb-2">分鐘</Text>
            <View className="bg-white rounded-xl px-3 py-2 flex-row items-center">
              <TextInput
                className="flex-1 text-lg"
                placeholder="0"
                keyboardType="number-pad"
                value={minutes}
                onChangeText={onMinutesChange}
              />
              <Text className="text-gray-600 text-base ml-2">分</Text>
            </View>
          </View>

          {/* 秒鐘 */}
          <View className="flex-1 ml-2">
            <Text className="text-base font-bold text-gray-700 mb-2">秒鐘</Text>
            <View className="bg-white rounded-xl px-3 py-2 flex-row items-center">
              <TextInput
                className="flex-1 text-lg"
                placeholder="0"
                keyboardType="number-pad"
                value={seconds}
                onChangeText={onSecondsChange}
              />
              <Text className="text-gray-600 text-base ml-2">秒</Text>
            </View>
          </View>
        </View>
      )}

      {/* 難易度選擇 */}
      <View className="mb-4">
        <Text className="text-base font-bold text-gray-700 mb-2">今天難易度</Text>
        <DifficultySelector value={difficulty} onChange={onDifficultyChange} />
      </View>

      {/* 備註 */}
      <View className="mb-4">
        <Text className="text-base font-bold text-gray-700 mb-2">備註</Text>
        <TextInput
          className="bg-white rounded-xl p-3 text-base min-h-20"
          placeholder="記錄今天的訓練心得..."
          multiline
          textAlignVertical="top"
          value={notes}
          onChangeText={onNotesChange}
        />
      </View>

      {/* 組數計數器 */}
      <View className="mb-4">
        <Text className="text-base font-bold text-gray-700 mb-2">完成組數</Text>
        <View className="bg-white rounded-xl py-4 items-center">
          <SetCounter value={setCount} onChange={onSetCountChange} />
        </View>
      </View>
    </View>
  );
}
