# HMRChan Split-only 前端交付说明

## 1. 文档定位

本文档只描述 split-only 后端切换后，前端需要消费和验证的新增约束。

以下文档继续作为认证与 callback/MFA 的基线说明：

- `docs/frontend-integration.md`
- `docs/frontend-security-handoff.md`
- `docs/contracts/README.md`
- `docs/contracts/openapi/*.yaml`

## 2. 不变的基线

- 公网入口保持不变：前端继续只调用 `https://api.momichan.xyz/api/v1/*`
- `/internal/*` 仍为后端私有接口，前端不得调用
- 已退役的旧公网路径继续按 `404` 处理
- `426 Upgrade Required` 继续生效
- 前端仍需发送 `X-Client-Contract-Version`
- 收到 `426` 后，前端仍应执行 hard reload / upgrade gate

## 3. 前端必须调整的消费语义

### 3.1 UUID canonical

- `/api/v1/history/browsing` 已切到 UUID canonical
- 请求只接受：
  - `content_uuid`
  - `content_type`
- 前端必须移除：
  - `content_id` 的发送
  - `content_id` 的解析
  - 所有基于 `content_id` 的状态依赖
- browsing 相关响应中不得再假设存在 `content_id`

### 3.2 跨域标识统一按 UUID string 处理

- 公网返回中的跨域实体标识已统一为 UUID string
- 即使字段 key 仍叫：
  - `id`
  - `post_id`
  - `discussion_id`
  - `user.id`
  - `author.id`
- 前端也必须按字符串 UUID 处理，不能再按整数处理

### 3.3 社区统计字段调整

- `/api/v1/community/stats` 现在返回 `active_participants`
- 前端不要再依赖 `total_users`
- `active_participants` 的定义是：社区域近 30 天内有评论、讨论或互动行为的去重用户数

### 3.4 账号汇总与导出

- `/api/v1/account/data-summary`
- `/api/v1/account/export-data`

这两个接口现在是 strict split-only：

- identity 会同步读取 community 私有数据
- 如果上游社区读取失败，后端会直接返回 `503`
- 前端应展示可重试错误态
- 前端不要渲染 partial payload

补充说明：

- `data-summary` 中的 `notifications` key 保留
- 其数据来源已经切到 inbox 统计

### 3.5 best-effort 富化

以下页面或接口的富化信息允许局部缺失：

- `/api/v1/home`
- `/api/v1/community/highlights`
- `/api/v1/inbox`
- `/api/v1/inbox/summary`

允许缺失的典型字段：

- 作者昵称
- 头像
- 作者摘要
- 内容 preview

前端处理要求：

- 按局部降级处理
- 不要因为富化字段缺失就把整页判为失败

额外约束：

- `/api/v1/community/highlights` 在聚合上游不可用时，允许返回空 `items`
- 这属于可接受降级，不应触发整页报错

### 3.6 删除账号

- `/api/v1/account/delete` 成功，只表示 identity 侧已接受删除并完成软删
- community 清理和匿名化是异步执行
- 前端在删除成功后应立即：
  - 清理本地登录态
  - 离开受保护页面
  - 不等待社区清理完成

## 4. 前端继续遵守的安全链路

对于以下敏感写路径：

- 登录
- 注册
- Google exchange
- 导出数据
- 删除账号

前端继续按以下顺序完成安全链路：

1. `GET /api/v1/auth/turnstile-config`
2. `POST /api/v1/client/init`
3. 必要时 `POST /api/v1/client/verify`
4. 再发正式写请求

前端仍需继续发送：

- `X-Client-Fingerprint`
- `X-Client-Token`
- `X-Timestamp`
- `X-Signature`
- `X-Nonce`
- `X-Content-SHA256`
- 需要幂等时的 `Idempotency-Key`

补充要求：

- refresh 仍依赖真实 cookie jar
- 不要使用伪 token 做联调
- 不要绕过 `client/init`

更完整的安全联调要求见：

- `docs/frontend-security-handoff.md`

## 5. 前端 QA 用的 rehearsal 信息

默认 rehearsal 配置：

- 账号：`rehearsal@example.com`
- 密码：`rehearsal-password`
- 指纹：`rehearsal-device`
- 默认本地环境：`TURNSTILE_ENABLED=false`

固定 fixture UUID：

- 用户：`11111111-1111-1111-1111-111111111111`
- 作者：`22222222-2222-2222-2222-222222222222`
- 帖子 A：`33333333-3333-3333-3333-333333333333`
- 帖子 B：`44444444-4444-4444-4444-444444444444`
- 评论：`55555555-5555-5555-5555-555555555555`
- 讨论：`66666666-6666-6666-6666-666666666666`
- 讨论评论：`77777777-7777-7777-7777-777777777777`
- Inbox 消息：`88888888-8888-8888-8888-888888888888`

如果某个环境开启 Turnstile：

- 必须提供 rehearsal bypass token
- 必须先完成 `/api/v1/client/verify`
- 否则 smoke 应直接判失败，不做弱化

## 6. 建议的前端验收顺序

1. `POST /api/v1/client/init`
2. login
3. refresh
4. `GET /api/v1/account/data-summary`
5. `POST /api/v1/auth/verify-identity`，action=`export_data`
6. `POST /api/v1/account/export-data`
7. favorites create / check / list / summary
8. search history create / list
9. browsing history create / list，并确认只出现 `content_uuid`
10. comments list / create
11. discussions list / create / comment / list
12. inbox list / summary
13. `GET /api/v1/community/stats`，确认存在 `active_participants`
14. `GET /api/v1/home`
15. `GET /api/v1/community/highlights`
16. profile update，并确认富化缓存刷新
17. delete-account destructive smoke 只放在最后

## 7. 前端验收断言

### 7.1 必须成立

- browsing 响应中不再出现 `content_id`
- `post_id` / `user.id` / `author.id` / `discussion_id` 等跨域标识都是 UUID string
- `community/stats` 存在 `active_participants`
- `community/stats` 不再依赖 `total_users`

### 7.2 可以接受的降级

- `home` 中局部作者信息缺失
- `community/highlights` 返回空 `items`
- inbox actor 富化字段缺失

### 7.3 不可接受的行为

- 因富化失败把整个页面判成 `500`
- 继续发送或消费 `content_id`
- 把 UUID 字段当成整数处理
- `data-summary` / `export-data` 失败后继续渲染 partial 结果
