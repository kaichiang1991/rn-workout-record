import { View, Text } from "react-native";
import { Icon, type IconName } from "../Icon";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: IconName;
  color?: "primary" | "green" | "orange" | "purple";
}

const colorStyles = {
  primary: {
    bg: "bg-primary-100",
    text: "text-primary-600",
    iconBg: "bg-primary-500",
  },
  green: {
    bg: "bg-green-100",
    text: "text-green-600",
    iconBg: "bg-green-500",
  },
  orange: {
    bg: "bg-orange-100",
    text: "text-orange-600",
    iconBg: "bg-orange-500",
  },
  purple: {
    bg: "bg-purple-100",
    text: "text-purple-600",
    iconBg: "bg-purple-500",
  },
};

export function StatsCard({ title, value, subtitle, icon, color = "primary" }: StatsCardProps) {
  const styles = colorStyles[color];

  return (
    <View className={`${styles.bg} rounded-xl p-4`}>
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <Text className="text-gray-600 text-sm mb-1">{title}</Text>
          <Text className={`text-2xl font-bold ${styles.text}`}>{value}</Text>
          {subtitle && <Text className="text-gray-500 text-xs mt-1">{subtitle}</Text>}
        </View>
        {icon && (
          <View className={`${styles.iconBg} rounded-full p-2`}>
            <Icon name={icon} size={20} color="#ffffff" />
          </View>
        )}
      </View>
    </View>
  );
}
