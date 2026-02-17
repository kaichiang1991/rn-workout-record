import { Text, TouchableOpacity } from "react-native";

interface RestTimerProps {
  timeLeft: number;
  onCancel: () => void;
}

export function RestTimer({ timeLeft, onCancel }: RestTimerProps) {
  // Format time as MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <TouchableOpacity
      onPress={onCancel}
      className="mt-3 px-4 py-2 bg-primary-100 rounded-lg active:opacity-70"
    >
      <Text className="text-primary-600 text-lg font-medium text-center">{`休息中 ${formattedTime}`}</Text>
      <Text className="text-primary-400 text-xs text-center mt-0.5">點擊提前結束</Text>
    </TouchableOpacity>
  );
}
