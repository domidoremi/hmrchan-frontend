# Frontend Optimization Plan

## Scope

This plan covers business capability, technology stack, directory structure, component design, API management, state management, route permission, performance, engineering standards, and maintainability for the Vue frontend.

The optimization policy is incremental. Each slice must preserve current observable behavior, include targeted verification, and avoid broad rewrites unless the slice defines an explicit migration boundary.

The current implementation is not the terminal architecture. Optimization work must protect business contracts, security invariants, data semantics, route behavior, and migration boundaries. It must not turn current file layout, private helper boundaries, incidental DOM nesting, or deep import paths into permanent architecture unless the slice explicitly promotes that surface to a public contract.

## Long-Term Objective System

Objective:

- The frontend must become a contract-protected, replacement-ready Vue application where route pages orchestrate runtime side effects, pure product rules live in tested model or policy modules, and release evidence remains reproducible on a low-memory Windows host.

Success State:

- Route files above `50 KB` must shrink through staged extraction before unrelated feature expansion.
- `HomePage.vue` and `PostDetailPage.vue` must exit `refactorQueued=true` after scene/runtime orchestration and API/cache/fallback orchestration move behind tested boundaries.
- Public, authenticated, and sensitive routes must keep explicit security metadata and route contract tests.
- Shared API transport, endpoint services, BFF session recovery, client security, challenge verification, and error mapping must keep service-level contract tests.
- Service worker, public snapshot, prefetch, update, and cache policies must keep private data excluded by default.
- Component domains must expose tested public barrels before consumer migration away from deep imports.
- Beta or alpha framework and toolchain upgrades must ship in isolated batches with lockfile changes and release evidence.
- `validate:release` must remain the only release truth source, with low-output serial validation used under memory pressure.

Execution Milestones:

- `Phase 1 - Hotspot Extraction`: extract pure models, interaction policies, and orchestration adapters from `PostDetailPage.vue`, `HomePage.vue`, and any route file that crosses the complexity budget.
- `Phase 2 - Contract Coverage`: expand route, API, auth, cache, service worker, and accessibility contract tests before replacing implementation internals.
- `Phase 3 - Component Boundary Migration`: add tested barrels for remaining component domains, then migrate consumers in small batches.
- `Phase 4 - Runtime Hardening`: stabilize browser API wrappers, background tasks, update coordination, analytics consent, and runtime integrity checks.
- `Phase 5 - Toolchain Upgrade`: isolate Vue, Vite, Vitest, Router, I18n, Playwright, Bun, and Node upgrades from business feature delivery.
- `Phase 6 - Release Readiness`: keep bundle budget, complexity budget, text-style audit, frontend-pattern audit, build security check, and production regression evidence aligned with the unified runner.

Acceptance Evidence:

- Each slice must include at least one of these outcomes: extracted pure logic, narrowed adapter boundary, deleted duplicate path, or documented residual lock-in.
- Each code slice must run the smallest relevant serial verification and record skipped heavy gates when memory policy blocks them.
- Any route security, API transport, auth/session, cache, or service worker change must include contract tests for the observable behavior.
- Any large-file exception must keep `scripts/config/complexity-budget.json` aligned with the current migration boundary.
- Any dependency or toolchain change must include lockfile evidence and targeted release validation.

Stop Conditions:

- Heavy builds, browser automation, package installs, parallel tests, and long-running processes must stop when preflight reports `danger` memory risk unless the user approves the risk.
- HIGH or CRITICAL GitNexus impact must stop implementation until the blast radius is reported and the slice scope is narrowed or explicitly accepted.
- Missing backend, Docker, Pages preview, local audit bridge, or production credentials must be recorded as environment-blocked evidence, not treated as a pass.

## Long-Term Execution Backlog

Track 1 - Hotspot Route Extraction:

- Target: `PostDetailPage.vue` must move API/cache/fallback orchestration, page meta decisions, navigation input policy, media preload policy, and fallback recovery selection into tested model, policy, or adapter modules.
- Target: `HomePage.vue` must move scene runtime orchestration, visual capability decisions, support refresh policy, and motion scheduling into tested model or runtime policy modules.
- Next slices: extract post-detail page meta payload construction, split post-detail fallback source selection from fetch side effects, extract homepage scene capability policy, and split homepage support refresh policy.
- Evidence: targeted route model tests, page smoke tests, complexity budget notes, and GitNexus impact reports must show low or accepted bounded scope.

Track 2 - Contract And Security Coverage:

- Target: route metadata, sensitive reauth, contract resource IDs, BFF session recovery, client security retry, challenge verification, and private cache exclusion must remain release-blocking contracts.
- Next slices: add missing route meta assertions for new route groups, expand API normalization tests for endpoint services with weak coverage, and extend service worker cache classification cases for private endpoints.
- Evidence: router, API client, auth store, service worker, and frontend contract audit tests must pass through the unified runner.

Track 3 - Component Boundary Migration:

- Target: remaining component domains must expose tested public barrels before deep import migration.
- Next slices: add barrel contracts for `auth`, `comment`, `home`, and selected `ui` primitives; migrate low-risk static consumers first.
- Evidence: export tests must pass before import rewrites; consumer migration must happen in small batches with focused component tests.

Track 4 - Runtime And Performance Hardening:

- Target: raw browser APIs must stay behind shared wrappers where release audits enforce them; background work must keep interaction intent, data-saving, auth state, and cleanup policy explicit.
- Next slices: extend wrappers for delayed tasks and observers, validate update coordination blockers, tighten image preload rules, and keep bundle budget diagnostics split by JS, CSS, image, and initial-home assets.
- Evidence: frontend-pattern audit, bundle budget, PWA/service worker tests, and targeted utility tests must pass.

Track 5 - Toolchain And Dependency Upgrade:

- Target: Vue, Vite, Vitest, Router, I18n, Playwright, Bun, Node, Cloudflare types, and build plugins must upgrade in isolated batches.
- Next slices: capture current version baseline, define upgrade order, run lockfile-only dependency changes, and verify each batch with type-check, focused unit tests, build, build security, and bundle budget when memory allows.
- Evidence: lockfile diff, package metadata diff, selected release validation, and rollback notes must exist for each upgrade batch.

Track 6 - Release Operations:

- Target: local release evidence must remain reproducible without GitHub Actions and must distinguish hook, prepush-full, local, candidate, and production modes.
- Next slices: keep validation summaries worktree-aware, expand release route metadata alignment, preserve artifact sanitization, and keep environment-blocked states explicit.
- Evidence: `validate:release` artifacts, text-style audit, frontend-pattern audit, complexity budget, bundle budget, and production regression summaries must remain the delivery record.

## Sustainable Execution Mechanism

Iteration Unit:

- Each iteration must complete one documentation, contract, or code slice with bounded verification and no broad rewrite requirement.
- Each code slice must declare the touched boundary, GitNexus impact level, verification command, and remaining migration target.
- Each documentation slice must add executable constraints, queue items, evidence rules, or stop conditions.

Cadence:

- Daily or session-level work must use one small slice from the backlog and one focused verification command.
- Weekly consolidation must review changed files, complexity budget drift, bundle budget drift, and failed or skipped verification.
- Monthly planning must rebalance backlog tracks, dependency upgrade windows, and release evidence gaps.
- Release-cycle planning must require `candidate` and `production` mode evidence according to `VALIDATION.md`.

Task Classes:

- `contract protection`: adds or repairs tests for route, API, auth, cache, service worker, accessibility, or release contracts.
- `architecture mobility`: extracts pure logic, model policy, adapter boundaries, or public barrels that reduce replacement cost.
- `implementation hardening`: fixes current behavior while recording the future migration boundary.
- `release verification`: improves runner, artifact, budget, audit, or production regression evidence.
- `toolchain migration`: updates runtime or build dependencies in isolated batches with lockfile evidence.

Backlog Entry Shape:

- `Target`: the file, route, subsystem, or contract being changed.
- `Boundary`: the public behavior, security invariant, or migration surface being protected.
- `Slice`: the smallest implementation step that changes one boundary at a time.
- `Verification`: the minimal serial command that proves the slice, plus skipped heavy gates when resource policy blocks them.
- `Exit`: the condition that removes the item from the active queue.

Rolling Acceptance:

- A route file remains in the active hotspot queue while it exceeds the registered complexity budget and has `refactorQueued=true`.
- A component domain remains in the migration queue until its public barrel has export tests and at least one consumer batch migrated.
- A toolchain batch remains incomplete until lockfile diff, type-check, focused tests, build, build security, and bundle budget evidence are recorded or explicitly environment-blocked.
- A release operations task remains incomplete until generated artifacts are sanitized and state semantics are preserved as `passed`, `failed`, or `incomplete`.

Operating Constraints:

- Bun remains the default package manager for install, script, lockfile, and dependency work in this Bun-managed repository.
- Heavy validation must run serially and only after process preflight reports enough available physical memory.
- Codex-owned long-running processes must be registered before startup and cleaned by registry policy.
- Unattributed user or system processes must not be stopped.
- GitNexus tool calls for this checkout must pass repository path `<frontend-main-repo>`, not repository name `hmrchan-frontend`, because another indexed sibling shares the same name.

Resource Recovery Protocol:

- When SessionStart or PreHeavy reports memory risk `danger`, the active iteration must stop tests, builds, package installs, browser automation, type-check, and new long-running processes.
- While memory risk remains `danger`, work is limited to source inspection, Git status inspection, GitNexus context reads, documentation updates, `git diff --check`, and other short foreground checks that do not start heavy toolchains.
- Each `danger` continuation must record the available physical memory, registered cleanup result, and deferred verification queue in the active entry.
- Validation resumes only after a fresh PreHeavy check reports below `danger`; run the smallest focused command first and keep workers at `--maxWorkers=1`.
- If no registered expired Codex-owned process is available for cleanup, the iteration must not stop unattributed processes and must preserve the pending verification state.

## Active Execution Queue

Queue Date: `2026-06-07`

Entry 1:

- Status: completed on `2026-06-07`.
- Target: `src/views/PostDetailPage.vue` and `src/views/post-detail/postDetailModel.ts`.
- Boundary: post-detail API/cache/fallback orchestration must keep route replacement, state writes, translation, cache loading, and view tracking side effects in the page while pure recovery decisions move into tested model helpers.
- Slice: extract fetch-error outcome selection after fallback recovery into `postDetailModel.ts`; page code must only dispatch `not-found-redirect`, `api-error`, and `generic-error` outcomes.
- Verification: run `node scripts/run-vitest.mjs run src/views/post-detail/__tests__/postDetailModel.spec.ts --maxWorkers=1`, `node scripts/run-vitest.mjs run src/views/__tests__/PostDetailPage.spec.ts --maxWorkers=1`, `git diff --check`, `bun run audit:repo --only=text-style`, and GitNexus change detection.
- Exit: `PostDetailPage.vue` no longer performs inline fetch error classification after fallback resolution, and model tests prove the behavior through injected classifiers instead of `ApiError` coupling.

Entry 2:

- Status: completed on `2026-06-07`.
- Target: `src/views/PostDetailPage.vue` media hint and preload path.
- Boundary: browser resource hints, image warming, and user-initiated adjacent preload side effects must stay page-owned while media source selection rules become testable model output.
- Slice: extract primary-media hint selection and adjacent preload candidate selection into model helpers; keep `preconnect`, `preloadResource`, `Image`, and `warmDecodedImage` calls in the page.
- Verification: run the post-detail model spec, the post-detail page spec, the complexity budget check, `git diff --check`, text-style audit, and GitNexus change detection.
- Exit: media preload policy is reviewable without reading browser API calls.

Entry 3:

- Status: in progress.
- Target: `src/views/HomePage.vue`.
- Boundary: scene capability decisions and motion scheduling policy must be separated from canvas or DOM side effects.
- Slice: extract visual capability policy, support refresh cadence, and motion fallback selection into tested runtime policy helpers.
- Verification: run focused home model or component tests, then the complexity budget check.
- Exit: HomePage route orchestration keeps runtime calls only, and policy behavior is covered by pure tests.
- Progress: homepage animation enablement now resolves through `shouldUseHomeAnimations` in `homeScenePolicy.ts`; `HomePage.vue` keeps settings ref access, reduced-motion probing, computed wrapping, and animation consumers.
- Progress: story scene progress state now resolves through `resolveHomeStorySceneProgress` in `homeScenePolicy.ts`; `HomePage.vue` keeps reactive wrappers and DOM/runtime side effects.
- Progress: scene activation lifecycle decisions now resolve through `resolveHomeSceneActivationDecision` in `homeSceneActivationPolicy.ts`; `HomePage.vue` keeps deferred intent unbinding, scene lifecycle mutation, and observer cleanup side effects.
- Progress: deferred scene intent bind/unbind guards and deferred enhancement observer cleanup guards now resolve through `homeSceneActivationPolicy.ts`; `HomePage.vue` keeps event listener mutation and observer disconnection side effects.
- Progress: bubble enhancement activation and post-`nextTick` continuation guards now resolve through `homeSceneActivationPolicy.ts`; `HomePage.vue` keeps reveal synchronization, layout observation, and motion measurement side effects.
- Progress: deferred enhancement startup and intersection activation actions now resolve through `homeSceneActivationPolicy.ts`; `HomePage.vue` keeps `IntersectionObserver`, element resolution, and activation side effects.
- Progress: bubble motion loop eligibility and lerp settling now resolve through `bubbleMotion.ts`; `HomePage.vue` keeps `requestAnimationFrame`, pointer-state collection, force-center mutation, frame-state storage, and DOM style writes.
- Progress: bubble pointer-state mode selection now resolves through `resolveBubblePointerState` in `bubbleMotion.ts`; `HomePage.vue` keeps hover lookup, pointer refs, force-center mutation, and runtime state ownership.
- Progress: bubble motion target-center and pointer-settle duration selection now resolves through `resolveBubbleMotionTargetDecision` in `bubbleMotion.ts`; `HomePage.vue` keeps pointer-strength mutation, force-center mutation, RAF scheduling, frame-state storage, and DOM writes.
- Progress: bubble motion next-frame force-center and pointer-strength settling now resolves through `resolveBubbleMotionStepState` in `bubbleMotion.ts`; `HomePage.vue` keeps RAF scheduling, frame-state storage, runtime state assignment, and DOM writes.
- Progress: bubble canvas scene startup eligibility now resolves through `shouldStartHomeBubbleCanvasScene` in `homeSceneActivationPolicy.ts`; `HomePage.vue` keeps canvas resizing, frame scheduling, and rendering side effects.
- Progress: bubble canvas frame viewport, pixel-ratio, pointer fallback, and motion-factor parameters now resolve through `resolveHomeBubbleCanvasFrameParameters` in `homeScenePolicy.ts`; `HomePage.vue` keeps canvas context ownership, gradient construction, orb mutation, and frame scheduling side effects.
- Progress: bubble canvas orb count selection now resolves through `resolveHomeBubbleCanvasOrbCount` in `homeScenePolicy.ts`; `HomePage.vue` keeps random orb seeding, resize clamping, canvas ownership, and rendering side effects.
- Progress: bubble canvas resize state now resolves through `resolveHomeBubbleCanvasResizeState` in `homeScenePolicy.ts`; `HomePage.vue` keeps DOM measurement, canvas writes, random orb seeding, orb mutation, and rendering side effects.
- Progress: bubble canvas orb frame state now resolves through `resolveHomeBubbleCanvasOrbFrameState` in `homeScenePolicy.ts`; `HomePage.vue` keeps canvas context ownership, gradient construction, orb object mutation, arc drawing, and frame scheduling side effects.
- Progress: bubble canvas orb seed state now resolves through `resolveHomeBubbleCanvasOrbSeedState` in `homeScenePolicy.ts`; `HomePage.vue` keeps `Math.random()` sampling, canvas-orb array assignment, and resize-triggered reseeding side effects.
- Progress: bubble canvas orb runtime shape now uses `HomeBubbleCanvasOrbSeedState` from `homeScenePolicy.ts`; `HomePage.vue` no longer owns a duplicate local `BubbleCanvasOrb` type block.
- Progress: bubble motion force-center runtime shape now uses `BubbleForceCenter` from `bubbleMotion.ts`; `HomePage.vue` no longer owns a duplicate inline `{ x, y }` type block.
- Progress: bubble pointer position runtime shape now uses `BubblePointerPosition` from `bubbleMotion.ts`; `HomePage.vue` no longer owns a duplicate inline pointer-position type block.
- Progress: homepage no-glass backdrop style now resolves through `HOME_NO_GLASS_BACKDROP_STYLE` in `homeScenePolicy.ts`; `HomePage.vue` keeps template style binding and bubble card style composition.
- Progress: bubble hover source runtime shape now uses `BubbleHoverSource` from `bubbleMotion.ts`; `HomePage.vue` no longer owns duplicate `'pointer' | 'focus'` hover-source union declarations.
- Progress: bubble interactive tier eligibility now resolves through `isHomeBubbleInteractiveTier` in `homeModel.ts`; `HomePage.vue` keeps bubble layout tier measurement, reactive computed wrapping, and motion/canvas consumers.
- Progress: bubble hover set and clear state transitions now resolve through `resolveBubbleHoverSetState` and `resolveBubbleHoverClearState` in `bubbleMotion.ts`; `HomePage.vue` keeps ref mutation and motion-loop synchronization side effects.
- Progress: bubble hover-active and persistent-selection matching now resolves through `resolveBubbleActiveState` in `bubbleMotion.ts`; `HomePage.vue` keeps selected and hovered ref ownership plus class and frame-state consumption.
- Progress: bubble stage pointer coordinate clamping, normalized position, and stage metrics derivation now resolve through `resolveBubbleStagePointerState` in `bubbleMotion.ts`; `HomePage.vue` keeps DOM rect measurement, `window.innerWidth` access, and reactive state assignment side effects.
- Progress: bubble element registration action selection now resolves through `resolveBubbleElementRegistrationState` in `bubbleMotion.ts`; `HomePage.vue` keeps button element resolution, map mutation, frame-style initialization, and motion measurement scheduling side effects.
- Progress: bubble pointer-over enter, leave, and stage-leave state transitions now resolve through `resolveBubblePointerOverState` in `bubbleMotion.ts`; `HomePage.vue` keeps pointer-stage mutation, enhancement activation, pointer-position measurement, hover side effects, and motion-loop synchronization side effects.
- Progress: bubble stage pointer presence actions now resolve through `resolveBubbleStagePointerPresenceState` in `bubbleMotion.ts`; `HomePage.vue` keeps enhancement activation, pointer-position measurement, pointer-over clearing, hover clearing, ref mutation, and motion-loop synchronization side effects.
- Progress: bubble pointer and focus interaction actions now resolve through `resolveBubbleInteractionState` in `bubbleMotion.ts`; `HomePage.vue` keeps enhancement activation, pointer-stage ref writes, pointer-over state assignment, DOM pointer measurement, hover set/clear calls, and motion-loop synchronization side effects.
- Progress: active bubble hover-anchor lookup now resolves through `resolveActiveBubbleHoverAnchor` in `HomePage.vue`; `buildBubblePointerState` and `runBubbleMotionFrame` share one read-only anchor resolver while RAF scheduling, map ownership, frame-state storage, and DOM writes remain page-owned.
- Progress: bubble runtime active-state lookup now resolves through `resolveBubbleRuntimeActiveState` in `HomePage.vue`; `runBubbleMotionFrame`, `isBubblePersistentSelected`, and `bubbleStateClasses` share one active-state resolver while template class binding, frame-state consumption, selected and hovered ref ownership, RAF scheduling, and DOM writes remain page-owned.
- Progress: bubble frame presentation formatting now resolves through `resolveBubbleFramePresentationState` in `bubbleFramePresentation.ts`; `HomePage.vue` keeps DOM style writes and class toggles while CSS custom-property values and runtime class state selection are covered by focused tests.
- Progress: bubble frame reset presentation now resolves through `resolveBubbleFrameResetPresentationState` in `bubbleFramePresentation.ts`; `HomePage.vue` keeps style property writes, class toggles, frame-state map cleanup, element registration, and motion-loop side effects.
- Progress: home data-source runtime shape now reuses `HomeDataSource` from `homeSupportPolicy.ts`; `HomePage.vue` and `useHomeViewModel.ts` no longer own duplicate `'aggregate' | 'support' | 'cached' | 'fallback'` declarations.
- Progress: support refresh pending-target consumption now resolves through `resolveHomeSupportRefreshRunState` in `homeSupportPolicy.ts`; `HomePage.vue` keeps abort-controller ownership, service calls, and async controller cleanup side effects.
- Progress: home media failure source normalization and immutable failed-source Set updates now resolve through `isHomeMediaFailureRecorded` and `resolveHomeMediaFailureMarkState` in `homeSupportPolicy.ts`; `HomePage.vue` keeps ref ownership and media error event handling side effects.
- Progress: home media render eligibility now resolves through `shouldRenderHomeMediaSource` in `homeSupportPolicy.ts`; `HomePage.vue` keeps failed-media Set ownership, media bindings, image error handling, and placeholder side effects.
- Progress: homepage fallback post detection now resolves through `isHomeFallbackPost` in `homeModel.ts`; `HomePage.vue` keeps preview routing, detail routing, and router side effects.
- Progress: homepage post preview route/action selection now resolves through `resolveHomePostPreviewAction` in `homePostPreviewAction.ts`; `HomePage.vue` keeps router pushes, preview refs, thumbnail refs, hovered-bubble mutation, and preview-open side effects.
- Progress: homepage preview detail route/action selection now resolves through `resolveHomePostDetailAction` in `homePostPreviewAction.ts`; `HomePage.vue` keeps navigation context storage, thumbnail cache writes, preview-close mutation, and router side effects.
- Progress: bubble persistent-selection and active class presentation now resolve through `resolveBubbleActivePresentationState` in `bubbleFramePresentation.ts`; `HomePage.vue` keeps selected and hovered ref reads, template binding, active-state consumption, and frame-state consumers.
- Progress: bubble active-presentation ref reads now pass through page-local `resolveBubbleActivePresentation`; `HomePage.vue` keeps ref ownership while persistent-selection and class binding share one read path.
- Progress: homepage preview controller mount eligibility now resolves through `shouldMountHomePreviewController` in `homeModel.ts`; `HomePage.vue` keeps preview-open ref ownership, computed wrapping, async component registration, and template mount side effects.
- Progress: homepage selected bubble and active bubble state now resolve through `resolveHomeSelectedBubbleId` and `hasHomeActiveBubble` in `homeModel.ts`; `HomePage.vue` keeps reactive computed wrappers, preview refs, hovered refs, template classes, and motion-loop consumers.
- Progress: homepage active rail index selection now resolves through `resolveHomeActiveRailIndex` in `homeScenePolicy.ts`; `HomePage.vue` keeps translated rail slide data, active slide lookup, template props, rail progress refs, and scroll/GSAP side effects.
- Progress: homepage active rail slide fallback selection now resolves through `resolveHomeActiveRailSlide` in `homeScenePolicy.ts`; `HomePage.vue` keeps translated rail slide construction, computed wrappers, template props, and rail progress ownership.
- Progress: homepage rail slide ordering now resolves through `buildHomeRailSlides` in `homeScenePolicy.ts`; `HomePage.vue` keeps translation lookup while rail key order and label mapping are covered by policy tests.
- Progress: hero collage and hero spotlight card presentation classes now resolve through `resolveHeroCollageCardClasses` and `resolveHeroSpotlightCardClasses` in `homeImagePolicy.ts`; `HomePage.vue` keeps translation fallback, media bindings, image failure handling, preview routing, and click side effects.
- Progress: hero spotlight label selection now resolves through `resolveHeroSpotlightLabel` in `homeImagePolicy.ts`; `HomePage.vue` keeps translated editorial label lookup, card author rendering, preview routing, and click side effects while lead/support label selection is covered by policy tests.
- Progress: homepage image srcset attribute fallback now resolves through `resolveHomeImageSrcsetAttribute` in `homeImagePolicy.ts`; `HomePage.vue` keeps media source binding, failed-media gating, image error handling, and loading/fetch-priority side effects.
- Progress: homepage image source attribute fallback now resolves through `resolveHomeImageSourceAttribute` in `homeImagePolicy.ts`; `HomePage.vue` keeps Avatar component ownership, author link routing, fallback icon slots, and author metadata rendering side effects.
- Progress: hero editorial loaded-state presentation now resolves through `resolveHeroEditorialClasses` in `homeImagePolicy.ts`; `HomePage.vue` keeps reveal timer ownership, hero card rendering, translation, and loading-state markup side effects.
- Progress: trends editorial compact-state presentation now resolves through `resolveTrendsEditorialClasses` in `homeImagePolicy.ts`; `HomePage.vue` keeps editorial-card presence checks, support-text rendering, metadata rendering, and translation side effects.
- Progress: featured rail card and fallback post-card presentation now resolves through `resolveFeaturedRailCardClasses` and `resolveFeaturedRailPostPresentation` in `homeImagePolicy.ts`; `HomePage.vue` keeps card iteration, media bindings, image failure handling, preview routing, and click side effects.
- Progress: featured rail card raw summary and thumbnail class inputs now resolve through `resolveFeaturedRailCardPresentationClasses` in `homeImagePolicy.ts`; `HomePage.vue` keeps card iteration, preview routing, media bindings, and click side effects while template-owned boolean coercion is removed.
- Progress: featured rail media empty-state classes now resolve through `resolveFeaturedRailMediaClasses` in `homeImagePolicy.ts`; `HomePage.vue` keeps media element ownership, image loading bindings, image failure handling, and placeholder rendering side effects.
- Progress: hero collage and featured rail image presentation attributes now resolve through `resolveHeroCollageImagePresentation` and `resolveFeaturedRailImagePresentation` in `homeImagePolicy.ts`; `HomePage.vue` keeps media source binding, failed-media gating, image error handling, decoding, preview routing, and click side effects while sizes, dimensions, loading, and fetch-priority are covered by policy tests.
- Progress: portal lead preview fallback style now resolves through `resolvePortalLeadPreviewStyle` in `homeImagePolicy.ts`; `HomePage.vue` keeps portal link routing, media bindings, image failure handling, and empty-preview rendering side effects.
- Progress: portal card icon key presentation now resolves through `resolvePortalCardIconClasses` in `homeImagePolicy.ts`; `HomePage.vue` keeps portal panel iteration, link routing, icon rendering, and translated panel copy side effects.
- Progress: schedule highlight paired-list presentation now resolves through `resolveScheduleHighlightListClasses` in `homeSupportPolicy.ts`; `HomePage.vue` keeps schedule link routing, schedule item rendering, companion card rendering, and translation side effects.
- Progress: schedule highlight companion kind presentation now resolves through `resolveScheduleHighlightCompanionClasses` in `homeSupportPolicy.ts`; `HomePage.vue` keeps companion link routing, label/title/copy/meta rendering, and translation side effects.
- Progress: schedule highlight route, label, and meta fallback text now resolve through `resolveScheduleHighlightRoute`, `resolveScheduleHighlightLabel`, and `resolveScheduleHighlightMetaText` in `homeSupportPolicy.ts`; `HomePage.vue` keeps RouterLink rendering, category translation, date/author formatting, and schedule action copy side effects.
- Progress: posts toolbar stats tagged-state presentation now resolves through `resolvePostsToolbarStatsClasses` in `homeSupportPolicy.ts`; `HomePage.vue` keeps tag list rendering, search route links, hero stat rendering, and translation side effects.
- Progress: bubble stage layout and activity presentation now resolves through `resolveBubbleStageClasses` in `bubbleFramePresentation.ts`; `HomePage.vue` keeps pointer event handlers, canvas ownership, bubble iteration, runtime active-state reads, and motion-frame side effects.
- Progress: bubble stage metrics normalization now resolves through `resolveBubbleStageMetrics` in `bubbleMotion.ts`; `HomePage.vue` keeps DOM rect reads, `window.innerWidth` access, anchor-map writes, pointer-state writes, and motion measurement scheduling side effects.
- Progress: bubble canvas and motion frame delta normalization now resolves through `resolveBubbleFrameDeltaMs` in `bubbleMotion.ts`; `HomePage.vue` keeps RAF timestamp storage, canvas rendering, frame-state storage, and DOM writes while regressed or non-finite frame gaps normalize through focused tests.
- Progress: retained bubble canvas orb resize bounds now resolve through `resolveHomeBubbleCanvasRetainedOrbState` in `homeScenePolicy.ts`; `HomePage.vue` keeps DOM measurement, canvas dimension writes, orb array replacement, and reseed side effects while retained orb x, y, and radius normalization are covered by policy tests.
- Progress: story progress counter formatting now resolves through `formatHomeStoryProgressNumber` in `homeScenePolicy.ts`; `HomePage.vue` keeps active story index and effective story count ownership while the two-digit fallback display contract is covered by policy tests.
- Progress: viewport scene blend fallback state now resolves through `resolveHomeViewportSceneBlendState` in `homeScenePolicy.ts`; `HomePage.vue` keeps DOM measurement, bubble reveal side effects, rail lock writes, footer CSS writes, and viewport frame scheduling side effects.
- Progress: bubble reveal retreat phase and exit-reset timer intent now resolve through `resolveBubbleRevealRetreatState` in `bubbleRevealState.ts`; `HomePage.vue` keeps RAF cleanup, timer cleanup, motion-loop cleanup, phase mutation, and timeout scheduling side effects.
- Progress: bubble reveal restart phase and burst replay intent now resolve through `resolveBubbleRevealRestartState` in `bubbleRevealState.ts`; `HomePage.vue` keeps window guard, RAF scheduling, frame refs, phase mutation, and motion-loop cleanup side effects.
- Progress: bubble reveal reset phase and cleanup intent now resolve through `resolveBubbleRevealResetState` in `bubbleRevealState.ts`; `HomePage.vue` keeps RAF cancellation, timer cleanup, motion-loop cleanup, and phase mutation side effects.
- Progress: bubble motion stop frame-style reset eligibility now resolves through `shouldResetBubbleFrameStylesOnMotionStop` in `bubbleRevealState.ts`; `HomePage.vue` keeps RAF stop calls, motion runtime state mutation, and DOM cleanup side effects.
- Progress: homepage empty aggregate construction now resolves through `createEmptyHomeAggregate` in `homeSupportPolicy.ts`; `HomePage.vue` keeps initial reactive aggregate ownership, aggregate application, routing, preview, support refresh, and runtime side effects.
- Progress: homepage total-count fallback selection now resolves through `resolveHomeTotalCount` in `homeSupportPolicy.ts`; `HomePage.vue` keeps initial total ref ownership, bootstrap/fallback service calls, aggregate application, and total state writes.
- Progress: homepage public prewarm viewport limits now resolve through `resolveHomePublicPrewarmLimits` in `homeSupportPolicy.ts`; `HomePage.vue` keeps `window.innerWidth` access, task scheduling, dynamic API imports, cache calls, cancel handle ownership, and background side effects.
- Progress: story card presentation style input now resolves through `buildHomeStoryCardStyle` in `homeScenePolicy.ts`; `HomePage.vue` keeps reactive story progress reads and template style binding while `storyDeckMotion.ts` keeps viewport-scaled motion math.
- Progress: media slice active-state presentation now resolves through `resolveHomeMediaSliceClasses` in `homeScenePolicy.ts`; `HomePage.vue` keeps active story index computation, story card iteration, card style binding, and PostCard rendering side effects.
- Progress: home enhancement schedule mode now resolves through `resolveHomeEnhancementScheduleDecision` in `homeSceneActivationPolicy.ts`; `HomePage.vue` keeps task scheduling, scene binding, `runAfterNextPaint`, ScrollTrigger readiness, layout observer startup, viewport blend binding, scroll dispatch, and all runtime side effects.
- Progress: home enhancement scheduling start and continuation eligibility now resolves through `shouldScheduleHomeEnhancements` in `homeSceneActivationPolicy.ts`; `HomePage.vue` keeps `scheduleTask`, scene binding, ScrollTrigger readiness, viewport blend binding, event dispatch, and runtime side effects.
- Progress: measured scene geometry fallback and combined travel/progress output now resolve through `resolveHomeMeasuredSceneGeometry` in `homeScenePolicy.ts`; `HomePage.vue` keeps `window`, DOM size reads, `offsetTop`, `scrollY`, and `querySelector` side effects.
- Progress: homepage quick-nav active-section selection now resolves through `resolveHomeActiveSectionId` in `homeScenePolicy.ts`; `HomePage.vue` keeps `IntersectionObserver`, element id reads, visibility map mutation, and active-section ref assignment side effects.
- Completed slice evidence on `2026-06-07`: `homeScenePolicy` focused tests, `homeSceneActivationPolicy` focused tests, HomePage focused tests, complexity budget, type-check, `git diff --check`, and text-style audit passed; GitNexus change detection completed with MEDIUM scope limited to HomePage bubble reveal adjacency.
- Verified target-decision evidence on `2026-06-07`: `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleMotion.spec.ts --maxWorkers=1` passed with 16 tests; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3078` lines under the `3125` registered limit; `bun run type-check`, `bun run audit:repo --only=text-style`, and `git diff --check` passed.
- Verified target-decision GitNexus evidence on `2026-06-07`: `npx gitnexus analyze` completed; upstream impact for `resolveBubbleMotionTargetDecision` was LOW with no affected execution flows; `detect_changes(scope=all)` reported HIGH cumulative scope across 9 tracked files and 14 affected HomePage bubble pointer or motion-frame processes.
- Current step-state slice evidence on `2026-06-08`: upstream impact for `runBubbleMotionFrame` and `resolveBubbleMotionTargetDecision` was LOW before editing; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleMotion.spec.ts --maxWorkers=1` passed with 20 tests; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3066` lines under the `3125` registered limit; `bun run type-check`, `bun run audit:repo --only=text-style`, and `git diff --check` passed; `npx gitnexus analyze` completed in incremental mode with `14,729` nodes, `26,362` edges, `773` clusters, and `300` flows; upstream impact for `resolveBubbleMotionStepState` was LOW with one direct caller file and no affected execution flows.
- Current canvas-start slice evidence on `2026-06-08`: upstream impact for `startBubbleCanvasScene` was LOW before editing with one direct caller and one affected process family; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeSceneActivationPolicy.spec.ts --maxWorkers=1` passed with 8 tests; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3079` lines under the `3125` registered limit; `bun run type-check`, `bun run audit:repo --only=text-style`, and `git diff --check` passed; `npx gitnexus analyze` completed in incremental mode with `14,730` nodes, `26,365` edges, `773` clusters, and `300` flows; upstream impact for `shouldStartHomeBubbleCanvasScene` was LOW with one direct caller file and no affected execution flows.
- Current canvas-frame-parameters slice evidence on `2026-06-08`: upstream impact for `renderBubbleCanvasFrame` was LOW before editing with no affected execution flows; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts --maxWorkers=1` passed with 18 tests; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3080` lines under the `3125` registered limit; `bun run type-check`, `bun run audit:repo --only=text-style`, and `git diff --check` passed; `npx gitnexus analyze` completed in incremental mode with `14,730` nodes, `26,368` edges, `773` clusters, and `300` flows; upstream impact for `resolveHomeBubbleCanvasFrameParameters` was LOW with one direct caller and no affected execution flows.
- Current canvas-orb-count slice evidence on `2026-06-08`: upstream impact for `resolveBubbleCanvasOrbCount`, `seedBubbleCanvasOrbs`, and `resizeBubbleCanvasScene` was LOW before editing; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts --maxWorkers=1` passed with 19 tests; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3075` lines under the `3125` registered limit; `bun run type-check`, `bun run audit:repo --only=text-style`, and `git diff --check` passed; `npx gitnexus analyze` completed in incremental mode with `14,730` nodes, `26,368` edges, `773` clusters, and `300` flows; upstream impact for `resolveHomeBubbleCanvasOrbCount` was LOW with direct callers limited to canvas seeding and resize, and one affected HomePage pointer-enter process family.
- Current canvas-resize-state slice evidence on `2026-06-08`: upstream impact for `resizeBubbleCanvasScene` and `seedBubbleCanvasOrbs` was LOW before editing; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts --maxWorkers=1` passed with 20 tests; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3081` lines under the `3125` registered limit; `bun run type-check`, `bun run audit:repo --only=text-style`, and `git diff --check` passed; `npx gitnexus analyze` completed with `14,731` nodes, `26,374` edges, `771` clusters, and `300` flows; upstream impact for `resolveHomeBubbleCanvasResizeState` was LOW with direct caller `resizeBubbleCanvasScene` and affected process family limited to HomePage `handleBubblePointerEnter`.
- Current canvas-orb-frame-state slice evidence on `2026-06-08`: upstream impact for `renderBubbleCanvasFrame` was LOW before editing with no direct callers, no affected modules, and no affected execution flows; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts --maxWorkers=1` passed with 21 tests; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3092` lines under the `3125` registered limit; `bun run type-check`, `bun run audit:repo --only=text-style`, and `git diff --check` passed; `npx gitnexus analyze` completed with `14,745` nodes, `26,386` edges, `776` clusters, and `300` flows.
- Current canvas-orb-seed-state slice evidence on `2026-06-08`: upstream impact for `seedBubbleCanvasOrbs` was LOW before editing with direct caller `resizeBubbleCanvasScene` and one affected HomePage `handleBubblePointerEnter` process family; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts --maxWorkers=1` passed with 22 tests; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning after an earlier low-memory timeout; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3100` lines under the `3125` registered limit; `bun run type-check`, `bun run audit:repo --only=text-style`, and `git diff --check` passed; `npx gitnexus analyze` completed with `14,747` nodes, `26,393` edges, `775` clusters, and `300` flows.
- Current canvas-orb-runtime-shape evidence on `2026-06-08`: upstream impact for `bubbleCanvasOrbs` was LOW with no direct callers, no affected modules, and no affected execution flows; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3090` lines under the `3125` registered limit; `bun run type-check` and `git diff --check` passed; `npx gitnexus analyze` completed with `14,747` nodes, `26,393` edges, `775` clusters, and `300` flows.
- Current bubble-force-center-runtime-shape evidence on `2026-06-08`: upstream impact for `bubbleMotionForceCenter` was LOW with no direct callers, no affected modules, and no affected execution flows; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3088` lines under the `3125` registered limit; `bun run type-check` and `git diff --check` passed; `npx gitnexus analyze` completed with `14,747` nodes, `26,393` edges, `775` clusters, and `300` flows.
- Current bubble-pointer-position-runtime-shape evidence on `2026-06-08`: upstream impact for `pointerStagePosition` was LOW with no direct callers, no affected modules, and no affected execution flows; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3084` lines under the `3125` registered limit; `bun run type-check` and `git diff --check` passed; `npx gitnexus analyze` completed with `14,747` nodes, `26,393` edges, `775` clusters, and `300` flows.
- Current home-no-glass-backdrop-style evidence on `2026-06-08`: upstream impact for `noGlassBackdropStyle` was LOW before editing with no affected execution flows; PreHeavy reported `ok` with `7.49 GB` free physical memory before serial validation; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts --maxWorkers=1` passed with 25 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` reduced to `3121` lines under the `3125` registered limit; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed with `14,794` nodes, `26,463` edges, `783` clusters, and `300` flows; upstream impact for `HOME_NO_GLASS_BACKDROP_STYLE` and `noGlassBackdropStyle` was LOW with no affected execution flows.
- Current home-animation-consent-policy evidence on `2026-06-08`: upstream impact for `shouldAnimate` was LOW before editing for both computed function and const symbols with no affected execution flows; SessionStart reported `ok` with `9.36 GB` free physical memory and PreHeavy reported `low-memory` with `5.13 GB` before serial validation; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts --maxWorkers=1` passed with 24 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3123` lines under the `3125` registered limit; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `git diff --check` passed; `npx gitnexus analyze` completed with `14,793` nodes, `26,462` edges, `783` clusters, and `300` flows; upstream impact for `shouldUseHomeAnimations` was LOW with direct caller limited to `HomePage.vue` and no affected execution flows, while `shouldAnimate` remained LOW with no affected execution flows.
- Current bubble-hover-source-runtime-shape evidence on `2026-06-08`: upstream impact for `hoveredBubbleSource` was LOW with no direct callers, no affected modules, and no affected execution flows; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3085` lines under the `3125` registered limit; `bun run type-check` and `git diff --check` passed; `npx gitnexus analyze` completed with `14,747` nodes, `26,393` edges, `775` clusters, and `300` flows.
- Current bubble-interactive-tier-policy evidence on `2026-06-08`: upstream impact for `isBubbleInteractiveTier` was LOW before editing for both computed function and const symbols with no affected execution flows; PreHeavy reported `ok` with `8.63 GB` free physical memory before serial validation; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeModel.spec.ts --maxWorkers=1` passed with 8 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3121` lines under the `3125` registered limit; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed with `14,793` nodes, `26,458` edges, `783` clusters, and `300` flows; upstream impact for `isHomeBubbleInteractiveTier` was LOW with direct caller limited to `HomePage.vue` and no affected execution flows, while `isBubbleInteractiveTier` remained LOW with no affected execution flows.
- Current bubble-hover-state-policy evidence on `2026-06-08`: upstream impact for `setHoveredBubble` was LOW before editing with four direct callers and one affected process family; upstream impact for `clearHoveredBubble` was LOW before editing with four direct callers and no affected execution flows; `git diff --check` passed; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3090` lines under the `3125` registered limit; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleMotion.spec.ts --maxWorkers=1` passed with 25 tests; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed with `14,765` nodes, `26,421` edges, `778` clusters, and `300` flows; upstream impact for `resolveBubbleHoverSetState` was LOW with direct caller `setHoveredBubble`, one affected process family, and two affected modules; upstream impact for `resolveBubbleHoverClearState` was LOW with direct caller `clearHoveredBubble`, one affected module, and no affected execution flows.
- Current bubble-active-state-policy evidence on `2026-06-08`: upstream impact for `isBubblePersistentSelected` was LOW before editing with three direct callers and one affected `runBubbleMotionFrame` process family; upstream impact for `isBubbleHoverActive` was LOW before editing with three direct callers and one affected `runBubbleMotionFrame` process family; `git diff --check` passed; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3097` lines under the `3125` registered limit; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleMotion.spec.ts --maxWorkers=1` passed with 27 tests; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed with `14,762` nodes, `26,425` edges, `773` clusters, and `300` flows; upstream impact for `resolveBubbleActiveState` was LOW with two direct callers, two affected modules, and one affected `runBubbleMotionFrame` process family.
- Current bubble-stage-pointer-state evidence on `2026-06-08`: upstream impact for `updateBubbleStagePointerPosition` was LOW before editing with four direct callers and one affected `handleBubblePointerEnter` process family; `git diff --check` passed; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3096` lines under the `3125` registered limit; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleMotion.spec.ts --maxWorkers=1` passed with 29 tests; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed with `14,773` nodes, `26,430` edges, `779` clusters, and `300` flows; upstream impact for `resolveBubbleStagePointerState` was LOW with direct caller `updateBubbleStagePointerPosition`, one affected module, and one affected `handleBubblePointerEnter` process family.
- Current bubble-element-registration-state evidence on `2026-06-08`: upstream impact for `registerBubbleElement` was LOW before editing with one direct caller and no affected execution flows; upstream impact for `resolveBubbleButtonElement` was LOW with one direct caller and no affected execution flows; `git diff --check` passed; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3103` lines under the `3125` registered limit; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleMotion.spec.ts --maxWorkers=1` passed with 32 tests; `bun run type-check` passed after PreHeavy recovered from `danger` to `low-memory`; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed with `14,768` nodes, `26,436` edges, `774` clusters, and `300` flows; upstream impact for `resolveBubbleElementRegistrationState` was LOW with one direct caller and no affected execution flows.
- Current bubble-pointer-over-state evidence on `2026-06-08`: SessionStart reported `ok` with `11.8 GB` free physical memory and PreHeavy reported `ok` with `12.37 GB` free physical memory; `git diff --check` passed; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3112` lines under the `3125` registered limit; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleMotion.spec.ts --maxWorkers=1` passed with 35 tests; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed with `14,772` nodes, `26,439` edges, `778` clusters, and `300` flows; upstream impact for `resolveBubblePointerOverState` was LOW with direct callers limited to `handleBubbleStagePointerLeave`, `handleBubblePointerEnter`, `handleBubblePointerLeave`, and the `HomePage.vue` import scope, plus one affected `handleBubblePointerEnter` process family.
- Current bubble-stage-pointer-presence-state evidence on `2026-06-08`: upstream impact for `handleBubbleStagePointerEnter`, `handleBubbleStagePointerMove`, and `handleBubbleStagePointerLeave` was LOW before editing with no direct callers and no affected execution flows; PreHeavy reported `low-memory` with `5.59 GB` free physical memory for serial validation, then recovered to `ok` with `9.67 GB` free physical memory before GitNexus analysis; the first complexity check failed at `3130/3125`, then the page-owned side-effect applier reduced `src/views/HomePage.vue` to `3121/3125`; final `git diff --check` passed; final `node scripts/check-complexity-budget.mjs` passed; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleMotion.spec.ts --maxWorkers=1` passed with 37 tests; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed with `14,772` nodes, `26,447` edges, `775` clusters, and `300` flows; upstream impact for `resolveBubbleStagePointerPresenceState` and `applyBubbleStagePointerPresence` was LOW with no affected execution flows.
- Current bubble-interaction-state evidence on `2026-06-08`: upstream impact for `handleBubblePointerEnter`, `handleBubblePointerLeave`, `handleBubbleFocus`, and `handleBubbleBlur` was LOW before editing with no affected execution flows; SessionStart reported `ok` with `10.05 GB` free physical memory, PreHeavy reported `ok` with `9.35 GB` before validation and `7.73 GB` before GitNexus analysis; the first complexity check failed at `3126/3125`, then the page-owned interaction applier was tightened and `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3124` lines under the `3125` registered limit; `git diff --check` passed; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleMotion.spec.ts --maxWorkers=1` passed with 40 tests; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed with `14,775` nodes, `26,448` edges, `775` clusters, and `300` flows; upstream impact for `resolveBubbleInteractionState` was LOW, and upstream impact for the page-local `applyBubbleInteraction` convergence point was MEDIUM with no affected execution flows.
- Current active-hover-anchor-resolver evidence on `2026-06-08`: upstream impact for `buildBubblePointerState` and `runBubbleMotionFrame` was LOW before editing with no affected execution flows; SessionStart reported `ok` with `8.78 GB` free physical memory and PreHeavy reported `ok` with `8.61 GB` free physical memory before serial validation; `git diff --check` passed; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3120` lines under the `3125` registered limit; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `bun run type-check` passed; `npx gitnexus analyze` completed with `14,780` nodes, `26,452` edges, `779` clusters, and `300` flows; upstream impact for `resolveActiveBubbleHoverAnchor` was LOW with direct callers limited to `buildBubblePointerState`, `runBubbleMotionFrame`, and the `HomePage.vue` import scope, and affected process scope limited to `runBubbleMotionFrame`.
- Current runtime-active-state-resolver evidence on `2026-06-08`: PreHeavy reported `low-memory` with `5.9 GB` and later `4.74 GB` free physical memory before serial validation; `git diff --check` passed; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3118` lines under the `3125` registered limit; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `bun run type-check` passed; `npx gitnexus analyze` completed with `14,782` nodes, `26,450` edges, `780` clusters, and `300` flows; upstream impact for `resolveBubbleRuntimeActiveState` was LOW with affected process scope limited to `runBubbleMotionFrame`.
- Current frame-presentation-state evidence on `2026-06-08`: upstream impact for `writeBubbleFrameState` was LOW before editing with one direct caller file and no affected execution flows; PreHeavy reported `ok` with `11 GB`, `10.92 GB`, and `10.29 GB` free physical memory before serial validation and GitNexus analysis; `git diff --check` passed; the first complexity check identified `bubbleMotion.ts` as an unregistered `1012`-line large file after the helper was placed there, so the helper moved to `bubbleFramePresentation.ts`; final `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3118` lines under the `3125` registered limit and no new unregistered large file; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleMotion.spec.ts --maxWorkers=1` passed with 41 tests; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `bun run type-check` passed; `npx gitnexus analyze` completed with `14,784` nodes, `26,457` edges, `779` clusters, and `300` flows; upstream impact for `resolveBubbleFramePresentationState` and `writeBubbleFrameState` was LOW with no affected execution flows.
- Current home-data-source-runtime-shape evidence on `2026-06-08`: upstream impact for `applyHomeAggregate` was LOW with one direct caller file and no affected execution flows; upstream impact for `useHomeViewModel` was LOW with one direct caller file and no affected execution flows; `git diff --check` passed; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3086` lines under the `3125` registered limit; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/useHomeViewModel.spec.ts --maxWorkers=1` passed with 5 tests; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests after an initial cold-start default-timeout rerun proved the first HomePage import passes with `--testTimeout=30000`; `npx gitnexus analyze` completed with `14,747` nodes, `26,394` edges, `775` clusters, and `300` flows.
- Current support-refresh-run-state evidence on `2026-06-08`: upstream impact for `runHomeSupportRefresh` was LOW before editing with one direct caller file and no affected execution flows; `git diff --check` passed; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3087` lines under the `3125` registered limit; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeSupportPolicy.spec.ts --maxWorkers=1` passed with 3 tests; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed with `14,746` nodes, `26,398` edges, `772` clusters, and `300` flows; upstream impact for `resolveHomeSupportRefreshRunState` was LOW with one direct caller, one affected module, and no affected execution flows.
- Current home-media-failure-policy evidence on `2026-06-08`: upstream impact for `isHomeMediaFailed` and `markHomeMediaFailed` was LOW before editing with no affected execution flows; PreHeavy reported `ok` with `9.36 GB`, `9.95 GB`, `10.47 GB`, and `10.36 GB` free physical memory before serial validation and GitNexus analysis; `git diff --check` passed; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3118` lines under the `3125` registered limit; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeSupportPolicy.spec.ts --maxWorkers=1` passed with 4 tests; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `bun run type-check` passed; `npx gitnexus analyze` completed with `14,787` nodes, `26,465` edges, `779` clusters, and `300` flows; upstream impact for `isHomeMediaFailureRecorded`, `resolveHomeMediaFailureMarkState`, `isHomeMediaFailed`, and `markHomeMediaFailed` was LOW with no affected execution flows.
- Current home-fallback-post-policy evidence on `2026-06-08`: upstream impact for `isHomeFallbackPost` and `HOME_FALLBACK_PREFIX` was LOW before editing with no affected execution flows; PreHeavy reported `ok` with `9.98 GB`, `9.42 GB`, `9.68 GB`, and `10.1 GB` free physical memory before serial validation and GitNexus analysis; `git diff --check` passed; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3114` lines under the `3125` registered limit; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeModel.spec.ts --maxWorkers=1` passed with 6 tests; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `bun run type-check` passed; `npx gitnexus analyze` completed with `14,786` nodes, `26,444` edges, `778` clusters, and `300` flows; upstream impact for model-level `isHomeFallbackPost`, `openPostPreview`, and `openDetailFromPreview` was LOW with no affected execution flows.
- Current home-preview-controller-mount-policy evidence on `2026-06-08`: upstream impact for `shouldMountHomepagePreviewController` was LOW before editing for both computed function and const symbols with no affected execution flows; SessionStart reported `ok` with `9.19 GB` free physical memory and PreHeavy reported `ok` with `10.05 GB` before serial validation; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeModel.spec.ts --maxWorkers=1` passed with 9 tests; the first complexity check passed but left `src/views/HomePage.vue` at `3124/3125`, so the computed call site was tightened; final `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3122` lines under the `3125` registered limit; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `git diff --check` passed; `npx gitnexus analyze` completed with `14,792` nodes, `26,460` edges, `782` clusters, and `300` flows; upstream impact for `shouldMountHomePreviewController` was LOW with direct caller limited to `HomePage.vue` and no affected execution flows, while `shouldMountHomepagePreviewController` remained LOW with no affected execution flows.
- Current home-bubble-selection-state evidence on `2026-06-08`: upstream impact for `selectedBubbleId` and `hasActiveBubble` was LOW before editing for both computed function and const symbols with no affected execution flows; PreHeavy reported `ok` with `9.32 GB`, `9.48 GB`, `9.39 GB`, and `9.56 GB` free physical memory before serial validation and GitNexus analysis; `git diff --check` passed; the first complexity check passed but left `src/views/HomePage.vue` at `3124/3125`, so the page call sites were tightened; final `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3118` lines under the `3125` registered limit; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeModel.spec.ts --maxWorkers=1` passed with 8 tests; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `bun run type-check` passed; `npx gitnexus analyze` completed with `14,790` nodes, `26,450` edges, `781` clusters, and `300` flows; upstream impact for `resolveHomeSelectedBubbleId`, `hasHomeActiveBubble`, `selectedBubbleId`, and `hasActiveBubble` was LOW with no affected execution flows, with `partial=true` reported for the newly added model helper impact results.
- Current home-active-rail-index evidence on `2026-06-08`: upstream impact for `railSlideCount` and `activeRailIndex` was LOW before editing for both computed function and const symbols with no affected execution flows; PreHeavy reported `ok` with `9.46 GB` and `8.35 GB`, then `low-memory` with `5.16 GB` and `5.41 GB` free physical memory before serial validation and GitNexus analysis; `git diff --check` passed; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3119` lines under the `3125` registered limit; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts --maxWorkers=1` passed with 23 tests; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `bun run type-check` passed; `npx gitnexus analyze` completed with `14,790` nodes, `26,454` edges, `780` clusters, and `300` flows; upstream impact for `resolveHomeActiveRailIndex` and `activeRailIndex` was LOW with no affected execution flows.
- Current home-active-rail-slide evidence on `2026-06-08`: upstream impact for `activeRailSlide` was LOW before editing for both computed function and const symbols with no affected execution flows; PreHeavy reported `ok` with `10.09 GB` free physical memory before serial validation and `9.37 GB` before the HomePage focused suite; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts --maxWorkers=1` passed with 23 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3120` lines under the `3125` registered limit; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed with `14,787` nodes, `26,456` edges, `777` clusters, and `300` flows; upstream impact for `resolveHomeActiveRailSlide` was LOW with direct caller limited to `HomePage.vue` and no affected execution flows, while `activeRailSlide` remained LOW with no affected execution flows.
- Current viewport-scene-blend-state evidence on `2026-06-08`: upstream impact for `updateViewportSceneBlend` was LOW before editing with one direct caller file and no affected execution flows; `git diff --check` passed; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3091` lines under the `3125` registered limit; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts --maxWorkers=1` passed with 23 tests; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed with `14,754` nodes, `26,403` edges, `776` clusters, and `300` flows; upstream impact for `resolveHomeViewportSceneBlendState` was LOW with one direct caller, one affected process, and one affected module.
- Current bubble-reveal-retreat-state evidence on `2026-06-08`: upstream impact for `startBubbleRetreat` was LOW before editing with one direct caller file and no affected execution flows; `git diff --check` passed; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3089` lines under the `3125` registered limit; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleRevealState.spec.ts --maxWorkers=1` passed with 7 tests; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed with `14,752` nodes, `26,408` edges, `772` clusters, and `300` flows; upstream impact for `resolveBubbleRevealRetreatState` was LOW with one direct caller file and no affected execution flows.
- Current bubble-reveal-restart-state evidence on `2026-06-08`: upstream impact for `restartBubbleBurst` was LOW before editing with one direct caller file and no affected execution flows; `git diff --check` passed; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3090` lines under the `3125` registered limit; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleRevealState.spec.ts --maxWorkers=1` passed with 8 tests; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed with `14,759` nodes, `26,412` edges, `777` clusters, and `300` flows; upstream impact for `resolveBubbleRevealRestartState` was LOW with direct caller `restartBubbleBurst`, one affected module, and no affected execution flows.
- Current bubble-reveal-reset-state evidence on `2026-06-08`: upstream impact for `applyBubbleRevealAction` was HIGH with three direct callers and four affected process families, so the action-dispatch slice was skipped; upstream impact for `resetBubbleRevealState` was LOW before editing with two direct callers and two affected process families; `git diff --check` passed; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3092` lines under the `3125` registered limit; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleRevealState.spec.ts --maxWorkers=1` passed with 9 tests; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed with `14,756` nodes, `26,414` edges, `772` clusters, and `300` flows; upstream impact for `resolveBubbleRevealResetState` was LOW with direct caller `resetBubbleRevealState`, one affected module, and two affected process families.
- Current home-empty-aggregate-policy evidence on `2026-06-08`: initial upstream impact lookup for `createEmptyHomeAggregate` returned `UNKNOWN` before the new support-policy symbol was indexed; the slice was constrained to import and test ownership relocation, then `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeSupportPolicy.spec.ts --maxWorkers=1` passed with 5 tests, `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeModel.spec.ts --maxWorkers=1` passed with 9 tests, `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3091` lines under the `3125` registered limit, `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning, `bun run type-check` passed, and `git diff --check` passed. PreHeavy reported `ok` with `7.35 GB` free physical memory before GitNexus indexing; `npx gitnexus analyze` completed with `14,794` nodes, `26,463` edges, `783` clusters, and `300` flows; upstream impact for indexed `createEmptyHomeAggregate` was LOW with one direct caller file and no affected execution flows.
- Current home-public-prewarm-limits-policy evidence on `2026-06-08`: upstream impact for `schedulePublicHomePrewarm` was LOW before editing with one direct caller file and no affected execution flows; PreHeavy reported `low-memory` with `5.29 GB` free physical memory before serial validation, then `ok` with `7.25 GB` before GitNexus indexing. `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeSupportPolicy.spec.ts --maxWorkers=1` passed with 6 tests, `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3091` lines under the `3125` registered limit, `bun run type-check` passed, and `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1` passed with 17 tests and only the existing vue-i18n experimental compiler warning. `npx gitnexus analyze` completed with `14,794` nodes, `26,465` edges, `783` clusters, and `300` flows; upstream impact for `resolveHomePublicPrewarmLimits` was LOW with direct caller `schedulePublicHomePrewarm`, one affected module, and no affected execution flows.
- Current story-card-presentation-style evidence on `2026-06-08`: upstream impact for `getStoryCardStyle` was LOW before editing with no direct callers and no affected execution flows; PreHeavy reported `ok` with `7.1 GB` free physical memory before serial validation and `8.42 GB` before the HomePage focused rerun. `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts --maxWorkers=1` first failed because the new assertion expected `z-index=4` while the existing motion algorithm returned `3`, then passed with 26 tests after the assertion was corrected to the current algorithm output; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3091` lines under the `3125` registered limit; `bun run type-check` passed; the first HomePage focused suite hit the known cold-start `10000ms` timeout on the first test after 16 tests passed, and the rerun with `--testTimeout=30000` passed 17 tests with only the existing vue-i18n experimental compiler warning. `npx gitnexus analyze` completed with `14,795` nodes, `26,468` edges, `783` clusters, and `300` flows; upstream impact for `buildHomeStoryCardStyle` was LOW with direct caller `getStoryCardStyle`, one affected module, and no affected execution flows.
- Current home-enhancement-schedule-decision evidence on `2026-06-08`: SessionStart recovered from the prior `danger` state to `ok` with `6.72 GB` free physical memory, and PreHeavy reported `ok` with `10.52 GB` before serial validation. Upstream impact for `scheduleHomeEnhancements` was LOW before editing with one direct caller and no affected execution flows; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeSceneActivationPolicy.spec.ts --maxWorkers=1` passed with 9 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3097` lines under the `3125` registered limit; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning. `npx gitnexus analyze` completed with `14,797` nodes, `26,473` edges, `783` clusters, and `300` flows; upstream impact for `resolveHomeEnhancementScheduleDecision` and the current `scheduleHomeEnhancements` call path remained LOW with no affected execution flows.
- Current measured-scene-geometry evidence on `2026-06-08`: pre-edit upstream impact for `resolveSceneTravelDistance` and `resolveSceneProgress` was LOW with one direct caller and no affected execution flows, while capability-wrapper candidates were skipped after HIGH or CRITICAL impact results. PreHeavy reported `ok` with `9.87 GB`, `9.75 GB`, and `9.68 GB` free physical memory across serial validation and GitNexus indexing. `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts --maxWorkers=1` passed with 28 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3098` lines under the `3125` registered limit; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `git diff --check` and `bun run audit:repo --only=text-style` passed. `npx gitnexus analyze` completed with `14,801` nodes, `26,476` edges, `784` clusters, and `300` flows.
- Current quick-nav-active-section-policy evidence on `2026-06-08`: upstream impact for `observeHomeSections` was LOW before editing with one direct caller file and no affected execution flows. PreHeavy initially reported `danger` with `2.95 GB` free physical memory after source edits, then recovered to `low-memory` with `5.7 GB`, `5.22 GB`, `5.76 GB`, and `3.83 GB` for serial validation, and later `ok` with `8.93 GB` for GitNexus indexing. `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts --maxWorkers=1` passed with 30 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3091` lines under the `3125` registered limit; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `git diff --check` and `bun run audit:repo --only=text-style` passed. `npx gitnexus analyze` completed with `14,802` nodes, `26,480` edges, `784` clusters, and `300` flows.
- Current home-post-preview-action evidence on `2026-06-08`: SessionStart reported `low-memory` with `4.23 GB` free physical memory and PreHeavy recovered to `ok` with `12.55 GB` and later `11.03 GB` before serial validation. The first focused spec failed because a `/post/story-1` fixture is not a contract resource id; the fixture was replaced with UUID v7 `0195fe30-6f9d-7f31-9e6f-c9a5c478a301`, and a legacy slug regression now asserts navigation to `/explore`. The first complexity check failed after the helper lived in `homeModel.ts` and pushed the file to `1034` unregistered lines, so the action helper moved to `homePostPreviewAction.ts`; final `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3084` lines and `homeModel.ts` below the soft limit. `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeModel.spec.ts src/views/homepage/__tests__/homePostPreviewAction.spec.ts --maxWorkers=1` passed with 13 tests; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning. `npx gitnexus analyze` completed with `14,804` nodes, `26,486` edges, `783` clusters, and `300` flows; upstream impact for `resolveHomePostPreviewAction` was LOW with direct caller limited to `openPostPreview`, one affected module, and no affected execution flows; upstream impact for `openPostPreview` was LOW with no affected execution flows.
- Current home-post-detail-action evidence on `2026-06-08`: pre-edit upstream impact for `openDetailFromPreview` was LOW with no direct callers, no affected modules, and no affected execution flows; upstream impact for existing `resolveHomePostPreviewAction` was LOW with one direct caller and no affected execution flows. SessionStart reported `low-memory` with `5.37 GB` free physical memory; PreHeavy reported `low-memory` with `5.76 GB` before focused validation, then `danger` with `1.93 GB`; a later PreHeavy recovered to `low-memory` with `3.25 GB` before type-check, then fell back to `danger` with `0.9 GB`; the next continuation recovered to `ok` with `12.4 GB`, `13.92 GB`, and `13.7 GB` before HomePage focused tests and GitNexus analysis. `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homePostPreviewAction.spec.ts --maxWorkers=1` passed with 8 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3080` lines under the `3125` registered limit; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `git diff --check` passed. `npx gitnexus analyze` completed with `14,805` nodes, `26,489` edges, `783` clusters, and `300` flows; upstream impact for `resolveHomePostDetailAction` was LOW with direct caller limited to `openDetailFromPreview`, one affected module, and no affected execution flows; upstream impact for `openDetailFromPreview` was LOW with no affected execution flows.
- Current bubble-active-presentation-state evidence on `2026-06-08`: the helper first lived in `bubbleMotion.ts`, which failed `node scripts/check-complexity-budget.mjs` because `bubbleMotion.ts` became a new unregistered large file, so active presentation moved to `bubbleFramePresentation.ts`. `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleMotion.spec.ts --maxWorkers=1` passed with 42 tests; final `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3083` lines under the `3125` registered limit and no new unregistered `bubbleMotion.ts` exception; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning. `npx gitnexus analyze` completed with `14,806` nodes, `26,493` edges, `782` clusters, and `300` flows; upstream impact for `resolveBubbleActivePresentationState`, `bubbleStateClasses`, and `isBubblePersistentSelected` was LOW with no affected execution flows.
- Current bubble-active-presentation-read-wrapper evidence on `2026-06-08`: GitNexus repo selection must use full path `<frontend-main-repo>` because two indexed repositories share the `hmrchan-frontend` name. Pre-edit upstream impact for `isBubblePersistentSelected` and `bubbleStateClasses` was LOW with no affected execution flows; upstream impact for `resolveBubbleRuntimeActiveState` was LOW with one direct page caller and no affected execution flows. `git diff --check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3083` lines under the `3125` registered limit; `bun run type-check` passed. Follow-up GitNexus analyze was initially deferred because PreHeavy reported `danger` with `1.57 GB` free physical memory, then later completed after PreHeavy recovered below `danger`; `npx gitnexus analyze` completed with `14,807` nodes, `26,498` edges, `782` clusters, and `300` flows. Upstream impact for `resolveBubbleActivePresentation` was LOW with direct callers limited to `isBubblePersistentSelected` and `bubbleStateClasses`, one direct module, and no affected execution flows.
- Current home-rail-slide-order-policy evidence on `2026-06-08`: pre-edit upstream impact for both indexed `railSlides` candidates was LOW with no affected execution flows; upstream impact for `resolveHomeActiveRailSlide` was LOW with one direct page caller and no affected execution flows. `git diff --check` passed; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts --maxWorkers=1` passed with 30 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3086` lines under the `3125` registered limit; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning. `npx gitnexus analyze` completed with `14,809` nodes, `26,501` edges, `783` clusters, and `300` flows; upstream impact for `buildHomeRailSlides` was LOW with direct caller limited to `HomePage.vue` and no affected execution flows.
- Current bubble-frame-reset-presentation evidence on `2026-06-08`: pre-edit upstream impact for `resetBubbleFrameStateStyle`, `writeBubbleFrameState`, `clearBubbleRuntimeClasses`, and `resolveBubbleFramePresentationState` was LOW. SessionStart reported `low-memory` with `4.68 GB` free physical memory; PreHeavy recovered to `ok` with `8.77 GB` before serial validation. `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleMotion.spec.ts --maxWorkers=1` passed with 43 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3082` lines under the `3125` registered limit; `bun run type-check` passed; `git diff --check` passed for the tracked diff. Follow-up `npx gitnexus analyze` completed with `14,813` nodes, `26,519` edges, `786` clusters, and `300` flows; upstream impact for `resolveBubbleFrameResetPresentationState` and page-local `applyBubbleFramePresentationState` was LOW, with no affected execution flows for the helper and affected process scope limited to HomePage bubble motion/setup paths for the page-local applier. `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=258`, and `affected_count=12`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveBubbleFrameResetPresentationState`.
- Current bubble-motion-stop-reset-style-policy evidence on `2026-06-08`: pre-edit upstream impact for `runBubbleMotionFrame` was LOW with no affected execution flows; pre-edit upstream impact for `syncBubbleMotionLoop` was MEDIUM with no affected execution flows and direct scope limited to HomePage bubble measurement, hover, pointer, and activation callers. The slice extracted the repeated `bubbleRevealPhase.value !== 'exiting'` decision into `shouldResetBubbleFrameStylesOnMotionStop` and added focused expectations to `bubbleRevealState.spec.ts`. SessionStart reported `ok` with `7.22 GB` free physical memory; PreHeavy reported `low-memory` with `5.18 GB` before focused validation and later `ok` with `9.5 GB`, `10.94 GB`, and `10.31 GB` before serial validation and GitNexus analysis. `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleRevealState.spec.ts --maxWorkers=1` passed with 10 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3083` lines under the `3125` registered limit; `bun run type-check` passed; `git diff --check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning. `npx gitnexus analyze` completed with `14,813` nodes, `26,524` edges, `785` clusters, and `300` flows; upstream impact for `shouldResetBubbleFrameStylesOnMotionStop` and `runBubbleMotionFrame` was LOW. `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=260`, and `affected_count=12`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `shouldResetBubbleFrameStylesOnMotionStop`.
- Current home-enhancement-schedule-eligibility evidence on `2026-06-08`: upstream impact for `shouldScheduleHomeEnhancements` and `scheduleHomeEnhancements` was LOW with direct caller scope limited to `scheduleHomeEnhancements` and `setHomeSceneLifecycleEnabled`, one affected module, and no affected execution flows. `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeSceneActivationPolicy.spec.ts --maxWorkers=1` passed with 9 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3089` lines under the `3125` registered limit; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `git diff --check` passed. `npx gitnexus analyze` completed after a full rebuild with `14,816` nodes, `26,527` edges, `787` clusters, and `300` flows. `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=260`, and `affected_count=12`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `shouldScheduleHomeEnhancements`.
- Current featured-rail-presentation-policy evidence on `2026-06-08`: pre-edit upstream impact for `resolveFeaturedRailImageSize` and `HomePage.vue` was LOW with no affected execution flows; PreHeavy reported `low-memory` with about `5 GB` free physical memory before focused validation, then `ok` with `10.54 GB`, `9.92 GB`, and `9.65 GB` before type-check, HomePage focused tests, and GitNexus indexing. `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeImagePolicy.spec.ts --maxWorkers=1` passed with 5 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3084` lines under the `3125` registered limit; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `git diff --check` passed. `npx gitnexus analyze` completed with `14,817` nodes, `26,532` edges, `785` clusters, and `300` flows; upstream impact for `resolveFeaturedRailCardClasses` and `resolveFeaturedRailPostPresentation` was LOW with direct caller limited to `HomePage.vue` or no indexed direct caller and no affected execution flows. `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=18`, `changed_count=264`, and `affected_count=12`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for the featured rail presentation helpers.
- Current hero-card-presentation-policy evidence on `2026-06-08`: upstream impact for `HomePage.vue`, `resolveHeroCollageImageDimensions`, and `resolveHeroCollageImageLoading` was LOW before editing with no affected execution flows. PreHeavy reported `low-memory` with about `4.69 GB` free physical memory before GitNexus indexing, so validation stayed serial. `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeImagePolicy.spec.ts --maxWorkers=1` passed with 6 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3080` lines under the `3125` registered limit; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `git diff --check` passed. `npx gitnexus analyze` completed with `14,819` nodes, `26,534` edges, `785` clusters, and `300` flows; upstream impact for `resolveHeroCollageCardClasses` and `resolveHeroSpotlightCardClasses` was LOW with no affected execution flows. `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=18`, `changed_count=267`, and `affected_count=12`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for the hero card presentation helpers.
- Current portal-lead-preview-style-policy evidence on `2026-06-08`: upstream impact for `HomePage.vue`, `resolveHeroCollageCardClasses`, and `resolveHomeImageSrcset` was LOW before editing with no affected execution flows. SessionStart reported `ok` with `10.94 GB` free physical memory; PreHeavy reported `ok` with `6.16 GB` before type-check and HomePage focused tests, then `low-memory` with `3.55 GB` before GitNexus indexing, so validation stayed serial and no watcher was started. `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeImagePolicy.spec.ts --maxWorkers=1` passed with 7 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3079` lines under the `3125` registered limit; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `git diff --check` passed. `npx gitnexus analyze` completed with `14,821` nodes, `26,536` edges, `785` clusters, and `300` flows; upstream impact for `resolvePortalLeadPreviewStyle` was LOW with no affected execution flows. `detect_changes(scope=all)` reported LOW cumulative scope with `changed_files=18`, `changed_count=6`, and `affected_count=0`.
- Current featured-rail-media-class-policy evidence on `2026-06-08`: upstream impact for `HomePage.vue`, `resolveFeaturedRailCardClasses`, and `resolveFeaturedRailPostPresentation` was LOW before editing with no affected execution flows. SessionStart reported `low-memory` with `4.02 GB` free physical memory, then PreHeavy recovered to `ok` with `6.03 GB` before type-check and HomePage focused tests and `11.49 GB` before GitNexus indexing. `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeImagePolicy.spec.ts --maxWorkers=1` passed with 8 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3080` lines under the `3125` registered limit; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `git diff --check` passed. `npx gitnexus analyze` completed with `14,822` nodes, `26,537` edges, `785` clusters, and `300` flows; upstream impact for `resolveFeaturedRailMediaClasses` was LOW with no affected execution flows. `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=18`, `changed_count=271`, and `affected_count=12`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveFeaturedRailMediaClasses`.
- Current slice limitation: new untracked `homePostPreviewAction.ts`, `homePostPreviewAction.spec.ts`, `homeSceneActivationPolicy.ts`, `homeSceneActivationPolicy.spec.ts`, and `bubbleFramePresentation.ts` are covered by symbol context and impact where available, but they are still not included in GitNexus `detect_changes` `changed_files` until tracking state includes those files.
- Pending verification: full GitNexus change detection accounting for the new untracked helper files remains pending until the files are tracked.
- Resource policy evidence on `2026-06-08`: SessionStart recovered to `low-memory` with about `5.75 GB` free physical memory and later `ok` with about `9.94 GB`, `11.16 GB`, `11.4 GB`, `11.95 GB`, `12.3 GB`, `12.91 GB`, `7.97 GB`, `7.04 GB`, `7.66 GB`, `7.28 GB`, `8.05 GB`, `8.8 GB`, `9.54 GB`, `9.97 GB`, and `10.14 GB` free physical memory; PreHeavy later reported `danger` with about `2.27 GB` free physical memory after focused tests and complexity verification, then recovered to `low-memory` with about `5.73 GB`, `3.99 GB`, `4.36 GB`, and `5.7 GB` free physical memory for serial validation and GitNexus analysis, later reported `danger` with about `0.63 GB` free physical memory after the first seed-state HomePage focused test attempt, reported `danger` with about `2.49 GB` free physical memory after the element-registration focused spec, and recovered to `ok` with about `6.2 GB` and `6.48 GB` free physical memory for the HomePage focused suite and GitNexus analysis.
- Resource policy evidence on `2026-06-08`: a later continuation started with SessionStart `danger` at `2.75 GB` free physical memory and PreHeavy stayed `danger` at `1.88 GB`; code edits, tests, type-check, GitNexus analyze, and other heavy validation were deferred, no unattributed processes were stopped, and only source inspection plus plan updates were performed.
- Resource policy evidence on `2026-06-08`: this continuation started with SessionStart `danger` at `2.83 GB` free physical memory; `codex-clean.ps1 -ExpiredOnly -DryRun` produced no cleanup target output; `codex-ps.ps1` listed registered IsleMind process records outside this repository, so this iteration did not stop them and deferred tests, type-check, GitNexus analyze, GitNexus change detection, builds, browser automation, and package installs.
- Current GitNexus detect evidence after the bubble-element-registration-state slice on `2026-06-08`: `detect_changes(scope=all)` reported CRITICAL cumulative scope with `changed_files=14`, `changed_count=174`, and `affected_count=17`; the affected processes remain HomePage bubble motion frame, pointer-enter, setup trigger, viewport scene blend, and hover normalization flows. This is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveBubbleMotionStepState`, `shouldStartHomeBubbleCanvasScene`, `resolveHomeBubbleCanvasFrameParameters`, `resolveHomeBubbleCanvasOrbCount`, `resolveHomeBubbleCanvasResizeState`, `resolveHomeBubbleCanvasOrbFrameState`, `resolveHomeBubbleCanvasOrbSeedState`, the `HomeBubbleCanvasOrbSeedState` runtime-shape type boundary, the `BubbleForceCenter` runtime-shape type boundary, the `BubblePointerPosition` runtime-shape type boundary, the `resolveBubbleStagePointerState` stage-pointer policy boundary, the `resolveBubbleElementRegistrationState` registration policy boundary, the `BubbleHoverSource` runtime-shape type boundary, the `resolveBubbleHoverSetState` hover-state policy boundary, the `resolveBubbleHoverClearState` hover-state policy boundary, the `resolveBubbleActiveState` active-state policy boundary, the `HomeDataSource` runtime-shape type boundary, the `resolveHomeSupportRefreshRunState` support-refresh policy boundary, the `resolveHomeViewportSceneBlendState` viewport-blend policy boundary, the `resolveBubbleRevealRetreatState` bubble-reveal policy boundary, the `resolveBubbleRevealRestartState` bubble-reveal policy boundary, or the `resolveBubbleRevealResetState` bubble-reveal policy boundary.
- Current GitNexus detect evidence after the bubble-pointer-over-state slice on `2026-06-08`: `detect_changes(scope=all)` reported CRITICAL cumulative scope with `changed_files=14`, `changed_count=177`, and `affected_count=16`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveBubblePointerOverState`, whose upstream impact remained LOW and whose direct callers are limited to the HomePage bubble pointer handlers.
- Current GitNexus detect evidence after the bubble-stage-pointer-presence-state slice on `2026-06-08`: `detect_changes(scope=all)` reported CRITICAL cumulative scope with `changed_files=14`, `changed_count=182`, and `affected_count=16`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveBubbleStagePointerPresenceState` or `applyBubbleStagePointerPresence`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the bubble-interaction-state slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=14`, `changed_count=187`, and `affected_count=8`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveBubbleInteractionState`, whose upstream impact remained LOW, or for page-local `applyBubbleInteraction`, whose upstream impact was MEDIUM with no affected execution flows.
- Current GitNexus detect evidence after the active-hover-anchor-resolver slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=14`, `changed_count=189`, and `affected_count=8`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveActiveBubbleHoverAnchor`, whose upstream impact remained LOW with affected process scope limited to `runBubbleMotionFrame`.
- Current GitNexus detect evidence after the runtime-active-state-resolver slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=14`, `changed_count=192`, and `affected_count=8`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveBubbleRuntimeActiveState`, whose upstream impact remained LOW with affected process scope limited to `runBubbleMotionFrame`.
- Current GitNexus detect evidence after the frame-presentation-state slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=14`, `changed_count=194`, and `affected_count=8`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveBubbleFramePresentationState` or `writeBubbleFrameState`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the home-media-failure-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=14`, `changed_count=201`, and `affected_count=8`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `isHomeMediaFailureRecorded`, `resolveHomeMediaFailureMarkState`, `isHomeMediaFailed`, or `markHomeMediaFailed`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the home-fallback-post-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=203`, and `affected_count=6`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `isHomeFallbackPost`, `openPostPreview`, or `openDetailFromPreview`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the home-bubble-selection-state slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=209`, and `affected_count=6`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveHomeSelectedBubbleId`, `hasHomeActiveBubble`, `selectedBubbleId`, or `hasActiveBubble`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the home-active-rail-index slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=214`, and `affected_count=6`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveHomeActiveRailIndex` or `activeRailIndex`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the home-active-rail-slide slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=217`, and `affected_count=6`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveHomeActiveRailSlide` or `activeRailSlide`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the bubble-interactive-tier-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=221`, and `affected_count=6`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `isHomeBubbleInteractiveTier` or `isBubbleInteractiveTier`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the home-preview-controller-mount-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=224`, and `affected_count=6`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `shouldMountHomePreviewController` or `shouldMountHomepagePreviewController`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the home-animation-consent-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=227`, and `affected_count=6`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `shouldUseHomeAnimations` or `shouldAnimate`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the home-no-glass-backdrop-style slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=229`, and `affected_count=6`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `HOME_NO_GLASS_BACKDROP_STYLE` or `noGlassBackdropStyle`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the home-empty-aggregate-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=230`, and `affected_count=6`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `createEmptyHomeAggregate`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the home-public-prewarm-limits-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=234`, and `affected_count=6`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveHomePublicPrewarmLimits`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the story-card-presentation-style slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=236`, and `affected_count=6`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `buildHomeStoryCardStyle`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the home-enhancement-schedule-decision slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=238`, and `affected_count=10`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveHomeEnhancementScheduleDecision` or `scheduleHomeEnhancements`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the measured-scene-geometry slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=244`, and `affected_count=11`. Indexed upstream impact for `resolveHomeMeasuredSceneGeometry` and `resolveSceneProgress` reported HIGH because the helper sits inside the scene progress chain used by `scheduleHomeEnhancements`, `setupSceneTriggers`, and `updateViewportSceneBlend`; `context` showed direct callers limited to `resolveSceneTravelDistance` and `resolveSceneProgress`, so this is recorded as scene-progress-chain risk and must not be expanded without a narrower follow-up plan.
- Current GitNexus detect evidence after the quick-nav-active-section-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=249`, and `affected_count=11`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveHomeActiveSectionId` or `observeHomeSections`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the home-post-preview-action slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=251`, and `affected_count=11`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveHomePostPreviewAction` or `openPostPreview`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the home-post-detail-action slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=253`, and `affected_count=11`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveHomePostDetailAction` or `openDetailFromPreview`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the bubble-active-presentation-state slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=253`, and `affected_count=11`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveBubbleActivePresentationState`, `bubbleStateClasses`, or `isBubblePersistentSelected`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the bubble-active-presentation-read-wrapper slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=254`, and `affected_count=11`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveBubbleActivePresentation`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the home-rail-slide-order-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=16`, `changed_count=257`, and `affected_count=11`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `buildHomeRailSlides`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the featured-rail-presentation-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=18`, `changed_count=264`, and `affected_count=12`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveFeaturedRailCardClasses` or `resolveFeaturedRailPostPresentation`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the hero-card-presentation-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=18`, `changed_count=267`, and `affected_count=12`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveHeroCollageCardClasses` or `resolveHeroSpotlightCardClasses`, whose upstream impact remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the portal-lead-preview-style-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported LOW cumulative scope with `changed_files=18`, `changed_count=6`, and `affected_count=0`; upstream impact for `resolvePortalLeadPreviewStyle` remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the featured-rail-media-class-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=18`, `changed_count=271`, and `affected_count=12`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveFeaturedRailMediaClasses`, whose upstream impact remained LOW with no affected execution flows.
- Current schedule-highlight-list-class-policy evidence on `2026-06-08`: pre-edit upstream impact for `HomePage.vue` and `resolveHomeSupportRefreshTargets` was LOW with no affected execution flows; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeSupportPolicy.spec.ts --maxWorkers=1` passed with 7 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3079` lines under the `3125` registered limit; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `git diff --check` passed; `npx gitnexus analyze` completed in incremental mode with `14,823` nodes, `26,538` edges, `785` clusters, and `300` flows; upstream impact for `resolveScheduleHighlightListClasses` was LOW with no affected execution flows.
- Current GitNexus detect evidence after the schedule-highlight-list-class-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=18`, `changed_count=272`, and `affected_count=12`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveScheduleHighlightListClasses`, whose upstream impact remained LOW with no affected execution flows.
- Current posts-toolbar-stats-class-policy evidence on `2026-06-08`: pre-edit upstream impact for `HomePage.vue` and `homeSupportPolicy.ts` was LOW with no affected execution flows; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeSupportPolicy.spec.ts --maxWorkers=1` passed with 8 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3080` lines under the `3125` registered limit; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,824` nodes, `26,539` edges, `785` clusters, and `300` flows; upstream impact for `resolvePostsToolbarStatsClasses` was LOW with no affected execution flows.
- Current GitNexus detect evidence after the posts-toolbar-stats-class-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=18`, `changed_count=273`, and `affected_count=12`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolvePostsToolbarStatsClasses`, whose upstream impact remained LOW with no affected execution flows.
- Current hero-editorial-loaded-class-policy evidence on `2026-06-08`: pre-edit upstream impact for `HomePage.vue` and `homeImagePolicy.ts` was LOW with no affected execution flows; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeImagePolicy.spec.ts --maxWorkers=1` passed with 8 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3081` lines under the `3125` registered limit; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,825` nodes, `26,540` edges, `785` clusters, and `300` flows; upstream impact for `resolveHeroEditorialClasses` was LOW with no affected execution flows.
- Current GitNexus detect evidence after the hero-editorial-loaded-class-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=18`, `changed_count=274`, and `affected_count=12`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveHeroEditorialClasses`, whose upstream impact remained LOW with no affected execution flows.
- Current trends-editorial-compact-class-policy evidence on `2026-06-08`: pre-edit upstream impact for `HomePage.vue` and `homeImagePolicy.ts` was LOW with no affected execution flows; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeImagePolicy.spec.ts --maxWorkers=1` passed with 8 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3082` lines under the `3125` registered limit; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,826` nodes, `26,541` edges, `785` clusters, and `300` flows; upstream impact for `resolveTrendsEditorialClasses` was LOW with no affected execution flows.
- Current GitNexus detect evidence after the trends-editorial-compact-class-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=18`, `changed_count=275`, and `affected_count=12`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveTrendsEditorialClasses`, whose upstream impact remained LOW with no affected execution flows.
- Current media-slice-active-class-policy evidence on `2026-06-08`: pre-edit upstream impact for `HomePage.vue` and `homeScenePolicy.ts` was LOW with no affected execution flows; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts --maxWorkers=1` passed with 31 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3083` lines under the `3125` registered limit; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,827` nodes, `26,542` edges, `785` clusters, and `300` flows; upstream impact for `resolveHomeMediaSliceClasses` was LOW with no affected execution flows.
- Current GitNexus detect evidence after the media-slice-active-class-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=18`, `changed_count=276`, and `affected_count=12`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveHomeMediaSliceClasses`, whose upstream impact remained LOW with no affected execution flows.
- Current schedule-highlight-companion-class-policy evidence on `2026-06-08`: pre-edit upstream impact for `HomePage.vue` and `homeSupportPolicy.ts` was LOW with no affected execution flows; SessionStart and PreHeavy reported `low-memory` with `4.99 GB`, `4.95 GB`, and `5.43 GB` free physical memory, so validation stayed serial with no watcher or dev-server startup; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeSupportPolicy.spec.ts --maxWorkers=1` passed with 9 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3084` lines under the `3125` registered limit; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,828` nodes, `26,543` edges, `785` clusters, and `300` flows; upstream impact for `resolveScheduleHighlightCompanionClasses` was LOW with no affected execution flows.
- Current GitNexus detect evidence after the schedule-highlight-companion-class-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=18`, `changed_count=277`, and `affected_count=12`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveScheduleHighlightCompanionClasses`, whose upstream impact remained LOW with no affected execution flows.
- Current portal-card-icon-class-policy evidence on `2026-06-08`: pre-edit upstream impact for `HomePage.vue` was LOW with no affected execution flows, and pre-edit upstream impact for `homeImagePolicy.ts` was LOW with direct importer `HomePage.vue` and no affected execution flows; SessionStart reported `ok` with `6.8 GB` free physical memory, PreHeavy reported `ok` with `6.97 GB`, then `low-memory` with `5.36 GB` before GitNexus indexing, so validation stayed serial with no watcher or dev-server startup; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeImagePolicy.spec.ts --maxWorkers=1` passed with 9 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3085` lines under the `3125` registered limit; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,829` nodes, `26,544` edges, `785` clusters, and `300` flows; upstream impact for `resolvePortalCardIconClasses` was LOW with no affected execution flows.
- Current GitNexus detect evidence after the portal-card-icon-class-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported LOW cumulative scope with `changed_files=18`, `changed_count=6`, and `affected_count=0`; upstream impact for `resolvePortalCardIconClasses` remained LOW with no affected execution flows.
- Current bubble-stage-class-policy evidence on `2026-06-08`: pre-edit upstream impact for `HomePage.vue` was LOW with no affected execution flows, and pre-edit upstream impact for `bubbleFramePresentation.ts` was LOW with direct importer `HomePage.vue` and no affected execution flows; SessionStart reported `ok` with `9.4 GB` free physical memory, and PreHeavy reported `ok` with `7.55 GB` and `8.17 GB` before serial validation and GitNexus indexing; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleMotion.spec.ts --maxWorkers=1` passed with 44 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3086` lines under the `3125` registered limit; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,830` nodes, `26,546` edges, `785` clusters, and `300` flows; upstream impact for `resolveBubbleStageClasses` was LOW with no affected execution flows.
- Current GitNexus detect evidence after the bubble-stage-class-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=18`, `changed_count=278`, and `affected_count=12`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveBubbleStageClasses`, whose upstream impact remained LOW with no affected execution flows.
- Current bubble-stage-metrics-policy evidence on `2026-06-08`: pre-edit upstream impact for `HomePage.vue`, `bubbleMotion.ts`, and `resolveBubbleStagePointerState` was LOW with no affected execution flows; SessionStart reported `ok` with `10.09 GB` free physical memory, and PreHeavy reported `ok` with `8.38 GB` and `8.66 GB` before serial validation and GitNexus indexing; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleMotion.spec.ts --maxWorkers=1` passed with 45 tests; the first `node scripts/check-complexity-budget.mjs` failed because `bubbleMotion.ts` reached `1001` lines as an unregistered large file, then the helper input type was tightened and the final complexity budget passed with `src/views/HomePage.vue` at `3100` lines under the `3125` registered limit and no new unregistered large file; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,841` nodes, `26,560` edges, `790` clusters, and `300` flows; upstream impact for `resolveBubbleStageMetrics` was LOW with direct callers `resolveBubbleStagePointerState` and `measureBubbleMotionAnchors` and no affected execution flows; upstream impact for `measureBubbleMotionAnchors` remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the bubble-stage-metrics-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported LOW cumulative scope with `changed_files=18`, `changed_count=6`, and `affected_count=0`; upstream impact for `resolveBubbleStageMetrics`, `resolveBubbleStagePointerState`, and `measureBubbleMotionAnchors` remained LOW with no affected execution flows.
- Current bubble-frame-delta-policy evidence on `2026-06-08`: pre-edit upstream impact for `renderBubbleCanvasFrame`, `runBubbleMotionFrame`, and `bubbleMotion.ts` was LOW with no affected execution flows; SessionStart reported `ok` with `10.04 GB` free physical memory, PreHeavy reported `ok` with `9.2 GB`, then `low-memory` with `5.33 GB` before serial type-check and HomePage tests and `4.02 GB` before GitNexus indexing; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleMotion.spec.ts --maxWorkers=1` passed with 48 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3099` lines under the `3125` registered limit and `bubbleMotion.ts` held at `998` lines; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,843` nodes, `26,566` edges, `790` clusters, and `300` flows; upstream impact for `resolveBubbleFrameDeltaMs` was LOW with direct callers `renderBubbleCanvasFrame` and `runBubbleMotionFrame`, and follow-up upstream impact for both page frame functions remained LOW with no upstream dependents.
- Current GitNexus detect evidence after the bubble-frame-delta-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported CRITICAL cumulative scope with `changed_files=18`, `changed_count=291`, and `affected_count=18`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveBubbleFrameDeltaMs`, `renderBubbleCanvasFrame`, or `runBubbleMotionFrame`, whose upstream impact remained LOW.
- Current retained-orb-resize-policy evidence on `2026-06-08`: pre-edit upstream impact for `resizeBubbleCanvasScene` and `homeScenePolicy.ts` was LOW, with only one affected render-canvas process for the page resize function and no affected execution flows for the policy file; SessionStart reported `ok` with `9.53 GB` free physical memory, PreHeavy reported `ok` with `9.3 GB`, `9.1 GB`, and `8.17 GB` before serial validation and GitNexus indexing; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts --maxWorkers=1` passed with 33 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3105` lines under the `3125` registered limit; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,844` nodes, `26,569` edges, `790` clusters, and `300` flows; upstream impact for `resolveHomeBubbleCanvasRetainedOrbState` was LOW with direct caller `resizeBubbleCanvasScene`, and follow-up upstream impact for `resizeBubbleCanvasScene` remained LOW.
- Current GitNexus detect evidence after the retained-orb-resize-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported CRITICAL cumulative scope with `changed_files=18`, `changed_count=292`, and `affected_count=18`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveHomeBubbleCanvasRetainedOrbState` or `resizeBubbleCanvasScene`, whose upstream impact remained LOW.
- Current hero-spotlight-label-policy evidence on `2026-06-08`: pre-edit upstream impact for `HomePage.vue` and `homeImagePolicy.ts` was LOW with no affected execution flows; SessionStart reported `low-memory` with `5.62 GB` free physical memory, PreHeavy reported `low-memory` with `4.29 GB` before editing and `ok` with `8.29 GB` and `9.75 GB` before serial validation and GitNexus indexing; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeImagePolicy.spec.ts --maxWorkers=1` passed with 10 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3106` lines under the `3125` registered limit; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,845` nodes, `26,570` edges, `790` clusters, and `300` flows; upstream impact for `resolveHeroSpotlightLabel` was LOW with no upstream dependents, and follow-up upstream impact for `HomePage.vue` remained LOW.
- Current GitNexus detect evidence after the hero-spotlight-label-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported CRITICAL cumulative scope with `changed_files=18`, `changed_count=293`, and `affected_count=18`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveHeroSpotlightLabel` or `HomePage.vue`, whose upstream impact remained LOW.
- Current home-media-render-eligibility evidence on `2026-06-08`: `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeSupportPolicy.spec.ts --maxWorkers=1` passed with 10 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3111` lines under the `3125` registered limit; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,843` nodes, `26,575` edges, `786` clusters, and `300` flows; upstream impact for `shouldRenderHomeMediaSource` was LOW with direct caller `shouldRenderHomeMedia` and no affected execution flows, and follow-up upstream impact for `shouldRenderHomeMedia` remained LOW with no affected execution flows.
- Current GitNexus detect evidence after the home-media-render-eligibility slice on `2026-06-08`: `detect_changes(scope=all)` reported CRITICAL cumulative scope with `changed_files=18`, `changed_count=295`, and `affected_count=18`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `shouldRenderHomeMediaSource` or `shouldRenderHomeMedia`, whose upstream impact remained LOW.
- Current image-srcset-attribute-policy evidence on `2026-06-08`: pre-edit upstream impact for `HomePage.vue`, `homeImagePolicy.ts`, and `resolveHomeImageSrcset` was LOW with no affected execution flows; SessionStart reported `ok` with `10.17 GB` free physical memory, then PreHeavy reported `low-memory` with `5.53 GB` before serial validation and `4.11 GB` before GitNexus indexing; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeImagePolicy.spec.ts --maxWorkers=1` passed with 11 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3111` lines under the `3125` registered limit; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,849` nodes, `26,578` edges, `791` clusters, and `300` flows; upstream impact for `resolveHomeImageSrcsetAttribute` was LOW with no affected execution flows, and follow-up upstream impact for `HomePage.vue` remained LOW.
- Current GitNexus detect evidence after the image-srcset-attribute-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported CRITICAL cumulative scope with `changed_files=18`, `changed_count=296`, and `affected_count=18`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveHomeImageSrcsetAttribute` or `HomePage.vue`, whose upstream impact remained LOW.
- Current image-source-attribute-policy evidence on `2026-06-08`: pre-edit upstream impact for `HomePage.vue` and `homeImagePolicy.ts` was LOW with no affected execution flows; SessionStart reported `ok` with `9.65 GB` free physical memory, then PreHeavy reported `ok` with `7.16 GB` before serial validation and `low-memory` with `4.12 GB` before GitNexus indexing; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeImagePolicy.spec.ts --maxWorkers=1` passed with 12 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3112` lines under the `3125` registered limit; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,850` nodes, `26,579` edges, `791` clusters, and `300` flows; upstream impact for `resolveHomeImageSourceAttribute` was LOW with no affected execution flows, and follow-up upstream impact for `HomePage.vue` returned LOW with `partial=true` and no affected execution flows.
- Current GitNexus detect evidence after the image-source-attribute-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported CRITICAL cumulative scope with `changed_files=18`, `changed_count=297`, and `affected_count=18`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveHomeImageSourceAttribute` or `HomePage.vue`, whose upstream impact remained LOW.
- Current schedule-highlight-fallback-policy evidence on `2026-06-08`: pre-edit upstream impact for `HomePage.vue` and `homeSupportPolicy.ts` was LOW with no affected execution flows; SessionStart reported `ok` with `6.83 GB` free physical memory, PreHeavy reported `ok` with `10.51 GB` before serial validation and `low-memory` with `5.05 GB` before GitNexus indexing; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeSupportPolicy.spec.ts --maxWorkers=1` passed with 11 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3118` lines under the `3125` registered limit after removing an unnecessary local wrapper; `git diff --check` passed; `bun run type-check` passed; the first HomePage focused rerun exposed missing category-label translation injection, then `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,853` nodes, `26,584` edges, `791` clusters, and `300` flows; upstream impact for `resolveScheduleHighlightRoute`, `resolveScheduleHighlightLabel`, `resolveScheduleHighlightMetaText`, and `HomePage.vue` was LOW with no affected execution flows.
- Current GitNexus detect evidence after the schedule-highlight-fallback-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported CRITICAL cumulative scope with `changed_files=18`, `changed_count=300`, and `affected_count=18`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for the schedule-highlight fallback helpers or `HomePage.vue`, whose upstream impact remained LOW.
- Current featured-rail-card-raw-class-policy evidence on `2026-06-08`: pre-edit upstream impact for `HomePage.vue`, `homeImagePolicy.ts`, and `resolveFeaturedRailCardClasses` was LOW with no affected execution flows; SessionStart reported `ok` with `7.19 GB` free physical memory and PreHeavy reported `low-memory` with `3.89 GB` before serial validation and `4.27 GB` before GitNexus indexing; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeImagePolicy.spec.ts --maxWorkers=1` passed with 13 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3112` lines under the `3125` registered limit, reducing the page from the previous `3118` line state; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,855` nodes, `26,587` edges, `791` clusters, and `300` flows; exact GitNexus lookup for `resolveFeaturedRailCardPresentationClasses` returned not found after indexing, but upstream impact for `homeImagePolicy.ts` was LOW with direct importer `HomePage.vue`, and upstream impact for `HomePage.vue` was LOW with no affected execution flows.
- Current GitNexus detect evidence after the featured-rail-card-raw-class-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported LOW cumulative scope with `changed_files=18`, `changed_count=163`, and `affected_count=0`; this supersedes the previous cumulative CRITICAL reading for the current indexed state and shows no affected execution flows.
- Current image-presentation-attribute-policy evidence on `2026-06-08`: pre-edit exact GitNexus lookup for the existing image-size helpers returned not found, but pre-edit file-level upstream impact for `HomePage.vue` and `homeImagePolicy.ts` was LOW with no affected execution flows; PreHeavy reported `low-memory` with `3.95 GB` free physical memory before serial validation, then `ok` with `6.97 GB` and `10.62 GB` before GitNexus indexing; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeImagePolicy.spec.ts --maxWorkers=1` passed with 15 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3111` lines under the `3125` registered limit after unused page-local residual and pre-push blank-line cleanup, keeping the page below the previous `3112` line state; `git diff --check` passed before the evidence update; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze "<frontend-main-repo>" --index-only` completed after forcing a full rebuild from an incomplete incremental state with `14,853` nodes, `26,607` edges, `787` clusters, and `300` flows; upstream impact for `resolveHeroCollageImagePresentation`, `resolveFeaturedRailImagePresentation`, and `HomePage.vue` was LOW with no affected execution flows.
- Current GitNexus detect evidence after the image-presentation-attribute-policy slice on `2026-06-08`: `npx gitnexus detect-changes --scope all --repo "<frontend-main-repo>"` reported CRITICAL cumulative scope with `changed_files=23`, `changed_count=325`, and `affected_count=19`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for the image presentation helpers or `HomePage.vue`, whose upstream impact remained LOW with no affected execution flows.
- Current story-progress-counter-format-policy evidence on `2026-06-08`: pre-edit upstream impact for `HomePage.vue` was LOW with no affected execution flows, and pre-edit upstream impact for `homeScenePolicy.ts` was LOW with direct importer `HomePage.vue` and no affected execution flows; SessionStart reported `ok` with `7.38 GB` free physical memory, PreHeavy reported `low-memory` with `3.36 GB` before serial type-check and HomePage tests, then recovered to `ok` with `8.56 GB` before GitNexus indexing; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts --maxWorkers=1` passed with 32 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3087` lines under the `3125` registered limit; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,832` nodes, `26,548` edges, `785` clusters, and `300` flows; upstream impact for `formatHomeStoryProgressNumber` was LOW with no affected execution flows.
- Current GitNexus detect evidence after the story-progress-counter-format-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported HIGH cumulative scope with `changed_files=18`, `changed_count=280`, and `affected_count=12`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `formatHomeStoryProgressNumber`, whose upstream impact remained LOW with no affected execution flows.
- Current home-total-count-policy evidence on `2026-06-08`: pre-edit upstream impact for `HomePage.vue` was LOW with no affected execution flows, and pre-edit upstream impact for `homeSupportPolicy.ts` was LOW with direct importers `HomePage.vue` and `useHomeViewModel.ts` and no affected execution flows; SessionStart reported `ok` with `7.42 GB` free physical memory, PreHeavy reported `ok` with `7.73 GB` before serial validation, then `low-memory` with `3.94 GB` before GitNexus indexing; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeSupportPolicy.spec.ts --maxWorkers=1` passed with 10 tests; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3099` lines under the `3125` registered limit; `git diff --check` passed; `bun run type-check` passed; `node scripts/run-vitest.mjs run src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 17 tests and only the existing vue-i18n experimental compiler warning; `npx gitnexus analyze` completed in incremental mode with `14,834` nodes, `26,555` edges, `785` clusters, and `300` flows; upstream impact for `resolveHomeTotalCount` was LOW with direct caller `HomePage.vue` and no affected execution flows; follow-up upstream impact for touched `fetchHomeData` was LOW with no affected execution flows.
- Current GitNexus detect evidence after the home-total-count-policy slice on `2026-06-08`: `detect_changes(scope=all)` reported CRITICAL cumulative scope with `changed_files=18`, `changed_count=233`, and `affected_count=17`; this is accepted as cumulative hotspot-slice scope, not as a new direct-impact finding for `resolveHomeTotalCount` or `fetchHomeData`, whose upstream impact remained LOW with no affected execution flows.
- Current home-quick-nav-observer evidence on `2026-06-17`: exact GitNexus lookup for `scrollToHomeSection`, `observeHomeSections`, and `updateHomeQuickNavSide` returned not found before editing, so the slice was constrained to page-local quick-nav template bindings; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/useHomeQuickNav.spec.ts --maxWorkers=1` passed with 4 tests; `node scripts/run-vitest.mjs run src/views/homepage/__tests__/useHomeQuickNav.spec.ts src/views/__tests__/HomePage.spec.ts src/views/__tests__/HomePageStoryStageStyles.spec.ts --maxWorkers=1 --testTimeout=30000` passed with 21 tests and only the existing vue-i18n experimental compiler warning; `bun run type-check`, `git diff --check`, and Prettier checks passed for touched files; `node scripts/check-complexity-budget.mjs` passed with `src/views/HomePage.vue` at `3058` lines under the tightened `3058` registered limit; quick-nav side persistence, section observer selection, smooth-scroll immediate mode, and observer replacement cleanup are covered without requiring the full HomePage component.
- Resume validation queue: rerun GitNexus change detection after tracking state includes the new helper files, because untracked `homePostPreviewAction.ts`, `homePostPreviewAction.spec.ts`, `homeSceneActivationPolicy.ts`, `homeSceneActivationPolicy.spec.ts`, and `bubbleFramePresentation.ts` are still not counted in `detect_changes` `changed_files`.
- Resume candidate queue: after a fresh PreHeavy result below `danger`, re-check GitNexus impact before editing and prefer remaining page-local wrappers only when the exact symbol reports LOW before edits and no indexed helper would become a shared scene-progress-chain entry; leave `window`, DOM measurement, `querySelector`, ScrollTrigger, GSAP, RAF scheduling, frame-state storage, router pushes, and template side effects in `HomePage.vue`.
- Next slice: continue extracting the next remaining LOW-impact inline scene or motion decision from `HomePage.vue` without moving GSAP, DOM measurement, canvas rendering, RAF scheduling, frame-state storage, or DOM writes; do not edit `applyBubbleRevealAction`, capability wrappers, or the measured scene geometry chain unless HIGH upstream impact is explicitly accepted or narrowed.

