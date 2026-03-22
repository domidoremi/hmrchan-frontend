# Frontend Performance Playbook

## 目标

这份文档只服务当前仓库，不追求覆盖所有 Vue 或原生 Web API。目标有两个：

1. 给后续 PR、性能修复和新人协作一个一致的判断基线。
2. 把当前已经暴露过的线上问题，整理成可以直接执行的清单。

默认前提：

- 当前仓库继续使用 `vue 3.6.0-beta.8`。
- 文档只约束仓库内实现，不涉及后端 API 或部署平台改造。
- 实验性方案必须先有局部基线、回滚条件和验证结果，不能直接扩到主线页面。

## 适用范围

这份 playbook 面向整个前端仓库，不只面向 `AuthorsPage` 或作者流相关页面。落地时默认覆盖四层：

- 路由页面层
  - `src/views/HomePage.vue`
  - `src/views/SearchPage.vue`
  - `src/views/PostDetailPage.vue`
  - `src/views/ExplorePage.vue`
  - `src/views/AuthorsPage.vue`
  - `src/views/AuthorDetailPage.vue`
- 共享业务组件层
  - `src/components/business/*`
  - `src/components/comment/*`
  - `src/components/community/*`
- UI 基础件层
  - `src/components/ui/*`
- 运行时与工具层
  - `src/utils/modernAPIs.ts`
  - `src/utils/performance.ts`
  - `vitest.config.ts`

## Part A: 长期指南

### 当前基线

#### 已稳定使用

- `defineAsyncComponent`
  - 例子：`src/views/HomePage.vue`、`src/views/PostDetailPage.vue`
  - 用途：把首屏外的大组件从首包中拆出去，并配合 `Suspense` 或显式占位控制 CLS。
- `Suspense`
  - 例子：`src/views/PostDetailPage.vue`
  - 用途：异步业务组件晚到时，先给固定占位，避免右侧或下方内容被顶开。
- `v-memo`
  - 例子：`src/views/SearchPage.vue`
  - 用途：搜索结果和作者结果列表中，稳定键、稳定 props 的卡片项减少不必要更新。
- `AbortController`
  - 例子：`src/views/HomePage.vue`、`src/views/PostDetailPage.vue`、`src/views/AuthorsPage.vue`
  - 用途：新请求开始时取消旧请求，避免过时响应覆盖新状态。
- `IntersectionObserver`
  - 例子：`src/views/PostDetailPage.vue`、`src/utils/performance.ts`
  - 用途：评论区延后激活、懒加载和滚动触发场景。
- `ResizeObserver`
  - 例子：`src/views/HomePage.vue`、`src/utils/modernAPIs.ts`
  - 用途：少量需要感知容器尺寸变化的视觉区块。
- `loading` / `decoding` / `fetchpriority`
  - 例子：`src/views/HomePage.vue`、`src/views/PostDetailPage.vue`、`src/views/SearchPage.vue`
  - 用途：给关键媒体更明确的浏览器提示，同时保证非关键资源维持 `lazy`。
- SSR `preload` / `preconnect`
  - 例子：`src/views/PostDetailPage.vue`、`src/utils/performance.ts`、`src/edge/detailDocumentResolver.ts`
  - 用途：详情首图和关键媒体链路预热。
- `requestIdleCallback` 包装函数
  - 例子：`src/utils/performance.ts`、`src/utils/modernAPIs.ts`、`src/views/PostDetailPage.vue`
  - 用途：把非关键监听、预热或次级逻辑往 idle 时段挪。
- Vapor 测试运行时已对齐
  - 例子：`vitest.config.ts`
  - 用途：让 Vapor 组件的测试环境和真实运行环境一致，避免只在测试里缺运行时能力。

#### 已经存在的 Vapor 组件

- `src/components/ui/Badge.vue`
- `src/components/ui/Avatar.vue`
- `src/components/business/PostCard.vue`
- `src/components/business/PostCardSkeleton.vue`
- `src/components/comment/CommentCard.vue`
- `src/components/comment/CommentList.vue`
- `src/components/community/DiscussionCommentCard.vue`
- `src/components/community/DiscussionCommentList.vue`
- `src/components/ui/LoadMoreSection.vue`
- `src/components/ui/StateIndicator.vue`

#### 已有能力，但还没有系统推广

- `content-visibility`
  - 当前只做到能力检测，见 `src/utils/modernAPIs.ts`。
  - 结论：仓库已经具备判断和降级能力，但还没有形成统一策略。
- `contain-intrinsic-size`
  - 当前还没有形成统一占位策略。
  - 结论：它适合解决 CLS，但必须和具体区块的最终尺寸一起设计。
