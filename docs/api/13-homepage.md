# 首页聚合与支撑接口

> 本文档面向前端联调，描述当前后端已经落地的首页相关接口。
> 以服务端真实返回为准；仓库根目录的 `frontend-api-checklist.md`、`homepage-api-spec.md` 仍视为需求草案，不作为最终契约。

## 已上线接口

- `GET /api/v1/home`
- `GET /api/v1/home/featured`
- `GET /api/v1/home/story-deck`
- `GET /api/v1/posts/text/latest`
- `GET /api/v1/trends/summary`
- `GET /api/v1/schedules/highlights`
- `GET /api/v1/community/highlights`

## 公共约定

### 响应包裹

以上接口全部位于 `/api/v1/*`，会经过 `V1Envelope` 中间件包装。

成功响应示例：

```json
{
  "success": true,
  "data": {
    "version": "home.v1"
  },
  "meta": {
    "api_version": "1.0.0",
    "request_id": "uuid",
    "timestamp": "2026-03-11T10:00:00Z"
  }
}
```

注意：

- 前端应读取 `response.data.data` 作为业务 payload，而不是直接读取响应根对象。
- 发生 `304 Not Modified` 时不会返回 envelope body，这是 HTTP 协商缓存的正常行为。

### 权限与登录态

- 权限级别：`optional`
- 当前首页接口不依赖用户身份做个性化裁剪，但会遵守统一前台可见范围策略。
- 首页内所有帖子、作者、趋势与推荐内容，均从当前请求对应的前台可见数据域派生。
- `deep_link` 均为站内相对路径，可直接用于前端路由跳转。

可见范围响应头：

- `X-Content-Tier`
- `X-Content-Limit`

详细策略见：`docs/api/14-front-visibility-policy.md`

### 缓存策略

| 接口                               | `Cache-Control`                                  | `ETag` |
| ---------------------------------- | ------------------------------------------------ | ------ |
| `GET /api/v1/home`                 | `public, max-age=30, stale-while-revalidate=120` | 支持   |
| `GET /api/v1/home/featured`        | `public, max-age=30, stale-while-revalidate=120` | 支持   |
| `GET /api/v1/posts/text/latest`    | `public, max-age=30, stale-while-revalidate=60`  | 支持   |
| `GET /api/v1/trends/summary`       | `public, max-age=30, stale-while-revalidate=60`  | 支持   |
| `GET /api/v1/home/story-deck`      | `public, max-age=60, stale-while-revalidate=180` | 支持   |
| `GET /api/v1/schedules/highlights` | `public, max-age=60, stale-while-revalidate=180` | 支持   |
| `GET /api/v1/community/highlights` | `public, max-age=60, stale-while-revalidate=180` | 支持   |

前端接入建议：

- 首屏优先请求 `GET /api/v1/home`
- 支撑接口用于分块懒加载、局部刷新，或首屏失败时的降级兜底
- 若客户端携带 `If-None-Match` 命中缓存，需正确处理 `304`

## 公共对象

### `image_asset`

| 字段            | 类型             | 说明                                                       |
| --------------- | ---------------- | ---------------------------------------------------------- |
| `url`           | `string`         | 主图 URL，当前为 `/api/v1/media/:id/thumbnail?size=medium` |
| `width`         | `number \| null` | 原始媒体宽度                                               |
| `height`        | `number \| null` | 原始媒体高度                                               |
| `thumbnail_url` | `string`         | 小图 URL，当前为 `/api/v1/media/:id/thumbnail?size=small`  |
| `alt`           | `string`         | 替代文本                                                   |

### `author_brief`

| 字段           | 类型             | 说明                                                   |
| -------------- | ---------------- | ------------------------------------------------------ |
| `id`           | `string \| null` | 作者 UUID；来源缺失时可能为 `null`                     |
| `display_name` | `string`         | 优先 `display_name`，回退到 `username`                 |
| `username`     | `string \| null` | 平台用户名                                             |
| `avatar_url`   | `string \| null` | 头像                                                   |
| `profile_url`  | `string \| null` | 平台资料页                                             |
| `deep_link`    | `string`         | 站内作者页，如 `/author/:id`；未知作者时可能为空字符串 |
| `is_verified`  | `boolean`        | 是否认证                                               |

### `tag_brief`

| 字段           | 类型             | 说明                             |
| -------------- | ---------------- | -------------------------------- |
| `name`         | `string`         | 规范化标签名，不带 `#`           |
| `display_text` | `string`         | 展示文本，固定带 `#`             |
| `post_count`   | `number`         | 仅趋势统计类接口会填充           |
| `growth_rate`  | `number \| null` | 仅趋势统计类接口会填充           |
| `deep_link`    | `string`         | 站内搜索链接，如 `/search?q=tag` |

