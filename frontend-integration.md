# HMRChan 后端交付说明（面向前端团队）

## 1. 当前状态结论

本文是当前 **唯一正式交付文档**，面向主站前端、后台管理前端，以及会代发后端请求的 BFF / API Gateway。

截至 **2026-03-29 05:38:07（JST）**，当前可以严格确认的结论是：**后端子系统已经交付并生产就绪，关键后端路径已验证，当前无已知阻断；但整体系统尚未达到“完美生产状态”。**

这里的“尚未达到完美生产状态”不是在否定后端交付，而是在坚持更严格的认证口径。当前后端实现已经具备正式接入与上线准备条件，但整体系统仍缺少前端真实链路完成证明与更长时间窗口的稳定性证明，因此本文不会写成“已经达到完美生产状态”。

## 2. 本次状态确认依据

以下事实已经通过运行态或公网结果直接证明：

### 2.1 当前运行态健康

`docker compose ps` / `docker compose ps --format json` 显示以下关键服务均为 healthy：

- `api`
- `api-2`
- `caddy`
- `cloudflared`
- `authentik-server`
- `authentik-worker`
- `postgres`
- `redis`
- `celery-worker`
- `celery-worker-processor`
- `celery-beat`

当前现网还显式启用了扩展 profile，因此以下可选服务也处于 healthy：

- `celery-worker-live`
- `bgutil-provider`

### 2.2 当前公网关键探测通过

在 **2026-03-29 05:38:07（JST）** 前后的最新公网探测结果如下：

- `https://api.momichan.xyz/health/ready` = `200`
- `https://api.momichan.xyz/api/auth/turnstile-config` = `200`
- `https://api.momichan.xyz/api/v1/2fa/status` = `410`
- `https://auth.momichan.xyz/-/health/ready/` = `200`
- `https://auth.momichan.xyz/application/o/hmrchan-web/.well-known/openid-configuration` = `200`
- `https://auth.momichan.xyz/application/o/hmrchan-admin/.well-known/openid-configuration` = `200`

### 2.3 当前容器化回归通过

以下容器化检查已经通过：

- `docker compose --profile test run --rm api-test`
- `docker compose --profile test run --rm worker-test python -m unittest worker.tests.test_monitor_alerts worker.tests.test_scrape_dispatch worker.tests.test_process_lifecycle_runtime_config`
- `./deploy.sh --migration-verify-only --no-build`
- `bash -lc './deploy.sh --profile production-ha --profile feature-live --profile feature-youtube-pot --migration-verify-only --no-build'`

### 2.4 当前不能写成“完美生产状态”的直接证据

以下事实当前同样可以直接证明：

- `https://momichan.xyz/admin` = `404`
- `https://momichan.xyz/admin/auth/callback` = `404`

这说明：

- 后端为后台管理前端准备的认证接入契约已经存在
- 但后台管理前端公网入口当前并未完成上线
- 因此整体系统状态不能被写成“完美生产状态”

## 3. 后端已经完成了什么

以下内容是前端团队现在可以直接依赖的后端交付成果。

### 3.1 网关与公网入口已经完成生产收口

- 正式生产网关已经由 **Caddy** 接管，不再以 Nginx 作为正式入口。
- 当前正式公网映射为：
  - `api.momichan.xyz -> caddy:80`
  - `auth.momichan.xyz -> caddy:8082`
- Cloudflare Tunnel、内部网关探测、Telegram 健康告警都已经围绕 Caddy 拓扑收口。
- 当前健康归因维度已经固定为：
  - `Public edge`
  - `Caddy / internal gateway`
  - `Tunnel`
  - `IdP / Authentik`
  - `API`

### 3.2 统一认证中心已经落地

- Authentik 已作为统一登录中心落地。
- 双 OIDC Client 已固定：
  - `hmrchan-web`
  - `hmrchan-admin`
- API 已支持多 issuer / 多 JWKS / 多 audience 的 OIDC access token 验证。
- API 当前处于 dual-auth 阶段，同时接受：
  - legacy JWT
  - Authentik OIDC access token

### 3.3 MFA 与本地 2FA 已完成收口

- HMRChan 本地 2FA 已退役。
- `/api/v1/2fa/*` 全部固定返回 `410 Gone`。
- 统一退役错误码为 `legacy_2fa_retired`。
- `/api/auth/login` 已不再返回本地 `requires_2fa` 分支。
- 登录 MFA 已交由 Authentik 托管，当前支持：
  - `TOTP`
  - `Static backup codes`
  - `WebAuthn / Passkey`
- 一期策略为 optional：
  - 未配置 MFA 的用户允许登录
  - 已配置 MFA 的用户在 Authentik 登录时被挑战

### 3.4 身份映射与 Google 登录规则已固定

- Google 是一期唯一第三方 IdP。
- 后端已引入本地身份映射。
- 不按邮箱自动合并已存在账号。
- Google 首登邮箱冲突时，后端返回 `identity_link_required`。
- 本地数据库仍是管理员权限、用户状态、业务权限的唯一权威源。

### 3.5 迁移与部署一致性已经修复

- LF 规范化规则已覆盖 SQL / Shell / YAML / Caddy 配置。
- migration checksum 已按 LF 归一化后校验。
- legacy checksum alias 已保留兼容。
- `deploy.sh --migration-verify-only --no-build` 已收口为只执行迁移校验。
- 当前迁移已验证到 `019_retire_local_2fa.sql`，pending migration = `0`。

## 4. 前端现在必须做什么

以下内容不是建议，而是前端进入正式接入与上线准备必须完成的事项。

### 4.1 统一改接 Authentik

- 主站前端必须接入 `hmrchan-web`
- 后台管理前端必须接入 `hmrchan-admin`
- 固定回调地址：
  - `https://momichan.xyz/auth/callback`
  - `https://momichan.xyz/admin/auth/callback`
- 固定登出回调：
  - `https://momichan.xyz/auth/logout/callback`
  - `https://momichan.xyz/admin/auth/logout/callback`
- 新前端主路径使用 OIDC access token 调用 API
- legacy JWT 仅保留给旧客户端或迁移窗口

### 4.2 完全切除旧本地 2FA 心智

