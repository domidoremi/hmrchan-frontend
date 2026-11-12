# 技术栈升级记录（2026-11-11，版本核验于 11-10 UTC）

43 个直接依赖已逐项核对 npm 官方 dist-tags。Node 官方发布索引的最新稳定版为 26.13.0，Bun 为 1.4.4，保持当前引擎。Vite 仍为 8.3.7；新增稳定发布更新为 Lucide Vue 1.71.0、Workers 类型 5.20261110.1、ESLint Vue 10.12.1、Knip 6.45.0、Puppeteer 25.17.0 和 Wrangler 4.160.0。上述版本精确锁定，两个站点分别生成 bun.lock。

主站使用 Vue / compiler-sfc 3.5.45；Next 的独立测试线使用精确锁定的 3.6.0-rc.14。GSAP 4 beta、Lenis 2 dev、I18n 12 alpha 和 Prettier 4 alpha 没有本轮必要收益，继续使用稳定版本。Next 并不表示 Next.js 框架；两站均使用 Vue / Vite。

## TypeScript 兼容性

TypeScript 7.0.2 原生编译器已通过 `@typescript/native` 别名用于 Functions 与内部 Worker。`typescript` 6.0.3 保留给 Vue SFC 检查和 ESLint：当前 vue-tsc 3.3.14 调用旧 `typescript/lib/tsc` 和 JavaScript 编译器 API，TS7 的 npm 包不提供兼容的原始 API。不能通过替换版本号跳过 SFC 类型检查。后续 Vue language-tools 与 typescript-eslint 支持新 API 后再统一。

## 加载与维护

Puppeteer 25.17.0 的实际安装包锁定 Chrome 157.0.8103.50；本地浏览器检查使用配套构建，正式域名沿用独立普通 Chrome 验收。普通 Chrome 需记录实际版本并独立验收。Wrangler 的最低 Node 22.12 要求由当前 Node 26.13 满足；现有运行时 compatibility_date 保持原有显式配置。

Lucide 1.71 已包含默认插槽修复，删除对应旧补丁；ESM 上下文文件改为 context.mjs，保留与 CJS 相同的组件上下文保护，并对目标文件缺失或实现变化明确报错。两种模块格式均验证无上下文调用、注入颜色/尺寸以及图标标题插槽。Next 的诊断通过 vue/server-renderer 使用与 RC 匹配的渲染器，避免误用测试工具提升到顶层的稳定版依赖。

- 全局 CSS 保留统一 layer 顺序；关于、搜索专属规则跟随页面加载，账号规则随共享账号布局加载，覆盖直接打开的通知、设置和安全子页。
- 各站 Journal 样式入口只引入自身版式；公共基础、主题、浮层、业务页面样式保留。
- 浏览、日程、社区为异步组件，首页避免同步下载这些页面的组件逻辑。
- Journal 动效偏好、时长和视口调度拆成独立模块。系统减少动效作为首次默认值，显式设置会保存；新增节点增量观察，滚动几何读取先于样式写入。
- Archive 键盘合约：上下/Home/End 选记录，Enter 打开，右方向键进入预览，Escape 返回列表；筛选摘要可逐项清除。
- Editorial 目录定位真实章节并移动焦点，当前章节由可见性观察器维护。

## 验证与来源

升级需要完整静态门禁、真实浏览器交互与主题矩阵、动效及性能对比。预发布不是稳定版；若出现未解决的运行时回归，Next 回退至 3.5.45 并记录原因。

- [Vue 发布策略](https://vuejs.org/about/releases)
- [Vue 编译器版本](https://vuejs.org/guide/scaling-up/tooling)
- [TypeScript 原生编译器](https://github.com/microsoft/typescript-go)
- [Node 官方发布索引](https://nodejs.org/dist/index.json)

## 2026-11-12 02:33 +08:00 · 当前升级追加记录

以上内容保留原核验时点。2026-11-11 18:32 UTC 的新官方查询重新取得 42 个不同 npm 包的 dist-tags，覆盖每站 43 条直接依赖声明（TypeScript 的 API 包与原生 CLI 别名共用一个官方包）。Main 的 Vue / compiler-sfc 3.5.45 对应 latest；Next 的 3.6.0-rc.14 对应 rc。除已有 TypeScript JavaScript API 兼容例外和 Next 的两条 Vue RC 外，当前实际安装的直接依赖均与这次官方 latest 一致。当前 Vite 为 8.3.8、Lucide Vue 为 1.72.0、Knip 为 6.45.1、Prettier 为 3.10.0。预发布可用性并不构成自动采用的理由，既有稳定选择与 TypeScript 例外继续适用。

Node 官方索引当前最新稳定发布为 26.13.1，发布日期为 2026-11-10，security 标记为 true。已匹配官方 SHASUMS 并安装 Windows x64 构建，实际版本探测成功；两站 mise.toml、.node-version 和 engines.node 均使用 26.13.1 / >=26.13.1 <27。Wrangler 4.160.1 已在两站通过正常 Bun 安装，patch-lucide 与 Husky 均执行，安装和实际版本探测均 exit 0。各站其余 42 条直接依赖的安装版本和 metadata SHA 保持；锁只改变 Wrangler 声明、Wrangler 与 Miniflare 三行，没有新增或删除包。官方传递依赖 Miniflare 为 5.20261110.1-beta，workerd 1.20261110.1 保持原记录。

Bun 保持 1.4.4。2026-11-11 18:32 UTC 的 owner API latest 请求仍返回 403，原失败没有修改；18:33 UTC 的独立 owner 公共 releases/latest 请求返回真实 302，指向 bun-v1.4.4，目标发布页为 200 且标记 Latest。因此当前版本另有公共发布入口的最新版本证据，不将 API 403 写成通过。

新 Node 上的七个局部候选格式检查和两站各 12 个离线导航重定向用例已通过，前后源码、配置与锁绑定一致。这一结果仅覆盖格式和单元测试；当前组合的完整门禁、严格类型、构建、原生导航、保存交互、布局动效与性能仍须各自的新执行回执，不能继承旧构建通过。

## 2026-11-12 22:17 +08:00 · 新发布版本续接

本次官方 npm 快照覆盖 42 个包、每站 43 条直接依赖，取得完整元数据。新稳定发布采用 Workers 类型 5.20261112.1、Node tsconfig 26.0.2、Vue Vite 插件 6.0.11、Prettier 3.10.1、Wrangler 4.161.0；主站 Vue 与 compiler-sfc 保持稳定版 3.5.45。Next 延续既有 RC 测试线，两包同步更新至官方 rc 标签 3.6.0-rc.15，不能将它标为稳定版。

两站均通过正常 Bun 1.4.4 安装，patch-lucide 与 Husky 正常执行。43 条声明、锁记录与实际安装版本逐项一致；更新的传递依赖由正常锁文件记录。TypeScript JavaScript API 6.0.3 与独立 CLI 7.0.2 的既有兼容安排保留。

Node 官方索引在本次查询确认 26.13.1；Bun owner API 仍返回 403，独立公共 latest HEAD 返回 302、指向 bun-v1.4.4。该公共响应不改写 API 原失败。

筛选清除与焦点恢复已单独提交。新依赖上的完整静态门禁、正常构建、公开 QA 交互与性能验证属于后续独立执行范围，本段不预先记为通过。
