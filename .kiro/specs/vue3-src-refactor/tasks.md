# Implementation Plan - Vue 3 Src目录重构

本实现计划将设计文档转化为可执行的编码任务。每个任务都是增量式的，确保项目在每一步后都能正常运行。

## 任务列表

- [x] 1. 准备阶段：创建新目录结构和导出文件
  - 创建新的目录结构框架（components/ui/, utils/cache/, utils/format/等）
  - 为每个新目录创建index.ts导出文件
  - 保留所有现有文件不变，确保项目可运行
  - _Requirements: 1.1, 6.1_

- [x] 2. 重构Components - UI组件整合

- [x] 2.1 创建ui组件目录结构并迁移base组件
  - 创建components/ui/button/, ui/image/目录
  - 将Button.vue, BackToTop.vue迁移到ui/button/
  - 将OptimizedImage.vue迁移到ui/image/
  - 创建各子目录的index.ts导出文件
  - 更新组件内部的import路径
  - _Requirements: 1.1, 1.3_

- [x] 2.2 迁移form组件到ui目录
  - 创建ui/input/, ui/select/, ui/checkbox/, ui/radio/, ui/switch/目录
  - 迁移Input.vue, Select.vue, Checkbox.vue, Radio.vue, RadioGroup.vue, Switch.vue
  - 创建各子目录的index.ts导出文件
  - 更新组件内部的import路径
  - _Requirements: 1.1, 1.3_

- [x] 2.3 迁移data-display组件到ui目录
  - 创建ui/card/, ui/badge/, ui/divider/, ui/viewer/目录
  - 迁移Card.vue, StatCard.vue, StatCardGrid.vue到ui/card/
  - 迁移Badge.vue, Divider.vue到对应目录
  - 迁移ImageViewer.vue, MediaViewer.vue, MediaViewerPlyr.vue到ui/viewer/
  - 创建各子目录的index.ts导出文件
  - _Requirements: 1.1, 1.3_

- [x] 2.4 迁移feedback组件到ui目录
  - 创建ui/modal/, ui/toast/, ui/loading/, ui/skeleton/, ui/empty/, ui/error/, ui/banner/, ui/notice/, ui/debug/目录
  - 迁移Modal.vue, Toast.vue, LoadingSpinner.vue, LoadingProgress.vue, BufferIndicator.vue等组件
  - 迁移Skeleton.vue, EmptyState.vue, ErrorBoundary.vue
  - 迁移CookieBanner.vue, AccessLimitBanner.vue, ApiUnavailableNotice.vue
  - 迁移AsyncComponentLoader.vue, PerformanceDashboard.vue
  - 创建各子目录的index.ts导出文件
  - _Requirements: 1.1, 1.3_

- [x] 2.5 创建components/ui/index.ts统一导出
  - 编写components/ui/index.ts，导出所有ui子组件
  - 确保导出的组件名称与原来一致
  - 添加TypeScript类型导出
  - _Requirements: 1.1, 1.3_

- [x] 2.6 扁平化business组件目录
  - 保持components/business/目录
  - 确保PostCard/子目录结构合理
  - 更新business/index.ts导出文件
  - 更新business组件内部的import路径
  - _Requirements: 1.1, 1.4_

- [x] 3. 更新组件引用路径

- [x] 3.1 更新views中的组件导入路径
  - 全局搜索`from '@/components/base'`替换为`from '@/components/ui'`
  - 全局搜索`from '@/components/form'`替换为`from '@/components/ui'`
  - 全局搜索`from '@/components/data-display'`替换为`from '@/components/ui'`
  - 全局搜索`from '@/components/feedback'`替换为`from '@/components/ui'`
  - 验证所有views文件的导入路径正确
  - _Requirements: 1.3, 5.2_

- [x] 3.2 更新components内部的交叉引用
  - 检查ui组件之间的相互引用
  - 更新business组件中对ui组件的引用
  - 更新layout组件中对ui组件的引用
  - 确保所有组件导入路径使用@/别名
  - _Requirements: 1.3, 5.2_

- [x] 3.3 更新components/index.ts主导出文件
  - 更新components/index.ts以导出新的ui模块
  - 移除对旧目录（base/form/data-display/feedback）的导出
  - 保持layout和business的导出
  - 添加类型导出
  - _Requirements: 1.3, 5.2_

