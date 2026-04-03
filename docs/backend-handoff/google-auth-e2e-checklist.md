# Google 登录端到端验收清单

适用日期：2026-04-03（JST）

本清单用于验收当前正式 Google 登录链路：

`/api/v1/auth/google/start` → Google → `/api/v1/auth/google/callback` → `/auth/callback?handoff_code=...` → `client/init` → `/api/v1/auth/google/exchange`

## 0. 生产真相源与发布后 smoke

生产 Docker Compose / `.env` 必须固定为：

- `GOOGLE_OAUTH_REDIRECT_WEB_URL=https://api.momichan.xyz/api/v1/auth/google/callback`
- `FRONTEND_URL=https://momichan.xyz`

Google Console 中 `已授权的重新导向 URI` 也必须填写：

- `https://api.momichan.xyz/api/v1/auth/google/callback`

发布后至少执行以下 smoke：

- `GET /api/v1/auth/google/start?...`，断言 Google `redirect_uri` 精确等于 `https://api.momichan.xyz/api/v1/auth/google/callback`
- `GET /api/v1/auth/google/callback?error=access_denied`，断言 `302` 到 `https://momichan.xyz/auth/callback?error=access_denied`
- 旧 `/api/auth/google/*` 路径应直接 `404`

## 1. 必验主流程

### 1.1 新 Google 用户注册

- 入口：`/register`
- 点击 “Sign up with Google”
- Google 授权成功
- 回到 `/auth/callback?handoff_code=...`
- 前端完成 `client/init`
- `POST /api/v1/auth/google/exchange` 返回登录成功
- 页面落 session / token 并跳转 `return_to`

### 1.2 已绑定 Google 的老用户登录

- 入口：`/login`
- 点击 “Continue with Google”
- Google 授权成功
- `google/exchange` 返回登录成功
- 页面直接进入主站，不进入合并页或 MFA 页

### 1.3 本地邮箱账号首次走 Google

- 准备一个本地账号，邮箱与 Google 账号一致，但尚未绑定 Google
- 发起 Google 登录
- `google/exchange` 返回：
  - `link_required=true`
  - `pending_google_link_token`
  - `masked_email`
- 前端跳转“Google 账号合并确认页”
- 用户输入邮件验证码
- `POST /api/v1/auth/google/confirm-link` 成功后：
  - 若无 MFA：直接登录成功
  - 若有 MFA：进入 MFA 验证页

### 1.4 已绑定 Google 且启用 MFA

- 准备已绑定 Google 且启用 MFA 的账号
- Google 登录后 `google/exchange` 返回：
  - `requires_mfa=true`
  - `pending_mfa_login_token`
  - `methods`
- 前端根据 `methods` 展示：
  - `totp`
  - `backup_code`
  - `webauthn`
- 通过任一方式完成验证后成功登录

## 2. 必验失败流程

### 2.1 callback 直接带 `error`

- 访问 `/auth/callback?error=invalid_google_state`
- 前端必须直接展示 Google 登录失败态
- **不得调用** `POST /api/v1/auth/google/exchange`

2026-03-30 live 观测：

- 当前正式站点该分支未继续调用 `google/exchange`
- 页面会显示 Google 专属失败态，并提供重试/返回登录页操作

### 2.2 `handoff_code` 无效或已过期

- 访问 `/auth/callback?handoff_code=<invalid>`
- 预期：
  - `POST /api/v1/auth/google/exchange` 返回 `401`
  - 前端显示“Google 登录已失效/已过期，请重新发起”
- **不得显示**：
  - “Invalid email or password”
  - 任何邮箱密码登录失败提示

2026-03-30 live 观测：

- 当前正式站点会先调用 `GET /api/v1/auth/turnstile-config`
- 然后调用 `POST /api/v1/client/init`
- 再调用一次 `POST /api/v1/auth/google/exchange`
- 当前前端仍把该 `401` 的次级错误文案误显示成 `Invalid email or password`
- 当前前端还会额外拉起 `Security check` 弹窗，语义上与 Google handoff 失效不一致

### 2.3 `pending_google_link_token` 无效或过期

- 合并页提交过期 token
- 预期显示“Google 账号合并已失效，需要重新发起”

### 2.4 邮件验证码错误 / 过期 / 重复提交

- 在合并页分别验证三种场景
- 预期提示验证码无效或已失效
- 不得跳回邮箱密码登录失败态
- 后端当前应稳定返回 `400 Invalid or expired verification code`，不应退化为 `500`

### 2.5 MFA 错误路径

- 错误 TOTP
- 错误恢复码
- 过期 `pending_mfa_login_token`
- WebAuthn 被取消

这些场景都应停留在 MFA 语义下，不得映射成邮箱密码登录失败。

## 3. 运行态观测点

### API 日志

- `/api/v1/auth/google/start` → `302`
- `/api/v1/auth/google/callback` → `302`
- `/api/v1/auth/google/exchange` → `200` 或预期 `401`
- `/api/v1/auth/google/confirm-link` → `200/400/401/403`

### 浏览器网络

- `/auth/callback` 页面应先做：
  - `GET /api/v1/auth/turnstile-config`
  - `POST /api/v1/client/init`
- 然后再调：
  - `POST /api/v1/auth/google/exchange`
- `error=` 场景不得调用 `exchange`
- `exchange` 每次 callback 只应发一次

## 4. 当前已知前端风险点

若 `/auth/callback` 使用无效 `handoff_code`，当前前端不得把该 `401` 误映射为：

- “Invalid email or password”

该场景的正确语义是：

- Google 登录已失效 / 已过期
- 需要重新发起 Google 登录