- 统一的现代 API wrapper
  - 当前已存在 `src/utils/modernAPIs.ts` 和 `src/utils/performance.ts`。
  - 结论：后续优先走仓库封装，不鼓励页面直接散落裸 API。

### 使用矩阵

#### 立即可用

##### `AbortController`

- 何时用：
  - 页面列表请求会被筛选、分页、切 tab 或切路由打断时。
  - 用户输入驱动的搜索、联想、过滤请求。
- 本仓库怎么落：
  - 优先参考 `src/views/AuthorsPage.vue`、`src/views/PostDetailPage.vue` 的请求取消模式。
  - 新请求开始前取消旧 controller，并用 token 或当前状态再次确认响应没有过期。
- 反例 / 风险：
  - 只创建 controller 不在 `finally` 或卸载时释放，会留下悬空状态。

##### `IntersectionObserver`

- 何时用：
  - 评论区、长列表、图片懒加载、滚动 sentinel。
- 本仓库怎么落：
  - 优先复用 `src/utils/performance.ts` 或 `src/utils/modernAPIs.ts` 的封装。
  - 页面只关心“进入可视区后做什么”，不要每个页面单独实现观察器生命周期。
- 反例 / 风险：
  - 观察器不在卸载或条件失效时断开，会制造额外开销。

##### `ResizeObserver`

- 何时用：
  - 只有当组件确实依赖容器尺寸变化，且无法用纯 CSS 解决时。
- 本仓库怎么落：
  - 优先参考 `src/views/HomePage.vue` 的场景控制。
  - 能用 `grid`、`flex`、`aspect-ratio` 或固定占位解决的，不上观察器。
- 反例 / 风险：
  - 在动画树、复杂场景或大量实例上直接绑定，会放大主线程压力。

##### `loading` / `decoding` / `fetchpriority`

- 何时用：
  - 媒体资源有明确首屏优先级时。
- 本仓库怎么落：
  - 首页、详情页只给唯一首屏主资源 `loading="eager"` 和 `fetchpriority="high"`。
  - 其他资源默认回到 `loading="lazy"` 和 `fetchpriority="auto"`。
  - `decoding="async"` 作为默认基线。
- 反例 / 风险：
  - 多张图片同时设为 `high`，会和真正的 LCP 资源抢带宽。

##### `defineAsyncComponent` + `Suspense`

- 何时用：
  - 首屏外的大块业务组件、仅交互后出现的 UI、评论/工具条/lightbox 这类非关键内容。
- 本仓库怎么落：
  - 参考 `src/views/HomePage.vue` 和 `src/views/PostDetailPage.vue`。
  - 必须配合占位或最小高度，不能只拆包不控 CLS。
- 反例 / 风险：
  - 把本来就在首屏关键路径的核心 UI 异步化，只会增加 LCP 和水合不稳定性。

##### `v-memo`

- 何时用：
  - 大列表项、memo key 稳定、props 变化路径明确的场景。
- 本仓库怎么落：
  - 参考 `src/views/SearchPage.vue` 的结果列表。
  - memo key 只放真正会影响渲染的字段，不要把整个对象塞进去。
- 反例 / 风险：
  - 没有稳定键或 props 实际频繁变化时，`v-memo` 只会增加维护成本。

##### `content-visibility` + `contain-intrinsic-size`

- 何时用：
  - 长页面离屏区块、二屏以后的列表容器、可以接受延迟渲染的静态信息区。
- 本仓库怎么落：
  - 先通过 `src/utils/modernAPIs.ts` 的能力检测判断是否支持。
  - 必须同时给可预估的占位高度，避免滚动时因为回流反而制造 CLS。
- 反例 / 风险：
  - 不带占位直接上 `content-visibility`，会让离屏内容首次进入视口时突然挤开布局。

##### SSR `preload` / `preconnect`

- 何时用：
  - 详情首图、已知会成为 LCP 的关键字体或图片。
- 本仓库怎么落：
  - 优先走 edge 文档层和 `src/utils/performance.ts` 的统一链路。
  - 页面层面的预热只做补救，不做主链路。
- 反例 / 风险：
  - 客户端拿到数据后才补 `preload`，通常已经太晚。

#### 谨慎使用

##### `runWhenIdle` / `requestIdleCallback`

- 何时用：
  - 非关键监听、统计、次级预热、非首屏动画激活。
- 本仓库怎么落：
  - 统一走 `src/utils/performance.ts` 或 `src/utils/modernAPIs.ts`。
  - 调用端必须带“页面仍然存活”的保护条件。
- 反例 / 风险：
  - 页面已经切走，idle 回调仍然继续挂监听或写状态。

##### `ResizeObserver` 绑定复杂动画树

- 何时用：
  - 只有视觉收益明显且数量可控时。
- 本仓库怎么落：
  - 单点验证，优先保守。
