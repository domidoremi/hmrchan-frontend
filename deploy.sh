#!/bin/bash
# 前端快速部署脚本

echo "🚀 HMRChan 前端部署检查"
echo ""

# 检查 Node 版本
NODE_VERSION=$(node -v)
echo "Node版本: $NODE_VERSION"

# 检查环境变量
if [ ! -f ".env.production" ]; then
    echo "❌ 缺少 .env.production"
    exit 1
fi

echo "✓ 环境配置存在"

# 安装依赖
echo ""
echo "📦 安装依赖..."
if command -v bun &> /dev/null; then
    bun install
else
    npm install
fi

# 类型检查
echo ""
echo "🔍 TypeScript 类型检查..."
npm run type-check
if [ $? -ne 0 ]; then
    echo "❌ 类型检查失败"
    exit 1
fi

# 构建
echo ""
echo "🏗️  构建生产版本..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

echo ""
echo "✅ 构建成功！"
echo ""
echo "输出目录: ./dist"
echo ""
echo "下一步:"
echo "1. 提交到 GitHub: git add . && git commit -m 'build: 前端生产版本' && git push"
echo "2. Cloudflare Pages 会自动部署"
echo "3. 或手动上传 dist 目录"
