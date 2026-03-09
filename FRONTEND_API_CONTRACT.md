# 前后端交付文档（以后端当前实现为准）

- 更新时间：2026-03-10
- 后端仓库：`G:\Project\hmrchan\hmrchan-backend`
- 前端仓库：`G:\Project\hmrchan\hmrchan-frontend`
- 前端技术栈：Vue 3、TypeScript、Vite、Pinia、Vue Router、Vue I18n
- 对接原则：本文档以后端路由、中间件、处理器当前实现为准，替代旧版按前端调用自动扫描出的接口列表

## 1. 当前交付状态

- 当前后端已交付 204 个 HTTP API 路由，另包含 1 个静态资源目录入口 `/uploads/*`
- 路由权限分层如下：
  - system：2
  - public（client + auth）：15
  - optional：42
  - required：96
  - admin：49
- 当前后端能力已完成并可进入联调口径：
  - API 路由已按 `system / auth / public v1 / authenticated v1 / admin v1` 分拆，路由层结构稳定
  - `/api/v1/*` 已统一接入 V1 响应信封
  - `/api/auth/*` 保持原始 JSON 响应，不走 V1 信封
  - 登录链路已支持 `登录 -> 2FA -> 高风险邮箱确认 -> 建立 session` 的完整闭环
  - 请求签名已进入 fail-closed 模式：认证请求、带认证上下文请求、业务写请求、敏感管理路径请求缺失或错误签名会直接被拒绝
  - 敏感操作 step-up 已形成完整后端闭环：未信任设备会被要求先获取 `verification_token`
  - 管理后台高影响写操作（角色、权限、角色分配、爬虫配置、处理器调度/重试、举报审核、日程创建、讨论置顶/精选、管理员代传头像等）已统一纳入 `admin_operation`
  - Celery 任务状态读取已修正为 result backend Redis DB1，避免任务始终停留在 `PENDING`
  - 管理后台新增处理失败列表与批量重试接口，支持追踪失败日志并重新入队
  - worker 侧数据库事务收口已补齐，降低失败任务遗留脏事务的风险
- 当前验证状态：
  - `go-api` 已通过 `go test ./...`
  - Python 服务已通过 `python -m compileall worker shared beat`

## 2. 前端接入总约定

### 2.1 基础地址约定

| 维度             | 当前约定                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------- | --- | ----------- |
| 业务接口主入口   | `/api/v1/*`                                                                              |
| 认证接口主入口   | `/api/auth/*`                                                                            |
| 系统接口         | `/health`、`/metrics`、`/uploads/*`                                                      |
| 前端默认业务基址 | `VITE_API_ENDPOINT`，未配置时等价于 `${VITE_API_URL                                      |     | '/api'}/v1` |
| 前端默认认证基址 | `VITE_API_URL`，未配置时等价于 `/api`                                                    |
| 部署代理基址     | 可由 `VITE_API_BASE_URL` 或边缘代理配置决定，但前端最终仍需区分 `/api/v1` 与 `/api/auth` |

### 2.2 响应封装约定

| 路径范围          | 返回形态           | 前端处理方式                                     |
| ----------------- | ------------------ | ------------------------------------------------ |
| `/api/v1/*`       | 默认走 V1 Envelope | 统一按 `success / data / meta / pagination` 解析 |
| `/api/auth/*`     | 原始 JSON          | 不要按 V1 Envelope 解包                          |
| `/api/v1/media/*` | 原始二进制/文本/流 | 按 `Content-Type` 分支处理，不要走统一 JSON 解包 |
| `204` / `304`     | 无响应体           | 前端按空响应处理                                 |

### 2.3 V1 Envelope 规则

`/api/v1/*` 的浏览器可见响应遵循以下约定：

| 字段               | 说明                                                                       |
| ------------------ | -------------------------------------------------------------------------- |
| `success`          | `true` 表示成功，`false` 表示失败                                          |
| `data`             | 业务数据主体，可能是对象或数组                                             |
| `pagination`       | 分页接口才存在，当前稳定字段为 `page`、`page_size`、`total`、`total_pages` |
| `meta.api_version` | 当前固定为 `1.0.0`                                                         |
| `meta.request_id`  | 请求追踪 ID，便于前后端协查日志                                            |
| `meta.timestamp`   | 服务端响应时间戳（UTC）                                                    |