- 反例 / 风险：
  - 在首页大装饰区、滚动动画区大范围铺开，容易推高 TBT。

##### `fetchpriority="high"` 扩散到多个资源

- 何时用：
  - 几乎只允许给一个真正的 LCP 资源。
- 本仓库怎么落：
  - 首页、详情页都应该继续维持“唯一高优先级”的策略。
- 反例 / 风险：
  - 胶片区、列表首行、推荐卡片都设 `high`，实际会拖慢主资源。

##### `content-visibility` 用在带焦点管理或复杂测量逻辑的区块

- 何时用：
  - 先确认该区块不依赖即时测量、不承载主动聚焦、不做复杂交互。
- 本仓库怎么落：
  - 适合只读信息块，不适合表单、评论输入、复杂动画根节点。
- 反例 / 风险：
  - 离屏区块被脚本提前测量或聚焦时，行为会变得不稳定。

##### `v-once`

- 何时用：
  - 只用于真正静态、不会受 locale、theme、feature flag 或 props 影响的内容。
- 本仓库怎么落：
  - 先证明它确实不会再变，再考虑引入。
- 反例 / 风险：
  - 把会随主题、语言、用户态变化的内容做成 `v-once`，会直接产生错误 UI。

##### Vapor 用在带 store、watch、副作用或复杂交互的组件

- 何时用：
  - 只在组件边界很干净、行为几乎完全由 props 驱动时。
- 本仓库怎么落：
  - 先做小组件 spike，再决定是否扩展。
- 反例 / 风险：
  - 直接把评论树、复杂卡片、带调试 hook 的组件继续推进 Vapor，会让调试和回归排查更困难。

#### 暂不建议扩展

##### 继续把 Vapor 扩到复杂评论树、复杂卡片、带大量本地副作用的组件

- 当前结论：
  - 暂不建议。
- 原因：
  - 当前 `PostCard`、评论卡片和评论树已经具备复杂 watch、store、注入上下文、副作用或调试 hook，不适合继续扩面。

##### 没有基准数据就到处上 `v-memo` / `v-once`

- 当前结论：
  - 暂不建议。
- 原因：
  - 这类优化的回归成本高于“先做稳定占位、拆包、取消无效请求”的收益。

##### 直接裸用实验性 API，而不是走仓库封装

- 当前结论：
  - 暂不建议。
- 原因：
  - 兼容性、降级和可回收性会散落到页面中，长期维护成本过高。

## Part B: 短期执行清单

### P0

- 搜索、作者、详情页的图片 / 头像 / 占位链路统一到共享模式，减少重复 fallback 逻辑。
- 规范 `high` / `eager` 只给唯一首屏资源，避免首页或详情页多个媒体同时争抢带宽。
- 为易位移区块补 `contain-intrinsic-size` 或固定占位，优先处理详情页工具区、图片切换区和长列表块。

### P1

- 给长页面离屏段落和列表容器系统化加 `content-visibility`，先从只读内容区开始。
- 统一 `runWhenIdle` 使用规范，禁止无存活标记的 idle 回调。
- 把重复出现的作者卡片、头像逻辑抽成单独 presentational 组件，减少页面重复模板。

### P2

- 为图片切换和 lightbox 评估 `HTMLImageElement.decode()`，优先看详情页媒体切换是否能减少闪动。
- 评估是否需要把部分 `ResizeObserver` 场景退回更轻量方案。

## Phase 2: 当前 Vapor 审计

### 审计结论

| 组件                                                 | 状态   | 结论                                                                                      |
| ---------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `src/components/ui/StateIndicator.vue`               | 保留   | props 边界清晰，以 computed 为主，无 store、watch 或副作用，适合继续作为 Vapor 基线样本。 |
| `src/components/ui/LoadMoreSection.vue`              | 保留   | 纯展示 + 单一事件发射，逻辑集中且边界干净，适合作为基线样本。                             |
| `src/components/ui/Badge.vue`                        | 保留   | 纯 props + slot，只有 class 组合逻辑，适合长期作为 repo 级基础件样本。                    |
| `src/components/ui/Avatar.vue`                       | 保留   | 仅保留本地图片失败状态，无 store、watch 或生命周期副作用，适合做共享头像基线。            |
| `src/components/business/PostCardSkeleton.vue`       | 保留   | 骨架组件只依赖 props 和少量 computed，没有运行时副作用，保留成本低。                      |
| `src/components/business/PostCard.vue`               | 不扩面 | 存在复杂 watch、媒体预热、缓存和 render debug hook，已经不是低风险 Vapor 场景。           |
| `src/components/comment/CommentCard.vue`             | 不扩面 | 直接依赖 store、toast、inject 上下文，并包含 mounted / unmounted 副作用。                 |
| `src/components/comment/CommentList.vue`             | 不扩面 | 列表树控制、provide、watch、store 全部在组件内部，边界不再是纯展示层。                    |
| `src/components/community/DiscussionCommentCard.vue` | 不扩面 | 带 store、inject、mounted / unmounted、副作用和 render debug hook，调试成本高。           |
| `src/components/community/DiscussionCommentList.vue` | 不扩面 | 讨论树控制、provide、watch 和 store 交织，不适合作为后续扩面模板。                        |

