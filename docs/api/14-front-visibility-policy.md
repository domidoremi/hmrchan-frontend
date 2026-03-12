# 前台可见范围与限额策略

> 本文档描述公开浏览接口的统一可见范围策略。
> 目标是让首页、列表、搜索、作者页、日程页和相关社区入口看到同一套“前台可见数据域”，同时兼顾性能、安全性与流量控制。

## 适用范围

适用于挂载在公开 `/api/v1` 路由组、且面向前台浏览的接口，重点包括：

- `GET /api/v1/home`
- `GET /api/v1/home/featured`
- `GET /api/v1/home/story-deck`
- `GET /api/v1/posts`
- `GET /api/v1/posts/:id`
- `GET /api/v1/posts/light`
- `GET /api/v1/posts/mixed`
- `GET /api/v1/posts/text/latest`
- `GET /api/v1/authors`
- `GET /api/v1/authors/:id`
- `GET /api/v1/authors/:id/posts`
- `GET /api/v1/search/posts`
- `GET /api/v1/search/authors`
- `GET /api/v1/search/suggestions`
- `GET /api/v1/schedules`
- `GET /api/v1/schedules/:id`
- `GET /api/v1/schedules/calendar`
- `GET /api/v1/schedules/highlights`
- `GET /api/v1/community/latest`
- `GET /api/v1/community/hot`
- `GET /api/v1/posts/:id/comments`
- `GET /api/v1/comments/:id/replies`
- `GET /api/v1/comments/:id/thread`

不适用于用户私有数据接口，例如：

- 收藏、历史、通知、我的评论、我的点赞
- 后台管理接口
- 账号、设备、偏好设置等用户域接口

## 核心规则

### 1. 统一前台可见帖子域

公开浏览接口不再各自直接查整表，而是先落到统一的“前台可见帖子域”：

- 游客：最新 `48` 条帖子
- 普通用户：最新 `120` 条帖子
- 管理员：最新 `400` 条帖子

排序口径统一为：

- `published_at DESC`
- `published_at` 为空时回退 `scraped_at DESC`
- 最后按 `id DESC` 保证稳定性

作者、搜索建议、首页聚合、社区热帖等所有帖子衍生数据，都从这同一批帖子继续筛选或聚合。

### 2. 统一前台可见作者域

作者列表、作者搜索、作者详情页仅展示“在当前前台可见帖子域中至少有一条帖子”的作者。

因此：

- 作者 `post_count` 表示“当前可见帖子数”，不是库内绝对总数
- 如果一个作者只有很早的帖子，超出当前前台可见帖子域，则不会出现在公开作者接口中

### 3. 统一前台可见日程域

公开日程接口只返回：

- `is_published = true`
- 且位于当前可见日程域内的数据

当前可见日程域默认取“按 `start_date ASC` 排序的前 N 条已发布日程”，N 与当前内容限额一致。

这意味着：

- 未发布日程不会因管理员登录到前台页面而泄漏
- 公开日程列表、日历和详情页都遵守同一口径

### 4. 不可见资源统一返回 `404`

对公开详情型接口，如果资源存在但不在当前前台可见域内，返回 `404`，而不是暴露存在性。

当前已落地在：

- `GET /api/v1/posts/:id`
- `GET /api/v1/authors/:id`
- `GET /api/v1/schedules/:id`
- 公开评论线程相关接口

## 响应头

公开 `v1` 浏览接口会补充：

- `X-Content-Tier`: `guest` / `user` / `admin`
- `X-Content-Limit`: 当前请求生效的前台内容限额

前端用途：

- 记录当前浏览档位
- 在分页到底或设计降级时做提示
- 便于埋点与灰度观察

## 默认配置

对应环境变量：

```env
CONTENT_LIMIT_GUEST=48
CONTENT_LIMIT_USER=120
CONTENT_LIMIT_ADMIN=400
```

说明：

- 公开浏览端点的实际 page size 也会被该限额进一步裁剪
- 若部署环境已显式配置 `CONTENT_LIMIT_*`，则以环境值为准

## 性能策略

### 查询收敛

统一可见范围的核心收益，是把前台公开浏览从“全表查询 + 各接口各自截断”收敛为“先限定小范围，再做筛选/聚合”。

当前实现采用：

- 帖子可见域子查询
- 作者可见域子查询
- 日程可见域子查询

这样能显著降低：

- 搜索范围
- 首页聚合范围
- 作者统计与趋势统计的扫描量
- 社区热帖对全量帖子表的依赖

### 缓存

首页相关接口继续保留：

- `Cache-Control`
- `ETag`

游客轻量 feed 与混排 feed 继续走服务端缓存，但缓存结果已受前台可见范围约束，不会缓存到超出公开可见域的数据。

## 安全策略

### 公开接口不泄漏未发布内容

`/api/v1/schedules*` 公开接口统一只看 `is_published = true`，避免管理员登录前台页面时把草稿日程带出去。

### 公开接口不暴露旧内容存在性

对详情接口返回 `404` 而不是“存在但不可访问”，可以降低枚举旧帖子、旧作者、旧日程的风险。

### 搜索面收缩

帖子搜索、作者搜索与搜索建议都仅在当前公开可见域中执行，降低大范围扫描和内容探测成本。

## 流量控制策略

现有流控保持不变，并与统一可见范围叠加生效：

- 全局速率限制：`RateLimit`
- 搜索专用限流：`SearchRateLimit`
- 敏感操作限流：`SensitiveRateLimit`
- 首页与列表接口的 CDN / 协商缓存

组合后的效果：

- 速率限制控制“请求数”
- 可见范围控制“单次请求能触达的数据面”
- 缓存控制“重复请求对源站的压力”

## 前端接入建议

- 不要假设公开列表能无限翻页；公开浏览总量现在受统一前台可见域限制
- 对 `404` 详情页，按“公开域不可见或资源不存在”统一处理
- 首屏与聚合页优先使用后端聚合结果，不要再从更大的通用列表自行拼装
- 若需要展示当前档位，可读取 `X-Content-Tier` 与 `X-Content-Limit`

## 当前已知边界

- 这套策略目前针对公开浏览域；用户私有数据域未复用该 scope
- 社区总量统计类接口仍可能展示站点级统计，而不是公开可见域统计
- 若后续需要“按会员等级扩限”或“按专题白名单放大可见域”，建议继续沿用这套统一 scope 扩展，而不是让各接口单独加条件
