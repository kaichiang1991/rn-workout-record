import { useState, useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  requestNotificationPermission,
  scheduleRestEndNotification,
  cancelNotification,
  playAlarmFeedback,
} from "@/utils/notifications";
import { useSettingsStore } from "@/store/settingsStore";

interface UseRestTimerReturn {
  timeLeft: number;
  isActive: boolean;
  start: (duration: number) => Promise<void>;
  cancel: () => void;
}

const MAX_TIMER_DURATION = 10 * 60; // 10 minutes in seconds

export function useRestTimer(): UseRestTimerReturn {
  const alarmVolume = useSettingsStore((s) => s.alarmVolume);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const notificationIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const cancel = useCallback(() => {
    // Clear state
    setEndTime(null);
    setTimeLeft(0);
    setIsActive(false);

    // Cancel notification
    if (notificationIdRef.current) {
      cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }

    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = async (duration: number) => {
    // 1. Request notification permission
    const hasPermission = await requestNotificationPermission();

    // 2. Calculate end time (single source of truth)
    const end = Date.now() + duration * 1000;
    setEndTime(end);
    setTimeLeft(duration);
    setIsActive(true);

    // 3. Schedule local notification (background backup)
    if (hasPermission) {
      const notifId = await scheduleRestEndNotification(duration);
      notificationIdRef.current = notifId;
    } else {
      console.warn("通知權限被拒絕，僅前景計時器可用");
    }
  };

  // Foreground countdown timer
  useEffect(() => {
    if (!endTime) {
      // Clear timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start timer
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

      // Defensive check: abnormal time
      if (remaining > MAX_TIMER_DURATION) {
        console.warn("偵測到異常時間，重置計時器");
        cancel();
        return;
      }

      setTimeLeft(remaining);

      // Time's up
      if (remaining === 0) {
        setIsActive(false);
        setEndTime(null);

        // Clear notification
        if (notificationIdRef.current) {
          cancelNotification(notificationIdRef.current);
          notificationIdRef.current = null;
        }

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        // Play alarm after state updates
        playAlarmFeedback(alarmVolume);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [endTime, cancel, alarmVolume]);

  // Listen to App state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && notificationIdRef.current) {
        // Back to foreground: cancel notification (avoid duplicate)
        cancelNotification(notificationIdRef.current);
      }
      // No extra action needed when going to background - notification already scheduled
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (notificationIdRef.current) {
        cancelNotification(notificationIdRef.current);
      }
    };
  }, []);

  return {
    timeLeft,
    isActive,
    start,
    cancel,
  };
}
