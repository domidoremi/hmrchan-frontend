# Project guidance

## Core principles
- Prefer quality over speed. Fix root causes when practical, keep changes focused, and avoid unrelated refactors.
- Think before editing. Build a short execution plan for non-trivial work and validate assumptions from the codebase.
- Prefer skills and existing project workflows before inventing new ones.
- Keep important decisions traceable in commit-ready code, config, docs, or concise summaries.

## Environment
- Prefer `pwsh.exe` over `powershell.exe` so the user's PowerShell 7 profile loads `mise`.
- Assume `node`, `bun`, `python`, and related CLIs are provided by `mise`; do not download or install alternate runtimes or version managers.
- If a non-interactive context does not inherit the expected PATH, first try `pwsh.exe`; if that still fails, use `mise exec -- <command>` instead of mutating machine state.
- Run commands from the repo root unless the task clearly requires a subdirectory.

## Agent collaboration
- Maximize safe parallelism and minimize blocking.
- Split work into independent subtasks with clear ownership, inputs, and expected outputs.
- Parallelize only when subtasks do not create write conflicts and do not depend on each other's immediate results.
- Keep strongly dependent chains serial; do not force concurrency for steps like A -> B -> C when each step needs the previous result.

## Agent workflow
1. Analyze the task and identify dependency edges.
2. Separate parallelizable work from serial work.
3. Delegate only bounded subtasks with disjoint write scopes.
4. Wait for all parallel results that are needed for the next stage.
5. Reconcile conflicts, summarize findings, and start the next round if needed.

## Agent ownership rules
- One writing agent per file set whenever possible.
- If multiple agents touch the same area, split by non-overlapping responsibility rather than by guesswork.
- Read-only exploration, review, and validation are good candidates for parallel work.
- Do not ask sub-agents to redo work already assigned to another agent.
- Preserve changes made by others; integrate instead of overwriting.

## When to parallelize
- Parallelize independent file updates, focused codebase exploration, and validation that does not block current implementation.
- Prefer parallel information gathering first, then centralize analysis and decision-making.
- For same-file edits, parallelize only if the regions are clearly non-overlapping; otherwise keep the work serial.

## When to stay serial
- Stay serial for migrations with tight ordering, one-file refactors with overlapping edits, and any task where the next action depends directly on the previous result.
- Stay serial when there is significant uncertainty and local inspection is faster than coordination.

## Repo basics
- This repo is a Vue 3 + Vite + TypeScript frontend. Prefer Bun for package management and keep `package.json` and `bun.lock` in sync.
- The project expects Node `>=24.11.1 <25`.
- Preserve existing prerelease dependency channels during upgrades unless the user explicitly asks otherwise. Current examples include `vue` beta, `vite` beta, and `rolldown` rc.
- Keep changes minimal and consistent with the current architecture, naming, and file layout.
- Do not edit generated output, build artifacts, or cache directories unless the task explicitly requires it.

## Coding standards
- Follow SOLID, DRY, separation of concerns, and YAGNI in proportion to the task size.
- Prefer clear naming and small, composable units over clever abstractions.
- Handle boundary cases, async failure modes, and user-visible error paths explicitly.
- Remove dead code related to the change when it is safe to do so.
- Add comments sparingly and only where intent or constraints are not obvious from the code.

## Skills
- For CSS/style review or edits involving CSS, SCSS, Vue `<style>` blocks, or Vue `:style` bindings, use the `css-style-conventions` skill.
- For browser/UI verification or debugging that needs a real browser, use the `webapp-testing` or `playwright` skill.
- For explicit commit, push, or sync requests, use the `smart-git-flow` skill.
- Do not start Git commit or push flows unless the user explicitly asks.

## Validation
- After JS/TS/Vue/CSS edits, run the smallest relevant validation command first.
- Common checks are `bun run type-check`, `bun run test:unit`, and `bun run lint:strict`.
- For build, tooling, or dependency changes, also run `bun run build` unless the user asks not to.
- When running background or long-lived validation, prefer explicit timeouts; for unit-test style checks, keep the timeout around 60 seconds unless a longer run is clearly justified.

## Risk controls
- Ask for explicit confirmation before destructive file removal, wide-scope rewrites, irreversible data changes, production-impacting network operations, or dependency changes with broad blast radius.
- For risky operations, state the action, scope, and likely impact before proceeding.

## Maintenance
- Keep this file concise and project-specific.
- Put reusable, detailed workflows in skills instead of expanding this file indefinitely.
- Update this file when repo conventions materially change or new agent coordination rules become important.