import "../global.css";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { initDatabase } from "@/db/client";

function BackButton() {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
      <Feather name="arrow-left" size={24} color="#fff" />
    </TouchableOpacity>
  );
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase().then(() => setDbReady(true));
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
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
            headerLeft: () => <BackButton />,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="workout/new"
            options={{ headerShown: false, presentation: "modal" }}
          />
          <Stack.Screen name="workout/[id]" options={{ title: "紀錄詳情" }} />
          <Stack.Screen
            name="exercise/new"
            options={{ title: "新增健身項目", presentation: "modal" }}
          />
          <Stack.Screen name="exercise/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="menu/new"
            options={{ title: "新增訓練菜單", presentation: "modal" }}
          />
          <Stack.Screen name="menu/[id]" options={{ title: "編輯菜單" }} />
          <Stack.Screen name="workout/menu/[menuId]" options={{ headerShown: false }} />
          <Stack.Screen name="workout/menu/summary" options={{ headerShown: false }} />
          <Stack.Screen name="export" options={{ title: "匯出訓練紀錄" }} />
          <Stack.Screen name="settings" options={{ title: "設定" }} />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
