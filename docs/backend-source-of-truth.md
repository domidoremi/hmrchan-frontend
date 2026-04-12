# 后端真相源入口

前端仓库不再保存后端接口文档、副本 OpenAPI 或联调 checklist。

当前唯一真相源位于后端仓库的这些文件：

- `docs/frontend-integration.md`
- `docs/contracts/README.md`
- `docs/contracts/identity-account-security.md`
- `docs/contracts/community-interaction.md`
- `docs/contracts/content-discovery.md`
- `docs/contracts/openapi/*.yaml`

使用规则：

- 查前端联调、登录注册、Google callback、MFA、安全链路时，优先看 `frontend-integration.md`
- 查按域规则、错误语义、分页/summary/PATCH 语义时，直接看 `docs/contracts/*`
- 需要生成类型或做接口核对时，使用后端仓库里的 checked-in OpenAPI artifact
- 不要再把后端文档复制回前端仓库；如发现内容漂移，直接修改后端仓库中的真相源
