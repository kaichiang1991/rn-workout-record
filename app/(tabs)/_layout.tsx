import { Tabs } from "expo-router";
import { Text, View } from "react-native";

function TabIcon({ name, focused: _focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    index: "🏠",
    exercises: "💪",
    history: "📋",
  };

  return (
    <View className="items-center justify-center">
      <Text className="text-xl">{icons[name] || "📌"}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        headerStyle: {
          backgroundColor: "#3b82f6",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "首頁",
          tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: "健身項目",
          tabBarIcon: ({ focused }) => <TabIcon name="exercises" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "歷史紀錄",
          tabBarIcon: ({ focused }) => <TabIcon name="history" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
