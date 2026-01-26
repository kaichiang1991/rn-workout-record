import { WorkoutSession } from "../db/client";

export type TrackingMode = "reps" | "time";

/**
 * 判斷訓練記錄的類型
 */
export function getTrackingMode(session: WorkoutSession): TrackingMode {
  return session.duration !== null ? "time" : "reps";
}

/**
 * 格式化時間顯示（統一用秒數）
 */
export function formatDuration(seconds: number): string {
  return `${seconds} 秒`;
}

/**
 * 格式化訓練記錄的摘要顯示
 */
export function formatSessionSummary(session: WorkoutSession): string {
  const mode = getTrackingMode(session);

  if (mode === "time") {
    return `${formatDuration(session.duration!)} × ${session.setCount}組`;
  }

  // 次數型
  if (session.isBodyweight) {
    return `${session.reps}下 × ${session.setCount}組`;
  }
  return `${session.weight}kg × ${session.reps}下 × ${session.setCount}組`;
}
