# 前端契约对接审计（非后台）

- 审计基准：`G:\Project\hmrchan\hmrchan-frontend\FRONTEND_API_CONTRACT.md`
- 审计范围：仅前台用户域与公共用户入口，**不含管理后台**
- 审计时间：2026-03-10

## 1. 已真实接上

以下链路已确认存在真实前台调用入口，而非仅停留在 service 层：

- 认证闭环
  - `POST /api/auth/login`
  - `POST /api/v1/2fa/verify-login`
  - `POST /api/auth/verify-risk-login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/heartbeat`
  - `GET /api/auth/me`
  - `GET /api/auth/sessions`
  - `DELETE /api/auth/sessions/:id`
- 客户端安全与签名
  - `POST /api/v1/client/init`
  - `POST /api/v1/client/verify`
  - `GET /api/v1/client/status`
- Turnstile 配置
  - `GET /api/auth/turnstile-config`
- 评论/讨论举报
  - `POST /api/v1/comments/:id/report`
  - `POST /api/v1/reports`
  - `GET /api/v1/reports/my`
- 账号安全与 step-up
  - `POST /api/auth/verify-password`
  - `POST /api/auth/verify-identity`
  - `POST /api/v1/users/me/change-password`
  - `POST /api/v1/email/send-change-password-code`
  - `POST /api/v1/email/change-password`
  - `POST /api/v1/email/send-change-email-code`
  - `POST /api/v1/email/change-email`
  - `POST /api/v1/account/export-data`
  - `POST /api/v1/account/delete`
  - `POST /api/v1/account/restore`
  - `DELETE /api/v1/devices/:id`
  - `DELETE /api/v1/devices`
- 两步验证设置中心
  - `GET /api/v1/2fa/status`
  - `POST /api/v1/2fa/setup`
  - `POST /api/v1/2fa/verify`
  - `POST /api/v1/2fa/disable`
  - `POST /api/v1/2fa/regenerate-backup-codes`
- 偏好设置
  - `GET /api/v1/preferences`
  - `PUT /api/v1/preferences`
  - `PATCH /api/v1/preferences`
  - `DELETE /api/v1/preferences`
  - 当前已通过全局设置面板、登录态自动同步、显式“完整覆盖同步偏好”按钮接入
- 公共表单
  - `POST /api/v1/contact/send`
  - `POST /api/v1/feedback`
- 收藏夹扩展能力
  - `GET /api/v1/favorites/folders/list`
  - `GET /api/v1/favorites/tags/list`
  - `GET /api/v1/favorites/:id`
  - `PATCH /api/v1/favorites/:id`
- 个人审计
  - `GET /api/v1/audit/my-activity`
  - `GET /api/v1/audit/my-security-summary`
- 浏览与搜索历史
  - `POST /api/v1/history/search`
  - `GET /api/v1/history/search`
  - `DELETE /api/v1/history/search/:id`
  - `DELETE /api/v1/history/search`
  - `GET /api/v1/history/stats`
- 账号数据与恢复
  - `GET /api/v1/account/data-summary`
- 用户关系与公开资料
  - `POST /api/v1/relations/follow/:id`
  - `DELETE /api/v1/relations/follow/:id`
  - `GET /api/v1/relations/followers`
  - `GET /api/v1/relations/following`
  - `POST /api/v1/relations/block/:id`
  - `DELETE /api/v1/relations/block/:id`
  - `GET /api/v1/relations/blocked`
  - `GET /api/v1/relations/status/:id`
  - `GET /api/v1/users/:id/public-profile`

## 2. 部分实现

本轮收口后，**非后台范围内暂未发现仍停留在“部分实现”的契约链路**。

补充说明：

- `posts_per_page` 偏好已从“仅存储值”提升为“真实影响请求分页”的能力，已落到首页、搜索、探索、收藏页与个人中心多类列表
- `Explore`、`Home` 等页面为了首屏性能，仍保留移动端上限控制；这属于真实消费偏好后的前端展示策略，而不是未接链路

## 3. 缺失

按当前审计范围（仅前台、非后台），**本轮未发现新的前台缺失链路**。

## 4. 路径不一致

本轮在**非后台范围**内暂未发现新的“契约路径与真实调用路径不一致、且已影响用户功能”的问题。

补充说明：

- 有些链路虽然没有走对应 service，但若页面真实请求路径与契约一致，仍按“已接上”处理
- 有些能力存在“历史路径”和“社区路径”双入口时，已优先按真实契约可用性判断，不机械地按 service 文件名判缺失

## 5. 本轮新增落地点

本轮已补齐以下前台真实入口：

- 设置面板接入远端偏好同步与重置
- 设置面板新增显式 `PUT /preferences` 覆盖保存入口
- 联系页新增真实 `feedback` 提交表单
- 个人中心新增“安全活动”tab，接入个人审计摘要与活动流
- 个人中心新增关注/关注中/黑名单 tab，接入关系链列表
- 新增公开资料页，接入 `public-profile`、`relation status`、关注与拉黑操作
- 搜索页接入搜索历史记录、查询、删除、清空与统计展示
- 个人设置页接入 `account/data-summary` 数据摘要卡片
- 收藏页接入文件夹筛选、标签筛选、详情读取与收藏元信息编辑
- 多个内容列表页开始真实消费 `posts_per_page` 远端偏好
