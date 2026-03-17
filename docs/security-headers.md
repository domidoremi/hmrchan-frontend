# Security Header Sources

MomiChan 的响应头来源分为两层，避免再出现“注释说有安全头，但实际配置在别处”的维护歧义。

## HTML 文档头

- 来源: [functions/\_middleware.ts](/G:/Project/hmrchan/hmrchan-frontend/functions/_middleware.ts)
- 路由接入: [public/\_routes.json](/G:/Project/hmrchan/hmrchan-frontend/public/_routes.json) 需要让 HTML 请求经过 Pages Functions，中间件的 HTML 安全头和 404 才会真正生效。
- 负责:
  - `Content-Security-Policy`（动态 nonce）
  - `Strict-Transport-Security`
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Cross-Origin-Opener-Policy`

## 静态资源缓存头

- 来源: [public/\_headers](/G:/Project/hmrchan/hmrchan-frontend/public/_headers)
- 负责:
  - HTML 短缓存
  - 带 hash 的 JS/CSS/图片/字体长缓存
  - Service Worker 禁止缓存

## 维护约定

- 新增或修改 HTML 安全头时，只改 `functions/_middleware.ts`。
- 新增或修改静态资源缓存策略时，只改 `public/_headers`。
- 不再在缓存头文件里声明 HTML 安全头，避免与动态 CSP nonce 发生冲突。
