# Validation Flow

本仓库的交付验证以 `validate:release` 为唯一主入口。  
仓库已移除 GitHub Actions；是否可交付只由本地统一 runner 判定。

## 统一入口

```bash
bun run validate:release
bun run validate:release --mode prepush
bun run validate:release:prepush
bun run validate:release --mode local
bun run validate:release --mode local --quiet
bun run validate:release:local:quiet
bun run validate:release --mode candidate
bun run validate:release --mode production
```

- 默认模式是 `local`
- `prepush` 是默认 Git hook 使用的中负载门禁，只跑合同自检和本地静态门禁，不启动 Docker/browser gate
- artifact 默认输出到 `output/validation/<timestamp>/`
- 统一摘要固定输出：
  - `summary.json`
  - `summary.md`
  - `stages/*.json`
- Windows 环境下 runner 会通过共享命令执行器解析 `bun.exe` / `bun.cmd`；若需要固定 Bun 路径，可设置 `BUN_EXECUTABLE`
- `--quiet` 只降低控制台输出，不降低验证强度；子命令 stdout/stderr 仍写入每个 command artifact 的 `stdout.tail.log` / `stderr.tail.log`

## 本地真相源

- `pre-commit` 继续只做最小化格式化与暂存检查
- `pre-push` 固定执行 `bun run validate:release --mode prepush --quiet`；hook 不自动改写工作树，不运行全仓库 `prettier --write` / `eslint --fix`
- `local` 是完整本地 release gate；必须显式运行，不再由默认 `pre-push` 自动触发
- 候选发布前必须手动执行 `bun run validate:release --mode candidate`
- `main` 部署后必须手动执行 `bun run validate:release --mode production`
- 不允许用零散命令口头替代统一 runner；对应模式的 runner 失败即视为失败

## 阶段定义

### `prepush`

用于默认 Git 推送前阻断，目标是中负载、可常规运行，不启动 Docker、本地浏览器、Pages preview 或 local audit bridge：

1. 合同自检
2. 本地静态门禁

说明：`prepush` 成功会记录为 `passed`，只表示代码通过推送前中负载门禁，不等价于完整发布验证通过。

### `local`

用于完整本地发布验证，需要显式执行：

1. 合同自检
2. 本地静态门禁
3. 本地浏览器门禁

### `candidate`

用于受控站点候选验证：

1. 合同自检
2. 本地静态门禁
3. 本地浏览器门禁
4. 受控站点门禁
5. 生产预检

说明：`candidate` 成功只表示候选验证完成；由于未执行生产深回归，最终状态会记为 `incomplete`

### `production`

用于 `main` 已部署后的最终验收：

1. 合同自检
2. 本地静态门禁
3. 本地浏览器门禁
4. 受控站点门禁
5. 生产预检
6. 生产深回归

只有 `production` 模式全部通过，交付状态才会是 `passed`。

## 必需输入

统一 runner 会记录并透传这些输入：

- `BASE_URL`
- `CONTROLLED_BASE_URL`
- `PRIMARY_USERNAME`
- `PRIMARY_PASSWORD`
- `SECONDARY_EMAIL_MODE=user-assisted`
- 可选 `ARTIFACT_DIR`
- 可选 `QA_PREFIX`

约束：

- `candidate` 和 `production` 必须提供 `CONTROLLED_BASE_URL`
- `production` 默认目标站点是 `https://momichan.xyz`
- `SECONDARY_EMAIL_MODE` 固定要求 `user-assisted`

## 状态语义

- `passed`
  - 所有必需阶段都通过
  - 只会出现在 `production` 模式
- `failed`
  - 任一必需阶段失败
  - 或必需阶段被意外跳过
- `incomplete`
  - 验证本身成功，但尚未完成生产深回归
  - 常见于 `local` / `candidate`

## 本地环境阻塞

本地浏览器门禁依赖 Docker Desktop、本地后端栈和 local audit bridge。若这些依赖不可用，`check:frontend` / `test:e2e` 会把 `UPSTREAM_TIMEOUT`、`UPSTREAM_UNREACHABLE` 等探针结果报告为 local audit environment blocked，而不是误报为后端契约变更。

在 Codex、远程终端或其他容易被大日志拖垮的非交互环境中，优先使用低输出入口：

```bash
bun run validate:release --mode prepush --quiet
bun run validate:release --mode local --quiet
```

`prepush` 不运行 Docker、本地后端、local audit bridge、Puppeteer/Chrome；它只验证推送前中负载硬门禁。`local --quiet` 不会跳过 Docker、本地后端、local audit bridge、Puppeteer/Chrome 或任何 local release stage，只降低控制台输出。若环境不可用，`local` 结果仍必须失败，并且只能作为“环境阻塞可诊断、summary 可落盘”的验收信号；不能把 fallback 或 environment-blocked 视为正式发布通过。

