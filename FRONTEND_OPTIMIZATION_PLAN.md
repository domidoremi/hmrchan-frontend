# Frontend Optimization Plan

## Scope

This plan covers business capability, technology stack, directory structure, component design, API management, state management, route permission, performance, engineering standards, and maintainability for the Vue frontend.

The optimization policy is incremental. Each slice must preserve current user-visible behavior, include targeted verification, and avoid broad rewrites unless the slice defines an explicit migration boundary.

## Architecture

The application is a Cloudflare Pages hosted Vue SPA with a Pages Functions BFF. The frontend must keep browser sessions cookie-backed, keep access token material out of persistent browser storage, and route all production API traffic through the same-origin `/api` facade.

Core ownership boundaries:

- `src/views`: route-level orchestration and page composition.
- `src/components`: reusable UI, layout, domain presentation, and interaction components.
- `src/api`: endpoint-specific service contracts and the shared request client.
- `src/stores`: Pinia state, local UI state, and session-derived runtime state.
- `src/router`: route definitions, route metadata, authentication gates, and sensitivity gates.
- `src/sw`: offline, cache, and update runtime policy.
- `functions` and `src/edge`: Cloudflare Pages middleware, API facade, prerender metadata, and upstream routing.
- `scripts`: release validation, health checks, build wrappers, and audit tooling.

## Optimization Slices

### Business Capability

- Public browsing must keep anonymous content routes cacheable where safe: home, posts, authors, schedules, community discovery, and search discovery.
- Account, notification, relation, history, report, preference, device, audit, email, MFA, and security activity flows must remain BFF-session scoped.
- Each user-facing workflow must expose a stable readiness selector or route contract before it becomes part of release smoke.

Acceptance evidence:

- Route smoke covers public browsing and protected profile/security routes.
- Service Worker cache policy rejects private BFF-backed API domains without requiring an `Authorization` header.
- Profile section pages keep stable `data-testid` readiness selectors.

### Technology Stack

- Runtime dependencies must remain Bun-managed through the checked-in lockfile.
- Vue, Vite, Vitest, vue-i18n, TypeScript, and Playwright beta or alpha upgrades must be handled as scoped toolchain upgrades with explicit validation evidence.
- Runtime business dependencies must not be upgraded in the same change as validation, audit, or browser toolchain upgrades unless the slice declares that coupling.

Acceptance evidence:

- `package.json` and `bun.lock` change together for dependency work.
- Release validation output records changed dependency groups and selected gates.

### Directory Structure

- Route-level files above 50 KB must gain an extraction plan before additional unrelated features are added.
- Shared logic extracted from route files must move into colocated `use*` composables or model modules under the relevant view folder.
- Cross-route utilities must live under `src/utils` only after at least two route groups consume them.

Priority hotspots:

- `src/views/HomePage.vue`
- `src/views/PostDetailPage.vue`
- `src/views/SchedulePage.vue`
- `src/components/layout/SettingsPanel.vue`
- `src/components/layout/AppNavbar.vue`

Acceptance evidence:

- New feature changes do not increase hotspot file size without an accompanying extraction.
- Extracted modules have focused unit tests for pure logic.

### Component Design

- Page components must orchestrate data, layout, and route state; repeated UI and domain rendering must move to components.
- Base UI components must remain page-context neutral.
- Domain components must receive normalized props and avoid direct API calls unless they own an isolated interaction.
- Global overlays must use shared containers or Teleport contracts instead of page-local duplicated shells.

Acceptance evidence:

- Component tests cover stateful domain components and important empty/error/loading states.
- CSS page context selectors remain in layered style files, not base UI components.

### API Management

- `src/api/client.ts` remains the only HTTP transport entrypoint.
- Endpoint services must own URL construction, response normalization, and domain-specific request options.
- Request security policy must remain centralized in `src/api/client/request-security.ts` and `src/api/client/client-security.ts`.
- Private BFF-backed GET endpoints must be listed in the Service Worker private cache policy when they can be reached without an `Authorization` header.

Acceptance evidence:

- `apiClient` tests cover retry, challenge, verification, contract mismatch, and transport failures.
- Service Worker runtime tests cover private API cache exclusions and public API cache allowances.
- Contract-sensitive endpoint changes include backend contract evidence or a local compatibility test.

### State Management

- Auth store must persist no access token material.
- Session truth must resolve through the BFF session summary and refresh cookie flow.
- Settings, theme, and non-sensitive preferences may persist locally, but privacy toggles must normalize analytics and performance tracking defaults.
- Stores must not duplicate API response normalization already owned by endpoint services.

Acceptance evidence:

- Auth tests prove session clearing, runtime authz invalidation, and sensitive route refresh.
- Settings tests prove privacy normalization and migration defaults.

### Route Permission

- Every route must declare `securityLevel` and `dataSensitivity`, or inherit them from an explicitly protected parent.
- Sensitive profile/security routes must require fresh authorization.
- Resource-detail routes must validate contract resource IDs before rendering.
- Guest-only routes must redirect authenticated users unless the route is part of sensitive reauth.

Acceptance evidence:

- Router tests cover invalid resource IDs, guest-only redirects, protected redirects, sensitive reauth, and scroll preservation.
- Release smoke covers protected profile sections and sensitive security hub entrypoints.

### Performance

- Decorative, analytics, fingerprint, Service Worker, and prefetch work must remain deferred behind scheduler or user-intent gates.
- Static assets with hashes must remain immutable; HTML and Service Worker must remain short-cache or no-cache.
- Public content can use SW caching; private user-scoped API data must not be cached by default.
- Route prefetch must respect save-data and avoid duplicating active requests.

Acceptance evidence:

- Bundle budget and complexity budget checks pass for release candidates.
- SW tests prove private API isolation and public content cache behavior.
- Lighthouse or production canary artifacts exist for candidate and production modes.

### Engineering Standards

- Local validation must use time-for-space defaults on low-memory machines.
- Release validation must classify changes into route/UI, auth/data flow, edge/BFF, and validation-contract risk areas.
- Hooks must run the hook-mode gate; full local or production validation must be explicit.
- Generated artifacts must be written under `output/` or the configured artifact directory.

Acceptance evidence:

- `validate:release` summary records selected stages, skipped stages, artifacts, and blocking reason.
- Hook, prepush, local, candidate, and production modes keep separate stage plans.

### Maintainability

- Large files must shrink through behavior-preserving extraction before broad feature expansion.
- Edge/BFF proxy responsibilities must be split by policy domain when touched: CORS, CSRF, BFF session, forwarding, response rewrite, and media policy.
- Cache, route, and API policies must use explicit allowlists or denylists with tests instead of implicit naming assumptions.
- Optimization work must land in small slices with targeted tests and GitNexus change detection.

Acceptance evidence:

- GitNexus `detect_changes` reports expected affected symbols and no unexpected high-risk flows.
- Each slice lists changed files, validation command, and residual risk.

## Completed Slice Log

### SW Private API Cache Isolation

Changed files:

- `src/sw/runtime.ts`
- `src/sw/__tests__/runtime.spec.ts`

Policy:

- Service Worker API caching must reject private BFF cookie-backed domains even when the browser request does not carry an `Authorization` header.
- Public post and author content remains cacheable under the existing public-content rules.

Validation:

- `node scripts/run-vitest.mjs run src/sw/__tests__/runtime.spec.ts --maxWorkers=1`

Result:

- `3` tests passed.
- GitNexus change detection reported low risk and no affected execution flows for the SW cache slice.

### Route Meta Contract Guard

Changed files:

- `src/router/__tests__/metaContract.spec.ts`

Policy:

- Every named route must resolve to explicit `securityLevel` and `dataSensitivity` metadata.
- Sensitive account routes must remain classified as `securityLevel=sensitive` and `dataSensitivity=security`.
- Route auth flags must stay aligned with metadata: authenticated routes cannot resolve as public, sensitive routes must require auth, and guest-only routes must remain public with no data sensitivity.

Validation:

- `node scripts/run-vitest.mjs run src/router/__tests__ --maxWorkers=1`

Result:

- `10` router tests passed.
- The guard covers the route metadata and auth-flag contract used by protected routing, release smoke, and security state tracking.

### Complexity Budget Diagnostics and DeskPet Style Extraction

Changed files:

- `scripts/lib/complexity-budget.js`
- `scripts/config/complexity-budget.json`
- `src/__tests__/scripts/complexity-budget.spec.ts`
- `src/components/ui/DeskPet.vue`
- `src/components/ui/desk-pet/config.ts`
- `src/components/ui/desk-pet/positioning.ts`
- `src/components/ui/desk-pet/__tests__/positioning.spec.ts`
- `src/styles/components/desk-pet.css`
- `src/styles/index.css`

