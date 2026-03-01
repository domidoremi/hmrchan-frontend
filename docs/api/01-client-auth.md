# 客户端安全 & 认证

## 客户端安全

### POST /api/v1/client/init

初始化客户端，获取 client token 和是否需要验证。

- 权限: public
- Body: `{ "client_fingerprint": "string" }`
- 响应: 由 `security.ProcessClientInit` 返回的信任级别和 challenge 信息

### POST /api/v1/client/verify

通过 Turnstile 验证后调用。

- 权限: public
- Body: `{ "turnstile_token": "string" }`
- 响应: `{ "success": true, "trust_level": "basic", "message": "Verification successful" }`

### GET /api/v1/client/status

查询当前信任级别。

- 权限: public
- 响应: `{ "trust_level": "string", "challenge_required": bool, "turnstile_site_key"?: "string" }`

---

## 认证 (Auth)

### GET /api/auth/turnstile-config

获取 Turnstile 配置。

- 权限: public
- 响应: `{ "enabled": bool, "site_key": "string" }`

### POST /api/auth/register

用户注册。

- 权限: public
- Body:

```json
{
  "username": "string (3-100)",
  "email": "string (email)",
  "password": "string",
  "full_name"?: "string",
  "verification_code": "string",
  "turnstile_token"?: "string",
  "register_token"?: "string"
}
```

- 响应 (201): `LoginResp`（见下方）
- Set-Cookie: refresh token

### POST /api/auth/login

用户登录。有额外的登录频率限制。

- 权限: public
- Body:

```json
{
  "username": "string (用户名或邮箱)",
  "password": "string",
  "device_name"?: "string",
  "device_type"?: "string",
  "turnstile_token"?: "string"
}
```

- 响应: `LoginResp`
- 如果用户启用了 2FA，返回 `{ "requires_2fa": true, "pending_token": "string" }`
- Header `X-Security-Warning` 在检测到异常登录时设置

#### LoginResp 结构

```json
{
  "access_token": "string",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_threshold": 300,
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "full_name"?: "string",
    "avatar_url"?: "string",
    "bio"?: "string",
    "is_active": true,
    "is_admin": false,
    "is_verified": true,
    "email_verified_at"?: "datetime",
    "totp_enabled": false,
    "created_at": "datetime",
    "last_login_at"?: "datetime"
  }
}
```

### POST /api/auth/refresh

刷新 Access Token，轮换 Refresh Token。

- 权限: public（需要有效的 refresh cookie）
- 响应: `LoginResp`
- Set-Cookie: 新的 refresh token

### POST /api/auth/logout

登出。

- 权限: public（可选 Bearer token + refresh cookie）
- Body (可选): `{ "all_devices": false }`
- 响应: `{ "message": "Logged out successfully", "all_devices": false }`

### POST /api/auth/heartbeat

心跳检测，刷新 access token。

- 权限: public（需要有效的 refresh cookie）
- 响应: `{ "access_token": "string", "token_type": "bearer", "expires_in": int, "refresh_threshold": int, "server_time": "datetime" }`

### GET /api/auth/me

获取当前用户信息。

- 权限: required
- 响应: `UserAuthResp`（同 LoginResp.user）

### POST /api/auth/verify-password

验证密码，获取临时验证 token。

- 权限: required
- Body: `{ "password": "string" }`
- 响应: `{ "verified": bool, "verification_token"?: "string", "expires_in"?: 300, "message": "string" }`

### POST /api/auth/verify-identity

身份验证（用于敏感操作）。

- 权限: required
- Body: `{ "password": "string", "action": "string", "resource_id"?: "string" }`
- action 可选值: `delete_account`, `change_email`, `change_password`, `update_security_settings`, `export_data`, `revoke_sessions`, `delete_content`, `manage_api_keys`, `admin_operation`
- 响应: `{ "verified": true, "verification_token": "string", "action": "string", "expires_in": 300, "message": "string" }`

### GET /api/auth/sessions

获取当前用户的活跃会话列表。

- 权限: required
- 响应: `{ "sessions": [{ "id": int, "device_name": "string", "device_type": "string", "ip_address": "string", "created_at": "datetime", "last_used_at": "datetime", "is_current": false }], "total": int }`

### DELETE /api/auth/sessions/:id

撤销指定会话。

- 权限: required
- 响应: `204 No Content`
