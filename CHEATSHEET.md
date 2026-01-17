# MomiChan Frontend 速查表

快速参考指南，包含常用命令、配置和最佳实践。

## 🚀 快速开始

```bash
# 克隆并安装
git clone <repo-url>
cd frontend
bun install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 启动开发服务器
bun run dev
# 访问 http://localhost:5173
```

## 📜 常用命令

### 开发

```bash
bun run dev                    # 开发服务器
bun run build                  # 生产构建
bun run preview                # 预览构建
bun run type-check             # 类型检查
bun run lint                   # 代码检查并修复
bun run format                 # 代码格式化
bun run test:unit              # 运行测试
```

### 性能分析

```bash
bun run perf:dev               # 开发服务器启动性能
bun run perf:build             # 构建时间测量
bun run perf:lighthouse        # Lighthouse 审计
bun run build:analyze          # Bundle 分析
```

### 清理

```bash
bun run clean                  # 清理构建产物和缓存
rm -rf node_modules bun.lock   # 完全清理
bun install                    # 重新安装
```

## 🌳 Git 工作流

### 分支命名

```bash
feature/功能名称               # 新功能
fix/问题描述                   # Bug 修复
hotfix/版本号-问题描述         # 紧急修复
release/版本号                 # 发布分支
```

### 提交规范

```bash
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
perf: 性能优化
test: 测试相关
chore: 构建工具变更
```

### 常用操作

```bash
# 创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# 提交代码
git add .
git commit -m "feat: 添加新功能"
git push -u origin feature/new-feature

# 合并到 develop
git checkout develop
git merge --no-ff feature/new-feature
git push origin develop

# 删除分支
git branch -d feature/new-feature
git push origin --delete feature/new-feature
```

## 🔐 环境变量

### 必需变量

```bash
VITE_API_BASE_URL=https://api.momichan.xyz
VITE_API_ENDPOINT=https://api.momichan.xyz/api/v1
VITE_API_URL=/api
VITE_APP_NAME=himeri chan
VITE_APP_DESCRIPTION=Social Media Content Aggregation System
```

### 可选变量

```bash
VITE_TURNSTILE_SITE_KEY=your_site_key
VITE_ENABLE_DEBUG=false
VITE_ENABLE_DEVTOOLS=false
```

## 🏗️ 项目结构速查

```
src/
├── api/              # API 服务层
├── components/       # Vue 组件
│   ├── business/     # 业务组件
│   ├── layout/       # 布局组件
│   └── ui/           # UI 组件
├── composables/      # 组合式函数
├── i18n/             # 国际化
├── router/           # 路由配置
├── stores/           # Pinia 状态
├── styles/           # 全局样式
├── types/            # 类型定义
├── utils/            # 工具函数
└── views/            # 页面组件
```

## 📦 Cloudflare Pages 部署

### 构建配置

```bash
# 构建命令
bun install && VITE_GIT_COMMIT=$CF_PAGES_COMMIT_SHA bun run build

# 构建输出目录
dist

# 根目录
/
```

### 手动部署

```bash
# 本地构建
bun run build

# 使用 Wrangler 部署
bunx wrangler pages deploy dist --project-name=hmrchan-frontend
```

## 🎨 组件开发模板

### 基础组件

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { SomeIcon } from 'lucide-vue-next'

interface Props {
  title: string
  count?: number
}

const { title, count = 0 } = defineProps<Props>()

const emit = defineEmits<{
  click: [id: string]
}>()

const isActive = ref(false)

function handleClick() {
  emit('click', 'some-id')
}
</script>

<template>
  <div class="component">
    <h2>{{ title }}</h2>
    <p>Count: {{ count }}</p>
    <button @click="handleClick">
      <SomeIcon :size="20" />
      Click me
    </button>
  </div>
</template>

<style scoped>
.component {
  padding: var(--spacing-4);
  background: var(--glass-bg);
  border-radius: var(--radius-lg);
}
</style>
```

### 带 v-model 的组件

```vue
<script setup lang="ts">
const modelValue = defineModel<string>()
</script>

<template>
  <input v-model="modelValue" type="text" />
</template>
```

## 🔧 API 服务模板

```typescript
// src/api/exampleService.ts
import { apiClient } from './client'
import type { Example, CreateExample } from '@/types'

