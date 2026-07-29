# Frontend Architecture / 前端架构

## Runtime / 运行时

- Vue 3 owns rendering and component lifecycle / Vue 3 负责渲染与组件生命周期
- Pinia owns client state / Pinia 负责客户端状态
- Vue Router owns route admission and lazy views / Vue Router 负责路由准入与视图懒加载
- Vue I18n owns user-visible language variants / Vue I18n 负责用户可见语言版本
- Cloudflare Pages Functions own same-origin edge forwarding / Cloudflare Pages Functions 负责同源边缘转发
- The Service Worker owns offline assets and background coordination / Service Worker 负责离线资源与后台协调

Browser code uses same-origin `/api` and `/ws` paths. Upstream hosts and internal service identity remain edge concerns.

浏览器代码使用同源 `/api` 与 `/ws` 路径。上游主机和内部服务身份由边缘层处理。

## Backend Contracts / 后端合同

Backend integration and OpenAPI contracts are maintained in the backend repository under:

后端联调与 OpenAPI 合同维护在后端仓库的以下位置：

- `docs/frontend-integration.md`
- `docs/contracts/README.md`
- `docs/contracts/*.md`
- `docs/contracts/openapi/*.yaml`

The frontend repository does not keep copies of those contracts. Contract drift is repaired at the backend source and then reflected in frontend types, adapters, and tests.

前端仓库不保存上述合同副本。出现漂移时，先修复后端真相源，再同步前端类型、适配器与测试。

## CSS Boundaries / CSS 边界

- `src/styles/index.css` is the single application stylesheet entry / `src/styles/index.css` 是应用样式唯一入口
- Layered files contain foundation, semantics, components, page systems, presets, utilities, and temporary overrides / 分层文件承载基础、语义、组件、页面系统、预设、工具类与临时覆盖
- Vue SFCs use one scoped style block; cross-component selectors move to layered CSS / Vue SFC 使用一个 scoped 样式块；跨组件选择器进入分层 CSS
- Theme and page context selectors stay out of base UI components / 主题和页面上下文选择器不进入基础 UI 组件
- `:deep()` is limited to third-party or generated DOM / `:deep()` 仅用于第三方或生成 DOM
- `!important` is limited to reduced motion, third-party constraints, and browser compatibility / `!important` 仅用于减少动效、第三方约束和浏览器兼容

## Language and Comments / 语言与注释

- Public Markdown is concise and bilingual in Chinese and English / 公开 Markdown 使用精简的中英双语
- Code comments use English / 代码注释使用英文
- Comments record non-obvious constraints, failure semantics, and compatibility reasons / 注释记录隐含约束、失败语义和兼容原因
- Clear control flow and descriptive names do not receive narration comments / 清晰流程和明确命名不添加复述式注释
- User-visible copy stays in the i18n catalog / 用户可见文案保留在 i18n 目录

Missing narration comments are intentional. Complex boundaries require comments and focused tests.

不为直白代码补充复述式注释。复杂边界必须具备注释与聚焦测试。
