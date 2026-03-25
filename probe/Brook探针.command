#!/bin/bash
# Brook 远端探针启动脚本
# 把此文件拖到桌面，双击即可启动

cd "$(dirname "$0")"

# 尝试加载 nvm / homebrew node（Finder 启动时 PATH 可能不完整）
[ -f "$HOME/.nvm/nvm.sh" ] && source "$HOME/.nvm/nvm.sh"
[ -f "/opt/homebrew/bin/brew" ] && eval "$(/opt/homebrew/bin/brew shellenv)"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo "▶ Brook 探针启动中..."
npm start