- 不再展示本地 2FA 建立、验证、关闭、恢复码重建 UI
- 不再把 `/api/v1/2fa/*` 作为任何正常产品路径
- 所有 `/api/v1/2fa/* = 410` 的场景统一引导到 Authentik 账户中心
- 前端登录流程不得再期待 `/api/auth/login` 返回本地 `requires_2fa` 中间态

### 4.3 完成安全接入契约

- 对签名链路完整发送：
  - `X-Client-Fingerprint`
  - `X-Client-Token`
  - `X-Timestamp`
  - `X-Signature`
- 对 refresh cookie 相关请求启用 cookie 透传
- 对敏感动作先拿 `verification token`，再带 `X-Verification-Token`
- 对 dual-auth 迁移期实现 legacy / OIDC 认证来源区分展示

### 4.4 实现固定异常分支处理

前端必须处理：

- `identity_link_required`
- `legacy_2fa_retired`
- `X-Client-Reinit-Required`
- `X-Verification-Required`
- `requires_risk_verification`
- `401` 设备指纹不匹配

### 4.5 按真实接口行为解析

- `/api/auth/*` 按普通 JSON 解析
- `/api/v1/*` 按 V1 Envelope 解析
- `204 / 304 / 下载 / 流式 / 媒体二进制` 走例外分支
- 错误处理不能只看单一 `error.code` 字段，必须同时参考 HTTP 状态、响应头与兼容字段

## 5. 当前为什么不能认证为“完美生产状态”

当前不能写成“完美生产状态”，原因不是后端主功能未完成，而是现有证据仍不足以支撑**整体系统**的严格认证。

至少还缺少以下证明：

- 更长时间窗口的稳定运行与告警静默证明
- 主站前端真实 OIDC 登录链路验收
- 后台管理前端真实 OIDC 登录链路验收
- Google 首登、邮箱冲突、风险登录、MFA 挑战、RP 登出等真实浏览器链路验收
- 后台管理前端公网入口上线证明

因此，当前唯一严谨的结论应是：

- **后端子系统已交付并生产就绪**
- **当前无已知阻断**
- **整体系统尚未达到完美生产状态**

## 6. 接口与行为明细说明

下文保留并扩展当前后端已经实现的接口、返回体、状态码、头部约定、Cookie 约定、异常分支与联调清单。所有内容均以当前代码实现为准，不包含代码示例。

## 7. 文档范围

本文档只记录当前后端代码已经实现且可直接从代码证明的联调事实，覆盖：

- 主站前端
- 后台管理前端
- 会代发后端请求的 BFF / API Gateway

本文档不包含：

- 前端框架示例代码
- SDK 实现代码
- UI 交互细节

本文档依据的后端入口主要包括：

- `go-api/internal/router/*.go`
- `go-api/internal/middleware/*.go`
- `go-api/internal/handler/*.go`
- `go-api/internal/security/*.go`
- `go-api/internal/config/config.go`
- 当前部署配置与运行时环境变量

## 8. 全局请求处理链

所有请求在进入具体 handler 之前，统一经过以下中间件顺序：

- `Prometheus`
- `HTTPSRedirect`
- `Logger`
- `Recovery`
- `RequestID`
- `RequestTimeout`
- `SecurityHeaders`
- `CORS`
- `APIProtection`
- `BehavioralAnalysis`
- `RequestIntegrity`
- `RateLimit`
- `TurnstileGuard`
- `InputSanitizer`
- `AuditLog`
- `ETag`
- `V1Envelope`

前端联调最需要关注的影响：

- `RequestID` 会生成或透传 `X-Request-ID`
- `RequestTimeout` 默认请求超时 `30s`，以下前缀使用 `120s`：
  - `/api/v1/media/`
  - `/api/v1/upload`
  - `/api/v1/admin`
  - `/api/v1/crawler`
  - `/api/v1/processor`
- `RequestTimeout` 不作用于以下前缀：
  - `/ws`
  - `/health`
  - `/metrics`
