# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

A Vue 3 + TypeScript frontend for a media/social community platform (image/video aggregation), deployed on Cloudflare Pages with API proxy via Pages Functions.

## Commands

```bash
# Development
bun run dev              # Start dev server at http://localhost:5173
bun run build            # Production build (runs type-check first)
bun run preview          # Preview production build

# Code Quality
bun run lint             # ESLint check with auto-fix
bun run format           # Prettier format src/
bun run type-check       # TypeScript type checking

# Testing
bun run test:unit        # Run unit tests (Vitest)
bun run test:unit:watch  # Watch mode for tests

# Single test file
bunx vitest run src/composables/__tests__/useMasonryColumns.spec.ts
```

## Architecture

### Directory Structure

- `src/api/` - API service layer with typed request/response interfaces. Each service (e.g., `postService.ts`, `authService.ts`) wraps `apiClient` from `client.ts`
- `src/components/` - Vue components organized by type: `business/`, `layout/`, `ui/`, `animation/`, `comment/`, `community/`, `profile/`, `icons/`
- `src/composables/` - Reusable composition functions (Vue 3 composables). Named `use*.ts`
- `src/stores/` - Pinia stores with persistence plugin. Export from `index.ts`
- `src/views/` - Page-level components mapped to routes
- `src/layouts/` - Layout wrappers (e.g., `ProfileLayout.vue`, `CommunityLayout.vue`)
- `src/i18n/locales/` - i18n translation files (zh-CN, zh-TW, en, ja)
- `src/types/` - Shared TypeScript type definitions
- `src/utils/` - Utility functions including caching (`utils/cache/`), notifications, performance monitoring
- `functions/` - Cloudflare Pages Functions for API proxy (`/api/*` → backend)

### Key Patterns

**API Layer**: Services use `apiClient` which handles token refresh, error handling, and request deduplication. Services export typed request/response interfaces.

```typescript
// Example pattern in src/api/
export const myService = {
  getItems: (params: GetItemsParams) =>
    apiClient.get<PaginatedApiResponse<Item>>('/items', { params }),
}
```

**Composables**: Follow `use*` naming convention, return reactive refs and functions:

```typescript
// Example pattern in src/composables/
export function useSomething(options?: Options) {
  const state = ref<State>()
  // ...logic
  return { state, doSomething }
}
```

**Stores**: Use Pinia with `pinia-plugin-persistedstate`. Define with `defineStore`, export from `stores/index.ts`:

```typescript
export const useMyStore = defineStore(
  'myStore',
  () => {
    const data = ref<Data>()
    return { data }
  },
  { persist: true }
)
```

**Components**: Use `<script setup lang="ts">` syntax. Props destructuring and `defineModel` are enabled.

### Route Meta

Routes can specify meta fields: `title` (i18n key), `requiresAuth`, `guestOnly`, `showFooter`.

## Code Style

- No semicolons
- Single quotes
- 100 character line width
- Trailing commas (ES5 style)
- LF line endings
- Vue components: multi-word names required (except common UI components like Button, Input, Card)

## Testing

Tests use Vitest with jsdom environment. Test files go in `__tests__/` directories adjacent to source files, named `*.spec.ts`.

```typescript
import { describe, it, expect } from 'vitest'

describe('featureName', () => {
  it('should do something', () => {
    expect(result).toBe(expected)
  })
})
```

Global test setup in `vitest.setup.ts` mocks external dependencies like `lottie-web`.

## Environment Variables

Prefix with `VITE_` for client-side access. Key variables:

- `VITE_API_BASE_URL` - Backend API base URL
- `VITE_API_ENDPOINT` - Full API endpoint path
- `VITE_API_URL` - API proxy path (default `/api`)

Production environment variables are configured in `wrangler.toml` and Cloudflare Dashboard.

## Cloudflare Integration

- API proxy via Pages Functions in `functions/api/[[path]].ts`
- Deployment: `bunx wrangler pages deploy dist`
- Configuration in `wrangler.toml`
