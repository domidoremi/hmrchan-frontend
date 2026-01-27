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

# 性能测试
bun run test:perf        # 性能测试（启动开发服务器并运行 Lighthouse）
bun run lighthouse       # Lighthouse 性能审计
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
├── functions/            # Cloudflare Functions
└── dist/                 # 构建输出
```

## ✨ 功能特性

### 核心功能

- **瀑布流布局** - 响应式多列布局
- **图片/视频查看器** - 支持缩放、拖拽、键盘导航
- **搜索与筛选** - 关键词、标签、作者筛选
- **用户系统** - 登录、注册、个人主页
- **收藏与点赞** - 内容收藏和互动

### 用户体验

- **主题切换** - 明暗主题支持
- **国际化** - 简中/英/日三语言
- **响应式设计** - 完美适配桌面和移动端
- **3D 动态背景** - 根据页面和平台动态变化的背景效果
- **性能优化** - 智能预加载、缓存策略、懒加载

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
