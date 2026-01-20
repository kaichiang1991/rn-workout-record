# iOS 部署指南

本文件說明如何將 App 部署到 iPhone 實機上運行（使用免費 Apple ID）。

## 目錄

- [部署方式比較](#部署方式比較)
- [前置需求](#前置需求)
- [首次部署完整流程](#首次部署完整流程)
- [日常部署（已設定過）](#日常部署已設定過)
- [7 天後重新簽名](#7-天後重新簽名)
- [更換 App Icon](#更換-app-icon)
- [常見問題](#常見問題)

---

## 部署方式比較

| 方式                      | 費用     | 離線使用 | 有效期   | 適合場景     |
| ------------------------- | -------- | -------- | -------- | ------------ |
| Expo Go                   | 免費     | ❌       | 無限     | 開發測試     |
| **免費 Apple ID + Xcode** | **免費** | **✅**   | **7 天** | **個人使用** |
| Apple Developer Program   | $99/年   | ✅       | 1 年     | 正式發布     |

本文件主要說明「免費 Apple ID + Xcode」方案。

---

## 前置需求

### 硬體

- Mac 電腦（Windows 無法編譯 iOS）
- iPhone
- USB 傳輸線（Lightning 或 USB-C）

### 軟體

#### 1. 安裝 Xcode

從 App Store 安裝 Xcode，或從 [Apple Developer Downloads](https://developer.apple.com/download/all/) 下載特定版本。

**版本需求：Xcode 16.1 或更高**

檢查已安裝版本：

```bash
xcodebuild -version
```

#### Xcode 與 macOS 相容性

| Xcode 版本        | 最低 macOS 需求       |
| ----------------- | --------------------- |
| Xcode 16.0 - 16.2 | macOS 14.5+ (Sonoma)  |
| Xcode 16.3+       | macOS 15.2+ (Sequoia) |

> 如果 App Store 只提供不相容的版本，請從 [Apple Developer Downloads](https://developer.apple.com/download/all/) 手動下載。

#### 2. Apple ID

免費的 Apple ID 即可，不需要付費的 Developer Program。

---

## 首次部署完整流程

### 步驟 1：在 Xcode 登入 Apple ID

1. 開啟 Xcode
2. 進入 **Xcode → Settings**（或按 `⌘ + ,`）
3. 選擇 **Accounts** 分頁
4. 點擊左下角 **+** 按鈕
5. 選擇 **Apple ID**
6. 輸入你的 Apple ID 和密碼登入

```
┌─────────────────────────────────────────┐
│ Xcode → Settings → Accounts             │
├─────────────────────────────────────────┤
│                                         │
│  Apple IDs:                             │
│  ┌─────────────────────────────────┐    │
│  │ your@email.com                  │    │
│  │ Personal Team                   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [+] [-]                                │
│                                         │
└─────────────────────────────────────────┘
```

### 步驟 2：連接 iPhone 到 Mac

1. 用 USB 線連接 iPhone 到 Mac
2. iPhone 螢幕會出現「**信任這部電腦？**」
3. 點擊「**信任**」並輸入 iPhone 密碼

確認連接成功：

```bash
xcrun xctrace list devices | grep iPhone
```

應該會看到類似：

```
iPhone (17.0) (00008120-XXXXXXXXXXXX)
```

### 步驟 3：生成 iOS 原生專案

在專案根目錄執行：

```bash
# 確保 ios 資料夾不存在或是最新的
rm -rf ios

# 生成原生專案並安裝依賴
npx expo prebuild --platform ios
```

> 這會根據 `app.json` 的設定生成完整的 Xcode 專案

### 步驟 4：Build 並安裝到 iPhone

```bash
npm run deploy:dev
```

或直接執行：

```bash
npx expo run:ios --configuration Release --device
```

**過程說明：**

1. Metro Bundler 啟動並打包 JavaScript
2. Xcode 編譯原生程式碼（首次約 5-10 分鐘）
3. 自動簽名並安裝到 iPhone

> 看到 "Build Succeeded" 和 "Complete 100%" 表示安裝成功

### 步驟 5：在 iPhone 上信任開發者

首次安裝時，直接開啟 App 會顯示「不受信任的開發者」。

請在 iPhone 上：

```
設定
 └── 一般
      └── VPN 與裝置管理
           └── 開發者 App
                └── [你的 Apple ID / 名稱]
                     └── 點擊「信任」
```

### 步驟 6：完成！

現在可以開啟 App 了！

**驗證離線運作：**

1. 關閉 Mac 上的 Terminal
2. 中斷 iPhone 的網路連線
3. 開啟 App，應該可以正常使用

---

## 日常部署（已設定過）

當你修改程式碼後，只需要：

```bash
npm run deploy:dev
```

不需要重新執行 `prebuild`，除非：

- 修改了 `app.json` 的原生設定（icon、bundleIdentifier 等）
- 新增了需要原生程式碼的套件

---

## 7 天後重新簽名

免費 Apple ID 簽名的 App 有效期只有 **7 天**。

### 過期症狀

- 點擊 App 圖示後閃退
- 無法開啟 App

### 解決方式

```bash
# 連接 iPhone 後執行
npm run deploy:dev
```

> 重新簽名不會遺失資料，只是更新簽名憑證

---

## 更換 App Icon

### Icon 規格

| 檔案                       | 用途         | 尺寸           | 注意事項       |
| -------------------------- | ------------ | -------------- | -------------- |
| `assets/icon.png`          | iOS App Icon | 1024 x 1024 px | 不可有透明背景 |
| `assets/adaptive-icon.png` | Android Icon | 1024 x 1024 px | 可有透明背景   |
| `assets/splash-icon.png`   | 啟動畫面     | 1024 x 1024 px | -              |

### 更新步驟

1. 準備新的 icon 圖片（1024x1024 PNG，無透明背景）
2. 替換 `assets/icon.png`
3. 重新生成原生專案：
   ```bash
   rm -rf ios
   npx expo prebuild --platform ios
   npm run deploy:dev
   ```

### Icon 製作工具

- [Icon Kitchen](https://icon.kitchen/) - 免費線上工具
- [App Icon Generator](https://www.appicon.co/) - 自動生成各尺寸
- [Figma](https://figma.com) / [Canva](https://canva.com) - 設計工具

---

## 常見問題

### Build 相關

#### Q: 出現 "Xcode version too low" 或 "requires Xcode 16.1"

**A:** 需要更新 Xcode。如果 App Store 版本不相容你的 macOS，從 [Apple Developer Downloads](https://developer.apple.com/download/all/) 下載 Xcode 16.1 或 16.2。

#### Q: `pod install` 失敗

**A:** 嘗試清除並重新安裝：

```bash
rm -rf ios
npx expo prebuild --platform ios --clean
```

#### Q: Build 過程卡住或失敗

**A:** 清除快取重試：

```bash
rm -rf ios node_modules/.cache ~/Library/Developer/Xcode/DerivedData
npx expo prebuild --platform ios --clean
npm run deploy:dev
```

### 安裝與執行相關

#### Q: 出現 "profile has not been explicitly trusted"

**A:** 需要在 iPhone 設定中信任開發者：

```
設定 → 一般 → VPN 與裝置管理 → 開發者 App → 信任
```

#### Q: App 開啟後黑屏

**A:** 可能是 build cache 問題：

```bash
rm -rf ios node_modules/.cache
npx expo prebuild --platform ios --clean
npm run deploy:dev
```

#### Q: 7 天後 App 無法開啟（閃退）

**A:** 免費簽名過期，重新部署即可：

```bash
npm run deploy:dev
```

### 設定相關

#### Q: Bundle Identifier 衝突

**A:** 修改 `app.json` 中的 `bundleIdentifier` 為唯一值：

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourname.workout-record"
    }
  }
}
```

然後重新 prebuild：

```bash
rm -rf ios
npx expo prebuild --platform ios
```

> 注意：更換 Bundle Identifier 會被視為新 App，舊資料不會轉移

#### Q: 找不到 iPhone 裝置

**A:**

1. 確認 USB 線連接正常
2. 在 iPhone 上點擊「信任這部電腦」
3. 重新執行檢測：
   ```bash
   xcrun xctrace list devices | grep iPhone
   ```

#### Q: Metro Bundler 一直在運行

**A:** Release build 完成後可以直接關掉 Terminal。App 已包含所有程式碼，不需要 Metro 伺服器。

---

## 指令速查

```bash
# === 開發 ===
npm start                    # 啟動開發伺服器（配合 Expo Go 使用）

# === 部署 ===
npm run deploy:dev           # 部署到 iPhone（Release，可離線使用）

# === 重建 ===
rm -rf ios                   # 刪除原生專案
npx expo prebuild --platform ios           # 重新生成
npx expo prebuild --platform ios --clean   # 清除並重新生成

# === 檢查 ===
xcodebuild -version                        # 查看 Xcode 版本
xcrun xctrace list devices | grep iPhone   # 查看連接的 iPhone
```

---

## 進階：正式發布到 App Store

如需上架 App Store 或透過 TestFlight 分享給更多人測試：

1. 購買 [Apple Developer Program](https://developer.apple.com/programs/)（$99 USD/年）

2. 使用 EAS Build：
   ```bash
   npm install -g eas-cli
   eas login
   eas build --platform ios --profile production
   eas submit --platform ios
   ```

詳細說明請參考 [Expo EAS 官方文件](https://docs.expo.dev/build/introduction/)。
