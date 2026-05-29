# Frontend Analysis And Optimization

## Project Overview

- Project type: Vue single-page application for HMRChan public content, member account flows, profile center, settings, contact, and community pages.
- Runtime boundary: browser SPA with API facade access through `src/api/client.ts`; local preview and fallback content paths must remain available when API fallback mode is active.
- Primary route surface: home, explore, community, schedule, settings, auth entry, auth callback, passkey recovery, profile sections, static content pages, post detail, and not-found.
- Delivery constraint: public content must remain viewable without authentication; profile sections and authenticated account data must require session resolution before private data is loaded.

## Technology Stack Analysis

- Package manager: Bun is declared through `packageManager: bun@1.3.11`.
- Runtime engine: Node `>=24.11.1 <25`.
- Framework: Vue `3.6.0-beta.10`, Vue Router `5.0.6`, Pinia `3.0.4`, Vue I18n `11.4.0`.
- Build toolchain: Vite `8.0.10`, TypeScript `6.0.3`, Vue TSC `3.2.7`, ESLint `10.2.1`, Prettier `3.8.3`.
- Test stack: Vitest `4.1.5`, Vue Test Utils, jsdom, Istanbul coverage provider.
- Visual/runtime libraries: GSAP, Lenis, Lucide Vue, DOMPurify, FingerprintJS.
- Security and release tooling: build security check, repo audit, dependency audit, release validation modes, Lighthouse and production regression scripts.

## Directory Structure Analysis

- `src/api`: API client, security client, feature services, HMR content facade, content mappers, resource metadata, platform helpers, profile content aggregation, fallback data, and content types.
- `src/hmr/components`: reusable HMR-specific UI components such as post cards and page-state blocks.
- `src/hmr/composables`: page and domain orchestration composables for auth, content resources, shell navigation, settings, profile, schedule, explore, community, contact, and view modes.
- `src/hmr/runtime`: runtime-only helpers for route warmup, home prewarm, media image URLs, platform visuals, and home media.
- `src/router`: route declarations, auth target sanitization, route guards, document head synchronization, redirect normalization, and router entry.
- `src/stores`: Pinia stores for auth, preferences, and theme.
- `src/views`: route-level Vue views. Current optimization moves non-trivial orchestration out of views into composables and API mapper modules.
- `src/styles`: layered CSS entrypoint rules are governed by `docs/css-architecture.md`; styles must enter through `src/styles/index.css`.
- `scripts`: release, build, validation, audit, Lighthouse, E2E, accessibility, performance, sitemap, icon, screenshot, and fallback-refresh automation.

## Core Functional Module Analysis

- Public content modules: home, explore, community, schedule, post detail, about, join, contact, and support content.
- Member modules: login, registration, Google auth callback, passkey recovery, profile sections, settings, security status, inbox, favorites, history, and preferences.
- Content lifecycle: public pages use cached public content resources; private pages and authenticated settings use private resource controllers.
- API compatibility: `@/api/hmrContent` remains the compatibility facade while internal logic is split across typed modules.
- Data mapping: API payloads are normalized through mapper utilities before reaching views; post, author, community item, media item, profile, settings, and support shapes are isolated from raw backend aliases.

## Component Design Analysis

- Views must remain route composition surfaces. Business orchestration belongs in `src/hmr/composables` or `src/api`.
- Reusable page resource state is centralized through `useHmrContentResourceController`, `useHmrPublicContentResource`, and `useHmrPrivateContentResource`.
- Shell navigation is centralized in `useHmrShellNavigation`; shell animation timing remains in `HmrSiteShell.vue`.
- `HmrPostCard` owns post-card rendering and supports image loading/fetch priority props for first-viewport performance.
- Page-specific state modules exist for Home, Explore, Community, Schedule, PostDetail, Profile, Settings, Contact, auth entry, auth callback, passkey recovery, About, and Join content.

## Routing And Permission Analysis

- Route declarations live in `src/router/routes.ts`.
- Guard logic lives in `src/router/guards.ts` and must call `auth.resolveSession()` before evaluating protected route access.
- `requiresAuth` currently protects profile routes. Settings stays public as a local settings shell and must not fetch private settings for guests.
- Auth redirect inputs must pass through `authTargets.ts`; external URLs, protocol-relative URLs, and nested auth-loop redirects must resolve to safe same-origin targets.
- Google login start and callback redirects now use post-auth redirect sanitization through `resolvePostAuthRedirectTarget`.
- Public detail routes with invalid contract resource ids, including `hmr-post-detail`, must route to not-found before loading pages or calling APIs.

