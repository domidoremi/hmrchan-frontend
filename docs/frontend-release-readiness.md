# Frontend Release Readiness

## Purpose

本文件定义前端当前的发布就绪基线、阻塞门禁、关键用户路径和发布后复核要求。

目标不是“构建通过即可发”，而是把真实线上高频链路纳入可重复验证的门槛。

## Severity

- `P0`: 运行时崩溃、白屏、关键页面无法进入、关键跳转错误
- `P1`: 高频交互失败、数据缺失、重要状态错误、显著 UX 失真
- `P2`: 一致性、可访问性、布局与性能细节问题

发布最低门槛：

- `P0 = 0`
- 所有 blocking checks 全绿
- preview-shell smoke 全绿
- production canary 全绿
- 残留 `P1` 必须已经登记 owner 与修复计划

## Blocking Gates

主 CI `frontend.yml` 当前阻塞以下检查：

- `quality`
  - `format:check`
  - `type-check`
  - `lint:strict`
  - `test:unit`
  - `audit`
  - `build`
  - `build:security-check`
- `coverage`
  - 使用 `istanbul + maxWorkers=1`
  - 目的：先提供可信覆盖率数据，再逐步提高阈值
  - 当前 phase-1 baseline:
    - `lines >= 39`
    - `functions >= 37`
    - `statements >= 38`
    - `branches >= 30`
  - 当前真实基线大约为：
    - `lines 41.95%`
    - `functions 40.33%`
    - `statements 40.29%`
    - `branches 31.86%`
- `e2e_smoke`
  - 关键公开路由
  - 帖子详情 / 讨论详情
  - 未登录访问受保护 profile 子页的重定向链路
  - 可信 CI 上 auth smoke 作为正式阻塞项；fork PR 因 secrets 不可用时可退化为 guest-only
  - smoke 现在会输出显式 route matrix summary：
    - guest smoke 执行了哪些检查
    - auth smoke 是否执行
    - auth smoke 是否被要求
    - auth smoke skipped 的明确原因
    - 失败时最后一个失败 route / check
  - 认证态下进一步验证：
    - `/favorites` 实际重定向到 `/profile/favorites`
    - 剩余受保护 profile 子页保持登录态且主容器可达：
      - `/profile/comments`
      - `/profile/likes`
      - `/profile/comment-favorites`
      - `/profile/reports`
      - `/profile/followers`
      - `/profile/following`
      - `/profile/blocked`
      - `/profile/security-activity`
    - 帖子详情评论 composer 与 thread header 已可见
    - 讨论详情评论 composer 与 thread header 已可见
  - 认证态 smoke 继续保持 non-mutating：
    - 不发评论
    - 不执行删除 / 举报 / 关注 / 拉黑写操作
  - artifact:
    - `summary.json`
    - `summary.md`
    - `failure-last.png`
    - `failure-last.html`
- `frontend_health`
  - preview-shell 路由与壳层健康检查
  - 不再默认忽略所有 `/api/*`
  - 仅忽略：
    - `/client-report`
    - 本地自动启动 preview server 上、同源 `/api/*` 的已知壳层噪音
  - artifact:
    - `summary.json`
    - `summary.md`
    - `failure-first.png`
    - `failure-first.html`

## Nightly And Canary

`frontend-nightly.yml` 当前保留：

- `dependency_audit`
- `accessibility`
- `performance`
- `pwa_smoke`
  - 与主 CI 复用 public smoke fixture 契约，首选 `PRIMARY_USERNAME` / `PRIMARY_PASSWORD`
  - CI / nightly 默认仍要求有机密
  - 仍基于本地 build + preview shell，不直接扫生产
  - 同样上传 smoke summary artifact，便于区分 guest/auth 实际执行情况
- `frontend_health`
  - nightly 改为直接扫生产 `https://momichan.xyz`
  - `FRONTEND_HEALTH_INCLUDE_API_ERRORS=true`

主 CI 在 `push -> main/master` 后额外触发 `production_canary`：

