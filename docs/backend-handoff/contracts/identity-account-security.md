# Identity / Account / Security

## 域边界

- client bootstrap / request-signing bootstrap
- auth / sessions / Google direct login
- account personalization preferences
- devices / audit / account export-delete flows
- MFA / WebAuthn / email verification-change flows

## 数据分类

- `canonical`：users, sessions, identities, verification tokens, MFA credentials
- `derived`：风险摘要、设备展示态、安全摘要
- `ephemeral`：bootstrap token、rate-limit buckets、contract-version gate metadata

## 现役公开路径

- `/api/v1/client/*`
- `/api/v1/auth/*`
- `/api/v1/preferences`
- `/api/v1/users/me/*`
- `/api/v1/devices*`
- `/api/v1/account*`
- `/api/v1/2fa*`
- `/api/v1/email/*`
- `/api/v1/upload/avatar`
- `/api/v1/audit/*`

## 路由归属说明

- `/api/v1/preferences` 固定归类为 account personalization resource
- `/api/v1/preferences` 保留 `GET/PUT/PATCH/DELETE`
- `PATCH /api/v1/preferences` 是 canonical partial update
- `PUT /api/v1/preferences` 仅作为现存兼容写法记录，不再扩展新语义

## PATCH 与 contract gate

- 本域 `PATCH` 统一采用 JSON Merge Patch (RFC 7396)
- 缺失字段：不更新
- `null`：清空 nullable 字段
- `""`：真实值，不表示忽略
- 前端必须发送 `X-Client-Contract-Version`
- 后端返回 `X-Server-Contract-Version`
- 版本不匹配时，受保护路径返回 `426 Upgrade Required`

## 迁移与退役事实

- 旧 `/api/auth/*` 已整体退役
- 当前认证入口统一收口到 `/api/v1/auth/*`
- 本 wave 不再新增路由迁移，仅固化现役 contract 与发布门禁

## OpenAPI artifact

- `docs/contracts/openapi/identity-account-security.openapi.yaml`
