# HMRChan 前后端安全联调通知

## 1. 文档定位

本文档只描述本轮后端已强制生效的安全约束，以及前端必须同步完成的消费动作。

继续参考：

- `docs/frontend-integration.md`
- `docs/frontend-split-handoff.md`

## 2. 已强制生效的基线

- 仍然沿用 `access token + HttpOnly refresh cookie`
- 不新增独立 `X-CSRF-Token`
- 不改成 BFF
- 不新增新的公网业务路由
- `/internal/*` 继续只给后端服务调用

后端现在统一按以下原则校验浏览器请求：

- `SameSite` refresh cookie
- `Origin/Referer` allowlist
- request-integrity V2 签名
- `timestamp + nonce` 防重放
- 指定高成本写操作强制 `Idempotency-Key`

## 3. 哪些请求现在强制来源校验

以下请求若 `Origin/Referer` 不在 allowlist，会直接返回 `403 REQUEST_ORIGIN_NOT_AUTHORIZED`：

- 所有 `/api/v1/auth/*` 写请求
- `/api/v1/auth/refresh`
- `/api/v1/account/*`
- `/api/v1/users/me/*`
- `/api/v1/devices*`
- `/api/v1/email/*`
- 所有携带 bearer 或 refresh cookie 的非 `GET/HEAD` 请求

前端动作：

- 浏览器发起请求时不要主动去掉 `Origin`
- 跨域联调必须使用允许的站点域名
- 不要再假设后端会接受缺失来源头的“裸请求”

## 4. 哪些请求现在强制签名

以下请求现在必须带完整 request-integrity V2 头，否则直接 `4xx`：

- 所有非 `GET/HEAD` 的公网写请求
- 所有带 bearer 或 refresh cookie 的请求
- 所有敏感读请求：
  - `/api/v1/auth/me`
  - `/api/v1/auth/sessions`
  - `/api/v1/account/*`
  - `/api/v1/users/me/*`
  - `/api/v1/devices*`
  - `/api/v1/email/*`
  - `/api/v1/2fa/*`

必须同时发送：

- `X-Client-Fingerprint`
- `X-Client-Token`
- `X-Timestamp`
- `X-Signature`
- `X-Nonce`
- `X-Content-SHA256`

补充要求：

- `X-Nonce` 现在是强制项，只要请求签名就必须发送
- `X-Content-SHA256` 也是强制项
- Google `exchange` 与 `confirm-link` 已纳入正式签名链路，不再 exempt

## 5. 哪些请求现在强制 `Idempotency-Key`

以下路径缺少 `Idempotency-Key` 时，后端直接返回 `400 IDEMPOTENCY_KEY_REQUIRED`：

- `/api/v1/account/export-data`
- `/api/v1/account/delete`
- `/api/v1/auth/verify-identity`
- 所有验证码/邮件发送类接口
- `/api/v1/auth/google/confirm-link`
- `/api/v1/feedback`
- `/api/v1/contact/send`

重复语义保持不变：

- 同 key 同请求：回放原响应
- 同 key 不同 payload：`409`

## 6. `permission_version` 语义

以下响应现在会返回顶层 `permission_version`：

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`

后端会在以下安全状态变化后递增 `permission_version`：

- 账号删除 / 恢复
- 邮箱验证 / 改邮箱
- 重置密码 / 修改密码
- 2FA 开启 / 关闭 / 重置恢复码
- Passkey 注册
- 管理员权限或账号状态变更

前端必须理解：

- access token 和 refresh token 都绑定 `permission_version`
- 旧 token 版本落后时，后端会直接拒绝
- 前端本地权限缓存只能做 UI hint，不能当授权真相

推荐前端动作：

- 收到 `PERMISSION_VERSION_STALE` 后，立即清空本地登录态
- 如果响应头带 `X-Client-Reinit-Required: true`，先重新走 `client/init`
- 不要尝试继续用旧 refresh cookie 自动续期

## 7. 敏感响应缓存约束

以下敏感响应统一带：

- `Cache-Control: private, no-store`
- `Pragma: no-cache`

覆盖范围包括：

- `/api/v1/auth/*`
- `/api/v1/account/*`
- `/api/v1/users/me/*`
- `/api/v1/devices*`
- `/api/v1/email/*`
- `/api/v1/2fa/*`

前端动作：

- 不要把这些响应落本地持久缓存
- refresh 仍必须依赖真实 cookie jar
- 不要把 refresh token 或权限状态复制进 localStorage 作为真相

## 8. 失败码到前端动作映射

| `detail.code`                   | 含义                                | 前端动作                                   |
| ------------------------------- | ----------------------------------- | ------------------------------------------ |
| `REQUEST_ORIGIN_NOT_AUTHORIZED` | 请求来源不在 allowlist              | 停止重试，检查域名/环境                    |
| `REQUEST_SIGNATURE_REQUIRED`    | 缺签名或缺 `nonce/body hash`        | 重新走 `client/init` 后按 V2 重签          |
| `REQUEST_TIMESTAMP_INVALID`     | 时间戳格式非法                      | 校正前端签名实现                           |
| `REQUEST_EXPIRED`               | 时间戳超窗                          | 重新签名并重发                             |
| `REQUEST_NONCE_REPLAYED`        | nonce 已被消费                      | 重新生成 nonce，禁止原样重放               |
| `INVALID_SIGNATURE`             | 签名或 body hash 不匹配             | 重新计算签名，排查 body 序列化差异         |
| `CLIENT_TOKEN_EXPIRED`          | client token / secret 已失效        | 重新执行 `client/init`                     |
| `IDEMPOTENCY_KEY_REQUIRED`      | 缺少强制幂等 key                    | 生成并补发 `Idempotency-Key`               |
| `PERMISSION_VERSION_STALE`      | access/refresh 已过期于最新权限版本 | 清空登录态，重新初始化并重新登录           |
| `CHALLENGE_REQUIRED`            | 当前信任等级不足，需要人机验证      | 显示挑战控件并调用 `/api/v1/client/verify` |
| `TURNSTILE_VERIFICATION_FAILED` | Turnstile 校验失败                  | 提示重试验证，不降级为普通登录失败         |

## 9. 推荐联调顺序

### 9.1 邮箱/密码链路

1. `GET /api/v1/auth/turnstile-config`
2. `POST /api/v1/client/init`
3. 必要时 `POST /api/v1/client/verify`
4. 发正式写请求，并带完整 V2 签名头
5. 登录后对受保护读请求继续带签名

### 9.2 Google 链路

1. `GET /api/v1/auth/google/start`
2. callback 页面拿到 `handoff_code`
3. `GET /api/v1/auth/turnstile-config`
4. `POST /api/v1/client/init`
5. `POST /api/v1/auth/google/exchange`，带完整 V2 签名头
6. 如进入 link flow，`POST /api/v1/auth/google/confirm-link` 也必须带完整 V2 签名头与 `Idempotency-Key`

## 10. 前端不要再依赖的假设

- 不要再假设 `X-CSRF-Token` 会被后端校验
- 不要再假设 Google `exchange/confirm-link` 可以不签名
- 不要再假设旧 refresh 会话在权限状态变化后仍可继续 rotation
- 不要再把 localStorage 中的角色/权限当授权真相