- 等待 Pages 生产发布窗口
- 对 `https://momichan.xyz` 执行：
  - `frontend health`
  - `smoke e2e`
  - canary 也会上传 production smoke summary artifact
  - 当前固定等待 `180s`，目的是给 Pages 部署传播留缓冲；如果后续实测经常偏慢或偏快，应按发布时延数据再调

## Critical Path Matrix

按用户任务组织，而不是按页面名组织：

- 公开浏览
  - `/`
  - `/explore`
  - `/authors`
  - `/community`
  - `/post/:id`
  - `/community/discussions/:id`
- 评论相关
  - 帖子详情评论区加载
  - 讨论详情评论区加载
  - 回复 placeholder i18n 可编译
  - 认证态下评论 composer / reply 入口存在
- 个人中心与受保护路由降级
  - `/profile`
  - `/favorites`
  - `/profile/favorites`
  - `/profile/comments`
  - `/profile/likes`
  - `/profile/comment-favorites`
  - `/profile/history`
  - `/profile/reports`
  - `/profile/followers`
  - `/profile/following`
  - `/profile/blocked`
  - `/profile/security-activity`
  - `/profile/settings`
  - `/profile/notifications`
  - `/profile/devices`
  - 未登录访问时必须回落到 `/login`
  - 受保护 `/profile/*` 子页的 smoke selector 契约：
    - 统一使用 `[data-testid="profile-section-shell"][data-profile-section="<sectionId>"]`
    - readiness selector 使用稳定 `data-testid`，独立于列表是否为空
    - smoke 不再依赖 `.comments-tab`、`.likes-tab` 这类样式 class
- 壳层与体验
  - runtime console errors
  - blocking http errors
  - a11y shell regressions
  - layout overflow

## Coverage Notes

历史覆盖率链路存在两类失真：

- `bun run test:coverage` 会触发 `Coverage APIs are not supported`
- `v8` provider 在当前 worker 模式下会产生 `.tmp` 聚合错误或 0% 假数据

因此当前覆盖率门禁统一改为：

- `node ./node_modules/vitest/vitest.mjs run --coverage --maxWorkers=1`
- `istanbul` provider

这不是最终目标值，只是 phase-1 可信基线。后续应该按模块补测试并逐步抬高。

## Signal Hygiene

测试 / 构建 / 发布信号的治理规则：

- 优先做源头修复，而不是直接静音
- scoped upgrade 仅限测试、构建、审计与浏览器数据工具链
- 业务运行时依赖默认不在同一波信号治理里顺手升级
- 会影响结果判读的提醒必须满足其一：
  - 已被修复，不再作为常驻主输出出现
  - 已登记为上游限制，并被收进显式白名单或 runbook 说明
- 未进入白名单的 `console.error`、runtime error、blocking HTTP failure 继续视为真实失败信号
- 当前已登记的上游限制：
  - `baseline-browser-mapping` 即使升级到仓库可获取的最新版本，仍可能因其上游数据发布时间超过两个月而输出 stale-data 提醒
  - 仓库通过 Vitest wrapper 仅对该官方支持的提醒注入 `BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA=true` / `BROWSERSLIST_IGNORE_OLD_DATA=true`，不扩展到其他错误类型
  - `vue-i18n` custom message compiler 在当前 alpha/beta 依赖组合下可能输出 experimental warning；本轮登记为升级跟踪项，不扩展为通用静默白名单

## Frontend Health Classification

当前 `frontend health` 输出重点关注以下问题类型：

- `route-crash`
- `console-error`
- `blocking-http-error`
- `a11y-shell`
- `layout-overflow`

说明：

- `/client-report` 仍视为 optional telemetry noise
- 本地 Pages-compatible preview facade 优先提供 `/client-report` 与同源 API 行为
- 纯 `vite preview` 或 local preview API noise 显式允许时，API `530`、`UPSTREAM_TIMEOUT`、`UPSTREAM_UNREACHABLE`、同源 upstream unavailable、`/client-report` unavailable 归类为本地环境阻塞
- 对外部 base URL 或生产环境，API 错误不再默认忽略

失败排查顺序：

1. 先看 `summary.md`
2. 再看 `failure-last.png` 或 `failure-first.png`
3. 最后看 `failure-last.html` / `failure-first.html` 与原始 `report.txt`

