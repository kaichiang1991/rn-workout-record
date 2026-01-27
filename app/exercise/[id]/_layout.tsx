import { Stack, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

export default function ExerciseIdLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#3b82f6",
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerBackTitle: "返回",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "編輯健身項目",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <Feather name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="chart"
        options={{
          title: "進步趨勢",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <Feather name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}
