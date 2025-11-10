# API 迁移指南：从 Legacy API 迁移到 v1

## 📋 概述

HMRChan API 已全面升级到 **v1 版本**。Legacy API (`/api/*`) 已被标记为**弃用（Deprecated）**，并将在 **2026年6月1日** 后停止服务。

**请尽快将您的应用迁移到 v1 API！**

---

## ⚠️ 弃用时间线

| 日期 | 状态 | 说明 |
|------|------|------|
| **2025-11-09** | ✅ v1 发布 | v1 API 正式发布，Legacy API 标记为弃用 |
| **2026-06-01** | ⛔ Legacy 停止 | Legacy API 将被完全移除 |

---

## 🔄 迁移步骤

### 1. 更新 Base URL

**Legacy API:**
```
http://your-domain.com/api/*
```

**V1 API:**
```
http://your-domain.com/api/v1/*
```

### 2. 路径映射

所有端点路径保持不变，只需要添加 `/v1` 前缀：

| Legacy | V1 | 说明 |
|--------|----|----|
| `/api/posts` | `/api/v1/posts` | 帖子列表 |
| `/api/posts/{post_id}` | `/api/v1/posts/{post_id}` | 帖子详情 |
| `/api/auth/login` | `/api/v1/auth/login` | 用户登录 |
| `/api/users` | `/api/v1/users` | 用户管理 |
| `/api/favorites` | `/api/v1/favorites` | 收藏管理 |
| `/api/media/{media_id}/stream` | `/api/v1/media/{media_id}/stream` | 媒体流 |

### 3. 参数变更

#### ⚠️ 重要变更：UUID 字符串

**所有资源 ID 现在使用 UUID 字符串格式**

**Legacy API (整数 ID):**
```json
{
  "post_id": 12345
}
```

**V1 API (UUID 字符串):**
```json
{
  "post_id": "c3f26666-f55d-476a-9646-5b7571107d8d"
}
```

**受影响的端点：**
- ✅ `/api/v1/posts/{post_id}` - 使用 UUID
- ✅ `/api/v1/favorites/check/{post_id}` - 使用 UUID
- ✅ `/api/v1/media/{media_id}/stream` - 使用 UUID
- ✅ `/api/v1/users/{user_id}` - 现在也支持 UUID（新增）

---

## 📝 代码示例

### JavaScript/TypeScript

**Legacy (弃用):**
```javascript
// ❌ 旧方式
const response = await fetch('http://api.example.com/api/posts');
const posts = await response.json();

// 使用整数 ID
const postId = 12345;
const post = await fetch(`http://api.example.com/api/posts/${postId}`);
```

**V1 (推荐):**
```javascript
// ✅ 新方式
const response = await fetch('http://api.example.com/api/v1/posts');
const posts = await response.json();

// 使用 UUID 字符串
const postUuid = 'c3f26666-f55d-476a-9646-5b7571107d8d';
const post = await fetch(`http://api.example.com/api/v1/posts/${postUuid}`);
```

### Python

**Legacy (弃用):**
```python
# ❌ 旧方式
import requests

response = requests.get('http://api.example.com/api/posts')
posts = response.json()

# 使用整数 ID
post_id = 12345
post = requests.get(f'http://api.example.com/api/posts/{post_id}')
```

**V1 (推荐):**
```python
# ✅ 新方式
import requests

response = requests.get('http://api.example.com/api/v1/posts')
posts = response.json()

# 使用 UUID 字符串
post_uuid = 'c3f26666-f55d-476a-9646-5b7571107d8d'
post = requests.get(f'http://api.example.com/api/v1/posts/{post_uuid}')
```

### cURL

**Legacy (弃用):**
```bash
# ❌ 旧方式
curl http://api.example.com/api/posts
curl http://api.example.com/api/posts/12345
```

**V1 (推荐):**
```bash
# ✅ 新方式
curl http://api.example.com/api/v1/posts
curl http://api.example.com/api/v1/posts/c3f26666-f55d-476a-9646-5b7571107d8d
```

---

## 🔍 如何识别 Legacy API 响应

Legacy API 响应会包含以下警告头：

```http
X-API-Version: legacy
Deprecation: true
Sunset: Sat, 01 Jun 2026 00:00:00 GMT
Warning: 299 - "This API version is deprecated. Please migrate to /api/v1/"
X-API-Warn: DEPRECATED: This endpoint will be removed. Use /api/v1/ instead.
```

V1 API 响应会包含：

```http
X-API-Version: v1
```

---

## ✅ 迁移检查清单

### 前端迁移状态 (Vue.js)

**已完成 ✅**:
- [x] **API 客户端层** - 使用 `VITE_API_ENDPOINT` 环境变量
  - `src/api/client.ts`: 自动使用 `/api/v1` 作为 baseURL
  - 生产环境 HTTPS fallback: `https://api.momichan.xyz/api/v1`
  
