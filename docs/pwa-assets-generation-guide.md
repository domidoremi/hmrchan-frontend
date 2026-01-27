# PWA 图标和截图生成指南

本指南将帮助你生成 PWA 所需的所有图标和应用截图。

## 前置准备

### 1. 准备源图标

你需要准备一个高质量的源图标文件：

- **格式**: PNG（推荐）或 SVG
- **尺寸**: 至少 512x512 像素（推荐 1024x1024 或更大）
- **背景**: 透明背景（用于标准图标）
- **内容**: 简洁、清晰、易识别的图标设计

**设计建议**：

- 使用品牌色彩（主色：#8b5cf6 紫色）
- 避免过多细节（在小尺寸下可能看不清）
- 确保在深色和浅色背景下都清晰可见
- 不要使用小字体文字

### 2. 安装依赖

```bash
# 安装图标生成工具（sharp）
bun add -d sharp

# 安装截图生成工具（puppeteer）
bun add -d puppeteer
```

**注意**：

- `sharp` 用于图像处理，体积较小（~10MB）
- `puppeteer` 会下载 Chromium 浏览器（~170MB），首次安装需要一些时间

## 生成图标

### 步骤 1: 准备源图标

将你的源图标文件放在项目根目录，例如：`source-icon.png`

### 步骤 2: 运行生成脚本

```bash
# 使用 Node.js 运行脚本
node scripts/generate-icons.js source-icon.png
```

**脚本会自动生成**：

1. **标准图标**（8 个尺寸）：
   - icon-72x72.png
   - icon-96x96.png
   - icon-128x128.png
   - icon-144x144.png
   - icon-152x152.png
   - icon-192x192.png
   - icon-384x384.png
   - icon-512x512.png

2. **Maskable 图标**（2 个尺寸）：
   - icon-maskable-192x192.png
   - icon-maskable-512x512.png

3. **快捷方式图标**（4 个）：
   - shortcut-home.png (🏠)
   - shortcut-explore.png (🔍)
   - shortcut-favorites.png (❤️)
   - shortcut-settings.png (⚙️)

所有图标会保存到 `public/icons/` 目录。

### 步骤 3: 验证图标质量

1. **检查文件**：

   ```bash
   ls public/icons/
   ```

2. **测试 Maskable 图标**：
   - 访问 https://maskable.app/
   - 上传 `public/icons/icon-maskable-512x512.png`
   - 查看在不同形状遮罩下的效果
   - 确保重要内容在安全区域内

3. **本地预览**：
   ```bash
   bun run dev
   # 打开 Chrome DevTools → Application → Manifest
   # 查看图标预览
   ```

## 生成应用截图

### 步骤 1: 启动开发服务器

```bash
bun run dev
```

保持服务器运行，不要关闭终端。

### 步骤 2: 在新终端运行截图脚本

打开一个新的终端窗口，运行：

```bash
node scripts/generate-screenshots.js
```

**脚本会自动生成**：

1. **移动端截图**（390x844）：
   - home-mobile.png - 首页
   - explore-mobile.png - 探索页

2. **桌面端截图**（1920x1080）：
   - home-desktop.png - 首页
   - explore-desktop.png - 探索页

所有截图会保存到 `public/screenshots/` 目录。

### 步骤 3: 验证截图质量

1. **检查文件**：

   ```bash
   ls public/screenshots/
   ```

2. **查看截图**：
   - 打开 `public/screenshots/` 目录
   - 检查每张截图的内容和质量
   - 确保页面完全加载，没有加载中的状态

3. **调整截图**（可选）：
   如果需要调整截图内容，可以编辑 `scripts/generate-screenshots.js`：

   ```javascript
   const SCREENSHOTS = [
     {
       name: 'home-mobile.png',
       url: '/',
       viewport: { width: 390, height: 844 },
       description: '首页 - 移动端',
     },
     // 添加更多截图配置...
   ]
   ```

## 自定义配置

### 修改 Maskable 图标样式

编辑 `scripts/generate-icons.js` 中的配置：

```javascript
const CONFIG = {
  MASKABLE: {
    ICON_RATIO: 0.8, // 图标占 80% 空间
    PADDING_RATIO: 0.1, // 周围留 10% 边距
    BACKGROUND_COLOR: {
      // 背景色
      r: 139,
      g: 92,
      b: 246,
      alpha: 1,
    },
  },
}
```

### 修改快捷方式图标

编辑 `scripts/generate-icons.js` 中的快捷方式配置：

