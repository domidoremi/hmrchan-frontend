# Public 目录优化指南

本文档说明 `public/` 目录中静态资源的优化策略和最佳实践。

## 目录结构

```
public/
├── icons/                    # PWA 图标
│   ├── icon-*.png           # 各种尺寸的应用图标
│   ├── icon-maskable-*.png  # 自适应图标
│   ├── shortcut-*.png       # 快捷方式图标
│   └── README.md            # 图标说明文档
├── screenshots/             # PWA 截图（可选）
│   ├── home-mobile.png
│   └── home-desktop.png
├── _headers                 # Cloudflare Pages HTTP 头配置
├── _redirects               # Cloudflare Pages 重定向规则
├── _routes.json             # Cloudflare Pages Functions 路由
├── favicon.ico              # 网站图标
├── manifest.json            # PWA 清单文件
├── offline.html             # 离线页面
├── robots.txt               # 搜索引擎爬虫规则
├── sitemap.xml              # 网站地图
└── sw.js                    # Service Worker（构建时更新）
```

## 优化内容

### 1. PWA Manifest (manifest.json)

**优化点**：

- ✅ 添加完整的图标尺寸（72x72 到 512x512）
- ✅ 添加 maskable 图标支持自适应
- ✅ 添加应用截图（用于安装提示）
- ✅ 优化快捷方式配置（添加图标和 URL 参数）
- ✅ 添加分享目标支持（支持图片/视频分享）
- ✅ 改进描述和元数据

**关键配置**：

```json
{
  "name": "MomiChan - 籾山ひめり Fan Hub",
  "short_name": "MomiChan",
  "start_url": "/?source=pwa",
  "display": "standalone",
  "icons": [
    // 标准图标 + maskable 图标
  ],
  "shortcuts": [
    // 带图标的快捷方式
  ],
  "share_target": {
    // 支持分享图片/视频
  }
}
```

### 2. Sitemap (sitemap.xml)

**优化点**：

- ✅ 添加 `lastmod`（最后修改时间）
- ✅ 添加 `changefreq`（更新频率）
- ✅ 添加 `priority`（优先级）
- ✅ 添加多语言支持（hreflang）
- ✅ 添加图片命名空间（为未来扩展）

**优先级策略**：
| 页面 | 优先级 | 更新频率 | 说明 |
|------|--------|----------|------|
| 首页 | 1.0 | daily | 最高优先级 |
| 探索 | 0.9 | daily | 核心功能页 |
| 搜索/作者 | 0.8 | weekly | 重要功能页 |
| 社区 | 0.7 | daily | 活跃内容页 |
| 关于/联系 | 0.5-0.6 | monthly | 静态页面 |
| 用户页面 | 0.2-0.4 | monthly | 低优先级 |

**自动生成**：

```bash
# 生成 sitemap
bun run sitemap:generate

# 预览（不写入文件）
bun run sitemap:preview
```

### 3. Robots.txt

**优化点**：

- ✅ 添加针对不同爬虫的规则
- ✅ 设置合理的 Crawl-delay
- ✅ 禁止访问私有路径和查询参数
- ✅ 禁止不良爬虫（AhrefsBot、SemrushBot 等）
- ✅ 添加 Sitemap 位置

**爬虫策略**：

```
Googlebot: 0.5s delay (快速)
Bingbot: 1s delay (正常)
Baiduspider: 2s delay (慢速)
不良爬虫: 完全禁止
```

### 4. Offline Page (offline.html)

**优化点**：

- ✅ 改进视觉设计（玻璃态、渐变背景）
- ✅ 添加动画效果（浮动、脉冲、淡入）
- ✅ 改进交互（键盘快捷键、自动重试）
- ✅ 添加网络状态实时监测
- ✅ 支持无障碍访问（ARIA 标签）
- ✅ 响应式设计和深色模式支持
- ✅ 支持 prefers-reduced-motion

**功能**：

- 自动检测网络恢复并重新加载
- 限制自动重试次数（最多 3 次）
- 键盘快捷键：Ctrl/Cmd+R 重新加载，Esc 返回
- 页面可见性检测

### 5. Service Worker (sw.js)

**版本管理**：

- 使用 `scripts/update-sw-version.js` 自动更新版本
- 版本格式：`v{major}-{minor}-{patch}-{git-hash}-b{build-number}`
- 只在内容变化时更新，避免不必要的缓存清空

详见：[Service Worker 版本管理文档](./service-worker-versioning.md)

## PWA 图标生成

### 当前状态

⚠️ **需要生成图标**：

- 标准图标：72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
- Maskable 图标：192x192, 512x512
- 快捷方式图标：96x96 (4个)

### 生成方法

#### 方法 1: 在线工具（推荐）

使用 [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)：

1. 上传 512x512 源图标
2. 选择所需尺寸
3. 下载并放入 `public/icons/`

#### 方法 2: 命令行工具

```bash
# 安装 sharp-cli
npm install -g sharp-cli

# 批量生成
sharp -i source.png -o public/icons/icon-72x72.png resize 72 72
sharp -i source.png -o public/icons/icon-96x96.png resize 96 96
# ... 其他尺寸
```

#### 方法 3: 使用脚本（TODO）

