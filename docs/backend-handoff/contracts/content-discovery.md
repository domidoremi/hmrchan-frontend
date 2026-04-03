# Content / Discovery

## 域边界

- home / featured / highlights
- posts
- authors
- media
- search
- schedules
- trends
- members

## 现役公开路径

- `/api/v1/home*`
- `/api/v1/posts*`（排除 `/posts/:id/comments`，该条归 Community / Interaction）
- `/api/v1/authors*`
- `/api/v1/media/*`
- `/api/v1/search/*`
- `/api/v1/schedules*`
- `/api/v1/trends/summary`
- `/api/v1/schedules/highlights`
- `/api/v1/community/highlights`
- `/api/v1/members*`

## 统一读侧规则

- 内容主数据归 content service 管
- 读侧允许 assembler / bulk loaders 做跨域拼装
- 必须使用批量 loader，禁止 N+1
- 禁止内部 HTTP 调自己

## 分页与聚合规则

- `posts`、`authors`、`authors/:id/posts`、`search/posts`、`search/authors`、`schedules`、`members` 使用 cursor 契约
- 返回体统一为 `items + next_cursor + has_more`
- `home`、`featured`、`story-deck`、`trends`、`community/highlights`、`schedules/highlights` 保持聚合读侧形状，不强改 wire shape
- `search/suggestions` 保持轻量 suggestion 读侧，不混入 cursor 语义

## 域归属裁定

- `community/highlights` 固定归到本域，因为它是首页聚合读侧
- `members*` 固定归到本域，不与 identity/account 域混放

## 数据分类

- `canonical`：posts, authors, schedules, media metadata, member read models
- `derived`：home aggregates, search index, trend snapshots, highlight feeds
- `ephemeral`：cache, ranking windows, search warmers

## OpenAPI artifact

- `docs/contracts/openapi/content-discovery.openapi.yaml`