Policy:

- Complexity budget failures must report actionable reason codes instead of a generic over-limit message.
- Queued refactor files remain violations when their registered `maxLines` limit is exceeded.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.
- Component-specific CSS may move into the layered component style system when selectors are fully namespaced and do not depend on scoped-only Vue CSS features.
- DeskPet interaction constants must live in a colocated configuration module instead of expanding the component setup block.
- DeskPet viewport math must be testable as pure positioning helpers, including bounds, edge snap, peek overflow, and default corner selection.

Validation:

- `node scripts/check-complexity-budget.mjs`
- `node scripts/run-vitest.mjs run src/components/ui/__tests__/DeskPet.spec.ts src/components/ui/desk-pet/__tests__/petStates.spec.ts src/components/ui/desk-pet/__tests__/positioning.spec.ts src/__tests__/scripts/complexity-budget.spec.ts --maxWorkers=1`

Result:

- Complexity budget passed after `DeskPet.vue` moved below its registered limit.
- `24` targeted tests passed.
- `DeskPet.vue` now has a registered budget ceiling of `1077` lines, matching the extracted component file size.
- `DeskPet.vue` now keeps interaction workflow and template in the component file while `.desk-pet*` presentation rules live in `src/styles/components/desk-pet.css`, interaction constants live in `src/components/ui/desk-pet/config.ts`, and viewport math lives in `src/components/ui/desk-pet/positioning.ts`.
- Existing extracted baselines were also locked for `src/components/ui/VideoPlayer.vue`, `src/views/HomePage.vue`, and `src/views/SchedulePage.vue` at their current observed line counts.

### API Transport URL Boundary Guard

Changed files:

- `src/api/client/transport.ts`
- `src/api/__tests__/transport.spec.ts`

Policy:

- Explicit external API endpoints must be limited to `http://` and `https://` URLs.
- Relative API endpoints must not be misclassified as external only because they start with the letters `http`.
- Base URL trailing slashes must continue to normalize before relative endpoint concatenation.

Validation:

- `node scripts/run-vitest.mjs run src/api/__tests__/transport.spec.ts src/api/__tests__/client.spec.ts --maxWorkers=1`

Result:

- `31` API client and transport tests passed.
- URL boundary behavior is now covered separately from the large API client integration spec.

### Settings Visual Companion Normalization

Changed files:

- `src/stores/settings.ts`
- `src/stores/__tests__/settings.spec.ts`

Policy:

- Visual companion settings must share one normalization path for persisted hydration and runtime setter updates.
- Mascot background density, speed, and opacity must stay within documented bounds.
- DeskPet scale and follow sensitivity must stay within documented bounds before UI components consume them.

Validation:

- `node scripts/run-vitest.mjs run src/stores/__tests__/settings.spec.ts src/components/ui/__tests__/DeskPet.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `22` settings and DeskPet tests passed.
- Complexity budget passed.
- Hydration and runtime setters now share `normalizeMascotBackgroundConfig` and `normalizeDeskPetConfig`.

### Bundle Budget Diagnostics

Changed files:

- `scripts/lib/bundle-budget.js`
- `src/__tests__/scripts/bundle-budget.spec.ts`

Policy:

- Bundle budget violations must expose a stable reason code and exact overage.
- Largest chunk violations must report the largest chunk path.
- Home initial asset count violations must report the initial asset URLs used to diagnose preload or entrypoint drift.

Validation:

- `node scripts/run-vitest.mjs run src/__tests__/scripts/bundle-budget.spec.ts src/__tests__/scripts/complexity-budget.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `6` engineering budget tests passed.
- Complexity budget passed.
- Bundle budget failure output now includes metric reason codes and locator details.

### VideoPlayer Model Extraction

Changed files:

- `src/components/ui/VideoPlayer.vue`
- `src/components/ui/video-player/videoPlayerModel.ts`
- `src/components/ui/video-player/__tests__/videoPlayerModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Playback control constants must live in the video player model instead of expanding the component setup block.
- Subtitle language matching, default subtitle selection, SRT detection, and VTT fallback detection must be pure model helpers with explicit inputs.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/components/ui/__tests__/VideoPlayer.spec.ts src/components/ui/video-player/__tests__/videoPlayerModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `23` VideoPlayer and model tests passed.
- Complexity budget passed.
- `VideoPlayer.vue` now has a registered budget ceiling of `1381` lines, matching the extracted component file size.
- Subtitle selection behavior is covered by model tests for preferred language, current locale, fallback-to-first-track, SRT source detection, and API subtitle fetch fallback.

### PostCard Presentation Model Extraction

Changed files:

- `src/components/business/PostCard.vue`
- `src/components/business/post-card/postCardModel.ts`
- `src/components/business/__tests__/postCardModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Post card text normalization, tag normalization, author fallback display, title/excerpt derivation, platform labels, platform animation names, count formatting, and duration formatting must be pure model helpers.
- Component code must keep browser side effects, image lifecycle, cache updates, and emitted events local to the component.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/components/business/__tests__/PostCard.spec.ts src/components/business/__tests__/postCardModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `5` PostCard component and model tests passed.
- Complexity budget passed.
- `PostCard.vue` was reduced from `1023` to `962` lines and no longer appears in the large-file budget report.
- Model tests cover visible text normalization, author fallback display, content-derived titles, excerpt suppression, platform metadata, count formatting, and duration formatting.

### PostPreviewModal Style Extraction

Changed files:

- `src/components/business/PostPreviewModal.vue`
- `src/styles/components/post-preview-modal.css`
- `src/styles/index.css`
- `src/components/business/__tests__/PostPreviewModalStyles.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Post preview modal presentation rules must live in the layered component stylesheet instead of the SFC.
- Styles moved out of scoped SFC blocks must use `post-preview-*` selectors for local modal elements.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/components/business/__tests__/PostPreviewModal.spec.ts src/components/business/__tests__/PostPreviewModalStyles.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- PostPreviewModal component and style contract tests passed.
- Complexity budget passed.
- `PostPreviewModal.vue` was reduced from `1269` to `724` lines and no longer appears in the large-file budget report.
- Generic `.thumb` and `.meta-pill` selectors were renamed to `post-preview-*` classes before moving styles into `src/styles/components/post-preview-modal.css`.

### Particle Engine Model Extraction

Changed files:

- `src/composables/useParticleEngine.ts`
- `src/composables/particle-engine/model.ts`
- `src/composables/__tests__/particleEngineModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Particle color resolution, alpha conversion, numeric clamping, render scale calculation, and pool initialization must live in a pure colocated model module.
- Canvas rendering, animation lifecycle, DOM events, and quality adaptation must remain in `useParticleEngine.ts`.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/composables/__tests__/particleEngineModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `3` particle model tests passed.
- Complexity budget passed.
- `useParticleEngine.ts` was reduced from `1016` to `914` lines and no longer appears in the large-file budget report.
- Model tests cover theme defaults, explicit colors, alpha conversion, invalid color fallback, clamp behavior, render scale bounds, and inactive particle pool initialization.

### Profile Security MFA Display Model Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Identity-provider display, MFA method labels, boolean metadata labels, authenticator attachment labels, passkey transport display, passkey draft names, and passkey rename eligibility must be pure model helpers.
- API calls, WebAuthn ceremonies, toast reporting, and reactive form state must remain in `ProfileSecurityMfaSection.vue`.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/ProfileSecurityMfaSection.spec.ts src/components/profile/__tests__/securityMfaModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `5` MFA component and model tests passed.
- Complexity budget passed.
- `ProfileSecurityMfaSection.vue` now has a registered budget ceiling of `1148` lines, matching the extracted component file size.
- Model tests cover identity provider normalization/labels, MFA method labels, passkey metadata labels, transport formatting, draft-name fallback, and rename eligibility.

### Route Resource Guard Policy Extraction

Changed files:

- `src/router/index.ts`
- `src/router/routeSecurityPolicy.ts`
- `src/router/__tests__/routeSecurityPolicy.spec.ts`
- `scripts/lib/frontend-contract-audit.js`
- `src/__tests__/scripts/frontend-contract-audit.spec.ts`

Policy:

- Contract resource detail routes must declare their guarded route names in `routeSecurityPolicy.ts`.
- Named `:id` routes must be either covered by the contract resource guard or listed in `ROUTE_ID_PARAM_EXEMPTIONS`.
- The router guard must delegate invalid contract resource ID rejection to the route security policy module.
- Frontend contract audit must validate the extracted policy module instead of relying on inline router guard text.

