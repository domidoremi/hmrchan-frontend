# Frontend Improvement Checklist

本文档只描述前端当前基于后端已落地契约，仍需尽快补齐或清理的事项。

真相源文档仍是：

- `frontend-integration.md`
- `frontend-split-handoff.md`
- `frontend-security-handoff.md`
- `contracts/*.md`
- `contracts/openapi/*.yaml`

## P0. 认证与请求安全链必须先收口

### 1. Google callback / handoff 错误语义要与邮箱密码登录分离

后端当前对 Google 登录的真实链路是：

1. `GET /api/v1/auth/google/start`
2. Google 回调到 `GET /api/v1/auth/google/callback`
3. 后端 `302` 到前端 `/auth/callback?handoff_code=...`
4. 前端调用 `POST /api/v1/auth/google/exchange`

前端当前需要重点确认：

- `google/exchange` 失效、`handoff_code` 缺失、Google callback 错误，不得再落到“邮箱或密码错误”
- `link_required=true`、`requires_mfa=true`、Google handoff 无效，这三类返回必须走独立状态机
- `/auth/callback` 页面要严格区分：
  - URL 上有 `error`
  - URL 上有 `handoff_code`
  - 二者都没有

已观察到的相关位置：

- `src/views/AuthCallbackPage.vue`
- `src/stores/auth.ts`
- `src/services/googleAuthService.ts`

### 2. request-integrity 必须升级到后端当前强制的 V2

后端现在强制的浏览器签名头是：

- `X-Client-Fingerprint`
- `X-Client-Token`
- `X-Timestamp`
- `X-Signature`
- `X-Nonce`
- `X-Content-SHA256`

高成本写请求还要求：

- `Idempotency-Key`

前端当前代码里已看到旧版或不一致实现，需要收口：

- `src/api/clientSecurityService.ts`
  - 当前注释与实现仍是旧版 `METHOD|path|timestamp`
- `src/api/client/client-security.ts`
  - 当前只补了 `X-Timestamp`、`X-Signature`
  - 没有看到 `X-Nonce`、`X-Content-SHA256`
- `src/api/client/request-security.ts`
  - 仍在发 `X-CSRF-Token`
  - 仍在发 `X-Request-Timestamp`
  - 仍在发 `X-Idempotency-Key`

需要统一为：

- 不再依赖 `X-CSRF-Token`
- 不再使用 `X-Request-Timestamp`
- 不再使用 `X-Idempotency-Key`
- 统一只发后端当前要求的 V2 头
- `Idempotency-Key` 使用标准 header 名，不加 `X-`

### 3. Google `exchange` / `confirm-link` 必须走正式安全链

这两个接口现在已经不是 exempt：

- `POST /api/v1/auth/google/exchange`
- `POST /api/v1/auth/google/confirm-link`

前端需要确保：

- 先完成 `turnstile-config -> client/init`
- 请求带完整 V2 签名头
- `confirm-link` 带 `Idempotency-Key`
- 失败时按 Google 专属错误展示，不回退到邮箱密码文案

## P1. split-only canonical 契约还需要清理

### 4. browsing history 正式退役 `content_id`

后端当前已确认：

- `/api/v1/history/browsing` 请求只认 `content_uuid + content_type`
- 响应里不应再消费 `content_id`

前端当前仍有旧字段残留：

- `src/api/historyService.ts`
- `src/components/profile/ProfileHistoryTab.vue`

需要改成：

- 类型定义移除 `content_id`
- `recordBrowsing` 不再接收 bigint `contentId`
- 浏览历史相关 UI、状态、埋点一律按 UUID string 处理

### 5. `/community/stats` 改读 `active_participants`

后端当前契约已不再以 `total_users` 为主字段。

前端当前仍保留：

- `src/api/communityService.ts`
- `src/api/adminService.ts`

需要改成：

- 社区页只消费 `active_participants`
- 不再把 `total_users` 作为必需字段
- 若要兼容过渡，只能把 `total_users` 作为可选 fallback，而不是主字段

### 6. 所有跨域标识都必须按 UUID string 处理

后端 split-only 后，以下 key 名即使没改，值语义也已变成 UUID string：

- `id`
- `post_id`
- `discussion_id`
- `user.id`
- `author.id`

前端需要清理：

- 任何把这些字段当数字做比较、排序、Map key、路由参数处理的逻辑
- 任何 `Number(id)`、`parseInt(id)`、`=== 0` 这类旧假设

## P1. 会话与权限失效语义要跟上后端

### 7. 接入 `permission_version` 与 stale token 处理

后端现在对 access token 和 refresh 都加了 `permission_version`。

前端需要做到：

- 登录、refresh、`auth/me` 读取顶层 `permission_version`
- 收到 `PERMISSION_VERSION_STALE` 时，不再继续 silent refresh
- 若响应头带 `X-Client-Reinit-Required: true`，先重走 `client/init`
- 本地角色/权限缓存只做 UI hint，不做真相源

重点检查：

- `src/stores/auth.ts`
- `src/services/authSessionController.ts`

## P1. 页面降级与错误态需要符合后端新语义

### 8. strict split-only 的接口要正确处理 `503`

以下接口在上游 split private 失败时会直接 `503`：

- `/api/v1/account/data-summary`
- `/api/v1/account/export-data`

前端要求：

- 展示可重试错误态
- 不渲染 partial payload
- 不把它们误判成登录失效

### 9. best-effort 富化失败不能把整页打死

以下接口允许局部富化缺失：

- `/api/v1/home`
- `/api/v1/community/highlights`
- `/api/v1/inbox`
- `/api/v1/inbox/summary`

前端要求：

- 作者、头像、摘要、preview 缺失时局部降级
- `community/highlights` 返回空 `items` 时按可接受降级处理
- 不把这类情况统一归成全页错误

## P2. 可以顺手清理的遗留兼容层

### 10. 统一前端安全层入口

当前安全请求逻辑分散在：

- `src/api/clientSecurityService.ts`
- `src/api/client/client-security.ts`
- `src/api/client/request-security.ts`

建议收口成单一真相源，避免：

- header 名不一致
- 签名 payload 版本不一致
- `client/init` 例外路径重复维护
- Google / 登录 / 普通写请求走成不同规则

### 11. 清理旧的 CSRF / timestamp / idempotency 兼容假设

当前前端里仍能看到旧时代命名：

- `X-CSRF-Token`
- `X-Request-Timestamp`
- `X-Idempotency-Key`

这些都不应再作为正式链路的一部分继续传播到新代码。

## 建议执行顺序

1. 先统一请求安全头与签名 V2。
2. 再修 Google callback / exchange / confirm-link 的错误语义。
3. 再清 browsing history 的 `content_id`。
4. 再把 `community/stats` 切到 `active_participants`。
5. 最后清理旧兼容层与重复实现。

## 最低自测清单

- Google 登录成功后能到 `/auth/callback?handoff_code=...`
- `google/exchange` 无效时不再显示“邮箱或密码错误”
- `google/confirm-link` 携带标准 `Idempotency-Key`
- 浏览历史请求只发送 `content_uuid + content_type`
- 社区统计不再依赖 `total_users`
- 收到 `PERMISSION_VERSION_STALE` 后会清会话并重新初始化
- `home` / `community/highlights` / `inbox` 缺富化字段时页面仍可用
