# Rest Timer Background Alarm Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 實作休息計時器背景鬧鈴功能，當使用者按下組數+1時自動開始倒數，時間到時播放鬧鈴（前景/背景皆可）

**Architecture:** 採用最小侵入式整合方案，建立獨立的 RestTimer 元件和 useRestTimer Hook，使用改良版混合策略（前景用 setInterval，背景用本地通知），整合到現有的 WorkoutRecordForm 中

**Tech Stack:** React Native, Expo, expo-notifications, expo-av, Zustand, TypeScript

**Design Doc:** `docs/plans/2026-02-17-rest-timer-background-alarm-design.md`

---

## Task 1: 安裝必要套件

**Files:**

- Modify: `package.json`

**Step 1: 安裝 expo-notifications 和 expo-av**

```bash
npx expo install expo-notifications expo-av
```

Expected: 套件成功安裝，package.json 更新

**Step 2: 檢查安裝結果**

```bash
npm list expo-notifications expo-av
```

Expected: 顯示已安裝的版本

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install expo-notifications and expo-av for rest timer"
```

---

## Task 2: 實作通知工具函數（基礎）

**Files:**

- Create: `src/utils/notifications.ts`

**Step 1: 建立 notifications.ts 檔案並實作權限請求**

```typescript
import * as Notifications from "expo-notifications";

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
```

**Step 2: 實作通知排程函數**

在同一檔案中新增：

```typescript
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
        seconds,
      },
    });
    return id;
  } catch (error) {
    console.error("通知排程失敗:", error);
    return "";
  }
}
```

**Step 3: 實作通知取消函數**

在同一檔案中新增：

```typescript
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
```

**Step 4: 實作前景音效和震動函數**

在同一檔案中新增：

```typescript
import { Audio } from "expo-av";
import { Vibration } from "react-native";

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
```

**Step 5: TypeScript 型別檢查**

```bash
npm run typecheck
```

Expected: 無型別錯誤

**Step 6: Commit**

```bash
git add src/utils/notifications.ts
git commit -m "feat(utils): add notification utility functions"
```

---

## Task 3: 實作 useRestTimer Hook（核心邏輯）

**Files:**

- Create: `src/hooks/useRestTimer.ts`

**Step 1: 建立 Hook 骨架和介面定義**

```typescript
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

  // TODO: 實作邏輯

  return {
    timeLeft,
    isActive,
    start: async () => {},
    cancel: () => {},
  };
}
```

**Step 2: 實作 start() 函數**

在 Hook 中新增：

```typescript
const start = async (duration: number) => {
  // 1. 請求通知權限
  const hasPermission = await requestNotificationPermission();

  // 2. 計算結束時間（單一事實來源）
  const end = Date.now() + duration * 1000;
  setEndTime(end);
  setTimeLeft(duration);
  setIsActive(true);

  // 3. 排程本地通知（背景保險）
  if (hasPermission) {
    const notifId = await scheduleRestEndNotification(duration);
    setNotificationId(notifId);
  } else {
    console.warn("通知權限被拒絕，僅前景計時器可用");
  }
};
```

**Step 3: 實作 cancel() 函數**

在 Hook 中新增：

```typescript
const cancel = () => {
  // 清除狀態
  setEndTime(null);
  setTimeLeft(0);
  setIsActive(false);

  // 取消通知
  if (notificationId) {
    cancelNotification(notificationId);
    setNotificationId(null);
  }

  // 清除計時器
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
};
```

**Step 4: 實作前景計時器（useEffect）**

在 Hook 中新增：

```typescript
// 前景倒數計時器
useEffect(() => {
  if (!endTime) {
    // 清除計時器
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return;
  }

  // 啟動計時器
  intervalRef.current = setInterval(() => {
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

    // 防禦性檢查：異常時間
    const maxDuration = 10 * 60; // 10分鐘
    if (remaining > maxDuration) {
      console.warn("偵測到異常時間，重置計時器");
      cancel();
      return;
    }

    setTimeLeft(remaining);

    // 時間到
    if (remaining === 0) {
      playAlarmFeedback();
      setIsActive(false);
      setEndTime(null);

      // 清除通知
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
```

**Step 5: 實作 AppState 監聽（背景/前景切換）**

在 Hook 中新增：

```typescript
// 監聽 App 狀態變化
useEffect(() => {
  const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
    if (nextAppState === "active" && notificationId) {
      // 切回前景：取消通知（避免重複提醒）
      cancelNotification(notificationId);
    }
    // 切到背景時不需要額外操作，通知已排程
  });

  return () => {
    subscription.remove();
  };
}, [notificationId]);
```

**Step 6: 元件卸載時清理**

在 Hook 中新增：

```typescript
// 元件卸載時清理
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
```

**Step 7: 更新 return 語句**

```typescript
return {
  timeLeft,
  isActive,
  start,
  cancel,
};
```

**Step 8: TypeScript 型別檢查**

```bash
npm run typecheck
```

Expected: 無型別錯誤

**Step 9: Commit**

```bash
git add src/hooks/useRestTimer.ts
git commit -m "feat(hooks): add useRestTimer hook with mixed strategy"
```

---

## Task 4: 實作 RestTimer UI 元件

**Files:**

- Create: `src/components/RestTimer.tsx`

**Step 1: 建立 RestTimer 元件**

```typescript
import { View, Text, TouchableOpacity } from "react-native";

interface RestTimerProps {
  timeLeft: number;
  onCancel: () => void;
}

export function RestTimer({ timeLeft, onCancel }: RestTimerProps) {
  // 格式化時間為 MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <TouchableOpacity
      onPress={onCancel}
      className="mt-3 px-4 py-2 bg-primary-100 rounded-lg active:opacity-70"
    >
      <Text className="text-primary-600 text-lg font-medium text-center">{`休息中 ${formattedTime}`}</Text>
      <Text className="text-primary-400 text-xs text-center mt-0.5">點擊提前結束</Text>
    </TouchableOpacity>
  );
}
```

**Step 2: TypeScript 型別檢查**

```bash
npm run typecheck
```

Expected: 無型別錯誤

**Step 3: Commit**

```bash
git add src/components/RestTimer.tsx
git commit -m "feat(components): add RestTimer UI component"
```

---

## Task 5: 整合到 WorkoutRecordForm

**Files:**

- Modify: `src/components/WorkoutRecordForm.tsx`

**Step 1: 匯入必要的依賴**

在檔案頂部新增：

```typescript
import { useEffect, useState } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { useRestTimer } from "@/hooks/useRestTimer";
import { RestTimer } from "./RestTimer";
```

**Step 2: 在 WorkoutRecordForm 元件中新增狀態和邏輯**

在元件內部新增（在現有 props 解構之後）：

```typescript
// 休息計時器狀態
const [isTimerActive, setIsTimerActive] = useState(false);

// 從設定 store 取得休息計時器設定
const restTimerEnabled = useSettingsStore((s) => s.restTimerEnabled);
const restTimerMinutes = useSettingsStore((s) => s.restTimerMinutes);
const restTimerSeconds = useSettingsStore((s) => s.restTimerSeconds);

// 使用休息計時器 Hook
const { timeLeft, isActive, start, cancel } = useRestTimer();

// 同步計時器狀態
useEffect(() => {
  setIsTimerActive(isActive);
}, [isActive]);
```

**Step 3: 修改 handleSetCountChange 邏輯**

找到現有的 `onSetCountChange` 呼叫處，替換為：

```typescript
const handleSetCountChange = (newCount: number) => {
  onSetCountChange(newCount);

  // 條件 1: 組數增加
  // 條件 2: 使用者啟用了休息計時器
  if (newCount > setCount && restTimerEnabled) {
    const duration = restTimerMinutes * 60 + restTimerSeconds;
    start(duration);
  }
};
```

**Step 4: 新增計時器取消處理函數**

```typescript
const handleTimerCancel = () => {
  cancel();
  setIsTimerActive(false);
};
```

**Step 5: 修改組數計數器的 JSX**

找到組數計數器的區塊：

```tsx
{
  /* 組數計數器 */
}
<View className="mb-4">
  <Text className="text-base font-bold text-gray-700 mb-2">完成組數</Text>
  <View className="bg-white rounded-xl py-4 items-center">
    <SetCounter value={setCount} onChange={handleSetCountChange} />

    {/* 條件式渲染計時器 */}
    {isTimerActive && <RestTimer timeLeft={timeLeft} onCancel={handleTimerCancel} />}
  </View>
</View>;
```

**Step 6: TypeScript 型別檢查**

```bash
npm run typecheck
```

Expected: 無型別錯誤

**Step 7: Lint 檢查**

```bash
npm run lint
```

Expected: 無 lint 錯誤

**Step 8: 格式化檢查**

```bash
npm run format:check
```

Expected: 格式正確（如果不正確，執行 `npm run format`）

**Step 9: Commit**

```bash
git add src/components/WorkoutRecordForm.tsx
git commit -m "feat(workout): integrate rest timer into workout record form"
```

---

## Task 6: 手動測試驗證

**Testing Checklist:**

### 基本功能測試

**Test 1: 計時器啟動**

1. 開啟 App：`npm run start`
2. 進入訓練記錄頁面
3. 點擊「組數+1」按鈕
4. **Expected**: 計時器出現，顯示設定的時間（例如：01:30）

**Test 2: 計時器倒數**

1. 觀察計時器
2. **Expected**: 每秒減 1（01:30 → 01:29 → 01:28...）

**Test 3: 提前結束**

1. 點擊計時器
2. **Expected**: 計時器立即消失

**Test 4: 時間到自動結束**

1. 在設定中將時間改為 5 秒
2. 點擊「組數+1」
3. 等待 5 秒
4. **Expected**:
   - 手機震動
   - 計時器自動消失
   - （音效暫時未實作）

**Test 5: 設定關閉時不啟動**

1. 進入設定頁面
2. 關閉「組間計時」開關
3. 回到訓練記錄頁面
4. 點擊「組數+1」
5. **Expected**: 計時器不會出現

### 背景行為測試

**Test 6: 背景通知**

1. 在設定中將時間改為 10 秒
2. 點擊「組數+1」
3. 立即切換到其他 App（例如：設定）
4. 等待 10 秒
5. **Expected**: 收到通知「⏰ 休息結束 - 準備下一組訓練！」

**Test 7: 前景後切回**

1. 點擊「組數+1」（倒數 30 秒）
2. 等待 5 秒
3. 切換到背景
4. 等待 5 秒
5. 切回 App
6. **Expected**:
   - 計時器仍在倒數
   - 剩餘時間約為 20 秒（誤差 < 1 秒）

### 邊界情況測試

**Test 8: 組數減少不觸發**

1. 點擊「組數+1」到 3 組
2. 長按組數按鈕（組數-1）
3. **Expected**: 計時器不會啟動

**Test 9: 快速連續點擊**

1. 快速點擊「組數+1」3 次
2. **Expected**: 只有最後一次的計時器在運作（不會有多個計時器）

**Test 10: 通知權限拒絕**

1. 在手機設定中拒絕 App 的通知權限
2. 點擊「組數+1」
3. **Expected**:
   - 前景計時器正常運作
   - Console 出現警告：「通知權限被拒絕，僅前景計時器可用」

---

## Task 7: 最終檢查與文件更新

**Step 1: 執行完整測試套件**

```bash
npm run test
```

Expected: 所有測試通過

**Step 2: 執行型別檢查**

```bash
npm run typecheck
```

Expected: 無型別錯誤

**Step 3: 執行 Lint 檢查**

```bash
npm run lint
```

Expected: 無 lint 錯誤

**Step 4: 執行格式化檢查**

```bash
npm run format:check
```

Expected: 格式正確

**Step 5: 更新 README（如需要）**

如果專案有 README，可以新增功能說明：

```markdown
## 休息計時器

訓練時按下「組數+1」會自動開始休息倒數計時，時間到時會震動並發出通知提醒。

**功能特色：**

- ✅ 前景流暢倒數顯示
- ✅ 背景一定會響鬧鈴
- ✅ 點擊可提前結束休息
- ✅ 可在設定中調整時間或關閉功能
```

**Step 6: Commit**

```bash
git add README.md  # 如果有修改
git commit -m "docs: add rest timer feature description"
```

---

## 驗收標準

完成以上所有任務後，確認以下項目：

- [x] Task 1: 套件安裝成功
- [x] Task 2: 通知工具函數實作完成
- [x] Task 3: useRestTimer Hook 實作完成
- [x] Task 4: RestTimer UI 元件實作完成
- [x] Task 5: 整合到 WorkoutRecordForm
- [x] Task 6: 手動測試全部通過
- [x] Task 7: 最終檢查完成

### 功能驗收

- [ ] 組數+1 時計時器準確啟動（設定啟用時）
- [ ] 前景倒數流暢，每秒更新
- [ ] 背景通知 100% 會響
- [ ] 點擊計時器可提前結束
- [ ] 時間到自動消失並震動
- [ ] 設定關閉時不啟動計時器
- [ ] 時間準確度誤差 < 1 秒
- [ ] 無記憶體洩漏

### 程式碼品質

- [ ] TypeScript 無型別錯誤
- [ ] 通過 oxlint 檢查
- [ ] 通過 prettier 格式化檢查
- [ ] 遵循專案的程式碼風格規範

---

## 已知限制與未來改進

### 目前限制

- 音效檔案尚未準備，只有震動提示
- 計時器狀態不持久化（關閉 App 會清除）

### 未來可擴展

- 自訂鬧鈴音效
- 計時器暫停/恢復功能
- 不同動作類型使用不同休息時間
- 計時器歷史記錄

---

## 參考文件

- 設計文件：`docs/plans/2026-02-17-rest-timer-background-alarm-design.md`
- Expo Notifications 文件：https://docs.expo.dev/versions/latest/sdk/notifications/
- Expo AV 文件：https://docs.expo.dev/versions/latest/sdk/av/
- React Native AppState：https://reactnative.dev/docs/appstate