## Data Request And State Management

- `apiClient` owns request normalization, security headers, CSRF, challenge, client contract, and response envelope handling.
- `hmrContentResources.ts` owns endpoint result metadata, fallback source marking, API error classification, and async resource construction.
- `hmrContentMappers.ts` owns raw payload normalization and cross-platform post dedupe.
- `hmrProfileContent.ts` owns profile section endpoint mapping and settings/support content aggregation.
- `useAuthStore` owns session state, login, register, logout, Google exchange, passkey recovery, and local preview session behavior.
- `useThemeStore` owns theme persistence and system theme resolution.
- `usePreferencesStore` owns normalized preference persistence after removed animation preferences.

## Performance Optimization Analysis

- Public content resources can read available cache before refresh and write through `readPublicContent`.
- Route warmup and home prewarm are isolated in runtime helpers.
- `HmrSiteShell` now loads GSAP through a dynamic import only when the first-session preloader actually runs; steady-state route visits do not pull the 69 KB GSAP chunk into the initial shell path.
- Priority route warmup now runs during idle time instead of starting immediately with shell mount or route changes.
- Session-entry warmup can disable route chunk and home bootstrap preloads for the first-session preloader, keeping entry work focused on service worker registration, current route content, and session resolution.
- The performance script audits steady-state page rendering with `skipPreloader=1`, so Lighthouse tracks the application surface instead of the deliberate first-session cinematic preloader.
- Static prerender now emits a home-only lightweight media shell and high-priority preload for the generated `STATIC_HOME_PRERENDER_IMAGE`, giving the initial HTML the same versioned snapshot hero image used by the first Home render without coupling production build to live content APIs.
- Home loads `/home/featured` as the primary first-viewport resource, defers full home aggregation to idle time, and preserves the first-viewport featured/story deck during the full refresh to avoid replacing the LCP candidate.
- Home hero media is excluded from the generic in-view reveal observer so the LCP image is not held behind an opacity/transform entrance animation.
- Post card images support explicit eager/lazy and fetch priority control; Explore now marks the first two visible catalog thumbnails as `eager` and `high` priority while keeping later thumbnails lazy.
- Brand sprites now use `static-spritesheet.webp` for static shell/footer frames and defer the full animated atlas until the first-session preloader or direct brand interaction. This reduces the steady-state first-load pet sprite request from 1,864,304 bytes to 89,592 bytes while preserving animated playback when it is actually used.
- Explore defers below-the-fold cinema and author sections until idle time so initial render prioritizes the searchable catalog and first-viewport thumbnails.
- Explore renders a compact initial catalog set before idle expansion, preserving the full filtered result set while reducing first-render card DOM.
- Media helpers centralize thumbnail quality and srcset construction.
- Platform visual metadata is centralized to avoid repeated page-local maps.
- Validation must prefer scoped tests under low memory; full build, browser health, E2E, Lighthouse, and release validation must run one phase at a time when memory headroom is adequate.
- `test:perf` resets its Lighthouse Chrome and launcher profiles before every run, supports `PERF_TEST_ONLY=<name>` for low-memory targeted reruns, defaults static preview audits to API fallback content, and prints a preview API surface diagnostic for `/api/v1/home/featured`. This prevents stale IndexedDB, CacheStorage, service worker state, Vite SPA HTML fallback responses, or preview-only auth bootstrap failures from being mistaken for live API-backed LCP evidence.

## Engineering Standards Analysis

- Type gate: `bun run type-check`.
- Unit test gate: `bun run test:unit -- <target specs>` for scoped validation; full unit suite remains required before release.
- Lint gate: `node node_modules/eslint/bin/eslint.js <target files>` for scoped validation; `lint:strict` remains the broad no-warning gate.
- Whitespace gate: `git diff --check`.
- Release gates: `validate:release:*`, `check:release-evidence`, production regression, Lighthouse, accessibility, E2E, and performance scripts.
- CSS gate: `docs/css-architecture.md` requires a single style entrypoint, layered placement, scoped SFC defaults, and limited `:deep()` / `!important`.
- Frontend pattern audit blocks raw `fetchpriority` attributes outside audited media entry points, keeping image priority control limited to post cards, post detail media, and prerender image preload links.
- Frontend contract audit validates router, guard, route-name, and public-id entrypoints after router/auth module splitting.
- GitNexus gate: impact analysis is required before editing indexed symbols; `detect_changes` is required before commit.

