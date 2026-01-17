# 前端 API 对接实现总结

## 概述

本次实现完成了与后端 API 新特性的对接，包括缩略图质量控制和访客访问限制提示功能。

## 实现的功能

### 1. 缩略图质量参数支持

#### API 层更新

- **文件**: `src/api/postService.ts`, `src/api/searchService.ts`
- **新增类型**: `ThumbnailQuality = 'small' | 'medium' | 'large'`
- **参数添加**: 在 `ListPostsParams` 和 `SearchPostsParams` 中添加 `thumbnail_quality` 可选参数

#### 自适应质量选择

根据屏幕尺寸自动选择合适的缩略图质量：

- **小屏幕** (< 640px): `small` (200px 宽度)
- **中等屏幕** (640px - 1024px): `medium` (400px 宽度)
- **大屏幕** (≥ 1024px): `large` (800px 宽度)

#### 应用页面

- `HomePage.vue` - 首页最新内容
- `ExplorePage.vue` - 探索页面
- `SearchPage.vue` - 搜索结果页面

### 2. 访问限制提示功能

#### API 响应头处理

- **文件**: `src/api/client.ts`
- **新增类型**:
  - `ContentLimitInfo` - 访问限制信息接口
  - `PaginatedApiResponseWithLimit<T>` - 扩展的分页响应类型

#### 响应头提取

自动从 HTTP 响应头中提取访问限制信息：

- `X-Content-Limited`: 是否应用了限制
- `X-Guest-Limit`: 访客用户的限制数量
- `X-Per-Platform-Limit`: 多平台查询时每平台限制
- `X-Max-Results`: 实际返回的最大结果数

#### UI 组件

- **文件**: `src/components/ui/GuestLimitBanner.vue`
- **功能**:
  - 显示访客访问限制提示
  - 提供登录按钮引导用户登录
  - 支持单平台和多平台限制的不同提示文案
  - 响应式设计，移动端友好

#### 国际化支持

添加了三种语言的翻译：

- **英文** (`en.json`):
  - `guestLimit.title`: "Limited Content for Guests"
  - `guestLimit.singlePlatformDescription`: 单平台限制说明
  - `guestLimit.multiPlatformDescription`: 多平台限制说明
- **中文** (`zh-CN.json`):
  - `guestLimit.title`: "访客内容限制"
  - 对应的中文说明文案
- **日文** (`ja.json`):
  - `guestLimit.title`: "ゲストコンテンツ制限"
  - 对应的日文说明文案

## 技术实现细节

### 响应拦截器增强

在 `src/api/client.ts` 的 `request` 函数中：

1. **提取限制信息**:

```typescript
function extractLimitInfo(response: Response): ContentLimitInfo | undefined {
  const isLimited = response.headers.get('X-Content-Limited') === 'true'
  if (!isLimited) return undefined

  return {
    isLimited: true,
    guestLimit: parseInt(response.headers.get('X-Guest-Limit') || '0'),
    perPlatformLimit: parseInt(response.headers.get('X-Per-Platform-Limit') || '0'),
    maxResults: parseInt(response.headers.get('X-Max-Results') || '0'),
  }
}
```

2. **附加到响应数据**:

```typescript
const data = await response.json()
const limitInfo = extractLimitInfo(response)
if (limitInfo && data && typeof data === 'object' && 'items' in data) {
  return { ...data, limitInfo } as T
}
```

### 页面集成

所有内容列表页面都已集成访问限制提示：

```vue
<template>
  <!-- 访客限制提示 -->
  <GuestLimitBanner :limit-info="limitInfo" />

  <!-- 内容列表 -->
  <div class="posts-grid">
    <PostCard v-for="post in posts" :key="post.id" :post="post" />
  </div>
</template>

<script setup lang="ts">
import type { ContentLimitInfo } from '@/api/client'
import GuestLimitBanner from '@/components/ui/GuestLimitBanner.vue'

const limitInfo = ref<ContentLimitInfo | undefined>(undefined)

async function fetchPosts() {
  const res = await postService.listPosts({
    thumbnail_quality: getThumbnailQuality(),
  })
  limitInfo.value = res.limitInfo
}
</script>
```

## 用户体验优化

### 1. 性能优化

- 根据设备屏幕尺寸自动选择合适的缩略图质量
- 减少移动端的数据传输量
- 提升桌面端的图片清晰度

### 2. 访客引导

- 清晰的限制提示，告知访客当前的访问限制
- 一键登录按钮，降低转化门槛
- 保留当前页面路径，登录后自动返回

### 3. 响应式设计

- GuestLimitBanner 在移动端自动调整布局
- 图标和文字在小屏幕上居中显示
- 按钮在移动端占满宽度

## 后端 API 兼容性

### 向后兼容

- `thumbnail_quality` 参数为可选，不传时使用后端默认值 `large`
- 未登录用户自动应用访问限制，无需前端额外处理
- 响应头不存在时，`limitInfo` 为 `undefined`，不显示提示

### 错误处理

- 无效的 `thumbnail_quality` 值会返回 422 验证错误
- 前端通过类型系统确保只传递有效值
- API 错误通过 toast 通知用户

## 测试建议

### 功能测试

1. **缩略图质量**:
   - 在不同屏幕尺寸下检查请求的 `thumbnail_quality` 参数
   - 验证返回的缩略图 URL 包含正确的 `size` 参数

2. **访客限制**:
   - 未登录状态下访问首页/探索页/搜索页
   - 验证是否显示 GuestLimitBanner
   - 检查提示文案是否正确（单平台 vs 多平台）
   - 点击登录按钮，验证跳转和回跳逻辑

3. **登录用户**:
   - 登录后访问相同页面
   - 验证 GuestLimitBanner 不显示
   - 确认可以加载更多内容

### 国际化测试

- 切换语言（英文/中文/日文）
- 验证 GuestLimitBanner 的文案正确显示
- 检查数字插值是否正确

## 文件清单

### 新增文件

- `src/components/ui/GuestLimitBanner.vue` - 访客限制提示组件

### 修改文件

- `src/api/client.ts` - 添加响应头提取和类型定义
- `src/api/postService.ts` - 添加缩略图质量参数支持
- `src/api/searchService.ts` - 添加缩略图质量参数支持
- `src/views/HomePage.vue` - 集成缩略图质量和访客限制提示
- `src/views/ExplorePage.vue` - 集成缩略图质量和访客限制提示
- `src/views/SearchPage.vue` - 集成缩略图质量和访客限制提示
- `src/i18n/locales/en.json` - 添加英文翻译
- `src/i18n/locales/zh-CN.json` - 添加中文翻译
- `src/i18n/locales/ja.json` - 添加日文翻译

## 部署注意事项

1. **环境变量**: 无需新增环境变量
2. **依赖更新**: 无需安装新的依赖
3. **构建**: 运行 `bun run build` 进行生产构建
4. **类型检查**: 已通过 `bun run type-check`

## 后续优化建议

1. **缓存策略**: 考虑为不同质量的缩略图设置不同的缓存策略
2. **懒加载**: 对于长列表，可以考虑图片懒加载优化
3. **A/B 测试**: 测试访客限制提示对注册转化率的影响
4. **分析追踪**: 添加访客限制提示的点击率追踪
