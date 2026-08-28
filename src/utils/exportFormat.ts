import type { ExerciseExportStat, ExportStats, DailyDetailItem } from "@/hooks/useExportData";

/**
 * 將總秒數格式化為分鐘顯示（最多一位小數）
 */
export function formatTotalMinutes(totalSeconds: number): string {
  const mins = Math.round((totalSeconds / 60) * 10) / 10;
  return `${mins}分鐘`;
}

/**
 * 匯出摘要列（天數、組數、時間加總）
 */
export function formatExportSummary(stats: ExportStats): string {
  const parts = [`共訓練 ${stats.totalDays} 天`];
  if (stats.totalSets > 0 || stats.totalDuration === 0) {
    parts.push(`總計 ${stats.totalSets} 組`);
  }
  if (stats.totalDuration > 0) {
    parts.push(`時間 ${formatTotalMinutes(stats.totalDuration)}`);
  }
  return parts.join(" ｜ ");
}

/**
 * 單一運動項目的統計顯示（次數型 / 時間型 / 混合）
 */
export function formatExerciseStat(stat: ExerciseExportStat): string {
  if (stat.totalDuration > 0 && stat.totalSets === 0) {
    return formatTotalMinutes(stat.totalDuration);
  }
  if (stat.totalDuration > 0) {
    return `${stat.totalSets}組 / ${stat.totalReps}下 ｜ ${formatTotalMinutes(stat.totalDuration)}`;
  }
  return `${stat.totalSets}組 / ${stat.totalReps}下`;
}

/**
 * 每日明細的單行顯示（不含備註）
 */
export function formatDetailItem(item: DailyDetailItem): string {
  if (item.duration !== null) {
    return `${item.exerciseName}｜${formatTotalMinutes(item.duration)}`;
  }
  let line = `${item.exerciseName}｜${item.sets}組 × ${item.reps}下`;
  if (item.weight !== null && item.weight > 0) {
    line += `｜${item.weight}kg`;
  }
  return line;
}