补充说明：

- 后端内部分页原始结构包含 `has_more`，但进入 V1 Envelope 后，前端应以 `pagination.total_pages`、`pagination.page`、`pagination.total` 为主，不应再把顶层 `has_more` 作为稳定契约
- `/api/v1/*` 响应头会附带 `X-API-Version`
- 前端可主动传入 `X-Request-ID`，若未传则服务端自动生成，并回写到响应头 `X-Request-ID` 与 `meta.request_id`

### 2.4 错误响应规则

`/api/v1/*` 的错误响应统一为：

| 字段            | 说明                               |
| --------------- | ---------------------------------- |
| `success`       | 固定为 `false`                     |
| `error.code`    | 标准错误码                         |
| `error.message` | 可直接展示或用于表单提示的错误信息 |
| `meta.*`        | 同成功响应                         |

错误码映射如下：

| HTTP 状态 | 错误码             | 前端建议处理                         |
| --------- | ------------------ | ------------------------------------ |
| `400`     | `BAD_REQUEST`      | 表单提示、参数校验提示、普通 toast   |
| `401`     | `UNAUTHORIZED`     | 优先尝试 refresh；失败则跳登录       |
| `403`     | `FORBIDDEN`        | 权限提示、风控挑战、账号受限提示     |
| `404`     | `NOT_FOUND`        | 空页面或资源不存在提示               |
| `409`     | `CONFLICT`         | 状态冲突提示，建议刷新后重试         |
| `422`     | `VALIDATION_ERROR` | 字段级校验提示                       |
| `429`     | `RATE_LIMITED`     | 前端退避、禁用提交按钮、显示稍后再试 |

### 2.5 CORS 与请求头约定

后端当前允许的自定义请求头包括：

- `Authorization`
- `X-Request-ID`
- `X-CSRF-Token`
- `X-Device-Fingerprint`
- `X-Client-Token`
- `X-Client-Fingerprint`
- `X-Signature`
- `X-Timestamp`
- `X-Verification-Token`

后端当前暴露给浏览器的响应头包括：

- `X-Request-ID`
- `X-Security-Warning`
- `X-Security-Review-Required`
- `X-Verification-Required`
- `Content-Length`

## 3. 鉴权与客户端安全约定

### 3.1 认证机制

| 项             | 当前实现                                                  |
| -------------- | --------------------------------------------------------- |
| Access Token   | 通过 `Authorization: Bearer <token>` 传递                 |
| Refresh Token  | 通过 HttpOnly Cookie 传递                                 |
| 高风险登录确认 | `POST /api/auth/verify-risk-login`                        |
| Refresh 接口   | `POST /api/auth/refresh`                                  |
| Heartbeat 接口 | `POST /api/auth/heartbeat`                                |
| 设备指纹       | refresh 与部分安全校验会结合设备指纹/客户端指纹判断       |
| 会话管理       | `GET /api/auth/sessions`、`DELETE /api/auth/sessions/:id` |

前端必须注意：

- 登录、注册、刷新、登出、心跳这些带 refresh cookie 的流程，在跨域部署时必须开启 `withCredentials`
- `GET /api/auth/me`、`POST /api/auth/verify-password`、`POST /api/auth/verify-identity`、会话管理接口需要 Bearer Token
- 登录接口在开启 2FA 时，不一定直接返回完整 token 集合，可能先返回 `requires_2fa` 与 `pending_token`
- 登录或 2FA 验证完成后，如被判定为高风险，不一定立即发 session，可能先返回 `requires_risk_verification` 与 `pending_token`
- 登录相关接口可能通过 `X-Security-Warning` 头提示风险等级，并在高风险时附带 `X-Security-Review-Required: true`

### 3.2 客户端安全链路

客户端安全相关接口：

- `POST /api/v1/client/init`
- `POST /api/v1/client/verify`
- `GET /api/v1/client/status`

当前行为约定：