- `SecurityHeaders` 固定写入：
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`

## 9. 路由、鉴权与响应基线

### 9.1 路由分组

| 分组             | 路径                                                                                                                                                                                                                | 鉴权                                                                    | 签名                                                                       | 响应格式    | 备注                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------- |
| 客户端信任初始化 | `/api/v1/client/*`                                                                                                                                                                                                  | 否                                                                      | `init`、`verify` 不需要；`status` 在游客 `GET` 场景通常不需要              | V1 Envelope | 用于 `client_token` / Turnstile 信任态                           |
| 认证公共接口     | `/api/auth/turnstile-config`、`/api/auth/register`、`/api/auth/login`、`/api/auth/verify-risk-login`、`/api/auth/refresh`、`/api/auth/logout`、`/api/auth/heartbeat`                                                | `refresh/logout/heartbeat` 不走 `AuthRequired`，但依赖 cookie 或 bearer | `turnstile-config` 之外都需要                                              | 普通 JSON   | `/api/auth/*` 不走 V1 Envelope                                   |
| 认证保护接口     | `/api/auth/me`、`/api/auth/verify-password`、`/api/auth/verify-identity`、`/api/auth/sessions*`                                                                                                                     | 是                                                                      | 是                                                                         | 普通 JSON   | 会话管理、敏感校验                                               |
| 公共业务读取     | `/api/v1/*` 的公开 `GET/HEAD` 路由                                                                                                                                                                                  | 否，可选透传 bearer 进入 OptionalAuth                                   | 游客只读通常不需要；如果请求自带 bearer / refresh cookie，则会触发签名校验 | V1 Envelope | 公共读取路由挂了 `OptionalAuth + ContentLimit`                   |
| 公共业务写入     | `/api/v1/feedback`、`/api/v1/contact/send`、公开 `email` 子集（`send-registration-code` / `verify-email` / `request-password-reset` / `reset-password`）、`/api/v1/account/restore` 等                              | 否                                                                      | 是                                                                         | V1 Envelope | 所有非 `GET/HEAD` 的公共写请求都需要签名                         |
| 登录态业务接口   | `/api/v1/*` 登录态路由                                                                                                                                                                                              | 是                                                                      | 是                                                                         | V1 Envelope | 例如 favorites、notifications、devices、upload、history、reports |
| 管理接口         | `/api/v1/admin/*`、管理员 `users` 子集、`/api/v1/roles*`、`/api/v1/crawler*`、`/api/v1/processor*`、管理员 `reports` 子集、`/api/v1/schedules` 的创建/删除子集、`/api/v1/upload/users/*`、`/api/v1/account/admin/*` | `AuthRequired + AdminRequired`                                          | 是                                                                         | V1 Envelope | 多数写操作还要求 `X-Verification-Token`                          |

### 9.2 `/api/v1/*` 统一响应包装

`/api/v1/*` 默认会被包装为统一 V1 Envelope。成功响应至少包含：

- `success`
- `data`
- `meta.api_version`
- `meta.request_id`
- `meta.timestamp`

分页响应会额外包含：

- `pagination.page`
- `pagination.page_size`
- `pagination.total`
- `pagination.total_pages`

### 9.3 V1 Envelope 例外

以下响应不会被包装：

- 所有 `/api/auth/*`
- 路径包含 `/stream`
- 路径包含 `/download`
- `/api/v1/media/*` 中除 `thumbnail` 以外的路径会在路径层面直接跳过包装
- 非 JSON 响应
- `204 No Content`
- `304 Not Modified`

联调含义：

- `DELETE` 成功后返回 `204` 的接口，前端不要再按 JSON envelope 解析
- `GET /api/v1/media/:id` 返回的是原始 JSON 元数据，但不是 V1 envelope
- `/api/v1/media/:id/stream`、`/subtitle`、`/download` 的成功响应按文本或二进制资源处理
- `/api/v1/media/:id/thumbnail` 的成功响应通常是图片 / SVG，不按 envelope 解析；但如果该路由失败并返回 JSON，仍可能被包装成 V1 envelope

### 9.4 V1 错误码映射

V1 Envelope 顶层 `error.code` 不是业务原始错误码，而是按 HTTP 状态统一映射：

| HTTP 状态 | 顶层 `error.code`  |
| --------- | ------------------ |
| `400`     | `BAD_REQUEST`      |
| `401`     | `UNAUTHORIZED`     |
| `403`     | `FORBIDDEN`        |
| `404`     | `NOT_FOUND`        |
| `409`     | `CONFLICT`         |
| `422`     | `VALIDATION_ERROR` |
| `429`     | `RATE_LIMITED`     |

重要说明：

- 对 `/api/v1/*` 而言，底层中间件原始错误码例如 `CHALLENGE_REQUIRED`、`INVALID_SIGNATURE`、`CLIENT_TOKEN_EXPIRED`、`VERIFICATION_REQUIRED` 并不保证稳定出现在顶层 `error.code`
- 某些 handler 原始返回体是 `{"detail":"..."}`，包装后 `error.message` 为字符串
- 某些 handler 原始返回体是 `{"detail":{"message":"...","code":"..."}}` 或 `{"success":false,"error":{...}}`，包装后 `error.message` 可能是对象，或对象的 JSON 字符串
- 前端对 `/api/v1/*` 的异常分支应优先基于：
  - HTTP 状态码
  - 顶层 `error.code`
  - 专用响应头
  - 原始 detail 信息的兼容解析

`/api/auth/*` 不经过 V1 Envelope，仍按 handler 原始 JSON 解析。

## 10. 请求头、CORS 与 Cookie 约定

### 10.1 请求头矩阵

| 头                                     | 何时应发送               | 说明                                                                                   |
| -------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| `Authorization: Bearer <access_token>` | 所有登录态接口           | 访问令牌                                                                               |
| `X-Client-Fingerprint`                 | 前端应在初始化后始终发送 | 设备绑定首选指纹；缺失时后端会回退到服务端根据请求头计算的指纹，但这会降低前端可预测性 |
| `X-Client-Token`                       | 所有需要签名的请求       | 由 `/api/v1/client/init` 首次签发或 `force_reissue` 重发                               |
| `X-Timestamp`                          | 所有需要签名的请求       | 秒级 Unix 时间戳，允许误差约 `±30s`                                                    |
| `X-Signature`                          | 所有需要签名的请求       | 使用 `client_secret` 计算的 HMAC-SHA256 十六进制小写字符串                             |
| `X-Verification-Token`                 | 所有高风险敏感操作       | 用于二次身份校验；如果带了 header，会优先于 query/body 中的同名字段                    |
| `X-Request-ID`                         | 可选                     | 不传则后端自动生成；响应中一定会有                                                     |

说明：

- CORS 允许头里包含 `X-Device-Fingerprint`，但当前后端认证/会话绑定代码读取的是 `X-Client-Fingerprint`
- 如果前端网关会改写路径或查询串，签名时使用的 `PATH_WITH_OPTIONAL_QUERY` 必须与真正转发给后端的路径完全一致

### 10.2 CORS 实际允许的请求头

后端当前允许的 CORS 请求头为：

- `Origin`
- `Content-Type`
- `Authorization`
- `X-Request-ID`
- `X-CSRF-Token`
- `X-Device-Fingerprint`
- `X-Client-Token`
- `X-Client-Fingerprint`
- `X-Signature`
- `X-Timestamp`
- `X-Verification-Token`

后端当前暴露给浏览器读取的响应头为：

- `Content-Length`
- `X-Request-ID`
- `X-API-Version`
- `X-Security-Warning`
- `X-Security-Review-Required`
- `X-Verification-Required`
- `X-Client-Reinit-Required`

### 10.3 Cookie

代码默认值如下：

| 配置项                         | 代码默认值                                                     |
| ------------------------------ | -------------------------------------------------------------- |
| `AUTH_REFRESH_COOKIE_NAME`     | `refresh_token`                                                |
| `AUTH_REFRESH_COOKIE_PATH`     | `/api`                                                         |
| `AUTH_REFRESH_COOKIE_HTTPONLY` | `true`                                                         |
| `AUTH_REFRESH_COOKIE_SAMESITE` | `lax`                                                          |
| `AUTH_REFRESH_COOKIE_SECURE`   | 生产默认为 `true`；`DEBUG=true` 时若未显式配置则回退为 `false` |

联调要求：

1. 所有依赖 refresh cookie 的请求都必须启用 `credentials: include` 等价能力。
2. `refresh`、`heartbeat`、`logout` 除 cookie 外，还应继续发送稳定的 `X-Client-Fingerprint`。
3. 只要该请求命中了签名链路，就还需要 `X-Client-Token + X-Timestamp + X-Signature`。

## 11. API Protection、来源校验与安全头

### 11.1 来源校验与 Bot 拦截

`APIProtection` 的当前行为：

- 完全放行的精确路径：
  - `/`
  - `/health`
  - `/metrics`
  - `/uploads`
  - `/api/docs`
  - `/api/redoc`
  - `/api/openapi.json`
  - `/api/auth/login`
  - `/api/auth/register`
  - `/api/auth/refresh`
  - `/api/auth/turnstile-config`
- 完全放行的前缀：
  - `/api/docs/`
  - `/api/redoc/`
  - `/api/v1/client/`
  - `/uploads/`
- 以下前缀会执行严格 Origin / Referer 校验：
  - `/api/v1/users`
  - `/api/v1/admin`
  - `/api/v1/roles`
  - `/api/v1/crawler`

联调影响：

- 后台管理前端域名必须位于 `CORS_ORIGINS` 允许名单内，否则以上敏感前缀会返回 `403 Request origin not authorized`
- 明显 Bot / CLI User-Agent 在没有合法 `Origin` / `Referer` 的情况下会被拦截
- `OPTIONS` 请求不会被这个中间件阻断

## 12. 客户端初始化、信任等级与 Turnstile

### 12.1 推荐联调顺序

1. 生成并固定 `X-Client-Fingerprint`
2. 调用 `GET /api/auth/turnstile-config`
3. 调用 `POST /api/v1/client/init`
4. 根据返回的 `challenge_required` / `trust_level` 判断是否展示 Turnstile
5. 若需要挑战，调用 `POST /api/v1/client/verify`
6. 之后再进行登录、刷新、写接口调用

### 12.2 `GET /api/auth/turnstile-config`

返回普通 JSON，字段为：

- `enabled`
- `site_key`

当 `TURNSTILE_ENABLED=false` 时：

- `enabled` 为 `false`
- TurnstileGuard 整体不生效

### 12.3 `POST /api/v1/client/init`

请求体字段为：

- `client_fingerprint`
- `timezone`
- `screen_resolution`
- `platform`
- `force_reissue`

返回字段说明：

| 字段                 | 说明                                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| `client_token`       | 只在首次签发或强制重发时返回；如果服务端沿用现有凭据，可能为空             |
| `client_secret`      | 只有签名校验器可用时才会签发；且只在首次签发或 `force_reissue=true` 时返回 |
| `challenge_required` | 当前是否要求先做人机验证                                                   |
| `trust_level`        | `untrusted` / `basic` / `verified`                                         |
| `turnstile_site_key` | 仅在 `challenge_required=true` 且 Turnstile 已启用时返回                   |
| `expires_in`         | 当前 Turnstile 信任 TTL 秒数                                               |

重要约束：

- 如果本地已经持有仍有效的 `client_token` / `client_secret`，再次调用 `init` 时服务端可能只返回 trust 信息而不重发凭据
- 如果本地已经丢失 `client_secret`，必须使用 `force_reissue=true`
- `client_secret` 只用于本地签名，绝不能回传后端
- 如果签名校验器不可用，服务端可能不返回可用的 `client_token` / `client_secret`
- 前端是否展示挑战，应以 `challenge_required` 为准，而不是只看 `turnstile_site_key` 是否存在
- 当 `TURNSTILE_ENABLED=false` 时，`client/init` 会直接返回 `trust_level=basic`、`challenge_required=false`，并省略 `turnstile_site_key`

### 12.4 `POST /api/v1/client/verify`

请求要求：

- Header 必带 `X-Client-Token`
- Body 必带 `turnstile_token`

验证成功后，信任等级会升级到 `basic`。

### 12.5 `GET /api/v1/client/status`

返回字段：

- `trust_level`
- `challenge_required`
- `turnstile_site_key`，仅在 `challenge_required=true` 且 Turnstile 已启用时出现

额外说明：

- 当 `TURNSTILE_ENABLED=false` 时，`client/status` 会直接返回 `trust_level=basic`、`challenge_required=false`
- 当前 `client/init` 与 `client/status` 在 Turnstile 关闭时语义一致，前端无需为这两个接口额外做分叉

### 12.6 信任等级与挑战规则

| 信任等级    | 说明                           |
| ----------- | ------------------------------ |
| `untrusted` | 未通过 Turnstile，或信任已过期 |
| `basic`     | 已通过 Turnstile               |
| `verified`  | 已登录并被升级为已验证访客     |

TurnstileGuard 当前的精确规则：

- 永远放行：
  - `/health`
  - `/metrics`
  - `/api/v1/client/init`
  - `/api/v1/client/verify`
  - `/api/auth/turnstile-config`
  - 所有 `OPTIONS`
- `untrusted`
  - `GET/HEAD` 允许
  - 其他方法需要挑战
- `basic`
  - `GET/HEAD` 允许
  - 以下前缀的写操作仍然需要挑战：
    - `/api/v1/admin`
    - `/api/v1/crawler`
    - `/api/v1/users`
    - `/api/v1/roles`

注意：

- 不是所有管理员写接口都会因为 `basic` 信任而被 Turnstile 再拦一次；只有上述前缀会触发该规则
- 即使不触发 Turnstile，后续仍然可能被签名、管理员权限、二次验证 token 拦截

## 13. 请求签名规范

### 13.1 哪些请求需要签名

以下路径完全豁免签名：

- `/health`
- `/metrics`
- `/api/v1/client/init`
- `/api/v1/client/verify`
- `/api/auth/turnstile-config`
- 所有 `OPTIONS`

以下情况会强制要求签名：

- 请求头带了 `Authorization: Bearer ...`
- 请求带了 refresh cookie
- 路径以 `/api/auth/` 开头，且不是 `turnstile-config`
- 路径命中以下敏感前缀：
  - `/api/v1/users`
  - `/api/v1/admin`
  - `/api/v1/roles`
  - `/api/v1/crawler`
- 任意非 `GET/HEAD` 的公共写请求

### 13.2 签名串

签名原文固定为：

- `METHOD|PATH_WITH_OPTIONAL_QUERY|TIMESTAMP`

典型形式包括：

- `POST|/api/v1/feedback|1710000000`
- `GET|/api/v1/favorites?page=1|1710000000`
- `POST|/api/auth/refresh|1710000000`

约束：

1. `METHOD` 必须大写
2. `PATH_WITH_OPTIONAL_QUERY` 只包含路径和查询串，不包含协议、域名、fragment
3. 查询串顺序必须与真实请求一致
4. 请求体不参与签名
5. 时间戳必须是秒级 Unix 时间
6. 签名算法是 `HMAC-SHA256`
7. 输出是十六进制小写字符串

### 13.3 时间窗与兼容行为

- `X-Timestamp` 允许误差：约 `±30s`
- 后端在验签时对 `/path` 和 `/path/` 有容错，但前端仍应统一使用标准路由路径

### 13.4 原始签名错误

RequestIntegrity 中间件原始错误码可能包括：

- `INVALID_SIGNATURE`
- `INVALID_TIMESTAMP`
- `REQUEST_EXPIRED`
- `CLIENT_TOKEN_EXPIRED`
- `INVALID_CLIENT_TOKEN`
- `SIGNATURE_VERIFIER_UNAVAILABLE`

专用响应头：

- `X-Client-Reinit-Required: true`
  - 当原始错误码为 `CLIENT_TOKEN_EXPIRED` 或 `INVALID_CLIENT_TOKEN` 时返回

联调建议：

- 前端不要只看 V1 顶层 `error.code`
- 一旦看到 `X-Client-Reinit-Required: true`，直接重新走 `/api/v1/client/init`

## 14. 认证、MFA 收口与风险登录

### 14.1 注册

注册流程分两步：

1. `POST /api/v1/email/send-registration-code`
2. `POST /api/auth/register`

注意：

- `send-registration-code` 即使邮箱已存在，也仍返回成功消息，避免枚举
- `register` 消费的是 token type 为 `registration` 的验证码
- `/api/v1/email/verify-email` 不消费注册验证码；它消费的是 `email_verification` 类型验证码

`POST /api/auth/register` 成功后：

- 返回普通 JSON：
  - `access_token`
  - `token_type`
  - `expires_in`
  - `refresh_threshold`
  - `user`
- 写入 refresh cookie
- 当前访客 trust 会升级到 `verified`

### 14.2 登录

`POST /api/auth/login` 有两种主要结果：

1. 正常登录成功时返回：
   - `access_token`
   - `token_type`
   - `expires_in`
   - `refresh_threshold`
   - `user`

2. 高风险登录被升级验证时返回：
   - `requires_risk_verification`
   - `pending_token`
   - `challenge_type`
   - `expires_in`
   - `message`

### 14.3 设备绑定

登录、注册、刷新、心跳产生的登录态都与设备指纹绑定：

- 首选读取 `X-Client-Fingerprint`
- 如果 access token 中没有设备指纹：
  - `401 Session expired, please login again`
- 如果当前请求设备指纹与 token 中不一致：
  - `401 Device mismatch, please login again`

因此前端应在登录成功后持续发送同一份 `X-Client-Fingerprint`。

### 14.4 Authentik 托管 MFA 与本地 2FA 退役

当前登录 MFA 规则已经收口到 Authentik：

- HMRChan API 不再执行本地 2FA gate
- `/api/auth/login` 不再返回 `requires_2fa` / `pending_token`
- 如果用户需要 MFA，挑战发生在 Authentik OIDC 登录流程里，而不是 HMRChan API
- MFA 配置入口在 **Authentik 账户中心**

### 14.5 已退役的 `/api/v1/2fa/*` 接口

| 路径                                       | 说明   | 关键字段            |
| ------------------------------------------ | ------ | ------------------- |
| `GET /api/v1/2fa/status`                   | 已退役 | 固定返回 `410 Gone` |
| `POST /api/v1/2fa/setup`                   | 已退役 | 固定返回 `410 Gone` |
| `POST /api/v1/2fa/verify`                  | 已退役 | 固定返回 `410 Gone` |
| `POST /api/v1/2fa/disable`                 | 已退役 | 固定返回 `410 Gone` |
| `POST /api/v1/2fa/regenerate-backup-codes` | 已退役 | 固定返回 `410 Gone` |
| `POST /api/v1/2fa/verify-login`            | 已退役 | 固定返回 `410 Gone` |

统一错误语义：

- `error.code = legacy_2fa_retired`
- message 会提示“请在 Authentik 账户中心管理 MFA”

### 14.6 `POST /api/auth/verify-risk-login`

用于完成高风险登录，入参：

- `pending_token`
- `verification_code`
- 可选：`device_name`
- 可选：`device_type`
- 可选：`turnstile_token`

约束：

- pending token 绑定当前设备指纹
- 如果 token 内记录了设备指纹，而当前请求指纹不一致：
  - `403 Pending login token does not match this device`

成功后返回正常登录 JSON。

### 14.7 刷新、心跳、登出、当前用户

| 路径                       | 格式      | 说明                                                                                                  |
| -------------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| `POST /api/auth/refresh`   | 普通 JSON | 前端应发送 refresh cookie + 签名头 + 稳定设备指纹；成功时会轮换 refresh token                         |
| `POST /api/auth/heartbeat` | 普通 JSON | 前端应发送 refresh cookie + 签名头 + 稳定设备指纹；成功时返回新的 access token，不轮换 refresh cookie |
| `POST /api/auth/logout`    | 普通 JSON | 可选 body `{"all_devices":true/false}`；如果同时带 bearer，后端会把当前 access token 的 JTI 拉黑      |
| `GET /api/auth/me`         | 普通 JSON | 当前用户信息                                                                                          |

### 14.8 会话管理

| 路径                            | 格式             | 说明                                                                          |
| ------------------------------- | ---------------- | ----------------------------------------------------------------------------- |
| `GET /api/auth/sessions`        | 普通 JSON        | 返回 `sessions[]` 和 `total`                                                  |
| `DELETE /api/auth/sessions/:id` | `204 No Content` | 需要敏感验证 token；如果删的是当前会话，会同时清掉当前 cookie 和 access token |

`GET /api/auth/sessions` 的单项字段：

- `id`
- `device_name`
- `device_type`
- `ip_address`
- `created_at`
- `last_used_at`
- `is_current`

## 15. 敏感验证 Token

### 15.1 获取方式

#### `POST /api/auth/verify-password`

成功时返回：

- `verified: true`
- `verification_token`
- `verification_token_required: true`
- `expires_in: 300`
- `current_device_trusted`
- `step_up_required`

失败时不会返回 `401`，而是返回普通 JSON，并至少包含：

- `verified=false`
- `verification_token=null`
- `expires_in=null`
- `message`

#### `POST /api/auth/verify-identity`

请求体要求：

- `password`
- `action`
- 可选：`resource_id`

允许的 `action`：

- `delete_account`
- `change_email`
- `change_password`
- `update_security_settings`
- `export_data`
- `revoke_sessions`
- `delete_content`
- `manage_api_keys`
- `admin_operation`

与 `verify-password` 的差异：

- 密码错误时直接返回 `401`
- 生成的是 action-scoped token

### 15.2 传递方式与优先级

后端按以下优先级读取 verification token：

1. `X-Verification-Token` header
2. query 参数 `verification_token`
3. JSON body 里的 `verification_token`

### 15.3 约束

- token 与用户绑定
- token 与当前设备指纹绑定
- token 与 scope 绑定
- 缺少 token 时，后端会返回：
  - `403`
  - `X-Verification-Required: true`
- 设备不匹配时，原始错误码为 `VERIFICATION_DEVICE_MISMATCH`

### 15.4 哪些动作会消费 verification token

| scope                                          | 典型来源          | 真实消费接口                                                                                                                                    |
| ---------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `sensitive_operation`                          | `verify-password` | 可用于大多数敏感操作，作为通用 token                                                                                                            |
| `action_verification:revoke_sessions`          | `verify-identity` | `DELETE /api/auth/sessions/:id`、`DELETE /api/v1/devices/:id`、`DELETE /api/v1/devices`                                                         |
| `action_verification:update_security_settings` | `verify-identity` | `POST /api/v1/devices/trust`                                                                                                                    |
| `action_verification:export_data`              | `verify-identity` | `POST /api/v1/account/export-data`                                                                                                              |
| `action_verification:delete_account`           | `verify-identity` | `POST /api/v1/account/delete`                                                                                                                   |
| `action_verification:change_password`          | `verify-identity` | `POST /api/v1/users/me/change-password`                                                                                                         |
| `action_verification:change_email`             | `verify-identity` | `POST /api/v1/email/send-change-email-code`、`POST /api/v1/email/change-email`                                                                  |
| `action_verification:delete_content`           | `verify-identity` | `DELETE /api/v1/comments/:id`、`DELETE /api/v1/discussions/:id`、`DELETE /api/v1/discussions/comments/:id`、`DELETE /api/v1/comment-images/:id` |
| `action_verification:admin_operation`          | `verify-identity` | 所有需要 `requireAdminOperationVerification(...)` 的管理员写接口                                                                                |

当前管理员写接口里明确要求 verification token 的路径包括：

- `POST /api/v1/admin/cache/clear`
- `DELETE /api/v1/users/:id`
- `POST /api/v1/users/:id/roles`
- `POST /api/v1/upload/users/:user_id/avatar`
- `POST /api/v1/roles`
- `PATCH /api/v1/roles/:id`
- `DELETE /api/v1/roles/:id`
- `PUT /api/v1/roles/:id/permissions`
- `PUT /api/v1/crawler/config`
- `POST /api/v1/processor/scan`
- `POST /api/v1/processor/scan/failed`
- `POST /api/v1/processor/failures/retry`
- `POST /api/v1/schedules`
- `DELETE /api/v1/schedules/:id`
- `PATCH /api/v1/reports/:id`
- `POST /api/v1/discussions/:id/pin`
- `DELETE /api/v1/discussions/:id/pin`
- `POST /api/v1/discussions/comments/:id/pin`
- `DELETE /api/v1/discussions/comments/:id/pin`
- `POST /api/v1/discussions/comments/:id/feature`
- `DELETE /api/v1/discussions/comments/:id/feature`
- `POST /api/v1/account/admin/cleanup-expired`

## 16. 邮件验证、密码修改与账户恢复

### 16.1 公共邮箱流程

| 路径                                        | 说明                                               |
| ------------------------------------------- | -------------------------------------------------- |
| `POST /api/v1/email/send-registration-code` | 即使邮箱已注册也返回成功消息，但不会重复发送验证码 |
| `POST /api/auth/register`                   | 消费 `registration` 验证码                         |
| `POST /api/v1/email/verify-email`           | 只消费 `email_verification` 验证码                 |
| `POST /api/v1/email/request-password-reset` | 永远返回成功风格消息，防枚举                       |
| `POST /api/v1/email/reset-password`         | 成功后会撤销该用户全部有效会话                     |
| `POST /api/v1/account/restore`              | 公开恢复接口，要求用户名或邮箱 + 密码              |

### 16.2 登录态邮箱 / 密码修改

| 路径                                           | 说明                                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `POST /api/v1/email/send-verification-email`   | 已登录用户发送 `email_verification` 验证码                                                          |
| `POST /api/v1/email/send-change-password-code` | 请求需要当前密码，不需要 verification token                                                         |
| `POST /api/v1/email/change-password`           | 请求需要邮箱验证码；成功后撤销全部会话，并清理当前 access token / refresh cookie                    |
| `POST /api/v1/email/send-change-email-code`    | 请求需要当前密码 + verification token                                                               |
| `POST /api/v1/email/change-email`              | 请求需要邮箱验证码 + verification token                                                             |
| `POST /api/v1/users/me/change-password`        | 请求需要当前密码 + verification token；成功后撤销全部会话，并清理当前 access token / refresh cookie |

### 16.3 账户数据与删除

| 路径                                  | 说明                                                                                                                                |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/account/data-summary`    | 当前账号数据统计摘要                                                                                                                |
| `POST /api/v1/account/export-data`    | 需要 verification token；返回 V1 JSON envelope，同时带 `Content-Disposition: attachment; filename=user_data.json`，不是二进制下载流 |
| `GET /api/v1/account/deletion-status` | 查询软删除状态                                                                                                                      |
| `POST /api/v1/account/delete`         | 请求体要求 `confirm=true`，并需要 verification token；成功后清理当前 access token / refresh cookie，并在 30 天后永久删除            |

## 17. 设备管理

| 路径                           | 说明                                                        |
| ------------------------------ | ----------------------------------------------------------- |
| `GET /api/v1/devices`          | 当前账号所有设备                                            |
| `GET /api/v1/devices/current`  | 当前设备                                                    |
| `POST /api/v1/devices/trust`   | 只允许把“当前设备”标记为 trusted，且需要 verification token |
| `POST /api/v1/devices/untrust` | 取消 trusted，不要求 verification token                     |
| `POST /api/v1/devices/rename`  | 改设备名，不要求 verification token                         |
| `DELETE /api/v1/devices/:id`   | 撤销单设备，需要 verification token                         |
| `DELETE /api/v1/devices`       | 撤销除当前设备外的全部设备，需要 verification token         |

如果撤销的是当前设备：

- 当前 access token 会被拉黑
- refresh cookie 会被清除

## 18. 上传与媒体接口

### 18.1 头像上传

| 项                       | 实际约束                                                         |
| ------------------------ | ---------------------------------------------------------------- |
| 路径                     | `POST /api/v1/upload/avatar`                                     |
| 管理端路径               | `POST /api/v1/upload/users/:user_id/avatar`                      |
| 管理端额外要求           | 除管理员权限外，还要求 verification token                        |
| 表单字段                 | `file`                                                           |
| 允许 MIME                | `image/jpeg`、`image/png`、`image/webp`                          |
| 单文件大小               | `5MB`                                                            |
| 整个 multipart body 上限 | `5MB + 1MB = 约 6MB`                                             |
| 服务端处理               | 自动缩放并转成 JPEG                                              |
| 最大尺寸                 | 最大边长 `512px`                                                 |
| 成功返回字段             | `filename`、`url`、`size`、`content_type`、`hash`、`uploaded_at` |

### 18.2 评论图片

| 项                       | 实际约束                                                              |
| ------------------------ | --------------------------------------------------------------------- |
| 上传路径                 | `POST /api/v1/comment-images`                                         |
| 查询单张                 | `GET /api/v1/comment-images/:id`，返回元数据 JSON，不直接回图片二进制 |
| 删除单张                 | `DELETE /api/v1/comment-images/:id`                                   |
| 鉴权                     | 三个接口都需要登录；删除还需要 verification token                     |
| 表单字段                 | 重复字段名 `files`                                                    |
| 单次最多数量             | `9`                                                                   |
| 单张上限                 | `10MB`                                                                |
| 总文件上限               | `50MB`                                                                |
| 整个 multipart body 上限 | `50MB + 2MB = 约 52MB`                                                |
| 允许 MIME                | `image/jpeg`、`image/png`、`image/webp`、`image/gif`                  |
| 分辨率                   | 像素总数不超过 `3840 * 2160`                                          |
| 上传成功返回             | `images[]` + `message`，每个条目带 `url` 指向 `/uploads/...`          |

联调注意：

- `GET /api/v1/comment-images/:id` 只返回元数据；真正图片资源使用上传响应中的 `url`
- 该 `url` 指向 `/uploads/...` 静态路径，不走 V1 envelope

### 18.3 上传超限

当 multipart body 超过服务端限额时：

- HTTP 状态码：`413`
- 错误消息：`Request body exceeds upload limit`

### 18.4 媒体接口

公共媒体读取路径包括：

- `GET /api/v1/media/:id`
- `GET /api/v1/media/:id/stream`
- `GET /api/v1/media/:id/subtitle`
- `GET /api/v1/media/:id/thumbnail`
- `GET /api/v1/media/:id/download`

联调注意：

- `GET /api/v1/media/:id` 返回媒体元数据 JSON，不是 V1 envelope；字段包括 `id`、`file_type`、`file_name`、`file_size_bytes`、`mime_type`、`width`、`height`、`duration_sec`、`created_at`、`download_url`，并按文件类型可带 `stream_url`、`thumbnail_url`
- `/stream`、`/subtitle`、`/download` 的成功响应不要按 V1 JSON 解析
- `/thumbnail` 的成功响应通常也是资源响应；但失败时仍可能返回 V1 JSON
- `/api/v1/media/*` 不参与应用层统一限流

## 19. 首页聚合、限流、内容分层、缓存与 ETag

### 19.1 首页聚合与趋势接口

首页相关公共接口：

| 路径                               | 用途                     | 实际关键字段                                                              |
| ---------------------------------- | ------------------------ | ------------------------------------------------------------------------- |
| `GET /api/v1/home`                 | 首页聚合总接口           | `hero`、`portal`、`featured`、`trends`、`latest_text_posts`、`story_deck` |
| `GET /api/v1/home/featured`        | 单独拉取 featured 区块   | `items[]`                                                                 |
| `GET /api/v1/home/story-deck`      | 单独拉取 story deck 区块 | `items[]`、`total`                                                        |
| `GET /api/v1/posts/text/latest`    | 首页文本流               | `items[]`、`total`                                                        |
| `GET /api/v1/trends/summary`       | 趋势摘要                 | `window`、`generated_at`、`stats`、`tags`、`authors`                      |
| `GET /api/v1/schedules/highlights` | 日程高亮源               | `items[]`                                                                 |
| `GET /api/v1/community/highlights` | 社区高亮源               | `items[]`                                                                 |

`GET /api/v1/home` 的实际聚合约束：

- `portal.items` 当前固定包含 `recommend`、`authors`、`schedule`、`community` 四个 key
- `portal.items[].preview` 目前只会出现在 `schedule`、`community` 两个入口；当对应 `count > 0` 时会直接给出预览对象
- `portal.items[].preview` 字段实际为：
  - `title`
  - `summary`
  - `meta`
  - `deep_link`
  - `author`
  - `image`（当前 schedule/community 预览通常为空）
- `portal.items.schedule.count` 与 `len(trends.schedules)` 一致
- `portal.items.community.count` 与 `len(trends.community)` 一致
- `trends` 当前实际包含 `authors`、`tags`、`schedules`、`community`
- `trends.community[]` 条目字段为：`discussion_id`、`title`、`excerpt`、`comment_count`、`participant_count`、`updated_at`、`deep_link`、`author`
- 首页 community 聚合与 `/api/v1/community/highlights` 一样，只返回 `is_deleted=false`、`is_hidden=false` 的讨论，并受公共内容层级限制
- 首页编排会优先做最佳努力去重：
  - `hero.spotlight` 会尽量从 `featured.items` 中剔除
  - `story_deck.items` 会优先避开 `hero + featured`
  - 当源数据池不足时，`story_deck.items` 允许回填重复内容，因此“尽量不重复”是当前实现，不是严格不重复契约

### 19.2 限流

下表区分“代码默认值”和“当前生产部署值”：

| 场景     | 代码默认值   | 当前生产部署值 |
| -------- | ------------ | -------------- |
| 全局接口 | `200/min/IP` | `60/min/IP`    |
| 登录接口 | `10/min/IP`  | `5/min/IP`     |

固定在代码中的其他限制：

| 场景                       | 实际限制       |
| -------------------------- | -------------- |
| 已认证请求                 | 全局额度 `2x`  |
| 搜索接口                   | `30/min/IP`    |
| 敏感接口                   | `5/min`        |
| 媒体路径 `/api/v1/media/*` | 跳过应用层限流 |

命中限流时：

- 返回 `429`
- 全局 / 登录 / 敏感限流的 `Retry-After` 为 `60`
- 搜索限流的 `Retry-After` 为 `30`

### 19.3 内容分层

代码默认值：

| 内容层级 | 代码默认值 |
| -------- | ---------- |
| guest    | `48`       |
| user     | `120`      |
| admin    | `400`      |

当前实现只在“公共 V1 路由组”挂载 `ContentLimit`，也就是：

- 公共 V1 路由组中的所有接口都会返回：
  - `X-Content-Tier`
  - `X-Content-Limit`
- 这不仅包含公共读取接口，也包含 `/feedback`、`/contact/send`、公开 `email` 子集、`/account/restore` 等公共写接口
- 登录用户访问这个公共路由组时，因为有 `OptionalAuth`，这些 header 会按 `user/admin` 层级变化
- 登录态专用路由组 `/api/v1`（例如 devices、notifications、upload）不自动写这两个 header

### 19.4 缓存

当前代码明确实现的缓存行为：

- 游客访问 `GET /api/v1/posts/light`
  - Redis key 含页码、平台、content limit
  - TTL `5 分钟`
- 游客访问 `GET /api/v1/posts/mixed`
  - Redis key 含页码、per_platform、content limit
  - TTL `5 分钟`
- `GET /api/v1/crawler/config`
  - 管理接口缓存 `5 分钟`

### 19.5 ETag

以下前缀的 `GET/HEAD` JSON 响应会尝试生成 ETag：

- `/api/v1/home`
- `/api/v1/posts`
- `/api/v1/trends/summary`
- `/api/v1/schedules/highlights`
- `/api/v1/community/highlights`
- `/api/v1/authors`
- `/api/v1/media`
- `/api/v1/users`

限制：

- 仅 `200 OK` 的 JSON 响应生成 ETag
- 响应体超过 `1MB` 不生成
- `/stream`、`/download` 不参与
- 命中 `If-None-Match` 时会返回 `304`

## 20. 常见联调分支

| 场景                    | 识别方式                                                                     | 前端动作                                           |
| ----------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------- |
| 需要 Turnstile 挑战     | `403`，且响应体兼容解析后能识别 `CHALLENGE_REQUIRED` 或 `turnstile_site_key` | 展示 Turnstile，完成后调用 `/api/v1/client/verify` |
| 客户端凭据失效          | `X-Client-Reinit-Required: true`                                             | 重新执行 `/api/v1/client/init`                     |
| access token 设备不匹配 | `401 Device mismatch, please login again`                                    | 清理登录态，回到登录流程                           |
| token 缺设备指纹        | `401 Session expired, please login again`                                    | 清理登录态，重新登录                               |
| verification token 缺失 | `403` + `X-Verification-Required: true`                                      | 先调用 `verify-password` 或 `verify-identity`      |
| 风险登录                | `/api/auth/login` 返回 `requires_risk_verification=true`                     | 进入邮箱验证码验证流程                             |
| 本地 2FA 退役           | 任意 `/api/v1/2fa/*` 返回 `410 Gone` + `legacy_2fa_retired`                  | 引导用户到 Authentik 账户中心管理 MFA              |
| 上传体过大              | `413 Request body exceeds upload limit`                                      | 提示用户压缩文件或减少文件数                       |
| 限流                    | `429` + `Retry-After`                                                        | 退避重试                                           |

## 21. 联调核对清单

- 已固定并持久化 `X-Client-Fingerprint`
- 已实现 `client_token/client_secret` 的本地持久化与 `force_reissue` 回补
- 已实现签名串 `METHOD|PATH_WITH_OPTIONAL_QUERY|TIMESTAMP`
- 已对所有 `/api/auth/*`（除 `turnstile-config`）走签名
- 已对所有公共写请求走签名
- 已对 refresh / heartbeat / logout 启用 cookie 透传
- 已对 `/api/v1/*` 统一按 envelope 解析，但对 `204/304/二进制` 例外分支做了特殊处理
- 已对 `X-Client-Reinit-Required`、`X-Verification-Required`、`Retry-After` 做分支处理
- 已区分：
  - 注册验证码：`registration`
  - 邮箱验证验证码：`email_verification`
  - 密码重置验证码：`password_reset`
  - 高风险登录验证码：`risk_login`
- 已明确评论图片 `GET /api/v1/comment-images/:id` 需要登录，不是公开接口
- 已明确管理员代传头像 `POST /api/v1/upload/users/:user_id/avatar` 除管理员权限外还需要 verification token

## 22. 实施建议

1. 不要把 `client_secret` 发回后端，也不要在日志里打印。
2. 不要把一个用户在不同浏览器、不同 WebView、不同域名环境中的 `X-Client-Fingerprint` 混用。
3. 不要只给部分写接口补签名；当前后端规则是“公共写请求默认签名，认证请求一律签名”。
4. 后台管理前端和主站前端如果分域部署，必须分别验证：
   - CORS Origin
   - cookie 透传
   - 自定义签名头透传
   - 敏感路径来源校验
5. 不要假设 `/api/v1/*` 的业务错误码总能稳定出现在同一字段；对异常分支要做兼容解析。
