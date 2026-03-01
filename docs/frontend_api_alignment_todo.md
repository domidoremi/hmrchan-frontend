# frontend_api_alignment_todo（完整版）

更新时间：2026-03-01
目标：确保前端实现与后端真实接口、权限、响应行为完全对齐。
范围：`go-api/internal/router/router.go` 实际注册路由 + `docs/api/00-12`。

## 完成定义

- 前端请求层覆盖后端全部 201 个端点。
- 前端权限拦截与页面可见性和后端一致：public 11、optional 42、required 101、admin 47。
- 媒体与系统端点按真实响应类型处理（信封 / 原始 JSON / 二进制流）。
- 所有关键业务流通过联调回归并记录结果。

## 全局必须完成事项

- 统一 API 基址和路由映射，删除历史别名与废弃路径。
- 在请求拦截器实现四级权限策略：public、optional、required、admin。
- 统一响应解包策略，区分信封响应与非信封响应。
- 建立 401、403、404、409、422、429 的统一页面/组件处理策略。
- 统一分页参数与分页状态管理（page、page_size、total、total_pages）。
- 统一查询参数编码与边界值处理（空值、非法值、超限值）。
- 统一文件类响应处理：stream、download、thumbnail、subtitle。
- 统一缓存策略：列表页缓存、明细缓存、实时状态刷新策略。
- 统一埋点与审计日志关联：在前端日志中记录 request_id。
- 完成匿名态与登录态双路径验证，确保 optional 端点体验一致。
- 完成管理员路由隔离，避免普通用户看见或触发 admin 接口。
- 完成 API 错误文案表，业务错误与系统错误分层提示。

## 模块待办（按 docs/api）

### 01 客户端安全与认证

- [ ] 完成 client init/verify/status 三端点接入与启动流程串联。
- [ ] 完成登录、注册、刷新、登出、心跳的状态机设计。
- [ ] 完成会话管理页：会话列表、单会话撤销。
- [ ] 完成敏感操作前置验证：verify-password 与 verify-identity。
- [ ] 完成 2FA 前置登录分支（pending token 分支）。

### 02 帖子、作者、媒体、搜索

- [ ] 完成帖子列表、详情、轻量流、混合流四类数据源合并策略。
- [ ] 完成作者列表、作者详情、作者帖子页联动。
- [ ] 完成媒体五端点处理：元数据、字幕、流播放、缩略图、下载。
- [ ] 完成搜索三端点整合：帖子、作者、建议。
- [ ] 完成媒体失败降级：缩略图缺失、字幕缺失、流不可用时的回退体验。

### 03 日程与社区

- [ ] 完成日程列表、日历、详情展示与筛选。
- [ ] 完成社区统计、最新、feed、热门四端点聚合展示。
- [ ] 完成登录用户的社区个人页：我的评论、我的点赞、我的收藏。
- [ ] 完成 admin 日程增删入口权限隔离。

### 04 帖子评论

- [ ] 完成帖子评论主链路：列表、创建、编辑、删除。
- [ ] 完成回复与线程视图：replies、thread。
- [ ] 完成互动链路：点赞、取消点赞、收藏、取消收藏、举报。
- [ ] 完成评论图片链路：上传、读取、删除及关联约束提示。

### 05 讨论区

- [ ] 完成讨论 CRUD、搜索、我的讨论。
- [ ] 完成讨论评论全链路：列表、创建、编辑、删除、回复、线程。
- [ ] 完成讨论互动：点赞、举报。
- [ ] 完成管理员能力：讨论置顶、评论置顶、评论精选。

### 06 收藏与偏好

- [ ] 完成收藏夹全链路：创建、列表、详情、更新、删除。
- [ ] 完成收藏辅助端点：是否收藏、文件夹列表、标签列表。
- [ ] 完成偏好设置 CRUD 与默认值初始化。

### 07 用户资料与关系

- [ ] 完成个人资料读取与更新页。
- [ ] 完成修改密码页（独立于邮箱改密流程）。
- [ ] 完成公开资料页访问与展示。
- [ ] 完成关系链路：关注/取关、拉黑/取消拉黑、关注者、关注中、关系状态。

### 08 通知与历史

- [ ] 完成通知中心：列表、未读数、单条已读、全部已读、删除、清空。
- [ ] 完成搜索历史与浏览历史完整管理。
- [ ] 完成历史聚合页：统计、我的评论、我的点赞、我的评论收藏。

