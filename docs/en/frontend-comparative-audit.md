# Frontend Comparative Engineering Audit

Audit date: 2026-09-13. This is a working-tree audit, not a deployment certification.

## 1. Executive Summary

**Neither frontend currently passes its release gates.** Both have a substantial,
pre-existing application type-error backlog. The audit fixed two gates that had
concealed that backlog: the application checker accepted hundreds of diagnostics,
and the build checked an empty solution configuration without checking its
referenced application project. A successful Vite compilation is not a successful
release build.

Both frontends received controlled dependency updates and focused fixes for
cancellation, header handling, private media caching, excessive media-probe reads,
and startup when browser storage is denied. Regression tests exercise these fixes.
The dependency audit now reports no known vulnerabilities. This does not imply
that the application has no security defects.

The `hmrchan-frontend` variant has the healthier existing test/lint baseline.
`hmrchan-frontend-main` contains an in-progress original-media implementation whose
remaining contract tests and quality gates need resolution. Its original-media
behavior was preserved, not copied to the other variant or reverted to satisfy
older tests. Neither variant is declared universally better.

Evidence labels throughout this report:

- **Verified**: directly established by an executed check or observation.
- **Inferred**: supported by source inspection, not demonstrated end-to-end.
- **Not verified**: relevant execution evidence was not collected.
- **Unable to verify**: a prerequisite prevented execution.

Severity and release status are separate: P0 denotes a critical emergency; P1 a
high-priority defect or release-qualification problem; P2 a medium-priority risk;
P3 cleanup. No P0 production incident was established. P1 gate failures below
nonetheless block release qualification.

## 2. Actual Architecture of Each Frontend

Paths in this document are relative to the named frontend root. “Both” means the
same path exists independently in each tree. The report is stored once, in the
main variant's established English documentation directory.

### Initial factual inventory

| Area                      | Actual implementation in both trees                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework                 | Vue `3.6.0-beta.17`, including actual Vapor SFCs and `vaporInteropPlugin`; not an ordinary stable-Vue-only application                                                                      |
| Language                  | TypeScript `6.0.3` through `vue-tsc` for the app; `@typescript/native` is an alias to TypeScript `7.0.2` for Functions/Worker checks                                                        |
| Runtime/package manager   | Node `>=26.7.0 <27`; Bun `1.4.0`, declared in `packageManager`, toolchain files and deployment configuration                                                                                |
| Lockfile                  | Text `bun.lock`; alternative package-manager lockfiles are ignored                                                                                                                          |
| Bundler                   | Vite `8.2.2`/Rolldown, Vue plugins, image processing and custom plugins under `build/vite/`                                                                                                 |
| Entry points              | `index.html` -> `src/main.ts` -> `src/App.vue`, mounted at **`#app-root`**; separate `src/sw/index.ts`, Pages Functions and gateway Worker entries                                          |
| Routing                   | Vue Router `5.2.0`, lazy view imports, route admission and session-freshness checks under `src/router/`                                                                                     |
| State                     | Pinia `4.0.3`, composables and domain stores; selected preferences persist through `pinia-plugin-persistedstate`                                                                            |
| Networking                | Fetch-based `src/api/client.ts` and domain service adapters; four-slot transport queue, timeouts, challenge/signature/CSRF handling and bounded retry paths                                 |
| Streaming                 | Inbox SSE is implemented using fetch and a readable stream in `src/api/inboxService.ts`, with notification-store reconnect/lifecycle handling; not native EventSource                       |
| UI                        | Vue business/UI components and page-model/composable modules; GSAP, Lenis and motion-v for motion; Lucide icons                                                                             |
| Styling                   | Layered CSS from `src/styles/index.css` plus scoped SFC styles; custom critical/async CSS handling                                                                                          |
| Forms                     | Project-specific form and validation logic; no dedicated external form-state/schema library in the manifest                                                                                 |
| Sanitization              | DOMPurify and shared HTML/URL helpers in `src/utils/security.ts`                                                                                                                            |
| Authentication            | Same-origin BFF, HttpOnly session cookies and memory-only runtime session/signing material; route guards are UX controls, not the authorization boundary                                    |
| Persistence               | localStorage preferences/locale/integrity metadata; sessionStorage navigation/preview data; IndexedDB entity/list caches and offline queue; Service Worker CacheStorage                     |
| Internationalization      | Vue I18n `12.0.0-alpha.4`, four locales, non-default locale modules loaded lazily                                                                                                           |
| Environment               | `.env.example`, tracked development/production configuration, Vite environment exposure, build environment contract, `wrangler.toml` and gateway Worker configuration                       |
| Unit/component tests      | Vitest, Vue Test Utils and jsdom; fork workers; Istanbul coverage                                                                                                                           |
| Browser/integration tools | Puppeteer-based local E2E, functional-chain, accessibility/performance and release-runner scripts; Lighthouse tooling also exists                                                           |
| Quality tools             | ESLint flat configuration, Prettier `4.0.0-alpha.13`, Knip, custom source/security/contracts/docs/complexity/bundle checks                                                                  |
| Development               | `bun run dev` invokes `scripts/dev.mjs`, not plain Vite; it can coordinate local backend/preview helpers                                                                                    |
| Build                     | `bun run build` invokes `scripts/build.mjs`, Lucide patching, app type-check, Vite and artifact checks                                                                                      |
| Production                | Cloudflare Pages + Pages Functions + service-bound private gateway Worker; static prerendered shells, runtime CSR and PWA caching, not a general Vue SSR server                             |
| CI/release                | Husky and `validate:release` modes; no tracked GitHub Actions workflow found; Pages dashboard build settings are external to the checkout                                                   |
| Browser targets           | Manifest browserslist advertises module-capable defaults, but TypeScript/Vite target `ESNext`/`esnext`; no verified cross-browser support matrix                                            |
| Generated files           | `node_modules/`, `dist/`, `coverage/`, `.wrangler/`, caches, `output/`, test artifacts and alternate lockfiles are ignored; existing generated directories were not treated as source truth |