- `client/init` 首次初始化会返回 `client_token`，并可能返回一次性的 `client_secret`
- `client/init` 在前端本地凭证丢失或确认失效时，可在 body 中额外传 `force_reissue=true`，主动要求服务端补发新的 `client_token` / `client_secret`
- `client/init` 在服务端签名密钥失效时会自动轮换并重新下发新凭证；若当前仅能返回 trust/challenge 信息，则可能不返回 `client_secret`
- `client/init` 返回的关键字段为：`client_token`、`challenge_required`、`trust_level`、`turnstile_site_key`、`expires_in`，其中 `client_secret` 为条件返回字段
- `client/verify` 要求 body 中提供 `turnstile_token`，并依赖 `X-Client-Token`
- `client/status` 返回当前 `trust_level` 与是否需要 challenge
- 若未启用 Turnstile，`client/status` 会直接给出无需 challenge 的结果
- 当请求签名密钥失效时，服务端会返回 `CLIENT_TOKEN_EXPIRED`，并可能附带 `X-Client-Reinit-Required: true`；前端应以错误码为准重新调用 `client/init`

### 3.3 指纹与签名头

| 请求头                 | 当前要求                          | 说明                                             |
| ---------------------- | --------------------------------- | ------------------------------------------------ |
| `X-Client-Fingerprint` | 建议始终携带                      | 用于 client guard、设备一致性与访客识别          |
| `X-Client-Token`       | 完成 `client/init` 后应持续携带   | 用于访客状态、风控升级与签名校验                 |
| `X-Signature`          | 对强制签名请求为必填              | HMAC 签名；缺失或错误会直接返回 `403`            |
| `X-Timestamp`          | 对强制签名请求为必填              | 与 `X-Signature` 配合使用，允许时间窗约为 ±30 秒 |
| `X-Verification-Token` | 对无 body 的 step-up 请求强烈推荐 | 供 `DELETE` / 查询参数风格接口提交二次验证 token |

### 3.4 请求签名强制规则

以下路径不要求请求签名：

- `/health`
- `/metrics`
- `POST /api/v1/client/init`
- `POST /api/v1/client/verify`
- `GET /api/auth/turnstile-config`

以下请求当前会被强制签名校验：

- 除 `turnstile-config` 外的所有 `/api/auth/*`
- 所有带认证上下文的请求（Bearer 或 refresh cookie）
- 所有非 `GET` / `HEAD` 的业务写请求
- 所有敏感路径请求：`/api/v1/users*`、`/api/v1/admin*`、`/api/v1/roles*`、`/api/v1/crawler*`

失败时前端应按以下口径处理：

- `403 INVALID_SIGNATURE`：签名缺失、签名错误或请求头不完整，前端应重建签名并重试
- `403 CLIENT_TOKEN_EXPIRED`：客户端签名密钥失效，前端应重新执行 `client/init`
- `503 SIGNATURE_VERIFIER_UNAVAILABLE`：服务端无法验证签名，前端不应盲目重试写请求
- `403 REQUEST_EXPIRED` / `403 INVALID_TIMESTAMP`：时间戳异常，前端应重建当前请求

### 3.5 登录、2FA 与高风险登录链路

- `POST /api/auth/login` 成功时直接返回 `LoginResp`
- 若账户启用了 2FA，则返回 `{ "requires_2fa": true, "pending_token": "..." }`
- 前端随后调用 `POST /api/v1/2fa/verify-login`
- 若 2FA 完成后仍被判定为高风险，则不会立即建立 session，而是返回：
  - `requires_risk_verification: true`
  - `pending_token`
  - `challenge_type: "email_code"`
  - `expires_in: 300`
- 前端随后调用 `POST /api/auth/verify-risk-login`
- `verify-risk-login` 成功后才会返回完整 `LoginResp` 并写入 refresh cookie

### 3.6 敏感操作二次验证（Step-up）链路

前端应统一采用以下获取策略：

- 通用方案：`POST /api/auth/verify-password`
- 动作化方案：`POST /api/auth/verify-identity`

两者都会返回 `verification_token`，有效期当前为 300 秒。  
当前代码允许 `verify-password` 生成的 `sensitive_operation` token 通过多数敏感校验，但前端仍推荐优先使用 `verify-identity(action=...)` 获取动作级 token，便于后续策略继续收紧而不破坏链路。

`verify-identity.action` 当前支持：

