# 迁移指南 (Migration Guide)

本文档详细说明了Vue 3项目src目录重构的迁移步骤和路径变更。

## 概述

本次重构的主要目标：

1. **扁平化组件结构** - 将components从6个子目录整合为ui/layout/business三个主要目录
2. **功能域组织utils** - 按功能域（cache/format/storage/media/error）组织工具函数
3. **模块化i18n** - 将大型JSON文件拆分为按功能模块组织的小文件
4. **统一store命名** - 所有store文件使用use前缀，符合Composition API约定
5. **优化导入路径** - 统一使用@/别名，消除循环依赖

## 路径变更对照表

### Components 组件路径变更

#### UI组件 (原 base/form/data-display/feedback → ui/)

| 旧路径                                           | 新路径                                             | 说明           |
| ------------------------------------------------ | -------------------------------------------------- | -------------- |
| `@/components/base/Button.vue`                   | `@/components/ui/button/Button.vue`                | 按钮组件       |
| `@/components/base/OptimizedImage.vue`           | `@/components/ui/image/OptimizedImage.vue`         | 优化图片       |
| `@/components/base/BackToTop.vue`                | `@/components/ui/button/BackToTop.vue`             | 返回顶部       |
| `@/components/form/Input.vue`                    | `@/components/ui/input/Input.vue`                  | 输入框         |
| `@/components/form/Select.vue`                   | `@/components/ui/select/Select.vue`                | 选择器         |
| `@/components/form/Checkbox.vue`                 | `@/components/ui/checkbox/Checkbox.vue`            | 复选框         |
| `@/components/form/Radio.vue`                    | `@/components/ui/radio/Radio.vue`                  | 单选框         |
| `@/components/form/RadioGroup.vue`               | `@/components/ui/radio/RadioGroup.vue`             | 单选组         |
| `@/components/form/Switch.vue`                   | `@/components/ui/switch/Switch.vue`                | 开关           |
| `@/components/data-display/Card.vue`             | `@/components/ui/card/Card.vue`                    | 卡片           |
| `@/components/data-display/StatCard.vue`         | `@/components/ui/card/StatCard.vue`                | 统计卡片       |
| `@/components/data-display/StatCardGrid.vue`     | `@/components/ui/card/StatCardGrid.vue`            | 统计卡片网格   |
| `@/components/data-display/Badge.vue`            | `@/components/ui/badge/Badge.vue`                  | 徽章           |
| `@/components/data-display/Divider.vue`          | `@/components/ui/divider/Divider.vue`              | 分割线         |
| `@/components/data-display/ImageViewer.vue`      | `@/components/ui/viewer/ImageViewer.vue`           | 图片查看器     |
| `@/components/data-display/MediaViewer.vue`      | `@/components/ui/viewer/MediaViewer.vue`           | 媒体查看器     |
| `@/components/data-display/MediaViewerPlyr.vue`  | `@/components/ui/viewer/MediaViewerPlyr.vue`       | Plyr媒体查看器 |
| `@/components/feedback/Modal.vue`                | `@/components/ui/modal/Modal.vue`                  | 模态框         |
| `@/components/feedback/Toast.vue`                | `@/components/ui/toast/Toast.vue`                  | 提示消息       |
| `@/components/feedback/LoadingSpinner.vue`       | `@/components/ui/loading/LoadingSpinner.vue`       | 加载动画       |
| `@/components/feedback/LoadingProgress.vue`      | `@/components/ui/loading/LoadingProgress.vue`      | 加载进度       |
| `@/components/feedback/BufferIndicator.vue`      | `@/components/ui/loading/BufferIndicator.vue`      | 缓冲指示器     |
| `@/components/feedback/Skeleton.vue`             | `@/components/ui/skeleton/Skeleton.vue`            | 骨架屏         |
| `@/components/feedback/EmptyState.vue`           | `@/components/ui/empty/EmptyState.vue`             | 空状态         |
| `@/components/feedback/ErrorBoundary.vue`        | `@/components/ui/error/ErrorBoundary.vue`          | 错误边界       |
| `@/components/feedback/CookieBanner.vue`         | `@/components/ui/banner/CookieBanner.vue`          | Cookie横幅     |
| `@/components/feedback/AccessLimitBanner.vue`    | `@/components/ui/banner/AccessLimitBanner.vue`     | 访问限制横幅   |
| `@/components/feedback/ApiUnavailableNotice.vue` | `@/components/ui/notice/ApiUnavailableNotice.vue`  | API不可用通知  |
| `@/components/feedback/AsyncComponentLoader.vue` | `@/components/ui/loading/AsyncComponentLoader.vue` | 异步组件加载器 |
| `@/components/feedback/PerformanceDashboard.vue` | `@/components/ui/debug/PerformanceDashboard.vue`   | 性能仪表板     |

