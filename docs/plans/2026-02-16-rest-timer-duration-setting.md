# Rest Timer Duration Setting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add minutes and seconds input fields to settings page for configuring rest timer duration, conditionally shown when rest timer toggle is enabled.

**Architecture:** Extend existing settingsStore with minutes/seconds state. Update settings page UI to conditionally render duration inputs based on toggle state. Use TextInput with numeric keyboard for user-friendly input.

**Tech Stack:** Zustand with persist, React Native TextInput, NativeWind

---

### Task 1: Update settingsStore with duration fields

**Files:**

- Modify: `src/store/settingsStore.ts`

**Step 1: Add duration state to settingsStore**

Add two new state fields and their setters to the store:

```typescript
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
```

**Step 2: Commit**

```bash
git add src/store/settingsStore.ts
git commit -m "feat(settings): add rest timer duration state (minutes/seconds)"
```

---

### Task 2: Add duration inputs to settings page

**Files:**

- Modify: `app/settings.tsx`

**Step 1: Update settings page with conditional duration inputs**

Replace the existing settings page with this implementation that includes duration inputs:

```tsx
import { View, Text, Switch, TextInput } from "react-native";
import { useSettingsStore } from "@/store/settingsStore";

export default function SettingsScreen() {
  const restTimerEnabled = useSettingsStore((s) => s.restTimerEnabled);
  const restTimerMinutes = useSettingsStore((s) => s.restTimerMinutes);
  const restTimerSeconds = useSettingsStore((s) => s.restTimerSeconds);
  const toggleRestTimer = useSettingsStore((s) => s.toggleRestTimer);
  const setRestTimerMinutes = useSettingsStore((s) => s.setRestTimerMinutes);
  const setRestTimerSeconds = useSettingsStore((s) => s.setRestTimerSeconds);

  const handleMinutesChange = (text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num)) {
      setRestTimerMinutes(num);
    } else if (text === "") {
      setRestTimerMinutes(0);
    }
  };

  const handleSecondsChange = (text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num)) {
      setRestTimerSeconds(num);
    } else if (text === "") {
      setRestTimerSeconds(0);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white mt-4 mx-4 rounded-xl px-4">
        {/* Rest timer toggle */}
        <View className="flex-row items-center justify-between py-4 border-b border-gray-100">
          <Text className="text-base text-gray-800">組間計時</Text>
          <Switch
            value={restTimerEnabled}
            onValueChange={toggleRestTimer}
            trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
            thumbColor={restTimerEnabled ? "#3b82f6" : "#f4f3f4"}
          />
        </View>

        {/* Duration inputs - conditionally shown */}
        {restTimerEnabled && (
          <View className="flex-row items-center justify-between py-4 pl-4">
            <Text className="text-base text-gray-600">計時時間</Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                className="w-12 h-10 border border-gray-300 rounded-lg text-center text-base"
                value={String(restTimerMinutes)}
                onChangeText={handleMinutesChange}
                keyboardType="numeric"
                maxLength={1}
              />
              <Text className="text-base text-gray-600">分</Text>
              <TextInput
                className="w-12 h-10 border border-gray-300 rounded-lg text-center text-base"
                value={String(restTimerSeconds)}
                onChangeText={handleSecondsChange}
                keyboardType="numeric"
                maxLength={2}
              />
              <Text className="text-base text-gray-600">秒</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add app/settings.tsx
git commit -m "feat(settings): add conditional duration inputs for rest timer"
```

---

### Task 3: Verify

**Step 1:** Run `npm run typecheck` — expected: pass
**Step 2:** Run `npm run lint` — expected: pass
**Step 3:** Run `npm run format:check` — expected: pass (run `npm run format` if needed)
