# Frontend and Cloudflare Edge Security Remediation Report

Date: 2026-07-14
Scope: `hmrchan-frontend-main` Vue 3 browser application, Cloudflare Pages Functions, service worker, and repository-owned internal API Worker
Status: All confirmed in-scope findings repaired; release validation and delivery evidence recorded below

## Executive summary

The review identified fourteen concrete security, privacy, reliability, accessibility, and release-control findings. The highest-risk paths were an unauthenticated internal API gateway, incomplete CSRF and private-response cache controls, stale cross-principal browser state, unowned offline mutations, and insufficiently bound OAuth popup messages. The remaining findings covered telemetry leakage and resource limits, SSE buffering, service-worker consistency, backend-supplied URLs, development proxy defaults, dialog behavior, cached-page lifecycle cleanup, dependency advisories, and edge type-check coverage.

All confirmed issues owned by this repository have been remediated. The changes use centralized controls at trust boundaries, fail closed when identity or provenance cannot be established, preserve successful user-visible results when optional metadata fails, and add focused regression coverage. The dependency audit moved from an observed baseline of 14 advisories (4 high, 5 moderate, 5 low) to zero reported vulnerabilities with the repository-pinned Bun 1.3.11 runtime.

The remaining frontend engineering debt is not a newly introduced vulnerability: the application type-check currently has a frozen budget of 477 diagnostics across 130 files. The budget prevents regression, while Pages Functions and the internal Worker are checked strictly with zero diagnostics. Candidate and production browser validation are not represented as complete because they require a controlled deployed site and live backend services.

## Method and prioritization

The inspection combined source tracing, targeted security-pattern searches, dependency advisory inspection, focused unit tests, the complete unit suite, strict linting, split application/edge type checks, production build and bundle checks, and GitNexus change-impact analysis. Findings were prioritized as follows:

- P0: externally reachable trust-boundary bypasses, cross-principal data exposure, or unauthorized state change.
- P1: sensitive-data leakage, unbounded resource consumption, unsafe navigation, and release-control gaps.
- P2: reliability and accessibility failures with meaningful security or privacy side effects.
- P3: maintainability debt that can conceal future regressions.

The remediation method was chosen per subsystem: shared boundary helpers for repeated policy, epoch/abort semantics for asynchronous identity transitions, transactional leases for offline work, platform-native origin/source checks for browser messaging, bounded parsing for untrusted streams and telemetry, and release gates for supply-chain and type-coverage risks.

## Findings and completed remediation

### SEC-01 — Internal API gateway accepted unauthenticated traffic

- Severity / priority: Critical / P0
- Rules and sources: frontend secrets must remain server-side; Cloudflare recommends explicitly controlling `workers.dev` exposure.
- Root cause: the service-binding gateway path did not require an independently provisioned caller credential, and the Worker could be reachable through its default `workers.dev` route. A caller reaching the Worker could attempt to use it as a bridge to private upstream services.
- Repair evidence:
  - `src/edge/internalApiGateway.ts:12-34` injects a server-only `X-MomiChan-Internal-Gateway-Token` from `INTERNAL_API_GATEWAY_SHARED_SECRET` and fails when the binding or secret is absent.
  - `src/edge/internalApiGatewayWorker.ts:71-84` compares SHA-256 digests without an early-exit string comparison; `src/edge/internalApiGatewayWorker.ts:91-119` rejects missing configuration or invalid credentials with non-cacheable errors.
  - `src/edge/internalApiGatewayWorker.ts:18-35` strips internal, forwarding, proxy-authentication, and connection-specific credentials before upstream forwarding.
  - `workers/internal-api/wrangler.toml:4` sets `workers_dev = false`.
  - `.env.example:23-25` documents runtime secret provisioning without exposing it through a `VITE_` variable.
- Regression evidence: `src/edge/__tests__/internalApiGatewayWorker.spec.ts` verifies missing/invalid credentials and credential stripping; `functions/api/__tests__/proxy.spec.ts` verifies the authenticated binding path.
- Status: Resolved. A replayable shared secret is appropriate for the current Cloudflare service-binding topology; signed or mutually authenticated service identity remains a platform hardening option.

### SEC-02 — Unsafe cookie-authenticated requests and authenticated media were insufficiently isolated

