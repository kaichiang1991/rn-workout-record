import type { IconName } from "../components/Icon";

export const MOOD_LABELS = ["很差", "不好", "普通", "不錯", "很棒"] as const;

export const BODY_PARTS = {
  chest: { label: "胸部", shortLabel: "胸", icon: "chest" as IconName, color: "#ef4444" },
  back: { label: "背部", shortLabel: "背", icon: "back" as IconName, color: "#3b82f6" },
  legs: { label: "腿部", shortLabel: "腿", icon: "legs" as IconName, color: "#22c55e" },
  hips: { label: "髖部", shortLabel: "髖", icon: "hips" as IconName, color: "#ec4899" },
  shoulders: { label: "肩膀", shortLabel: "肩", icon: "shoulders" as IconName, color: "#8b5cf6" },
  arms: { label: "手臂", shortLabel: "臂", icon: "arms" as IconName, color: "#f97316" },
  core: { label: "核心", shortLabel: "核心", icon: "core" as IconName, color: "#eab308" },
  cardio: { label: "有氧", shortLabel: "有氧", icon: "cardio" as IconName, color: "#06b6d4" },
} as const;

export type BodyPartKey = keyof typeof BODY_PARTS;

export const DIFFICULTY_LEVELS = [
  { value: 1, label: "輕鬆", color: "#22c55e" },
  { value: 2, label: "適中", color: "#84cc16" },
  { value: 3, label: "有挑戰", color: "#eab308" },
  { value: 4, label: "很吃力", color: "#f97316" },
  { value: 5, label: "極限", color: "#ef4444" },
] as const;
