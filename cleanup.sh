#!/bin/bash

# 前端项目清理脚本
# 用于清理构建产物、缓存和临时文件

echo "🧹 开始清理前端项目..."

# 1. 清理构建产物
echo "📦 清理构建产物..."
rm -rf dist
rm -rf .vite
rm -rf .rolldown

# 2. 清理依赖
echo "📚 清理 node_modules..."
rm -rf node_modules

# 3. 清理缓存
echo "🗑️  清理缓存文件..."
rm -rf .turbo
rm -rf .cache
rm -rf .parcel-cache
rm -rf .next

# 4. 清理日志文件
echo "📄 清理日志文件..."
rm -f npm-debug.log*
rm -f yarn-debug.log*
rm -f yarn-error.log*
rm -f pnpm-debug.log*
rm -f bun.lockb.backup*

# 5. 清理 IDE 临时文件
echo "💻 清理 IDE 临时文件..."
rm -rf .vscode/.history
rm -rf .idea

# 6. 清理测试覆盖率报告
echo "🧪 清理测试覆盖率..."
rm -rf coverage
rm -rf .nyc_output

# 7. 清理 TypeScript 构建信息
echo "📘 清理 TypeScript 构建信息..."
rm -f tsconfig.tsbuildinfo
rm -f tsconfig.*.tsbuildinfo

# 8. 清理 ESLint 缓存
echo "🔍 清理 ESLint 缓存..."
rm -f .eslintcache

# 9. 清理临时文件
echo "🗂️  清理临时文件..."
find . -name ".DS_Store" -type f -delete
find . -name "Thumbs.db" -type f -delete
find . -name "*.log" -type f -delete

echo "✅ 清理完成！"
echo ""
echo "💡 提示："
echo "   - 运行 'bun install' 重新安装依赖"
echo "   - 运行 'bun run dev' 启动开发服务器"
echo "   - 运行 'bun run build' 构建生产版本"
