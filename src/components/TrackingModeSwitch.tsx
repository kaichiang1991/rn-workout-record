import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { TrackingMode } from "../utils/tracking";

interface TrackingModeSwitchProps {
  value: TrackingMode;
  onChange: (mode: TrackingMode) => void;
}

export function TrackingModeSwitch({ value, onChange }: TrackingModeSwitchProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.option, value === "reps" && styles.optionActive]}
        onPress={() => onChange("reps")}
      >
        <Text style={[styles.optionText, value === "reps" && styles.optionTextActive]}>次數</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.option, value === "time" && styles.optionActive]}
        onPress={() => onChange("time")}
      >
        <Text style={[styles.optionText, value === "time" && styles.optionTextActive]}>時間</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 4,
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  optionActive: {
    backgroundColor: "#3b82f6",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
  },
  optionTextActive: {
    color: "#ffffff",
  },
});
