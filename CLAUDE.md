# 專案規範

## 程式碼風格

### TypeScript

- **禁止使用 `any` 作為型別定義**，必須明確定義型別
- 優先使用 `interface` 而非 `type` 定義物件型別
- 使用 `unknown` 配合型別守衛來處理未知型別

### 格式化

- 所有程式碼必須符合 Prettier 規範
- 提交前會自動執行 `prettier --write`
- 手動檢查：`npm run format:check`

### Linting

- 使用 oxlint 進行程式碼檢查
- 手動檢查：`npm run lint`

## Git 工作流程

### 路徑處理

- 路徑包含特殊字元（如 `()` 括號）時，執行 `git add` 需用雙引號包裹路徑
  - 例如：`git add "app/(tabs)/index.tsx"`

### Pre-commit Hook

每次 commit 前會自動執行：

1. `lint-staged` - 對暫存檔案執行 oxlint 和 prettier
2. `npm run test` - 執行測試（若無測試檔案則直接通過）

### Commit 前檢查清單

- [ ] TypeScript 型別檢查通過 (`npm run typecheck`)
- [ ] oxlint 檢查通過 (`npm run lint`)
- [ ] Prettier 格式正確 (`npm run format:check`)
- [ ] 測試通過 (`npm run test`)

## 專案結構

```
app/          # Expo Router 頁面
src/
  ├── db/         # 資料庫相關
  ├── hooks/      # React Hooks
  ├── components/ # 可重用元件
  ├── store/      # Zustand 狀態
  └── utils/      # 工具函數
```

## 常用指令

```bash
npm run start        # 啟動開發伺服器
npm run lint         # 執行 oxlint 檢查
npm run format       # 格式化所有檔案
npm run format:check # 檢查格式
npm run typecheck    # TypeScript 型別檢查
npm run test         # 執行測試
```
