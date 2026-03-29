# 主站前端认证接入文档（2026-03-30 canonical）

## 1. 范围

本文档只描述当前前端仓库负责的主站 `https://momichan.xyz` 与公开 API `https://api.momichan.xyz` 的认证接入结果。

不在本轮范围内：

- 历史后台子域的前端接入
- 历史后台 API 子域的联调与发布
- 任何旧认证中间层页面或外部登出回调页面

前端实现已对齐后端仓库中的 canonical 联调文档。

## 2. 当前主站认证模型

主站现已按以下产品语义组织：

- 邮箱 / 密码登录
- 邮箱注册
- 忘记密码 / 重置密码
- Google 快捷登录 / 注册
- 本地 MFA（TOTP / backup code / WebAuthn）

前台已移除旧版外部身份中心相关语义，并统一改为当前主站产品表达。

## 3. 路由与页面

当前主站认证相关页面：

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/auth/callback`
- `/profile/settings`

页面职责：

- `/login`：邮箱密码登录、Google 登录入口、高风险验证码、登录期 MFA
- `/register`：邮箱注册两步流 + Google 快速注册入口
- `/auth/callback`：Google handoff 交换、账号合并确认、风险验证、MFA、错误重试
- `/profile/settings`：登录方式摘要、本地 TOTP、恢复码、Passkey 管理

## 4. 运行时会话语义

所有成功登录最终都建立同一种站内 session：

- 前端保存 access token
- 浏览器同时携带 refresh cookie
- 统一使用 `/api/auth/refresh`
- 统一使用 `/api/auth/heartbeat`
- 统一使用 `/api/auth/logout`

前端不再按认证来源区分不同续航模型。

### 4.1 会话恢复与失效处理

- 启动阶段：如存在可恢复 session，统一走 bootstrap + `/auth/me`
- 心跳阶段：所有已登录会话都启 heartbeat
- `401 / 403 / refresh 失败`：清空本地认证状态并跳转到 `/login?redirect=...`
- 不再自动重启 Google 登录
- 登出后只调用 `/api/auth/logout`，随后清本地状态并回 `/login`

### 4.2 登录后的跳转优先级

登录成功后的回跳顺序：

1. 后端返回的 `return_to`
2. 前端安全校验后的 `redirect`
3. `/`

## 5. 后端接口契约（主站）

### 5.1 邮箱登录链路

| 接口                          | 方法   | 用途                     |
| ----------------------------- | ------ | ------------------------ |
| `/api/auth/login`             | `POST` | 用户名/邮箱 + 密码登录   |
| `/api/auth/verify-risk-login` | `POST` | 高风险登录邮件验证码验证 |
| `/api/auth/refresh`           | `POST` | 刷新 access token        |
| `/api/auth/heartbeat`         | `POST` | 会话心跳续期             |
| `/api/auth/logout`            | `POST` | 登出                     |
| `/api/auth/me`                | `GET`  | 获取当前用户             |

`/api/auth/login` 当前只接受以下主分支：

- 成功
- `requires_risk_verification`
- `requires_mfa`
- `password_login_unavailable`

`/api/auth/verify-risk-login` 当前返回：

- 成功
- `requires_mfa`

### 5.2 Google 直连链路

| 接口                            | 方法   | 用途                             |
| ------------------------------- | ------ | -------------------------------- |
| `/api/auth/google/start`        | `GET`  | 发起 Google 登录 / 注册          |
| `/api/auth/google/exchange`     | `POST` | 用 `handoff_code` 换最终登录结果 |
| `/api/auth/google/confirm-link` | `POST` | 邮箱验证码确认 Google 绑定       |

前端启动参数：

- `intent=login | register`
- `return_to=<安全回跳地址>`

Google callback 固定进入：

- `/auth/callback?handoff_code=...`

`/api/auth/google/exchange` 与 `/api/auth/google/confirm-link` 当前可能返回：

- 成功
- `link_required`
- `requires_risk_verification`
- `requires_mfa`

## 6. 挑战链路状态机

### 6.1 邮箱登录

`credentials -> risk -> mfa -> success`

说明：

- `verify-risk-login` 成功后如果继续返回 `requires_mfa`，前端会在同一流程继续推进
- 不再使用 `requires_2fa` 或任何旧本地 2FA 中间态

### 6.2 Google 快捷登录 / 注册

`exchange -> link -> risk -> mfa -> success`

说明：

- `link_required` 时展示 masked email + 验证码输入
- `confirm-link` 后如果继续命中 risk 或 mfa，前端继续链式推进
- `/auth/callback` 不再处理 `code/state`，只处理 `handoff_code`

## 7. MFA 接口与状态

### 7.1 MFA 接口

| 接口                                        | 方法   | 用途                      |
| ------------------------------------------- | ------ | ------------------------- |
| `/api/v1/2fa/status`                        | `GET`  | 查询 MFA 状态             |
| `/api/v1/2fa/setup`                         | `POST` | 开始 TOTP 配置            |
| `/api/v1/2fa/verify`                        | `POST` | 完成 TOTP 配置            |
| `/api/v1/2fa/disable`                       | `POST` | 关闭 MFA                  |
| `/api/v1/2fa/regenerate-backup-codes`       | `POST` | 重置恢复码                |
| `/api/v1/2fa/verify-login`                  | `POST` | 登录期 TOTP / 恢复码验证  |
| `/api/v1/2fa/webauthn/register/options`     | `POST` | 获取 Passkey 注册 options |
| `/api/v1/2fa/webauthn/register/verify`      | `POST` | 完成 Passkey 注册         |
| `/api/v1/2fa/webauthn/authenticate/options` | `POST` | 获取 Passkey 登录 options |
| `/api/v1/2fa/webauthn/authenticate/verify`  | `POST` | 完成 Passkey 登录验证     |

### 7.2 `GET /api/v1/2fa/status` 关键字段

- `enabled`
- `totp_enabled`
- `totp_pending_setup`
- `has_backup_codes`
- `methods`
- `webauthn_credentials`

前端当前支持：

- TOTP setup / verify / disable
- backup code regenerate
- WebAuthn / Passkey 新增与登录期验证

本轮不包含：

- Passkey 删除
- Passkey 重命名

## 8. 用户资料字段

登录后的最终展示主要依赖 `/api/auth/me`：

- `auth_source`：后端透传字符串，前端不再限制为固定枚举
- `identity_provider`：当前主站已知为 `local` 或 `google`
- `linked_providers`

设置页展示规则：

- `local` -> 邮箱登录
- `google` -> Google 登录
- 其他 provider -> 第三方登录

## 9. 前端文案与交互约束

必须满足：

- 登录页和注册页都提供单个 Google 入口
- 不展示未接通的第三方假按钮
- `password_login_unavailable` 时明确提示改用 Google 或忘记密码
- `/auth/callback` 错误页使用“Google / 第三方快捷登录失败”产品语言
- 设置页展示本地 MFA 管理，而不是外部账户中心跳转

不得再回退到旧版外部身份中心文案或旧登出回调模型。

## 10. 安全链路要求

邮箱注册、邮箱登录、风险验证码等本地写请求继续依赖现有安全链路：

- `GET /api/auth/turnstile-config`
- `POST /api/v1/client/init`
- 必要时 `POST /api/v1/client/verify`
- 写请求带签名头、指纹头与 Turnstile token

这部分逻辑没有因为 Google handoff 接入而移除。

## 11. 仓库内已完成的关键改造

- 删除旧第三方登录服务实现
- 删除旧 callback 页面实现
- 新增 `googleAuthService`
- `/auth/callback` 改为 Google handoff callback 页面
- `authStore` 改为邮箱登录 + Google handoff + 链式 risk / mfa 状态机
- `authSessionController` 改为所有会话统一 refresh / heartbeat / logout
- `ProfileSettingsPage` 恢复为本地 MFA 管理面板
- locale、edge shell、前端文档已移除旧外部身份中心产品文案

## 12. 验证结果

本轮已完成以下本地验证：

- `bun run type-check`
- `bun run test:unit -- src/stores/__tests__/auth.spec.ts`
- `bun run test:unit -- src/services/__tests__/authSessionController.spec.ts`
- `bun run test:unit -- src/edge/__tests__/htmlDocument.spec.ts`

重点覆盖：

- 邮箱登录成功 / 风险验证 / MFA 挂起
- Google exchange / link / risk / MFA 分支
- 所有会话统一 heartbeat / refresh / logout
- `/auth/callback` 仍保持 noindex

## 13. 后续后台接入工作流的复用边界

虽然本轮只交付主站，当前 service / type / store 组织方式已避免写死历史认证流程模型，后续可复用到后续后台接入工作流：

- Google handoff service
- 链式 challenge 状态机
- WebAuthn 工具与登录期 MFA 组件
- provider-aware 登录方式展示

但历史后台子域与历史后台 API 子域的后续接入仍需要独立处理各自的 host、路由和页面。