## Security Analysis

- Redirect control: auth targets reject external, protocol-relative, and nested auth-entry loop redirects.
- Session control: route guard resolves session before protected route access.
- API security: client handles CSRF, request integrity, client contract version, challenge retry, and API error envelope handling.
- Content safety: DOMPurify is available in dependencies; user-generated HTML usage must route through sanitized rendering paths.
- Cache safety: settings cache clear targets public content cache and must not clear login state or local account data.
- Preview safety: preview auth mode is limited to development mode and local storage/query flags.

## Project Advantages

- API facade compatibility is preserved while implementation is split into typed, testable modules.
- Views are being reduced to route composition, with logic moved into composables and API mappers.
- Auth redirect handling is centralized and covered by route, view, composable, and store tests.
- Public/private resource lifecycles are explicit and reusable.
- Performance helpers for media, platform visuals, and prewarm reduce page-local duplication.
- Engineering scripts cover type checking, linting, release validation, audits, E2E, accessibility, performance, and Lighthouse.

## Existing Problems

- Current worktree is focused to 9 entries: 8 tracked performance-analysis changes plus 1 untracked static sprite asset. Final integration must still classify production code, tests, documentation, script, style, and generated asset changes before commit.
- GitNexus index was refreshed after the split modules stabilized, but the current index is 1 commit behind `HEAD` and keyword query is degraded because full-text indexes are missing. `detect_changes(scope=all)` remains usable for current impact evidence; refresh with `npx gitnexus analyze --force` when memory headroom is acceptable.
- Local browser health, E2E smoke, Lighthouse performance audit, and production regression preflight now pass. Full production deep regression has not been rerun after all current changes because it is a headed, production-facing flow that can require human checkpoint assistance.
- Lighthouse steady-state performance improved from the pre-optimization low scores of home 56, explore 55, and search 61 to the latest full-route record of home 65, explore 75, and search 91. The clean-profile Home-only rerun before snapshot hero alignment recorded home 64, FCP 900 ms, LCP 4429 ms, TBT 936 ms, CLS 0, Speed Index 2177 ms, and main-thread work 4051 ms. The proxy-disabled Home-only rerun after snapshot hero alignment recorded simulated home performance 55, FCP 2146 ms, LCP 13996 ms, TBT 733 ms, CLS 0.000571, Speed Index 2327 ms, and main-thread work 3269 ms. The same report recorded observed LCP 1036 ms, observed FCP 424 ms, passing LCP discovery checks for `fetchpriority=high`, initial-document discoverability, and eager loading, and identified `/hmrchan/pets/isle/v1/spritesheet.webp` as a 1,864,594-byte first-load payload before the static sprite split.
- Vite preview with `VITE_DISABLE_PREVIEW_PROXY=true` returns `404` with an empty body for `/api/v1/home/featured` during static `test:perf`. Therefore API-path status alone is not valid evidence of a live JSON upstream during performance runs; response content type, body class, service worker state, browser cache state, and fallback-mode flags must be recorded with Lighthouse evidence. `test:perf` now also forces `VITE_HMRCHAN_ENABLE_API=false` and `VITE_HMRCHAN_FORCE_FALLBACK=true` by default so static preview Lighthouse runs do not issue `/auth/session:resolve` and then trigger `/api/v1/client/init` retries against a non-proxied preview server.
- `hmrContent.ts` still carries the compatibility facade burden and must be kept stable until imports fully migrate or a migration plan is accepted.
- Settings is intentionally public, but its use of private-resource naming can confuse future maintainers unless the guest-ready behavior remains documented and tested.
- New API mapper modules need continued tests as backend payload aliases evolve.

## Optimization Recommendations

