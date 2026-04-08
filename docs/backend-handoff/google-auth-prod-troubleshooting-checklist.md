# Google 登录生产排查与定位 Checklist

适用日期：2026-04-08（JST）

本清单用于定位当前正式 Google 登录链路在 **主站前端 / 主站 API / 网关 / Redis / 分发缓存** 中的生产偏差，覆盖：

- `https://momichan.xyz/login`
- `https://momichan.xyz/register`
- `https://momichan.xyz/auth/callback`
- `https://momichan.xyz/api/v1/client/init`
- `https://momichan.xyz/api/v1/client/verify`
- `https://momichan.xyz/api/v1/auth/google/exchange`
- `https://api.momichan.xyz/api/v1/auth/google/start`
- `https://api.momichan.xyz/api/v1/auth/google/callback`

当前已知事实基于：

- HAR：`E:/barna/Downloads/momichan.xyz.har`
- 控制台日志：2026-04-08 这轮用户实测日志
- 关键 request_id：
  - `df704b2b-a503-47c1-84d3-2232bba2f010` → 首次 `POST /api/v1/client/init`
  - `69501cb9-19ed-4031-b1bd-f03df78c5885` → 首次 `POST /api/v1/client/verify` 400
  - `4113214a-f62b-4245-9308-e4fc6fb9d728` → `force_reissue` 后 `POST /api/v1/client/init`
  - `aa08880a-98f6-4d6a-b263-f5e20f02ac8a` → 第二次 `POST /api/v1/client/verify` 200
  - `77363f57-4cbe-4d85-98db-518c32d1ad47` → `POST /api/v1/auth/google/exchange` 500

---

## 0. 一句话结论与当前主假设

当前生产问题不是单点故障，而是至少两条链路仍表现为旧版行为：

1. `client/init` 在 `challenge_required=true` 时仍可能返回空 `client_token`
2. `google/exchange` 仍返回旧错误体 `{"detail":"Failed to complete login"}`

补充高优先级怀疑项：

3. 主站同源 `/api/v1/client/*` 与 `/api/v1/auth/google/*` 可能先命中陈旧 VPC/internal upstream，而不是当前 `API_BASE_URL` 对应的 public API upstream

因此排查优先级固定为：

1. **先确认前端静态资源是否已更新**
2. **再确认后端 challenge 契约是否已更新**
3. **最后确认 `google/exchange` 是否仍命中旧实现 / 旧实例 / 旧路由 / 代理改写**

---

## 1. 固定事实基线（每次排查都先写入）

### 1.1 本次 HAR 已确认的事实

#### 首次 `POST /api/v1/client/init`

- `request_id=df704b2b-a503-47c1-84d3-2232bba2f010`
- 返回：

```json
{
  "success": true,
  "data": {
    "challenge_required": true,
    "client_token": "",
    "expires_in": 21600,
    "trust_level": "untrusted",
    "turnstile_site_key": "0x4AAAAAACGjufPO78xio48V"
  }
}
```

- 判定：**旧行为**，challenge 流首轮未下发可直接用于 `client/verify` 的 token

#### 首次 `POST /api/v1/client/verify`

- `request_id=69501cb9-19ed-4031-b1bd-f03df78c5885`
- 请求：**没有** `X-Client-Token`
- 返回：

```json
{ "success": false, "error": { "code": "BAD_REQUEST", "message": "missing client token" } }
```

- 判定：**旧行为**，而且没有 `X-Client-Reinit-Required`

#### `force_reissue=true` 后再次 `POST /api/v1/client/init`

- `request_id=4113214a-f62b-4245-9308-e4fc6fb9d728`
- 返回：带有 `client_token` 与 `client_secret`
- 判定：前端兜底恢复成功，但这不应是生产常规路径

#### 第二次 `POST /api/v1/client/verify`

- `request_id=aa08880a-98f6-4d6a-b263-f5e20f02ac8a`
- 返回 `200`
- 判定：Turnstile 最终通过，challenge 不是最后阻断点