职责边界：

- `e2e_smoke` / `production_canary`
  - 负责公开路由与认证态关键前置交互可达性
  - 非变异，不做真实写操作
- `frontend_health`
  - 负责 guest/public 壳层、控制台、阻断请求、a11y-shell 与布局溢出
  - 不替代登录后业务流验证

## Manual High-Risk Verification

以下改动在自动化全绿后，仍建议追加一次人工或半人工深度回归：

- 评论区重构
- 个人中心路由结构调整
- 受保护 Profile 子页的数据契约与返回链
- 收藏 / 浏览历史预览卡片变更
- 认证与安全链路调整

仓库已有 `scripts/prod-regression-runner.mjs`，适合在高风险发版前、本地带人工协助运行。

当前约定：

- `prod-regression-runner` 继续保持 manual-only，不属于默认 PR / production canary 阻塞链
- 在跑完整 manual regression 前，先执行 `bun run test:prod:regression --preflight`
- runner 会输出聚合证据到 `output/prod-regression/<timestamp>/`
- 关键产物包括：
  - `summary.json`
  - `summary.md`
  - `screenshots/`
  - `diagnostics/entries.json`
  - `diagnostics/issues.json`
  - `diagnostics/skips.json`
- `--preflight` 额外输出：
  - `diagnostics/preflight.json`
  - 统一的 route coverage / contract / credential / artifact 检查结果
- `Skipped Checks` 会在 `summary.md` 中按 `dependency / coverage-gap / capability-gap` 等分类汇总，而不是仅散落在日志中
- `e2e_smoke`、`production_canary`、`prod-regression-runner` 共享同一份 route / selector / readiness contract，避免脚本口径继续漂移
- 本地串行发布证据链使用 `bun run check:release-evidence`，默认顺序为：
  - `bun run test:e2e`
  - `bun run check:frontend`
  - `bun run test:prod:regression --preflight`
- `test:e2e` 与 `check:frontend` 本地共享构建产物时，通过 build artifact lock 避免并发写 `dist/` 造成的 `EBUSY` 误报
- `test:e2e`、`check:frontend`、`test:a11y`、`test:perf` 的本地 build + preview 生命周期统一收敛到 shared preview manager
- 若发布策略选择“不公开 API 入口”，CI 的 preview-shell smoke 必须显式配置受控 upstream：
  - 单上游：`SMOKE_API_BASE_URL`
    - 推荐填受控站点源（例如 `https://hmrchan-frontend.pages.dev` 或对应预发站点），要求该站点的同源 `/api` 已由 Pages Functions 接入后端三域服务
  - split topology：`SMOKE_IDENTITY_API_BASE_URL`、`SMOKE_COMMUNITY_API_BASE_URL`、`SMOKE_CONTENT_API_BASE_URL`
    - 仅在刻意让 preview shell 直连受保护 API 域时使用
  - 未配置时 workflow 直接失败，不再隐式回落到 `https://api.momichan.xyz`
- 远端 canary / nightly health 只在显式配置站点时运行：
  - `PRODUCTION_CANARY_BASE_URL` 或 `PROTECTED_CANARY_BASE_URL`
  - 可选 nightly 覆盖：`NIGHTLY_FRONTEND_HEALTH_BASE_URL`
- 若 preview shell 在本地审计过程中异常退出，`test:e2e` 与 `check:frontend` 会自动重启一次并重试当前路由，失败产物中附带 preview 诊断日志
- 本地 Docker smoke 串行证据链可通过 `LOCAL_AUDIT_CLEAR_RATE_LIMITS=true` 清理 Redis `ratelimit:*`，避免 `test:e2e -> check:frontend -> preflight` 的本地限流状态互相污染；该行为仅在本地审计脚本环境中触发，不修改 CI / 生产限流门禁
- 受保护 Profile 子页已进入 runner route matrix，至少校验：
  - 最终路由
  - 页面标题
  - 稳定 shell selector
  - 至少一个内容前置信号（list / empty state / stats / header）

## Frontend Quality Baseline

