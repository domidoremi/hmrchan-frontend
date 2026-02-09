# 前端 API 合约文档 (v1)

更新日期：2026-02-09

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
  "data": {},
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
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `total_pages` (type:integer; required:yes)

- **GET /api/v1/posts-light/mixed** — Get Mixed Feed
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
    - per_platform；in:query；type:integer；required:no；default:5；min=3; max=10；desc:每个平台的帖子数
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse[PostListItemLight]
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `total_pages` (type:integer; required:yes)

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
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `total_pages` (type:integer; required:yes)

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
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `total_pages` (type:integer; required:yes)

- **GET /api/v1/posts/stats/summary** — Get Posts Stats
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:PostsStatsResponse
      - data 字段结构：- `total_posts` (type:integer; required:no) - `total_media_files` (type:integer; required:no) - `total_authors` (type:integer; required:no) - `recent_posts_7d` (type:integer; required:no) - `by_platform` (type:object; required:no)

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
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `total_pages` (type:integer; required:yes)

- **GET /api/v1/media/post/{post_id}/list** — List Post Media
  - 认证：需要
  - 参数：
    - post_id；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:Response List Post Media Api V1 Media Post Post Id List Get
      - data 字段结构：- items: object

- **GET /api/v1/media/{media_id}** — Get Media File
  - 认证：需要
  - 参数：
    - media_id；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:MediaFileResponse
      - data 字段结构：- `id` (type:string; required:yes) - `post_id` (type:null|string; required:no) - `file_path` (type:string; required:yes) - `file_type` (type:string; required:yes) - `file_size` (type:integer|null; required:no) - `width` (type:integer|null; required:no) - `height` (type:integer|null; required:no) - `duration` (type:integer|null; required:no) - `mime_type` (type:null|string; required:no) - `thumbnail_path` (type:null|string; required:no) - `is_downloaded` (type:boolean; required:yes) - `download_url` (type:null|string; required:no) - `subtitle_language` (type:null|string; required:no) - `subtitle_format` (type:null|string; required:no) - `has_subtitle` (type:boolean; required:no) - `subtitles` (type:array|null; required:no) - `created_at` (type:string; required:yes)

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
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `total_pages` (type:integer; required:yes)

- **GET /api/v1/authors/platform/{platform}/list** — List Authors By Platform
  - 认证：需要
  - 参数：
    - platform；in:path；type:string；required:yes
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=100
  - 说明：搜索结果仅包含用户可浏览范围内的帖子（未登录：单平台10条/多平台各平台15条；已登录非管理员：最多100条；管理员不限制）。
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse[AuthorListItem]
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `total_pages` (type:integer; required:yes)

- **GET /api/v1/authors/{author_id}** — Get Author
  - 认证：需要
  - 参数：
    - author_id；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:AuthorResponse
      - data 字段结构：- `id` (type:string; required:yes) - `platform` (type:string; required:yes) - `platform_user_id` (type:null|string; required:no) - `name` (type:string; required:yes) - `username` (type:null|string; required:no) - `description` (type:null|string; required:no) - `avatar_url` (type:null|string; required:no) - `profile_url` (type:null|string; required:no) - `follower_count` (type:integer|null; required:no) - `video_count` (type:integer|null; required:no) - `is_verified` (type:boolean; required:no) - `created_at` (type:string; required:yes) - `updated_at` (type:null|string; required:no)

- **GET /api/v1/authors/{author_id}/posts** — List Author Posts
  - 认证：需要
  - 参数：
    - author_id；in:path；type:string；required:yes
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=100
  - 说明：搜索结果仅包含用户可浏览范围内的帖子（未登录：单平台10条/多平台各平台15条；已登录非管理员：最多100条；管理员不限制）。
  - 成功响应：
    - 200 JSON -> data:PaginatedResponse
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `total_pages` (type:integer; required:yes)

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
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `total_pages` (type:integer; required:yes)

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
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `total_pages` (type:integer; required:yes)

- **GET /api/v1/search/suggestions** — Search Suggestions
  - 认证：需要
  - 参数：
    - q；in:query；type:string；required:yes；minLen=1；desc:Search query for suggestions
    - type；in:query；type:string；required:no；default:all；pattern=^(post|author|all)$
    - platform；in:query；type:null|string；required:no；desc:Filter by platform
    - limit；in:query；type:integer；required:no；default:10；min=1; max=20
  - 成功响应：
    - 200 JSON -> data:SearchSuggestionResponse
      - data 字段结构：- `query` (type:string; required:yes) - `results` (type:array; required:yes)

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
      - 字段结构：- `code` (type:string; required:yes; desc:TOTP code or backup code) - `password` (type:string; required:yes; desc:Current password for confirmation)
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/2fa/regenerate-backup-codes** — Regenerate Backup Codes
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> Verify2FARequest
      - 字段结构：- `code` (type:string; required:yes; minLen=6; maxLen=6; desc:6-digit TOTP code)
  - 成功响应：
    - 200 JSON -> data:RegenerateBackupCodesResponse
      - data 字段结构：- `backup_codes` (type:array; required:yes) - `message` (type:string; required:yes)

