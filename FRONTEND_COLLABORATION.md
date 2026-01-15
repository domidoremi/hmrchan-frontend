# HMRChan 前端开发协作指南

> 本文档面向前端开发者，说明如何与后端 API 协同工作。

---

## 1. API 基础信息

### 环境配置

| 环境 | API Base URL | 说明 |
|------|-------------|------|
| 开发 | `http://localhost:8000/api/v1` | 本地开发 |
| 生产 | `https://api.momichan.xyz/api/v1` | 生产环境 |

### API 文档

- Swagger UI: `/api/docs` (仅开发环境)
- ReDoc: `/api/redoc` (仅开发环境)
- OpenAPI JSON: `/api/openapi.json`

---

## 2. 认证机制

### 双 Token 架构

```
┌─────────────────────────────────────────────────────────────┐
│  Access Token (响应体)          Refresh Token (HttpOnly Cookie)  │
│  ├─ 有效期: 15分钟              ├─ 有效期: 30天                    │
│  ├─ 存储: 内存/localStorage     ├─ 存储: 浏览器自动管理             │
│  └─ 用途: API 请求认证          └─ 用途: 刷新 Access Token         │
└─────────────────────────────────────────────────────────────┘
```

### 登录流程

```typescript
// POST /api/v1/auth/login
const response = await axios.post('/api/v1/auth/login', {
  username: 'user',
  password: 'password',
  device_name: 'Chrome on Windows',  // 可选
  device_type: 'browser',            // 可选
  turnstile_token: 'xxx'             // Turnstile 启用时必填
}, { withCredentials: true });  // ⚠️ 必须开启，否则无法接收 Cookie

// 响应结构
{
  access_token: "eyJhbG...",
  token_type: "bearer",
  expires_in: 900,           // Access Token 有效期（秒）
  refresh_threshold: 300,    // 建议刷新阈值（秒）
  user: { id, username, email, is_admin, ... }
}
```

### Token 刷新策略

```typescript
// 推荐：在 Access Token 剩余时间 < refresh_threshold 时刷新
const shouldRefresh = (tokenExpiry: number, threshold: number) => {
  return Date.now() / 1000 > tokenExpiry - threshold;
};

// POST /api/v1/auth/refresh
// 无需传参，Refresh Token 自动从 Cookie 读取
const response = await axios.post('/api/v1/auth/refresh', {}, {
  withCredentials: true
});
```

### 心跳保活

```typescript
// POST /api/v1/auth/heartbeat
// 用于前端定时保活，自动刷新 Token
const heartbeat = await axios.post('/api/v1/auth/heartbeat', {}, {
  withCredentials: true
});

// 响应包含 server_time 用于时间同步
{
  access_token: "...",
  expires_in: 900,
  refresh_threshold: 300,
  server_time: "2026-01-12T10:30:00"
}
```

### 请求头配置

```typescript
// Axios 拦截器示例
axios.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

---

## 3. 核心 API 端点

### 3.1 内容模块

#### 帖子列表

```typescript
// GET /api/v1/posts
interface PostListParams {
  page?: number;           // 默认 1
  page_size?: number;      // 默认 20，最大 100
  platform?: string;       // youtube | twitter | tiktok | instagram
  q?: string;              // 搜索关键词
  author_id?: string;      // 作者 UUID
  sort_by?: string;        // published_at | scraped_at | view_count | like_count
  sort_order?: 'asc' | 'desc';
  per_platform_limit?: number;  // 多平台查询时每平台限制
}

// 访问限制
// - 未登录: 每平台最多 15 条
// - 已登录: 每平台最多 25 条
// - 管理员: 无限制
```

#### 帖子详情

```typescript
// GET /api/v1/posts/{post_uuid}
// 支持 ETag 缓存，建议使用 If-None-Match 头

