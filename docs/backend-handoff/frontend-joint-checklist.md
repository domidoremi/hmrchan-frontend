# 前后端联调步骤清单

## 1. 文档定位

本清单用于前后端联调执行，按“先确认环境真相，再跑认证与安全链，最后验业务 split-only 契约”的顺序展开。

当前真相源仍是：

- `docs/frontend-integration.md`
- `docs/frontend-security-handoff.md`
- `docs/frontend-split-handoff.md`
- `docs/contracts/*.md`
- `docs/contracts/openapi/*.yaml`

本清单只是把这些真相源整理成可执行联调步骤。

## 2. 联调前置

### 2.1 环境真相确认

- 确认当前联调环境使用的不是旧线上实例，而是已经部署了当前仓库工作树语义的后端。
- 核对核心配置：
  - `GOOGLE_OAUTH_REDIRECT_WEB_URL=https://api.momichan.xyz/api/v1/auth/google/callback`
  - `FRONTEND_URL=https://momichan.xyz`
- 确认 Google Console 的 `已授权的重新导向 URI` 填的是：
  - `https://api.momichan.xyz/api/v1/auth/google/callback`
- 确认前端正式流量只走：
  - `https://momichan.xyz`
  - `https://api.momichan.xyz/api/v1/*`

### 2.2 前端请求基线确认

- 前端不会主动剥离 `Origin/Referer`。
- 前端不会继续走旧 `/api/auth/*` fallback。
- 前端构建与运行时会统一发送 `X-Client-Contract-Version`。
- 前端收到 `426 Upgrade Required` 或 `X-Client-Upgrade-Required: true` 时会执行 hard reload gate。

## 3. 浏览器安全链联调

### 3.1 安全链初始化

1. `GET /api/v1/auth/turnstile-config`
2. `POST /api/v1/client/init`
3. 若环境开启 Turnstile，再执行 `POST /api/v1/client/verify`

断言：

- 返回值正常，可拿到前端后续签名所需的 client 凭证。
- 本地或测试环境若关闭 Turnstile，不应额外阻断流程。

### 3.2 V2 签名头确认

对以下请求抓包确认都带有完整请求头：

- `X-Client-Contract-Version`
- `X-Client-Fingerprint`
- `X-Client-Token`
- `X-Timestamp`
- `X-Signature`
- `X-Nonce`
- `X-Content-SHA256`

必抓接口：

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/google/exchange`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/verify-risk-login`
- `POST /api/v1/2fa/verify-login`

### 3.3 幂等键确认

确认以下请求缺少 `Idempotency-Key` 时会直接失败，带上后恢复正常：

- `POST /api/v1/auth/verify-identity`
- `POST /api/v1/account/export-data`
- `POST /api/v1/account/delete`
- 所有验证码/邮件发送接口
- `POST /api/v1/feedback`
- `POST /api/v1/contact/send`

额外确认：

- `POST /api/v1/auth/google/exchange` **需要签名**
- `POST /api/v1/auth/google/exchange` **不要求 `Idempotency-Key`**

## 4. Google 登录联调

### 4.1 Google start / callback

1. 请求 `GET /api/v1/auth/google/start?intent=login|register&return_to=...`
   - 断言 302 到 Google
   - 断言 `redirect_uri` 精确等于 `https://api.momichan.xyz/api/v1/auth/google/callback`
2. 请求 `GET /api/v1/auth/google/callback?error=access_denied`
   - 断言 302 到 `https://momichan.xyz/auth/callback?error=access_denied`
   - 前端不得继续调用 `POST /api/v1/auth/google/exchange`
3. 请求 `GET /api/v1/auth/google/callback?state=...&code=...`
   - 断言 302 到 `https://momichan.xyz/auth/callback?handoff_code=...`

### 4.2 前端 `/auth/callback` 页面

联调前端状态机：

- `error` 分支：
  - 展示 Google 专属失败态
  - 不得落回“邮箱或密码错误”
- `handoff_code` 分支：
  - 先执行 `turnstile-config -> client/init`
  - 再调用一次 `POST /api/v1/auth/google/exchange`
