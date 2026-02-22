# 鬧鈴音量 Slider 設計文件

**日期**：2026-02-22

## 背景

目前鬧鈴音量固定為常數 `ALARM_VOLUME = 0.5`，使用者無法調整。需要在設定頁面新增音量 slider，讓使用者自訂鬧鈴音量。

## 需求

- 在設定頁面「組間計時」下層新增鬧鈴音量 slider
- 範圍：0.0（靜音）～ 1.0（最大音量）
- 預設值：0.5
- 只在組間計時開啟時顯示（與計時時間輸入框行為一致）
- 設定值持久化存儲，重啟 app 後保留

## UI 設計

```
組間計時  [Switch ON]
  計時時間  [1 分 30 秒]
  鬧鈴音量  🔈 ─────●──── 🔊  50%   ← 新增
```

Slider 套件：`@react-native-community/slider`（Expo SDK 54 相容）

## 架構變更

### 1. settingsStore.ts

新增欄位：

- `alarmVolume: number` — 預設 0.5
- `setAlarmVolume: (volume: number) => void` — 限制在 0.0 ～ 1.0

### 2. settings.tsx

在 `restTimerEnabled && (...)` 區塊內，計時時間下方新增：

- Slider 元件（minimumValue=0, maximumValue=1, step=0.01）
- 左右圖示（🔈 / 🔊）與百分比顯示

### 3. notifications.ts

`playAlarmFeedback` 改為接受 `volume` 參數：

```ts
export async function playAlarmFeedback(volume: number = 0.5): Promise<void>;
```

移除 `ALARM_VOLUME` 常數。

### 4. useRestTimer.ts

讀取 `alarmVolume` 並傳入 `playAlarmFeedback`：

```ts
const alarmVolume = useSettingsStore((s) => s.alarmVolume);
// ...
playAlarmFeedback(alarmVolume);
```

## 資料流

```
settingsStore.alarmVolume
  ├── settings.tsx (讀寫 slider)
  └── useRestTimer.ts (讀取) → playAlarmFeedback(volume)
```

## 安裝依賴

```bash
npx expo install @react-native-community/slider
```
