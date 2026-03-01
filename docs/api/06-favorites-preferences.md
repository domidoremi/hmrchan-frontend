# 收藏、偏好设置

## 收藏 (Favorites)

### POST /api/v1/favorites

收藏帖子。

- 权限: required
- Body:

```json
{
  "post_id": "uuid",
  "folder_name"?: "string",
  "notes"?: "string"
}
```

- 响应 (201): `{ "id": 0, "post_id": "uuid", "folder_name"?: "string", "notes"?: "string", "created_at": "datetime" }`
- 重复收藏返回 `409 CONFLICT`

### GET /api/v1/favorites

收藏列表。

- 权限: required
- Query: `page`, `page_size` (max 100), `folder` (按文件夹筛选)
- 响应: 分页，每项:

```json
{
  "id": 0, "folder_name"?: "string", "notes"?: "string", "created_at": "datetime",
  "post"?: { "id": "uuid", "title"?: "string", "platform": "string", "post_url": "string" },
  "author"?: { "id": "uuid", "username": "string" }
}
```

### GET /api/v1/favorites/:id

收藏详情。

- 权限: required
- Path: `id` — 收藏内部 ID
- 响应: `{ "id": 0, "folder_name"?: "string", "notes"?: "string", "created_at": "datetime", "post_id"?: "uuid", "post_title"?: "string", "post_platform"?: "string" }`

### PATCH /api/v1/favorites/:id

更新收藏（文件夹/备注）。

- 权限: required
- Body: `{ "folder_name"?: "string", "notes"?: "string" }`
- 响应: 更新后的收藏对象

### DELETE /api/v1/favorites/:id

删除收藏。

- 权限: required
- 响应: `204 No Content`

### GET /api/v1/favorites/check/:post_id

检查帖子是否已收藏。

- 权限: optional
- Path: `post_id` — 帖子 UUID
- 响应: `{ "is_favorited": false }`

### GET /api/v1/favorites/folders/list

收藏文件夹列表（含计数）。

- 权限: required
- 响应: `{ "folders": [{ "folder_name": "string", "count": 0 }] }`

### GET /api/v1/favorites/tags/list

收藏标签列表（含计数）。

- 权限: required
- 响应: `[{ "tag": "string", "count": 0 }]`

---

## 偏好设置 (Preferences)

### GET /api/v1/preferences

获取用户偏好设置。首次访问自动创建默认值。

- 权限: required
- 响应: `UserPreferences` 对象（所有字段）

### PUT /api/v1/preferences

更新偏好设置（全量）。仅允许白名单字段。

- 权限: required
- Body (任意组合):

```json
{
  "show_hero_section"?: true,
  "enable_animations"?: true,
  "posts_per_page"?: 20,
  "auto_play_videos"?: true,
  "show_image_previews"?: true,
  "cookie_consent"?: false,
  "analytics_enabled"?: false,
  "functional_cookies_enabled"?: false,
  "performance_cookies_enabled"?: false,
  "data_collection"?: false,
  "personalized_content"?: false
}
```

- 响应: 更新后的 `UserPreferences` 对象

### PATCH /api/v1/preferences

更新偏好设置（部分）。与 PUT 相同处理逻辑。

- 权限: required
- Body: 同 PUT
- 响应: 更新后的 `UserPreferences` 对象

### DELETE /api/v1/preferences

重置偏好设置为默认值。

- 权限: required
- 响应: 重置后的 `UserPreferences` 对象
