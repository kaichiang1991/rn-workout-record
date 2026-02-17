import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";
import { Vibration } from "react-native";

/**
 * 請求通知權限
 * @returns 是否獲得權限
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  } catch (error) {
    console.error("請求通知權限失敗:", error);
    return false;
  }
}

/**
 * 排程休息結束通知
 * @param seconds 倒數秒數
 * @returns 通知 ID（失敗時返回空字串）
 */
export async function scheduleRestEndNotification(seconds: number): Promise<string> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ 休息結束",
        body: "準備下一組訓練！",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
    return id;
  } catch (error) {
    console.error("通知排程失敗:", error);
    return "";
  }
}

/**
 * 取消指定的通知
 * @param id 通知 ID
 */
export async function cancelNotification(id: string): Promise<void> {
  if (!id) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (error) {
    console.error("取消通知失敗:", error);
  }
}

/**
 * 播放鬧鈴音效和震動（前景使用）
 */
export async function playAlarmFeedback(): Promise<void> {
  try {
    // 震動（通常不會失敗）
    Vibration.vibrate([0, 250, 250, 250]);

    // TODO: 音效檔案準備好後再啟用
    // const { sound } = await Audio.Sound.createAsync(
    //   require('@/assets/sounds/alarm.mp3')
    // );
    // await sound.playAsync();
  } catch (error) {
    console.error("音效播放失敗:", error);
    // 至少震動成功了，不阻斷流程
  }
}
