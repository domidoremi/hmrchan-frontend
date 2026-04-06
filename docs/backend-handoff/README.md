# Backend Handoff Docs

这批文档从 `hmrchan-backend/docs` 同步而来，供前端仓库直接查阅。

## 阅读顺序

1. `frontend-integration.md`
   认证、登录注册、Google callback、MFA 和前端联调主说明。
2. `frontend-improvement-checklist.md`
   基于当前前端代码现状整理的优先修复清单。
3. `frontend-joint-checklist.md`
   前后端联调执行步骤版，按环境、安全链、Google、会话与 split-only 业务顺序验。
4. `frontend-qa-checklist.md`
   QA 打勾版验收清单，适合联调结束前做最终通过确认。
5. `frontend-split-handoff.md`
   split-only 切换后的 UUID canonical、best-effort 富化、rehearsal fixture 与 smoke 要点。
6. `frontend-security-handoff.md`
   强制安全策略、签名/来源校验、幂等键、`permission_version` 和错误码动作映射。
7. `google-auth-e2e-checklist.md`
   Google 生产 redirect URI、callback 二跳、post-deploy smoke 和 QA 验收清单。
8. `community-comments-cursor-rollout-checklist.md`
   `posts/:id/comments` strict cursor、`community/hot` / `latest` 修复版本的发布顺序与 smoke 清单。
9. `contracts/README.md`
   后端契约文档入口。
10. `contracts/*.md` 与 `contracts/openapi/*.yaml`
    供联调或生成类型时使用的按域契约与 OpenAPI 真相源。

## 当前已同步的文件

- `frontend-integration.md`
- `frontend-improvement-checklist.md`
- `frontend-joint-checklist.md`
- `frontend-qa-checklist.md`
- `frontend-split-handoff.md`
- `frontend-security-handoff.md`
- `google-auth-e2e-checklist.md`
- `community-comments-cursor-rollout-checklist.md`
- `contracts/README.md`
- `contracts/identity-account-security.md`
- `contracts/community-interaction.md`
- `contracts/content-discovery.md`
- `contracts/openapi/identity-account-security.openapi.yaml`
- `contracts/openapi/community-interaction.openapi.yaml`
- `contracts/openapi/content-discovery.openapi.yaml`

## 同步来源

来源目录：

- `G:\Project\hmrchan\hmrchan-backend\docs`

当前落点：

- `G:\Project\hmrchan\hmrchan-frontend\docs\backend-handoff`
