# HMRChan 前端联调交付文档（前端消费视角）

## 1. 文档定位

本文件只保留 HMRChan 当前 **前端联调 / 登录注册 / callback / MFA** 的消费视角说明。

Split-only 架构切换后的前端联调补充说明见：

- `docs/frontend-split-handoff.md`
- `docs/frontend-security-handoff.md`
- `docs/frontend-joint-checklist.md`
- `docs/frontend-qa-checklist.md`
- `docs/google-auth-prod-troubleshooting-checklist.md`

后端规范、按域契约与 OpenAPI artifact 的真相源已迁移到：

- `docs/contracts/README.md`
- `docs/contracts/*.md`
- `docs/contracts/openapi/*.yaml`

本仓库不包含主站前端代码；因此本文档同时承担两类职责：

- 说明后端已经完成并可供前端调用的真实接口与行为
- 明确前端仓库仍必须完成的页面与交互工作

## 2. 当前状态结论

- 后端认证架构已切换到：**Google 直连 + 本地邮箱 + 本地 MFA**
- Authentik 已从正式认证链路移除
- 后台管理面入口已退役
- 当前前端只应对接主站域名与公开 API

## 3. 前端必须使用的 Host

| 用途     | Host                       | 说明                |
| -------- | -------------------------- | ------------------- |
| 主站前端 | `https://momichan.xyz`     | 前端仓库负责        |
| 主站 API | `https://api.momichan.xyz` | 公开 API / 认证入口 |

Google Console 中 `已授权的重新导向 URI` 也固定只能填写：

- `https://api.momichan.xyz/api/v1/auth/google/callback`

不要把前端页面 `https://momichan.xyz/auth/callback` 填到 Google Console；它只是后端二跳目标。

### 3.1 主站同源 API proxy 与 Google / client auth 链路

主站前端当前通过同源 `/api/v1/*` 代理访问后端；但以下路径在生产默认应**直走 `API_BASE_URL` 对应的 public API upstream**，不再优先走 VPC/internal upstream：

- `/api/v1/client/init`
- `/api/v1/client/verify`
- `/api/v1/auth/google/start`
- `/api/v1/auth/google/callback`
- `/api/v1/auth/google/exchange`

这是有意的止血策略，用于避免主站同源代理命中陈旧 VPC/internal upstream，导致：

- `challenge_required=true` 但首轮 `client_token` 为空
- `google/exchange` 仍返回旧 `{"detail":"Failed to complete login"}` 语义

若 `momichan.xyz/api/v1/*` 与 `api.momichan.xyz/api/v1/*` 行为不一致，优先排查：

- Pages Function API proxy 的 upstream 选择
- `API_BASE_URL` 与 VPC upstream 是否指向不同版本后端
- VPC/internal upstream 是否仍残留旧实例

### 3.2 已退役 Host

以下 host 不应再被前端调用：

- 历史认证子域
- 历史后台前端子域
- 历史后台 API 子域

## 4. Cookie / Header 基线

### 4.1 登录成功后的标准结果

正常登录成功时，后端会：

- 返回 JSON：
  - `access_token`
  - `token_type`
  - `expires_in`
  - `refresh_threshold`
  - `permission_version`
  - `user`
- 同时设置 refresh cookie

### 4.2 前端后续请求

前端后续访问受保护接口时需要：

- `Authorization: Bearer <access_token>`
- 同时允许浏览器携带 refresh cookie
- 前端构建产物还应统一发送：
  - `X-Client-Contract-Version: <frontend-build-contract-version>`

后端会返回：

- `X-Server-Contract-Version`

若后端发现版本不匹配，会返回 `426 Upgrade Required`；前端必须执行 hard reload / upgrade gate。

### 4.3 本地邮箱链路的额外安全要求

本地邮箱登录 / 注册 / 邮件验证码相关写请求，前端必须先完成：

1. `GET /api/v1/auth/turnstile-config`
2. `POST /api/v1/client/init`
3. 必要时 `POST /api/v1/client/verify`
4. 然后再向本地写接口发送：
   - `X-Client-Fingerprint`
   - `X-Client-Token`
   - `X-Timestamp`
   - `X-Signature`
   - `X-Nonce`
   - `X-Content-SHA256`
   - 以及需要的人机验证 token / `Idempotency-Key`

当前 `/register` 页面历史上的 `403/400`，应按 **前端未完整接入这条安全链路** 理解，而不是后端应放宽校验。

更完整的强制签名、来源校验、`permission_version` 与失败码联调说明见：

- `docs/frontend-security-handoff.md`

## 5. 主站登录 / 注册入口要求

### 5.1 `/login`

主站登录页必须同时提供两条路径：

- `继续使用 Google 登录`
- `使用邮箱和密码登录`

不得再出现：

- “统一登录”
- “跳转到 Authentik”
- 任何后台/控制台登录入口

### 5.2 `/register`

主站注册页必须同时提供两条路径：

- `使用 Google 快速注册`
- `使用邮箱注册`

## 6. Google 直连登录契约

### 6.1 启动入口