### 观察档说明

- 当前为空。
- 这是刻意的，不是遗漏。
- 按当前门槛，只要组件已经带有 store 依赖、复杂 watch、副作用请求、render debug hook 或列表树控制逻辑，就直接归到“不扩面”，不会为了凑分类把它们放进“观察”。

## Phase 2: 低风险 Spike 方案

### 本轮试点

- 试点组件：`src/components/business/AuthorCard.vue`
- 首轮接入页面：`src/views/AuthorsPage.vue`
- 明确不在本轮复用到 `src/views/SearchPage.vue`
- 说明：这里的“首轮接入页面”只是试点边界，不是仓库范围边界。

### 为什么选 `AuthorCard`

- `AuthorsPage` 是公共页面，有稳定的 Lighthouse 基线，容易做前后对比。
- 原页面中作者卡片模板和头像失败回退逻辑重复度高，抽组件本身就有 DX 收益。
- 它比 `PostCard`、评论树和讨论树更接近“props-only”的理想边界，更适合做 Vapor 试点。

### 为什么不选 `PostCard` 或评论树

- `PostCard` 已经承担媒体预热、缓存、render debug hook 和复杂状态推导，不适合作为新一轮扩面样板。
- 评论树和讨论树都同时依赖 store、provide / inject、watch 和副作用生命周期，风险过高。

### Spike 边界

- 只接受 props 输入。
- 只允许本地头像失败状态。
- 不接 store。
- 不接 router。
- 不在组件内部发起异步请求。
- 不加 `watch`、`onMounted`、`onUnmounted`。
- `click` 事件只回传 `author.id`。

### 预期收益

- 减少 `AuthorsPage` 的重复模板和重复样式。
- 给仓库留下一个更干净的 Vapor 试点样本。
- 为后续是否扩到 `SearchPage` 提供更稳定的对照基线。

## Repo 级下一批候选

### 可以继续评估的低风险候选

| 候选                                                        | 结论   | 原因                                                                             |
| ----------------------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| `src/components/ui/StatsSection.vue` 内的单个统计卡片子组件 | 可评估 | 整个 section 不必整体 Vapor 化，但平台卡片可以先拆出 props-only 子组件后再判断。 |

### 明确不适合直接扩面的共享组件

| 组件                                                 | 结论   | 原因                                                                                             |
| ---------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `src/components/business/SearchBar.vue`              | 不扩面 | 持有 router、route、watch、debounce、AbortController、localStorage 和 mounted / unmounted 逻辑。 |
| `src/components/business/PostCard.vue`               | 不扩面 | 媒体预热、缓存、render debug hook 和复杂状态推导已经超出低风险范围。                             |
| `src/components/comment/CommentList.vue`             | 不扩面 | 列表树控制、store、provide 和 watch 全在组件内部。                                               |
| `src/components/community/DiscussionCommentList.vue` | 不扩面 | 讨论树控制、store、provide 和 watch 交织，调试成本高。                                           |

### 仓库级判断原则

- 如果一个共享组件未来会跨多个页面复用，优先先做“边界收窄”，再评估 Vapor，而不是把复杂逻辑直接搬进 Vapor。
- 如果一个 UI 基础件本身已经足够纯，优先从 UI 基础件入手，再向业务组件扩散。
- 如果一个页面的性能问题主要来自数据、媒体链路或副作用调度，不要把 Vapor 当成第一解。

### 回滚条件

- `/authors` 的 Perf、TBT 或 CLS 任一项明显劣化。
- 新增 runtime warning、hydration warning 或 console error。
- 组件调试体验明显变差，或者为了配合 Vapor 不得不把交互逻辑重新塞回父页面。

## Spike 验收

- 静态检查：
  - `vue-tsc --noEmit`
  - 相关 `vitest`
  - `bun run build`
- 行为检查：
  - `AuthorsPage` 作者卡片点击不回归。
  - 头像失败后能稳定回退。
  - hover 预取仍由父页面控制，不把副作用塞进卡片内部。
- 性能检查：
  - 重新部署后，对 `/authors` 做 mobile + desktop focused Lighthouse。
  - 接受标准：
    - Perf 不低于当前基线
    - TBT 不劣化
    - CLS 不劣化
    - 无新的 redirect / hydration / runtime warning
