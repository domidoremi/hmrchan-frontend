# HmrChan Frontend

HmrChan Frontend 是本站的 Vue 应用，负责公开内容、社区、账号设置和 PWA 体验。生产流量由 Cloudflare Pages 提供，同源 `/api` 路径由 Pages Functions 转发。

HmrChan Frontend is the Vue application for the production site. It serves public content, community and account settings, with PWA support. Cloudflare Pages hosts the site, and Pages Functions forward same-origin `/api` traffic.

## Project Scope / 项目范围

| Area / 范围    | Implementation / 实现                          |
| -------------- | ---------------------------------------------- |
| UI / 界面      | Vue 3, TypeScript, Pinia, Vue Router, Vue I18n |
| Build / 构建   | Vite, Bun                                      |
| Edge / 边缘层  | Cloudflare Pages Functions                     |
| Quality / 质量 | Vitest, ESLint, Prettier, Knip                 |
| Offline / 离线 | Web App Manifest, Service Worker               |

## Repository Map / 仓库结构

- `src/`: application code and unit tests / 应用代码与单元测试
- `functions/`: same-origin Pages Functions / 同源边缘函数
- `workers/`: internal Cloudflare Worker / 内部 Cloudflare Worker
- `scripts/`: build, audit, and release gates / 构建、审计与发布门禁
- `public/`: deployed static assets / 发布用静态资源

## Verification / 验证

The repository uses Bun `1.3.11` and Node.js `>=24.15.0 <25`. The main local gates are:

仓库使用 Bun `1.3.11` 与 Node.js `>=24.15.0 <25`。主要本地门禁如下：

```bash
bun run type-check
bun run lint:strict
bun run test:unit
bun run build
bun run validate:release --mode hook --quiet
```

Release modes and required inputs are defined in [VALIDATION.md](VALIDATION.md). Architecture and language rules are defined in [docs/architecture.md](docs/architecture.md). Appearance sources are summarized in [docs/appearance-presets.md](docs/appearance-presets.md).

发布模式与必需输入见 [VALIDATION.md](VALIDATION.md)。架构及语言规则见 [docs/architecture.md](docs/architecture.md)。外观来源汇总见 [docs/appearance-presets.md](docs/appearance-presets.md)。

## License / 许可

No public distribution license is declared. Repository content is maintained for this project only.

仓库未声明公开分发许可证，内容仅用于本项目。