Validation:

- `node scripts/run-vitest.mjs run src/router/__tests__ src/__tests__/scripts/frontend-contract-audit.spec.ts --maxWorkers=1`

Result:

- `22` route and contract audit tests passed.
- The resource-detail guard remains behavior-compatible while the guarded route list and explicit `schedule-detail` exemption are now covered by focused tests.

### Search Page Style Extraction

Changed files:

- `src/views/SearchPage.vue`
- `src/styles/page-systems/search-page-view.css`
- `src/styles/index.css`
- `src/views/__tests__/SearchPageStyles.spec.ts`
- `src/views/__tests__/ResponsiveLayoutStyles.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Search page presentation rules must live in the layered page-system stylesheet instead of the SFC.
- Styles moved out of scoped SFC blocks must stay scoped under `.search-page`.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/views/__tests__/SearchPage.spec.ts src/views/__tests__/SearchPageStyles.spec.ts src/views/__tests__/ResponsiveLayoutStyles.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `18` SearchPage and responsive style contract tests passed.
- Complexity budget passed.
- `SearchPage.vue` was reduced from `965` to `418` lines and no longer appears in the large-file budget report.
- The large-file count dropped from `15` to `14`.

### About Page Style Extraction

Changed files:

- `src/views/AboutPage.vue`
- `src/styles/page-systems/about-page-view.css`
- `src/styles/index.css`
- `src/views/__tests__/AboutPageStyles.spec.ts`
- `src/views/__tests__/ResponsiveLayoutStyles.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- About page presentation rules must live in the layered page-system stylesheet instead of the SFC.
- Styles moved out of scoped SFC blocks must stay scoped under `.about-page`.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/views/__tests__/AboutPageStyles.spec.ts src/views/__tests__/SearchPageStyles.spec.ts src/views/__tests__/ResponsiveLayoutStyles.spec.ts src/views/__tests__/SearchPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `20` SearchPage, AboutPage, and responsive style contract tests passed.
- Complexity budget passed.
- `AboutPage.vue` was reduced from `1018` to `490` lines and no longer appears in the large-file budget report.
- The large-file count dropped from `14` to `13`.

### Community Page Style Extraction

Changed files:

- `src/views/CommunityPage.vue`
- `src/styles/page-systems/community-page-view.css`
- `src/styles/index.css`
- `src/views/__tests__/CommunityPageStyles.spec.ts`
- `src/views/__tests__/ResponsiveLayoutStyles.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Community page presentation rules must live in the layered page-system stylesheet instead of the SFC.
- Styles moved out of scoped SFC blocks must stay scoped under `.community-page`.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/views/__tests__/CommunityPageStyles.spec.ts src/views/__tests__/ResponsiveLayoutStyles.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `12` CommunityPage and responsive style contract tests passed.
- Complexity budget passed.
- `CommunityPage.vue` was reduced from `1263` to `827` lines and no longer appears in the large-file budget report.
- The large-file count dropped from `13` to `12`.

### Login Page Auth Model Extraction

Changed files:

- `src/views/LoginPage.vue`
- `src/views/login/loginPageModel.ts`
- `src/views/login/__tests__/loginPageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Login page step title/subtitle keys, Turnstile token freshness, and expired Google handoff detection must live in a pure model module.
- LoginPage must keep route/store/API/WebAuthn/Turnstile side effects in the page component.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/login/__tests__/loginPageModel.spec.ts src/views/__tests__/AuthEntryPages.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `17` login model and auth entry page tests passed.
- Complexity budget passed.
- `LoginPage.vue` now has a registered budget ceiling of `1253` logical lines, matching the extracted component file size.
- Model tests cover step title/subtitle key mapping, Turnstile freshness boundaries, and expired Google handoff detection by message key, backend code, and backend detail.

### Register Page Auth Model Extraction

Changed files:

- `src/views/RegisterPage.vue`
- `src/views/register/registerPageModel.ts`
- `src/views/register/__tests__/registerPageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Register page step title/subtitle keys, Turnstile token freshness, and expired Google handoff detection must live in a pure model module.
- RegisterPage must keep route/store/API/Turnstile side effects in the page component.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/register/__tests__/registerPageModel.spec.ts src/views/__tests__/AuthEntryPages.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- `17` register model and auth entry page tests passed.
- Complexity budget passed.
- `RegisterPage.vue` now has a registered budget ceiling of `1455` logical lines, matching the extracted component file size.
- Model tests cover step title/subtitle key mapping, Turnstile freshness boundaries, and expired Google handoff detection by message key, backend code, and backend detail.

### Profile Security MFA Style Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/styles/page-systems/profile-security-mfa-section.css`
- `src/styles/index.css`
- `src/components/profile/__tests__/ProfileSecurityMfaSectionStyles.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Profile security MFA presentation rules must live in the layered page-system stylesheet instead of the SFC.
- Styles moved out of scoped SFC blocks must stay scoped under `.security-mfa-panel`.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/ProfileSecurityMfaSection.spec.ts src/components/profile/__tests__/ProfileSecurityMfaSectionStyles.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- `4` MFA component behavior and style contract tests passed.
- Complexity budget passed.
- `ProfileSecurityMfaSection.vue` was reduced to `720` lines and no longer appears in the large-file budget report.
- The large-file count dropped from `12` to `11`.

### Profile Settings Page Style Extraction

Changed files:

- `src/views/ProfileSettingsPage.vue`
- `src/styles/page-systems/profile-settings-page-view.css`
- `src/views/__tests__/ProfileSettingsPageStyles.spec.ts`
- `src/views/__tests__/ResponsiveLayoutStyles.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Profile settings page presentation rules must live in an external scoped stylesheet instead of the SFC body.
- External page styles for Vue-scoped pages must use `<style scoped src="...">` when selector scoping must remain unchanged.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/views/__tests__/ProfileSettingsPage.spec.ts src/views/__tests__/ProfileSettingsPageStyles.spec.ts src/views/__tests__/ResponsiveLayoutStyles.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- `15` ProfileSettingsPage behavior, style, and responsive layout contract tests passed.
- Complexity budget passed.
- `ProfileSettingsPage.vue` was reduced to `860` lines and no longer appears in the large-file budget report.
- The large-file count dropped from `11` to `10`.

### Schedule Page Calendar Model Extraction

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Schedule calendar grid construction, event date indexing, weekday labels, upcoming/today event derivation, category colors, category breakdown, and event date/time labels must live in a pure model module.
- SchedulePage must keep route detail orchestration, API fallback handling, metadata updates, scrolling, sharing, and toast side effects in the page component until those workflows are split explicitly.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts src/views/__tests__/SchedulePage.spec.ts src/views/__tests__/SchedulePageStyles.spec.ts src/views/__tests__/SchedulePageMobileStyles.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- `16` SchedulePage model, route-detail, and style tests passed.
- Complexity budget passed.
- `SchedulePage.vue` now has a registered budget ceiling of `1573` logical lines, matching the extracted component file size.
- Model tests cover category colors, localized weekday labels, event filtering, date indexing, six-week month grids, planner week generation, upcoming/today sorting, category breakdown, and all-day/timed date labels.

### Post Detail Presentation Model Expansion

Changed files:

- `src/views/PostDetailPage.vue`
- `src/views/post-detail/postDetailModel.ts`
- `src/views/post-detail/__tests__/postDetailModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Post detail title/description cleanup, published metadata, media navigation state, image source resolution, fallback media source resolution, placeholder selection, and adjacent preload index selection must live in the pure post detail model.
- PostDetailPage must keep fetch/cache/fallback loading, route navigation, comments lazy loading, swipe routing, body scroll locking, and page metadata side effects in the page component until those workflows are split explicitly.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/post-detail/__tests__/postDetailModel.spec.ts src/views/__tests__/PostDetailPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- `21` PostDetailPage model and page behavior tests passed.
- Complexity budget passed.
- `PostDetailPage.vue` now has a registered budget ceiling of `2533` logical lines, matching the extracted component file size.
- Model tests cover duplicate title cleanup, description prefix stripping, media sizing, media pending/thumbnail rail rules, published metadata, media navigation state, image/fallback/placeholder URL resolution, and adjacent preload indexes.

### App Navbar Scoped Style Extraction

Changed files:

- `src/components/layout/AppNavbar.vue`
- `src/styles/components/app-navbar.css`
- `src/components/layout/__tests__/AppNavbar.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Navbar presentation rules must live in an external scoped stylesheet while the navigation, dropdown, search, visibility, prefetch, and auth menu behavior remains in the component.
- External component styles for Vue-scoped layout components must use `<style scoped src="...">` when selector scoping must remain unchanged.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/components/layout/__tests__/AppNavbar.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- AppNavbar behavior and style contract tests passed.
- Complexity budget passed.
- `AppNavbar.vue` was reduced to `937` lines and no longer appears in the large-file budget report.

