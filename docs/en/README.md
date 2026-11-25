# MomiChan

**Posts, photographs, events, and community.**

[简体中文](../../README.md) · [English](README.md)

MomiChan is a content community for fans of Momiyama Himeri. Its home page connects a featured cover, recent posts, photography, events, and discussions through five reading chapters, with access to author pages and personal collections.

This is an independently maintained fan project, unaffiliated with the artist or her agency.

[Live site](https://momichan.com/) · [Local development](#local-development) · [Four themes](#four-themes) · [Architecture](#architecture-and-layout) · [Validation and deployment](#validation-and-deployment)

## Two editions

The two sites live on separate branches of the same repository. Each has its own build, deployment, and page composition.

| Edition       | Branch                                                             | Main experience                                  | First-visit appearance |
| ------------- | ------------------------------------------------------------------ | ------------------------------------------------ | ---------------------- |
| MomiChan      | [`main`](https://github.com/domidoremi/hmrchan-frontend/tree/main) | Reading chapters, posts, photography, and events | Native Minimal, light  |
| MomiChan Next | [`next`](https://github.com/domidoremi/hmrchan-frontend/tree/next) | Photo selection, galleries, lists, and previews  | Material 3, dark       |

**This branch contains the main site (`main`).** Both editions use Vue. The main branch uses a stable release; Next retains the Vue 3.6 RC evaluation track. [`package.json`](../../package.json) and [`bun.lock`](../../bun.lock) define the actual dependencies for this branch.

The main home page header collapses or returns with the reading direction. A floating contents menu provides access to every chapter. Chapter transitions help align the next section while long content remains scrollable. The menu supports keyboard navigation, Escape to close, and focus restoration.

## Pages and features

| Entry                                   | Content                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------ |
| Home `/`                                | Featured content, photography, and links to posts, events, and community |
| Explore `/explore` and search `/search` | Source and content filters, sorting, search, and post details            |
| Authors `/authors`                      | Author profiles, platform sources, and related posts                     |
| Schedule `/schedule`                    | Calendar, event lists, date selection, and saved events                  |
| Community `/community`                  | Discussions, replies, publishing, and local draft recovery               |
| Profile `/profile`                      | Collections, notifications, personal details, devices, and security      |
| About `/about` and contact `/contact`   | Official and social channels, project information, and a contact form    |

Account flows include password sign-in, passkeys, and account recovery. Availability depends on backend services and authentication configuration.

The site can be installed as a PWA. The service worker provides resource caching and an offline fallback; sign-in, submissions, and fresh data still require a network connection and working APIs.

## Four themes

Themes affect page composition, information density, controls, surfaces, and motion. Both editions share preference rules and adapt each theme to their own content layouts.

| Theme          | Main site                                                      | Next                                                                                |
| -------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Native Minimal | Titles and text first, with a single-column recent feed        | Wide photography, aligned galleries, and simple photo controls                      |
| Material 3     | Tonal sections, a modular feed, and grouped events             | Grouped photography, a gallery default, and proportional images in multiple columns |
| Fluent 2       | Grouped commands with authors and events beside the feed       | Photography beside controls, with a list and preview by default                     |
| Carbon         | Compact square-edged indexes, borders, and monospaced metadata | A contact sheet followed by records and previews                                    |

Display settings save light or dark mode, standard or large text, and full or reduced motion. Interface languages are Simplified Chinese, Traditional Chinese, English, and Japanese. An explicitly selected browse view stays in the URL when the theme changes.

See [appearance presets](appearance-presets.md) for defaults, saved-preference migration, and design references. Native Minimal retains the stored ID `apple-native`.

## Local development

### Runtime requirements

| Tool    | Current contract                                     |
| ------- | ---------------------------------------------------- |
| Node.js | `>=26.13.1 <27`; pinned to `26.13.1` in `mise.toml`  |
| Bun     | Package manager pinned to `1.4.4`; minimum `>=1.4.4` |

If you use mise, run `mise install` in the repository to install the versions in [`mise.toml`](../../mise.toml). Use Bun for installation; `bun.lock` is the only dependency lockfile.

### Clone and run

```bash
git clone --branch main https://github.com/domidoremi/hmrchan-frontend.git
cd hmrchan-frontend
bun install --frozen-lockfile
```

For initial configuration, copy [`.env.example`](../../.env.example) to a local `.env.development`:

```powershell
Copy-Item -LiteralPath .env.example -Destination .env.development
```

In Bash or Zsh, use `cp .env.example .env.development`. Then start the application:

```bash
bun run dev
```

The server starts at `http://127.0.0.1:5173` and chooses the next available port when necessary. Use the address printed in the terminal. To require a fixed port, run `bun run dev -- --port 5180`; an explicitly requested port must be free. Use different ports when running both editions.

### Connect the backend

The browser uses same-origin `/api` and `/ws` paths. The development proxy targets `http://127.0.0.1:8000` by default. Set `VITE_API_BASE_URL` in your local development configuration to use another development upstream.

Full integration requires a separately started [companion backend](https://github.com/domidoremi/hmrchan-backend) and access to its repository and services. When the default local upstream is unreachable, the development script attempts to connect to running Docker backend containers. The bridge does not start the backend services for you.

For layout work, set `LOCAL_API_AUTO_BRIDGE=false` in your local `.env.development.local` to skip the bridge. Public snapshots cover only some fallback paths and cannot provide full sign-in, collection, or publishing flows. Other pages may show empty or error states.

Use `.env.example` as the configuration entry point. Keep credentials and machine-specific settings out of the repository.

## Architecture and layout

| Layer                | Implementation                                            |
| -------------------- | --------------------------------------------------------- |
| Pages and components | Vue 3, TypeScript, Vue Router                             |
| State and language   | Pinia, Vue I18n                                           |
| Build and assets     | Vite and a custom service worker build plugin             |
| Motion and scrolling | GSAP, Motion for Vue, Lenis, and page interaction logic   |
| Edge runtime         | Cloudflare Pages, Pages Functions, and an internal Worker |
| Quality checks       | Vitest, ESLint, Prettier, Knip, and project audit scripts |

```text
src/features/journal/    Site shell, page composition, data adaptation, and interactions
  editions/             Reading chapters, photo collections, calendar, and related views
  runtime/              Motion, scrolling, and browser lifecycle
  styles/               Site layouts and theme presentation
src/views/              Account, contact, and other routed views and business logic
src/components/         Reusable components
src/composables/        Reusable state and interactions
src/api/                API types, requests, and service adapters
src/stores/             Cross-page state
src/config/             Edition, appearance, language, and navigation settings
src/styles/             Style entry, base rules, and theme tokens
functions/              Same-origin Pages Functions
workers/                Internal API Worker
build/                  Vite configuration and build plugins
scripts/                Development, validation, build, and release tools
public/                 Static assets, PWA files, and public snapshots
docs/                   Chinese and English development and acceptance documentation
```

[`src/config/designEdition.ts`](../../src/config/designEdition.ts) selects the `editorial` or `archive` edition. [`src/config/appearance.ts`](../../src/config/appearance.ts) owns themes and browse defaults. API and state layers supply data; page components handle presentation and interaction.

[`src/styles/index.css`](../../src/styles/index.css) is the application style entry. Cross-component layouts and theme rules belong in their corresponding style layers. The development proxy or edge layer connects browser requests to the backend. HTTP, memory, IndexedDB, and the service worker share caching responsibilities. See [frontend architecture](architecture.md) for the boundaries.

## Validation and deployment

### Common checks

| Command                        | Purpose                                                      |
| ------------------------------ | ------------------------------------------------------------ |
| `bun run type-check`           | Check application, Pages Functions, and Worker types         |
| `bun run lint:strict`          | Run strict lint and comment-language checks                  |
| `bun run format:check`         | Check formatting in `src/`                                   |
| `bun run test:unit`            | Run unit tests serially                                      |
| `bun run build`                | Generate the `dist/` build output                            |
| `bun run build:security-check` | Check production build security constraints                  |
| `bun run check:bundle-budget`  | Check asset size budgets                                     |
| `bun run audit:docs`           | Check documentation for restricted addresses and local paths |
| `bun run audit:deps`           | Audit dependency vulnerabilities                             |

Use `bun run preview` to preview built assets locally. Integration with Pages Functions, Workers, and the backend requires the environment described in [release validation](validation.md).

### Release workflow

Each edition uses its own Cloudflare Pages Git integration: the main site follows `main`, and Next follows `next`. The build entry is `bun run build`, the output directory is `dist/`, and edge configuration is maintained in this branch's [`wrangler.toml`](../../wrangler.toml).

| Command                                 | Validation scope                                                  |
| --------------------------------------- | ----------------------------------------------------------------- |
| `bun run validate:release:prepush:full` | Full static gates, unit tests, build, security, and asset budgets |
| `bun run validate:release:local`        | Static gates and local browser checks                             |
| `bun run validate:release:candidate`    | Local checks, controlled-site checks, and production preflight    |
| `bun run validate:release:production`   | Candidate-stage checks and deployed production regression         |

The `local` and `candidate` modes do not replace deployed-site validation. Results remain `incomplete` while required production evidence is missing. Complete release acceptance requires a `passed` production report. A successful build, automatic deployment, or public-page spot check alone does not establish that result.

Browser gates require Docker, the local backend, and a Pages-compatible preview. Controlled-site and production checks also require explicit targets, dedicated accounts, and the relevant assisted email steps. Evidence is written to the untracked `output/validation/` directory. See [release validation](validation.md) for inputs, stage contracts, and failure handling.

## Further documentation

- [Appearance and saved-preference migration](appearance-presets.md)
- [Frontend architecture and API boundaries](architecture.md)
- [Stack versions and upgrade policy (Chinese)](../zh-CN/stack-policy.md)
- [Release validation](validation.md)
- [UI/UX acceptance records (Chinese)](../zh-CN/uiux-acceptance.md)

## License and content

No public distribution license is declared for this repository. Photographs, original posts, and other media remain the property of their respective rights holders.
