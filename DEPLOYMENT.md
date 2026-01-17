# Cloudflare Pages 部署指南

本文档详细说明如何将 MomiChan Frontend 部署到 Cloudflare Pages。

## 📋 目录

- [前置要求](#前置要求)
- [初次部署](#初次部署)
- [环境变量配置](#环境变量配置)
- [构建配置](#构建配置)
- [自动部署](#自动部署)
- [手动部署](#手动部署)
- [分支预览](#分支预览)
- [自定义域名](#自定义域名)
- [故障排查](#故障排查)

## 🔧 前置要求

### 必需条件

- Cloudflare 账号（[注册](https://dash.cloudflare.com/sign-up)）
- Git 仓库（GitHub、GitLab 或 Bitbucket）
- 项目代码已推送到远程仓库

### 可选工具

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) - 用于本地部署和管理

```bash
# 安装 Wrangler
bun add -g wrangler

# 登录 Cloudflare
wrangler login
```

## 🚀 初次部署

### 方法一：通过 Cloudflare Dashboard（推荐）

#### 1. 创建项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 选择 **Workers & Pages**
3. 点击 **Create application**
4. 选择 **Pages** 标签
5. 点击 **Connect to Git**

#### 2. 连接 Git 仓库

1. 选择 Git 提供商（GitHub/GitLab/Bitbucket）
2. 授权 Cloudflare 访问你的仓库
3. 选择要部署的仓库
4. 点击 **Begin setup**

#### 3. 配置构建设置

填写以下信息：

**项目名称:**

```
hmrchan-frontend
```

**生产分支:**

```
main
```

**构建命令:**

```bash
bun install && VITE_GIT_COMMIT=$CF_PAGES_COMMIT_SHA bun run build
```

**构建输出目录:**

```
dist
```

**根目录:**

```
/
```

#### 4. 配置环境变量

点击 **Environment variables** 添加以下变量：

| 变量名                    | 值                                        | 环境       |
| ------------------------- | ----------------------------------------- | ---------- |
| `VITE_API_BASE_URL`       | `https://api.momichan.xyz`                | Production |
| `VITE_API_ENDPOINT`       | `https://api.momichan.xyz/api/v1`         | Production |
| `VITE_API_URL`            | `/api`                                    | Production |
| `VITE_APP_NAME`           | `himeri chan`                             | Production |
| `VITE_APP_DESCRIPTION`    | `Social Media Content Aggregation System` | Production |
| `VITE_TURNSTILE_SITE_KEY` | `your_site_key_here`                      | Production |

> 💡 提示：`VITE_GIT_COMMIT` 会自动从 `$CF_PAGES_COMMIT_SHA` 注入，无需手动配置。

#### 5. 开始部署

1. 点击 **Save and Deploy**
2. 等待构建完成（通常 2-5 分钟）
3. 部署成功后，访问提供的 URL

### 方法二：通过 Wrangler CLI

```bash
# 1. 构建项目
bun run build

# 2. 部署到 Cloudflare Pages
wrangler pages deploy dist \
  --project-name=hmrchan-frontend \
  --branch=main

# 3. 访问部署的 URL
# https://hmrchan-frontend.pages.dev
```

## 🔐 环境变量配置

### 生产环境变量

在 Cloudflare Dashboard 中配置：

1. 进入项目设置: **Settings** → **Environment variables**
2. 选择 **Production** 环境
3. 添加以下变量：

```bash
# API 配置
VITE_API_BASE_URL=https://api.momichan.xyz
VITE_API_ENDPOINT=https://api.momichan.xyz/api/v1
VITE_API_URL=/api

# 应用信息
VITE_APP_NAME=himeri chan
VITE_APP_DESCRIPTION=Social Media Content Aggregation System

# Cloudflare Turnstile
VITE_TURNSTILE_SITE_KEY=0x4AAAA...

# Git 提交哈希（自动注入）
# VITE_GIT_COMMIT=$CF_PAGES_COMMIT_SHA
```

### 预览环境变量

为预览环境配置不同的变量：

1. 选择 **Preview** 环境
2. 添加测试环境的 API 地址：

```bash
VITE_API_BASE_URL=https://api-staging.momichan.xyz
VITE_API_ENDPOINT=https://api-staging.momichan.xyz/api/v1
# ... 其他变量
```

### 环境变量优先级

```
1. Preview 环境变量（分支预览）
2. Production 环境变量（生产部署）
3. .env 文件（本地开发）
```

## ⚙️ 构建配置

### 构建命令详解

```bash
bun install && VITE_GIT_COMMIT=$CF_PAGES_COMMIT_SHA bun run build
```

**组成部分：**

1. `bun install` - 安装依赖
2. `VITE_GIT_COMMIT=$CF_PAGES_COMMIT_SHA` - 注入 Git 提交哈希
3. `bun run build` - 执行构建脚本

### 构建脚本（package.json）

```json
{
  "scripts": {
    "build": "bun run type-check && vite build"
  }
}
```

**构建流程：**

1. TypeScript 类型检查
2. Vite 构建（使用 Rolldown）
3. 生成 `dist` 目录

### 构建优化

项目已配置以下优化：

- **代码分割** - 路由级别懒加载
- **Tree Shaking** - 移除未使用的代码
- **压缩** - Brotli + Gzip
- **资源优化** - 图片压缩、WebP 转换
- **CSS 优化** - 提取、压缩、内联关键 CSS

### 构建时间

| 环境             | 平均时间 |
| ---------------- | -------- |
| 本地开发         | ~3s      |
| Cloudflare Pages | ~2-5min  |

## 🔄 自动部署

### Git 推送触发

每次推送到 Git 仓库都会自动触发部署：

```bash
# 推送到 main 分支 → 生产部署
git push origin main

# 推送到其他分支 → 预览部署
git push origin develop
git push origin feature/new-feature
```

### 部署流程

```
1. Git Push
   ↓
2. Cloudflare 检测到推送
   ↓
3. 克隆仓库
   ↓
4. 安装依赖 (bun install)
   ↓
5. 运行构建命令
   ↓
6. 上传 dist 目录
   ↓
7. 部署到全球 CDN
   ↓
8. 发送部署通知
```

### 部署状态

在 Cloudflare Dashboard 查看：

- **Building** - 正在构建
- **Deploying** - 正在部署
- **Success** - 部署成功
- **Failed** - 部署失败

### 部署通知

配置 Webhook 接收部署通知：

1. 进入 **Settings** → **Notifications**
2. 添加 Webhook URL
3. 选择通知事件：
   - Deployment started
   - Deployment succeeded
   - Deployment failed

## 🖥️ 手动部署

### 使用 Wrangler CLI

```bash
# 1. 本地构建
bun run build

# 2. 部署到生产环境
wrangler pages deploy dist \
  --project-name=hmrchan-frontend \
  --branch=main \
  --commit-dirty=true

# 3. 部署到预览环境
wrangler pages deploy dist \
  --project-name=hmrchan-frontend \
  --branch=develop
```

### 使用拖放上传

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 选择项目
3. 点击 **Create deployment**
4. 拖放 `dist` 目录
5. 等待上传和部署完成

## 🌿 分支预览

### 自动预览

每个分支都会自动创建预览环境：

```bash
# 推送分支
git push origin feature/new-ui

# 预览 URL
https://feature-new-ui.hmrchan-frontend.pages.dev
```

### 预览环境特点

- 独立的 URL
- 使用 Preview 环境变量
- 不影响生产环境
- 适合测试和代码审查

### 管理预览部署

在 Cloudflare Dashboard：

1. 进入项目
2. 选择 **Deployments** 标签
3. 查看所有预览部署
4. 可以删除不需要的预览

### 预览环境限制

- 每个项目最多 500 个预览部署
- 预览部署会在 30 天后自动删除
- 可以手动删除不需要的预览

## 🌐 自定义域名

### 添加自定义域名

1. 进入项目设置
2. 选择 **Custom domains**
3. 点击 **Set up a custom domain**
4. 输入域名（如 `momichan.xyz`）
5. 按照提示配置 DNS

### DNS 配置

#### 方法一：使用 Cloudflare DNS（推荐）

如果域名使用 Cloudflare DNS：

1. 自动添加 CNAME 记录
2. 自动启用 HTTPS
3. 自动配置 CDN

#### 方法二：使用外部 DNS

添加 CNAME 记录：

```
Type: CNAME
Name: @ (或 www)
Value: hmrchan-frontend.pages.dev
```

### HTTPS 配置

Cloudflare Pages 自动提供：

- 免费 SSL 证书
- 自动续期
- HTTP 自动重定向到 HTTPS

### 多域名配置

可以为同一项目配置多个域名：

```
momichan.xyz          → 主域名
www.momichan.xyz      → WWW 子域名
preview.momichan.xyz  → 预览环境
```

## 🔧 Cloudflare Functions

### API 代理配置

项目使用 Cloudflare Functions 作为 API 代理：

```
functions/
└── api/
    └── [[path]].ts  # 通配符路由
```

### Functions 配置

在 `wrangler.toml` 中配置：

```toml
name = "hmrchan-frontend"
compatibility_date = "2024-12-09"
pages_build_output_dir = "./dist"

[vars]
API_BASE_URL = "https://api.momichan.xyz"
```

### Functions 环境变量

在 Cloudflare Dashboard 配置：

1. 进入 **Settings** → **Functions**
2. 添加环境变量：

```bash
API_BASE_URL=https://api.momichan.xyz
```

### Functions 限制

- 每个请求最多 50ms CPU 时间
- 每个请求最多 128MB 内存
- 免费计划每天 100,000 次请求

## 🐛 故障排查

### 构建失败

#### 问题：依赖安装失败

```
Error: Failed to install dependencies
```

**解决方案：**

1. 检查 `package.json` 中的依赖版本
2. 确保 `bun.lock` 文件已提交
3. 尝试删除 `node_modules` 重新安装

#### 问题：类型检查失败

```
Error: Type check failed
```

**解决方案：**

1. 本地运行 `bun run type-check`
2. 修复所有类型错误
3. 重新推送代码

#### 问题：构建超时

```
Error: Build timed out after 20 minutes
```

**解决方案：**

1. 优化构建配置
2. 减少依赖数量
3. 联系 Cloudflare 支持增加构建时间限制

### 部署失败

#### 问题：环境变量未配置

```
Error: VITE_API_BASE_URL is not defined
```

**解决方案：**

1. 检查环境变量配置
2. 确保变量名正确
3. 重新部署

#### 问题：构建产物为空

```
Error: No files found in dist directory
```

**解决方案：**

1. 检查构建输出目录配置
2. 确保构建命令正确
3. 本地测试构建流程

### 运行时错误

#### 问题：API 请求失败

```
Error: Failed to fetch
```

**解决方案：**

1. 检查 API 地址配置
2. 验证 CORS 设置
3. 检查 Functions 代理配置

#### 问题：页面加载缓慢

**解决方案：**

1. 检查资源大小
2. 启用 Cloudflare 缓存
3. 优化图片和代码

### 查看日志

#### 构建日志

在 Cloudflare Dashboard：

1. 选择项目
2. 点击部署记录
3. 查看 **Build log**

#### 实时日志

使用 Wrangler CLI：

```bash
# 查看实时日志
wrangler pages deployment tail

# 查看特定部署的日志
wrangler pages deployment tail <deployment-id>
```

## 📊 性能监控

### Cloudflare Analytics

在 Dashboard 查看：

- 请求数量
- 带宽使用
- 响应时间
- 错误率

### Web Analytics

启用 Cloudflare Web Analytics：

1. 进入 **Analytics** → **Web Analytics**
2. 添加网站
3. 复制跟踪代码
4. 添加到 `index.html`

### 自定义监控

使用 Cloudflare Workers Analytics Engine：

```typescript
// functions/api/[[path]].ts
export async function onRequest(context) {
  // 记录请求
  context.env.ANALYTICS.writeDataPoint({
    blobs: ['api-request'],
    doubles: [Date.now()],
    indexes: [context.request.url],
  })

  // 处理请求
  // ...
}
```

## 🔄 回滚部署

### 通过 Dashboard

1. 进入项目
2. 选择 **Deployments** 标签
3. 找到要回滚的部署
4. 点击 **Rollback to this deployment**

### 通过 Wrangler CLI

```bash
# 列出所有部署
wrangler pages deployment list

# 回滚到指定部署
wrangler pages deployment rollback <deployment-id>
```

### 通过 Git

```bash
# 回滚到上一个提交
git revert HEAD
git push origin main

# 回滚到指定提交
git revert <commit-hash>
git push origin main
```

## 📚 参考资源

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Functions 文档](https://developers.cloudflare.com/pages/functions/)
- [Cloudflare Analytics 文档](https://developers.cloudflare.com/analytics/)

## 💡 最佳实践

1. **使用环境变量** - 不要在代码中硬编码配置
2. **启用预览部署** - 在合并前测试功能
3. **配置自定义域名** - 提供专业的用户体验
4. **监控性能** - 定期检查 Analytics 数据
5. **设置通知** - 及时了解部署状态
6. **定期更新依赖** - 保持安全和性能
7. **使用 Git tags** - 标记重要的发布版本
8. **文档化配置** - 记录所有环境变量和设置

---

**最后更新**: 2025-01-18  
**文档版本**: 1.0.0
