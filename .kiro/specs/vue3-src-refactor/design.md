# Design Document - Vue 3 Src目录重构

## Overview

本设计文档详细说明如何重构Vue 3项目的src目录结构，使其更加扁平化、模块化和易维护。重构将采用渐进式方法，确保每个步骤后项目都能正常运行。

### 当前结构分析

**现有优势：**
- composables已按功能域良好组织（core/ui/form/data/media/business）
- components有基本的分类结构
- 已配置路径别名 `@/` 指向src目录
- stores使用Pinia并配置了持久化

**主要问题：**
1. **Components嵌套过深**：base/business/data-display/feedback/form/layout 6个子目录
2. **Utils文件分散**：根目录有20+个工具文件，cache/performance子目录组织不一致
3. **I18n文件过大**：单个JSON文件超过400行，难以维护
4. **Store命名不统一**：如`posts.ts`应为`usePosts.ts`以符合Composition API约定
5. **部分功能重复**：如debounce/throttle在utils和composables中都有实现

### 重构目标

1. 将components扁平化为2层结构：ui（通用组件）+ feature（业务组件）
2. 整合utils为功能域子目录
3. 模块化i18n翻译文件
4. 统一store命名规范
5. 消除循环依赖和优化导入路径

## Architecture

### 新目录结构

```
src/
├── api/                    # API客户端和服务（保持不变）
│   ├── client.ts
│   ├── services.ts
│   └── adapters/
│
├── assets/                 # 静态资源（新增）
│   ├── images/
│   └── fonts/
│
├── components/             # 组件系统（重构）
│   ├── ui/                # 通用UI组件（原base + form + data-display + feedback）
│   │   ├── button/
│   │   ├── input/
│   │   ├── modal/
│   │   ├── toast/
│   │   └── ...
│   ├── layout/            # 布局组件（保持独立）
│   │   ├── AppNavbar.vue
│   │   ├── AppFooter.vue
│   │   └── MainLayout.vue
│   ├── business/          # 业务组件（保持，但扁平化）
│   │   ├── PostCard/
│   │   ├── FilterBar.vue
│   │   └── ...
│   └── index.ts           # 统一导出
│
├── composables/            # 组合式函数（保持现有结构）
│   ├── core/
│   ├── ui/
│   ├── form/
│   ├── data/
│   ├── media/
│   ├── business/
│   └── index.ts
│
├── config/                 # 配置文件（保持不变）
│   ├── api.ts
│   └── runtime.ts
│
├── directives/             # 自定义指令（保持不变）
│   └── lazyLoad.ts
│
├── i18n/                   # 国际化（重构）
│   ├── index.ts
│   ├── locales/
│   │   ├── en/
│   │   │   ├── index.ts
│   │   │   ├── common.json
│   │   │   ├── auth.json
│   │   │   ├── post.json
│   │   │   └── ...
│   │   ├── zh-CN/
│   │   │   └── ...
│   │   └── ja/
│   │       └── ...
│   └── utils.ts           # i18n工具函数
│
├── plugins/                # Vue插件（保持不变）
│   └── imagePreload.ts
│
├── router/                 # 路由配置（保持不变）
│   └── index.ts
│
├── stores/                 # Pinia状态管理（重命名）
│   ├── useAuth.ts         # 原auth.ts
│   ├── useCounter.ts      # 原counter.ts
│   ├── useNetwork.ts      # 原network.ts
│   ├── usePosts.ts        # 原posts.ts
│   ├── useSettings.ts     # 原settings.ts
│   ├── useTheme.ts        # 原theme.ts
│   ├── useToast.ts        # 原toast.ts
│   └── index.ts           # 统一导出
│
├── styles/                 # 样式文件（保持不变）
│   ├── base.css
│   ├── variables.css
│   └── ...
│
├── types/                  # TypeScript类型定义（保持不变）
│   ├── index.ts
│   ├── components.ts
│   └── ...
│
├── utils/                  # 工具函数（重构）
│   ├── cache/             # 缓存相关（整合）
│   │   ├── index.ts
│   │   ├── CacheManager.ts
│   │   ├── hybridCache.ts
│   │   ├── requestCache.ts
│   │   └── invalidation.ts
│   ├── format/            # 格式化工具（新增分组）
│   │   ├── index.ts
│   │   ├── date.ts       # 原dateFormat.ts
│   │   ├── number.ts     # 原numberFormat.ts
│   │   ├── text.ts       # 从format.ts拆分
│   │   └── url.ts
│   ├── performance/       # 性能监控（保持）
│   │   ├── index.ts
│   │   └── monitor.ts
│   ├── storage/           # 存储相关（新增分组）
│   │   ├── index.ts
│   │   ├── indexedDB.ts
│   │   ├── storageManager.ts
│   │   └── offlineQueue.ts
│   ├── media/             # 媒体处理（新增分组）
│   │   ├── index.ts
│   │   ├── imageOptimizer.ts
│   │   ├── mediaOptimizer.ts
│   │   └── preload.ts
│   ├── error/             # 错误处理（新增分组）
│   │   ├── index.ts
│   │   ├── errorHandler.ts
│   │   └── errorMonitor.ts
│   ├── common.ts          # 通用工具函数
│   ├── logger.ts          # 日志工具
│   └── index.ts           # 统一导出
│
├── views/                  # 页面视图（保持不变）
│   ├── HomePage.vue
│   ├── ExplorePage.vue
│   └── ...
│
├── App.vue
└── main.ts
```