- [x] 4. 重构Utils - 按功能域组织

- [x] 4.1 创建utils/cache目录并整合缓存相关工具
  - 创建utils/cache/目录
  - 移动CacheManager.ts, cacheInvalidation.ts到cache/目录
  - 重命名hybridCache.ts, requestCache.ts并移动到cache/
  - 合并cacheHelper.ts的功能到cache/index.ts
  - 创建cache/index.ts统一导出
  - _Requirements: 2.1, 2.2_

- [x] 4.2 创建utils/format目录并整合格式化工具
  - 创建utils/format/目录
  - 将dateFormat.ts重命名为date.ts并移动
  - 将numberFormat.ts重命名为number.ts并移动
  - 从format.ts拆分出text.ts（truncateText等）
  - 移动url.ts到format/目录
  - 创建format/index.ts统一导出
  - _Requirements: 2.1, 2.2_

- [x] 4.3 创建utils/storage目录并整合存储工具
  - 创建utils/storage/目录
  - 移动indexedDB.ts, storageManager.ts, offlineQueue.ts到storage/
  - 创建storage/index.ts统一导出
  - _Requirements: 2.1_

- [x] 4.4 创建utils/media目录并整合媒体处理工具
  - 创建utils/media/目录
  - 移动imageOptimizer.ts, mediaOptimizer.ts, preload.ts到media/
  - 创建media/index.ts统一导出
  - _Requirements: 2.1_

- [x] 4.5 创建utils/error目录并整合错误处理工具
  - 创建utils/error/目录
  - 移动errorHandler.ts, errorMonitor.ts到error/
  - 创建error/index.ts统一导出
  - _Requirements: 2.1_

- [x] 4.6 更新utils/index.ts主导出文件
  - 更新utils/index.ts以导出新的功能域模块
  - 从cache/, format/, storage/, media/, error/导出
  - 保留common.ts, logger.ts在根目录
  - 移除对已删除文件的导出
  - _Requirements: 2.1, 2.3_

- [x] 5. 更新Utils引用路径

- [x] 5.1 更新stores中的utils导入路径
  - 更新posts.ts中的导入（indexedDB, cacheHelper, errorHandler等）
  - 更新其他store文件中的utils导入
  - 使用新的功能域路径（@/utils/cache, @/utils/format等）
  - _Requirements: 2.3, 5.2_

- [x] 5.2 更新composables中的utils导入路径
  - 检查composables中使用utils的地方
  - 更新导入路径为新的功能域路径
  - _Requirements: 2.3, 5.2_

- [x] 5.3 更新views和components中的utils导入路径
  - 全局搜索`from '@/utils/dateFormat'`替换为`from '@/utils/format'`
  - 全局搜索`from '@/utils/numberFormat'`替换为`from '@/utils/format'`
  - 全局搜索`from '@/utils/errorHandler'`替换为`from '@/utils/error'`
  - 更新其他utils导入路径
  - _Requirements: 2.3, 5.2_

- [x] 6. 模块化I18n翻译文件

- [x] 6.1 为每种语言创建模块化目录结构
  - 在i18n/locales/en/, zh-CN/, ja/下创建模块文件
  - 创建common.json, auth.json, post.json, nav.json, settings.json, profile.json, error.json, privacy.json
  - 保留原始JSON文件作为备份
  - _Requirements: 4.1, 4.2_

- [x] 6.2 拆分zh-CN翻译文件
  - 将zh-CN.json的内容按模块拆分到各个子文件
  - common.json: app, common, aria, cookies
  - auth.json: auth, access
  - post.json: post, posts, author
  - nav.json: nav, platform
  - settings.json: settings, preferences
  - profile.json: profile, favorite, upload
  - error.json: error, errors, offline
  - privacy.json: privacy
  - _Requirements: 4.1, 4.5_

- [x] 6.3 拆分en和ja翻译文件
  - 按照zh-CN相同的模块结构拆分en.json
  - 按照zh-CN相同的模块结构拆分ja.json
  - 确保所有翻译键保持一致
  - _Requirements: 4.1, 4.5_

- [x] 6.4 创建各语言的index.ts加载文件
  - 为en/, zh-CN/, ja/创建index.ts
  - 导入所有模块JSON文件
  - 导出合并后的翻译对象
  - _Requirements: 4.2, 4.4_

