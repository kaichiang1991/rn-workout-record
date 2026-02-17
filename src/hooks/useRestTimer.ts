import { useState, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  requestNotificationPermission,
  scheduleRestEndNotification,
  cancelNotification,
  playAlarmFeedback,
} from "@/utils/notifications";

interface UseRestTimerReturn {
  timeLeft: number;
  isActive: boolean;
  start: (duration: number) => Promise<void>;
  cancel: () => void;
}

export function useRestTimer(): UseRestTimerReturn {
  const [endTime, setEndTime] = useState<number | null>(null);
  const [notificationId, setNotificationId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
      setNotificationId(notifId);
    } else {
      console.warn("通知權限被拒絕，僅前景計時器可用");
    }
  };

  const cancel = () => {
    // Clear state
    setEndTime(null);
    setTimeLeft(0);
    setIsActive(false);

    // Cancel notification
    if (notificationId) {
      cancelNotification(notificationId);
      setNotificationId(null);
    }

    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
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
      const maxDuration = 10 * 60; // 10 minutes
      if (remaining > maxDuration) {
        console.warn("偵測到異常時間，重置計時器");
        cancel();
        return;
      }

      setTimeLeft(remaining);

      // Time's up
      if (remaining === 0) {
        playAlarmFeedback();
        setIsActive(false);
        setEndTime(null);

        // Clear notification
        if (notificationId) {
          cancelNotification(notificationId);
          setNotificationId(null);
        }

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [endTime, notificationId]);

  // Listen to App state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (nextAppState === "active" && notificationId) {
        // Back to foreground: cancel notification (avoid duplicate)
        cancelNotification(notificationId);
      }
      // No extra action needed when going to background - notification already scheduled
    });

    return () => {
      subscription.remove();
    };
  }, [notificationId]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (notificationId) {
        cancelNotification(notificationId);
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
