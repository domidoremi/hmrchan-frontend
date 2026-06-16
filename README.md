# HmrChan Frontend

HmrChan Frontend 是基于 Vue 3、TypeScript 和 Vite 的前端仓库。仓库用于本项目的实现管理、交付验证和部署配置维护。运行环境为 Cloudflare Pages + Functions；生产 API 流量默认通过同源 `/api` facade 转发到后端，并保留 PWA、国际化与移动端运行支持。

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

如果本机其他服务占用 `localhost:5173`，使用 `127.0.0.1` 访问当前 dev server。`bun run dev` 检测到 `localhost` 被其他应用占用时会直接失败，避免 `__WS_TOKEN__ is not defined` 等串站误报。

## 常用脚本

```bash
bun run dev
bun run build
bun run preview
bun run type-check
bun run test:unit
bun run validate:release --mode local
```

脚本和环境变量来源：

- [package.json](/G:/Project/hmrchan/hmrchan-frontend-main/package.json)
- [wrangler.toml](/G:/Project/hmrchan/hmrchan-frontend-main/wrangler.toml)
- [.env.example](/G:/Project/hmrchan/hmrchan-frontend-main/.env.example)

## 文档说明

- 认证唯一正文位于 [../AUTHENTICATION.md](../AUTHENTICATION.md)
- 交付验证流程位于 [VALIDATION.md](/G:/Project/hmrchan/hmrchan-frontend-main/VALIDATION.md)
- 本仓库交付不再依赖 GitHub Actions，统一使用本地 `validate:release` runner
- 本仓库内的 `docs/` 目录继续维护非认证类文档

## License Policy

仓库未声明对外分发许可证。仓库内容仅作为本项目实现管理、交付验证和部署维护资料使用。