Important configurations and the English architecture/validation documentation
were inspected. No applicable `AGENTS.md` was found. The resolved project
executables used for validation were Node 26.7.0 and Bun 1.4.0; the workspace-root
default Node version was not assumed to be the project toolchain.

## 3. Branch/Variant Differences

Both trees initially pointed to commit `442e7025`. Their branch names were
`feat/original-media-default` (main directory) and
`feat/original-media-default-next` (other directory). Therefore the important
differences were **uncommitted working-tree changes**, not a different committed
dependency history.

Main began with 30 modified tracked files. The other tree began with an untracked
`.npmrc`, which was preserved. A later main-only change exporting
`HomePortalPreview` and `HomeImageAsset` from `src/api/index.ts` was observed and
preserved; it is not attributed to this audit's edits.

| Classification             | Difference and evidence                                                                                                                                                       | Consequence/action                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Shared                     | Initially identical manifests, lockfile, routing, stores and build/test configuration                                                                                         | Apply independently justified shared fixes in both; final manifest and lockfile hashes match                         |
| Intentional divergence     | Main's `src/utils/mediaOptimizer.ts:159` introduces shared, type-aware `resolveMediaSources`; main's service adapters and `src/types/index.ts` carry richer media information | Preserve the model and its callers; do not substitute the other tree's simpler media logic                           |
| Intentional divergence     | Main prefers original image streams across cards, detail, comments, previews and exploration while retaining video posters                                                    | Potentially better image fidelity, potentially more transfer/decode work; real-media comparison remains unverified   |
| Intentional divergence     | Main removes responsive thumbnail srcsets in several home/detail paths and changes navigation media-preview storage keys                                                      | Existing thumbnail-oriented tests are not automatically authoritative for the new product intent                     |
| Intentional divergence     | Main adds image-stream cache treatment in `src/sw/` and `functions/api/mediaCachePolicy.ts`; other tree retains thumbnail/image-only edge policy                              | Privacy/partial-response fixes applied without extending stream caching to the other tree                            |
| Intentional divergence     | Main changes `src/edge/htmlDocument.ts`, `src/utils/pageMetaDefaults.ts`, home content models and prerender metadata                                                          | Metadata and homepage contract tests still need reconciliation                                                       |
| Main-only issue            | Functions code used browser-only `Request.destination` on a Cloudflare Request                                                                                                | Fixed to read `Sec-Fetch-Dest`; Functions typecheck now passes                                                       |
| Main-only issue            | Existing media/metadata test assertions, unused parameters, formatting and complexity failures                                                                                | Kept visible; no wholesale assertion rewrites or formatting of unrelated user work                                   |
| Branch-only local state    | Untracked `.npmrc` in the other tree                                                                                                                                          | Preserved; no branch-only application regression established                                                         |
| Unclear / needs validation | Whether original-media changes improve real content loading under mobile networks and whether all new UI contracts are intended                                               | Requires representative backend/media fixtures and agreement on the new contract, not inference from directory names |

No routing or state-management redesign was introduced. Shared fixes were applied
to equivalent boundaries, not by synchronizing entire source files across trees.

## 4. Dependency Upgrade Results

### Controlled changes in both trees

| Package                     | Before         | After     | Reason/evidence                                                                                                                     |
| --------------------------- | -------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `vitest`                    | `5.0.0-beta.7` | `5.0.0`   | Stable release on the same intended major; reviewed Vitest 5 release information; addresses affected Vitest/mocker dependency chain |
| `@vitest/coverage-istanbul` | `5.0.0-beta.7` | `5.0.0`   | Keep provider and runner aligned                                                                                                    |
| `sharp`                     | `^0.35.3`      | `^0.35.4` | Reviewed patch release; remove vulnerable transitive Sharp resolution                                                               |
| Sharp override              | none           | `0.35.4`  | Miniflare pinned an affected `0.35.2`; direct upgrade alone did not remove it                                                       |
| `dompurify`                 | `3.4.14`       | `3.4.15`  | Small, current sanitizer patch; no sanitizer policy relaxation                                                                      |

Initial `bun audit` found the moderate
[Vitest/mocker advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) and high
[Sharp advisory](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c).
Final audits report **0 vulnerabilities across 686 audited packages in each tree**.
These advisories concern development/build tooling; production exploitability of
the original installation was not established.