## 聚合接口

### GET /api/v1/home

首页首屏聚合接口，返回 Hero、Portal、Featured、Trends、Latest Text、Story Deck。

- 权限：`optional`
- Query：当前无
- 未实现参数：`scene_version`、`fields`

`data` payload：

```json
{
  "version": "home.v1",
  "generated_at": "2026-03-11T10:00:00Z",
  "ttl_seconds": 60,
  "hero": {
    "editorial_card": {
      "post_id": "uuid",
      "title": "string",
      "text": "string",
      "author": {},
      "published_at": "RFC3339",
      "time_hint": "3h ago",
      "tags": [],
      "deep_link": "/post/uuid"
    },
    "spotlight": {
      "post_id": "uuid",
      "title": "string",
      "summary": "string",
      "author": {},
      "primary_tag": {},
      "image": {},
      "deep_link": "/post/uuid"
    },
    "stats": [
      {
        "key": "updates",
        "label": "Updates",
        "value": 0,
        "display_value": "0",
        "hint": "fresh posts in this window"
      }
    ],
    "trending_tags": []
  },
  "portal": {
    "items": [
      {
        "key": "recommend",
        "title": "Featured",
        "description": "Curated full-screen stories for the homepage",
        "count": 0,
        "display_count": "0",
        "icon": "sparkles",
        "accent": "mist",
        "deep_link": "/explore"
      }
    ]
  },
  "featured": {
    "items": []
  },
  "trends": {
    "authors": [],
    "tags": [],
    "schedules": []
  },
  "latest_text_posts": [],
  "story_deck": {
    "items": [],
    "total": 0
  }
}
```

补充说明：

- `hero.editorial_card` 取自最新文本帖；无符合条件数据时该对象字段会为空值。
- `hero.spotlight` 取自 `featured.items[0]` 的派生结果。
- `portal.items` 当前固定返回 4 项：`recommend`、`authors`、`schedule`、`community`。
- `latest_text_posts` 与 `story_deck.items` 在聚合接口中直接内联返回，无需额外拼装。

## 支撑接口

### GET /api/v1/home/featured

第二屏整屏卡片数据。

- 权限：`optional`
- Query：
  - `limit`：`1-4`，默认 `4`

`data` payload：

```json
{
  "items": [
    {
      "id": "uuid",
      "kind": "post_collection",
      "kicker": "TWITTER",
      "title": "string",
      "subtitle": "string",
      "summary": "string",
      "cover": {},
      "accent": "sky",
      "primary_cta": {
        "label": "Open story",
        "type": "route",
        "target": "/post/uuid",
        "tracking_key": "home_featured_open"
      },
      "secondary_cta": {
        "label": "View author",
        "type": "route",
        "target": "/author/uuid",
        "tracking_key": "home_featured_author"
      },
      "related_posts": [],
      "related_authors": []
    }
  ]
}
```

当前规则：

- 优先最近的媒体帖：`media_type in ('image', 'video')`
- 不足时回退到“有标题或正文”的最近帖子
- 当前不是运营配置版，也不支持手工精选 4 条

### GET /api/v1/home/story-deck

第四屏 3D 卡片叙事数据。

- 权限：`optional`
- Query：
  - `limit`：`1-5`，默认 `5`

`data` payload：

```json
{
  "items": [
    {
      "rank": 1,
      "post_id": "uuid",
      "eyebrow": "#tag",
      "title": "string",
      "summary": "string",
      "image": {},
      "author": {},
      "published_at": "RFC3339",
      "meta": "Author · 3h ago",
      "deep_link": "/post/uuid"
    }
  ],
  "total": 1
}
```

当前规则：

- 优先最近媒体帖，选数逻辑与 `featured` 同源
- `eyebrow` 优先标签，回退作者名，再回退平台名
- `meta` 由作者名与相对时间拼接而成

### GET /api/v1/posts/text/latest

第三屏纯文本气泡数据，也作为 Hero 文本卡片的来源。

- 权限：`optional`
- Query：
  - `limit`：`1-12`，默认 `10`

`data` payload：

```json
{
  "items": [
    {
      "rank": 1,
      "post_id": "uuid",
      "excerpt": "string",
      "author": {},
      "published_at": "RFC3339",
      "time_hint": "20m ago",
      "tags": [],
      "deep_link": "/post/uuid"
    }
  ],
  "total": 18
}
```

