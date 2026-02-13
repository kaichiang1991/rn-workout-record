import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
  ScrollView,
  Animated,
  PanResponder,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTrainingMenus, MenuItemWithExercise } from "@/hooks/useTrainingMenus";
import { useExerciseStore } from "@/store/exerciseStore";
import { BODY_PARTS, BodyPartKey } from "@/utils/constants";
import { Exercise } from "@/db/client";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const HEADER_HEIGHT = 100;
const FOOTER_HEIGHT = 80;
const CONTENT_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - 120;

interface DraggableItemProps {
  exercise: Exercise;
  onDragStart: () => void;
  onDragEnd: (exercise: Exercise, y: number) => void;
}

function DraggableExerciseItem({ exercise, onDragStart, onDragEnd }: DraggableItemProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);

  useEffect(() => {
    onDragStartRef.current = onDragStart;
    onDragEndRef.current = onDragEnd;
  }, [onDragStart, onDragEnd]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        onDragStartRef.current();
        Animated.spring(scale, {
          toValue: 1.1,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();

        // 檢查是否拖到下方區域
        onDragEndRef.current(exercise, gestureState.moveY);

        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={{
        transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }],
      }}
      {...panResponder.panHandlers}
    >
      <View className="bg-white border border-gray-200 rounded-lg px-3 py-2 mr-2 mb-2">
        <Text className="text-gray-800 text-sm">{exercise.name}</Text>
      </View>
    </Animated.View>
  );
}

interface DraggableMenuItemProps {
  item: MenuItemWithExercise;
  onDragStart: () => void;
  onDragEnd: (item: MenuItemWithExercise, y: number) => void;
}

function DraggableMenuItem({ item, onDragStart, onDragEnd }: DraggableMenuItemProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);

  useEffect(() => {
    onDragStartRef.current = onDragStart;
    onDragEndRef.current = onDragEnd;
  }, [onDragStart, onDragEnd]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        onDragStartRef.current();
        Animated.spring(scale, {
          toValue: 1.1,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();

        // 檢查是否拖到上方區域
        onDragEndRef.current(item, gestureState.moveY);

        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={{
        transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }],
      }}
      {...panResponder.panHandlers}
    >
      <View className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mr-2 mb-2">
        <Text className="text-blue-800 text-sm">{item.exerciseName}</Text>
      </View>
    </Animated.View>
  );
}

