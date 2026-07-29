# Release Validation / 发布验证

`validate:release` is the release decision entrypoint. Every mode writes structured evidence under `output/validation/<timestamp>/`; generated evidence stays untracked.

`validate:release` 是发布判定入口。各模式均在 `output/validation/<timestamp>/` 写入结构化证据；生成内容保持未跟踪状态。

## Commands / 命令

```bash
bun run validate:release --mode hook --quiet
bun run validate:release --mode prepush-full --quiet
bun run validate:release --mode local --quiet
bun run validate:release --mode candidate
bun run validate:release --mode production
```

`prepush` remains an alias of `hook`. The default mode is `local`.

`prepush` 是 `hook` 的兼容别名。默认模式为 `local`。

## Modes / 模式

| Mode              | Required stages / 必需阶段                                                                                                | Result contract / 结果契约                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `hook`, `prepush` | contract checks, formatting, type-check, strict lint, focused runner tests / 合同检查、格式、类型、严格 lint、runner 窄测 | push gate / 推送门禁                                                          |
| `prepush-full`    | full static gates, unit tests, build, build security check, bundle budget / 完整静态门禁、单测、构建、安全检查、包体预算  | strengthened push gate / 加强推送门禁                                         |
| `local`           | full static gates and local browser gates / 完整静态门禁与本地浏览器门禁                                                  | `incomplete` until deployed checks run / 部署验证前为 `incomplete`            |
| `candidate`       | local gates, controlled-site gates, production preflight / 本地门禁、受控站点门禁、生产预检                               | `incomplete` until production regression runs / 生产深回归前为 `incomplete`   |
| `production`      | candidate stages and production deep regression / candidate 阶段与生产深回归                                              | only fully passing mode yields release `passed` / 全部通过才得到发布 `passed` |

The Git pre-push hook runs `hook --quiet`. It does not run the full unit suite, build, Docker, browser automation, or production checks.

Git pre-push hook 执行 `hook --quiet`，不运行全量单测、构建、Docker、浏览器自动化或生产验证。

## Result States / 结果状态

- `passed`: every required stage completed successfully / 所有必需阶段成功完成
- `failed`: a required stage failed or was skipped unexpectedly / 必需阶段失败或被意外跳过
- `incomplete`: executed stages passed, while deployed production evidence is still absent / 已执行阶段通过，但仍缺少部署后的生产证据

## Inputs / 输入

`candidate` requires `CONTROLLED_BASE_URL`. `production` uses the public `BASE_URL` and requires the controlled target plus release credentials supplied through environment variables.

`candidate` 必须提供 `CONTROLLED_BASE_URL`。`production` 使用公开 `BASE_URL`，并通过环境变量接收受控目标与发布凭据。

```text
BASE_URL
CONTROLLED_BASE_URL
PRIMARY_USERNAME
PRIMARY_PASSWORD
SECONDARY_EMAIL_MODE=user-assisted
ARTIFACT_DIR                 # optional / 可选
QA_PREFIX                    # optional / 可选
BUN_EXECUTABLE               # optional / 可选
```

Credentials remain in process environment only. Tracked `.env` files and command examples contain placeholders.

凭据仅通过进程环境传入。受跟踪的 `.env` 文件和命令示例只保留占位符。

## Evidence / 验证证据

Each run writes:

每次运行写入：

- `summary.json`
- `summary.md`
- `stages/*.json`
- command tail logs / 命令尾部日志

Artifact serialization redacts credential-like keys and values. Console output identifies a failed rule by file, line, and rule name without printing matched secret text.

Artifact 序列化会脱敏凭据类键和值。控制台仅按文件、行号和规则名定位失败项，不打印匹配到的敏感文本。

## Environment Failures / 环境失败

Local browser gates require Docker Desktop, the local backend stack, a Pages-compatible preview, and the local audit bridge. Missing dependencies produce a failed or environment-blocked result in the evidence. Fallback output never counts as a release pass.

本地浏览器门禁依赖 Docker Desktop、本地后端栈、兼容 Pages 的预览服务和本地审计桥。依赖缺失会在证据中记录为失败或环境阻塞；fallback 结果不能计为发布通过。

## Release Decision / 发布判定

1. Run `prepush-full` before pushing a release change / 发布变更推送前执行 `prepush-full`
2. Run `candidate` against a controlled deployment / 对受控部署执行 `candidate`
3. Deploy `main` through the configured platform / 通过既有平台部署 `main`
4. Run `production` against the deployed site / 对已部署站点执行 `production`
5. Accept the release only when `production` reports `passed` / 仅在 `production` 报告 `passed` 时接受发布

Runner implementation and stage contracts live in [scripts/validate-release.mjs](scripts/validate-release.mjs) and [scripts/lib/validate-release.js](scripts/lib/validate-release.js).

Runner 实现与阶段合同位于 [scripts/validate-release.mjs](scripts/validate-release.mjs) 和 [scripts/lib/validate-release.js](scripts/lib/validate-release.js)。
