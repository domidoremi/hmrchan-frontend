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
