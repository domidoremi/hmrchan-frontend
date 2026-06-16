# Generated Public Fallback Boundary

## Ownership

This directory contains checked-in generated fallback modules used by runtime
fallbacks, edge HTML rendering, and release contract audits.

Generated modules must not be edited manually:

- `publicSnapshots.ts`
- `homePrerenderManifest.ts`

The generator is `scripts/refresh-public-snapshots.mjs`.

## Refresh Policy

`bun run fallbacks:refresh` rewrites generated modules and may write media under
`public/snapshot-media/`.

Refresh requires an API environment that satisfies the current public resource
ID contract. The generator calls `assertPublicSnapshotIdContract()` before
writing module output and must fail instead of checking in retired public IDs.

## Runtime Contract

Consumers must import generated modules as read-only inputs. Runtime code must
not depend on generated timestamps for route behavior, cache keys, or release
policy decisions unless that behavior is covered by a test and release audit.

Stable surfaces:

- Public snapshot resource IDs.
- Static home prerender image shape.
- `publicSnapshots` export shape.
- Snapshot media public paths under `/snapshot-media/`.

## Validation

After changing the generator or generated modules, run the narrowest applicable
checks:

- `node scripts/refresh-public-snapshots.mjs` when intentionally refreshing
  snapshots against a valid API environment.
- `bun run scripts/audit/index.ts --only=frontend-contract` to validate checked-in
  snapshot contract state.
- `node scripts/run-vitest.mjs run src/edge/__tests__/htmlDocument.spec.ts --maxWorkers=1`
  when prerender image behavior changes.
- `bun run validate:release --mode local` before release delivery.