- **POST /api/v1/2fa/setup** — Setup 2Fa
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:Setup2FAResponse
      - data 字段结构：- `secret` (type:string; required:yes; desc:TOTP secret (base32)) - `qr_code` (type:string; required:yes; desc:QR code as base64 PNG) - `otpauth_url` (type:string; required:yes; desc:otpauth:// URL for manual entry) - `backup_codes` (type:array; required:yes; desc:One-time backup codes)

- **GET /api/v1/2fa/status** — Get 2Fa Status
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:TwoFactorStatusResponse
      - data 字段结构：- `enabled` (type:boolean; required:yes) - `backup_codes_remaining` (type:integer; required:yes)

- **POST /api/v1/2fa/verify** — Verify And Enable 2Fa
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> Verify2FARequest
      - 字段结构：- `code` (type:string; required:yes; minLen=6; maxLen=6; desc:6-digit TOTP code)
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/2fa/verify-login** — Verify 2Fa Login
  - 认证：不需要
  - 参数：无
  - 请求体：
    - application/json -> Complete2FALoginRequest
      - 字段结构：- `pending_token` (type:string; required:yes; desc:Pending 2FA token from login response) - `code` (type:string; required:yes; desc:TOTP code or backup code) - `device_name` (type:null|string; required:no; desc:Device name for session) - `device_type` (type:null|string; required:no; desc:Device type (browser, mobile, etc))
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
      - 字段结构：- `username` (type:string; required:yes; minLen=3; maxLen=100) - `password` (type:string; required:yes; minLen=6) - `device_name` (type:null|string; required:no) - `device_type` (type:null|string; required:no) - `turnstile_token` (type:null|string; required:no; desc:Cloudflare Turnstile token)
  - 成功响应：
    - 200 JSON -> data:LoginResponse
      - data 字段结构：- `access_token` (type:string; required:yes) - `refresh_token` (type:null|string; required:no) - `token_type` (type:string; required:no) - `expires_in` (type:integer; required:yes) - `refresh_threshold` (type:integer; required:no) - `user` (type:object; required:yes; desc:User response schema.)

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
      - data 字段结构：- `id` (type:integer; required:yes) - `username` (type:string; required:yes) - `email` (type:string; required:yes) - `full_name` (type:null|string; required:no) - `avatar_url` (type:null|string; required:no) - `bio` (type:null|string; required:no) - `is_active` (type:boolean; required:yes) - `is_admin` (type:boolean; required:yes) - `is_verified` (type:boolean; required:yes) - `email_verified_at` (type:null|string; required:no) - `totp_enabled` (type:boolean; required:yes) - `created_at` (type:string; required:yes) - `last_login_at` (type:null|string; required:no) - `roles` (type:array; required:no)

- **POST /api/v1/auth/refresh** — Refresh Token
  - 认证：不需要
  - 参数：
    - refresh_token；in:cookie；type:null|string；required:no
  - 成功响应：
    - 200 JSON -> data:RefreshTokenResponse
      - data 字段结构：- `access_token` (type:string; required:yes) - `token_type` (type:string; required:no) - `expires_in` (type:integer; required:yes) - `refresh_threshold` (type:integer; required:no) - `user` (type:null|object; required:no)

- **POST /api/v1/auth/register** — Register
  - 认证：不需要
  - 参数：无
  - 请求体：
    - application/json -> RegisterRequest
      - 字段结构：- `username` (type:string; required:yes; minLen=3; maxLen=50; desc:Username) - `email` (type:string; required:yes; maxLen=255; desc:Email address) - `password` (type:string; required:yes; minLen=8; maxLen=100; desc:Password) - `full_name` (type:null|string; required:no; desc:Full name) - `verification_code` (type:string; required:yes; minLen=6; maxLen=6; desc:Email verification code) - `turnstile_token` (type:null|string; required:no; desc:Cloudflare Turnstile token)
  - 成功响应：
    - 201 JSON -> data:LoginResponse
      - data 字段结构：- `access_token` (type:string; required:yes) - `refresh_token` (type:null|string; required:no) - `token_type` (type:string; required:no) - `expires_in` (type:integer; required:yes) - `refresh_threshold` (type:integer; required:no) - `user` (type:object; required:yes; desc:User response schema.)

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
      - 字段结构：- `password` (type:string; required:yes; minLen=1; desc:Current password) - `action` (type:string; required:yes; maxLen=50; desc:Action being performed) - `resource_id` (type:null|string; required:no; desc:Optional resource identifier)
  - 成功响应：
    - 200 JSON -> data:SecondaryVerificationResponse
      - data 字段结构：- `verified` (type:boolean; required:yes) - `verification_token` (type:string; required:yes) - `action` (type:string; required:yes) - `expires_in` (type:integer; required:yes) - `message` (type:string; required:yes)

- **POST /api/v1/auth/verify-password** — Verify Password Endpoint
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> VerifyPasswordRequest
      - 字段结构：- `password` (type:string; required:yes; minLen=1; desc:Current password to verify)
  - 成功响应：
    - 200 JSON -> data:VerifyPasswordResponse
      - data 字段结构：- `verified` (type:boolean; required:yes) - `verification_token` (type:null|string; required:no) - `expires_in` (type:integer|null; required:no) - `message` (type:string; required:yes)

- **POST /api/v1/email/change-email** — Change Email
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> ChangeEmailRequest
      - 字段结构：- `new_email` (type:string; required:yes; desc:New email address) - `password` (type:string; required:yes; desc:Current password for verification)
  - 成功响应：
    - 200 JSON -> data:ChangeEmailResponse
      - data 字段结构：- `message` (type:string; required:yes) - `verification_sent` (type:boolean; required:yes)

- **POST /api/v1/email/request-password-reset** — Request Password Reset
  - 认证：不需要
  - 参数：无
  - 请求体：
    - application/json -> RequestPasswordResetRequest
      - 字段结构：- `email` (type:string; required:yes; desc:User email address) - `turnstile_token` (type:null|string; required:no; desc:Cloudflare Turnstile token)
  - 成功响应：
    - 200 JSON -> data:RequestPasswordResetResponse
      - data 字段结构：- `message` (type:string; required:yes)

- **POST /api/v1/email/reset-password** — Reset Password
  - 认证：不需要
  - 参数：无
  - 请求体：
    - application/json -> ResetPasswordRequest
      - 字段结构：- `token` (type:string; required:yes; desc:Reset token from email) - `new_password` (type:string; required:yes; minLen=8; desc:New password)
  - 成功响应：
    - 200 JSON -> data:ResetPasswordResponse
      - data 字段结构：- `success` (type:boolean; required:yes) - `message` (type:string; required:yes)

- **POST /api/v1/email/send-registration-code** — Send Registration Code
  - 认证：不需要
  - 参数：无
  - 请求体：
    - application/json -> SendRegistrationCodeRequest
      - 字段结构：- `email` (type:string; required:yes) - `turnstile_token` (type:null|string; required:no)
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
      - 字段结构：- `token` (type:string; required:yes; desc:Verification token from email)
  - 成功响应：
    - 200 JSON -> data:VerifyEmailResponse
      - data 字段结构：- `success` (type:boolean; required:yes) - `message` (type:string; required:yes) - `email_verified` (type:boolean; required:no)

### User-Profile

- **POST /api/v1/account/admin/cleanup-expired** — Cleanup Expired Users
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：- `message` (type:string; required:yes) - `success` (type:boolean; required:no)

- **GET /api/v1/account/data-summary** — Get Data Summary
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:UserDataSummary
      - data 字段结构：- `user_id` (type:integer; required:yes) - `username` (type:string; required:yes) - `email` (type:string; required:yes) - `created_at` (type:null|string; required:no) - `data_counts` (type:object; required:yes)

- **POST /api/v1/account/delete** — Delete Account
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> DeleteAccountRequest
      - 字段结构：- `reason` (type:null|string; required:no; desc:删除原因（可选）) - `confirm` (type:boolean; required:yes; desc:确认删除)
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：- `message` (type:string; required:yes) - `success` (type:boolean; required:no)

- **GET /api/v1/account/deletion-status** — Get Deletion Status
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:AccountDeletionStatus
      - data 字段结构：- `is_deleted` (type:boolean; required:yes) - `deleted_at` (type:null|string; required:no) - `permanent_delete_at` (type:null|string; required:no) - `days_remaining` (type:integer|null; required:no) - `can_restore` (type:boolean; required:no)

- **POST /api/v1/account/export-data** — Export User Data
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:DataExportResponse
      - data 字段结构：- `export_id` (type:string; required:yes) - `status` (type:string; required:yes) - `message` (type:string; required:yes)

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
      - data 字段结构：- `message` (type:string; required:yes) - `success` (type:boolean; required:no)

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
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `total_pages` (type:integer; required:yes)

- **POST /api/v1/users** — Create User
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> UserCreate
      - 字段结构：- `email` (type:string; required:yes) - `username` (type:string; required:yes; minLen=3; maxLen=100) - `full_name` (type:null|string; required:no) - `bio` (type:null|string; required:no) - `avatar_url` (type:null|string; required:no) - `password` (type:string; required:yes; minLen=8; maxLen=100) - `is_admin` (type:boolean; required:no) - `is_active` (type:boolean; required:no)
  - 成功响应：
    - 201 JSON -> data:UserResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `username` (type:string; required:yes) - `email` (type:string; required:yes) - `full_name` (type:null|string; required:no) - `avatar_url` (type:null|string; required:no) - `bio` (type:null|string; required:no) - `is_active` (type:boolean; required:yes) - `is_admin` (type:boolean; required:yes) - `is_verified` (type:boolean; required:yes) - `email_verified_at` (type:null|string; required:no) - `totp_enabled` (type:boolean; required:yes) - `created_at` (type:string; required:yes) - `last_login_at` (type:null|string; required:no) - `roles` (type:array; required:no)

- **POST /api/v1/users/me/change-password** — Change My Password
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> PasswordChangeRequest
      - 字段结构：- `current_password` (type:string; required:yes; minLen=1; desc:当前密码) - `new_password` (type:string; required:yes; minLen=8; maxLen=100; desc:新密码)
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：- `message` (type:string; required:yes) - `success` (type:boolean; required:no)

- **GET /api/v1/users/me/profile** — Get My Profile
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:ProfileResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `username` (type:string; required:yes) - `email` (type:string; required:yes) - `full_name` (type:null|string; required:no) - `avatar_url` (type:null|string; required:no) - `bio` (type:null|string; required:no) - `is_verified` (type:boolean; required:yes) - `created_at` (type:string; required:yes) - `username_changed_at` (type:null|string; required:no) - `can_change_username` (type:boolean; required:no) - `username_change_available_at` (type:null|string; required:no) - `gender` (type:null|string; required:no) - `birth_date` (type:null|string; required:no) - `location` (type:null|string; required:no) - `website` (type:null|string; required:no) - `social_links` (type:null|object; required:no)

- **PATCH /api/v1/users/me/profile** — Update My Profile
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> ProfileUpdate
      - 字段结构：- `username` (type:null|string; required:no; desc:用户名（30天只能改一次）) - `full_name` (type:null|string; required:no; desc:显示名称) - `bio` (type:null|string; required:no; desc:个人简介) - `avatar_url` (type:null|string; required:no; desc:头像URL) - `gender` (type:null|string; required:no; desc:性别) - `birth_date` (type:null|string; required:no; desc:出生日期) - `location` (type:null|string; required:no; desc:所在地) - `website` (type:null|string; required:no; desc:个人网站) - `social_links` (type:null|object; required:no; desc:社交链接)
  - 成功响应：
    - 200 JSON -> data:ProfileResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `username` (type:string; required:yes) - `email` (type:string; required:yes) - `full_name` (type:null|string; required:no) - `avatar_url` (type:null|string; required:no) - `bio` (type:null|string; required:no) - `is_verified` (type:boolean; required:yes) - `created_at` (type:string; required:yes) - `username_changed_at` (type:null|string; required:no) - `can_change_username` (type:boolean; required:no) - `username_change_available_at` (type:null|string; required:no) - `gender` (type:null|string; required:no) - `birth_date` (type:null|string; required:no) - `location` (type:null|string; required:no) - `website` (type:null|string; required:no) - `social_links` (type:null|object; required:no)

- **DELETE /api/v1/users/{user_id}** — Delete User
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：- `message` (type:string; required:yes) - `success` (type:boolean; required:no)

- **GET /api/v1/users/{user_id}** — Get User
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:UserResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `username` (type:string; required:yes) - `email` (type:string; required:yes) - `full_name` (type:null|string; required:no) - `avatar_url` (type:null|string; required:no) - `bio` (type:null|string; required:no) - `is_active` (type:boolean; required:yes) - `is_admin` (type:boolean; required:yes) - `is_verified` (type:boolean; required:yes) - `email_verified_at` (type:null|string; required:no) - `totp_enabled` (type:boolean; required:yes) - `created_at` (type:string; required:yes) - `last_login_at` (type:null|string; required:no) - `roles` (type:array; required:no)

- **PATCH /api/v1/users/{user_id}** — Update User
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> UserUpdate
      - 字段结构：- `email` (type:null|string; required:no) - `full_name` (type:null|string; required:no) - `bio` (type:null|string; required:no) - `avatar_url` (type:null|string; required:no) - `is_active` (type:boolean|null; required:no) - `is_admin` (type:boolean|null; required:no) - `is_verified` (type:boolean|null; required:no)
  - 成功响应：
    - 200 JSON -> data:UserResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `username` (type:string; required:yes) - `email` (type:string; required:yes) - `full_name` (type:null|string; required:no) - `avatar_url` (type:null|string; required:no) - `bio` (type:null|string; required:no) - `is_active` (type:boolean; required:yes) - `is_admin` (type:boolean; required:yes) - `is_verified` (type:boolean; required:yes) - `email_verified_at` (type:null|string; required:no) - `totp_enabled` (type:boolean; required:yes) - `created_at` (type:string; required:yes) - `last_login_at` (type:null|string; required:no) - `roles` (type:array; required:no)

- **POST /api/v1/users/{user_id}/reset-password** — Reset User Password
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> UserPasswordReset
      - 字段结构：- `new_password` (type:string; required:yes; minLen=8; maxLen=100)
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：- `message` (type:string; required:yes) - `success` (type:boolean; required:no)

- **GET /api/v1/users/{user_id}/roles** — Get User Roles
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:Response Get User Roles Api V1 Users User Id Roles Get
      - data 字段结构：- items: object

- **POST /api/v1/users/{user_id}/roles** — Assign User Roles
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> UserRoleAssignment
      - 字段结构：- `role_ids` (type:array; required:yes; desc:List of role IDs to assign)
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：- `message` (type:string; required:yes) - `success` (type:boolean; required:no)

- **GET /api/v1/users/{user_id}/stats** — Get User Stats
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:UserStatsResponse
      - data 字段结构：- `favorites_count` (type:integer; required:no) - `views_count` (type:integer; required:no) - `posts_count` (type:integer; required:no) - `comments_count` (type:integer; required:no)

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
      - data 字段结构：- `showHeroSection` (type:boolean; required:no; desc:显示首页横幅) - `postsPerPage` (type:integer; required:no; min=10.0; max=100.0; desc:每页帖子数量) - `enableAnimations` (type:boolean; required:no; desc:启用动画效果) - `autoPlayVideos` (type:boolean; required:no; desc:自动播放视频) - `showImagePreviews` (type:boolean; required:no; desc:显示图片预览) - `cookieConsent` (type:boolean|null; required:no; desc:Cookie 同意状态) - `analyticsEnabled` (type:boolean; required:no; desc:分析统计) - `functionalCookiesEnabled` (type:boolean; required:no; desc:功能性 Cookie) - `performanceCookiesEnabled` (type:boolean; required:no; desc:性能 Cookie) - `dataCollection` (type:boolean; required:no; desc:数据收集) - `personalizedContent` (type:boolean; required:no; desc:个性化内容) - `createdAt` (type:string; required:yes; desc:创建时间) - `updatedAt` (type:string; required:yes; desc:更新时间) - `lastSyncedAt` (type:string; required:yes; desc:最后同步时间)

- **PATCH /api/v1/preferences** — Partial Update Preferences
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> UserPreferencesUpdate
      - 字段结构：- `showHeroSection` (type:boolean|null; required:no) - `postsPerPage` (type:integer|null; required:no) - `enableAnimations` (type:boolean|null; required:no) - `autoPlayVideos` (type:boolean|null; required:no) - `showImagePreviews` (type:boolean|null; required:no) - `cookieConsent` (type:boolean|null; required:no) - `analyticsEnabled` (type:boolean|null; required:no) - `functionalCookiesEnabled` (type:boolean|null; required:no) - `performanceCookiesEnabled` (type:boolean|null; required:no) - `dataCollection` (type:boolean|null; required:no) - `personalizedContent` (type:boolean|null; required:no)
  - 成功响应：
    - 200 JSON -> data:UserPreferencesResponse
      - data 字段结构：- `showHeroSection` (type:boolean; required:no; desc:显示首页横幅) - `postsPerPage` (type:integer; required:no; min=10.0; max=100.0; desc:每页帖子数量) - `enableAnimations` (type:boolean; required:no; desc:启用动画效果) - `autoPlayVideos` (type:boolean; required:no; desc:自动播放视频) - `showImagePreviews` (type:boolean; required:no; desc:显示图片预览) - `cookieConsent` (type:boolean|null; required:no; desc:Cookie 同意状态) - `analyticsEnabled` (type:boolean; required:no; desc:分析统计) - `functionalCookiesEnabled` (type:boolean; required:no; desc:功能性 Cookie) - `performanceCookiesEnabled` (type:boolean; required:no; desc:性能 Cookie) - `dataCollection` (type:boolean; required:no; desc:数据收集) - `personalizedContent` (type:boolean; required:no; desc:个性化内容) - `createdAt` (type:string; required:yes; desc:创建时间) - `updatedAt` (type:string; required:yes; desc:更新时间) - `lastSyncedAt` (type:string; required:yes; desc:最后同步时间)

- **PUT /api/v1/preferences** — Update User Preferences
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> UserPreferencesUpdate
      - 字段结构：- `showHeroSection` (type:boolean|null; required:no) - `postsPerPage` (type:integer|null; required:no) - `enableAnimations` (type:boolean|null; required:no) - `autoPlayVideos` (type:boolean|null; required:no) - `showImagePreviews` (type:boolean|null; required:no) - `cookieConsent` (type:boolean|null; required:no) - `analyticsEnabled` (type:boolean|null; required:no) - `functionalCookiesEnabled` (type:boolean|null; required:no) - `performanceCookiesEnabled` (type:boolean|null; required:no) - `dataCollection` (type:boolean|null; required:no) - `personalizedContent` (type:boolean|null; required:no)
  - 成功响应：
    - 200 JSON -> data:UserPreferencesResponse
      - data 字段结构：- `showHeroSection` (type:boolean; required:no; desc:显示首页横幅) - `postsPerPage` (type:integer; required:no; min=10.0; max=100.0; desc:每页帖子数量) - `enableAnimations` (type:boolean; required:no; desc:启用动画效果) - `autoPlayVideos` (type:boolean; required:no; desc:自动播放视频) - `showImagePreviews` (type:boolean; required:no; desc:显示图片预览) - `cookieConsent` (type:boolean|null; required:no; desc:Cookie 同意状态) - `analyticsEnabled` (type:boolean; required:no; desc:分析统计) - `functionalCookiesEnabled` (type:boolean; required:no; desc:功能性 Cookie) - `performanceCookiesEnabled` (type:boolean; required:no; desc:性能 Cookie) - `dataCollection` (type:boolean; required:no; desc:数据收集) - `personalizedContent` (type:boolean; required:no; desc:个性化内容) - `createdAt` (type:string; required:yes; desc:创建时间) - `updatedAt` (type:string; required:yes; desc:更新时间) - `lastSyncedAt` (type:string; required:yes; desc:最后同步时间)

- **POST /api/v1/preferences/sync** — Sync Preferences
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> PreferencesSyncRequest
      - 字段结构：- `preferences` (type:object; required:yes; desc:用户偏好设置基础模型) - `lastUpdated` (type:null|string; required:no; desc:客户端最后更新时间)
  - 成功响应：
    - 200 JSON -> data:PreferencesSyncResponse
      - data 字段结构：- `preferences` (type:object; required:yes; desc:用户偏好设置响应) - `synced` (type:boolean; required:yes; desc:是否已同步) - `conflictResolution` (type:null|string; required:no; desc:冲突解决方式)

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
      - data 字段结构：- `devices` (type:array; required:yes) - `total` (type:integer; required:yes) - `current_fingerprint` (type:null|string; required:no)

- **GET /api/v1/devices/current** — Get Current Device
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:DeviceResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `fingerprint` (type:string; required:yes) - `device_name` (type:null|string; required:no) - `device_type` (type:string; required:yes) - `browser` (type:string; required:yes) - `os` (type:string; required:yes) - `is_trusted` (type:boolean; required:yes) - `is_current` (type:boolean; required:yes) - `login_count` (type:integer; required:yes) - `last_login_at` (type:null|string; required:no) - `last_ip` (type:null|string; required:no) - `first_seen_at` (type:null|string; required:no) - `ip_address` (type:null|string; required:no) - `last_active_at` (type:null|string; required:no) - `device_info` (type:null|string; required:no)

- **POST /api/v1/devices/rename** — Rename Device
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> RenameDeviceRequest
      - 字段结构：- `device_id` (type:integer; required:yes) - `device_name` (type:string; required:yes)
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/devices/trust** — Trust Device
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> TrustDeviceRequest
      - 字段结构：- `device_id` (type:integer; required:yes)
  - 成功响应：
    - 200 JSON -> data:object

- **POST /api/v1/devices/untrust** — Untrust Device
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> TrustDeviceRequest
      - 字段结构：- `device_id` (type:integer; required:yes)
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
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `total_pages` (type:integer; required:yes)

- **POST /api/v1/favorites/** — Create Favorite
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> FavoriteCreate
      - 字段结构：- `post_id` (type:string; required:yes) - `folder_name` (type:null|string; required:no) - `tags` (type:array|null; required:no) - `notes` (type:null|string; required:no)
  - 成功响应：
    - 201 JSON -> data:FavoriteResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `user_id` (type:integer; required:yes) - `post_id` (type:string; required:yes) - `folder_name` (type:null|string; required:no) - `tags_array` (type:array|null; required:no) - `notes` (type:null|string; required:no) - `created_at` (type:string; required:yes) - `post_title` (type:null|string; required:no) - `post_thumbnail` (type:null|string; required:no) - `post_platform` (type:null|string; required:no)

- **GET /api/v1/favorites/check/{post_id}** — Check Favorite
  - 认证：需要
  - 参数：
    - post_id；in:path；type:string；required:yes
  - 成功响应：
    - 200 JSON -> data:FavoriteCheckResponse
      - data 字段结构：- `is_favorited` (type:boolean; required:yes) - `favorite_id` (type:integer|null; required:no)

- **GET /api/v1/favorites/folders/list** — List Folders
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:Response List Folders Api V1 Favorites Folders List Get
      - data 字段结构：- items: object

- **GET /api/v1/favorites/tags/list** — List Tags
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:Response List Tags Api V1 Favorites Tags List Get
      - data 字段结构：- items: object

- **DELETE /api/v1/favorites/{favorite_id}** — Delete Favorite
  - 认证：需要
  - 参数：
    - favorite_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：- `message` (type:string; required:yes) - `success` (type:boolean; required:no)

- **GET /api/v1/favorites/{favorite_id}** — Get Favorite
  - 认证：需要
  - 参数：
    - favorite_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:FavoriteResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `user_id` (type:integer; required:yes) - `post_id` (type:string; required:yes) - `folder_name` (type:null|string; required:no) - `tags_array` (type:array|null; required:no) - `notes` (type:null|string; required:no) - `created_at` (type:string; required:yes) - `post_title` (type:null|string; required:no) - `post_thumbnail` (type:null|string; required:no) - `post_platform` (type:null|string; required:no)

- **PATCH /api/v1/favorites/{favorite_id}** — Update Favorite
  - 认证：需要
  - 参数：
    - favorite_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> FavoriteUpdate
      - 字段结构：- `folder_name` (type:null|string; required:no) - `tags` (type:array|null; required:no) - `notes` (type:null|string; required:no)
  - 成功响应：
    - 200 JSON -> data:FavoriteResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `user_id` (type:integer; required:yes) - `post_id` (type:string; required:yes) - `folder_name` (type:null|string; required:no) - `tags_array` (type:array|null; required:no) - `notes` (type:null|string; required:no) - `created_at` (type:string; required:yes) - `post_title` (type:null|string; required:no) - `post_thumbnail` (type:null|string; required:no) - `post_platform` (type:null|string; required:no)

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
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes)

- **POST /api/v1/history/browsing** — Create Browsing History
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> BrowsingHistoryCreate
      - 字段结构：- `content_type` (type:string; required:yes; pattern=^(post|author|media)$) - `content_id` (type:integer; required:yes) - `content_uuid` (type:null|string; required:no) - `source` (type:null|string; required:no) - `duration_seconds` (type:integer|null; required:no)
  - 成功响应：
    - 201 JSON -> data:BrowsingHistoryResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `content_type` (type:string; required:yes) - `content_id` (type:integer; required:yes) - `content_uuid` (type:null|string; required:no) - `source` (type:null|string; required:no) - `duration_seconds` (type:integer|null; required:no) - `created_at` (type:string; required:yes) - `content_preview` (type:null|object; required:no)

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
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `suggestions` (type:array; required:no)

- **POST /api/v1/history/search** — Create Search History
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> SearchHistoryCreate
      - 字段结构：- `query` (type:string; required:yes; minLen=1; maxLen=500) - `search_type` (type:string; required:no; pattern=^(posts|authors|media)$) - `filters` (type:null|object; required:no) - `result_count` (type:integer|null; required:no)
  - 成功响应：
    - 201 JSON -> data:SearchHistoryResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `query` (type:string; required:yes) - `search_type` (type:string; required:yes) - `filters` (type:null|object; required:no) - `result_count` (type:integer; required:yes) - `created_at` (type:string; required:yes)

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

### User-Notifications

- **DELETE /api/v1/notifications** — Clear Notifications
  - 认证：需要
  - 参数：
    - read_only；in:query；type:boolean；required:no；default:True；desc:只清除已读通知
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：- `message` (type:string; required:yes) - `success` (type:boolean; required:no)

- **GET /api/v1/notifications** — List Notifications
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
    - type；in:query；type:null|string；required:no；desc:通知类型筛选
    - unread_only；in:query；type:boolean；required:no；default:False；desc:只显示未读
  - 成功响应：
    - 200 JSON -> data:NotificationListResponse
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `unread_count` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `has_more` (type:boolean; required:yes)

- **POST /api/v1/notifications/read-all** — Mark All As Read
  - 认证：需要
  - 参数：
    - type；in:query；type:null|string；required:no；desc:只标记某类型
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：- `message` (type:string; required:yes) - `success` (type:boolean; required:no)

- **GET /api/v1/notifications/unread-count** — Get Unread Count
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:UnreadCountResponse
      - data 字段结构：- `unread_count` (type:integer; required:yes)

- **DELETE /api/v1/notifications/{notification_id}** — Delete Notification
  - 认证：需要
  - 参数：
    - notification_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：- `message` (type:string; required:yes) - `success` (type:boolean; required:no)

- **PATCH /api/v1/notifications/{notification_id}/read** — Mark As Read
  - 认证：需要
  - 参数：
    - notification_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:NotificationResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `uuid` (type:string; required:yes) - `type` (type:string; required:yes) - `title` (type:string; required:yes) - `content` (type:null|string; required:no) - `related_type` (type:null|string; required:no) - `related_id` (type:integer|null; required:no) - `is_read` (type:boolean; required:yes) - `created_at` (type:string; required:yes) - `read_at` (type:null|string; required:no)

## 4. Community API

### Community-Comments

- **POST /api/v1/comments/images** — Upload Comment Images
  - 认证：需要
  - 参数：无
  - 请求体：
    - multipart/form-data -> Body_upload_comment_images_api_v1_comments_images_post
      - 字段结构：- `files` (type:array; required:yes; desc:图片文件列表，最多9张)
  - 成功响应：
    - 200 JSON -> data:CommentImageUploadResponse
      - data 字段结构：- `images` (type:array; required:yes) - `message` (type:string; required:no)

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
      - data 字段结构：- `id` (type:integer; required:yes) - `uuid` (type:string; required:yes) - `url` (type:string; required:yes) - `filename` (type:string; required:yes) - `file_size` (type:integer; required:yes) - `mime_type` (type:string; required:yes) - `width` (type:integer; required:yes) - `height` (type:integer; required:yes) - `sort_order` (type:integer; required:no) - `created_at` (type:string; required:yes)

- **GET /api/v1/comments/post/{post_uuid}** — 获取帖子评论列表
  - 认证：需要
  - 参数：
    - post_uuid；in:path；type:string；required:yes
    - page；in:query；type:integer；required:no；default:1；min=1；desc:页码，从1开始
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50；desc:每页数量，最大50
    - sort；in:query；type:string；required:no；default:popular；pattern=^(newest|oldest|popular)$；desc:排序方式: newest(最新), oldest(最早), popular(热门)
  - 成功响应：
    - 200 JSON -> data:CommentListResponse
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `has_more` (type:boolean; required:yes)

- **POST /api/v1/comments/post/{post_uuid}** — Create Comment
  - 认证：需要
  - 参数：
    - post_uuid；in:path；type:string；required:yes
  - 请求体：
    - application/json -> CommentCreate
      - 字段结构：- `content` (type:string; required:yes; minLen=1; maxLen=2000) - `parent_id` (type:integer|null; required:no; desc:父评论ID（回复时使用）) - `image_ids` (type:array|null; required:no; desc:图片ID列表，最多9张)
  - 成功响应：
    - 201 JSON -> data:CommentResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `uuid` (type:string; required:yes) - `content` (type:string; required:yes) - `user` (type:object; required:yes; desc:评论用户信息) - `post_id` (type:integer; required:yes) - `parent_id` (type:integer|null; required:no) - `like_count` (type:integer; required:yes) - `reply_count` (type:integer; required:yes) - `image_count` (type:integer; required:no) - `images` (type:array; required:no) - `is_liked` (type:boolean; required:no) - `is_favorited` (type:boolean; required:no) - `is_thread_owner` (type:boolean; required:no) - `replied_to_user` (type:null|object; required:no) - `replies` (type:array; required:no) - `created_at` (type:string; required:yes) - `updated_at` (type:null|string; required:no)

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
      - 字段结构：- `content` (type:string; required:yes; minLen=1; maxLen=2000)
  - 成功响应：
    - 200 JSON -> data:CommentResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `uuid` (type:string; required:yes) - `content` (type:string; required:yes) - `user` (type:object; required:yes; desc:评论用户信息) - `post_id` (type:integer; required:yes) - `parent_id` (type:integer|null; required:no) - `like_count` (type:integer; required:yes) - `reply_count` (type:integer; required:yes) - `image_count` (type:integer; required:no) - `images` (type:array; required:no) - `is_liked` (type:boolean; required:no) - `is_favorited` (type:boolean; required:no) - `is_thread_owner` (type:boolean; required:no) - `replied_to_user` (type:null|object; required:no) - `replies` (type:array; required:no) - `created_at` (type:string; required:yes) - `updated_at` (type:null|string; required:no)

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
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `has_more` (type:boolean; required:yes)

- **POST /api/v1/comments/{comment_id}/report** — 举报评论
  - 认证：需要
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> ReportCreate
      - 字段结构：- `reason` (type:string; required:yes; minLen=1; maxLen=100) - `description` (type:null|string; required:no)
  - 成功响应：
    - 201 JSON -> data:object

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
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `has_more` (type:boolean; required:yes)

- **POST /api/v1/discussions/** — 发起讨论
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> DiscussionCreate
      - 字段结构：- `title` (type:string; required:yes; minLen=2; maxLen=200) - `content` (type:string; required:yes; minLen=10; maxLen=10000) - `category` (type:string; required:no; pattern=^(general|question|sharing|feedback)$) - `tags` (type:array|null; required:no) - `referenced_post_id` (type:null|string; required:no; desc:引用的帖子UUID（可选）)
  - 成功响应：
    - 201 JSON -> data:DiscussionResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `uuid` (type:string; required:yes) - `title` (type:string; required:yes) - `content` (type:string; required:yes) - `category` (type:string; required:yes) - `tags` (type:array; required:yes) - `user` (type:object; required:yes) - `view_count` (type:integer; required:yes) - `like_count` (type:integer; required:yes) - `comment_count` (type:integer; required:yes) - `is_pinned` (type:boolean; required:yes) - `is_closed` (type:boolean; required:yes) - `is_liked` (type:boolean; required:no) - `referenced_post` (type:null|object; required:no) - `created_at` (type:string; required:yes) - `updated_at` (type:null|string; required:no) - `last_activity_at` (type:string; required:yes)

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
      - 字段结构：- `content` (type:string; required:yes; minLen=1; maxLen=2000)
  - 成功响应：
    - 200 JSON -> data:DiscussionCommentResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `uuid` (type:string; required:yes) - `content` (type:string; required:yes) - `user` (type:object; required:yes) - `discussion_id` (type:integer; required:yes) - `parent_id` (type:integer|null; required:no) - `like_count` (type:integer; required:yes) - `reply_count` (type:integer; required:yes) - `is_liked` (type:boolean; required:no) - `is_pinned` (type:boolean; required:yes) - `is_featured` (type:boolean; required:yes) - `created_at` (type:string; required:yes) - `updated_at` (type:null|string; required:no)

- **GET /api/v1/discussions/comments/{comment_id}** — 获取评论详情
  - 认证：需要
  - 参数：
    - comment_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:DiscussionCommentResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `uuid` (type:string; required:yes) - `content` (type:string; required:yes) - `user` (type:object; required:yes) - `discussion_id` (type:integer; required:yes) - `parent_id` (type:integer|null; required:no) - `like_count` (type:integer; required:yes) - `reply_count` (type:integer; required:yes) - `is_liked` (type:boolean; required:no) - `is_pinned` (type:boolean; required:yes) - `is_featured` (type:boolean; required:yes) - `created_at` (type:string; required:yes) - `updated_at` (type:null|string; required:no)

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
      - 字段结构：- `reason` (type:string; required:yes; minLen=1; maxLen=100) - `description` (type:null|string; required:no)
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
      - data 字段结构：- `items` (type:array; required:yes) - items 每项字段同 DiscussionCommentResponse - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `has_more` (type:boolean; required:yes)

- **GET /api/v1/discussions/user/my-comments** — 我的讨论评论
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
  - 成功响应：
    - 200 JSON -> data:CommentListResponse
      - data 字段结构：- `items` (type:array; required:yes) - items 每项字段同 DiscussionCommentResponse - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `has_more` (type:boolean; required:yes)

- **GET /api/v1/discussions/user/my-discussions** — 我发起的讨论
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
  - 成功响应：
    - 200 JSON -> data:DiscussionListResponse
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `has_more` (type:boolean; required:yes)

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
      - data 字段结构：- `id` (type:integer; required:yes) - `uuid` (type:string; required:yes) - `title` (type:string; required:yes) - `content` (type:string; required:yes) - `category` (type:string; required:yes) - `tags` (type:array; required:yes) - `user` (type:object; required:yes) - `view_count` (type:integer; required:yes) - `like_count` (type:integer; required:yes) - `comment_count` (type:integer; required:yes) - `is_pinned` (type:boolean; required:yes) - `is_closed` (type:boolean; required:yes) - `is_liked` (type:boolean; required:no) - `referenced_post` (type:null|object; required:no) - `created_at` (type:string; required:yes) - `updated_at` (type:null|string; required:no) - `last_activity_at` (type:string; required:yes)

- **PUT /api/v1/discussions/{discussion_uuid}** — 编辑讨论
  - 认证：需要
  - 参数：
    - discussion_uuid；in:path；type:string；required:yes
  - 请求体：
    - application/json -> DiscussionUpdate
      - 字段结构：- `title` (type:null|string; required:no) - `content` (type:null|string; required:no) - `category` (type:null|string; required:no) - `tags` (type:array|null; required:no) - `is_closed` (type:boolean|null; required:no) - `referenced_post_id` (type:null|string; required:no; desc:引用的帖子UUID（可选）)
  - 成功响应：
    - 200 JSON -> data:DiscussionResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `uuid` (type:string; required:yes) - `title` (type:string; required:yes) - `content` (type:string; required:yes) - `category` (type:string; required:yes) - `tags` (type:array; required:yes) - `user` (type:object; required:yes) - `view_count` (type:integer; required:yes) - `like_count` (type:integer; required:yes) - `comment_count` (type:integer; required:yes) - `is_pinned` (type:boolean; required:yes) - `is_closed` (type:boolean; required:yes) - `is_liked` (type:boolean; required:no) - `referenced_post` (type:null|object; required:no) - `created_at` (type:string; required:yes) - `updated_at` (type:null|string; required:no) - `last_activity_at` (type:string; required:yes)

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
      - data 字段结构：- `items` (type:array; required:yes) - items 每项字段同 DiscussionCommentResponse，另包含 `replies` (type:null|array; required:no; desc:仅 preload_replies>0 时返回，最多 N 条) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `has_more` (type:boolean; required:yes)

- **POST /api/v1/discussions/{discussion_uuid}/comments** — 发表评论
  - 认证：需要
  - 参数：
    - discussion_uuid；in:path；type:string；required:yes
  - 请求体：
    - application/json -> CommentCreate
      - 字段结构：- `content` (type:string; required:yes; minLen=1; maxLen=2000) - `parent_id` (type:integer|null; required:no)
  - 成功响应：
    - 201 JSON -> data:DiscussionCommentResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `uuid` (type:string; required:yes) - `content` (type:string; required:yes) - `user` (type:object; required:yes) - `discussion_id` (type:integer; required:yes) - `parent_id` (type:integer|null; required:no) - `like_count` (type:integer; required:yes) - `reply_count` (type:integer; required:yes) - `is_liked` (type:boolean; required:no) - `is_pinned` (type:boolean; required:yes) - `is_featured` (type:boolean; required:yes) - `created_at` (type:string; required:yes) - `updated_at` (type:null|string; required:no)

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

### Community-Feed

- **GET /api/v1/community/favorites** — 获取收藏的评论
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1；desc:页码
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50；desc:每页数量
  - 成功响应：
    - 200 JSON -> data:CommunityListResponse
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `has_more` (type:boolean; required:yes)

- **GET /api/v1/community/hot** — 获取热门话题
  - 认证：需要
  - 参数：
    - limit；in:query；type:integer；required:no；default:10；min=1; max=20；desc:返回数量
    - days；in:query；type:integer；required:no；default:7；min=1; max=30；desc:统计最近N天的数据
  - 成功响应：
    - 200 JSON -> data:Response Get Hot Topics Api V1 Community Hot Get
      - data 字段结构：- items: object

- **GET /api/v1/community/latest** — 获取最新讨论
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1；desc:页码
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50；desc:每页数量
  - 成功响应：
    - 200 JSON -> data:CommunityListResponse
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `has_more` (type:boolean; required:yes)

- **GET /api/v1/community/my-comments** — 获取我的评论
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1；desc:页码
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50；desc:每页数量
  - 成功响应：
    - 200 JSON -> data:CommunityListResponse
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `has_more` (type:boolean; required:yes)

- **GET /api/v1/community/my-likes** — 获取我点赞的评论
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1；desc:页码
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50；desc:每页数量
  - 成功响应：
    - 200 JSON -> data:CommunityListResponse
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `has_more` (type:boolean; required:yes)

- **GET /api/v1/community/stats** — 获取社区统计
  - 认证：不需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:CommunityStatsResponse
      - data 字段结构：- `total_comments` (type:integer; required:yes) - `total_users` (type:integer; required:yes) - `comments_today` (type:integer; required:yes) - `hot_topics_count` (type:integer; required:yes)

### Community-Relations

- **GET /api/v1/users/me/blocked** — Get Blocked Users
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
  - 成功响应：
    - 200 JSON -> data:FollowListResponse
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `has_more` (type:boolean; required:yes)

- **DELETE /api/v1/users/{user_id}/block** — Unblock User
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：- `message` (type:string; required:yes) - `success` (type:boolean; required:no)

- **POST /api/v1/users/{user_id}/block** — Block User
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：- `message` (type:string; required:yes) - `success` (type:boolean; required:no)

- **DELETE /api/v1/users/{user_id}/follow** — Unfollow User
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：- `message` (type:string; required:yes) - `success` (type:boolean; required:no)

- **POST /api/v1/users/{user_id}/follow** — Follow User
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:MessageResponse
      - data 字段结构：- `message` (type:string; required:yes) - `success` (type:boolean; required:no)

- **GET /api/v1/users/{user_id}/followers** — Get Followers
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
  - 成功响应：
    - 200 JSON -> data:FollowListResponse
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `has_more` (type:boolean; required:yes)

- **GET /api/v1/users/{user_id}/following** — Get Following
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
  - 成功响应：
    - 200 JSON -> data:FollowListResponse
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `has_more` (type:boolean; required:yes)

- **GET /api/v1/users/{user_id}/profile** — Get User Public Profile
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:UserProfileResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `username` (type:string; required:yes) - `avatar_url` (type:null|string; required:no) - `bio` (type:null|string; required:no) - `created_at` (type:string; required:yes) - `follower_count` (type:integer; required:yes) - `following_count` (type:integer; required:yes) - `is_following` (type:boolean; required:no) - `is_followed_by` (type:boolean; required:no) - `is_blocking` (type:boolean; required:no) - `is_blocked_by` (type:boolean; required:no)

- **GET /api/v1/users/{user_id}/relation** — Get Relation Status
  - 认证：需要
  - 参数：
    - user_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:RelationStatusResponse
      - data 字段结构：- `is_following` (type:boolean; required:yes) - `is_followed_by` (type:boolean; required:yes) - `is_blocking` (type:boolean; required:yes) - `is_blocked_by` (type:boolean; required:yes)

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
      - data 字段结构：- `items` (type:array; required:yes) - `total` (type:integer; required:yes) - `page` (type:integer; required:yes) - `page_size` (type:integer; required:yes) - `has_more` (type:boolean; required:yes)

- **POST /api/v1/reports** — Create Report
  - 认证：需要
  - 参数：无
  - 请求体：
    - application/json -> ReportCreate
      - 字段结构：- `target_type` (type:string; required:yes; desc:举报目标类型: comment, post, user) - `target_id` (type:integer; required:yes; desc:举报目标ID) - `reason` (type:string; required:yes; minLen=1; maxLen=100; desc:举报原因) - `description` (type:null|string; required:no; desc:详细描述)
  - 成功响应：
    - 201 JSON -> data:ReportResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `uuid` (type:string; required:yes) - `target_type` (type:string; required:yes) - `target_id` (type:integer; required:yes) - `reason` (type:string; required:yes) - `description` (type:null|string; required:no) - `status` (type:string; required:yes) - `created_at` (type:string; required:yes)

- **GET /api/v1/reports/my** — Get My Reports
  - 认证：需要
  - 参数：
    - page；in:query；type:integer；required:no；default:1；min=1
    - page_size；in:query；type:integer；required:no；default:20；min=1; max=50
  - 成功响应：
    - 200 JSON -> data:Response Get My Reports Api V1 Reports My Get
      - data 字段结构：- items: object

- **GET /api/v1/reports/stats/summary** — Get Report Stats
  - 认证：需要
  - 参数：无
  - 成功响应：
    - 200 JSON -> data:ReportStatsResponse
      - data 字段结构：- `total` (type:integer; required:no) - `pending` (type:integer; required:no) - `resolved` (type:integer; required:no) - `rejected` (type:integer; required:no) - `by_type` (type:object; required:no) - `by_reason` (type:object; required:no)

- **GET /api/v1/reports/{report_id}** — Get Report
  - 认证：需要
  - 参数：
    - report_id；in:path；type:integer；required:yes
  - 成功响应：
    - 200 JSON -> data:ReportDetailResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `uuid` (type:string; required:yes) - `target_type` (type:string; required:yes) - `target_id` (type:integer; required:yes) - `reason` (type:string; required:yes) - `description` (type:null|string; required:no) - `status` (type:string; required:yes) - `created_at` (type:string; required:yes) - `user_id` (type:integer|null; required:no) - `reporter_username` (type:null|string; required:no) - `reviewed_by` (type:integer|null; required:no) - `reviewer_username` (type:null|string; required:no) - `reviewed_at` (type:null|string; required:no) - `resolution_note` (type:null|string; required:no)

- **PATCH /api/v1/reports/{report_id}** — Review Report
  - 认证：需要
  - 参数：
    - report_id；in:path；type:integer；required:yes
  - 请求体：
    - application/json -> ReportReview
      - 字段结构：- `status` (type:string; required:yes; desc:处理状态: reviewed, resolved, rejected) - `resolution_note` (type:null|string; required:no; desc:处理备注)
  - 成功响应：
    - 200 JSON -> data:ReportDetailResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `uuid` (type:string; required:yes) - `target_type` (type:string; required:yes) - `target_id` (type:integer; required:yes) - `reason` (type:string; required:yes) - `description` (type:null|string; required:no) - `status` (type:string; required:yes) - `created_at` (type:string; required:yes) - `user_id` (type:integer|null; required:no) - `reporter_username` (type:null|string; required:no) - `reviewed_by` (type:integer|null; required:no) - `reviewer_username` (type:null|string; required:no) - `reviewed_at` (type:null|string; required:no) - `resolution_note` (type:null|string; required:no)

### Community-Feedback

- **POST /api/v1/feedback** — Submit Feedback
  - 认证：需要
  - 参数：无
  - 请求体：
    - multipart/form-data -> Body_submit_feedback_api_v1_feedback_post
      - 字段结构：- `message` (type:string; required:yes) - `contact` (type:null|string; required:no) - `category` (type:null|string; required:no) - `fingerprint` (type:null|string; required:no) - `attachment` (type:null|string; required:no)
  - 成功响应：
    - 200 JSON -> data:FeedbackResponse
      - data 字段结构：- `id` (type:integer; required:yes) - `uuid` (type:string; required:yes) - `message` (type:string; required:yes) - `contact` (type:null|string; required:no) - `category` (type:null|string; required:no) - `attachment_url` (type:null|string; required:no) - `is_anonymous` (type:boolean; required:yes) - `created_at` (type:string; required:yes)

### Community-Contact

- **POST /api/v1/contact/send** — Send Contact
  - 认证：不需要
  - 参数：无
  - 请求体：
    - application/json -> ContactRequest
      - 字段结构：- `name` (type:null|string; required:no) - `email` (type:null|string; required:no) - `subject` (type:null|string; required:no) - `message` (type:string; required:yes; minLen=1; maxLen=2000)
  - 成功响应：
    - 200 JSON -> data:ContactResponse
      - data 字段结构：- `success` (type:boolean; required:yes) - `message` (type:null|string; required:no)

## 5. Admin API

- 管理端接口可按需提供（包含 /admin, /crawler, /processor, /roles, /audit, /upload）。

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

## 7. 安全机制

- JWT Bearer 认证（`Authorization: Bearer <access_token>`）
- Refresh Token 使用 HttpOnly Cookie（默认名：`refresh_token`，Path: `/api`）
- 2FA 支持（`/api/v1/2fa/*`）
- Turnstile 人机验证（`/api/v1/auth/turnstile-config`）
- 身份二次校验：`/api/v1/auth/verify-identity` 返回 `X-Verification-Token`
- API Protection：来源校验 + Bot 检测 + 渐进式封禁
- 速率限制：全局限流 + 登录/敏感接口限流
