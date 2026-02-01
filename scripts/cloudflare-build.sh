#!/bin/bash
# Cloudflare Pages 构建脚本
# 用于在 Cloudflare Pages 环境中构建项目

set -e

echo "🚀 开始 Cloudflare Pages 构建..."

# 检查是否安装了 Bun
if command -v bun &> /dev/null; then
    echo "✅ 检测到 Bun，使用 Bun 构建"
    bun install
    bun run build
else
    echo "⚠️  未检测到 Bun，使用 npm 构建"
    echo "📦 安装依赖（使用 legacy-peer-deps）..."
    npm install --legacy-peer-deps
    
    echo "🔨 开始构建..."
    npm run build
fi

echo "✅ 构建完成！"
