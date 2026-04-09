# HmrChan Frontend

> ⚠️ **仅供学习交流使用，禁止商业用途**

基于 Vue 3 + TypeScript 的现代化图片/视频社区前端应用，提供流畅的用户体验和丰富的交互功能。

## 📚 目录

- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [可用脚本](#可用脚本)
- [提交规范](#提交规范)
- [项目结构](#项目结构)
- [功能特性](#功能特性)
- [部署指南](#部署指南)
- [浏览器支持](#浏览器支持)

## 🛠 技术栈

### 核心框架

- **Vue 3.6.0-beta.7** - 组合式 API + `<script setup>` 语法
- **TypeScript 5.9** - 类型安全开发
- **Vite 8** (Rolldown) - 极速构建工具
- **Pinia 3** - 状态管理
- **Vue Router 5** - 路由管理
- **Vue I18n 11** - 国际化 (简中/英/日)

### UI 与动画

- **Lucide Vue Next** - 图标库
- **GSAP 3** - 动画引擎
- **Lottie & Rive** - 矢量动画播放
- **CSS Variables** - 主题系统

## 🚀 快速开始

### 前置要求

- **Node.js**: `24.14.0`（仓库当前锁定主版本为 Node 24，`package.json` 要求 `>=24.11.1 <25`）
- **包管理器**: [Bun](https://bun.sh) `1.3.10`（推荐；仓库已声明 `packageManager: bun@1.3.10`）

### 安装步骤

```bash
# 1. 克隆仓库
git clone <repository-url>
cd frontend

# 2. 安装依赖
bun install

# 3. 配置环境变量
cp .env.example .env.development
# 编辑 .env.development 文件，配置必要的环境变量

# 4. 启动开发服务器
bun run dev
```

开发服务器将在 `http://localhost:5173` 启动。

## 🔧 环境变量

创建 `.env` 文件并配置以下变量（生产/预览环境以 `wrangler.toml` 为准，机密变量仅在 Dashboard 管理）：

```bash
# API 配置
VITE_API_BASE_URL=https://api.momichan.xyz
VITE_API_ENDPOINT=/api/v1
VITE_API_URL=/api

# 应用信息
VITE_APP_NAME=himeri chan
VITE_APP_DESCRIPTION=Social Media Content Aggregation System

# 功能开关（本地开发）
VITE_ENABLE_DEBUG=false
VITE_ENABLE_DEVTOOLS=false
VITE_LOG_LEVEL=warn
VITE_ENABLE_CLIENT_INIT=true
VITE_ENABLE_SCHEDULE_API=true
VITE_ENABLE_DATA_PREFETCH=true
VITE_ENABLE_DEFERRED_ANIMATION_STYLES=true
VITE_ENABLE_ADVANCED_FINGERPRINT=false
VITE_SOURCEMAP=false

# Anti-tamper（运行时软防护）
# off | warn | balanced | strict
VITE_ANTI_TAMPER_MODE=balanced
# 是否允许在开发环境启用 anti-tamper
VITE_ANTI_TAMPER_ALLOW_DEV=false
# 仅 strict 模式生效
VITE_DISABLE_CONTEXT_MENU=false

# Obfuscation（构建期混淆，默认关闭）
VITE_ENABLE_OBFUSCATION=false
# safe | aggressive
VITE_OBFUSCATION_PROFILE=safe
# String Array
VITE_OBFUSCATION_STRING_ARRAY=true
# none | base64 | rc4
VITE_OBFUSCATION_STRING_ARRAY_ENCODING=base64
# Anti-formatting（self-defending）
VITE_OBFUSCATION_ANTI_FORMATTING=false
# Infinite Debugger（debugProtection）
VITE_OBFUSCATION_INFINITE_DEBUGGER=false
VITE_OBFUSCATION_INFINITE_DEBUGGER_INTERVAL=0
# 前端代码伪加密（不能替代后端校验）
VITE_OBFUSCATION_CODE_ENCRYPTION=false
# Control Flow Flattening
VITE_OBFUSCATION_CONTROL_FLOW=false
# Dead Code Injection
VITE_OBFUSCATION_DEAD_CODE=false

# Cloudflare Turnstile (可选)
VITE_TURNSTILE_SITE_KEY=your_site_key_here
```

> 生产环境推荐使用同源 `/api` 代理（Cloudflare Pages Functions）以避免 CORS。若直连后端域名，请确保后端允许 `Content-Type`/`Authorization` 等跨域请求头并开启凭据。
> 本地 `vite dev` / `vite preview` 也会使用 `VITE_API_BASE_URL` 作为 `/api` 与 `/uploads` 的代理目标；若联调本机后端，可改为 `http://127.0.0.1:8000` 等本地地址。
> 前端会将指向后端的 `/api/*` 与 `/uploads/*` 绝对链接归一化为同源路径，避免泄露后端地址；建议后端返回相对路径或上述标准路径。
> 如遇 CSP inline script 报错，建议在 Cloudflare 关闭 Rocket Loader，或保留入口脚本的 `data-cfasync="false"`。
> 生产构建默认**不输出 sourcemap**；仅在私有排障场景下显式设置 `VITE_SOURCEMAP=hidden` 或 `VITE_SOURCEMAP=true`。
> 生产构建默认关闭混淆；仅在明确接受兼容性与 CSP 风险时，显式设置 `VITE_ENABLE_OBFUSCATION=true` 后启用。
> 若需要启用构建混淆，请先安装：`bun add -d javascript-obfuscator`。
> 详细策略见：`docs/security/anti-tamper-feasibility.md`。

### 环境变量说明

| 变量名                                        | 说明                                     | 必填 |
| --------------------------------------------- | ---------------------------------------- | ---- |
| `VITE_API_BASE_URL`                           | API 基础 URL                             | ✅   |
| `VITE_API_ENDPOINT`                           | API 完整端点                             | ✅   |
| `VITE_API_URL`                                | API 代理路径                             | ✅   |
| `VITE_APP_NAME`                               | 应用名称                                 | ✅   |
| `VITE_APP_DESCRIPTION`                        | 应用描述                                 | ✅   |
| `VITE_ENABLE_DEBUG`                           | 启用调试模式                             | ❌   |
| `VITE_ENABLE_DEVTOOLS`                        | 启用开发者工具                           | ❌   |
| `VITE_LOG_LEVEL`                              | 前端日志级别                             | ❌   |
| `VITE_ENABLE_CLIENT_INIT`                     | 启动时执行 client init                   | ❌   |
| `VITE_ENABLE_SCHEDULE_API`                    | 启用日程接口请求                         | ❌   |
| `VITE_ENABLE_DATA_PREFETCH`                   | 启用后台数据预取                         | ❌   |
| `VITE_ENABLE_DEFERRED_ANIMATION_STYLES`       | 延迟加载动画样式                         | ❌   |
| `VITE_ENABLE_ADVANCED_FINGERPRINT`            | 启用高熵指纹                             | ❌   |
| `VITE_SOURCEMAP`                              | 构建 sourcemap 策略（false/hidden/true） | ❌   |
| `VITE_ANTI_TAMPER_MODE`                       | anti-tamper 模式                         | ❌   |
| `VITE_ANTI_TAMPER_ALLOW_DEV`                  | 开发环境强制启用 anti-tamper             | ❌   |
| `VITE_DISABLE_CONTEXT_MENU`                   | strict 模式禁用右键                      | ❌   |
| `VITE_ENABLE_OBFUSCATION`                     | 显式启用构建混淆（默认关闭）             | ❌   |
| `VITE_OBFUSCATION_PROFILE`                    | 混淆强度（safe/aggressive）              | ❌   |
| `VITE_OBFUSCATION_STRING_ARRAY`               | 字符串阵列化开关                         | ❌   |
| `VITE_OBFUSCATION_STRING_ARRAY_ENCODING`      | 字符串编码（none/base64/rc4）            | ❌   |
| `VITE_OBFUSCATION_ANTI_FORMATTING`            | anti-formatting 开关                     | ❌   |
| `VITE_OBFUSCATION_INFINITE_DEBUGGER`          | infinite debugger 开关                   | ❌   |
| `VITE_OBFUSCATION_INFINITE_DEBUGGER_INTERVAL` | debugger 触发间隔（ms）                  | ❌   |
| `VITE_OBFUSCATION_CODE_ENCRYPTION`            | 前端代码伪加密开关                       | ❌   |
| `VITE_OBFUSCATION_CONTROL_FLOW`               | 控制流平坦化开关                         | ❌   |
| `VITE_OBFUSCATION_DEAD_CODE`                  | 废代码注入开关                           | ❌   |
| `VITE_TURNSTILE_SITE_KEY`                     | Cloudflare 人机验证密钥                  | ❌   |

## 📜 可用脚本

```bash
# 开发
bun run dev              # 启动开发服务器
bun run build            # 生产构建
bun run preview          # 预览构建结果

# 代码质量
bun run lint             # ESLint 检查
bun run format           # Prettier 格式化
bun run type-check       # TypeScript 类型检查

# 测试
bun run test:unit        # 运行单元测试
bun run test:unit:watch  # 监听模式运行测试
bun run test:coverage    # 运行覆盖率检查（当前阈值为 60%）
bun run test:e2e         # 生产构建 + 关键路径 smoke E2E
bun run test:a11y        # Lighthouse 可访问性审计

# 性能测试
bun run test:perf        # 性能测试（启动开发服务器并运行 Lighthouse）
bun run perf:lighthouse  # Lighthouse 性能审计
bun run test:prod:regression # 生产深度回归（momichan.xyz，交互式人工协助）

# PWA 资源生成
bun run icons:generate   # 生成 PWA 图标（需要源图标）
bun run screenshots:generate  # 生成应用截图（需要开发服务器运行）

# SEO
bun run sitemap:generate # 生成 sitemap.xml
bun run sitemap:preview  # 预览 sitemap（不写入文件）
```

### 生产深度回归 runner

生产深度回归脚本位于：`scripts/prod-regression-runner.mjs`，用于对 `https://momichan.xyz` 执行匿名公开面、主生产账号私有面、以及临时 QA 账号安全链路的交互式回归。

默认产物目录：

```bash
output/prod-regression/<timestamp>/
```

运行示例：

```bash
BASE_URL=https://momichan.xyz \
PRIMARY_USERNAME=<main-account> \
PRIMARY_PASSWORD=<main-password> \
SECONDARY_EMAIL_MODE=user-assisted \
ARTIFACT_DIR=/absolute/path/to/output/prod-regression/<timestamp> \
QA_PREFIX=qa-prod-<timestamp> \
node scripts/prod-regression-runner.mjs
```

或使用 package script：

```bash
BASE_URL=https://momichan.xyz \
PRIMARY_USERNAME=<main-account> \
PRIMARY_PASSWORD=<main-password> \
SECONDARY_EMAIL_MODE=user-assisted \
ARTIFACT_DIR=/absolute/path/to/output/prod-regression/<timestamp> \
QA_PREFIX=qa-prod-<timestamp> \
bun run test:prod:regression
```

支持参数：

```bash
node scripts/prod-regression-runner.mjs --help
node scripts/prod-regression-runner.mjs --headless
```

运行时会在以下节点暂停，等待人工协助：

- 注册验证码
- 登录 2FA / 风险验证码（若触发）
- 验证邮箱链接
- 忘记密码重置链接
- Turnstile（若触发）

## 🧾 提交规范

本仓库使用 Conventional Commits（Husky 在提交时校验提交信息格式），提交信息编写指引见：`docs/Git提交规范.md`。

## 📁 项目结构

```
frontend/
├── src/
│   ├── api/              # API 接口层
│   ├── components/       # Vue 组件
│   │   ├── business/     # 业务组件
│   │   ├── layout/       # 布局组件
│   │   └── ui/           # 通用 UI 组件
│   ├── composables/      # 组合式函数
│   ├── fallbacks/        # 生产运行时降级数据与 helper
│   ├── i18n/             # 国际化
│   ├── router/           # 路由配置
│   ├── stores/           # Pinia 状态管理
│   ├── styles/           # 全局样式
│   ├── types/            # TypeScript 类型
│   ├── utils/            # 工具函数
│   ├── views/            # 页面组件
│   ├── App.vue           # 根组件
│   └── main.ts           # 应用入口
├── public/               # 静态资源
│   ├── icons/            # PWA 图标（多尺寸）
│   ├── screenshots/      # PWA 应用截图
│   ├── manifest.json     # PWA 配置
│   ├── sw.js             # Service Worker
│   └── ...
├── functions/            # Cloudflare Pages Functions
│   ├── api/              # API 代理（/api/* → 后端服务器）
│   └── uploads/          # 上传代理
├── wrangler.toml         # Cloudflare 配置
└── dist/                 # 构建输出
```

## ✨ 功能特性

### 核心功能

- **瀑布流布局** - 响应式多列布局
- **图片/视频查看器** - 支持缩放、拖拽、键盘导航
- **高级视频播放器** - 手势控制、设置持久化、多输入支持
  - 左侧上下滑动调节亮度
  - 右侧上下滑动调节音量
  - 左右滑动快进/快退
  - 双击播放/暂停
  - 支持触摸、鼠标、手写笔输入
  - 自动保存播放偏好（音量、速度、亮度）
- **搜索与筛选** - 关键词、标签、作者筛选
- **用户系统** - 登录、注册、个人主页
- **收藏与点赞** - 内容收藏和互动

### 用户体验

- **主题切换** - 明暗主题支持
- **UI 风格切换** - iOS (SwiftUI) / Material 3 双风格
- **国际化** - 简中/英/日三语言
- **响应式设计** - 完美适配桌面和移动端
- **3D 动态背景** - 根据页面和平台动态变化的背景效果
- **性能优化** - 智能预加载、缓存策略、懒加载
- **PWA 支持** - 可安装为桌面/移动应用
  - 离线浏览支持
  - 离线兜底页面（断网导航可用）
  - 媒体缓存 LRU + 容量控制
  - 离线队列客户端安全同步（带鉴权）
  - 应用快捷方式（首页、探索、收藏、设置）
  - 分享目标集成（接收图片/视频分享）
  - 自适应图标（标准 + Maskable）
  - 应用截图展示

### 性能指标

项目通过 Lighthouse CI 持续监控性能，确保达到以下标准：

- **Performance**: ≥80 分
- **Accessibility**: ≥90 分
- **Best Practices**: ≥90 分
- **SEO**: ≥90 分

核心 Web Vitals 目标：

- **FCP** (First Contentful Paint): ≤2s
- **LCP** (Largest Contentful Paint): ≤3s
- **CLS** (Cumulative Layout Shift): ≤0.1
- **TBT** (Total Blocking Time): ≤300ms
- **Speed Index**: ≤3s

### PWA 资源生成

项目提供自动化脚本生成 PWA 所需的图标和截图：

**快速开始**：

```bash
# 1. 安装依赖
bun add -d sharp puppeteer

# 2. 生成图标（需要准备 512x512 源图标）
node scripts/generate-icons.js source-icon.png

# 3. 生成截图（需要开发服务器运行）
bun run dev  # 终端 1
node scripts/generate-screenshots.js  # 终端 2
```

**生成内容**：

- 8 个标准图标（72x72 到 512x512）
- 2 个 maskable 图标（192x192、512x512）
- 4 个快捷方式图标（96x96）
- 移动端和桌面端应用截图

详细指南：[GENERATE_PWA_ASSETS.md](GENERATE_PWA_ASSETS.md) | [完整文档](docs/pwa-assets-generation-guide.md)

## 🚢 部署指南

### Cloudflare Pages (推荐)

1. **连接 Git 仓库**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Pages → Create a project → Connect Git

2. **配置构建设置**

   ```
   构建命令: bun run build
   构建输出目录: dist
   根目录: /
   环境变量: 在 Settings → Environment variables 中配置
   ```

3. **环境变量配置**
   - 在 Cloudflare Dashboard 中配置生产环境变量
   - 必填变量参考[环境变量](#环境变量)章节
   - 机密变量（如 `API_SECRET_KEY`）必须在 Dashboard 中添加为 Secret

4. **API 代理配置**

   项目使用 Cloudflare Pages Functions 实现 API 代理，避免 CORS 问题：
   - **代理路径**: `/api/*` → `API_BASE_URL/api/*`
   - **配置文件**: `functions/api/[[path]].ts`
   - **环境变量**: 在 `wrangler.toml` 中配置 `API_BASE_URL`

   **安全增强（可选）**：

   可以在后端验证共享密钥，确保请求来自 Cloudflare Functions：

   ```typescript
   // 在 wrangler.toml 的 [env.production] 中添加（或在 Dashboard 中配置为 Secret）
   // API_SECRET_KEY = "your-secret-key"

   // functions/api/[[path]].ts 中取消注释以下代码：
   const SECRET_KEY = env.API_SECRET_KEY
   if (SECRET_KEY) {
     headers.set('X-Proxy-Secret', SECRET_KEY)
   }

   // 后端验证请求头中的 X-Proxy-Secret
   ```

5. **部署**
   - 推送代码到 Git 仓库自动触发部署
   - 或使用 Wrangler CLI: `bunx wrangler pages deploy dist`

### 其他平台

#### Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

#### Netlify

```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 部署
netlify deploy --prod --dir=dist
```

#### 静态托管

```bash
# 构建
bun run build

# dist 目录上传到任意静态托管服务
# 确保配置 SPA 回退规则 (所有路由指向 index.html)
```

## 🌐 浏览器支持

| Browser | Version |
| ------- | ------- |
| Chrome  | 90+     |
| Firefox | 88+     |
| Safari  | 14+     |
| Edge    | 90+     |

支持所有现代浏览器，不支持 IE11。

## 📄 License

本项目仅用于个人学习和技术交流，未经许可不得用于商业用途。

## 👤 作者

[@domi](https://github.com/domidoremi) · qiubai1004@gmail.com

---

⭐ 如果这个项目对你有帮助，欢迎给个 Star！
