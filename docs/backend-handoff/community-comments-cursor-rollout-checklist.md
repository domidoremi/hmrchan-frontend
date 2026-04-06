# Community Comments Cursor 上线顺序与回归清单

适用日期：2026-04-06（JST）

本清单用于配合以下契约收口发布：

- `GET /api/v1/posts/:id/comments`：严格 cursor collection，只接受 `limit/cursor/sort`
- `GET /api/v1/community/hot`：标准 cursor collection，返回 `items + next_cursor + has_more`
- `GET /api/v1/community/latest`：public list 仅在主查询失败时返回 `500`

## 0. 发布顺序

默认采用：

1. **先发前端**
   - 发布 comments cursor 版本前端代码
   - 发布 handoff / OpenAPI 文档
   - 刷新 CDN / 静态资源缓存，尽量缩短旧 bundle 生命周期
2. **前端发布后观察 15–30 分钟**
   - 重点看 `GET /api/v1/posts/:id/comments` 是否仍带 `page/page_size`
   - 若仍有来自当前 Web 前端流量的旧参数请求，暂停后端严格 cursor 上线
3. **再发后端**
   - 上线严格 cursor 的 `GET /api/v1/posts/:id/comments`
   - 同批上线 `community/hot` / `community/latest` 修复
4. **后端发布后立即 smoke**
   - 验 `community/hot`
   - 验 `community/latest`
   - 验 `posts/:id/comments`
   - 验帖子详情页 / 预取链路无新增 `400`

## 1. 前端发布后、后端发布前

### 1.1 `posts/:id/comments` 请求参数

- 请求 query 只出现：
  - `limit`
  - 可选 `cursor`
  - 可选 `sort`
- 不再出现：
  - `page`
  - `page_size`
  - `per_page`
  - `offset`

### 1.2 前端页面行为

- 打开帖子详情页：
  - 评论区正常加载
  - 控制台无 comments 相关 `400`
- 命中 `prefetchPostDetail(..., { includeComments: true })`：
  - 预取成功
  - 无 `posts/:id/comments?page=...` 请求

## 2. 后端发布后 smoke

### 2.1 `GET /api/v1/posts/:id/comments`

- 帖子存在且无评论：
  - `200`
  - `items=[]`
  - `has_more=false`
- 帖子不存在 / card 缺失：
  - `404`
  - 前端降级为空列表，不炸整页
- 旧参数请求：
  - `?page=1&page_size=20`
  - 返回 `400`
  - 错误说明只接受 `limit/cursor/sort`
- `sort=newest|oldest|popular` 均可用
- 翻页时：
  - `next_cursor` 正常
  - 第二页不重复第一页

### 2.2 `GET /api/v1/community/hot`

- 返回体固定为：
  - `items`
  - `next_cursor`
  - `has_more`
- 不再返回 `hot_topics`
- 无评论数据时：
  - `200`
  - 空 cursor collection
- 多条热门帖时：
  - 顺序为 `comment_count DESC, post_uuid DESC`
- 内容卡片部分缺失时：
  - 返回可用子集
  - 不返回 `500`
- 仅主聚合查询失败时返回 `500`

### 2.3 `GET /api/v1/community/latest`

- 返回体为标准 cursor collection
- 内容 / profile 补全失败时：
  - 仍返回 `200`
  - 为部分结果或空集合
- 仅评论主查询失败时返回 `500`

## 3. 文档 / 契约一致性

- `contracts/community-interaction.md` 已写明：
  - `community/hot` 为 cursor collection
  - 无 `total`
  - 无 `hot_topics`
- `contracts/openapi/community-interaction.openapi.yaml` 已写明：
  - `posts/:id/comments` 仅支持 `limit/cursor/sort`
  - `404 / 503 / 200-empty` 语义

## 4. 发布后监控

重点盯：

- `/api/v1/posts/:id/comments` 的 `400`
- `/api/v1/community/hot` 的 `500`
- `/api/v1/community/latest` 的 `500`

默认放行标准：

- 前端先发后，在观察窗口内不再看到来自当前 Web 前端的 `posts/:id/comments?page/page_size` 请求
- smoke 通过后再发后端

默认阻断标准：

- 仍存在活跃 Web 流量命中旧分页参数
- 或 `community/hot` / `community/latest` smoke 仍出现 `500`
