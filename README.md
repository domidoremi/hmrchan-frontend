# Vue 3 项目

这是一个基于 Vue 3 + TypeScript + Vite 构建的现代化前端应用。

## 技术栈

- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **构建工具**: Vite
- **状态管理**: Pinia
- **路由**: Vue Router
- **国际化**: Vue I18n
- **样式**: CSS3 + CSS Variables
- **包管理器**: Bun / npm

## 项目结构

```
src/
├── api/                    # API客户端和服务
│   ├── client.ts          # HTTP客户端配置
│   ├── services.ts        # API服务封装
│   └── adapters/          # 数据适配器
│
├── components/             # 组件系统
│   ├── ui/                # 通用UI组件
│   │   ├── button/        # 按钮组件
│   │   ├── input/         # 输入框组件
│   │   ├── modal/         # 模态框组件
│   │   ├── toast/         # 提示组件
│   │   ├── card/          # 卡片组件
│   │   ├── loading/       # 加载组件
│   │   ├── viewer/        # 查看器组件
│   │   └── ...            # 其他UI组件
│   ├── layout/            # 布局组件
│   │   ├── AppNavbar.vue
│   │   ├── AppFooter.vue
│   │   └── MainLayout.vue
│   ├── business/          # 业务组件
│   │   ├── PostCard/      # 文章卡片
│   │   └── ...
│   └── index.ts           # 统一导出
│
├── composables/            # 组合式函数
│   ├── core/              # 核心功能
│   ├── ui/                # UI相关
│   ├── form/              # 表单处理
│   ├── data/              # 数据处理
│   ├── media/             # 媒体处理
│   ├── business/          # 业务逻辑
│   └── index.ts
│
├── config/                 # 配置文件
│   ├── api.ts             # API配置
│   └── runtime.ts         # 运行时配置
│
├── directives/             # 自定义指令
│   └── lazyLoad.ts        # 懒加载指令
│
├── i18n/                   # 国际化
│   ├── index.ts           # i18n配置
│   ├── locales/           # 翻译文件
│   │   ├── en/            # 英文
│   │   │   ├── index.ts
│   │   │   ├── common.json
│   │   │   ├── auth.json
│   │   │   ├── post.json
│   │   │   └── ...
│   │   ├── zh-CN/         # 简体中文
│   │   └── ja/            # 日文
│   └── utils.ts
│
├── plugins/                # Vue插件
│   └── imagePreload.ts
│
├── router/                 # 路由配置
│   └── index.ts
│
├── stores/                 # Pinia状态管理
│   ├── useAuth.ts         # 认证状态
│   ├── useCounter.ts      # 计数器
│   ├── useNetwork.ts      # 网络状态
│   ├── usePosts.ts        # 文章数据
│   ├── useSettings.ts     # 设置
│   ├── useTheme.ts        # 主题
│   ├── useToast.ts        # 提示消息
│   └── index.ts           # 统一导出
│
├── styles/                 # 样式文件
│   ├── base.css           # 基础样式
│   ├── variables.css      # CSS变量
│   └── ...
│
├── types/                  # TypeScript类型定义
│   ├── index.ts
│   ├── components.ts
│   └── ...
│
├── utils/                  # 工具函数
│   ├── cache/             # 缓存相关
│   │   ├── index.ts
│   │   ├── CacheManager.ts
│   │   ├── hybridCache.ts
│   │   └── ...
│   ├── format/            # 格式化工具
│   │   ├── index.ts
│   │   ├── date.ts        # 日期格式化
│   │   ├── number.ts      # 数字格式化
│   │   ├── text.ts        # 文本格式化
│   │   └── url.ts         # URL处理
│   ├── performance/       # 性能监控
│   ├── storage/           # 存储相关
│   │   ├── indexedDB.ts
│   │   ├── storageManager.ts
│   │   └── offlineQueue.ts
│   ├── media/             # 媒体处理
│   │   ├── imageOptimizer.ts
│   │   ├── mediaOptimizer.ts
│   │   └── preload.ts
│   ├── error/             # 错误处理
│   │   ├── errorHandler.ts
│   │   └── errorMonitor.ts
│   ├── common.ts          # 通用工具
│   ├── logger.ts          # 日志工具
│   └── index.ts           # 统一导出
│
├── views/                  # 页面视图
│   ├── HomePage.vue
│   ├── ExplorePage.vue
│   └── ...
│
├── App.vue                 # 根组件
└── main.ts                 # 应用入口
```