## Components and Interfaces

### 1. Components重构策略

#### 1.1 UI组件整合

将`base/`, `form/`, `data-display/`, `feedback/`合并为`ui/`目录：

**映射关系：**
```
components/base/          → components/ui/
  Button.vue              → ui/button/Button.vue
  OptimizedImage.vue      → ui/image/OptimizedImage.vue
  BackToTop.vue           → ui/button/BackToTop.vue

components/form/          → components/ui/
  Input.vue               → ui/input/Input.vue
  Select.vue              → ui/select/Select.vue
  Checkbox.vue            → ui/checkbox/Checkbox.vue
  Radio.vue               → ui/radio/Radio.vue
  RadioGroup.vue          → ui/radio/RadioGroup.vue
  Switch.vue              → ui/switch/Switch.vue

components/data-display/ → components/ui/
  Card.vue                → ui/card/Card.vue
  Badge.vue               → ui/badge/Badge.vue
  Divider.vue             → ui/divider/Divider.vue
  StatCard.vue            → ui/card/StatCard.vue
  StatCardGrid.vue        → ui/card/StatCardGrid.vue
  ImageViewer.vue         → ui/viewer/ImageViewer.vue
  MediaViewer.vue         → ui/viewer/MediaViewer.vue
  MediaViewerPlyr.vue     → ui/viewer/MediaViewerPlyr.vue

components/feedback/      → components/ui/
  Modal.vue               → ui/modal/Modal.vue
  Toast.vue               → ui/toast/Toast.vue
  LoadingSpinner.vue      → ui/loading/LoadingSpinner.vue
  LoadingProgress.vue     → ui/loading/LoadingProgress.vue
  Skeleton.vue            → ui/skeleton/Skeleton.vue
  EmptyState.vue          → ui/empty/EmptyState.vue
  ErrorBoundary.vue       → ui/error/ErrorBoundary.vue
  BufferIndicator.vue     → ui/loading/BufferIndicator.vue
  CookieBanner.vue        → ui/banner/CookieBanner.vue
  AccessLimitBanner.vue   → ui/banner/AccessLimitBanner.vue
  ApiUnavailableNotice.vue → ui/notice/ApiUnavailableNotice.vue
  AsyncComponentLoader.vue → ui/loading/AsyncComponentLoader.vue
  PerformanceDashboard.vue → ui/debug/PerformanceDashboard.vue
```

#### 1.2 导出策略

每个UI组件子目录提供index.ts：

```typescript
// components/ui/button/index.ts
export { default as Button } from './Button.vue'
export { default as BackToTop } from './BackToTop.vue'
export type { ButtonProps } from './types'
```

顶层index.ts统一导出：

```typescript
// components/ui/index.ts
export * from './button'
export * from './input'
export * from './modal'
// ...
```

### 2. Utils重构策略

#### 2.1 功能域分组

```typescript
// utils/cache/index.ts
export { CacheManager } from './CacheManager'
export { HybridCache } from './hybridCache'
export { RequestCache } from './requestCache'
export { invalidateCache } from './invalidation'

// utils/format/index.ts
export { formatDate, formatRelativeTime } from './date'
export { formatNumber, formatCurrency } from './number'
export { truncateText, slugify } from './text'
export { normalizeUrl, parseQueryString } from './url'

// utils/storage/index.ts
export { indexedDB } from './indexedDB'
export { storageManager } from './storageManager'
export { offlineQueue } from './offlineQueue'

// utils/media/index.ts
export { imageOptimizer } from './imageOptimizer'
export { mediaOptimizer } from './mediaOptimizer'
export { preloadImages } from './preload'

// utils/error/index.ts
export { handleError, ErrorHandler } from './errorHandler'
export { errorMonitor } from './errorMonitor'
```

#### 2.2 消除重复

- 移除`utils/debounce.ts`和`utils/throttle.ts`（已在composables中实现）
- 合并`cacheHelper.ts`到`cache/index.ts`
- 整合`format.ts`、`dateFormat.ts`、`numberFormat.ts`到`format/`目录

### 3. I18n模块化策略

#### 3.1 按功能模块拆分

```typescript
// i18n/locales/zh-CN/index.ts
import common from './common.json'
import auth from './auth.json'
import post from './post.json'
import nav from './nav.json'
import settings from './settings.json'
import profile from './profile.json'
import error from './error.json'
import privacy from './privacy.json'

export default {
  common,
  auth,
  post,
  nav,
  settings,
  profile,
  error,
  privacy,
}
```

