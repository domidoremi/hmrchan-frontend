# Project guidance

## Environment
- Prefer `pwsh.exe` over `powershell.exe` so the user's PowerShell 7 profile loads `mise`.
- Assume `node`, `bun`, `python`, and related CLIs are provided by `mise`; do not download or install alternate runtimes or version managers.
- If a non-interactive context does not inherit the expected PATH, first try `pwsh.exe`; if that still fails, use `mise exec -- <command>` instead of mutating machine state.
- Run commands from the repo root unless the task clearly requires a subdirectory.

## Repo basics
- This repo is a Vue 3 + Vite + TypeScript frontend. Prefer Bun for package management and keep `package.json` and `bun.lock` in sync.
- The project expects Node `>=24.11.1 <25`.
- Preserve existing prerelease dependency channels during upgrades unless the user explicitly asks otherwise. Current examples include `vue` beta, `vite` beta, and `rolldown` rc.

## Skills
- For CSS/style review or edits involving CSS, SCSS, Vue `<style>` blocks, or Vue `:style` bindings, use the `css-style-conventions` skill.
- For browser/UI verification or debugging that needs a real browser, use the `webapp-testing` or `playwright` skill.
- For explicit commit, push, or sync requests, use the `smart-git-flow` skill.
- Do not start Git commit or push flows unless the user explicitly asks.

## Validation
- After JS/TS/Vue/CSS edits, run the smallest relevant validation command first.
- Common checks are `bun run type-check`, `bun run test:unit`, and `bun run lint:strict`.
- For build, tooling, or dependency changes, also run `bun run build` unless the user asks not to.

## Maintenance
- Keep this file concise and project-specific.
- Put reusable, detailed workflows in skills instead of expanding this file indefinitely.
