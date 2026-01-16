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
