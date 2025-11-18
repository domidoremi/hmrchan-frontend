# 路径映射对照表 (Path Mapping Reference)

本文档提供Vue 3项目重构后的完整路径映射对照表，便于快速查找和替换。

## 快速查找索引

- [Components 组件](#components-组件)
  - [UI组件](#ui组件)
  - [Layout组件](#layout组件)
  - [Business组件](#business组件)
- [Utils 工具函数](#utils-工具函数)
  - [Cache 缓存](#cache-缓存)
  - [Format 格式化](#format-格式化)
  - [Storage 存储](#storage-存储)
  - [Media 媒体](#media-媒体)
  - [Error 错误处理](#error-错误处理)
  - [其他工具](#其他工具)
- [Stores 状态管理](#stores-状态管理)
- [I18n 国际化](#i18n-国际化)

---

## Components 组件

### UI组件

所有UI组件现在统一从 `@/components/ui` 导入。

#### Button 按钮相关

| 组件名    | 旧路径                            | 新路径                                 |
| --------- | --------------------------------- | -------------------------------------- |
| Button    | `@/components/base/Button.vue`    | `@/components/ui/button/Button.vue`    |
| BackToTop | `@/components/base/BackToTop.vue` | `@/components/ui/button/BackToTop.vue` |

**导入示例:**

```typescript
// 旧
import Button from '@/components/base/Button.vue'
import BackToTop from '@/components/base/BackToTop.vue'

// 新
import { Button, BackToTop } from '@/components/ui'
```

#### Image 图片相关

| 组件名         | 旧路径                                 | 新路径                                     |
| -------------- | -------------------------------------- | ------------------------------------------ |
| OptimizedImage | `@/components/base/OptimizedImage.vue` | `@/components/ui/image/OptimizedImage.vue` |

**导入示例:**

```typescript
// 旧
import OptimizedImage from '@/components/base/OptimizedImage.vue'

// 新
import { OptimizedImage } from '@/components/ui'
```

#### Form 表单组件

| 组件名     | 旧路径                             | 新路径                                  |
| ---------- | ---------------------------------- | --------------------------------------- |
| Input      | `@/components/form/Input.vue`      | `@/components/ui/input/Input.vue`       |
| Select     | `@/components/form/Select.vue`     | `@/components/ui/select/Select.vue`     |
| Checkbox   | `@/components/form/Checkbox.vue`   | `@/components/ui/checkbox/Checkbox.vue` |
| Radio      | `@/components/form/Radio.vue`      | `@/components/ui/radio/Radio.vue`       |
| RadioGroup | `@/components/form/RadioGroup.vue` | `@/components/ui/radio/RadioGroup.vue`  |
| Switch     | `@/components/form/Switch.vue`     | `@/components/ui/switch/Switch.vue`     |

**导入示例:**

```typescript
// 旧
import Input from '@/components/form/Input.vue'
import Select from '@/components/form/Select.vue'
import { Checkbox, Radio, RadioGroup, Switch } from '@/components/form'

// 新
import { Input, Select, Checkbox, Radio, RadioGroup, Switch } from '@/components/ui'
```

#### Card 卡片组件

| 组件名       | 旧路径                                       | 新路径                                  |
| ------------ | -------------------------------------------- | --------------------------------------- |
| Card         | `@/components/data-display/Card.vue`         | `@/components/ui/card/Card.vue`         |
| StatCard     | `@/components/data-display/StatCard.vue`     | `@/components/ui/card/StatCard.vue`     |
| StatCardGrid | `@/components/data-display/StatCardGrid.vue` | `@/components/ui/card/StatCardGrid.vue` |

**导入示例:**

```typescript
// 旧
import Card from '@/components/data-display/Card.vue'
import { StatCard, StatCardGrid } from '@/components/data-display'

// 新
import { Card, StatCard, StatCardGrid } from '@/components/ui'
```

#### Badge & Divider 徽章和分割线

| 组件名  | 旧路径                                  | 新路径                                |
| ------- | --------------------------------------- | ------------------------------------- |
| Badge   | `@/components/data-display/Badge.vue`   | `@/components/ui/badge/Badge.vue`     |
| Divider | `@/components/data-display/Divider.vue` | `@/components/ui/divider/Divider.vue` |

**导入示例:**

```typescript
// 旧
import Badge from '@/components/data-display/Badge.vue'
import Divider from '@/components/data-display/Divider.vue'

// 新
import { Badge, Divider } from '@/components/ui'
```

#### Viewer 查看器组件

| 组件名          | 旧路径                                          | 新路径                                       |
| --------------- | ----------------------------------------------- | -------------------------------------------- |
| ImageViewer     | `@/components/data-display/ImageViewer.vue`     | `@/components/ui/viewer/ImageViewer.vue`     |
| MediaViewer     | `@/components/data-display/MediaViewer.vue`     | `@/components/ui/viewer/MediaViewer.vue`     |
| MediaViewerPlyr | `@/components/data-display/MediaViewerPlyr.vue` | `@/components/ui/viewer/MediaViewerPlyr.vue` |

**导入示例:**

```typescript
// 旧
import { ImageViewer, MediaViewer, MediaViewerPlyr } from '@/components/data-display'

// 新
import { ImageViewer, MediaViewer, MediaViewerPlyr } from '@/components/ui'
```

#### Modal & Toast 模态框和提示

| 组件名 | 旧路径                            | 新路径                            |
| ------ | --------------------------------- | --------------------------------- |
| Modal  | `@/components/feedback/Modal.vue` | `@/components/ui/modal/Modal.vue` |
| Toast  | `@/components/feedback/Toast.vue` | `@/components/ui/toast/Toast.vue` |

**导入示例:**

```typescript
// 旧
import Modal from '@/components/feedback/Modal.vue'
import Toast from '@/components/feedback/Toast.vue'

// 新
import { Modal, Toast } from '@/components/ui'
```

#### Loading 加载组件

| 组件名               | 旧路径                                           | 新路径                                             |
| -------------------- | ------------------------------------------------ | -------------------------------------------------- |
| LoadingSpinner       | `@/components/feedback/LoadingSpinner.vue`       | `@/components/ui/loading/LoadingSpinner.vue`       |
| LoadingProgress      | `@/components/feedback/LoadingProgress.vue`      | `@/components/ui/loading/LoadingProgress.vue`      |
| BufferIndicator      | `@/components/feedback/BufferIndicator.vue`      | `@/components/ui/loading/BufferIndicator.vue`      |
| AsyncComponentLoader | `@/components/feedback/AsyncComponentLoader.vue` | `@/components/ui/loading/AsyncComponentLoader.vue` |

**导入示例:**

```typescript
// 旧
import { LoadingSpinner, LoadingProgress, BufferIndicator } from '@/components/feedback'

// 新
import {
  LoadingSpinner,
  LoadingProgress,
  BufferIndicator,
  AsyncComponentLoader,
} from '@/components/ui'
```

#### Skeleton & Empty & Error 骨架屏、空状态、错误

| 组件名        | 旧路径                                    | 新路径                                    |
| ------------- | ----------------------------------------- | ----------------------------------------- |
| Skeleton      | `@/components/feedback/Skeleton.vue`      | `@/components/ui/skeleton/Skeleton.vue`   |
| EmptyState    | `@/components/feedback/EmptyState.vue`    | `@/components/ui/empty/EmptyState.vue`    |
| ErrorBoundary | `@/components/feedback/ErrorBoundary.vue` | `@/components/ui/error/ErrorBoundary.vue` |

**导入示例:**

```typescript
// 旧
import { Skeleton, EmptyState, ErrorBoundary } from '@/components/feedback'

// 新
import { Skeleton, EmptyState, ErrorBoundary } from '@/components/ui'
```

#### Banner & Notice 横幅和通知

| 组件名               | 旧路径                                           | 新路径                                            |
| -------------------- | ------------------------------------------------ | ------------------------------------------------- |
| CookieBanner         | `@/components/feedback/CookieBanner.vue`         | `@/components/ui/banner/CookieBanner.vue`         |
| AccessLimitBanner    | `@/components/feedback/AccessLimitBanner.vue`    | `@/components/ui/banner/AccessLimitBanner.vue`    |
| ApiUnavailableNotice | `@/components/feedback/ApiUnavailableNotice.vue` | `@/components/ui/notice/ApiUnavailableNotice.vue` |

**导入示例:**

```typescript
// 旧
import { CookieBanner, AccessLimitBanner, ApiUnavailableNotice } from '@/components/feedback'

// 新
import { CookieBanner, AccessLimitBanner, ApiUnavailableNotice } from '@/components/ui'
```

#### Debug 调试组件

| 组件名               | 旧路径                                           | 新路径                                           |
| -------------------- | ------------------------------------------------ | ------------------------------------------------ |
| PerformanceDashboard | `@/components/feedback/PerformanceDashboard.vue` | `@/components/ui/debug/PerformanceDashboard.vue` |

**导入示例:**

```typescript
// 旧
import PerformanceDashboard from '@/components/feedback/PerformanceDashboard.vue'

// 新
import { PerformanceDashboard } from '@/components/ui'
```

### Layout组件

Layout组件路径保持不变。

| 组件名     | 路径                                 |
| ---------- | ------------------------------------ |
| AppNavbar  | `@/components/layout/AppNavbar.vue`  |
| AppFooter  | `@/components/layout/AppFooter.vue`  |
| MainLayout | `@/components/layout/MainLayout.vue` |

**导入示例:**

```typescript
import { AppNavbar, AppFooter, MainLayout } from '@/components/layout'
```

### Business组件

Business组件路径保持不变。

| 组件名    | 路径                                          |
| --------- | --------------------------------------------- |
| PostCard  | `@/components/business/PostCard/PostCard.vue` |
| FilterBar | `@/components/business/FilterBar.vue`         |

**导入示例:**

```typescript
import { PostCard, FilterBar } from '@/components/business'
```

---

## Utils 工具函数

### Cache 缓存

| 功能                 | 旧路径                      | 新路径                                          |
| -------------------- | --------------------------- | ----------------------------------------------- |
| CacheManager         | `@/utils/CacheManager`      | `@/utils/cache` 或 `@/utils/cache/CacheManager` |
| HybridCache          | `@/utils/hybridCache`       | `@/utils/cache` 或 `@/utils/cache/hybridCache`  |
| RequestCache         | `@/utils/requestCache`      | `@/utils/cache` 或 `@/utils/cache/requestCache` |
| invalidateCache      | `@/utils/cacheInvalidation` | `@/utils/cache` 或 `@/utils/cache/invalidation` |
| cacheHelper (已合并) | `@/utils/cacheHelper`       | `@/utils/cache`                                 |

**导入示例:**

```typescript
// 旧
import { CacheManager } from '@/utils/CacheManager'
import { hybridCache } from '@/utils/hybridCache'
import { requestCache } from '@/utils/requestCache'
import { invalidateCache } from '@/utils/cacheInvalidation'

// 新 - 推荐从index统一导入
import { CacheManager, HybridCache, RequestCache, invalidateCache } from '@/utils/cache'

// 新 - 或直接导入
import { CacheManager } from '@/utils/cache/CacheManager'
```

### Format 格式化

| 功能                           | 旧路径                 | 新路径                                      |
| ------------------------------ | ---------------------- | ------------------------------------------- |
| formatDate, formatRelativeTime | `@/utils/dateFormat`   | `@/utils/format` 或 `@/utils/format/date`   |
| formatNumber, formatCurrency   | `@/utils/numberFormat` | `@/utils/format` 或 `@/utils/format/number` |
| truncateText, slugify          | `@/utils/format`       | `@/utils/format` 或 `@/utils/format/text`   |
| normalizeUrl, parseQueryString | `@/utils/url`          | `@/utils/format` 或 `@/utils/format/url`    |

**导入示例:**

```typescript
// 旧
import { formatDate, formatRelativeTime } from '@/utils/dateFormat'
import { formatNumber, formatCurrency } from '@/utils/numberFormat'
import { truncateText } from '@/utils/format'
import { normalizeUrl } from '@/utils/url'

// 新 - 推荐从index统一导入
import {
  formatDate,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
  truncateText,
  slugify,
  normalizeUrl,
  parseQueryString,
} from '@/utils/format'

// 新 - 或按模块导入
import { formatDate } from '@/utils/format/date'
import { formatNumber } from '@/utils/format/number'
import { truncateText } from '@/utils/format/text'
import { normalizeUrl } from '@/utils/format/url'
```

### Storage 存储

| 功能           | 旧路径                   | 新路径                                                |
| -------------- | ------------------------ | ----------------------------------------------------- |
| indexedDB      | `@/utils/indexedDB`      | `@/utils/storage` 或 `@/utils/storage/indexedDB`      |
| storageManager | `@/utils/storageManager` | `@/utils/storage` 或 `@/utils/storage/storageManager` |
| offlineQueue   | `@/utils/offlineQueue`   | `@/utils/storage` 或 `@/utils/storage/offlineQueue`   |

**导入示例:**

```typescript
// 旧
import { indexedDB } from '@/utils/indexedDB'
import { storageManager } from '@/utils/storageManager'
import { offlineQueue } from '@/utils/offlineQueue'

// 新 - 推荐从index统一导入
import { indexedDB, storageManager, offlineQueue } from '@/utils/storage'

// 新 - 或直接导入
import { indexedDB } from '@/utils/storage/indexedDB'
```

### Media 媒体

| 功能           | 旧路径                   | 新路径                                            |
| -------------- | ------------------------ | ------------------------------------------------- |
| imageOptimizer | `@/utils/imageOptimizer` | `@/utils/media` 或 `@/utils/media/imageOptimizer` |
| mediaOptimizer | `@/utils/mediaOptimizer` | `@/utils/media` 或 `@/utils/media/mediaOptimizer` |
| preloadImages  | `@/utils/preload`        | `@/utils/media` 或 `@/utils/media/preload`        |

**导入示例:**

```typescript
// 旧
import { imageOptimizer } from '@/utils/imageOptimizer'
import { mediaOptimizer } from '@/utils/mediaOptimizer'
import { preloadImages } from '@/utils/preload'

// 新 - 推荐从index统一导入
import { imageOptimizer, mediaOptimizer, preloadImages } from '@/utils/media'

// 新 - 或直接导入
import { imageOptimizer } from '@/utils/media/imageOptimizer'
```

### Error 错误处理

| 功能                      | 旧路径                 | 新路径                                          |
| ------------------------- | ---------------------- | ----------------------------------------------- |
| handleError, ErrorHandler | `@/utils/errorHandler` | `@/utils/error` 或 `@/utils/error/errorHandler` |
| errorMonitor              | `@/utils/errorMonitor` | `@/utils/error` 或 `@/utils/error/errorMonitor` |

**导入示例:**

```typescript
// 旧
import { handleError, ErrorHandler } from '@/utils/errorHandler'
import { errorMonitor } from '@/utils/errorMonitor'

// 新 - 推荐从index统一导入
import { handleError, ErrorHandler, errorMonitor } from '@/utils/error'

// 新 - 或直接导入
import { handleError } from '@/utils/error/errorHandler'
```

### 其他工具

以下工具保持在utils根目录，路径不变：

| 功能     | 路径                  |
| -------- | --------------------- |
| 通用工具 | `@/utils/common`      |
| 日志工具 | `@/utils/logger`      |
| 性能监控 | `@/utils/performance` |

**导入示例:**

```typescript
import { debounce, throttle } from '@/utils/common'
import { logger } from '@/utils/logger'
import { performanceMonitor } from '@/utils/performance'
```

---

## Stores 状态管理

所有store文件已重命名，添加`use`前缀。

| Store  | 旧文件名      | 新文件名         | Store函数名        |
| ------ | ------------- | ---------------- | ------------------ |
| 认证   | `auth.ts`     | `useAuth.ts`     | `useAuthStore`     |
| 计数器 | `counter.ts`  | `useCounter.ts`  | `useCounterStore`  |
| 网络   | `network.ts`  | `useNetwork.ts`  | `useNetworkStore`  |
| 文章   | `posts.ts`    | `usePosts.ts`    | `usePostsStore`    |
| 设置   | `settings.ts` | `useSettings.ts` | `useSettingsStore` |
| 主题   | `theme.ts`    | `useTheme.ts`    | `useThemeStore`    |
| 提示   | `toast.ts`    | `useToast.ts`    | `useToastStore`    |

**导入示例:**

```typescript
// 旧
import { useAuthStore } from '@/stores/auth'
import { usePostsStore } from '@/stores/posts'
import { useThemeStore } from '@/stores/theme'

// 新 - 方式1：直接导入
import { useAuthStore } from '@/stores/useAuth'
import { usePostsStore } from '@/stores/usePosts'
import { useThemeStore } from '@/stores/useTheme'

// 新 - 方式2：从index统一导入（推荐）
import { useAuthStore, usePostsStore, useThemeStore } from '@/stores'
```

**完整映射表:**

```typescript
// 旧路径 → 新路径
'@/stores/auth'     → '@/stores/useAuth'     或 '@/stores'
'@/stores/counter'  → '@/stores/useCounter'  或 '@/stores'
'@/stores/network'  → '@/stores/useNetwork'  或 '@/stores'
'@/stores/posts'    → '@/stores/usePosts'    或 '@/stores'
'@/stores/settings' → '@/stores/useSettings' 或 '@/stores'
'@/stores/theme'    → '@/stores/useTheme'    或 '@/stores'
'@/stores/toast'    → '@/stores/useToast'    或 '@/stores'
```

---

## I18n 国际化

翻译文件已从单个大文件拆分为模块化结构，但翻译键的访问方式保持不变。

### 文件结构变更

```
旧结构:
i18n/locales/
├── en.json          # 单个大文件
├── zh-CN.json       # 单个大文件
└── ja.json          # 单个大文件

新结构:
i18n/locales/
├── en/
│   ├── index.ts
│   ├── common.json      # app, common, aria, cookies
│   ├── auth.json        # auth, access
│   ├── post.json        # post, posts, author
│   ├── nav.json         # nav, platform
│   ├── settings.json    # settings, preferences
│   ├── profile.json     # profile, favorite, upload
│   ├── error.json       # error, errors, offline
│   └── privacy.json     # privacy
├── zh-CN/
│   └── (相同结构)
└── ja/
    └── (相同结构)
```

### 翻译键映射

翻译键的访问方式**完全不变**，只是文件组织方式改变了。

| 翻译键前缀                                 | 所在模块文件    |
| ------------------------------------------ | --------------- |
| `common.*`, `app.*`, `aria.*`, `cookies.*` | `common.json`   |
| `auth.*`, `access.*`                       | `auth.json`     |
| `post.*`, `posts.*`, `author.*`            | `post.json`     |
| `nav.*`, `platform.*`                      | `nav.json`      |
| `settings.*`, `preferences.*`              | `settings.json` |
| `profile.*`, `favorite.*`, `upload.*`      | `profile.json`  |
| `error.*`, `errors.*`, `offline.*`         | `error.json`    |
| `privacy.*`                                | `privacy.json`  |

**使用示例:**

```typescript
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 所有这些都继续正常工作，无需修改
t('common.app.title') // 来自 common.json
t('auth.login.title') // 来自 auth.json
t('post.actions.like') // 来自 post.json
t('nav.home') // 来自 nav.json
t('settings.theme.title') // 来自 settings.json
t('profile.favorites') // 来自 profile.json
t('error.network.offline') // 来自 error.json
t('privacy.title') // 来自 privacy.json
```

### 添加新翻译

根据翻译内容的功能域，在对应的模块文件中添加：

```json
// 通用内容 → locales/zh-CN/common.json
{
  "common": {
    "newKey": "新翻译"
  }
}

// 认证相关 → locales/zh-CN/auth.json
{
  "auth": {
    "newFeature": "新功能"
  }
}

// 文章相关 → locales/zh-CN/post.json
{
  "post": {
    "newAction": "新操作"
  }
}
```

---

## 批量替换脚本

### 使用sed进行批量替换（Linux/Mac）

```bash
# Components
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/components\/base/@\/components\/ui/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/components\/form/@\/components\/ui/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/components\/data-display/@\/components\/ui/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/components\/feedback/@\/components\/ui/g" {} +

# Utils - Format
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/dateFormat/@\/utils\/format/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/numberFormat/@\/utils\/format/g" {} +

# Utils - Cache
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/CacheManager/@\/utils\/cache/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/hybridCache/@\/utils\/cache/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/cacheHelper/@\/utils\/cache/g" {} +

# Utils - Storage
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/indexedDB/@\/utils\/storage/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/storageManager/@\/utils\/storage/g" {} +

# Utils - Error
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/errorHandler/@\/utils\/error/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/errorMonitor/@\/utils\/error/g" {} +

# Utils - Media
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/imageOptimizer/@\/utils\/media/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/mediaOptimizer/@\/utils\/media/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/preload/@\/utils\/media/g" {} +

# Stores
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/stores\/auth'/@\/stores\/useAuth'/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/stores\/posts'/@\/stores\/usePosts'/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/stores\/settings'/@\/stores\/useSettings'/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/stores\/theme'/@\/stores\/useTheme'/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/stores\/network'/@\/stores\/useNetwork'/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/stores\/toast'/@\/stores\/useToast'/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/stores\/counter'/@\/stores\/useCounter'/g" {} +
```

### 使用PowerShell进行批量替换（Windows）

```powershell
# Components
Get-ChildItem -Path src -Recurse -Include *.vue,*.ts | ForEach-Object {
    (Get-Content $_.FullName) -replace '@/components/base', '@/components/ui' | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace '@/components/form', '@/components/ui' | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace '@/components/data-display', '@/components/ui' | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace '@/components/feedback', '@/components/ui' | Set-Content $_.FullName
}

# Utils
Get-ChildItem -Path src -Recurse -Include *.vue,*.ts | ForEach-Object {
    (Get-Content $_.FullName) -replace '@/utils/dateFormat', '@/utils/format' | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace '@/utils/numberFormat', '@/utils/format' | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace '@/utils/CacheManager', '@/utils/cache' | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace '@/utils/indexedDB', '@/utils/storage' | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace '@/utils/errorHandler', '@/utils/error' | Set-Content $_.FullName
}

# Stores
Get-ChildItem -Path src -Recurse -Include *.vue,*.ts | ForEach-Object {
    (Get-Content $_.FullName) -replace "@/stores/auth'", "@/stores/useAuth'" | Set-Content $_.FullName
    (Get-Content $_.FullName) -replace "@/stores/posts'", "@/stores/usePosts'" | Set-Content $_.FullName
}
```

---

## 验证清单

迁移完成后，使用以下清单验证：

- [ ] 运行 `npm run type-check` - 无类型错误
- [ ] 运行 `npm run lint` - 无lint错误
- [ ] 运行 `npm run build` - 构建成功
- [ ] 运行 `npm run dev` - 开发服务器正常启动
- [ ] 测试所有页面路由 - 导航正常
- [ ] 测试组件渲染 - UI显示正常
- [ ] 测试API调用 - 数据加载正常
- [ ] 测试状态管理 - Store功能正常
- [ ] 测试国际化 - 语言切换正常
- [ ] 测试主题切换 - 主题功能正常

---

最后更新: 2024年
