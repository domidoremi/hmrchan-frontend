# PWA 设置检查清单

使用此清单跟踪 PWA 资源生成和配置进度。

## 📋 准备阶段

- [ ] 准备源图标文件（512x512 或更大，PNG 格式，透明背景）
- [ ] 确保开发环境正常（Node.js、Bun 已安装）
- [ ] 阅读快速指南：[GENERATE_PWA_ASSETS.md](GENERATE_PWA_ASSETS.md)

## 🔧 安装依赖

```bash
bun add -d sharp puppeteer
```

- [ ] sharp 安装成功
- [ ] puppeteer 安装成功（包括 Chromium 下载）

**遇到问题？** 查看 [常见问题](#常见问题)

## 🎨 生成图标

```bash
node scripts/generate-icons.js source-icon.png
```

### 标准图标（8 个）

- [ ] icon-72x72.png
- [ ] icon-96x96.png
- [ ] icon-128x128.png
- [ ] icon-144x144.png
- [ ] icon-152x152.png
- [ ] icon-192x192.png
- [ ] icon-384x384.png
- [ ] icon-512x512.png

### Maskable 图标（2 个）

- [ ] icon-maskable-192x192.png
- [ ] icon-maskable-512x512.png
- [ ] 使用 https://maskable.app/ 测试通过

### 快捷方式图标（4 个）

- [ ] shortcut-home.png (🏠)
- [ ] shortcut-explore.png (🔍)
- [ ] shortcut-favorites.png (❤️)
- [ ] shortcut-settings.png (⚙️)

## 📸 生成截图

```bash
# 终端 1
bun run dev

# 终端 2
node scripts/generate-screenshots.js
```

- [ ] home-mobile.png (390x844)
- [ ] home-desktop.png (1920x1080)
- [ ] explore-mobile.png (390x844)
- [ ] explore-desktop.png (1920x1080)
- [ ] 截图内容完整清晰

## ✅ 本地验证

### 文件检查

```bash
ls public/icons/
ls public/screenshots/
```

- [ ] 所有图标文件存在
- [ ] 所有截图文件存在
- [ ] 文件大小合理（图标 < 50KB，截图 < 500KB）

### PWA 功能测试

```bash
bun run build
bun run preview
```

- [ ] 打开 Chrome DevTools → Application → Manifest
- [ ] 图标显示正确
- [ ] 截图显示正确
- [ ] 快捷方式配置正确
- [ ] Service Worker 激活成功
- [ ] 离线页面正常工作

### Lighthouse 审计

```bash
bun run perf:lighthouse
```

- [ ] PWA 评分 ≥ 90
- [ ] 可安装性检查通过
- [ ] 离线功能检查通过

## 📤 提交到 Git

```bash
git add public/icons/ public/screenshots/
git commit -m "feat(pwa): 添加 PWA 图标和应用截图

- 生成标准图标（72x72 到 512x512）
- 生成 maskable 图标（192x192、512x512）
- 生成快捷方式图标（96x96）
- 生成应用截图（移动端和桌面端）
- 完善 PWA 安装体验"
git push
```

- [ ] 文件已添加到 Git
- [ ] 提交消息清晰
- [ ] 推送成功

## 🚀 生产部署

- [ ] 部署到 Cloudflare Pages
- [ ] 验证部署成功
- [ ] 检查生产环境 PWA 功能

## 📱 真实设备测试

### Android 设备

- [ ] Chrome 浏览器访问网站
- [ ] 看到"添加到主屏幕"提示
- [ ] 安装应用成功
- [ ] 图标显示正确
- [ ] 快捷方式功能正常
- [ ] 离线功能正常

### iOS 设备

- [ ] Safari 浏览器访问网站
- [ ] 分享 → 添加到主屏幕
- [ ] 安装应用成功
- [ ] 图标显示正确
- [ ] 启动画面正常

### 桌面设备

- [ ] Chrome/Edge 浏览器访问网站
- [ ] 地址栏显示安装图标
- [ ] 安装应用成功
- [ ] 图标显示正确
- [ ] 窗口模式正常

## 🔍 SEO 优化

```bash
bun run sitemap:generate
```

- [ ] sitemap.xml 生成成功
- [ ] 提交到 Google Search Console
- [ ] 提交到 Bing Webmaster Tools
- [ ] 提交到百度站长平台（可选）

## 📊 监控和优化

- [ ] 设置 Google Analytics（可选）
- [ ] 监控 PWA 安装率
- [ ] 监控离线使用情况
- [ ] 收集用户反馈
- [ ] 根据反馈优化图标和截图

## 🎉 完成！

恭喜！你已经完成了 PWA 资源的生成和配置。

### 下一步建议

1. **定期更新**：当品牌或设计变化时，重新生成图标
2. **监控性能**：使用 Lighthouse CI 持续监控 PWA 评分
3. **收集反馈**：了解用户对 PWA 功能的使用情况
4. **优化体验**：根据数据和反馈持续改进

### 相关文档

- [快速指南](GENERATE_PWA_ASSETS.md)
- [完整文档](docs/pwa-assets-generation-guide.md)
- [Public 目录优化](docs/public-assets-optimization.md)
- [Service Worker 版本管理](docs/service-worker-versioning.md)

---

## 常见问题

### Q: sharp 安装失败

```bash
bun pm cache rm
bun add -d sharp
```

### Q: puppeteer 下载 Chromium 失败

```bash
# Windows PowerShell
$env:PUPPETEER_DOWNLOAD_HOST="https://registry.npmmirror.com/-/binary/chromium-browser-snapshots"
bun add -d puppeteer
```

### Q: 截图脚本报错

确保开发服务器正在运行：`bun run dev`

### Q: 图标模糊

确保源图标尺寸足够大（至少 512x512）

### Q: Maskable 图标被裁剪

使用 https://maskable.app/ 测试，确保重要内容在中心 80% 区域

---

**需要帮助？** 查看 [完整文档](docs/pwa-assets-generation-guide.md) 或提交 Issue