export const exampleService = {
  // GET 请求
  getById: (id: string) => apiClient.get<Example>(`/examples/${id}`),

  // GET 列表（带缓存）
  list: (params: ListParams) =>
    apiClient.get<PaginatedApiResponse<Example>>('/examples', {
      cacheTtl: 5 * 60 * 1000, // 5 分钟缓存
    }),

  // POST 请求
  create: (data: CreateExample) => apiClient.post<Example>('/examples', data),

  // PUT 请求
  update: (id: string, data: Partial<Example>) => apiClient.put<Example>(`/examples/${id}`, data),

  // DELETE 请求
  delete: (id: string) => apiClient.delete<void>(`/examples/${id}`),
}
```

## 🎯 Composable 模板

```typescript
// src/composables/useExample.ts
import { ref, computed } from 'vue'

export function useExample() {
  const count = ref(0)
  const doubled = computed(() => count.value * 2)

  function increment() {
    count.value++
  }

  return {
    count,
    doubled,
    increment,
  }
}
```

## 🎨 CSS 变量速查

### 间距

```css
var(--spacing-1)   /* 4px */
var(--spacing-2)   /* 8px */
var(--spacing-3)   /* 12px */
var(--spacing-4)   /* 16px */
var(--spacing-6)   /* 24px */
var(--spacing-8)   /* 32px */
```

### 颜色

```css
var(--color-primary)
var(--color-secondary)
var(--color-accent)
var(--color-text)
var(--color-text-secondary)
var(--color-bg)
var(--color-surface)
```

### 圆角

```css
var(--radius-sm)   /* 4px */
var(--radius-md)   /* 8px */
var(--radius-lg)   /* 12px */
var(--radius-xl)   /* 16px */
var(--radius-full) /* 9999px */
```

### Glass 效果

```css
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
}
```

## 🔍 调试技巧

### Vue DevTools

```bash
# 启用 Vue DevTools
VITE_ENABLE_DEVTOOLS=true bun run dev
```

### 网络请求调试

```typescript
// 在 src/api/client.ts 中添加日志
console.log('Request:', endpoint, config)
console.log('Response:', data)
```

### 性能分析

```bash
# Chrome DevTools
1. 打开 Performance 标签
2. 点击 Record
3. 执行操作
4. 停止录制
5. 分析火焰图

# Lighthouse
bun run perf:lighthouse
```

## 📊 性能优化清单

- [ ] 图片使用懒加载
- [ ] 路由使用懒加载
- [ ] 大组件使用动态导入
- [ ] API 响应使用缓存
- [ ] 使用 `v-memo` 优化列表渲染
- [ ] 使用 `v-once` 优化静态内容
- [ ] 避免在模板中使用复杂计算
- [ ] 使用 `computed` 缓存计算结果
- [ ] 使用防抖节流优化事件处理
- [ ] 使用 Web Workers 处理重计算

## 🐛 常见问题

### 类型错误

```bash
# 问题：Property 'xxx' does not exist
# 解决：检查类型定义，添加缺失的属性

# 问题：Type 'any' is not assignable
# 解决：使用具体类型或 unknown
```

### 构建错误

```bash
# 问题：Module not found
# 解决：检查导入路径，确保文件存在

# 问题：Out of memory
# 解决：增加 Node.js 内存限制
NODE_OPTIONS=--max-old-space-size=4096 bun run build
```

### 运行时错误

```bash
# 问题：Cannot read property of undefined
# 解决：使用可选链 ?.

# 问题：Maximum call stack size exceeded
# 解决：检查递归调用，避免无限循环
```

## 📚 快速链接

- [README.md](./README.md) - 项目介绍
- [ABOUT.md](./ABOUT.md) - 项目详情
- [GIT_WORKFLOW.md](./GIT_WORKFLOW.md) - Git 工作流
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - 测试指南

## 🔗 外部资源

- [Vue 3 文档](https://vuejs.org/)
- [TypeScript 文档](https://www.typescriptlang.org/)
- [Vite 文档](https://vitejs.dev/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [Vue Router 文档](https://router.vuejs.org/)
- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)

---

**提示**: 将此文件加入书签，随时查阅！