**Installation correctness finding:** after a lockfile update, Bun left an obsolete
physical `node_modules/miniflare/node_modules/sharp` at 0.35.2. Only the verified,
ordinary generated Sharp directories were removed; frozen installation was
rerun. Node resolution from both the root package and Miniflare now returns
0.35.4 in both trees. An actual native Sharp create/resize/WebP pipeline succeeded
(8x8 input -> 4x4 WebP), rather than relying only on lockfile text.

Fresh isolated frozen installations succeeded for both manifests/locks. Husky was
disabled only in the disposable directories without Git metadata. The other
tree's first concurrent clean install encountered a Windows Bun ENOENT involving
an `ignore` directory; a fresh serial retry succeeded (610 installed packages).
This is an observed installation retry, not a deterministic-first-attempt claim.
In-place frozen installs also succeeded without changing either lockfile.

### Retained deliberately

`bun outdated` was run for each tree. Notable remaining update candidates included
Lucide 1.45.0, motion-v 2.4.2, Router 5.3.1, Vue Test Utils 2.5.0, Vite 8.3.0,
ESLint 10.10.0, newer Cloudflare types, Puppeteer 25.10.0 and Wrangler 4.131.1.
They were not mass-upgraded while baseline type/contract gates were failing.
The newer Wrangler line pulled a Miniflare 5 alpha dependency; the narrower Sharp
override avoided that unrelated compatibility change.

Vue 3.6 beta, Vue I18n 12 alpha and Prettier 4 alpha remain. Downgrading Vue to the
stable 3.5 line is not safe without migrating actual Vapor code. Application
TypeScript was not moved to 7 simply because the edge checker already uses it.
No unrelated major version, runtime framework migration or new runtime dependency
was introduced.

The lock contains both Vue 3.6-beta and some 3.5.41 compiler dependencies, and both
TypeScript 6/7. Conventional stable peer ranges do not necessarily admit the Vue
prerelease. These are compatibility/maintenance risks, not independently proven
runtime failures. No forced Vue/compiler deduplication was attempted.

Knip flagged Wrangler as unused, but `scripts/local-pages-preview.ts` uses the
platform tooling, so it was retained. Main additionally reports
`src/utils/thumbnailCache.ts` as unused following its media changes; removal is
deferred until that implementation settles. No package was labeled abandoned or
malicious merely from its age/name; a full supply-chain provenance review was not
performed.

Vitest 5 exposed four late async-import teardown errors in two profile test files.
The tests now stub the intended `ConfirmDialog`, auto-unmount and use actual
confirmation-button interactions. Assertions were strengthened, not weakened.
An obsolete, now-unused `@ts-expect-error` in `vitest.config.ts` was removed.

## 5. Confirmed Bugs

Locations below refer to the edited source, unless explicitly described as the
before state. Focused tests accompany all shared runtime fixes.

| ID / severity / affected tree       | Location and root cause                                                                                                                                                                                                                     | Impact/reproduction                                                                                                                                                                | Action and validation                                                                                                                                                                                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1 / P1 / Both                      | `scripts/check-app-type-budget.mjs:1`; `scripts/build.mjs:61`. The checker accepted up to 477 diagnostics; build used `vue-tsc --noEmit` on the empty solution config, without build mode or an app project argument                        | Baseline build returned success despite hundreds of strict app errors; release evidence was misleading                                                                             | Removed the diagnostic allowance, preserved compiler exit codes, explicitly selected `tsconfig.app.json` in build. Three subprocess regression cases pass. Real build/type gates now fail honestly on the backlog. **Verified fixed gate; backlog unresolved**                                     |
| F2 / P2 / Both                      | `src/api/client/transport.ts:16,47,79`. Queued requests and rate-limit waits ignored AbortSignal                                                                                                                                            | Fill four slots, queue a fifth and abort it; previously rejection waited on unrelated traffic. Cooldown aborts retained timers and could still dispatch                            | Abort-aware queue removal, timer cleanup, pre-dispatch abort check and slot release. Three regression cases cover queued, cooling-down and pre-aborted requests. **Verified fixed in tests**                                                                                                       |
| F3 / P1 / Both                      | `functions/api/mediaCachePolicy.ts` (`resolveMediaCacheControl`), called near line 1539 of `functions/api/[[path]].ts`. Public immutable policy did not honor upstream privacy or cookie-setting responses                                  | An anonymous request receiving upstream `private`, `no-store`, `no-cache` or Set-Cookie could be promoted to public cache; partial responses were also unsafe promotion candidates | Pass response headers into policy; retain private/no-store for privacy directives, cookies, ranges and non-200 responses. Five new failing-before cases pass after the fix, alongside existing auth/media tests. **Verified at policy-test level; deployed CDN behavior not verified**             |
| F4 / P2 / Both                      | `src/utils/mediaStreamProbe.ts:1`; callers in `post-card/postCardMediaQuality.ts` or main `src/utils/mediaOptimizer.ts:319`. A Range request previously used whole-body buffering                                                           | A server can ignore Range and return an entire original file, causing excessive allocation and download; a stalled probe could hang                                                | Retain only a 16-byte prefix, cancel the body, avoid reading declared video bodies, abort after five seconds. Three stream tests pass. Main also evicts failed probes from its bounded promise cache. **Verified fixed in tests**                                                                  |
| F5 / P2 / Both                      | `src/api/client.ts:395`. Object-spreading `Headers` or tuple-array inputs lost/misrepresented headers; Content-Type check was case-sensitive                                                                                                | Valid Fetch HeadersInit inputs could lose custom headers or receive an unwanted duplicate/default content type                                                                     | Normalize Headers/tuples and detect existing Content-Type case-insensitively. Two client regression tests reproduced the failure and pass. **Verified fixed in tests**                                                                                                                             |
| F6 / P1 / Both                      | `src/i18n/index.ts:25,103`, `src/main.ts:284`, `src/utils/optionalStorage.ts:1`, `src/utils/fingerprint.ts:30`. Storage access escaped error boundaries, including a `typeof localStorage` getter access and Pinia's default storage lookup | A browser whose localStorage getter throws failed to mount. Locale writes could also prevent completing a language change                                                          | Best-effort locale access and preference adapter; storage access only inside guarded blocks. Two locale tests and three storage/fingerprint tests pass. Actual Chrome startup with a throwing localStorage getter mounts in both trees without page errors. **Verified fixed for tested scenario** |
| F7 / P2 / Main only                 | `functions/api/[[path]].ts:1545`. Browser `Request.destination` was assumed on the Cloudflare request type                                                                                                                                  | Functions typecheck failed and intended image-stream cache classification could not work as written                                                                                | Read `Sec-Fetch-Dest` with an empty fallback; preserve content-type/auth/range checks. Functions typecheck passes. Header is only a cache hint, not authorization. **Verified compile/policy tests; edge runtime not verified**                                                                    |
| F8 / P2 / Both, test infrastructure | `src/components/profile/__tests__/ProfileLikesTab.spec.ts` and `ProfileCommentFavoritesTab.spec.ts`. Wrong async stub name plus absent auto-unmount left imports active after test teardown                                                 | Full coverage reported four unhandled errors despite passing assertions                                                                                                            | Correct stub, auto-unmount, click the confirmation control and assert dialog state. **Verified full coverage after repair**                                                                                                                                                                        |