本节记录当前前端质量基线。目标是让安全、验证、复杂度、性能和 UX 状态有可执行门槛，而不是只停留在 review 建议里。

### 大文件阈值

- Vue / TS 单文件超过 1000 行：必须在 `scripts/config/complexity-budget.json` 登记原因和当前上限。
- Vue / TS 单文件超过 1500 行：必须设置 `refactorQueued: true`，进入拆分队列。
- 新增未登记超 1000 行文件，或登记文件继续超过 `maxLines`，`bun run check:complexity-budget` 必须失败。
- 历史债务采用冻结上限治理：当前已登记的大文件可以通过，但后续增长必须显式调整配置并说明原因。

当前优先拆分队列：

- `src/views/HomePage.vue`
- `src/views/SchedulePage.vue`
- `src/views/PostDetailPage.vue`
- `src/views/ProfileSettingsPage.vue`
- `src/components/layout/AppNavbar.vue`
- `src/components/layout/SettingsPanel.vue`
- `src/components/ui/DeskPet.vue`

### Bundle Budget

完整静态 release gate 在 `build` 和 `build:security-check` 后运行：

```bash
bun run check:bundle-budget
```

预算配置在 `scripts/config/bundle-budget.json`。初始阈值按当前构建产物约 `+5%` 设置：

| 指标 | 阈值 |
| --- | ---: |
| JS 总量 | 1,862,015 bytes |
| CSS 总量 | 884,640 bytes |
| 图片总量 | 2,953,128 bytes |
| 最大 JS/CSS chunk | 255,923 bytes |
| 首页首屏唯一 asset 数 | 8 |

本轮已把 `HomePage.vue`、`SchedulePage.vue`、`VideoPlayer.vue` 的 scoped style 外提到独立 CSS 文件，降低单文件 review 面积，并让页面样式更容易随异步 chunk 管理。后续继续收紧预算时，应优先处理全局 `index.css`、首页 CSS、动画/装饰资源和只用少量能力却引入大体积依赖的场景。

### UX 状态规范

列表、搜索、作者、日程、首页区块和受保护页面应优先使用统一状态组件表达：

- `loading`：被动等待，不默认展示重试按钮。
- `empty` / `no-results`：说明当前没有数据，不暗示系统故障。
- `error`：默认展示重试按钮。
- `service-unavailable`：用于 API `530`、upstream unavailable、本地 preview facade 缺失或后端暂不可用，文案应指导刷新、稍后重试或查看缓存/空态。
- `not-found`：用于资源不存在，不混用网络错误文案。

错误文案避免只显示“网络错误”或“发生错误”。能明确判断服务不可用时，使用“服务暂不可用 / 稍后重试 / 刷新”这类用户可执行表达。

### Artifact 脱敏

验证 artifact 不得落盘真实敏感值。`validate:release` 会在写入 `summary.json`、`summary.md` 和 `stages/*.json` 前统一 sanitizer：

- 敏感 key 包括 `token`、`password`、`secret`、`cookie`、`key`、`auth`、`authorization`、`credential`、`jwt`、`session`、`private`、`cert`、`refresh`、`pass` 等大小写和 camelCase 变体。
- 环境变量 map 只保留 key 名、是否存在、是否敏感、来源和 `[present]` / `[redacted]` 占位。
- `VITE_*` 公共变量也必须走同一规则；公共变量不是 artifact 安全豁免。
- 嵌套对象和数组必须递归处理。

### 浏览器采样

核心采样视口：

- Desktop: `1440x900`
- Mobile: `390x844`

核心路由：

- `/`
- `/explore`
- `/search`
- `/authors`
- `/community`
- `/schedule`
- `/login`
- `/profile`
- 非法详情页

验收重点：

- 无前端运行时崩溃
- 无横向溢出
- 受保护路由正确跳转
- loading / empty / error / service unavailable 状态清楚
- local preview 环境阻塞与真实前端错误区分清楚

### i18n Compiler Warning

当前浏览器采样中可能出现 `vue-i18n` custom message compiler experimental 警告。它属于上游 alpha/beta 依赖风险，本轮不直接替换 i18n 方案。

