# Validation Flow

[简体中文](VALIDATION.md) · [English](VALIDATION.en.md) · [日本語](VALIDATION.ja.md)

`validate:release` is the single validation entry point for this repository. GitHub Actions
are not used; only the local unified runner determines validation status.

## Entry Points

```bash
bun run validate:release
bun run validate:release --mode hook
bun run validate:release:hook
bun run validate:release --mode prepush
bun run validate:release:prepush
bun run validate:release --mode prepush-full
bun run validate:release:prepush:full
bun run validate:release --mode local
bun run validate:release --mode local --quiet
bun run validate:release:local:quiet
bun run validate:release --mode candidate
bun run validate:release --mode production
```

| Mode           | Purpose                                                                    |
| -------------- | -------------------------------------------------------------------------- |
| `hook`         | Medium-cost Git hook gate; no build, full unit suite, Docker, or browser   |
| `prepush`      | Compatibility alias for `hook`                                             |
| `prepush-full` | Full static gate with unit tests, production build, and build security     |
| `local`        | Full local release gate, including the local browser stage                 |
| `candidate`    | Controlled-site candidate validation plus production precheck              |
| `production`   | Final validation after `main` is deployed, including deep regression tests |

The default mode is `local`. Artifacts are written to `output/validation/<timestamp>/` and
always include `summary.json`, `summary.md`, and `stages/*.json`. `--quiet` reduces console
output only; command stdout and stderr remain in their artifact directories.

On Windows, the runner resolves `bun.exe` or `bun.cmd` through the shared command executor.
Set `BUN_EXECUTABLE` only when an explicit Bun path is required.

## Local Source Of Truth

- `pre-commit` performs only minimal formatting and staged-file checks.
- `pre-push` always runs `bun run validate:release --mode hook --quiet`.
- Hooks do not rewrite the worktree or run repository-wide `prettier --write` or `eslint --fix`.
- `prepush-full` is an explicit, stronger static gate and is not part of the default hook.
- `local`, `candidate`, and `production` must be run explicitly for their respective delivery stages.
- A failed runner mode cannot be replaced by an informal collection of individual commands.

## Stage Definitions

### `hook` / `prepush`

1. Contract self-check
2. Medium-cost hook static gate

The static gate runs `format:check`, `audit:light`, `type-check`, `lint:strict`, and the
`src/__tests__/scripts/*.spec.ts` governance tests. A passing result means only that the
push gate passed; it is not a complete release validation.

### `prepush-full`

1. Contract self-check
2. Full local static gate

The static gate runs `format:check`, `audit:light`, `type-check`, `lint:strict`, `test:unit`,
`build`, and `build:security-check`. It does not start Docker or browser gates.

### `local`

1. Contract self-check
2. Full local static gate
3. Local browser gate

### `candidate`

1. Contract self-check
2. Full local static gate
3. Local browser gate
4. Controlled-site gate
5. Production precheck

A successful candidate run remains `incomplete` because production deep regression has not run.

### `production`

1. Contract self-check
2. Full local static gate
3. Local browser gate
4. Controlled-site gate
5. Production precheck
6. Production deep regression

Only a fully successful `production` run records a final `passed` release result.

## Required Inputs

The runner records and forwards these inputs:

- `BASE_URL`
- `CONTROLLED_BASE_URL`
- `PRIMARY_USERNAME`
- `PRIMARY_PASSWORD`
- `SECONDARY_EMAIL_MODE=user-assisted`
- Optional `ARTIFACT_DIR`
- Optional `QA_PREFIX`

`candidate` and `production` require `CONTROLLED_BASE_URL`. The default production target is
`https://<public-site-origin>`. `SECONDARY_EMAIL_MODE` must remain `user-assisted`.

## Status Semantics

- `passed`: all required stages passed; valid for `hook`, `prepush`, `prepush-full`, and `production`.
- `failed`: a required stage failed or was unexpectedly skipped.
- `incomplete`: validation succeeded, but production deep regression has not completed; common for
  `local` and `candidate`.

## Local Environment Blockers

The local browser gate requires Docker Desktop, the local backend stack, and the local audit bridge.
Failures such as `UPSTREAM_TIMEOUT` or `UPSTREAM_UNREACHABLE` must be reported as a blocked local
audit environment, not as a backend contract regression.

Use low-output commands in non-interactive environments:

```bash
bun run validate:release --mode hook --quiet
bun run validate:release --mode prepush --quiet
bun run validate:release --mode prepush-full --quiet
bun run validate:release --mode local --quiet
```

