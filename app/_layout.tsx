import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect } from "react";
import { initDatabase } from "@/db/client";

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#3b82f6",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workout/new" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="workout/[id]" options={{ title: "紀錄詳情" }} />
        <Stack.Screen
          name="exercise/new"
          options={{ title: "新增健身項目", presentation: "modal" }}
        />
        <Stack.Screen name="exercise/[id]" options={{ title: "編輯健身項目" }} />
        <Stack.Screen name="menu/new" options={{ title: "新增訓練菜單", presentation: "modal" }} />
        <Stack.Screen name="menu/[id]" options={{ title: "編輯菜單" }} />
        <Stack.Screen name="workout/menu/[menuId]" options={{ headerShown: false }} />
        <Stack.Screen name="workout/menu/summary" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