Entry 4:

- Target: route, API, cache, service worker, and release contracts.
- Boundary: authenticated data, sensitive route metadata, BFF recovery, client security retry, and private cache exclusion remain release-blocking behavior.
- Slice: add or repair one contract test group per subsystem before replacing implementation internals.
- Verification: run the relevant focused contract tests and the unified release gate only when memory policy allows.
- Exit: each subsystem has an observable failure mode covered by tests before migration work proceeds.

Entry 5:

- Target: component domain import boundaries.
- Boundary: consumers must migrate through tested public barrels instead of unreviewed deep imports.
- Slice: add export contracts for one domain, then migrate one low-risk consumer batch.
- Verification: run barrel export tests and focused consumer tests.
- Exit: the domain has a public import surface and no new deep imports are introduced in migrated consumers.

## Architecture

The application is a Cloudflare Pages hosted Vue SPA with a Pages Functions BFF. The frontend must keep browser sessions cookie-backed, keep access token material out of persistent browser storage, and route all production API traffic through the same-origin `/api` facade.

Core ownership boundaries:

- `src/views`: route-level orchestration and page composition.
- `src/components`: reusable UI, layout, domain presentation, and interaction components.
- `src/api`: endpoint-specific service contracts and the shared request client.
- `src/stores`: Pinia state, local UI state, and session-derived runtime state.
- `src/router`: route definitions, route metadata, authentication gates, and sensitivity gates.
- `src/sw`: offline, cache, and update runtime policy.
- `functions` and `src/edge`: Cloudflare Pages middleware, API facade, prerender metadata, and upstream routing.
- `scripts`: release validation, health checks, build wrappers, and audit tooling.

