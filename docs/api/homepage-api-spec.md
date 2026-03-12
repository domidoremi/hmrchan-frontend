# 首页聚合 API 字段级设计稿

## 1. 文档目标

这份文档面向后端同学，用于支持新版首页的四段式叙事体验：

1. 首屏 Hero
2. 第二屏横向整屏滑动
3. 第三屏纯文本推文开花气泡
4. 第四屏 3D 卡片叙事过渡到页脚

当前前端实现主要依赖 [`src/views/HomePage.vue`](../src/views/HomePage.vue) 中对 `postService.listPosts` 的二次聚合。功能上已经可用，但存在几个问题：

- 首屏和第二屏依赖前端聚合，首屏数据形态不够稳定
- 第三屏气泡内容来自通用帖子列表，不是真正的“首页专用纯文本流”
- 第四屏 3D 卡片仍然是从通用帖子里挑选，不利于内容运营和节奏控制
- 前端要自己统计热门标签、作者、推荐内容，容易重复请求和过度计算

因此建议新增一组首页专用聚合接口，并约定稳定字段结构。

## 2. 总体设计原则

### 2.1 基本原则

- 首页接口一律使用 `snake_case`
- 时间字段统一返回 ISO 8601 UTC 字符串
- 首页公共接口默认 `skipAuth: true`
- 列表字段尽量稳定，宁可返回空数组，也不要缺字段
- 首页接口尽量返回“前端直接可渲染”的轻量对象，而不是详情对象
- 首页首屏接口不依赖多次串行请求

### 2.2 性能原则

- 首页首屏优先使用一个聚合接口完成
- 所有首页块都应返回固定结构，减少 CLS 和骨架切换抖动
- 图片字段返回可直接消费的主图和缩略图，不让前端自行猜尺寸
- 纯文本内容由后端预清洗，去 HTML、去多余空白、限制长度
- 聚合接口应支持 CDN / 边缘缓存

### 2.3 兼容原则

- 新接口以“新增”为主，不破坏现有 `/posts`、`/authors`、`/community` 等通用接口
- 首页聚合接口允许内部复用现有服务，但对前端暴露稳定结构
- v1 阶段不强依赖后端返回多语言文案，文案仍由前端 i18n 控制

## 3. 推荐接口总览

### 3.1 P0

- `GET /api/v1/home`
- `GET /api/v1/posts/text/latest`
- `GET /api/v1/trends/summary`

### 3.2 P1

- `GET /api/v1/schedules/highlights`
- `GET /api/v1/community/highlights`
- `GET /api/v1/home/story-deck`

### 3.3 可选

- `GET /api/v1/home/featured`

说明：

- 如果后端希望一次性解决首页大部分性能和稳定性问题，优先完成 `GET /api/v1/home`
- 其他接口可作为聚合接口内部依赖，也可先单独提供给前端做渐进接入

## 4. 公共字段对象

以下对象建议在各个首页接口中复用。

### 4.1 `image_asset`

| 字段            | 类型     | 必填 | 说明             |
| --------------- | -------- | ---- | ---------------- |
| `url`           | `string` | 是   | 主图 URL         |
| `width`         | `number` | 否   | 原图宽度         |
| `height`        | `number` | 否   | 原图高度         |
| `thumbnail_url` | `string` | 否   | 首屏或列表缩略图 |
| `blurhash`      | `string` | 否   | 可选，占位用     |
| `alt`           | `string` | 否   | 图片替代文本     |

### 4.2 `author_brief`

| 字段           | 类型      | 必填 | 说明                               |
| -------------- | --------- | ---- | ---------------------------------- |
| `id`           | `string`  | 否   | 作者 ID，缺失时可为 `null`         |
| `display_name` | `string`  | 是   | 前端直接显示名称                   |
| `username`     | `string`  | 否   | 平台用户名                         |
| `avatar_url`   | `string`  | 否   | 头像                               |
| `profile_url`  | `string`  | 否   | 外链资料页                         |
| `deep_link`    | `string`  | 是   | 站内跳转链接，建议如 `/author/:id` |
| `is_verified`  | `boolean` | 否   | 是否认证                           |