The media probe limits retained application data, **not guaranteed wire bytes**:
browser/network buffering can deliver a larger chunk before cancellation.
Likewise, storage-denied startup verification is not a guarantee that every
authenticated/offline feature works without storage.

### Confirmed unresolved reliability defect

**F9 — P2, shared: offline “queued” confirmation is not a durable-write guarantee.**
`src/utils/cache/idb.ts:310` resolves `idbSet` on the individual request's success,
not transaction completion. `withStoreRecovery` at line 92 also converts errors
into an undefined fallback. `src/utils/cache/offlineQueue.ts:64` treats this as a
successful enqueue, and `src/components/business/PostActionStrip.vue:250` displays
the queued toast. A later transaction abort or swallowed quota/storage error can
therefore produce confirmation without a stored action. The same database holds
disposable caches and offline writes, while recovery at `idb.ts:52` can delete the
database for missing-store recovery.

This control-flow defect is **confirmed by inspection**; real quota exhaustion,
crash recovery and data loss were **not reproduced in a browser**. It was not
patched by simply changing all cache writes to throw: that would alter many
best-effort cache callers without a durable-queue/schema design. Required follow-up:
separate durable enqueue semantics, await transaction completion, propagate
failure to UI, and protect queued writes during cache recovery/migration.

## 6. Performance Findings

### Measurements

Both variants were compiled directly with Vite into disposable directories for
diagnosis after the release build correctly stopped on types. This bypass was an
observation method, not a replacement release gate.

| Measurement                        | Main          | Other         | Interpretation                                                                           |
| ---------------------------------- | ------------- | ------------- | ---------------------------------------------------------------------------------------- |
| Total emitted JS                   | 1.84 MiB      | 1.83 MiB      | Both pass 1.86 MiB budget, with limited headroom; uncompressed emitted bytes             |
| Total emitted CSS                  | 889.4 KiB     | 889.4 KiB     | Both pass 933.6 KiB budget                                                               |
| Emitted images                     | 2.68 MiB      | 2.68 MiB      | Both pass 2.82 MiB budget                                                                |
| Largest JS chunk                   | 175.8 KiB     | 172.3 KiB     | Below 249.9 KiB budget                                                                   |
| Largest CSS chunk                  | 349.6 KiB     | 349.6 KiB     | Below 375.0 KiB budget; still a substantial stylesheet                                   |
| Budget-counted initial HTML assets | 7             | 7             | Below 8; does not represent the complete module graph                                    |
| Actual cold homepage JS requests   | 70            | 70            | Browser resource timing includes imported modules, unlike HTML-only budget count         |
| Cold homepage resource transfer    | 527,459 bytes | 524,957 bytes | Local Chrome, mocked 503 APIs; not representative production content/media traffic       |
| Measured dev HTTP readiness        | 2,224 ms      | 3,368 ms      | One local sample each, bridge auto-start disabled; not a statistically meaningful winner |
| Initial diagnostic Vite run        | about 9.71 s  | about 11.37 s | Different from the full release wrapper; local cache/workload dependent                  |
| Final Vite main-build log duration | 2.82 s        | 2.94 s        | Warm diagnostic runs; SW plugin separately reported 33/27 ms; not total release latency  |