### Settings Panel Scoped Style Extraction

Changed files:

- `src/components/layout/SettingsPanel.vue`
- `src/styles/components/settings-panel.css`
- `src/components/layout/__tests__/SettingsPanel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Settings panel presentation rules must live in an external scoped stylesheet while category visibility, preference persistence, store mutations, preference sync, and video reset behavior remain in the component.
- External component styles for Vue-scoped settings surfaces must use `<style scoped src="...">` when selector scoping must remain unchanged.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/components/layout/__tests__/SettingsPanel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- SettingsPanel behavior and style contract tests passed.
- Complexity budget passed.
- `SettingsPanel.vue` was reduced to `967` lines and no longer appears in the large-file budget report.

### Desk Pet Interaction Model Extraction

Changed files:

- `src/components/ui/DeskPet.vue`
- `src/components/ui/desk-pet/interaction.ts`
- `src/components/ui/desk-pet/__tests__/interaction.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Desk pet greeting selection, position storage parsing/writing, event coordinate extraction, rest-state selection, pointer look-offset math, particle burst construction, default placement insets, hero perch/peek target math, and care action plans must live in a pure interaction model.
- DeskPet must keep timers, animation-frame orchestration, DOM event registration, image preload lifecycle, settings store writes, and workflow reaction mounting in the component until those runtime workflows are split explicitly.
- Files that fall below or equal `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/components/ui/desk-pet/__tests__/interaction.spec.ts src/components/ui/__tests__/DeskPet.spec.ts src/components/ui/desk-pet/__tests__/positioning.spec.ts src/components/ui/desk-pet/__tests__/petStates.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Desk pet interaction model, runtime, positioning, and workflow state tests passed.
- Complexity budget passed.
- `DeskPet.vue` was reduced to `1000` lines and no longer appears in the large-file budget report.

### Video Player Seek And Volume Model Expansion

Changed files:

- `src/components/ui/VideoPlayer.vue`
- `src/components/ui/video-player/videoPlayerModel.ts`
- `src/components/ui/video-player/__tests__/videoPlayerModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Video progress percentages, display percent fallback, pointer seek target calculation, keyboard seek target calculation, and volume slider normalization must live in the pure video player model.
- VideoPlayer must keep media element reads/writes, PiP/fullscreen APIs, document listeners, timers, subtitle track listeners, and gesture composable wiring in the component until those runtime workflows are split explicitly.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/components/ui/video-player/__tests__/videoPlayerModel.spec.ts src/components/ui/__tests__/VideoPlayer.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Video player model and component behavior tests passed.
- Complexity budget passed.
- `VideoPlayer.vue` now has a registered budget ceiling of `1376` logical lines, matching the extracted component file size.

### Video Player Subtitle Model Expansion

Changed files:

- `src/components/ui/VideoPlayer.vue`
- `src/components/ui/video-player/videoPlayerModel.ts`
- `src/components/ui/video-player/__tests__/videoPlayerModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Fetched subtitle fallback normalization and active cue HTML extraction must live in the pure video player model.
- VideoPlayer must keep subtitle fetching, blob URL creation/revocation, text track mode updates, and cuechange listener wiring in the component until the subtitle runtime workflow is split explicitly.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/components/ui/video-player/__tests__/videoPlayerModel.spec.ts src/components/ui/__tests__/VideoPlayer.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Video player subtitle model and component behavior tests passed.
- Complexity budget passed.
- `VideoPlayer.vue` now has a registered budget ceiling of `1360` logical lines, matching the extracted component file size.

### Register Page Form Model Expansion

Changed files:

- `src/views/RegisterPage.vue`
- `src/views/register/registerPageModel.ts`
- `src/views/register/__tests__/registerPageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Registration password strength text keys, code-sent email masking, progress visibility, post-registration login target construction, and first-failure form validation gates must live in the pure register page model.
- RegisterPage must keep email domain policy evaluation, toast dispatch, Turnstile challenge execution/reset, auth store registration, router mutation, and inline field state in the component until those runtime workflows are split explicitly.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/register/__tests__/registerPageModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Register page model tests passed.
- `RegisterPage.vue` now has a registered budget ceiling of `1429` logical lines, matching the extracted component file size.

### Login Page Form Model Expansion

Changed files:

- `src/views/LoginPage.vue`
- `src/views/login/loginPageModel.ts`
- `src/views/login/__tests__/loginPageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Credential-login validation, restore-account validation, restore notice key selection, password-login unavailable detection, risk WebAuthn method detection, risk code normalization, credential Turnstile retry predicates, and restore-query cleanup must live in the pure login page model.
- LoginPage must keep auth store login, restore-account API calls, Turnstile execution/reset, WebAuthn ceremonies, Google popup handling, router mutation, and toast dispatch in the component until those runtime workflows are split explicitly.
- Existing large-file baselines must not grow while model extraction is incomplete.

Validation:

- `node scripts/run-vitest.mjs run src/views/login/__tests__/loginPageModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Login page model tests passed.
- `LoginPage.vue` remains at the registered budget ceiling of `1253` logical lines while moving additional rules into the model.

### Schedule Detail Model Expansion

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Schedule detail link availability, lead text extraction, host label construction, same-day comparison, description HTML normalization, description section parsing, and safe line linkification must live in the pure schedule page model.
- SchedulePage must keep route synchronization, detail API/cache/fallback loading, page meta updates, clipboard, Web Share, and toast dispatch in the component until those runtime workflows are split explicitly.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Schedule page model tests passed.
- `SchedulePage.vue` now has a registered budget ceiling of `1517` logical lines, matching the extracted component file size.

### Home Page Image Policy Model Expansion

Changed files:

- `src/views/HomePage.vue`
- `src/views/homepage/homeImagePolicy.ts`
- `src/views/homepage/__tests__/homeImagePolicy.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Homepage image srcset resolution, hero collage responsive dimensions, hero collage sizes/loading/fetch-priority policy, and featured rail image dimensions/sizes/loading/fetch-priority policy must live in the pure homepage model.
- HomePage must keep data loading, preview state, router navigation, GSAP/ScrollTrigger, smooth scrolling, intersection/resize observers, and bubble canvas runtime in the page component until those workflows are split explicitly.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeModel.spec.ts src/views/homepage/__tests__/homeImagePolicy.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Homepage model tests passed.
- `HomePage.vue` now has a registered budget ceiling of `3264` logical lines, matching the extracted component file size.
- `homeModel.ts` remains below the large-file soft limit; image policy lives in a dedicated small model file.

### Post Detail Media And Comments Model Expansion

Changed files:

- `src/views/PostDetailPage.vue`
- `src/views/post-detail/postDetailModel.ts`
- `src/views/post-detail/__tests__/postDetailModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Post detail media transition targets, transition names, auto-advance wraparound, invalid media target rejection, not-found route params, comments preload margin, and comments viewport eligibility must live in the pure post detail model.
- PostDetailPage must keep autoplay timers, image decode warming, router mutation, session storage, comment observer/listener wiring, API/cache/fallback loading, page meta updates, and view tracking in the component until those runtime workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/post-detail/__tests__/postDetailModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Post detail model tests passed.
- `PostDetailPage.vue` now has a registered budget ceiling of `2525` logical lines, matching the extracted component file size.

### Schedule Interaction Model Expansion

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Schedule calendar keyboard navigation index resolution and month swipe direction detection must live in the pure schedule page model.
- SchedulePage must keep DOM cell querying, focus movement, touch event reads, month state mutation, route detail orchestration, API/cache/fallback loading, page meta updates, clipboard, Web Share, and toast dispatch in the component until those runtime workflows are split explicitly.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Schedule page model tests passed.
- `SchedulePage.vue` now has a registered budget ceiling of `1503` logical lines, matching the extracted component file size.

### Schedule Navigation Model Expansion

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Schedule planner step targets, month rollover transitions, and today transition direction must live in the pure schedule page model.
- SchedulePage must keep selected day mutation, current year/month refs, route detail orchestration, API/cache/fallback loading, page meta updates, clipboard, Web Share, and toast dispatch in the component until those runtime workflows are split explicitly.
- `SchedulePage.vue` must remain below the hard line limit unless future detail orchestration work adds an explicit budget note.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Schedule page model tests passed.
- `SchedulePage.vue` now has a registered budget ceiling of `1482` logical lines and no longer requires the refactor queue flag.

