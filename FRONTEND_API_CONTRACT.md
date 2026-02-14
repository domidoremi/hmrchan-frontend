# 前端 API 合约文档 (v1)
更新日期：2026-02-14

## 变更日志（2026-02-14）
- 新增 Content-Schedules 完整接口：日程列表（分页）、日历格式、详情、CRUD（管理员）、外部同步触发和状态查询
- 补充 Content-Posts 缺失接口：`GET /posts/trending`（热门帖子）、`GET /posts/{post_id}/author`（帖子作者详情）
- 补充 User-History 缺失接口：`GET /history/my-comments`、`GET /history/my-likes`、`GET /history/my-comment-favorites`
- 补充 Community-Comments 缺失接口：`GET /comments/{comment_id}/thread`（评论线索链）
- 补充 Community-Discussions 缺失接口：`GET /discussions/search`（搜索讨论）、`GET /discussions/{uuid}/comments/{id}/thread`（讨论评论线索链）
- 展开 Section 5 Admin API：完整记录 Admin-Management、Admin-Crawler、Admin-Processor、Admin-Roles、Admin-Audit、Admin-Upload 全部接口

## 变更日志（2026-02-11）
- 2FA 备份码：仅首次返回（服务端只保存哈希，无法再次取回）；`TwoFactorStatusResponse.backup_codes_remaining` 表示剩余可用备份码数量。
- 修改密码：操作成功后，将注销该用户的其它活跃会话（保留最近一次活跃会话）；前端需准备其它设备收到 401 时的重新登录处理。
- 错误信息：统一隐藏 JWT 解析细节（返回通用"Invalid token"类消息）；前端应依据 HTTP 状态和错误码分支处理，而非解析错误字符串。
- 文件上传：头像/图片处理相关的 `file_hash`（若接口返回此字段）由 MD5 切换为 SHA-256；如前端使用该字段校验，需要向后兼容两种算法或与后端协商只接受 SHA-256。
- 性能优化：用户列表 `role_count` 统计方式优化，响应结构未变（无需前端改动）。

## 1. 通用约定
- Base Path: `/api/v1`
- 默认 `Content-Type: application/json; charset=utf-8`
- 字段命名：snake_case
- 时间：UTC ISO8601 (例如 `2026-02-09T00:00:00Z`)
- 鉴权：`Authorization: Bearer <access_token>`
- 说明：OpenAPI 中的 response schema 对应 **data 内部结构**；实际响应会被 v1 中间件包裹为统一信封格式。

**统一响应信封（v1）**
```json
{
  "success": true,
  "data": { },
  "meta": {
    "api_version": "1.0.0",
    "request_id": "a1b2c3d4e5f6",
    "timestamp": "2026-02-09T00:00:00Z"
  }
}
```

**分页约定**
- 通用分页参数：`page` (默认 1), `page_size` (默认 20，具体上限以接口为准)
- 分页响应包含 `pagination` 字段 (page, page_size, total, total_pages)

### 1.1 请求约定

**请求头（Request Headers）**
- `Content-Type: application/json; charset=utf-8` — JSON请求体（POST/PUT/PATCH）
- `Authorization: Bearer <access_token>` — JWT访问令牌（需要认证的接口）
- `User-Agent: <client_info>` — 客户端标识（建议包含应用名称和版本）
- `Accept-Language: <locale>` — 语言偏好（可选，如 `zh-CN`, `en-US`）
- `X-Client-Version: <version>` — 客户端版本号（可选，用于兼容性检查）
- `X-Device-ID: <device_id>` — 设备唯一标识（可选，用于设备管理和会话跟踪）

**请求体约定**
- JSON格式，使用UTF-8编码
- 字段命名采用snake_case
- 布尔值使用`true`/`false`
- 空值使用`null`，不要使用空字符串
- 日期时间统一使用UTC ISO8601格式

### 1.2 响应约定

**响应头（Response Headers）**
所有v1 API响应都包含以下标准响应头：
- `Content-Type: application/json; charset=utf-8`
- `X-API-Version: 1.0.0` — API版本号
- `X-Request-ID: <request_id>` — 请求追踪ID（12字符十六进制，与响应体中的meta.request_id一致）
- `X-RateLimit-Limit: <limit>` — 速率限制上限（某些接口）
- `X-RateLimit-Remaining: <remaining>` — 剩余请求配额（某些接口）
- `X-RateLimit-Reset: <timestamp>` — 限制重置时间戳（某些接口）

**成功响应（2xx）**
所有成功响应都包裹在v1统一信封中：
```json
{
  "success": true,
  "data": { /* 实际数据内容 */ },
  "meta": {
    "api_version": "1.0.0",
    "request_id": "a1b2c3d4e5f6",
    "timestamp": "2026-02-09T00:00:00Z"
  }
}
```

**分页响应**
分页数据使用特殊格式，包含额外的`pagination`字段：
```json
{
  "success": true,
  "data": [
    { /* item 1 */ },
    { /* item 2 */ }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  },
  "meta": {
    "api_version": "1.0.0",
    "request_id": "a1b2c3d4e5f6",
    "timestamp": "2026-02-09T00:00:00Z"
  }
}
```

**错误响应（4xx/5xx）**
所有错误响应使用统一的错误信封格式：
```json
{
  "success": false,
  "error": {
    "code": "AUTH_1001",
    "message": "Invalid credentials",
    "details": {
      "field": "password",
      "reason": "Password is incorrect"
    }
  },
  "meta": {
    "api_version": "1.0.0",
    "request_id": "a1b2c3d4e5f6",
    "timestamp": "2026-02-09T00:00:00Z"
  }
}
```

### 1.3 HTTP状态码

**2xx 成功**
- `200 OK` — 请求成功，返回数据
- `201 Created` — 资源创建成功
- `204 No Content` — 操作成功，无返回数据（如删除操作、计数器增加）

**4xx 客户端错误**
- `400 Bad Request` — 请求参数错误或格式不正确
- `401 Unauthorized` — 未认证或token无效/过期
- `403 Forbidden` — 无权限访问该资源
- `404 Not Found` — 资源不存在
- `409 Conflict` — 资源冲突（如重复创建）
- `422 Unprocessable Entity` — 请求格式正确但语义错误（验证失败）
- `429 Too Many Requests` — 请求过于频繁，触发速率限制

**5xx 服务器错误**
- `500 Internal Server Error` — 服务器内部错误
- `502 Bad Gateway` — 网关错误（上游服务异常）
- `503 Service Unavailable` — 服务暂时不可用
- `504 Gateway Timeout` — 网关超时

### 1.4 错误代码（Error Codes）

错误代码采用分类编号系统，格式为`CATEGORY_CODE`。前端应优先依据错误代码而非HTTP状态码或错误消息来处理错误。

**认证相关 (AUTH_1xxx)**
- `AUTH_1001` — 无效凭证（用户名或密码错误）
- `AUTH_1002` — Token已过期
- `AUTH_1003` — Token无效或格式错误
- `AUTH_1004` — 权限不足
- `AUTH_1005` — 账户已锁定
- `AUTH_1006` — 需要双因素认证

**用户相关 (USER_1xxx)**
- `USER_1101` — 用户已存在
- `USER_1102` — 用户不存在
- `USER_1103` — 邮箱已被使用
- `USER_1104` — 密码强度不足
- `USER_1105` — 邮箱格式无效

**资源相关 (RESOURCE_1xxx)**
- `RESOURCE_1201` — 资源不存在
- `RESOURCE_1202` — 资源冲突
- `RESOURCE_1203` — 资源已被删除

**验证相关 (VALIDATION_1xxx)**
- `VALIDATION_1301` — 通用验证错误
- `VALIDATION_1302` — 输入无效
- `VALIDATION_1303` — 缺少必填字段
- `VALIDATION_1304` — 格式不正确

**业务逻辑 (BUSINESS_1xxx)**
- `BUSINESS_1401` — 操作失败
- `BUSINESS_1402` — 重复操作
- `BUSINESS_1403` — 状态无效
- `BUSINESS_1404` — 配额超限

**系统相关 (SYSTEM_1xxx)**
- `SYSTEM_1501` — 内部服务器错误
- `SYSTEM_1502` — 服务不可用
- `SYSTEM_1503` — 数据库错误
- `SYSTEM_1504` — 缓存错误

**安全相关 (SECURITY_1xxx)**
- `SECURITY_1601` — CSRF验证失败
- `SECURITY_1602` — 检测到XSS攻击
- `SECURITY_1603` — 检测到SQL注入
- `SECURITY_1604` — 超出速率限制

**爬虫相关 (CRAWLER_1xxx)**
- `CRAWLER_1701` — 爬虫服务不可用
- `CRAWLER_1702` — 无效平台
- `CRAWLER_1703` — 任务不存在

**处理器相关 (PROCESSOR_1xxx)**
- `PROCESSOR_1801` — 处理服务不可用
- `PROCESSOR_1802` — 扫描任务失败

**文件相关 (FILE_1xxx)**
- `FILE_1901` — 文件不存在
- `FILE_1902` — 不支持的文件类型

**HTTP映射错误码**
对于标准HTTPException，系统会映射为以下错误码：
- `HTTP_400` — Bad Request（未分类）
- `HTTP_401` — Unauthorized（未分类）
- `HTTP_403` — Forbidden（未分类）
- `HTTP_404` — Not Found（未分类）
- `HTTP_422` — Unprocessable Entity（未分类）
- `HTTP_429` — Too Many Requests（未分类）
- `HTTP_500` — Internal Server Error（未分类）

### 1.5 数据类型与格式

**基础类型**
- `string` — 文本字符串，UTF-8编码
- `integer` — 整数
- `number` — 浮点数
- `boolean` — 布尔值（`true`或`false`）
- `null` — 空值

**特殊格式**
- `uuid` — UUID v4格式的字符串（如 `550e8400-e29b-41d4-a716-446655440000`）
- `datetime` — UTC ISO8601格式（如 `2026-02-09T12:34:56Z`）
- `date` — ISO8601日期格式（如 `2026-02-09`）
- `email` — 邮箱地址字符串
- `url` — 完整URL字符串
- `enum` — 枚举值（具体值见各接口说明）

**字段约定**
- ID字段：通常使用UUID v4格式（如 `id`, `user_id`, `post_id`）
- 时间戳字段：统一使用UTC时间，字段名通常为 `*_at`（如 `created_at`, `updated_at`）
- 数量字段：使用整数（如 `view_count`, `like_count`）
- 布尔标志：使用 `is_*` 或 `has_*` 前缀（如 `is_active`, `has_media`）

### 1.6 认证与授权

**认证流程**

1. **登录获取Token**
   - 接口：`POST /api/v1/auth/login`
   - 请求：`{ "username": "...", "password": "..." }`
   - 响应：返回 `access_token`（短期JWT）和 `refresh_token`（HttpOnly Cookie）
   - Access Token有效期：通常15-60分钟
   - Refresh Token有效期：通常7-30天

2. **使用Access Token**
   - 在所有需要认证的请求中，添加请求头：`Authorization: Bearer <access_token>`
   - 服务器验证token有效性和用户权限

3. **Token刷新**
   - 当Access Token过期时，使用Refresh Token获取新的Access Token
   - 接口：`POST /api/v1/auth/refresh`
   - Refresh Token通过HttpOnly Cookie自动发送，前端无需处理
   - 响应：返回新的 `access_token`

4. **Token失效处理**
   - 当收到 `401 Unauthorized` 错误且错误码为 `AUTH_1002`（Token过期）时，尝试刷新token
   - 当收到 `401 Unauthorized` 错误且错误码为 `AUTH_1003`（Token无效）时，清除本地token并跳转到登录页
   - 当刷新token也失败时，清除所有认证信息并跳转到登录页

**双因素认证（2FA）**
- 启用2FA后，登录流程会返回 `two_factor_required: true` 和 `temp_token`
- 使用temp_token调用 `POST /api/v1/auth/2fa/verify` 提交验证码
- 验证成功后返回正常的access_token和refresh_token

**权限系统**
- 基于角色的访问控制（RBAC）
- 常见角色：`admin`（管理员）、`user`（普通用户）、`guest`（访客）
- 某些接口要求特定角色才能访问，详见各接口的"认证"说明

**会话管理**
- 用户可以同时保持多个活跃会话（不同设备）
- 修改密码后，系统会注销除当前会话外的所有其他会话
- 可通过 `GET /api/v1/auth/sessions` 查看所有活跃会话
- 可通过 `DELETE /api/v1/auth/sessions/{session_id}` 注销指定会话

### 1.7 速率限制（Rate Limiting）

**限流策略**
API使用滑动窗口算法进行速率限制。限流基于以下维度：
- 已认证用户：基于user_id
- 未认证用户：基于IP地址

**限流分类**
不同类型的接口有不同的限流配置：

- `CONTENT_READ`（内容读取）— 120次/分钟
  - 适用于：获取帖子列表、帖子详情、媒体文件等
  
- `CONTENT_SEARCH`（内容搜索）— 60次/分钟
  - 适用于：搜索接口、复杂查询等
  
- `USER_READ`（用户信息读取）— 60次/分钟
  - 适用于：获取用户资料、偏好设置等
  
- `USER_WRITE`（用户信息写入）— 20次/分钟
  - 适用于：修改资料、修改偏好、修改密码等
  
- `AUTH`（认证操作）— 10次/分钟
  - 适用于：登录、注册、密码重置等
  
- `COMMENT_WRITE`（评论写入）— 30次/分钟
  - 适用于：发布评论、点赞等
  
- `ADMIN`（管理操作）— 100次/分钟
  - 适用于：管理员接口

**响应头**
触发限流时，响应会包含以下头信息：
- `X-RateLimit-Limit: <limit>` — 时间窗口内的最大请求数
- `X-RateLimit-Remaining: <remaining>` — 剩余可用请求数
- `X-RateLimit-Reset: <timestamp>` — 限制重置的Unix时间戳
- `Retry-After: <seconds>` — 建议等待的秒数（仅在429响应中）

**超限响应**
当超出限流时，返回：
- HTTP状态码：`429 Too Many Requests`
- 错误代码：`SECURITY_1604`
- 错误消息：`"Too many requests"`
- `error.details.retry_after`：建议重试等待秒数

**最佳实践**
- 前端应监控 `X-RateLimit-Remaining` 头，在接近限制时减少请求频率
- 收到429响应时，应遵守 `Retry-After` 头的建议等待时间
- 使用防抖（debounce）和节流（throttle）技术减少不必要的API调用
- 对于搜索等高频操作，建议在客户端实现输入延迟（如300-500ms）

## 2. Content API

### Content-Posts

- **GET /api/v1/posts-light/light** — Get Light Feed
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
    - platform；in:query；type:null|string；required:no；desc:平台过滤
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse[PostListItemLight]
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `total_pages` (type:integer; required:yes)

- **GET /api/v1/posts-light/mixed** — Get Mixed Feed
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
    - per_platform；in:query；type:integer；required:no；default:5；min=3; max=10；desc:每个平台的帖子数
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse[PostListItemLight]
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `total_pages` (type:integer; required:yes)