- [x] 6.5 更新i18n/index.ts加载逻辑
  - 修改i18n/index.ts以导入新的模块化翻译
  - 从locales/en/index.ts, zh-CN/index.ts, ja/index.ts导入
  - 确保翻译键的访问方式不变
  - 测试语言切换功能
  - _Requirements: 4.3, 4.4_

- [x] 7. 重命名Stores文件

- [x] 7.1 重命名store文件并更新defineStore名称
  - 重命名auth.ts → useAuth.ts
  - 重命名counter.ts → useCounter.ts
  - 重命名network.ts → useNetwork.ts
  - 重命名posts.ts → usePosts.ts
  - 重命名settings.ts → useSettings.ts
  - 重命名theme.ts → useTheme.ts
  - 重命名toast.ts → useToast.ts
  - 确保defineStore的第一个参数保持不变（用于持久化）
  - _Requirements: 3.1, 3.3_

- [x] 7.2 创建stores/index.ts统一导出
  - 创建stores/index.ts文件
  - 导出所有store：useAuthStore, useCounterStore, useNetworkStore等
  - 添加类型导出
  - _Requirements: 3.1, 3.3_

- [x] 7.3 更新所有store导入引用
  - 全局搜索`from '@/stores/auth'`替换为`from '@/stores/useAuth'`
  - 更新views, components, composables中的store导入
  - 或统一使用`from '@/stores'`导入
  - _Requirements: 3.2, 5.2_

- [x] 8. 验证和测试

- [x] 8.1 运行TypeScript类型检查
  - 执行`bun run type-check`
  - 修复所有类型错误
  - 确保没有导入路径错误
  - _Requirements: 5.5, 6.3_

- [x] 8.2 运行ESLint检查
  - 执行`npm run lint`
  - 修复所有lint错误和警告
  - 确保代码风格一致
  - _Requirements: 5.5, 7.3_

- [x] 8.3 执行构建测试
  - 执行`npm run build`
  - 确保构建成功无错误
  - 检查生成的chunk大小和分割情况
  - _Requirements: 6.1, 7.5_

- [x] 8.4 运行开发服务器并手动测试
  - 执行`npm run dev`
  - 测试所有页面路由导航
  - 测试组件渲染和交互
  - 测试API调用和数据加载
  - 测试状态管理功能
  - 测试国际化语言切换
  - 测试主题切换
  - _Requirements: 6.1, 6.3_

- [x] 9. 清理旧文件和代码

- [x] 9.1 删除旧的components目录
  - 删除components/base/目录
  - 删除components/form/目录
  - 删除components/data-display/目录
  - 删除components/feedback/目录
  - 确认所有引用已更新
  - _Requirements: 1.2, 6.2_

- [x] 9.2 删除旧的utils文件
  - 删除已移动到子目录的utils文件
  - 删除cacheHelper.ts, dateFormat.ts, numberFormat.ts等
  - 保留common.ts, logger.ts在根目录
  - _Requirements: 2.2, 6.2_

- [x] 9.3 删除旧的i18n文件
  - 删除locales/en.json, zh-CN.json, ja.json
  - 确认模块化翻译文件工作正常
  - _Requirements: 4.1, 6.2_

- [x] 9.4 清理未使用的导入和代码
  - 使用ESLint检查未使用的导入
  - 移除未使用的变量和函数
  - 清理注释掉的代码
  - _Requirements: 5.5, 6.2_

- [x] 10. 文档更新和最终验证

- [x] 10.1 更新项目文档
  - 更新README.md中的目录结构说明
  - 创建MIGRATION.md迁移指南文档
  - 更新代码注释中的导入路径示例
  - _Requirements: 6.4, 7.1_

- [x] 10.2 创建新旧路径对照表
  - 创建文档列出所有路径变更
  - 包括components, utils, stores的映射关系
  - 提供快速查找参考
  - _Requirements: 6.4, 7.1_

- [x] 10.3 最终全面测试
  - 在不同浏览器测试应用
  - 测试移动端响应式布局
  - 测试离线功能和PWA特性
  - 测试性能指标（加载时间、构建大小）
  - _Requirements: 6.3, 7.5_

- [x] 10.4 性能对比和优化
  - 对比重构前后的构建大小
  - 对比HMR性能
  - 对比首屏加载时间
  - 根据结果进行进一步优化
  - _Requirements: 7.5_