- Complete a worktree classification pass before commit: production code, tests, docs, performance script changes, style changes, and the generated static sprite asset must be separated.
- Add final release evidence before commit: refresh full unit, lint strictness, production build, build security check, release validation, E2E smoke, Lighthouse, production preflight, and production deep regression when the headed production checklist can be completed.
- Keep GitNexus indexes current after further split-module changes so impact analysis continues to cover new module names; rebuild the degraded full-text index when memory headroom is restored.
- Keep `@/api/hmrContent` as a stable facade until all consumers can be migrated in a single documented step.
- Extend mapper tests for backend aliases whenever API contracts add new fields.
- Keep the versioned Home snapshot manifest refreshed through `bun run fallbacks:refresh`; the production build must consume the generated manifest and must not fetch live API data during build.
- Keep the performance script API diagnostic enabled for preview runs so `/api/*` HTML fallback, service worker cache, and real JSON upstream responses are distinguishable in future evidence.
- Keep shell brand sprites on the static strip by default; only preloader playback and explicit brand interaction may enable the full animated atlas on first load.
- Keep `test:perf` in fallback mode unless a run explicitly opts into live API evidence. Proxy-disabled static performance runs must not perform auth session resolution or client-init bootstrap requests.
- Keep public settings behavior explicit: guests may use local settings and cache cleanup, but private settings refresh must require authentication.
- Preserve low-memory validation policy: prefer serial scoped validation during implementation, then run full gates only when memory headroom is acceptable.

## Acceptance Evidence