#### 导入方式变更

```typescript
// ❌ 旧方式
import { Button } from '@/components/base'
import { Input, Select } from '@/components/form'
import { Card, Badge } from '@/components/data-display'
import { Modal, Toast } from '@/components/feedback'

// ✅ 新方式 - 统一从 ui 导入
import { Button, Input, Select, Card, Badge, Modal, Toast } from '@/components/ui'
```

#### Layout和Business组件

```typescript
// Layout组件 - 路径不变
import { AppNavbar, AppFooter, MainLayout } from '@/components/layout'

// Business组件 - 路径不变
import { PostCard } from '@/components/business'
```

### Utils 工具函数路径变更

#### 缓存相关 (cache/)

| 旧路径                      | 新路径                                          |
| --------------------------- | ----------------------------------------------- |
| `@/utils/CacheManager`      | `@/utils/cache/CacheManager` 或 `@/utils/cache` |
| `@/utils/hybridCache`       | `@/utils/cache/hybridCache` 或 `@/utils/cache`  |
| `@/utils/requestCache`      | `@/utils/cache/requestCache` 或 `@/utils/cache` |
| `@/utils/cacheInvalidation` | `@/utils/cache/invalidation` 或 `@/utils/cache` |
| `@/utils/cacheHelper`       | `@/utils/cache` (功能已合并)                    |

```typescript
// ❌ 旧方式
import { CacheManager } from '@/utils/CacheManager'
import { hybridCache } from '@/utils/hybridCache'

// ✅ 新方式
import { CacheManager, HybridCache, RequestCache } from '@/utils/cache'
```

#### 格式化工具 (format/)

| 旧路径                  | 新路径                                      |
| ----------------------- | ------------------------------------------- |
| `@/utils/dateFormat`    | `@/utils/format/date` 或 `@/utils/format`   |
| `@/utils/numberFormat`  | `@/utils/format/number` 或 `@/utils/format` |
| `@/utils/format` (部分) | `@/utils/format/text` 或 `@/utils/format`   |
| `@/utils/url`           | `@/utils/format/url` 或 `@/utils/format`    |

```typescript
// ❌ 旧方式
import { formatDate } from '@/utils/dateFormat'
import { formatNumber } from '@/utils/numberFormat'
import { truncateText } from '@/utils/format'

// ✅ 新方式
import { formatDate, formatNumber, truncateText, normalizeUrl } from '@/utils/format'
```

#### 存储相关 (storage/)

| 旧路径                   | 新路径                                                |
| ------------------------ | ----------------------------------------------------- |
| `@/utils/indexedDB`      | `@/utils/storage/indexedDB` 或 `@/utils/storage`      |
| `@/utils/storageManager` | `@/utils/storage/storageManager` 或 `@/utils/storage` |
| `@/utils/offlineQueue`   | `@/utils/storage/offlineQueue` 或 `@/utils/storage`   |

```typescript
// ❌ 旧方式
import { indexedDB } from '@/utils/indexedDB'
import { storageManager } from '@/utils/storageManager'

// ✅ 新方式
import { indexedDB, storageManager, offlineQueue } from '@/utils/storage'
```

#### 媒体处理 (media/)

| 旧路径                   | 新路径                                            |
| ------------------------ | ------------------------------------------------- |
| `@/utils/imageOptimizer` | `@/utils/media/imageOptimizer` 或 `@/utils/media` |
| `@/utils/mediaOptimizer` | `@/utils/media/mediaOptimizer` 或 `@/utils/media` |
| `@/utils/preload`        | `@/utils/media/preload` 或 `@/utils/media`        |

