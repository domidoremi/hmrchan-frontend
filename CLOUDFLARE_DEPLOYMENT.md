# Cloudflare Pages 部署指南

## 🚨 关键问题：混合内容错误 (Mixed Content Error)

### 问题描述
```
Mixed Content: The page at 'https://xxx.pages.dev/' was loaded over HTTPS, 
but requested an insecure XMLHttpRequest endpoint 'http://api.momichan.xyz/...'
This request has been blocked
```

**原因**: HTTPS网站无法请求HTTP资源（浏览器安全策略）

---

## ✅ 解决方案

### 方案 1: Cloudflare Pages 环境变量配置 (推荐)

#### 步骤 1: 登录 Cloudflare Dashboard
1. 访问 https://dash.cloudflare.com/
2. 进入 **Workers & Pages**
3. 选择你的项目（hmrchan-frontend）

#### 步骤 2: 配置环境变量
1. 点击 **Settings** → **Environment variables**
2. 选择 **Production** 标签页
3. 添加以下变量：

| Variable name | Value |
|---------------|-------|
| `VITE_API_BASE_URL` | `https://api.momichan.xyz` |
| `VITE_API_ENDPOINT` | `https://api.momichan.xyz/api/v1` |
| `NODE_ENV` | `production` |

#### 步骤 3: 重新部署
```bash
# 方法1: 通过Git推送触发自动部署
git add .
git commit -m "fix: configure production environment variables"
git push

# 方法2: 在Cloudflare Dashboard手动触发
# Settings → Deployments → Retry deployment
```

---

### 方案 2: 代码默认值 (已实施)

我已经修改了代码，添加了生产环境的HTTPS默认值作为备用：

**修改文件**:
1. `src/api/client.ts`
2. `src/utils/url.ts`

**修改内容**:
```typescript
// 生产环境自动使用HTTPS
const BASE_URL = import.meta.env.VITE_API_ENDPOINT 
  || (import.meta.env.PROD ? 'https://api.momichan.xyz/api/v1' : '/api/v1')

export function getApiBaseUrl(): string {
  // ... 环境变量检查 ...
  
  // 生产环境默认
  if (import.meta.env.PROD) {
    return 'https://api.momichan.xyz'
  }
  
  return ''
}
```

**优点**: 即使没有配置环境变量，也能正常工作  
**缺点**: API地址硬编码在代码中

---

## 📋 完整部署检查清单

### 构建前检查
- [ ] 确认 `.env.production` 配置正确
- [ ] 确认 API 端点使用 HTTPS
- [ ] 确认所有媒体URL使用 HTTPS

### Cloudflare Pages 配置

#### Build 设置
```
Build command: npm run build
Build output directory: dist
Node version: 18 (或更高)
```

#### Environment Variables (Production)
```env
VITE_API_BASE_URL=https://api.momichan.xyz
VITE_API_ENDPOINT=https://api.momichan.xyz/api/v1
VITE_APP_NAME=himeri chan
VITE_APP_DESCRIPTION=Social Media Content Aggregation System
VITE_ENABLE_DEVTOOLS=false
VITE_LOG_LEVEL=error
NODE_ENV=production
```

#### Environment Variables (Preview)
```env
# 可以使用相同的生产配置，或者使用测试环境
VITE_API_BASE_URL=https://api.momichan.xyz
VITE_API_ENDPOINT=https://api.momichan.xyz/api/v1
VITE_ENABLE_DEVTOOLS=true
VITE_LOG_LEVEL=debug
NODE_ENV=development
```

### 部署后检查
- [ ] 访问部署URL，检查Console无混合内容错误
- [ ] 测试API请求（F12 → Network → 确认使用HTTPS）
- [ ] 测试媒体加载（图片、视频）
- [ ] 测试所有主要功能

---

## 🔍 故障排查

### 问题 1: 仍然出现混合内容错误

**检查步骤**:
```javascript
// 1. 在浏览器Console运行
console.log('API Base:', import.meta.env.VITE_API_BASE_URL)
console.log('API Endpoint:', import.meta.env.VITE_API_ENDPOINT)
console.log('Is Prod:', import.meta.env.PROD)

// 2. 检查Network请求
// F12 → Network → 查找失败的请求
// Request URL 应该是 https:// 而不是 http://
```

**解决方案**:
1. 确认 Cloudflare Pages 环境变量已保存
2. 触发新的部署（环境变量修改需要重新部署）
3. 清除浏览器缓存并硬刷新（Ctrl+Shift+R）

### 问题 2: 环境变量未生效

**原因**: Vite 环境变量在构建时注入，运行时无法修改

