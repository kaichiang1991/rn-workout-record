export const MOOD_EMOJIS = ["😢", "😕", "😐", "🙂", "😄"] as const;
export const MOOD_LABELS = ["很差", "不好", "普通", "不錯", "很棒"] as const;

export const CATEGORIES = {
  chest: { label: "胸部", icon: "🫁" },
  back: { label: "背部", icon: "🔙" },
  legs: { label: "腿部", icon: "🦵" },
  shoulders: { label: "肩膀", icon: "💪" },
  arms: { label: "手臂", icon: "💪" },
  core: { label: "核心", icon: "🎯" },
  cardio: { label: "有氧", icon: "🏃" },
  other: { label: "其他", icon: "🏋️" },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export const BODY_PARTS = {
  chest: { label: "胸", color: "#ef4444" },
  back: { label: "背", color: "#3b82f6" },
  shoulders: { label: "肩", color: "#8b5cf6" },
  arms: { label: "手臂", color: "#f97316" },
  legs: { label: "腿", color: "#22c55e" },
  core: { label: "核心", color: "#eab308" },
  cardio: { label: "有氧", color: "#06b6d4" },
} as const;

export type BodyPartKey = keyof typeof BODY_PARTS;

export const DIFFICULTY_LEVELS = [
  { value: 1, label: "輕鬆", color: "#22c55e" },
  { value: 2, label: "適中", color: "#84cc16" },
  { value: 3, label: "有挑戰", color: "#eab308" },
  { value: 4, label: "很吃力", color: "#f97316" },
  { value: 5, label: "極限", color: "#ef4444" },
] as const;
