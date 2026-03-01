# 帖子评论

评论支持两级嵌套结构（顶级评论 + 回复），回复的回复会自动扁平化到顶级评论下。

## GET /api/v1/posts/:id/comments

获取帖子的评论列表（仅顶级评论）。

- 权限: optional
- Path: `id` — 帖子 UUID
- Query: `page`, `page_size` (max 50), `sort` (popular|newest|oldest, default popular)
- 响应: 分页，每项:

```json
{
  "id": "uuid",
  "content": "string",
  "post_id": 0,
  "parent_id": null,
  "like_count": 0,
  "reply_count": 0,
  "is_liked": false,
  "is_favorited": false,
  "is_thread_owner": true,
  "created_at": "datetime",
  "updated_at"?: "datetime",
  "user"?: { "id": "uuid", "username": "string", "avatar_url"?: "string" },
  "replies"?: [...]
}
```

每条顶级评论预加载最多 3 条回复。

## POST /api/v1/posts/:id/comments

创建评论。

- 权限: required
- Path: `id` — 帖子 UUID
- Body:

```json
{
  "content": "string (1-2000)",
  "parent_id"?: 0
}
```

- `parent_id` 为回复目标评论的内部 ID（非 UUID）。嵌套回复会自动扁平化。
- 响应 (201): 评论对象

## GET /api/v1/comments/:id/replies

获取评论的回复列表。

- 权限: optional
- Path: `id` — 评论 UUID 或内部 ID
- Query: `page`, `page_size` (max 50)
- 响应: 分页，每项为评论对象（按时间正序）

## GET /api/v1/comments/:id/thread

获取评论的完整上下文链（从根到当前评论）。

- 权限: optional
- Path: `id` — 评论 UUID 或内部 ID
- 响应:

```json
{
  "post_id": "uuid",
  "thread": [评论对象...],
  "depth": 0
}
```

## PATCH /api/v1/comments/:id

编辑评论（仅作者可编辑）。

- 权限: required
- Path: `id` — 评论 UUID 或内部 ID
- Body: `{ "content": "string (1-2000)" }`
- 响应: 更新后的评论对象

## DELETE /api/v1/comments/:id

删除评论（作者或管理员）。

- 权限: required
- Path: `id` — 评论 UUID 或内部 ID
- 响应: `204 No Content`

## POST /api/v1/comments/:id/like

点赞评论。

- 权限: required
- 响应: `{ "message": "Liked", "like_count": 0 }`

## DELETE /api/v1/comments/:id/like

取消点赞。

- 权限: required
- 响应: `{ "message": "Unliked", "like_count": 0 }`

## POST /api/v1/comments/:id/favorite

收藏评论。

- 权限: required
- 响应 (201): `{ "message": "Favorited" }`

## DELETE /api/v1/comments/:id/favorite

取消收藏。

- 权限: required
- 响应: `{ "message": "Unfavorited" }`

## POST /api/v1/comments/:id/report

举报评论。

- 权限: required
- Body: `{ "reason": "string", "description"?: "string" }`
- 响应 (201): `{ "message": "Report submitted" }`

---

## 评论图片 (Comment Images)

### POST /api/v1/comment-images

上传评论图片（批量）。

- 权限: required
- Content-Type: `multipart/form-data`
- Form field: `files` — JPG/PNG/WebP/GIF，单张最大 10MB，总计最大 50MB，最多 9 张
- 分辨率上限 3840×2160
- 响应:

```json
{
  "images": [
    {
      "id": "uuid",
      "url": "/uploads/comment_images/...",
      "filename": "string",
      "file_size": 0,
      "mime_type": "string",
      "width": 0,
      "height": 0,
      "sort_order": 0,
      "created_at": "datetime"
    }
  ],
  "message": "Successfully uploaded N images"
}
```

### GET /api/v1/comment-images/:id

获取评论图片信息。

- 权限: required
- 响应: 图片元数据对象

### DELETE /api/v1/comment-images/:id

删除评论图片（仅未关联评论的图片可删除）。

- 权限: required（上传者或管理员）
- 已关联评论的图片返回 `400`
- 响应: `{ "message": "Image deleted" }`