**解决方案**:
```bash
# 1. 确认 Cloudflare Pages 已配置环境变量
# 2. 触发新的部署
# 3. 检查构建日志，确认变量被注入

# 构建日志中应该看到:
# VITE_API_ENDPOINT=https://api.momichan.xyz/api/v1
```

### 问题 3: CORS 错误

```
Access to XMLHttpRequest at 'https://api.momichan.xyz/api/v1/posts' 
from origin 'https://xxx.pages.dev' has been blocked by CORS policy
```

**解决方案**: 需要后端配置 CORS

后端需要添加允许的域名：
```python
# FastAPI 示例
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://71723daa.hmrchan-frontend.pages.dev",
        "https://f0f69d70.hmrchan-frontend.pages.dev",
        "https://hmrchan.pages.dev",  # 自定义域名
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🚀 优化建议

### 1. 使用自定义域名

**步骤**:
1. Cloudflare Pages → Custom domains
2. 添加域名（如 `app.hmrchan.xyz`）
3. Cloudflare 自动配置 SSL/TLS

**优点**:
- 更专业的URL
- 自动HTTPS
- 更好的SEO

### 2. 启用缓存优化

在 `public/_headers` 创建文件：
```
# 静态资源缓存
/assets/*
  Cache-Control: public, max-age=31536000, immutable

# HTML 文件不缓存
/*.html
  Cache-Control: public, max-age=0, must-revalidate

# Service Worker
/sw.js
  Cache-Control: public, max-age=0, must-revalidate
```

### 3. 启用 Cloudflare Analytics

```javascript
// 在 index.html 添加
<script defer src='https://static.cloudflareinsights.com/beacon.min.js' 
        data-cf-beacon='{"token": "YOUR_TOKEN"}'></script>
```

### 4. 配置 Page Rules

在 Cloudflare Dashboard：
1. **Cache Level**: Standard
2. **Browser Cache TTL**: Respect Existing Headers
3. **Always Use HTTPS**: On
4. **Auto Minify**: HTML, CSS, JS

---

## 📊 性能监控

### Cloudflare Web Analytics
- 页面访问量
- 地理分布
- 性能指标

### 监控关键指标
```javascript
// 在应用中添加性能监控
if (import.meta.env.PROD) {
  // 首次内容绘制 (FCP)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('FCP:', entry.startTime)
    }
  }).observe({ entryTypes: ['paint'] })
  
  // 最大内容绘制 (LCP)
  new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1]
    console.log('LCP:', lastEntry.startTime)
  }).observe({ entryTypes: ['largest-contentful-paint'] })
}
```

---

## 🔐 安全最佳实践

### 1. Content Security Policy (CSP)

在 `public/_headers` 添加：
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' https://api.momichan.xyz data: blob:; connect-src 'self' https://api.momichan.xyz https://cloudflareinsights.com; font-src 'self' data:; media-src 'self' https://api.momichan.xyz blob:;
```

### 2. 启用 HTTPS 严格传输安全 (HSTS)

```
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### 3. 其他安全头

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## 📝 部署脚本

创建 `scripts/deploy-cloudflare.sh`:
```bash
#!/bin/bash

echo "🚀 Deploying to Cloudflare Pages..."

# 1. 检查环境变量
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "❌ Error: CLOUDFLARE_API_TOKEN not set"
  exit 1
fi

# 2. 构建项目
echo "📦 Building project..."
npm run build

# 3. 部署
echo "☁️ Deploying to Cloudflare..."
npx wrangler pages deploy dist \
  --project-name=hmrchan-frontend \
  --branch=main

echo "✅ Deployment complete!"
```

---

## 🐛 调试技巧

### 本地测试生产构建
```bash
# 1. 使用生产环境变量构建
npm run build

# 2. 预览生产构建
npm run preview

# 3. 在浏览器测试
# http://localhost:4173
```

### 检查构建输出
```bash
# 查看构建产物
ls -lh dist/

# 检查资源大小
du -sh dist/assets/*

# 查找大文件
find dist -type f -size +500k
```

### 分析打包体积
```bash
# 安装分析工具
npm install -D rollup-plugin-visualizer

# 添加到 vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

plugins: [
  visualizer({ open: true, gzipSize: true })
]

# 构建后会生成 stats.html
npm run build
```

---

## 📚 相关资源

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Vite 环境变量](https://vitejs.dev/guide/env-and-mode.html)
- [混合内容说明](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content)
- [HTTPS 最佳实践](https://developers.google.com/web/fundamentals/security/encrypt-in-transit/why-https)

---

**最后更新**: 2025-11-11  
**版本**: v1.0  
**作者**: Cascade AI Assistant