// 响应包含完整媒体文件列表
interface PostDetail {
  id: string;              // UUID
  platform: string;
  title: string;
  description: string;
  media_files: MediaFile[];
  author_id: string;       // 发布者 UUID
  author_name: string;
  original_author_id?: string;  // 原作者（转发时）
  // ...
}
```

#### 增加浏览量

```typescript
// POST /api/v1/posts/{post_uuid}/increment-view
// 无需认证，前端应在 localStorage 记录已浏览帖子避免重复计数
```

### 3.2 媒体模块

#### 视频流式播放

```typescript
// GET /api/v1/media/{media_uuid}/stream
// 支持 HTTP Range 请求，用于视频 seek

// 前端使用
<video src="/api/v1/media/{uuid}/stream" />
```

#### 缩略图

```typescript
// GET /api/v1/media/{media_uuid}/thumbnail?size=medium
// size: small(200) | medium(400) | large(800) | original

// 缓存策略: 30天不可变缓存
```

#### 字幕

```typescript
// GET /api/v1/media/{media_uuid}/subtitle?language=zh
// 返回 VTT/SRT 格式字幕

// 前端使用
<track src="/api/v1/media/{uuid}/subtitle" kind="subtitles" srclang="zh" />
```

### 3.3 评论模块

```typescript
// 获取帖子评论
// GET /api/v1/posts/{post_uuid}/comments
// 或 GET /api/v1/comments/post/{post_uuid}

interface CommentListParams {
  page?: number;
  page_size?: number;      // 最大 50
  sort?: 'newest' | 'oldest' | 'popular';
}

// 创建评论
// POST /api/v1/comments/post/{post_uuid}
interface CreateComment {
  content: string;         // 1-2000 字符
  parent_id?: number;      // 回复时填写
  image_ids?: number[];    // 最多 9 张图片
}
```

### 3.4 通知模块

```typescript
// 获取通知列表
// GET /api/v1/notifications

// 获取未读数量
// GET /api/v1/notifications/unread-count

// 标记已读
// PATCH /api/v1/notifications/{id}/read

// 全部标记已读
// POST /api/v1/notifications/read-all

// 通知类型
type NotificationType = 
  | 'comment_reply'    // 评论回复
  | 'comment_like'     // 评论被点赞
  | 'follow'           // 被关注
  | 'system'           // 系统通知
  | 'report_resolved'; // 举报已处理
```

---

## 4. WebSocket 实时通信

### 连接地址

```typescript
// 主 WebSocket
ws://localhost:8000/ws

// 通知专用
ws://localhost:8000/ws/notifications

// 爬虫进度（管理员）
ws://localhost:8000/ws/scraper-progress
```

### 消息协议

```typescript
// 发送心跳
{ type: 'ping', timestamp: Date.now() }

// 订阅主题
{ type: 'subscribe', topic: 'new_posts' }

// 接收消息类型
interface WSMessage {
  type: 'pong' | 'subscribed' | 'new_post' | 'scraper_update' | 'notification';
  data?: any;
}
```

---

## 5. 响应格式规范

### 成功响应

```typescript
// 单条数据
{
  success: true,
  message: "操作成功",
  data: { ... }
}

// 分页列表
{
  items: [...],
  total: 100,
  page: 1,
  page_size: 20,
  total_pages: 5
}
```

### 错误响应

```typescript
{
  success: false,
  message: "错误描述",
  error_code: "VALIDATION_ERROR",  // 可选
  details: [                        // 可选
    { field: "email", message: "格式不正确" }
  ]
}
```

### HTTP 状态码

| 状态码 | 含义 | 前端处理 |
|--------|------|----------|
| 200 | 成功 | 正常处理 |
| 201 | 创建成功 | 正常处理 |
| 204 | 无内容 | 无需处理响应体 |
| 304 | 未修改 | 使用缓存 |
| 400 | 请求错误 | 显示错误信息 |
| 401 | 未认证 | 跳转登录 / 刷新 Token |
| 403 | 无权限 | 显示权限不足 |
| 404 | 未找到 | 显示 404 页面 |
| 422 | 验证失败 | 显示字段错误 |
| 429 | 请求过多 | 显示限流提示 |
| 500 | 服务器错误 | 显示通用错误 |

---

## 6. 速率限制

### 限制规则

| 端点类型 | 未登录 | 已登录 | 管理员 |
|----------|--------|--------|--------|
| 内容访问 | 20/分钟 | 60/分钟 | 200/分钟 |
| 登录/注册 | 5/分钟 | - | - |
| 通用 API | 100/分钟 | 200/分钟 | 无限制 |

### 响应头

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

### 前端处理

```typescript
axios.interceptors.response.use(null, error => {
  if (error.response?.status === 429) {
    const retryAfter = error.response.headers['retry-after'];
    showToast(`请求过于频繁，请 ${retryAfter} 秒后重试`);
  }
  return Promise.reject(error);
});
```

---

## 7. 缓存策略

### ETag 支持

```typescript
// 帖子详情支持 ETag
const response = await axios.get(`/api/v1/posts/${id}`, {
  headers: {
    'If-None-Match': cachedETag
  }
});