`local --quiet` does not skip Docker, backend, audit bridge, Puppeteer, Chrome, or any local release
stage. If the environment is unavailable, the run must fail and remain diagnostic rather than being
reported as a complete pass. After restoring the environment, run:

```bash
bun run check:frontend
bun run test:e2e
bun run validate:release --mode local
```

## Local Functional-Chain Account Matrix

The account matrix is an explicit low-output gate outside the default pre-push and local release
runners. It validates the local backend, Pages facade, and browser session behavior.

```bash
PRIMARY_USERNAME='<primary-user>' \
PRIMARY_PASSWORD='<primary-password>' \
PEER_USERNAME='<peer-user>' \
PEER_PASSWORD='<peer-password>' \
ADMIN_USERNAME='<admin-user>' \
ADMIN_PASSWORD='<admin-password>' \
LOCKED_USERNAME='<locked-user>' \
LOCKED_PASSWORD='<locked-password>' \
DISABLED_USERNAME='<disabled-user>' \
DISABLED_PASSWORD='<disabled-password>' \
bun run test:functional-chain:local
```

- The fixed login entry point is `POST /api/v1/auth/login`.
- Credentials must come from environment variables and must never be committed to tracked files.
- Artifacts are written to `output/functional-chain/<timestamp>/summary.json` and `summary.md`.
- `FUNCTIONAL_CHAIN_BASE_URL` may target an existing local frontend; otherwise the runner builds and
  starts a local Pages preview.
- Missing Docker, backend, or audit bridge dependencies must produce `environment-blocked`.
- The current matrix covers login, `/auth/session:resolve`, session isolation, locked/inactive 403
  responses, and invalid passwords. Multi-account comment, like, and notification flows require a
  separate validation batch.

## Contract Inputs

The runner derives its contract from repository truth sources:

- Routes and detail readiness: [`scripts/lib/release-route-contract.js`](../scripts/lib/release-route-contract.js)
- Authentication warmup probes: [`scripts/lib/auth-bootstrap.js`](../scripts/lib/auth-bootstrap.js)
- Production contract and Pages environment rules: [`scripts/lib/production-contract-env.js`](../scripts/lib/production-contract-env.js)
- Frontend auth surface and UUIDv7 guards: [`scripts/lib/frontend-contract-audit.js`](../scripts/lib/frontend-contract-audit.js)
- Generated fallback inputs: [`src/fallbacks/generated/publicSnapshots.ts`](../src/fallbacks/generated/publicSnapshots.ts)
- Snapshot refresh: [`scripts/refresh-public-snapshots.mjs`](../scripts/refresh-public-snapshots.mjs)
- Snapshot contract: [`scripts/lib/public-snapshot-contract.js`](../scripts/lib/public-snapshot-contract.js)
- Runner orchestration and impact classification: [`scripts/validate-release.mjs`](../scripts/validate-release.mjs) and [`scripts/lib/validate-release.js`](../scripts/lib/validate-release.js)

Public resource IDs are UUIDv7 strings after the hard cutover. Changes to `src/api`, detail routes,
fallback snapshots, or Service Worker cache keys must update their guards, tests, and release audits.
Checked-in generated snapshots must not contain retired UUIDv4 or numeric public IDs. Refreshing
fallbacks may also write `public/snapshot-media/` and therefore requires a backend that already
satisfies the UUIDv7 contract.

Risk summaries focus on these paths:

- `src/views`, `src/components`, and `src/router`
- `src/api`, `src/stores`, and `src/services`
- `src/edge`, `functions`, `workers`, and `wrangler.toml`
- Validation contracts and the runner itself

## Execution Order

Default validation:

```bash
bun run validate:release
```

Candidate validation:

```bash
CONTROLLED_BASE_URL=https://controlled.example.com \
bun run validate:release --mode candidate
```

After deploying `main` to Pages:

```bash
BASE_URL=https://<public-site-origin> \
CONTROLLED_BASE_URL=https://controlled.example.com \
PRIMARY_USERNAME=... \
PRIMARY_PASSWORD=... \
SECONDARY_EMAIL_MODE=user-assisted \
bun run validate:release --mode production
```

## Acceptance Rules

- `local` pass: local static and browser gates passed; release status remains incomplete.
- `candidate` pass: controlled-site validation passed; release status remains incomplete.
- `production` pass: validation for the deployed `main` change is complete.
- Any required failure or skipped stage produces a failed or incomplete result and cannot be waived verbally.
