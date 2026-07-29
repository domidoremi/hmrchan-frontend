<p align="center">
  <img src="public/icons/icon-192x192.png" width="128" height="128" alt="MomiChan" />
</p>

<h1 align="center">MomiChan</h1>

<p align="center"><strong>籾山姫璃</strong>（籾山ひめり / Momiyama Himeri）</p>

<p align="center">
  <a href="README.md"><strong>简体中文</strong></a> ·
  <a href="README.en.md">English</a> ·
  <a href="README.ja.md">日本語</a>
</p>

<p align="center">
  <img alt="Vue 3" src="https://img.shields.io/badge/Vue_3-42b883?logo=vuedotjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646cff?logo=vite&logoColor=white" />
  <img alt="Cloudflare Pages" src="https://img.shields.io/badge/Cloudflare_Pages-f38020?logo=cloudflarepages&logoColor=white" />
  <img alt="Bun 1.3.14" src="https://img.shields.io/badge/Bun-1.3.14-14151a?logo=bun&logoColor=white" />
</p>

> 我个人开发和维护的籾山姫璃粉丝站。

## ✨ 功能

- 汇总 YouTube、X、TikTok、SHOWROOM 和 Instagram 的公开动态
- 提供内容搜索、日程、社区、收藏、通知及账号安全功能
- 支持桌面端、移动端、PWA 离线访问和三语界面
- 使用同源 `/api/v1` 连接 Cloudflare Pages Functions 与后端服务

## 🧩 技术栈

| 分层       | 技术                                                 |
| ---------- | ---------------------------------------------------- |
| 前端       | Vue 3、TypeScript、Vite、Vue Router、Vue I18n        |
| 状态管理   | Pinia、pinia-plugin-persistedstate                   |
| 边缘与 PWA | Cloudflare Pages、Functions、Workers、Service Worker |
| 测试与质量 | Vitest、Puppeteer、Lighthouse、ESLint、Prettier      |

## 🏗️ 架构

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

## 🚀 运行

- Node.js `>=24.11.1 <25`
- Bun `1.3.14`

```bash
bun install --frozen-lockfile
bun run dev
```

本地地址：`http://127.0.0.1:5173`

## 🧪 验证

```bash
bun run type-check
bun run lint:strict
bun run test:unit
bun run validate:release:prepush
bun run build
```

环境配置：[`.env.example`](.env.example) · [`wrangler.toml`](wrangler.toml)

完整验收说明：[`VALIDATION.md`](VALIDATION.md)
