# 快速生成 PWA 资源

## 🚀 快速开始

### 1️⃣ 安装依赖

```bash
bun add -d sharp puppeteer
```

### 2️⃣ 生成图标

```bash
# 准备一个 512x512 或更大的源图标（PNG 格式）
# 例如：source-icon.png

node scripts/generate-icons.js source-icon.png
```

**生成内容**：

- ✅ 8 个标准图标（72x72 到 512x512）
- ✅ 2 个 maskable 图标（192x192、512x512）
- ✅ 4 个快捷方式图标（96x96）

### 3️⃣ 生成截图

```bash
# 终端 1: 启动开发服务器
bun run dev

# 终端 2: 生成截图
node scripts/generate-screenshots.js
```

**生成内容**：

- ✅ 移动端截图（首页、探索页）
- ✅ 桌面端截图（首页、探索页）

### 4️⃣ 验证和提交

```bash
# 测试 maskable 图标
# 访问 https://maskable.app/ 上传 icon-maskable-512x512.png

# 查看生成的文件
ls public/icons/
ls public/screenshots/

# 提交到 Git
git add public/icons/ public/screenshots/
git commit -m "feat(pwa): 添加 PWA 图标和应用截图"
git push
```

## 📋 详细文档

查看完整指南：[docs/pwa-assets-generation-guide.md](docs/pwa-assets-generation-guide.md)

## ⚠️ 常见问题

### sharp 安装失败？

```bash
bun pm cache rm
bun add -d sharp
```

### puppeteer 下载慢？

```bash
# Windows PowerShell
$env:PUPPETEER_DOWNLOAD_HOST="https://registry.npmmirror.com/-/binary/chromium-browser-snapshots"
bun add -d puppeteer
```

### 截图脚本报错？

确保开发服务器正在运行：`bun run dev`

## 🎨 设计要求

### 源图标

- 尺寸：≥ 512x512 像素（推荐 1024x1024）
- 格式：PNG（透明背景）
- 内容：简洁、清晰、品牌色（#8b5cf6）

### Maskable 图标

- 重要内容必须在中心 80% 区域
- 周围 10% 可能被裁剪
- 使用 https://maskable.app/ 测试

## 📦 输出文件

```
public/
├── icons/
│   ├── icon-72x72.png
│   ├── icon-96x96.png
│   ├── icon-128x128.png
│   ├── icon-144x144.png
│   ├── icon-152x152.png
│   ├── icon-192x192.png
│   ├── icon-384x384.png
│   ├── icon-512x512.png
│   ├── icon-maskable-192x192.png
│   ├── icon-maskable-512x512.png
│   ├── shortcut-home.png
│   ├── shortcut-explore.png
│   ├── shortcut-favorites.png
│   └── shortcut-settings.png
└── screenshots/
    ├── home-mobile.png
    ├── home-desktop.png
    ├── explore-mobile.png
    └── explore-desktop.png
```

## ✅ 验证清单

- [ ] 所有图标生成成功
- [ ] Maskable 图标通过 maskable.app 测试
- [ ] 截图内容完整清晰
- [ ] 本地 PWA 安装测试通过
- [ ] Lighthouse PWA 评分 ≥ 90
- [ ] 提交到 Git 仓库
- [ ] 部署到生产环境
- [ ] 真实设备测试

## 🔗 相关命令

```bash
# 开发
bun run dev

# 构建
bun run build

# 预览
bun run preview

# Lighthouse 审计
bun run perf:lighthouse

# 生成 sitemap
bun run sitemap:generate
```