创建 `scripts/generate-icons.js` 自动生成所有尺寸。

### Maskable 图标设计要点

```
┌─────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← 10% 边距（可能被裁剪）
│ ▓▓┌─────────────────┐▓▓ │
│ ▓▓│                 │▓▓ │
│ ▓▓│   安全区域 80%   │▓▓ │ ← 重要内容放这里
│ ▓▓│                 │▓▓ │
│ ▓▓└─────────────────┘▓▓ │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │ ← 10% 边距（可能被裁剪）
└─────────────────────────┘
```

- 重要内容必须在中心 80% 区域
- 背景必须不透明
- 使用品牌色作为背景

## SEO 优化

### Sitemap 提交

生成 sitemap 后，提交到搜索引擎：

1. **Google Search Console**
   - 访问：https://search.google.com/search-console
   - 添加属性：`https://momichan.xyz`
   - 提交 sitemap：`https://momichan.xyz/sitemap.xml`

2. **Bing Webmaster Tools**
   - 访问：https://www.bing.com/webmasters
   - 添加网站
   - 提交 sitemap

3. **百度站长平台**
   - 访问：https://ziyuan.baidu.com
   - 添加网站
   - 提交 sitemap

### Robots.txt 验证

使用工具验证 robots.txt：

- Google: https://www.google.com/webmasters/tools/robots-testing-tool
- Bing: https://www.bing.com/webmasters/tools/robots-testing-tool

## PWA 测试

### 本地测试

1. **Chrome DevTools**

   ```bash
   bun run dev
   # 打开 Chrome DevTools → Application
   # 检查 Manifest、Service Worker、Storage
   ```

2. **Lighthouse 审计**

   ```bash
   bun run perf:lighthouse
   # 查看 PWA 评分和建议
   ```

3. **Maskable 图标测试**
   - 访问：https://maskable.app/
   - 上传 maskable 图标
   - 查看不同形状的效果

### 生产测试

1. **部署后验证**
   - 访问 https://momichan.xyz
   - 打开 DevTools → Application
   - 检查 Service Worker 是否激活
   - 测试离线功能

2. **安装测试**
   - Chrome: 地址栏右侧的安装图标
   - Edge: 设置 → 应用 → 安装此网站
   - 测试快捷方式和分享功能

## 性能优化

### 文件大小

| 文件          | 建议大小 | 当前 | 状态 |
| ------------- | -------- | ---- | ---- |
| manifest.json | < 10KB   | ~3KB | ✅   |
| sitemap.xml   | < 50KB   | ~2KB | ✅   |
| robots.txt    | < 5KB    | ~1KB | ✅   |
| offline.html  | < 20KB   | ~8KB | ✅   |
| favicon.ico   | < 10KB   | -    | ⚠️   |
| 图标 (每个)   | < 50KB   | -    | ⚠️   |

### 缓存策略

在 `_headers` 中配置：

```
# Manifest - 短缓存
/manifest.json
  Cache-Control: public, max-age=3600

# 图标 - 长缓存
/icons/*
  Cache-Control: public, max-age=31536000, immutable

# Service Worker - 禁止缓存
/sw.js
  Cache-Control: no-cache, no-store, must-revalidate
```

## 维护清单

### 定期更新（每月）

- [ ] 更新 sitemap.xml 的 lastmod 日期
- [ ] 检查 robots.txt 规则是否需要调整
- [ ] 验证 PWA 功能是否正常
- [ ] 检查图标是否需要更新

### 版本发布时

- [ ] 运行 `bun run sitemap:generate`
- [ ] 验证 manifest.json 版本信息
- [ ] 测试离线页面功能
- [ ] 提交新的 sitemap 到搜索引擎

### 重大更新时

- [ ] 更新 PWA 图标和截图
- [ ] 更新 manifest.json 描述
- [ ] 重新生成所有图标尺寸
- [ ] 更新 offline.html 样式

## 故障排查

### PWA 无法安装

**可能原因**：

1. manifest.json 格式错误
2. 缺少必需的图标尺寸
3. Service Worker 未激活
4. HTTPS 未启用

**解决方案**：

```bash
# 验证 manifest
node -e "console.log(JSON.parse(require('fs').readFileSync('public/manifest.json')))"

# 检查 Service Worker
# 打开 DevTools → Application → Service Workers
```

### 图标显示异常

**可能原因**：

1. 图标尺寸不正确
2. 图标路径错误
3. 缓存问题

**解决方案**：

1. 验证图标文件存在且尺寸正确
2. 清除浏览器缓存
3. 使用 maskable.app 测试 maskable 图标

### Sitemap 未被索引

**可能原因**：

1. robots.txt 阻止了爬虫
2. sitemap 格式错误
3. 未提交到搜索引擎

**解决方案**：

1. 验证 robots.txt 配置
2. 使用 XML 验证器检查 sitemap
3. 在搜索引擎控制台提交 sitemap

## 参考资料

- [Web App Manifest - MDN](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [PWA Best Practices](https://web.dev/pwa/)
- [Maskable Icons](https://web.dev/maskable-icon/)
- [Sitemap Protocol](https://www.sitemaps.org/protocol.html)
- [Robots.txt Specification](https://www.robotstxt.org/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
