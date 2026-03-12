# 客户端安全 & 认证

## 客户端安全

### POST /api/v1/client/init

初始化客户端，获取 client token 和是否需要验证。

- 权限: public
- Body: `{ "client_fingerprint": "string", "timezone"?: "string", "screen_resolution"?: "string", "platform"?: "string", "timestamp"?: number, "nonce"?: "string" }`
- 响应: 由 `security.ProcessClientInit` 返回的信任级别和 challenge 信息
- 说明:
  - 首次初始化会返回 `client_token` + `client_secret`
  - 当服务端发现旧的签名密钥缓存已失效时，会在此接口上轮换并重新下发 `client_token` + `client_secret`
  - 正常回访且服务端密钥仍有效时，可能只返回 trust/challenge 信息而不重复下发密钥
  - 当请求签名校验器（Redis）不可用时，此接口仍可返回 trust/challenge 信息，但不会下发新的签名凭证

### POST /api/v1/client/verify

通过 Turnstile 验证后调用。

- 权限: public
- Body: `{ "turnstile_token": "string" }`
- 响应: `{ "success": true, "trust_level": "basic", "message": "Verification successful" }`

### GET /api/v1/client/status

查询当前信任级别。

- 权限: public
- 响应: `{ "trust_level": "string", "challenge_required": bool, "turnstile_site_key"?: "string" }`

### 客户端安全头约定

- 下列请求应始终携带：
  - `X-Client-Fingerprint`
  - `X-Client-Token`
  - `X-Timestamp`
  - `X-Signature`
- 当前后端会对以下请求强制签名校验：
  - 所有 `/api/auth/*`（`/api/auth/turnstile-config` 除外）
  - 所有带认证上下文的请求（Bearer / refresh cookie）
  - 所有非 `GET` / `HEAD` 的业务写请求
  - 管理与敏感路径（如 `/api/v1/admin/*`、`/api/v1/users*`、`/api/v1/roles*`、`/api/v1/crawler*`）
- 缺失或错误的请求签名会返回 `403`，响应体为 `{ "detail": { "message": "Invalid request signature", "code": "INVALID_SIGNATURE" } }`
- 当客户端签名密钥已失效/丢失时，会返回 `403`，响应体为 `{ "detail": { "message": "Client token expired", "code": "CLIENT_TOKEN_EXPIRED" } }`，并附带响应头 `X-Client-Reinit-Required: true`
- 当请求签名校验器不可用时，所有强制签名请求直接 fail closed，返回 `503`，响应体为 `{ "detail": { "message": "Request integrity verification unavailable", "code": "SIGNATURE_VERIFIER_UNAVAILABLE" } }`

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
- 如果登录被判定为高风险，服务端不会立即签发 access/refresh token，而是返回 `{ "requires_risk_verification": true, "pending_token": "string", "challenge_type": "email_code", "expires_in": 300 }`
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

- 当登录被判定为异常时返回 `X-Security-Warning: low|medium|high`
- 当登录被判定为高风险时额外返回 `X-Security-Review-Required: true`

### POST /api/auth/verify-risk-login

完成高风险登录确认。仅当 `/api/auth/login` 或 `/api/v1/2fa/verify-login` 返回 `requires_risk_verification=true` 时调用。

- 权限: public（敏感操作频率限制）
- `pending_token` 为 5 分钟有效期的短时 JWT，并绑定当前请求设备指纹
- Body:

```json
{
  "pending_token": "string",
  "verification_code": "string",
  "device_name"?: "string",
  "device_type"?: "string",
  "turnstile_token"?: "string"
}
```

- 当 `TURNSTILE_ENABLED=true` 且当前访客未建立信任时，需要提供 `turnstile_token`
- 响应: `LoginResp`
- Set-Cookie: refresh token

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
- `verification_token` 为 5 分钟有效期的短时 JWT，绑定当前请求设备指纹
- 需要 step-up 的接口可通过 JSON 字段 `verification_token`、请求头 `X-Verification-Token` 提交该令牌；对 `DELETE` 等无请求体接口，也支持 `verification_token` 查询参数
- 响应: `{ "verified": bool, "verification_token"?: "string", "expires_in"?: 300, "current_device_trusted"?: bool, "step_up_required"?: bool, "message": "string" }`

### POST /api/auth/verify-identity

身份验证（用于敏感操作）。

- 权限: required
- Body: `{ "password": "string", "action": "string", "resource_id"?: "string" }`
- action 可选值: `delete_account`, `change_email`, `change_password`, `update_security_settings`, `export_data`, `revoke_sessions`, `delete_content`, `manage_api_keys`, `admin_operation`
- `verification_token` 为 5 分钟有效期的短时 JWT，绑定当前请求设备指纹与 action
- 需要 step-up 的接口可通过 JSON 字段 `verification_token`、请求头 `X-Verification-Token` 提交该令牌；对 `DELETE` 等无请求体接口，也支持 `verification_token` 查询参数
- 响应: `{ "verified": true, "verification_token": "string", "action": "string", "resource_id"?: "string", "expires_in": 300, "current_device_trusted": bool, "step_up_required": bool, "message": "string" }`

### GET /api/auth/sessions

获取当前用户的活跃会话列表。

- 权限: required
- 响应: `{ "sessions": [{ "id": int, "device_name": "string", "device_type": "string", "ip_address": "string", "created_at": "datetime", "last_used_at": "datetime", "is_current": bool }], "total": int }`

### DELETE /api/auth/sessions/:id

撤销指定会话。

- 权限: required
- 当当前设备未被信任时，必须先通过 `/api/auth/verify-password` 或 `/api/auth/verify-identity(action=revoke_sessions)` 获取 `verification_token`
- 推荐通过请求头 `X-Verification-Token` 传递令牌；也支持 `verification_token` 查询参数
- 未提供或提供错误 token 时返回 `403`，并带 `X-Verification-Required: true`
- 响应: `204 No Content`
