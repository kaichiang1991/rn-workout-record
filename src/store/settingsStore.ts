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
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
