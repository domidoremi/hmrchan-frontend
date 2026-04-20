# HmrChan Frontend

> 仅供学习与交流使用。

一个基于 Vue 3、TypeScript 和 Vite 的社区前端项目，面向图片 / 视频内容浏览、搜索、互动与个人中心等场景，并包含 PWA 与移动端体验优化。

## 技术栈

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- Vue I18n
- Cloudflare Pages Functions
- Vitest / ESLint / Prettier

## 快速开始

### 环境要求

- Node.js `>=24.11.1 <25`
- Bun `1.3.11`

### 安装与启动

```bash
bun install
cp .env.example .env.development
bun run dev
```

默认开发地址：`http://localhost:5173`

## 环境变量

本项目使用 Vite 环境变量。本地开发通常只需要从 `.env.example` 复制一份：

```bash
cp .env.example .env.development
```

常用变量：

| 变量                           | 说明                                             |
| ------------------------------ | ------------------------------------------------ |
| `VITE_API_BASE_URL`            | 本地 Vite dev/preview proxy 的后端目标           |
| `VITE_CLIENT_CONTRACT_VERSION` | 共享 release contract hash，生产构建必须显式注入 |
| `VITE_ENABLE_DEBUG`            | 是否启用调试日志                                 |
| `VITE_ENABLE_CLIENT_INIT`      | 是否执行 `/api/v1/client/init`                   |
| `VITE_ENABLE_SCHEDULE_API`     | 是否启用日程接口请求                             |
| `VITE_ENABLE_DATA_PREFETCH`    | 是否启用后台数据预取                             |
| `VITE_TURNSTILE_SITE_KEY`      | 人机验证站点 key（回退配置，可选）               |

其余构建、安全和实验性开关请直接参考：

- [`.env.example`](./.env.example)
- [`wrangler.toml`](./wrangler.toml)

> 不建议把生产环境地址、账号、密钥或内部流程直接写入 README。

质量 / 回归脚本支持以下测试环境变量：

| 变量                                      | 说明                                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `E2E_BASE_URL`                            | 让 `bun run test:e2e` 直接扫指定站点，而不是本地 build+preview                                  |
| `E2E_AUTOSTART`                           | 设为 `false` 时，E2E 不尝试自启本地预览环境                                                     |
| `E2E_ARTIFACT_DIR`                        | E2E smoke 产物目录，默认 `.e2e-smoke`                                                           |
| `E2E_REQUIRE_AUTH`                        | 默认要求认证态 smoke；仅显式设为 `false` 时才允许 guest-only                                    |
| `VITE_API_BASE_URL`                       | preview-shell / 本地 dev 的同源 `/api` 代理目标；CI 受控 smoke 推荐指向承接同源 `/api` 的站点源 |
| `VITE_IDENTITY_API_BASE_URL`              | split topology 下 identity 域代理目标，可选                                                     |
| `VITE_COMMUNITY_API_BASE_URL`             | split topology 下 community 域代理目标，可选                                                    |
| `VITE_CONTENT_API_BASE_URL`               | split topology 下 content 域代理目标，可选                                                      |
| `PRIMARY_USERNAME`                        | 认证 smoke 主账号用户名，`test:e2e` / `check:frontend` / `test:prod:regression` 的首选输入      |
| `PRIMARY_PASSWORD`                        | 认证 smoke 主账号密码                                                                           |
| `E2E_AUTH_LOGIN`                          | 历史别名；仅在未设置 `PRIMARY_USERNAME` 时回退使用                                              |
| `E2E_AUTH_PASSWORD`                       | 历史别名；仅在未设置 `PRIMARY_PASSWORD` 时回退使用                                              |
| `E2E_SAMPLE_POST_ROUTE`                   | 指定帖子详情 smoke 用例路由                                                                     |
| `E2E_SAMPLE_DISCUSSION_ROUTE`             | 指定讨论详情 smoke 用例路由                                                                     |
| `FRONTEND_HEALTH_BASE_URL`                | 指定 `bun run check:frontend` 的巡检基址                                                        |
| `FRONTEND_HEALTH_AUTOSTART`               | 设为 `false` 时，不自启本地 preview shell                                                       |
| `FRONTEND_HEALTH_ARTIFACT_DIR`            | frontend health 产物目录，默认 `.frontend-health`                                               |
| `FRONTEND_HEALTH_INCLUDE_API_ERRORS`      | 设为 `true` 时，把 API 4xx/5xx 视为阻断问题                                                     |
| `FRONTEND_HEALTH_SAMPLE_POST_ROUTE`       | 指定健康检查里的帖子详情巡检路由                                                                |
| `FRONTEND_HEALTH_SAMPLE_DISCUSSION_ROUTE` | 指定健康检查里的讨论详情巡检路由                                                                |
| `LOCAL_AUDIT_CLEAR_RATE_LIMITS`           | 本地 Docker smoke 串行证据链中清理 Redis `ratelimit:*` 状态                                     |

