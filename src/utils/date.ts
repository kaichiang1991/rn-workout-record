// 統一使用 GMT+8 (Asia/Taipei) 時區
const TIMEZONE = "Asia/Taipei";

/**
 * 將日期轉換為 GMT+8 時區的 YYYY-MM-DD 格式
 * 這是所有日期分類和比較的基礎函數
 */
export function toLocalDateKey(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * 取得今天在 GMT+8 時區的 YYYY-MM-DD 格式
 */
export function getTodayDateKey(): string {
  return toLocalDateKey(new Date());
}

/**
 * 取得指定日期在 GMT+8 時區的年份
 */
export function getLocalYear(dateStr: string | Date): number {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return parseInt(date.toLocaleDateString("en-CA", { timeZone: TIMEZONE, year: "numeric" }), 10);
}

/**
 * 取得指定日期在 GMT+8 時區的月份 (0-11)
 */
export function getLocalMonth(dateStr: string | Date): number {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return (
    parseInt(date.toLocaleDateString("en-CA", { timeZone: TIMEZONE, month: "numeric" }), 10) - 1
  );
}

/**
 * 取得指定日期在 GMT+8 時區的日期 (1-31)
 */
export function getLocalDay(dateStr: string | Date): number {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return parseInt(date.toLocaleDateString("en-CA", { timeZone: TIMEZONE, day: "numeric" }), 10);
}

export function formatDate(dateStr: string, format: "short" | "long" = "short"): string {
  const date = new Date(dateStr);

  if (format === "long") {
    return date.toLocaleDateString("zh-TW", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("zh-TW", {
    timeZone: TIMEZONE,
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

export function isThisWeek(dateStr: string): boolean {
  const dateKey = toLocalDateKey(dateStr);
  const now = new Date();

  // 取得本週日（週的開始）在 GMT+8 的日期
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStartKey = toLocalDateKey(weekStart);

  return dateKey >= weekStartKey;
}

export function isThisMonth(dateStr: string): boolean {
  const dateYear = getLocalYear(dateStr);
  const dateMonth = getLocalMonth(dateStr);
  const nowYear = getLocalYear(new Date());
  const nowMonth = getLocalMonth(new Date());
  return dateMonth === nowMonth && dateYear === nowYear;
}

export function getMonthKey(dateStr: string): string {
  const year = getLocalYear(dateStr);
  const month = getLocalMonth(dateStr) + 1;
  return `${year}年${month}月`;
}
