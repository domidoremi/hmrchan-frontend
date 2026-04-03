# 后端契约真相源（Wave 0）

## 目的

本目录是后端规范化之后的 **契约真相源**。从 Wave 0 开始：

- `shared/contracts/runtime_contracts.yaml`：Go / Python / Beat / Worker 共享常量真相源
- `docs/contracts/*.md`：按域维护的后端规则、筛选语义、迁移/退役边界
- `docs/contracts/openapi/*.yaml`：每个域 checked-in 的 OpenAPI artifact
- `docs/frontend-integration.md`：仅保留前端消费视角，不再承担完整后端真相源职责

## 当前全局规则

- 外部公开接口最终只保留 `/api/v1/*`
- 列表接口默认返回 `items + next_cursor + has_more`
- badge / unread / summary / stats 必须拆为独立 summary endpoint
- PATCH 统一采用 **JSON Merge Patch (RFC 7396)** 语义
- 旧 surface 切换完成后直接 `404`

## 前端锁步发布门禁

后端会在 API 响应头返回：

- `X-Server-Contract-Version`

前端构建产物必须携带并发送：

- `X-Client-Contract-Version`

若后端检测到版本不匹配，会返回 `426 Upgrade Required`，前端必须执行 hard reload / upgrade gate。

当前跳过版本门禁的启动/流式路径：

- `/api/v1/client/init`
- `/api/v1/client/verify`
- `/api/v1/inbox/stream`
- `/api/v1/auth/turnstile-config`
- `/health*`
- `/probe/ready`
- `/metrics`

## 开发者入口

- 契约生成：`python scripts/generate_contracts.py`
- 契约校验：`python scripts/check_contracts.py`
- HTTP 覆盖校验：`python scripts/check_api_contract_coverage.py`
- runtime drift 校验：`python scripts/check_runtime_surface.py`
- Playbook：`docs/contracts/domain-rewrite-playbook.md`
- 发布模板：`docs/contracts/release-note-template.md`
- PATCH 语义：`docs/contracts/patch-semantics.md`