本地私有 smoke / release-evidence 推荐写入未跟踪的 `.env.smoke.local`，例如：

```bash
PRIMARY_USERNAME=smoke-user
PRIMARY_PASSWORD=smoke-password
VITE_CLIENT_CONTRACT_VERSION=local-audit-contract
LOCAL_AUDIT_CLEAR_RATE_LIMITS=true
```

约定：

- 进程环境变量优先级高于 `.env.smoke.local`
- `.env.smoke.local` 只用于本地私有审计，不替代 CI secrets / vars
- `test:e2e`、`check:frontend`、`check:release-evidence`、`test:a11y`、`test:perf` 在自管 build/preview 时会自动补本地 contract fallback；这不会改变直接 `bun run build` 的严格门禁
- 本地 Docker smoke 可开启 `LOCAL_AUDIT_CLEAR_RATE_LIMITS=true`，只清理本地 Redis `ratelimit:*`，避免串行 release evidence 前一阶段的限流状态污染后一阶段；CI / 生产限流语义不变

认证态 smoke 账号约束：

- 不启用 MFA
- 不触发 step-up / risk verification
- 至少具备收藏、浏览历史、profile 子页和可见评论区所需的最小真实数据

默认推荐使用 `PRIMARY_USERNAME/PRIMARY_PASSWORD` 作为 public smoke fixture 账号；旧的 `E2E_AUTH_*` 仅作为兼容别名保留。
默认会要求认证 smoke fixture；只有显式设置 `E2E_REQUIRE_AUTH=false` 或 `FRONTEND_HEALTH_REQUIRE_AUTH=false` 时，才允许 guest-only 本地调试。

推荐在评论区 / Profile / 设备等高风险改动发版前串行执行统一证据链：

```bash
bun run check:release-evidence
```

## 常用脚本

```bash
# 开发
bun run dev
bun run build
bun run preview

# 质量检查
bun run lint
bun run lint:strict
bun run format
bun run format:check
bun run type-check

# 测试
bun run test:unit
bun run test:coverage
bun run test:e2e
bun run test:a11y
bun run test:perf
bun run check:release-evidence
```

如需查看更多脚本，请查看 [`package.json`](./package.json)。

## 项目结构

```text
.
├── src/           # 前端源码
├── public/        # 静态资源与 PWA 资源
├── functions/     # Cloudflare Pages Functions
├── scripts/       # 构建、测试、生成脚本
├── docs/          # 补充文档
├── .env.example   # 本地环境变量示例
├── package.json   # 脚本与依赖定义
└── wrangler.toml  # Cloudflare 配置
```

## 功能概览

- 首页、探索、作者、社区、日程等内容路由
- 登录、注册、个人主页、收藏等用户能力
- 响应式布局与移动端适配
- 国际化支持
- PWA / Service Worker 支持
- 基础性能与可访问性检查流程

## 部署

默认部署方式为 **Cloudflare Pages + Functions**。

基本流程：

1. 执行 `bun run build`
2. 将构建产物目录设置为 `dist`
3. 在部署平台配置所需环境变量与 Functions upstream
4. 确保 SPA 路由已配置回退到 `index.html`

如果使用其他静态托管平台，也可以直接部署 `dist/` 目录。

生产部署约定：

