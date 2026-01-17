# 访客限制显示问题调试指南

## 问题描述

在 Explore 页面的"最热门"和"趋势"标签下，游客用户看到显示"全部帖子可查看（7085 帖子）"，而不是显示访客限制提示。

## 预期行为

根据后端 API 文档，游客用户应该受到以下限制：

- 单平台查询：最多返回 10 条内容
- 多平台查询：每平台最多 15 条，总计不超过 60 条

当触发限制时，后端应返回以下 HTTP 响应头：

- `X-Content-Limited: true`
- `X-Guest-Limit: 10` 或 `60`
- `X-Per-Platform-Limit: 15`（多平台查询时）
- `X-Max-Results: 10` 或 `60`

## 前端实现检查

### 1. API 客户端 (src/api/client.ts)

```typescript
// extractLimitInfo 函数正确提取响应头
function extractLimitInfo(response: Response): ContentLimitInfo | undefined {
  const isLimited = response.headers.get('X-Content-Limited') === 'true'
  if (!isLimited) return undefined

  const guestLimit = response.headers.get('X-Guest-Limit')
  const perPlatformLimit = response.headers.get('X-Per-Platform-Limit')
  const maxResults = response.headers.get('X-Max-Results')

  return {
    isLimited: true,
    guestLimit: guestLimit ? parseInt(guestLimit, 10) : undefined,
    perPlatformLimit: perPlatformLimit ? parseInt(perPlatformLimit, 10) : undefined,
    maxResults: maxResults ? parseInt(maxResults, 10) : undefined,
  }
}

// request 函数正确附加 limitInfo
const limitInfo = extractLimitInfo(response)
if (limitInfo && data && typeof data === 'object' && 'items' in data) {
  return { ...data, limitInfo } as T
}
```

✅ 前端代码逻辑正确

### 2. ExplorePage.vue

```typescript
// 正确设置 limitInfo
if (reset) {
  posts.value = res.items
  limitInfo.value = res.limitInfo
} else {
  posts.value.push(...res.items)
  if (res.limitInfo) {
    limitInfo.value = res.limitInfo
  }
}
```

✅ 页面代码逻辑正确

### 3. GuestLimitBanner.vue

```typescript
// 显示条件
const show = computed(() => limitInfo?.isLimited ?? false)
```

✅ 组件显示逻辑正确

## 可能的原因

### 1. 后端未返回限制响应头

**最可能的原因**：后端在使用 `sort_by=like_count` 或 `sort_by=view_count` 时，可能没有正确应用访客限制逻辑。

**验证方法**：

```bash
# 测试"最新"标签（sort_by=published_at）
curl -I "https://api.momichan.xyz/api/v1/posts/?page=1&page_size=20&sort_by=published_at&sort_order=desc"

# 测试"最热门"标签（sort_by=like_count）
curl -I "https://api.momichan.xyz/api/v1/posts/?page=1&page_size=20&sort_by=like_count&sort_order=desc"

# 测试"趋势"标签（sort_by=view_count）
curl -I "https://api.momichan.xyz/api/v1/posts/?page=1&page_size=20&sort_by=view_count&sort_order=desc"
```

检查响应头中是否包含 `X-Content-Limited: true`。

### 2. 缓存问题

如果用户之前登录过，可能缓存了带有 token 的请求。

**验证方法**：

- 清除浏览器缓存和 localStorage
- 使用无痕模式测试
- 检查 Network 面板中的请求是否携带 `Authorization` 头

### 3. CORS 响应头过滤

Cloudflare Pages Functions 可能过滤了某些自定义响应头。

**验证方法**：
检查 `functions/api/[[path]].ts` 中的响应头处理：

```typescript
// 确保转发所有响应头
const headers = new Headers(backendResponse.headers)
// 检查是否正确转发 X-Content-Limited 等头
```

## 调试步骤

### 1. 浏览器开发者工具

1. 打开 https://momichan.xyz/explore
2. 切换到"最热门"或"趋势"标签
3. 打开 Network 面板
4. 找到 `/api/v1/posts/` 请求
5. 检查 Response Headers：
   - 是否有 `X-Content-Limited: true`
   - 是否有 `X-Guest-Limit`
   - 是否有 `X-Max-Results`

### 2. 添加临时调试日志

在 `src/views/ExplorePage.vue` 的 `fetchPosts` 函数中添加：

```typescript
try {
  const res = await postService.listPosts(requestParams)

  // 临时调试日志
  console.log('[ExplorePage] API Response:', {
    itemsCount: res.items.length,
    total: res.total,
    limitInfo: res.limitInfo,
    sortBy: requestParams.sort_by,
    sortOrder: requestParams.sort_order,
  })

  if (reset) {
    posts.value = res.items
    limitInfo.value = res.limitInfo
  }
  // ...
}
```

### 3. 检查后端日志

联系后端团队，检查以下内容：

- 访客限制中间件是否正确应用到所有排序方式
- 是否有特殊的排序逻辑绕过了限制检查
- 响应头是否正确设置

## 临时解决方案

如果后端修复需要时间，可以在前端添加客户端限制检查：

```typescript
// src/views/ExplorePage.vue
import { useAuthStore } from '@/stores'

const authStore = useAuthStore()
const { isAuthenticated } = storeToRefs(authStore)

// 在 fetchPosts 函数中
try {
  const res = await postService.listPosts(requestParams)

  // 客户端限制检查（临时方案）
  if (!isAuthenticated.value && !res.limitInfo && res.items.length > 0) {
    // 如果后端没有返回 limitInfo，前端手动创建
    limitInfo.value = {
      isLimited: true,
      guestLimit: currentPlatform.value === 'all' ? 60 : 10,
      perPlatformLimit: currentPlatform.value === 'all' ? 15 : undefined,
      maxResults: currentPlatform.value === 'all' ? 60 : 10,
    }
  } else {
    limitInfo.value = res.limitInfo
  }

  // ...
}
```

⚠️ **注意**：这只是临时方案，根本解决方案应该是修复后端 API。

## 后续行动

1. ✅ 前端代码已验证正确
2. ⏳ 需要验证后端 API 在不同排序方式下的行为
3. ⏳ 需要检查 Cloudflare Functions 的响应头转发
4. ⏳ 如果是后端问题，需要后端团队修复

## 相关文件

- `src/api/client.ts` - API 客户端和 limitInfo 提取逻辑
- `src/api/postService.ts` - 帖子服务
- `src/views/ExplorePage.vue` - Explore 页面
- `src/views/HomePage.vue` - 首页（参考实现）
- `src/views/SearchPage.vue` - 搜索页（参考实现）
- `src/components/ui/GuestLimitBanner.vue` - 访客限制提示组件
- `functions/api/[[path]].ts` - API 代理函数