- [x] **媒体 URL 生成** - 所有媒体端点使用 v1 路径
  - `src/api/services.ts`: `getStreamUrl()`, `getDownloadUrl()`, `getThumbnailUrl()`, `getSubtitleUrl()`
  - 使用 `getApiEndpoint()` 自动包含 `/api/v1` 前缀
  
- [x] **移除硬编码路径** - 所有 API 调用通过统一客户端
  - 所有服务（posts, media, authors, favorites, auth）通过 `api` 实例调用
  - 相对路径自动附加到 `BASE_URL` (`/api/v1`)
  
- [x] **帖子相关端点** - 完整 v1 支持
  - `GET /api/v1/posts` - 帖子列表
  - `GET /api/v1/posts/{uuid}` - 帖子详情（UUID）
  - `GET /api/v1/posts/stats/summary` - 统计数据
  - `GET /api/v1/posts/related/{uuid}` - 相关帖子
  
- [x] **用户认证端点** - v1 迁移完成
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/auth/profile`
  
- [x] **收藏功能** - UUID 支持
  - `POST /api/v1/favorites/{post_uuid}`
  - `DELETE /api/v1/favorites/{post_uuid}`
  - `GET /api/v1/favorites/check/{post_uuid}`

### 环境配置

**开发环境** (`.env.development`):
```env
VITE_API_BASE_URL=https://api.momichan.xyz
VITE_API_ENDPOINT=https://api.momichan.xyz/api/v1
```

**生产环境** (`.env.production` / Cloudflare Pages):
```env
VITE_API_BASE_URL=https://api.momichan.xyz
VITE_API_ENDPOINT=https://api.momichan.xyz/api/v1
```

**代码默认值** (无环境变量时):
```typescript
// src/api/client.ts
const BASE_URL = import.meta.env.VITE_API_ENDPOINT 
  || (import.meta.env.PROD ? 'https://api.momichan.xyz/api/v1' : '/api/v1')
```

### 待办事项

- [ ] 更新移动应用中的 API 端点（如果有）
- [ ] 更新第三方集成（如果有）
- [ ] 更新 E2E 测试用例
- [ ] 验证所有功能正常工作

---

## 🔧 前端实现细节

### 1. API 服务层架构

**文件结构**:
```
src/api/
├── client.ts          # Axios 客户端配置（统一 baseURL）
├── services.ts        # API 服务方法（posts, media, authors 等）
└── types.ts           # TypeScript 类型定义
```

**关键实现**:

#### `src/api/client.ts`
```typescript
// ✅ 使用 VITE_API_ENDPOINT 环境变量
const BASE_URL = import.meta.env.VITE_API_ENDPOINT 
  || import.meta.env.VITE_API_URL 
  || (import.meta.env.PROD ? 'https://api.momichan.xyz/api/v1' : '/api/v1')

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,  // 所有请求自动添加此前缀
  timeout: 30000,
})
```

#### `src/api/services.ts`
```typescript
// ✅ 所有端点使用相对路径（自动添加 baseURL）
export const postsApi = {
  getPosts() {
    return api.get('/posts')  // → /api/v1/posts
  },
  getPostById(uuid: UUID) {
    return api.get(`/posts/${uuid}`)  // → /api/v1/posts/{uuid}
  },
}

// ✅ 媒体 URL 使用 v1 路径
export const mediaApi = {
  getStreamUrl(mediaId: UUID) {
    // 返回完整 URL: https://api.momichan.xyz/api/v1/media/{uuid}/stream
    return `${getApiBaseUrl()}${getApiEndpoint().replace(getApiBaseUrl(), '')}/media/${mediaId}/stream`
  },
}
```

#### `src/utils/url.ts`
```typescript
// ✅ URL 工具函数支持 v1
export function getApiEndpoint(): string {
  if (import.meta.env.VITE_API_ENDPOINT) {
    return import.meta.env.VITE_API_ENDPOINT  // https://api.momichan.xyz/api/v1
  }
  
  // 生产环境默认
  if (import.meta.env.PROD) {
    return 'https://api.momichan.xyz/api/v1'
  }
  
  return '/api/v1'  // 开发环境
}
```

### 2. 媒体 URL 处理

**所有媒体相关 URL 都包含 `/api/v1` 路径**:

| 功能 | URL 格式 | 示例 |
|------|---------|------|
| 流式播放 | `/api/v1/media/{uuid}/stream` | `https://api.momichan.xyz/api/v1/media/abc-123/stream` |
| 下载 | `/api/v1/media/{uuid}/download` | `https://api.momichan.xyz/api/v1/media/abc-123/download` |
| 缩略图 | `/api/v1/media/{uuid}/thumbnail` | `https://api.momichan.xyz/api/v1/media/abc-123/thumbnail` |
| 字幕 | `/api/v1/media/{uuid}/subtitle` | `https://api.momichan.xyz/api/v1/media/abc-123/subtitle` |