### 09 举报、设备、账户

- [ ] 完成用户举报入口与我的举报页。
- [ ] 完成设备管理：列表、当前设备、信任、取消信任、重命名、单设备撤销、全设备撤销。
- [ ] 完成账户管理：数据摘要、导出、删除、恢复、删除状态查询。

### 10 2FA 与邮箱

- [ ] 完成 2FA 设置、验证、关闭、备份码重置。
- [ ] 完成 2FA 登录验证流程与普通登录流程汇合。
- [ ] 完成邮箱相关流程：注册验证码、验证邮箱、找回密码、重置密码。
- [ ] 完成登录用户邮箱安全流程：发码改密、改密、发码改邮箱、改邮箱。

### 11 上传、反馈、联系、成员

- [ ] 完成头像上传（本人）与管理员代传（他人）入口隔离。
- [ ] 完成反馈提交流程与状态提示。
- [ ] 完成联系表单提交流程。
- [ ] 完成成员列表与详情静态页。

### 12 管理后台

- [ ] 完成健康检查、指标、系统统计、缓存管理。
- [ ] 完成爬虫管理：状态、配置读取、配置更新。
- [ ] 完成处理器管理：扫描触发、失败重处理、任务状态、监视器状态。
- [ ] 完成后台用户管理：列表、详情、删除、统计、角色分配与角色查询。
- [ ] 完成角色管理：增删改查、权限列表、权限更新、角色用户查询。
- [ ] 完成举报审核后台：列表、详情、统计、审核。
- [ ] 完成后台审计：安全事件、失败登录、指定用户审计。
- [ ] 完成后台账户清理任务入口。

## 高优先联调场景

- [ ] 游客进入首页到帖子详情的完整浏览链路。
- [ ] 用户登录后评论、点赞、收藏、通知联动。
- [ ] 视频播放页：流播放 + 缩略图 + 字幕切换 + 下载。
- [ ] 账号安全：登录、2FA 验证、邮箱改密、会话撤销。
- [ ] 管理后台：用户与角色管理、举报审核、爬虫与处理器控制。
- [ ] 异常场景：401 过期、403 禁止、404 资源缺失、429 频率限制。

## 附录 A：全量端点清单（按权限）

### public（11）

- [ ] POST /api/auth/heartbeat
- [ ] POST /api/auth/login
- [ ] POST /api/auth/logout
- [ ] POST /api/auth/refresh
- [ ] POST /api/auth/register
- [ ] GET /api/auth/turnstile-config
- [ ] POST /api/v1/client/init
- [ ] GET /api/v1/client/status
- [ ] POST /api/v1/client/verify
- [ ] GET /health
- [ ] GET /metrics

### optional（42）

- [ ] POST /api/v1/2fa/verify-login
- [ ] GET /api/v1/authors
- [ ] GET /api/v1/authors/:id
- [ ] GET /api/v1/authors/:id/posts
- [ ] GET /api/v1/comments/:id/replies
- [ ] GET /api/v1/comments/:id/thread
- [ ] GET /api/v1/community/feed
- [ ] GET /api/v1/community/hot
- [ ] GET /api/v1/community/latest
- [ ] GET /api/v1/community/stats
- [ ] POST /api/v1/contact/send
- [ ] GET /api/v1/discussions
- [ ] GET /api/v1/discussions/:id
- [ ] GET /api/v1/discussions/:id/comments
- [ ] GET /api/v1/discussions/comments/:id
- [ ] GET /api/v1/discussions/comments/:id/replies
- [ ] GET /api/v1/discussions/comments/:id/thread
- [ ] GET /api/v1/discussions/search
- [ ] POST /api/v1/email/request-password-reset
- [ ] POST /api/v1/email/reset-password
- [ ] POST /api/v1/email/send-registration-code
- [ ] POST /api/v1/email/verify-email
- [ ] GET /api/v1/favorites/check/:post_id
- [ ] POST /api/v1/feedback
- [ ] GET /api/v1/media/:id
- [ ] GET /api/v1/media/:id/download
- [ ] GET /api/v1/media/:id/stream
- [ ] GET /api/v1/media/:id/subtitle
- [ ] GET /api/v1/media/:id/thumbnail
- [ ] GET /api/v1/members
- [ ] GET /api/v1/members/:id
- [ ] GET /api/v1/posts
- [ ] GET /api/v1/posts/:id
- [ ] GET /api/v1/posts/:id/comments
- [ ] GET /api/v1/posts/light
- [ ] GET /api/v1/posts/mixed
- [ ] GET /api/v1/schedules
- [ ] GET /api/v1/schedules/:id
- [ ] GET /api/v1/schedules/calendar
- [ ] GET /api/v1/search/authors
- [ ] GET /api/v1/search/posts
- [ ] GET /api/v1/search/suggestions

