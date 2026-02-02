import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  PanResponder,
} from "react-native";
import { useRouter } from "expo-router";
import { useCallback, useState, useEffect, useMemo, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useTrainingMenus } from "@/hooks/useTrainingMenus";
import { formatRelativeDate } from "@/utils/date";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TrainingMenu } from "@/db/client";

const MENU_CARD_HEIGHT = 120;

interface MenuProgress {
  menuId: number;
  completedCount: number;
  totalCount: number;
}

interface DraggableMenuCardProps {
  menu: TrainingMenu;
  index: number;
  itemCount: number;
  progress: MenuProgress | undefined;
  colorRank: string | undefined;
  onDragStart: (index: number) => void;
  onDragMove: (index: number, dy: number) => void;
  onDragEnd: (index: number) => void;
  onEdit: (menuId: number) => void;
  onStartWorkout: (menuId: number) => void;
  draggedIndex: number | null;
}

function DraggableMenuCard({
  menu,
  index,
  itemCount,
  progress,
  colorRank,
  onDragStart,
  onDragMove,
  onDragEnd,
  onEdit,
  onStartWorkout,
  draggedIndex,
}: DraggableMenuCardProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const indexRef = useRef(index);
  const onDragStartRef = useRef(onDragStart);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);

  useEffect(() => {
    indexRef.current = index;
    onDragStartRef.current = onDragStart;
    onDragMoveRef.current = onDragMove;
    onDragEndRef.current = onDragEnd;
  }, [index, onDragStart, onDragMove, onDragEnd]);

  // 當其他卡片被拖曳時降低透明度
  useEffect(() => {
    if (draggedIndex !== null && draggedIndex !== index) {
      Animated.timing(opacity, {
        toValue: 0.6,
        duration: 150,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [draggedIndex, index, opacity]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 只在垂直移動距離大於水平移動距離時啟動拖曳
        return (
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 5
        );
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        onDragStartRef.current(indexRef.current);
        Animated.spring(scale, {
          toValue: 1.03,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: 0, y: gestureState.dy });
        onDragMoveRef.current(indexRef.current, gestureState.dy);
      },
      onPanResponderRelease: () => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();

        onDragEndRef.current(indexRef.current);

        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const hasProgress = progress && progress.completedCount > 0;

  return (
    <Animated.View
      style={{
        transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }],
        opacity,
        zIndex: draggedIndex === index ? 999 : 1,
      }}
      {...panResponder.panHandlers}
    >
      <View className="bg-white rounded-xl mb-3 shadow-sm overflow-hidden flex-row">
        {/* 側邊色條 */}
        {colorRank && <View style={{ width: 4, backgroundColor: colorRank }} />}

        {/* 卡片內容 */}
        <View className="flex-1 p-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-800">{menu.name}</Text>
              {menu.description && (
                <Text className="text-gray-500 text-sm mt-1" numberOfLines={1}>
                  {menu.description}
                </Text>
              )}
              {menu.lastCompletedAt && (
                <Text className="text-xs text-gray-400 mt-1">
                  上次完成：{formatRelativeDate(menu.lastCompletedAt)}
                </Text>
              )}
            </View>
            <View className="bg-blue-100 rounded-full px-3 py-1">
              <Text className="text-blue-600 font-medium">{itemCount} 項目</Text>
            </View>
          </View>

          {/* 按鈕區 */}
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="flex-1 bg-gray-100 rounded-lg py-2 items-center"
              onPress={() => onEdit(menu.id)}
            >
              <Text className="text-gray-700 font-medium">編輯</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 rounded-lg py-2 items-center ${
                itemCount === 0 ? "bg-gray-300" : "bg-primary-500"
              }`}
              onPress={() => onStartWorkout(menu.id)}
              disabled={itemCount === 0}
            >
              <Text className={`font-medium ${itemCount === 0 ? "text-gray-500" : "text-white"}`}>
                {hasProgress
                  ? `繼續 (${progress.completedCount}/${progress.totalCount})`
                  : "開始訓練"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function MenusScreen() {
  const router = useRouter();
  const { menus, loading, refresh, getMenuItemCount, updateMenusOrder } = useTrainingMenus();
  const [refreshing, setRefreshing] = useState(false);
  const [menuCounts, setMenuCounts] = useState<Record<number, number>>({});
  const [menuProgress, setMenuProgress] = useState<Record<number, MenuProgress>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [localMenus, setLocalMenus] = useState<TrainingMenu[]>(menus);

  // 同步 menus 到 localMenus
  useEffect(() => {
    setLocalMenus(menus);
  }, [menus]);

  // 當頁面獲得焦點時自動刷新數據
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

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

  // 檢查菜單進度
  useEffect(() => {
    const checkProgress = async () => {
      const progress: Record<number, MenuProgress> = {};
      for (const menu of menus) {
        const stored = await AsyncStorage.getItem(`menu_session_${menu.id}`);
        if (stored) {
          const data = JSON.parse(stored);
          const totalCount = menuCounts[menu.id] || 0;
          progress[menu.id] = {
            menuId: menu.id,
            completedCount: data.records?.length || 0,
            totalCount,
          };
        }
      }
      setMenuProgress(progress);
    };
    if (Object.keys(menuCounts).length > 0) {
      checkProgress();
    }
  }, [menus, menuCounts]);

  const handleStartWorkout = (menuId: number) => {
    router.push(`/workout/menu/${menuId}`);
  };

  const handleEdit = (menuId: number) => {
    router.push(`/menu/${menuId}`);
  };

  // 拖曳開始
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  // 拖曳移動
  const handleDragMove = useCallback(
    (index: number, dy: number) => {
      const targetIndex = Math.round(dy / MENU_CARD_HEIGHT);
      const newIndex = Math.max(0, Math.min(localMenus.length - 1, index + targetIndex));

      if (newIndex !== index && draggedIndex === index) {
        setLocalMenus((prev) => {
          const newMenus = [...prev];
          const [removed] = newMenus.splice(index, 1);
          newMenus.splice(newIndex, 0, removed);
          return newMenus;
        });
        setDraggedIndex(newIndex);
      }
    },
    [localMenus.length, draggedIndex]
  );

  // 拖曳結束
  const handleDragEnd = useCallback(async () => {
    setDraggedIndex(null);

    // 更新資料庫順序
    const orderedMenus = localMenus.map((menu, idx) => ({
      id: menu.id,
      sortOrder: idx,
    }));
    await updateMenusOrder(orderedMenus);
  }, [localMenus, updateMenusOrder]);

  // 計算菜單的顏色排名（相對排序）
  const menuColorRanks = useMemo(() => {
    const completedMenus = menus
      .filter((m) => m.lastCompletedAt)
      .sort((a, b) => {
        // 按 lastCompletedAt 降序排列（最新的在前）
        return new Date(b.lastCompletedAt!).getTime() - new Date(a.lastCompletedAt!).getTime();
      });

    const colors = ["#22c55e", "#eab308", "#f97316", "#9ca3af"]; // 綠、黃、橘、灰
    const colorMap: Record<number, string> = {};

    completedMenus.forEach((menu, index) => {
      colorMap[menu.id] = colors[Math.min(index, colors.length - 1)];
    });

    return colorMap;
  }, [menus]);

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      scrollEnabled={draggedIndex === null}
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
        ) : localMenus.length === 0 ? (
          <View className="bg-white rounded-xl p-6">
            <Text className="text-gray-500 text-center">還沒有訓練菜單</Text>
            <Text className="text-gray-400 text-center text-sm mt-1">
              建立你的專屬訓練菜單，規劃每天的訓練內容！
            </Text>
          </View>
        ) : (
          localMenus.map((menu, index) => {
            const itemCount = menuCounts[menu.id] ?? 0;
            const progress = menuProgress[menu.id];
            const colorRank = menuColorRanks[menu.id];

            return (
              <DraggableMenuCard
                key={menu.id}
                menu={menu}
                index={index}
                itemCount={itemCount}
                progress={progress}
                colorRank={colorRank}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                onEdit={handleEdit}
                onStartWorkout={handleStartWorkout}
                draggedIndex={draggedIndex}
              />
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
