#!/bin/bash
set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 預設裝置
DEFAULT_DEVICE="Kai iPhone"
DEVICE="${1:-$DEFAULT_DEVICE}"
CONFIGURATION="${2:-Release}"

echo -e "${GREEN}🚀 開始部署到 ${DEVICE}...${NC}"

# 取得裝置 ID (使用 xctrace 格式，與 xcodebuild 相容)
DEVICE_ID=$(xcrun xctrace list devices 2>/dev/null | grep "$DEVICE" | grep -oE '\([0-9A-F-]+\)$' | tr -d '()')

if [ -z "$DEVICE_ID" ]; then
    echo -e "${RED}❌ 找不到裝置: $DEVICE${NC}"
    echo "可用裝置:"
    xcrun devicectl list devices 2>/dev/null | tail -n +2
    exit 1
fi

echo -e "${YELLOW}📱 裝置 ID: $DEVICE_ID${NC}"

# 進入 ios 目錄
cd "$(dirname "$0")/../ios"

# 構建 (包含自動簽名更新)
echo -e "${YELLOW}🔨 正在構建 ($CONFIGURATION)...${NC}"
xcodebuild \
    -workspace app.xcworkspace \
    -configuration "$CONFIGURATION" \
    -scheme app \
    -destination "id=$DEVICE_ID" \
    -allowProvisioningUpdates \
    | grep -E "(error:|warning:|BUILD SUCCEEDED|BUILD FAILED)" || true

# 檢查構建結果
APP_PATH="$HOME/Library/Developer/Xcode/DerivedData/app-*/Build/Products/$CONFIGURATION-iphoneos/app.app"
APP_ACTUAL=$(ls -d $APP_PATH 2>/dev/null | head -1)

if [ -z "$APP_ACTUAL" ]; then
    echo -e "${RED}❌ 構建失敗，找不到 app.app${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 構建成功${NC}"

# 安裝到裝置
echo -e "${YELLOW}📲 正在安裝到 $DEVICE...${NC}"
xcrun devicectl device install app --device "$DEVICE" "$APP_ACTUAL"

echo -e "${GREEN}✅ 安裝成功！${NC}"

# 啟動 app
echo -e "${YELLOW}🎯 正在啟動 app...${NC}"
xcrun devicectl device process launch --device "$DEVICE" com.kai.workout-record 2>&1 || {
    echo -e "${YELLOW}⚠️  App 無法自動啟動，請在裝置上手動開啟${NC}"
    echo -e "${YELLOW}   如果是首次安裝，請到「設定 > 一般 > VPN與裝置管理」信任開發者${NC}"
}

echo -e "${GREEN}🎉 部署完成！${NC}"