- popup 分支：
  - 只桥接 `handoff_code/error`
  - `postMessage` 生产只允许 `https://momichan.xyz`
  - 禁止 `*`

### 4.3 Google exchange 正向分支

必测三类：

1. 已绑定 Google 用户
   - 直接登录成功
2. 不存在本地账号
   - 自动创建用户并登录
3. 已有本地账号且 Google 邮箱已验证
   - 自动关联并直接登录

成功响应断言：

- 返回 `access_token`
- 返回 `token_type`
- 返回 `expires_in`
- 返回 `refresh_threshold`
- 返回 `permission_version`
- 返回 `user`
- 浏览器拿到 refresh cookie
- 前端不再进入验证码绑定页

### 4.4 Google challenge 分支

- `requires_risk_verification=true`
  - 前端只进入风险验证页
- `requires_mfa=true`
  - 前端只进入 MFA 页

联调时必须确认：

- 不再出现 `link_required`
- 不再出现 `pending_google_link_token`
- 不再调用 `/api/v1/auth/google/confirm-link`

## 5. 本地登录 / refresh / me 联调

### 5.1 登录与恢复会话

- `POST /api/v1/auth/login`
  - 成功时拿到 access token + refresh cookie + `permission_version`
- 刷新页恢复会话只允许：
  - refresh cookie -> `POST /api/v1/auth/refresh` -> `GET /api/v1/auth/me`

### 5.2 permission_version

确认以下响应都返回顶层 `permission_version`：

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`

再验证 stale 会话语义：

- 后端安全状态变化后，旧 access / refresh 会话会被拒绝
- 返回 `PERMISSION_VERSION_STALE` 时，前端清空登录态
- 若带 `X-Client-Reinit-Required: true`，前端先重跑 `client/init`

## 6. split-only 业务契约联调

### 6.1 UUID canonical

- `POST /api/v1/history/browsing`
- `GET /api/v1/history/browsing`

断言：

- 前端只发送 `content_uuid + content_type`
- 响应里不得再出现 `content_id`

### 6.2 社区统计

- `GET /api/v1/community/stats`

断言：

- 响应里存在 `active_participants`
- 前端不再依赖 `total_users`

### 6.3 strict split-only 接口

- `GET /api/v1/account/data-summary`
- `POST /api/v1/account/export-data`

断言：

- 若上游失败返回 `503`，前端显示可重试错误态
- 不得渲染 partial payload

### 6.4 best-effort 富化

联调以下接口：

- `GET /api/v1/home`
- `GET /api/v1/community/highlights`
- `GET /api/v1/inbox`
- `GET /api/v1/inbox/summary`

断言：

- 富化字段缺失时按局部降级处理
- `community/highlights` 返回空 `items` 也视为可接受降级
- 不因为富化失败把整页打成全页错误

### 6.5 删除账号

- `POST /api/v1/account/delete`

断言：

- 成功后前端立即清空本地登录态
- 立即离开受保护页面
- 不等待 community 异步清理完成

## 7. 失败链路回归

至少验证一次以下失败码或退役路径：

- `REQUEST_ORIGIN_NOT_AUTHORIZED`
- `REQUEST_SIGNATURE_REQUIRED`
- `REQUEST_NONCE_REPLAYED`
- `INVALID_SIGNATURE`
- `CLIENT_TOKEN_EXPIRED`
- `IDEMPOTENCY_KEY_REQUIRED`
- `PERMISSION_VERSION_STALE`
- 无效/过期 `handoff_code`
- 旧 `/api/auth/google/*`
- 旧 `/api/v1/auth/google/confirm-link`

## 8. 联调通过标准

- 前端网络面只剩 `/api/v1/*`
- Google 快捷登录全程不出现验证码绑定 UI
- 受保护请求都带 V2 签名头
- 指定接口缺 `Idempotency-Key` 会稳定失败
- `permission_version` 在 login / refresh / me 一致可见
- split-only UUID / 字段语义与后端一致
- 旧路径与旧字段只表现为退役，不存在兼容桥