## Architecture Mobility Target

Target:

- The frontend must stay replaceable at the implementation layer while preserving product behavior and release safety.
- Tests must protect observable contracts, not incidental implementation shape.
- Repairs must reduce coupling, extract boundaries, or record the remaining lock-in when a tactical fix is unavoidable.

Execution Policy:

- Contract test scope includes route outcomes, API payload normalization, cache classification, auth/session invariants, readiness selectors, accessibility behavior, and observable component states.
- Contract tests must not assert private function boundaries, current SFC structure, deep import paths, styling internals, or exact DOM nesting unless those are declared as public contracts.
- New tests around a large route file must prefer extracted model, policy, adapter, or facade modules over mounting the route to preserve internal structure.
- Bug fixes in hotspot files must include one of these outcomes: extracted pure logic, narrowed adapter boundary, deleted duplicated path, or a residual lock-in note in the slice log.
- Barrel exports, service facades, route policy modules, API client submodules, and cache policy modules are migration boundaries. Consumer migration must happen in focused batches after the boundary is tested.

Risk Control:

- A slice that only hardens the current implementation must state why no boundary extraction is included.
- A slice that adds tests for existing behavior must classify each assertion as product contract, security invariant, data contract, accessibility contract, or temporary implementation guard.
- Temporary implementation guards must include the replacement condition that allows the test to be deleted or rewritten.
- High-risk areas must prefer compatibility adapters and contract tests before implementation replacement.

Acceptance Criteria:

- Release validation protects route, API, auth, cache, and security behavior without requiring current page/component topology to remain permanent.
- Optimization logs classify work as `contract protection`, `architecture mobility`, `implementation hardening`, or `temporary guard`.
- `implementation hardening` entries must include a migration note when the protected implementation is not intended as the final boundary.
- Future architecture replacement remains valid when large page internals, component topology, state internals, or API implementation details change while the documented contracts stay green.

## Frontend Analysis Baseline

### 1. Project Overview

The frontend is a Vue SPA deployed on Cloudflare Pages with Pages Functions and edge modules providing the same-origin API facade, prerender helpers, and runtime routing policy.

Runtime ownership:

- Public content flows include home, explore, search, post detail, author detail, schedule, community, and static information pages.
- Authenticated flows include profile, notifications, favorites, comments, likes, history, reports, relations, blocked accounts, settings, and public profile access.
- Sensitive flows include profile security, profile settings, device management redirects, security activity redirects, MFA, passkey, password, email, and verification interactions.
- Cross-cutting runtime behavior includes BFF cookie session restore, client security credentials, challenge and verification retries, service worker caching, update coordination, prefetch, analytics consent, and runtime integrity protection.

The current optimization boundary is incremental. Feature delivery must preserve existing route contracts, session behavior, BFF transport behavior, and release validation gates.

### 2. Technology Stack Analysis

Core runtime stack:

- Package manager: Bun `1.3.11`, with a checked-in `bun.lock`.
- Node runtime policy: `>=24.11.1 <25`.
- Framework: Vue `3.6.0-beta.12` with `@vitejs/plugin-vue`, Vue JSX, and `vaporInteropPlugin`.
- Router and state: Vue Router `5.0.7`, Pinia `3.0.4`, and `pinia-plugin-persistedstate`.
- Localization: `vue-i18n` `12.0.0-alpha.4`.
- Build: Vite `8.0.14`, custom Vite plugins, Cloudflare Pages and Workers types.
- Test and browser tooling: Vitest `5.0.0-beta.3`, Vue Test Utils, jsdom, Playwright alpha, Lighthouse, Puppeteer, Selenium.
- Security and UX dependencies: DOMPurify, FingerprintJS, GSAP, Lenis, and Lucide Vue icons.

Stack controls:

- Beta or alpha framework upgrades must remain isolated from business feature changes.
- Dependency changes must include lockfile changes and selected release validation evidence.
- Runtime business dependency upgrades must not be coupled with audit, browser, or release-runner changes unless the slice declares that migration boundary.

### 3. Directory Structure Analysis

Current `src` distribution:

- `src/components`: `193` files, component domains and tests.
- `src/views`: `90` files, route-level pages, page models, and view tests.
- `src/utils`: `78` files, shared runtime helpers, cache helpers, security helpers, and test coverage.
- `src/api`: `62` files, service contracts, client transport modules, and API tests.
- `src/styles`: `51` files, design tokens, page systems, presets, and layered CSS.
- `src/composables`: `32` files, reusable view and interaction logic.
- `src/router`: `7` files, route definitions, route policy, sensitive reauth, and tests.
- `src/stores`: `16` files, Pinia stores and store tests.
- `src/sw`: `10` files, service worker runtime and tests.
- `src/edge`: `16` files, Pages edge behavior and tests.

Largest current route files:

- `src/views/HomePage.vue`: `107.0 KB`.
- `src/views/PostDetailPage.vue`: `68.7 KB`.
- `src/views/SchedulePage.vue`: `49.4 KB`.
- `src/views/RegisterPage.vue`: `44.7 KB`.
- `src/views/LoginPage.vue`: `39.8 KB`.
- `src/views/ProfileSettingsPage.vue`: `32.6 KB`.
- `src/views/CommunityPage.vue`: `30.5 KB`.

Structure risk:

- Route files above `50 KB` must gain extraction work before unrelated feature expansion.
- View-owned pure logic must remain colocated under the view folder before promotion to `src/utils`.
- Component domains must expose public barrels only after export contracts are tested.

### 4. Core Capability Modules Analysis

Core modules:

- Public content: home, posts, authors, explore, search, schedule, community, public snapshots, and prerender metadata.
- Auth and account: login, register, Google handoff, passwordless login, risk verification, MFA, passkeys, email verification, password reset, and BFF session recovery.
- Profile workspace: profile overview, notifications, favorites, comments, likes, comment favorites, history, reports, relations, blocked users, settings, and security.
- Community interaction: discussions, comments, referenced post previews, composer flows, reports, feedback, and contact.
- Media and presentation: optimized images, media lightbox, video player, thumbnails, avatar handling, upload and crop flows.
- Appearance and layout: presets, page shell primitives, settings panel, navbar, side nav, footer, responsive page systems, and locale density.
- Offline and update runtime: service worker fetch handling, public content cache, offline queue, background sync, update checker, and smart prefetch.

Capability controls:

- Public content optimization uses cacheability and prefetch where route sensitivity permits it.
- Private and sensitive flows must prefer BFF session freshness, runtime authorization cache, explicit route metadata, and no persistent access token material.
- Edge and service worker policies must use allowlists or denylists with tests.

### 5. Component Design Analysis

Component distribution by domain:

- `ui`: `45` Vue components, `17` tests.
- `profile`: `15` Vue components, `15` tests.
- `business`: `6` Vue components, `6` tests.
- `layout`: `4` Vue components, `6` tests.
- `appearance`: `7` Vue components, `4` tests.
- `auth`: `7` Vue components, `2` tests.
- `community`: `5` Vue components, `4` tests.
- `comment`: `6` Vue components, `3` tests.
- `home`: `6` Vue components, `2` tests.

Design state:

- Base UI components are mostly context-neutral and reusable.
- Domain components have stronger coverage in `profile` and `business`; `auth`, `home`, and `comment` still have lower component-test density.
- Appearance primitives now expose a tested barrel boundary under `src/components/appearance`.
- Large route files still contain page orchestration, animation state, fetch coordination, and presentation glue in the same SFC in several areas.

Component controls:

- Page components must orchestrate route state and compose components.
- Pure formatting, presentation policy, and interaction models must move into colocated modules when route files grow.
- New component barrels must include export tests before consumer migration.

### 6. Route And Permission Analysis

Route policy:

- Router meta supports `requiresAuth`, `guestOnly`, `securityLevel`, `dataSensitivity`, `appUpdateMode`, `showFooter`, `viewKey`, `preserveScrollOnIntraViewNav`, and `extendContentUnderNavbar`.
- Public routes use `securityLevel: 'public'` and `dataSensitivity: 'none'`.
- Profile and user routes use authenticated or sensitive metadata.
- Sensitive routes require fresh authorization through `ensureFreshAuthz('sensitive')`.
- Guest-only routes load auth state without initializing full session refresh and redirect authenticated users away unless sensitive reauth applies.
- Contract-resource routes reject invalid IDs before rendering.

Route controls:

- Every route must keep explicit security and data sensitivity metadata or inherit it from an explicitly protected parent.
- Sensitive route additions must include route meta tests and route guard tests.
- Detail routes must use contract resource ID validation unless explicitly exempted.

### 7. Data Request And State Management

Request model:

- `src/api/client.ts` is the transport entrypoint and owns timeout handling, BFF cookie credentials, request security headers, multipart serialization, inflight GET deduplication, 401 retry policy, client re-init, challenge handling, verification retry, contract mismatch hard reload, permission-version stale logout, and transport error mapping.
- Endpoint service files own URL construction and response normalization.
- Client security, challenge, verification, multipart, request-security, transport, and error mapping logic are split under `src/api/client`.

State model:

- Auth store keeps account state, loading/error state, runtime authorization cache, session expiry, and step-up state.
- Access token material must not persist in browser storage.
- Session recovery resolves through BFF session summary and refresh-cookie behavior.
- Pinia persisted state is used for settings, theme, schedule, and non-sensitive preferences.
- Privacy settings drive analytics and performance monitoring initialization.

State controls:

- Stores must not re-normalize API payloads already normalized by service modules.
- Auth changes must prove runtime token absence and authorization summary recovery.
- Private BFF-backed data must not be cached by the service worker by default.

### 8. Performance Optimization Analysis

Current performance controls:

- Route components load through dynamic imports.
- Global decorative layers, challenge dialogs, verification dialogs, toast container, media-heavy components, settings panel, image cropper, comment lists, and desk pet use async component boundaries where appropriate.
- `App.vue` uses `KeepAlive` with a bounded max and route keys based on stable `viewKey`.
- Background work uses `scheduleTask` and interaction-intent gates for fingerprinting, auth bootstrap, service worker registration, background sync, route prefetch, popular content prefetch, and cache cleanup.
- Chunk load failures trigger a single-tab hard reload guard.
- Vite build policy includes custom plugins, hashed asset naming, service worker cache version injection, SRI, critical CSS, async CSS, static prerendering, scoped obfuscation, treeshaking, and chunk budget checks.

Performance risks:

- Large SFCs still combine rendering, animation, fetch, and interaction state, which increases parse and maintenance cost.
- Decorative and interactive subsystems need continued tests around scheduler boundaries, observer wrappers, and delayed mounting.
- Prefetch policies must continue respecting auth state, duplicate request gates, and interaction/data-saving intent.

### 9. Engineering Standards Analysis

Current standards:

- Release runner supports hook, prepush, prepush-full, local, candidate, and production modes.
- Static gates include type-check, unit tests, complexity budget, frontend-pattern audit, build, security build check, and bundle budget in the appropriate modes.
- Audit modules cover type-check, lint, build, test, security, dead code, PWA, build artifacts, CSS, i18n, legacy alignment, environment config, auth surface, frontend contract, and frontend patterns.
- Tests are broad and colocated across API, stores, router, components, views, service worker, edge, scripts, utils, and page models.
- Low-memory validation must prefer serial or low-worker execution.

Engineering controls:

- `validate:release` must remain the release evidence source.
- Hook validation must stay lighter than local/candidate/production validation.
- Heavy validation must not run concurrently with browser automation or duplicate dev servers on low-memory machines.

### 10. Security Analysis

Current security controls:

- BFF cookie session model keeps browser access token material out of persistent storage.
- API requests use same-origin `/api` production facade and `credentials: 'include'`.
- Client security headers, request integrity, challenge, verification, client re-init, and contract mismatch behavior are centralized in the API client.
- Sensitive route access uses fresh authorization checks and degraded risk mode redirects.
- Runtime integrity, frame guard, console guard, console filter, analytics consent, and CSP-sensitive Turnstile behavior are explicit runtime policies.
- DOMPurify is present for sanitized HTML surfaces, and frontend-pattern audit blocks unaudited `v-html`, raw observers, raw idle callbacks, and non-allowlisted Vapor components.
- Service worker tests protect private API cache isolation.

Security risks:

- Security-sensitive chunks use optional obfuscation only when explicitly enabled; obfuscation is not a security boundary.
- Client security credentials persist only non-secret summary fields when persistence is required; tests must keep secret fields excluded.
- Any new BFF endpoint must be classified for public/private cache behavior and route sensitivity before release.

### 11. Current Controls

- Clear BFF-first session architecture with no persistent browser access token.
- Route security metadata is explicit and testable.
- API transport responsibilities are centralized and split into focused modules.
- Validation infrastructure includes release modes, audits, budgets, and script tests.
- Public/private cache policy is explicit and tested.
- Component extraction has already reduced several hotspot risks through model, style, and policy modules.
- Locale, appearance, motion, analytics consent, service worker, and update flows are treated as first-class runtime policies.

### 12. Open Risk Items

- `HomePage.vue` and `PostDetailPage.vue` still exceed the extraction threshold and remain high-maintenance route files.
- Several component domains have lower direct component-test density than `profile` and `business`.
- Some import boundaries are still deep imports even after new barrels are introduced.
- Multiple runtime subsystems depend on global listeners, delayed tasks, and browser APIs; regressions are easy when cleanup tests are missing.
- Test growth risks preserving the current component topology, route SFC structure, and helper placement as if they were final architecture.
- Tactical fixes increase replacement cost when they patch hotspot internals without extracting a contract or adapter boundary.
- GitNexus and Serena MCP availability requires runtime confirmation before graph-backed blast-radius verification.
- Beta/alpha framework and toolchain versions increase upgrade risk and require strict release evidence.

### 13. Execution Queue

Priority sequence:

- Continue shrinking `HomePage.vue`, `PostDetailPage.vue`, and `SchedulePage.vue` through behavior-preserving extraction of pure models, interaction policies, and style files.
- Add focused component tests to lower-density domains: `auth`, `home`, `comment`, and remaining appearance workflows.
- Migrate consumers to tested component barrels in small batches, starting with low-risk static pages, then layout and route pages.
- Contract tests must cover route outcomes, API normalization, auth/session invariants, cache classification, and accessibility states before asserting current internal component structure.
- Convert bug fixes in hotspots into adapter or policy extraction work when the fix touches behavior that belongs to a future architecture replacement.
- Mark unavoidable implementation guards as temporary and state the replacement condition in the slice log.
- Add or extend audit rules only after existing drift is fixed or explicitly allowlisted.
- Keep API contract changes paired with service-level normalization tests and API client retry/error tests.
- Keep route additions blocked by meta contract tests and route security policy tests.
- Keep private API cache classification mandatory for new BFF-backed endpoints.
- Preserve low-memory release validation by running serial Vitest slices and one heavy gate at a time.
- Re-run GitNexus `detect_changes` when MCP transport recovers before any commit or broad production symbol edit.

## Optimization Slices

### Business Capability

- Public browsing must keep anonymous content routes cacheable where safe: home, posts, authors, schedules, community discovery, and search discovery.
- Account, notification, relation, history, report, preference, device, audit, email, MFA, and security activity flows must remain BFF-session scoped.
- Each route-level workflow must expose a stable readiness selector or route contract before it becomes part of release smoke.

Acceptance evidence:

- Route smoke covers public browsing and protected profile/security routes.
- Service Worker cache policy rejects private BFF-backed API domains without requiring an `Authorization` header.
- Profile section pages keep stable `data-testid` readiness selectors.

### Technology Stack

- Runtime dependencies must remain Bun-managed through the checked-in lockfile.
- Vue, Vite, Vitest, vue-i18n, TypeScript, and Playwright beta or alpha upgrades must be handled as scoped toolchain upgrades with explicit validation evidence.
- Runtime business dependencies must not be upgraded in the same change as validation, audit, or browser toolchain upgrades unless the slice declares that coupling.

Acceptance evidence:

- `package.json` and `bun.lock` change together for dependency work.
- Release validation output records changed dependency groups and selected gates.

### Directory Structure

- Route-level files above 50 KB must gain an extraction plan before additional unrelated features are added.
- Shared logic extracted from route files must move into colocated `use*` composables or model modules under the relevant view folder.
- Cross-route utilities must live under `src/utils` only after at least two route groups consume them.

Priority hotspots:

- `src/views/HomePage.vue`
- `src/views/PostDetailPage.vue`
- `src/views/SchedulePage.vue`
- `src/components/layout/SettingsPanel.vue`
- `src/components/layout/AppNavbar.vue`

Acceptance evidence:

- New feature changes do not increase hotspot file size without an accompanying extraction.
- Extracted modules have focused unit tests for pure logic.

### Component Design

- Page components must orchestrate data, layout, and route state; repeated UI and domain rendering must move to components.
- Base UI components must remain page-context neutral.
- Domain components must receive normalized props and avoid direct API calls unless they own an isolated interaction.
- Global overlays must use shared containers or Teleport contracts instead of page-local duplicated shells.

Acceptance evidence:

- Component tests cover stateful domain components and important empty/error/loading states.
- CSS page context selectors remain in layered style files, not base UI components.

### API Management

- `src/api/client.ts` remains the only HTTP transport entrypoint.
- Endpoint services must own URL construction, response normalization, and domain-specific request options.
- Request security policy must remain centralized in `src/api/client/request-security.ts` and `src/api/client/client-security.ts`.
- Private BFF-backed GET endpoints reachable without an `Authorization` header must be listed in the Service Worker private cache policy.

Acceptance evidence:

- `apiClient` tests cover retry, challenge, verification, contract mismatch, and transport failures.
- Service Worker runtime tests cover private API cache exclusions and public API cache allowances.
- Contract-sensitive endpoint changes include backend contract evidence or a local compatibility test.

### State Management

- Auth store must persist no access token material.
- Session truth must resolve through the BFF session summary and refresh cookie flow.
- Settings, theme, and non-sensitive preferences persist locally only when they remain non-sensitive; privacy toggles must normalize analytics and performance tracking defaults.
- Stores must not duplicate API response normalization already owned by endpoint services.

Acceptance evidence:

- Auth tests prove session clearing, runtime authz invalidation, and sensitive route refresh.
- Settings tests prove privacy normalization and migration defaults.

### Route Permission

- Every route must declare `securityLevel` and `dataSensitivity`, or inherit them from an explicitly protected parent.
- Sensitive profile/security routes must require fresh authorization.
- Resource-detail routes must validate contract resource IDs before rendering.
- Guest-only routes must redirect authenticated users unless the route is part of sensitive reauth.

Acceptance evidence:

- Router tests cover invalid resource IDs, guest-only redirects, protected redirects, sensitive reauth, and scroll preservation.
- Release smoke covers protected profile sections and sensitive security hub entrypoints.

### Performance

- Decorative, analytics, fingerprint, Service Worker, and prefetch work must remain deferred behind scheduler or interaction-intent gates.
- Static assets with hashes must remain immutable; HTML and Service Worker must remain short-cache or no-cache.
- Public content is eligible for SW caching; private account-scoped API data must not be cached by default.
- Route prefetch must respect save-data and avoid duplicating active requests.

Acceptance evidence:

- Bundle budget and complexity budget checks pass for release candidates.
- SW tests prove private API isolation and public content cache behavior.
- Lighthouse or production canary artifacts exist for candidate and production modes.

### Engineering Standards

- Local validation must use time-for-space defaults on low-memory machines.
- Release validation must classify changes into route/UI, auth/data flow, edge/BFF, and validation-contract risk areas.
- Hooks must run the hook-mode gate; full local or production validation must be explicit.
- Generated artifacts must be written under `output/` or the configured artifact directory.

Acceptance evidence:

- `validate:release` summary records selected stages, skipped stages, artifacts, and blocking reason.
- Hook, prepush, local, candidate, and production modes keep separate stage plans.

### Maintainability

- Large files must shrink through behavior-preserving extraction before broad feature expansion.
- Edge/BFF proxy responsibilities must be split by policy domain when touched: CORS, CSRF, BFF session, forwarding, response rewrite, and media policy.
- Cache, route, and API policies must use explicit allowlists or denylists with tests instead of implicit naming assumptions.
- Optimization work must land in small slices with targeted tests and GitNexus change detection.

Acceptance evidence:

- GitNexus `detect_changes` reports expected affected symbols and no unexpected high-risk flows.
- Each slice lists changed files, validation command, and residual risk.

## Completed Slice Log

Slice log classification:

- `contract protection`: protects observable behavior, API shape, route result, auth/session invariant, cache classification, accessibility behavior, or release evidence.
- `architecture mobility`: extracts a model, policy, adapter, facade, barrel, or boundary that makes implementation replacement easier.
- `implementation hardening`: fixes or tests current internals that are not yet a replacement boundary.
- `temporary guard`: protects an implementation detail only until a declared replacement condition is met.

Required slice fields:

- `Classification`: one or more values from the slice log classification list.
- `Mobility effect`: states whether the slice reduces coupling, preserves a replacement boundary, or temporarily hardens current internals.
- `Replacement condition`: required for `implementation hardening` and `temporary guard`; states the condition that removes or rewrites the test, fix, or constraint.

### SW Private API Cache Isolation

Changed files:

- `src/sw/runtime.ts`
- `src/sw/__tests__/runtime.spec.ts`

Policy:

- Service Worker API caching must reject private BFF cookie-backed domains even when the browser request does not carry an `Authorization` header.
- Public post and author content remains cacheable under the existing public-content rules.

Validation:

- `node scripts/run-vitest.mjs run src/sw/__tests__/runtime.spec.ts --maxWorkers=1`

Result:

- `3` tests passed.
- GitNexus change detection reported low risk and no affected execution flows for the SW cache slice.

### Route Meta Contract Guard

Changed files:

- `src/router/__tests__/metaContract.spec.ts`

Policy:

- Every named route must resolve to explicit `securityLevel` and `dataSensitivity` metadata.
- Sensitive account routes must remain classified as `securityLevel=sensitive` and `dataSensitivity=security`.
- Route auth flags must stay aligned with metadata: authenticated routes cannot resolve as public, sensitive routes must require auth, and guest-only routes must remain public with no data sensitivity.

Validation:

- `node scripts/run-vitest.mjs run src/router/__tests__ --maxWorkers=1`

Result:

- `10` router tests passed.
- The guard covers the route metadata and auth-flag contract used by protected routing, release smoke, and security state tracking.

### Complexity Budget Diagnostics and DeskPet Style Extraction

Changed files:

- `scripts/lib/complexity-budget.js`
- `scripts/config/complexity-budget.json`
- `src/__tests__/scripts/complexity-budget.spec.ts`
- `src/components/ui/DeskPet.vue`
- `src/components/ui/desk-pet/config.ts`
- `src/components/ui/desk-pet/positioning.ts`
- `src/components/ui/desk-pet/__tests__/positioning.spec.ts`
- `src/styles/components/desk-pet.css`
- `src/styles/index.css`

Policy:

- Complexity budget failures must report actionable reason codes instead of a generic over-limit message.
- Queued refactor files remain violations when their registered `maxLines` limit is exceeded.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.
- Component-specific CSS moves into the layered component style system only when selectors are fully namespaced and do not depend on scoped-only Vue CSS features.
- DeskPet interaction constants must live in a colocated configuration module instead of expanding the component setup block.
- DeskPet viewport math must be testable as pure positioning helpers, including bounds, edge snap, peek overflow, and default corner selection.

Validation:

- `node scripts/check-complexity-budget.mjs`
- `node scripts/run-vitest.mjs run src/components/ui/__tests__/DeskPet.spec.ts src/components/ui/desk-pet/__tests__/petStates.spec.ts src/components/ui/desk-pet/__tests__/positioning.spec.ts src/__tests__/scripts/complexity-budget.spec.ts --maxWorkers=1`

Result:

- Complexity budget passed after `DeskPet.vue` moved below its registered limit.
- `24` targeted tests passed.
- `DeskPet.vue` now has a registered budget ceiling of `1077` lines, matching the extracted component file size.
- `DeskPet.vue` now keeps interaction workflow and template in the component file while `.desk-pet*` presentation rules live in `src/styles/components/desk-pet.css`, interaction constants live in `src/components/ui/desk-pet/config.ts`, and viewport math lives in `src/components/ui/desk-pet/positioning.ts`.
- Existing extracted baselines were also locked for `src/components/ui/VideoPlayer.vue`, `src/views/HomePage.vue`, and `src/views/SchedulePage.vue` at their current observed line counts.

### API Transport URL Boundary Guard

Changed files:

- `src/api/client/transport.ts`
- `src/api/__tests__/transport.spec.ts`

Policy:

- Explicit external API endpoints must be limited to `http://` and `https://` URLs.
- Relative API endpoints must not be misclassified as external only because they start with the letters `http`.
- Base URL trailing slashes must continue to normalize before relative endpoint concatenation.

Validation:

- `node scripts/run-vitest.mjs run src/api/__tests__/transport.spec.ts src/api/__tests__/client.spec.ts --maxWorkers=1`

Result:

- `31` API client and transport tests passed.
- URL boundary behavior is now covered separately from the large API client integration spec.

### Settings Visual Companion Normalization

Changed files:

- `src/stores/settings.ts`
- `src/stores/__tests__/settings.spec.ts`

Policy:

- Visual companion settings must share one normalization path for persisted hydration and runtime setter updates.
- Mascot background density, speed, and opacity must stay within documented bounds.
- DeskPet scale and follow sensitivity must stay within documented bounds before UI components consume them.

Validation:

- `node scripts/run-vitest.mjs run src/stores/__tests__/settings.spec.ts src/components/ui/__tests__/DeskPet.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `22` settings and DeskPet tests passed.
- Complexity budget passed.
- Hydration and runtime setters now share `normalizeMascotBackgroundConfig` and `normalizeDeskPetConfig`.

### Bundle Budget Diagnostics

Changed files:

- `scripts/lib/bundle-budget.js`
- `src/__tests__/scripts/bundle-budget.spec.ts`

Policy:

- Bundle budget violations must expose a stable reason code and exact overage.
- Largest chunk violations must report the largest chunk path.
- Home initial asset count violations must report the initial asset URLs used to diagnose preload or entrypoint drift.

Validation:

- `node scripts/run-vitest.mjs run src/__tests__/scripts/bundle-budget.spec.ts src/__tests__/scripts/complexity-budget.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `6` engineering budget tests passed.
- Complexity budget passed.
- Bundle budget failure output now includes metric reason codes and locator details.

### VideoPlayer Model Extraction

Changed files:

- `src/components/ui/VideoPlayer.vue`
- `src/components/ui/video-player/videoPlayerModel.ts`
- `src/components/ui/video-player/__tests__/videoPlayerModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Playback control constants must live in the video player model instead of expanding the component setup block.
- Subtitle language matching, default subtitle selection, SRT detection, and VTT fallback detection must be pure model helpers with explicit inputs.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/components/ui/__tests__/VideoPlayer.spec.ts src/components/ui/video-player/__tests__/videoPlayerModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `23` VideoPlayer and model tests passed.
- Complexity budget passed.
- `VideoPlayer.vue` now has a registered budget ceiling of `1381` lines, matching the extracted component file size.
- Subtitle selection behavior is covered by model tests for preferred language, current locale, fallback-to-first-track, SRT source detection, and API subtitle fetch fallback.

### PostCard Presentation Model Extraction

Changed files:

- `src/components/business/PostCard.vue`
- `src/components/business/post-card/postCardModel.ts`
- `src/components/business/__tests__/postCardModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Post card text normalization, tag normalization, author fallback display, title/excerpt derivation, platform labels, platform animation names, count formatting, and duration formatting must be pure model helpers.
- Component code must keep browser side effects, image lifecycle, cache updates, and emitted events local to the component.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/components/business/__tests__/PostCard.spec.ts src/components/business/__tests__/postCardModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `5` PostCard component and model tests passed.
- Complexity budget passed.
- `PostCard.vue` was reduced from `1023` to `962` lines and no longer appears in the large-file budget report.
- Model tests cover visible text normalization, author fallback display, content-derived titles, excerpt suppression, platform metadata, count formatting, and duration formatting.

### PostPreviewModal Style Extraction

Changed files:

- `src/components/business/PostPreviewModal.vue`
- `src/styles/components/post-preview-modal.css`
- `src/styles/index.css`
- `src/components/business/__tests__/PostPreviewModalStyles.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Post preview modal presentation rules must live in the layered component stylesheet instead of the SFC.
- Styles moved out of scoped SFC blocks must use `post-preview-*` selectors for local modal elements.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/components/business/__tests__/PostPreviewModal.spec.ts src/components/business/__tests__/PostPreviewModalStyles.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- PostPreviewModal component and style contract tests passed.
- Complexity budget passed.
- `PostPreviewModal.vue` was reduced from `1269` to `724` lines and no longer appears in the large-file budget report.
- Generic `.thumb` and `.meta-pill` selectors were renamed to `post-preview-*` classes before moving styles into `src/styles/components/post-preview-modal.css`.

### Particle Engine Model Extraction

Changed files:

- `src/composables/useParticleEngine.ts`
- `src/composables/particle-engine/model.ts`
- `src/composables/__tests__/particleEngineModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Particle color resolution, alpha conversion, numeric clamping, render scale calculation, and pool initialization must live in a pure colocated model module.
- Canvas rendering, animation lifecycle, DOM events, and quality adaptation must remain in `useParticleEngine.ts`.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/composables/__tests__/particleEngineModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `3` particle model tests passed.
- Complexity budget passed.
- `useParticleEngine.ts` was reduced from `1016` to `914` lines and no longer appears in the large-file budget report.
- Model tests cover theme defaults, explicit colors, alpha conversion, invalid color fallback, clamp behavior, render scale bounds, and inactive particle pool initialization.

### Profile Security MFA Display Model Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Identity-provider display, MFA method labels, boolean metadata labels, authenticator attachment labels, passkey transport display, passkey draft names, and passkey rename eligibility must be pure model helpers.
- API calls, WebAuthn ceremonies, toast reporting, and reactive form state must remain in `ProfileSecurityMfaSection.vue`.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/ProfileSecurityMfaSection.spec.ts src/components/profile/__tests__/securityMfaModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `5` MFA component and model tests passed.
- Complexity budget passed.
- `ProfileSecurityMfaSection.vue` now has a registered budget ceiling of `1148` lines, matching the extracted component file size.
- Model tests cover identity provider normalization/labels, MFA method labels, passkey metadata labels, transport formatting, draft-name fallback, and rename eligibility.

### Route Resource Guard Policy Extraction

Changed files:

- `src/router/index.ts`
- `src/router/routeSecurityPolicy.ts`
- `src/router/__tests__/routeSecurityPolicy.spec.ts`
- `scripts/lib/frontend-contract-audit.js`
- `src/__tests__/scripts/frontend-contract-audit.spec.ts`

Policy:

- Contract resource detail routes must declare their guarded route names in `routeSecurityPolicy.ts`.
- Named `:id` routes must be either covered by the contract resource guard or listed in `ROUTE_ID_PARAM_EXEMPTIONS`.
- The router guard must delegate invalid contract resource ID rejection to the route security policy module.
- Frontend contract audit must validate the extracted policy module instead of relying on inline router guard text.

Validation:

- `node scripts/run-vitest.mjs run src/router/__tests__ src/__tests__/scripts/frontend-contract-audit.spec.ts --maxWorkers=1`

Result:

- `22` route and contract audit tests passed.
- The resource-detail guard remains behavior-compatible while the guarded route list and explicit `schedule-detail` exemption are now covered by focused tests.

### Search Page Style Extraction

Changed files:

- `src/views/SearchPage.vue`
- `src/styles/page-systems/search-page-view.css`
- `src/styles/index.css`
- `src/views/__tests__/SearchPageStyles.spec.ts`
- `src/views/__tests__/ResponsiveLayoutStyles.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Search page presentation rules must live in the layered page-system stylesheet instead of the SFC.
- Styles moved out of scoped SFC blocks must stay scoped under `.search-page`.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/views/__tests__/SearchPage.spec.ts src/views/__tests__/SearchPageStyles.spec.ts src/views/__tests__/ResponsiveLayoutStyles.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `18` SearchPage and responsive style contract tests passed.
- Complexity budget passed.
- `SearchPage.vue` was reduced from `965` to `418` lines and no longer appears in the large-file budget report.
- The large-file count dropped from `15` to `14`.

### About Page Style Extraction

Changed files:

- `src/views/AboutPage.vue`
- `src/styles/page-systems/about-page-view.css`
- `src/styles/index.css`
- `src/views/__tests__/AboutPageStyles.spec.ts`
- `src/views/__tests__/ResponsiveLayoutStyles.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- About page presentation rules must live in the layered page-system stylesheet instead of the SFC.
- Styles moved out of scoped SFC blocks must stay scoped under `.about-page`.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/views/__tests__/AboutPageStyles.spec.ts src/views/__tests__/SearchPageStyles.spec.ts src/views/__tests__/ResponsiveLayoutStyles.spec.ts src/views/__tests__/SearchPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `20` SearchPage, AboutPage, and responsive style contract tests passed.
- Complexity budget passed.
- `AboutPage.vue` was reduced from `1018` to `490` lines and no longer appears in the large-file budget report.
- The large-file count dropped from `14` to `13`.

### Community Page Style Extraction

Changed files:

- `src/views/CommunityPage.vue`
- `src/styles/page-systems/community-page-view.css`
- `src/styles/index.css`
- `src/views/__tests__/CommunityPageStyles.spec.ts`
- `src/views/__tests__/ResponsiveLayoutStyles.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Community page presentation rules must live in the layered page-system stylesheet instead of the SFC.
- Styles moved out of scoped SFC blocks must stay scoped under `.community-page`.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/views/__tests__/CommunityPageStyles.spec.ts src/views/__tests__/ResponsiveLayoutStyles.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `12` CommunityPage and responsive style contract tests passed.
- Complexity budget passed.
- `CommunityPage.vue` was reduced from `1263` to `827` lines and no longer appears in the large-file budget report.
- The large-file count dropped from `13` to `12`.

### Login Page Auth Model Extraction

Changed files:

- `src/views/LoginPage.vue`
- `src/views/login/loginPageModel.ts`
- `src/views/login/__tests__/loginPageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Login page step title/subtitle keys, Turnstile token freshness, and expired Google handoff detection must live in a pure model module.
- LoginPage must keep route/store/API/WebAuthn/Turnstile side effects in the page component.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/login/__tests__/loginPageModel.spec.ts src/views/__tests__/AuthEntryPages.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- `17` login model and auth entry page tests passed.
- Complexity budget passed.
- `LoginPage.vue` now has a registered budget ceiling of `1253` logical lines, matching the extracted component file size.
- Model tests cover step title/subtitle key mapping, Turnstile freshness boundaries, and expired Google handoff detection by message key, backend code, and backend detail.

### Register Page Auth Model Extraction

Changed files:

- `src/views/RegisterPage.vue`
- `src/views/register/registerPageModel.ts`
- `src/views/register/__tests__/registerPageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Register page step title/subtitle keys, Turnstile token freshness, and expired Google handoff detection must live in a pure model module.
- RegisterPage must keep route/store/API/Turnstile side effects in the page component.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/register/__tests__/registerPageModel.spec.ts src/views/__tests__/AuthEntryPages.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- `17` register model and auth entry page tests passed.
- Complexity budget passed.
- `RegisterPage.vue` now has a registered budget ceiling of `1455` logical lines, matching the extracted component file size.
- Model tests cover step title/subtitle key mapping, Turnstile freshness boundaries, and expired Google handoff detection by message key, backend code, and backend detail.

### Profile Security MFA Style Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/styles/page-systems/profile-security-mfa-section.css`
- `src/styles/index.css`
- `src/components/profile/__tests__/ProfileSecurityMfaSectionStyles.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Profile security MFA presentation rules must live in the layered page-system stylesheet instead of the SFC.
- Styles moved out of scoped SFC blocks must stay scoped under `.security-mfa-panel`.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/ProfileSecurityMfaSection.spec.ts src/components/profile/__tests__/ProfileSecurityMfaSectionStyles.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- `4` MFA component behavior and style contract tests passed.
- Complexity budget passed.
- `ProfileSecurityMfaSection.vue` was reduced to `720` lines and no longer appears in the large-file budget report.
- The large-file count dropped from `12` to `11`.

### Profile Settings Page Style Extraction

Changed files:

- `src/views/ProfileSettingsPage.vue`
- `src/styles/page-systems/profile-settings-page-view.css`
- `src/views/__tests__/ProfileSettingsPageStyles.spec.ts`
- `src/views/__tests__/ResponsiveLayoutStyles.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Profile settings page presentation rules must live in an external scoped stylesheet instead of the SFC body.
- External page styles for Vue-scoped pages must use `<style scoped src="...">` when selector scoping must remain unchanged.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/views/__tests__/ProfileSettingsPage.spec.ts src/views/__tests__/ProfileSettingsPageStyles.spec.ts src/views/__tests__/ResponsiveLayoutStyles.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- `15` ProfileSettingsPage behavior, style, and responsive layout contract tests passed.
- Complexity budget passed.
- `ProfileSettingsPage.vue` was reduced to `860` lines and no longer appears in the large-file budget report.
- The large-file count dropped from `11` to `10`.

### Schedule Page Calendar Model Extraction

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Schedule calendar grid construction, event date indexing, weekday labels, upcoming/today event derivation, category colors, category breakdown, and event date/time labels must live in a pure model module.
- SchedulePage must keep route detail orchestration, API fallback handling, metadata updates, scrolling, sharing, and toast side effects in the page component until those workflows are split explicitly.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts src/views/__tests__/SchedulePage.spec.ts src/views/__tests__/SchedulePageStyles.spec.ts src/views/__tests__/SchedulePageMobileStyles.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- `16` SchedulePage model, route-detail, and style tests passed.
- Complexity budget passed.
- `SchedulePage.vue` now has a registered budget ceiling of `1573` logical lines, matching the extracted component file size.
- Model tests cover category colors, localized weekday labels, event filtering, date indexing, six-week month grids, planner week generation, upcoming/today sorting, category breakdown, and all-day/timed date labels.

### Post Detail Presentation Model Expansion

Changed files:

- `src/views/PostDetailPage.vue`
- `src/views/post-detail/postDetailModel.ts`
- `src/views/post-detail/__tests__/postDetailModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Post detail title/description cleanup, published metadata, media navigation state, image source resolution, fallback media source resolution, placeholder selection, and adjacent preload index selection must live in the pure post detail model.
- PostDetailPage must keep fetch/cache/fallback loading, route navigation, comments lazy loading, swipe routing, body scroll locking, and page metadata side effects in the page component until those workflows are split explicitly.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/post-detail/__tests__/postDetailModel.spec.ts src/views/__tests__/PostDetailPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- `21` PostDetailPage model and page behavior tests passed.
- Complexity budget passed.
- `PostDetailPage.vue` now has a registered budget ceiling of `2533` logical lines, matching the extracted component file size.
- Model tests cover duplicate title cleanup, description prefix stripping, media sizing, media pending/thumbnail rail rules, published metadata, media navigation state, image/fallback/placeholder URL resolution, and adjacent preload indexes.

### App Navbar Scoped Style Extraction

Changed files:

- `src/components/layout/AppNavbar.vue`
- `src/styles/components/app-navbar.css`
- `src/components/layout/__tests__/AppNavbar.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Navbar presentation rules must live in an external scoped stylesheet while the navigation, dropdown, search, visibility, prefetch, and auth menu behavior remains in the component.
- External component styles for Vue-scoped layout components must use `<style scoped src="...">` when selector scoping must remain unchanged.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/components/layout/__tests__/AppNavbar.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- AppNavbar behavior and style contract tests passed.
- Complexity budget passed.
- `AppNavbar.vue` was reduced to `937` lines and no longer appears in the large-file budget report.

### Settings Panel Scoped Style Extraction

Changed files:

- `src/components/layout/SettingsPanel.vue`
- `src/styles/components/settings-panel.css`
- `src/components/layout/__tests__/SettingsPanel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Settings panel presentation rules must live in an external scoped stylesheet while category visibility, preference persistence, store mutations, preference sync, and video reset behavior remain in the component.
- External component styles for Vue-scoped settings surfaces must use `<style scoped src="...">` when selector scoping must remain unchanged.
- Files that fall below `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/components/layout/__tests__/SettingsPanel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- SettingsPanel behavior and style contract tests passed.
- Complexity budget passed.
- `SettingsPanel.vue` was reduced to `967` lines and no longer appears in the large-file budget report.

### Desk Pet Interaction Model Extraction

Changed files:

- `src/components/ui/DeskPet.vue`
- `src/components/ui/desk-pet/interaction.ts`
- `src/components/ui/desk-pet/__tests__/interaction.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Desk pet greeting selection, position storage parsing/writing, event coordinate extraction, rest-state selection, pointer look-offset math, particle burst construction, default placement insets, hero perch/peek target math, and care action plans must live in a pure interaction model.
- DeskPet must keep timers, animation-frame orchestration, DOM event registration, image preload lifecycle, settings store writes, and workflow reaction mounting in the component until those runtime workflows are split explicitly.
- Files that fall below or equal `softLineLimit` must leave the registered large-file budget list so future growth above the limit fails as an unregistered large file.

Validation:

- `node scripts/run-vitest.mjs run src/components/ui/desk-pet/__tests__/interaction.spec.ts src/components/ui/__tests__/DeskPet.spec.ts src/components/ui/desk-pet/__tests__/positioning.spec.ts src/components/ui/desk-pet/__tests__/petStates.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Desk pet interaction model, runtime, positioning, and workflow state tests passed.
- Complexity budget passed.
- `DeskPet.vue` was reduced to `1000` lines and no longer appears in the large-file budget report.

### Video Player Seek And Volume Model Expansion

Changed files:

- `src/components/ui/VideoPlayer.vue`
- `src/components/ui/video-player/videoPlayerModel.ts`
- `src/components/ui/video-player/__tests__/videoPlayerModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Video progress percentages, display percent fallback, pointer seek target calculation, keyboard seek target calculation, and volume slider normalization must live in the pure video player model.
- VideoPlayer must keep media element reads/writes, PiP/fullscreen APIs, document listeners, timers, subtitle track listeners, and gesture composable wiring in the component until those runtime workflows are split explicitly.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/components/ui/video-player/__tests__/videoPlayerModel.spec.ts src/components/ui/__tests__/VideoPlayer.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Video player model and component behavior tests passed.
- Complexity budget passed.
- `VideoPlayer.vue` now has a registered budget ceiling of `1376` logical lines, matching the extracted component file size.

### Video Player Subtitle Model Expansion

Changed files:

- `src/components/ui/VideoPlayer.vue`
- `src/components/ui/video-player/videoPlayerModel.ts`
- `src/components/ui/video-player/__tests__/videoPlayerModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Fetched subtitle fallback normalization and active cue HTML extraction must live in the pure video player model.
- VideoPlayer must keep subtitle fetching, blob URL creation/revocation, text track mode updates, and cuechange listener wiring in the component until the subtitle runtime workflow is split explicitly.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/components/ui/video-player/__tests__/videoPlayerModel.spec.ts src/components/ui/__tests__/VideoPlayer.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Video player subtitle model and component behavior tests passed.
- Complexity budget passed.
- `VideoPlayer.vue` now has a registered budget ceiling of `1360` logical lines, matching the extracted component file size.

### Register Page Form Model Expansion

Changed files:

- `src/views/RegisterPage.vue`
- `src/views/register/registerPageModel.ts`
- `src/views/register/__tests__/registerPageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Registration password strength text keys, code-sent email masking, progress visibility, post-registration login target construction, and first-failure form validation gates must live in the pure register page model.
- RegisterPage must keep email domain policy evaluation, toast dispatch, Turnstile challenge execution/reset, auth store registration, router mutation, and inline field state in the component until those runtime workflows are split explicitly.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/register/__tests__/registerPageModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Register page model tests passed.
- `RegisterPage.vue` now has a registered budget ceiling of `1429` logical lines, matching the extracted component file size.

### Login Page Form Model Expansion

Changed files:

- `src/views/LoginPage.vue`
- `src/views/login/loginPageModel.ts`
- `src/views/login/__tests__/loginPageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Credential-login validation, restore-account validation, restore notice key selection, password-login unavailable detection, risk WebAuthn method detection, risk code normalization, credential Turnstile retry predicates, and restore-query cleanup must live in the pure login page model.
- LoginPage must keep auth store login, restore-account API calls, Turnstile execution/reset, WebAuthn ceremonies, Google popup handling, router mutation, and toast dispatch in the component until those runtime workflows are split explicitly.
- Existing large-file baselines must not grow while model extraction is incomplete.

Validation:

- `node scripts/run-vitest.mjs run src/views/login/__tests__/loginPageModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Login page model tests passed.
- `LoginPage.vue` remains at the registered budget ceiling of `1253` logical lines while moving additional rules into the model.

### Schedule Detail Model Expansion

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Schedule detail link availability, lead text extraction, host label construction, same-day comparison, description HTML normalization, description section parsing, and safe line linkification must live in the pure schedule page model.
- SchedulePage must keep route synchronization, detail API/cache/fallback loading, page meta updates, clipboard, Web Share, and toast dispatch in the component until those runtime workflows are split explicitly.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Schedule page model tests passed.
- `SchedulePage.vue` now has a registered budget ceiling of `1517` logical lines, matching the extracted component file size.

### Home Page Image Policy Model Expansion

Changed files:

- `src/views/HomePage.vue`
- `src/views/homepage/homeImagePolicy.ts`
- `src/views/homepage/__tests__/homeImagePolicy.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Homepage image srcset resolution, hero collage responsive dimensions, hero collage sizes/loading/fetch-priority policy, and featured rail image dimensions/sizes/loading/fetch-priority policy must live in the pure homepage model.
- HomePage must keep data loading, preview state, router navigation, GSAP/ScrollTrigger, smooth scrolling, intersection/resize observers, and bubble canvas runtime in the page component until those workflows are split explicitly.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeModel.spec.ts src/views/homepage/__tests__/homeImagePolicy.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Homepage model tests passed.
- `HomePage.vue` now has a registered budget ceiling of `3264` logical lines, matching the extracted component file size.
- `homeModel.ts` remains below the large-file soft limit; image policy lives in a dedicated small model file.

### Post Detail Media And Comments Model Expansion

Changed files:

- `src/views/PostDetailPage.vue`
- `src/views/post-detail/postDetailModel.ts`
- `src/views/post-detail/__tests__/postDetailModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Post detail media transition targets, transition names, auto-advance wraparound, invalid media target rejection, not-found route params, comments preload margin, and comments viewport eligibility must live in the pure post detail model.
- PostDetailPage must keep autoplay timers, image decode warming, router mutation, session storage, comment observer/listener wiring, API/cache/fallback loading, page meta updates, and view tracking in the component until those runtime workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/post-detail/__tests__/postDetailModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Post detail model tests passed.
- `PostDetailPage.vue` now has a registered budget ceiling of `2525` logical lines, matching the extracted component file size.

### Schedule Interaction Model Expansion

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Schedule calendar keyboard navigation index resolution and month swipe direction detection must live in the pure schedule page model.
- SchedulePage must keep DOM cell querying, focus movement, touch event reads, month state mutation, route detail orchestration, API/cache/fallback loading, page meta updates, clipboard, Web Share, and toast dispatch in the component until those runtime workflows are split explicitly.
- Extracted large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Schedule page model tests passed.
- `SchedulePage.vue` now has a registered budget ceiling of `1503` logical lines, matching the extracted component file size.

### Schedule Navigation Model Expansion

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Schedule planner step targets, month rollover transitions, and today transition direction must live in the pure schedule page model.
- SchedulePage must keep selected day mutation, current year/month refs, route detail orchestration, API/cache/fallback loading, page meta updates, clipboard, Web Share, and toast dispatch in the component until those runtime workflows are split explicitly.
- `SchedulePage.vue` must remain below the hard line limit unless future detail orchestration work adds an explicit budget note.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Schedule page model tests passed.
- `SchedulePage.vue` now has a registered budget ceiling of `1482` logical lines and no longer requires the refactor queue flag.

### Home Page Support Policy Extraction

Changed files:

- `src/views/HomePage.vue`
- `src/views/homepage/homeSupportPolicy.ts`
- `src/views/homepage/__tests__/homeSupportPolicy.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Homepage public prewarm media candidate collection, empty support refresh target construction, pending refresh detection, and support refresh target resolution must live in the dedicated homepage support policy module.
- HomePage must keep window-width prewarm sizing, background task scheduling, dynamic API imports, AbortController lifecycle, aggregate application, route navigation, GSAP/ScrollTrigger, smooth scrolling, intersection/resize observers, and bubble canvas runtime in the page component until those workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeModel.spec.ts src/views/homepage/__tests__/homeSupportPolicy.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Homepage model and support policy tests passed.
- `HomePage.vue` now has a registered budget ceiling of `3220` logical lines, matching the extracted component file size.
- `homeModel.ts` remains below the large-file soft limit; support refresh policy lives in a dedicated small policy file.

### Home Page Scene Policy Extraction

Changed files:

- `src/views/HomePage.vue`
- `src/views/homepage/homeScenePolicy.ts`
- `src/views/homepage/__tests__/homeScenePolicy.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Homepage compact/lightweight viewport classification, heavy scene capability flags, scene travel distance, viewport progress clamping, and ScrollTrigger snap policy must live in the dedicated homepage scene policy module.
- HomePage must keep DOM measurement, GSAP/ScrollTrigger lifecycle, smooth-scroll bridge wiring, event listeners, resize/intersection observers, and canvas rendering in the page component until those runtime workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts src/views/homepage/__tests__/homeImagePolicy.spec.ts src/views/homepage/__tests__/homeSupportPolicy.spec.ts src/views/__tests__/HomePage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Homepage component, image policy, support policy, and scene policy tests passed.
- `HomePage.vue` now has a registered budget ceiling of `3215` logical lines, matching the extracted component file size.
- Scene capability and progress behavior is covered without requiring GSAP, ScrollTrigger, or browser event listeners in unit tests.

### Post Detail Navigation Gesture Model Expansion

Changed files:

- `src/views/PostDetailPage.vue`
- `src/views/post-detail/postDetailModel.ts`
- `src/views/post-detail/__tests__/postDetailModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Adjacent post navigation target resolution, navigation hint direction, second-gesture confirmation, wheel gesture accumulation, shift-wheel mapping, and touch swipe direction detection must live in the pure post detail model.
- PostDetailPage must keep event listener attachment, ignored DOM target detection, media-first navigation fallback, session storage transition writes, router mutation, timers, and API/cache/fallback loading in the component until those runtime workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/post-detail/__tests__/postDetailModel.spec.ts src/views/__tests__/PostDetailPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Post detail model and page behavior tests passed.
- `PostDetailPage.vue` now has a registered budget ceiling of `2509` logical lines, matching the extracted component file size.
- Adjacent post gesture behavior is covered without requiring DOM wheel or touch event construction in the model tests.

### Home Page Motion Style Policy Expansion

Changed files:

- `src/views/HomePage.vue`
- `src/views/homepage/homeScenePolicy.ts`
- `src/views/homepage/__tests__/homeScenePolicy.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Homepage viewport blend measurement and home page motion CSS variable construction must live in the dedicated homepage scene policy module.
- HomePage must keep DOM element resolution, `getBoundingClientRect` reads, viewport scene lifecycle, bubble reveal state mutation, navbar/footer locks, GSAP/ScrollTrigger lifecycle, and canvas rendering in the page component until those runtime workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts src/views/__tests__/HomePage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Homepage scene policy and page behavior tests passed.
- `HomePage.vue` now has a registered budget ceiling of `3176` logical lines, matching the extracted component file size.
- Motion CSS variable behavior is covered without requiring GSAP, ScrollTrigger, or DOM event listeners in unit tests.

### Home Page Rail And Story Scene Style Policy Expansion

Changed files:

- `src/views/HomePage.vue`
- `src/views/homepage/homeScenePolicy.ts`
- `src/views/homepage/__tests__/homeScenePolicy.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Featured rail scene style, rail track transform style, and story scene CSS variable construction must live in the dedicated homepage scene policy module.
- HomePage must keep reactive source selection, route composition, DOM measurement, scene lifecycle, GSAP/ScrollTrigger lifecycle, and canvas rendering in the page component until those runtime workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts src/views/__tests__/HomePage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Homepage scene policy and page behavior tests passed.
- `HomePage.vue` now has a registered budget ceiling of `3172` logical lines, matching the extracted component file size.
- Rail/story style behavior is covered without requiring DOM measurement, ScrollTrigger, or browser event listeners in unit tests.

### Home Page Footer Blend And Rail Lock Policy Expansion

Changed files:

- `src/views/HomePage.vue`
- `src/views/homepage/homeScenePolicy.ts`
- `src/views/homepage/__tests__/homeScenePolicy.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Home footer blend CSS variable values, removable footer blend property list, footer blend activation threshold, and rail navbar lock boundary calculation must live in the dedicated homepage scene policy module.
- HomePage must keep document dataset mutation, CSS property application/removal, DOM element resolution, viewport scene lifecycle, bubble reveal state mutation, GSAP/ScrollTrigger lifecycle, and canvas rendering in the page component until those runtime workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts src/views/__tests__/HomePage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Homepage scene policy and page behavior tests passed.
- `HomePage.vue` now has a registered budget ceiling of `3153` logical lines, matching the extracted component file size.
- Footer blend and rail lock behavior is covered without requiring DOM style mutation or browser event listeners in unit tests.

### Home Page Bubble Reveal Lifecycle Policy Expansion

Changed files:

- `src/views/HomePage.vue`
- `src/views/homepage/bubbleRevealState.ts`
- `src/views/homepage/__tests__/bubbleRevealState.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Bubble reveal lifecycle action resolution and viewport reveal/retreat action resolution must live in the dedicated bubble reveal state module.
- HomePage must keep animation frame scheduling, burst/retreat side effects, phase mutation, DOM measurement, scene lifecycle, GSAP/ScrollTrigger lifecycle, and canvas rendering in the page component until those runtime workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/homepage/__tests__/bubbleRevealState.spec.ts src/views/homepage/__tests__/homeScenePolicy.spec.ts src/views/__tests__/HomePage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Homepage bubble reveal, scene policy, and page behavior tests passed.
- `HomePage.vue` now has a registered budget ceiling of `3150` logical lines, matching the extracted component file size.
- Reveal/retreat action behavior is covered without requiring animation frames or DOM event listeners in unit tests.

### Home Page Scene Layout Refresh Policy Expansion

Changed files:

- `src/views/HomePage.vue`
- `src/views/homepage/homeScenePolicy.ts`
- `src/views/homepage/__tests__/homeScenePolicy.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Scene layout size normalization and layout refresh threshold decisions must live in the dedicated homepage scene policy module.
- HomePage must keep ResizeObserver ownership, DOM element collection, observed element storage, and refresh scheduling side effects in the page component until the scene runtime is split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/homepage/__tests__/homeScenePolicy.spec.ts src/views/__tests__/HomePage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Homepage scene policy and page behavior tests passed.
- `HomePage.vue` now has a registered budget ceiling of `3142` logical lines, matching the extracted component file size.
- ResizeObserver refresh behavior is covered without requiring DOM observers or browser event listeners in unit tests.

### Post Detail Fallback Recovery Policy Expansion

Changed files:

- `src/views/PostDetailPage.vue`
- `src/views/post-detail/postDetailModel.ts`
- `src/views/post-detail/__tests__/postDetailModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Post detail fallback recovery source decisions must live in the pure post detail model.
- PostDetailPage must keep ApiError classification, service-unavailable classification, navigation summary lookup, fallback detail construction, router mutation, cache loading, and view tracking side effects in the page component until API orchestration is split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/post-detail/__tests__/postDetailModel.spec.ts src/views/__tests__/PostDetailPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Post detail model and page behavior tests passed.
- `PostDetailPage.vue` now has a registered budget ceiling of `2508` logical lines, matching the extracted component file size.
- 404 navigation-summary recovery and service-unavailable static fallback recovery are covered without requiring API calls, router mutation, or cache access in unit tests.

### Post Detail Text Modal Lifecycle Extraction

Changed files:

- `src/views/PostDetailPage.vue`
- `src/views/post-detail/usePostDetailTextModal.ts`
- `src/views/post-detail/__tests__/usePostDetailTextModal.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Long-text modal open state, Escape handling, body scroll locking, focus restoration, activation rebinding, and deactivation cleanup must live behind a page-local composable.
- PostDetailPage must keep template bindings, route fetch orchestration, media navigation, comments loading, and API/cache/fallback side effects in the page component until those runtime workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/post-detail/__tests__/usePostDetailTextModal.spec.ts --maxWorkers=1`
- `node scripts/run-vitest.mjs run src/views/__tests__/PostDetailPage.spec.ts src/views/post-detail/__tests__/usePostDetailTextModal.spec.ts --maxWorkers=1 --testTimeout=30000`
- `bun run type-check`
- `node scripts/check-complexity-budget.mjs`
- `bunx prettier --check FRONTEND_OPTIMIZATION_PLAN.md scripts/config/complexity-budget.json src/views/PostDetailPage.vue src/views/post-detail/usePostDetailTextModal.ts src/views/post-detail/__tests__/usePostDetailTextModal.spec.ts`
- `git diff --check -- FRONTEND_OPTIMIZATION_PLAN.md scripts/config/complexity-budget.json src/views/PostDetailPage.vue src/views/post-detail/usePostDetailTextModal.ts src/views/post-detail/__tests__/usePostDetailTextModal.spec.ts`

Result:

- Post detail text modal lifecycle tests and page integration tests passed.
- `PostDetailPage.vue` now has a registered budget ceiling of `2469` logical lines, matching the extracted component file size.
- Pre-edit GitNexus exact lookup for `openTextModal`, `closeTextModal`, and `onTextModalKeydown` returned not found, so the slice was constrained to SFC-local template bindings and validated through focused lifecycle tests.

### Schedule Detail Recovery Policy Expansion

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Schedule detail recovery source decisions must live in the pure schedule page model.
- SchedulePage must keep live API calls, public snapshot reads/writes, static fallback lookup, page metadata updates, selected-day synchronization, router mutation, clipboard, Web Share, and toast side effects in the page component until API orchestration is split explicitly.
- Existing large-file baselines must remain enforced; this slice must not increase the registered `SchedulePage.vue` line ceiling.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts src/views/__tests__/SchedulePage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Schedule model and page behavior tests passed.
- `SchedulePage.vue` remains at the registered budget ceiling of `1482` logical lines.
- Cached detail recovery, static fallback recovery, not-found detail state, and generic error state decisions are covered without requiring API calls, cache access, route mutation, or toast side effects in unit tests.

