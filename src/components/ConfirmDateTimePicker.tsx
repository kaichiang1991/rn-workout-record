import { useEffect, useState } from "react";
import { View, Text, Modal, TouchableOpacity, Platform } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

interface ConfirmDateTimePickerProps {
  visible: boolean;
  value: Date;
  mode: "date" | "time";
  title?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

export function ConfirmDateTimePicker({
  visible,
  value,
  mode,
  title,
  maximumDate,
  minimumDate,
  onConfirm,
  onCancel,
}: ConfirmDateTimePickerProps) {
  // iOS spinner 只在值變動時觸發 onChange，因此用暫存值讓「未變更也能確認」
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    if (visible) {
      setTempValue(value);
    }
  }, [visible, value]);

  if (!visible) return null;

  // Android 原生對話框自帶「確定 / 取消」按鈕，依 event.type 判斷結果
  if (Platform.OS === "android") {
    const handleChange = (event: DateTimePickerEvent, date?: Date) => {
      if (event.type === "set" && date) {
        onConfirm(date);
      } else {
        onCancel();
      }
    };
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display="default"
        onChange={handleChange}
        maximumDate={maximumDate}
        minimumDate={minimumDate}
      />
    );
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <TouchableOpacity className="flex-1 bg-black/40" activeOpacity={1} onPress={onCancel} />
      <View className="bg-white rounded-t-2xl p-4 pb-8">
        {title && <Text className="text-center text-gray-700 font-medium mb-1">{title}</Text>}
        <DateTimePicker
          value={tempValue}
          mode={mode}
          display="spinner"
          onChange={(_event, date) => {
            if (date) setTempValue(date);
          }}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          locale="zh-TW"
          themeVariant="light"
          style={{ alignSelf: "center" }}
        />
        <View className="flex-row gap-3 mt-2">
          <TouchableOpacity
            className="flex-1 bg-gray-200 rounded-lg p-3 items-center"
            onPress={onCancel}
          >
            <Text className="text-gray-600 font-medium">取消</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-primary-500 rounded-lg p-3 items-center"
            onPress={() => onConfirm(tempValue)}
          >
            <Text className="text-white font-medium">確認</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