**F10 — P2, shared, initial-load budget gap:**
`scripts/check-bundle-budget.mjs` measures seven initial HTML references while
executed browser resource timing sees 70 JavaScript requests. This is verified,
but does not by itself establish a harmful waterfall. Add imported-graph/transfer
budgets and real route profiling before changing chunking. No speculative vendor
merge, memoization, virtualization or animation rewrite was performed.

Lazy routes and lazy locales are present. The runtime includes Vue, DOMPurify,
fingerprinting and three motion-related libraries. Those libraries have actual
uses; their presence alone is not evidence of removable duplication. Production
minification, CSS splitting, source-map prohibition and SRI are configured.

Main's removal of thumbnail srcsets and preference for originals is a
**P2 performance risk inferred from implementation**, not a measured regression
in real media traffic. The common bounded-probe fix addresses a concrete
allocation/download defect without reversing main's intended fidelity policy.

### Network, lifecycle and storage

- Cancellation now frees queued work promptly; the four-slot transport and
  cooldown logic remain. API retry/security tests run in the unit suite. No live
  request-storm/load test was performed.
- Inbox parsing caps SSE frames at 256 KiB; notifications cap reconnect attempts
  at five with a 30-second maximum delay. Source inspection found cleanup logic;
  long-running production connection stability was not established.
- IndexedDB schema version 5 is real, not inferred from a dependency. Cache
  configuration limits posts to 1,000, lists to 50 and metadata to 300, with TTLs
  and pruning callers. Memory cache adapts up to 300 entries; SW limits are
  configured for 500 media and 200 API entries. These are policies, not proof that
  every storage backend always enforces a hard cap under races.
- sessionStorage navigation context caps IDs at 200 and expires after 30 minutes.
  JSON serialization remains synchronous. No realistic large-data serialization
  or low-end-device profile was obtained; no measured main-thread regression is
  claimed.
- Offline enqueue durability remains F9; bounds/retries do not compensate for an
  uncommitted or swallowed write.

HMR update latency, CPU traces, memory soak tests, real media transfer/decode,
production Core Web Vitals and Lighthouse performance scores are **not verified**.

## 7. Security Findings

The principal fixed security/reliability boundary is **F3 (P1, both)**: upstream
privacy is no longer overwritten by public immutable media caching. Unit tests
cover private/no-store/no-cache, Set-Cookie and partial responses. No shared-cache
data exposure in the deployed service was claimed or tested invasively.

Dependency advisories were removed as described in section 4. Native resolution
was checked in addition to audit metadata to avoid a false clean result from a
stale nested package.

Inspected controls include DOMPurify's allowlist, URL handling, same-origin API
forwarding, CSRF/signature/challenge handling, HttpOnly BFF session cookies and
memory runtime auth. Persisted anonymous integrity metadata is not equivalent to
a user session token. Frontend route checks cannot replace backend authorization.
Security, auth-surface and frontend-contract audit modules pass, but these are
finite static/test rules rather than a penetration test or exhaustive secret scan.

A read-only HEAD request to the existing public site returned 200, a CSP without
script `unsafe-inline`/`unsafe-eval`, `frame-ancestors`, `nosniff`,
`strict-origin-when-cross-origin`, and revalidation-oriented document caching.
**That response describes the existing deployment, not these undeployed changes.**
No production writes, security-setting changes or deployment were performed.

**P2, shared operational gap:** configuration audits warn about example/development
variable drift (gateway secret, beacon settings and Google-auth flag) and an
undocumented local auto-bridge flag. These were not filled with guessed values.
Cloudflare dashboard secrets, private service binding behavior, logging redaction
under real failures and backend authorization remain outside verified scope.

## 8. Code Quality Findings

**F11 — P1, both, application type backlog:** baseline strict checks reported 476
diagnostics in 129 files for main and 459 in 127 files for the other variant.
Representative real diagnostics include auth response narrowing,
`Uint8Array<ArrayBufferLike>` versus Fetch `BodyInit`, missing return paths and
exact optional property violations in API/component contracts. These are not all
one dependency incompatibility. No `any` sweep, blanket casts, optional-type
widening, compiler relaxation or lint suppression was used to conceal them.

**F12 — P2, both, config project coverage:** independently checking
`tsconfig.node.json` still produces 12 TS6307 diagnostics because its composite
project omits imported build plugins, edge prerender helpers and the dev-proxy
helper from its include list. The unused Vitest compatibility suppression was
removed, but the broader project-boundary configuration was not redesigned.
Application/edge gates do not constitute a clean check of this separate config
project.

Main's existing strict lint failures are ten unused parameters in
`src/views/homepage/homeImagePolicy.ts:33`, `homeModel.ts:557` and
`src/views/post-detail/postDetailModel.ts:621-695`. Six existing main source
files still fail formatting: PostCard's media-quality helper, CommentCard,
MediaLightbox, ExplorePage, PostDetailPage and postDetailModel. These were not
broadly reformatted while preserving the user's media work.

Main's `src/views/homepage/homeModel.ts` has 1,016 lines and exceeds the
unregistered-file complexity soft limit of 1,000. Other existing pages are much
larger but explicitly registered in the repository's refactor queue. The audit
did not raise thresholds or add an exemption to make the gate green. An arbitrary
line-count split would not prove lower coupling; extract a coherent model boundary
when the media contract is settled.