if (response.status === 304) {
  // 使用缓存数据
}
```

### Cache-Control 头

| 资源类型 | Cache-Control | 说明 |
|----------|---------------|------|
| 媒体流 | `public, max-age=2592000, immutable` | 30天不可变 |
| 缩略图 | `public, max-age=31536000, immutable` | 1年不可变 |
| 帖子详情 | `private, max-age=0, no-cache` | 需验证 |
| 列表数据 | `private, max-age=60` | 1分钟 |

---

## 8. Cloudflare Turnstile

### 检查配置

```typescript
// GET /api/v1/auth/turnstile-config
{
  enabled: true,
  site_key: "0x4AAAAAAA..."  // 用于前端渲染
}
```

### 前端集成

```typescript
// 仅在 enabled=true 时渲染 Turnstile 组件
if (turnstileConfig.enabled) {
  // 渲染 Turnstile widget
  // 获取 token 后传入登录/注册请求
}
```

---

## 9. 安全注意事项

### CORS

- 生产环境严格限制 Origin
- 所有跨域请求需要 `withCredentials: true`

### XSS 防护

- 后端已对输入进行 XSS 过滤
- 前端仍需对用户输入进行转义

### CSRF

- 使用 JWT + HttpOnly Cookie 架构
- 无需额外 CSRF Token

### 敏感操作

```typescript
// 敏感操作前需要密码验证
// POST /api/v1/auth/verify-password
const { verification_token } = await verifyPassword(password);

// 使用 verification_token 执行敏感操作
// Token 有效期 5 分钟
```

---

## 10. 开发调试

### 本地开发

```bash
# 启动后端
docker-compose up -d

# 查看 API 日志
docker-compose logs -f api

# 进入容器调试
docker exec -it hmrchan-api bash
```

### 常见问题

#### CORS 错误

```typescript
// 确保 axios 配置
axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:8000';
```

#### 401 循环

```typescript
// Token 刷新失败时清除状态，跳转登录
axios.interceptors.response.use(null, async error => {
  if (error.response?.status === 401) {
    if (error.config.url.includes('/auth/refresh')) {
      // 刷新失败，清除登录状态
      logout();
      return Promise.reject(error);
    }
    // 尝试刷新 Token
    await refreshToken();
    return axios(error.config);
  }
  return Promise.reject(error);
});
```

---

## 11. 数据类型约定

### UUID 字段

所有公开 ID 使用 UUID 格式字符串：

```typescript
interface Post {
  id: string;           // UUID: "550e8400-e29b-41d4-a716-446655440000"
  author_id: string;    // UUID
}
```

### 时间字段

所有时间使用 ISO 8601 格式：

```typescript
{
  created_at: "2026-01-12T10:30:00.000Z",
  published_at: "2026-01-12T08:00:00.000Z"
}
```

### 分页参数

```typescript
interface PaginationParams {
  page: number;      // 从 1 开始
  page_size: number; // 默认 20
}
```

---

## 12. 联系方式

- 后端问题: 提交 Issue 或联系后端开发
- API 文档: `/api/docs` (开发环境)
- 紧急问题: 查看 `docker-compose logs -f api`
