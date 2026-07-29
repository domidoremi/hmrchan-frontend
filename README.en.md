<p align="center">
  <img src="public/icons/icon-192x192.png" width="128" height="128" alt="MomiChan" />
</p>

<h1 align="center">MomiChan</h1>

<p align="center"><strong>Momiyama Himeri</strong> (籾山ひめり / 籾山姫璃)</p>

<p align="center">
  <a href="README.md">简体中文</a> ·
  <a href="README.en.md"><strong>English</strong></a> ·
  <a href="README.ja.md">日本語</a>
</p>

<p align="center">
  <img alt="Vue 3" src="https://img.shields.io/badge/Vue_3-42b883?logo=vuedotjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646cff?logo=vite&logoColor=white" />
  <img alt="Cloudflare Pages" src="https://img.shields.io/badge/Cloudflare_Pages-f38020?logo=cloudflarepages&logoColor=white" />
  <img alt="Bun 1.3.14" src="https://img.shields.io/badge/Bun-1.3.14-14151a?logo=bun&logoColor=white" />
</p>

> A personal fan site for Momiyama Himeri, developed and maintained by me.

## ✨ Features

- Collects public updates from YouTube, X, TikTok, SHOWROOM, and Instagram
- Includes content search, schedules, community, favorites, notifications, and account security
- Supports desktop, mobile, offline PWA use, and three interface languages
- Connects Cloudflare Pages Functions and backend services through same-origin `/api/v1`

## 🧩 Technology Stack

| Layer        | Technology                                           |
| ------------ | ---------------------------------------------------- |
| Frontend     | Vue 3, TypeScript, Vite, Vue Router, Vue I18n        |
| State        | Pinia                                                |
| Edge and PWA | Cloudflare Pages, Functions, Workers, Service Worker |
| Testing      | Vitest, Puppeteer, Lighthouse, ESLint, Prettier      |

## 🏗️ Architecture

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

## 🚀 Run

- Node.js `>=24.11.1 <25`
- Bun `1.3.14`

```bash
bun install --frozen-lockfile
bun run dev
```

Local URL: `http://127.0.0.1:5173`

## 🧪 Validation

```bash
bun run type-check
bun run lint:strict
bun run test:unit
bun run validate:release:prepush
bun run build
```

Environment configuration: [`.env.example`](.env.example) · [`wrangler.toml`](wrangler.toml)

Complete validation guide: [`VALIDATION.en.md`](VALIDATION.en.md)
