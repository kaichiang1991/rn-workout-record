import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingsState {
  restTimerEnabled: boolean;
  restTimerMinutes: number;
  restTimerSeconds: number;
  toggleRestTimer: () => void;
  setRestTimerMinutes: (minutes: number) => void;
  setRestTimerSeconds: (seconds: number) => void;
  alarmVolume: number;
  setAlarmVolume: (volume: number) => void;
  historyDays: number;
  setHistoryDays: (days: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      restTimerEnabled: true,
      restTimerMinutes: 1,
      restTimerSeconds: 30,
      toggleRestTimer: () => set((state) => ({ restTimerEnabled: !state.restTimerEnabled })),
      setRestTimerMinutes: (minutes) => {
        // Clamp to 0-9 range
        const clamped = Math.max(0, Math.min(9, minutes));
        set({ restTimerMinutes: clamped });
      },
      setRestTimerSeconds: (seconds) => {
        // Clamp to 0-59 range
        const clamped = Math.max(0, Math.min(59, seconds));
        set({ restTimerSeconds: clamped });
      },
      alarmVolume: 0.5,
      setAlarmVolume: (volume) => {
        // Clamp to 0-1 range
        const clamped = Math.max(0, Math.min(1, volume));
        set({ alarmVolume: clamped });
      },
      historyDays: 7,
      setHistoryDays: (days) => {
        // Clamp to 1-365 range
        const clamped = Math.max(1, Math.min(365, days));
        set({ historyDays: clamped });
      },
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