- API content tests passed for `hmrContent`, mapper, platform, resource, utility, and profile-content contracts: 6 files, 29 tests.
- Routing and auth tests passed for guards, auth targets, auth entry, auth callback flow, login, register, auth callback page, and auth store: 8 files, 34 tests.
- Runtime helper tests passed for route warmup, home prewarm, media images, and platform visuals: 4 files, 12 tests.
- Resource lifecycle composable tests passed for content controller, public resource, private resource, and route refresh helpers: 4 files, 14 tests.
- Page and shell composable tests passed for About, Community, Contact, Explore, Home, Join, Passkey Recovery, Post Detail, Profile, Schedule, Settings, Shell Navigation, Auth Display, Current Time, and View Mode: 15 files, 49 tests. Explore composable coverage now includes idle-time below-the-fold section deferral and compact initial catalog rendering.
- Router and document-head tests passed for auth targets, route guards, and client head synchronization: 3 files, 17 tests.
- Component and view tests passed for post cards and the modified route pages: 17 files, 39 tests; Explore now includes targeted first-viewport thumbnail priority, below-the-fold deferral, and compact initial catalog regressions, and Settings now includes a page-level guest regression proving mounted guest settings do not load private settings resources.
- Full unit suite passed with low concurrency after the latest Explore and Settings regressions: 69 files, 307 tests.
- Type check passed with `bun run type-check`.
- Full source Prettier check passed with `bun run format:check` after formatting the new split modules, composables, runtime helpers, router helpers, and modified views.
- Targeted ESLint passed for changed `src/**/*.ts` and `src/**/*.vue` files.
- Post-format targeted regression tests passed for API mappers/utilities, public resource composable, route guards, and formatted route views: 10 files, 38 tests.
- Settings page targeted regression passed with `bun run test:unit -- src/views/__tests__/SettingsPage.spec.ts`: 1 file, 4 tests.
- Release hook validation passed with `bun run validate:release --mode hook --quiet`; contract self-check and hook static gates completed without blockers. Latest artifact: `output/validation/20260529-054711/summary.md`.
- UUIDv7 public detail route regression tests passed for route guards, auth targets, client head, post detail page, and HMR route warmup: 5 files, 23 tests.
- Full strict lint passed with `bun run lint:strict`.
- Production build passed with `bun run build`, including Vite build, static prerender output, SRI tagging, sitemap generation, and robots output. Latest build artifacts include `dist/index.html`, `dist/sw.js`, `dist/sitemap.xml`, and `dist/robots.txt` generated at 2026-05-29 05:49.
- Build security check passed with `bun run build:security-check` after the latest production build.
- Frontend browser health passed with `bun run check:frontend`: 36 route/viewport combinations, 0 issues, no crash. Latest artifact: `.frontend-health/summary.md`.
- E2E smoke passed with `bun run test:e2e`: static prerender, guest routes, authenticated profile routes, auth login bootstrap, and service worker lifecycle completed. Latest artifact: `.e2e-smoke/summary.md`.
- Targeted shell and warmup regression passed with `bun run test:unit -- src/layouts/__tests__/HmrSiteShell.spec.ts src/hmr/runtime/__tests__/hmrRouteWarmup.spec.ts src/utils/__tests__/performance.spec.ts`: 3 files, 13 tests.
- Targeted Home regression passed with `bun run test:unit -- src/views/__tests__/HomePage.spec.ts`: 1 file, 3 tests.
- Targeted Home/API regression passed with `bun run test:unit -- src/views/__tests__/HomePage.spec.ts src/api/__tests__/hmrContent.spec.ts src/api/__tests__/hmrContentMappers.spec.ts`: 3 files, 12 tests.
- Edge prerender regression passed with `bun run test:unit -- src/edge/__tests__/htmlDocument.spec.ts`: 1 file, 8 tests. Coverage verifies the home shell media markup and final prerender HTML image preload.
- Targeted edge/prerender lint and format checks passed for `scripts/audit/frontend-patterns.ts`, `src/edge/htmlDocument.ts`, `src/edge/prerenderHtml.ts`, `src/edge/__tests__/htmlDocument.spec.ts`, and `src/styles/critical.css`.
- Frontend pattern audit passed after allowing `src/edge/htmlDocument.ts` as an audited prerender image-priority boundary: `bun run scripts/audit/index.ts --only=frontend-patterns`.
- Latest full-route Lighthouse performance audit after adding the home prerender image preload reported home performance 65, explore performance 75, search performance 91. Reports: `.lighthouse/home.json`, `.lighthouse/explore.json`, `.lighthouse/search.json`. This run occurred before `test:perf` reset Chrome profiles per run, so its Home API/cache evidence is retained as diagnostic but not final proof.
- Clean-profile Home-only Lighthouse rerun before snapshot hero alignment with `PERF_TEST_ONLY=home` recorded home performance 64, FCP 900 ms, LCP 4429 ms, TBT 936 ms, CLS 0, Speed Index 2177 ms, and main-thread work 4051 ms. The LCP element remained `div.hmr-home-hero-media > a.hmr-project-card > div.hmr-project-media > img.hmr-post-card__poster`; the image was eager and `fetchpriority=high`, but the request was not discoverable in the initial document because the URL came from client data.
- Proxy-disabled Home-only Lighthouse rerun after snapshot hero alignment with `PERF_TEST_ONLY=home` recorded `VITE_DISABLE_PREVIEW_PROXY=true`, `/api/v1/home/featured` as `HTTP 404` with no content type and an empty body, simulated home performance 55, FCP 2146 ms, LCP 13996 ms, TBT 733 ms, CLS 0.000571, Speed Index 2327 ms, and main-thread work 3269 ms. The report also recorded observed FCP 424 ms, observed LCP 1036 ms, observed Speed Index 614 ms, snapshot preload `HTTP 200`, `image/webp`, transfer 4892 bytes, high priority, and `isLinkPreload=true`.
- LCP discovery checks now pass after snapshot hero alignment: `fetchpriority=high` is applied, the LCP request is discoverable in the initial document, and lazy loading is not applied. Remaining Home performance work must target simulated-throttle LCP/TBT amplification, especially runtime/layout cost, web font impact, and the approximately 1.86 MB first-load pet spritesheet.
- Static brand sprite split added `public/hmrchan/pets/isle/v1/static-spritesheet.webp`, measured at 89,592 bytes versus the full `spritesheet.webp` at 1,864,304 bytes. `HmrBrandSprite` uses the static strip by default, `HmrSiteShell` enables the full atlas only after brand interaction, and preloader playback still uses the animated atlas.
- `test:perf` fallback-mode alignment now sets `VITE_HMRCHAN_ENABLE_API=false` and `VITE_HMRCHAN_FORCE_FALLBACK=true` by default. This prevents static proxy-disabled Lighthouse runs from resolving an auth session and triggering `/api/v1/client/init` 404 requests before the app settles.
- Targeted brand sprite and shell regressions passed with `bun run test:unit -- src/hmr/components/__tests__/HmrBrandSprite.spec.ts src/layouts/__tests__/HmrSiteShell.spec.ts src/hmr/composables/__tests__/useHmrBrandPet.spec.ts`: 3 files, 14 tests.
- Targeted auth and API client regressions passed with `bun run test:unit -- src/stores/__tests__/auth.spec.ts src/api/__tests__/client.spec.ts`: 2 files, 15 tests.
- Targeted brand sprite lint and format checks passed for `src/hmr/components/HmrBrandSprite.vue`, `src/hmr/components/__tests__/HmrBrandSprite.spec.ts`, `src/hmr/composables/useHmrBrandPet.ts`, `src/hmr/composables/__tests__/useHmrBrandPet.spec.ts`, `src/layouts/HmrSiteShell.vue`, `src/layouts/__tests__/HmrSiteShell.spec.ts`, and `src/hmr/styles/hmr-brand.css`; `git diff --check` also passed.
- Public snapshot refresh passed with `node scripts/refresh-public-snapshots.mjs`, generating `src/fallbacks/generated/publicSnapshots.ts`, `src/fallbacks/generated/homePrerenderManifest.ts`, and 33 localized snapshot media files under `public/snapshot-media` totaling approximately 489 KB.
- Home prerender now imports `STATIC_HOME_PRERENDER_IMAGE` and uses the generated `/snapshot-media/home/...webp` image for both the initial preload link and the visible prerender media shell. Home page initial state also uses that same image for the first hero post and preserves the media URL after API hydration, while allowing API data to update the hero title/body.
- Targeted snapshot hero regressions passed with `bun run test:unit -- src/edge/__tests__/htmlDocument.spec.ts src/views/__tests__/HomePage.spec.ts`: 2 files, 11 tests.
- Production regression preflight passed with `bun run test:prod:regression --preflight`: 32 smoke routes, 7 manual runner routes, 23 guest routes, 9 auth routes, and 2 detail readiness routes validated. Latest artifact: `output/prod-regression/20260529-055635/summary.md`.
- Artifact presence was rechecked for `.frontend-health/summary.md`, `.e2e-smoke/summary.md`, `output/prod-regression/20260529-055635`, and `.lighthouse/{home,explore,search}.{json,html}`.
- Diff whitespace check passed with `git diff --check`.
- Static repository audit modules passed for security, PWA, i18n, environment config, legacy alignment, build artifacts, and dead-code boundaries.
- CSS audit passed with `bun run scripts/audit/index.ts --only=css`.
- Auth surface audit passed with `bun run scripts/audit/index.ts --only=auth-surface`.
- Frontend pattern audit passed with `bun run scripts/audit/index.ts --only=frontend-patterns`, including the raw `fetchpriority` boundary.
- Frontend contract audit passed with `bun run scripts/audit/index.ts --only=frontend-contract`, validating the split router guard contract and UUIDv7 public-id entrypoint after moving guard logic into `src/router/guards.ts`.
- GitNexus index refresh previously passed with `npx gitnexus analyze`: 5913 nodes, 10819 edges, 251 clusters, and 300 flows indexed. The current repository listing reports the index 1 commit behind `HEAD`, and keyword query warns that full-text indexes are missing.
- GitNexus `detect_changes(scope=all)` after the latest focused brand-sprite, performance-script, and analysis-document changes reported 28 changed symbols across 8 indexed changed files, medium risk, and one affected process: `UseHmrBrandPet -> StopStateTimer`.
- Static Lighthouse evidence recheck parsed `.lighthouse/home.json` without launching a browser. The current report was written at `2026-05-29T00:00:47.202Z`, records simulated home performance 55, FCP 2146 ms, LCP 13996 ms, TBT 733 ms, CLS 0.000571, Speed Index 2327 ms, and main-thread work 3269 ms, with observed FCP 424 ms, observed LCP 1036 ms, and observed Speed Index 614 ms.
- Static Lighthouse network evidence still reflects the pre-static-sprite run: it contains two `/api/v1/client/init` `404` fetches, `/api/v1/home/featured` `404`, the snapshot hero preload transfer of 4892 bytes, and the full `/hmrchan/pets/isle/v1/spritesheet.webp` transfer of 1,864,594 bytes. This report must not be used as post-static-sprite proof.
- Local sprite asset size check confirmed `static-spritesheet.webp` at 89,592 bytes and the full `spritesheet.webp` at 1,864,304 bytes.
- Metadata review kept `.gitignore` doc-tracking exceptions and the GitNexus index-stat refresh in `AGENTS.md` / `CLAUDE.md`.
- `src/hmr/runtime/homeMedia.ts` was reviewed as part of the home prewarm split and is imported by `src/hmr/runtime/homePrewarm.ts`.