### Home Page Support Policy Extraction

Changed files:

- `src/views/HomePage.vue`
- `src/views/homepage/homeSupportPolicy.ts`
- `src/views/homepage/__tests__/homeSupportPolicy.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Homepage public prewarm media candidate collection, empty support refresh target construction, pending refresh detection, and support refresh target resolution must live in the dedicated homepage support policy module.
- HomePage must keep window-width prewarm sizing, background task scheduling, dynamic API imports, AbortController lifecycle, aggregate application, route navigation, GSAP/ScrollTrigger, smooth scrolling, intersection/resize observers, and bubble canvas runtime in the page component until those workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeModel.spec.ts src/views/homepage/__tests__/homeSupportPolicy.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Homepage model and support policy tests passed.
- `HomePage.vue` now has a registered budget ceiling of `3220` logical lines, matching the extracted component file size.
- `homeModel.ts` remains below the large-file soft limit; support refresh policy lives in a dedicated small policy file.

### Home Page Scene Policy Extraction

Changed files:

- `src/views/HomePage.vue`
- `src/views/homepage/homeScenePolicy.ts`
- `src/views/homepage/__tests__/homeScenePolicy.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Homepage compact/lightweight viewport classification, heavy scene capability flags, scene travel distance, viewport progress clamping, and ScrollTrigger snap policy must live in the dedicated homepage scene policy module.
- HomePage must keep DOM measurement, GSAP/ScrollTrigger lifecycle, smooth-scroll bridge wiring, event listeners, resize/intersection observers, and canvas rendering in the page component until those runtime workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts src/views/homepage/__tests__/homeImagePolicy.spec.ts src/views/homepage/__tests__/homeSupportPolicy.spec.ts src/views/__tests__/HomePage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Homepage component, image policy, support policy, and scene policy tests passed.
- `HomePage.vue` now has a registered budget ceiling of `3215` logical lines, matching the extracted component file size.
- Scene capability and progress behavior is covered without requiring GSAP, ScrollTrigger, or browser event listeners in unit tests.

### Post Detail Navigation Gesture Model Expansion

Changed files:

- `src/views/PostDetailPage.vue`
- `src/views/post-detail/postDetailModel.ts`
- `src/views/post-detail/__tests__/postDetailModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Adjacent post navigation target resolution, navigation hint direction, second-gesture confirmation, wheel gesture accumulation, shift-wheel mapping, and touch swipe direction detection must live in the pure post detail model.
- PostDetailPage must keep event listener attachment, ignored DOM target detection, media-first navigation fallback, session storage transition writes, router mutation, timers, and API/cache/fallback loading in the component until those runtime workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/post-detail/__tests__/postDetailModel.spec.ts src/views/__tests__/PostDetailPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Post detail model and page behavior tests passed.
- `PostDetailPage.vue` now has a registered budget ceiling of `2509` logical lines, matching the extracted component file size.
- Adjacent post gesture behavior is covered without requiring DOM wheel or touch event construction in the model tests.

### Home Page Motion Style Policy Expansion

Changed files:

- `src/views/HomePage.vue`
- `src/views/homepage/homeScenePolicy.ts`
- `src/views/homepage/__tests__/homeScenePolicy.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Homepage viewport blend measurement and home page motion CSS variable construction must live in the dedicated homepage scene policy module.
- HomePage must keep DOM element resolution, `getBoundingClientRect` reads, viewport scene lifecycle, bubble reveal state mutation, navbar/footer locks, GSAP/ScrollTrigger lifecycle, and canvas rendering in the page component until those runtime workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts src/views/__tests__/HomePage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Homepage scene policy and page behavior tests passed.
- `HomePage.vue` now has a registered budget ceiling of `3176` logical lines, matching the extracted component file size.
- Motion CSS variable behavior is covered without requiring GSAP, ScrollTrigger, or DOM event listeners in unit tests.

### Home Page Rail And Story Scene Style Policy Expansion

Changed files:

- `src/views/HomePage.vue`
- `src/views/homepage/homeScenePolicy.ts`
- `src/views/homepage/__tests__/homeScenePolicy.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Featured rail scene style, rail track transform style, and story scene CSS variable construction must live in the dedicated homepage scene policy module.
- HomePage must keep reactive source selection, route composition, DOM measurement, scene lifecycle, GSAP/ScrollTrigger lifecycle, and canvas rendering in the page component until those runtime workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts src/views/__tests__/HomePage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Homepage scene policy and page behavior tests passed.
- `HomePage.vue` now has a registered budget ceiling of `3172` logical lines, matching the extracted component file size.
- Rail/story style behavior is covered without requiring DOM measurement, ScrollTrigger, or browser event listeners in unit tests.

### Home Page Footer Blend And Rail Lock Policy Expansion

Changed files:

- `src/views/HomePage.vue`
- `src/views/homepage/homeScenePolicy.ts`
- `src/views/homepage/__tests__/homeScenePolicy.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Home footer blend CSS variable values, removable footer blend property list, footer blend activation threshold, and rail navbar lock boundary calculation must live in the dedicated homepage scene policy module.
- HomePage must keep document dataset mutation, CSS property application/removal, DOM element resolution, viewport scene lifecycle, bubble reveal state mutation, GSAP/ScrollTrigger lifecycle, and canvas rendering in the page component until those runtime workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts src/views/__tests__/HomePage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Homepage scene policy and page behavior tests passed.
- `HomePage.vue` now has a registered budget ceiling of `3153` logical lines, matching the extracted component file size.
- Footer blend and rail lock behavior is covered without requiring DOM style mutation or browser event listeners in unit tests.

### Home Page Bubble Reveal Lifecycle Policy Expansion

Changed files:

- `src/views/HomePage.vue`
- `src/views/homepage/bubbleRevealState.ts`
- `src/views/homepage/__tests__/bubbleRevealState.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Bubble reveal lifecycle action resolution and viewport reveal/retreat action resolution must live in the dedicated bubble reveal state module.
- HomePage must keep animation frame scheduling, burst/retreat side effects, phase mutation, DOM measurement, scene lifecycle, GSAP/ScrollTrigger lifecycle, and canvas rendering in the page component until those runtime workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleRevealState.spec.ts src/views/homepage/__tests__/homeScenePolicy.spec.ts src/views/__tests__/HomePage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Homepage bubble reveal, scene policy, and page behavior tests passed.
- `HomePage.vue` now has a registered budget ceiling of `3150` logical lines, matching the extracted component file size.
- Reveal/retreat action behavior is covered without requiring animation frames or DOM event listeners in unit tests.

### Home Page Scene Layout Refresh Policy Expansion

Changed files:

- `src/views/HomePage.vue`
- `src/views/homepage/homeScenePolicy.ts`
- `src/views/homepage/__tests__/homeScenePolicy.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Scene layout size normalization and layout refresh threshold decisions must live in the dedicated homepage scene policy module.
- HomePage must keep ResizeObserver ownership, DOM element collection, observed element storage, and refresh scheduling side effects in the page component until the scene runtime is split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts src/views/__tests__/HomePage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Homepage scene policy and page behavior tests passed.
- `HomePage.vue` now has a registered budget ceiling of `3142` logical lines, matching the extracted component file size.
- ResizeObserver refresh behavior is covered without requiring DOM observers or browser event listeners in unit tests.

### Post Detail Fallback Recovery Policy Expansion

Changed files:

- `src/views/PostDetailPage.vue`
- `src/views/post-detail/postDetailModel.ts`
- `src/views/post-detail/__tests__/postDetailModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Post detail fallback recovery source decisions must live in the pure post detail model.
- PostDetailPage must keep ApiError classification, service-unavailable classification, navigation summary lookup, fallback detail construction, router mutation, cache loading, and view tracking side effects in the page component until API orchestration is split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/post-detail/__tests__/postDetailModel.spec.ts src/views/__tests__/PostDetailPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Post detail model and page behavior tests passed.
- `PostDetailPage.vue` now has a registered budget ceiling of `2508` logical lines, matching the extracted component file size.
- 404 navigation-summary recovery and service-unavailable static fallback recovery are covered without requiring API calls, router mutation, or cache access in unit tests.

### Schedule Detail Recovery Policy Expansion

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Schedule detail recovery source decisions must live in the pure schedule page model.
- SchedulePage must keep live API calls, public snapshot reads/writes, static fallback lookup, page metadata updates, selected-day synchronization, router mutation, clipboard, Web Share, and toast side effects in the page component until API orchestration is split explicitly.
- Existing large-file baselines must remain enforced; this slice must not increase the registered `SchedulePage.vue` line ceiling.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts src/views/__tests__/SchedulePage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Schedule model and page behavior tests passed.
- `SchedulePage.vue` remains at the registered budget ceiling of `1482` logical lines.
- Cached detail recovery, static fallback recovery, not-found detail state, and generic error state decisions are covered without requiring API calls, cache access, route mutation, or toast side effects in unit tests.

### Schedule Detail Share Policy Expansion

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Schedule detail permalink normalization, share capability checks, and Web Share payload construction must live in the pure schedule page model.
- SchedulePage must keep router resolution, window origin access, navigator capability reads, clipboard writes, Web Share invocation, and toast side effects in the page component.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts src/views/__tests__/SchedulePage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Schedule model and page behavior tests passed.
- `SchedulePage.vue` now has a registered budget ceiling of `1481` logical lines, matching the extracted component file size.
- Permalink normalization, share button eligibility, and share payload fallback text are covered without requiring router, clipboard, Web Share, or toast side effects in unit tests.

### Login Route State Policy Expansion

Changed files:

- `src/views/LoginPage.vue`
- `src/views/login/loginPageModel.ts`
- `src/views/login/__tests__/loginPageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Login route query state, Google provider visual busy state, client challenge visibility, conditional passkey autofill start eligibility, and back navigation intent must live in the pure login page model.
- LoginPage must keep auth store login, restore-account API calls, Turnstile execution/reset, WebAuthn ceremonies, Google popup handling, router mutation, toast dispatch, and DOM/window side effects in the component until those runtime workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/login/__tests__/loginPageModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Login model tests passed with `11` tests.
- Complexity budget passed.
- `LoginPage.vue` now has a registered budget ceiling of `1250` logical lines, matching the extracted component file size.
- Route query state, Google auth visual state, passkey autofill eligibility, and back navigation intent are covered without requiring router, browser history, WebAuthn, Google popup, Turnstile, or API side effects in unit tests.

### Register Google State Policy Expansion

Changed files:

- `src/views/RegisterPage.vue`
- `src/views/register/registerPageModel.ts`
- `src/views/register/__tests__/registerPageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Register Google provider visual busy state, client challenge visibility, and non-register back navigation intent must live in the pure register page model.
- RegisterPage must keep email validation, code sending/resending, auth store registration, Turnstile execution/reset, WebAuthn/MFA handoff, Google popup handling, router mutation, toast dispatch, and DOM/window side effects in the component until those runtime workflows are split explicitly.
- Register Turnstile freshness remains in the current page helper path for this slice because GitNexus impact reports HIGH risk across send-code, resend-code, and register flows.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/register/__tests__/registerPageModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Register model tests passed with `10` tests.
- Complexity budget passed.
- `RegisterPage.vue` now has a registered budget ceiling of `1427` logical lines, matching the extracted component file size.
- Google auth visual state, client challenge eligibility, and non-register back navigation intent are covered without requiring router, browser history, Google popup, Turnstile, code delivery, or registration API side effects in unit tests.

### Profile Settings Identity And Restore Policy Expansion

Changed files:

- `src/views/ProfileSettingsPage.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`
- `src/views/__tests__/ProfileSettingsPage.spec.ts`

Policy:

- Profile display-name fallback, identity-provider normalization, auth-source copy selection, account data summary defaults, restore-account query construction, and optional date-time fallback formatting must live in the pure profile settings model.
- ProfileSettingsPage must keep profile loading, account deletion/export API calls, avatar upload/crop, router mutation, store mutation, toast dispatch, and translation rendering in the component until those runtime workflows are split explicitly.
- ProfileSettingsPage remains below the large-file threshold; no complexity budget entry is required for this slice.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSettingsPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model and page tests passed with `12` tests.
- `ProfileSettingsPage.vue` decreased to `907` logical lines after policy extraction and existing style externalization.
- Identity and restore policy decisions are covered without requiring router logout/replace, API calls, avatar upload, toast dispatch, or translation side effects in unit tests.

### Profile Security Identity Policy Reuse

Changed files:

- `src/views/ProfileSecurityPage.vue`
- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Profile security pages and security components must reuse the profile settings model for identity-provider normalization, auth-source label key selection, auth-source hint key selection, display-name fallback, and optional date-time fallback formatting.
- `securityMfaModel.ts` must keep passkey, MFA method, provider display-name, and rename eligibility helpers, but its identity-provider normalization must delegate to the shared profile settings policy.
- ProfileSecurityPage, ProfileSecurityCredentialsSection, and ProfileSecurityMfaSection must keep API loading, session management, MFA/passkey service calls, router hash synchronization, store access, toast dispatch, and translation rendering in their owning components.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts --maxWorkers=1`
- `node scripts/run-vitest.mjs run src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/components/profile/__tests__/ProfileSecurityMfaSection.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `10` tests.
- Profile security page tests passed with `3` tests.
- MFA model and section tests passed with `5` tests.
- Identity and date-time policy reuse is covered without requiring security summary API calls beyond existing mocks, MFA service side effects, passkey browser ceremonies, router mutation, or toast dispatch in pure policy tests.

### Profile Security Route State Policy Extraction

Changed files:

- `src/views/ProfileSecurityPage.vue`
- `src/views/profile-security/profileSecurityPageModel.ts`
- `src/views/profile-security/__tests__/profileSecurityPageModel.spec.ts`

Policy:

- Profile security panel ids, canonical hashes, hash aliases, fallback panel selection, and router hash replacement decisions must live in a pure profile security page model.
- ProfileSecurityPage must keep DOM panel refs, `nextTick`, scroll behavior, router mutation, API loading, session management, store access, and translation rendering in the page component.
- The panel card order must derive from the model definitions so navigation cards and workspace chips cannot drift from the route hash contract.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-security/__tests__/profileSecurityPageModel.spec.ts --maxWorkers=1`
- `node scripts/run-vitest.mjs run src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile security route-state model tests passed with `4` tests.
- Profile security page tests passed with `3` tests.
- Hash alias handling, unknown-hash fallback, canonical hash mapping, and no-op router replacement decisions are covered without requiring DOM scrolling, API calls, session revocation, or router mutation in pure model tests.

### Profile Security Overview Model Expansion

Changed files:

- `src/views/ProfileSecurityPage.vue`
- `src/views/profile-security/profileSecurityPageModel.ts`
- `src/views/profile-security/__tests__/profileSecurityPageModel.spec.ts`

Policy:

- Security overview count formatting, failed-login risk flagging, last-login fallback selection, panel card construction, and active-card fallback must live in the pure profile security page model.
- ProfileSecurityPage must keep translation lookup, icon component references, profile/session/security summary sources, date formatting, DOM panel refs, scroll behavior, router mutation, and API loading in the page component.
- Panel card construction must continue to derive from the shared security panel route definitions.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-security/__tests__/profileSecurityPageModel.spec.ts --maxWorkers=1`
- `node scripts/run-vitest.mjs run src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile security page model tests passed with `8` tests.
- Profile security page tests passed with `3` tests.
- Overview counts, risk flagging, last-login fallback, panel card metadata, unavailable email fallback, and active-card fallback are covered without requiring API calls, DOM scrolling, router mutation, or translation runtime in pure model tests.

### Profile Security Load Policy Expansion

Changed files:

- `src/views/ProfileSecurityPage.vue`
- `src/views/profile-security/profileSecurityPageModel.ts`
- `src/views/profile-security/__tests__/profileSecurityPageModel.spec.ts`

Policy:

- Profile/security summary load error message selection and refresh task ordering must live in the pure profile security page model.
- ProfileSecurityPage must keep API client calls, loading refs, profile and summary ref mutation, session composable calls, `Promise.allSettled`, and translated fallback copy ownership in the page component.
- The model must accept an API-error type guard instead of importing API error classes.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-security/__tests__/profileSecurityPageModel.spec.ts --maxWorkers=1`
- `node scripts/run-vitest.mjs run src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile security page model tests passed with `10` tests.
- Profile security page tests passed with `3` tests.
- API-error fallback selection and refresh task ordering are covered without requiring real user/profile API calls, audit API calls, session fetching, or `Promise.allSettled` in pure model tests.

### Profile Security Credentials Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Password credential availability and email-verification dialog payload selection must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep form refs, loading refs, email verification dialog state, verification token requests, auth store refresh, toast dispatch, and translation rendering in the component.
- Pending credential actions must use the shared `ProfileCredentialPendingAction` type so email-change and password-change verification payloads cannot drift.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `11` tests.
- Profile security page tests passed with `3` tests.
- Local-provider password flow gating and email/password verification payloads are covered without requiring verification bridge calls, auth store refresh, toast dispatch, dialog runtime, or translation runtime in pure model tests.

### Profile Security Password Submit Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Password-change submit blocker selection must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep translated error copy, toast dispatch, loading ref mutation, verification token requests, email verification dialog mutation, and API error handling in the component.
- The submit policy must distinguish busy state, provider-managed accounts, password mismatch, password length failure, and an allowed verification start.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `12` tests.
- Profile security page tests passed with `3` tests.
- Password-change blocker ordering is covered without requiring verification bridge calls, translated toast dispatch, API errors, auth store refresh, or dialog runtime in pure model tests.

### Profile Security Email Submit Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Email-change submit blocker selection must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep loading ref mutation, verification token requests, email verification dialog mutation, API error handling, toast dispatch, auth store refresh, and translated copy in the component.
- The submit policy must distinguish busy state, invalid form state, and an allowed verification start.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `13` tests.
- Profile security page tests passed with `3` tests.
- Email-change blocker ordering is covered without requiring verification bridge calls, API errors, toast dispatch, auth store refresh, or dialog runtime in pure model tests.

### Profile Security Verification Dialog State Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Credential verification dialog open and close state construction must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep ref mutation, verification token requests, API error handling, toast dispatch, form reset, emit calls, auth store refresh, and translated copy in the component.
- Dialog state construction must set `isOpen`, action, verification token, and pending credential action together so password-change and email-change flows cannot leave partial dialog state.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `14` tests.
- Profile security page tests passed with `3` tests.
- Dialog open and close state construction is covered without requiring verification bridge calls, dialog runtime, toast dispatch, form reset, auth store refresh, or emit side effects in pure model tests.

### Profile Security Verification Success Outcome Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Credential verification success outcome selection must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep toast dispatch, form ref mutation, emit calls, auth store refresh, dialog close state mutation, and translated copy in the component.
- The outcome policy must distinguish email-change success, password-change success, and missing pending-action fallback.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `15` tests.
- Profile security page tests passed with `3` tests.
- Success message key selection, email form reset, password form reset, profile refresh requirement, and empty-action fallback are covered without requiring toast dispatch, ref mutation, emit calls, auth store refresh, or dialog runtime in pure model tests.

### Profile Security Password Strength Copy Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Password strength score, CSS token, and translation key selection must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep password strength calculation, translation rendering, and DOM binding in the component.
- The password strength text policy must map every supported strength level to a stable translation key.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `15` tests.
- Profile security page tests passed with `3` tests.
- Password strength translation key mapping is covered without requiring vue-i18n runtime, DOM rendering, or password strength recalculation in pure model tests.

### Profile Security Credential Form Factory Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Credential password and email form initial state construction must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep Vue refs, v-model bindings, form reset timing, toast dispatch, emit calls, auth store refresh, and dialog state mutation in the component.
- Form factories must return fresh empty objects for each initialization or reset so password and email refs cannot share mutable state.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `16` tests.
- Profile security page tests passed with `3` tests.
- Credential form initial and reset object construction is covered without requiring Vue refs, DOM input binding, toast dispatch, emit calls, auth store refresh, or dialog runtime in pure model tests.

### Profile Security Password Visibility State Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Credential password visibility initial state, immutable field toggling, and password input type mapping must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep Vue refs, template event binding, aria binding, icon rendering, and translated toggle copy in the component.
- Visibility toggles must update one field at a time and must preserve the other credential password field states.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `17` tests.
- Profile security page tests passed with `3` tests.
- Credential password visibility state and input type mapping are covered without requiring Vue refs, template event binding, aria binding, icon rendering, or translated copy in pure model tests.

### Profile Security Provider Hint Policy Correction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`