### Schedule Detail Share Policy Expansion

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Schedule detail permalink normalization, share capability checks, and Web Share payload construction must live in the pure schedule page model.
- SchedulePage must keep router resolution, window origin access, navigator capability reads, clipboard writes, Web Share invocation, and toast side effects in the page component.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts src/views/__tests__/SchedulePage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`

Result:

- Schedule model and page behavior tests passed.
- `SchedulePage.vue` now has a registered budget ceiling of `1481` logical lines, matching the extracted component file size.
- Permalink normalization, share button eligibility, and share payload fallback text are covered without requiring router, clipboard, Web Share, or toast side effects in unit tests.

### Login Route State Policy Expansion

Changed files:

- `src/views/LoginPage.vue`
- `src/views/login/loginPageModel.ts`
- `src/views/login/__tests__/loginPageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Login route query state, Google provider visual busy state, client challenge visibility, conditional passkey autofill start eligibility, and back navigation intent must live in the pure login page model.
- LoginPage must keep auth store login, restore-account API calls, Turnstile execution/reset, WebAuthn ceremonies, Google popup handling, router mutation, toast dispatch, and DOM/window side effects in the component until those runtime workflows are split explicitly.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/login/__tests__/loginPageModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Login model tests passed with `11` tests.
- Complexity budget passed.
- `LoginPage.vue` now has a registered budget ceiling of `1250` logical lines, matching the extracted component file size.
- Route query state, Google auth visual state, passkey autofill eligibility, and back navigation intent are covered without requiring router, browser history, WebAuthn, Google popup, Turnstile, or API side effects in unit tests.

### Register Google State Policy Expansion

Changed files:

- `src/views/RegisterPage.vue`
- `src/views/register/registerPageModel.ts`
- `src/views/register/__tests__/registerPageModel.spec.ts`
- `scripts/config/complexity-budget.json`

Policy:

- Register Google provider visual busy state, client challenge visibility, and non-register back navigation intent must live in the pure register page model.
- RegisterPage must keep email validation, code sending/resending, auth store registration, Turnstile execution/reset, WebAuthn/MFA handoff, Google popup handling, router mutation, toast dispatch, and DOM/window side effects in the component until those runtime workflows are split explicitly.
- Register Turnstile freshness remains in the current page helper path for this slice because GitNexus impact reports HIGH risk across send-code, resend-code, and register flows.
- Existing large-file baselines must be tightened to the new observed line count before the slice is considered complete.

Validation:

- `node scripts/run-vitest.mjs run src/views/register/__tests__/registerPageModel.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Register model tests passed with `10` tests.
- Complexity budget passed.
- `RegisterPage.vue` now has a registered budget ceiling of `1427` logical lines, matching the extracted component file size.
- Google auth visual state, client challenge eligibility, and non-register back navigation intent are covered without requiring router, browser history, Google popup, Turnstile, code delivery, or registration API side effects in unit tests.

### Profile Settings Identity And Restore Policy Expansion

Changed files:

- `src/views/ProfileSettingsPage.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`
- `src/views/__tests__/ProfileSettingsPage.spec.ts`

Policy:

- Profile display-name fallback, identity-provider normalization, auth-source copy selection, account data summary defaults, restore-account query construction, and optional date-time fallback formatting must live in the pure profile settings model.
- ProfileSettingsPage must keep profile loading, account deletion/export API calls, avatar upload/crop, router mutation, store mutation, toast dispatch, and translation rendering in the component until those runtime workflows are split explicitly.
- ProfileSettingsPage remains below the large-file threshold; no complexity budget entry is required for this slice.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSettingsPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model and page tests passed with `12` tests.
- `ProfileSettingsPage.vue` decreased to `907` logical lines after policy extraction and existing style externalization.
- Identity and restore policy decisions are covered without requiring router logout/replace, API calls, avatar upload, toast dispatch, or translation side effects in unit tests.

### Profile Security Identity Policy Reuse

Changed files:

- `src/views/ProfileSecurityPage.vue`
- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Profile security pages and security components must reuse the profile settings model for identity-provider normalization, auth-source label key selection, auth-source hint key selection, display-name fallback, and optional date-time fallback formatting.
- `securityMfaModel.ts` must keep passkey, MFA method, provider display-name, and rename eligibility helpers, but its identity-provider normalization must delegate to the shared profile settings policy.
- ProfileSecurityPage, ProfileSecurityCredentialsSection, and ProfileSecurityMfaSection must keep API loading, session management, MFA/passkey service calls, router hash synchronization, store access, toast dispatch, and translation rendering in their owning components.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts --maxWorkers=1`
- `node scripts/run-vitest.mjs run src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/components/profile/__tests__/ProfileSecurityMfaSection.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `10` tests.
- Profile security page tests passed with `3` tests.
- MFA model and section tests passed with `5` tests.
- Identity and date-time policy reuse is covered without requiring security summary API calls beyond existing mocks, MFA service side effects, passkey browser ceremonies, router mutation, or toast dispatch in pure policy tests.

### Profile Security Route State Policy Extraction

Changed files:

- `src/views/ProfileSecurityPage.vue`
- `src/views/profile-security/profileSecurityPageModel.ts`
- `src/views/profile-security/__tests__/profileSecurityPageModel.spec.ts`

Policy:

- Profile security panel ids, canonical hashes, hash aliases, fallback panel selection, and router hash replacement decisions must live in a pure profile security page model.
- ProfileSecurityPage must keep DOM panel refs, `nextTick`, scroll behavior, router mutation, API loading, session management, store access, and translation rendering in the page component.
- The panel card order must derive from the model definitions so navigation cards and workspace chips cannot drift from the route hash contract.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-security/__tests__/profileSecurityPageModel.spec.ts --maxWorkers=1`
- `node scripts/run-vitest.mjs run src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile security route-state model tests passed with `4` tests.
- Profile security page tests passed with `3` tests.
- Hash alias handling, unknown-hash fallback, canonical hash mapping, and no-op router replacement decisions are covered without requiring DOM scrolling, API calls, session revocation, or router mutation in pure model tests.

### Profile Security Overview Model Expansion

Changed files:

- `src/views/ProfileSecurityPage.vue`
- `src/views/profile-security/profileSecurityPageModel.ts`
- `src/views/profile-security/__tests__/profileSecurityPageModel.spec.ts`

Policy:

- Security overview count formatting, failed-login risk flagging, last-login fallback selection, panel card construction, and active-card fallback must live in the pure profile security page model.
- ProfileSecurityPage must keep translation lookup, icon component references, profile/session/security summary sources, date formatting, DOM panel refs, scroll behavior, router mutation, and API loading in the page component.
- Panel card construction must continue to derive from the shared security panel route definitions.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-security/__tests__/profileSecurityPageModel.spec.ts --maxWorkers=1`
- `node scripts/run-vitest.mjs run src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile security page model tests passed with `8` tests.
- Profile security page tests passed with `3` tests.
- Overview counts, risk flagging, last-login fallback, panel card metadata, unavailable email fallback, and active-card fallback are covered without requiring API calls, DOM scrolling, router mutation, or translation runtime in pure model tests.

### Profile Security Load Policy Expansion

Changed files:

- `src/views/ProfileSecurityPage.vue`
- `src/views/profile-security/profileSecurityPageModel.ts`
- `src/views/profile-security/__tests__/profileSecurityPageModel.spec.ts`

Policy:

- Profile/security summary load error message selection and refresh task ordering must live in the pure profile security page model.
- ProfileSecurityPage must keep API client calls, loading refs, profile and summary ref mutation, session composable calls, `Promise.allSettled`, and translated fallback copy ownership in the page component.
- The model must accept an API-error type guard instead of importing API error classes.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-security/__tests__/profileSecurityPageModel.spec.ts --maxWorkers=1`
- `node scripts/run-vitest.mjs run src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile security page model tests passed with `10` tests.
- Profile security page tests passed with `3` tests.
- API-error fallback selection and refresh task ordering are covered without requiring real user/profile API calls, audit API calls, session fetching, or `Promise.allSettled` in pure model tests.

### Profile Security Credentials Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Password credential availability and email-verification dialog payload selection must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep form refs, loading refs, email verification dialog state, verification token requests, auth store refresh, toast dispatch, and translation rendering in the component.
- Pending credential actions must use the shared `ProfileCredentialPendingAction` type so email-change and password-change verification payloads cannot drift.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `11` tests.
- Profile security page tests passed with `3` tests.
- Local-provider password flow gating and email/password verification payloads are covered without requiring verification bridge calls, auth store refresh, toast dispatch, dialog runtime, or translation runtime in pure model tests.

### Profile Security Password Submit Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Password-change submit blocker selection must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep translated error copy, toast dispatch, loading ref mutation, verification token requests, email verification dialog mutation, and API error handling in the component.
- The submit policy must distinguish busy state, provider-managed accounts, password mismatch, password length failure, and an allowed verification start.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `12` tests.
- Profile security page tests passed with `3` tests.
- Password-change blocker ordering is covered without requiring verification bridge calls, translated toast dispatch, API errors, auth store refresh, or dialog runtime in pure model tests.

### Profile Security Email Submit Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Email-change submit blocker selection must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep loading ref mutation, verification token requests, email verification dialog mutation, API error handling, toast dispatch, auth store refresh, and translated copy in the component.
- The submit policy must distinguish busy state, invalid form state, and an allowed verification start.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `13` tests.
- Profile security page tests passed with `3` tests.
- Email-change blocker ordering is covered without requiring verification bridge calls, API errors, toast dispatch, auth store refresh, or dialog runtime in pure model tests.

### Profile Security Verification Dialog State Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Credential verification dialog open and close state construction must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep ref mutation, verification token requests, API error handling, toast dispatch, form reset, emit calls, auth store refresh, and translated copy in the component.
- Dialog state construction must set `isOpen`, action, verification token, and pending credential action together so password-change and email-change flows cannot leave partial dialog state.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `14` tests.
- Profile security page tests passed with `3` tests.
- Dialog open and close state construction is covered without requiring verification bridge calls, dialog runtime, toast dispatch, form reset, auth store refresh, or emit side effects in pure model tests.

### Profile Security Verification Success Outcome Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Credential verification success outcome selection must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep toast dispatch, form ref mutation, emit calls, auth store refresh, dialog close state mutation, and translated copy in the component.
- The outcome policy must distinguish email-change success, password-change success, and missing pending-action fallback.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `15` tests.
- Profile security page tests passed with `3` tests.
- Success message key selection, email form reset, password form reset, profile refresh requirement, and empty-action fallback are covered without requiring toast dispatch, ref mutation, emit calls, auth store refresh, or dialog runtime in pure model tests.

### Profile Security Password Strength Copy Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Password strength score, CSS token, and translation key selection must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep password strength calculation, translation rendering, and DOM binding in the component.
- The password strength text policy must map every supported strength level to a stable translation key.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `15` tests.
- Profile security page tests passed with `3` tests.
- Password strength translation key mapping is covered without requiring vue-i18n runtime, DOM rendering, or password strength recalculation in pure model tests.

### Profile Security Credential Form Factory Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Credential password and email form initial state construction must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep Vue refs, v-model bindings, form reset timing, toast dispatch, emit calls, auth store refresh, and dialog state mutation in the component.
- Form factories must return fresh empty objects for each initialization or reset so password and email refs cannot share mutable state.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `16` tests.
- Profile security page tests passed with `3` tests.
- Credential form initial and reset object construction is covered without requiring Vue refs, DOM input binding, toast dispatch, emit calls, auth store refresh, or dialog runtime in pure model tests.

### Profile Security Password Visibility State Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Credential password visibility initial state, immutable field toggling, and password input type mapping must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep Vue refs, template event binding, aria binding, icon rendering, and translated toggle copy in the component.
- Visibility toggles must update one field at a time and must preserve the other credential password field states.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `17` tests.
- Profile security page tests passed with `3` tests.
- Credential password visibility state and input type mapping are covered without requiring Vue refs, template event binding, aria binding, icon rendering, or translated copy in pure model tests.

### Profile Security Provider Hint Policy Correction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`

Policy:

- Provider-managed credential guidance must use the normalized identity provider hint policy.
- Google, non-local third-party providers, and local email credentials must resolve to their own existing hint keys through `resolveAuthSourceSummaryHintKey`.
- ProfileSecurityCredentialsSection must keep translation rendering in the component and must not hard-code Google guidance for every provider-managed credential state.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`
- `node scripts/check-complexity-budget.mjs`
- `git diff --check`

Result:

- Profile settings model tests passed with `17` tests.
- Profile security page tests passed with `3` tests.
- Provider-managed credential hint rendering now reuses the existing provider hint key policy instead of always rendering the Google hint.

### Profile Security Dialog State Ref Consolidation

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`

Policy:

- Credential verification dialog state must be held as one `CredentialVerificationDialogState` ref.
- Open state, action, verification token, and pending action must be assigned together through the existing dialog state factories.
- ProfileSecurityCredentialsSection must keep template binding, verification bridge calls, toast dispatch, form reset, emit calls, and auth store refresh in the component.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Profile settings model tests passed with `17` tests.
- Profile security page tests passed with `3` tests.
- The credentials component no longer maintains separate refs for dialog open state, action, verification token, and pending action.

### Profile Security Password Submit Error Key Extraction

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Password-change blocker to toast translation-key selection must live in the pure profile settings model.
- ProfileSecurityCredentialsSection must keep toast dispatch, translated rendering, verification bridge calls, loading state, and dialog mutation in the component.
- Busy and provider-managed blockers must remain silent returns; password mismatch and too-short blockers must return their existing profile translation keys.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Profile settings model tests passed with `17` tests.
- Profile security page tests passed with `3` tests.
- Password-change submit feedback key selection is covered without requiring toast dispatch, vue-i18n, verification bridge calls, loading state, or dialog runtime in pure model tests.

### Profile Security Credentials Provider Label Policy Reuse

Changed files:

- `src/components/profile/ProfileSecurityCredentialsSection.vue`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Provider-managed credential status labels must reuse `resolveAuthSourceSummaryLabel`.
- Google must show the Google auth source label, local credentials must show the email auth source label, and non-local providers must prefer the concrete provider label when available.
- Empty third-party provider labels must fall back to the existing generic third-party auth source label.

Validation:

- `node scripts/run-vitest.mjs run src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Profile settings model tests passed with `17` tests.
- Profile security page tests passed with `3` tests.
- Credentials provider-managed status now shares the same provider label policy as the broader profile security page.

### Profile Security MFA Provider Label Policy Reuse

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`

Policy:

- MFA auth source summary labels must reuse `resolveAuthSourceSummaryLabel`.
- Credentials and MFA panels must apply the same Google, local email, concrete third-party provider, and generic third-party fallback behavior.
- ProfileSecurityMfaSection must keep translation rendering and account metadata composition in the component.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `3` tests.
- Profile settings model tests passed with `17` tests.
- Profile security page tests passed with `3` tests.
- MFA auth source summary now shares the provider label policy used by Credentials and the broader profile security page.

### Profile Security Identity Provider Label Policy Extraction

Changed files:

- `src/components/profile/securityMfaModel.ts`
- `src/views/profile-settings/profileSettingsModel.ts`
- `src/views/profile-settings/__tests__/profileSettingsModel.spec.ts`

Policy:

- Human-readable identity provider label formatting must live in the shared profile settings model.
- Security MFA model must reuse the shared formatter for local email labels, known provider labels, and title-cased custom provider labels.
- ProfileSecurityMfaSection must keep account metadata composition and translated fallback copy in the component.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `3` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Identity provider label formatting is now shared by Profile Settings and MFA-specific model code.

### Profile Security Linked Provider Label Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- Linked identity provider list collection, de-duplication, formatting, and fallback selection must live in the MFA model.
- ProfileSecurityMfaSection must keep provider source selection and translated label inputs in the component.
- Linked provider labels must reuse the shared identity provider formatter for local email labels, known provider labels, and title-cased custom provider labels.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `5` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Linked provider label building is now covered as a pure MFA model policy, including formatted de-duplication and empty-list fallback behavior.

### Profile Security MFA Status Copy Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- MFA method summary, status label, and status hint selection must live in the MFA model.
- ProfileSecurityMfaSection must keep status source selection, localized method mapping, and translated label inputs in the component.
- Loading, pending setup, enabled, disabled, backup-code count, and method-list branches must be covered by pure model tests.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `8` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- MFA status copy selection is now covered as pure model policy for loading, pending setup, enabled, disabled, backup-code count, and method-list branches.

### Profile Security MFA Recovery Submit Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- MFA recovery verification submit eligibility must live in the MFA model.
- Disable-MFA and regenerate-backup-code forms must reuse the same code/password eligibility rule.
- Verification code input must be trimmed for eligibility; password input must be accepted as entered.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `9` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Disable-MFA and regenerate-backup-code submit eligibility now share a pure model policy for empty, whitespace-only, code, and password cases.

### Profile Security MFA Recovery Payload Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- MFA recovery verification payload normalization must live in the MFA model.
- Disable-MFA and regenerate-backup-code API calls must reuse the same code/password payload builder.
- Verification code must be trimmed and converted to `undefined` when empty; password must preserve user-entered whitespace and convert only the empty string to `undefined`.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `10` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Disable-MFA and regenerate-backup-code API calls now share a pure model payload policy for trimmed code, omitted empty values, and preserved password whitespace.

### Profile Security Passkey Device Name Payload Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- Passkey registration device-name payload normalization must live in the MFA model.
- WebAuthn registration start and finish calls must receive the same normalized device name.
- Device names must be trimmed and converted to `undefined` when empty or whitespace-only.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `11` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Passkey registration now uses a pure model policy for trimmed device names and empty/whitespace-only omission.

### Profile Security TOTP Verification Code Payload Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- TOTP verification-code payload normalization must live in the MFA model.
- ProfileSecurityMfaSection must keep empty-code warning, loading state, API call, and toast handling in the component.
- Verification codes must be trimmed before validation and submission.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `12` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- TOTP setup verification now uses a pure model payload policy for trimmed codes and empty/whitespace-only validation.

### Profile Security MFA Clipboard Text Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- MFA clipboard text construction must live in the MFA model.
- ProfileSecurityMfaSection must keep clipboard API calls, empty-text skip behavior, toast dispatch, and translated success copy in the component.
- TOTP secret and otpauth URL clipboard text must fall back to an empty string when missing; backup codes must be joined with newline separators.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `13` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- MFA copy actions now use pure model clipboard text policies for missing TOTP values and newline-joined backup codes.

### Profile Security Passkey Draft State Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- Passkey draft-name map updates, draft-name removal, and rename payload selection must live in the MFA model.
- ProfileSecurityMfaSection must keep DOM input event extraction, confirmation dialogs, API calls, toast dispatch, and status refresh in the component.
- Rename payloads must trim draft values, reject empty names, and reject unchanged names before calling the WebAuthn credential update API.
- `fetchStatus` passkey draft hydration remains in the component because GitNexus marks `fetchStatus` as a CRITICAL security-flow dependency.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `16` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Passkey draft state mutation and rename payload selection are now covered as pure model policies while status refresh behavior remains unchanged.

### Profile Security TOTP Cancel State Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- TOTP setup cancel state selection must live in the MFA model.
- ProfileSecurityMfaSection must keep template event binding and ref assignment in the component.
- Canceling a pending backend setup must keep the setup payload available while hiding the setup UI and clearing the verification code.
- Canceling a non-pending setup must clear the setup payload, hide the setup UI, and clear the verification code.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `17` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- TOTP cancel behavior is now covered as a pure state policy without moving API setup, verification, toast, or refresh side effects out of the component.

### Profile Security MFA Clipboard Eligibility Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- MFA clipboard copy eligibility must live in the MFA model.
- ProfileSecurityMfaSection must keep `navigator.clipboard` calls, toast dispatch, and translated success or error copy in the component.
- Empty and whitespace-only clipboard text must be skipped before invoking the browser clipboard API.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `18` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Clipboard copy eligibility is now covered as a pure model policy while browser clipboard side effects remain in the component.

### Profile Security MFA Backup Code Response Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- MFA backup-code response normalization must live in the MFA model.
- TOTP verification and backup-code regeneration must share the same `null` or missing backup-code fallback behavior.
- ProfileSecurityMfaSection must keep verification API calls, regeneration API calls, toast dispatch, form reset, and status refresh in the component.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `19` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Backup-code response fallback behavior is now covered as a pure model policy for array, `null`, and missing values.

### Profile Security MFA Success State Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- MFA success-state reset rules must live in the MFA model.
- TOTP verification success must normalize returned backup codes, clear the verification code, clear setup payload, and hide setup UI.
- Backup-code regeneration success must normalize returned backup codes and clear recovery verification inputs.
- MFA disable success must clear disable verification inputs, backup codes, setup payload, and setup UI.
- ProfileSecurityMfaSection must keep API calls, toast dispatch, loading flags, and status refresh in the component.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `22` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Success-state reset behavior is now covered as pure model policy across TOTP verification, backup-code regeneration, and MFA disable flows.

### Profile Security Passkey Registration Success State Policy Extraction

Changed files:

- `src/components/profile/ProfileSecurityMfaSection.vue`
- `src/components/profile/securityMfaModel.ts`
- `src/components/profile/__tests__/securityMfaModel.spec.ts`

Policy:

- Passkey registration success-state reset rules must live in the MFA model.
- Successful passkey registration must clear the device-name draft after WebAuthn registration is finished.
- ProfileSecurityMfaSection must keep WebAuthn support checks, ceremony API calls, credential serialization, toast dispatch, loading flags, and status refresh in the component.

Validation:

- `node scripts/run-vitest.mjs run src/components/profile/__tests__/securityMfaModel.spec.ts src/views/profile-settings/__tests__/profileSettingsModel.spec.ts src/views/__tests__/ProfileSecurityPage.spec.ts --maxWorkers=1`

Result:

- Security MFA model tests passed with `23` tests.
- Profile settings model tests passed with `18` tests.
- Profile security page tests passed with `3` tests.
- Passkey registration draft reset is now covered as pure model policy while WebAuthn runtime work remains in the component.

### Schedule Date Jump Input Policy Extraction

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`

Policy:

- Schedule date-jump value selection and date-input parsing must live in the schedule page model.
- Month view must expose the first day of the visible calendar month as the date-jump value.
- Week and day views must expose the planner anchor date as the date-jump value.
- Empty, missing, and invalid date-input values must not trigger calendar navigation.
- SchedulePage must keep DOM input event extraction, selected-day mutation, and calendar navigation state mutation in the page component.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts src/views/__tests__/SchedulePage.spec.ts --maxWorkers=1`

Result:

- Schedule page model and page tests passed with `20` tests.
- Date-jump value generation and input parsing are now covered as pure model policy while page-level navigation remains in SchedulePage.

### Schedule Agenda Jump And Day A11y Policy Extraction

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`

Policy:

- Agenda jump target resolution must live in the schedule page model.
- Today agenda jumps must resolve from the injected current date.
- Next agenda jumps must resolve from the first upcoming event start time.
- Missing or invalid upcoming-event start values must not trigger calendar navigation.
- Calendar day aria-label construction must live in the schedule page model.
- SchedulePage must keep planner-view mutation, calendar navigation state mutation, and translation lookup in the page component.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts src/views/__tests__/SchedulePage.spec.ts --maxWorkers=1`

Result:

- Schedule page model and page tests passed with `22` tests.
- Agenda jump resolution and calendar day aria-label generation are covered as pure model policy while navigation side effects remain in SchedulePage.

### Schedule Summary Label Policy Extraction

Changed files:

- `src/views/SchedulePage.vue`
- `src/views/schedule/schedulePageModel.ts`
- `src/views/schedule/__tests__/schedulePageModel.spec.ts`

Policy:

- Schedule agenda summary selection must live in the schedule page model.
- Today event counts must take precedence over upcoming event counts in the agenda summary.
- Empty agenda summaries must fall back to the translated no-upcoming label.
- Planner summary selection must live in the schedule page model.
- Month planner summaries must use the visible month and active category.
- Day and week planner summaries must use the selected day label with either an event count or no-events label.
- Agenda card title and meta fallback rules must live in the schedule page model.
- SchedulePage must keep translation lookup, date formatting, and reactive state reads in the page component.

Validation:

- `node scripts/run-vitest.mjs run src/views/schedule/__tests__/schedulePageModel.spec.ts src/views/__tests__/SchedulePage.spec.ts --maxWorkers=1`

Result:

- Schedule page model and page tests passed with `24` tests.
- Summary label, spotlight title, and spotlight meta fallback rules are covered as pure model policy while formatting and translation remain in SchedulePage.

### Router Contract Resource Redirect Policy Extraction

Changed files:

- `src/router/index.ts`
- `src/router/routeSecurityPolicy.ts`
- `src/router/__tests__/routeSecurityPolicy.spec.ts`

Policy:

- Invalid contract-resource route redirect construction must live in the route security policy module.
- Contract resource ID validation must keep using the first array route parameter value.
- Invalid guarded resource routes must redirect to `not-found` with `pathMatch` derived from the attempted path.
- Invalid guarded resource redirects must preserve query and hash state.
- Valid guarded resource routes and explicitly exempt id-param routes must not be redirected by the contract-resource policy.
- Router guard code must consume the policy result before authentication and sensitivity checks.

Validation:

- `node scripts/run-vitest.mjs run src/router/__tests__/routeSecurityPolicy.spec.ts src/router/__tests__/metaContract.spec.ts --maxWorkers=1`

Result:

- Route security policy and router meta contract tests passed with `9` tests.
- Invalid contract-resource redirect behavior is now covered as pure route policy while the global router guard keeps only orchestration logic.

### Router Auth Guard Decision Policy Extraction

Changed files:

- `src/router/index.ts`
- `src/router/routeSecurityPolicy.ts`
- `src/router/__tests__/routeSecurityPolicy.spec.ts`

Policy:

- Route security-level fallback selection must live in the route security policy module.
- Auth store loading policy must live in the route security policy module.
- Non-public routes must load and initialize the auth store before guard decisions.
- Guest-only public routes must load the auth store without initialization.
- Public non-guest routes must not load the auth store for guard decisions.
- Login redirect payload construction must live in the route security policy module.
- Unauthenticated `requiresAuth` and `sensitive` routes must redirect to login with the attempted `fullPath`.
- Authenticated guest-only routes must redirect home unless the target is a sensitive reauth login route.
- Router guard code must keep async authz freshness checks and risk-mode handling as orchestration.

Validation:

- `node scripts/run-vitest.mjs run src/router/__tests__/routeSecurityPolicy.spec.ts src/router/__tests__/metaContract.spec.ts --maxWorkers=1`

Result:

- Route security policy and router meta contract tests passed with `11` tests.
- Auth guard decision rules are now covered as pure route policy while store loading and freshness side effects remain in the router guard.

### API Transport Success Contract Coverage

Classification:

- `contract protection`

Mobility effect:

- Protects the API transport result contract before any future transport replacement.
- Does not require the current `apiClient` internals or file structure to remain permanent.

Replacement condition:

- None. These assertions describe public transport semantics and remain valid across a compatible transport rewrite.

Changed files:

- `src/api/__tests__/transport.spec.ts`

Policy:

- API transport URL and response contracts must be covered before changing shared transport behavior.
- `buildRequestUrl` changes require broader API-client validation because GitNexus reports HIGH impact through `request`, `get`, and forbidden-response flows.
- Existing relative endpoint concatenation behavior remains unchanged in this slice.
- Cache-key formatting must remain stable as `api:{method}:{url}`.
- Successful `204` and `304` responses must parse to `undefined`.
- Successful `text`, `json`, `blob`, and raw `response` response types must be covered as transport contracts.

Validation:

- `node scripts/run-vitest.mjs run src/api/__tests__/transport.spec.ts --maxWorkers=1`

Result:

- API transport helper tests passed with `6` tests.
- Shared transport behavior was not changed because the candidate implementation symbols were HIGH impact; this slice strengthens the interface-management safety net first.

### API Error Mapping Contract Coverage

Classification:

- `contract protection`
- `implementation hardening`

Mobility effect:

- Standardizes error semantics that callers depend on while fixing the current body-read fallback.
- The test protects `ApiError` behavior and response classification, not the private parser shape.

Replacement condition:

- Rewrite the body-read fallback guard when error response parsing moves behind a transport adapter, provided HTML/non-JSON upstream failures still map to standardized `ApiError` output.

Changed files:

- `src/api/client/error-mapping.ts`
- `src/api/__tests__/errorMapping.spec.ts`

Policy:

- API error mapping must preserve standardized `ApiError` status, code, details, and localized message selection.
- Wrapped success responses, paginated envelopes, error envelopes, validation arrays, detail-object errors, rate-limit headers, and upstream HTML tunnel failures must be covered as interface contracts.
- `handleErrorResponse` and `readErrorBodyText` changes require focused API-client regression because GitNexus reports HIGH impact through `request`, forbidden-response, and challenge flows.
- Non-JSON error responses must fall back to text classification without leaking native body-consumption exceptions.
- Rate-limit errors must use the `Retry-After` header for localized retry copy and toast reporting.

Validation:

- `node scripts/run-vitest.mjs run src/api/__tests__/client.spec.ts src/api/__tests__/transport.spec.ts src/api/__tests__/errorMapping.spec.ts --maxWorkers=1`

Result:

- API client, transport, and error-mapping tests passed with `39` tests.
- Native HTML/non-JSON error responses now produce standardized `ApiError` results instead of `Response.clone` body-consumption failures.

### Auth Store Runtime Authorization Summary Recovery

Classification:

- `contract protection`
- `architecture mobility`

Mobility effect:

- Moves session-summary authorization recovery into the BFF session contract instead of requiring persistent frontend token state.
- Keeps future auth-store replacement constrained by session semantics rather than the current Pinia implementation shape.

Replacement condition:

- None. The no-persistent-token and BFF session-summary semantics are security contracts.

Changed files:

- `src/api/authService.ts`
- `src/services/authSessionController.ts`
- `src/services/__tests__/authSessionController.spec.ts`
- `src/stores/__tests__/auth.spec.ts`

Policy:

- Auth state remains BFF-first: browser runtime must not expose or persist an access token.
- Session summary recovery must restore user identity, session expiry, permission version, permissions, and roles into the in-memory authorization cache when the backend provides them.
- Role recovery must accept top-level session roles and fall back to `user.roles` when the backend returns roles inside the session user object.
- `fetchCurrentUser` and `establishSession` changes require focused auth-store and auth-session-controller regression; GitNexus reports HIGH impact through profile security and profile settings auth recovery flows.
- `getRuntimeAccessToken()` must continue to return `null` after session-summary recovery.

Validation:

- `node scripts/run-vitest.mjs run src/services/__tests__/authSessionController.spec.ts src/stores/__tests__/auth.spec.ts --maxWorkers=1`

Result:

- Auth session controller tests passed with `10` tests.
- Auth store tests passed with `15` tests.
- BFF session summary recovery now preserves backend-provided authorization summaries without introducing a browser access-token state.

### Performance DOM Read/Write Scheduling Contract

Classification:

- `contract protection`
- `temporary guard`

Mobility effect:

- Protects the read/write scheduling behavior needed by current dropdown positioning without freezing AppNavbar topology.
- The guard is intentionally attached to the shared scheduling contract instead of mounting the large layout component.

Replacement condition:

- Rewrite or delete the temporary guard when AppNavbar positioning migrates to a dedicated positioning adapter with its own public contract.

Changed files:

- `src/utils/__tests__/performance.spec.ts`

Policy:

- DOM position updates must read layout synchronously and write layout-dependent styles on the next animation frame.
- `scheduleDOMUpdate` must pass the read snapshot into the deferred write without re-reading layout during the write phase.
- `scheduleDOMUpdate` changes require focused AppNavbar positioning regression because GitNexus reports LOW impact through `updateDropdownPosition`.

Validation:

- `node scripts/run-vitest.mjs run src/utils/__tests__/performance.spec.ts --maxWorkers=1`

Result:

- Performance utility tests passed with `12` tests.
- The AppNavbar dropdown positioning primitive is now covered for read/write separation without mounting the full layout component.

### Release Static Gate Complexity Budget Enforcement

Classification:

- `contract protection`

Mobility effect:

- Protects maintainability budgets at the release boundary rather than asserting current source topology.
- Keeps future architecture replacement possible as long as the replacement stays within declared complexity limits.

Replacement condition:

- None. Complexity gate participation is a release contract.

Changed files:

- `scripts/validate-release.mjs`
- `src/__tests__/scripts/validate-release.spec.ts`

Policy:

- Release static gates must enforce the same complexity budget used during local maintainability checks.
- Hook and prepush validation must run `check:complexity-budget` before the lightweight release contract specs.
- Full local, candidate, and production static validation must run `check:complexity-budget` after unit tests and before build/bundle gates.
- `runStaticGateStage` and `runHookStaticGateStage` changes require focused release-helper regression; GitNexus reports LOW impact through the validation script `main` entry.

Validation:

- `node scripts/run-vitest.mjs run src/__tests__/scripts/validate-release.spec.ts --maxWorkers=1`

Result:

- Release validation helper tests passed with `8` tests.
- Complexity budget checks are now part of both hook static gates and full release static gates.

### Release Frontend Pattern Boundary Enforcement

Classification:

- `contract protection`
- `architecture mobility`

Mobility effect:

- Pushes browser API usage behind shared wrappers and release audit gates so implementation movement does not duplicate raw observer and idle boundaries.
- Converts `AppearancePresetPicker` observer usage into a shared visibility boundary instead of hardening a component-local raw observer.

Replacement condition:

- None for the audit gate. Component replacement is allowed when it continues to use the shared visibility boundary or a declared successor adapter.

Changed files:

- `scripts/validate-release.mjs`
- `src/__tests__/scripts/validate-release.spec.ts`
- `src/components/appearance/AppearancePresetPicker.vue`

Policy:

- Release static gates must run the `frontend-patterns` audit to block unaudited `v-html`, raw idle callbacks, raw observer construction, and non-allowlisted Vapor components.
- Hook and full static validation must run `bun run audit:repo --only=frontend-patterns` after complexity budget checks and before heavier build gates.
- Appearance preview reveal observers must use `createVisibilityObserver()` instead of direct `new IntersectionObserver()` construction.
- `ensureObserver` and `bindPreview` changes require focused frontend-pattern regression; GitNexus reports LOW impact limited to `AppearancePresetPicker`.

Validation:

- `bun run audit:repo --only=frontend-patterns`
- `node scripts/run-vitest.mjs run src/__tests__/scripts/validate-release.spec.ts --maxWorkers=1`

Result:

- Frontend pattern audit passed with `0` issues.
- Release validation helper tests passed with `8` tests.
- Existing observer-boundary drift in `AppearancePresetPicker` was moved back to the shared modern API wrapper.

### Appearance Preset Picker Component Contract Coverage

Classification:

- `contract protection`
- `implementation hardening`

Mobility effect:

- Protects observable preset application outcomes and failure handling while still testing the current component entrypoint.
- Does not make SettingsPanel integration or deep component placement the long-term boundary.

Replacement condition:

- Rewrite the component-level guard when appearance preset selection is moved behind a view-model or appearance command adapter; preserve active-preset no-op, failure reporting, and successful application semantics.

Changed files:

- `src/components/appearance/__tests__/AppearancePresetPicker.spec.ts`

Policy:

- Appearance preset reveal behavior must use the shared visibility observer boundary and remain covered at component level.
- Preset application must call `applyAppearancePreset(preset, resolvedTheme)` before mutating settings state.
- Runtime preset application failures must report `settings.appearanceRuntimeFailed` without mutating the selected preset.
- Clicking the active preset must be a no-op.
- `handleApplyPreset` changes require focused component regression; GitNexus reports LOW impact for the local picker behavior.

Validation:

- `node scripts/run-vitest.mjs run src/components/appearance/__tests__/AppearancePresetPicker.spec.ts --maxWorkers=1`

Result:

- Appearance preset picker tests passed with `4` tests.
- The picker now has direct component-level coverage instead of relying only on `SettingsPanel` integration coverage.

### Appearance Component Barrel Boundary

Classification:

- `architecture mobility`
- `contract protection`

Mobility effect:

- Creates a public import boundary for appearance primitives and supports small-batch migration away from deep imports.
- Keeps existing deep imports valid during migration instead of forcing a broad rewrite.

Replacement condition:

- None. The barrel is the intended migration boundary; exports change only through a focused contract update.

Changed files:

- `src/components/appearance/index.ts`
- `src/components/appearance/__tests__/appearancePrimitives.spec.ts`

Policy:

- Appearance primitives must expose a directory-level barrel like other component domains.
- Barrel exports must include the preset picker, control primitives, and page shell primitives.
- Existing deep imports remain valid; broad import rewrites must happen in separate focused slices.
- The barrel must be covered by component primitive tests to prevent accidental export drift.

Validation:

- `node scripts/run-vitest.mjs run src/components/appearance/__tests__/appearancePrimitives.spec.ts src/components/appearance/__tests__/appearanceControls.spec.ts src/components/appearance/__tests__/AppearancePresetPicker.spec.ts --maxWorkers=1`

Result:

- Appearance component tests passed with `10` tests.
- The appearance component directory now has an explicit public import boundary without changing existing consumers.

### Release Worktree Change Evidence Coverage

Classification:

- `contract protection`
- `release verification`

Mobility effect:

- Release summaries now classify current worktree changes, not only the resolved committed git range.
- Local validation evidence supports pre-commit use without under-reporting modified, staged, or untracked files.

Replacement condition:

- None. Worktree-aware change evidence is a release contract for local validation modes.

Changed files:

- `scripts/validate-release.mjs`
- `src/__tests__/scripts/validate-release.spec.ts`

Policy:

- Release change evidence must preserve the resolved `Git Range`.
- Changed-file classification must merge resolved git range files, staged files, unstaged files, and untracked non-ignored files.
- Duplicate paths must be removed before release focus classification.
- Local agent files excluded or removed by repository policy must not appear in final validation summaries.

Validation:

- `node scripts/run-vitest.mjs run src/__tests__/scripts/validate-release.spec.ts --maxWorkers=1`
- `bun run validate:release:hook`

Result:

- Release validation helper tests passed with `9` tests.
- Hook release validation passed and final summary listed current worktree focus areas for route/UI/readiness, auth/session/data flow, and validation contract changes.

### Audit Runner Parity Evidence

Classification:

- `contract protection`
- `release verification`

Mobility effect:

- Audit modules now share severity classification while preserving module status semantics.
- Build audit local validation now receives the required contract fallback without weakening production build configuration.
- Audit runner helper imports now avoid CLI side effects while direct `bun run audit:repo` execution still invokes `main`.
- Audit runner module selection and report aggregation now have focused helper coverage.
- Audit runner module execution order and option forwarding now have focused helper coverage.
- Type-check audit now shares command-result status classification while preserving non-zero `vue-tsc` exit failure behavior.
- Test audit now shares command-result status classification while preserving parse-failure and failed-test behavior.
- Lint audit now shares command-result status classification while preserving parsed ESLint issue reporting.
- Dead-code audit now runs Knip with the local audit contract fallback and parses grouped Knip `issues[]` output.
- Knip entry configuration now includes the service worker source entry, removing service-worker internal module false positives.
- Dead-code cleanup removed unused page-title/home fallback modules and direct unused devDependencies while preserving transitive override constraints.

Replacement condition:

- None. Audit runner import safety and local build-audit contract fallback are release validation contracts.

Changed files:

- `scripts/audit/utils.ts`
- `knip.json`
- `package.json`
- `bun.lock`
- `scripts/audit/build.ts`
- `scripts/audit/dead-code.ts`
- `scripts/audit/index.ts`
- `scripts/audit/lint.ts`
- `scripts/audit/test.ts`
- `scripts/audit/type-check.ts`
- `src/__tests__/scripts/audit-utils.spec.ts`
- `src/__tests__/scripts/build-audit.spec.ts`
- `src/__tests__/scripts/dead-code-audit.spec.ts`
- `src/__tests__/scripts/lint-audit.spec.ts`
- `src/__tests__/scripts/audit-runner.spec.ts`
- `src/__tests__/scripts/text-style-audit.spec.ts`
- `src/__tests__/scripts/test-audit.spec.ts`
- `src/__tests__/scripts/type-check-audit.spec.ts`
- `src/composables/usePageTitle.ts`
- `src/fallbacks/homepageFallback.ts`

Policy:

- Error issues must produce `fail`, warning issues must produce `warn`, and info-only or empty issue sets must produce `pass`.
- `runLocalNodeTool` must pass explicit environment overrides to resolved local Node tools.
- Local build audit must set `LOCAL_AUDIT_BUILD=true` and the local contract fallback.
- Importing audit runner helpers must not execute audit modules.
- Module selection must remain case-insensitive.
- Audit report totals must derive from module results without re-running modules.
- Selected audit modules must run in order with the caller-provided audit options.
- Text-style audit must preserve excluded generated-output paths while using shared severity classification.
- Command-backed audits must fail when the underlying command exits non-zero, even when no parser-specific issues are extracted.
- Test audit must fail when Vitest exits non-zero, even when parsed JSON reports zero failed tests.
- Lint audit must fail when ESLint exits non-zero, even when parsed JSON contains no messages.
- Dead-code audit must preserve Knip warning/info severity for parsed findings and fail only when Knip exits non-zero without parsed findings.
- Dead-code cleanup findings must be addressed as a separate source/dependency cleanup task, not hidden by audit parser fallback behavior.
- Service worker internals must remain reachable through `src/sw/index.ts` in Knip entry configuration.
- Remove direct devDependencies reported by Knip only after package-manager why/search evidence shows no direct runtime or script use.

Validation:

- `node scripts/run-vitest.mjs run src/__tests__/scripts/audit-runner.spec.ts src/__tests__/scripts/audit-utils.spec.ts src/__tests__/scripts/build-audit.spec.ts src/__tests__/scripts/text-style-audit.spec.ts --maxWorkers=1`
- `node scripts/run-vitest.mjs run src/__tests__/scripts/audit-utils.spec.ts src/__tests__/scripts/type-check-audit.spec.ts --maxWorkers=1`
- `node scripts/run-vitest.mjs run src/__tests__/scripts/audit-utils.spec.ts src/__tests__/scripts/test-audit.spec.ts --maxWorkers=1`
- `node scripts/run-vitest.mjs run src/__tests__/scripts/audit-utils.spec.ts src/__tests__/scripts/lint-audit.spec.ts --maxWorkers=1`
- `node scripts/run-vitest.mjs run src/__tests__/scripts/audit-utils.spec.ts src/__tests__/scripts/dead-code-audit.spec.ts --maxWorkers=1`
- `bun run audit:repo --only=build`
- `bun run audit:repo --only=dead-code`
- `bun run audit:repo --only=lint`
- `bun run audit:repo --only=text-style`
- `bun run audit:repo --only=type-check`
- `bun run audit:repo --only=css`
- `node scripts/run-vitest.mjs run src/__tests__/scripts/audit-utils.spec.ts src/__tests__/scripts/dead-code-audit.spec.ts src/__tests__/scripts/lint-audit.spec.ts src/__tests__/scripts/test-audit.spec.ts src/__tests__/scripts/type-check-audit.spec.ts --maxWorkers=1`
- `git diff --check`

Result:

- Audit helper tests passed with `13` tests.
- Command-summary and type-check audit tests passed with `9` tests.
- Command-summary and test audit tests passed with `8` tests.
- Command-summary and lint audit tests passed with `8` tests.
- Dead-code audit tests passed with `11` tests.
- Command-backed audit focused suite passed with `18` tests across `5` files.
- Build audit passed with `0` issues.
- Dead-code audit passed with `0` issues after Knip entry correction, unused module deletion, and direct unused devDependency removal.
- Lint audit passed with `0` issues.
- CSS audit passed with `0` issues.
- Text-style audit passed with `0` issues.
- Type-check audit passed with `0` issues.
- GitNexus change detection still reports the pre-existing full dirty worktree as cumulative risk; the latest unstaged read on `2026-06-17` reported `critical` with `59` files, `88` symbols, and `26` affected flows.

### Release Route Metadata Alignment Coverage

Classification:

- `contract protection`
- `release verification`

Mobility effect:

- Release smoke and production route matrices now validate against the actual Vue Router metadata.
- Route coverage evolves in the release contract without silently diverging from runtime security classification.

Replacement condition:

- None. Release route metadata alignment is a route and permission safety contract.

Changed files:

- `src/__tests__/scripts/release-route-contract.spec.ts`

Policy:

- Authenticated release route definitions must resolve to existing Vue Router routes, except documented sample-data placeholders.
- Authenticated release route `securityLevel` must match Vue Router `meta.securityLevel`; omitted release levels default to `authenticated`.
- Sensitive release routes must resolve to Vue Router `dataSensitivity=security`.
- Guest release routes that expect a login redirect must resolve to protected Vue Router routes.
- Guest release routes that do not expect a login redirect must resolve to Vue Router `securityLevel=public` and `dataSensitivity=none`.

Validation:

- `node scripts/run-vitest.mjs run src/__tests__/scripts/release-route-contract.spec.ts --maxWorkers=1`

Result:

- Release route contract tests passed with `12` tests.
- Authenticated and guest release matrices are now checked against runtime router metadata before release validation passes.

### Bundle Budget Chunk Classification

Classification:

- `contract protection`
- `release verification`

Mobility effect:

- Separates JavaScript execution chunk risk from CSS entry chunk risk at the release gate.
- Keeps total JS, total CSS, image, and initial-home asset budgets as delivery constraints while allowing the CSS entry boundary to be governed by its own explicit ceiling.

Replacement condition:

- None. Split largest-chunk classification is a release validation contract.

Changed files:

- `scripts/lib/bundle-budget.js`
- `scripts/config/bundle-budget.json`
- `src/__tests__/scripts/bundle-budget.spec.ts`

Policy:

- Bundle budget metrics must report aggregate largest chunk diagnostics without using that mixed JS/CSS value as the blocking gate when typed chunk ceilings exist.
- Release bundle validation must enforce `maxLargestJsChunkBytes` for executable chunk pressure.
- Release bundle validation must enforce `maxLargestCssChunkBytes` for CSS entry and extracted style pressure.
- Budget violations must include stable reason codes and locator paths for JS, CSS, mixed chunk, and initial-home asset failures.
- `collectBundleBudgetMetrics`, `analyzeBundleBudget`, and `formatBundleBudgetReport` changes require focused bundle-budget regression; GitNexus reports LOW impact limited to `scripts/check-bundle-budget.mjs`.

Validation:

- `node scripts/run-vitest.mjs run src/__tests__/scripts/bundle-budget.spec.ts --maxWorkers=1`
- `bun run check:bundle-budget`

Result:

- Bundle budget helper tests passed with `4` tests.
- Bundle budget check passed on the existing build output.
- Current build output records `largestJsChunkBytes=180.5 KiB / 249.9 KiB` and `largestCssChunkBytes=293.9 KiB / 311.0 KiB`.

### Documentation Text Style Gate

Classification:

- `contract protection`
- `release verification`

Mobility effect:

- Converts global documentation wording rules into a repository audit boundary.
- Keeps architecture plans, readiness docs, and asset docs aligned to implementation-oriented language before release validation passes.

Replacement condition:

- None. Documentation text style enforcement is a repository policy contract.

Changed files:

- `scripts/audit/text-style.ts`
- `scripts/audit/index.ts`
- `scripts/validate-release.mjs`
- `src/__tests__/scripts/validate-release.spec.ts`
- `docs/frontend-release-readiness.md`
- `VALIDATION.md`
- `public/icons/README.md`

Policy:

- Markdown headings must not use audit-blocked discussion-style labels, question headings, or equivalent Chinese labels.
- Markdown text must not use audit-blocked advisory or speculative wording.
- Text style audit must run in hook and full release static gates after complexity budget checks and before frontend pattern checks.
- Existing documentation drift must be rewritten to constraints, observable state, failure behavior, and verification requirements.

Validation:

- `bun run audit:repo --only=text-style`

Result:

- Text style audit passed with `0` issues.
- Markdown docs no longer contain the scanned advisory or speculative wording patterns outside excluded generated directories.

### Visual Runtime Retirement and Home Performance

Date:

- `2026-07-28`

Classification:

- `runtime deletion`
- `locale stability`
- `rendered accessibility`
- `performance evidence`

Completed scope:

- Removed `ParticleBackground`, `MascotFlightBackground`, `DeskPet`, the particle engine, DeskPet workflow helpers, exclusive styles, focused tests, and the build-time DeskPet boundary gate.
- Removed the visual-runtime mounts, lazy imports, settings controls, store actions and types, workflow hints, and locale keys.
- Retained public expression assets used by avatars, branding, and direct public URLs.
- Replaced the invalid `scheduleTask()` cancellation assignment in `HomePage.vue` with a page-local identity token while preserving the shared Promise contract.
- Restored viewport-sized desktop rail geometry, removed Letterbook padding from the wide rail, and extended the compact document-flow rail through `1024 px`.
- Constrained homepage hero actions to a stable `44 px` block size with centered labels.
- Rewrote Home and Settings copy in `en`, `zh-CN`, `zh-TW`, and `ja` with shorter labels and descriptions.

Compatibility window:

- Settings hydration deletes persisted `backgroundEffect`, `mascotBackground`, and `deskPet` fields.
- Hydration removes `desk-pet:last-position`.
- Cache cleanup retains the `desk-pet:` prefix for one release. Delete this tombstone after the compatibility release has completed and telemetry or support evidence shows no remaining persisted clients.

Rendered acceptance evidence:

- Locale switching completed across `en`, `zh-CN`, `zh-TW`, and `ja` with no Vue exception or error overlay.
- Selected update-strategy text measured `4.57:1` contrast in light mode and `8.15:1` in dark mode, unchanged on hover.
- Desktop and mobile hero actions measured `44 px` high with zero horizontal and vertical inset delta.
- Desktop rail measured `1352 px` total height, `812 px` sticky height, `540 px` travel, four reachable panels, and `0 px` document-flow gap before posts.
- At `769 px` and `1024 px`, the rail rendered as a single-column grid with all four panels reachable and `0 px` horizontal overflow. At `1025 px`, sticky travel reached the final panel with a `-3075 px` track transform.
- Removed visual runtimes produced zero matching DOM nodes and no production chunks.

Playwright cold-load evidence:

Five fresh contexts per profile ran against a production preview with service workers blocked. Values are median / p75.

| Metric            |  Desktop `1440x900` | Mobile `390x844 @3x` |
| ----------------- | ------------------: | -------------------: |
| TTFB              |        `3.4 / 4 ms` |       `3.5 / 3.6 ms` |
| DOMContentLoaded  |  `164.3 / 187.7 ms` |   `145.2 / 154.4 ms` |
| Load              |  `178.2 / 202.9 ms` |     `151.4 / 265 ms` |
| FCP               |      `124 / 136 ms` |        `88 / 104 ms` |
| LCP               |    `2180 / 2336 ms` |       `400 / 416 ms` |
| CLS               |             `0 / 0` |              `0 / 0` |
| Long-task total   |      `508 / 542 ms` |       `416 / 447 ms` |
| Long-task maximum |      `296 / 311 ms` |       `202 / 223 ms` |
| Resources         |           `94 / 94` |            `97 / 97` |
| Transfer          | `481.6 / 481.6 KiB` |  `537.5 / 537.5 KiB` |
| Decoded resources |   `1.41 / 1.41 MiB` |    `1.46 / 1.46 MiB` |
| DOM elements      |       `1099 / 1099` |        `1104 / 1104` |
| JS heap used      |   `8.27 / 8.29 MiB` |    `8.32 / 8.32 MiB` |
| Task duration     |    `829 / 837.9 ms` |   `684.1 / 721.4 ms` |
| Script duration   |      `18.7 / 20 ms` |     `15.7 / 15.8 ms` |
| Layout duration   |  `498.8 / 524.8 ms` |     `427 / 438.4 ms` |

Desktop LCP ranged from `2132 ms` to `2460 ms`. The late candidate was the aggregate-data hero image under `/api/v1/media/.../thumbnail`; mobile retained the initial snapshot hero and ranged from `372 ms` to `492 ms`. Desktop CLS reached `0.10` in one run while median and p75 remained `0`. Each profile loaded `74` scripts totaling about `315 KiB`; stylesheet links totaled about `116 KiB`.

Lighthouse evidence:

`bun run test:perf` completed under the repository audit environment.

| Route   | Score |       FCP |       LCP | CLS |      TBT | Main thread |    Transfer |
| ------- | ----: | --------: | --------: | --: | -------: | ----------: | ----------: |
| Home    |  `61` | `2490 ms` | `5807 ms` | `0` | `551 ms` |   `2416 ms` | `532.8 KiB` |
| Explore |  `82` | `2337 ms` | `3165 ms` | `0` | `350 ms` |   `1725 ms` |   `415 KiB` |
| Search  |  `86` | `2207 ms` | `2893 ms` | `0` | `301 ms` |   `1812 ms` | `413.9 KiB` |

The Home audit reports about `600 ms` of render-blocking savings, `23 KiB` of unused JavaScript, `12 KiB` of image-delivery savings, and `2.4 s` of main-thread work. Loopback TTFB remains `2-4 ms`; homepage rendering and scheduling own the primary delay.

Optimization queue:

1. `P0 - Scene startup`: move `scheduleSceneSetup()` and `setupSceneTriggers()` work behind the first stable paint and section proximity. Preserve immediate setup when the rail is already near the viewport. Acceptance: Home Lighthouse TBT at or below `250 ms`, main-thread work below `1.8 s`, and Playwright p75 long-task maximum below `200 ms`.
2. `P0 - Stable hero LCP`: keep one above-fold LCP candidate from initial HTML through aggregate-data replacement. Preload the final candidate URL, retain explicit dimensions, and keep eager loading plus high fetch priority limited to that candidate. Acceptance: Home Lighthouse LCP at or below `2.5 s`, Playwright p75 LCP below `1.0 s`, and CLS at or below `0.05`.
3. `P1 - Initial request graph`: reduce the `68-74` initial script requests by consolidating microchunks and enabling targeted preload only for the critical Vue, router, i18n, and Home path. Acceptance: p75 initial script requests at or below `45` without increasing total JavaScript transfer or the largest-JavaScript budget.
4. `P1 - Render-blocking CSS`: split above-fold Home and shell rules from below-fold page systems. Keep selected-state contrast tokens and rail geometry in the critical path. Acceptance: Lighthouse render-blocking savings below `250 ms`, stylesheet transfer below `90 KiB`, and no dark/light contrast regression.
5. `P2 - Below-fold DOM and layout`: delay non-visible section trees or apply stable intrinsic sizing and `content-visibility` where interaction and accessibility remain intact. Acceptance: initial DOM below `850` elements, Playwright p75 layout duration below `300 ms`, and all four rail panels remain reachable by keyboard, wheel, touch, and reduced-motion navigation.

Validation contract:

- Run focused Home, Settings, settings-store, StateIndicator, locale-parity, and responsive-style tests for each slice.
- Run `bun run type-check`, `bun run lint:strict`, `bun run check:complexity-budget`, `bun run build`, and `bun run check:bundle-budget`.
- Run five cold Playwright samples per desktop and mobile profile and report median plus p75.
- Run `bun run test:perf` and compare route metrics under the same audit environment.
- Reject any slice that restores the retired visual runtimes, changes the `scheduleTask()` Promise contract, reintroduces a rail document gap, or drops selected text below `4.5:1` contrast.