- 浏览器端生产默认通过同源 `/api` 访问后端，不使用 `VITE_API_BASE_URL` 改写线上 API 基址
- Pages Functions 的 public fallback 目标通过 `API_BASE_URL` 配置；私网路径通过受支持的 `INTERNAL_API_GATEWAY` Service Binding 转发到内部 Worker，再由该 Worker 使用 `VPC_SERVICE` + 三域 VPC origin
- Pages 纯文本变量最小集合为：`API_BASE_URL`、`BUN_VERSION=1.3.11`、`SKIP_DEPENDENCY_INSTALL=true`、`ENABLE_INTERNAL_API_GATEWAY=true`
- `STORAGE_PUBLIC_BASE_URL` 仅用于 edge 兼容层兜底历史 `/uploads/avatars/*` 链接；该兼容层不是现役 contract，也不代表前端可以继续生成或依赖 `/uploads/*` URL
- 头像与评论图片的现役公开地址只认 storage-backed public URL；若线上仍出现 `/uploads/*` 请求，应视为待清理的存量引用，而不是可继续扩散的接入方式
- BFF-first 认证在 Pages 生产与 preview 都要求配置 `BACKEND_INTERNAL_AUTH_SHARED_SECRET`，并要求存在 `INTERNAL_API_GATEWAY` Service Binding；`BACKEND_INTERNAL_ORIGIN` 仅作为调用方能直接访问 internal origin 时的 fallback，不应在 Pages 中机械填写 Docker hostname
- `INTERNAL_API_GATEWAY` 必须绑定到实际部署出的环境 Worker：production 绑定 `hmrchan-internal-api-gateway-production`，preview 绑定 `hmrchan-internal-api-gateway-preview`；不要绑定到未带环境后缀、没有 VPC 配置的 base Worker
- 若缺少 BFF shared secret，或同时缺少可用的 `INTERNAL_API_GATEWAY` 与直连 `BACKEND_INTERNAL_ORIGIN`，`/api/v1/auth/login`、`/api/v1/auth/session:resolve` 等同源认证入口会由 Functions 显式返回 `500 BFF_NOT_CONFIGURED`
- 内部 Worker 的私网三域上游应与后端当前 Compose 服务名对齐：
  - `VPC_IDENTITY_API_ORIGIN=http://identity-api:8000`
  - `VPC_COMMUNITY_API_ORIGIN=http://community-api:8000`
  - `VPC_CONTENT_API_ORIGIN=http://content-api:8000`
- `VPC_API_ORIGIN` 仅作为旧配置回退，不再指向已退役的 `nginx`
- 需要单独部署 [`workers/internal-api/wrangler.toml`](./workers/internal-api/wrangler.toml) 对应的 Worker，并让 Pages 通过 `INTERNAL_API_GATEWAY` 绑定到该 Worker；仅修改 Pages 项目变量不会自动创建这条私网链路
- 同域 façade 排障时，优先检查响应头 `X-Service-Name`、`X-Proxy-Upstream-Source`、`X-Proxy-Upstream-Domain`；若内容或社区读面落到 `identity-api`，先修 façade 分流，不要通过放宽身份签名策略掩盖
- 推荐 Pages 构建命令继续显式注入 `VITE_GIT_COMMIT=$CF_PAGES_COMMIT_SHA`；若 Dashboard 未配置 `VITE_CLIENT_CONTRACT_VERSION`，构建 wrapper 只会在 Cloudflare Pages 环境中用 `CF_PAGES_COMMIT_SHA` 作为本次 rollout contract，不影响普通本地 `bun run build` 的缺契约失败语义
- 若后端生产 `CLIENT_CONTRACT_VERSION` 使用独立 release hash，而不是 Pages commit SHA，必须在 Cloudflare Dashboard 显式配置同值 `VITE_CLIENT_CONTRACT_VERSION`
- `VITE_TURNSTILE_SITE_KEY` 作为机密在 Dashboard 中保留；其余 `VITE_*` 变量不是 Pages 生产必需项
- 若仓库选择“不公开 API 入口”，GitHub Actions 里的 preview-shell smoke 不应再回落到 `https://api.momichan.xyz`；请在仓库 vars 中把 `SMOKE_API_BASE_URL` 指向受控站点源（推荐 `https://hmrchan-frontend.pages.dev` 或对应预发站点，要求其同源 `/api` 已由 Pages Functions 接入后端），只有在刻意直连受保护 API 拓扑时才使用 `SMOKE_IDENTITY_API_BASE_URL` / `SMOKE_COMMUNITY_API_BASE_URL` / `SMOKE_CONTENT_API_BASE_URL`
- `main` push 的 canary 只会在配置了 `PRODUCTION_CANARY_BASE_URL` 或 `PROTECTED_CANARY_BASE_URL` 时运行；nightly 的远端 health 只会在配置了 `NIGHTLY_FRONTEND_HEALTH_BASE_URL` 或上述 canary 地址时运行