Policy:

- Provider-managed credential guidance must use the normalized identity provider hint policy.
- Google, non-local third-party providers, and local email credentials must resolve to their own existing hint keys through `resolveAuthSourceSummaryHintKey`.
- ProfileSecurityCredentialsSection must keep translation rendering in the component and must not hard-code Google guidance for every provider-managed credential state.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `17` tests.
- Profile security page tests passed with `3` tests.
- Provider-managed credential hint rendering now reuses the existing provider hint key policy instead of always rendering the Google hint.

### Profile Security Dialog State Ref Consolidation

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`

Policy:

- Credential verification dialog state must be held as one `CredentialVerificationDialogState` ref.
- Open state, action, verification token, and pending action must be assigned together through the existing dialog state factories.
- ProfileSecurityCredentialsSection must keep template binding, verification bridge calls, toast dispatch, form reset, emit calls, and auth store refresh in the component.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Profile settings model tests passed with `17` tests.
- Profile security page tests passed with `3` tests.
- The credentials component no longer maintains separate refs for dialog open state, action, verification token, and pending action.

### Profile Security Password Submit Error Key Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Password-change blocker to toast translation-key selection must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep toast dispatch, translated rendering, verification bridge calls, loading state, and dialog mutation in the component.
- Busy and provider-managed blockers must remain silent returns; password mismatch and too-short blockers must return their existing profile translation keys.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Profile settings model tests passed with `17` tests.
- Profile security page tests passed with `3` tests.
- Password-change submit feedback key selection is covered without requiring toast dispatch, vue-i18n, verification bridge calls, loading state, or dialog runtime in pure model tests.

### Profile Security Credentials Provider Label Policy Reuse

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Provider-managed credential status labels must reuse `resolveAuthSourceSummaryLabel`.
- Google must show the Google auth source label, local credentials must show the email auth source label, and non-local providers must prefer the concrete provider label when available.
- Empty third-party provider labels must fall back to the existing generic third-party auth source label.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Profile settings model tests passed with `17` tests.
- Profile security page tests passed with `3` tests.
- Credentials provider-managed status now shares the same provider label policy as the broader profile security page.

### Profile Security MFA Provider Label Policy Reuse

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`

Policy:

- MFA auth source summary labels must reuse `resolveAuthSourceSummaryLabel`.
- Credentials and MFA panels must apply the same Google, local email, concrete third-party provider, and generic third-party fallback behavior.
- ProfileSecurityMfaSection must keep translation rendering and account metadata composition in the component.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `3` tests.
- Profile settings model tests passed with `17` tests.
- Profile security page tests passed with `3` tests.
- MFA auth source summary now shares the provider label policy used by Credentials and the broader profile security page.

### Profile Security Identity Provider Label Policy Extraction

Changed files:

- `src/components/profile/securityMfaModel.ts`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Human-readable identity provider label formatting must live in the shared profile settings model.
- Security MFA model must reuse the shared formatter for local email labels, known provider labels, and title-cased custom provider labels.
- ProfileSecurityMfaSection must keep account metadata composition and translated fallback copy in the component.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `3` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Identity provider label formatting is now shared by Profile Settings and MFA-specific model code.

### Profile Security Linked Provider Label Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- Linked identity provider list collection, de-duplication, formatting, and fallback selection must live in the MFA model.
- ProfileSecurityMfaSection must keep provider source selection and translated label inputs in the component.
- Linked provider labels must reuse the shared identity provider formatter for local email labels, known provider labels, and title-cased custom provider labels.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `5` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Linked provider label building is now covered as a pure MFA model policy, including formatted de-duplication and empty-list fallback behavior.

### Profile Security MFA Status Copy Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- MFA method summary, status label, and status hint selection must live in the MFA model.
- ProfileSecurityMfaSection must keep status source selection, localized method mapping, and translated label inputs in the component.
- Loading, pending setup, enabled, disabled, backup-code count, and method-list branches must be covered by pure model tests.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `8` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- MFA status copy selection is now covered as pure model policy for loading, pending setup, enabled, disabled, backup-code count, and method-list branches.

### Profile Security MFA Recovery Submit Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- MFA recovery verification submit eligibility must live in the MFA model.
- Disable-MFA and regenerate-backup-code forms must reuse the same code/password eligibility rule.
- Verification code input must be trimmed for eligibility; password input must be accepted as entered.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `9` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Disable-MFA and regenerate-backup-code submit eligibility now share a pure model policy for empty, whitespace-only, code, and password cases.

### Profile Security MFA Recovery Payload Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- MFA recovery verification payload normalization must live in the MFA model.
- Disable-MFA and regenerate-backup-code API calls must reuse the same code/password payload builder.
- Verification code must be trimmed and converted to `undefined` when empty; password must preserve user-entered whitespace and convert only the empty string to `undefined`.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `10` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Disable-MFA and regenerate-backup-code API calls now share a pure model payload policy for trimmed code, omitted empty values, and preserved password whitespace.