| 接口                        | Host               | 方法  | 用途                 |
| --------------------------- | ------------------ | ----- | -------------------- |
| `/api/v1/auth/google/start` | `api.momichan.xyz` | `GET` | 启动 Google 授权流程 |

请求参数：

- `intent=login` 或 `intent=register`
- `return_to=` 前端希望登录完成后回到的安全 URL

### 6.2 Google callback

| 接口                           | Host               | 方法  | 用途            |
| ------------------------------ | ------------------ | ----- | --------------- |
| `/api/v1/auth/google/callback` | `api.momichan.xyz` | `GET` | Google 回调入口 |

后端不会把 access token 放进 URL。

后端 callback 成功后固定行为：

- 生成短期 `handoff_code`
- `302` 到主站前端 callback 页面

实现约束补充：

- `google_oauth_state` 与 `google_handoff` 属于一次性交接态，生产环境必须落共享存储（Redis）
- 生产环境不得再静默回退到单实例内存存储，否则 callback / exchange 跨实例时会出现伪过期 `handoff_code`

前端 callback 页面固定目标：

- `https://momichan.xyz/auth/callback?handoff_code=...`

若 callback 失败，后端固定行为：

- `302` 到 `https://momichan.xyz/auth/callback?error=...`

### 6.2.1 `/auth/callback` 页面前端状态机

前端必须按以下顺序处理：

1. 若 URL 含 `error`
   - 直接展示 Google 登录失败页
   - 提供“重试 Google 登录 / 返回登录页”
   - **不得再调用** `POST /api/v1/auth/google/exchange`
   - popup 模式下只允许向受信前端 origin `postMessage`，不得使用 `*`
2. 若 URL 含 `handoff_code`
   - 先完成当前安全链路初始化：
     - `GET /api/v1/auth/turnstile-config`
     - `POST /api/v1/client/init`
     - 若 `challenge_required=true`，该响应必须同时返回可立即用于后续 `client/verify` 的 `client_token`
     - 然后调用一次 `POST /api/v1/auth/google/exchange`
3. 若既无 `error` 也无 `handoff_code`
   - 视为非法 callback
   - 显示 Google 登录失败页，不进入邮箱密码登录逻辑

### 6.3 handoff 交换

| 接口                           | Host               | 方法   | 用途                               |
| ------------------------------ | ------------------ | ------ | ---------------------------------- |
| `/api/v1/auth/google/exchange` | `api.momichan.xyz` | `POST` | 用 `handoff_code` 换取最终登录结果 |

请求字段：

- `handoff_code`
- `device_name`（可选）
- `device_type`（可选）

`google/exchange` 现在只保留以下结果类型：

#### A. 正常登录成功

返回字段：

- `access_token`
- `token_type`
- `expires_in`
- `refresh_threshold`
- `permission_version`
- `user`
- `return_to`

这条成功分支同时覆盖三种后端真实行为：

- 已绑定 Google identity 的老用户直接登录
- 不存在本地账号时，后端创建新 Google 用户并登录
- 已有本地账号且邮箱与 Google 返回邮箱一致、且 Google 邮箱已验证时，后端**自动关联** Google identity 后直接登录

重要规则：

- **同邮箱命中现有本地账号时，现在允许自动关联**
- 整个 Google 快捷登录 / 注册流程**不再要求邮件验证码**
- 前端不再处理 `link_required`、`pending_google_link_token` 或 `google/confirm-link`

#### B. 需要高风险登录验证

返回字段：

- `requires_risk_verification=true`
- `pending_token`
- `challenge_type`
- `expires_in`
- `message`
- `return_to`

前端动作：

- 进入风险登录验证码页
- 调用 `POST /api/v1/auth/verify-risk-login`

#### C. 需要本地 MFA

返回字段：

- `requires_mfa=true`
- `pending_mfa_login_token`
- `methods`
- `expires_in`
- `message`

前端动作：

- 进入 MFA 验证页
- 按方法展示 TOTP / 恢复码 / WebAuthn 验证 UI

#### D. handoff 无效或已过期

典型返回：

- `401`
- `detail="Invalid or expired Google handoff code"`

前端动作：

- 显示“Google 登录已失效/已过期，请重新发起”
- 提供“重试 Google 登录 / 返回登录页”
- 若该错误发生在 popup / callback 的 client challenge 之后，前端也必须**退出** Security check / `auth.verifyTitle` 视图
- **不得显示**：
  - “Invalid email or password”
  - 任何邮箱密码登录失败提示
  - 与本地登录表单复用的错误文案
  - `Security check` / `安全验证` 标题或 `auth.clientChallengeHint`

运行态排查口径：

- callback 已成功创建 handoff，但 exchange 紧接着返回 `invalid_google_handoff` 时，优先检查：
  - Redis 是否在对应时段发生 `Set/Get` 失败
  - callback 与 exchange 是否命中不同实例
  - authflow 日志里的 `authflow_backend` 是否出现 `local`
- 若链路表现为 `challenge_required -> verify success -> invalid_handoff`，前端正确语义仍是“Google 登录已失效”，不是 Security check 失败

补充规则：