**实现位置**: `src/api/services.ts` → `mediaApi` 对象

### 3. UUID 类型支持

**TypeScript 类型定义** (`src/api/types.ts`):
```typescript
// UUID 字符串类型
export type UUID = string

// 帖子接口使用 UUID
export interface Post {
  uuid: UUID           // ✅ 主键
  id?: number          // ⚠️ 已弃用（保留用于兼容）
  title: string
  author_uuid?: UUID   // ✅ 外键
  // ...
}

// 媒体文件接口
export interface MediaFile {
  uuid: UUID           // ✅ 主键
  post_uuid?: UUID     // ✅ 外键
  // ...
}
```

**API 调用示例**:
```typescript
// ✅ 使用 UUID
const postUuid = 'c3f26666-f55d-476a-9646-5b7571107d8d'
const post = await postsApi.getPostById(postUuid)

// ✅ 收藏功能
await favoritesApi.addFavorite(postUuid)
await favoritesApi.checkFavorite(postUuid)
```

### 4. 环境变量配置

**Vite 环境变量优先级**:
```
1. VITE_API_ENDPOINT     (首选)
2. VITE_API_BASE_URL     (备用)
3. 硬编码默认值          (最后)
```

**配置示例**:
```bash
# .env.development
VITE_API_BASE_URL=https://api.momichan.xyz
VITE_API_ENDPOINT=https://api.momichan.xyz/api/v1

# .env.production (Cloudflare Pages)
VITE_API_BASE_URL=https://api.momichan.xyz
VITE_API_ENDPOINT=https://api.momichan.xyz/api/v1
```

### 5. 混合内容问题解决

**问题**: HTTPS 网站请求 HTTP API 被浏览器阻止

**解决方案**:
```typescript
// src/api/client.ts
// ✅ 生产环境强制使用 HTTPS
const BASE_URL = import.meta.env.VITE_API_ENDPOINT 
  || (import.meta.env.PROD ? 'https://api.momichan.xyz/api/v1' : '/api/v1')

// src/utils/url.ts
// ✅ 所有 URL 工具函数支持 HTTPS
export function getApiBaseUrl(): string {
  if (import.meta.env.PROD) {
    return 'https://api.momichan.xyz'  // 强制 HTTPS
  }
  return ''
}
```

**相关文档**: `CLOUDFLARE_DEPLOYMENT.md`, `QUICK_FIX.md`

---

## 📚 API 文档

### Legacy API 文档（弃用）
- Swagger UI: `http://your-domain.com/api/docs`
- ReDoc: `http://your-domain.com/api/redoc`

### V1 API 文档（推荐）
- Swagger UI: `http://your-domain.com/api/v1/docs`
- ReDoc: `http://your-domain.com/api/v1/redoc`
- OpenAPI JSON: `http://your-domain.com/api/v1/openapi.json`

---

## 🆘 常见问题

### Q: 为什么要使用 UUID 而不是整数 ID？

A: UUID 提供了以下优势：
- ✅ **全局唯一**：不会在分布式系统中冲突
- ✅ **安全性**：不可预测，防止遍历攻击
- ✅ **隐私**：不泄露记录总数信息
- ✅ **分布式友好**：支持多数据库和微服务架构

### Q: Legacy API 何时会完全停止？

A: Legacy API 将在 **2026年6月1日** 后完全停止服务。

### Q: 如果我还在使用 Legacy API 会发生什么？

A: 
- 现在：您会收到弃用警告头，但 API 仍然可用
- 2026年6月1日后：所有 Legacy API 请求将返回 410 Gone 错误

### Q: 迁移会影响现有数据吗？

A: 不会。数据库中的所有记录都已经有 UUID 字段。迁移只是改变 API 的访问方式。

### Q: 如何获取资源的 UUID？

A: 所有 API 响应现在都包含 `uuid` 字段。如果您已经有整数 ID，可以通过 Legacy API 获取对应的 UUID，然后在 V1 API 中使用。

---

## 💬 支持

如果您在迁移过程中遇到任何问题，请：
- 查看 [API 文档](http://your-domain.com/api/v1/docs)
- 提交 Issue 到 GitHub
- 联系技术支持

---

## 📊 迁移统计

**系统已完成的升级：**
- ✅ Posts 系统：100% UUID 覆盖（6,117 条记录）
- ✅ Users 系统：100% UUID 覆盖（1 个用户）
- ✅ Authors 系统：100% UUID 覆盖（78 个作者）
- ✅ Media Files 系统：100% UUID 覆盖（12,602 个文件）
- ✅ 所有 UUID 唯一性：0 重复
- ✅ 数据完整性：外键约束、唯一约束完整

**API 状态：**
- ✅ V1 API：已发布，推荐使用
- ⚠️ Legacy API：已弃用，2026年6月1日停止

---

**立即开始迁移，享受更安全、更强大的 API！** 🚀