The common transport/probe/storage changes are localized abstractions with direct
callers and regression tests. Main-only fixture repairs use partial imports so
new real exports remain available; existing media assertions were not rewritten
to accept every new value.

## 9. Testing Findings

Final main unit run: **255 files, 246 passing / 9 failing; 1,476 tests,
1,462 passing / 14 failing**, with no reported unhandled errors. Final other-tree
coverage run: **255 files and all 1,476 tests pass**, with no reported unhandled
errors. Coverage is 57.29% statements, 48.16% branches, 58.34% functions and
59.39% lines; the existing thresholds were not changed.

Baseline other-tree unit tests passed: 250 files, 1,455 tests. Main initially had
25 failed assertions, 1,430 passes and 12 unhandled errors. Main's existing
media changes therefore had a demonstrably different test baseline before the
dependency update.

Added focused coverage includes:

- `src/__tests__/scripts/application-type-gate.spec.ts`: compiler exit propagation.
- `src/api/__tests__/transportCancellation.spec.ts`: saturation, cooldown and
  pre-aborted dispatch prevention.
- `src/utils/__tests__/mediaStreamProbe.spec.ts`: ignored Range, declared video,
  cancellation and timeout.
- `src/i18n/__tests__/storage.spec.ts`: denied locale reads/writes.
- `src/utils/__tests__/optionalStorage.spec.ts`: throwing storage getter, Pinia
  in-memory operation and normal persistence/fingerprint import behavior.
- Additional existing client and edge-policy assertions for HeadersInit and
  upstream media privacy; PostCard now explicitly expects an AbortSignal.

Main's remaining failures span the prior media/metadata contracts, including
CommentCard original-vs-thumbnail selection, ReferencedPostPreview cache arguments,
PostCard loaded-state behavior, homepage srcsets, post-detail image/preload
resolution, and page metadata. These are not all declared harmless “stale tests”:
the loaded-state and fallback assertions still need real-content validation.

Coverage excludes `src/main.ts`, routing, Functions and scripts, among other
paths. The numerical coverage result cannot establish startup, routing, edge or
release-runner correctness. Those need separate evidence. jsdom tests also do not
validate image decoding or Cloudflare cache behavior.

### Rendered browser verification

Diagnostic production assets were served locally with preview proxying disabled.
Puppeteer used Chrome `152.0.7977.42`; API responses were forced to 503 and external
requests blocked. Both trees passed ten observed route/viewport combinations:
`/`, `/explore`, `/search?q=audit`, `/login` and an unknown route at widths 1440
and 390. Each mounted at `#app-root`, exposed a main landmark/headings and had no
horizontal overflow. No page errors or failed asset HTTP responses were recorded.
SPA exploration navigation and visible keyboard focus were observed. Final
mobile homepage screenshots were visually inspected. The denied-localStorage
startup scenario also mounted successfully in both trees without page errors.

This establishes a useful **offline/failed-API rendering baseline**, not successful
login, backend search, actual post content, complete accessibility compliance or
cross-browser correctness.

## 10. Production Readiness

**Main: not release-ready. Other: not release-ready.**

### Final comparison

| Area                 | hmrchan-frontend-main                                      | hmrchan-frontend                                    | Better / notes                                                   |
| -------------------- | ---------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| Dependencies         | Controlled updates; 0 audit vulnerabilities                | Same versions/lock; 0 audit vulnerabilities         | Equivalent; prerelease compatibility risks retained              |
| Build health         | Release build fails; diagnostic Vite compile passes        | Release build fails; diagnostic Vite compile passes | Neither passes release build                                     |
| Type safety          | 462 app errors in 127 files                                | 459 app errors in 127 files                         | Both require substantial contract repair                         |
| Test health          | 1,462 pass / 14 fail                                       | 1,476 pass; coverage gate passes                    | Other has healthier verified test baseline                       |
| Runtime performance  | Offline shell/browser checks pass; originals policy        | Same shell checks pass; thumbnail-oriented policy   | No representative live-media performance winner established      |
| Bundle performance   | JS 1.84 MiB; CSS 889.4 KiB                                 | JS 1.83 MiB; CSS 889.4 KiB                          | Other slightly smaller; both near JS budget                      |
| Security             | Same shared fixes; image-stream cache extension retained   | Same shared fixes; narrower media cache policy      | No overall security winner established; deployment not exercised |
| Maintainability      | 10 lint errors, 6 formatting files, 1 complexity violation | Lint/format/complexity pass                         | Other currently healthier; shared config/types debt remains      |
| Production readiness | Not ready                                                  | Not ready                                           | Confirmed release gates fail in both                             |

### Confirmed blockers

1. **Both:** zero-error application type checking and `bun run build` fail on the
   existing type backlog (F11). The previous successful wrapper result was
   invalid evidence because of F1.
2. **Main:** full unit tests, strict lint, formatting and complexity checks still
   fail. A release cannot be certified while these established gates are red.

Frozen installation, compilation of diagnostic assets, security/bundle budgets
and browser shell checks provide positive evidence, but do not overrule these
blockers. Build bit-for-bit determinism and deployability of Functions/Worker
bindings were not established. Source maps are intentionally excluded from
production; observability/source-map upload workflows were not validated.

