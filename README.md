# MomiChan Next

**动态、写真、日程与社区。**

[简体中文](README.md) · [English](docs/en/README.md)

MomiChan Next 是面向籾山ひめり粉丝的写真与内容浏览站点。首页从写真选片进入动态图集或列表预览，并提供作者、月历、讨论和个人收藏等页面。

本项目由粉丝维护，与艺人及所属机构无隶属关系。

[主站分支](https://github.com/domidoremi/hmrchan-frontend/tree/main) · [本地开发](#本地开发) · [四套主题](#四套主题) · [架构](#架构与目录) · [验证与发布](#验证与发布)

## 两个版本

两站维护在同一仓库的不同分支，分别构建、部署，并保留各自的页面组织方式。

| 版本          | 分支                                                               | 主要体验                         | 首次访问的外观   |
| ------------- | ------------------------------------------------------------------ | -------------------------------- | ---------------- |
| MomiChan 主站 | [`main`](https://github.com/domidoremi/hmrchan-frontend/tree/main) | 章节式首页、动态阅读、影像与日程 | 原生简约，亮色   |
| MomiChan Next | [`next`](https://github.com/domidoremi/hmrchan-frontend/tree/next) | 写真选片、图集、列表与预览       | Material 3，暗色 |

**当前分支：Next（`next`）。** 两站均使用 Vue；主站采用稳定版，Next 保留 Vue 3.6 RC 验证线。实际依赖以本分支的 [`package.json`](package.json) 和 [`bun.lock`](bun.lock) 为准。

Next 的首页以写真为入口，可用按钮或方向键切换选片，再进入动态集合。集合支持图集与列表预览；搜索时展示匹配内容，清空搜索后恢复首页预览。

## 页面与功能

| 入口                            | 内容                                         |
| ------------------------------- | -------------------------------------------- |
| 首页 `/`                        | 推荐内容、照片展示，以及动态、日程和社区入口 |
| 动态 `/explore`、搜索 `/search` | 来源筛选、内容类型、排序、搜索与原帖详情     |
| 作者 `/authors`                 | 作者资料、平台来源与相关动态                 |
| 日程 `/schedule`                | 月历、活动列表、日期选择与已记下的日程       |
| 社区 `/community`               | 讨论、回复、发布入口与本地草稿恢复           |
| 个人空间 `/profile`             | 收藏、通知、个人资料、设备与安全设置         |
| 关于 `/about`、联系 `/contact`  | 官方与社交渠道、项目说明与联系表单           |

账号功能包含密码登录、Passkey 和账户恢复等流程，实际可用性取决于后端服务及认证配置。

站点支持安装为 PWA。Service Worker 提供资源缓存与离线回退；登录、提交内容和获取最新数据仍需要网络及可用的 API。

## 四套主题

主题会影响页面排版、信息密度、控件、材质和动效。两站共用主题选择与偏好规则，针对各自内容布局分别实现。

| 主题                       | 主站                                 | Next                                         |
| -------------------------- | ------------------------------------ | -------------------------------------------- |
| 原生简约（Native Minimal） | 标题与正文优先，最近动态采用单栏阅读 | 宽幅写真、对齐图集与简洁换照控件             |
| Material 3                 | 色调分区、模块化阅读与日程容器       | 写真和动态分组，默认图集，多栏图片按比例排列 |
| Fluent 2                   | 分组命令、阅读流旁的作者与日程区域   | 照片与操作并排，默认列表和预览               |
| Carbon                     | 紧凑方角索引、边线与等宽元信息       | 并列照片、记录列表与预览                     |

显示设置支持亮色或暗色、标准或大字号、完整或减弱动效，并保存用户选择。界面语言包括简体中文、繁体中文、英语和日语。显式选择的浏览视图会保留在 URL 中，切换主题时继续沿用。

主题默认值、旧偏好迁移和设计参考见[外观主题说明](docs/zh-CN/appearance-presets.md)。原生简约继续使用存储 ID `apple-native`。

## 本地开发

### 运行环境

| 工具    | 当前约定                                      |
| ------- | --------------------------------------------- |
| Node.js | `>=26.13.1 <27`；`mise.toml` 固定为 `26.13.1` |
| Bun     | 包管理器固定为 `1.4.4`，最低要求 `>=1.4.4`    |

已使用 mise 的环境，可在仓库目录运行 `mise install` 安装 [`mise.toml`](mise.toml) 指定的版本。`bun.lock` 是唯一依赖锁文件，安装时使用 Bun。

### 获取并启动

```bash
git clone --branch next https://github.com/domidoremi/hmrchan-frontend.git hmrchan-frontend-next
cd hmrchan-frontend-next
bun install --frozen-lockfile
```

首次配置时，将 [`.env.example`](.env.example) 复制为本地 `.env.development`：

```powershell
Copy-Item -LiteralPath .env.example -Destination .env.development
```

Bash 或 Zsh 可使用 `cp .env.example .env.development`。然后启动：

```bash
bun run dev
```

默认地址为 `http://127.0.0.1:5173`，端口被占用时会顺延，以终端输出为准。需要固定端口时使用 `bun run dev -- --port 5181`；显式指定的端口必须可用。两站并行开发时使用不同端口。

### 连接后端

浏览器使用同源 `/api` 和 `/ws`。开发代理默认连接本机 `http://127.0.0.1:8000`，可通过本地开发配置中的 `VITE_API_BASE_URL` 指向其他开发上游。

完整联调需要单独启动[配套后端](https://github.com/domidoremi/hmrchan-backend)，并具备相应仓库和服务的访问权限。默认本机上游不可达时，开发脚本会尝试连接已运行的 Docker 后端容器；该桥接不会代替后端服务的启动。

只查看界面时，可在本地 `.env.development.local` 中设置 `LOCAL_API_AUTO_BRIDGE=false` 跳过桥接。公共内容快照只覆盖部分回退场景，不能提供完整的登录、收藏或发布功能；未覆盖的页面会呈现空状态或加载失败。

环境变量以 `.env.example` 为入口。本地凭据和机器专属配置不应提交到仓库。

## 架构与目录

| 层次       | 实现                                           |
| ---------- | ---------------------------------------------- |
| 页面与组件 | Vue 3、TypeScript、Vue Router                  |
| 状态与语言 | Pinia、Vue I18n                                |
| 构建与资源 | Vite、自定义 Service Worker 构建插件           |
| 动效与滚动 | GSAP、Motion for Vue、Lenis，以及页面交互逻辑  |
| 边缘运行   | Cloudflare Pages、Pages Functions、内部 Worker |
| 质量检查   | Vitest、ESLint、Prettier、Knip 与项目审计脚本  |

```text
src/features/journal/    站点外壳、页面组合、内容适配与交互
  editions/             章节阅读、写真集合、月历等页面实现
  runtime/              动效、滚动与浏览器生命周期
  styles/               站点布局和主题表现
src/views/              账号、联系等路由页面与业务逻辑
src/components/         可复用组件
src/composables/        可复用状态与交互
src/api/                API 类型、请求与服务适配
src/stores/             跨页面状态
src/config/             版本、主题、语言与导航配置
src/styles/             样式入口、基础规则与主题令牌
functions/              Pages Functions 同源转发
workers/                内部 API Worker
build/                  Vite 配置与构建插件
scripts/                开发、检查、构建与发布工具
public/                 静态资源、PWA 文件与公共快照
docs/                   中英文开发与验收文档
```

[`src/config/designEdition.ts`](src/config/designEdition.ts) 区分 `editorial` 与 `archive` 版本；[`src/config/appearance.ts`](src/config/appearance.ts) 管理主题及默认浏览方式。API 与状态层提供数据，页面组件负责内容呈现和交互。

[`src/styles/index.css`](src/styles/index.css) 是应用样式入口，跨组件布局与主题规则归入对应样式层。浏览器请求由开发代理或边缘层连接后端；HTTP、内存、IndexedDB 和 Service Worker 分担缓存职责。详细边界见[前端架构](docs/zh-CN/architecture.md)。

## 验证与发布

### 常用检查

| 命令                           | 用途                                     |
| ------------------------------ | ---------------------------------------- |
| `bun run type-check`           | 检查应用、Pages Functions 与 Worker 类型 |
| `bun run lint:strict`          | 严格 lint 与注释语言检查                 |
| `bun run format:check`         | 检查 `src/` 格式                         |
| `bun run test:unit`            | 串行执行单元测试                         |
| `bun run build`                | 生成 `dist/` 构建产物                    |
| `bun run build:security-check` | 检查生产构建安全约束                     |
| `bun run check:bundle-budget`  | 检查资源体积预算                         |
| `bun run audit:docs`           | 检查文档中的受限地址与本机路径           |
| `bun run audit:deps`           | 审计依赖漏洞                             |

`bun run preview` 用于本地预览构建产物。涉及 Pages Functions、Worker 和后端的联调，需要使用[发布验证文档](docs/zh-CN/validation.md)规定的环境。

### 发布流程

两站通过各自的 Cloudflare Pages Git 集成发布：主站跟随 `main`，Next 跟随 `next`。构建入口为 `bun run build`，输出目录为 `dist/`，边缘配置见本分支的 [`wrangler.toml`](wrangler.toml)。

| 命令                                    | 验证范围                                 |
| --------------------------------------- | ---------------------------------------- |
| `bun run validate:release:prepush:full` | 完整静态门禁、单测、构建、安全与资源预算 |
| `bun run validate:release:local`        | 静态门禁与本地浏览器检查                 |
| `bun run validate:release:candidate`    | 本地检查、受控站点检查与生产预检         |
| `bun run validate:release:production`   | 候选阶段检查与部署后的生产深回归         |

`local` 和 `candidate` 不能替代部署后的验证，仍缺少生产证据时结果为 `incomplete`。完整发布验收要求 `production` 报告为 `passed`；构建成功、自动部署成功或公开页面抽查均不能单独证明这一点。

浏览器门禁需要 Docker、本地后端和兼容 Pages 的预览环境；受控与生产检查还需要指定目标、专用账号和相应人工邮箱步骤。每次运行的证据保存在未跟踪的 `output/validation/` 中。输入要求、阶段合同和失败处理见[发布验证](docs/zh-CN/validation.md)。

## 更多文档

- [外观主题与偏好迁移](docs/zh-CN/appearance-presets.md)
- [前端架构与 API 边界](docs/zh-CN/architecture.md)
- [技术栈版本与升级策略](docs/zh-CN/stack-policy.md)
- [发布验证](docs/zh-CN/validation.md)
- [UI/UX 验收记录](docs/zh-CN/uiux-acceptance.md)

## 许可与内容

仓库未声明公开分发许可证。照片、原帖和其他媒体内容的权利归原作者或相应权利方所有。