当前规则：

- 仅选择 `media_type = 'text'`
- 要求 `content` 非空
- 服务端会先去 HTML、折叠空白、按 rune 截断到 80 字以内
- 当前返回字段名是 `post_id`、`excerpt`，不是前端草案里的 `id`、`content`

### GET /api/v1/trends/summary

首页趋势快照，提供统计、热门标签、活跃作者。

- 权限：`optional`
- Query：
  - `window`：`24h`、`7d`、`30d`，默认 `7d`

`data` payload：

```json
{
  "window": "7d",
  "generated_at": "2026-03-11T10:00:00Z",
  "stats": {
    "fresh_post_count": 0,
    "active_author_count": 0,
    "rising_tag_count": 0
  },
  "tags": [],
  "authors": [
    {
      "id": "uuid",
      "display_name": "string",
      "avatar_url": "string",
      "post_count": 3,
      "engagement_score": 120,
      "deep_link": "/author/uuid"
    }
  ]
}
```

当前规则：

- 时间窗口按 `COALESCE(published_at, scraped_at)` 计算
- 标签增长率来自“当前窗口 vs 上一等长窗口”
- 作者热度分公式：
  - `like_count + 2 * comment_count + 3 * share_count + view_count / 10`
- 最多返回 `8` 个标签、`4` 个作者

### GET /api/v1/schedules/highlights

首页日程 teaser 列表。

- 权限：`optional`
- Query：
  - `limit`：`1-8`，默认 `6`

`data` payload：

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "string",
      "category": "live",
      "start_date": "RFC3339",
      "end_date": "RFC3339",
      "is_all_day": false,
      "author": {},
      "badge": "Soon",
      "deep_link": "/schedule/uuid"
    }
  ],
  "generated_at": "2026-03-11T10:00:00Z"
}
```

当前规则：

- 仅返回 `is_published = true`
- 仅返回开始时间不早于“当前时间前 24 小时”的日程
- 排序：`start_date ASC, id ASC`
- `badge` 可能为 `Soon`、`Live`、`Media`、`Birthday`、`Upcoming`

### GET /api/v1/community/highlights

首页社区轻量卡片。

- 权限：`optional`
- Query：
  - `limit`：`1-8`，默认 `6`

`data` payload：

```json
{
  "items": [
    {
      "discussion_id": "uuid",
      "title": "string",
      "excerpt": "string",
      "comment_count": 12,
      "participant_count": 5,
      "updated_at": "RFC3339",
      "deep_link": "/discussion/uuid"
    }
  ],
  "generated_at": "2026-03-11T10:00:00Z"
}
```

当前规则：

- 数据源是 `discussions`，不是 `GET /api/v1/community/hot`
- 过滤 `is_deleted = false AND is_hidden = false`
- 排序：`is_pinned DESC, comment_count DESC, like_count DESC, last_activity_at DESC, id DESC`
- `participant_count` 来自评论用户去重计数

## 与前端草案的差异

以下差异需要以前端适配层显式处理：

- `/api/v1/*` 实际返回 envelope，不是裸 payload。
- `GET /api/v1/home` 当前不支持 `scene_version`。
- 当前没有 `fields=` 精简参数。
- 当前没有 `Last-Modified` 头；仅支持 `ETag` 协商缓存。
- `image_asset` 当前没有 `blurhash`。
- `latest_text_posts` 使用 `post_id`、`excerpt`，不是 `id`、`content`。
- `story_deck` 顶层字段名是 `story_deck`，不是草案中的 `story_cards`。
- `home` 顶层时间字段是 `generated_at`，不是 `updated_at`。
- `community/highlights` 来自讨论区聚合，不是社区评论热榜。
- `featured`、`story_deck` 当前是规则驱动版，不是“运营后台可配置版”。

## 当前限制与后续方向

当前实现已经适合联调，但仍有以下边界：

- 没有运营配置源，无法人工指定首页推荐与故事顺序
- 没有多语言文案层，`time_hint`、`badge`、`label`、`hint` 当前由服务端直接给英文展示值
- 没有首屏专用 `Last-Modified` / `surrogate-key`
- 没有专门的精选封面素材链路，封面仍由现有媒体缩略图推导

若后续做第二阶段升级，建议优先顺序：

1. 引入首页运营配置源，接管 `featured` 与 `story_deck`
2. 为首页接口补 `Last-Modified` / 更细的缓存标签
3. 增加 `fields=` 或专用轻量模式
4. 补充多语言展示字段或将展示文本完全前移到前端