- Severity / priority: High / P0
- Rules and sources: OWASP CSRF Prevention and Vue cookie-authentication guidance require provenance/token checks for unsafe requests; personalized responses must not be shared-cacheable.
- Root cause: CSRF enforcement was tied to a narrower route classification, while other unsafe façade requests could still carry the BFF session cookie. Media/upload responses could retain public caching semantics even when the request carried authentication context.
- Repair evidence:
  - `functions/api/[[path]].ts:692-726` requires same-origin `Origin`/`Referer` provenance plus matching CSRF cookie/header values for unsafe state-changing façade requests or any unsafe request with a BFF session cookie.
  - `functions/api/[[path]].ts:1367-1375` rejects invalid requests before upstream dispatch.
  - `functions/api/mediaCachePolicy.ts:11-31` detects bearer or session-cookie context and returns `private, no-store` for authenticated/error responses.
  - `functions/api/[[path]].ts:1553-1559` applies the private cache policy and varies on authorization/cookie context.
  - `functions/uploads/[[path]].ts:27-80` applies the same rule to upload/media forwarding.
- Regression evidence: `functions/api/__tests__/proxy.spec.ts`, `functions/uploads/__tests__/proxy.spec.ts`, and `src/edge/__tests__/mediaCachePolicy.spec.ts` cover cookie-CSRF and private-cache cases.
- Status: Resolved in the façade. The backend must still enforce authorization and emit authentication-invariant public responses.

### SEC-03 — Stale asynchronous work could cross authentication principals

- Severity / priority: High / P0
- Root cause: logout, login as another account, and session refresh could race outstanding store/API operations. Private Pinia state was not centrally reset at every principal transition, so a late result could repopulate another user’s UI state.
- Repair evidence:
  - `src/services/authSessionScope.ts:1-10` defines epoch/principal snapshots and abortable operations.
  - `src/services/authSessionScope.ts:25-48` advances the epoch and aborts every active operation during a principal transition; `src/services/authSessionScope.ts:51-69` rejects operations bound to a stale principal.
  - `src/services/privateSessionState.ts:3-13` centralizes private-store reset registration.
  - `src/services/authSessionController.ts:101-103`, `src/services/authSessionController.ts:159-162`, and `src/stores/auth.ts:128-130` make every session transition reset private state.
  - Private comments, discussions, favorites, notifications, and preference-sync paths now register resetters and abort or token-check in-flight work before committing results.
- Regression evidence: `src/services/__tests__/authSessionScope.spec.ts`, `src/services/__tests__/authSessionController.spec.ts`, `src/services/__tests__/privateSessionState.spec.ts`, and `src/services/__tests__/preferencesSyncService.spec.ts` exercise logout/account-switch races.
- Status: Resolved.

### SEC-04 — Offline mutations were not owner-bound and lease release consumed retries

- Severity / priority: High / P0
- Root cause: queued browser mutations lacked a required authenticated owner, and synchronization did not consistently bind processing to the current principal. A session change could execute another account’s queued action. Releasing work because of a session transition could also consume the retry budget despite no upstream failure.
- Repair evidence:
  - `src/utils/cache/offlineQueue.ts:17-28` records owner, idempotency key, and lease state.
  - `src/utils/cache/offlineQueue.ts:48-68` refuses anonymous queue entries and binds every action to `ownerId`.
  - `src/utils/cache/offlineQueue.ts:95-135` filters and atomically claims only the current owner’s eligible actions.
  - `src/utils/cache/offlineQueue.ts:160-169` releases a lease without incrementing `retryCount`; real failures use the separate failure path.
  - `src/utils/cache/syncManager.ts:30-53` creates a principal-bound auth operation; `src/utils/cache/syncManager.ts:64-152` releases work and stops on session changes.
  - `src/utils/cache/syncManager.ts:252-260` acknowledges service-worker requests only after owner-bound synchronization completes.
- Regression evidence: `src/utils/cache/__tests__/offlineQueue.spec.ts` and `src/utils/cache/__tests__/syncManager.spec.ts` cover cross-owner exclusion, atomic claims, session aborts, and retry accounting.
- Status: Resolved in the client. Durable atomic `Idempotency-Key` handling remains a backend requirement.

### SEC-05 — OAuth popup completion was not fully bound to its initiating window/request

