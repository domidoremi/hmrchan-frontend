# 管理后台

## 健康检查

### GET /health

基础健康检查。不经过 V1Envelope。

- 权限: public
- 响应:

```json
{
  "status": "healthy|degraded|unhealthy",
  "checks": {
    "database": "ok|error",
    "redis": "ok|error|unavailable"
  }
}
```

- `unhealthy`（数据库不可用）返回 `503`
- `degraded`（Redis 不可用）返回 `200`

### GET /metrics

Prometheus 指标。不经过 V1Envelope。

- 权限: public
- 响应: Prometheus text format

### GET /api/v1/admin/health/detailed

详细健康检查（含延迟）。

- 权限: admin
- 响应:

```json
{
  "status": "healthy|unhealthy",
  "timestamp": "datetime",
  "checks": {
    "database": { "status": "ok", "latency_ms": 0 },
    "redis": { "status": "ok", "latency_ms": 0 },
    "runtime": { "goroutines": 0, "alloc_mb": 0, "sys_mb": 0, "gc_cycles": 0 }
  }
}
```

- 不健康时返回 `503`

### GET /api/v1/admin/db/health

数据库连接池状态。

- 权限: admin
- 响应:

```json
{
  "pool": {
    "max_open": 0,
    "open": 0,
    "in_use": 0,
    "idle": 0,
    "wait_count": 0,
    "wait_duration": "string"
  },
  "pg_connections": [{ "state": "string", "count": 0 }]
}
```

---

## 系统统计

### GET /api/v1/admin/stats/system

系统统计。

- 权限: admin
- 响应:

```json
{
  "users": 0,
  "posts": 0,
  "authors": 0,
  "media_files": 0,
  "feedbacks": 0,
  "today_posts": 0,
  "today_users": 0
}
```

### GET /api/v1/admin/cache/stats

Redis 缓存统计（原始 INFO 输出）。

- 权限: admin
- 响应: `{ "redis_info": "string" }`

### POST /api/v1/admin/cache/clear

清除缓存。

- 权限: admin
- Query: `pattern` (可选，SCAN 匹配模式；为空则 FLUSHDB)
- 响应: `{ "message": "Cache cleared", "deleted_keys"?: 0 }`

### GET /api/v1/admin/feedbacks

反馈列表。

- 权限: admin
- Query: `page`, `page_size` (max 100)
- 响应: 分页，每项: `{ "id": "uuid", "message": "string", "contact"?: "string", "category"?: "string", "ip_address"?: "string", "created_at": "datetime" }`

### GET /api/v1/admin/metrics

系统指标。

- 权限: admin
- 响应:

```json
{
  "posts_by_platform": [{ "platform": "string", "count": 0 }],
  "runtime": { "goroutines": 0, "alloc_mb": 0 },
  "timestamp": "datetime"
}
```

---

## 爬虫管理 (Crawler)

### GET /api/v1/crawler/status

爬虫运行状态。包含 Redis 实时锁和调度信息。

- 权限: admin
- 响应:

```json
{
  "platforms": [{
    "config_id": 0, "platform": "string",
    "is_running": false,
    "last_run_at"?: "datetime", "last_success_at"?: "datetime",
    "last_error_at"?: "datetime", "last_error_message"?: "string",
    "total_runs": 0, "success_count": 0, "error_count": 0,
    "lock_holder"?: "string", "lock_ttl_sec"?: 0,
    "next_run_at"?: "string"
  }]
}
```

### GET /api/v1/crawler/platforms/status

同 `/crawler/status`（别名）。

- 权限: admin

### GET /api/v1/crawler/config

爬虫配置列表（5 分钟 Redis 缓存）。

- 权限: admin
- 响应:

```json
[{
  "id": 0, "platform": "string", "name": "string",
  "target_url": "string", "interval_sec": 0,
  "enabled": true, "tool": "yt-dlp|gallery-dl",
  "tool_config"?: {}
}]
```

### PUT /api/v1/crawler/config

更新爬虫配置。

- 权限: admin
- Body:

```json
{
  "platform": "string",
  "name"?: "string",
  "tool_config"?: {},
  "enabled"?: true
}
```

- 更新后自动清除配置缓存
- 响应: `{ "id": 0, "platform": "string", "name": "string", "enabled": true }`

---

## 处理器 (Processor)

### POST /api/v1/processor/scan

触发文件扫描。

- 权限: admin
- Body: `{ "platform"?: "string", "hours"?: 0 }`
- 响应: `{ "task_id": "pending", "status": "scheduled", "message": "string" }`

### POST /api/v1/processor/scan/failed

触发失败帖子重处理。

- 权限: admin
- Query: `limit` (1-1000, default 100)
- 响应: `{ "task_id": "pending", "status": "scheduled", "message": "string" }`

### GET /api/v1/processor/stats

处理统计。

- 权限: admin
- 响应: `{ "total_files": 0, "processed": 0, "failed": 0, "pending": 0 }`

### GET /api/v1/processor/tasks/:task_id

任务状态查询。

- 权限: admin
- 响应: `{ "task_id": "string", "status": "unknown", "ready": false }`

### GET /api/v1/processor/watcher/status

文件监视器状态。

- 权限: admin
- 响应: `{ "status": "unavailable", "message": "string" }`

---

## 用户管理 (Users Admin)

### GET /api/v1/users

用户列表。

- 权限: admin
- Query: `page`, `page_size` (max 100), `q` (搜索用户名/邮箱/姓名), `is_active`, `is_admin`, `is_verified`, `role_id`, `sort_by` (default created_at), `sort_order` (asc|desc)
- 响应: 分页，每项: `{ "id": "uuid", "username": "string", "email": "string", "full_name"?: "string", "avatar_url"?: "string", "is_active": true, "is_admin": false, "is_verified": true, "created_at": "datetime", "last_login_at"?: "datetime" }`

