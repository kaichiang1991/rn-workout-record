import { WorkoutSession } from "../db/client";

export type TrackingMode = "reps" | "time";

/**
 * 判斷訓練記錄的類型
 */
export function getTrackingMode(session: WorkoutSession): TrackingMode {
  return session.duration !== null ? "time" : "reps";
}

/**
 * 格式化時間顯示（分鐘 + 秒鐘）
 */
export function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins > 0 && secs > 0) {
    return `${mins}分${secs}秒`;
  }
  if (mins > 0) {
    return `${mins}分`;
  }
  return `${secs}秒`;
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
