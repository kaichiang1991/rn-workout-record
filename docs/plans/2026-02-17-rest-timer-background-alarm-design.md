# Rest Timer Background Alarm Design

**日期**: 2026-02-17
**狀態**: 設計完成，待實作

---

## 📋 需求總結

### 使用者需求

1. **觸發時機**: 按下「組數+1」按鈕時自動開始倒數計時
2. **UI 位置**: 倒數計時器顯示在「組數+1」按鈕旁邊
3. **互動方式**: 點擊計時器可以提前結束休息
4. **計時結束提示**: 鬧鈴聲 + 震動 + 視覺提示（App 在前景時）
5. **結束後行為**: 計時器自動消失
6. **背景策略**: 改良版混合策略（前景用計時器，背景用通知）
7. **設定整合**: 只有在使用者啟用休息計時器設定時才啟動

### 技術目標

- ✅ 前景倒數顯示流暢（每秒更新）
- ✅ 背景一定會響鬧鈴（系統通知接管）
- ✅ 時間準確（基於 `Date.now()` 而非遞減計數）
- ✅ 最小侵入式整合（不修改現有 SetCounter）
- ✅ 職責分離（RestTimer 元件 + useRestTimer Hook）

---

## 🎯 選定方案：最小侵入式整合（方案 A）

### 為什麼選擇方案 A？

1. **符合需求**: 計時器在按鈕旁邊，邏輯清晰
2. **最佳實踐**: 職責分離、可測試、可維護
3. **低風險**: 不修改現有穩定的 `SetCounter`
4. **可擴展**: 未來如果需要在其他地方使用計時器，`RestTimer` 和 `useRestTimer` 可以直接重用

---

## 📐 架構設計

### 整體架構

```
┌─────────────────────────────────────────────────────┐
│ WorkoutRecordForm.tsx (訓練記錄表單)                │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │ SetCounter.tsx (組數按鈕)                  │   │
│  │  - 點擊 +1 組                              │   │
│  │  - 觸發 onSetCountChange                   │   │
│  └────────────────────────────────────────────┘   │
│                     ↓                               │
│         檢查 restTimerEnabled ✓                    │
│                     ↓                               │
│  ┌────────────────────────────────────────────┐   │
│  │ RestTimer.tsx (倒數計時器 UI)              │   │
│  │  - 顯示 MM:SS 格式                         │   │
│  │  - 點擊提前結束                            │   │
│  │  - 時間到自動消失                          │   │
│  └────────────────────────────────────────────┘   │
│                     ↑                               │
│              useRestTimer hook                      │
│              (計時器邏輯)                           │
└─────────────────────────────────────────────────────┘
```

### 核心設計原則

**1. 改良版混合策略（時間管理）**

- **單一事實來源**: `endTime = Date.now() + duration`
- **前景行為**: 每秒更新 UI，使用 `setInterval`
- **背景保險**: 立即排程本地通知
- **自動清理**: 切回前景時取消通知（避免重複提醒）

**2. 狀態管理層級**

- **全域狀態**: `settingsStore`（設定持久化）
- **本地狀態**: `WorkoutRecordForm` 管理 `isTimerActive`
- **Hook 封裝**: `useRestTimer` 封裝計時邏輯

**3. 元件職責劃分**

- `SetCounter`: 純粹的組數計數器（不變）
- `RestTimer`: 純粹的倒數顯示（UI 元件）
- `useRestTimer`: 計時邏輯 + 通知管理（業務邏輯）
- `WorkoutRecordForm`: 協調者（整合計時器到表單）

### 檔案結構

```
src/
├── components/
│   ├── SetCounter.tsx           (現有，不修改)
│   └── RestTimer.tsx            (新增)
├── hooks/
│   └── useRestTimer.ts          (新增)
├── utils/
│   └── notifications.ts         (新增)
└── store/
    └── settingsStore.ts         (現有，不修改)
```

### 需安裝套件

```bash
npx expo install expo-notifications expo-av
```

---

## 🧩 元件設計

### 1. RestTimer.tsx（新增元件）

**職責**: 純 UI 元件，顯示倒數計時器

**Props 介面**

```typescript
interface RestTimerProps {
  timeLeft: number; // 剩餘秒數
  onCancel: () => void; // 點擊提前結束的回調
}
```

**UI 規格**

- 背景色: 淡藍色 (`bg-primary-100`)
- 文字色: 主題藍 (`text-primary-600`)
- 格式: `MM:SS`（例如：`01:30`）
- 位置: SetCounter 下方，垂直居中
- 互動: 點擊整個區域都可以提前結束

---

