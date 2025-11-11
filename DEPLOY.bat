@echo off
chcp 65001 >nul
REM 🚀 生产环境部署脚本 (Windows)
REM 使用方法: DEPLOY.bat

echo 🔍 检查工作目录状态...
git status

echo.
echo 📦 准备提交生产版本...
git add .

echo.
echo ✍️  提交更改...
git commit -m "chore: production ready - restore console dropping and clean up debug logs" -m "" -m "核心改动：" -m "- 恢复生产环境 console 删除配置" -m "- 移除详细的调试日志" -m "- 保留核心 HTTPS 强制转换逻辑" -m "- 保留 nativeFetchAdapter（绕过 XHR 拦截）" -m "- Service Worker HTTPS 保护已激活" -m "" -m "Mixed Content 问题已完全解决：" -m "✅ 硬编码 HTTPS URL" -m "✅ 使用原生 Fetch 适配器" -m "✅ 多层 HTTPS 防护" -m "✅ Service Worker HTTPS 强制" -m "" -m "应用已准备好生产部署。"

echo.
echo 🚀 推送到远程仓库...
git push origin main

echo.
echo ✅ 部署完成！
echo.
echo ⏰ 等待 Cloudflare Pages 构建（约 2-5 分钟）
echo 🔗 构建完成后访问生产 URL 进行验证
echo.
echo 📋 验证清单：
echo   ✓ 检查控制台无 Mixed Content 错误
echo   ✓ 验证所有请求都是 HTTPS
echo   ✓ 测试登录、帖子列表、媒体播放等功能
echo.
echo 📚 详细信息请查看 PRODUCTION_READY.md
echo.
pause