- 旧 Authentik 时代的身份记录不会被视为 Google 直连绑定
- 旧 `/api/auth/google/*` 路径已退役，当前应直接视为 `404`
- popup 等待期间前端不再依赖跨源 `window.closed` 轮询判断窗口关闭；应只依赖 callback relay、timeout 或用户显式继续

## 7. 本地邮箱登录 / 注册契约

### 7.1 本地注册相关

| 接口                                   | 方法   | 用途                             |
| -------------------------------------- | ------ | -------------------------------- |
| `/api/v1/email/send-registration-code` | `POST` | 发送注册验证码                   |
| `/api/v1/auth/register`                | `POST` | 使用邮箱 + 密码 + 验证码完成注册 |

### 7.2 本地登录相关

| 接口                             | 方法     | 用途                       |
| -------------------------------- | -------- | -------------------------- |
| `/api/v1/auth/login`             | `POST`   | 使用用户名/邮箱 + 密码登录 |
| `/api/v1/auth/verify-risk-login` | `POST`   | 高风险登录邮件验证码验证   |
| `/api/v1/auth/refresh`           | `POST`   | 刷新 access token          |
| `/api/v1/auth/heartbeat`         | `POST`   | 心跳续期                   |
| `/api/v1/auth/logout`            | `POST`   | 登出                       |
| `/api/v1/auth/me`                | `GET`    | 获取当前用户信息           |
| `/api/v1/auth/sessions`          | `GET`    | 列出会话                   |
| `/api/v1/auth/sessions/:id`      | `DELETE` | 注销指定会话               |
| `/api/v1/auth/verify-password`   | `POST`   | 高敏感操作密码确认         |
| `/api/v1/auth/verify-identity`   | `POST`   | 高敏感操作身份确认         |

### 7.3 密码重置相关

| 接口                                   | 方法   | 用途         |
| -------------------------------------- | ------ | ------------ |
| `/api/v1/email/request-password-reset` | `POST` | 请求重置密码 |
| `/api/v1/email/reset-password`         | `POST` | 重置密码     |

### 7.4 本地登录的特殊错误

如果账号是 Google 自动建号、尚未设置本地密码：

- `POST /api/v1/auth/login` 会返回明确错误：`password_login_unavailable`

前端应引导用户：

- 使用 Google 登录
- 或走“忘记密码 / reset-password”链路建立本地密码

## 8. 风险登录与 MFA 返回分支

### 8.1 风险登录分支

以下接口在主认证成功但命中高风险登录时，会返回风险验证分支：

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/google/exchange`

返回字段：

- `requires_risk_verification=true`
- `pending_token`
- `challenge_type`
- `expires_in`
- `message`

前端动作：

- 展示邮件验证码输入页
- 调用 `POST /api/v1/auth/verify-risk-login`

### 8.2 MFA 分支

以下接口在主认证通过但账号启用了 MFA 时，会返回：

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/google/exchange`
- `POST /api/v1/auth/verify-risk-login`

返回字段：

- `requires_mfa=true`
- `pending_mfa_login_token`
- `methods`
- `expires_in`
- `message`

## 9. MFA 接口契约

| 接口                                        | 方法   | 用途                           |
| ------------------------------------------- | ------ | ------------------------------ |
| `/api/v1/2fa/status`                        | `GET`  | 查询当前账号 MFA 状态          |
| `/api/v1/2fa/setup`                         | `POST` | 开始 TOTP 配置                 |
| `/api/v1/2fa/verify`                        | `POST` | 完成 TOTP 配置                 |
| `/api/v1/2fa/disable`                       | `POST` | 关闭 MFA                       |
| `/api/v1/2fa/regenerate-backup-codes`       | `POST` | 重置恢复码                     |
| `/api/v1/2fa/verify-login`                  | `POST` | 用 TOTP / 恢复码完成登录期 MFA |
| `/api/v1/2fa/webauthn/register/options`     | `POST` | 获取 WebAuthn 注册 options     |
| `/api/v1/2fa/webauthn/register/verify`      | `POST` | 完成 WebAuthn 注册             |
| `/api/v1/2fa/webauthn/authenticate/options` | `POST` | 获取 WebAuthn 登录 options     |
| `/api/v1/2fa/webauthn/authenticate/verify`  | `POST` | 完成 WebAuthn 登录验证         |

## 10. 非认证接口说明

以下能力在本轮认证重构中未改 API 路径：

- `/api/v1/client/*`
- 上传 / 媒体接口
- 业务内容接口

因此前端如无特殊需要，不应把本轮工作扩展为整站业务 API 重写。

## 11. 前端仓库必须完成的页面与交互

### 主站

- `/login`
- `/register`
- `/auth/callback`
- 风险登录验证码页
- MFA 验证页

### 不得再出现的文案 / 路径

- “统一登录”
- “跳转到旧认证中间层”
- 任何历史认证子域 / 历史后台子域登录链路

### 当前未完成项必须如实标注

如果前端仓库尚未完成上述页面与交互，交付状态必须明确写成：

- 后端已完成
- 前端待接入
- 不能假定已上线
