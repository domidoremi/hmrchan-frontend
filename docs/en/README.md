# MomiChan Next

[简体中文](../../README.md) · [English](README.md)

MomiChan Next is a fan site for Momiyama Himeri, with a photography-led home page, galleries, and list previews.

This is the `next` branch. For the main site, see [`main`](https://github.com/domidoremi/hmrchan-frontend/tree/main).

## Features

- Browse and search posts, photos, and videos.
- Author profiles, an event calendar, community discussions, and personal collections.
- Four themes: Native Minimal, Material 3, Fluent 2, and Carbon, with light and dark modes.
- Simplified Chinese, Traditional Chinese, English, and Japanese; adjustable text size, reduced motion, and PWA installation.

Built with Vue 3, TypeScript, Vite, and Pinia.

## Local development

Use Node.js 26.13.1 and Bun 1.4.4, as specified in [`mise.toml`](../../mise.toml).

```bash
git clone --branch next https://github.com/domidoremi/hmrchan-frontend.git hmrchan-frontend-next
cd hmrchan-frontend-next
bun install --frozen-lockfile
```

Copy [`.env.example`](../../.env.example) to `.env.development`. Start the [backend](https://github.com/domidoremi/hmrchan-backend) separately; the default address is `http://127.0.0.1:8000`. Set `VITE_API_BASE_URL` to use a different address.

```bash
bun run dev
```

Open the local address printed in the terminal.

## Commands

| Command               | Purpose                   |
| --------------------- | ------------------------- |
| `bun run type-check`  | Check types               |
| `bun run lint:strict` | Run lint checks           |
| `bun run test:unit`   | Run unit tests            |
| `bun run build`       | Build to `dist/`          |
| `bun run preview`     | Preview the build locally |

## Documentation

- [Architecture](architecture.md)
- [Themes and preferences](appearance-presets.md)
- [Validation and deployment](validation.md)

## About

An unofficial fan project, unaffiliated with the artist or her agency. Photographs and other media belong to their respective rights holders.
