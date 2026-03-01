# 日程、社区

## 日程 (Schedules)

### GET /api/v1/schedules

获取日程列表。

- 权限: optional（非管理员只能看到已发布的）
- Query: `page`, `page_size` (max 200, default 50), `category`, `start` (RFC3339), `end` (RFC3339)
- 响应: 分页，每项:

```json
{
  "id": "uuid", "title": "string", "description"?: "string",
  "category": "live|media|birth|other", "start_date": "datetime",
  "end_date"?: "datetime", "is_all_day": false,
  "venue"?: "string", "event_url"?: "string",
  "color"?: "string", "is_published": true,
  "created_at": "datetime",
  "author"?: { "id": "uuid", "username": "string", "display_name"?: "string" }
}
```

### GET /api/v1/schedules/calendar

日历视图。

- 权限: optional
- Query: `start` (RFC3339), `end` (RFC3339)
- 响应 (数组):

```json
[{
  "id": "uuid", "title": "string",
  "start": "2025-01-01", "end"?: "2025-01-02",
  "allDay": false, "category": "string", "color"?: "string"
}]
```

### GET /api/v1/schedules/:id

获取日程详情。

- 权限: optional
- 响应: 完整日程对象（含 venue_address, ticket_url, source_url 等额外字段）

### POST /api/v1/schedules

创建日程。

- 权限: admin
- Body:

```json
{
  "title": "string (max 500)",
  "description"?: "string",
  "category": "string",
  "start_date": "RFC3339 或 YYYY-MM-DD",
  "end_date"?: "string",
  "is_all_day"?: false,
  "venue"?: "string",
  "event_url"?: "string",
  "ticket_url"?: "string",
  "color"?: "string",
  "is_published"?: true
}
```

- 响应 (201): `{ "id": "uuid", "title": "string" }`

### DELETE /api/v1/schedules/:id

删除日程。

- 权限: admin
- 响应: `204 No Content`

---

## 社区 (Community)

### GET /api/v1/community/stats

社区统计数据。

- 权限: optional（可匿名）
- 响应:

```json
{
  "total_comments": 0,
  "total_users": 0,
  "comments_today": 0,
  "hot_topics_count": 0
}
```

### GET /api/v1/community/latest

最新评论列表。

- 权限: optional（可匿名）
- Query: `page` (default 1), `page_size` (default 20, max 50)
- 响应: 分页，每项:

```json
{
  "id": "uuid",
  "content": "string",
  "created_at": "datetime",
  "like_count": 0,
  "user"?: { "id": "uuid", "username": "string", "avatar_url"?: "string" },
  "post"?: { "id": "uuid", "title"?: "string", "platform": "string" }
}
```

### GET /api/v1/community/feed

`/api/v1/community/latest` 的别名，返回相同数据。

- 权限: optional（可匿名）

### GET /api/v1/community/hot

热门话题（按评论数排序）。

- 权限: optional（可匿名）
- Query: `days` (1-90, default 7), `limit` (1-50, default 10)
- 响应:

```json
{
  "hot_topics": [{
    "comment_count": 0,
    "post_id": "uuid",
    "title"?: "string",
    "platform": "string"
  }]
}
```

### GET /api/v1/community/my-comments

我的评论列表。

- 权限: required
- Query: `page`, `page_size` (max 50)
- 响应: 分页，每项:

```json
{
  "id": "uuid", "content": "string", "created_at": "datetime", "like_count": 0,
  "post"?: { "id": "uuid", "title"?: "string", "platform": "string" }
}
```

### GET /api/v1/community/my-likes

我点赞的评论列表。

- 权限: required
- Query: `page`, `page_size` (max 50)
- 响应: 分页，每项同 `community/latest` 格式

### GET /api/v1/community/favorites

我收藏的评论列表。

- 权限: required
- Query: `page`, `page_size` (max 50)
- 响应: 分页，每项同 `community/latest` 格式
