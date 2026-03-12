# 通知、历史记录

## 通知 (Notifications)

### GET /api/v1/notifications

通知列表。

- 权限: required
- Query: `page`, `page_size` (max 50), `type` (按类型筛选), `unread_only` (true/false)
- `type` 可能包含 `security_alert`
- 响应:

```json
{
  "items": [{
    "id": "uuid", "type": "string", "title": "string",
    "content"?: "string", "related_type"?: "string",
    "related_id"?: "string", "is_read": false,
    "created_at": "datetime", "read_at"?: "datetime"
  }],
  "total": 0,
  "unread_count": 0,
  "page": 1,
  "page_size": 20,
  "has_more": false
}
```

### GET /api/v1/notifications/unread-count

未读通知数量。

- 权限: required
- 响应: `{ "unread_count": 0 }`

### PATCH /api/v1/notifications/:id/read

标记单条通知为已读。

- 权限: required
- Path: `id` — 通知 UUID
- 响应: 通知对象（含 `is_read: true`, `read_at`）

### POST /api/v1/notifications/read-all

标记所有通知为已读。

- 权限: required
- Query: `type` (可选，仅标记指定类型)
- 响应: `{ "message": "Marked read", "success": true, "count": 0 }`

### DELETE /api/v1/notifications/:id

删除单条通知。

- 权限: required
- 响应: `{ "message": "Notification deleted", "success": true }`

### DELETE /api/v1/notifications

清除通知。

- 权限: required
- Query: `read_only` (default true，仅清除已读)
- 响应: `{ "message": "Notifications cleared", "success": true, "count": 0 }`

---

## 历史记录 (History)

### POST /api/v1/history/search

记录搜索历史。5 分钟内相同查询自动去重。上限 100 条。

- 权限: required
- Body:

```json
{
  "query": "string (1-500)",
  "search_type"?: "posts",
  "filters"?: {},
  "result_count"?: 0
}
```

- 响应 (201): SearchHistory 对象

### GET /api/v1/history/search

搜索历史列表。

- 权限: required
- Query: `limit` (max 100, default 20), `offset`, `search_type`
- 响应:

```json
{
  "items": [SearchHistory...],
  "total": 0,
  "suggestions": ["string"]
}
```

`suggestions` 为 Top 5 高频搜索词。

### DELETE /api/v1/history/search/:id

删除单条搜索历史。

- 权限: required
- 响应: `204 No Content`

### DELETE /api/v1/history/search

清空搜索历史。

- 权限: required
- 响应: `204 No Content`

### POST /api/v1/history/browsing

记录浏览历史。30 分钟内相同内容自动去重（累加 duration）。上限 500 条。

- 权限: required
- Body:

```json
{
  "content_type": "post|author",
  "content_id": 0,
  "content_uuid"?: "string",
  "source"?: "direct",
  "duration_seconds"?: 0
}
```

- 响应 (201): BrowsingHistory 对象

### GET /api/v1/history/browsing

浏览历史列表。

- 权限: required
- Query: `limit` (max 100, default 20), `offset`, `content_type`, `include_preview` (true 时附带内容摘要)
- 响应: `{ "items": [...], "total": 0 }`

### DELETE /api/v1/history/browsing/:id

删除单条浏览历史。

- 权限: required
- 响应: `204 No Content`

### DELETE /api/v1/history/browsing

清空浏览历史。

- 权限: required
- 响应: `204 No Content`

### DELETE /api/v1/history/all

清空所有历史（搜索 + 浏览）。

- 权限: required
- 响应: `204 No Content`

### GET /api/v1/history/stats

历史统计。

- 权限: required
- 响应:

```json
{
  "search_history_count": 0,
  "browsing_history_count": 0,
  "top_searches": [{ "query": "string", "count": 0 }],
  "recent_browsing_trend": [{ "date": "2025-01-01", "count": 0 }]
}
```

### GET /api/v1/history/my-comments

我的评论历史。

- 权限: required
- Query: `page`, `page_size` (max 50)
- 响应: 分页，每项: `{ "id": "uuid", "content": "string", "like_count": 0, "reply_count": 0, "created_at": "datetime", "post_id"?: "uuid", "post_title"?: "string" }`

### GET /api/v1/history/my-likes

我的点赞历史。

- 权限: required
- Query: `page`, `page_size` (max 50)
- 响应: 分页，每项: `{ "comment_id": 0, "liked_at": "datetime", "comment_content"?: "string", "comment_author"?: "string", "post_id"?: "uuid", "post_title"?: "string" }`

### GET /api/v1/history/my-comment-favorites

我的评论收藏历史。

- 权限: required
- Query: `page`, `page_size` (max 50)
- 响应: 分页，每项: `{ "comment_id": 0, "favorited_at": "datetime", "comment_content"?: "string", "comment_author"?: "string", "post_id"?: "uuid", "post_title"?: "string" }`