- **GET /api/v1/posts/** — List Posts
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=100
  - 说明：搜索结果仅包含用户可浏览范围内的帖子（未登录：单平台10条/多平台各平台15条；已登录非管理员：最多100条；管理员不限制）。
    - q；in:query；type:null|string；required:no；desc:Search query
    - platform；in:query；type:null|string；required:no；desc:Platform filter
    - author_id；in:query；type:null|string；required:no；desc:Author UUID filter
    - has_media；in:query；type:boolean|null；required:no；desc:Has media files
    - published_after；in:query；type:null|string；required:no；desc:Published after (ISO date)
    - published_before；in:query；type:null|string；required:no；desc:Published before (ISO date)
    - min_views；in:query；type:integer|null；required:no；desc:Minimum views
    - min_likes；in:query；type:integer|null；required:no；desc:Minimum likes
    - sort_by；in:query；type:string；required:no；default:published_at；desc:Sort field: published_at, scraped_at, view_count, like_count
    - sort_order；in:query；type:string；required:no；default:desc；pattern=^(asc|desc)$；desc:Sort order: asc or desc
    - per_platform_limit；in:query；type:integer|null；required:no；desc:Limit per platform (for multi-platform queries)
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse[PostListItem]
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `total_pages` (type:integer; required:yes)

- **GET /api/v1/posts/platform/{platform}** — List Posts By Platform
  - 认证：需要
  - 参数：
    - platform；in:path；type:string；required:yes
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=100
  - 说明：搜索结果仅包含用户可浏览范围内的帖子（未登录：单平台10条/多平台各平台15条；已登录非管理员：最多100条；管理员不限制）。
    - sort_by；in:query；type:string；required:no；default:scraped_at
    - sort_order；in:query；type:string；required:no；default:desc；pattern=^(asc|desc)$
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse[PostListItem]
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `total_pages` (type:integer; required:yes)

- **GET /api/v1/posts/stats/summary** — Get Posts Stats
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:PostsStatsResponse
      - data 字段结构：
            - `total_posts` (type:integer; required:no)
            - `total_media_files` (type:integer; required:no)
            - `total_authors` (type:integer; required:no)
            - `recent_posts_7d` (type:integer; required:no)
            - `by_platform` (type:object; required:no)

- **GET /api/v1/posts/trending** — 获取热门帖子
  - 认证：可选（支持匿名）
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
    - days；in:query；type:integer；required:no；default:7；min=1; max=30；desc:热门统计时间窗口（天）
  - 说明：基于加权分数（view_count + like_count * 5）在指定时间窗口内排序。结果缓存120秒。
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse[PostListItem]
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **GET /api/v1/posts/{post_id}** — Get Post
  - 认证：需要
  - 参数：
    - post_id；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:object

- **GET /api/v1/posts/{post_id}/comments** — Get Post Comments Alias
  - 认证：需要
  - 参数：
    - post_id；in:path；type:string；required:yes
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
    - sort；in:query；type:string；required:no；default:newest；pattern=^(newest|oldest|popular)$
  - 成功响应：
    - 200 JSON -> data:object

- **GET /api/v1/posts/{post_id}/author** — 获取帖子作者详情
  - 认证：可选（支持匿名）
  - 参数：
    - post_id；in:path；type:string；required:yes
  - 说明：返回作者完整资料，包括平台信息、头像、简介、粉丝数、认证状态等。与帖子详情中嵌入的 author 字段相比，此接口返回更完整的作者信息。
  - 成功响应：
    - 200 JSON -> data:AuthorResponse
      - data 字段结构：
            - `id` (type:string; required:yes; desc:作者UUID)
            - `platform` (type:string; required:yes)
            - `platform_user_id` (type:string; required:yes)
            - `name` (type:string; required:yes)
            - `username` (type:string; required:yes)
            - `description` (type:null|string; required:no)
            - `avatar_url` (type:null|string; required:no)
            - `profile_url` (type:null|string; required:no)
            - `follower_count` (type:integer|null; required:no)
            - `video_count` (type:integer|null; required:no)
            - `is_verified` (type:boolean; required:yes)
            - `created_at` (type:null|string; required:no)
            - `updated_at` (type:null|string; required:no)
  - 错误响应：
    - 404: 帖子不存在或作者不存在

- **POST /api/v1/posts/{post_id}/increment-view** — Increment Post View
  - 认证：不需要
  - 参数：
    - post_id；in:path；type:string；required:yes
  - 成功响应：
    - 204 No Content


### Content-Media

- **GET /api/v1/media/** — List Media Files
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=100
  - 说明：搜索结果仅包含用户可浏览范围内的帖子（未登录：单平台10条/多平台各平台15条；已登录非管理员：最多100条；管理员不限制）。
    - post_id；in:query；type:null|string；required:no；desc:Filter by post UUID
    - file_type；in:query；type:null|string；required:no；desc:Filter by file type
    - is_downloaded；in:query；type:boolean|null；required:no；desc:Filter by download status
    - min_size；in:query；type:integer|null；required:no；desc:Minimum file size
    - max_size；in:query；type:integer|null；required:no；desc:Maximum file size
    - sort_by；in:query；type:string；required:no；default:created_at
    - sort_order；in:query；type:string；required:no；default:desc；pattern=^(asc|desc)$
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse[MediaFileListItem]
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `total_pages` (type:integer; required:yes)

- **GET /api/v1/media/post/{post_id}/list** — List Post Media
  - 认证：需要
  - 参数：
    - post_id；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:Response List Post Media Api V1 Media Post  Post Id  List Get
      - data 字段结构：
            - items: object

- **GET /api/v1/media/{media_id}** — Get Media File
  - 认证：需要
  - 参数：
    - media_id；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:MediaFileResponse
      - data 字段结构：
            - `id` (type:string; required:yes)
            - `post_id` (type:null|string; required:no)
            - `file_path` (type:string; required:yes)
            - `file_type` (type:string; required:yes)
            - `file_size` (type:integer|null; required:no)
            - `width` (type:integer|null; required:no)
            - `height` (type:integer|null; required:no)
            - `duration` (type:integer|null; required:no)
            - `mime_type` (type:null|string; required:no)
            - `thumbnail_path` (type:null|string; required:no)
            - `is_downloaded` (type:boolean; required:yes)
            - `download_url` (type:null|string; required:no)
            - `subtitle_language` (type:null|string; required:no)
            - `subtitle_format` (type:null|string; required:no)
            - `has_subtitle` (type:boolean; required:no)
            - `subtitles` (type:array|null; required:no)
            - `created_at` (type:string; required:yes)

- **GET /api/v1/media/{media_id}/download** — Download Media File
  - 认证：不需要
  - 参数：
    - media_id；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:object

- **GET /api/v1/media/{media_id}/stream** — Stream Media File
  - 认证：不需要
  - 参数：
    - media_id；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:object

- **GET /api/v1/media/{media_id}/subtitle** — Stream Subtitle File
  - 认证：不需要
  - 参数：
    - media_id；in:path；type:string；required:yes
    - language；in:query；type:string；required:no
  - 成功响应：
    - 200 JSON -> data:object

- **GET /api/v1/media/{media_id}/thumbnail** — Get Media Thumbnail
  - 认证：不需要
  - 参数：
    - media_id；in:path；type:string；required:yes
    - size；in:query；type:string；required:no；default:medium；pattern=^(small|medium|large|original)$
  - 成功响应：
    - 200 JSON -> data:object


### Content-Authors

- **GET /api/v1/authors/** — List Authors
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=500
    - q；in:query；type:null|string；required:no；desc:Search query
    - platform；in:query；type:null|string；required:no；desc:Platform filter
    - is_verified；in:query；type:boolean|null；required:no；desc:Verified filter
    - min_followers；in:query；type:integer|null；required:no；desc:Minimum followers
    - sort_by；in:query；type:string；required:no；default:first_scraped_at
    - sort_order；in:query；type:string；required:no；default:desc；pattern=^(asc|desc)$
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse[AuthorListItem]
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `total_pages` (type:integer; required:yes)

- **GET /api/v1/authors/platform/{platform}/list** — List Authors By Platform
  - 认证：需要
  - 参数：
    - platform；in:path；type:string；required:yes
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=100
  - 说明：搜索结果仅包含用户可浏览范围内的帖子（未登录：单平台10条/多平台各平台15条；已登录非管理员：最多100条；管理员不限制）。
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse[AuthorListItem]
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `total_pages` (type:integer; required:yes)

- **GET /api/v1/authors/{author_id}** — Get Author
  - 认证：需要
  - 参数：
    - author_id；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:AuthorResponse
      - data 字段结构：
            - `id` (type:string; required:yes)
            - `platform` (type:string; required:yes)
            - `platform_user_id` (type:null|string; required:no)
            - `name` (type:string; required:yes)
            - `username` (type:null|string; required:no)
            - `description` (type:null|string; required:no)
            - `avatar_url` (type:null|string; required:no)
            - `profile_url` (type:null|string; required:no)
            - `follower_count` (type:integer|null; required:no)
            - `video_count` (type:integer|null; required:no)
            - `is_verified` (type:boolean; required:no)
            - `created_at` (type:string; required:yes)
            - `updated_at` (type:null|string; required:no)

- **GET /api/v1/authors/{author_id}/posts** — List Author Posts
  - 认证：需要
  - 参数：
    - author_id；in:path；type:string；required:yes
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=100
  - 说明：搜索结果仅包含用户可浏览范围内的帖子（未登录：单平台10条/多平台各平台15条；已登录非管理员：最多100条；管理员不限制）。
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `total_pages` (type:integer; required:yes)


### Content-Search

- **GET /api/v1/search/authors** — Search Authors
  - 认证：需要
  - 参数：
    - q；in:query；type:string；required:yes；minLen=1；desc:Search query (name, username)
    - platform；in:query；type:null|string；required:no；desc:Filter by platform
    - is_verified；in:query；type:boolean|null；required:no；desc:Filter by verified status
    - min_followers；in:query；type:integer|null；required:no；desc:Minimum follower count
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=100
  - 说明：搜索结果仅包含用户可浏览范围内的帖子（未登录：单平台10条/多平台各平台15条；已登录非管理员：最多100条；管理员不限制）。
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse[AuthorListItem]
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `total_pages` (type:integer; required:yes)

- **GET /api/v1/search/posts** — Search Posts
  - 认证：需要
  - 参数：
    - q；in:query；type:string；required:yes；minLen=1；desc:Search query (title, description)
    - platform；in:query；type:null|string；required:no；desc:Filter by platform
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=100
  - 说明：搜索结果仅包含用户可浏览范围内的帖子（未登录：单平台10条/多平台各平台15条；已登录非管理员：最多100条；管理员不限制）。
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse[PostListItem]
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `total_pages` (type:integer; required:yes)

- **GET /api/v1/search/suggestions** — Search Suggestions
  - 认证：需要
  - 参数：
    - q；in:query；type:string；required:yes；minLen=1；desc:Search query for suggestions
    - type；in:query；type:string；required:no；default:all；pattern=^(post|author|all)$
    - platform；in:query；type:null|string；required:no；desc:Filter by platform
    - limit；in:query；type:integer；required:no；default:10；min=1; max=20
  - 成功响应：
    - 200 JSON -> data:SearchSuggestionResponse
      - data 字段结构：
            - `query` (type:string; required:yes)
            - `results` (type:array; required:yes)


### Content-Schedules

> 日程/活动管理。数据通过 Celery Beat 定时任务从外部来源（如 WordPress Event Organiser）自动同步，存储到本地数据库后提供给前端。同步间隔 6 小时，带 Redis 速率限制（最小 30 分钟）。

- **GET /api/v1/schedules** — 日程列表（分页）
  - 认证：不需要（未发布日程仅管理员可见）
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:50；min=1；max=200
    - category；in:query；type:null|string；required:no；desc:分类过滤 (live, media, birth, other)
    - start；in:query；type:null|string(datetime)；required:no；desc:开始日期过滤
    - end；in:query；type:null|string(datetime)；required:no；desc:结束日期过滤
    - published_only；in:query；type:boolean；required:no；default:true
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse[ScheduleResponse]
      - items 元素结构：
            - `id` (type:integer; required:yes)
            - `uuid` (type:string; required:yes)
            - `title` (type:string; required:yes)
            - `description` (type:null|string; required:no)
            - `category` (type:string; required:yes; desc:live|media|birth|other)
            - `start_date` (type:string(datetime); required:yes)
            - `end_date` (type:null|string(datetime); required:no)
            - `is_all_day` (type:boolean; required:yes)
            - `venue` (type:null|string; required:no)
            - `venue_address` (type:null|string; required:no)
            - `event_url` (type:null|string; required:no)
            - `ticket_url` (type:null|string; required:no)
            - `author_id` (type:null|integer; required:no)
            - `source_url` (type:null|string; required:no)
            - `source_platform` (type:null|string; required:no)
            - `color` (type:null|string; required:no; desc:日历显示颜色)
            - `is_published` (type:boolean; required:yes)
            - `created_at` (type:string(datetime); required:yes)
            - `updated_at` (type:null|string(datetime); required:no)

- **GET /api/v1/schedules/calendar** — 日历格式事件列表（FullCalendar 兼容）
  - 认证：不需要
  - 参数：
    - start；in:query；type:null|string(datetime)；required:no；desc:开始日期
    - end；in:query；type:null|string(datetime)；required:no；desc:结束日期
    - category；in:query；type:null|string；required:no；desc:分类过滤
  - 成功响应：
    - 200 JSON -> data:array[ScheduleCalendarItem]
      - 元素结构：
            - `id` (type:integer; required:yes)
            - `title` (type:string; required:yes)
            - `start` (type:string(datetime); required:yes)
            - `end` (type:null|string(datetime); required:no)
            - `allDay` (type:boolean; required:yes; default:true)
            - `category` (type:string; required:yes)
            - `color` (type:null|string; required:no)
            - `url` (type:null|string; required:no)
            - `venue` (type:null|string; required:no)
            - `description` (type:null|string; required:no)

- **GET /api/v1/schedules/{schedule_id}** — 日程详情
  - 认证：不需要（未发布日程仅管理员可见）
  - 参数：
    - schedule_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:ScheduleResponse
  - 错误响应：
    - 404: Schedule not found

- **POST /api/v1/schedules** — 创建日程（管理员）
  - 认证：需要（管理员）
  - 请求体：
    - application/json -> ScheduleCreate
      - 字段结构：
            - `title` (type:string; required:yes; min:1; max:500)
            - `description` (type:null|string; required:no)
            - `category` (type:string; required:no; default:live; desc:live|media|birth|other)
            - `start_date` (type:string(datetime); required:yes)
            - `end_date` (type:null|string(datetime); required:no)
            - `is_all_day` (type:boolean; required:no; default:true)
            - `venue` (type:null|string; required:no; max:500)
            - `venue_address` (type:null|string; required:no)
            - `event_url` (type:null|string; required:no)
            - `ticket_url` (type:null|string; required:no)
            - `author_id` (type:null|integer; required:no)
            - `source_url` (type:null|string; required:no)
            - `source_platform` (type:null|string; required:no; max:100)
            - `color` (type:null|string; required:no; max:20)
            - `is_published` (type:boolean; required:no; default:true)
  - 成功响应：
    - 201 JSON -> data:ScheduleResponse
  - 错误响应：
    - 401: Unauthorized
    - 403: Admin privileges required

- **PUT /api/v1/schedules/{schedule_id}** — 更新日程（管理员）
  - 认证：需要（管理员）
  - 参数：
    - schedule_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> ScheduleUpdate（所有字段可选）
  - 成功响应：
    - 200 JSON -> data:ScheduleResponse
  - 错误响应：
    - 404: Schedule not found

- **DELETE /api/v1/schedules/{schedule_id}** — 删除日程（管理员）
  - 认证：需要（管理员）
  - 参数：
    - schedule_id；in:path；type:integer；required:yes
  - 成功响应：
    - 204 No Content
  - 错误响应：
    - 404: Schedule not found

- **POST /api/v1/schedules/sync** — 触发外部日程同步（管理员）
  - 认证：需要（管理员）
  - 参数：
    - force；in:query；type:boolean；required:no；default:false；desc:跳过速率限制
  - 成功响应：
    - 202 JSON -> data:object
      - 字段结构：
            - `task_id` (type:string; required:yes; desc:Celery 任务 ID)
            - `status` (type:string; required:yes; value:queued)

- **GET /api/v1/schedules/sync/status** — 同步状态（管理员）
  - 认证：需要（管理员）
  - 成功响应：
    - 200 JSON -> data:object
      - 字段结构：
            - `sources` (type:array; required:yes)
              - 元素结构：
                - `name` (type:string; required:yes)
                - `platform` (type:string; required:yes)
                - `last_sync_at` (type:null|string(datetime); required:no)
                - `event_count` (type:integer; required:yes)


### System

- **GET /api/v1/health** — 健康检查
  - 认证：不需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:object

- **GET /api/v1/health/live** — 存活检查
  - 认证：不需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:object

- **GET /api/v1/health/ready** — 就绪检查
  - 认证：不需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:object

## 3. User API

### User-Auth

- **POST /api/v1/2fa/disable** — Disable 2Fa
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> Disable2FARequest
      - 字段结构：
            - `code` (type:string; required:yes; desc:TOTP code or backup code)
            - `password` (type:string; required:yes; desc:Current password for confirmation)
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/2fa/regenerate-backup-codes** — Regenerate Backup Codes
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> Verify2FARequest
      - 字段结构：
            - `code` (type:string; required:yes; minLen=6; maxLen=6; desc:6-digit TOTP code)
  - 成功响应：
    - 200 JSON -> data:RegenerateBackupCodesResponse
      - data 字段结构：
            - `backup_codes` (type:array; required:yes)
            - `message` (type:string; required:yes)

- **POST /api/v1/2fa/setup** — Setup 2Fa
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:Setup2FAResponse
      - data 字段结构：
            - `secret` (type:string; required:yes; desc:TOTP secret (base32))
            - `qr_code` (type:string; required:yes; desc:QR code as base64 PNG)
            - `otpauth_url` (type:string; required:yes; desc:otpauth:// URL for manual entry)
            - `backup_codes` (type:array; required:yes; desc:One-time backup codes)

- **GET /api/v1/2fa/status** — Get 2Fa Status
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:TwoFactorStatusResponse
      - data 字段结构：
            - `enabled` (type:boolean; required:yes)
            - `backup_codes_remaining` (type:integer; required:yes)

- **POST /api/v1/2fa/verify** — Verify And Enable 2Fa
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> Verify2FARequest
      - 字段结构：
            - `code` (type:string; required:yes; minLen=6; maxLen=6; desc:6-digit TOTP code)
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/2fa/verify-login** — Verify 2Fa Login
  - 认证：不需要
  - 参数：无
  - 请求体：
    - application/json -> Complete2FALoginRequest
      - 字段结构：
            - `pending_token` (type:string; required:yes; desc:Pending 2FA token from login response)
            - `code` (type:string; required:yes; desc:TOTP code or backup code)
            - `device_name` (type:null|string; required:no; desc:Device name for session)
            - `device_type` (type:null|string; required:no; desc:Device type (browser, mobile, etc))
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/auth/heartbeat** — Heartbeat
  - 认证：不需要
  - 参数：
    - refresh_token；in:cookie；type:null|string；required:no
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/auth/login** — Login
  - 认证：不需要
  - 参数：无
  - 请求体：
    - application/json -> LoginRequest
      - 字段结构：
            - `username` (type:string; required:yes; minLen=3; maxLen=100)
            - `password` (type:string; required:yes; minLen=6)
            - `device_name` (type:null|string; required:no)
            - `device_type` (type:null|string; required:no)
            - `turnstile_token` (type:null|string; required:no; desc:Cloudflare Turnstile token)
  - 成功响应：
    - 200 JSON -> data:LoginResponse
      - data 字段结构：
            - `access_token` (type:string; required:yes)
            - `refresh_token` (type:null|string; required:no)
            - `token_type` (type:string; required:no)
            - `expires_in` (type:integer; required:yes)
            - `refresh_threshold` (type:integer; required:no)
            - `user` (type:object; required:yes; desc:User response schema.)

- **POST /api/v1/auth/logout** — Logout
  - 认证：不需要
  - 参数：
    - refresh_token；in:cookie；type:null|string；required:no
  - 请求体：
    - application/json -> Logout Data
  - 成功响应：
    - 200 JSON -> data:object

- **GET /api/v1/auth/me** — Get Current User Info
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:UserResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `username` (type:string; required:yes)
            - `email` (type:string; required:yes)
            - `full_name` (type:null|string; required:no)
            - `avatar_url` (type:null|string; required:no)
            - `bio` (type:null|string; required:no)
            - `is_active` (type:boolean; required:yes)
            - `is_admin` (type:boolean; required:yes)
            - `is_verified` (type:boolean; required:yes)
            - `email_verified_at` (type:null|string; required:no)
            - `totp_enabled` (type:boolean; required:yes)
            - `created_at` (type:string; required:yes)
            - `last_login_at` (type:null|string; required:no)
            - `roles` (type:array; required:no)

- **POST /api/v1/auth/refresh** — Refresh Token
  - 认证：不需要
  - 参数：
    - refresh_token；in:cookie；type:null|string；required:no
  - 成功响应：
    - 200 JSON -> data:RefreshTokenResponse
      - data 字段结构：
            - `access_token` (type:string; required:yes)
            - `token_type` (type:string; required:no)
            - `expires_in` (type:integer; required:yes)
            - `refresh_threshold` (type:integer; required:no)
            - `user` (type:null|object; required:no)

- **POST /api/v1/auth/register** — Register
  - 认证：不需要
  - 参数：无
  - 请求体：
    - application/json -> RegisterRequest
      - 字段结构：
            - `username` (type:string; required:yes; minLen=3; maxLen=50; desc:Username)
            - `email` (type:string; required:yes; maxLen=255; desc:Email address)
            - `password` (type:string; required:yes; minLen=8; maxLen=100; desc:Password)
            - `full_name` (type:null|string; required:no; desc:Full name)
            - `verification_code` (type:string; required:yes; minLen=6; maxLen=6; desc:Email verification code)
            - `turnstile_token` (type:null|string; required:no; desc:Cloudflare Turnstile token)
  - 成功响应：
    - 201 JSON -> data:LoginResponse
      - data 字段结构：
            - `access_token` (type:string; required:yes)
            - `refresh_token` (type:null|string; required:no)
            - `token_type` (type:string; required:no)
            - `expires_in` (type:integer; required:yes)
            - `refresh_threshold` (type:integer; required:no)
            - `user` (type:object; required:yes; desc:User response schema.)

- **GET /api/v1/auth/turnstile-config** — Get Turnstile Config
  - 认证：不需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/auth/verify-identity** — Verify Identity For Action
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> SecondaryVerificationRequest
      - 字段结构：
            - `password` (type:string; required:yes; minLen=1; desc:Current password)
            - `action` (type:string; required:yes; maxLen=50; desc:Action being performed)
            - `resource_id` (type:null|string; required:no; desc:Optional resource identifier)
  - 成功响应：
    - 200 JSON -> data:SecondaryVerificationResponse
      - data 字段结构：
            - `verified` (type:boolean; required:yes)
            - `verification_token` (type:string; required:yes)
            - `action` (type:string; required:yes)
            - `expires_in` (type:integer; required:yes)
            - `message` (type:string; required:yes)

- **POST /api/v1/auth/verify-password** — Verify Password Endpoint
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> VerifyPasswordRequest
      - 字段结构：
            - `password` (type:string; required:yes; minLen=1; desc:Current password to verify)
  - 成功响应：
    - 200 JSON -> data:VerifyPasswordResponse
      - data 字段结构：
            - `verified` (type:boolean; required:yes)
            - `verification_token` (type:null|string; required:no)
            - `expires_in` (type:integer|null; required:no)
            - `message` (type:string; required:yes)

- **POST /api/v1/email/change-email** — Change Email
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> ChangeEmailRequest
      - 字段结构：
            - `new_email` (type:string; required:yes; desc:New email address)
            - `password` (type:string; required:yes; desc:Current password for verification)
  - 成功响应：
    - 200 JSON -> data:ChangeEmailResponse
      - data 字段结构：
            - `message` (type:string; required:yes)
            - `verification_sent` (type:boolean; required:yes)

- **POST /api/v1/email/request-password-reset** — Request Password Reset
  - 认证：不需要
  - 参数：无
  - 请求体：
    - application/json -> RequestPasswordResetRequest
      - 字段结构：
            - `email` (type:string; required:yes; desc:User email address)
            - `turnstile_token` (type:null|string; required:no; desc:Cloudflare Turnstile token)
  - 成功响应：
    - 200 JSON -> data:RequestPasswordResetResponse
      - data 字段结构：
            - `message` (type:string; required:yes)

- **POST /api/v1/email/reset-password** — Reset Password
  - 认证：不需要
  - 参数：无
  - 请求体：
    - application/json -> ResetPasswordRequest
      - 字段结构：
            - `token` (type:string; required:yes; desc:Reset token from email)
            - `new_password` (type:string; required:yes; minLen=8; desc:New password)
  - 成功响应：
    - 200 JSON -> data:ResetPasswordResponse
      - data 字段结构：
            - `success` (type:boolean; required:yes)
            - `message` (type:string; required:yes)

- **POST /api/v1/email/send-registration-code** — Send Registration Code
  - 认证：不需要
  - 参数：无
  - 请求体：
    - application/json -> SendRegistrationCodeRequest
      - 字段结构：
            - `email` (type:string; required:yes)
            - `turnstile_token` (type:null|string; required:no)
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/email/send-verification-email** — Send Verification Email
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/email/verify-email** — Verify Email
  - 认证：不需要
  - 参数：无
  - 请求体：
    - application/json -> VerifyEmailRequest
      - 字段结构：
            - `token` (type:string; required:yes; desc:Verification token from email)
  - 成功响应：
    - 200 JSON -> data:VerifyEmailResponse
      - data 字段结构：
            - `success` (type:boolean; required:yes)
            - `message` (type:string; required:yes)
            - `email_verified` (type:boolean; required:no)


### User-Profile

- **POST /api/v1/account/admin/cleanup-expired** — Cleanup Expired Users
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：
            - `message` (type:string; required:yes)
            - `success` (type:boolean; required:no)

- **GET /api/v1/account/data-summary** — Get Data Summary
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:UserDataSummary
      - data 字段结构：
            - `user_id` (type:integer; required:yes)
            - `username` (type:string; required:yes)
            - `email` (type:string; required:yes)
            - `created_at` (type:null|string; required:no)
            - `data_counts` (type:object; required:yes)

- **POST /api/v1/account/delete** — Delete Account
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> DeleteAccountRequest
      - 字段结构：
            - `reason` (type:null|string; required:no; desc:删除原因（可选）)
            - `confirm` (type:boolean; required:yes; desc:确认删除)
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：
            - `message` (type:string; required:yes)
            - `success` (type:boolean; required:no)

- **GET /api/v1/account/deletion-status** — Get Deletion Status
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:AccountDeletionStatus
      - data 字段结构：
            - `is_deleted` (type:boolean; required:yes)
            - `deleted_at` (type:null|string; required:no)
            - `permanent_delete_at` (type:null|string; required:no)
            - `days_remaining` (type:integer|null; required:no)
            - `can_restore` (type:boolean; required:no)

- **POST /api/v1/account/export-data** — Export User Data
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:DataExportResponse
      - data 字段结构：
            - `export_id` (type:string; required:yes)
            - `status` (type:string; required:yes)
            - `message` (type:string; required:yes)

- **GET /api/v1/account/profile** — Get Profile Alias
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/account/restore** — Restore Account
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：
            - `message` (type:string; required:yes)
            - `success` (type:boolean; required:no)

- **GET /api/v1/users** — List Users
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=100
  - 说明：搜索结果仅包含用户可浏览范围内的帖子（未登录：单平台10条/多平台各平台15条；已登录非管理员：最多100条；管理员不限制）。
    - q；in:query；type:null|string；required:no；desc:Search query
    - is_active；in:query；type:boolean|null；required:no
    - is_admin；in:query；type:boolean|null；required:no
    - is_verified；in:query；type:boolean|null；required:no
    - role_id；in:query；type:integer|null；required:no
    - sort_by；in:query；type:string；required:no；default:created_at
    - sort_order；in:query；type:string；required:no；default:desc；pattern=^(asc|desc)$
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse[UserListItem]
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `total_pages` (type:integer; required:yes)

- **POST /api/v1/users** — Create User
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> UserCreate
      - 字段结构：
            - `email` (type:string; required:yes)
            - `username` (type:string; required:yes; minLen=3; maxLen=100)
            - `full_name` (type:null|string; required:no)
            - `bio` (type:null|string; required:no)
            - `avatar_url` (type:null|string; required:no)
            - `password` (type:string; required:yes; minLen=8; maxLen=100)
            - `is_admin` (type:boolean; required:no)
            - `is_active` (type:boolean; required:no)
  - 成功响应：
    - 201 JSON -> data:UserResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `username` (type:string; required:yes)
            - `email` (type:string; required:yes)
            - `full_name` (type:null|string; required:no)
            - `avatar_url` (type:null|string; required:no)
            - `bio` (type:null|string; required:no)
            - `is_active` (type:boolean; required:yes)
            - `is_admin` (type:boolean; required:yes)
            - `is_verified` (type:boolean; required:yes)
            - `email_verified_at` (type:null|string; required:no)
            - `totp_enabled` (type:boolean; required:yes)
            - `created_at` (type:string; required:yes)
            - `last_login_at` (type:null|string; required:no)
            - `roles` (type:array; required:no)

- **POST /api/v1/users/me/change-password** — Change My Password
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> PasswordChangeRequest
      - 字段结构：
            - `current_password` (type:string; required:yes; minLen=1; desc:当前密码)
            - `new_password` (type:string; required:yes; minLen=8; maxLen=100; desc:新密码)
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：
            - `message` (type:string; required:yes)
            - `success` (type:boolean; required:no)

- **GET /api/v1/users/me/profile** — Get My Profile
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:ProfileResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `username` (type:string; required:yes)
            - `email` (type:string; required:yes)
            - `full_name` (type:null|string; required:no)
            - `avatar_url` (type:null|string; required:no)
            - `bio` (type:null|string; required:no)
            - `is_verified` (type:boolean; required:yes)
            - `created_at` (type:string; required:yes)
            - `username_changed_at` (type:null|string; required:no)
            - `can_change_username` (type:boolean; required:no)
            - `username_change_available_at` (type:null|string; required:no)
            - `gender` (type:null|string; required:no)
            - `birth_date` (type:null|string; required:no)
            - `location` (type:null|string; required:no)
            - `website` (type:null|string; required:no)
            - `social_links` (type:null|object; required:no)

- **PATCH /api/v1/users/me/profile** — Update My Profile
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> ProfileUpdate
      - 字段结构：
            - `username` (type:null|string; required:no; desc:用户名（30天只能改一次）)
            - `full_name` (type:null|string; required:no; desc:显示名称)
            - `bio` (type:null|string; required:no; desc:个人简介)
            - `avatar_url` (type:null|string; required:no; desc:头像URL)
            - `gender` (type:null|string; required:no; desc:性别)
            - `birth_date` (type:null|string; required:no; desc:出生日期)
            - `location` (type:null|string; required:no; desc:所在地)
            - `website` (type:null|string; required:no; desc:个人网站)
            - `social_links` (type:null|object; required:no; desc:社交链接)
  - 成功响应：
    - 200 JSON -> data:ProfileResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `username` (type:string; required:yes)
            - `email` (type:string; required:yes)
            - `full_name` (type:null|string; required:no)
            - `avatar_url` (type:null|string; required:no)
            - `bio` (type:null|string; required:no)
            - `is_verified` (type:boolean; required:yes)
            - `created_at` (type:string; required:yes)
            - `username_changed_at` (type:null|string; required:no)
            - `can_change_username` (type:boolean; required:no)
            - `username_change_available_at` (type:null|string; required:no)
            - `gender` (type:null|string; required:no)
            - `birth_date` (type:null|string; required:no)
            - `location` (type:null|string; required:no)
            - `website` (type:null|string; required:no)
            - `social_links` (type:null|object; required:no)

- **DELETE /api/v1/users/{user_id}** — Delete User
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：
            - `message` (type:string; required:yes)
            - `success` (type:boolean; required:no)

- **GET /api/v1/users/{user_id}** — Get User
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:UserResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `username` (type:string; required:yes)
            - `email` (type:string; required:yes)
            - `full_name` (type:null|string; required:no)
            - `avatar_url` (type:null|string; required:no)
            - `bio` (type:null|string; required:no)
            - `is_active` (type:boolean; required:yes)
            - `is_admin` (type:boolean; required:yes)
            - `is_verified` (type:boolean; required:yes)
            - `email_verified_at` (type:null|string; required:no)
            - `totp_enabled` (type:boolean; required:yes)
            - `created_at` (type:string; required:yes)
            - `last_login_at` (type:null|string; required:no)
            - `roles` (type:array; required:no)

- **PATCH /api/v1/users/{user_id}** — Update User
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> UserUpdate
      - 字段结构：
            - `email` (type:null|string; required:no)
            - `full_name` (type:null|string; required:no)
            - `bio` (type:null|string; required:no)
            - `avatar_url` (type:null|string; required:no)
            - `is_active` (type:boolean|null; required:no)
            - `is_admin` (type:boolean|null; required:no)
            - `is_verified` (type:boolean|null; required:no)
  - 成功响应：
    - 200 JSON -> data:UserResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `username` (type:string; required:yes)
            - `email` (type:string; required:yes)
            - `full_name` (type:null|string; required:no)
            - `avatar_url` (type:null|string; required:no)
            - `bio` (type:null|string; required:no)
            - `is_active` (type:boolean; required:yes)
            - `is_admin` (type:boolean; required:yes)
            - `is_verified` (type:boolean; required:yes)
            - `email_verified_at` (type:null|string; required:no)
            - `totp_enabled` (type:boolean; required:yes)
            - `created_at` (type:string; required:yes)
            - `last_login_at` (type:null|string; required:no)
            - `roles` (type:array; required:no)

- **POST /api/v1/users/{user_id}/reset-password** — Reset User Password
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> UserPasswordReset
      - 字段结构：
            - `new_password` (type:string; required:yes; minLen=8; maxLen=100)
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：
            - `message` (type:string; required:yes)
            - `success` (type:boolean; required:no)

- **GET /api/v1/users/{user_id}/roles** — Get User Roles
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:Response Get User Roles Api V1 Users  User Id  Roles Get
      - data 字段结构：
            - items: object

- **POST /api/v1/users/{user_id}/roles** — Assign User Roles
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> UserRoleAssignment
      - 字段结构：
            - `role_ids` (type:array; required:yes; desc:List of role IDs to assign)
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：
            - `message` (type:string; required:yes)
            - `success` (type:boolean; required:no)

- **GET /api/v1/users/{user_id}/stats** — Get User Stats
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:UserStatsResponse
      - data 字段结构：
            - `favorites_count` (type:integer; required:no)
            - `views_count` (type:integer; required:no)
            - `posts_count` (type:integer; required:no)
            - `comments_count` (type:integer; required:no)


### User-Preferences

- **DELETE /api/v1/preferences** — Reset Preferences
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 204 No Content

- **GET /api/v1/preferences** — Get User Preferences
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:UserPreferencesResponse
      - data 字段结构：
            - `showHeroSection` (type:boolean; required:no; desc:显示首页横幅)
            - `postsPerPage` (type:integer; required:no; min=10.0; max=100.0; desc:每页帖子数量)
            - `enableAnimations` (type:boolean; required:no; desc:启用动画效果)
            - `autoPlayVideos` (type:boolean; required:no; desc:自动播放视频)
            - `showImagePreviews` (type:boolean; required:no; desc:显示图片预览)
            - `cookieConsent` (type:boolean|null; required:no; desc:Cookie 同意状态)
            - `analyticsEnabled` (type:boolean; required:no; desc:分析统计)
            - `functionalCookiesEnabled` (type:boolean; required:no; desc:功能性 Cookie)
            - `performanceCookiesEnabled` (type:boolean; required:no; desc:性能 Cookie)
            - `dataCollection` (type:boolean; required:no; desc:数据收集)
            - `personalizedContent` (type:boolean; required:no; desc:个性化内容)
            - `createdAt` (type:string; required:yes; desc:创建时间)
            - `updatedAt` (type:string; required:yes; desc:更新时间)
            - `lastSyncedAt` (type:string; required:yes; desc:最后同步时间)

- **PATCH /api/v1/preferences** — Partial Update Preferences
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> UserPreferencesUpdate
      - 字段结构：
            - `showHeroSection` (type:boolean|null; required:no)
            - `postsPerPage` (type:integer|null; required:no)
            - `enableAnimations` (type:boolean|null; required:no)
            - `autoPlayVideos` (type:boolean|null; required:no)
            - `showImagePreviews` (type:boolean|null; required:no)
            - `cookieConsent` (type:boolean|null; required:no)
            - `analyticsEnabled` (type:boolean|null; required:no)
            - `functionalCookiesEnabled` (type:boolean|null; required:no)
            - `performanceCookiesEnabled` (type:boolean|null; required:no)
            - `dataCollection` (type:boolean|null; required:no)
            - `personalizedContent` (type:boolean|null; required:no)
  - 成功响应：
    - 200 JSON -> data:UserPreferencesResponse
      - data 字段结构：
            - `showHeroSection` (type:boolean; required:no; desc:显示首页横幅)
            - `postsPerPage` (type:integer; required:no; min=10.0; max=100.0; desc:每页帖子数量)
            - `enableAnimations` (type:boolean; required:no; desc:启用动画效果)
            - `autoPlayVideos` (type:boolean; required:no; desc:自动播放视频)
            - `showImagePreviews` (type:boolean; required:no; desc:显示图片预览)
            - `cookieConsent` (type:boolean|null; required:no; desc:Cookie 同意状态)
            - `analyticsEnabled` (type:boolean; required:no; desc:分析统计)
            - `functionalCookiesEnabled` (type:boolean; required:no; desc:功能性 Cookie)
            - `performanceCookiesEnabled` (type:boolean; required:no; desc:性能 Cookie)
            - `dataCollection` (type:boolean; required:no; desc:数据收集)
            - `personalizedContent` (type:boolean; required:no; desc:个性化内容)
            - `createdAt` (type:string; required:yes; desc:创建时间)
            - `updatedAt` (type:string; required:yes; desc:更新时间)
            - `lastSyncedAt` (type:string; required:yes; desc:最后同步时间)

- **PUT /api/v1/preferences** — Update User Preferences
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> UserPreferencesUpdate
      - 字段结构：
            - `showHeroSection` (type:boolean|null; required:no)
            - `postsPerPage` (type:integer|null; required:no)
            - `enableAnimations` (type:boolean|null; required:no)
            - `autoPlayVideos` (type:boolean|null; required:no)
            - `showImagePreviews` (type:boolean|null; required:no)
            - `cookieConsent` (type:boolean|null; required:no)
            - `analyticsEnabled` (type:boolean|null; required:no)
            - `functionalCookiesEnabled` (type:boolean|null; required:no)
            - `performanceCookiesEnabled` (type:boolean|null; required:no)
            - `dataCollection` (type:boolean|null; required:no)
            - `personalizedContent` (type:boolean|null; required:no)
  - 成功响应：
    - 200 JSON -> data:UserPreferencesResponse
      - data 字段结构：
            - `showHeroSection` (type:boolean; required:no; desc:显示首页横幅)
            - `postsPerPage` (type:integer; required:no; min=10.0; max=100.0; desc:每页帖子数量)
            - `enableAnimations` (type:boolean; required:no; desc:启用动画效果)
            - `autoPlayVideos` (type:boolean; required:no; desc:自动播放视频)
            - `showImagePreviews` (type:boolean; required:no; desc:显示图片预览)
            - `cookieConsent` (type:boolean|null; required:no; desc:Cookie 同意状态)
            - `analyticsEnabled` (type:boolean; required:no; desc:分析统计)
            - `functionalCookiesEnabled` (type:boolean; required:no; desc:功能性 Cookie)
            - `performanceCookiesEnabled` (type:boolean; required:no; desc:性能 Cookie)
            - `dataCollection` (type:boolean; required:no; desc:数据收集)
            - `personalizedContent` (type:boolean; required:no; desc:个性化内容)
            - `createdAt` (type:string; required:yes; desc:创建时间)
            - `updatedAt` (type:string; required:yes; desc:更新时间)
            - `lastSyncedAt` (type:string; required:yes; desc:最后同步时间)

- **POST /api/v1/preferences/sync** — Sync Preferences
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> PreferencesSyncRequest
      - 字段结构：
            - `preferences` (type:object; required:yes; desc:用户偏好设置基础模型)
            - `lastUpdated` (type:null|string; required:no; desc:客户端最后更新时间)
  - 成功响应：
    - 200 JSON -> data:PreferencesSyncResponse
      - data 字段结构：
            - `preferences` (type:object; required:yes; desc:用户偏好设置响应)
            - `synced` (type:boolean; required:yes; desc:是否已同步)
            - `conflictResolution` (type:null|string; required:no; desc:冲突解决方式)


### User-Devices

- **DELETE /api/v1/devices** — Revoke All Devices
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:object

- **GET /api/v1/devices** — List Devices
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:DeviceListResponse
      - data 字段结构：
            - `devices` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `current_fingerprint` (type:null|string; required:no)

- **GET /api/v1/devices/current** — Get Current Device
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:DeviceResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `fingerprint` (type:string; required:yes)
            - `device_name` (type:null|string; required:no)
            - `device_type` (type:string; required:yes)
            - `browser` (type:string; required:yes)
            - `os` (type:string; required:yes)
            - `is_trusted` (type:boolean; required:yes)
            - `is_current` (type:boolean; required:yes)
            - `login_count` (type:integer; required:yes)
            - `last_login_at` (type:null|string; required:no)
            - `last_ip` (type:null|string; required:no)
            - `first_seen_at` (type:null|string; required:no)
            - `ip_address` (type:null|string; required:no)
            - `last_active_at` (type:null|string; required:no)
            - `device_info` (type:null|string; required:no)

- **POST /api/v1/devices/rename** — Rename Device
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> RenameDeviceRequest
      - 字段结构：
            - `device_id` (type:integer; required:yes)
            - `device_name` (type:string; required:yes)
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/devices/trust** — Trust Device
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> TrustDeviceRequest
      - 字段结构：
            - `device_id` (type:integer; required:yes)
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/devices/untrust** — Untrust Device
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> TrustDeviceRequest
      - 字段结构：
            - `device_id` (type:integer; required:yes)
  - 成功响应：
    - 200 JSON -> data:object

- **DELETE /api/v1/devices/{device_id}** — Revoke Device
  - 认证：需要
  - 参数：
    - device_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:object


### User-Favorites

- **GET /api/v1/favorites/** — List Favorites
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=100
  - 说明：搜索结果仅包含用户可浏览范围内的帖子（未登录：单平台10条/多平台各平台15条；已登录非管理员：最多100条；管理员不限制）。
    - folder_name；in:query；type:null|string；required:no；desc:Filter by folder
    - tag；in:query；type:null|string；required:no；desc:Filter by tag
    - platform；in:query；type:null|string；required:no；desc:Filter by platform
    - sort_by；in:query；type:string；required:no；default:created_at
    - sort_order；in:query；type:string；required:no；default:desc；pattern=^(asc|desc)$
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse[FavoriteResponse]
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `total_pages` (type:integer; required:yes)

- **POST /api/v1/favorites/** — Create Favorite
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> FavoriteCreate
      - 字段结构：
            - `post_id` (type:string; required:yes)
            - `folder_name` (type:null|string; required:no)
            - `tags` (type:array|null; required:no)
            - `notes` (type:null|string; required:no)
  - 成功响应：
    - 201 JSON -> data:FavoriteResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `user_id` (type:integer; required:yes)
            - `post_id` (type:string; required:yes)
            - `folder_name` (type:null|string; required:no)
            - `tags_array` (type:array|null; required:no)
            - `notes` (type:null|string; required:no)
            - `created_at` (type:string; required:yes)
            - `post_title` (type:null|string; required:no)
            - `post_thumbnail` (type:null|string; required:no)
            - `post_platform` (type:null|string; required:no)

- **GET /api/v1/favorites/check/{post_id}** — Check Favorite
  - 认证：需要
  - 参数：
    - post_id；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:FavoriteCheckResponse
      - data 字段结构：
            - `is_favorited` (type:boolean; required:yes)
            - `favorite_id` (type:integer|null; required:no)

- **GET /api/v1/favorites/folders/list** — List Folders
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:Response List Folders Api V1 Favorites Folders List Get
      - data 字段结构：
            - items: object

- **GET /api/v1/favorites/tags/list** — List Tags
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:Response List Tags Api V1 Favorites Tags List Get
      - data 字段结构：
            - items: object

- **DELETE /api/v1/favorites/{favorite_id}** — Delete Favorite
  - 认证：需要
  - 参数：
    - favorite_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：
            - `message` (type:string; required:yes)
            - `success` (type:boolean; required:no)

- **GET /api/v1/favorites/{favorite_id}** — Get Favorite
  - 认证：需要
  - 参数：
    - favorite_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:FavoriteResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `user_id` (type:integer; required:yes)
            - `post_id` (type:string; required:yes)
            - `folder_name` (type:null|string; required:no)
            - `tags_array` (type:array|null; required:no)
            - `notes` (type:null|string; required:no)
            - `created_at` (type:string; required:yes)
            - `post_title` (type:null|string; required:no)
            - `post_thumbnail` (type:null|string; required:no)
            - `post_platform` (type:null|string; required:no)

- **PATCH /api/v1/favorites/{favorite_id}** — Update Favorite
  - 认证：需要
  - 参数：
    - favorite_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> FavoriteUpdate
      - 字段结构：
            - `folder_name` (type:null|string; required:no)
            - `tags` (type:array|null; required:no)
            - `notes` (type:null|string; required:no)
  - 成功响应：
    - 200 JSON -> data:FavoriteResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `user_id` (type:integer; required:yes)
            - `post_id` (type:string; required:yes)
            - `folder_name` (type:null|string; required:no)
            - `tags_array` (type:array|null; required:no)
            - `notes` (type:null|string; required:no)
            - `created_at` (type:string; required:yes)
            - `post_title` (type:null|string; required:no)
            - `post_thumbnail` (type:null|string; required:no)
            - `post_platform` (type:null|string; required:no)


### User-History

- **DELETE /api/v1/history/all** — Clear All History
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 204 No Content

- **DELETE /api/v1/history/browsing** — Clear Browsing History
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> Data
  - 成功响应：
    - 204 No Content

- **GET /api/v1/history/browsing** — Get Browsing History
  - 认证：需要
  - 参数：
    - content_type；in:query；type:null|string；required:no
    - limit；in:query；type:integer；required:no；default:20；min=1; max=100
    - offset；in:query；type:integer；required:no；default:0；min=0
    - include_preview；in:query；type:boolean；required:no；default:False；desc:Include content preview
  - 成功响应：
    - 200 JSON -> data:BrowsingHistoryListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)

- **POST /api/v1/history/browsing** — Create Browsing History
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> BrowsingHistoryCreate
      - 字段结构：
            - `content_type` (type:string; required:yes; pattern=^(post|author|media)$)
            - `content_id` (type:integer; required:yes)
            - `content_uuid` (type:null|string; required:no)
            - `source` (type:null|string; required:no)
            - `duration_seconds` (type:integer|null; required:no)
  - 成功响应：
    - 201 JSON -> data:BrowsingHistoryResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `content_type` (type:string; required:yes)
            - `content_id` (type:integer; required:yes)
            - `content_uuid` (type:null|string; required:no)
            - `source` (type:null|string; required:no)
            - `duration_seconds` (type:integer|null; required:no)
            - `created_at` (type:string; required:yes)
            - `content_preview` (type:null|object; required:no)

- **DELETE /api/v1/history/browsing/{history_id}** — Delete Browsing History
  - 认证：需要
  - 参数：
    - history_id；in:path；type:integer；required:yes
  - 成功响应：
    - 204 No Content

- **DELETE /api/v1/history/search** — Clear Search History
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> Data
  - 成功响应：
    - 204 No Content

- **GET /api/v1/history/search** — Get Search History
  - 认证：需要
  - 参数：
    - search_type；in:query；type:null|string；required:no
    - limit；in:query；type:integer；required:no；default:20；min=1; max=100
    - offset；in:query；type:integer；required:no；default:0；min=0
  - 成功响应：
    - 200 JSON -> data:SearchHistoryListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `suggestions` (type:array; required:no)

- **POST /api/v1/history/search** — Create Search History
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> SearchHistoryCreate
      - 字段结构：
            - `query` (type:string; required:yes; minLen=1; maxLen=500)
            - `search_type` (type:string; required:no; pattern=^(posts|authors|media)$)
            - `filters` (type:null|object; required:no)
            - `result_count` (type:integer|null; required:no)
  - 成功响应：
    - 201 JSON -> data:SearchHistoryResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `query` (type:string; required:yes)
            - `search_type` (type:string; required:yes)
            - `filters` (type:null|object; required:no)
            - `result_count` (type:integer; required:yes)
            - `created_at` (type:string; required:yes)

- **DELETE /api/v1/history/search/{history_id}** — Delete Search History
  - 认证：需要
  - 参数：
    - history_id；in:path；type:integer；required:yes
  - 成功响应：
    - 204 No Content

- **GET /api/v1/history/stats** — Get History Stats
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:object

- **GET /api/v1/history/my-comments** — 我的评论历史
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1；desc:页码
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50；desc:每页数量
  - 说明：获取当前用户在所有帖子下发表的评论列表，按时间倒序排列。适用于个人中心「我的评论」页面。
  - 成功响应：
    - 200 JSON -> data:MyCommentListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
                - items 每项字段：
                    - `id` (type:integer; required:yes; desc:评论ID)
                    - `post_id` (type:null|string; required:no; desc:所属帖子UUID)
                    - `post_title` (type:null|string; required:no; desc:所属帖子标题)
                    - `content` (type:string; required:yes; desc:评论内容)
                    - `like_count` (type:integer; required:yes; desc:获赞数)
                    - `reply_count` (type:integer; required:yes; desc:回复数)
                    - `created_at` (type:string; required:yes; desc:评论时间)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **GET /api/v1/history/my-likes** — 我的点赞历史
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1；desc:页码
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50；desc:每页数量
  - 说明：获取当前用户点赞过的所有评论列表，按点赞时间倒序排列。若被赞评论已删除，对应字段可能为 null。
  - 成功响应：
    - 200 JSON -> data:MyLikeListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
                - items 每项字段：
                    - `comment_id` (type:integer; required:yes; desc:被点赞的评论ID)
                    - `comment_content` (type:null|string; required:no; desc:评论内容摘要)
                    - `comment_author` (type:null|string; required:no; desc:评论作者昵称)
                    - `post_id` (type:null|string; required:no; desc:评论所属帖子UUID)
                    - `post_title` (type:null|string; required:no; desc:评论所属帖子标题)
                    - `liked_at` (type:string; required:yes; desc:点赞时间)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **GET /api/v1/history/my-comment-favorites** — 我的评论收藏
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1；desc:页码
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50；desc:每页数量
  - 说明：获取当前用户收藏的所有评论列表，按收藏时间倒序排列。若被收藏评论已删除，对应字段可能为 null。
  - 成功响应：
    - 200 JSON -> data:MyCommentFavoriteListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
                - items 每项字段：
                    - `comment_id` (type:integer; required:yes; desc:被收藏的评论ID)
                    - `comment_content` (type:null|string; required:no; desc:评论内容摘要)
                    - `comment_author` (type:null|string; required:no; desc:评论作者昵称)
                    - `post_id` (type:null|string; required:no; desc:评论所属帖子UUID)
                    - `post_title` (type:null|string; required:no; desc:评论所属帖子标题)
                    - `favorited_at` (type:string; required:yes; desc:收藏时间)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)


### User-Notifications

- **DELETE /api/v1/notifications** — Clear Notifications
  - 认证：需要
  - 参数：
    - read_only；in:query；type:boolean；required:no；default:True；desc:只清除已读通知
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：
            - `message` (type:string; required:yes)
            - `success` (type:boolean; required:no)

- **GET /api/v1/notifications** — List Notifications
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
    - type；in:query；type:null|string；required:no；desc:通知类型筛选
    - unread_only；in:query；type:boolean；required:no；default:False；desc:只显示未读
  - 成功响应：
    - 200 JSON -> data:NotificationListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `unread_count` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **POST /api/v1/notifications/read-all** — Mark All As Read
  - 认证：需要
  - 参数：
    - type；in:query；type:null|string；required:no；desc:只标记某类型
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：
            - `message` (type:string; required:yes)
            - `success` (type:boolean; required:no)

- **GET /api/v1/notifications/unread-count** — Get Unread Count
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:UnreadCountResponse
      - data 字段结构：
            - `unread_count` (type:integer; required:yes)

- **DELETE /api/v1/notifications/{notification_id}** — Delete Notification
  - 认证：需要
  - 参数：
    - notification_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：
            - `message` (type:string; required:yes)
            - `success` (type:boolean; required:no)

- **PATCH /api/v1/notifications/{notification_id}/read** — Mark As Read
  - 认证：需要
  - 参数：
    - notification_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:NotificationResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `uuid` (type:string; required:yes)
            - `type` (type:string; required:yes)
            - `title` (type:string; required:yes)
            - `content` (type:null|string; required:no)
            - `related_type` (type:null|string; required:no)
            - `related_id` (type:integer|null; required:no)
            - `is_read` (type:boolean; required:yes)
            - `created_at` (type:string; required:yes)
            - `read_at` (type:null|string; required:no)

## 4. Community API

### Community-Comments

- **POST /api/v1/comments/images** — Upload Comment Images
  - 认证：需要
  - 参数：无
  - 请求体：
    - multipart/form-data -> Body_upload_comment_images_api_v1_comments_images_post
      - 字段结构：
            - `files` (type:array; required:yes; desc:图片文件列表，最多9张)
  - 成功响应：
    - 200 JSON -> data:CommentImageUploadResponse
      - data 字段结构：
            - `images` (type:array; required:yes)
            - `message` (type:string; required:no)

- **DELETE /api/v1/comments/images/{image_id}** — Delete Comment Image
  - 认证：需要
  - 参数：
    - image_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:object

- **GET /api/v1/comments/images/{image_id}** — Get Comment Image
  - 认证：不需要
  - 参数：
    - image_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:CommentImageResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `uuid` (type:string; required:yes)
            - `url` (type:string; required:yes)
            - `filename` (type:string; required:yes)
            - `file_size` (type:integer; required:yes)
            - `mime_type` (type:string; required:yes)
            - `width` (type:integer; required:yes)
            - `height` (type:integer; required:yes)
            - `sort_order` (type:integer; required:no)
            - `created_at` (type:string; required:yes)

- **GET /api/v1/comments/post/{post_uuid}** — 获取帖子评论列表
  - 认证：需要
  - 参数：
    - post_uuid；in:path；type:string；required:yes
    - page；in:query；type:integer；required:no；default:1；min=1；desc:页码，从1开始
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50；desc:每页数量，最大50
    - sort；in:query；type:string；required:no；default:popular；pattern=^(newest|oldest|popular)$；desc:排序方式: newest(最新), oldest(最早), popular(热门)
  - 成功响应：
    - 200 JSON -> data:CommentListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **POST /api/v1/comments/post/{post_uuid}** — Create Comment
  - 认证：需要
  - 参数：
    - post_uuid；in:path；type:string；required:yes
  - 请求体：
    - application/json -> CommentCreate
      - 字段结构：
            - `content` (type:string; required:yes; minLen=1; maxLen=2000)
            - `parent_id` (type:integer|null; required:no; desc:父评论ID（回复时使用）)
            - `image_ids` (type:array|null; required:no; desc:图片ID列表，最多9张)
  - 成功响应：
    - 201 JSON -> data:CommentResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `uuid` (type:string; required:yes)
            - `content` (type:string; required:yes)
            - `user` (type:object; required:yes; desc:评论用户信息)
            - `post_id` (type:integer; required:yes)
            - `parent_id` (type:integer|null; required:no)
            - `like_count` (type:integer; required:yes)
            - `reply_count` (type:integer; required:yes)
            - `image_count` (type:integer; required:no)
            - `images` (type:array; required:no)
            - `is_liked` (type:boolean; required:no)
            - `is_favorited` (type:boolean; required:no)
            - `is_thread_owner` (type:boolean; required:no)
            - `replied_to_user` (type:null|object; required:no)
            - `replies` (type:array; required:no)
            - `created_at` (type:string; required:yes)
            - `updated_at` (type:null|string; required:no)

- **DELETE /api/v1/comments/{comment_id}** — 删除评论
  - 认证：需要
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 成功响应：
    - 204 No Content

- **PUT /api/v1/comments/{comment_id}** — 编辑评论
  - 认证：需要
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> CommentUpdate
      - 字段结构：
            - `content` (type:string; required:yes; minLen=1; maxLen=2000)
  - 成功响应：
    - 200 JSON -> data:CommentResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `uuid` (type:string; required:yes)
            - `content` (type:string; required:yes)
            - `user` (type:object; required:yes; desc:评论用户信息)
            - `post_id` (type:integer; required:yes)
            - `parent_id` (type:integer|null; required:no)
            - `like_count` (type:integer; required:yes)
            - `reply_count` (type:integer; required:yes)
            - `image_count` (type:integer; required:no)
            - `images` (type:array; required:no)
            - `is_liked` (type:boolean; required:no)
            - `is_favorited` (type:boolean; required:no)
            - `is_thread_owner` (type:boolean; required:no)
            - `replied_to_user` (type:null|object; required:no)
            - `replies` (type:array; required:no)
            - `created_at` (type:string; required:yes)
            - `updated_at` (type:null|string; required:no)

- **DELETE /api/v1/comments/{comment_id}/favorite** — 取消收藏
  - 认证：需要
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/comments/{comment_id}/favorite** — 收藏评论
  - 认证：需要
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 成功响应：
    - 201 JSON -> data:object

- **DELETE /api/v1/comments/{comment_id}/like** — 取消点赞
  - 认证：需要
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/comments/{comment_id}/like** — 点赞评论
  - 认证：需要
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 成功响应：
    - 201 JSON -> data:object

- **GET /api/v1/comments/{comment_id}/replies** — 获取评论回复列表
  - 认证：需要
  - 参数：
    - comment_id；in:path；type:integer；required:yes
    - page；in:query；type:integer；required:no；default:1；min=1；desc:页码
    - page_size；in:query；type:integer；required:no；default:10；min=1; max=50；desc:每页数量
  - 成功响应：
    - 200 JSON -> data:CommentListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **POST /api/v1/comments/{comment_id}/report** — 举报评论
  - 认证：需要
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> ReportCreate
      - 字段结构：
            - `reason` (type:string; required:yes; minLen=1; maxLen=100)
            - `description` (type:null|string; required:no)
  - 成功响应：
    - 201 JSON -> data:object

- **GET /api/v1/comments/{comment_id}/thread** — 获取评论线索链
  - 认证：可选（支持匿名）
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 说明：获取从根评论到当前评论的完整线索链。用于评论上下文跳转场景。
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `post_id` (type:null|string; required:no; desc:评论所属帖子UUID)
            - `thread` (type:array; required:yes; desc:从顶级评论到目标评论的有序数组，每项为 CommentResponse)
            - `depth` (type:integer; required:yes; desc:线索链深度，1=顶级评论本身)
  - 错误响应：
    - 404: 评论不存在


### Community-Discussions

- **GET /api/v1/discussions/** — 获取讨论列表
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
    - category；in:query；type:null|string；required:no
    - sort；in:query；type:string；required:no；default:latest；pattern=^(latest|popular|active)$
  - 成功响应：
    - 200 JSON -> data:DiscussionListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **GET /api/v1/discussions/search** — 搜索讨论
  - 认证：可选（支持匿名）
  - 参数：
    - q；in:query；type:string；required:yes；minLen=1; maxLen=100；desc:搜索关键词
    - category；in:query；type:null|string；required:no；pattern=^(general|question|sharing|feedback)$
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
  - 说明：支持标题和内容模糊匹配。
  - 成功响应：
    - 200 JSON -> data:DiscussionListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **POST /api/v1/discussions/** — 发起讨论
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> DiscussionCreate
      - 字段结构：
            - `title` (type:string; required:yes; minLen=2; maxLen=200)
            - `content` (type:string; required:yes; minLen=10; maxLen=10000)
            - `category` (type:string; required:no; pattern=^(general|question|sharing|feedback)$)
            - `tags` (type:array|null; required:no)
            - `referenced_post_id` (type:null|string; required:no; desc:引用的帖子UUID（可选）)
  - 成功响应：
    - 201 JSON -> data:DiscussionResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `uuid` (type:string; required:yes)
            - `title` (type:string; required:yes)
            - `content` (type:string; required:yes)
            - `category` (type:string; required:yes)
            - `tags` (type:array; required:yes)
            - `user` (type:object; required:yes)
            - `view_count` (type:integer; required:yes)
            - `like_count` (type:integer; required:yes)
            - `comment_count` (type:integer; required:yes)
            - `is_pinned` (type:boolean; required:yes)
            - `is_closed` (type:boolean; required:yes)
            - `is_liked` (type:boolean; required:no)
            - `referenced_post` (type:null|object; required:no)
            - `created_at` (type:string; required:yes)
            - `updated_at` (type:null|string; required:no)
            - `last_activity_at` (type:string; required:yes)

- **DELETE /api/v1/discussions/comments/{comment_id}** — 删除评论
  - 认证：需要
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 成功响应：
    - 204 No Content

- **PUT /api/v1/discussions/comments/{comment_id}** — 编辑评论
  - 认证：需要
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> CommentUpdate
      - 字段结构：
            - `content` (type:string; required:yes; minLen=1; maxLen=2000)
  - 成功响应：
    - 200 JSON -> data:DiscussionCommentResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `uuid` (type:string; required:yes)
            - `content` (type:string; required:yes)
            - `user` (type:object; required:yes)
            - `discussion_id` (type:integer; required:yes)
            - `parent_id` (type:integer|null; required:no)
            - `like_count` (type:integer; required:yes)
            - `reply_count` (type:integer; required:yes)
            - `is_liked` (type:boolean; required:no)
            - `is_pinned` (type:boolean; required:yes)
            - `is_featured` (type:boolean; required:yes)
            - `created_at` (type:string; required:yes)
            - `updated_at` (type:null|string; required:no)

- **GET /api/v1/discussions/comments/{comment_id}** — 获取评论详情
  - 认证：需要
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:DiscussionCommentResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `uuid` (type:string; required:yes)
            - `content` (type:string; required:yes)
            - `user` (type:object; required:yes)
            - `discussion_id` (type:integer; required:yes)
            - `parent_id` (type:integer|null; required:no)
            - `like_count` (type:integer; required:yes)
            - `reply_count` (type:integer; required:yes)
            - `is_liked` (type:boolean; required:no)
            - `is_pinned` (type:boolean; required:yes)
            - `is_featured` (type:boolean; required:yes)
            - `created_at` (type:string; required:yes)
            - `updated_at` (type:null|string; required:no)

- **DELETE /api/v1/discussions/comments/{comment_id}/like** — 取消点赞
  - 认证：需要
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/discussions/comments/{comment_id}/like** — 点赞评论
  - 认证：需要
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 成功响应：
    - 201 JSON -> data:object

- **POST /api/v1/discussions/comments/{comment_id}/report** — 举报讨论评论
  - 认证：可选（支持匿名）
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> DiscussionCommentReportCreate
      - 字段结构：
            - `reason` (type:string; required:yes; minLen=1; maxLen=100)
            - `description` (type:null|string; required:no)
  - 成功响应：
    - 201 JSON -> data:object

- **POST /api/v1/discussions/comments/{comment_id}/pin** — 置顶评论（管理员）
  - 认证：需要（管理员）
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:object

- **DELETE /api/v1/discussions/comments/{comment_id}/pin** — 取消置顶评论（管理员）
  - 认证：需要（管理员）
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/discussions/comments/{comment_id}/feature** — 精选评论（管理员）
  - 认证：需要（管理员）
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:object

- **DELETE /api/v1/discussions/comments/{comment_id}/feature** — 取消精选评论（管理员）
  - 认证：需要（管理员）
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:object

- **GET /api/v1/discussions/comments/{comment_id}/replies** — 获取评论回复
  - 认证：需要
  - 参数：
    - comment_id；in:path；type:integer；required:yes
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
  - 成功响应：
    - 200 JSON -> data:CommentListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
                - items 每项字段同 DiscussionCommentResponse
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **GET /api/v1/discussions/user/my-comments** — 我的讨论评论
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
  - 成功响应：
    - 200 JSON -> data:CommentListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
                - items 每项字段同 DiscussionCommentResponse
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **GET /api/v1/discussions/user/my-discussions** — 我发起的讨论
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
  - 成功响应：
    - 200 JSON -> data:DiscussionListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **DELETE /api/v1/discussions/{discussion_uuid}** — 删除讨论
  - 认证：需要
  - 参数：
    - discussion_uuid；in:path；type:string；required:yes
  - 成功响应：
    - 204 No Content

- **GET /api/v1/discussions/{discussion_uuid}** — 获取讨论详情
  - 认证：需要
  - 参数：
    - discussion_uuid；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:DiscussionResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `uuid` (type:string; required:yes)
            - `title` (type:string; required:yes)
            - `content` (type:string; required:yes)
            - `category` (type:string; required:yes)
            - `tags` (type:array; required:yes)
            - `user` (type:object; required:yes)
            - `view_count` (type:integer; required:yes)
            - `like_count` (type:integer; required:yes)
            - `comment_count` (type:integer; required:yes)
            - `is_pinned` (type:boolean; required:yes)
            - `is_closed` (type:boolean; required:yes)
            - `is_liked` (type:boolean; required:no)
            - `referenced_post` (type:null|object; required:no)
            - `created_at` (type:string; required:yes)
            - `updated_at` (type:null|string; required:no)
            - `last_activity_at` (type:string; required:yes)

- **PUT /api/v1/discussions/{discussion_uuid}** — 编辑讨论
  - 认证：需要
  - 参数：
    - discussion_uuid；in:path；type:string；required:yes
  - 请求体：
    - application/json -> DiscussionUpdate
      - 字段结构：
            - `title` (type:null|string; required:no)
            - `content` (type:null|string; required:no)
            - `category` (type:null|string; required:no)
            - `tags` (type:array|null; required:no)
            - `is_closed` (type:boolean|null; required:no)
            - `referenced_post_id` (type:null|string; required:no; desc:引用的帖子UUID（可选）)
  - 成功响应：
    - 200 JSON -> data:DiscussionResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `uuid` (type:string; required:yes)
            - `title` (type:string; required:yes)
            - `content` (type:string; required:yes)
            - `category` (type:string; required:yes)
            - `tags` (type:array; required:yes)
            - `user` (type:object; required:yes)
            - `view_count` (type:integer; required:yes)
            - `like_count` (type:integer; required:yes)
            - `comment_count` (type:integer; required:yes)
            - `is_pinned` (type:boolean; required:yes)
            - `is_closed` (type:boolean; required:yes)
            - `is_liked` (type:boolean; required:no)
            - `referenced_post` (type:null|object; required:no)
            - `created_at` (type:string; required:yes)
            - `updated_at` (type:null|string; required:no)
            - `last_activity_at` (type:string; required:yes)

- **GET /api/v1/discussions/{discussion_uuid}/comments** — 获取讨论评论
  - 认证：需要
  - 参数：
    - discussion_uuid；in:path；type:string；required:yes
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
    - sort；in:query；type:string；required:no；default:newest；pattern=^(newest|oldest|popular)$
    - sort_by；in:query；type:string；required:no；pattern=^(newest|oldest|popular|created_at|like_count)$
    - preload_replies；in:query；type:integer；required:no；default:0；min=0; max=5；desc:预加载每条评论前 N 条回复
    - author_only；in:query；type:boolean；required:no；default:false；desc:仅讨论作者评论
    - admin_only；in:query；type:boolean；required:no；default:false；desc:仅管理员评论
    - filter；in:query；type:string；required:no；pattern=^(author|admin)$；desc:过滤别名，等同 author_only/admin_only
  - 成功响应：
    - 200 JSON -> data:CommentListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
                - items 每项字段同 DiscussionCommentResponse，另包含 `replies` (type:null|array; required:no; desc:仅 preload_replies>0 时返回，最多 N 条)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **POST /api/v1/discussions/{discussion_uuid}/comments** — 发表评论
  - 认证：需要
  - 参数：
    - discussion_uuid；in:path；type:string；required:yes
  - 请求体：
    - application/json -> CommentCreate
      - 字段结构：
            - `content` (type:string; required:yes; minLen=1; maxLen=2000)
            - `parent_id` (type:integer|null; required:no)
  - 成功响应：
    - 201 JSON -> data:DiscussionCommentResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `uuid` (type:string; required:yes)
            - `content` (type:string; required:yes)
            - `user` (type:object; required:yes)
            - `discussion_id` (type:integer; required:yes)
            - `parent_id` (type:integer|null; required:no)
            - `like_count` (type:integer; required:yes)
            - `reply_count` (type:integer; required:yes)
            - `is_liked` (type:boolean; required:no)
            - `is_pinned` (type:boolean; required:yes)
            - `is_featured` (type:boolean; required:yes)
            - `created_at` (type:string; required:yes)
            - `updated_at` (type:null|string; required:no)

- **DELETE /api/v1/discussions/{discussion_uuid}/like** — 取消点赞
  - 认证：需要
  - 参数：
    - discussion_uuid；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/discussions/{discussion_uuid}/like** — 点赞讨论
  - 认证：需要
  - 参数：
    - discussion_uuid；in:path；type:string；required:yes
  - 成功响应：
    - 201 JSON -> data:object

- **DELETE /api/v1/discussions/{discussion_uuid}/pin** — 取消置顶讨论（管理员）
  - 认证：需要
  - 参数：
    - discussion_uuid；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/discussions/{discussion_uuid}/pin** — 置顶讨论（管理员）
  - 认证：需要
  - 参数：
    - discussion_uuid；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:object

- **GET /api/v1/discussions/{discussion_uuid}/comments/{comment_id}/thread** — 获取讨论评论线索链
  - 认证：可选（支持匿名）
  - 参数：
    - discussion_uuid；in:path；type:string；required:yes
    - comment_id；in:path；type:integer；required:yes
  - 说明：获取讨论评论从根评论到当前评论的完整线索链。
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `discussion_id` (type:string; required:yes; desc:讨论UUID)
            - `thread` (type:array; required:yes; desc:从顶级评论到目标评论的有序数组，每项为 DiscussionCommentResponse)
            - `depth` (type:integer; required:yes; desc:线索链深度)
  - 错误响应：
    - 404: 讨论或评论不存在


### Community-Feed

- **GET /api/v1/community/favorites** — 获取收藏的评论
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1；desc:页码
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50；desc:每页数量
  - 成功响应：
    - 200 JSON -> data:CommunityListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **GET /api/v1/community/hot** — 获取热门话题
  - 认证：需要
  - 参数：
    - limit；in:query；type:integer；required:no；default:10；min=1; max=20；desc:返回数量
    - days；in:query；type:integer；required:no；default:7；min=1; max=30；desc:统计最近N天的数据
  - 成功响应：
    - 200 JSON -> data:Response Get Hot Topics Api V1 Community Hot Get
      - data 字段结构：
            - items: object

- **GET /api/v1/community/latest** — 获取最新讨论
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1；desc:页码
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50；desc:每页数量
  - 成功响应：
    - 200 JSON -> data:CommunityListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **GET /api/v1/community/my-comments** — 获取我的评论
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1；desc:页码
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50；desc:每页数量
  - 成功响应：
    - 200 JSON -> data:CommunityListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **GET /api/v1/community/my-likes** — 获取我点赞的评论
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1；desc:页码
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50；desc:每页数量
  - 成功响应：
    - 200 JSON -> data:CommunityListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **GET /api/v1/community/stats** — 获取社区统计
  - 认证：不需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:CommunityStatsResponse
      - data 字段结构：
            - `total_comments` (type:integer; required:yes)
            - `total_users` (type:integer; required:yes)
            - `comments_today` (type:integer; required:yes)
            - `hot_topics_count` (type:integer; required:yes)


### Community-Relations

- **GET /api/v1/users/me/blocked** — Get Blocked Users
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
  - 成功响应：
    - 200 JSON -> data:FollowListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **DELETE /api/v1/users/{user_id}/block** — Unblock User
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：
            - `message` (type:string; required:yes)
            - `success` (type:boolean; required:no)

- **POST /api/v1/users/{user_id}/block** — Block User
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：
            - `message` (type:string; required:yes)
            - `success` (type:boolean; required:no)

- **DELETE /api/v1/users/{user_id}/follow** — Unfollow User
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：
            - `message` (type:string; required:yes)
            - `success` (type:boolean; required:no)

- **POST /api/v1/users/{user_id}/follow** — Follow User
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：
            - `message` (type:string; required:yes)
            - `success` (type:boolean; required:no)

- **GET /api/v1/users/{user_id}/followers** — Get Followers
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
  - 成功响应：
    - 200 JSON -> data:FollowListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **GET /api/v1/users/{user_id}/following** — Get Following
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
  - 成功响应：
    - 200 JSON -> data:FollowListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **GET /api/v1/users/{user_id}/profile** — Get User Public Profile
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:UserProfileResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `username` (type:string; required:yes)
            - `avatar_url` (type:null|string; required:no)
            - `bio` (type:null|string; required:no)
            - `created_at` (type:string; required:yes)
            - `follower_count` (type:integer; required:yes)
            - `following_count` (type:integer; required:yes)
            - `is_following` (type:boolean; required:no)
            - `is_followed_by` (type:boolean; required:no)
            - `is_blocking` (type:boolean; required:no)
            - `is_blocked_by` (type:boolean; required:no)

- **GET /api/v1/users/{user_id}/relation** — Get Relation Status
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:RelationStatusResponse
      - data 字段结构：
            - `is_following` (type:boolean; required:yes)
            - `is_followed_by` (type:boolean; required:yes)
            - `is_blocking` (type:boolean; required:yes)
            - `is_blocked_by` (type:boolean; required:yes)


### Community-Reports

- **GET /api/v1/reports** — List Reports
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=100
  - 说明：搜索结果仅包含用户可浏览范围内的帖子（未登录：单平台10条/多平台各平台15条；已登录非管理员：最多100条；管理员不限制）。
    - status；in:query；type:null|string；required:no；desc:状态筛选
    - target_type；in:query；type:null|string；required:no；desc:目标类型筛选
  - 成功响应：
    - 200 JSON -> data:ReportListResponse
      - data 字段结构：
            - `items` (type:array; required:yes)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `has_more` (type:boolean; required:yes)

- **POST /api/v1/reports** — Create Report
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> ReportCreate
      - 字段结构：
            - `target_type` (type:string; required:yes; desc:举报目标类型: comment, post, user)
            - `target_id` (type:integer; required:yes; desc:举报目标ID)
            - `reason` (type:string; required:yes; minLen=1; maxLen=100; desc:举报原因)
            - `description` (type:null|string; required:no; desc:详细描述)
  - 成功响应：
    - 201 JSON -> data:ReportResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `uuid` (type:string; required:yes)
            - `target_type` (type:string; required:yes)
            - `target_id` (type:integer; required:yes)
            - `reason` (type:string; required:yes)
            - `description` (type:null|string; required:no)
            - `status` (type:string; required:yes)
            - `created_at` (type:string; required:yes)

- **GET /api/v1/reports/my** — Get My Reports
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
  - 成功响应：
    - 200 JSON -> data:Response Get My Reports Api V1 Reports My Get
      - data 字段结构：
            - items: object

- **GET /api/v1/reports/stats/summary** — Get Report Stats
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:ReportStatsResponse
      - data 字段结构：
            - `total` (type:integer; required:no)
            - `pending` (type:integer; required:no)
            - `resolved` (type:integer; required:no)
            - `rejected` (type:integer; required:no)
            - `by_type` (type:object; required:no)
            - `by_reason` (type:object; required:no)

- **GET /api/v1/reports/{report_id}** — Get Report
  - 认证：需要
  - 参数：
    - report_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:ReportDetailResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `uuid` (type:string; required:yes)
            - `target_type` (type:string; required:yes)
            - `target_id` (type:integer; required:yes)
            - `reason` (type:string; required:yes)
            - `description` (type:null|string; required:no)
            - `status` (type:string; required:yes)
            - `created_at` (type:string; required:yes)
            - `user_id` (type:integer|null; required:no)
            - `reporter_username` (type:null|string; required:no)
            - `reviewed_by` (type:integer|null; required:no)
            - `reviewer_username` (type:null|string; required:no)
            - `reviewed_at` (type:null|string; required:no)
            - `resolution_note` (type:null|string; required:no)

- **PATCH /api/v1/reports/{report_id}** — Review Report
  - 认证：需要
  - 参数：
    - report_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> ReportReview
      - 字段结构：
            - `status` (type:string; required:yes; desc:处理状态: reviewed, resolved, rejected)
            - `resolution_note` (type:null|string; required:no; desc:处理备注)
  - 成功响应：
    - 200 JSON -> data:ReportDetailResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `uuid` (type:string; required:yes)
            - `target_type` (type:string; required:yes)
            - `target_id` (type:integer; required:yes)
            - `reason` (type:string; required:yes)
            - `description` (type:null|string; required:no)
            - `status` (type:string; required:yes)
            - `created_at` (type:string; required:yes)
            - `user_id` (type:integer|null; required:no)
            - `reporter_username` (type:null|string; required:no)
            - `reviewed_by` (type:integer|null; required:no)
            - `reviewer_username` (type:null|string; required:no)
            - `reviewed_at` (type:null|string; required:no)
            - `resolution_note` (type:null|string; required:no)


### Community-Feedback

- **POST /api/v1/feedback** — Submit Feedback
  - 认证：需要
  - 参数：无
  - 请求体：
    - multipart/form-data -> Body_submit_feedback_api_v1_feedback_post
      - 字段结构：
            - `message` (type:string; required:yes)
            - `contact` (type:null|string; required:no)
            - `category` (type:null|string; required:no)
            - `fingerprint` (type:null|string; required:no)
            - `attachment` (type:null|string; required:no)
  - 成功响应：
    - 200 JSON -> data:FeedbackResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `uuid` (type:string; required:yes)
            - `message` (type:string; required:yes)
            - `contact` (type:null|string; required:no)
            - `category` (type:null|string; required:no)
            - `attachment_url` (type:null|string; required:no)
            - `is_anonymous` (type:boolean; required:yes)
            - `created_at` (type:string; required:yes)


### Community-Contact

- **POST /api/v1/contact/send** — Send Contact
  - 认证：不需要
  - 参数：无
  - 请求体：
    - application/json -> ContactRequest
      - 字段结构：
            - `name` (type:null|string; required:no)
            - `email` (type:null|string; required:no)
            - `subject` (type:null|string; required:no)
            - `message` (type:string; required:yes; minLen=1; maxLen=2000)
  - 成功响应：
    - 200 JSON -> data:ContactResponse
      - data 字段结构：
            - `success` (type:boolean; required:yes)
            - `message` (type:null|string; required:no)

## 5. Admin API

> 以下接口均需要管理员权限（`require_admin` 或 `get_current_admin_user`），未登录返回 401，非管理员返回 403。

### Admin-Management

- **GET /api/v1/admin/health/detailed** — 系统详细健康检查
  - 认证：需要（管理员）
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `status` (type:string; required:yes; desc:healthy|unhealthy|warning)
            - `timestamp` (type:string; required:yes)
            - `checks` (type:object; required:yes; desc:包含 database、redis、system 子检查)

- **GET /api/v1/admin/db/health** — 数据库健康检查
  - 认证：需要（管理员）
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `timestamp` (type:string; required:yes)
            - `healthy` (type:boolean; required:yes)
            - `issues` (type:array; required:yes)
            - `stats` (type:object; required:yes; desc:connections、blocked_locks、timeout_settings 等)

- **POST /api/v1/admin/db/kill-connection/{pid}** — 终止数据库连接
  - 认证：需要（管理员）
  - 参数：
    - pid；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `success` (type:boolean; required:yes)
            - `message` (type:string; required:yes)

- **GET /api/v1/admin/stats/system** — 系统统计
  - 认证：需要（管理员）
  - 参数：无
  - 说明：返回数据库统计、用户统计、内容统计、存储统计。缓存60秒。
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `database` (type:object; required:yes; desc:total_users, active_users_7d, total_posts, total_media_files, total_authors, total_favorites)
            - `content` (type:object; required:yes; desc:recent_posts_24h, platform_distribution)
            - `storage` (type:object; required:yes; desc:total_size_bytes, total_size_gb)
            - `timestamp` (type:string; required:yes)

- **GET /api/v1/admin/stats/performance** — 系统性能指标
  - 认证：需要（管理员）
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `cpu` (type:object; required:yes; desc:usage_percent, count)
            - `memory` (type:object; required:yes; desc:total_mb, available_mb, used_mb, percent)
            - `disk` (type:object; required:yes; desc:total_gb, used_gb, free_gb, percent)
            - `network` (type:object; required:yes; desc:bytes_sent, bytes_recv, packets_sent, packets_recv)
            - `timestamp` (type:string; required:yes)

- **GET /api/v1/admin/cache/stats** — Redis 缓存统计
  - 认证：需要（管理员）
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `status` (type:string; required:yes; desc:active|disabled|error)
            - `server` (type:object; required:no; desc:redis_version, uptime_days, connected_clients)
            - `memory` (type:object; required:no; desc:used_memory_mb, maxmemory_mb, memory_fragmentation_ratio)
            - `stats` (type:object; required:no; desc:total_commands_processed, keyspace_hits, keyspace_misses, hit_rate)

- **POST /api/v1/admin/cache/clear** — 清除缓存
  - 认证：需要（管理员）
  - 参数：
    - pattern；in:query；type:null|string；required:no；desc:匹配模式（如 "api:posts:*"），为空则清除全部
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `success` (type:boolean; required:yes)
            - `message` (type:string; required:yes)
            - `keys_deleted` (type:integer|string; required:yes)

- **GET /api/v1/admin/logs/recent** — 获取最近日志
  - 认证：需要（管理员）
  - 参数：
    - lines；in:query；type:integer；required:no；default:100；max=1000
    - level；in:query；type:null|string；required:no；desc:日志级别过滤（DEBUG|INFO|WARNING|ERROR|CRITICAL）
    - search；in:query；type:null|string；required:no；desc:搜索关键词
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `success` (type:boolean; required:yes)
            - `total_lines` (type:integer; required:yes)
            - `logs` (type:array; required:yes; desc:每项包含 raw, timestamp, level, message)

- **GET /api/v1/admin/feedbacks** — 反馈列表
  - 认证：需要（管理员）
  - 参数：
    - page；in:query；type:integer；required:no；default:1
    - page_size；in:query；type:integer；required:no；default:20；max=100
    - category；in:query；type:null|string；required:no
    - has_attachment；in:query；type:null|boolean；required:no
    - is_anonymous；in:query；type:null|boolean；required:no
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `items` (type:array; required:yes; desc:每项包含 id, uuid, message, contact, category, attachment_url, is_anonymous, user_id, ip_address, fingerprint, user_agent, attachment_mime, attachment_size, created_at)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)
            - `total` (type:integer; required:yes)

- **GET /api/v1/admin/feedbacks/{feedback_id}** — 反馈详情
  - 认证：需要（管理员）
  - 参数：
    - feedback_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:object（字段同反馈列表每项）
  - 错误响应：
    - 404: Feedback not found

- **GET /api/v1/admin/metrics** — 系统指标概览
  - 认证：需要（管理员）
  - 参数：无
  - 说明：高层级系统指标，包含用户/帖子计数、今日活跃用户、数据库连接池状态、Redis 健康。缓存30秒。
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `total_users` (type:integer; required:yes)
            - `total_posts` (type:integer; required:yes)
            - `total_authors` (type:integer; required:yes)
            - `today_active` (type:integer; required:yes)
            - `db_pool` (type:object; required:yes; desc:size, checked_in, checked_out, overflow)
            - `redis` (type:object; required:yes)


### Admin-Crawler

- **GET /api/v1/crawler/status** — 爬虫系统状态
  - 认证：需要（管理员）
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `status` (type:string; required:yes; desc:operational|error)
            - `celery_available` (type:boolean; required:yes)
            - `workers` (type:object; required:yes; desc:count, active, stats)
            - `tasks` (type:object; required:yes; desc:active_count, registered)

- **POST /api/v1/crawler/tasks** — 创建爬虫任务
  - 认证：需要（管理员）
  - 参数：无
  - 请求体：
    - application/json -> CrawlerTaskCreate
      - 字段结构：
            - `platform` (type:string; required:yes; desc:tiktok|twitter|instagram|youtube)
            - `target` (type:string; required:yes; maxLen=500; desc:用户名、频道ID或URL)
            - `task_type` (type:string; required:no; default:user; desc:user|post|hashtag)
            - `options` (type:null|object; required:no)
  - 成功响应：
    - 200 JSON -> data:CrawlerTaskResponse
      - data 字段结构：
            - `task_id` (type:string; required:yes)
            - `platform` (type:string; required:yes)
            - `target` (type:string; required:yes)
            - `status` (type:string; required:yes; desc:pending|running|completed|failed)
            - `message` (type:null|string; required:no)
  - 错误响应：
    - 409: 平台已有任务在运行

- **GET /api/v1/crawler/tasks/{task_id}** — 获取任务状态
  - 认证：需要（管理员）
  - 参数：
    - task_id；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `task_id` (type:string; required:yes)
            - `status` (type:string; required:yes)
            - `ready` (type:boolean; required:yes)
            - `successful` (type:boolean|null; required:no)
            - `result` (type:object|null; required:no)
            - `error` (type:string|null; required:no)

- **POST /api/v1/crawler/tasks/{task_id}/cancel** — 取消任务
  - 认证：需要（管理员）
  - 参数：
    - task_id；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `success` (type:boolean; required:yes)
            - `task_id` (type:string; required:yes)
            - `message` (type:string; required:yes)

- **GET /api/v1/crawler/tasks** — 任务列表
  - 认证：需要（管理员）
  - 参数：
    - status_filter；in:query；type:null|string；required:no
    - limit；in:query；type:integer；required:no；default:50；min=1; max=200
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `tasks` (type:array; required:yes; desc:每项包含 task_id, name, args, status, worker, time_start)
            - `total` (type:integer; required:yes)
            - `limit` (type:integer; required:yes)

- **GET /api/v1/crawler/config** — 获取爬虫配置
  - 认证：需要（管理员）
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `platforms` (type:object; required:yes; desc:各平台 enabled, rate_limit, concurrent_tasks)
            - `general` (type:object; required:yes; desc:retry_attempts, retry_delay_seconds, timeout_seconds)

- **PUT /api/v1/crawler/config** — 更新爬虫配置
  - 认证：需要（管理员）
  - 参数：无
  - 请求体：
    - application/json -> object（深度合并到现有配置）
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `success` (type:boolean; required:yes)
            - `message` (type:string; required:yes)
            - `config` (type:object; required:yes; desc:合并后的完整配置)

- **GET /api/v1/crawler/platforms/status** — 各平台运行状态
  - 认证：需要（管理员）
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `platforms` (type:array; required:yes; desc:每项包含 platform, is_running, current_task_id, last_run_at, last_success_at, last_error_at, last_error_message, total_runs, success_count, error_count, success_rate, last_duration_sec, next_run_at)


### Admin-Processor

- **POST /api/v1/processor/scan** — 触发文件扫描
  - 认证：需要（管理员）
  - 参数：无
  - 请求体：
    - application/json -> ScanRequest
      - 字段结构：
            - `platform` (type:null|string; required:no; desc:指定平台，null=全部)
            - `hours` (type:null|integer; required:no; desc:最近N小时，null=全量)
  - 成功响应：
    - 200 JSON -> data:ScanResponse
      - data 字段结构：
            - `task_id` (type:string; required:yes)
            - `status` (type:string; required:yes)
            - `message` (type:string; required:yes)

- **POST /api/v1/processor/scan/failed** — 重新处理失败文件
  - 认证：需要（管理员）
  - 参数：
    - limit；in:query；type:integer；required:no；default:100；min=1; max=1000
  - 成功响应：
    - 200 JSON -> data:ScanResponse

- **GET /api/v1/processor/stats** — 处理统计
  - 认证：需要（管理员）
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:ProcessStatsResponse
      - data 字段结构：
            - `total_files` (type:integer; required:yes)
            - `processed` (type:integer; required:yes)
            - `failed` (type:integer; required:yes)
            - `pending` (type:integer; required:yes)

- **GET /api/v1/processor/tasks/{task_id}** — 处理任务状态
  - 认证：需要（管理员）
  - 参数：
    - task_id；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `task_id` (type:string; required:yes)
            - `status` (type:string; required:yes)
            - `ready` (type:boolean; required:yes)
            - `successful` (type:boolean|null; required:no)
            - `result` (type:object|null; required:no)
            - `error` (type:string|null; required:no)

- **GET /api/v1/processor/watcher/status** — 文件监控器状态
  - 认证：需要（管理员）
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:object
      - data 字段结构：
            - `status` (type:string; required:yes; desc:running|stopped|unavailable)
            - `watching` (type:string; required:no; desc:监控目录路径)
            - `is_alive` (type:boolean; required:no)


### Admin-Roles

- **POST /api/v1/roles** — 创建角色
  - 认证：需要（管理员）
  - 参数：无
  - 请求体：
    - application/json -> RoleCreate
      - 字段结构：
            - `name` (type:string; required:yes; desc:角色名称，唯一)
            - `display_name` (type:string; required:yes)
            - `description` (type:null|string; required:no)
            - `permissions` (type:array; required:no; desc:权限列表)
  - 成功响应：
    - 201 JSON -> data:RoleResponse
      - data 字段结构：
            - `id` (type:integer; required:yes)
            - `name` (type:string; required:yes)
            - `display_name` (type:string; required:yes)
            - `description` (type:null|string; required:no)
            - `permissions` (type:array; required:yes)
            - `is_system` (type:boolean; required:yes)
            - `created_at` (type:string; required:yes)
            - `updated_at` (type:null|string; required:no)

- **GET /api/v1/roles** — 角色列表
  - 认证：需要（管理员）
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=100
    - q；in:query；type:null|string；required:no；desc:搜索关键词
    - is_system；in:query；type:null|boolean；required:no；desc:系统角色过滤
    - sort_by；in:query；type:string；required:no；default:name
    - sort_order；in:query；type:string；required:no；default:asc；pattern=^(asc|desc)$
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse[RoleListItem]
      - data 字段结构：
            - `items` (type:array; required:yes; desc:每项包含 id, name, display_name, description, permission_count, is_system, user_count)
            - `total` (type:integer; required:yes)
            - `page` (type:integer; required:yes)
            - `page_size` (type:integer; required:yes)

- **GET /api/v1/roles/{role_id}** — 角色详情
  - 认证：需要（管理员）
  - 参数：
    - role_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:RoleResponse（字段同创建角色响应）

- **PATCH /api/v1/roles/{role_id}** — 更新角色
  - 认证：需要（管理员）
  - 参数：
    - role_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> RoleUpdate（所有字段可选）
      - 字段结构：
            - `display_name` (type:null|string; required:no)
            - `description` (type:null|string; required:no)
            - `permissions` (type:array|null; required:no)
  - 成功响应：
    - 200 JSON -> data:RoleResponse

- **DELETE /api/v1/roles/{role_id}** — 删除角色
  - 认证：需要（管理员）
  - 参数：
    - role_id；in:path；type:integer；required:yes
  - 说明：不能删除系统角色或已分配给用户的角色。
  - 成功响应：
    - 200 JSON -> data:MessageResponse
  - 错误响应：
    - 400: 系统角色不可删除 / 角色已分配给用户

- **PUT /api/v1/roles/{role_id}/permissions** — 更新角色权限
  - 认证：需要（管理员）
  - 参数：
    - role_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> RolePermissionUpdate
      - 字段结构：
            - `permissions` (type:array; required:yes; desc:替换全部现有权限)
  - 成功响应：
    - 200 JSON -> data:RoleResponse

- **GET /api/v1/roles/{role_id}/users** — 角色下的用户
  - 认证：需要（管理员）
  - 参数：
    - role_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:array
      - 每项字段：
            - `id` (type:integer; required:yes)
            - `username` (type:string; required:yes)
            - `email` (type:string; required:yes)
            - `full_name` (type:null|string; required:no)
            - `is_active` (type:boolean; required:yes)
            - `granted_at` (type:string; required:yes)

- **GET /api/v1/roles/permissions/list** — 可用权限列表
  - 认证：需要（管理员）
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:PermissionListResponse（按分类返回所有可用权限）


### Admin-Audit

- **GET /api/v1/audit/my-activity** — 我的安全活动
  - 认证：需要
  - 参数：
    - event_type；in:query；type:null|string；required:no；desc:事件类型过滤
    - days；in:query；type:integer；required:no；default:30；min=1; max=365
    - limit；in:query；type:integer；required:no；default:50；min=1; max=200
  - 说明：IP 地址会进行脱敏处理。
  - 成功响应：
    - 200 JSON -> data:AuditLogListResponse
      - data 字段结构：
            - `logs` (type:array; required:yes; desc:每项包含 id, event_type, event_description, severity, success, ip_address, device_type, request_path, created_at)
            - `total` (type:integer; required:yes)

- **GET /api/v1/audit/my-security-summary** — 我的安全摘要
  - 认证：需要
  - 参数：
    - days；in:query；type:integer；required:no；default:30；min=1; max=365
  - 成功响应：
    - 200 JSON -> data:SecuritySummaryResponse
      - data 字段结构：
            - `total_logins` (type:integer; required:yes)
            - `failed_logins` (type:integer; required:yes)
            - `password_changes` (type:integer; required:yes)
            - `new_devices` (type:integer; required:yes)
            - `security_events` (type:integer; required:yes)
            - `last_login` (type:null|string; required:no)
            - `last_password_change` (type:null|string; required:no)

- **GET /api/v1/audit/admin/security-events** — [管理员] 系统安全事件
  - 认证：需要（管理员）
  - 参数：
    - hours；in:query；type:integer；required:no；default:24；min=1; max=168
    - severity；in:query；type:null|string；required:no；desc:info|warning|error|critical
    - limit；in:query；type:integer；required:no；default:100；min=1; max=500
  - 说明：管理员可以看到完整 IP 地址。
  - 成功响应：
    - 200 JSON -> data:AuditLogListResponse

- **GET /api/v1/audit/admin/failed-logins** — [管理员] 失败登录统计
  - 认证：需要（管理员）
  - 参数：
    - hours；in:query；type:integer；required:no；default:24；min=1; max=168
    - min_count；in:query；type:integer；required:no；default:3；min=1；desc:最低失败次数
  - 说明：按 IP 地址统计失败登录次数，用于检测暴力破解。
  - 成功响应：
    - 200 JSON -> data:array[FailedLoginStats]
      - 每项字段：
            - `ip_address` (type:string; required:yes)
            - `count` (type:integer; required:yes)

- **GET /api/v1/audit/admin/user/{user_id}** — [管理员] 用户审计日志
  - 认证：需要（管理员）
  - 参数：
    - user_id；in:path；type:integer；required:yes
    - days；in:query；type:integer；required:no；default:30；min=1; max=365
    - limit；in:query；type:integer；required:no；default:100；min=1; max=500
  - 成功响应：
    - 200 JSON -> data:AuditLogListResponse
  - 错误响应：
    - 404: User not found


### Admin-Upload

- **POST /api/v1/upload/avatar** — 上传头像
  - 认证：需要
  - 参数：无
  - 请求体：
    - multipart/form-data
      - `file` (type:file; required:yes; desc:图片文件 JPG/PNG/WebP，最大5MB)
  - 说明：自动处理和优化图片（转为JPEG，最大512px，质量85%）。
  - 成功响应：
    - 200 JSON -> data:FileUploadResponse
      - data 字段结构：
            - `filename` (type:string; required:yes; desc:生成的文件名)
            - `url` (type:string; required:yes; desc:头像URL)
            - `size` (type:integer; required:yes; desc:文件大小(bytes))
            - `content_type` (type:string; required:yes; desc:MIME类型)
            - `hash` (type:string; required:yes; desc:SHA-256哈希)
            - `uploaded_at` (type:string; required:yes)

- **POST /api/v1/upload/users/{user_id}/avatar** — 为指定用户上传头像
  - 认证：需要（管理员或用户本人）
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 请求体：
    - multipart/form-data
      - `file` (type:file; required:yes; desc:图片文件 JPG/PNG/WebP，最大5MB)
  - 成功响应：
    - 200 JSON -> data:FileUploadResponse（字段同上）
  - 错误响应：
    - 403: 无权限为该用户上传头像
    - 404: User not found

## 6. 特殊场景
- **别名兼容**：
  - `/api/v1/account/profile` → `/api/v1/users/me/profile`
  - `/api/v1/community/feed` → `/api/v1/community/latest`
- **WebSocket（不走 /api/v1）**：
  - `ws /` 主通道 (订阅/心跳/ping)
  - `ws /notifications` 通知通道
  - `ws /scraper-progress` 爬虫进度通道
- **二进制响应**：media 下载/流式/缩略图等接口返回非 JSON
- **HEAD 方法**：当前不保证支持 HEAD，建议使用 GET

### 6.1 WebSocket协议详细说明

**连接地址**
WebSocket不走`/api/v1`路径，使用以下端点：
- `ws://domain/` 或 `wss://domain/` — 主通道
- `ws://domain/notifications` 或 `wss://domain/notifications` — 通知通道
- `ws://domain/scraper-progress` 或 `wss://domain/scraper-progress` — 爬虫进度通道

**主通道（`/`）**

连接建立后，客户端可以：

1. **订阅频道**
```json
{
  "action": "subscribe",
  "channel": "channel_name",
  "params": {
    // 可选参数
  }
}
```

2. **取消订阅**
```json
{
  "action": "unsubscribe",
  "channel": "channel_name"
}
```

3. **心跳保持**
```json
{
  "action": "ping"
}
```
服务器响应：
```json
{
  "action": "pong",
  "timestamp": "2026-02-09T12:34:56Z"
}
```

4. **接收消息**
服务器推送消息格式：
```json
{
  "channel": "channel_name",
  "event": "event_type",
  "data": {
    // 事件数据
  },
  "timestamp": "2026-02-09T12:34:56Z"
}
```

**通知通道（`/notifications`）**

用于接收用户通知（评论回复、点赞、系统通知等）。连接需要认证：
- 在URL参数中携带token：`wss://domain/notifications?token=<access_token>`
- 或在首次消息中发送认证信息

接收的通知格式：
```json
{
  "type": "notification",
  "notification": {
    "id": "uuid",
    "type": "comment_reply|like|follow|system",
    "title": "通知标题",
    "content": "通知内容",
    "data": {
      // 附加数据
    },
    "created_at": "2026-02-09T12:34:56Z",
    "is_read": false
  }
}
```

**爬虫进度通道（`/scraper-progress`）**

用于实时获取爬虫任务进度。需要管理员权限。

进度消息格式：
```json
{
  "type": "progress",
  "task_id": "uuid",
  "platform": "platform_name",
  "status": "running|completed|failed",
  "progress": {
    "current": 50,
    "total": 100,
    "percentage": 50.0
  },
  "message": "进度信息",
  "timestamp": "2026-02-09T12:34:56Z"
}
```

**连接管理**
- 心跳间隔：建议30秒发送一次ping
- 超时时间：无活动60秒后服务器可能关闭连接
- 重连策略：连接断开后，建议使用指数退避策略重连（首次1秒，之后2秒、4秒、8秒，最多32秒）
- 错误处理：连接建立失败或收到error消息时，检查认证状态和权限

**错误消息格式**
```json
{
  "type": "error",
  "code": "ERROR_CODE",
  "message": "错误描述"
}
```

### 6.2 文件上传规范

**单文件上传**
- 接口：`POST /api/v1/upload/file`（或具体业务接口）
- Content-Type: `multipart/form-data`
- 字段：`file`（文件内容），可能还有其他元数据字段

**头像/图片上传**
- 支持格式：JPG, PNG, GIF, WEBP
- 最大尺寸：通常5MB
- 响应包含：`file_path`, `file_hash`（SHA-256）, `file_size`, `width`, `height`

**文件哈希**
- 头像/图片处理相关的`file_hash`使用SHA-256算法
- 前端在进行文件验证时需要支持SHA-256
- 历史数据可能使用MD5，需要向后兼容

### 6.3 媒体文件访问

**二进制响应接口**
以下接口返回非JSON格式的二进制数据：
- 媒体文件下载：`GET /api/v1/media/{media_id}/download`
- 媒体文件流式传输：`GET /api/v1/media/{media_id}/stream`
- 缩略图访问：`GET /api/v1/media/{media_id}/thumbnail`
- 头像访问：`GET /api/v1/users/{user_id}/avatar`

**响应头**
- `Content-Type`：实际文件的MIME类型（如`image/jpeg`, `video/mp4`）
- `Content-Length`：文件大小（字节）
- `Content-Disposition`：下载接口包含文件名信息
- `Cache-Control`：缓存策略
- `ETag`：资源版本标识

**流式传输支持**
- 支持HTTP Range请求（`Range: bytes=0-1023`）
- 响应状态码：206 Partial Content
- 响应头包含：`Content-Range`, `Accept-Ranges: bytes`

### 6.4 跨域资源共享（CORS）

**预检请求（Preflight）**
对于跨域的非简单请求，浏览器会先发送OPTIONS请求：
- 服务器返回允许的方法、头信息和源
- `Access-Control-Max-Age`：预检结果缓存时间

**允许的源**
- 开发环境：通常允许`localhost`和开发域名
- 生产环境：仅允许配置的前端域名

**暴露的响应头**
除了标准响应头外，以下自定义头也会通过CORS暴露给前端：
- `X-API-Version`
- `X-Request-ID`
- `X-RateLimit-*`
- `X-Verification-Token`

### 6.5 幂等性保证

**天然幂等的操作**
- GET, HEAD, OPTIONS：读取操作，天然幂等
- PUT：更新操作，使用相同的数据多次调用结果相同
- DELETE：删除不存在的资源返回404或成功，多次调用结果相同

**需要幂等性处理的操作**
以下操作在v1 API中已实现幂等性，重复请求不会产生副作用：
- 收藏帖子：重复收藏返回已存在，不会报错
- 评论点赞：重复点赞返回已点赞，不会报错
- 讨论点赞：重复点赞返回已点赞，不会报错
- 关注用户：重复关注返回已关注，不会报错

**非幂等操作**
以下操作需要注意避免重复调用：
- POST创建资源：重复调用会创建多个资源
- 发送通知/邮件：重复调用会发送多次

**最佳实践**
- 对于可能重复的请求，前端应实现防抖/节流
- 提交按钮点击后立即禁用，防止连续点击
- 对于关键操作，考虑使用幂等键（Idempotency-Key）机制（如果API支持）

## 7. 安全机制
- JWT Bearer 认证（`Authorization: Bearer <access_token>`）
- Refresh Token 使用 HttpOnly Cookie（默认名：`refresh_token`，Path: `/api`）
- 2FA 支持（`/api/v1/2fa/*`）
- Turnstile 人机验证（`/api/v1/auth/turnstile-config`）
- 身份二次校验：`/api/v1/auth/verify-identity` 返回 `X-Verification-Token`
- API Protection：来源校验 + Bot 检测 + 渐进式封禁
- 速率限制：全局限流 + 登录/敏感接口限流

### 7.1 安全最佳实践

**Token安全**
- Access Token应存储在内存中，避免持久化到localStorage（易受XSS攻击）
- 如需持久化，优先使用sessionStorage或加密后存储
- Refresh Token由服务器通过HttpOnly Cookie管理，前端无需处理
- 在用户主动登出时，清除所有本地token和会话信息

**HTTPS要求**
- 生产环境必须使用HTTPS
- Refresh Token通过Secure Cookie传输，仅在HTTPS下有效
- WebSocket连接也应使用WSS（WebSocket Secure）

**敏感操作二次验证**
- 某些敏感操作（如修改密码、删除账户）需要通过`/api/v1/auth/verify-identity`进行二次验证
- 验证成功后获得临时的`X-Verification-Token`
- 在后续敏感操作的请求头中包含此token

**输入验证**
- 所有用户输入必须在前端进行基础验证（格式、长度等）
- 但不要依赖前端验证，服务器会进行完整的安全验证
- 避免在URL参数中传递敏感信息

### 7.2 性能优化建议

**缓存策略**
- 静态资源（媒体文件、头像）使用浏览器缓存，根据`Cache-Control`和`ETag`头管理
- API响应数据根据业务需求在客户端缓存，注意设置合理的TTL
- 列表数据可使用虚拟滚动减少DOM节点

**请求优化**
- 使用分页加载，避免一次性加载大量数据
- 实现懒加载（lazy loading）策略
- 合并相关的API请求，减少往返次数
- 使用防抖（debounce）处理高频操作（如搜索输入）
- 使用节流（throttle）处理滚动事件等

**并发控制**
- 避免同时发起大量API请求
- 使用请求队列或请求池限制并发数
- 对于图片等资源，实现渐进式加载

**WebSocket优化**
- 仅在需要实时更新时建立WebSocket连接
- 页面不可见时可暂停心跳或断开连接，节省资源
- 实现优雅的重连机制，避免频繁重连

### 7.3 错误处理最佳实践

**错误分类处理**
根据错误代码前缀进行分类处理：

```
AUTH_* 错误：
  - AUTH_1002（Token过期）→ 尝试刷新token
  - AUTH_1003（Token无效）→ 清除token，跳转登录
  - AUTH_1004（权限不足）→ 显示权限错误提示
  - AUTH_1005（账户锁定）→ 显示账户状态说明

USER_* 错误：
  - 显示具体的用户操作错误信息
  - 引导用户修正输入

VALIDATION_* 错误：
  - 解析error.details中的字段信息
  - 在对应表单字段显示错误提示

SECURITY_1604（速率限制）：
  - 显示友好的等待提示
  - 根据retry_after自动重试或禁用操作

SYSTEM_* 错误：
  - 显示通用错误提示
  - 记录error.meta.request_id用于问题追踪
  - 提示用户稍后重试
```

**错误日志记录**
- 记录所有API错误，包含request_id
- 对于5xx错误，记录完整的请求上下文
- 实现错误上报机制（如Sentry）

**用户友好提示**
- 避免直接展示技术性错误消息
- 根据error.code转换为用户可理解的提示
- 提供可操作的解决建议

**重试机制**
- 对于网络错误，实现指数退避重试
- 幂等操作可安全重试
- 非幂等操作谨慎重试，考虑请求幂等键

### 7.4 数据一致性

**乐观更新**
- 对于用户操作（点赞、收藏等），可先更新UI
- API调用失败后回滚UI状态
- 显示加载状态和错误提示

**版本冲突处理**
- 对于支持ETag的资源，实现条件更新（If-Match）
- 冲突时提示用户刷新后重试

**离线支持**
- 检测网络状态，离线时缓存用户操作
- 恢复网络后同步缓存的操作
- 处理同步冲突

### 7.5 国际化（i18n）

**语言偏好**
- 通过`Accept-Language`请求头传递语言偏好
- 支持的语言：zh-CN（简体中文）、en-US（英语）等
- API响应中的用户生成内容保持原始语言

**时区处理**
- API统一返回UTC时间
- 前端根据用户时区转换显示
- 相对时间显示（如"3小时前"）更友好

**日期格式**
- 根据用户区域设置格式化日期
- 保持内部数据使用ISO8601格式

### 7.6 监控与调试

**请求追踪**
- 记录所有API请求的request_id
- 使用request_id关联前后端日志
- 问题排查时提供request_id给技术支持

**性能监控**
- 监控API响应时间
- 识别慢请求和超时请求
- 追踪资源加载性能

**开发工具**
- 使用浏览器开发者工具的Network面板
- 检查响应头中的性能和限流信息
- 使用API调试工具（如Postman）测试接口

### 7.7 向后兼容性

**API版本管理**
- 当前版本：v1（通过`/api/v1`路径标识）
- `X-API-Version`响应头标识具体版本号（如1.0.0）
- 重大变更会引入新的主版本号

**字段变更**
- 新增字段不影响现有功能
- 废弃字段会保留一段时间并标记为deprecated
- 字段类型或语义变更会提前通知

**客户端版本控制**
- 建议在请求头中发送`X-Client-Version`
- 服务器可根据客户端版本提供兼容性支持
- 过旧的客户端版本可能被要求升级

---

## Changelog (2026-02-11 Session 3)

### 新增端点

#### Content API
- **`GET /api/v1/posts/trending`** — 热门帖子
  - 查询参数：`page`(1), `page_size`(20, max 50), `days`(7, max 30)
  - 加权公式：`view_count + like_count * 5`，按分数降序
  - 响应：`PaginatedResponse[PostListItem]`
  - 认证：可选（匿名可访问）
  - 缓存：120s
  - 限流：CONTENT_READ (120/min)

#### User API — 会话管理
- **`GET /api/v1/auth/sessions`** — 列出当前用户所有活跃会话
  - 响应：`{ sessions: [{ id, device_name, device_type, ip_address, created_at, last_used_at, is_current }], total }`
  - 认证：必须
  - 限流：USER_READ (60/min)
- **`DELETE /api/v1/auth/sessions/{session_id}`** — 注销指定会话
  - 响应：204 No Content
  - 错误：404 会话不存在 / 409 会话已注销
  - 认证：必须（只能注销自己的会话）
  - 限流：USER_WRITE (20/min)

#### Community API
- **`GET /api/v1/discussions/search`** — 搜索讨论
  - 查询参数：`q`(必填, 1-100字符), `category`(可选: general|question|sharing|feedback), `page`(1), `page_size`(20, max 50)
  - 搜索范围：标题 + 正文（ilike 模糊匹配）
  - 响应：`DiscussionListResponse`（含 items, total, page, page_size, has_more）
  - 认证：可选
  - 限流：CONTENT_SEARCH (60/min)

#### Admin API
- **`GET /api/v1/admin/metrics`** — 系统指标概览
  - 响应：`{ users: { total, today_active }, posts: { total }, authors: { total }, db_pool: { size, checked_in, checked_out, overflow }, redis: { status, uptime_seconds, connected_clients, used_memory_human }, generated_at }`
  - 认证：管理员
  - 缓存：30s（Redis）

### 增强
- **统一错误响应**：所有 HTTPException 现在也返回结构化 `error_code` 字段（映射自 HTTP 状态码）
- **异常处理**：`general_exception_handler` 不再泄露 `str(exc)`，改为返回 `incident_id`
- **authors 分页**：`page_size` 上限 500 → 100
- **并发幂等**：收藏/评论点赞/讨论点赞/关注重复请求返回已存在（避免 500）
