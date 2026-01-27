import { Tabs, useRouter } from "expo-router";
import { View, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, TAB_ICONS } from "../../src/components/Icon";
import { Feather } from "@expo/vector-icons";
import { router as expoRouter } from "expo-router";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const iconName = TAB_ICONS[name] || "home";
  const color = focused ? "#3b82f6" : "#9ca3af";

  return (
    <View className="items-center justify-center">
      <Icon name={iconName} size={24} color={color} />
    </View>
  );
}

function AddRecordButton() {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center">
      <TouchableOpacity
        className="w-16 h-16 rounded-full bg-primary-500 items-center justify-center shadow-lg -mt-6"
        onPress={() => router.push("/workout/new")}
        activeOpacity={0.8}
      >
        <Icon name="plus" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function HeaderExportButton() {
  return (
    <TouchableOpacity
      className="mr-4"
      activeOpacity={0.7}
      onPress={() => expoRouter.push("/export")}
    >
      <Feather name="share" size={22} color="#fff" />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

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
          paddingBottom: Math.max(insets.bottom, 8),
          height: 60 + insets.bottom,
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
          headerRight: () => <HeaderExportButton />,
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
        name="add-record"
        options={{
          title: "",
          tabBarIcon: () => null,
          tabBarButton: () => <AddRecordButton />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "歷史紀錄",
          tabBarIcon: ({ focused }) => <TabIcon name="history" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="menus"
        options={{
          title: "訓練菜單",
          tabBarIcon: ({ focused }) => <TabIcon name="menus" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