No controlled or production release certification was executed. Local E2E was
attempted in both trees and stopped at app type checking before browser/backend
flows. Docker was available and the local backend containers were healthy; this
failure must not be attributed to missing Docker. No credentials were fabricated
and no production mutation was used to complete a check.

## 11. Changes Made

### In both independent roots

- `package.json`, `bun.lock`: four controlled package updates plus transitive
  Sharp override; no framework migration.
- `scripts/check-app-type-budget.mjs`, `scripts/build.mjs`: truthful zero-error
  app type/build gates.
- `src/api/client/transport.ts`, `src/api/client.ts`: cancellation and HeadersInit
  correctness.
- `functions/api/mediaCachePolicy.ts`, `functions/api/[[path]].ts`: preserve
  upstream media privacy and reject public partial-response caching.
- New `src/utils/mediaStreamProbe.ts`, integrated at each variant's own media
  boundary: bounded prefix inspection and timeout/cancellation.
- `src/i18n/index.ts`, `src/main.ts`, `src/utils/fingerprint.ts`, new
  `src/utils/optionalStorage.ts`: optional preference storage and safe startup.
- Focused new/expanded tests listed in section 9; profile test lifecycle repair.
- `vitest.config.ts`: remove obsolete compatibility suppression.
- `README.md`, `docs/en/README.md`: test-tool version synchronization;
  `docs/en/architecture.md`, `docs/en/validation.md`: changed runtime/gate behavior.

### Additional main-only work

- Cloudflare-compatible image-destination lookup in the API proxy.
- Preserve main's richer media resolver and bounded probe cache; evict failed
  probe results rather than poisoning that cache permanently.
- Repair incomplete mocks/fixtures in PostDetailPage and MediaLightbox tests,
  without relaxing existing assertions.
- This single comparative report in `docs/en/frontend-comparative-audit.md`.

Existing original-media, home metadata and SW changes are **not** claimed as audit
implementations. The other tree's `.npmrc` and the later main API export change
were preserved. Nothing was staged, committed, pushed or deployed. Disposable
probes/logs/screenshots/bundles/clean installs were kept outside the repository;
normal generated coverage/caches remain in their established ignored locations.

## 12. Validation Results

Commands below were run independently from each frontend root using the resolved
Node 26.7.0 and Bun 1.4.0 toolchain. Final numerical results are recorded in the
completion table below. Failed commands are not represented as green checks.

| Check                                           | Main final result                                           | Other final result                                               |
| ----------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| Fresh and working-tree frozen install           | Pass                                                        | Pass after the documented isolated-install retry                 |
| `bun run type-check:app:strict`                 | Fail: 462 errors / 127 files                                | Fail: 459 errors / 127 files                                     |
| `bun run type-check:functions`                  | Pass                                                        | Pass                                                             |
| `bun run type-check:worker`                     | Pass                                                        | Pass                                                             |
| Config project check                            | Fail: 12 TS6307 diagnostics                                 | Fail: 12 TS6307 diagnostics                                      |
| `bun run lint:strict`                           | Fail: 10 unused-parameter errors                            | Pass                                                             |
| `bun run format:check`                          | Fail: 6 files                                               | Pass                                                             |
| Full unit/component execution                   | `test:unit`: 1,462 pass / 14 fail; 255 files                | `test:coverage`: 1,476 pass; 255 files; coverage thresholds pass |
| `bun run build`                                 | Fail at app type check                                      | Fail at app type check                                           |
| `bun run test:e2e`                              | Build prerequisite failed; browser/backend flow not reached | Same                                                             |
| `bun run check:complexity-budget`               | Fail: homeModel 1,016 lines, unregistered >1,000            | Pass                                                             |
| Dependency audit                                | Pass: 0 vulnerabilities / 686 packages                      | Same                                                             |
| Documentation audit                             | Pass                                                        | Pass                                                             |
| Diagnostic Vite assets + security/bundle checks | Pass, not a release build                                   | Same                                                             |
| Diagnostic Chrome routes                        | 10/10 mounted, no page/asset errors or overflow             | Same                                                             |
| Denied-localStorage startup                     | Mounted, no page errors                                     | Same                                                             |

Main's final type count is lower than its initial 476-error baseline. The audit
also observed concurrent main API-export/source edits, so that entire reduction
is not attributed to this patch. Its formatting count similarly decreased from
the earlier seven-file run to six in the final check; unrelated user edits were
not reverted to freeze an earlier result.

### Verified green checks

- `bun run test:coverage`: other tree passes all 1,476 tests across 255 files and
  the unchanged coverage thresholds; no unhandled errors reported.
- `bun install --frozen-lockfile`: both working trees and isolated fresh copies;
  locks unchanged. Isolated installs used `HUSKY=0` because no Git repository was
  present. One Windows concurrent-install failure required a serial retry.
- `bun run type-check:functions`: both pass after main's destination fix.
- `bun run type-check:worker`: both pass.
- `bun run audit:deps` (`bun audit`): both pass, zero known vulnerabilities.
- `bun run audit:docs`: documentation sanitization passes.
- `bun run lint:strict`, `bun run format:check`,
  `bun run check:complexity-budget`: pass in the other tree, not main.
- `bun run scripts/audit/index.ts --only=security`, `--only=frontend-contract`,
  `--only=frontend-patterns`, `--only=auth-surface`, `--only=pwa`, `--only=i18n`:
  module-level checks pass in both trees. This is not a passing full `audit:repo`.