### required（101）

- [ ] GET /api/auth/me
- [ ] GET /api/auth/sessions
- [ ] DELETE /api/auth/sessions/:id
- [ ] POST /api/auth/verify-identity
- [ ] POST /api/auth/verify-password
- [ ] POST /api/v1/2fa/disable
- [ ] POST /api/v1/2fa/regenerate-backup-codes
- [ ] POST /api/v1/2fa/setup
- [ ] GET /api/v1/2fa/status
- [ ] POST /api/v1/2fa/verify
- [ ] GET /api/v1/account/data-summary
- [ ] POST /api/v1/account/delete
- [ ] GET /api/v1/account/deletion-status
- [ ] POST /api/v1/account/export-data
- [ ] POST /api/v1/account/restore
- [ ] GET /api/v1/audit/my-activity
- [ ] GET /api/v1/audit/my-security-summary
- [ ] POST /api/v1/comment-images
- [ ] DELETE /api/v1/comment-images/:id
- [ ] GET /api/v1/comment-images/:id
- [ ] DELETE /api/v1/comments/:id
- [ ] PATCH /api/v1/comments/:id
- [ ] DELETE /api/v1/comments/:id/favorite
- [ ] POST /api/v1/comments/:id/favorite
- [ ] DELETE /api/v1/comments/:id/like
- [ ] POST /api/v1/comments/:id/like
- [ ] POST /api/v1/comments/:id/report
- [ ] GET /api/v1/community/favorites
- [ ] GET /api/v1/community/my-comments
- [ ] GET /api/v1/community/my-likes
- [ ] DELETE /api/v1/devices
- [ ] GET /api/v1/devices
- [ ] DELETE /api/v1/devices/:id
- [ ] GET /api/v1/devices/current
- [ ] POST /api/v1/devices/rename
- [ ] POST /api/v1/devices/trust
- [ ] POST /api/v1/devices/untrust
- [ ] POST /api/v1/discussions
- [ ] DELETE /api/v1/discussions/:id
- [ ] PATCH /api/v1/discussions/:id
- [ ] POST /api/v1/discussions/:id/comments
- [ ] DELETE /api/v1/discussions/:id/like
- [ ] POST /api/v1/discussions/:id/like
- [ ] DELETE /api/v1/discussions/comments/:id
- [ ] PATCH /api/v1/discussions/comments/:id
- [ ] DELETE /api/v1/discussions/comments/:id/like
- [ ] POST /api/v1/discussions/comments/:id/like
- [ ] POST /api/v1/discussions/comments/:id/report
- [ ] GET /api/v1/discussions/my
- [ ] GET /api/v1/discussions/my-comments
- [ ] POST /api/v1/email/change-email
- [ ] POST /api/v1/email/change-password
- [ ] POST /api/v1/email/send-change-email-code
- [ ] POST /api/v1/email/send-change-password-code
- [ ] POST /api/v1/email/send-verification-email
- [ ] GET /api/v1/favorites
- [ ] POST /api/v1/favorites
- [ ] DELETE /api/v1/favorites/:id
- [ ] GET /api/v1/favorites/:id
- [ ] PATCH /api/v1/favorites/:id
- [ ] GET /api/v1/favorites/folders/list
- [ ] GET /api/v1/favorites/tags/list
- [ ] DELETE /api/v1/history/all
- [ ] DELETE /api/v1/history/browsing
- [ ] GET /api/v1/history/browsing
- [ ] POST /api/v1/history/browsing
- [ ] DELETE /api/v1/history/browsing/:id
- [ ] GET /api/v1/history/my-comment-favorites
- [ ] GET /api/v1/history/my-comments
- [ ] GET /api/v1/history/my-likes
- [ ] DELETE /api/v1/history/search
- [ ] GET /api/v1/history/search
- [ ] POST /api/v1/history/search
- [ ] DELETE /api/v1/history/search/:id
- [ ] GET /api/v1/history/stats
- [ ] DELETE /api/v1/notifications
- [ ] GET /api/v1/notifications
- [ ] DELETE /api/v1/notifications/:id
- [ ] PATCH /api/v1/notifications/:id/read
- [ ] POST /api/v1/notifications/read-all
- [ ] GET /api/v1/notifications/unread-count
- [ ] POST /api/v1/posts/:id/comments
- [ ] DELETE /api/v1/preferences
- [ ] GET /api/v1/preferences
- [ ] PATCH /api/v1/preferences
- [ ] PUT /api/v1/preferences
- [ ] DELETE /api/v1/relations/block/:id
- [ ] POST /api/v1/relations/block/:id
- [ ] GET /api/v1/relations/blocked
- [ ] DELETE /api/v1/relations/follow/:id
- [ ] POST /api/v1/relations/follow/:id
- [ ] GET /api/v1/relations/followers
- [ ] GET /api/v1/relations/following
- [ ] GET /api/v1/relations/status/:id
- [ ] POST /api/v1/reports
- [ ] GET /api/v1/reports/my
- [ ] POST /api/v1/upload/avatar
- [ ] GET /api/v1/users/:id/public-profile
- [ ] POST /api/v1/users/me/change-password
- [ ] GET /api/v1/users/me/profile
- [ ] PATCH /api/v1/users/me/profile

