# Release Validation

[简体中文](../zh-CN/validation.md) · [Back to English README](README.md)

`validate:release` is the release decision entry point. Every mode writes structured evidence under `output/validation/<timestamp>/`; generated evidence stays untracked.

## Commands

```bash
bun run validate:release --mode hook --quiet
bun run validate:release --mode prepush-full --quiet
bun run validate:release --mode local --quiet
bun run validate:release --mode candidate
bun run validate:release --mode production
```

`prepush` remains an alias of `hook`. The default mode is `local`.

## Modes

| Mode              | Required stages                                                            | Result contract                                  |
| ----------------- | -------------------------------------------------------------------------- | ------------------------------------------------ |
| `hook`, `prepush` | Contract checks, formatting, type-check, strict lint, focused runner tests | Push gate                                        |
| `prepush-full`    | Full static gates, unit tests, build, build security check, bundle budget  | Strengthened push gate                           |
| `local`           | Full static gates and local browser gates                                  | `incomplete` until deployed checks run           |
| `candidate`       | Local gates, controlled-site gates, production preflight                   | `incomplete` until production regression runs    |
| `production`      | Candidate stages and production deep regression                            | Only a fully passing run yields release `passed` |

The Git pre-push hook runs `hook --quiet`. It does not run the full unit suite, build, Docker, browser automation, or production checks.

## Result States

- `passed`: every required stage completed successfully
- `failed`: a required stage failed or was skipped unexpectedly
- `incomplete`: executed stages passed while deployed production evidence is still absent

## Inputs

`candidate` requires `CONTROLLED_BASE_URL`. `production` uses the public `BASE_URL` and requires the controlled target plus release credentials supplied through environment variables.

```text
BASE_URL
CONTROLLED_BASE_URL
PRIMARY_USERNAME
PRIMARY_PASSWORD
SECONDARY_EMAIL_MODE=user-assisted
ARTIFACT_DIR                 # optional
QA_PREFIX                    # optional
BUN_EXECUTABLE               # optional
```

Credentials remain in the process environment only. Tracked `.env` files and command examples contain placeholders.

## Evidence

Each run writes:

- `summary.json`
- `summary.md`
- `stages/*.json`
- Command tail logs

Artifact serialization redacts credential-like keys and values. Console output identifies a failed rule by file, line, and rule name without printing matched secret text.

## Environment Failures

Local browser gates require Docker Desktop, the local backend stack, a Pages-compatible preview, and the local audit bridge. Missing dependencies produce a failed or environment-blocked result in the evidence. Fallback output never counts as a release pass.

## Release Decision

1. Run `prepush-full` before pushing a release change
2. Run `candidate` against a controlled deployment
3. Deploy `main` through the configured platform
4. Run `production` against the deployed site
5. Accept the release only when `production` reports `passed`

Runner implementation and stage contracts live in [`scripts/validate-release.mjs`](../../scripts/validate-release.mjs) and [`scripts/lib/validate-release.js`](../../scripts/lib/validate-release.js).
