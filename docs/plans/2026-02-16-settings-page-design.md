# Settings Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a settings page with a "rest timer between sets" toggle, accessible from the home header's top-left gear icon.

**Architecture:** Zustand store with `persist` middleware + AsyncStorage for persistent settings. New Stack page for settings UI, navigated from home header left button.

**Tech Stack:** Zustand 5, AsyncStorage (already installed), Expo Router, NativeWind

---

### Task 1: Create settingsStore with persist

**Files:**

- Create: `src/store/settingsStore.ts`

**Step 1: Create the settings store**

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingsState {
  restTimerEnabled: boolean;
  toggleRestTimer: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      restTimerEnabled: true,
      toggleRestTimer: () => set((state) => ({ restTimerEnabled: !state.restTimerEnabled })),
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
git commit -m "feat: add settingsStore with persist middleware"
```

---

### Task 2: Add settings page

**Files:**

- Create: `app/settings.tsx`

**Step 1: Create settings page**

```tsx
import { View, Text, Switch } from "react-native";
import { useSettingsStore } from "@/store/settingsStore";

export default function SettingsScreen() {
  const restTimerEnabled = useSettingsStore((s) => s.restTimerEnabled);
  const toggleRestTimer = useSettingsStore((s) => s.toggleRestTimer);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white mt-4 mx-4 rounded-xl px-4">
        <View className="flex-row items-center justify-between py-4">
          <Text className="text-base text-gray-800">組間計時</Text>
          <Switch
            value={restTimerEnabled}
            onValueChange={toggleRestTimer}
            trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
            thumbColor={restTimerEnabled ? "#3b82f6" : "#f4f3f4"}
          />
        </View>
      </View>
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add app/settings.tsx
git commit -m "feat: add settings page with rest timer toggle"
```

---

### Task 3: Register route and add header button

**Files:**

- Modify: `app/_layout.tsx` (add settings Stack.Screen)
- Modify: `app/(tabs)/_layout.tsx` (add headerLeft to index)

**Step 1: Register settings route in `app/_layout.tsx`**

Add after the `export` screen:

```tsx
<Stack.Screen name="settings" options={{ title: "設定" }} />
```

**Step 2: Add headerLeft gear button in `app/(tabs)/_layout.tsx`**

Create `HeaderSettingsButton` component and add `headerLeft` to the index tab:

```tsx
function HeaderSettingsButton() {
  return (
    <TouchableOpacity
      className="ml-4"
      activeOpacity={0.7}
      onPress={() => expoRouter.push("/settings")}
    >
      <Feather name="settings" size={22} color="#fff" />
    </TouchableOpacity>
  );
}
```

Then add to the index Tabs.Screen options:

```tsx
headerLeft: () => <HeaderSettingsButton />,
```

**Step 3: Commit**

```bash
git add app/_layout.tsx "app/(tabs)/_layout.tsx"
git commit -m "feat: add settings route and header gear button on home"
```

---

### Task 4: Verify

**Step 1:** Run `npm run typecheck` — expected: pass
**Step 2:** Run `npm run lint` — expected: pass
**Step 3:** Run `npm run format:check` — expected: pass (run `npm run format` if needed)