```javascript
const SHORTCUT_ICONS = [
  { name: 'shortcut-home.png', emoji: '🏠', color: '#8b5cf6' },
  { name: 'shortcut-explore.png', emoji: '🔍', color: '#06b6d4' },
  { name: 'shortcut-favorites.png', emoji: '❤️', color: '#ef4444' },
  { name: 'shortcut-settings.png', emoji: '⚙️', color: '#6b7280' },
]
```

### 添加更多截图

编辑 `scripts/generate-screenshots.js`：

```javascript
const SCREENSHOTS = [
  // 现有截图...
  {
    name: 'profile-mobile.png',
    url: '/profile',
    viewport: { width: 390, height: 844 },
    description: '个人资料 - 移动端',
  },
]
```

## 常见问题

### Q: sharp 安装失败

**A**: 尝试以下方法：

```bash
# 方法 1: 清除缓存重新安装
bun pm cache rm
bun add -d sharp

# 方法 2: 使用 npm 安装
npm install --save-dev sharp

# 方法 3: 指定版本
bun add -d sharp@0.33.0
```

### Q: puppeteer 下载 Chromium 失败

**A**: 设置镜像源：

```bash
# Windows PowerShell
$env:PUPPETEER_DOWNLOAD_HOST="https://registry.npmmirror.com/-/binary/chromium-browser-snapshots"
bun add -d puppeteer

# 或使用 npm
npm install --save-dev puppeteer
```

### Q: 截图脚本报错 "开发服务器未运行"

**A**: 确保：

1. 开发服务器正在运行（`bun run dev`）
2. 服务器地址是 `http://localhost:5173`
3. 如果使用其他端口，修改脚本中的 `BASE_URL`

### Q: 生成的图标模糊

**A**:

1. 确保源图标尺寸足够大（至少 512x512）
2. 使用 PNG 格式而不是 JPEG
3. 源图标应该是高质量的矢量图或高分辨率位图

### Q: Maskable 图标被裁剪

**A**:

1. 使用 https://maskable.app/ 测试
2. 确保重要内容在中心 80% 区域
3. 调整 `CONFIG.MASKABLE.ICON_RATIO` 参数

## 提交到 Git

生成所有资源后，提交到仓库：

```bash
# 添加所有生成的文件
git add public/icons/ public/screenshots/

# 提交
git commit -m "feat(pwa): 添加 PWA 图标和应用截图

- 生成标准图标（72x72 到 512x512）
- 生成 maskable 图标（192x192、512x512）
- 生成快捷方式图标（96x96）
- 生成应用截图（移动端和桌面端）
- 完善 PWA 安装体验"

# 推送
git push
```

## 验证 PWA 功能

### 本地验证

1. **构建生产版本**：

   ```bash
   bun run build
   bun run preview
   ```

2. **测试 PWA**：
   - 打开 Chrome DevTools → Application
   - 检查 Manifest 配置
   - 检查 Service Worker 状态
   - 测试离线功能

3. **Lighthouse 审计**：

   ```bash
   bun run perf:lighthouse
   ```

   确保 PWA 评分达到 90 分以上。

### 生产验证

部署后：

1. **安装测试**：
   - Chrome: 地址栏右侧的安装图标
   - Edge: 设置 → 应用 → 安装此网站
   - 验证图标显示正确

2. **快捷方式测试**：
   - 右键点击已安装的应用图标
   - 验证快捷方式是否显示
   - 测试快捷方式功能

3. **分享功能测试**：
   - 在其他应用中分享图片/视频
   - 选择 MomiChan 应用
   - 验证分享功能正常

## 性能优化建议

### 图标优化

```bash
# 使用 pngquant 压缩图标（可选）
npm install -g pngquant-bin
pngquant --quality=80-95 public/icons/*.png --ext .png --force
```

### 截图优化

```bash
# 使用 sharp-cli 压缩截图（可选）
npm install -g sharp-cli
sharp -i public/screenshots/*.png -o public/screenshots/ -q 85
```

## 下一步

完成图标和截图生成后：

1. ✅ 验证所有图标和截图质量
2. ✅ 测试 PWA 安装和功能
3. ✅ 提交到 Git 仓库
4. ✅ 部署到生产环境
5. ✅ 在真实设备上测试
6. ✅ 提交 sitemap 到搜索引擎
7. ✅ 监控 PWA 安装率和使用情况

## 参考资料

- [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
- [Maskable Icons](https://web.dev/maskable-icon/)
- [PWA Best Practices](https://web.dev/pwa/)
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [Puppeteer Documentation](https://pptr.dev/)
