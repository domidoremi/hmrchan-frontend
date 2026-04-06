# Community / Interaction

## 域边界

- favorites
- comments / comment-images
- discussions
- relations
- history
- reports
- inbox
- feedback / contact support write side

## 现役公开路径

- `/api/v1/favorites*`
- `/api/v1/community/stats|latest|hot|feed|my-comments|my-likes|favorites|summary`
- `/api/v1/posts/:id/comments`
- `/api/v1/comments/*`
- `/api/v1/comment-images*`
- `/api/v1/discussions*`
- `/api/v1/relations*`
- `/api/v1/history*`
- `/api/v1/reports*`
- `/api/v1/inbox*`
- `/api/v1/feedback`
- `/api/v1/contact/send`

## 统一集合契约

- 用户侧集合统一采用 `limit + cursor`
- 返回体统一为 `items + next_cursor + has_more`
- 不返回 `total`
- badge / summary / stats 走独立 summary endpoint

## 已确认公开读契约

### `GET /api/v1/community/latest`

- cursor collection；仅接受 `limit`、`cursor`
- 返回体固定为 `items + next_cursor + has_more`
- 不返回 `total`
- 评论主查询失败才返回 `500`
- 身份资料 / 内容卡片补全失败时降级为部分结果或空集合，仍返回 `200`

### `GET /api/v1/community/hot`

- cursor collection；仅接受 `limit`、`cursor`、`days`
- 返回体固定为 `items + next_cursor + has_more`
- 不再使用旧 `{ hot_topics: [...] }` 形状
- 不返回 `total`
- 排序与游标固定为 `comment_count DESC, post_uuid DESC`
- `items[]` 字段为：
  - `post_id`
  - `comment_count`
  - `platform`
  - 可选 `title`
- 主聚合查询失败返回 `500`
- 内容卡片补全失败或部分缺失时只降级为部分结果 / 空集合，不返回 `500`

### `GET /api/v1/posts/:id/comments`

- 严格 cursor collection；仅接受 `limit`、`cursor`、`sort`
- `sort` 支持 `newest | oldest | popular`
- 返回体固定为 `items + next_cursor + has_more`
- 不返回 `total`
- 旧 `page` / `page_size` / 其他 page-based legacy 分页参数会返回 `400`
- 语义固定为：
  - 帖子不存在或内容卡片缺失：`404`
  - 内容服务不可用：`503`
  - 帖子存在但无评论：`200`，`items=[]`，`has_more=false`

## 当前 summary endpoints

- `GET /api/v1/favorites/summary`
- `GET /api/v1/community/summary`
- `GET /api/v1/relations/summary`
- `GET /api/v1/history/summary`
- `GET /api/v1/reports/summary`
- `GET /api/v1/discussions/summary`
- `GET /api/v1/inbox/summary`

## Inbox 前端关键语义

### 列表筛选

`GET /api/v1/inbox?status=all|unread|archived`

- `status=all`：仅表示未归档 active 集合，不包含 archived
- `status=unread`：未归档且未读
- `status=archived`：仅归档消息

### Summary / badge

`GET /api/v1/inbox/summary`

- summary 只统计未归档未读消息
- `data.total.count`：canonical unread total
- `data.unread_count`：前端 badge / 快捷角标稳定别名
- `data.total.is_capped` 与 `data.unread_is_capped`：是否被 `99+` capped
- 列表接口不返回 total

### Preferences PATCH

`PATCH /api/v1/inbox/preferences`

- 请求体采用 JSON Merge Patch
- 顶层以 category 为 key
- `email_enabled=true` 且 `inbox_enabled=false` 为非法组合，返回 `400`
- 双关关闭时事件在服务层直接丢弃，不落库

### SSE

- `/api/v1/inbox/stream` 首包只发 summary snapshot
- 后续只发增量事件，不发历史列表
- 列表初始化与重连恢复必须走 REST
- 客户端在分页追加与 SSE merge 时必须按 `uuid` 去重

## 域归属裁定

- `feedback` 与 `contact/send` 统一归类到 interaction/support 写侧
- `/posts/:id/comments` 固定归 Wave 2，虽然路径前缀位于 `posts`

## OpenAPI artifact

- `docs/contracts/openapi/community-interaction.openapi.yaml`
