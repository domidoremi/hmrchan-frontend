# Backend Handoff Docs

这批文档从 `hmrchan-backend/docs` 同步而来，供前端仓库直接查阅。

## 阅读顺序

1. `frontend-integration.md`
   认证、登录注册、Google callback、MFA 和前端联调主说明。
2. `frontend-improvement-checklist.md`
   基于当前前端代码现状整理的优先修复清单。
3. `frontend-split-handoff.md`
   split-only 切换后的 UUID canonical、best-effort 富化、rehearsal fixture 与 smoke 要点。
4. `frontend-security-handoff.md`
   强制安全策略、签名/来源校验、幂等键、`permission_version` 和错误码动作映射。
5. `contracts/README.md`
   后端契约文档入口。
6. `contracts/*.md` 与 `contracts/openapi/*.yaml`
   供联调或生成类型时使用的按域契约与 OpenAPI 真相源。

## 当前已同步的文件

- `frontend-integration.md`
- `frontend-improvement-checklist.md`
- `frontend-split-handoff.md`
- `frontend-security-handoff.md`
- `contracts/README.md`
- `contracts/identity-account-security.md`
- `contracts/community-interaction.md`
- `contracts/content-discovery.md`
- `contracts/openapi/identity-account-security.openapi.yaml`
- `contracts/openapi/community-interaction.openapi.yaml`
- `contracts/openapi/content-discovery.openapi.yaml`

## 当前未同步的内容

- `docs/google-auth-e2e-checklist.md`
  这份仍是后端仓库里的独立 QA 草稿，当前没有并入这批正式前端交付文档。

## 同步来源

来源目录：

- `G:\Project\hmrchan\hmrchan-backend\docs`

当前落点：

- `G:\Project\hmrchan\hmrchan-frontend\docs\backend-handoff`