- Severity / priority: High / P0
- Rules and sources: MDN and OWASP web-messaging guidance require exact origin checks, expected `MessageEvent.source`, explicit target origins, and message-shape validation.
- Root cause: origin checking alone could not prove that a same-origin message came from the popup opened for the active request. Relay data stored for browser fallbacks could be stale or malformed, and result messages were not required to match the pending request ID.
- Repair evidence:
  - `src/services/googleAuthService.ts:43-58` assigns request IDs and bounded request/relay lifetimes.
  - `src/services/googleAuthService.ts:178-188` rejects stale relay envelopes and mismatched request IDs.
  - `src/services/googleAuthService.ts:216-270` removes malformed, stale, or mismatched storage relay data.
  - `src/services/googleAuthService.ts:530-549` binds the popup name and result waiter to the generated request ID.
  - `src/services/googleAuthService.ts:584-610` accepts window messages only when both `event.source` and `requestId` match the active popup/request.
  - `src/views/AuthCallbackPage.vue:601-614` posts the bound result and scrubs the handoff code before delayed close.
- Regression evidence: `src/services/__tests__/googleAuthService.spec.ts` and `src/views/__tests__/AuthCallbackPage.spec.ts`; the focused auth run passed 25/25 tests.
- Status: Resolved.

### SEC-06 — Sensitive callback values and telemetry could leak or exhaust edge resources

- Severity / priority: High / P1
- Rules and sources: OWASP warns that query strings appear in browser history, referrers, and logs; OWASP logging guidance requires sanitization and bounded data; Referrer-Policy is defense-in-depth, not a replacement for removal.
- Root cause: OAuth/reset/verification values could remain in history, the client reporter included the complete URL, and telemetry endpoints accepted broadly shaped JSON without a firm body, origin, content-type, nesting, field-count, or redaction policy. Camel-case secret keys were not normalized consistently.
- Repair evidence:
  - `src/utils/sensitiveUrl.ts:1-46` removes sensitive query and fragment values with `history.replaceState` while retaining non-sensitive navigation state.
  - `src/main.ts:193-197` and `src/views/AuthCallbackPage.vue:601-633` scrub OAuth handoff data at both early relay and routed callback paths; reset/verification views use the same helper.
  - `src/utils/clientReporter.ts:42-50` reports only `window.location.pathname`.
  - `functions/_shared/telemetry.ts:1-27` defines a 16 KiB body limit and a comprehensive sensitive-key/query policy.
  - `functions/_shared/telemetry.ts:37-52` normalizes camelCase/snake-case keys and redacts secret values and bearer tokens.
  - `functions/_shared/telemetry.ts:84-105` bounds depth, arrays, object fields, key lengths, and string lengths.
  - `functions/_shared/telemetry.ts:108-145` enforces content type, same-origin provenance, `Content-Length`, and streamed body size.
  - `functions/client-report.ts:96-124` and `functions/csp-report.ts:46-99` normalize before logging and reject invalid requests.
- Regression evidence: `src/utils/__tests__/sensitiveUrl.spec.ts`, `src/utils/__tests__/clientReporter.spec.ts`, and `functions/__tests__/telemetry.spec.ts`; focused telemetry tests passed 5/5, including `accessToken`, `refreshToken`, and `clientSecret` redaction.
- Status: Resolved in repository-owned endpoints. Platform owner action: configure a per-client request-rate ceiling, sampling ratio, and retention limit at Cloudflare; until those controls are deployed, the 16 KiB application body ceiling limits request size but not request volume.

### SEC-07 — Inbox SSE parsing allowed an unbounded incomplete frame

- Severity / priority: Medium / P1
- Root cause: the parser split complete frames but retained the incomplete remainder without a ceiling. A server or intermediary could keep extending one frame, growing browser memory until disconnect. Reader cancellation was also incomplete on abort/error.
- Repair evidence:
  - `src/api/inboxService.ts:172-220` enforces a 256 KiB limit on every complete frame and the retained remainder.
  - `src/api/inboxService.ts:223-252` binds cancellation to the caller’s `AbortSignal`.
  - `src/api/inboxService.ts:264-290` checks every chunk/remainder and cancels the reader when parsing or processing fails.
- Regression evidence: `src/api/__tests__/inboxService.spec.ts:149-175` covers large multi-frame chunks, oversized incomplete frames, and reader cancellation.
- Status: Resolved on the client. The SSE server should independently cap frame/event size and connection lifetime.