export default function MenuDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const menuId = parseInt(id!, 10);

  const { menus, deleteMenu, getMenuItems, addMenuItem, removeMenuItem } = useTrainingMenus();
  const getExercisesByBodyPart = useExerciseStore((s) => s.getExercisesByBodyPart);

  const [menuItems, setMenuItems] = useState<MenuItemWithExercise[]>([]);
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPartKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [topScrollEnabled, setTopScrollEnabled] = useState(true);
  const [bottomScrollEnabled, setBottomScrollEnabled] = useState(true);

  // 取得分隔線 Y 座標（用於判斷拖曳目標）
  const dropZoneY = HEADER_HEIGHT + CONTENT_HEIGHT / 2;

  const menu = menus.find((m) => m.id === menuId);

  const loadMenuItems = useCallback(async () => {
    try {
      const items = await getMenuItems(menuId);
      setMenuItems(items);
    } finally {
      setLoading(false);
    }
  }, [menuId, getMenuItems]);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  const filteredExercises = getExercisesByBodyPart(selectedBodyPart);

  // 過濾已加入菜單的項目
  const availableExercises = filteredExercises.filter(
    (e) => !menuItems.some((item) => item.exerciseId === e.id)
  );

  const handleAddExercise = async (exercise: Exercise, y: number) => {
    setTopScrollEnabled(true);
    // 如果拖到下半部（菜單區域），則加入
    if (y > dropZoneY) {
      try {
        await addMenuItem(menuId, exercise.id);
        await loadMenuItems();
      } catch {
        Alert.alert("錯誤", "加入項目失敗");
      }
    }
  };

  const handleRemoveItem = async (item: MenuItemWithExercise, y: number) => {
    setBottomScrollEnabled(true);
    // 如果拖到上半部（項目區域），則移除
    if (y < dropZoneY) {
      try {
        await removeMenuItem(item.id);
        await loadMenuItems();
      } catch {
        Alert.alert("錯誤", "移除項目失敗");
      }
    }
  };

  const handleDelete = () => {
    Alert.alert("確認刪除", `確定要刪除「${menu?.name}」嗎？此操作無法復原。`, [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMenu(menuId);
            router.back();
          } catch {
            Alert.alert("錯誤", "刪除失敗");
          }
        },
      },
    ]);
  };

  if (!menu) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-gray-500">找不到菜單</Text>
      </View>
    );
  }

  const bodyPartEntries = Object.entries(BODY_PARTS) as [
    BodyPartKey,
    (typeof BODY_PARTS)[BodyPartKey],
  ][];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header: 菜單名稱 + 部位選擇 */}
      <View className="bg-white border-b border-gray-200 px-4 pt-4 pb-2">
        <Text className="text-xl font-bold text-gray-800 mb-3">{menu.name}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            className={`px-4 py-2 rounded-full mr-2 ${
              selectedBodyPart === null ? "bg-primary-500" : "bg-gray-200"
            }`}
            onPress={() => setSelectedBodyPart(null)}
          >
            <Text
              className={selectedBodyPart === null ? "text-white font-medium" : "text-gray-700"}
            >
              全部
            </Text>
          </TouchableOpacity>
          {bodyPartEntries.map(([key, part]) => (
            <TouchableOpacity
              key={key}
              className={`px-4 py-2 rounded-full mr-2 ${
                selectedBodyPart === key ? "bg-primary-500" : "bg-gray-200"
              }`}
              onPress={() => setSelectedBodyPart(key)}
            >
              <Text
                className={selectedBodyPart === key ? "text-white font-medium" : "text-gray-700"}
              >
                {part.shortLabel}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 上半部：可選項目 */}
      <View style={{ height: CONTENT_HEIGHT / 2 }} className="bg-gray-100 p-3">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-medium text-gray-600">可選項目</Text>
          <Text className="text-xs text-gray-400">向下拖曳加入菜單</Text>
        </View>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          scrollEnabled={topScrollEnabled}
        >
          <View className="flex-row flex-wrap">
            {availableExercises.map((exercise) => (
              <DraggableExerciseItem
                key={exercise.id}
                exercise={exercise}
                onDragStart={() => setTopScrollEnabled(false)}
                onDragEnd={handleAddExercise}
              />
            ))}
            {availableExercises.length === 0 && (
              <Text className="text-gray-400 text-sm">
                {selectedBodyPart ? "此分類沒有可用項目" : "所有項目都已加入菜單"}
              </Text>
            )}
          </View>
        </ScrollView>
      </View>

      {/* 分隔線 */}
      <View className="h-1 bg-primary-500" />

      {/* 下半部：菜單內容 */}
      <View style={{ height: CONTENT_HEIGHT / 2 }} className="bg-blue-50/50 p-3">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-medium text-gray-600">菜單內容 ({menuItems.length})</Text>
          <Text className="text-xs text-gray-400">向上拖曳移除</Text>
        </View>
        {loading ? (
          <Text className="text-gray-400 text-sm">載入中...</Text>
        ) : (
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            scrollEnabled={bottomScrollEnabled}
          >
            <View className="flex-row flex-wrap">
              {menuItems.map((item) => (
                <DraggableMenuItem
                  key={item.id}
                  item={item}
                  onDragStart={() => setBottomScrollEnabled(false)}
                  onDragEnd={handleRemoveItem}
                />
              ))}
              {menuItems.length === 0 && (
                <Text className="text-gray-400 text-sm">從上方拖曳項目到這裡</Text>
              )}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Footer: 刪除、設定目標、完成按鈕 */}
      <View className="bg-white border-t border-gray-200 p-4 flex-row gap-3">
        <TouchableOpacity
          className="bg-gray-200 rounded-xl p-4 items-center"
          style={{ flex: 0.3 }}
          onPress={handleDelete}
        >
          <Text className="text-gray-700 font-semibold">刪除</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`rounded-xl p-4 items-center ${
            menuItems.length === 0 ? "bg-gray-100" : "bg-primary-100"
          }`}
          style={{ flex: 0.4 }}
          onPress={() => router.push(`/menu/${menuId}/goals`)}
          disabled={menuItems.length === 0}
        >
          <Text
            className={`font-semibold ${
              menuItems.length === 0 ? "text-gray-400" : "text-primary-600"
            }`}
          >
            設定目標
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-primary-500 rounded-xl p-4 items-center"
          style={{ flex: 0.3 }}
          onPress={() => router.back()}
        >
          <Text className="text-white font-semibold">完成</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