发布门禁约定：

- 默认 GitHub Actions 阻塞检查：`quality`
- `coverage` 改为 `workflow_dispatch` 手动触发，不再占用默认 PR / push 用量
- 重浏览器检查默认移出 GitHub 自动 workflow，改为本地或值班机手动执行：
  - `bun run test:e2e`
  - `bun run check:frontend`
  - `bun run test:prod:regression --preflight`
  - `node scripts/prod-regression-runner.mjs`
- `frontend-nightly` 的 `pwa_smoke` 与主 CI 复用同一套 public smoke fixture 契约；默认要求提供 `PRIMARY_USERNAME/PRIMARY_PASSWORD`
- `frontend-nightly` 中只有 `frontend_health` 直接扫生产；`pwa_smoke` 仍跑本地 build + preview 壳层
- 本地自管 preview-shell 审计现在会复用统一 preview manager；若 preview 异常退出导致 `chrome-error://chromewebdata/`，`test:e2e` / `check:frontend` 会自动重启一次并重试当前检查
- 高风险改动在自动化全绿后，仍建议补跑 `bun run test:prod:regression`
- 高风险改动在跑完整 manual regression 前，先执行 `bun run test:prod:regression --preflight`
- 测试 / 构建依赖只做 scoped upgrade；默认不顺手升级业务运行时依赖
- 会干扰 CI 判读的工具链提醒必须被修复，或至少登记为已知限制并收进显式白名单；不能长期作为常驻主噪音保留
- 当前已登记的工具链已知限制只有 `baseline-browser-mapping` 的 stale-data 提醒；仓库通过 Vitest wrapper 只对白名单化的官方提醒做 suppress，不会吞掉其他测试错误
- `test:e2e`、`check:frontend`、`test:prod:regression` 共享同一份 route / selector / readiness contract，避免 smoke、health、manual runner 各自漂移
- 认证态 smoke 当前除了受保护路由可进入，还要求：
  - `/favorites` 实际落到 `/profile/favorites`
  - 帖子详情评论区成功挂载，且评论线程头可见；composer 仅作为增强信号
  - 讨论详情评论区成功挂载，且评论线程头可见；composer 仅作为增强信号
  - 受保护 Profile 子页命中稳定 section shell + tab readiness selector
- `/404/` 的真实契约按 Pages 当前行为校验：
  - 返回 `404`
  - 保留正确 prerender shell HTML
  - canonical 为 `https://momichan.xyz/404`
  - robots 为 `noindex, nofollow`
- smoke / canary / frontend health 失败时会保留：
  - `summary.json`
  - `summary.md`
  - 页面失败截图
  - 页面 HTML 快照
- `test:prod:regression` 继续保持 manual-only：
  - 用于评论区、Profile、设备、收藏、讨论等高风险改动发版前深回归
  - 不接入默认 PR / canary 阻塞链
  - `--preflight` 只做契约、凭据、artifact、route coverage 预检，不启动浏览器和 round-trip
  - 产物会聚合到 `output/prod-regression/<timestamp>/`
  - 重点入口包括 `summary.json`、`summary.md`、`screenshots/`、`diagnostics/`

## 开发约定

- 提交信息采用 Conventional Commits
- 提交前建议至少执行：

```bash
bun run type-check
bun run test:unit
```

## 相关文档

- [后端真相源入口](./docs/backend-source-of-truth.md)
- [前端发布就绪与质量门禁](./docs/frontend-release-readiness.md)

## License

本项目仅用于个人学习和技术交流。
