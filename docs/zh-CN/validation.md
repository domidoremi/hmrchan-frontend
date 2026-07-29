# 发布验证

[返回中文 README](../../README.md) · [English](../en/validation.md)

`validate:release` 是发布判定入口。各模式均在 `output/validation/<timestamp>/` 写入结构化证据，生成内容保持未跟踪状态。

## 命令

```bash
bun run validate:release --mode hook --quiet
bun run validate:release --mode prepush-full --quiet
bun run validate:release --mode local --quiet
bun run validate:release --mode candidate
bun run validate:release --mode production
```

`prepush` 是 `hook` 的兼容别名，默认模式为 `local`。

## 模式

| 模式              | 必需阶段                                     | 结果契约                    |
| ----------------- | -------------------------------------------- | --------------------------- |
| `hook`, `prepush` | 合同检查、格式、类型、严格 lint、runner 窄测 | 推送门禁                    |
| `prepush-full`    | 完整静态门禁、单测、构建、安全检查、包体预算 | 加强推送门禁                |
| `local`           | 完整静态门禁与本地浏览器门禁                 | 部署验证前为 `incomplete`   |
| `candidate`       | 本地门禁、受控站点门禁、生产预检             | 生产深回归前为 `incomplete` |
| `production`      | candidate 阶段与生产深回归                   | 全部通过才得到发布 `passed` |

Git pre-push hook 执行 `hook --quiet`，不运行全量单测、构建、Docker、浏览器自动化或生产验证。

## 结果状态

- `passed`：所有必需阶段成功完成
- `failed`：必需阶段失败或被意外跳过
- `incomplete`：已执行阶段通过，但仍缺少部署后的生产证据

## 输入

`candidate` 必须提供 `CONTROLLED_BASE_URL`。`production` 使用公开 `BASE_URL`，并通过环境变量接收受控目标与发布凭据。

```text
BASE_URL
CONTROLLED_BASE_URL
PRIMARY_USERNAME
PRIMARY_PASSWORD
SECONDARY_EMAIL_MODE=user-assisted
ARTIFACT_DIR                 # 可选
QA_PREFIX                    # 可选
BUN_EXECUTABLE               # 可选
```

凭据仅通过进程环境传入。受跟踪的 `.env` 文件和命令示例只保留占位符。

## 验证证据

每次运行写入：

- `summary.json`
- `summary.md`
- `stages/*.json`
- 命令尾部日志

Artifact 序列化会脱敏凭据类键和值。控制台仅按文件、行号和规则名定位失败项，不打印匹配到的敏感文本。

## 环境失败

本地浏览器门禁依赖 Docker Desktop、本地后端栈、兼容 Pages 的预览服务和本地审计桥。依赖缺失会在证据中记录为失败或环境阻塞，fallback 结果不能计为发布通过。

## 发布判定

1. 发布变更推送前执行 `prepush-full`
2. 对受控部署执行 `candidate`
3. 通过既有平台部署 `main`
4. 对已部署站点执行 `production`
5. 仅在 `production` 报告 `passed` 时接受发布

Runner 实现与阶段合同位于 [`scripts/validate-release.mjs`](../../scripts/validate-release.mjs) 和 [`scripts/lib/validate-release.js`](../../scripts/lib/validate-release.js)。
