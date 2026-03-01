# HMRChan 前端协同开发 API 交付文档

## 1. 基础信息

| 项目     | 值                                                 |
| -------- | -------------------------------------------------- |
| Base URL | `https://api.momichan.xyz`                         |
| API 前缀 | `/api/v1/` (内容接口) / `/api/auth/` (认证接口)    |
| API 版本 | `1.0.0`                                            |
| 协议     | HTTPS (Cloudflare Tunnel)                          |
| 认证方式 | JWT Bearer Token + HttpOnly Cookie (Refresh Token) |
| 内容类型 | `application/json`                                 |

---

## 2. 统一响应信封 (V1 Envelope)

所有 `/api/v1/` 路径的响应会被自动包裹为统一信封格式。`/api/auth/` 路径不经过信封包裹。

### 2.1 成功响应

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "api_version": "1.0.0",
    "request_id": "uuid-string",
    "timestamp": "2026-02-22T12:00:00Z"
  }
}
```

### 2.2 分页响应

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 150,
    "total_pages": 8
  },
  "meta": { ... }
}
```

### 2.3 错误响应

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "具体错误信息"
  },
  "meta": { ... }
}
```

错误码映射：

| HTTP Status | code                    |
| ----------- | ----------------------- |
| 400         | `BAD_REQUEST`           |
| 401         | `UNAUTHORIZED`          |
| 403         | `FORBIDDEN`             |
| 404         | `NOT_FOUND`             |
| 409         | `CONFLICT`              |
| 422         | `VALIDATION_ERROR`      |
| 429         | `RATE_LIMITED`          |
| 500         | `Internal Server Error` |

### 2.4 特殊响应

- `204 No Content`：删除操作成功，无响应体
- `304 Not Modified`：ETag 命中，无响应体
- `/api/v1/media/*` 路径下除 `/thumbnail` 外的所有端点（含 `/stream`、`/download` 及直接访问）不经过信封包裹，直接返回二进制数据

---

## 3. 认证体系

### 3.1 Token 架构

| Token 类型         | 存储位置                          | 有效期  | 用途              |
| ------------------ | --------------------------------- | ------- | ----------------- |
| Access Token       | 前端内存 / Authorization Header   | 15 分钟 | API 请求认证      |
| Refresh Token      | HttpOnly Cookie (`refresh_token`) | 30 天   | 刷新 Access Token |
| Verification Token | 前端临时存储                      | 5 分钟  | 敏感操作二次验证  |
| Pending 2FA Token  | 前端临时存储                      | 5 分钟  | 2FA 登录中间态    |

### 3.2 认证请求头

```
Authorization: Bearer <access_token>
```

### 3.3 设备指纹绑定

JWT 内嵌设备指纹 (`dfp`)，基于以下 HTTP 头计算 SHA-256：

- `User-Agent`
- `Accept-Language`
- `Accept-Encoding`
- `DNT`
- `Sec-CH-UA`
- `Sec-CH-UA-Platform`
- `Sec-CH-UA-Mobile`

前端无需主动传递指纹，后端自动从请求头提取。但需注意：同一用户在不同浏览器/设备间 Token 不可互用。

### 3.4 Token 刷新策略

登录响应中包含 `refresh_threshold`（秒），前端应在 Access Token 剩余有效期 < `refresh_threshold` 时主动调用 `/api/auth/refresh`。

推荐实现：

1. 解析 Access Token 的 `exp` claim
2. 设置定时器，在 `exp - refresh_threshold` 时触发刷新
3. 刷新成功后更新内存中的 Access Token
4. 刷新失败（401）则跳转登录页

### 3.5 Refresh Token Rotation

每次调用 `/api/auth/refresh`，旧 Refresh Token 立即失效（加入黑名单），服务端签发新的 Refresh Token 并通过 `Set-Cookie` 更新。前端无需手动处理 Cookie。

---

## 4. 认证接口 (`/api/auth/`)

> 注意：`/api/auth/` 路径的响应不经过 V1 信封包裹，直接返回原始 JSON。

### 4.1 Turnstile 配置

`GET /api/auth/turnstile-config`

无需认证。返回 Cloudflare Turnstile 人机验证配置。

响应：

```json
{
  "enabled": true,
  "site_key": "0x4AAAAAAA..."
}
```

前端需在 `enabled=true` 时加载 Turnstile 组件，将 token 传入注册/登录请求的 `turnstile_token` 字段。

### 4.2 注册

`POST /api/auth/register`

请求体：

```json
{
  "username": "string (3-100字符, 必填)",
  "email": "string (邮箱格式, 必填)",
  "password": "string (必填, 需满足密码策略)",
  "full_name": "string (可选)",
  "verification_code": "string (邮箱验证码, 必填)",
  "turnstile_token": "string (Turnstile 开启时必填)",
  "register_token": "string (可选)"
}
```

密码策略：最少 8 位，需包含大写字母、小写字母、数字。

成功响应 (201)：

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 900,
  "refresh_threshold": 300,
  "user": {
    "id": "uuid-string",
    "username": "string",
    "email": "string",
    "full_name": "string|null",
    "avatar_url": "string|null",
    "bio": "string|null",
    "is_active": true,
    "is_admin": false,
    "is_verified": true,
    "email_verified_at": "2026-02-22T12:00:00Z",
    "totp_enabled": false,
    "created_at": "2026-02-22T12:00:00Z",
    "last_login_at": null
  }
}
```

同时通过 `Set-Cookie` 设置 Refresh Token。

错误场景：

- 409: 用户名或邮箱已注册
- 400: 密码不满足策略 / Turnstile 验证失败 / 验证码错误

### 4.3 登录

`POST /api/auth/login`

请求体：

```json
{
  "username": "string (用户名或邮箱, 必填)",
  "password": "string (必填)",
  "device_name": "string (可选, 默认 User-Agent)",
  "device_type": "string (可选, 默认 'browser')",
  "turnstile_token": "string (可选)"
}
```

成功响应 (200)：与注册响应格式相同。

特殊 Header：

- `X-Security-Warning: high|medium` — 检测到异常登录行为时返回，前端可据此提示用户

错误场景：

- 401: 用户名或密码错误
- 403: 账户被锁定 / 账户未激活

2FA 场景：如果用户启用了 TOTP，登录接口会返回 `pending_2fa_token`，前端需引导用户输入 TOTP 码后调用 `/api/v1/2fa/verify-login`。

### 4.4 获取当前用户

`GET /api/auth/me` — 需认证

响应：`UserAuthResp` 对象（同登录响应中的 `user` 字段）。

### 4.5 刷新 Token

`POST /api/auth/refresh`

无需请求体，Refresh Token 从 Cookie 自动读取。

成功响应 (200)：与登录响应格式相同，同时更新 Cookie 中的 Refresh Token。

### 4.6 登出

`POST /api/auth/logout`

请求体（可选）：

```json
{
  "all_devices": false
}
```

- `all_devices=true`：注销所有设备的会话
- `all_devices=false`：仅注销当前会话

### 4.7 心跳

`POST /api/auth/heartbeat`

用于保持会话活跃，返回新的 Access Token。

响应：

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 900,
  "refresh_threshold": 300,
  "server_time": "2026-02-22T12:00:00Z"
}
```

### 4.8 密码验证 / 身份验证

`POST /api/auth/verify-password` — 需认证

用于敏感操作前的密码确认，返回 `verification_token`（5分钟有效）。

`POST /api/auth/verify-identity` — 需认证

请求体：

```json
{
  "password": "string (必填)",
  "action": "delete_account|change_email|change_password|...",
  "resource_id": "string (可选)"
}
```

支持的 action 值：`delete_account`, `change_email`, `change_password`, `update_security_settings`, `export_data`, `revoke_sessions`, `delete_content`, `manage_api_keys`, `admin_operation`

### 4.9 会话管理

`GET /api/auth/sessions` — 需认证

返回当前用户的活跃会话列表。

`DELETE /api/auth/sessions/:id` — 需认证

撤销指定会话，返回 204。

---

## 5. 内容接口 (`/api/v1/`)

### 5.1 内容访问限制

根据用户角色，API 对可见内容数量有限制（以下为默认值，可通过环境变量 `CONTENT_LIMIT_GUEST`、`CONTENT_LIMIT_USER`、`CONTENT_LIMIT_ADMIN` 配置）：

| 角色           | 每页最大条数 | 可见总数上限 |
| -------------- | ------------ | ------------ |
| guest (未登录) | 20           | 20           |
| user (已登录)  | 60           | 60           |
| admin          | 200          | 无限制       |

超出限制时，`pagination.total` 会被截断，翻页范围也会受限。

### 5.2 通用分页参数

所有分页接口支持以下 Query 参数：

| 参数        | 类型 | 默认值 | 说明                                  |
| ----------- | ---- | ------ | ------------------------------------- |
| `page`      | int  | 1      | 页码，从 1 开始                       |
| `page_size` | int  | 20     | 每页条数，最大 100（部分接口最大 50） |

### 5.3 ID 格式

所有面向前端的资源 ID 均为 UUID v4 格式（如 `550e8400-e29b-41d4-a716-446655440000`）。内部数据库使用 int64 自增 ID，但 API 层全部转换为 UUID 暴露。

---

## 6. 帖子 (Posts)

### 6.1 帖子列表

`GET /api/v1/posts` — 可选认证

Query 参数：

| 参数         | 类型   | 默认值         | 说明                                                                                |
| ------------ | ------ | -------------- | ----------------------------------------------------------------------------------- |
| `page`       | int    | 1              | 页码                                                                                |
| `page_size`  | int    | 20             | 每页条数                                                                            |
| `platform`   | string | -              | 筛选平台：`youtube`, `tiktok`, `twitter`                                            |
| `sort_by`    | string | `published_at` | 排序字段：`published_at`, `scraped_at`, `view_count`, `like_count`, `comment_count` |
| `sort_order` | string | `desc`         | 排序方向：`asc`, `desc`                                                             |

响应 data 数组中每项：

```json
{
  "id": "uuid",
  "platform": "youtube",
  "platform_post_id": "dQw4w9WgXcQ",
  "post_url": "https://youtube.com/watch?v=...",
  "post_type": "video",
  "title": "string|null",
  "content": "string|null",
  "published_at": "2026-01-15T10:00:00Z|null",
  "view_count": 12345,
  "like_count": 678,
  "comment_count": 90,
  "file_count": 2,
  "media_count": 0,
  "thumbnail_url": "/api/v1/media/{uuid}/thumbnail?size=small|null",
  "author_name": "string|null",
  "author_id": "uuid|null"
}
```

### 6.2 帖子详情

`GET /api/v1/posts/:id` — 可选认证

响应：

```json
{
  "id": "uuid",
  "platform": "youtube",
  "platform_post_id": "string",
  "post_url": "string",
  "post_type": "video|image|text|short|live_replay",
  "media_type": "video|image|null",
  "title": "string|null",
  "content": "string|null",
  "language": "string|null",
  "published_at": "ISO8601|null",
  "view_count": 0,
  "like_count": 0,
  "comment_count": 0,
  "share_count": 0,
  "file_count": 2,
  "duration_sec": 120.5,
  "author": {
    "id": "uuid",
    "username": "string",
    "display_name": "string|null",
    "platform": "youtube",
    "avatar_url": "string|null",
    "is_verified": false
  },
  "original_author": { "...同 author 结构，转推/引用时存在" },
  "files": [
    {
      "id": "uuid",
      "file_type": "video|image|thumbnail|subtitle",
      "file_name": "string",
      "file_size_bytes": 1234567,
      "mime_type": "video/mp4",
      "width": 1920,
      "height": 1080,
      "duration_sec": 120.5
    }
  ],
  "author_other_posts": [
    {
      "id": "uuid",
      "platform": "youtube",
      "post_type": "video",
      "title": "string|null",
      "post_url": "string",
      "published_at": "ISO8601|null",
      "view_count": 0,
      "like_count": 0
    }
  ]
}
```

### 6.3 轻量 Feed

`GET /api/v1/posts/light` — 可选认证

返回精简的帖子列表，适合首页瀑布流。参数同帖子列表。

### 6.4 混合 Feed

`GET /api/v1/posts/mixed` — 可选认证

返回跨平台混合排序的帖子流。参数同帖子列表。

---

## 7. 作者 (Authors)

### 7.1 作者列表

`GET /api/v1/authors` — 可选认证

Query 参数：`page`, `page_size`, `platform`, `q`（搜索用户名/显示名）

响应 data 数组中每项：

```json
{
  "id": "uuid",
  "platform": "youtube",
  "username": "string",
  "display_name": "string|null",
  "avatar_url": "string|null",
  "profile_url": "string|null",
  "follower_count": 12345,
  "post_count": 67,
  "is_verified": false
}
```

### 7.2 作者详情

`GET /api/v1/authors/:id` — 可选认证

响应：

```json
{
  "id": "uuid",
  "platform": "youtube",
  "platform_user_id": "string|null",
  "username": "string",
  "display_name": "string|null",
  "avatar_url": "string|null",
  "profile_url": "string|null",
  "profile_banner_url": "string|null",
  "bio": "string|null",
  "follower_count": 12345,
  "following_count": 100,
  "is_verified": false,
  "created_at": "ISO8601",
  "post_count": 67,
  "recent_posts": ["...同帖子列表简化结构"]
}
```

### 7.3 作者帖子

`GET /api/v1/authors/:id/posts` — 可选认证

参数：`page`, `page_size`。响应格式同帖子列表。

---

## 8. 媒体文件 (Media)

### 8.1 媒体详情

`GET /api/v1/media/:id` — 可选认证

响应：

```json
{
  "id": "uuid",
  "file_type": "video|image|thumbnail|subtitle",
  "file_name": "string",
  "file_path": "string",
  "file_size_bytes": 1234567,
  "mime_type": "video/mp4",
  "width": 1920,
  "height": 1080,
  "duration_sec": 120.5,
  "created_at": "ISO8601"
}
```

### 8.2 媒体流式播放

`GET /api/v1/media/:id/stream`

返回二进制流，支持 HTTP Range 请求（断点续传）。不经过 V1 信封。

响应头：

- `Accept-Ranges: bytes`
- `Content-Type: video/mp4` (根据实际类型)
- `Cache-Control: public, max-age=2592000, immutable`

### 8.3 缩略图

`GET /api/v1/media/:id/thumbnail?size=small|medium|large|original`

返回 WebP 格式缩略图。不经过 V1 信封。

回退策略：缓存缩略图 → DB 中的 thumbnail_url → 原始图片 → SVG 占位符（视频类型）

### 8.4 下载

`GET /api/v1/media/:id/download`

返回文件下载，`Content-Disposition: attachment`。不经过 V1 信封。

---

## 9. 搜索 (Search)

### 9.1 搜索帖子

`GET /api/v1/search/posts` — 可选认证，有反枚举限流

Query 参数：`q`（必填）, `page`, `page_size`, `platform`

响应格式同帖子列表。

### 9.2 搜索作者

`GET /api/v1/search/authors` — 可选认证，有反枚举限流

Query 参数：`q`（必填）, `page`, `page_size`, `platform`

响应 data 数组中每项：

```json
{
  "id": "uuid",
  "username": "string",
  "display_name": "string|null",
  "platform": "youtube",
  "avatar_url": "string|null",
  "bio": "string|null",
  "follower_count": 12345,
  "is_verified": false
}
```

### 9.3 搜索建议

`GET /api/v1/search/suggestions` — 可选认证，有反枚举限流

Query 参数：`q`（必填，最少 2 字符）

响应（不经过分页）：

```json
{
  "query": "搜索词",
  "results": [
    {
      "type": "post",
      "id": "uuid",
      "label": "帖子标题",
      "platform": "youtube"
    },
    {
      "type": "author",
      "id": "uuid",
      "label": "显示名",
      "subtitle": "用户名",
      "avatar_url": "string|null",
      "platform": "youtube"
    }
  ]
}
```

---

## 10. 评论 (Comments)

评论挂载在帖子下，支持两级嵌套（顶级评论 + 回复）。

### 10.1 获取帖子评论

`GET /api/v1/posts/:id/comments` — 可选认证

Query 参数：`page`, `page_size`, `sort`（`newest`, `oldest`, `popular`）, `preload_replies`（预加载回复数，默认 0）

响应 data 数组中每项：

```json
{
  "id": "uuid",
  "content": "评论内容",
  "parent_id": null,
  "like_count": 5,
  "reply_count": 3,
  "is_liked": false,
  "is_favorited": false,
  "created_at": "ISO8601",
  "updated_at": "ISO8601|null",
  "user": {
    "id": "uuid",
    "username": "string",
    "avatar_url": "string|null",
    "is_admin": false,
    "is_verified": false
  },
  "replies": ["...预加载时存在，结构同评论"]
}
```

### 10.2 发表评论

`POST /api/v1/posts/:id/comments` — 需认证

请求体：

```json
{
  "content": "string (1-2000字符, 必填)",
  "parent_id": "int64|null (回复时传父评论 ID)",
  "image_ids": ["uuid", "..."]
}
```

回复嵌套规则：如果 parent 本身是回复（有 parent_id），则自动归到顶级评论下（扁平化二级）。

### 10.3 编辑评论

`PATCH /api/v1/comments/:id` — 需认证（仅作者可编辑）

请求体：`{ "content": "string" }`

### 10.4 删除评论

`DELETE /api/v1/comments/:id` — 需认证（作者或管理员）

返回 204。

### 10.5 评论点赞/取消

`POST /api/v1/comments/:id/like` — 需认证
`DELETE /api/v1/comments/:id/like` — 需认证

### 10.6 评论收藏/取消

`POST /api/v1/comments/:id/favorite` — 需认证
`DELETE /api/v1/comments/:id/favorite` — 需认证

### 10.7 举报评论

`POST /api/v1/comments/:id/report` — 需认证

请求体：`{ "reason": "string (必填)", "description": "string (可选)" }`

### 10.8 获取回复

`GET /api/v1/comments/:id/replies` — 可选认证

参数：`page`, `page_size`

### 10.9 评论线程

`GET /api/v1/comments/:id/thread` — 可选认证

返回指定评论及其完整上下文（父评论 + 同级回复）。

---

## 11. 讨论区 (Discussions)

独立的社区讨论功能，可关联帖子。

### 11.1 讨论列表

`GET /api/v1/discussions` — 可选认证

Query 参数：`page`, `page_size`, `category`, `sort`/`sort_by`（`latest`, `popular`, `active`, `comments_count`）

响应 data 数组中每项：

```json
{
  "id": "uuid",
  "title": "string",
  "content": "string",
  "category": "general|question|sharing|...",
  "tags": ["tag1", "tag2"],
  "view_count": 100,
  "like_count": 10,
  "comment_count": 5,
  "is_pinned": false,
  "is_closed": false,
  "is_liked": false,
  "created_at": "ISO8601",
  "updated_at": "ISO8601|null",
  "last_activity_at": "ISO8601",
  "user": {
    "id": "uuid",
    "username": "string",
    "avatar_url": "string|null",
    "is_admin": false,
    "is_verified": false
  }
}
```

### 11.2 创建讨论

`POST /api/v1/discussions` — 需认证

请求体：

```json
{
  "title": "string (2-200字符, 必填)",
  "content": "string (10-10000字符, 必填)",
  "category": "string (可选, 默认 'general')",
  "tags": ["string", "...最多5个, 每个最长20字符"],
  "referenced_post_id": "uuid (可选, 关联帖子)"
}
```

### 11.3 讨论详情

`GET /api/v1/discussions/:id` — 可选认证

每次访问自动 +1 view_count。响应结构同列表项，但包含完整 content。

### 11.4 编辑讨论

`PATCH /api/v1/discussions/:id` — 需认证（作者或管理员）

请求体（所有字段可选）：

```json
{
  "title": "string",
  "content": "string",
  "category": "string",
  "tags": ["string"],
  "is_closed": true,
  "referenced_post_id": "uuid"
}
```

### 11.5 删除讨论

`DELETE /api/v1/discussions/:id` — 需认证（作者或管理员），返回 204

### 11.6 讨论点赞/取消

`POST /api/v1/discussions/:id/like` — 需认证
`DELETE /api/v1/discussions/:id/like` — 需认证

响应：`{ "message": "Liked|Unliked", "like_count": 11 }`

### 11.7 讨论评论

`GET /api/v1/discussions/:id/comments` — 可选认证

参数：`page`, `page_size`, `sort`/`sort_by`（`newest`, `oldest`, `popular`）, `preload_replies`

`POST /api/v1/discussions/:id/comments` — 需认证

请求体：`{ "content": "string (1-2000字符)", "parent_id": "int64|null" }`

讨论关闭后不可评论（403）。

### 11.8 讨论评论操作

`PATCH /api/v1/discussions/comments/:id` — 需认证（仅作者）
`DELETE /api/v1/discussions/comments/:id` — 需认证（作者或管理员）
`POST /api/v1/discussions/comments/:id/like` — 需认证
`DELETE /api/v1/discussions/comments/:id/like` — 需认证
`POST /api/v1/discussions/comments/:id/report` — 需认证
`GET /api/v1/discussions/comments/:id/replies` — 可选认证
`GET /api/v1/discussions/comments/:id` — 可选认证（评论详情）
`GET /api/v1/discussions/comments/:id/thread` — 可选认证

### 11.9 搜索讨论

`GET /api/v1/discussions/search` — 可选认证

参数：`q`（必填）, `page`, `page_size`, `category`

### 11.10 我的讨论/评论

`GET /api/v1/discussions/my` — 需认证
`GET /api/v1/discussions/my-comments` — 需认证

---

## 12. 收藏 (Favorites)

### 12.1 收藏帖子

`POST /api/v1/favorites` — 需认证

请求体：

```json
{
  "post_id": "uuid (必填)",
  "folder_name": "string (可选, 收藏夹名)",
  "notes": "string (可选, 备注)"
}
```

### 12.2 收藏列表

`GET /api/v1/favorites` — 需认证

参数：`page`, `page_size`, `folder`（按收藏夹筛选）

### 12.3 收藏详情/编辑/删除

`GET /api/v1/favorites/:id` — 需认证
`PATCH /api/v1/favorites/:id` — 需认证，请求体：`{ "folder_name": "string", "notes": "string" }`
`DELETE /api/v1/favorites/:id` — 需认证，返回 204

### 12.4 检查收藏状态

`GET /api/v1/favorites/check/:post_id` — 可选认证

响应：`{ "is_favorited": true|false }`

未登录时始终返回 `false`。

### 12.5 收藏夹列表

`GET /api/v1/favorites/folders/list` — 需认证

响应：`{ "folders": [{ "folder_name": "string", "count": 5 }] }`

### 12.6 收藏标签列表

`GET /api/v1/favorites/tags/list` — 需认证

响应：`[{ "tag": "string", "count": 3 }]`

---

## 13. 通知 (Notifications)

### 13.1 通知列表

`GET /api/v1/notifications` — 需认证

参数：`page`, `page_size`, `type`（筛选通知类型）, `unread_only`（`true`/`false`）

响应（注意：此接口返回自定义分页结构，包含 `unread_count`）：

```json
{
  "items": [
    {
      "id": "uuid",
      "type": "comment_reply|like|follow|system|...",
      "title": "string",
      "content": "string|null",
      "related_type": "post|comment|discussion|null",
      "related_id": "int64|null",
      "is_read": false,
      "created_at": "ISO8601",
      "read_at": "ISO8601|null"
    }
  ],
  "total": 50,
  "unread_count": 12,
  "page": 1,
  "page_size": 20,
  "has_more": true
}
```

### 13.2 未读数

`GET /api/v1/notifications/unread-count` — 需认证

响应：`{ "unread_count": 12 }`

### 13.3 标记已读

`PATCH /api/v1/notifications/:id/read` — 需认证

### 13.4 全部标记已读

`POST /api/v1/notifications/read-all` — 需认证

参数：`type`（可选，仅标记指定类型）

### 13.5 删除/清空通知

`DELETE /api/v1/notifications/:id` — 需认证
`DELETE /api/v1/notifications?read_only=true` — 需认证（默认仅清除已读）

---

## 14. 用户资料 (User Profile)

### 14.1 获取个人资料

`GET /api/v1/users/me/profile` — 需认证

响应：

```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "full_name": "string|null",
  "avatar_url": "string|null",
  "bio": "string|null",
  "is_verified": true,
  "created_at": "ISO8601",
  "username_changed_at": "ISO8601|null",
  "can_change_username": true,
  "username_change_available_at": "ISO8601|null",
  "gender": "string|null",
  "birth_date": "YYYY-MM-DD|null",
  "location": "string|null",
  "website": "string|null",
  "social_links": {}
}
```

用户名修改冷却期：30 天。`can_change_username=false` 时前端应禁用用户名编辑。

### 14.2 更新个人资料

`PATCH /api/v1/users/me/profile` — 需认证

请求体（所有字段可选）：

```json
{
  "username": "string",
  "full_name": "string",
  "bio": "string",
  "avatar_url": "string",
  "gender": "string",
  "birth_date": "YYYY-MM-DD",
  "location": "string",
  "website": "string"
}
```

### 14.3 修改密码

`POST /api/v1/users/me/change-password` — 需认证，敏感操作限流

请求体：

```json
{
  "current_password": "string (必填)",
  "new_password": "string (必填, 需满足密码策略)"
}
```

修改成功后所有其他会话自动注销。

---

## 15. 用户偏好 (Preferences)

`GET /api/v1/preferences` — 需认证
`PUT /api/v1/preferences` — 需认证
`PATCH /api/v1/preferences` — 需认证
`DELETE /api/v1/preferences` — 需认证（重置为默认值）

偏好字段：

```json
{
  "show_hero_section": true,
  "enable_animations": true,
  "posts_per_page": 20,
  "auto_play_videos": false,
  "show_image_previews": true,
  "cookie_consent": null,
  "analytics_enabled": false,
  "functional_cookies_enabled": true,
  "performance_cookies_enabled": false,
  "data_collection": false,
  "personalized_content": false
}
```

---

## 16. 社交关系 (Relations)

### 16.1 关注/取关

`POST /api/v1/relations/follow/:id` — 需认证
`DELETE /api/v1/relations/follow/:id` — 需认证

`:id` 为目标用户 UUID。

### 16.2 拉黑/取消拉黑

`POST /api/v1/relations/block/:id` — 需认证
`DELETE /api/v1/relations/block/:id` — 需认证

### 16.3 关系列表

`GET /api/v1/relations/followers` — 需认证（我的粉丝）
`GET /api/v1/relations/following` — 需认证（我的关注）
`GET /api/v1/relations/blocked` — 需认证（我的黑名单）

### 16.4 关系状态

`GET /api/v1/relations/status/:id` — 需认证

响应：`{ "is_following": true, "is_followed_by": false, "is_blocked": false }`

### 16.5 用户公开资料

`GET /api/v1/users/:id/public-profile` — 需认证

---

## 17. 社区 (Community)

`GET /api/v1/community/stats` — 可选认证（社区统计）
`GET /api/v1/community/latest` — 可选认证（最新动态）
`GET /api/v1/community/hot` — 可选认证（热门内容）
`GET /api/v1/community/feed` — 可选认证（同 latest）
`GET /api/v1/community/my-comments` — 需认证
`GET /api/v1/community/my-likes` — 需认证
`GET /api/v1/community/favorites` — 需认证

---

## 18. 历史记录 (History)

### 18.1 搜索历史

`POST /api/v1/history/search` — 需认证（记录搜索）
`GET /api/v1/history/search` — 需认证
`DELETE /api/v1/history/search/:id` — 需认证
`DELETE /api/v1/history/search` — 需认证（清空）

### 18.2 浏览历史

`POST /api/v1/history/browsing` — 需认证（记录浏览）
`GET /api/v1/history/browsing` — 需认证
`DELETE /api/v1/history/browsing/:id` — 需认证
`DELETE /api/v1/history/browsing` — 需认证（清空）

### 18.3 其他

`DELETE /api/v1/history/all` — 需认证（清空所有历史）
`GET /api/v1/history/stats` — 需认证（历史统计）
`GET /api/v1/history/my-comments` — 需认证
`GET /api/v1/history/my-likes` — 需认证
`GET /api/v1/history/my-comment-favorites` — 需认证

---

## 19. 日程 (Schedules)

### 19.1 公开接口

`GET /api/v1/schedules` — 可选认证（日程列表）
`GET /api/v1/schedules/:id` — 可选认证（日程详情）
`GET /api/v1/schedules/calendar` — 可选认证（日历视图）

日程响应：

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string|null",
  "category": "live|event|release|...",
  "start_date": "ISO8601",
  "end_date": "ISO8601|null",
  "is_all_day": true,
  "venue": "string|null",
  "venue_address": "string|null",
  "event_url": "string|null",
  "ticket_url": "string|null",
  "source_url": "string|null",
  "source_platform": "string|null",
  "color": "#FF5733|null",
  "is_published": true,
  "created_at": "ISO8601",
  "author": { "...作者简要信息" }
}
```

### 19.2 管理接口

`POST /api/v1/schedules` — 需管理员
`DELETE /api/v1/schedules/:id` — 需管理员

---

## 20. 设备管理 (Devices)

`GET /api/v1/devices` — 需认证（设备列表）
`GET /api/v1/devices/current` — 需认证（当前设备）
`POST /api/v1/devices/trust` — 需认证（信任设备）
`POST /api/v1/devices/untrust` — 需认证
`POST /api/v1/devices/rename` — 需认证
`DELETE /api/v1/devices/:id` — 需认证（撤销设备）
`DELETE /api/v1/devices` — 需认证（撤销所有设备）

---

## 21. 两步验证 (2FA / TOTP)

### 21.1 公开接口

`POST /api/v1/2fa/verify-login` — 无需认证

用于 2FA 登录流程的第二步。请求体包含 `pending_token` 和 `totp_code`。

### 21.2 认证接口（均有敏感操作限流）

`GET /api/v1/2fa/status` — 需认证（2FA 状态）
`POST /api/v1/2fa/setup` — 需认证（生成 TOTP 密钥和二维码）
`POST /api/v1/2fa/verify` — 需认证（验证并启用 2FA）
`POST /api/v1/2fa/disable` — 需认证（禁用 2FA）
`POST /api/v1/2fa/regenerate-backup-codes` — 需认证（重新生成备用码）

---

## 22. 邮箱服务 (Email)

### 22.1 公开接口

`POST /api/v1/email/send-registration-code` — 敏感限流（发送注册验证码）
`POST /api/v1/email/verify-email` — 验证邮箱
`POST /api/v1/email/request-password-reset` — 敏感限流（请求密码重置）
`POST /api/v1/email/reset-password` — 敏感限流（重置密码）

### 22.2 认证接口

`POST /api/v1/email/send-verification-email` — 需认证
`POST /api/v1/email/send-change-password-code` — 需认证
`POST /api/v1/email/change-password` — 需认证
`POST /api/v1/email/send-change-email-code` — 需认证
`POST /api/v1/email/change-email` — 需认证

---

## 23. 举报 (Reports)

`POST /api/v1/reports` — 需认证

请求体：

```json
{
  "target_type": "post|comment|discussion|discussion_comment|user",
  "target_id": "int64",
  "reason": "string (必填)",
  "description": "string (可选)"
}
```

`GET /api/v1/reports/my` — 需认证（我的举报记录）

---

## 24. 账户管理 (Account)

`GET /api/v1/account/data-summary` — 需认证（数据摘要）
`POST /api/v1/account/export-data` — 需认证（导出个人数据）
`GET /api/v1/account/deletion-status` — 需认证（删除状态查询）
`POST /api/v1/account/delete` — 需认证（申请删除账户）
`POST /api/v1/account/restore` — 需认证（恢复已删除账户）

---

## 25. 上传 (Upload)

### 25.1 头像上传

`POST /api/v1/upload/avatar` — 需认证

请求格式：`multipart/form-data`，字段名 `file`

限制：

- 最大文件大小：5MB
- 允许类型：JPG、PNG、WebP（同时校验 Content-Type 头和文件 magic number）
- 服务端自动缩放至最大 512×512 像素（保持比例），输出格式固定为 JPEG（quality=85）
- 上传新头像时自动删除旧头像文件

成功响应 (200)：

```json
{
  "filename": "avatar_123_20260222120000_a1b2c3d4.jpg",
  "url": "https://api.momichan.xyz/uploads/avatars/avatar_123_20260222120000_a1b2c3d4.jpg",
  "size": 45678,
  "content_type": "image/jpeg",
  "hash": "sha256hex...",
  "uploaded_at": "2026-02-22T12:00:00Z"
}
```

管理员可通过 `POST /api/v1/upload/users/:user_id/avatar` 为指定用户上传头像，参数相同。

### 25.2 评论图片上传

`POST /api/v1/comment-images` — 需认证

请求格式：`multipart/form-data`，字段名 `files`（支持多文件）

限制：

- 单次最多 9 张图片
- 单张最大 10MB，总计最大 50MB
- 最大分辨率 4K（3840×2160 像素）
- 允许类型：JPG、PNG、WebP、GIF

成功响应 (200)：

```json
{
  "images": [
    {
      "id": "uuid",
      "url": "/uploads/comment_images/2026/02/22/uuid.jpg",
      "filename": "原始文件名.jpg",
      "file_size": 123456,
      "mime_type": "image/jpeg",
      "width": 1920,
      "height": 1080,
      "sort_order": 0,
      "created_at": "2026-02-22T12:00:00Z"
    }
  ],
  "message": "Successfully uploaded 3 images"
}
```

上传后图片处于未关联状态（`is_used=false`），发表评论时通过 `image_ids` 字段关联。已关联到评论的图片不可单独删除。

### 25.3 评论图片查询/删除

`GET /api/v1/comment-images/:id` — 需认证
`DELETE /api/v1/comment-images/:id` — 需认证（作者或管理员，仅未关联图片可删除）

---

## 26. 反馈与联系

### 26.1 提交反馈

`POST /api/v1/feedback` — 可选认证

支持 `application/json` 和 `multipart/form-data` 两种格式。

JSON 请求体：

```json
{
  "message": "string (必填, 最长 2000 字符, 也可用 'content' 字段)",
  "contact": "string (可选, 联系方式)",
  "category": "string (可选, 默认 'general', 也可用 'type' 字段)",
  "fingerprint": "string (可选, 客户端指纹)"
}
```

> `message` 和 `content` 互为别名（优先取 `message`），`category` 和 `type` 互为别名（优先取 `category`）。

成功响应 (201)：

```json
{
  "id": "uuid",
  "message": "反馈内容",
  "category": "general",
  "created_at": "2026-02-22T12:00:00Z"
}
```

### 26.2 发送联系消息

`POST /api/v1/contact/send` — 公开

---

## 27. 成员 (Members)

成员数据为服务端硬编码（非数据库驱动），不支持增删改。

`GET /api/v1/members` — 公开（成员列表）
`GET /api/v1/members/:id` — 公开（成员详情，`:id` 为 slug 格式如 `kizuki_nao`）

响应结构：

```json
{
  "id": "kizuki_nao",
  "name_ja": "城月 菜央",
  "name_en": "KIZUKI NAO",
  "blood_type": "B|null",
  "zodiac": "やぎ座",
  "height_cm": 153,
  "birthday": "2003-12-25",
  "birthplace": "埼玉県",
  "hobbies": "ホラー系作品鑑賞・ヘアアレンジ",
  "skills": "色々な怪獣の顔マネ・変な動き",
  "message": "自己介绍文本...",
  "photo_url": "https://...",
  "profile_url": "https://..."
}
```

---

## 28. 审计日志 (Audit)

`GET /api/v1/audit/my-activity` — 需认证（我的活动日志）
`GET /api/v1/audit/my-security-summary` — 需认证（我的安全摘要）

---

## 29. 客户端安全 (Client Security)

多阶段反爬/人机验证体系，前端需按顺序集成。

### 29.1 Phase 1: 客户端初始化

`POST /api/v1/client/init` — 公开

首次访问时调用，建立客户端会话。

请求体：

```json
{
  "client_fingerprint": "string (必填, 前端生成的浏览器指纹)",
  "timezone": "string (可选, 如 'Asia/Tokyo')",
  "screen_resolution": "string (可选, 如 '1920x1080')",
  "platform": "string (可选, 如 'Win32')",
  "timestamp": 1708617600,
  "nonce": "string (可选, Phase 4 签名用)"
}
```

响应：

```json
{
  "client_token": "hex-string (首次初始化时返回, 后续为空)",
  "client_secret": "hex-string (仅首次初始化返回, 前端需安全存储)",
  "challenge_required": true,
  "trust_level": "untrusted|basic|verified",
  "turnstile_site_key": "0x4AAAAAAA... (challenge_required=true 时返回)",
  "expires_in": 3600
}
```

前端需持久化 `client_token` 和 `client_secret`，用于后续 Phase 4 请求签名。

### 29.2 Phase 2: 自适应 Turnstile 验证 (TurnstileGuard)

当 `challenge_required=true` 时，前端需展示 Turnstile Widget 并调用验证接口。

`POST /api/v1/client/verify` — 公开

请求体包含 Turnstile token，验证通过后信任等级升级为 `basic`。

信任等级说明：

| 等级        | 含义              | 获取方式       |
| ----------- | ----------------- | -------------- |
| `untrusted` | 未验证访客        | 初始状态       |
| `basic`     | 已通过 Turnstile  | 完成人机验证   |
| `verified`  | 已登录 + 可信设备 | 登录后自动升级 |

当需要验证但未通过时，API 返回 403：

```json
{
  "success": false,
  "error": {
    "code": "CHALLENGE_REQUIRED",
    "message": "Human verification required",
    "challenge_required": true,
    "turnstile_site_key": "0x4AAAAAAA..."
  }
}
```

前端收到 `CHALLENGE_REQUIRED` 错误码时，应弹出 Turnstile 验证组件，验证通过后重试原请求。

### 29.3 Phase 3: 行为分析 (BehavioralAnalysis)

后端自动运行，前端无需主动集成。系统对每个请求计算异常分数（0-100）：

| 检测项            | 分值   | 触发条件                                           |
| ----------------- | ------ | -------------------------------------------------- |
| 请求时序规律性    | +15~30 | 请求间隔变异系数 < 0.1，均值 < 2s（机器人特征）    |
| 高频请求          | +25    | 20 次请求窗口内 RPS > 5                            |
| 缺失标准头        | +20    | Accept/Accept-Language/Accept-Encoding 缺失 ≥ 2 个 |
| 缺失 Sec-Fetch 头 | +15    | 声称现代浏览器但无 Sec-Fetch-Site/Mode             |
| 无 Referer        | +5     | API 调用无 Referer 头                              |

处理策略：

- 分数 ≥ 30：记录安全事件
- 分数 ≥ 80：直接拦截请求（返回 403）

蜜罐检测：访问预设蜜罐端点时，返回正常 404 但记录为严重安全事件。

### 29.4 Phase 4: 请求完整性签名 (RequestIntegrity)

可选集成。前端使用 `client_secret` 对请求进行 HMAC-SHA256 签名，防止请求篡改和重放。

签名请求头：

| Header           | 说明                      |
| ---------------- | ------------------------- |
| `X-Signature`    | HMAC-SHA256 签名值（hex） |
| `X-Timestamp`    | 请求时间戳（Unix 秒）     |
| `X-Client-Token` | 客户端 Token              |

签名算法：

```
payload = "{METHOD}|{PATH_WITH_QUERY}|{TIMESTAMP}"
signature = HMAC-SHA256(client_secret, payload)
```

示例：

```
payload = "GET|/api/v1/posts?page=1|1708617600"
signature = hmac_sha256(client_secret, payload)
```

时间窗口：±30 秒，超时返回 403 `Invalid request signature`。

> 当前为优雅降级模式：未携带签名头的请求不会被拒绝，但携带了无效签名的请求会被拒绝。

### 29.5 客户端状态查询

`GET /api/v1/client/status` — 公开

查询当前客户端的信任等级和会话状态。

---

## 30. 管理员接口 (Admin)

所有管理员接口需要 `AuthRequired + AdminRequired` 中间件，即 Access Token 中 `is_admin=true`。

### 30.1 系统监控

`GET /api/v1/admin/health/detailed` — 详细健康检查
`GET /api/v1/admin/db/health` — 数据库健康
`GET /api/v1/admin/stats/system` — 系统统计
`GET /api/v1/admin/cache/stats` — Redis 缓存统计
`POST /api/v1/admin/cache/clear` — 清除缓存
`GET /api/v1/admin/metrics` — 应用指标

### 30.2 用户管理

`GET /api/v1/users` — 用户列表

参数：`page`, `page_size`, `q`（搜索）, `is_active`, `is_admin`, `is_verified`, `role_id`, `sort_by`, `sort_order`

`GET /api/v1/users/:id` — 用户详情（含角色信息）
`DELETE /api/v1/users/:id` — 删除用户（不可删除自己/最后一个管理员）
`GET /api/v1/users/:id/stats` — 用户统计
`POST /api/v1/users/:id/roles` — 分配角色，请求体：`{ "role_ids": [1, 2] }`
`GET /api/v1/users/:id/roles` — 获取用户角色
`POST /api/v1/upload/users/:user_id/avatar` — 管理员上传用户头像

### 30.3 角色管理

`POST /api/v1/roles` — 创建角色
`GET /api/v1/roles` — 角色列表
`GET /api/v1/roles/permissions/list` — 可用权限列表
`GET /api/v1/roles/:id` — 角色详情
`PATCH /api/v1/roles/:id` — 更新角色
`DELETE /api/v1/roles/:id` — 删除角色
`PUT /api/v1/roles/:id/permissions` — 更新角色权限
`GET /api/v1/roles/:id/users` — 角色下的用户

### 30.4 爬虫管理

`GET /api/v1/crawler/status` — 爬虫总状态
`GET /api/v1/crawler/platforms/status` — 各平台爬虫状态
`GET /api/v1/crawler/config` — 爬虫配置
`PUT /api/v1/crawler/config` — 更新爬虫配置

### 30.5 处理器管理

`POST /api/v1/processor/scan` — 触发文件扫描
`POST /api/v1/processor/scan/failed` — 重新处理失败项
`GET /api/v1/processor/stats` — 处理统计
`GET /api/v1/processor/tasks/:task_id` — 任务状态
`GET /api/v1/processor/watcher/status` — 文件监视器状态

### 30.6 举报管理

`GET /api/v1/reports` — 举报列表
`GET /api/v1/reports/stats/summary` — 举报统计
`GET /api/v1/reports/:id` — 举报详情
`PATCH /api/v1/reports/:id` — 审核举报

### 30.7 讨论管理

`POST /api/v1/discussions/:id/pin` — 置顶讨论
`DELETE /api/v1/discussions/:id/pin` — 取消置顶
`POST /api/v1/discussions/comments/:id/pin` — 置顶评论
`DELETE /api/v1/discussions/comments/:id/pin` — 取消置顶
`POST /api/v1/discussions/comments/:id/feature` — 精选评论
`DELETE /api/v1/discussions/comments/:id/feature` — 取消精选

### 30.8 审计管理

`GET /api/v1/audit/admin/security-events` — 安全事件
`GET /api/v1/audit/admin/failed-logins` — 失败登录记录
`GET /api/v1/audit/admin/user/:user_id` — 用户审计日志

### 30.9 反馈管理

`GET /api/v1/admin/feedbacks` — 反馈列表

### 30.10 账户清理

`POST /api/v1/account/admin/cleanup-expired` — 清理过期已删除用户

---

## 31. 限流策略

### 31.1 Nginx 层（粗粒度，防 DDoS）

| 区域           | 速率                 | 适用路径                                                         |
| -------------- | -------------------- | ---------------------------------------------------------------- |
| `api_limit`    | 200 req/s，burst 50  | `/api/v1/` 通用                                                  |
| `auth_limit`   | 10 req/min，burst 10 | `/api/auth/`、`/api/v1/client/`                                  |
| `login_limit`  | 10 req/min，burst 3  | `/api/v1/auth/login`、`/api/auth/login`、`/api/v1/auth/register` |
| `upload_limit` | 50 req/s，burst 50   | `/uploads/` 静态资源                                             |

### 31.2 应用层（细粒度，per-user）

| 类型     | 默认值     | 说明                                      |
| -------- | ---------- | ----------------------------------------- |
| 通用 API | 60 req/min | 可通过 `RATE_LIMIT_PER_MINUTE` 配置       |
| 登录     | 5 req/min  | 可通过 `RATE_LIMIT_LOGIN_PER_MINUTE` 配置 |
| 搜索     | 反枚举限流 | 防止批量爬取搜索结果                      |
| 敏感操作 | 更严格限流 | 密码修改、2FA、邮箱变更等                 |

限流触发时返回 HTTP 429，错误码 `RATE_LIMITED`。

### 31.3 账户锁定

- 连续登录失败 5 次后锁定账户 30 分钟
- 锁定期间返回 HTTP 403

### 31.4 API 保护与 IP 封禁

- Bot 检测：空 User-Agent 或匹配已知爬虫/自动化工具特征的请求会被拦截（403）
- 来源验证：敏感路径（`/api/v1/users`、`/api/v1/admin`、`/api/v1/roles`、`/api/v1/crawler`）要求 Origin 或 Referer 匹配允许的域名
- 渐进式封禁：违规次数达到阈值（默认 3 次）后，IP 被临时封禁（默认 30 分钟）

---

## 32. CORS 配置

- 允许的 Origins：通过 `CORS_ORIGINS` 环境变量配置（逗号分隔）
- 允许 Credentials：`true`（Cookie 传递必需）
- 允许的 Methods：`GET, POST, PUT, PATCH, DELETE, OPTIONS`
- 允许的 Headers：`Authorization, Content-Type, Accept, Origin, X-Requested-With`
- Max-Age：86400 秒

前端开发环境需确保 `http://localhost:3000`（或实际端口）在 `CORS_ORIGINS` 中。

---

## 33. 缓存策略

### 33.1 Nginx 缓存

- 仅缓存公开 GET 请求（无 `Authorization` 头、无 `refresh_token` Cookie）
- 200 响应缓存 5 分钟，404 缓存 1 分钟
- 响应头 `X-Cache-Status` 指示缓存命中状态：`HIT`, `MISS`, `BYPASS`

### 33.2 ETag

所有 `/api/v1/` JSON 响应自动生成 ETag。前端可通过 `If-None-Match` 头实现条件请求，命中时返回 304。

### 33.3 静态资源

- `/uploads/` 路径：`Cache-Control: public, max-age=31536000, immutable`
- 缩略图：`Cache-Control: public, max-age=31536000, immutable`（缓存命中时）
- 流式媒体：`Cache-Control: public, max-age=2592000, immutable`

---

## 34. 安全相关 Header

所有 API 响应包含以下安全头：

| Header                    | 值                        |
| ------------------------- | ------------------------- |
| `X-Frame-Options`         | `DENY`                    |
| `X-Content-Type-Options`  | `nosniff`                 |
| `X-XSS-Protection`        | `1; mode=block`           |
| `X-API-Version`           | `v1`                      |
| `Content-Security-Policy` | 严格模式（见 Nginx 配置） |

---

## 35. 全局中间件管线

请求经过以下中间件（按执行顺序）：

| 顺序 | 中间件             | 说明                                                                         |
| ---- | ------------------ | ---------------------------------------------------------------------------- |
| 1    | Prometheus         | 请求指标采集                                                                 |
| 2    | HTTPSRedirect      | 修复 `X-Forwarded-Proto` 下的重定向 URL 为 HTTPS                             |
| 3    | Logger             | 结构化请求日志                                                               |
| 4    | Recovery           | panic 恢复                                                                   |
| 5    | RequestID          | 生成 `request_id`（UUID），写入 `X-Request-ID` 响应头                        |
| 6    | RequestTimeout     | 请求超时：普通请求 30s，流式/上传/下载请求 120s                              |
| 7    | SecurityHeaders    | 安全响应头（见 Section 34）                                                  |
| 8    | CORS               | 跨域配置                                                                     |
| 9    | APIProtection      | Bot 检测、来源验证、渐进式 IP 封禁                                           |
| 10   | BehavioralAnalysis | Phase 3 行为异常检测                                                         |
| 11   | RequestIntegrity   | Phase 4 HMAC 请求签名验证                                                    |
| 12   | RateLimit          | 应用层限流                                                                   |
| 13   | TurnstileGuard     | Phase 2 自适应 Turnstile 验证                                                |
| 14   | InputSanitizer     | 输入消毒（仅 POST/PUT/PATCH JSON 请求），检测并拒绝含 XSS/SQL 注入等危险内容 |
| 15   | AuditLog           | 审计日志记录                                                                 |
| 16   | ETag               | 自动生成 ETag，支持 304 条件请求                                             |
| 17   | V1Envelope         | `/api/v1/` 响应信封包裹                                                      |

---

## 36. 公共端点

### 36.1 健康检查

`GET /health` — 公开，不经过 V1 信封

响应：基础健康状态（200 正常 / 503 异常）。

### 36.2 Prometheus 指标

`GET /metrics` — 公开，不经过 V1 信封

返回 Prometheus 格式的应用指标数据。

### 36.3 静态文件

`/uploads/*` — 公开，Nginx 直接服务

用户上传的头像、评论图片等静态资源。

---

## 37. 前端集成注意事项

### 37.1 请求配置

- 所有请求需设置 `credentials: 'include'`（或 axios 的 `withCredentials: true`），否则 Cookie 不会发送
- Access Token 存储在内存中（不要存 localStorage），通过 `Authorization: Bearer <token>` 传递
- 请求超时建议：普通请求 30s，流式/下载请求 120s+

### 37.2 Token 生命周期管理

1. 登录成功 → 内存存储 `access_token`，Cookie 自动存储 `refresh_token`
2. 每次请求前检查 `access_token` 是否即将过期（`exp - now < refresh_threshold`）
3. 即将过期 → 调用 `POST /api/auth/refresh` 获取新 token
4. 刷新失败（401）→ 清除状态，跳转登录
5. 页面刷新/首次加载 → 调用 `POST /api/auth/heartbeat` 恢复会话

### 37.3 错误处理

- 401 响应：尝试刷新 token，失败则跳转登录
- 403 响应：检查错误码是否为 `CHALLENGE_REQUIRED`，是则弹出 Turnstile 验证；否则为权限不足
- 429 响应：限流，显示"请稍后重试"
- 检查 `X-Security-Warning` 头：存在时提示用户"检测到异常登录"

### 37.4 分页数据消费

V1 信封下分页数据结构：

```typescript
interface ApiResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
  meta: {
    api_version: string
    request_id: string
    timestamp: string
  }
}
```

注意：`/api/auth/` 路径的响应不经过信封，直接是原始 JSON。

### 37.5 静态资源 URL

- 用户头像上传后返回相对路径，完整 URL 需拼接 Base URL
- 媒体缩略图通过 `/api/v1/media/{uuid}/thumbnail?size=small` 获取
- 上传文件通过 `/uploads/` 路径访问（Nginx 直接服务）

### 37.6 Cloudflare Turnstile 集成

1. 调用 `GET /api/auth/turnstile-config` 获取 `site_key`
2. `enabled=true` 时加载 Turnstile Widget
3. 将获取的 token 传入注册/登录请求的 `turnstile_token` 字段
4. 验证失败时后端返回 400

---

## 38. 权限列表

管理员默认拥有所有权限。普通用户通过角色分配获得权限。

可用权限值：

```
posts:read, posts:write, posts:delete
users:read, users:write, users:delete
roles:read, roles:write, roles:delete
settings:read, settings:write
logs:read
api_keys:manage
```

Access Token 的 `permissions` claim 包含当前用户的权限数组，前端可据此控制 UI 元素的显示/隐藏。
