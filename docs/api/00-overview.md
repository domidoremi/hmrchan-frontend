# HMRChan API 文档 — 概述

> 本文档面向前端开发者，涵盖所有 HTTP 端点的请求/响应格式。
> 按模块拆分为多个文件，位于 `docs/api/` 目录下。

## 概述

- Base URL: `/api`
- API 版本: `1.0.0`
- 所有 `/api/v1/*` 响应由 `V1Envelope` 中间件自动包裹（流式/下载端点除外）
- 认证使用 JWT Access Token（Bearer header）+ Refresh Token（HttpOnly Cookie）
- 外部 ID 均为 UUID，内部 ID 为 BIGINT

## 文件索引

| 文件                            | 模块                                        |
| ------------------------------- | ------------------------------------------- |
| `00-overview.md`                | 概述、响应格式、认证机制                    |
| `01-client-auth.md`             | 客户端安全、认证                            |
| `02-posts-authors-media.md`     | 帖子、作者、媒体、搜索                      |
| `03-schedules-community.md`     | 日程、社区                                  |
| `04-comments.md`                | 帖子评论                                    |
| `05-discussions.md`             | 讨论区                                      |
| `06-favorites-preferences.md`   | 收藏、偏好设置                              |
| `07-users-relations.md`         | 用户资料、关系                              |
| `08-notifications-history.md`   | 通知、历史记录                              |
| `09-reports-devices-account.md` | 举报、设备、账户                            |
| `10-2fa-email.md`               | 双因素认证、邮箱验证                        |
| `11-upload-feedback-members.md` | 上传、反馈、联系、成员                      |
| `12-admin.md`                   | 管理后台、爬虫、处理器、用户/角色管理、审计 |

## 响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "api_version": "1.0.0",
    "request_id": "uuid",
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

### 分页响应

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  },
  "meta": { ... }
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "错误描述"
  },
  "meta": { ... }
}
```

错误码映射: `400→BAD_REQUEST`, `401→UNAUTHORIZED`, `403→FORBIDDEN`, `404→NOT_FOUND`, `409→CONFLICT`, `422→VALIDATION_ERROR`, `429→RATE_LIMITED`

### 不包裹的端点

以下端点不经过 V1Envelope，直接返回原始内容：

- `GET /api/v1/media/:id/stream` — 视频/音频流（支持 Range）
- `GET /api/v1/media/:id/download` — 文件下载
- `GET /health` — 健康检查
- `GET /metrics` — Prometheus 指标
- `204 No Content` / `304 Not Modified` 响应

## 认证机制

- Access Token: 通过 `Authorization: Bearer <token>` 传递
- Refresh Token: 存储在 HttpOnly Cookie 中，名称由服务端配置
- Token 刷新: 调用 `POST /api/auth/refresh`，会轮换 Refresh Token
- 设备指纹: 刷新时校验设备指纹一致性

### 权限级别

| 级别     | 说明                             |
| -------- | -------------------------------- |
| public   | 无需认证                         |
| optional | 可选认证，已登录用户获得更多数据 |
| required | 必须认证                         |
| admin    | 必须认证且为管理员               |
