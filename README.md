# HmrChan - 图片/视频社区前端

<div align="center">

一个现代化的社交媒体内容聚合系统，专注于图片和视频分享体验

[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?logo=vite)](https://vitejs.dev/)
[![Pinia](https://img.shields.io/badge/Pinia-3.0-FFD859)](https://pinia.vuejs.org/)

[在线演示](https://api.momichan.xyz) | [功能特性](#功能特性) | [技术栈](#技术栈) | [快速开始](#快速开始)

</div>

---

## 📋 项目简介

HmrChan 是一个基于 Vue 3 生态的现代化图片/视频社区前端应用，提供流畅的内容浏览、发布和互动体验。项目采用组件化架构设计，注重性能优化和用户体验，支持响应式布局和国际化。

### ✨ 核心亮点

- 🎨 **现代化 UI** - 采用毛玻璃效果和流畅动画，提供优雅的视觉体验
- ⚡ **极致性能** - 细粒度代码分割、图片懒加载、Service Worker 缓存
- 📱 **响应式设计** - 完美适配桌面、平板和移动设备
- 🌍 **国际化支持** - 内置中英文切换，易于扩展其他语言
- 🔐 **安全可靠** - JWT 认证、HTTPS 强制、XSS 防护

---

## 🚀 功能特性

### 内容浏览与互动

- **瀑布流布局** - 使用 Masonry 实现自适应瀑布流，优化图片展示
- **图片查看器** - 集成 PhotoSwipe，支持缩放、滑动、全屏查看
- **视频播放** - 自动播放控制、画质选择、播放进度记忆
- **点赞收藏** - 实时互动反馈，支持离线操作队列
- **评论系统** - 多级评论、实时更新、表情支持

### 内容发布与管理

- **图片上传** - 支持多图上传、拖拽上传、图片压缩和裁剪
- **内容编辑** - Markdown 支持、标签管理、草稿保存
- **个人主页** - 用户资料展示、作品集、关注/粉丝管理

### 搜索与发现

- **智能搜索** - 关键词搜索、标签筛选、作者筛选
- **探索页面** - 热门内容、最新发布、推荐算法
- **分类浏览** - 按类别、标签组织内容

### 用户体验优化

- **主题切换** - 亮色/暗色模式，跟随系统设置
- **个性化设置** - 每页显示数量、自动播放、动画效果
- **离线支持** - Service Worker 缓存，离线可访问
- **性能监控** - 页面加载追踪、错误日志上报

---

## 🛠 技术栈

### 核心框架

- **Vue 3.5** - 组合式 API、响应式系统、Teleport
- **TypeScript 5.9** - 类型安全、代码提示、重构支持
- **Vite 7.2** - 极速开发服务器、优化构建、插件生态
- **Vue Router 4.6** - 路由管理、导航守卫、懒加载
- **Pinia 3.0** - 状态管理、持久化、DevTools 支持

### UI 与交互

- **Lucide Vue Next** - 现代化图标库，按需加载
- **PhotoSwipe 5.4** - 高性能图片查看器
- **Masonry Layout 4.2** - 瀑布流布局引擎
- **GSAP 3.13** - 高性能动画库
- **VueUse 14.0** - 组合式工具集

### 工具与优化

- **Ky 1.14** - 轻量级 HTTP 客户端
- **Day.js 1.11** - 日期处理库
- **Vue I18n 11.1** - 国际化方案
- **Pinia Persisted State** - 状态持久化
- **Vite ImageTools** - 图片优化和转换

### 开发工具

- **ESLint 9** - 代码规范检查
- **Prettier 3.6** - 代码格式化
- **Vitest 4.0** - 单元测试框架
- **Vue DevTools 8.0** - 调试工具

---

## 📦 快速开始

### 环境要求

- Node.js >= 20.19.0 或 >= 22.12.0
- Bun / npm / yarn / pnpm

### 安装依赖

```bash
# 使用 bun（推荐）
bun install

# 或使用 npm
npm install
```

### 开发环境

```bash
# 启动开发服务器
bun run dev

# 访问 http://localhost:5173
```

### 生产构建

```bash
# 构建生产版本
bun run build

# 预览构建结果
bun run preview
```

### 其他命令

```bash
# 类型检查
bun run type-check

# 代码检查和修复
bun run lint

# 代码格式化
bun run format

# 单元测试
bun run test:unit

# 构建分析
bun run build:analyze
```

---

## 📁 项目结构

```
frontend/
├── src/
│   ├── api/              # API 接口封装
│   │   ├── client.ts     # HTTP 客户端配置
│   │   └── services.ts   # API 服务方法
│   ├── components/       # 组件库
│   │   ├── business/     # 业务组件（PostCard、UserCard 等）
│   │   ├── layout/       # 布局组件（Navbar、Footer 等）
│   │   └── ui/           # UI 组件（Button、Input、Modal 等）
│   ├── composables/      # 组合式函数
│   │   ├── animation/    # 动画相关
│   │   ├── business/     # 业务逻辑
│   │   ├── core/         # 核心功能（认证、主题等）
│   │   ├── data/         # 数据处理
│   │   ├── form/         # 表单处理
│   │   ├── media/        # 媒体处理
│   │   └── ui/           # UI 交互
│   ├── config/           # 配置文件
│   ├── directives/       # 自定义指令（懒加载等）
│   ├── i18n/             # 国际化配置
│   │   └── locales/      # 语言文件
│   ├── plugins/          # 插件（图片预加载等）
│   ├── router/           # 路由配置
│   ├── stores/           # Pinia 状态管理
│   │   ├── useAuth.ts    # 认证状态
│   │   ├── usePosts.ts   # 内容状态
│   │   ├── useTheme.ts   # 主题状态
│   │   └── ...
│   ├── styles/           # 样式文件
│   │   ├── base.css      # 基础样式
│   │   ├── variables.css # CSS 变量
│   │   ├── animations.css # 动画样式
│   │   └── ...
│   ├── types/            # TypeScript 类型定义
│   ├── utils/            # 工具函数
│   │   ├── animation/    # 动画工具
│   │   ├── cache/        # 缓存管理
│   │   ├── error/        # 错误处理
│   │   ├── format/       # 格式化工具
│   │   ├── media/        # 媒体处理
│   │   ├── performance/  # 性能优化
│   │   └── storage/      # 存储管理
│   ├── views/            # 页面组件
│   │   ├── HomePage.vue
│   │   ├── ExplorePage.vue
│   │   ├── PostDetailPage.vue
│   │   ├── ProfilePage.vue
│   │   └── ...
│   ├── App.vue           # 根组件
│   └── main.ts           # 应用入口
├── public/               # 静态资源
├── dist/                 # 构建输出
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TypeScript 配置
├── package.json          # 项目配置
└── README.md             # 项目文档
```

---

## ⚡ 性能优化

### 构建优化

- **细粒度代码分割** - 按页面、组件、第三方库分别打包，优化缓存策略
- **Tree Shaking** - 移除未使用代码，减小包体积
- **资源压缩** - esbuild 压缩 JS/CSS，移除 console 和注释
- **图片优化** - 自动转换为 WebP 格式，质量 85%
- **关键 CSS 内联** - 首屏关键样式内联，加快渲染

### 运行时优化

- **图片懒加载** - 自定义指令实现，节省带宽
- **虚拟滚动** - 长列表优化，减少 DOM 节点
- **防抖节流** - 优化高频事件处理
- **请求缓存** - 混合缓存策略（内存 + Service Worker）
- **预加载预连接** - 关键资源预加载，DNS 预解析

### 缓存策略

- **内存缓存** - 50MB 限制，30 分钟过期，LRU 淘汰
- **Service Worker** - 离线缓存，后台同步
- **状态持久化** - LocalStorage 持久化用户设置和认证信息

---

## 🔧 配置说明

### 环境变量

创建 `.env.local` 文件配置本地环境：

```bash
# API 配置
VITE_API_BASE_URL=https://api.momichan.xyz
VITE_API_ENDPOINT=https://api.momichan.xyz/api/v1
VITE_API_URL=/api

# 应用信息
VITE_APP_NAME=HmrChan
VITE_APP_DESCRIPTION=Social Media Content Aggregation System

# 调试选项
VITE_ENABLE_DEVTOOLS=true
VITE_LOG_LEVEL=debug
```

### API 代理

开发环境使用 Vite 代理解决跨域：

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

---

## 🎯 核心功能实现

### 认证系统

- JWT Token 认证，自动刷新机制
- 路由守卫保护私有页面
- 登录状态持久化

### 图片处理

- 多图上传，支持拖拽
- 图片压缩和裁剪
- WebP 格式转换
- 懒加载和预加载

### 状态管理

- Pinia 模块化管理
- 持久化关键状态
- DevTools 调试支持

### 国际化

- Vue I18n 实现
- 中英文切换
- 日期时间本地化

---

## 📱 浏览器支持

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 代码规范

- 遵循 ESLint 和 Prettier 配置
- 使用 TypeScript 类型注解
- 编写清晰的注释和文档
- 提交前运行 `bun run lint` 和 `bun run type-check`

---

## 📄 许可证

本项目仅用于个人学习和求职展示，未经许可不得用于商业用途。

---

## 👨‍💻 作者

**您的名字**

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

---

## 🙏 致谢

感谢以下开源项目：

- [Vue.js](https://vuejs.org/)
- [Vite](https://vitejs.dev/)
- [PhotoSwipe](https://photoswipe.com/)
- [Masonry](https://masonry.desandro.com/)
- [GSAP](https://greensock.com/gsap/)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给一个 Star！**

Made with ❤️ by [Your Name]

</div>