### GET /api/v1/users/:id

用户详情（含角色）。

- 权限: admin
- Path: `id` — 用户 UUID 或内部 ID
- 响应: 用户完整信息 + `roles` 数组

### DELETE /api/v1/users/:id

删除用户。不可删除自己或最后一个管理员。

- 权限: admin
- 响应: `{ "message": "User deleted successfully", "success": true }`

### GET /api/v1/users/:id/stats

用户统计。

- 权限: admin
- 响应: `{ "favorites_count": 0, "comments_count": 0, "posts_count": 0, "views_count": 0 }`

### POST /api/v1/users/:id/roles

分配角色。

- 权限: admin
- Body: `{ "role_ids": [1, 2] }`
- 响应: `{ "message": "Roles assigned successfully", "success": true }`

### GET /api/v1/users/:id/roles

获取用户角色。

- 权限: admin
- 响应: 角色对象数组

---

## 角色管理 (Roles)

### POST /api/v1/roles

创建角色。

- 权限: admin
- Body: `{ "name": "string", "display_name": "string", "description"?: "string", "permissions"?: ["string"] }`
- 角色名不可重复
- 响应 (201): 角色对象

### GET /api/v1/roles

角色列表。

- 权限: admin
- Query: `page`, `page_size` (max 100), `q` (搜索), `is_system`, `sort_by` (default name), `sort_order`
- 响应: 分页，每项含 `permission_count`, `user_count`

### GET /api/v1/roles/permissions/list

可用权限列表。

- 权限: admin
- 响应: 按模块分组的权限定义

### GET /api/v1/roles/:id

角色详情。

- 权限: admin
- 响应: 角色对象（含完整 permissions 数组）

### PATCH /api/v1/roles/:id

更新角色。

- 权限: admin
- Body: `{ "display_name"?: "string", "description"?: "string", "permissions"?: [] }`
- 响应: 更新后的角色对象

### DELETE /api/v1/roles/:id

删除角色。系统角色和已分配用户的角色不可删除。

- 权限: admin
- 响应: `{ "message": "Role deleted successfully", "success": true }`

### PUT /api/v1/roles/:id/permissions

更新角色权限（全量替换）。

- 权限: admin
- Body: `{ "permissions": ["string"] }`
- 响应: 更新后的角色对象

### GET /api/v1/roles/:id/users

角色下的用户列表。

- 权限: admin
- 响应: 用户对象数组（含 `granted_at`）

---

## 举报管理 (Reports Admin)

### GET /api/v1/reports

举报管理列表。

- 权限: admin
- Query: `page`, `page_size` (max 100), `status` (pending|resolved|rejected), `target_type`
- 响应: 分页，每项含 `reporter_username`, `reviewer_username`

### GET /api/v1/reports/stats/summary

举报统计。

- 权限: admin
- 响应:

```json
{
  "total": 0, "pending": 0, "resolved": 0, "rejected": 0,
  "by_type": { "comment": 0, "post": 0, "user": 0 },
  "by_reason": { "spam": 0, ... }
}
```

### GET /api/v1/reports/:id

举报详情。

- 权限: admin
- Path: `id` — 举报 UUID
- 响应: 完整举报对象

### PATCH /api/v1/reports/:id

审核举报。

- 权限: admin
- Body: `{ "status": "resolved|rejected", "resolution_note"?: "string" }`
- 响应: 更新后的举报对象

---

## 日程管理 (Schedules Admin)

### POST /api/v1/schedules

创建日程。

- 权限: admin
- 详见 `03-schedules-community.md`

### DELETE /api/v1/schedules/:id

删除日程。

- 权限: admin
- 详见 `03-schedules-community.md`

---

## 审计日志 (Audit)

### GET /api/v1/audit/my-activity

我的活动日志。IP 地址脱敏显示。

- 权限: required
- Query: `days` (1-365, default 30), `limit` (1-200, default 50), `event_type` (可选筛选)
- 响应:

```json
{
  "logs": [{
    "id": 0, "event_type": "string",
    "event_description"?: "string", "severity": "string",
    "success": true, "ip_address": "1.2.***.***",
    "device_type"?: "string", "request_path"?: "string",
    "created_at": "datetime"
  }],
  "total": 0
}
```

### GET /api/v1/audit/my-security-summary

我的安全摘要。

- 权限: required
- Query: `days` (1-365, default 30)
- 响应:

```json
{
  "total_logins": 0, "failed_logins": 0,
  "password_changes": 0, "new_devices": 0,
  "security_events": 0,
  "last_login"?: "datetime",
  "last_password_change"?: "datetime"
}
```

### GET /api/v1/audit/admin/security-events

安全事件列表。IP 地址完整显示。

- 权限: admin
- Query: `hours` (1-168, default 24), `limit` (1-500, default 100), `severity`
- 响应: `{ "logs": [...], "total": 0 }`

### GET /api/v1/audit/admin/failed-logins

失败登录 IP 统计。

- 权限: admin
- Query: `hours` (1-168, default 24), `min_count` (default 3)
- 响应: `[{ "ip_address": "string", "count": 0 }]`

### GET /api/v1/audit/admin/user/:user_id

指定用户的审计日志。

- 权限: admin
- Path: `user_id` — 用户 UUID 或内部 ID
- Query: `days` (1-365, default 30), `limit` (1-500, default 100)
- 响应: `{ "logs": [...], "total": 0 }`

---

## 账户管理 (Account Admin)

### POST /api/v1/account/admin/cleanup-expired

清理过期已删除账户（超过 30 天保留期）。

- 权限: admin
- 响应: `{ "message": "Cleaned up expired accounts", "success": true, "count": 0 }`
