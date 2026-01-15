# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vue 3 frontend for a content platform (hmrchan/momichan) with posts, authors, comments, and community features. Uses Composition API with `<script setup>`, TypeScript, and Pinia for state management.

## Commands

```bash
# Development
bun run dev              # Start dev server (port 5173)
bun run build            # Type-check + production build
bun run preview          # Preview production build

# Testing
bun run test:unit        # Run tests once
bun run test:unit:watch  # Run tests in watch mode

# Code Quality
bun run lint             # ESLint with auto-fix
bun run format           # Prettier format src/
bun run type-check       # TypeScript check only

# Performance Analysis
bun run build:analyze    # Build + analyze bundle
bun run perf:lighthouse  # Lighthouse audit
```

## Architecture

### State Management (Pinia)
- `src/stores/auth.ts` - Authentication with JWT tokens, auto-refresh heartbeat
- `src/stores/theme.ts` - Theme (light/dark/auto) with system preference sync
- `src/stores/settings.ts` - User preferences (animations, locale)
- `src/stores/toast.ts` - Toast notification queue
- Persistence via `pinia-plugin-persistedstate`

### API Layer (`src/api/`)
- `client.ts` - Core HTTP client with automatic token refresh, request deduplication, and memory caching
- Service files export typed functions (e.g., `authService.login()`, `postService.getPost()`)
- All API calls go through `/api/v1/` proxy to `https://api.momichan.xyz`

### Routing
- `src/router/index.ts` - All routes with lazy-loaded components
- Route guards handle `requiresAuth` and `guestOnly` meta flags
- Pages cached via `<KeepAlive>` in App.vue

### Internationalization
- Supports `en`, `zh-CN`, `ja` with lazy-loaded locale files
- `src/i18n/locales/*.json` - Translation strings
- Use `$t('key')` in templates, `t('key')` from `useI18n()` in scripts

### Component Organization
```
src/components/
├── ui/          # Reusable UI primitives (Button, Toast, Modal)
├── layout/      # App shell (Navbar, Footer, SettingsPanel)
├── business/    # Domain components (PostCard, SearchBar)
├── comment/     # Comment system components
├── community/   # Discussion/community features
└── profile/     # User profile tabs
```

### Styling
- CSS custom properties for theming (`src/styles/tokens.css`, `design-tokens.css`)
- Glass morphism effects in `glass.css`
- Import order: tokens -> design-tokens -> base -> glass -> animations -> utilities

## Key Conventions

- Vue features: `defineModel`, `propsDestructure` enabled
- Path alias: `@/` maps to `src/`
- API responses use snake_case, TypeScript uses camelCase (types in `src/types/index.ts`)
- Composables in `src/composables/` (e.g., `useInfiniteScroll`, `useMasonryColumns`)
- Icons from `lucide-vue-next`
- Animations via GSAP (lazy-loaded)

## Build Configuration

- Uses `rolldown-vite` (Vite with Rolldown bundler)
- Target: `esnext` (modern browsers only)
- Production: console/debugger stripped, aggressive minification
- Code splitting: Vue runtime, router, Pinia, i18n, icons as separate chunks
- Deploys to Cloudflare Pages (`_headers`, `_redirects` copied to dist)