跟踪路径：

- 保持警告在测试输出中可见，不把它扩展到通用静默白名单。
- 关注 `vue-i18n` 稳定版本或 compiler API 变更。
- 若升级会影响消息编译、动态 locale 或 bundle 体积，必须先跑核心路由浏览器采样和 i18n 相关单测。

## Script Inputs

用于 preview / production smoke 的可配置输入：

- `E2E_BASE_URL`
- `E2E_AUTOSTART`
- `E2E_ARTIFACT_DIR`
- `E2E_REQUIRE_AUTH`
- `PRIMARY_USERNAME`
- `PRIMARY_PASSWORD`
- `E2E_AUTH_LOGIN`
- `E2E_AUTH_PASSWORD`
- `E2E_SAMPLE_POST_ROUTE`
- `E2E_SAMPLE_DISCUSSION_ROUTE`
- `FRONTEND_HEALTH_BASE_URL`
- `FRONTEND_HEALTH_AUTOSTART`
- `FRONTEND_HEALTH_ARTIFACT_DIR`
- `FRONTEND_HEALTH_INCLUDE_API_ERRORS`
- `FRONTEND_HEALTH_SAMPLE_POST_ROUTE`
- `FRONTEND_HEALTH_SAMPLE_DISCUSSION_ROUTE`
- `LOCAL_AUDIT_CLEAR_RATE_LIMITS`

推荐约定：

- 本地自检：不传 `*_BASE_URL`，让脚本自行 build + preview
- 本地私有 smoke 配置放进未跟踪的 `.env.smoke.local`，不要写进 `.env.development`
- 认证态 smoke：优先传入 `PRIMARY_USERNAME` / `PRIMARY_PASSWORD`，脚本会在浏览器上下文中通过同源 `/api/v1/auth/login` 建立 refresh cookie
- `E2E_AUTH_LOGIN` / `E2E_AUTH_PASSWORD` 仅作为兼容别名保留
- 认证态 smoke 账号应满足：
  - 无 MFA
  - 不触发 step-up / risk verification
  - 至少有收藏、浏览历史、剩余受保护 profile 子页可访问数据，以及可进入评论区的真实内容
- 本地未显式导出变量时，脚本会先尝试读取 `.env.smoke.local`
- 自管 build / preview 的本地审计脚本会自动注入本地 `VITE_CLIENT_CONTRACT_VERSION` fallback；这不会改变直接 `bun run build` 必须显式注入生产契约的规则
- 本地 Docker backend 被连续 smoke 时，推荐在 `.env.smoke.local` 中设置 `LOCAL_AUDIT_CLEAR_RATE_LIMITS=true`，让 release evidence 各阶段之间只清理本地 Redis rate-limit keys
- 若 `E2E_REQUIRE_AUTH=true`，则缺少 `PRIMARY_*`（或兼容别名）直接视为失败，不再允许静默退化
- auth smoke skipped 合法场景：
  - 本地未提供 `PRIMARY_USERNAME`
  - 本地未提供 `PRIMARY_PASSWORD`
  - 两者都未提供
  - 这些情况都应在 `summary.md` 中明确写出，而不是静默跳过
- Preview / 生产 canary：显式传入目标 URL，并把 `*_AUTOSTART=false`
- nightly：
  - `pwa_smoke` 继续扫本地 preview shell
  - `frontend_health` 直接扫生产
- 事故回归：把 sample route 指向真实故障帖子 / 讨论，避免只扫占位路由
- 手动深回归预检：
  - `bun run test:prod:regression --preflight`
  - 失败时先看 `summary.md`
  - 再看 `diagnostics/preflight.json`

推荐发布前检查顺序：

1. 先看 blocking gates 是否全绿
2. 再看 preview / production 的 smoke 与 frontend health `summary.md`
3. 若涉及评论区、Profile、设备、收藏、讨论写操作，优先跑 `bun run check:release-evidence`
4. 需要人工深回归时，再跑 `bun run test:prod:regression`
5. 结合 `summary.md`、截图与 `diagnostics/` 再决定是否放行