#### `POST /api/v1/auth/google/exchange`

- `request_id=77363f57-4cbe-4d85-98db-518c32d1ad47`
- 返回：

```json
{ "detail": "Failed to complete login" }
```

- 判定：**旧行为**，不是当前仓库约定的 `google_login_completion_failed` 结构化错误

### 1.2 本轮可直接判为“旧版未对齐”的证据

任一命中即可视为 production 未完全对齐：

- `challenge_required=true` 但 `client_token=""`
- `client/verify` 返回 `BAD_REQUEST missing client token`
- `google/exchange` 返回 `{"detail":"Failed to complete login"}`

### 1.3 控制台噪音过滤规则

以下日志默认不作为主因：

- `Request for the Private Access Token challenge`
- `script-src was not explicitly set`
- `xr-spatial-tracking is not allowed`
- `preloaded ... but not used`

本轮真正有效的控制台信号只保留：

- `POST /api/v1/client/verify 400`
- `POST /api/v1/auth/google/exchange 500`
- 是否仍出现 `Cross-Origin-Opener-Policy ... window.closed`（用于验证前端 popup 修复是否已上线）

---

## 2. 前端生产排查 Checklist

### 2.1 先确认用户浏览器是否已吃到新前端包

每轮排查至少做 3 次：

1. 普通窗口打开 `https://momichan.xyz/login`
2. 强刷（Ctrl+F5）后重试
3. 无痕窗口重试

同时在 DevTools 中：

- `Network -> Disable cache` 打开后再复现一次
- 记录本次实际加载的 chunk：
  - `auth-*.js`
  - `LoginPage-*.js`
  - `clientSecurityService-*.js`
  - `client-*.js`

#### 判定

- 不同窗口拿到不同 chunk hash → 优先怀疑 CDN / HTML / SW 缓存未同步
- 同一用户强刷后仍加载旧 chunk → 优先怀疑 HTML 缓存或 Service Worker 控制旧资源

### 2.2 验证 popup COOP 修复是否已生效

重点看控制台是否仍出现：

- `Cross-Origin-Opener-Policy policy would block the window.closed call`

#### 判定

- **未出现** → 说明前端移除 `popup.closed` 跨源轮询的修复大概率已上线
- **仍出现** → 说明：
  - 用户仍在吃旧 bundle，或
  - 还有别的代码路径在跨源读取 popup 状态

### 2.3 验证前端是否仍频繁走 `force_reissue` 兜底

在每次登录链路中记录：

- 首次 `client/init` 是否返回空 `client_token`
- 首次 `client/verify` 是否立刻 400
- 是否紧跟着出现 `force_reissue=true` 的第二次 `client/init`
- 第二次 `client/verify` 是否成功

#### 判定

- 若几乎每次都走 `force_reissue` → 后端 challenge 契约未真正生效
- 若只有个别用户偶发 → 再继续怀疑实例混流、缓存或路由不一致

### 2.4 验证前端错误语义是否正确

#### 允许的页面语义

- `invalid_google_handoff` → Google expired / retry
- Turnstile challenge 失败 → Security check / verify
- `google/exchange` 内部 500 → Google 登录失败态

#### 不允许的页面语义

- 把 `invalid_google_handoff` 展示成 Security check
- 把 Google 登录失败展示成邮箱密码错误
- Google 失败后停留在 challenge 视图不退出

### 2.5 验证前端缓存链

必须检查：

- 浏览器缓存
- CDN 缓存
- HTML 页面缓存
- Service Worker 控制的旧资源
- 主站前端是否引用到旧部署的静态资源路径

#### 具体检查项

- `Application -> Service Workers` 是否存在旧 active / waiting worker
- `View Source` 查看 HTML 实际引用的 bundle URL
- 清掉 SW 后是否仍复现相同错误
- 当前 bundle hash 是否与最新构建产物一致

### 2.6 验证主站同源 API proxy 是否命中错误 upstream

