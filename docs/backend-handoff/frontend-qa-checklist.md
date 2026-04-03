# 前后端联调 QA 验收清单

> 用法：QA 按顺序打勾；出现失败时记录接口、请求头、响应码、`detail.code`、页面表现与浏览器抓包。

## A. 前置确认

- [ ] 当前联调环境不是旧线上实例，而是已部署当前仓库语义的后端
- [ ] `GOOGLE_OAUTH_REDIRECT_WEB_URL` 已配置为 `https://api.momichan.xyz/api/v1/auth/google/callback`
- [ ] `FRONTEND_URL` 已配置为 `https://momichan.xyz`
- [ ] Google Console `已授权的重新导向 URI` 已配置为 `https://api.momichan.xyz/api/v1/auth/google/callback`
- [ ] 前端正式请求只走 `https://api.momichan.xyz/api/v1/*`
- [ ] 前端请求不会剥离 `Origin/Referer`
- [ ] 前端会统一发送 `X-Client-Contract-Version`

## B. 浏览器安全链

- [ ] `GET /api/v1/auth/turnstile-config` 正常
- [ ] `POST /api/v1/client/init` 正常
- [ ] 若环境开启 Turnstile，`POST /api/v1/client/verify` 正常
- [ ] `POST /api/v1/auth/login` 带完整 V2 签名头
- [ ] `POST /api/v1/auth/google/exchange` 带完整 V2 签名头
- [ ] `POST /api/v1/auth/refresh` 带完整 V2 签名头
- [ ] `GET /api/v1/auth/me` 带完整 V2 签名头
- [ ] `POST /api/v1/auth/verify-risk-login` 带完整 V2 签名头
- [ ] `POST /api/v1/2fa/verify-login` 带完整 V2 签名头
- [ ] `POST /api/v1/auth/verify-identity` 缺 `Idempotency-Key` 会失败
- [ ] `POST /api/v1/account/export-data` 缺 `Idempotency-Key` 会失败
- [ ] `POST /api/v1/account/delete` 缺 `Idempotency-Key` 会失败
- [ ] 所有验证码/邮件发送接口缺 `Idempotency-Key` 会失败
- [ ] `POST /api/v1/feedback` 缺 `Idempotency-Key` 会失败
- [ ] `POST /api/v1/contact/send` 缺 `Idempotency-Key` 会失败
- [ ] `POST /api/v1/auth/google/exchange` 需要签名但不要求 `Idempotency-Key`

## C. Google 登录

- [ ] `GET /api/v1/auth/google/start` 302 到 Google
- [ ] `redirect_uri` 精确等于 `https://api.momichan.xyz/api/v1/auth/google/callback`
- [ ] `GET /api/v1/auth/google/callback?error=access_denied` 302 到 `https://momichan.xyz/auth/callback?error=access_denied`
- [ ] callback `error` 分支前端不会调用 `POST /api/v1/auth/google/exchange`
- [ ] `GET /api/v1/auth/google/callback?state=...&code=...` 302 到 `/auth/callback?handoff_code=...`
- [ ] `/auth/callback` 的 `error` 分支显示 Google 专属失败态
- [ ] `/auth/callback` 的 `handoff_code` 分支会先 `turnstile-config -> client/init`，再调 `google/exchange`
- [ ] popup 模式只桥接 `handoff_code/error`
- [ ] popup `postMessage` 目标 origin 生产固定为 `https://momichan.xyz`
- [ ] popup 不使用 `*`

### Google 正向分支

- [ ] 已绑定 Google 用户可直接登录成功
- [ ] 不存在本地账号时可自动创建用户并登录
- [ ] 已有本地账号且 Google 邮箱已验证时会自动关联并直接登录
- [ ] Google 成功响应包含 `access_token`
- [ ] Google 成功响应包含 `refresh_threshold`
- [ ] Google 成功响应包含 `permission_version`
- [ ] Google 成功后浏览器拿到 refresh cookie
- [ ] Google 成功后前端不会进入验证码绑定页

### Google challenge 分支

- [ ] `requires_risk_verification=true` 时只进入风险验证页
- [ ] `requires_mfa=true` 时只进入 MFA 页
- [ ] 整个 Google 流程不再出现 `link_required`
- [ ] 整个 Google 流程不再出现 `pending_google_link_token`
- [ ] 前端不再调用 `/api/v1/auth/google/confirm-link`

## D. 本地登录 / refresh / me

- [ ] `POST /api/v1/auth/login` 成功时拿到 access token + refresh cookie + `permission_version`
- [ ] 刷新页恢复会话只走 `refresh -> me`
- [ ] `POST /api/v1/auth/refresh` 返回顶层 `permission_version`
- [ ] `GET /api/v1/auth/me` 返回顶层 `permission_version`
- [ ] 旧 access / refresh 会话在安全状态变化后会失效
- [ ] 收到 `PERMISSION_VERSION_STALE` 时前端清空登录态
- [ ] 若带 `X-Client-Reinit-Required: true`，前端会先重跑 `client/init`

## E. split-only 业务契约

- [ ] `POST /api/v1/history/browsing` 只发送 `content_uuid + content_type`
- [ ] `GET /api/v1/history/browsing` 响应里不再出现 `content_id`
- [ ] `GET /api/v1/community/stats` 存在 `active_participants`
- [ ] 前端不再依赖 `total_users`
- [ ] `GET /api/v1/account/data-summary` 若上游失败返回 `503`，前端显示可重试错误态
- [ ] `POST /api/v1/account/export-data` 若上游失败返回 `503`，前端显示可重试错误态
- [ ] `data-summary` / `export-data` 失败时前端不会渲染 partial payload
- [ ] `GET /api/v1/home` 富化字段缺失时只做局部降级
- [ ] `GET /api/v1/community/highlights` 返回空 `items` 时不会被判成整页失败
- [ ] `GET /api/v1/inbox*` 富化字段缺失时不会导致整页失败
- [ ] `POST /api/v1/account/delete` 成功后前端立即清空本地登录态
- [ ] 删除账号成功后前端立即离开受保护页面
- [ ] 删除账号成功后前端不会等待 community 异步清理完成

## F. 失败链路与退役路径

- [ ] 能稳定复现并识别 `REQUEST_ORIGIN_NOT_AUTHORIZED`
- [ ] 能稳定复现并识别 `REQUEST_SIGNATURE_REQUIRED`
- [ ] 能稳定复现并识别 `REQUEST_NONCE_REPLAYED`
- [ ] 能稳定复现并识别 `INVALID_SIGNATURE`
- [ ] 能稳定复现并识别 `CLIENT_TOKEN_EXPIRED`
- [ ] 能稳定复现并识别 `IDEMPOTENCY_KEY_REQUIRED`
- [ ] 能稳定复现并识别 `PERMISSION_VERSION_STALE`
- [ ] 无效/过期 `handoff_code` 不会显示“邮箱或密码错误”
- [ ] 旧 `/api/auth/google/*` 访问表现为退役路径
- [ ] 旧 `/api/v1/auth/google/confirm-link` 访问表现为退役路径

## G. 联调通过结论

- [ ] 前端网络面只剩 `/api/v1/*`
- [ ] Google 快捷登录全程不出现验证码绑定 UI
- [ ] 受保护请求都带 V2 签名头
- [ ] 指定接口缺 `Idempotency-Key` 会稳定失败
- [ ] `permission_version` 在 login / refresh / me 一致可见
- [ ] split-only UUID / 字段语义与后端一致
- [ ] 旧路径与旧字段只表现为退役，不存在兼容桥