### admin（47）

- [ ] POST /api/v1/account/admin/cleanup-expired
- [ ] POST /api/v1/admin/cache/clear
- [ ] GET /api/v1/admin/cache/stats
- [ ] GET /api/v1/admin/db/health
- [ ] GET /api/v1/admin/feedbacks
- [ ] GET /api/v1/admin/health/detailed
- [ ] GET /api/v1/admin/metrics
- [ ] GET /api/v1/admin/stats/system
- [ ] GET /api/v1/audit/admin/failed-logins
- [ ] GET /api/v1/audit/admin/security-events
- [ ] GET /api/v1/audit/admin/user/:user_id
- [ ] GET /api/v1/crawler/config
- [ ] PUT /api/v1/crawler/config
- [ ] GET /api/v1/crawler/platforms/status
- [ ] GET /api/v1/crawler/status
- [ ] DELETE /api/v1/discussions/:id/pin
- [ ] POST /api/v1/discussions/:id/pin
- [ ] DELETE /api/v1/discussions/comments/:id/feature
- [ ] POST /api/v1/discussions/comments/:id/feature
- [ ] DELETE /api/v1/discussions/comments/:id/pin
- [ ] POST /api/v1/discussions/comments/:id/pin
- [ ] POST /api/v1/processor/scan
- [ ] POST /api/v1/processor/scan/failed
- [ ] GET /api/v1/processor/stats
- [ ] GET /api/v1/processor/tasks/:task_id
- [ ] GET /api/v1/processor/watcher/status
- [ ] GET /api/v1/reports
- [ ] GET /api/v1/reports/:id
- [ ] PATCH /api/v1/reports/:id
- [ ] GET /api/v1/reports/stats/summary
- [ ] GET /api/v1/roles
- [ ] POST /api/v1/roles
- [ ] DELETE /api/v1/roles/:id
- [ ] GET /api/v1/roles/:id
- [ ] PATCH /api/v1/roles/:id
- [ ] PUT /api/v1/roles/:id/permissions
- [ ] GET /api/v1/roles/:id/users
- [ ] GET /api/v1/roles/permissions/list
- [ ] POST /api/v1/schedules
- [ ] DELETE /api/v1/schedules/:id
- [ ] POST /api/v1/upload/users/:user_id/avatar
- [ ] GET /api/v1/users
- [ ] DELETE /api/v1/users/:id
- [ ] GET /api/v1/users/:id
- [ ] GET /api/v1/users/:id/roles
- [ ] POST /api/v1/users/:id/roles
- [ ] GET /api/v1/users/:id/stats

## 附录 B：执行顺序建议

1. 先完成请求层、权限层、响应层三项基础设施改造。
2. 按 01→12 顺序实现模块，优先打通认证、内容、互动三条主链路。
3. 完成高优先联调场景并冻结接口映射。
4. 最后执行全量回归并补齐文档勾选状态。
