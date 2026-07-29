# MomiChan

籾山姫璃（籾山ひめり / Momiyama Himeri）

[简体中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

MomiChan 是我个人开发和维护的籾山姫璃粉丝站。

- 汇总 YouTube、X、TikTok、SHOWROOM 和 Instagram 的公开动态
- 提供内容搜索、日程、社区、收藏、通知及账号安全功能
- 支持桌面端、移动端、PWA 离线访问和三语界面
- 使用同源 `/api/v1` 连接 Cloudflare Pages Functions 与后端服务

## 技术栈

| 分层       | 技术                                                 |
| ---------- | ---------------------------------------------------- |
| 前端       | Vue 3、TypeScript、Vite、Vue Router、Vue I18n        |
| 状态管理   | Pinia、pinia-plugin-persistedstate                   |
| 边缘与 PWA | Cloudflare Pages、Functions、Workers、Service Worker |
| 测试与质量 | Vitest、Puppeteer、Lighthouse、ESLint、Prettier      |

## 架构

```text
浏览器（Vue SPA + PWA）
└── 同源 /api/v1
    └── Cloudflare Pages Functions
        └── Internal API Gateway Worker
            └── 后端服务
```

| 目录                      | 职责               |
| ------------------------- | ------------------ |
| `src/views/`、`src/hmr/`  | 页面与业务界面     |
| `src/api/`、`src/stores/` | API 请求与共享状态 |
| `functions/`、`src/edge/` | 同源入口与边缘渲染 |
| `workers/internal-api/`   | 内部后端网关       |

## 运行

- Node.js `>=24.11.1 <25`
- Bun `1.3.14`

```bash
bun install --frozen-lockfile
bun run dev
```

本地地址：`http://127.0.0.1:5173`

## 命令

```bash
bun run type-check
bun run lint:strict
bun run test:unit
bun run validate:release:prepush
bun run build
```

配置：[`.env.example`](.env.example) · [`wrangler.toml`](wrangler.toml)

验收：[`VALIDATION.md`](VALIDATION.md)
