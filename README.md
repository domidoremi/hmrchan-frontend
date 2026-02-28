# HmrChan Frontend

> ⚠️ **仅供学习交流使用，禁止商业用途**

基于 Vue 3 + TypeScript 的现代化图片/视频社区前端应用，提供流畅的用户体验和丰富的交互功能。

## 📚 目录

- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [可用脚本](#可用脚本)
- [项目结构](#项目结构)
- [功能特性](#功能特性)
- [部署指南](#部署指南)
- [浏览器支持](#浏览器支持)

## 🛠 技术栈

### 核心框架

- **Vue 3.5** - 组合式 API + `<script setup>` 语法
- **TypeScript 5.9** - 类型安全开发
- **Vite 8** (Rolldown) - 极速构建工具
- **Pinia 3** - 状态管理
- **Vue Router 4** - 路由管理
- **Vue I18n 11** - 国际化 (简中/英/日)

### UI 与动画

- **Lucide Vue Next** - 图标库
- **GSAP 3** - 动画引擎
- **Lottie & Rive** - 矢量动画播放
- **CSS Variables** - 主题系统

## 🚀 快速开始

### 前置要求

- **Node.js**: `^20.19.0` 或 `>=22.12.0`
- **包管理器**: [Bun](https://bun.sh) (推荐) 或 npm/pnpm

### 安装步骤

```bash
# 1. 克隆仓库
git clone <repository-url>
cd frontend

# 2. 安装依赖
bun install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量

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

# Anti-tamper（运行时软防护）
# off | warn | balanced | strict
VITE_ANTI_TAMPER_MODE=balanced
# 仅 strict 模式生效
VITE_DISABLE_CONTEXT_MENU=false

# Obfuscation（构建期混淆）
VITE_ENABLE_OBFUSCATION=false
# safe | aggressive
VITE_OBFUSCATION_PROFILE=safe
VITE_OBFUSCATION_CONTROL_FLOW=false
VITE_OBFUSCATION_DEAD_CODE=false

# Cloudflare Turnstile (可选)
VITE_TURNSTILE_SITE_KEY=your_site_key_here
```

> 生产环境推荐使用同源 `/api` 代理（Cloudflare Pages Functions）以避免 CORS。若直连后端域名，请确保后端允许 `Content-Type`/`Authorization` 等跨域请求头并开启凭据。
> 前端会将指向后端的 `/api/*` 与 `/uploads/*` 绝对链接归一化为同源路径，避免泄露后端地址；建议后端返回相对路径或上述标准路径。
> 如遇 CSP inline script 报错，建议在 Cloudflare 关闭 Rocket Loader，或保留入口脚本的 `data-cfasync="false"`。
> 若需要启用构建混淆，请先安装：`bun add -d javascript-obfuscator`。
> 详细策略见：`docs/security/anti-tamper-feasibility.md`。

### 环境变量说明

| 变量名                    | 说明                    | 必填 |
| ------------------------- | ----------------------- | ---- |
| `VITE_API_BASE_URL`       | API 基础 URL            | ✅   |
| `VITE_API_ENDPOINT`       | API 完整端点            | ✅   |
| `VITE_API_URL`            | API 代理路径            | ✅   |
| `VITE_APP_NAME`           | 应用名称                | ✅   |
| `VITE_APP_DESCRIPTION`    | 应用描述                | ✅   |
| `VITE_ENABLE_DEBUG`       | 启用调试模式            | ❌   |
| `VITE_ENABLE_DEVTOOLS`    | 启用开发者工具          | ❌   |
| `VITE_LOG_LEVEL`          | 前端日志级别            | ❌   |
| `VITE_ANTI_TAMPER_MODE`   | anti-tamper 模式        | ❌   |
| `VITE_DISABLE_CONTEXT_MENU` | strict 模式禁用右键   | ❌   |
| `VITE_ENABLE_OBFUSCATION` | 是否启用构建混淆        | ❌   |
| `VITE_OBFUSCATION_PROFILE` | 混淆强度（safe/aggressive） | ❌ |
| `VITE_OBFUSCATION_CONTROL_FLOW` | 控制流平坦化开关 | ❌   |
| `VITE_OBFUSCATION_DEAD_CODE` | 废代码注入开关       | ❌   |
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare 人机验证密钥 | ❌   |

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

# 性能测试
bun run test:perf        # 性能测试（启动开发服务器并运行 Lighthouse）
bun run perf:lighthouse  # Lighthouse 性能审计

# PWA 资源生成
bun run icons:generate   # 生成 PWA 图标（需要源图标）
bun run screenshots:generate  # 生成应用截图（需要开发服务器运行）

# SEO
bun run sitemap:generate # 生成 sitemap.xml
bun run sitemap:preview  # 预览 sitemap（不写入文件）
```

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
