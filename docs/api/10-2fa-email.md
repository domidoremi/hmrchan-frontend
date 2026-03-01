# 双因素认证、邮箱验证

## 双因素认证 (2FA)

### GET /api/v1/2fa/status

查询 2FA 状态。

- 权限: required
- 响应: `{ "enabled": false, "backup_codes_remaining": 0 }`

### POST /api/v1/2fa/setup

初始化 2FA 设置。生成 TOTP 密钥和备份码。

- 权限: required（敏感操作频率限制）
- 已启用 2FA 时返回 `400`
- 响应:

```json
{
  "secret": "string",
  "qr_code": "",
  "otpauth_url": "otpauth://totp/...",
  "backup_codes": ["XXXX-XXXX-XXXX", ...]
}
```

备份码仅在此时返回明文，之后以哈希存储。

### POST /api/v1/2fa/verify

验证 TOTP 码并启用 2FA。需先调用 `/setup`。

- 权限: required（敏感操作频率限制）
- Body: `{ "code": "string (6位)" }`
- 响应: `{ "success": true, "message": "Two-factor authentication has been enabled", "backup_codes_count": 10 }`

### POST /api/v1/2fa/disable

禁用 2FA。需要密码 + TOTP 码（或备份码）。

- 权限: required（敏感操作频率限制）
- Body: `{ "code": "string", "password": "string" }`
- 响应: `{ "success": true, "message": "Two-factor authentication has been disabled" }`

### POST /api/v1/2fa/regenerate-backup-codes

重新生成备份码。需要 TOTP 码验证。

- 权限: required（敏感操作频率限制）
- Body: `{ "code": "string (6位)" }`
- 响应: `{ "backup_codes": ["XXXX-XXXX-XXXX", ...], "message": "New backup codes generated. Old codes are now invalid." }`

### POST /api/v1/2fa/verify-login

完成 2FA 登录验证。登录时若用户启用了 2FA，先返回 `pending_token`，再用此端点完成验证。

- 权限: public
- Body:

```json
{
  "pending_token": "string",
  "code": "string",
  "device_name"?: "string",
  "device_type"?: "string"
}
```

- 支持 TOTP 码和备份码
- 响应: `LoginResp`（同登录成功）
- Set-Cookie: refresh token

---

## 邮箱验证 (Email)

### POST /api/v1/email/send-registration-code

发送注册验证码。

- 权限: public（敏感操作频率限制）
- Body: `{ "email": "string", "turnstile_token"?: "string" }`
- 即使邮箱已注册也返回成功（防枚举）
- 响应: `{ "success": true, "message": "Verification code sent to your email", "expires_in": 600 }`

### POST /api/v1/email/verify-email

验证邮箱。

- 权限: public
- Body: `{ "token": "string" }`
- 支持 `registration` 和 `email_verification` 两种 token 类型
- 响应: `{ "success": true, "message": "Email verified successfully", "email_verified": true }`

### POST /api/v1/email/request-password-reset

请求密码重置。

- 权限: public（敏感操作频率限制）
- Body: `{ "email": "string", "turnstile_token"?: "string" }`
- 始终返回相同消息（防枚举）
- 响应: `{ "message": "If the email exists, a password reset link has been sent" }`

### POST /api/v1/email/reset-password

重置密码。重置后所有会话失效。

- 权限: public（敏感操作频率限制）
- Body: `{ "token": "string", "new_password": "string" }`
- 响应: `{ "success": true, "message": "Password reset successfully. Please login with your new password." }`

### POST /api/v1/email/send-verification-email

发送邮箱验证邮件（已登录用户）。

- 权限: required（敏感操作频率限制）
- 已验证邮箱返回 `400`
- 响应: `{ "message": "Verification email sent" }`

### POST /api/v1/email/send-change-password-code

发送修改密码验证码。需要当前密码。

- 权限: required（敏感操作频率限制）
- Body: `{ "password": "string" }`
- 响应: `{ "success": true, "message": "Verification code sent to your email", "retry_after": 60 }`

### POST /api/v1/email/change-password

通过验证码修改密码。修改后所有会话失效。

- 权限: required（敏感操作频率限制）
- Body: `{ "verification_code": "string", "new_password": "string" }`
- 响应: `{ "success": true, "message": "Password changed successfully. Please login with your new password." }`

### POST /api/v1/email/send-change-email-code

发送修改邮箱验证码。需要当前密码。

- 权限: required（敏感操作频率限制）
- Body: `{ "password": "string", "new_email": "string" }`
- 新邮箱已被使用返回 `400`
- 响应: `{ "success": true, "message": "Verification code sent to your new email address", "retry_after": 60 }`

### POST /api/v1/email/change-email

通过验证码修改邮箱。

- 权限: required（敏感操作频率限制）
- Body: `{ "verification_code": "string" }`
- 响应: `{ "message": "Email changed successfully", "verification_sent": false, "new_email": "string" }`
