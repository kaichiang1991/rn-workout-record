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
        <Stack.Screen
          name="workout/new"
          options={{ title: "新增運動紀錄", presentation: "modal" }}
        />
        <Stack.Screen name="workout/[id]" options={{ title: "紀錄詳情" }} />
        <Stack.Screen
          name="exercise/new"
          options={{ title: "新增健身項目", presentation: "modal" }}
        />
        <Stack.Screen name="exercise/[id]" options={{ title: "編輯健身項目" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