### 2. useRestTimer.ts（新增 Hook）

**職責**: 管理計時器邏輯、通知排程、背景/前景切換

**介面定義**

```typescript
interface UseRestTimerReturn {
  timeLeft: number; // 剩餘秒數（用於 UI 顯示）
  isActive: boolean; // 計時器是否運行中
  start: (duration: number) => Promise<void>; // 開始計時
  cancel: () => void; // 取消計時
}
```

**內部狀態**

```typescript
const [endTime, setEndTime] = useState<number | null>(null);
const [notificationId, setNotificationId] = useState<string | null>(null);
const [timeLeft, setTimeLeft] = useState(0);
```

**核心邏輯**

1. **start()**: 開始計時
   - 計算 `endTime = Date.now() + duration * 1000`
   - 排程本地通知（背景保險）
   - 啟動前景計時器（setInterval）

2. **前景更新**（每秒）
   - 計算剩餘時間：`Math.max(0, (endTime - Date.now()) / 1000)`
   - 時間到時：播放音效、震動、視覺提示、自動消失

3. **背景切換監聽**（AppState）
   - 切到背景：通知已排程，無需額外操作
   - 切回前景：取消通知（避免重複提醒）

4. **cancel()**: 提前結束
   - 清除 endTime
   - 取消通知
   - 停止計時器

---

### 3. notifications.ts（新增工具模組）

**職責**: 封裝通知相關操作

**API 設計**

```typescript
// 請求通知權限
export async function requestNotificationPermission(): Promise<boolean>;

// 排程本地通知
export async function scheduleRestEndNotification(seconds: number): Promise<string>; // 返回 notification ID

// 取消通知
export async function cancelNotification(id: string): Promise<void>;

// 播放前景音效 + 震動
export async function playAlarmFeedback(): Promise<void>;
```

**通知內容配置**

```typescript
const notificationContent = {
  title: "⏰ 休息結束",
  body: "準備下一組訓練！",
  sound: true, // 系統預設音效
  priority: "high", // Android 高優先級
  vibrate: [0, 250, 250, 250], // 震動模式
};
```

---

### 4. WorkoutRecordForm.tsx（修改現有元件）

**新增狀態**

```typescript
const [isTimerActive, setIsTimerActive] = useState(false);
```

**新增邏輯**

```typescript
const restTimerEnabled = useSettingsStore((s) => s.restTimerEnabled);
const restTimerMinutes = useSettingsStore((s) => s.restTimerMinutes);
const restTimerSeconds = useSettingsStore((s) => s.restTimerSeconds);

const { timeLeft, isActive, start, cancel } = useRestTimer();

// 當計時器狀態改變時，同步本地狀態
useEffect(() => {
  setIsTimerActive(isActive);
}, [isActive]);

const handleSetCountChange = (newCount: number) => {
  onSetCountChange(newCount);

  // 條件 1: 組數增加
  // 條件 2: 使用者啟用了休息計時器
  if (newCount > setCount && restTimerEnabled) {
    const duration = restTimerMinutes * 60 + restTimerSeconds;
    start(duration);
  }
};

const handleTimerCancel = () => {
  cancel();
  setIsTimerActive(false);
};
```

**UI 整合**

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

---

## 🔄 資料流設計

### 完整資料流程

```
[使用者點擊 SetCounter +1]
         ↓
[WorkoutRecordForm.handleSetCountChange]
         ↓
    檢查條件：
    • newCount > setCount？
    • restTimerEnabled === true？
         ↓ 都符合
[呼叫 useRestTimer.start(duration)]
         ↓
    1. 計算 endTime
    2. 排程本地通知（背景保險）
    3. 啟動 setInterval（前景更新）
    4. 設定 isActive = true
         ↓
[WorkoutRecordForm 偵測到 isActive]
         ↓
    setIsTimerActive(true)
         ↓
[條件式渲染 RestTimer 元件]
         ↓
    前景倒數（每秒更新）
         ↓
    時間到（timeLeft === 0）
         ↓
    • 播放音效
    • 震動
    • 視覺提示
    • 設定 isActive = false
         ↓
[RestTimer 自動消失]
```

### 背景/前景切換

```
[App 切換到背景] → 本地通知已排程 → 時間到系統觸發通知
[App 切回前景] → 取消本地通知 → 前景計時器繼續運作
```

### 提前結束流程

```
[使用者點擊 RestTimer] → onCancel() → useRestTimer.cancel()
  → 清除 endTime
  → 取消本地通知
  → 清除 setInterval
  → 設定 isActive = false
  → RestTimer 消失
```

---

## ⚠️ 錯誤處理

