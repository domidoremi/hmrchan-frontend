# CSS Architecture

## Single entrypoint

- Project styles must enter through `src/styles/index.css`.
- `src/main.ts` should not import additional local style files from `src/styles/`.

## Layer placement

- `foundation`: tokens and primitives only
- `semantics`: semantic tokens and theme bridges
- `components`: reusable component styling and component-level theme bridges
- `page-systems`: auth/profile/home/navbar/page-shell styling shared across views
- `presets`: preset-specific visual differences
- `utilities`: helper utilities only
- `overrides`: temporary escape hatch only; each rule here should have a removal target

## Vue SFC rules

- Prefer a single `<style scoped>` block per SFC.
- Do not mix scoped and unscoped style blocks in the same SFC.
- If a rule needs to escape component boundaries, move it into a layered CSS file instead of adding an unscoped block.

## Theme and page context

- View files must not contain `:global(#app...)` or `:global([data-...])` theme selectors.
- Base UI components must not encode page or preset context selectors.
- Theme and preset context belongs in layered CSS files under `src/styles/`.

## `:deep` and `!important`

- `:deep()` is only acceptable for third-party or framework-generated DOM that cannot be addressed through a contract.
- Prefer explicit class hooks, CSS variables, or root-level component classes before using `:deep()`.
- `!important` is reserved for:
  - reduced-motion enforcement
  - third-party override constraints
  - rare browser compatibility fixes

## Contract patterns

- `Avatar`: set fallback visuals through root variables such as `--ui-avatar-fallback-bg`, `--ui-avatar-fallback-color`, `--ui-avatar-fallback-border`, and `--ui-avatar-fallback-font-size`.
- `AnimatedIcon`: control fallback SVG rendering through root variables such as `--animated-icon-fallback-fill` and `--animated-icon-fallback-stroke`.
- `Button`: prefer root classes or `fullWidth` over styling child internals; parent scoped styles may target the child root `.btn` directly when a width/layout contract is needed.
- Theme or app-state selectors such as `[data-color-mode]` and `[data-animation-intensity]` belong in layered files under `src/styles/components` or `src/styles/page-systems`, not inside SFC scoped styles.

## Style authoring defaults

- Prefer `rem`, `fr`, `%`, `clamp()`, and `dvh/svh` over hardcoded layout `px`.
- Prefer logical properties (`inline-size`, `block-size`, `padding-inline`, `margin-block`) for direction-agnostic layout.
- Prefer transform/opacity-based motion over layout-affecting animation.