### 4.3 `tag_brief`

| 字段           | 类型     | 必填 | 说明                                 |
| -------------- | -------- | ---- | ------------------------------------ |
| `name`         | `string` | 是   | 不带 `#` 的标准化标签                |
| `display_text` | `string` | 是   | 前端展示文本，建议带 `#`             |
| `post_count`   | `number` | 否   | 统计周期内帖子数                     |
| `growth_rate`  | `number` | 否   | 可选，增长率，范围可为负数           |
| `deep_link`    | `string` | 是   | 站内跳转链接，建议如 `/search?q=tag` |

### 4.4 `cta_link`

| 字段           | 类型     | 必填 | 说明                  |
| -------------- | -------- | ---- | --------------------- |
| `label`        | `string` | 是   | 展示文案              |
| `type`         | `string` | 是   | `route` 或 `external` |
| `target`       | `string` | 是   | 路由或链接            |
| `tracking_key` | `string` | 否   | 埋点标记              |

### 4.5 `post_brief`

| 字段           | 类型                               | 必填 | 说明                              |
| -------------- | ---------------------------------- | ---- | --------------------------------- |
| `id`           | `string`                           | 是   | 帖子 ID                           |
| `title`        | `string`                           | 否   | 标题                              |
| `excerpt`      | `string`                           | 是   | 已清洗、适合首页展示的摘要        |
| `content_type` | `string`                           | 是   | `text`、`image`、`video`、`mixed` |
| `platform`     | `string`                           | 是   | 平台标识                          |
| `published_at` | `string`                           | 否   | 发布时间                          |
| `deep_link`    | `string`                           | 是   | 站内帖子链接，建议如 `/post/:id`  |
| `thumbnail`    | [`image_asset`](#41-image_asset)   | 否   | 卡片图                            |
| `author`       | [`author_brief`](#42-author_brief) | 否   | 作者信息                          |
| `tags`         | `tag_brief[]`                      | 是   | 默认返回数组                      |
| `metrics`      | `object`                           | 否   | 互动指标对象                      |

`metrics` 子字段建议：

| 字段            | 类型     | 必填 | 说明   |
| --------------- | -------- | ---- | ------ |
| `view_count`    | `number` | 否   | 浏览数 |
| `like_count`    | `number` | 否   | 点赞数 |
| `comment_count` | `number` | 否   | 评论数 |
| `share_count`   | `number` | 否   | 分享数 |

## 5. 聚合接口：`GET /api/v1/home`

### 5.1 用途

用于首页首屏首屏渲染和主要场景数据一次性获取。

建议覆盖：

- 第一屏 Hero
- 第二屏横向整屏滑动
- 第三屏文本气泡
- 第四屏 3D 卡片
- Portal、Trends、快速统计

### 5.2 请求定义

#### 请求方法

`GET /api/v1/home`

#### Query 参数

v1 建议不设计复杂参数，以提升缓存命中率。

可选保留：

| 参数            | 类型     | 必填 | 默认值 | 说明           |
| --------------- | -------- | ---- | ------ | -------------- |
| `scene_version` | `string` | 否   | `v1`   | 为后续灰度预留 |

### 5.3 响应结构

```json
{
  "version": "home.v1",
  "generated_at": "2026-03-11T10:00:00Z",
  "ttl_seconds": 60,
  "hero": {
    "editorial_card": {},
    "spotlight": {},
    "stats": [],
    "trending_tags": []
  },
  "portal": {
    "items": []
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
    "items": []
  }
}
```

### 5.4 字段定义

#### 顶层字段

| 字段                | 类型     | 必填 | 说明               |
| ------------------- | -------- | ---- | ------------------ |
| `version`           | `string` | 是   | 当前返回结构版本   |
| `generated_at`      | `string` | 是   | 本次聚合生成时间   |
| `ttl_seconds`       | `number` | 是   | 建议缓存秒数       |
| `hero`              | `object` | 是   | 第一屏数据         |
| `portal`            | `object` | 是   | 第二屏入口卡片区   |
| `featured`          | `object` | 是   | 第二屏推荐整屏内容 |
| `trends`            | `object` | 是   | 第二屏趋势区块     |
| `latest_text_posts` | `array`  | 是   | 第三屏文本气泡源   |
| `story_deck`        | `object` | 是   | 第四屏 3D 卡片     |

#### `hero.editorial_card`

这个对象直接服务于当前 [`heroEditorialCard`](../src/views/HomePage.vue) 的渲染需求。

| 字段           | 类型                               | 必填 | 说明                          |
| -------------- | ---------------------------------- | ---- | ----------------------------- |
| `post_id`      | `string`                           | 是   | 来源帖子 ID                   |
| `title`        | `string`                           | 是   | 展示标题，建议后端已裁剪      |
| `text`         | `string`                           | 是   | 展示正文，建议 60 到 120 字符 |
| `author`       | [`author_brief`](#42-author_brief) | 是   | 作者摘要                      |
| `published_at` | `string`                           | 否   | 发布时间                      |
| `time_hint`    | `string`                           | 否   | 可选，服务端生成的人类化时间  |
| `tags`         | `tag_brief[]`                      | 是   | 标签数组                      |
| `deep_link`    | `string`                           | 是   | 指向帖子详情                  |

选数规则建议：

- 只从纯文本帖子中选择
- 默认选择最新一条高质量文本帖
- 过滤空正文、过短正文、含大量清洗失败字符的内容

#### `hero.spotlight`

这个对象服务第二屏的 spotlight 视觉区。

| 字段          | 类型                               | 必填 | 说明         |
| ------------- | ---------------------------------- | ---- | ------------ |
| `post_id`     | `string`                           | 是   | 主推帖子 ID  |
| `title`       | `string`                           | 是   | 展示标题     |
| `summary`     | `string`                           | 是   | 一段简短摘要 |
| `author`      | [`author_brief`](#42-author_brief) | 是   | 作者         |
| `primary_tag` | [`tag_brief`](#43-tag_brief)       | 否   | 主标签       |
| `image`       | [`image_asset`](#41-image_asset)   | 否   | 主视觉图     |
| `deep_link`   | `string`                           | 是   | 点击跳转     |

#### `hero.stats[]`

| 字段            | 类型     | 必填 | 说明                            |
| --------------- | -------- | ---- | ------------------------------- |
| `key`           | `string` | 是   | 如 `updates`、`authors`、`tags` |
| `label`         | `string` | 是   | 可直接展示的标签                |
| `value`         | `number` | 是   | 原始数值                        |
| `display_value` | `string` | 是   | 已格式化展示值                  |
| `hint`          | `string` | 否   | 附加提示文案                    |

#### `hero.trending_tags[]`

使用 [`tag_brief`](#43-tag_brief)。

建议数量：

- 6 个

#### `portal.items[]`

第二屏入口卡片区，建议固定 4 个。

| 字段            | 类型     | 必填 | 说明                                                    |
| --------------- | -------- | ---- | ------------------------------------------------------- |
| `key`           | `string` | 是   | 固定值：`recommend`、`authors`、`schedule`、`community` |
| `title`         | `string` | 是   | 标题                                                    |
| `description`   | `string` | 是   | 简述                                                    |
| `count`         | `number` | 否   | 该入口当前数量                                          |
| `display_count` | `string` | 否   | 已格式化数量                                            |
| `icon`          | `string` | 否   | 图标建议值                                              |
| `accent`        | `string` | 否   | 色彩主题关键字                                          |
| `deep_link`     | `string` | 是   | 跳转链接                                                |

#### `featured.items[]`

第二屏真正的整屏横滑内容，建议固定返回 4 条。

| 字段              | 类型                             | 必填 | 说明                                                                   |
| ----------------- | -------------------------------- | ---- | ---------------------------------------------------------------------- |
| `id`              | `string`                         | 是   | 推荐块 ID                                                              |
| `kind`            | `string`                         | 是   | `post_collection`、`author_focus`、`schedule_focus`、`community_focus` |
| `kicker`          | `string`                         | 否   | 上方短标签                                                             |
| `title`           | `string`                         | 是   | 主标题                                                                 |
| `subtitle`        | `string`                         | 是   | 副标题                                                                 |
| `summary`         | `string`                         | 否   | 摘要                                                                   |
| `cover`           | [`image_asset`](#41-image_asset) | 否   | 主视觉                                                                 |
| `accent`          | `string`                         | 否   | 视觉主题                                                               |
| `primary_cta`     | [`cta_link`](#44-cta_link)       | 否   | 主按钮                                                                 |
| `secondary_cta`   | [`cta_link`](#44-cta_link)       | 否   | 副按钮                                                                 |
| `related_posts`   | `post_brief[]`                   | 是   | 推荐相关帖子                                                           |
| `related_authors` | `author_brief[]`                 | 是   | 推荐相关作者                                                           |

选数规则建议：

- 固定返回 4 条，顺序稳定
- 每条都要可独立成“整屏”
- 后端可通过编辑配置或运营策略控制内容，不建议让前端自行拼装

#### `trends.authors[]`

使用作者轻量对象，增加排序所需字段。

| 字段               | 类型     | 必填 | 说明             |
| ------------------ | -------- | ---- | ---------------- |
| `id`               | `string` | 否   | 作者 ID          |
| `display_name`     | `string` | 是   | 名称             |
| `avatar_url`       | `string` | 否   | 头像             |
| `post_count`       | `number` | 否   | 统计窗口内发帖数 |
| `engagement_score` | `number` | 否   | 综合热度分       |
| `deep_link`        | `string` | 是   | 作者页           |

建议数量：

- 4 条

#### `trends.tags[]`

使用 [`tag_brief`](#43-tag_brief)。

建议数量：

- 8 条

#### `trends.schedules[]`

| 字段         | 类型                               | 必填 | 说明                              |
| ------------ | ---------------------------------- | ---- | --------------------------------- |
| `id`         | `string`                           | 是   | 日程 ID                           |
| `title`      | `string`                           | 是   | 标题                              |
| `category`   | `string`                           | 是   | `live`、`media`、`birth`、`other` |
| `start_date` | `string`                           | 是   | 开始时间                          |
| `end_date`   | `string`                           | 否   | 结束时间                          |
| `is_all_day` | `boolean`                          | 否   | 是否全天                          |
| `author`     | [`author_brief`](#42-author_brief) | 否   | 关联作者                          |
| `badge`      | `string`                           | 否   | 前端可展示短标签                  |
| `deep_link`  | `string`                           | 是   | 指向日程详情                      |

建议数量：

- 3 到 6 条

#### `latest_text_posts[]`

这个字段直接服务第三屏开花气泡。

| 字段           | 类型                               | 必填 | 说明                             |
| -------------- | ---------------------------------- | ---- | -------------------------------- |
| `rank`         | `number`                           | 是   | 展示顺序，前端可据此映射气泡轨道 |
| `post_id`      | `string`                           | 是   | 帖子 ID                          |
| `excerpt`      | `string`                           | 是   | 纯文本摘要，建议 24 到 80 字符   |
| `author`       | [`author_brief`](#42-author_brief) | 是   | 作者                             |
| `published_at` | `string`                           | 否   | 发布时间                         |
| `time_hint`    | `string`                           | 否   | 可选，相对时间                   |
| `tags`         | `tag_brief[]`                      | 是   | 标签                             |
| `deep_link`    | `string`                           | 是   | 详情页链接                       |

建议数量：

- 10 条

后端预处理建议：

- 去 HTML
- 合并连续空白
- 去掉首尾换行
- 生成适合首页展示的短摘录，避免前端再次截断

#### `story_deck.items[]`

这个字段直接服务第四屏 3D 卡片。

| 字段           | 类型                               | 必填 | 说明                         |
| -------------- | ---------------------------------- | ---- | ---------------------------- |
| `rank`         | `number`                           | 是   | 卡片顺序                     |
| `post_id`      | `string`                           | 是   | 来源帖子 ID                  |
| `eyebrow`      | `string`                           | 是   | 卡片眉题，建议用标签或作者名 |
| `title`        | `string`                           | 是   | 卡片标题                     |
| `summary`      | `string`                           | 是   | 卡片摘要                     |
| `image`        | [`image_asset`](#41-image_asset)   | 否   | 卡片主图                     |
| `author`       | [`author_brief`](#42-author_brief) | 否   | 作者信息                     |
| `published_at` | `string`                           | 否   | 发布时间                     |
| `meta`         | `string`                           | 否   | 供前端直接展示的一行元信息   |
| `deep_link`    | `string`                           | 是   | 跳转链接                     |

建议数量：

- 3 到 5 条

选数规则建议：

- 优先媒体型帖子
- 必须有稳定封面或足够强的文本摘要
- 顺序固定，不建议前端按热度再排

### 5.5 示例响应

```json
{
  "version": "home.v1",
  "generated_at": "2026-03-11T10:00:00Z",
  "ttl_seconds": 60,
  "hero": {
    "editorial_card": {
      "post_id": "post_1001",
      "title": "今晚最值得记住的一句话",
      "text": "她只是轻轻说了一句晚安，评论区就突然安静了下来。",
      "author": {
        "id": "author_12",
        "display_name": "Mio",
        "username": "mio_official",
        "avatar_url": "https://cdn.example.com/avatar/mio.jpg",
        "deep_link": "/author/author_12",
        "is_verified": true
      },
      "published_at": "2026-03-11T08:42:00Z",
      "tags": [
        {
          "name": "goodnight",
          "display_text": "#goodnight",
          "post_count": 132,
          "deep_link": "/search?q=goodnight"
        }
      ],
      "deep_link": "/post/post_1001"
    },
    "spotlight": {
      "post_id": "post_2001",
      "title": "今天值得收藏的镜头",
      "summary": "一张图、一句文案和一个刚好出现的标签，组成了今天首页的主视觉。",
      "author": {
        "id": "author_08",
        "display_name": "Rin",
        "avatar_url": "https://cdn.example.com/avatar/rin.jpg",
        "deep_link": "/author/author_08"
      },
      "primary_tag": {
        "name": "daily_pick",
        "display_text": "#daily_pick",
        "deep_link": "/search?q=daily_pick"
      },
      "image": {
        "url": "https://cdn.example.com/post/2001/cover.jpg",
        "thumbnail_url": "https://cdn.example.com/post/2001/cover-sm.jpg",
        "width": 1440,
        "height": 1080
      },
      "deep_link": "/post/post_2001"
    },
    "stats": [
      {
        "key": "updates",
        "label": "Updates",
        "value": 1280,
        "display_value": "1.2K",
        "hint": "fresh posts in view"
      },
      {
        "key": "authors",
        "label": "Authors",
        "value": 318,
        "display_value": "318",
        "hint": "active voices this week"
      },
      {
        "key": "tags",
        "label": "Tags",
        "value": 46,
        "display_value": "46",
        "hint": "rising topics to follow"
      }
    ],
    "trending_tags": [
      {
        "name": "stage_moment",
        "display_text": "#stage_moment",
        "post_count": 88,
        "growth_rate": 0.32,
        "deep_link": "/search?q=stage_moment"
      }
    ]
  },
  "portal": {
    "items": [
      {
        "key": "recommend",
        "title": "今日推荐",
        "description": "编辑精选的 4 个整屏内容",
        "count": 4,
        "display_count": "4",
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
    "items": []
  }
}
```

### 5.6 响应约束

- `featured.items` 建议固定返回 4 条
- `latest_text_posts` 建议固定返回 10 条
- `story_deck.items` 建议返回 3 到 5 条
- 所有数组允许为空，但字段本身必须存在
- 不建议返回 `null` 代替数组

## 6. 支撑接口一：`GET /api/v1/posts/text/latest`

### 6.1 用途

为第三屏文本气泡和首屏 editorial 提供真实纯文本帖子流。

### 6.2 请求定义

`GET /api/v1/posts/text/latest?limit=10`

参数：

| 参数    | 类型     | 必填 | 默认值 | 说明          |
| ------- | -------- | ---- | ------ | ------------- |
| `limit` | `number` | 否   | `10`   | 建议最大 `12` |

### 6.3 响应定义

```json
{
  "items": [
    {
      "rank": 1,
      "post_id": "post_1001",
      "excerpt": "今晚这句话真的太轻了，轻到像一片纸。",
      "author": {},
      "published_at": "2026-03-11T08:42:00Z",
      "tags": [],
      "deep_link": "/post/post_1001"
    }
  ],
  "total": 10
}
```

### 6.4 字段说明

`items[]` 字段建议与 `latest_text_posts[]` 保持一致，便于聚合接口复用。

## 7. 支撑接口二：`GET /api/v1/trends/summary`

### 7.1 用途

给 Hero 标签、热门作者、趋势区块和统计数字提供统一数据源。

### 7.2 请求定义

`GET /api/v1/trends/summary?window=7d`

参数：

| 参数     | 类型     | 必填 | 默认值 | 说明                     |
| -------- | -------- | ---- | ------ | ------------------------ |
| `window` | `string` | 否   | `7d`   | 可选：`24h`、`7d`、`30d` |

### 7.3 响应定义

```json
{
  "window": "7d",
  "generated_at": "2026-03-11T10:00:00Z",
  "stats": {
    "fresh_post_count": 1280,
    "active_author_count": 318,
    "rising_tag_count": 46
  },
  "tags": [],
  "authors": []
}
```

### 7.4 字段说明

#### `stats`

| 字段                  | 类型     | 必填 | 说明               |
| --------------------- | -------- | ---- | ------------------ |
| `fresh_post_count`    | `number` | 是   | 统计窗口内新帖子数 |
| `active_author_count` | `number` | 是   | 活跃作者数         |
| `rising_tag_count`    | `number` | 是   | 上升标签数         |

`tags[]` 使用 [`tag_brief`](#43-tag_brief)，`authors[]` 使用趋势作者对象。

## 8. 支撑接口三：`GET /api/v1/schedules/highlights`

### 8.1 用途

给第二屏趋势区和推荐区提供轻量活动预告。

### 8.2 请求定义

`GET /api/v1/schedules/highlights?limit=6`

参数：

| 参数    | 类型     | 必填 | 默认值 | 说明         |
| ------- | -------- | ---- | ------ | ------------ |
| `limit` | `number` | 否   | `6`    | 建议最大 `8` |

### 8.3 响应字段

| 字段           | 类型     | 必填 | 说明         |
| -------------- | -------- | ---- | ------------ |
| `items`        | `array`  | 是   | 轻量日程数组 |
| `generated_at` | `string` | 是   | 聚合生成时间 |

`items[]` 推荐字段：

| 字段         | 类型                               | 必填 | 说明                 |
| ------------ | ---------------------------------- | ---- | -------------------- |
| `id`         | `string`                           | 是   | 日程 ID              |
| `title`      | `string`                           | 是   | 标题                 |
| `category`   | `string`                           | 是   | 日程类型             |
| `start_date` | `string`                           | 是   | 开始时间             |
| `end_date`   | `string`                           | 否   | 结束时间             |
| `badge`      | `string`                           | 否   | 如 `Tonight`、`Live` |
| `author`     | [`author_brief`](#42-author_brief) | 否   | 作者                 |
| `deep_link`  | `string`                           | 是   | 详情页               |

## 9. 支撑接口四：`GET /api/v1/community/highlights`

### 9.1 用途

给第二屏社区入口提供比 `community/hot` 更短、更首页化的讨论摘要。

### 9.2 请求定义

`GET /api/v1/community/highlights?limit=6`

### 9.3 响应字段

| 字段           | 类型     | 必填 | 说明             |
| -------------- | -------- | ---- | ---------------- |
| `items`        | `array`  | 是   | 热门讨论摘要数组 |
| `generated_at` | `string` | 是   | 聚合时间         |

`items[]` 推荐字段：

| 字段                | 类型     | 必填 | 说明         |
| ------------------- | -------- | ---- | ------------ |
| `discussion_id`     | `string` | 是   | 讨论 ID      |
| `title`             | `string` | 是   | 讨论标题     |
| `excerpt`           | `string` | 是   | 首页摘要     |
| `comment_count`     | `number` | 是   | 评论数       |
| `participant_count` | `number` | 否   | 参与人数     |
| `updated_at`        | `string` | 否   | 最近更新时间 |
| `deep_link`         | `string` | 是   | 讨论详情页   |

## 10. 支撑接口五：`GET /api/v1/home/story-deck`

### 10.1 用途

单独提供第四屏 3D 卡片叙事内容，便于后端或运营精细控制。

### 10.2 请求定义

`GET /api/v1/home/story-deck?limit=5`

### 10.3 响应定义

```json
{
  "items": [
    {
      "rank": 1,
      "post_id": "post_2001",
      "eyebrow": "#daily_pick",
      "title": "今天值得停留的画面",
      "summary": "这张卡片会进入第四屏 3D 叙事。",
      "image": {
        "url": "https://cdn.example.com/post/2001/cover.jpg"
      },
      "author": {
        "display_name": "Rin",
        "deep_link": "/author/author_08"
      },
      "meta": "Rin · 2h ago",
      "deep_link": "/post/post_2001"
    }
  ],
  "total": 5
}
```

### 10.4 字段建议

`items[]` 字段建议与聚合接口中的 `story_deck.items[]` 保持一致。

## 11. 缓存与更新建议

### 11.1 推荐缓存策略

#### 聚合接口

- `Cache-Control: public, max-age=30, stale-while-revalidate=120`

#### 纯文本流、趋势摘要

- `Cache-Control: public, max-age=30, stale-while-revalidate=60`

#### 日程和社区摘要

- `Cache-Control: public, max-age=60, stale-while-revalidate=180`

### 11.2 稳定性要求

- 相同缓存周期内，推荐保持顺序稳定
- 不要在同一分钟内频繁改变 `featured.items` 排列
- 首页强视觉内容建议以“分钟级”更新，不建议“秒级”抖动

## 12. 选数与清洗规则建议

### 12.1 文本帖子

- 必须为纯文本或文本占主导的帖子
- 去除 HTML 和无效空白
- 首页摘要推荐截断到 80 字以内
- 对于多语言内容，不做强翻译，保持原文

### 12.2 标签

- 标准化存储时不带 `#`
- 返回时同时给 `name` 和 `display_text`
- 合并大小写变体和首尾空格变体

### 12.3 作者

- 首页只返回轻量作者摘要
- 不在首页接口返回作者详情大字段，如完整 bio、关注列表

### 12.4 图片

- 所有首页图片尽量返回已有封面
- 无图内容可省略 `image` 字段，不建议返回空字符串

## 13. 错误与空态约定

### 13.1 成功但无内容

建议返回：

- HTTP `200`
- 数组字段为空数组
- 数值字段为 `0`
- 不缺少区块对象

### 13.2 错误

建议继续沿用现有后端错误结构，不在首页单独发明新格式。

## 14. 前后端联调优先级

建议按以下顺序推进：

1. `GET /api/v1/home`
2. 将 [`src/views/HomePage.vue`](../src/views/HomePage.vue) 首屏、第二屏、第三屏接到聚合字段
3. 如果聚合接口暂时无法一步到位，先补 `GET /api/v1/posts/text/latest`
4. 再补 `GET /api/v1/trends/summary`
5. 最后补 `GET /api/v1/home/story-deck`

## 15. 当前前端可直接对接的字段映射

### 15.1 第一屏

- `hero.editorial_card.title`
- `hero.editorial_card.text`
- `hero.editorial_card.author.display_name`
- `hero.editorial_card.published_at`
- `hero.trending_tags[]`
- `hero.stats[]`

### 15.2 第二屏

- `portal.items[]`
- `featured.items[]`
- `trends.authors[]`
- `trends.tags[]`
- `trends.schedules[]`

### 15.3 第三屏

- `latest_text_posts[]`

### 15.4 第四屏

- `story_deck.items[]`

---

如果需要把这份设计稿进一步变成“后端任务拆解版”，下一步可以继续补：

- SQL / ES / 聚合逻辑建议
- 缓存层建议
- 接口验收样例
- 前后端字段 mapping 表
