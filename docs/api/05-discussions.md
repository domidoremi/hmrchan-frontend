# 讨论区

讨论区独立于帖子评论，支持分类、标签、置顶、关闭等功能。评论同样为两级嵌套结构。

## POST /api/v1/discussions

创建讨论。

- 权限: required
- Body:

```json
{
  "title": "string (2-200)",
  "content": "string (10-10000)",
  "category"?: "string (default: general)",
  "tags"?: ["string (max 20 chars, max 5 tags)"],
  "referenced_post_id"?: "uuid"
}
```

- 响应 (201): 讨论对象

## GET /api/v1/discussions

讨论列表。

- 权限: optional
- Query: `page`, `page_size` (max 50), `category`, `sort` / `sort_by` (latest|popular|active|comments_count|created_at)
- 响应: 分页，每项:

```json
{
  "id": "uuid", "title": "string", "content": "string",
  "category": "string", "tags": [],
  "view_count": 0, "like_count": 0, "comment_count": 0,
  "is_pinned": false, "is_closed": false, "is_liked": false,
  "created_at": "datetime", "updated_at"?: "datetime",
  "last_activity_at"?: "datetime",
  "user"?: { "id": "uuid", "username": "string", "avatar_url"?: "string" }
}
```

## GET /api/v1/discussions/search

搜索讨论。

- 权限: optional
- Query: `q` (必填), `page`, `page_size` (max 50), `category`
- 搜索范围: `title ILIKE` + `content ILIKE`
- 响应: 分页，每项为讨论对象

## GET /api/v1/discussions/:id

讨论详情（自动增加浏览量）。

- 权限: optional
- 响应: 讨论对象

## PATCH /api/v1/discussions/:id

编辑讨论（作者或管理员）。

- 权限: required
- Body:

```json
{
  "title"?: "string",
  "content"?: "string",
  "category"?: "string",
  "tags"?: [],
  "is_closed"?: false,
  "referenced_post_id"?: "uuid"
}
```

- 响应: 更新后的讨论对象

## DELETE /api/v1/discussions/:id

删除讨论（作者或管理员）。

- 权限: required
- 响应: `204 No Content`

## POST /api/v1/discussions/:id/like

点赞讨论。

- 权限: required
- 响应: `{ "message": "Liked", "like_count": 0 }`

## DELETE /api/v1/discussions/:id/like

取消点赞讨论。

- 权限: required
- 响应: `{ "message": "Unliked", "like_count": 0 }`

## GET /api/v1/discussions/my

我的讨论列表。

- 权限: required
- Query: `page`, `page_size` (max 50)
- 响应: 分页，每项为讨论对象

---

## 讨论评论

## GET /api/v1/discussions/:id/comments

讨论评论列表（仅顶级）。

- 权限: optional
- Query: `page`, `page_size` (max 50), `sort` / `sort_by` (newest|oldest|popular|like_count), `preload_replies` (0=不预加载, >0=每条预加载N条回复)
- 响应: 分页，每项:

```json
{
  "id": "uuid", "content": "string", "parent_id": null,
  "like_count": 0, "reply_count": 0, "is_liked": false,
  "created_at": "datetime", "updated_at"?: "datetime",
  "user"?: { "id": "uuid", "username": "string", "avatar_url"?: "string" },
  "replies"?: [...]
}
```

## POST /api/v1/discussions/:id/comments

创建讨论评论。讨论关闭后不可评论。

- 权限: required
- Body: `{ "content": "string (1-2000)", "parent_id"?: 0 }`
- 响应 (201): 讨论评论对象

## GET /api/v1/discussions/comments/:id/replies

讨论评论的回复列表。

- 权限: optional
- Query: `page`, `page_size` (max 50)
- 响应: 分页，按时间正序

## GET /api/v1/discussions/comments/:id

讨论评论详情。

- 权限: optional
- 响应: 讨论评论对象

## PATCH /api/v1/discussions/comments/:id

编辑讨论评论（仅作者）。

- 权限: required
- Body: `{ "content": "string (1-2000)" }`
- 响应: 更新后的评论对象

## DELETE /api/v1/discussions/comments/:id

删除讨论评论（作者或管理员）。

- 权限: required
- 响应: `204 No Content`

## POST /api/v1/discussions/comments/:id/like

点赞讨论评论。

- 权限: required
- 响应: `{ "message": "Liked", "like_count": 0 }`

## DELETE /api/v1/discussions/comments/:id/like

取消点赞讨论评论。

- 权限: required
- 响应: `{ "message": "Unliked", "like_count": 0 }`

## POST /api/v1/discussions/comments/:id/report

举报讨论评论。

- 权限: required
- Body: `{ "reason": "string", "description"?: "string" }`
- 响应 (201): `{ "message": "Report submitted" }`

## GET /api/v1/discussions/comments/:id/thread

讨论评论上下文链。

- 权限: optional
- 响应:

```json
{
  "discussion_id": "uuid",
  "thread": [讨论评论对象...],
  "depth": 0
}
```

## GET /api/v1/discussions/my-comments

我的讨论评论列表。

- 权限: required
- Query: `page`, `page_size` (max 50)
- 响应: 分页，每项为讨论评论对象

---

## 讨论管理 (Admin)

### POST /api/v1/discussions/:id/pin

置顶讨论。

- 权限: admin
- 响应: `{ "message": "Pinned", "is_pinned": true }`

### DELETE /api/v1/discussions/:id/pin

取消置顶。

- 权限: admin
- 响应: `{ "message": "Unpinned", "is_pinned": false }`

### POST /api/v1/discussions/comments/:id/pin

置顶讨论评论。

- 权限: admin
- 响应: `{ "message": "Pinned", "is_pinned": true }`

### DELETE /api/v1/discussions/comments/:id/pin

取消置顶讨论评论。

- 权限: admin
- 响应: `{ "message": "Unpinned", "is_pinned": false }`

### POST /api/v1/discussions/comments/:id/feature

精选讨论评论。

- 权限: admin
- 响应: `{ "message": "Featured", "is_featured": true }`

### DELETE /api/v1/discussions/comments/:id/feature

取消精选。

- 权限: admin
- 响应: `{ "message": "Unfeatured", "is_featured": false }`