### 錯誤場景與策略

| 錯誤類型     | 影響範圍   | 降級策略     | 使用者體驗             |
| ------------ | ---------- | ------------ | ---------------------- |
| 通知權限拒絕 | 背景提醒   | 僅前景計時器 | 可接受（仍有前景功能） |
| 通知排程失敗 | 背景提醒   | 靜默失敗     | 可接受                 |
| 音效播放失敗 | 音訊提示   | 使用震動     | 可接受                 |
| App 被終止   | 計時器狀態 | 通知仍觸發   | 良好（系統接管）       |
| 系統時間異常 | 計時準確性 | 重置計時器   | 罕見，可接受           |

### 降級策略

**通知權限被拒絕**

```typescript
if (!hasPermission) {
  // 降級處理：只使用前景計時器
  console.warn("通知權限被拒絕，僅前景計時器可用");
  // 仍然啟動前景計時器
  const end = Date.now() + duration * 1000;
  setEndTime(end);
  setIsActive(true);
  return; // 不排程通知
}
```

**音效播放失敗**

```typescript
try {
  Vibration.vibrate([0, 250, 250, 250]);
  const { sound } = await Audio.Sound.createAsync(/* ... */);
  await sound.playAsync();
} catch (error) {
  console.error("音效播放失敗:", error);
  // 至少震動成功了，不阻斷流程
}
```

---

## 🧪 測試策略

### 測試覆蓋率目標

| 模組                | 目標覆蓋率 | 重點項目           |
| ------------------- | ---------- | ------------------ |
| `useRestTimer`      | 90%+       | 計時邏輯、狀態管理 |
| `notifications.ts`  | 80%+       | 權限、排程、取消   |
| `RestTimer`         | 90%+       | UI 渲染、事件處理  |
| `WorkoutRecordForm` | 70%+       | 整合邏輯           |

### 單元測試範例

```typescript
// __tests__/hooks/useRestTimer.test.ts
test("呼叫 start() 應該啟動計時器", async () => {
  const { result } = renderHook(() => useRestTimer());

  await act(async () => {
    await result.current.start(90);
  });

  expect(result.current.isActive).toBe(true);
  expect(result.current.timeLeft).toBe(90);
});
```

### 手動測試檢查清單

#### 基本功能

- [ ] 組數+1 時計時器啟動
- [ ] 計時器顯示正確格式 (MM:SS)
- [ ] 點擊計時器可提前結束
- [ ] 時間到自動消失
- [ ] 設定關閉時不啟動計時器

#### 背景行為

- [ ] 切到背景時通知被排程
- [ ] 背景時間到會收到通知
- [ ] 切回前景時通知被取消
- [ ] 前景和背景時間準確一致

#### 提示效果

- [ ] 時間到播放音效
- [ ] 時間到手機震動
- [ ] 通知內容正確顯示

---

## 📦 實作順序建議

1. **階段一：通知基礎建設**
   - 安裝 `expo-notifications` 和 `expo-av`
   - 實作 `notifications.ts` 工具函數
   - 測試通知權限和排程

2. **階段二：計時器邏輯**
   - 實作 `useRestTimer` Hook
   - 撰寫單元測試
   - 測試前景倒數和背景通知

3. **階段三：UI 元件**
   - 實作 `RestTimer` 元件
   - 測試 UI 渲染和互動

4. **階段四：整合**
   - 修改 `WorkoutRecordForm`
   - 整合測試
   - 手動測試完整流程

5. **階段五：優化與收尾**
   - 錯誤處理完善
   - 效能優化
   - 文件更新

---

## 🎯 成功指標

- ✅ 組數+1 時計時器準確啟動（設定啟用時）
- ✅ 前景倒數流暢，無卡頓
- ✅ 背景 100% 會響鬧鈴
- ✅ 時間準確度誤差 < 1 秒
- ✅ 通知權限拒絕時降級策略正常運作
- ✅ 測試覆蓋率達標
- ✅ 無記憶體洩漏或性能問題

---

## 📝 附註

### 未來可擴展功能

- 自訂鬧鈴音效（目前使用系統預設）
- 計時器暫停/恢復功能
- 計時器歷史記錄
- 不同動作類型使用不同休息時間

### 技術債務

- 目前不實作計時器狀態持久化（關閉 App = 訓練結束）
- 音效文件需要準備（或使用系統預設）

---

## ✅ 設計批准

- [x] 架構設計
- [x] 元件設計
- [x] 資料流設計
- [x] 錯誤處理設計
- [x] 測試策略

**下一步**: 調用 `writing-plans` 技能創建詳細實作計畫
