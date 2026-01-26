import { MenuItemWithExercise } from "@/hooks/useTrainingMenus";

export function formatGoal(item: MenuItemWithExercise): string {
  if (item.targetText) {
    return item.targetText;
  }

  if (item.targetSets && item.targetReps) {
    return `${item.targetSets}組 × ${item.targetReps}下`;
  }
  if (item.targetSets && item.targetDuration) {
    return `${item.targetSets}組 × ${item.targetDuration}秒`;
  }
  if (item.targetSets) {
    return `${item.targetSets}組`;
  }

  return "";
}

export function formatExerciseWithGoal(exerciseName: string, item: MenuItemWithExercise): string {
  const goalText = formatGoal(item);
  return goalText ? `${exerciseName} (${goalText})` : exerciseName;
}
