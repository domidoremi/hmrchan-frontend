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
bun run validate:release --mode local
```

更多脚本和环境变量请查看：

- [package.json](/G:/Project/hmrchan/hmrchan-frontend-main/package.json)
- [wrangler.toml](/G:/Project/hmrchan/hmrchan-frontend-main/wrangler.toml)
- [.env.example](/G:/Project/hmrchan/hmrchan-frontend-main/.env.example)

## 文档说明

- 认证唯一正文位于 `G:\Project\hmrchan\AUTHENTICATION.md`
- 交付验证流程位于 [VALIDATION.md](/G:/Project/hmrchan/hmrchan-frontend-main/VALIDATION.md)
- 本仓库交付不再依赖 GitHub Actions，统一使用本地 `validate:release` runner
- 本仓库内的 `docs/` 目录继续维护非认证类文档

## License

本项目仅用于个人学习和技术交流。