### SEC-08 — Backend-supplied navigation URLs reached browser sinks without one shared policy

- Severity / priority: High / P1
- Rules and sources: Vue security guidance requires backend validation and frontend protocol/origin checks for untrusted URLs; MDN `Clients.openWindow` navigates to the supplied URL.
- Root cause: schedule links, comment media links, and push notification actions were derived from API/push data with inconsistent validation. Active schemes, credential-bearing URLs, protocol-relative external URLs, or cross-origin push actions could reach `href`/`openWindow`.
- Repair evidence:
  - `src/utils/security.ts:182-210` centralizes HTTP(S)-only URL normalization and rejects embedded credentials.
  - `src/views/SchedulePage.vue:1173-1178` normalizes every event/ticket/source URL before binding at `src/views/SchedulePage.vue:612-647`.
  - `src/components/comment/CommentCard.vue:333-345` drops unsafe image URLs and safely falls back from an invalid thumbnail to a validated full image.
  - `src/sw/push.ts:10-19` reduces push actions to same-origin HTTP(S) paths; `src/sw/push.ts:81-93` revalidates immediately before focus/open.
- Regression evidence: `src/views/__tests__/SchedulePage.spec.ts`, `src/components/comment/__tests__/CommentCard.spec.ts`, and `src/sw/__tests__/push.spec.ts:28-56` cover active, credential-bearing, protocol-relative, and external URLs.
- Status: Resolved in rendering/navigation. The backend must validate URLs at ingestion because other consumers may not share these frontend controls.

### SEC-09 — Page and service-worker IndexedDB schemas could deadlock or reject

- Severity / priority: Medium / P1
- Root cause: the page opened `hmrchan-cache` at version 5 while the service worker opened version 4 and did not close on `versionchange`. Once v5 existed, the worker could receive `VersionError`; an old worker connection could also block upgrades. This affected media metadata and offline queue ownership migration.
- Repair evidence:
  - `src/utils/cache/idbSchema.ts:1-10` defines one shared database name/version/store registry.
  - `src/utils/cache/idbSchema.ts:39-48` ensures the offline queue owner index during upgrade.
  - `src/utils/cache/idb.ts:146-203` and `src/sw/idb.ts:50-65` open the same version and close/reset cached connections on `versionchange`.
- Regression evidence: `src/sw/__tests__/idb.spec.ts:10-30` verifies one v5 open and connection reset; the shared upgrader tests cover the owner index.
- Status: Resolved.

### SEC-10 — Service-worker activation/synchronization and media metadata failures had unsafe success semantics

- Severity / priority: Medium / P1
- Root cause: install could activate after essential precache failure, background sync could report success after merely posting a message to a page, and optional IndexedDB/cache metadata failure could replace a successfully fetched media response with a placeholder.
- Repair evidence:
  - `src/sw/strategies.ts:46-74` tolerates optional precache misses but throws when an essential asset is absent.
  - `src/sw/index.ts:18-25` calls `skipWaiting()` only after essential precache succeeds.
  - `src/sw/sync.ts:9-27` requires an acknowledged client result and rejects timeout/failure.
  - `src/utils/cache/syncManager.ts:252-260` sends acknowledgement only after owner-bound sync completes.
  - `src/sw/strategies.ts:165-192` treats media access/cache metadata as optional and returns the cached or successful network response.
- Regression evidence: `src/sw/__tests__/install.spec.ts:29-42`, `src/sw/__tests__/sync.spec.ts:46`, and `src/sw/__tests__/strategies.spec.ts:54-107` cover fail-closed activation, acknowledgement, and successful-media preservation.
- Status: Resolved.

### SEC-11 — Development proxy defaults could mutate production and weaken remote cookies

- Severity / priority: High / P1
- Root cause: local Vite proxy configuration defaulted toward production endpoints and stripped `Secure` from upstream cookies. An ordinary development session could therefore affect live data or make production session cookies available over a local insecure transport without explicit intent.
- Repair evidence:
  - `scripts/lib/dev-proxy-safety.ts:1-28` defaults to `http://127.0.0.1:8000` and refuses any production API target unless `ALLOW_PRODUCTION_API_PROXY=true`.
  - `scripts/lib/dev-proxy-safety.ts:32-48` removes `Secure` only for loopback or an explicit controlled override.
  - `vite.config.ts:290-307` applies the guard to every proxy slot and passes the cookie policy to all proxy rules.
  - `.env.development:3-5` and `.env.example:12-16` encode the safe defaults and document the overrides.