## 开发指南

### 安装依赖

```bash
# 使用 bun
bun install

# 或使用 npm
npm install
```

### 开发服务器

```bash
# 使用 bun
bun run dev

# 或使用 npm
npm run dev
```

### 构建生产版本

```bash
# 使用 bun
bun run build

# 或使用 npm
npm run build
```

### 类型检查

```bash
bun run type-check
# 或
npm run type-check
```

### 代码检查

```bash
npm run lint
```

### 预览生产构建

```bash
npm run preview
```

## 代码规范

### 导入顺序

```typescript
// 1. Vue核心
import { ref, computed } from 'vue'

// 2. 第三方库
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

// 3. 类型定义
import type { Post } from '@/types'

// 4. Stores
import { usePostsStore } from '@/stores'

// 5. Composables
import { usePagination } from '@/composables'

// 6. Components
import { Button, Modal } from '@/components/ui'

// 7. Utils
import { formatDate } from '@/utils/format'

// 8. 样式
import './styles.css'
```

### 组件导入

```typescript
// UI组件 - 从 @/components/ui 导入
import { Button, Input, Modal, Card } from '@/components/ui'

// 布局组件
import { AppNavbar, AppFooter } from '@/components/layout'

// 业务组件
import { PostCard } from '@/components/business'
```

### Store使用

```typescript
// 导入store
import { usePostsStore, useAuthStore } from '@/stores'

// 在组件中使用
const postsStore = usePostsStore()
const { posts, loading } = storeToRefs(postsStore)
```

### 工具函数导入

```typescript
// 格式化工具
import { formatDate, formatNumber, truncateText } from '@/utils/format'

// 缓存工具
import { CacheManager, HybridCache } from '@/utils/cache'

// 存储工具
import { indexedDB, storageManager } from '@/utils/storage'

// 错误处理
import { handleError, errorMonitor } from '@/utils/error'
```

### 国际化使用

```typescript
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 使用翻译
t('common.app.title')
t('auth.login.title')
t('post.actions.like')
```

## 组件开发

### 创建新的UI组件

1. 在 `src/components/ui/` 下创建组件目录
2. 创建组件文件和类型定义
3. 在目录下创建 `index.ts` 导出文件
4. 在 `src/components/ui/index.ts` 中添加导出

示例：

```typescript
// src/components/ui/my-component/MyComponent.vue
<script setup lang="ts">
import type { MyComponentProps } from './types'

defineProps<MyComponentProps>()
</script>

// src/components/ui/my-component/types.ts
export interface MyComponentProps {
  title: string
  // ...
}

// src/components/ui/my-component/index.ts
export { default as MyComponent } from './MyComponent.vue'
export type { MyComponentProps } from './types'

// src/components/ui/index.ts
export * from './my-component'
```

### 创建业务组件

业务组件放在 `src/components/business/` 目录下，遵循相同的导出模式。

## 状态管理

### 创建新的Store

```typescript
// src/stores/useMyFeature.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMyFeatureStore = defineStore('myFeature', () => {
  const data = ref<any>(null)

  function fetchData() {
    // 实现逻辑
  }

  return {
    data,
    fetchData,
  }
})

// 在 src/stores/index.ts 中导出
export { useMyFeatureStore } from './useMyFeature'
```

## 工具函数

### 添加新的工具函数

根据功能域将工具函数放在对应的子目录：

- `utils/cache/` - 缓存相关
- `utils/format/` - 格式化工具
- `utils/storage/` - 存储相关
- `utils/media/` - 媒体处理
- `utils/error/` - 错误处理

## 国际化

### 添加新的翻译

1. 在对应语言目录下的模块文件中添加翻译键
2. 确保所有语言文件保持一致的键结构

```json
// src/i18n/locales/zh-CN/common.json
{
  "app": {
    "title": "应用标题"
  }
}

// src/i18n/locales/en/common.json
{
  "app": {
    "title": "App Title"
  }
}
```

## 迁移指南

如果你正在从旧版本迁移，请参考 [MIGRATION.md](./MIGRATION.md) 了解详细的迁移步骤和路径变更。

## 许可证

[添加许可证信息]
