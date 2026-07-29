# HmrChan Frontend

<p align="center">
  <a href="https://developers.cloudflare.com/pages/"><img alt="Cloudflare Pages" src="https://img.shields.io/badge/Deploy-Cloudflare_Pages-F38020?logo=cloudflare&logoColor=white"></a>
  <a href="validation.md"><img alt="Local release validation" src="https://img.shields.io/badge/Release-local_validation-2563EB?logo=checkmarx&logoColor=white"></a>
  <a href="https://bun.sh/docs"><img alt="Bun 1.3.11" src="https://img.shields.io/badge/Bun-1.3.11-000000?logo=bun&logoColor=white"></a>
</p>

<p align="center">
  <a href="../../README.md">简体中文</a> · <strong>English</strong>
</p>

HmrChan Frontend is the site's Vue application. It covers public content, community features, account settings, internationalization, and the PWA experience. Cloudflare Pages hosts the production site, while Pages Functions forward browser API requests through the same-origin `/api` path.

## Technology

### Application

[![Vue 3.6.0 beta.17](https://img.shields.io/badge/Vue-3.6.0--beta.17-42B883?logo=vuedotjs&logoColor=white)](https://vuejs.org/guide/)
[![TypeScript 6.0.3](https://img.shields.io/badge/TypeScript-6.0.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/docs/)
[![Vite 8.1.5](https://img.shields.io/badge/Vite-8.1.5-646CFF?logo=vite&logoColor=white)](https://vite.dev/guide/)
[![Pinia 4.0.2](https://img.shields.io/badge/Pinia-4.0.2-FFD859?logo=pinia&logoColor=111827)](https://pinia.vuejs.org/)
[![Vue Router 5.2.0](https://img.shields.io/badge/Vue_Router-5.2.0-42B883?logo=vuedotjs&logoColor=white)](https://router.vuejs.org/guide/)
[![Vue I18n 12.0.0 alpha.4](https://img.shields.io/badge/Vue_I18n-12.0.0--alpha.4-26A69A?logo=vuedotjs&logoColor=white)](https://vue-i18n.intlify.dev/guide/introduction.html)

### Platform and Quality

[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages_%2B_Functions-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/pages/)
[![Vitest 5.0.0 beta.7](https://img.shields.io/badge/Vitest-5.0.0--beta.7-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/guide/)
[![ESLint 10.8.0](https://img.shields.io/badge/ESLint-10.8.0-4B32C3?logo=eslint&logoColor=white)](https://eslint.org/docs/latest/)
[![Prettier 4.0.0 alpha.13](https://img.shields.io/badge/Prettier-4.0.0--alpha.13-F7B93E?logo=prettier&logoColor=111827)](https://prettier.io/docs/)
[![Knip 6.29.0](https://img.shields.io/badge/Knip-6.29.0-EA580C)](https://knip.dev/overview/getting-started)

## Scope

| Area                  | Responsibility                                                  |
| --------------------- | --------------------------------------------------------------- |
| Public experience     | Routed content, responsive layouts, and appearance presets      |
| Community and account | Community views, authentication flows, and account settings     |
| Browser integration   | Same-origin API facade, request integrity, and persisted state  |
| PWA                   | Web App Manifest, service worker, and offline fallback          |
| Edge                  | Cloudflare Pages Functions and the internal Worker              |
| Delivery              | Local release gates, dependency audits, and build output checks |

## Repository Map

```text
src/                 Vue application, stores, API boundaries, and unit tests
functions/           Same-origin Cloudflare Pages Functions
workers/             Internal Cloudflare Worker
build/               Vite build plugins
scripts/             Build, audit, maintenance, and release gates
public/              Static assets and PWA resources
docs/zh-CN/          Simplified Chinese documentation
docs/en/             English documentation
```

`src/views/` owns routed page composition. Reusable UI and interactions live in `src/components/` and `src/composables/`; browser integration boundaries stay in `src/api/` and `src/services/`; cross-page Pinia state belongs in `src/stores/`.

## Requirements

| Tool                                                 | Supported version |
| ---------------------------------------------------- | ----------------- |
| [Bun](https://bun.sh/docs)                           | `1.3.11`          |
| [Node.js](https://nodejs.org/docs/latest-v24.x/api/) | `>=24.14.0 <25`   |

`bun.lock` is the authoritative dependency lockfile. Do not mix npm, pnpm, or Yarn with this repository.

## Quick Start

```bash
bun install
cp .env.example .env.development
bun run dev
```

The development server starts at `http://127.0.0.1:5173` by default. To require another fixed port, run `bun run dev -- --port <port>`.

## Commands

| Command                          | Purpose                                        |
| -------------------------------- | ---------------------------------------------- |
| `bun run dev`                    | Start the local development server             |
| `bun run type-check`             | Check application, Functions, and Worker types |
| `bun run lint:strict`            | Run strict lint and comment-language checks    |
| `bun run test:unit`              | Run unit tests serially                        |
| `bun run build`                  | Create the production build                    |
| `bun run build:security-check`   | Inspect generated build output                 |
| `bun run audit:deps`             | Audit dependency vulnerabilities               |
| `bun run validate:release:local` | Run the local release workflow                 |

Release modes, evidence requirements, and production checks are defined in the [release validation guide](validation.md).

## Configuration

- Use `.env.example` as the environment-variable contract
- Browser requests use the same-origin `/api` facade by default
- Edge deployment settings are maintained in `wrangler.toml`
- Never commit local secrets or machine-specific paths

## Documentation

- [Release validation](validation.md)
- [Frontend architecture](architecture.md)
- [Appearance presets](appearance-presets.md)
- [简体中文文档](../../README.md)

## License

No public distribution license is declared. Repository content is maintained for this project only.