- `delete_account`
- `change_email`
- `change_password`
- `update_security_settings`
- `export_data`
- `revoke_sessions`
- `delete_content`
- `manage_api_keys`
- `admin_operation`

前端应按以下矩阵接入：

| 动作                 | 获取 token 的推荐 action   | 典型接口                                                                                                                                        |
| -------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 改密码               | `change_password`          | `POST /api/v1/users/me/change-password`、`POST /api/v1/email/change-password`                                                                   |
| 改邮箱               | `change_email`             | `POST /api/v1/email/send-change-email-code`、`POST /api/v1/email/change-email`                                                                  |
| 导出数据             | `export_data`              | `POST /api/v1/account/export-data`                                                                                                              |
| 删除账号             | `delete_account`           | `POST /api/v1/account/delete`                                                                                                                   |
| 撤销会话/设备        | `revoke_sessions`          | `DELETE /api/auth/sessions/:id`、`DELETE /api/v1/devices/:id`、`DELETE /api/v1/devices`                                                         |
| 删除内容             | `delete_content`           | `DELETE /api/v1/comments/:id`、`DELETE /api/v1/comment-images/:id`、`DELETE /api/v1/discussions/:id`、`DELETE /api/v1/discussions/comments/:id` |
| 安全设置             | `update_security_settings` | `POST /api/v1/2fa/setup`、`POST /api/v1/2fa/disable`、`POST /api/v1/2fa/regenerate-backup-codes`                                                |
| 管理后台高影响写操作 | `admin_operation`          | 用户/角色/爬虫/处理器/举报/日程/讨论运营/管理员上传头像等接口                                                                                   |

提交规则：

- JSON body 接口：可在 body 中传 `verification_token`
- `DELETE` 或无 body 接口：优先使用 `X-Verification-Token`，也兼容 `verification_token` 查询参数
- 未信任设备缺少 token 时，服务端会返回 `403`，并带 `X-Verification-Required: true`

### 3.7 当前风控放行规则

- 未信任访客在 `GET` / `HEAD` 公共读取请求下不会被强制拦截，因此首页、列表页、详情页可以先读后补初始化
- 未信任访客对写操作更容易触发 challenge
- `basic` 信任级别下，对管理类、用户类、角色类敏感写接口仍可能要求更高信任
- 当前前端不应假设 `client/init` 完成前所有 API 都不可用，公共只读接口可直接拉取

## 4. 关键响应对象

### 4.1 登录响应

`POST /api/auth/register`、`POST /api/auth/login`、`POST /api/auth/refresh`、`POST /api/auth/verify-risk-login` 的成功返回核心字段如下：

| 字段                | 说明                      |
| ------------------- | ------------------------- |
| `access_token`      | 当前 Bearer Token         |
| `token_type`        | 当前为 `bearer`           |
| `expires_in`        | access token 秒级过期时间 |
| `refresh_threshold` | 建议提前刷新窗口          |
| `user`              | 当前登录用户信息          |

`user` 当前稳定字段包括：

- `id`
- `username`
- `email`
- `full_name`
- `avatar_url`
- `bio`
- `is_active`
- `is_admin`
- `is_verified`
- `email_verified_at`
- `totp_enabled`
- `created_at`
- `last_login_at`

登录链路的分支返回也需要前端直接支持：

| 接口                                                      | 分支返回                                                                                                            | 前端动作                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `POST /api/auth/login`                                    | `{ "requires_2fa": true, "pending_token": "..." }`                                                                  | 跳 2FA 校验页            |
| `POST /api/auth/login` 或 `POST /api/v1/2fa/verify-login` | `{ "requires_risk_verification": true, "pending_token": "...", "challenge_type": "email_code", "expires_in": 300 }` | 跳高风险邮箱验证码确认页 |

### 4.2 心跳、验证与会话响应