## Worktree Classification

- Current status count: 9 entries.
- Tracked modifications: 8 files.
- Untracked files: 1 file.
- Documentation change: `docs/frontend-analysis-and-optimization.md` records current analysis, validation evidence, runtime constraints, and remaining acceptance gates.
- Performance script change: `scripts/test-performance.ts` defaults static Lighthouse preview runs to fallback mode by setting `VITE_HMRCHAN_ENABLE_API=false` and `VITE_HMRCHAN_FORCE_FALLBACK=true` unless explicitly overridden.
- Brand sprite component changes: `src/hmr/components/HmrBrandSprite.vue` adds `atlasEnabled`, keeps static shell rendering on the lightweight strip by default, and starts RAF frame animation only for preloader playback or an enabled atlas.
- Brand sprite tests: `src/hmr/components/__tests__/HmrBrandSprite.spec.ts` covers default static-strip rendering, explicit atlas playback, static mode, fallback states, and RAF cleanup.
- Brand pet composable change: `src/hmr/composables/useHmrBrandPet.ts` exposes `atlasEnabled` and enables the full atlas only after direct brand interaction.
- Brand style change: `src/hmr/styles/hmr-brand.css` points default sprite rendering at `/hmrchan/pets/isle/v1/static-spritesheet.webp` and keeps the full atlas behind `.hmr-brand-sprite--atlas`.
- Shell change: `src/layouts/HmrSiteShell.vue` wires `atlasEnabled` into desktop and mobile brand sprites.
- Shell tests: `src/layouts/__tests__/HmrSiteShell.spec.ts` proves footer sprites stay static and shell brand sprites load the full atlas only after direct interaction.
- Generated asset: `public/hmrchan/pets/isle/v1/static-spritesheet.webp`, measured at 89,592 bytes.