- Regression evidence: `src/__tests__/scripts/dev-proxy-safety.spec.ts:10-41` covers mixed proxy slots, invalid URLs, explicit production opt-in, and cookie preservation.
- Status: Resolved.

### SEC-12 — Modal focus, Escape, restoration, and scroll behavior was incomplete

- Severity / priority: Medium / P2
- Root cause: `ImageCropper` and `AlertDialog` did not consistently trap focus, label the active dialog, close on Escape, restore the invoking focus target, and lock/unlock body scrolling. Keyboard and assistive-technology users could navigate into obscured content or lose context.
- Repair evidence:
  - `src/composables/useFocusTrap.ts:43-53`, `src/composables/useFocusTrap.ts:143-150`, and `src/composables/useFocusTrap.ts:265-276` centralize activation, Tab/Escape handling, and focus restoration.
  - `src/components/ui/AlertDialog.vue:6-12` provides alert-dialog semantics; `src/components/ui/AlertDialog.vue:110-131` traps/restores focus and balances scroll locking.
  - `src/components/ui/ImageCropper.vue:3-9` provides labeled dialog semantics; `src/components/ui/ImageCropper.vue:358-394` adds focus/Escape/scroll lifecycle behavior.
- Regression evidence: `src/components/ui/__tests__/ImageCropper.spec.ts:45-74` verifies labeling, initial focus, focus trap, Escape, focus restoration, and scroll restoration.
- Status: Resolved.

### SEC-13 — KeepAlive deactivation left autoplay timers running

- Severity / priority: Low / P2
- Root cause: a cached `PostDetailPage` could be deactivated without stopping the interval or delayed resume timer. Hidden work continued and could restart while another page was active.
- Repair evidence: `src/views/PostDetailPage.vue:690-714` centralizes interval/resume cleanup; `src/views/PostDetailPage.vue:1284-1302` restarts on activation and calls `resetAutoPlay()` on deactivation before detaching listeners.
- Regression evidence: covered by the full component/unit suite and release lifecycle checks.
- Status: Resolved.

### SEC-14 — Dependency advisories and edge code were outside complete release type coverage

- Severity / priority: High / P1
- Root cause: the dependency graph contained 14 reported advisories, and the root Vue type-check excluded Cloudflare Functions/Worker code. A release could therefore pass without type-checking security-sensitive edge handlers.
- Repair evidence:
  - `package.json:43-47` runs the application budget check plus strict Pages Functions and internal Worker checks.
  - `functions/tsconfig.json` and `workers/internal-api/tsconfig.json` define isolated Cloudflare-compatible projects.
  - `package.json:118-135` upgrades/overrides affected transitive packages; `@babel/core` is forced to a patched `^7.29.6` line and Bun resolves 7.29.7.
  - `scripts/check-app-type-budget.mjs:5-48` freezes existing application debt at 477 diagnostics and fails any increase.
- Regression evidence: pinned Bun 1.3.11 `bun audit` reports `No vulnerabilities found`; application diagnostics remain 477/477 across 130 files; Functions and Worker checks pass strictly.
- Status: Advisories and edge coverage resolved. The 477 application diagnostics remain explicit technical debt.

## Validation evidence

Completed before delivery:

- Focused OAuth suites: 25/25 tests passed.
- Focused telemetry suites: 5/5 tests passed.
- Focused gateway/PostDetail suites: 19/19 tests passed.
- Complete unit suite: 238 files, 1,365 tests passed.
- `bun run lint:strict`: passed.
- `bun run type-check`: passed under the declared policy: application 477/477 diagnostics across 130 files; Pages Functions strict check passed; internal Worker strict check passed.
- Production build: Vite 8.1.4 build, static prerendering, Subresource Integrity, service worker, and desk-pet runtime-boundary checks passed.
- Dependency audit: observed baseline 14 advisories to current zero vulnerabilities.
- Full pre-push release validation: passed; evidence artifact: `output/validation/20260714-120020`.

Validation intentionally not claimed:

- Candidate/deployed-site browser validation, because it requires a controlled deployment URL and live identity/content/community services.
- Production regression, accessibility, and performance orchestration against the live site, because those commands can change or depend on external production state and were not required to prove the local repairs.
- Live backend reachability or identity-provider exchange, because this repository task did not provision backend credentials or a controlled live account.

## Change-impact assessment

GitNexus final pre-commit change detection classified the aggregate worktree risk as Critical because changes cross authentication, Cloudflare ingress, private cache policy, offline mutations, telemetry, service-worker lifecycle, and dependency/release gates. It reported 143 changed symbols, 62 indexed changed files, and 29 affected processes.

Targeted upstream impact checks found:

- `createAuthSessionController`: Medium transitive risk; one direct caller, `useAuthStore`.
- `fetchViaInternalApiGateway`: Low isolated risk; one direct caller, `forwardToUpstream`.
- `consumeInboxStream`: Low isolated risk; one direct caller, `openStreamConnection`.

The direct callers were inspected, and the affected flows are covered by focused tests plus the complete unit/release gate. The final change-detection run was completed after the report and last telemetry redaction update; it found no unexpected source scope beyond the documented security work.

## Residual frontend risk

1. Application TypeScript debt: 477 existing diagnostics across 130 files. The new gate prevents growth but does not make the application strictly typed. Recommended follow-up is incremental removal by subsystem, lowering `maxDiagnostics` with every cleanup commit.
2. Deployed behavior: CSP/header behavior, OAuth popup behavior under real identity-provider redirects, service-worker upgrades across an actual prior production version, and backend integration still require candidate-site validation.
3. Platform abuse controls: repository endpoints now bound and sanitize telemetry, but Cloudflare rate limiting, sampling, retention, and alerting are external configuration and should be verified at runtime.
4. Shared-secret service identity: the gateway now fails closed and is not exposed through `workers.dev`; a stolen runtime secret remains replayable. Short-lived signed assertions or mutually authenticated internal transport would reduce that residual platform risk.

## Backend and platform team handoff

The following items remain outside frontend ownership and should be sent directly to the backend/platform team:

1. Implement atomic, durable `Idempotency-Key` handling for retried favorite and comment mutations. The server must persist the key/result under the authenticated owner so a timeout/retry cannot duplicate a write.
2. Ensure every publicly cacheable response is authentication-invariant. If cookies, authorization, entitlements, moderation state, or viewer identity can change the body, emit `Cache-Control: private, no-store` and appropriate `Vary` headers.
3. Add offline-compatible like/unlike APIs or document that those queue action types are unsupported; do not silently reinterpret them as favorite mutations.
4. Bind every queued mutation server-side to the authenticated owner/session. Never trust the client-supplied owner identifier as authorization evidence.
5. Validate schedule, comment-media, and push-action URLs when data is ingested. Permit only intended schemes/hosts and reject credentials or active-content schemes before storage.
6. Apply telemetry rate limiting, sampling, retention limits, and abuse monitoring at Cloudflare/platform level. Application body bounds do not prevent request-volume exhaustion.
7. Consider short-lived signed service assertions, Cloudflare-native service identity controls, or mTLS beyond the current replayable shared secret.
8. Cap SSE event/frame size and connection lifetime on the server, emit valid UTF-8 event boundaries, and close stalled connections.
9. Verify live identity, content, community, upload, and notification reachability in a controlled candidate environment. No live backend contract was exercised in this local remediation task.

## Reliable references

- [Cloudflare Workers `workers.dev` routing](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Information Exposure Through Query Strings](https://owasp.org/www-community/vulnerabilities/Information_exposure_through_query_strings_in_url)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [MDN Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy)
- [MDN `Window.postMessage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [MDN `MessageEvent.source`](https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent/source)
- [MDN `IDBFactory.open`](https://developer.mozilla.org/en-US/docs/Web/API/IDBFactory/open)
- [MDN `IDBDatabase.versionchange`](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/versionchange_event)
- [MDN `Clients.openWindow`](https://developer.mozilla.org/en-US/docs/Web/API/Clients/openWindow)
- [Vue security guidance](https://vuejs.org/guide/best-practices/security)
- [GitHub Advisory GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff)
- [GitHub Advisory GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3)
- [GitHub Advisory GHSA-4x5r-pxfx-6jf8](https://github.com/advisories/GHSA-4x5r-pxfx-6jf8)
