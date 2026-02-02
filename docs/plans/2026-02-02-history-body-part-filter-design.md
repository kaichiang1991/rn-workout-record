# 歷史紀錄頁面 - 部位篩選功能設計

## 概述

在歷史紀錄頁面的項目篩選下方，新增按照部位的篩選功能。

## UI 設計

### 篩選區域佈局

```
┌─────────────────────────────────────────────────┐
│  🔍 搜尋運動紀錄...                              │
└─────────────────────────────────────────────────┘

【項目篩選】
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ 全部 │ │ 深蹲 │ │ 臥推 │ │ ... │  ← 水平滾動
└──────┘ └──────┘ └──────┘ └──────┘

【部位篩選】
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ ○ 全部 │ │ 💪 胸部 │ │ 🔵 背部 │ │ ... │  ← 水平滾動，帶圖標+顏色
└────────┘ └────────┘ └────────┘ └────────┘
```

### 部位按鈕樣式

- 使用 `BODY_PARTS` 常數中定義的圖標和顏色
- 選中時：背景色為該部位顏色，文字白色
- 未選中時：白色背景，灰色邊框，文字為部位顏色

## 行為設計

### 互斥篩選

兩個篩選條件為**獨立互斥**關係：

- 選擇任一**部位** → 項目篩選自動切回「全部」
- 選擇任一**項目** → 部位篩選自動切回「全部」
- 兩個「全部」可同時選中（顯示所有紀錄）

## 技術實作

### 狀態管理

```typescript
// 現有
const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);

// 新增
const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPartKey | null>(null);
```

### 互斥邏輯

```typescript
const handleSelectBodyPart = (bodyPart: BodyPartKey | null) => {
  setSelectedBodyPart(bodyPart);
  setSelectedExerciseId(null);
};

const handleSelectExercise = (exerciseId: number | null) => {
  setSelectedExerciseId(exerciseId);
  setSelectedBodyPart(null);
};
```

### 資料篩選

利用 `useExercises` 現有的 `getExercisesByBodyPart` 方法取得部位對應的訓練項目，在前端過濾 sessions。

## 檔案變更

- `app/(tabs)/history.tsx` - 新增部位篩選 UI 和邏輯
