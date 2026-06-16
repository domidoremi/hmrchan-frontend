# HmrChan Frontend

> 仓库 README 仅记录本项目的本地运行、边界和验收入口。

HmrChan Frontend 是基于 Vue 3、TypeScript 和 Vite 的前端仓库。运行时部署到 Cloudflare Pages + Functions，同源 `/api` façade 是浏览器侧默认后端入口；PWA、国际化、移动端布局和账号安全流程属于当前仓库维护边界。

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

必需环境：

- Node.js `>=24.11.1 <25`
- Bun `1.3.14`

本地启动：

```bash
bun install
cp .env.example .env.development
bun run dev
```

默认开发地址：`http://127.0.0.1:5173`。

`bun run dev` 在检测到 `localhost:5173` 被其他应用占用时会失败。默认使用 `127.0.0.1` 可减少跨项目 dev server 串站，并避免 `__WS_TOKEN__ is not defined` 被误判为仓库缺陷。

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

脚本和环境变量的真相源：

- [package.json](package.json)
- [wrangler.toml](wrangler.toml)
- [.env.example](.env.example)

## 项目结构边界

- `src/views/`：页面级组件，只承接路由页面的交互、状态和展示编排。
- `src/hmr/`：MomiChan 前台业务域，包含业务组件、组合函数、运行时预热和品牌样式。
- `src/api/`：浏览器侧 API façade。`client.ts` 负责统一请求、安全头、错误解析和响应 envelope；`hmrContent.ts` 承接站点内容聚合、fallback 数据映射和页面资源 loader；`authService.ts`、`twoFactorService.ts`、`favoriteService.ts`、`historyService.ts`、`deviceService.ts`、`homeService.ts` 是 release contract audit 覆盖的接口边界文件，不应仅因页面未直接导入就删除。
- `src/stores/`：Pinia 状态，只放跨页面共享状态；页面局部筛选、临时表单和展示状态优先留在页面或 composable。
- `src/utils/`：通用工具和缓存能力，不放页面文案或业务流程。
- `functions/`、`workers/`：Cloudflare Pages Functions / Workers 边缘层，负责同源 `/api` façade、上传兼容路径、内部 API gateway 和安全响应头。
- `build/vite/plugins/`：构建期插件。新增构建逻辑优先放这里，再由 `vite.config.ts` 装配。
- `public/`：Cloudflare Pages 直接输出的静态资源。`src/hmr/styles/hmr-brand.css` 当前引用 `public/hmrchan/reference/v1` 字体与 `public/hmrchan/pets/tidyfox/v1` 精灵图；`public/hmrchan/reference` 根目录仍承载平台 SVG fallback，且部分字体与 `v1` 同 hash 复制；`public/hmrchan/pets/tidyfox/spritesheet.webp` 与 `v1/spritesheet.webp` 同 hash，属于兼容路径，删除前需要确认线上引用与缓存策略。

## 文档说明

- 验收流程位于 [VALIDATION.md](VALIDATION.md)。
- 本仓库不依赖 GitHub Actions，统一使用本地 `validate:release` runner。
- `docs/` 目录是本地资料区，不进入仓库提交；需要随仓库保留的文档必须放在已跟踪根级文档中。

## License

未声明开源许可证。仓库内容仅作为本项目管理资料维护。
