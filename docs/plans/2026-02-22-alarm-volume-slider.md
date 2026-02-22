# 鬧鈴音量 Slider 實作計劃

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在設定頁面的組間計時下方新增鬧鈴音量 slider，讓使用者可調整休息結束鬧鈴的音量（0.0 ~ 1.0，預設 0.5），並持久化儲存。

**Architecture:** 在 Zustand `settingsStore` 新增 `alarmVolume` 欄位，透過 AsyncStorage 持久化；設定頁面使用 `@react-native-community/slider` 呈現 UI；`playAlarmFeedback()` 改為接受 `volume` 參數，由 `useRestTimer` hook 讀取設定後傳入。

**Tech Stack:** React Native, Zustand + AsyncStorage (persist), `@react-native-community/slider`, expo-audio

---

### Task 1：安裝 Slider 套件

**Files:**

- 無需修改檔案（套件安裝）

**Step 1: 安裝套件**

```bash
npx expo install @react-native-community/slider
```

預期輸出：安裝成功，`package.json` 中出現 `"@react-native-community/slider"`

**Step 2: 確認安裝成功**

```bash
cat package.json | grep slider
```

預期輸出：`"@react-native-community/slider": "..."`

---

### Task 2：更新 settingsStore 新增 alarmVolume

**Files:**

- Modify: `src/store/settingsStore.ts`

目前內容（完整參考）：

```ts
interface SettingsState {
  restTimerEnabled: boolean;
  restTimerMinutes: number;
  restTimerSeconds: number;
  toggleRestTimer: () => void;
  setRestTimerMinutes: (minutes: number) => void;
  setRestTimerSeconds: (seconds: number) => void;
}
```

**Step 1: 在 interface 中新增欄位**

在 `SettingsState` interface 的 `setRestTimerSeconds` 後面加入：

```ts
  alarmVolume: number;
  setAlarmVolume: (volume: number) => void;
```

**Step 2: 在 create() 中新增預設值與 action**

在 `setRestTimerSeconds` action 之後加入：

```ts
      alarmVolume: 0.5,
      setAlarmVolume: (volume) => {
        const clamped = Math.max(0, Math.min(1, volume));
        set({ alarmVolume: clamped });
      },
```

**Step 3: TypeScript 型別檢查**

```bash
npm run typecheck
```

預期：無錯誤

**Step 4: Commit**

```bash
git add src/store/settingsStore.ts
git commit -m "feat(store): 新增 alarmVolume 設定欄位"
```

---

### Task 3：更新 notifications.ts 接受 volume 參數

**Files:**

- Modify: `src/utils/notifications.ts`

**Step 1: 移除 ALARM_VOLUME 常數，修改 playAlarmFeedback 簽名**

將第 8-9 行的常數：

```ts
// 鬧鈴音量：0.0（靜音）~ 1.0（裝置當前最大音量）
const ALARM_VOLUME = 0.5;
```

刪除。

將 `playAlarmFeedback` 函式簽名改為：

```ts
export async function playAlarmFeedback(volume: number = 0.5): Promise<void>;
```

**Step 2: 更新函式內使用 volume 參數**

將函式內的：

```ts
player.volume = ALARM_VOLUME;
```

改為：

```ts
player.volume = volume;
```

**Step 3: TypeScript 型別檢查**

```bash
npm run typecheck
```

預期：`useRestTimer.ts` 出現錯誤（因 `playAlarmFeedback()` 現在需要檢查，但有預設值所以應該不會報錯）

若無錯誤繼續下一步。

**Step 4: Commit**

```bash
git add src/utils/notifications.ts
git commit -m "feat(notifications): playAlarmFeedback 支援自訂音量參數"
```

---

### Task 4：更新 useRestTimer 讀取並傳入 alarmVolume

**Files:**

- Modify: `src/hooks/useRestTimer.ts`

**Step 1: import useSettingsStore**

在檔案頂部 import 區塊加入：

```ts
import { useSettingsStore } from "@/store/settingsStore";
```

**Step 2: 在 hook 內讀取 alarmVolume**

在 `useRestTimer` 函式內，`const [endTime, ...]` 等 state 宣告上方加入：

```ts
const alarmVolume = useSettingsStore((s) => s.alarmVolume);
```

**Step 3: 傳入 volume 至 playAlarmFeedback**

找到呼叫處（約第 107 行）：

```ts
playAlarmFeedback();
```

改為：

```ts
playAlarmFeedback(alarmVolume);
```

**Step 4: TypeScript 型別檢查**

```bash
npm run typecheck
```

預期：無錯誤

**Step 5: Commit**

```bash
git add src/hooks/useRestTimer.ts
git commit -m "feat(hooks): useRestTimer 讀取並套用 alarmVolume 設定"
```

---

### Task 5：在設定頁面新增音量 Slider UI

**Files:**

- Modify: `app/settings.tsx`

**Step 1: 新增 import**

在現有 import 區塊加入：

```ts
import Slider from "@react-native-community/slider";
```

**Step 2: 讀取 store 中的 alarmVolume**

在現有的 store selector 區塊（`const restTimerEnabled = ...` 等）加入：

```ts
const alarmVolume = useSettingsStore((s) => s.alarmVolume);
const setAlarmVolume = useSettingsStore((s) => s.setAlarmVolume);
```

**Step 3: 在 restTimerEnabled 區塊內新增 Slider row**

在計時時間輸入框的 `</View>` 後（約第 85 行，`)}` 前）加入：

```tsx
<View className="flex-row items-center justify-between py-4 pl-4 border-t border-gray-100">
  <Text className="text-base text-gray-600">鬧鈴音量</Text>
  <View className="flex-row items-center gap-2">
    <Text className="text-base text-gray-400">🔈</Text>
    <Slider
      style={{ width: 140, height: 40 }}
      minimumValue={0}
      maximumValue={1}
      step={0.01}
      value={alarmVolume}
      onValueChange={setAlarmVolume}
      minimumTrackTintColor="#3b82f6"
      maximumTrackTintColor="#d1d5db"
      thumbTintColor="#3b82f6"
    />
    <Text className="text-base text-gray-400">🔊</Text>
    <Text className="w-10 text-sm text-gray-500 text-right">{Math.round(alarmVolume * 100)}%</Text>
  </View>
</View>
```

**Step 4: TypeScript 型別檢查與 lint**

```bash
npm run typecheck && npm run lint
```

預期：無錯誤

**Step 5: Commit**

```bash
git add "app/settings.tsx"
git commit -m "feat(settings): 新增鬧鈴音量 slider 設定"
```

---

## 驗收檢查清單

- [ ] 設定頁面在組間計時開啟時顯示音量 slider
- [ ] 組間計時關閉時 slider 消失
- [ ] 拖動 slider 時百分比即時更新
- [ ] 關閉重啟 app 後音量設定持久化保留
- [ ] 計時結束時鬧鈴音量符合設定值
- [ ] `npm run typecheck` 通過
- [ ] `npm run lint` 通過
