import { Platform } from "react-native";
import * as LiveActivity from "expo-live-activity";

const REST_TITLE = "休息中";
const REST_SUBTITLE = "準備下一組訓練";

const REST_ACTIVITY_CONFIG: LiveActivity.LiveActivityConfig = {
  backgroundColor: "#1E3A8A",
  titleColor: "#FFFFFF",
  subtitleColor: "#BFDBFE",
  progressViewTint: "#60A5FA",
  progressViewLabelColor: "#FFFFFF",
  // 動態島收合時以數字顯示倒數（mm:ss），而非圓形進度
  timerType: "digital",
};

/**
 * 在鎖定畫面 / 動態島顯示休息倒數（僅 iOS 16.2+）
 * 倒數由系統依 endTime 自行更新，App 進入背景後仍會持續跳秒
 * @param endTime 休息結束時間（epoch 毫秒）
 * @returns Live Activity ID（不支援或失敗時回傳 null）
 */
export function startRestLiveActivity(endTime: number): string | null {
  if (Platform.OS !== "ios") return null;

  try {
    const id = LiveActivity.startActivity(
      {
        title: REST_TITLE,
        subtitle: REST_SUBTITLE,
        progressBar: { date: endTime },
      },
      REST_ACTIVITY_CONFIG
    );
    return id ?? null;
  } catch (error) {
    // 使用者關閉即時動態、iOS 版本過舊等情況，不影響原本的計時器
    console.warn("無法啟動即時動態:", error);
    return null;
  }
}

/**
 * 結束休息倒數的 Live Activity（立即從動態島移除）
 * @param id Live Activity ID
 */
export function stopRestLiveActivity(id: string): void {
  if (Platform.OS !== "ios" || !id) return;

  try {
    LiveActivity.stopActivity(id, { title: "休息結束", subtitle: REST_SUBTITLE });
  } catch (error) {
    // 使用者可能已手動滑掉即時動態，找不到 activity 屬正常情況
    console.warn("無法結束即時動態:", error);
  }
}
