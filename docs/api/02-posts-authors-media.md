# 帖子、作者、媒体、搜索

> 公开浏览接口受统一前台可见范围策略约束，详见 `docs/api/14-front-visibility-policy.md`。

## 帖子 (Posts)

### GET /api/v1/posts

获取帖子列表。

- 权限: optional
- Query: `page` (default 1), `page_size` (default 20, max 100), `platform`, `sort_by` (published_at|scraped_at|view_count|like_count|comment_count), `sort_order` (asc|desc)
- 响应: 分页，每项为 `PostListItem`:

```json
{
  "id": "uuid",
  "platform": "youtube|tiktok|twitter",
  "platform_post_id": "string",
  "post_url": "string",
  "post_type": "string",
  "title"?: "string",
  "content"?: "string",
  "published_at"?: "datetime",
  "view_count": 0,
  "like_count": 0,
  "comment_count": 0,
  "file_count": 0,
  "media_count": 0,
  "thumbnail_url"?: "/api/v1/media/{uuid}/thumbnail?size=small",
  "author_name"?: "string",
  "author_id"?: "uuid"
}
```

- 缩略图解析优先级: thumbnail 文件 > image 文件 > video 文件

### GET /api/v1/posts/:id

获取帖子详情。

- 权限: optional
- Path: `id` — 帖子 UUID
- 响应:

```json
{
  "id": "uuid",
  "platform": "string",
  "platform_post_id": "string",
  "post_url": "string",
  "post_type": "string",
  "media_type"?: "string",
  "title"?: "string",
  "content"?: "string",
  "language"?: "string",
  "published_at"?: "datetime",
  "view_count": 0,
  "like_count": 0,
  "comment_count": 0,
  "share_count": 0,
  "file_count": 0,
  "duration_sec"?: 0.0,
  "author"?: {
    "id": "uuid", "username": "string", "display_name"?: "string",
    "platform": "string", "avatar_url"?: "string", "is_verified": false
  },
  "original_author"?: { ... },
  "files"?: [{
    "id": "uuid", "file_type": "video|image|thumbnail|subtitle",
    "file_name": "string", "file_size_bytes": 0,
    "mime_type"?: "string", "width"?: 0, "height"?: 0, "duration_sec"?: 0.0
  }],
  "author_other_posts"?: [...]
}
```

### GET /api/v1/posts/light

轻量级帖子列表（瀑布流优化）。

- 权限: optional（游客有缓存，total 上限 100）
- Query: `page`, `page_size` (max 50), `platform`
- 响应: 分页，每项为 `PostListItemLight`:

```json
{
  "id": "uuid",
  "platform": "string",
  "title"?: "string",
  "content"?: "string (仅纯文本帖子，无缩略图且无媒体时返回，最长200字)",
  "media_type"?: "video|image|text",
  "thumbnail_url"?: "string",
  "thumbnail_width"?: 0,
  "thumbnail_height"?: 0,
  "published_at"?: "datetime",
  "view_count": 0,
  "like_count": 0,
  "media_count": 0
}
```

- 缩略图解析优先级: thumbnail 文件 > image 文件 > video 文件
- `media_type` 反映帖子的实际媒体类型，前端可据此决定卡片渲染方式:
  - `video`: 有视频文件，显示播放图标
  - `image`: 有图片文件，显示图片缩略图
  - `text`: 纯文本帖子，无媒体文件，可直接显示 `content` 文本

### GET /api/v1/posts/mixed

混合平台 Feed。

- 权限: optional（游客有缓存）
- Query: `page`, `page_size` (max 50), `per_platform` (3-10, default 5)
- 响应: 分页，每项为 `PostListItemLight`（同上）

---

## 作者 (Authors)

### GET /api/v1/authors

获取作者列表。

- 权限: optional
- Query: `page`, `page_size` (max 100), `platform`, `q` (搜索用户名/显示名)
- 响应: 分页，每项:

```json
{
  "id": "uuid", "platform": "string", "username": "string",
  "display_name"?: "string", "avatar_url"?: "string",
  "profile_url"?: "string", "follower_count": 0,
  "post_count": 0, "is_verified": false
}
```

### GET /api/v1/authors/:id

获取作者详情。

- 权限: optional
- Path: `id` — 作者 UUID
- 响应:

```json
{
  "id": "uuid", "platform": "string", "platform_user_id": "string",
  "username": "string", "display_name"?: "string",
  "avatar_url"?: "string", "profile_url"?: "string",
  "profile_banner_url"?: "string", "bio"?: "string",
  "follower_count"?: 0, "following_count"?: 0,
  "is_verified": false, "created_at": "datetime",
  "post_count": 0,
  "recent_posts": [{ "id": "uuid", "platform": "string", "post_type": "string", "title"?: "string", "post_url": "string", "published_at"?: "datetime", "view_count": 0, "like_count": 0 }]
}
```

### GET /api/v1/authors/:id/posts

获取作者的帖子列表。

- 权限: optional
- Path: `id` — 作者 UUID
- Query: `page`, `page_size` (max 100)
- 响应: 分页，每项为 `PostListItem`

---

## 媒体 (Media)

### GET /api/v1/media/:id

获取媒体文件元数据。

- 权限: optional
- Path: `id` — 媒体文件 UUID
- 响应: 原始 JSON（不经过 V1Envelope）
- 说明: 不返回服务端内部存储路径，前端应使用访问 URL 字段
- 响应:

```json
{
  "id": "uuid", "file_type": "string", "file_name": "string",
  "file_size_bytes": 0,
  "mime_type"?: "string", "width"?: 0, "height"?: 0,
  "duration_sec"?: 0.0, "created_at": "datetime",
  "stream_url"?: "/api/v1/media/{uuid}/stream",
  "thumbnail_url"?: "/api/v1/media/{uuid}/thumbnail",
  "download_url": "/api/v1/media/{uuid}/download"
}
```

### GET /api/v1/media/:id/subtitle

获取与该媒体同帖子的字幕文件。

- 权限: optional
- Path: `id` — 媒体文件 UUID（父媒体）
- Query: `language` — 字幕语言代码（必填）
- 响应: 字幕文件原始内容（不经过 V1Envelope）
- Content-Type:
  - `text/vtt`（默认或 `vtt`）
  - `application/x-subrip`（`srt`）
  - `text/x-ssa`（`ass`/`ssa`）
- 典型错误:
  - `400`：`id` 非法或缺少 `language`
  - `404`：媒体不存在 / 无该语言字幕 / 磁盘文件不存在

### GET /api/v1/media/:id/stream

流式播放媒体文件。支持 HTTP Range 请求。

- 权限: optional
- Path: `id` — 媒体文件 UUID
- 响应: 原始文件流（不经过 V1Envelope）
- Headers: `Accept-Ranges: bytes`, `Cache-Control: public, max-age=2592000, immutable`

### GET /api/v1/media/:id/thumbnail

获取媒体缩略图。

- 权限: optional
- Path: `id` — 媒体文件 UUID
- Query: `size` — small|medium|large|original (default: medium)
- 响应: WebP 图片或 SVG 占位符
- Headers: `Cache-Control: public, max-age=31536000, immutable`
- 回退链:
  1. `.thumbnails/{base}_{size}.webp` 缓存文件
  2. 数据库 `thumbnail_url` 指向的本地文件
  3. 原始文件（仅 image/thumbnail 类型）
  4. SVG 占位符（视频类型无缩略图时）
- 注意: 列表接口的 `thumbnail_url` 可能指向 video 类型的媒体文件，此时该端点会返回 SVG 占位符或已生成的缩略图

### GET /api/v1/media/:id/download

下载媒体文件。

- 权限: optional
- Path: `id` — 媒体文件 UUID
- 响应: 文件下载（不经过 V1Envelope）
- Headers: `Content-Disposition: attachment; filename="..."`

---

## 搜索 (Search)

所有搜索端点有额外的频率限制。查询长度上限 200 字符。

### GET /api/v1/search/posts

搜索帖子。

- 权限: optional
- Query: `q` (必填), `page`, `page_size` (max 100), `platform`
- 搜索范围: `title ILIKE` + `content ILIKE`
- 响应: 分页，每项为 `PostListItem`

### GET /api/v1/search/authors

搜索作者。

- 权限: optional
- Query: `q` (必填), `page`, `page_size` (max 50), `platform`
- 搜索范围: `username ILIKE` + `display_name ILIKE`
- 响应: 分页，每项:

```json
{
  "id": "uuid", "username": "string", "display_name"?: "string",
  "platform": "string", "avatar_url"?: "string", "bio"?: "string",
  "follower_count"?: 0, "is_verified": false
}
```

### GET /api/v1/search/suggestions

搜索建议（最少 2 字符）。

- 权限: optional
- Query: `q` (必填, min 2)
- 响应:

```json
{
  "query": "string",
  "results": [{
    "type": "post|author",
    "id": "uuid",
    "label": "string",
    "platform": "string",
    "subtitle"?: "string",
    "avatar_url"?: "string"
  }]
}
```
