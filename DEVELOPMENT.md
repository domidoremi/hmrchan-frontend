# HMRChan Frontend Development Guide

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装新添加的依赖
bun install
```

新添加的依赖包括：
- `axios` - HTTP客户端
- `vue-i18n` - 国际化支持
- `@vueuse/core` - Vue组合式工具集
- `lucide-vue-next` - 现代图标库
- `dayjs` - 日期处理库
- `pinia-plugin-persistedstate` - Pinia状态持久化

### 2. 配置环境变量

创建 `.env.local` 文件：

```bash
VITE_API_URL=http://localhost:8000/api
```

### 3. 启动开发服务器

```bash
bun run dev
```

应用将在 http://localhost:5173 启动

## 📁 项目结构

```
src/
├── api/              # API客户端
│   └── client.ts     # Axios配置和封装
├── assets/           # 静态资源
├── components/       # 可复用组件
│   ├── layout/       # 布局组件
│   ├── ui/           # UI基础组件
│   └── features/     # 功能组件
├── composables/      # 组合式函数
├── i18n/             # 国际化配置
│   └── locales/      # 语言文件
├── router/           # 路由配置
├── stores/           # Pinia状态管理
├── styles/           # 样式文件
│   ├── variables.css # CSS变量
│   ├── base.css      # 基础样式
│   ├── glass.css     # 液态玻璃效果
│   └── index.css     # 主样式文件
├── types/            # TypeScript类型
├── utils/            # 工具函数
├── views/            # 页面组件
├── App.vue           # 根组件
└── main.ts           # 应用入口
```

## 🎨 设计系统

### 液态玻璃美学

应用采用液态玻璃(Liquid Glass)设计风格，特点：
- 半透明背景
- 模糊效果 (backdrop-filter)
- 光影和边框细节
- 平滑过渡动画

### CSS类使用

#### 玻璃效果类
```vue
<div class="glass-card">内容</div>          <!-- 玻璃卡片 -->
<button class="glass-button">按钮</button>  <!-- 玻璃按钮 -->
<input class="glass-input" />              <!-- 玻璃输入框 -->
```

#### 布局类
```vue
<div class="flex items-center gap-md">    <!-- Flex布局 -->
<div class="grid grid-cols-3 gap-lg">     <!-- Grid布局 -->
```

### 主题系统

应用支持三种主题模式：
- `light` - 浅色模式
- `dark` - 深色模式
- `auto` - 跟随系统

使用主题Store：
```ts
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
themeStore.setTheme('dark')  // 设置主题
themeStore.toggleTheme()     // 切换主题
```

### 国际化

支持三种语言：
- 英语 (en)
- 简体中文 (zh-CN)
- 日语 (ja)

使用i18n：
```vue
<template>
  {{ $t('nav.home') }}
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>
```

## 🔌 API集成

### 使用API客户端

```ts
import { api } from '@/api/client'

// GET请求
const posts = await api.get('/posts', {
  params: { page: 1, page_size: 20 }
})

// POST请求
const result = await api.post('/auth/login', {
  username: 'user',
  password: 'pass'
})
```

### 使用Store

```ts
import { usePostsStore } from '@/stores/posts'

const postsStore = usePostsStore()

// 获取内容列表
await postsStore.fetchPosts({ page: 1 })

// 搜索
await postsStore.searchPosts('keyword')
```

## 📱 响应式设计

应用针对不同设备进行了优化：

- **手机** (< 640px): 单列布局
- **平板** (640px - 1024px): 双列布局
- **桌面** (> 1024px): 三/四列布局

使用响应式类：
```vue
<div class="hide-on-mobile">桌面显示</div>
<div class="show-on-mobile">移动显示</div>
```

## 🛠️ 开发工具

### TypeScript

项目使用TypeScript进行类型检查：

```bash
bun run type-check
```

### ESLint

代码格式化和检查：

```bash
bun run lint        # 检查并自动修复
bun run format      # Prettier格式化
```

### 测试

运行单元测试：

```bash
bun run test:unit
```

## 📦 构建部署

### 构建生产版本

```bash
bun run build
```

### 预览生产构建

```bash
bun run preview
```

## 🎯 下一步

1. 安装依赖： `bun install`
2. 启动开发服务器： `bun run dev`
3. 查看浏览器：http://localhost:5173
4. 开始开发！

## 📚 相关文档

- [Vue 3文档](https://vuejs.org/)
- [Pinia文档](https://pinia.vuejs.org/)
- [Vue Router文档](https://router.vuejs.org/)
- [Vue I18n文档](https://vue-i18n.intlify.dev/)
- [后端API文档](../docs/API_OVERVIEW.md)
