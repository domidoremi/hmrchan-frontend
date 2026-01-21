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
- [性能优化](#性能优化)
- [部署指南](#部署指南)
- [贡献指南](#贡献指南)
- [浏览器支持](#浏览器支持)

## 🛠 技术栈

### 核心框架

- **Vue 3.5** - 组合式 API + `<script setup>` 语法
- **TypeScript 5.9** - 类型安全开发体验
- **Vite 7.2** (Rolldown) - 极速构建工具

### 状态管理与路由

- **Pinia 3.0** - 轻量级状态管理
- **Vue Router 4.6** - 官方路由解决方案
- **pinia-plugin-persistedstate** - 状态持久化

### UI 与动画

- **Lucide Vue Next** - 现代化图标库
- **GSAP 3.14** - 高性能动画引擎
- **CSS Variables** - 主题系统与响应式设计
- **3D 动画系统** - 平台感知的动态背景效果 (BluePolymorph)
- **情境化背景系统** - 根据页面和平台筛选动态变化的 3D 背景效果 (ContextualBackground)
- **原生视频播放器** - 基于 HTML5 `<video>` 的自定义播放器实现

### 国际化

- **Vue I18n 11.2** - 多语言支持 (简体中文/English/日本語)

### 开发工具

- **ESLint 9** + **Prettier 3** - 代码规范与格式化
- **Husky** + **lint-staged** - Git hooks 自动化检查
- **Vitest** - 单元测试框架
- **Vue DevTools** - 开发调试工具

### 性能优化

- **智能路由预加载** - 基于网络状况和用户行为的自适应预加载
- **动态组件缓存** - 基于访问频率的 KeepAlive 策略
- **性能监控** - Core Web Vitals 实时追踪
- **渲染优化** - RAF 防抖/节流、延迟渲染、可见性检测
- **Service Worker** - 离线缓存和资源预缓存

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

创建 `.env` 文件并配置以下变量：

```bash
# API 配置
VITE_API_BASE_URL=https://api.momichan.xyz
VITE_API_ENDPOINT=https://api.momichan.xyz/api/v1
VITE_API_URL=/api

# 应用信息
VITE_APP_NAME=himeri chan
VITE_APP_DESCRIPTION=Social Media Content Aggregation System

# 功能开关（本地开发）
VITE_ENABLE_DEBUG=false
VITE_ENABLE_DEVTOOLS=false

# Cloudflare Turnstile (可选)
VITE_TURNSTILE_SITE_KEY=your_site_key_here
```

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
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare 人机验证密钥 | ❌   |

## 📜 可用脚本

### 开发

```bash
# 启动开发服务器 (支持 HMR)
bun run dev

# 启动开发服务器并测试启动性能
bun run perf:dev

# 开发环境下可使用缓存调试工具
# 在浏览器控制台输入: window.__cacheDebug.stats()
```

### 构建

```bash
# 类型检查 + 生产构建
bun run build

# 生产构建 + Bundle 分析
bun run build:analyze

# 测量构建时间
bun run build:measure

# 预览生产构建
bun run preview

# 使用 serve 预览 dist 目录
bun run serve:dist
```

### 代码质量

```bash
# 类型检查
bun run type-check
bun run type-check:watch  # 监听模式

# ESLint 检查并修复
bun run lint

# ESLint 严格模式（零警告）
bun run lint:strict

# Prettier 格式化
bun run format

# Prettier 检查格式
bun run format:check

# Git 提交前自动检查
bun run lint-staged
```

### 测试

```bash
# 运行单元测试
bun run test:unit

# 监听模式运行测试
bun run test:unit:watch
```

### 性能分析

```bash
# 开发服务器启动性能
bun run perf:dev

# HMR 性能分析
bun run perf:hmr

# Lighthouse 审计
bun run perf:lighthouse

# 构建时间测量
bun run perf:build

# 构建配置对比
bun run perf:compare
```

### 其他

```bash
# 清理构建产物和缓存
bun run clean

# 初始化 Husky (Git hooks)
bun run prepare
```

## 📁 项目结构

```
frontend/
├── src/
│   ├── api/              # API 接口层
│   │   ├── authService.ts
│   │   ├── postService.ts
│   │   ├── userService.ts
│   │   └── index.ts
│   │
│   ├── components/       # Vue 组件
│   │   ├── business/     # 业务组件 (PostCard, SearchBar, PlatformFilter, etc.)
│   │   ├── layout/       # 布局组件 (AppNavbar, AppFooter, ContextualBackground, etc.)
│   │   └── ui/           # 通用 UI 组件 (Button, Input, BluePolymorph, etc.)
│   │
│   ├── composables/      # 组合式函数
│   │   ├── useInfiniteScroll.ts
│   │   ├── useMasonryColumns.ts
│   │   ├── useBluePolymorph.ts  # 3D 动画系统
│   │   ├── useContextualBackground.ts  # 情境化背景系统
│   │   └── useCardAnimation.ts
│   │
│   ├── i18n/             # 国际化配置
│   │   ├── locales/      # 语言文件 (zh-CN, en, ja)
│   │   └── index.ts
│   │
│   ├── router/           # 路由配置
│   │   └── index.ts
│   │
│   ├── stores/           # Pinia 状态管理
│   │   ├── auth.ts       # 认证状态
│   │   ├── settings.ts   # 应用设置
│   │   └── toast.ts      # 消息提示
│   │
│   ├── styles/           # 全局样式
│   │   ├── main.css      # 主样式文件
│   │   ├── variables.css # CSS 变量
│   │   └── animations.css
│   │
│   ├── types/            # TypeScript 类型定义
│   │   └── index.ts
│   │
│   ├── utils/            # 工具函数
│   │   ├── cache/        # 缓存管理 (内存 + IndexedDB)
│   │   ├── cacheDebug.ts # 缓存调试工具
│   │   ├── performance.ts # 性能优化
│   │   └── validation.ts
│   │
│   ├── views/            # 页面组件
│   │   ├── HomePage.vue
│   │   ├── ExplorePage.vue
│   │   ├── SearchPage.vue
│   │   └── ...
│   │
│   ├── App.vue           # 根组件
│   └── main.ts           # 应用入口
│
├── public/               # 静态资源
│   ├── icons/            # 图标文件
│   └── manifest.json
│
├── scripts/              # 构建脚本
│   ├── analyze-bundle.js
│   └── measure-build-time.js
│
├── docs/                 # 文档
│   └── CONTEXTUAL_BACKGROUNDS.md  # 情境化背景系统文档
│
├── functions/            # Cloudflare Functions (边缘函数)
│
├── .env.example          # 环境变量示例
├── .gitignore
├── eslint.config.ts      # ESLint 配置
├── package.json
├── tsconfig.json         # TypeScript 配置
├── vite.config.ts        # Vite 配置
├── vitest.config.ts      # Vitest 配置
└── wrangler.toml         # Cloudflare Pages 配置
```

## ✨ 功能特性

### 内容浏览

- **瀑布流布局** - 响应式多列布局，自动适配屏幕尺寸
- **图片查看器** - 支持缩放、拖拽、键盘导航
- **视频播放器** - 自定义视频播放器，美观且功能完整
  - Glass morphism 风格控制栏
  - 播放速度调节（0.25x - 2x）
  - 音量控制与静音
  - 进度条拖拽与缓冲显示
  - 画中画模式
  - 全屏支持
  - 键盘快捷键（空格/K 播放暂停，方向键控制进度/音量，F 全屏，M 静音）
  - 移动端优化
- **点赞收藏** - 一键收藏喜欢的内容

### 内容发现

- **关键词搜索** - 全文搜索帖子内容
- **标签筛选** - 按标签浏览相关内容
- **作者筛选** - 发现感兴趣的创作者
- **热门推荐** - 智能推荐热门内容

### 用户体验

- **主题切换** - 支持明暗主题
- **个性化设置** - 自定义动画、语言等偏好
- **国际化** - 简体中文/English/日本語
- **响应式设计** - 完美适配桌面和移动设备
- **无障碍支持** - 支持 `prefers-reduced-motion` 等可访问性特性
- **访客限制提示** - 未登录用户友好的内容限制提示和登录引导
- **情境化 3D 背景** - 根据页面上下文和平台筛选动态变化的 3D 背景效果
  - 主页：The Core（旋转晶体核心）
  - 探索页默认：Aerogel（漂浮气泡）
  - Instagram：Optical Glass（棱镜网格）
  - TikTok：Liquid Silk（流动丝绸）
  - YouTube：Deep Ripples（深度涟漪）
  - Twitter/X：Fiber Optic Network（光纤网络）

### 性能特性

- **懒加载** - 图片和组件按需加载
- **虚拟滚动** - 大列表高性能渲染
- **请求缓存** - 内存缓存 (50MB/30min)
- **代码分割** - 路由级别代码分割
- **资源优化** - 自动压缩、WebP 转换

## ⚡ 性能优化

### 当前性能指标

基于 [momichan.xyz](https://momichan.xyz) 的实际测试结果：

| 指标                               | 值    | 评级    | 目标   |
| ---------------------------------- | ----- | ------- | ------ |
| **LCP** (Largest Contentful Paint) | 976ms | ✅ 良好 | <2.5s  |
| **CLS** (Cumulative Layout Shift)  | 0.00  | ✅ 优秀 | <0.1   |
| **TTFB** (Time to First Byte)      | 450ms | ✅ 良好 | <800ms |
| **渲染延迟**                       | 525ms | ✅ 良好 | <600ms |

### 优化策略

#### 1. 智能路由预加载

- **自适应预加载**：根据网络状况（4G/WiFi vs 3G）调整预加载策略
- **省电模式检测**：在省电模式下禁用预加载
- **鼠标悬停预加载**：用户悬停链接时预加载目标页面
- **优先级队列**：高优先级路由（explore, search）优先预加载
- **数据预加载**：预加载探索页、作者列表、帖子详情等关键数据

```typescript
// 自动启用路由预加载
import { prefetchCriticalRoutes, setupHoverPrefetch } from '@/utils/prefetch'
prefetchCriticalRoutes()
setupHoverPrefetch()

// 手动预加载数据
import { prefetchExploreData, prefetchAuthorsData, prefetchPostDetail } from '@/utils/prefetch'
await prefetchExploreData() // 预加载探索页热门内容
await prefetchAuthorsData() // 预加载热门作者
await prefetchPostDetail(postId) // 预加载帖子详情和评论
```

#### 2. 动态组件缓存

- **智能 KeepAlive**：基于访问频率动态调整缓存列表
- **自动淘汰**：缓存满时移除最少访问的页面
- **最大缓存数**：10 个组件，平衡内存和性能

#### 3. 性能监控

实时追踪 Core Web Vitals：

- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- FCP (First Contentful Paint)
- TTFB (Time to First Byte)
- Long Tasks 检测（>50ms）

```typescript
import { getMetrics, getPerformanceScore } from '@/utils/performanceMonitor'
const { score, grade } = getPerformanceScore() // A-F 评级
```

#### 4. 渲染优化工具

提供多种性能优化组合式函数：

```typescript
// RAF 防抖/节流
const debouncedFn = useRAFDebounce(fn, 100)
const throttledFn = useRAFThrottle(fn)

// 延迟渲染
const shouldRender = useDeferredRender(1000)

// 可见性检测
const isVisible = useIntersectionObserver(target)

// 批量更新
const batchUpdate = useBatchUpdate(updateFn, 16)
```

#### 5. 其他优化

- **Service Worker**：离线缓存和资源预缓存
- **代码分割**：路由和组件级别懒加载
- **图片优化**：渐进式加载、WebP 支持
- **CSS 优化**：关键 CSS 内联、非关键 CSS 异步加载

详细文档：[性能优化指南](docs/PERFORMANCE_OPTIMIZATION.md)

### 构建优化

- **代码分割** - 路由级别的懒加载
- **Tree Shaking** - 移除未使用的代码
- **资源压缩** - Brotli/Gzip 压缩
- **WebP 转换** - 自动转换图片格式
- **CSS 内联** - 关键 CSS 内联到 HTML

### 运行时优化

- **图片懒加载** - Intersection Observer API
- **虚拟滚动** - 仅渲染可见区域
- **防抖节流** - `requestAnimationFrame` 优化
- **请求缓存** - 内存 + IndexedDB 双层缓存
- **智能路由预加载** - 基于用户行为和网络状况的路由预加载
  - 首屏渲染后自动预加载关键路由（Explore、Search、PostDetail）
  - 鼠标悬停链接时预加载目标页面
  - 网络感知：慢速网络下仅预加载高优先级路由
  - 省电模式检测：自动禁用预加载节省流量
  - 使用 `requestIdleCallback` 在浏览器空闲时执行

### 缓存策略

应用采用多层缓存架构，优化数据加载性能：

#### 缓存层级

- **内存缓存 (Memory)** - 2 分钟 TTL，最快访问速度
- **IndexedDB 缓存** - 持久化本地存储，支持离线访问
- **Service Worker** - 静态资源和 API 响应缓存
- **CDN 缓存** - Cloudflare CDN 全球加速

#### 业务数据缓存 TTL

| 数据类型      | TTL     | 说明                         |
| ------------- | ------- | ---------------------------- |
| POST_ENTITY   | 30 分钟 | 按 UUID 缓存的单个帖子数据   |
| POST_LIST     | 5 分钟  | 查询结果的 UUID 列表         |
| POST_DETAIL   | 24 小时 | 帖子详情页完整数据（含评论） |
| AUTHOR_LIST   | 10 分钟 | 作者列表                     |
| AUTHOR_DETAIL | 24 小时 | 作者详情                     |
| FAVORITES     | 2 分钟  | 用户收藏列表                 |
| MEDIA         | 7 天    | 图片/视频缩略图              |
| AVATAR        | 24 小时 | 用户头像                     |

### 缓存调试工具

开发环境下提供缓存调试工具，用于追踪四层缓存的命中情况：

```javascript
// 在浏览器控制台使用
window.__cacheDebug.stats() // 查看缓存统计
window.__cacheDebug.clear() // 清除统计数据
window.__cacheDebug.enable() // 启用调试
window.__cacheDebug.disable() // 禁用调试
```

缓存层级（从快到慢）：

- ⚡ **Memory Cache** - 内存缓存（最快）
- 💾 **IndexedDB Cache** - 本地数据库缓存
- 🔧 **Service Worker Cache** - 离线缓存
- 🌐 **Network** - 网络请求（最慢）

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

4. **部署**
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

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 开发流程

1. **Fork 仓库**

   ```bash
   # Fork 后克隆到本地
   git clone https://github.com/your-username/hmrchan-frontend.git
   cd hmrchan-frontend
   ```

2. **创建分支**

   ```bash
   # 功能分支
   git checkout -b feature/your-feature-name

   # 修复分支
   git checkout -b fix/your-bugfix-name
   ```

3. **开发与测试**

   ```bash
   # 安装依赖
   bun install

   # 启动开发服务器
   bun run dev

   # 运行测试
   bun run test:unit
   ```

4. **提交代码**

   ```bash
   # 提交前检查
   bun run lint:strict
   bun run type-check
   bun run test:unit

   # 提交 (遵循 Conventional Commits)
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug in component"
   ```

5. **推送并创建 PR**
   ```bash
   git push origin feature/your-feature-name
   # 在 GitHub 上创建 Pull Request
   ```

### 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档变更
- `style:` 代码格式（不影响功能）
- `refactor:` 重构（不增加功能或修复 bug）
- `perf:` 性能优化
- `test:` 测试相关
- `chore:` 构建工具或辅助工具变更

### 代码规范

- **TypeScript** - 所有新代码必须使用 TypeScript
- **ESLint** - 遵循项目 ESLint 配置
- **Prettier** - 使用 Prettier 格式化代码
- **组合式 API** - 优先使用 Vue 3 组合式 API
- **类型安全** - 避免使用 `any`，提供完整类型注解

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