这轮 Google 登录相关路径默认应直走 public API upstream，而不是优先走 VPC/internal upstream：

- `/api/v1/client/init`
- `/api/v1/client/verify`
- `/api/v1/auth/google/start`
- `/api/v1/auth/google/callback`
- `/api/v1/auth/google/exchange`

若主站 `momichan.xyz/api/v1/*` 与 `api.momichan.xyz/api/v1/*` 返回行为不一致，优先判断为：

- Pages Function API proxy upstream 选择错误
- `API_BASE_URL` 与 VPC upstream 指向了不同版本后端
- VPC/internal upstream 仍残留旧实例

---

## 3. 后端应用层排查 Checklist

### 3.1 先确认当前生产目标行为

#### `POST /api/v1/client/init`

当 `challenge_required=true` 时必须：

- `client_token` 非空
- 若签名链启用，`client_secret` 非空

#### `POST /api/v1/client/verify`

- 正常首轮 challenge 不应命中 `missing client token`
- `missing client token` 只允许作为异常恢复路径，不应成为常规流量

#### `POST /api/v1/auth/google/exchange`

- 内部 500 应返回当前仓库定义的结构化错误
- 不应再返回旧的 `{"detail":"Failed to complete login"}`
- 内部 500 不应错误消费 handoff

### 3.2 按 request_id 逐条查日志

#### A. `df704b2b-a503-47c1-84d3-2232bba2f010`（首次 `client/init`）

检查：

- 是否命中 `client init completed`
- 是否命中 `client init resolved existing visitor` 或 `client init created visitor`
- 是否带字段：
  - `challenge_required=true`
  - `issued_client_token=false`
  - `issued_client_secret=false`
  - `force_reissue=false`

##### 判定

- 命中新版日志但 `issued_client_token=false` → 代码路径仍异常
- 根本没有新版日志字段 → 仍命中旧部署或旧实例

#### B. `69501cb9-19ed-4031-b1bd-f03df78c5885`（首次 `client/verify 400`）

检查：

- 是否命中 `client verify failed`
- `result` 是 `invalid_client_token`、`turnstile_failed` 还是旧 BAD_REQUEST 路径
- 是否带 `detail_code`
- 是否返回 `X-Client-Reinit-Required`

##### 判定

- 仍是裸 `missing client token` → 旧 handler / 旧契约仍在运行
- 有新版日志但浏览器收到旧响应 → 继续查网关改写

#### C. `4113214a-f62b-4245-9308-e4fc6fb9d728`（`force_reissue` 后 `client/init`）

检查：

- 是否带 `force_reissue=true`
- 是否只有这轮才 `issued_client_token=true`
- 是否同一实例处理

##### 判定

- 如果只有补偿轮才拿到 token → production 仍依赖异常恢复路径

#### D. `aa08880a-98f6-4d6a-b263-f5e20f02ac8a`（第二次 `client/verify 200`）

检查：

- 是否命中 `client verify completed`
- 是否是同一实例 / 同一版本 / 同一 pod

##### 判定

- 这条用来证明 challenge 已最终通过，不是最后阻断点
- 若与前一轮实例不同 → 怀疑集群版本不一致

#### E. `77363f57-4cbe-4d85-98db-518c32d1ad47`（`google/exchange 500`）

必须检查：

- 是否命中 `google login completion failed`
- 是否带字段：
  - `app`
  - `intent`
  - `return_to`
  - `origin_host`
  - `handoff_hash`
  - `authflow_backend`
  - `exchange_result`

##### 必须进一步定位真实 stack

确认错误首次发生在：

- `resolveGoogleUserForApp`
- `completeAuthenticatedLogin`
- 风险登录挑战
- MFA 初始化
- session / token / cookie 写入
- 数据库事务
- 旧 handler 路径
- 代理改写前的真实上游错误

##### 判定

- 日志只有旧错误语义 → 仍在跑旧实现
- 应用日志已是新语义，但浏览器收到旧 `detail` → 网关或边缘层改写响应