## Requirement Audit

| Requirement                       | Status                          | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Remaining Control                                                                                                                                          |
| --------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project overview                  | verified                        | Route surface, runtime boundary, public/private content boundary, and delivery constraint are documented in this analysis.                                                                                                                                                                                                                                                                                                                                                                                                      | Keep the overview aligned when new public or authenticated routes are added.                                                                               |
| Technology stack analysis         | verified                        | `package.json` records Bun, Node, Vue, Vue Router, Pinia, Vite, TypeScript, Vitest, Playwright, Lighthouse, ESLint, Prettier, and release scripts.                                                                                                                                                                                                                                                                                                                                                                              | Recheck after dependency upgrades because several core packages use beta or forward versions.                                                              |
| Directory structure analysis      | verified                        | Source tree and worktree classification identify API, HMR components, composables, runtime helpers, edge prerender, router, stores, views, styles, scripts, tests, and documentation.                                                                                                                                                                                                                                                                                                                                           | Refresh classification before commit because the current worktree contains 9 changed entries.                                                              |
| Core functional module analysis   | verified with production gap    | Public content, profile, settings, auth, passkey recovery, contact, community, schedule, and post detail modules are covered by source review, unit tests, E2E smoke, frontend health, and production preflight.                                                                                                                                                                                                                                                                                                                | Run full production deep regression before release because preflight does not exercise all headed manual checkpoints.                                      |
| Component design analysis         | verified                        | Route views delegate orchestration to `src/hmr/composables`, shared post rendering stays in `HmrPostCard`, and public/private resource state is centralized.                                                                                                                                                                                                                                                                                                                                                                    | Prevent future route views from accumulating new API and mapping logic.                                                                                    |
| Routing and permission analysis   | verified with production gap    | `routes.ts`, `guards.ts`, `authTargets.ts`, route tests, auth tests, E2E auth smoke, and frontend health confirm protected profile access, public settings, safe redirects, and invalid public detail id blocking.                                                                                                                                                                                                                                                                                                              | Reconfirm with production deep regression after live auth/risk checkpoints are available.                                                                  |
| Data request and state management | verified                        | `apiClient`, `hmrContentResources`, `hmrContentMappers`, `hmrProfileContent`, `useAuthStore`, theme store, and preferences store define request, resource, mapping, session, and persistence boundaries.                                                                                                                                                                                                                                                                                                                        | Keep backend alias changes paired with mapper tests.                                                                                                       |
| Performance optimization analysis | partial                         | Public content cache, idle route warmup, dynamic GSAP preloader loading, versioned snapshot Home prerender image preload, Home primary/full staged loading, Home hero reveal removal, media helpers, first-viewport image priority props, below-the-fold Explore deferral, compact initial catalog rendering, static brand sprite split, static preview fallback-mode alignment, frontend health, clean-profile Home Lighthouse, snapshot hero tests, proxy-disabled Home Lighthouse, and preview API diagnostics are recorded. | Re-run proxy-disabled Home Lighthouse after the static sprite split and fallback-mode alignment; continue reducing runtime/layout, web font, and TBT cost. |
| Engineering standards analysis    | verified with rerun requirement | Type check, full unit suite, strict lint, source format check, production build, build security check, release hook validation, E2E smoke, frontend health, Lighthouse, production preflight, diff whitespace, and GitNexus detect changes are recorded.                                                                                                                                                                                                                                                                        | Rerun broad gates after any new source change and before commit.                                                                                           |
| Security analysis                 | verified with production gap    | Redirect sanitization, session guard resolution, API CSRF/signature/challenge handling, build security check, auth tests, and GitNexus affected-flow review are recorded.                                                                                                                                                                                                                                                                                                                                                       | Full production regression must validate live auth, risk, and sensitive profile routes.                                                                    |
| Project advantages                | verified                        | Facade compatibility, modular API splitting, composable extraction, explicit resource lifecycles, auth redirect coverage, and validation automation are documented.                                                                                                                                                                                                                                                                                                                                                             | Preserve facade compatibility until a migration plan removes it.                                                                                           |
| Existing problems                 | verified                        | Focused but unfinished 9-entry worktree, degraded GitNexus keyword index, production deep regression gap, facade burden, settings naming ambiguity, and mapper evolution risk are documented.                                                                                                                                                                                                                                                                                                                                   | Close or explicitly accept each problem before release.                                                                                                    |
| Optimization recommendations      | verified                        | Worktree classification, final release evidence, GitNexus refresh, facade migration control, mapper test expansion, public settings contract, and low-memory validation policy are documented.                                                                                                                                                                                                                                                                                                                                  | Convert recommendations into tracked tasks when this optimization branch is prepared for commit.                                                           |

