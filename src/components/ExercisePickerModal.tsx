import { useState, useMemo } from "react";
import { View, Text, Modal, TouchableOpacity, TextInput, FlatList } from "react-native";
import { Icon } from "./Icon";
import { Exercise } from "@/db/client";
import { BODY_PARTS, BodyPartKey } from "@/utils/constants";

interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  exercises: Exercise[];
  exerciseBodyParts: Array<{ exerciseId: number; bodyPart: string }>;
  currentExerciseBodyParts: string[];
}

interface GroupedExercise {
  exercise: Exercise;
  isSameBodyPart: boolean;
}

export function ExercisePickerModal({
  visible,
  onClose,
  onSelect,
  exercises,
  exerciseBodyParts,
  currentExerciseBodyParts,
}: ExercisePickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // 取得動作的部位
  const getBodyPartsForExercise = (exerciseId: number): string[] => {
    return exerciseBodyParts.filter((bp) => bp.exerciseId === exerciseId).map((bp) => bp.bodyPart);
  };

  // 檢查是否有重疊的部位
  const hasOverlappingBodyPart = (exerciseId: number): boolean => {
    const bodyParts = getBodyPartsForExercise(exerciseId);
    return bodyParts.some((bp) => currentExerciseBodyParts.includes(bp));
  };

  // 篩選並排序動作
  const groupedExercises = useMemo(() => {
    const activeExercises = exercises.filter((e) => e.isActive);

    // 搜尋篩選
    const filtered = searchQuery
      ? activeExercises.filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : activeExercises;

    // 分組：相同部位 vs 其他
    const grouped: GroupedExercise[] = filtered.map((exercise) => ({
      exercise,
      isSameBodyPart: hasOverlappingBodyPart(exercise.id),
    }));

    // 排序：相同部位優先，再按名稱排序
    grouped.sort((a, b) => {
      if (a.isSameBodyPart && !b.isSameBodyPart) return -1;
      if (!a.isSameBodyPart && b.isSameBodyPart) return 1;
      return a.exercise.name.localeCompare(b.exercise.name, "zh-TW");
    });

    return grouped;
  }, [exercises, exerciseBodyParts, currentExerciseBodyParts, searchQuery]);

  // 取得分組標題的部位名稱
  const sameBodyPartLabel = useMemo(() => {
    if (currentExerciseBodyParts.length === 0) return "相關動作";
    const labels = currentExerciseBodyParts
      .map((bp) => BODY_PARTS[bp as BodyPartKey]?.label || bp)
      .join("、");
    return labels;
  }, [currentExerciseBodyParts]);

  // 建立帶有分隔標題的列表資料
  const listData = useMemo(() => {
    const result: Array<
      { type: "header"; title: string } | { type: "item"; data: GroupedExercise }
    > = [];

    let addedSameHeader = false;
    let addedOtherHeader = false;

    for (const item of groupedExercises) {
      if (item.isSameBodyPart && !addedSameHeader) {
        result.push({ type: "header", title: sameBodyPartLabel });
        addedSameHeader = true;
      } else if (!item.isSameBodyPart && !addedOtherHeader) {
        result.push({ type: "header", title: "其他動作" });
        addedOtherHeader = true;
      }
      result.push({ type: "item", data: item });
    }

    return result;
  }, [groupedExercises, sameBodyPartLabel]);

  const handleSelect = (exercise: Exercise) => {
    onSelect(exercise);
    setSearchQuery("");
    onClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-200 px-4 pt-4 pb-3 flex-row items-center">
          <TouchableOpacity onPress={handleClose} className="mr-3">
            <Icon name="x" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-800 flex-1">選擇動作</Text>
        </View>

        {/* 搜尋框 */}
        <View className="bg-white px-4 py-3 border-b border-gray-100">
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Icon name="search" size={20} color="#9ca3af" />
            <TextInput
              className="flex-1 ml-2 text-base"
              placeholder="搜尋動作..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Icon name="x" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 動作列表 */}
        <FlatList
          data={listData}
          keyExtractor={(item, index) =>
            item.type === "header"
              ? `header-${item.title}`
              : `exercise-${item.data.exercise.id}-${index}`
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <View className="px-4 py-2 bg-gray-100">
                  <Text className="text-sm font-medium text-gray-500">{item.title}</Text>
                </View>
              );
            }

            const { exercise } = item.data;
            const bodyParts = getBodyPartsForExercise(exercise.id);
            const bodyPartLabels = bodyParts
              .map((bp) => BODY_PARTS[bp as BodyPartKey]?.label || bp)
              .join("、");

            return (
              <TouchableOpacity
                className="bg-white px-4 py-3 border-b border-gray-100 flex-row items-center"
                onPress={() => handleSelect(exercise)}
              >
                <View className="flex-1">
                  <Text className="text-base text-gray-800">{exercise.name}</Text>
                  {bodyPartLabels && (
                    <Text className="text-sm text-gray-500 mt-0.5">{bodyPartLabels}</Text>
                  )}
                </View>
                <Icon name="chevron-right" size={20} color="#9ca3af" />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Text className="text-gray-500">找不到符合的動作</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}
