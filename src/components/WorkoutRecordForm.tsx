import { View, Text, TextInput, Switch } from "react-native";
import { SetCounter } from "./SetCounter";
import { DifficultySelector } from "./DifficultySelector";

interface WorkoutRecordFormProps {
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
      {/* 重量設定 */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-gray-700 mb-3">重量</Text>
        <View className="bg-white rounded-xl p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-700">自體重量</Text>
            <Switch value={isBodyweight} onValueChange={onIsBodyweightChange} />
          </View>
          {!isBodyweight && (
            <View className="flex-row items-center">
              <TextInput
                className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-lg"
                placeholder="0"
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={onWeightChange}
              />
              <Text className="text-gray-600 text-lg ml-3">kg</Text>
            </View>
          )}
        </View>
      </View>

      {/* 次數設定 */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-gray-700 mb-3">每組次數</Text>
        <View className="bg-white rounded-xl p-4">
          <View className="flex-row items-center">
            <TextInput
              className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-lg"
              placeholder="0"
              keyboardType="number-pad"
              value={reps}
              onChangeText={onRepsChange}
            />
            <Text className="text-gray-600 text-lg ml-3">下</Text>
          </View>
        </View>
      </View>

      {/* 組數計數器 */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-gray-700 mb-3">完成組數</Text>
        <View className="bg-white rounded-xl p-6 items-center">
          <SetCounter value={setCount} onChange={onSetCountChange} />
        </View>
      </View>

      {/* 難易度選擇 */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-gray-700 mb-3">今天難易度</Text>
        <DifficultySelector value={difficulty} onChange={onDifficultyChange} />
      </View>

      {/* 備註 */}
      <View className="mb-6">
        <Text className="text-lg font-bold text-gray-700 mb-3">備註</Text>
        <TextInput
          className="bg-white rounded-xl p-4 text-base min-h-24"
          placeholder="記錄今天的訓練心得..."
          multiline
          textAlignVertical="top"
          value={notes}
          onChangeText={onNotesChange}
        />
      </View>
    </View>
  );
}