## Final Validation Plan

- Step 1: Review metadata changes and keep only changes required for the frontend optimization deliverable.
- Step 2: Review all untracked production modules and confirm every file is imported by the intended facade, view, runtime helper, or composable.
- Step 3: Run scoped unit suites for API, auth/router, page composables, runtime helpers, and modified views.
- Step 4: Run `bun run type-check`, `git diff --check`, and targeted ESLint checks over all changed source and test files.
- Step 5: Run broader validation only when memory headroom is acceptable: full unit suite, `lint:strict`, production build, build security check, release validation, E2E smoke, Lighthouse, production preflight, and production deep regression.
- Step 6: Run `gitnexus_detect_changes(scope=all)` immediately before commit and require no unexplained high or critical risk.

## Current Runtime Constraint

- Current memory checkpoint: available memory measured at 3152 MB before this continuation. Browser-heavy and build-heavy validation must not run until memory headroom is restored.
- Active port checkpoint: port `5173` is already occupied by an unrelated local server and must not be reused for this repository.
- Process checkpoint: no current `hmrchan-frontend` preview, Lighthouse, Vitest, or performance-script process was found. Port `5173` is occupied by an unrelated `WFtab` Vite server. High memory usage remains concentrated in existing Node/Chrome/MCP Playwright processes and unrelated local servers. These processes were inspected only; no unrelated user process was terminated.
- Execution policy: do not start browser-heavy, build-heavy, production-regression, or multi-worker validation until memory headroom is restored or redundant Codex-started processes are identified and safely cleaned up.

## Completion Status

- Current status: in progress.
- Completed coverage areas: project structure analysis, tech stack inventory, API split, mapper/resource tests, auth target tests, route guard tests, auth store tests, performance helper extraction, page composable extraction, shell warmup optimization, Home first-viewport optimization, Home snapshot hero preload alignment, engineering gate inventory, local browser health, E2E smoke, Lighthouse performance audit, and production regression preflight.
- Remaining completion requirements: re-run proxy-disabled Home Lighthouse after the static brand sprite split and fallback-mode alignment, reduce or explicitly accept remaining simulated Home LCP/TBT gaps, run production deep regression when the headed production checklist can be completed, rerun final full gates after the performance-script, snapshot-manifest, and sprite changes, keep code intelligence current after further split-module changes, and close or explicitly accept the production-deep-regression gap before marking the goal complete.