---

## 4. 后端部署与实例一致性排查 Checklist

### 4.1 确认生产实际部署 commit / image

对每一台正式实例记录：

- 当前 release 版本
- git SHA / build version
- 容器镜像 tag
- 滚动发布时间
- 实例 ID / pod 名 / container 名

### 4.2 确认是否仍有旧实例在流量池中

逐项检查：

- target group / upstream 是否混入旧机器
- 滚动发布后是否残留旧 pod
- 自动扩缩容是否仍拉起旧镜像
- 灰度 / staging / canary 实例是否被错误接入正式流量

### 4.3 比对实例间行为是否不一致

对同一时间窗内多个请求做实例对比：

- 命中的 pod / instance 是否一致
- 返回的错误体是否一致
- 是否有的实例有新版日志、有的没有
- 是否有的实例 `client/init` 能发 token、有的不能

#### 判定

- 实例行为不一致 → 直接判定为 **版本混流**
- 所有实例都旧 → 判定为 **整体未部署到位**

---

## 5. authflow / Redis / handoff 存储排查 Checklist

### 5.1 检查 Google authflow 是否命中共享存储

对 callback 与 exchange 两侧都查：

- `authflow_backend=redis|local`
- `failed to persist google oauth state`
- `failed to consume google oauth state`
- `failed to persist google handoff`
- `google handoff load failed`
- `failed to delete google handoff`

### 5.2 检查 Redis 在对应时间窗是否异常

对应 request 时间窗检查：

- 连接失败
- timeout
- reconnect
- failover
- `SET/GET/DEL` 失败
- 网络抖动

### 5.3 检查 handoff 生命周期是否正确

围绕同一个 `handoff_code` 检查：

- callback 是否成功创建 handoff
- exchange 是否成功读取 handoff
- 内部 500 前 handoff 是否被误删
- callback 与 exchange 是否跨实例
- 若跨实例，是否仍都读到了同一份 handoff

#### 判定

- 内部 500 前 handoff 已被删除 → 仍是旧生命周期逻辑
- callback 在 A 实例、exchange 在 B 实例且 `authflow_backend=local` → 共享存储约束未生效

---

## 6. 网关 / 反代 / CDN / API 转发层排查 Checklist

### 6.1 画清楚实际 API 路由拓扑

必须明确：

- `https://momichan.xyz/api/v1/...` 实际转发到哪里
- `https://api.momichan.xyz/api/v1/...` 实际转发到哪里
- 两者是否最终指向同一套 Go API
- 是否经过 Cloudflare / CDN / Nginx / Caddy / Ingress / API Gateway / Worker

本次 Google/public auth 相关路径必须额外确认：

- 主站同源 proxy 是否仍先打 VPC/internal upstream
- 这些路径是否已改为直走 `API_BASE_URL`
- 直连 `api.momichan.xyz` 与主站同源 `/api/v1/*` 是否命中同一版本 Go API

### 6.2 检查 `google/exchange 500` 是否被代理层改写

对 `77363f57-4cbe-4d85-98db-518c32d1ad47` 三层同时取证：

1. 应用层原始返回体
2. 网关层转发后的返回体
3. 浏览器最终收到的返回体

#### 重点判定

如果应用层已经是新结构化错误，但浏览器仍收到：

```json
{ "detail": "Failed to complete login" }
```

则应判为：

- 代理层统一错误包装
- 边缘层降级包装
- 某一层 JSON 错误转换逻辑仍旧

### 6.3 检查关键响应头是否被丢失

重点核对：

- `X-Request-ID`
- `X-Client-Reinit-Required`
- `X-Auth-Chain-Version`
- `X-Proxy-Upstream-Source`
- 其他与结构化错误或客户端恢复相关的头

#### 判定

- 应用层有、浏览器没有 → 问题不在 handler，在代理链

---

## 7. 数据库 / 登录完成链路排查 Checklist

