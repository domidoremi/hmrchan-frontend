# MomiChan

Momiyama Himeri (籾山ひめり / 籾山姫璃)

[简体中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

MomiChan is my personal fan site for Momiyama Himeri, developed and maintained by me.

- Collects public updates from YouTube, X, TikTok, SHOWROOM, and Instagram
- Includes content search, schedules, community, favorites, notifications, and account security
- Supports desktop, mobile, offline PWA use, and three interface languages
- Connects Cloudflare Pages Functions and backend services through same-origin `/api/v1`

## Technology Stack

| Layer        | Technology                                           |
| ------------ | ---------------------------------------------------- |
| Frontend     | Vue 3, TypeScript, Vite, Vue Router, Vue I18n        |
| State        | Pinia, pinia-plugin-persistedstate                   |
| Edge and PWA | Cloudflare Pages, Functions, Workers, Service Worker |
| Testing      | Vitest, Puppeteer, Lighthouse, ESLint, Prettier      |

## Architecture

```text
Browser (Vue SPA + PWA)
└── Same-origin /api/v1
    └── Cloudflare Pages Functions
        └── Internal API Gateway Worker
            └── Backend Services
```

| Path                      | Responsibility                   |
| ------------------------- | -------------------------------- |
| `src/views/`, `src/hmr/`  | Pages and domain UI              |
| `src/api/`, `src/stores/` | API access and shared state      |
| `functions/`, `src/edge/` | Same-origin facade and edge HTML |
| `workers/internal-api/`   | Internal backend gateway         |

## Run

- Node.js `>=24.11.1 <25`
- Bun `1.3.14`

```bash
bun install --frozen-lockfile
bun run dev
```

Local URL: `http://127.0.0.1:5173`

## Commands

```bash
bun run type-check
bun run lint:strict
bun run test:unit
bun run validate:release:prepush
bun run build
```

Configuration: [`.env.example`](.env.example) · [`wrangler.toml`](wrangler.toml)

Validation: [`VALIDATION.md`](VALIDATION.md)