#### 3.2 模块划分

```
locales/zh-CN/
├── index.ts
├── common.json      # app, common, aria, cookies
├── auth.json        # auth, access
├── post.json        # post, posts, author
├── nav.json         # nav, platform
├── settings.json    # settings, preferences
├── profile.json     # profile, favorite, upload
├── error.json       # error, errors, offline
└── privacy.json     # privacy
```

### 4. Store命名规范

#### 4.1 重命名映射

```
stores/auth.ts     → stores/useAuth.ts
stores/counter.ts  → stores/useCounter.ts
stores/network.ts  → stores/useNetwork.ts
stores/posts.ts    → stores/usePosts.ts
stores/settings.ts → stores/useSettings.ts
stores/theme.ts    → stores/useTheme.ts
stores/toast.ts    → stores/useToast.ts
```

#### 4.2 统一导出

```typescript
// stores/index.ts
export { useAuthStore } from './useAuth'
export { useCounterStore } from './useCounter'
export { useNetworkStore } from './useNetwork'
export { usePostsStore } from './usePosts'
export { useSettingsStore } from './useSettings'
export { useThemeStore } from './useTheme'
export { useToastStore } from './useToast'
```

## Data Models

### Import路径更新

所有导入路径将使用`@/`别名：

```typescript
// 旧路径
import { Button } from '@/components/base'
import { Modal } from '@/components/feedback'
import { formatDate } from '@/utils/dateFormat'

// 新路径
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui'
import { formatDate } from '@/utils/format'
```

### 类型定义

保持现有类型定义不变，仅更新导入路径：

```typescript
// types/index.ts
export type { Post, PostDetail, PostListParams } from './post'
export type { User, UserProfile } from './user'
export type { PaginatedResponse } from './api'
```

## Error Handling

### 循环依赖检测

使用工具检测循环依赖：

```bash
# 使用madge检测循环依赖
npx madge --circular --extensions ts,vue src/
```

### 导入顺序规范

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

## Testing Strategy

### 重构验证步骤

每个重构阶段后执行：

1. **类型检查**
```bash
npm run type-check
```

2. **Lint检查**
```bash
npm run lint
```

3. **构建测试**
```bash
npm run build
```

4. **运行时测试**
```bash
npm run dev
# 手动测试关键功能：
# - 页面导航
# - 组件渲染
# - API调用
# - 状态管理
# - 国际化切换
```

5. **单元测试**（如果存在）
```bash
npm run test:unit
```

### 回滚策略

每个重构步骤前创建Git分支：

```bash
git checkout -b refactor/step-1-components
# 执行重构
git add .
git commit -m "refactor: reorganize components structure"

# 如果出现问题
git checkout main
```

## Migration Guide

### 渐进式迁移路径

**Phase 1: 准备阶段**
- 创建新目录结构
- 设置导出文件（index.ts）
- 不删除旧文件

**Phase 2: 组件迁移**
- 复制组件到新位置
- 更新组件内部导入
- 更新导出文件
- 测试组件功能

**Phase 3: 更新引用**
- 全局搜索替换导入路径
- 更新views中的组件引用
- 验证所有页面正常

**Phase 4: Utils重构**
- 创建功能域子目录
- 移动和重命名文件
- 更新导出
- 全局更新导入路径

**Phase 5: I18n模块化**
- 拆分翻译文件
- 更新加载逻辑
- 测试所有语言

**Phase 6: Store重命名**
- 重命名store文件
- 更新导入引用
- 测试状态管理

**Phase 7: 清理**
- 删除旧文件
- 清理未使用的导入
- 最终验证

### 兼容性考虑

- 保持所有公共API不变
- 使用re-export确保向后兼容
- 在过渡期保留旧路径的导出

```typescript
// components/index.ts（过渡期）
// 新路径
export * from './ui'
export * from './layout'
export * from './business'

// 旧路径兼容（标记为deprecated）
/** @deprecated Use @/components/ui instead */
export * from './base'
/** @deprecated Use @/components/ui instead */
export * from './form'
```

## Performance Considerations

### 构建优化

重构后的结构将改善：

1. **Tree Shaking效率**：更清晰的模块边界
2. **代码分割**：按功能域自动分割
3. **缓存命中率**：更稳定的chunk命名

### 开发体验

1. **HMR性能**：减少模块依赖链
2. **IDE性能**：更清晰的导入路径
3. **可维护性**：更容易定位文件

## Documentation

### 更新文档

重构完成后需要更新：

1. **README.md**：更新目录结构说明
2. **CONTRIBUTING.md**：更新组件开发指南
3. **代码注释**：更新导入路径示例
4. **Storybook**（如果有）：更新组件路径

### 团队沟通

- 创建迁移指南文档
- 举行团队会议说明变更
- 提供新旧路径对照表
- 设置过渡期时间表