| 接口                             | 关键字段                                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/heartbeat`       | `access_token`、`token_type`、`expires_in`、`refresh_threshold`、`server_time`                                        |
| `POST /api/auth/verify-password` | `verified`、`verification_token`、`expires_in`、`current_device_trusted`、`step_up_required`                          |
| `POST /api/auth/verify-identity` | `verified`、`verification_token`、`action`、`resource_id`、`expires_in`、`current_device_trusted`、`step_up_required` |
| `GET /api/auth/sessions`         | `sessions`、`total`                                                                                                   |
| `DELETE /api/auth/sessions/:id`  | `204 No Content`                                                                                                      |

补充约定：

- `verify-password` 在密码错误时返回 `200`，其中 `verified=false`
- `verify-identity` 在密码错误时返回 `401`
- 对需要二次验证的接口，若当前设备已被信任，`verification_token` 仍会返回，但 `step_up_required=false`

### 4.3 客户端安全响应

| 接口                         | 关键字段                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `POST /api/v1/client/init`   | `client_token`、`challenge_required`、`trust_level`、`turnstile_site_key`、`expires_in`，`client_secret` 为条件字段 |
| `POST /api/v1/client/verify` | `success`、`trust_level`、`message`                                                                                 |
| `GET /api/v1/client/status`  | `trust_level`、`challenge_required`、`turnstile_site_key`                                                           |

### 4.4 异步任务响应

| 接口                                    | 关键字段                                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `POST /api/v1/processor/scan`           | `task_id`、`status`                                                                                |
| `POST /api/v1/processor/scan/failed`    | `task_id`、`status`、`limit`                                                                       |
| `POST /api/v1/processor/failures/retry` | `task_id`、`status`、`accepted_count`、`accepted_ids`、`invalid_ids`、`missing_ids`、`skipped_ids` |
| `GET /api/v1/processor/tasks/:task_id`  | `task_id`、`status`、`ready`                                                                       |
| `GET /api/v1/processor/watcher/status`  | `status`、`recent_tasks`、`queue_pending`                                                          |

`GET /api/v1/processor/tasks/:task_id` 当前状态来源说明：

- 任务状态优先从 Celery result backend 读取
- 当前运行约定为：worker broker 使用 Redis DB0，task result 使用 Redis DB1，API 自身缓存使用 Redis DB2
- 如果任务轮询一直停留在 `PENDING`，优先排查后端 `RESULT_REDIS_URL`、worker `CELERY_RESULT_BACKEND` 与 docker-compose 配置，而不是先怀疑前端逻辑

### 4.5 处理失败列表响应

`GET /api/v1/processor/failures` 为分页接口，单项当前稳定字段包括：

- `id`
- `post_id`
- `processor_name`
- `processor_version`
- `status`
- `error_message`
- `started_at`
- `completed_at`
- `duration_sec`
- `platform`
- `platform_post_id`
- `retry_eligible`

补充说明：

- 后端已不再向前端返回服务端内部 `input_path` / `output_path`
- 前端展示与批量重试仅依赖失败日志 `id`、平台信息与 `retry_eligible`

## 5. 接口交付清单

以下接口清单以后端当前注册路由为准。

### 5.1 系统与运行态

- `GET /health`
- `GET /metrics`
- `STATIC /uploads/*`

### 5.2 客户端安全与认证

客户端安全：

- `POST /api/v1/client/init`
- `POST /api/v1/client/verify`
- `GET /api/v1/client/status`

认证与会话：

- `GET /api/auth/turnstile-config`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/verify-risk-login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/heartbeat`
- `GET /api/auth/me`
- `POST /api/auth/verify-password`
- `POST /api/auth/verify-identity`
- `GET /api/auth/sessions`
- `DELETE /api/auth/sessions/:id`

### 5.3 公共内容能力（可选认证）

帖子与作者：

- `GET /api/v1/posts`
- `GET /api/v1/posts/:id`
- `GET /api/v1/posts/light`
- `GET /api/v1/posts/mixed`
- `GET /api/v1/posts/:id/comments`
- `GET /api/v1/authors`
- `GET /api/v1/authors/:id`
- `GET /api/v1/authors/:id/posts`

媒体：

- `GET /api/v1/media/:id`
- `GET /api/v1/media/:id/stream`
- `GET /api/v1/media/:id/subtitle`
- `GET /api/v1/media/:id/thumbnail`
- `GET /api/v1/media/:id/download`

搜索：

- `GET /api/v1/search/posts`
- `GET /api/v1/search/authors`
- `GET /api/v1/search/suggestions`

日程与社区：

- `GET /api/v1/schedules`
- `GET /api/v1/schedules/calendar`
- `GET /api/v1/schedules/:id`
- `GET /api/v1/community/stats`
- `GET /api/v1/community/latest`
- `GET /api/v1/community/hot`
- `GET /api/v1/community/feed`

评论与讨论只读：

- `GET /api/v1/comments/:id/replies`
- `GET /api/v1/comments/:id/thread`
- `GET /api/v1/discussions`
- `GET /api/v1/discussions/search`
- `GET /api/v1/discussions/:id`
- `GET /api/v1/discussions/:id/comments`
- `GET /api/v1/discussions/comments/:id/replies`
- `GET /api/v1/discussions/comments/:id`
- `GET /api/v1/discussions/comments/:id/thread`

收藏检查、成员与公共表单：

- `GET /api/v1/favorites/check/:post_id`
- `POST /api/v1/feedback`
- `GET /api/v1/members`
- `GET /api/v1/members/:id`
- `POST /api/v1/contact/send`

公开邮箱与登录 2FA：

- `POST /api/v1/email/send-registration-code`
- `POST /api/v1/email/verify-email`
- `POST /api/v1/email/request-password-reset`
- `POST /api/v1/email/reset-password`
- `POST /api/v1/2fa/verify-login`

### 5.4 登录用户能力

收藏夹：

- `POST /api/v1/favorites`
- `GET /api/v1/favorites`
- `GET /api/v1/favorites/folders/list`
- `GET /api/v1/favorites/tags/list`
- `GET /api/v1/favorites/:id`
- `PATCH /api/v1/favorites/:id`
- `DELETE /api/v1/favorites/:id`

社区个人数据：

- `GET /api/v1/community/my-comments`
- `GET /api/v1/community/my-likes`
- `GET /api/v1/community/favorites`

偏好设置：

- `GET /api/v1/preferences`
- `PUT /api/v1/preferences`
- `PATCH /api/v1/preferences`
- `DELETE /api/v1/preferences`

个人资料与密码：

- `GET /api/v1/users/me/profile`
- `PATCH /api/v1/users/me/profile`
- `POST /api/v1/users/me/change-password`

帖子评论与评论互动：

- `POST /api/v1/posts/:id/comments`
- `PATCH /api/v1/comments/:id`
- `DELETE /api/v1/comments/:id`
- `POST /api/v1/comments/:id/like`
- `DELETE /api/v1/comments/:id/like`
- `POST /api/v1/comments/:id/favorite`
- `DELETE /api/v1/comments/:id/favorite`
- `POST /api/v1/comments/:id/report`

评论图片：

- `POST /api/v1/comment-images`
- `GET /api/v1/comment-images/:id`
- `DELETE /api/v1/comment-images/:id`

讨论区写操作：

- `POST /api/v1/discussions`
- `GET /api/v1/discussions/my`
- `PATCH /api/v1/discussions/:id`
- `DELETE /api/v1/discussions/:id`
- `POST /api/v1/discussions/:id/like`
- `DELETE /api/v1/discussions/:id/like`
- `POST /api/v1/discussions/:id/comments`
- `PATCH /api/v1/discussions/comments/:id`
- `DELETE /api/v1/discussions/comments/:id`
- `POST /api/v1/discussions/comments/:id/like`
- `DELETE /api/v1/discussions/comments/:id/like`
- `POST /api/v1/discussions/comments/:id/report`
- `GET /api/v1/discussions/my-comments`

用户关系与公开资料：

- `POST /api/v1/relations/follow/:id`
- `DELETE /api/v1/relations/follow/:id`
- `GET /api/v1/relations/followers`
- `GET /api/v1/relations/following`
- `POST /api/v1/relations/block/:id`
- `DELETE /api/v1/relations/block/:id`
- `GET /api/v1/relations/blocked`
- `GET /api/v1/relations/status/:id`
- `GET /api/v1/users/:id/public-profile`

通知：

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `PATCH /api/v1/notifications/:id/read`
- `POST /api/v1/notifications/read-all`
- `DELETE /api/v1/notifications/:id`
- `DELETE /api/v1/notifications`

浏览与搜索历史：

- `POST /api/v1/history/search`
- `GET /api/v1/history/search`
- `DELETE /api/v1/history/search/:id`
- `DELETE /api/v1/history/search`
- `POST /api/v1/history/browsing`
- `GET /api/v1/history/browsing`
- `DELETE /api/v1/history/browsing/:id`
- `DELETE /api/v1/history/browsing`
- `DELETE /api/v1/history/all`
- `GET /api/v1/history/stats`
- `GET /api/v1/history/my-comments`
- `GET /api/v1/history/my-likes`
- `GET /api/v1/history/my-comment-favorites`

举报与设备：

- `POST /api/v1/reports`
- `GET /api/v1/reports/my`
- `GET /api/v1/devices`
- `GET /api/v1/devices/current`
- `POST /api/v1/devices/trust`
- `POST /api/v1/devices/untrust`
- `POST /api/v1/devices/rename`
- `DELETE /api/v1/devices/:id`
- `DELETE /api/v1/devices`

账号数据与恢复：

- `GET /api/v1/account/data-summary`
- `POST /api/v1/account/export-data`
- `GET /api/v1/account/deletion-status`
- `POST /api/v1/account/delete`
- `POST /api/v1/account/restore`

两步验证：

- `GET /api/v1/2fa/status`
- `POST /api/v1/2fa/setup`
- `POST /api/v1/2fa/verify`
- `POST /api/v1/2fa/disable`
- `POST /api/v1/2fa/regenerate-backup-codes`

邮箱安全：

- `POST /api/v1/email/send-verification-email`
- `POST /api/v1/email/send-change-password-code`
- `POST /api/v1/email/change-password`
- `POST /api/v1/email/send-change-email-code`
- `POST /api/v1/email/change-email`

上传与个人审计：

- `POST /api/v1/upload/avatar`
- `GET /api/v1/audit/my-activity`
- `GET /api/v1/audit/my-security-summary`

### 5.5 管理后台能力

系统状态与缓存：

- `GET /api/v1/admin/health/detailed`
- `GET /api/v1/admin/db/health`
- `GET /api/v1/admin/stats/system`
- `GET /api/v1/admin/cache/stats`
- `POST /api/v1/admin/cache/clear`
- `GET /api/v1/admin/feedbacks`
- `GET /api/v1/admin/metrics`

用户与头像：

- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `DELETE /api/v1/users/:id`
- `GET /api/v1/users/:id/stats`
- `POST /api/v1/users/:id/roles`
- `GET /api/v1/users/:id/roles`
- `POST /api/v1/upload/users/:user_id/avatar`

角色与权限：

- `POST /api/v1/roles`
- `GET /api/v1/roles`
- `GET /api/v1/roles/permissions/list`
- `GET /api/v1/roles/:id`
- `PATCH /api/v1/roles/:id`
- `DELETE /api/v1/roles/:id`
- `PUT /api/v1/roles/:id/permissions`
- `GET /api/v1/roles/:id/users`

爬虫与处理器：

- `GET /api/v1/crawler/status`
- `GET /api/v1/crawler/platforms/status`
- `GET /api/v1/crawler/config`
- `PUT /api/v1/crawler/config`
- `POST /api/v1/processor/scan`
- `POST /api/v1/processor/scan/failed`
- `GET /api/v1/processor/failures`
- `POST /api/v1/processor/failures/retry`
- `GET /api/v1/processor/stats`
- `GET /api/v1/processor/tasks/:task_id`
- `GET /api/v1/processor/watcher/status`

管理日程与举报：

- `POST /api/v1/schedules`
- `DELETE /api/v1/schedules/:id`
- `GET /api/v1/reports`
- `GET /api/v1/reports/stats/summary`
- `GET /api/v1/reports/:id`
- `PATCH /api/v1/reports/:id`

讨论区运营：

- `POST /api/v1/discussions/:id/pin`
- `DELETE /api/v1/discussions/:id/pin`
- `POST /api/v1/discussions/comments/:id/pin`
- `DELETE /api/v1/discussions/comments/:id/pin`
- `POST /api/v1/discussions/comments/:id/feature`
- `DELETE /api/v1/discussions/comments/:id/feature`

管理审计与账号清理：

- `GET /api/v1/audit/admin/security-events`
- `GET /api/v1/audit/admin/failed-logins`
- `GET /api/v1/audit/admin/user/:user_id`
- `POST /api/v1/account/admin/cleanup-expired`

## 6. 关键联调说明

### 6.1 与前端服务层的建议映射

当前前端 `src/api` 目录可以按以下口径对齐后端：

- `authService.ts` 对齐 `/api/auth/*`
- `clientSecurityService.ts` 对齐 `/api/v1/client/*`
- `postService.ts`、`postsLightService.ts`、`authorService.ts`、`mediaService.ts`、`searchService.ts` 对齐公共内容接口
- `commentService.ts`、`discussionService.ts`、`communityService.ts` 对齐评论与讨论区
- `favoriteService.ts`、`preferencesService.ts`、`notificationService.ts`、`historyService.ts`、`deviceService.ts`、`reportService.ts` 对齐登录用户域
- `adminService.ts`、`auditService.ts` 对齐管理后台域

### 6.2 当前真实差异与前端需修正项

- 旧版自动生成文档中的 `/api/v1/auth/*` 口径是错误的，真实认证路径全部在 `/api/auth/*`
- 前端若仍以通用 JSON 解包器处理全部 `/api/v1/media/*`，会在下载、流媒体、字幕、缩略图场景出现解析错误
- 分页页面不应再把顶层 `has_more` 当成稳定字段，当前应优先依赖 `pagination.page`、`pagination.total_pages`、`pagination.total`
- 请求签名已不是“可选增强项”，而是实际联调前提；只要命中认证、带凭证请求、业务写请求、敏感管理路径，就必须先完成 `client/init` 并正确生成签名
- 前端必须补上 `POST /api/auth/verify-risk-login` 页面与状态机；否则高风险登录链路无法闭环
- 前端必须补上统一 step-up 流程：`verify-password / verify-identity -> 保存 verification_token -> 在敏感接口透传`
- 管理后台已新增：
  - `GET /api/v1/processor/failures`
  - `POST /api/v1/processor/failures/retry`
    前端管理端如需补齐失败任务面板，应直接对接这两条接口
- `GET /api/v1/processor/tasks/:task_id` 当前读取 Celery result backend，若联调时任务状态异常，先核查后端 Redis DB 分工是否为：
  - worker broker：DB0
  - task result：DB1
  - API cache：DB2

### 6.3 前端 UI 处理建议

- `401`：先静默 refresh，再决定是否回登录页
- `403`：区分“权限不足”、“需要 Turnstile challenge”、“需要 verification token”、“签名失败/客户端需重初始化”
- `409`：保留冲突态提示，不要直接吞掉
- `422`：优先映射到字段级错误
- `429`：增加节流提示和重试倒计时
- 所有异常日志建议记录 `X-Request-ID` 或 `meta.request_id`
- 若响应头含 `X-Verification-Required: true`，前端应直接进入 step-up 流程，而不是把它当成普通权限错误
- 若响应头含 `X-Security-Review-Required: true`，前端应保留异常登录提示或安全确认 UI

## 7. 后端运行依赖（与前端联调直接相关）

当前后端与异步任务 Redis 分工如下：

| 用途                  | 当前约定                         |
| --------------------- | -------------------------------- |
| API 普通 Redis        | `REDIS_URL=redis://.../2`        |
| Worker Broker         | `WORKER_REDIS_URL=redis://.../0` |
| Celery Result Backend | `RESULT_REDIS_URL=redis://.../1` |

联调相关环境注意：

- 前端所在域名必须出现在后端 `CORS_ORIGINS`
- 跨域 cookie 场景下，后端必须允许 `AllowCredentials`
- Turnstile 开启时，前端需同步使用服务端返回的 `turnstile_site_key`
- 若前端需要启用客户端初始化流程，可结合 `VITE_ENABLE_CLIENT_INIT`

## 8. 结论

- 当前后端 API 主体能力已具备完整联调条件
- 文档口径必须同时区分 `/api/auth/*` 与 `/api/v1/*`
- 前端实现上最需要特别处理的不是“有没有接口”，而是“哪些接口不走统一响应信封、哪些接口依赖 cookie、哪些异步接口依赖 result backend”
- 以后若新增接口，应优先以本文件为交付口径更新，而不是再回退到前端调用扫描文档