恢复环境后必须补跑：

```bash
bun run check:frontend
bun run test:e2e
bun run validate:release --mode local
```

## 本地功能链账号矩阵

账号矩阵是显式低输出门禁，不属于默认 `pre-push` / `validate:release:local`。它用于验证本地后端、Pages facade 与浏览器 session 行为是否能跑通，不替代统一 release runner。

```bash
PRIMARY_USERNAME='<primary-user>' \
PRIMARY_PASSWORD='<primary-password>' \
PEER_USERNAME='<peer-user>' \
PEER_PASSWORD='<peer-password>' \
ADMIN_USERNAME='<admin-user>' \
ADMIN_PASSWORD='<admin-password>' \
LOCKED_USERNAME='<locked-user>' \
LOCKED_PASSWORD='<locked-password>' \
DISABLED_USERNAME='<disabled-user>' \
DISABLED_PASSWORD='<disabled-password>' \
bun run test:functional-chain:local
```

- 目标入口固定为同源 facade：`POST /api/v1/auth/login`
- 账号与密码只允许通过环境变量传入，不写入仓库、不生成 tracked `.env`；上方示例必须保留占位符，不提交本机真实测试账号
- artifact 输出到 `output/functional-chain/<timestamp>/summary.json` 和 `summary.md`
- `FUNCTIONAL_CHAIN_BASE_URL` 可指向已启动的本地前端；未设置时脚本会 build 并启动本地 Pages preview
- Docker、本地后端栈或 local audit bridge 不可用时，结果必须记录为 `environment-blocked`，不能当作通过
- 当前矩阵只覆盖登录、`/auth/session:resolve`、session 隔离、403 locked/inactive 与错误密码；评论/点赞/通知等双用户深链应作为后续独立批次

## 合同与自动演进

这套流程不会依赖人工维护 checklist，而是从仓库真相源自动派生：

- 路由与详情页 readiness：
  - [scripts/lib/release-route-contract.js](/G:/Project/hmrchan/hmrchan-frontend/scripts/lib/release-route-contract.js)
- 认证预热探针：
  - [scripts/lib/auth-bootstrap.js](/G:/Project/hmrchan/hmrchan-frontend/scripts/lib/auth-bootstrap.js)
- 生产 contract/version 与 Pages 安全环境约束：
  - [scripts/lib/production-contract-env.js](/G:/Project/hmrchan/hmrchan-frontend/scripts/lib/production-contract-env.js)
- 前端 auth surface 与 UUIDv7 public ID 守卫：
  - [scripts/lib/frontend-contract-audit.js](/G:/Project/hmrchan/hmrchan-frontend/scripts/lib/frontend-contract-audit.js)
- 统一 runner 编排与变更影响分类：
  - [scripts/validate-release.mjs](/G:/Project/hmrchan/hmrchan-frontend/scripts/validate-release.mjs)
  - [scripts/lib/validate-release.js](/G:/Project/hmrchan/hmrchan-frontend/scripts/lib/validate-release.js)

UUIDv7 hard cutover 后，前端公开资源 ID 只能使用 UUIDv7 字符串；新增或修改 `src/api`、路由详情页、fallback snapshot、Service Worker cache key 时，必须同步相关类型守卫、测试和 release contract audit。当前静态审计会阻断缺失 route/cache guard 的改动；checked-in generated fallback snapshot 不允许包含旧 v4 或 numeric public ID。`bun run fallbacks:refresh` 在写入 generated snapshot 前会拒绝非 UUIDv7 public ID，因此刷新必须连接到已完成 UUIDv7 cutover 的后端/API 环境。

runner 会根据本次交付命中的文件范围自动生成风险摘要，重点关注：

- `src/views` / `src/components` / `src/router`
- `src/api` / `src/stores` / `src/services`
- `src/edge` / `functions` / `workers` / `wrangler.toml`
- 验证合同与 runner 自身

## 推荐执行顺序

日常开发：

```bash
bun run validate:release
```

候选发布前：

```bash
CONTROLLED_BASE_URL=https://controlled.example.com \
bun run validate:release --mode candidate
```

`main` 部署到 Pages 后：

```bash
BASE_URL=https://momichan.xyz \
CONTROLLED_BASE_URL=https://controlled.example.com \
PRIMARY_USERNAME=... \
PRIMARY_PASSWORD=... \
SECONDARY_EMAIL_MODE=user-assisted \
bun run validate:release --mode production
```

## 验收规则

- `local` 通过：说明本地静态与浏览器硬门禁通过，但交付仍未完成
- `candidate` 通过：说明受控站点验证通过，但交付仍未完成
- `production` 通过：才代表本次 `main` 交付验收完成
- 任一阶段失败，或必需阶段未执行，统一结论都是失败或未完成，不能人工口头放行
