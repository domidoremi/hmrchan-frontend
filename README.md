# HmrChan Frontend

> 仅供学习与交流使用。

HmrChan Frontend 是一个基于 Vue 3、TypeScript 和 Vite 的社区前端项目，面向内容浏览、搜索、互动、账号与安全管理等场景。项目运行在 Cloudflare Pages + Functions 上，生产环境默认通过同源 `/api` façade 与后端通信，并包含 PWA、国际化与移动端体验支持。

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

环境要求：

- Node.js `>=24.11.1 <25`
- Bun `1.3.11`

安装与启动：

```bash
bun install
cp .env.example .env.development
bun run dev
```

默认开发地址：`http://127.0.0.1:5173`

如果本机还有别的框架也占用 `localhost:5173`，请优先使用 `127.0.0.1`。本仓库的 `bun run dev` 现在会在检测到 `localhost` 被其他应用占用时直接报错，避免出现 `__WS_TOKEN__ is not defined` 这类串站假故障。

## 常用脚本

```bash
bun run dev
bun run build
bun run preview
bun run type-check
bun run test:unit
bun run audit:light
bun run audit:list
bun run validate:release --mode local
```

更多脚本和环境变量请查看：

- [package.json](/G:/Project/hmrchan/hmrchan-frontend/package.json)
- [wrangler.toml](/G:/Project/hmrchan/hmrchan-frontend/wrangler.toml)
- [.env.example](/G:/Project/hmrchan/hmrchan-frontend/.env.example)

## 项目结构边界

- `src/views/`：页面级组件，只承接路由页面的交互、状态和展示编排。
- `src/hmr/`：MomiChan 前台业务域，包含业务组件、组合函数、运行时预热和品牌样式。
- `src/api/`：浏览器侧 API façade。`client.ts` 负责统一请求、安全头、错误解析和响应 envelope；`hmrContent.ts` 当前集中承接公开内容聚合、fallback 数据映射和页面资源 loader；`authService.ts`、`twoFactorService.ts`、`favoriteService.ts`、`historyService.ts`、`deviceService.ts`、`homeService.ts` 是 release contract audit 覆盖的接口边界文件，不应仅因页面未直接导入就删除。
- `src/stores/`：Pinia 状态，只放跨页面共享状态；页面局部筛选、临时表单和展示状态优先留在页面或 composable。
- `src/utils/`：通用工具和缓存能力，不放页面文案或业务流程。
- `functions/`、`workers/`：Cloudflare Pages Functions / Workers 边缘层，负责同源 `/api` façade、上传兼容路径、内部 API gateway 和安全响应头。
- `build/vite/plugins/`：构建期插件。新增构建逻辑优先放这里，再由 `vite.config.ts` 装配。
- `public/`：直接发布的静态资源。`src/hmr/styles/hmr-brand.css` 当前引用 `public/hmrchan/reference/v1` 字体与 `public/hmrchan/pets/tidyfox/v1` 精灵图；`public/hmrchan/reference` 根目录仍承载平台 SVG fallback，且部分字体与 `v1` 同 hash 复制；`public/hmrchan/pets/tidyfox/spritesheet.webp` 与 `v1/spritesheet.webp` 同 hash，属于兼容路径，删除前需要确认线上引用与缓存策略。

## 文档说明

- 认证唯一正文位于 `G:\Project\hmrchan\AUTHENTICATION.md`
- 交付验证流程位于 [VALIDATION.md](/G:/Project/hmrchan/hmrchan-frontend/VALIDATION.md)
- 本仓库交付不再依赖 GitHub Actions，统一使用本地 `validate:release` runner
- `docs/` 目录为本地资料区，不进入仓库提交；交付文档保留在已跟踪的根级文档中

## License

本项目仅用于个人学习和技术交流。