### 7.1 逐步定位 `google/exchange 500` 的最小故障点

必须定位首次抛错点到底是在：

1. Google identity 解析
2. 用户查找 / 绑定
3. 新用户创建 / 更新
4. 风险检查
5. MFA 初始化
6. session / token 生成
7. cookie / refresh token 写入
8. 数据库事务提交
9. cache 失效 / 后置 hook
10. 旧登录 handler 分支

### 7.2 需要同步收集的业务上下文

针对 `77363f57-4cbe-4d85-98db-518c32d1ad47` 至少记录：

- user id（若已解析到）
- Google subject 是否拿到
- Google email 是否拿到
- `app` / `intent` / `return_to`
- `device_name` / `device_type`
- 风险判定结果
- MFA 状态
- 是否命中事务 rollback

### 7.3 若日志显示仍走旧 handler 路径

立即检查：

- 路由是否仍指向旧 handler
- 编译产物是否未更新
- 容器内是否加载旧二进制
- sidecar / legacy service 是否仍被调用

---

## 8. 联动回归 Checklist（排查收口后必须重跑）

### 8.1 标准成功流

1. 主窗口点击 Google 登录
2. popup 完成授权
3. callback 回传 `handoff_code`
4. challenge 仅在必要时出现
5. 首次 `client/verify` 即成功
6. `google/exchange` 成功
7. 页面完成登录

### 8.2 challenge 场景

验证：

- 首次 `client/init` 已直接返回非空 `client_token`
- 不再依赖 `force_reissue`
- 不再出现 `missing client token`

### 8.3 Google handoff 失效场景

验证：

- 显示 Google expired / retry
- 不显示 Security check
- 不显示邮箱密码错误

### 8.4 exchange 内部失败场景

验证：

- 返回新结构化错误语义
- request_id 能关联完整链路
- handoff 不会因内部 500 被误消费

### 8.5 popup 行为

验证：

- 不再出现 `window.closed` COOP 告警
- popup 等待期间无跨源轮询噪音
- timeout / callback relay / 手动继续路径正常

---

## 9. 排查输出模板（每次都按同一格式沉淀）

### 9.1 基本信息

- 排查日期时间
- 环境
- 测试入口 URL
- 浏览器 / 版本
- 是否无痕
- 是否强刷
- 是否清缓存 / 清 SW

### 9.2 请求证据

- `client/init` request_id + 响应体
- `client/verify` request_id + 响应体
- `google/exchange` request_id + 响应体

### 9.3 前端证据

- 实际加载 chunk 名称
- 是否出现 COOP 告警
- 是否触发 `force_reissue`
- 页面最终展示语义

### 9.4 后端证据

- 命中实例 / pod / image tag / git SHA
- 应用日志关键字段
- `authflow_backend`
- 是否命中旧错误语义

### 9.5 结论标签

每次排查至少打一个标签：

- `frontend_cache_stale`
- `backend_old_deploy`
- `mixed_backend_instances`
- `gateway_response_rewrite`
- `redis_authflow_issue`
- `google_exchange_internal_failure`

---

## 10. 最终判定矩阵

### 情况 1

- 首次 `client/init` 仍空 token
- `google/exchange` 仍旧 `Failed to complete login`

**结论：** 生产后端整体未完全更新，或仍有旧实例在接流量

### 情况 2

- `client/init` 已正常发 token
- 但 `google/exchange` 仍旧错误体

**结论：** Google exchange 路径仍走旧实例 / 旧服务 / 旧路由

### 情况 3

- 应用日志已是新结构化错误
- 浏览器收到旧 `{"detail":"Failed to complete login"}`

**结论：** 网关 / 代理 / CDN 改写响应体

### 情况 4

- callback 与 exchange 跨实例
- `authflow_backend=local`

**结论：** Google authflow 共享存储约束未真正生效

### 情况 5

- 首次 `client/init` 仍空 token
- 但只有部分实例如此

**结论：** 版本混流、灰度未收口或旧实例残留
