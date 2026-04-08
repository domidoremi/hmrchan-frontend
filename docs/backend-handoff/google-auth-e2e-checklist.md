# Google 登录端到端验收清单

适用日期：2026-04-03（JST）

本清单用于验收当前正式 Google 登录链路：

`/api/v1/auth/google/start` → Google → `/api/v1/auth/google/callback` → `/auth/callback?handoff_code=...` → `client/init` → `/api/v1/auth/google/exchange`

线上故障定位与生产排查请同步参考：

- `google-auth-prod-troubleshooting-checklist.md`

补充固定口径：

- 主站同源 `/api/v1/client/*` 与 `/api/v1/auth/google/*` 在生产默认应直走 public API upstream
- 这些路径不应优先命中 VPC/internal upstream，否则容易出现“主站 API 仍旧、`api.momichan.xyz` 已新”的版本漂移

## 0. 生产真相源与发布后 smoke

生产 Docker Compose / `.env` 必须固定为：

- `GOOGLE_OAUTH_REDIRECT_WEB_URL=https://api.momichan.xyz/api/v1/auth/google/callback`
- `FRONTEND_URL=https://momichan.xyz`

Google Console 中 `已授权的重新导向 URI` 也必须填写：

- `https://api.momichan.xyz/api/v1/auth/google/callback`

发布后至少执行以下 smoke：

- `GET /api/v1/auth/google/start?...`，断言 Google `redirect_uri` 精确等于 `https://api.momichan.xyz/api/v1/auth/google/callback`
- `POST /api/v1/client/init` 在 `challenge_required=true` 时必须返回非空 `client_token`
- `POST /api/v1/client/verify` 对失效 token 必须返回 `INVALID_CLIENT_TOKEN` / `CLIENT_TOKEN_EXPIRED`，并带 `X-Client-Reinit-Required: true`
- `POST /api/v1/auth/google/exchange` 不得再返回裸 `{"detail":"Failed to complete login"}`
- 同源主站与 API 域都要核对 `X-Auth-Chain-Version`、`X-Proxy-Upstream-Source` 与响应语义一致
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
- `google/exchange` 不再返回 `link_required`
- 后端自动创建 Google identity 并继续后续认证分支：
  - 若无风险/MFA：直接登录成功
  - 若命中高风险登录：进入 `verify-risk-login`
  - 若启用 MFA：进入 MFA 验证页
- 响应里不得再出现：
  - `link_required`
  - `pending_google_link_token`
- 整个流程不应发送 Google 绑定验证码邮件

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

### 2.3 不应再存在 Google 绑定验证码流

- 本地邮箱账号首次走 Google 时，不应跳转“账号合并确认页”
- 不应要求用户输入邮件验证码
- 不应调用 `POST /api/v1/auth/google/confirm-link`
- 若前端仍尝试调用该路径，应视为前端使用了过期契约

### 2.4 已退役路径探测

- 直接请求 `POST /api/v1/auth/google/confirm-link`
- 预期：`404`
- 不应再存在“已废弃但还能成功”的兼容桥

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
- 不再存在 `/api/v1/auth/google/confirm-link` 的正常运行流量

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

## 5. 当前固定产品规则

- Google 返回邮箱已验证，且数据库中存在同邮箱本地账号时，后端会自动关联 Google identity
- Google 返回邮箱已验证，且数据库中不存在同邮箱账号时，后端会创建新 Google 用户
- Google 快捷登录 / 注册流程不再要求邮件验证码或确认合并页面
