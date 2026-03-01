# 举报、设备、账户

## 举报 (Reports)

### POST /api/v1/reports

提交举报。

- 权限: required
- Body:

```json
{
  "target_type": "comment|post|user",
  "target_id": 0,
  "reason": "string (1-100)",
  "description"?: "string"
}
```

- 不可举报自己；同一目标不可重复提交 pending 状态的举报
- 响应 (201): `{ "id": "uuid", "target_type": "string", "target_id": 0, "reason": "string", "description"?: "string", "status": "pending", "created_at": "datetime" }`

### GET /api/v1/reports/my

我的举报列表。

- 权限: required
- Query: `page`, `page_size` (max 50)
- 响应: 举报对象数组

---

## 设备 (Devices)

### GET /api/v1/devices

设备列表。

- 权限: required
- 响应:

```json
{
  "devices": [{
    "id": 0, "fingerprint": "abcd1234...",
    "device_name"?: "string", "device_type": "string",
    "browser": "string", "os": "string",
    "is_trusted": false, "is_current": false,
    "login_count": 0, "last_login_at": "datetime",
    "last_ip": "string", "first_seen_at": "datetime",
    "device_info": "Chrome on Windows"
  }],
  "total": 0
}
```

### GET /api/v1/devices/current

当前设备信息。

- 权限: required
- 响应: 设备对象（`is_current: true`）

### POST /api/v1/devices/trust

信任设备。

- 权限: required
- Body: `{ "device_id": 0 }`
- 响应: `{ "message": "Device trusted successfully", "success": true }`

### POST /api/v1/devices/untrust

取消信任。

- 权限: required
- Body: `{ "device_id": 0 }`
- 响应: `{ "message": "Device untrusted successfully", "success": true }`

### POST /api/v1/devices/rename

重命名设备。

- 权限: required
- Body: `{ "device_id": 0, "device_name": "string (max 255)" }`
- 响应: `{ "message": "Device renamed successfully", "success": true }`

### DELETE /api/v1/devices/:id

撤销设备。

- 权限: required
- 响应: `{ "message": "Device revoked successfully", "success": true }`

### DELETE /api/v1/devices

撤销所有其他设备（保留当前设备）。

- 权限: required
- 响应: `{ "message": "All other devices revoked", "success": true, "revoked_count": 0 }`

---

## 账户 (Account)

### GET /api/v1/account/data-summary

账户数据摘要。

- 权限: required
- 响应:

```json
{
  "user_id": "uuid",
  "username": "string",
  "email": "string",
  "created_at": "datetime",
  "data_counts": {
    "favorites": 0,
    "comments": 0,
    "discussions": 0,
    "discussion_comments": 0,
    "following": 0,
    "followers": 0,
    "search_history": 0,
    "browsing_history": 0,
    "notifications": 0,
    "reports": 0
  }
}
```

### POST /api/v1/account/export-data

导出用户数据（JSON 下载）。

- 权限: required
- 响应: JSON 文件下载（`Content-Disposition: attachment`），包含用户信息、收藏、评论、讨论、搜索/浏览历史

### GET /api/v1/account/deletion-status

查询账户删除状态。

- 权限: required
- 响应:

```json
{
  "is_deleted": false,
  "can_restore": false,
  "deleted_at"?: "datetime",
  "permanent_delete_at"?: "datetime",
  "days_remaining"?: 0
}
```

### POST /api/v1/account/delete

申请删除账户（软删除，30 天保留期）。

- 权限: required
- Body: `{ "reason"?: "string", "confirm": true }`
- 最后一个管理员不可删除
- 响应: `{ "message": "Account scheduled for deletion...", "success": true }`

### POST /api/v1/account/restore

恢复已删除账户（保留期内）。

- 权限: required
- 响应: `{ "message": "Account restored successfully. Welcome back!", "success": true }`
