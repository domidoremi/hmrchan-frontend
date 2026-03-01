# 用户资料、关系

## 用户资料 (User Profile)

### GET /api/v1/users/me/profile

获取当前用户资料。

- 权限: required
- 响应:

```json
{
  "id": "uuid", "username": "string", "email": "string",
  "full_name"?: "string", "avatar_url"?: "string", "bio"?: "string",
  "is_verified": true, "created_at": "datetime",
  "username_changed_at"?: "datetime",
  "can_change_username": true,
  "username_change_available_at"?: "datetime",
  "gender"?: "string", "birth_date"?: "string",
  "location"?: "string", "website"?: "string",
  "social_links"?: {}
}
```

用户名修改冷却期为 30 天。

### PATCH /api/v1/users/me/profile

更新用户资料。

- 权限: required
- Body (任意组合):

```json
{
  "username"?: "string",
  "full_name"?: "string",
  "bio"?: "string",
  "avatar_url"?: "string",
  "gender"?: "string",
  "birth_date"?: "string",
  "location"?: "string",
  "website"?: "string"
}
```

- 用户名修改受冷却期限制，且不可与已有用户名重复
- 响应: 更新后的用户资料

### POST /api/v1/users/me/change-password

修改密码。修改后其他会话全部失效。有敏感操作频率限制。

- 权限: required
- Body: `{ "current_password": "string", "new_password": "string" }`
- 响应: `{ "message": "Password changed successfully", "success": true }`

### GET /api/v1/users/:id/public-profile

获取用户公开资料（含关系状态）。

- 权限: required
- Path: `id` — 用户 UUID
- 响应:

```json
{
  "id": "uuid", "username": "string",
  "avatar_url"?: "string", "bio"?: "string",
  "created_at": "datetime",
  "follower_count": 0, "following_count": 0,
  "is_following": false, "is_followed_by": false,
  "is_blocking": false, "is_blocked_by": false
}
```

---

## 关系 (Relations)

### POST /api/v1/relations/follow/:id

关注用户。

- 权限: required
- Path: `id` — 目标用户 UUID
- 不可关注自己；被对方拉黑时返回 `403`
- 响应: `{ "message": "Followed", "success": true }`

### DELETE /api/v1/relations/follow/:id

取消关注。

- 权限: required
- Path: `id` — 目标用户 UUID
- 响应: `{ "message": "Unfollowed", "success": true }`

### GET /api/v1/relations/followers

我的粉丝列表。

- 权限: required
- Query: `page`, `page_size` (max 50)
- 响应: 分页，每项: `{ "id": "uuid", "username": "string", "avatar_url"?: "string", "bio"?: "string" }`

### GET /api/v1/relations/following

我的关注列表。

- 权限: required
- Query: `page`, `page_size` (max 50)
- 响应: 分页，每项同粉丝格式

### POST /api/v1/relations/block/:id

拉黑用户。拉黑后自动解除双方关注。

- 权限: required
- Path: `id` — 目标用户 UUID
- 响应: `{ "message": "Blocked", "success": true }`

### DELETE /api/v1/relations/block/:id

取消拉黑。

- 权限: required
- Path: `id` — 目标用户 UUID
- 响应: `{ "message": "Unblocked", "success": true }`

### GET /api/v1/relations/blocked

我的黑名单。

- 权限: required
- Query: `page`, `page_size` (max 50)
- 响应: 分页，每项同粉丝格式

### GET /api/v1/relations/status/:id

查询与目标用户的关系状态。

- 权限: required
- Path: `id` — 目标用户 UUID
- 响应:

```json
{
  "is_following": false,
  "is_followed_by": false,
  "is_blocking": false,
  "is_blocked_by": false
}
```
