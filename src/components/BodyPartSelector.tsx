import { Text, TouchableOpacity, ScrollView } from "react-native";
import { BODY_PARTS, BodyPartKey } from "@/utils/constants";

interface BodyPartSelectorProps {
  value: BodyPartKey | null;
  onChange: (value: BodyPartKey | null) => void;
}

export function BodyPartSelector({ value, onChange }: BodyPartSelectorProps) {
  const bodyPartEntries = Object.entries(BODY_PARTS) as [
    BodyPartKey,
    (typeof BODY_PARTS)[BodyPartKey],
  ][];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <TouchableOpacity
        className={`px-4 py-2 rounded-full mr-2 ${
          value === null ? "bg-primary-500" : "bg-gray-200"
        }`}
        onPress={() => onChange(null)}
      >
        <Text className={value === null ? "text-white font-medium" : "text-gray-700"}>全部</Text>
      </TouchableOpacity>
      {bodyPartEntries.map(([key, part]) => (
        <TouchableOpacity
          key={key}
          className={`px-4 py-2 rounded-full mr-2 ${
            value === key ? "bg-primary-500" : "bg-gray-200"
          }`}
          onPress={() => onChange(key)}
        >
          <Text className={value === key ? "text-white font-medium" : "text-gray-700"}>
            {part.shortLabel}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
