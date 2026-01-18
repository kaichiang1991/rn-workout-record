import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import { useTrainingMenus } from "@/hooks/useTrainingMenus";

export default function MenusScreen() {
  const router = useRouter();
  const { menus, loading, refresh, getMenuItemCount } = useTrainingMenus();
  const [refreshing, setRefreshing] = useState(false);
  const [menuCounts, setMenuCounts] = useState<Record<number, number>>({});

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // 取得每個菜單的項目數量
  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<number, number> = {};
      for (const menu of menus) {
        counts[menu.id] = await getMenuItemCount(menu.id);
      }
      setMenuCounts(counts);
    };
    fetchCounts();
  }, [menus, getMenuItemCount]);

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="p-4">
        {/* 新增按鈕 */}
        <TouchableOpacity
          className="bg-primary-500 rounded-xl p-4 mb-6 flex-row items-center justify-center"
          onPress={() => router.push("/menu/new")}
        >
          <Text className="text-white text-lg font-semibold">＋ 新增訓練菜單</Text>
        </TouchableOpacity>

        {loading ? (
          <View className="bg-white rounded-xl p-4">
            <Text className="text-gray-500 text-center">載入中...</Text>
          </View>
        ) : menus.length === 0 ? (
          <View className="bg-white rounded-xl p-6">
            <Text className="text-gray-500 text-center">還沒有訓練菜單</Text>
            <Text className="text-gray-400 text-center text-sm mt-1">
              建立你的專屬訓練菜單，規劃每天的訓練內容！
            </Text>
          </View>
        ) : (
          menus.map((menu) => (
            <TouchableOpacity
              key={menu.id}
              className="bg-white rounded-xl p-4 mb-3 shadow-sm"
              onPress={() => router.push(`/menu/${menu.id}`)}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-800">{menu.name}</Text>
                  {menu.description && (
                    <Text className="text-gray-500 text-sm mt-1" numberOfLines={1}>
                      {menu.description}
                    </Text>
                  )}
                </View>
                <View className="bg-blue-100 rounded-full px-3 py-1">
                  <Text className="text-blue-600 font-medium">{menuCounts[menu.id] ?? 0} 項目</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}