- `node node_modules/vite/bin/vite.js build --outDir <temporary-bundle>/dist`:
  diagnostic compilation succeeds in both; explicitly **not** `bun run build`.
- From each temporary bundle parent, running that tree's
  `scripts/check-build-security.mjs`: both diagnostic artifacts pass security
  checks. SRI generation tagged 130 resources across 11 HTML files.
- With `BUNDLE_BUDGET_DIST_DIR=<temporary-bundle>/dist`,
  `node scripts/check-bundle-budget.mjs`: both diagnostic artifacts pass; section 6
  records the actual measurements and the initial-reference limitation.
- Temporary Puppeteer route/storage probe and native Sharp pipeline: both pass
  the scenarios described above. These are bounded diagnostic checks, not the
  project's full E2E suite.

### Failed or incomplete checks

- `bun run type-check`, `bun run type-check:app:strict`, `bun run build`: fail on
  app types. Aggregate `type-check` short-circuits, so Functions/Worker were also
  run separately.
- `node node_modules/vue-tsc/bin/vue-tsc.js --noEmit --pretty false --project tsconfig.node.json`:
  12 TS6307 diagnostics in each tree after removing the unused suppression.
- Main `bun run test:unit`, `bun run lint:strict`, `bun run format:check`,
  `bun run check:complexity-budget`: fail as detailed above.
- `bun run test:e2e` with `E2E_REQUIRE_AUTH=false`: fails at its prerequisite build
  in both trees. Authenticated browser/API integration is **unable to verify**
  through this gate, not passed or silently skipped.
- Knip: reports the Wrangler usage false positive in both, plus main's unused
  thumbnail helper. No whole-repository dead-code-clean claim.
- Environment module: warnings described in section 7, not a warning-free result.
- `git diff --check`: other tree passes; main reports an extra blank line at EOF
  in `src/components/business/post-card/postCardMediaQuality.ts:34`. That file's
  SHA256 is unchanged from the initial user working tree; it was not reformatted
  as part of this audit.

Raw command logs, initial status/hash inventories, browser JSON/screenshots and
isolated installs are retained in the operating-system temporary evidence
directory named `hmrchan-audit-20260913`. Files prefixed with a variant name and
`completion-` are the final command runs. Earlier `baseline-` logs establish
pre-change failures; `final-` logs are intermediate audit runs, not necessarily
the latest. Temporary evidence is machine-local and is not required to run the
committed regression tests.

## 13. Remaining Risks

- **P1 / both:** unresolved application types prevent a valid release build;
  runtime tests do not substitute for repairing their contracts.
- **P1 / main:** remaining media/metadata tests and quality gates need coherent
  resolution without discarding intentional original-media behavior.
- **P2 / both:** offline enqueue/cache-reset durability defect F9 remains.
- **P2 / both:** prerelease framework/i18n/formatter compatibility, duplicate
  compiler versions, config-project diagnostics and an unverified browser target
  matrix remain. Working in one Chrome build is not Safari/Firefox/mobile proof.
- **P2 / both:** bundle headroom is small and imported-module initial loading is
  underrepresented by the HTML asset-count budget. Main's real-media cost is
  unmeasured.
- **P2 / both:** authenticated login/refresh/logout, MFA/passkeys, uploads/writes,
  deployed edge forwarding, cache isolation, offline replay across users/tabs,
  real storage quota failures and production load are not end-to-end verified.
- **P2 / both:** no independent evidence that dashboard CI/release settings,
  observability or secrets/service bindings match repository intent.
- **P3 / main:** unused thumbnail helper after media divergence; postpone cleanup
  until ownership and intended callers settle.

## 14. Recommended Next Steps

1. **Repair app contracts in coherent batches, starting with API/auth/body types.**
   Keep zero-error gates enabled. Use focused tests and backend contract evidence;
   do not widen everything to `any` or suppress strict compiler options.
2. **Finish main's original-media contract.** Resolve its 14 remaining assertions
   against agreed image/video/fallback/metadata behavior, then fix unused
   parameters, localized formatting and the oversized home-model boundary. Do
   not change assertions merely to obtain a pass.
3. **Give offline writes an explicit durable contract.** Test transaction abort,
   quota failure, cache repair/migration and multiple tabs/users before changing
   generic cache error semantics.
4. **Repair the config TypeScript project boundary.** Include its actual imported
   build/edge helpers coherently and add that check to release evidence after it
   is clean; do not remove composite/type checks to hide missing inputs.
5. **After build gates are green, run the actual local E2E and controlled release
   suite.** Exercise authentication, refresh, permissions, uploads, media ranges,
   failed network recovery and offline replay with authorized test accounts.
6. **Measure real routes/media before further optimization.** Capture cold-cache
   JS/CSS transfer, imported-module graph, mobile image decode and HMR latency;
   compare original streams against responsive thumbnails using identical data.
7. **Establish a browser/CI support policy, then plan compatibility upgrades.**
   Reconcile `esnext` with supported devices; evaluate stable framework migration
   separately from the security patches already made.

Release only after the project's complete required gates and controlled/deployed
checks pass. This audit deliberately leaves failures visible rather than
manufacturing a production-ready verdict.