```typescript
// ❌ 旧方式
import { imageOptimizer } from '@/utils/imageOptimizer'
import { preloadImages } from '@/utils/preload'

// ✅ 新方式
import { imageOptimizer, mediaOptimizer, preloadImages } from '@/utils/media'
```

#### 错误处理 (error/)

| 旧路径                 | 新路径                                          |
| ---------------------- | ----------------------------------------------- |
| `@/utils/errorHandler` | `@/utils/error/errorHandler` 或 `@/utils/error` |
| `@/utils/errorMonitor` | `@/utils/error/errorMonitor` 或 `@/utils/error` |

```typescript
// ❌ 旧方式
import { handleError } from '@/utils/errorHandler'
import { errorMonitor } from '@/utils/errorMonitor'

// ✅ 新方式
import { handleError, ErrorHandler, errorMonitor } from '@/utils/error'
```

#### 保持不变的工具

以下工具函数保持在utils根目录：

- `@/utils/common` - 通用工具函数
- `@/utils/logger` - 日志工具
- `@/utils/performance` - 性能监控（目录）

### Stores 状态管理路径变更

| 旧路径              | 新路径                 | Store名称          |
| ------------------- | ---------------------- | ------------------ |
| `@/stores/auth`     | `@/stores/useAuth`     | `useAuthStore`     |
| `@/stores/counter`  | `@/stores/useCounter`  | `useCounterStore`  |
| `@/stores/network`  | `@/stores/useNetwork`  | `useNetworkStore`  |
| `@/stores/posts`    | `@/stores/usePosts`    | `usePostsStore`    |
| `@/stores/settings` | `@/stores/useSettings` | `useSettingsStore` |
| `@/stores/theme`    | `@/stores/useTheme`    | `useThemeStore`    |
| `@/stores/toast`    | `@/stores/useToast`    | `useToastStore`    |

```typescript
// ❌ 旧方式
import { useAuthStore } from '@/stores/auth'
import { usePostsStore } from '@/stores/posts'

// ✅ 新方式 - 方式1：直接导入
import { useAuthStore } from '@/stores/useAuth'
import { usePostsStore } from '@/stores/usePosts'

// ✅ 新方式 - 方式2：从index统一导入（推荐）
import { useAuthStore, usePostsStore } from '@/stores'
```

### I18n 国际化路径变更

翻译文件已从单个大文件拆分为模块化结构：

#### 文件结构变更

```
旧结构:
i18n/locales/
├── en.json          (单个大文件)
├── zh-CN.json       (单个大文件)
└── ja.json          (单个大文件)

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
│   └── ...
└── ja/
    └── ...
```

#### 翻译键访问方式

```typescript
// 翻译键的访问方式保持不变
const { t } = useI18n()

// 所有这些都继续正常工作
t('common.app.title')
t('auth.login.title')
t('post.actions.like')
t('nav.home')
t('settings.theme.title')
t('profile.favorites')
t('error.network.offline')
t('privacy.title')
```

## 迁移步骤

### 自动化迁移

如果你有大量代码需要迁移，可以使用以下脚本进行批量替换：

#### 1. 更新Components导入

```bash
# 在项目根目录执行
# 注意：在执行前请先备份代码或使用版本控制

# 替换 base 组件导入
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/components\/base/@\/components\/ui/g" {} +

# 替换 form 组件导入
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/components\/form/@\/components\/ui/g" {} +

# 替换 data-display 组件导入
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/components\/data-display/@\/components\/ui/g" {} +

# 替换 feedback 组件导入
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/components\/feedback/@\/components\/ui/g" {} +
```

#### 2. 更新Utils导入

```bash
# 格式化工具
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/dateFormat/@\/utils\/format/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/numberFormat/@\/utils\/format/g" {} +

# 缓存工具
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/CacheManager/@\/utils\/cache/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/hybridCache/@\/utils\/cache/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/cacheHelper/@\/utils\/cache/g" {} +

# 存储工具
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/indexedDB/@\/utils\/storage/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/storageManager/@\/utils\/storage/g" {} +

# 错误处理
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/errorHandler/@\/utils\/error/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/errorMonitor/@\/utils\/error/g" {} +

# 媒体处理
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/imageOptimizer/@\/utils\/media/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/mediaOptimizer/@\/utils\/media/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/utils\/preload/@\/utils\/media/g" {} +
```

