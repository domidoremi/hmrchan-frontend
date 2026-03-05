# Git 提交规范（Conventional Commits）

本仓库使用 Husky 的 `commit-msg` 钩子校验提交信息格式（见 `.husky/commit-msg`）。请按以下规范编写，避免被拦截。

## 1) 基本格式

```text
<type>(<scope>): <subject>
```

- `type`：英文、小写。推荐：`feat` / `fix` / `refactor` / `style` / `perf` / `test` / `docs` / `chore`
  - 当前仓库校验也允许：`build` / `ci` / `revert`
- `scope`：可选，表示影响范围/模块（建议用单个词）
- `subject`：**中文**，简洁描述核心改动（建议 5–100 字符）

## 2) `type` 语义速查

- `feat`：新增功能
- `fix`：修复 bug
- `refactor`：重构（不改变外部行为/接口语义）
- `style`：格式/样式调整（不影响逻辑）
- `perf`：性能优化
- `test`：测试相关
- `docs`：文档更新
- `chore`：杂项（依赖、脚本、工程化琐碎改动等）
- `build`：构建系统/依赖装配（可选）
- `ci`：CI 配置与流水线（可选）
- `revert`：回滚提交（可选）

## 3) `scope` 建议（按模块选）

优先选能反映“改动落点”的范围，常见示例：

- `api`：接口层、请求封装、Functions 代理
- `ui`：通用 UI 组件、交互与样式
- `layout`：布局组件/布局逻辑
- `router`：路由与导航
- `store`：Pinia 状态与持久化
- `i18n`：多语言与文案键
- `pwa`：manifest、SW、离线缓存
- `build`：Vite 配置、构建脚本

## 4) 正文（Body）写法：同类多项改动用列表

当一次提交包含多条“同一主题下的细项改动”时，建议增加正文，用短句列点说明。标题与正文之间空一行：

```text
feat(profile): 支持头像裁剪

- 增加裁剪预览与缩放
- 修复移动端手势冲突
```

## 5) Smart-Git-Flow：拆分提交原则

- **一个提交只做一件事**（一个目的/一个主题）
- 若变更涉及多个不相关模块/功能，建议拆分为多个提交，并分别选择合适的 `scope`
- 描述用中文且尽量“可检索”：写清楚做了什么，而不是“调整/优化一部分”

## 6) 示例

- `feat: 添加用户登录页`
- `feat(auth): 支持 JWT 登录态`
- `fix(ui): 修复移动端瀑布流抖动`
- `refactor(api): 统一接口错误处理`
- `perf(player): 优化视频首帧加载`
- `docs: 补充部署说明`
- `chore: 清理未使用的脚本入口`
