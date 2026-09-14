# Frontend Architecture

[简体中文](../zh-CN/architecture.md) · [Back to English README](README.md)

## Runtime

- Vue 3 owns rendering and component lifecycle
- Pinia owns client state
- Vue Router owns route admission and lazy views
- Vue I18n owns user-visible language variants
- Cloudflare Pages Functions own same-origin edge forwarding
- The Service Worker owns offline assets and background coordination

Browser code uses same-origin `/api` and `/ws` paths. Upstream hosts and internal service identity remain edge concerns.

API concurrency and rate-limit waits honor cancellation before dispatch. Media
type probes retain only a 16-byte prefix and abort after five seconds, even when
an upstream ignores Range. The edge media policy preserves upstream privacy
directives and never promotes partial or cookie-setting responses to public cache.
Preference and locale persistence is optional and must not prevent startup or
language changes, including when the browser's storage getter throws.

## Offline action durability

Offline actions are account-owned data, not disposable cache. `addOfflineAction`
rejects on storage or transaction failure and confirms enqueue only after the
IndexedDB read-write transaction commits (using strict durability). Request
success alone is not a commit. The UI must await enqueue before displaying a
queued-success message and must retain the initiating account and resource.
Background Sync is only a best-effort replay trigger, not the durability boundary.

Cache reads and writes retain their existing best-effort behavior. Database
recovery repairs missing stores with additive version upgrades; it never deletes
the shared database to repair cache. Page and service-worker connections accept
newer repair versions and close on version changes. Owned queue records survive
repair; the pre-v5 migration intentionally discards legacy, unowned actions so
they cannot be replayed under another account.

## Backend Contracts

Backend integration and OpenAPI contracts are maintained in the backend repository under:

- `docs/frontend-integration.md`
- `docs/contracts/README.md`
- `docs/contracts/*.md`
- `docs/contracts/openapi/*.yaml`

The frontend repository does not keep copies of those contracts. Contract drift is repaired at the backend source and then reflected in frontend types, adapters, and tests.

## CSS Boundaries

- `src/styles/index.css` is the single application stylesheet entry
- Layered files contain foundation, semantics, components, page systems, presets, utilities, and temporary overrides
- Vue SFCs use one scoped style block; cross-component selectors move to layered CSS
- Theme and page context selectors stay out of base UI components
- `:deep()` is limited to third-party or generated DOM
- `!important` is limited to reduced motion, third-party constraints, and browser compatibility
