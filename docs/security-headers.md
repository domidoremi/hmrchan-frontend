# Security Header Sources

MomiChan 的响应头来源分为两层，避免再出现“注释说有安全头，但实际配置在别处”的维护歧义。

## HTML 文档头

- 来源: [`functions/_middleware.ts`](../functions/_middleware.ts)
- 路由接入: [`public/_routes.json`](../public/_routes.json) 需要让 HTML 请求经过 Pages Functions，中间件的 HTML 安全头和 404 才会真正生效。
- 负责:
  - `Content-Security-Policy`（动态 nonce）
  - `Strict-Transport-Security`
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Cross-Origin-Opener-Policy`

## 静态资源缓存头

- 来源: [`public/_headers`](../public/_headers)
- 负责:
  - HTML 短缓存
  - `/.well-known/security.txt` 等静态公开说明文件
  - 带 hash 的 JS/CSS/图片/字体长缓存
  - Service Worker 禁止缓存

## Well-Known 公共文件

- 来源: [`public/.well-known/security.txt`](../public/.well-known/security.txt)
- 路由放行: [`public/_routes.json`](../public/_routes.json) 需要排除 `/.well-known/*`，否则 Pages Functions 会把该路径误当成 SPA HTML 请求处理。

## 运行时职责总览

| 层              | 来源                                                                                                                                                                                          | 主要职责                                                                   | 备注                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Vite 构建       | [`vite.config.ts`](../vite.config.ts) / [`build/vite/plugins`](../build/vite/plugins)                                                                                                         | 打包、分块、Critical CSS、SRI、静态预渲染、可选 sourcemap                  | 生产默认不输出 sourcemap，只有显式设置 `VITE_SOURCEMAP` 时才启用 |
| Pages Functions | [`functions/_middleware.ts`](../functions/_middleware.ts) / [`functions/api/[[path]].ts`](../functions/api/[[path]].ts) / [`functions/uploads/[[path]].ts`](../functions/uploads/[[path]].ts) | HTML 安全头、动态 CSP nonce、canonical/prerender shell、API / uploads 代理 | 通过 `public/_routes.json` 接管 HTML 请求                        |
| Static headers  | [`public/_headers`](../public/_headers)                                                                                                                                                       | 静态资源缓存头、HTML 短缓存、`/sw.js` 禁止缓存                             | 不声明 HTML 安全头，避免与动态 CSP 冲突                          |
| Service Worker  | [`public/sw.js`](../public/sw.js) / [`src/utils/cache/swRegister.ts`](../src/utils/cache/swRegister.ts)                                                                                       | 离线兜底、缓存策略、后台同步、版本升级通知                                 | 正式注册路径固定为 `/sw.js`                                      |

## 维护约定

- 新增或修改 HTML 安全头时，只改 `functions/_middleware.ts`。
- 新增或修改静态资源缓存策略时，只改 `public/_headers`。
- 不再在缓存头文件里声明 HTML 安全头，避免与动态 CSP nonce 发生冲突。
