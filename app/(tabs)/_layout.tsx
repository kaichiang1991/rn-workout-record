import { Tabs } from "expo-router";
import { View } from "react-native";
import { Icon, TAB_ICONS } from "../../src/components/Icon";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const iconName = TAB_ICONS[name] || "home";
  const color = focused ? "#3b82f6" : "#9ca3af";

  return (
    <View className="items-center justify-center">
      <Icon name={iconName} size={24} color={color} />
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