### Profile Security Passkey Device Name Payload Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- Passkey registration device-name payload normalization must live in the MFA model.
- WebAuthn registration start and finish calls must receive the same normalized device name.
- Device names must be trimmed and converted to `undefined` when empty or whitespace-only.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `11` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Passkey registration now uses a pure model policy for trimmed device names and empty/whitespace-only omission.

### Profile Security TOTP Verification Code Payload Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- TOTP verification-code payload normalization must live in the MFA model.
- ProfileSecurityMfaSection must keep empty-code warning, loading state, API call, and toast handling in the component.
- Verification codes must be trimmed before validation and submission.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `12` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- TOTP setup verification now uses a pure model payload policy for trimmed codes and empty/whitespace-only validation.

### Profile Security MFA Clipboard Text Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- MFA clipboard text construction must live in the MFA model.
- ProfileSecurityMfaSection must keep clipboard API calls, empty-text skip behavior, toast dispatch, and translated success copy in the component.
- TOTP secret and otpauth URL clipboard text must fall back to an empty string when missing; backup codes must be joined with newline separators.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `13` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- MFA copy actions now use pure model clipboard text policies for missing TOTP values and newline-joined backup codes.

### Profile Security Passkey Draft State Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- Passkey draft-name map updates, draft-name removal, and rename payload selection must live in the MFA model.
- ProfileSecurityMfaSection must keep DOM input event extraction, confirmation dialogs, API calls, toast dispatch, and status refresh in the component.
- Rename payloads must trim draft values, reject empty names, and reject unchanged names before calling the WebAuthn credential update API.
- `fetchStatus` passkey draft hydration remains in the component because GitNexus marks `fetchStatus` as a CRITICAL security-flow dependency.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `16` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Passkey draft state mutation and rename payload selection are now covered as pure model policies while status refresh behavior remains unchanged.

### Profile Security TOTP Cancel State Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- TOTP setup cancel state selection must live in the MFA model.
- ProfileSecurityMfaSection must keep template event binding and ref assignment in the component.
- Canceling a pending backend setup must keep the setup payload available while hiding the setup UI and clearing the verification code.
- Canceling a non-pending setup must clear the setup payload, hide the setup UI, and clear the verification code.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `17` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- TOTP cancel behavior is now covered as a pure state policy without moving API setup, verification, toast, or refresh side effects out of the component.

### Profile Security MFA Clipboard Eligibility Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- MFA clipboard copy eligibility must live in the MFA model.
- ProfileSecurityMfaSection must keep `navigator.clipboard` calls, toast dispatch, and translated success or error copy in the component.
- Empty and whitespace-only clipboard text must be skipped before invoking the browser clipboard API.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `18` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Clipboard copy eligibility is now covered as a pure model policy while browser clipboard side effects remain in the component.

### Profile Security MFA Backup Code Response Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- MFA backup-code response normalization must live in the MFA model.
- TOTP verification and backup-code regeneration must share the same `null` or missing backup-code fallback behavior.
- ProfileSecurityMfaSection must keep verification API calls, regeneration API calls, toast dispatch, form reset, and status refresh in the component.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `19` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Backup-code response fallback behavior is now covered as a pure model policy for array, `null`, and missing values.

### Profile Security MFA Success State Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- MFA success-state reset rules must live in the MFA model.
- TOTP verification success must normalize returned backup codes, clear the verification code, clear setup payload, and hide setup UI.
- Backup-code regeneration success must normalize returned backup codes and clear recovery verification inputs.
- MFA disable success must clear disable verification inputs, backup codes, setup payload, and setup UI.
- ProfileSecurityMfaSection must keep API calls, toast dispatch, loading flags, and status refresh in the component.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `22` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Success-state reset behavior is now covered as pure model policy across TOTP verification, backup-code regeneration, and MFA disable flows.

### Profile Security Passkey Registration Success State Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- Passkey registration success-state reset rules must live in the MFA model.
- Successful passkey registration must clear the device-name draft after WebAuthn registration is finished.
- ProfileSecurityMfaSection must keep WebAuthn support checks, ceremony API calls, credential serialization, toast dispatch, loading flags, and status refresh in the component.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `23` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Passkey registration draft reset is now covered as pure model policy while WebAuthn runtime work remains in the component.

### Schedule Date Jump Input Policy Extraction

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`

Policy:

- Schedule date-jump value selection and date-input parsing must live in the schedule page model.
- Month view must expose the first day of the visible calendar month as the date-jump value.
- Week and day views must expose the planner anchor date as the date-jump value.
- Empty, missing, and invalid date-input values must not trigger calendar navigation.
- SchedulePage must keep DOM input event extraction, selected-day mutation, and calendar navigation state mutation in the page component.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts src/views/__tests__/SchedulePage.spec.ts --maxWorkers=1`

Result:

- Schedule page model and page tests passed with `20` tests.
- Date-jump value generation and input parsing are now covered as pure model policy while page-level navigation remains in SchedulePage.

### Schedule Agenda Jump And Day A11y Policy Extraction

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`

Policy:

- Agenda jump target resolution must live in the schedule page model.
- Today agenda jumps must resolve from the injected current date.
- Next agenda jumps must resolve from the first upcoming event start time.
- Missing or invalid upcoming-event start values must not trigger calendar navigation.
- Calendar day aria-label construction must live in the schedule page model.
- SchedulePage must keep planner-view mutation, calendar navigation state mutation, and translation lookup in the page component.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts src/views/__tests__/SchedulePage.spec.ts --maxWorkers=1`

Result:

- Schedule page model and page tests passed with `22` tests.
- Agenda jump resolution and calendar day aria-label generation are covered as pure model policy while navigation side effects remain in SchedulePage.

### Schedule Summary Label Policy Extraction

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`

Policy:

- Schedule agenda summary selection must live in the schedule page model.
- Today event counts must take precedence over upcoming event counts in the agenda summary.
- Empty agenda summaries must fall back to the translated no-upcoming label.
- Planner summary selection must live in the schedule page model.
- Month planner summaries must use the visible month and active category.
- Day and week planner summaries must use the selected day label with either an event count or no-events label.
- Agenda card title and meta fallback rules must live in the schedule page model.
- SchedulePage must keep translation lookup, date formatting, and reactive state reads in the page component.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts src/views/__tests__/SchedulePage.spec.ts --maxWorkers=1`

Result:

- Schedule page model and page tests passed with `24` tests.
- Summary label, spotlight title, and spotlight meta fallback rules are covered as pure model policy while formatting and translation remain in SchedulePage.

### Router Contract Resource Redirect Policy Extraction

Changed files:

- `src/router/index.ts`
- `src/router/routeSecurityPolicy.ts`
- `src/router/__tests__/routeSecurityPolicy.spec.ts`

Policy:

- Invalid contract-resource route redirect construction must live in the route security policy module.
- Contract resource ID validation must keep using the first array route parameter value.
- Invalid guarded resource routes must redirect to `not-found` with `pathMatch` derived from the attempted path.
- Invalid guarded resource redirects must preserve query and hash state.
- Valid guarded resource routes and explicitly exempt id-param routes must not be redirected by the contract-resource policy.
- Router guard code must consume the policy result before authentication and sensitivity checks.

Validation:

- `node scripts/run-vitest.mjs run src/router/__tests__/routeSecurityPolicy.spec.ts src/router/__tests__/metaContract.spec.ts --maxWorkers=1`

Result:

- Route security policy and router meta contract tests passed with `9` tests.
- Invalid contract-resource redirect behavior is now covered as pure route policy while the global router guard keeps only orchestration logic.

### Router Auth Guard Decision Policy Extraction

Changed files:

- `src/router/index.ts`
- `src/router/routeSecurityPolicy.ts`
- `src/router/__tests__/routeSecurityPolicy.spec.ts`

Policy:

- Route security-level fallback selection must live in the route security policy module.
- Auth store loading policy must live in the route security policy module.
- Non-public routes must load and initialize the auth store before guard decisions.
- Guest-only public routes must load the auth store without initialization.
- Public non-guest routes must not load the auth store for guard decisions.
- Login redirect payload construction must live in the route security policy module.
- Unauthenticated `requiresAuth` and `sensitive` routes must redirect to login with the attempted `fullPath`.
- Authenticated guest-only routes must redirect home unless the target is a sensitive reauth login route.
- Router guard code must keep async authz freshness checks and risk-mode handling as orchestration.

Validation:

- `node scripts/run-vitest.mjs run src/router/__tests__/routeSecurityPolicy.spec.ts src/router/__tests__/metaContract.spec.ts --maxWorkers=1`

Result:

- Route security policy and router meta contract tests passed with `11` tests.
- Auth guard decision rules are now covered as pure route policy while store loading and freshness side effects remain in the router guard.