#### 3. 更新Stores导入

```bash
# 更新store导入路径
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/stores\/auth'/@\/stores\/useAuth'/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/stores\/posts'/@\/stores\/usePosts'/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/stores\/settings'/@\/stores\/useSettings'/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/stores\/theme'/@\/stores\/useTheme'/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/stores\/network'/@\/stores\/useNetwork'/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/stores\/toast'/@\/stores\/useToast'/g" {} +
find src -type f \( -name "*.vue" -o -name "*.ts" \) -exec sed -i "s/@\/stores\/counter'/@\/stores\/useCounter'/g" {} +
```

### 手动迁移

对于小型项目或需要精确控制的情况，建议手动迁移：

#### 步骤1：更新组件导入

在每个使用组件的文件中：

```typescript
// 查找所有这样的导入
import { Button } from '@/components/base'
import { Input } from '@/components/form'
import { Modal } from '@/components/feedback'

// 替换为
import { Button, Input, Modal } from '@/components/ui'
```

#### 步骤2：更新工具函数导入

```typescript
// 查找
import { formatDate } from '@/utils/dateFormat'
import { CacheManager } from '@/utils/CacheManager'

// 替换为
import { formatDate } from '@/utils/format'
import { CacheManager } from '@/utils/cache'
```

#### 步骤3：更新Store导入

```typescript
// 查找
import { useAuthStore } from '@/stores/auth'

// 替换为（推荐）
import { useAuthStore } from '@/stores'

// 或
import { useAuthStore } from '@/stores/useAuth'
```

#### 步骤4：验证

```bash
# 运行类型检查
npm run type-check

# 运行lint
npm run lint

# 构建测试
npm run build

# 启动开发服务器测试
npm run dev
```

## 常见问题

### Q: 为什么要进行这次重构？

A: 主要原因包括：

- 减少目录嵌套，提高文件查找效率
- 按功能域组织代码，提高可维护性
- 统一命名规范，符合Vue 3最佳实践
- 优化模块结构，改善构建性能

### Q: 重构会影响现有功能吗？

A: 不会。所有组件、工具函数和store的功能保持完全不变，只是文件位置和导入路径发生了变化。

### Q: 我需要更新测试文件吗？

A: 是的，如果你的测试文件中有导入组件或工具函数，需要更新这些导入路径。

### Q: 翻译文件拆分后，如何添加新的翻译？

A: 根据翻译内容的功能域，在对应的模块文件中添加。例如：

- 通用翻译 → `common.json`
- 认证相关 → `auth.json`
- 文章相关 → `post.json`

### Q: 可以继续使用旧的导入路径吗？

A: 不建议。旧的目录结构已被删除，旧的导入路径会导致错误。请按照本指南更新所有导入路径。

### Q: 如何确保迁移完整？

A: 执行以下检查：

1. 运行 `npm run type-check` 确保没有类型错误
2. 运行 `npm run lint` 确保代码规范
3. 运行 `npm run build` 确保构建成功
4. 手动测试所有主要功能

### Q: 迁移过程中遇到问题怎么办？

A:

1. 检查本文档的路径对照表
2. 使用IDE的"查找引用"功能定位问题
3. 查看TypeScript错误提示
4. 如果使用Git，可以对比重构前后的差异

## 性能改进

重构后的性能改进：

- **构建时间**: 模块边界更清晰，Tree Shaking更高效
- **HMR速度**: 减少模块依赖链，热更新更快
- **代码分割**: 按功能域自动分割，chunk更合理
- **开发体验**: 文件查找更快，IDE性能更好

## 回滚方案

如果需要回滚到重构前的版本：

```bash
# 使用Git回滚
git log --oneline  # 查找重构前的commit
git checkout <commit-hash>

# 或者恢复到特定分支
git checkout main  # 假设main分支是重构前的版本
```

## 后续优化建议

1. **代码审查**: 检查是否有遗漏的导入路径更新
2. **性能监控**: 对比重构前后的性能指标
3. **文档更新**: 更新团队文档和开发指南
4. **团队培训**: 确保团队成员了解新的目录结构

## 联系支持

如果在迁移过程中遇到问题，请：

- 查看项目文档
- 提交Issue
- 联系项目维护者

---

最后更新: 2024年
