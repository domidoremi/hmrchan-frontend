# MomiChan Frontend

MomiChan 是面向桃山日女梨公开内容的粉丝站前端。项目聚合 YouTube、X、TikTok、SHOWROOM 与 Instagram 等平台的公开动态，并提供内容探索、日程、社区、账号与安全设置等完整 Web 体验。

本仓库同时维护浏览器应用、PWA 能力和 Cloudflare 边缘入口。浏览器默认只访问同源 `/api/v1`，由 Pages Functions 和内部 API Gateway 转发到后端服务。

## 功能范围

- 公开内容聚合、搜索、作者与内容详情页
- 日程、直播与活动信息
- 社区讨论、收藏、通知和个人资料
- 注册、登录、Google OAuth、密码恢复、Passkey、双因素认证、设备与会话管理
- 响应式桌面/移动端布局和 Vue I18n 国际化
- 可安装 PWA、Service Worker 缓存和离线回退页
- 页面预渲染、动态元数据、安全响应头和同源 API facade

## 技术基线

| 类别             | 技术或版本                                      |
| ---------------- | ----------------------------------------------- |
| 包管理与运行脚本 | Bun `1.3.14`                                    |
| Node.js          | `>=24.11.1 <25`                                 |
| 应用框架         | Vue `3.5.40`、Pinia、Vue Router、Vue I18n       |
| 语言与构建       | TypeScript `6.0.3`、Vite `8.1.5`                |
| 测试与质量       | Vitest、ESLint、Prettier、Puppeteer、Lighthouse |
| 部署平台         | Cloudflare Pages、Pages Functions、Workers      |

`bun.lock` 是唯一依赖锁文件。请勿混用 npm、pnpm 或 Yarn。

本仓库要求 Node.js `>=24.11.1 <25` 与 Bun `1.3.14`。

## 本地开发

安装依赖并启动开发服务器：

```bash
bun install --frozen-lockfile
bun run dev
```

默认地址从 `http://127.0.0.1:5173` 开始。端口被占用时，启动脚本会继续查找可用端口；显式传入端口时会严格使用该端口：

```bash
bun run dev -- --port 5173
```

仓库内的 `.env.development` 提供开发默认值，`.env.example` 说明可配置项。个人覆盖值或测试凭据必须放入未跟踪的 `*.local` 文件，不应提交到 Git。

浏览器请求根路径固定为 `/api/v1`。`VITE_API_BASE_URL`、`VITE_IDENTITY_API_BASE_URL`、`VITE_COMMUNITY_API_BASE_URL` 和 `VITE_CONTENT_API_BASE_URL` 只配置本地 Vite dev/preview proxy 的上游目标，不会把生产浏览器请求改为跨域直连。

## 常用命令

| 命令                                    | 用途                                 |
| --------------------------------------- | ------------------------------------ |
| `bun run dev`                           | 启动本地开发服务器                   |
| `bun run build`                         | 生成生产构建到 `dist/`               |
| `bun run preview`                       | 预览生产构建                         |
| `bun run type-check`                    | 执行增量 TypeScript/Vue 类型检查     |
| `bun run lint:strict`                   | 执行零警告 ESLint 检查               |
| `bun run format:check`                  | 检查受管文件格式                     |
| `bun run test:unit`                     | 执行单元测试                         |
| `bun run audit:light`                   | 检查安全、环境、PWA、i18n 与前端契约 |
| `bun run audit`                         | 执行仓库审计和依赖漏洞审计           |
| `bun run validate:release:prepush`      | 执行常规推送前门禁                   |
| `bun run validate:release:prepush:full` | 执行完整静态发布门禁                 |
| `bun run validate:release:local`        | 执行包含本地浏览器链路的完整本地验收 |

脚本定义以 [`package.json`](package.json) 为准；完整发布模式和所需环境输入见 [`VALIDATION.md`](VALIDATION.md)。

## 目录职责

```text
src/views/              路由页面与页面级交互编排
src/hmr/                MomiChan 前台业务域、组件、composable 与品牌样式
src/api/                浏览器 API facade、请求策略和兼容数据映射
src/stores/             跨页面 Pinia 状态
src/sw/                 Service Worker 与公开缓存策略
src/edge/               边缘渲染、上游选择和内部网关逻辑
functions/              Cloudflare Pages Functions 与同源 /api facade
workers/internal-api/   内部 API Gateway Worker
build/vite/plugins/     构建期插件
public/                 PWA、离线页及部署所需静态兼容资源
scripts/                开发、构建、审计和发布验收脚本
```

`src/api/` 中的发布契约文件和 `public/` 中的兼容资源可能由边缘流程、构建插件或线上缓存引用。删除前必须确认运行时引用与发布兼容性，不能只依据页面直接 import 判断。

## 构建与部署

生产目标是 Cloudflare Pages + Functions，输出目录为 `dist/`。Pages 推荐构建命令：

```bash
bun install --frozen-lockfile && VITE_GIT_COMMIT=$CF_PAGES_COMMIT_SHA bun run build
```

[`wrangler.toml`](wrangler.toml) 维护 Pages 输出目录、production/preview 变量和内部网关 Service Binding。机密值应通过 Cloudflare Dashboard 管理，不得写入仓库配置。

生产构建要求 release contract。Dashboard 可显式注入 `VITE_CLIENT_CONTRACT_VERSION`；在 Cloudflare Pages 环境中，构建包装器也可使用 `CF_PAGES_COMMIT_SHA` 作为当前 rollout contract。

## 验收与发布

`validate:release` 是仓库唯一发布验收入口，仓库不使用 GitHub Actions 作为发布真相源。

```bash
# 日常提交和推送前的中负载门禁
bun run validate:release:prepush

# 发布前完整静态门禁：类型、lint、unit、build 与构建安全检查
bun run validate:release:prepush:full

# 依赖本地后端、浏览器和审计桥接环境的完整本地验收
bun run validate:release:local
```

`candidate` 与 `production` 模式需要受控站点和授权测试账号。凭据只能通过环境变量或未跟踪的本地文件提供，不得写入命令示例、日志或仓库文件。各模式的通过语义、产物和环境阻塞规则以 [`VALIDATION.md`](VALIDATION.md) 为准。

## 仓库真相源

- [`README.md`](README.md)：项目入口、开发边界与交付概览
- [`VALIDATION.md`](VALIDATION.md)：发布验收流程与状态语义
- [`package.json`](package.json) 与 [`bun.lock`](bun.lock)：命令、版本和依赖锁定
- [`.env.example`](.env.example)：环境变量说明与安全边界
- [`wrangler.toml`](wrangler.toml)：Cloudflare Pages/Functions 配置

本地 `docs/` 目录不进入版本控制。需要随代码长期维护的操作说明应放在已跟踪的根级文档中。

## License

仓库为私有项目，`package.json` 当前声明 `ISC`。外部分发或复用前请先确认项目授权范围。
