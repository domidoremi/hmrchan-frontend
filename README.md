# MomiChan

籾山ひめり · 籾山姫璃 · Momiyama Himeri

[简体中文](#简体中文) · [English](#english) · [日本語](#日本語)

## 简体中文

MomiChan 是我个人开发和维护的籾山姫璃粉丝站。

- 汇总 YouTube、X、TikTok、SHOWROOM 和 Instagram 的公开动态
- 提供内容搜索、日程、社区、收藏、通知及账号安全功能
- 支持桌面端、移动端、PWA 离线访问和三语界面
- 使用同源 `/api/v1` 连接 Cloudflare Pages Functions 与后端服务

## English

MomiChan is my personal fan site for Momiyama Himeri, developed and maintained by me.

- Collects public updates from YouTube, X, TikTok, SHOWROOM, and Instagram
- Includes content search, schedules, community, favorites, notifications, and account security
- Supports desktop, mobile, offline PWA use, and three interface languages
- Connects Cloudflare Pages Functions and backend services through same-origin `/api/v1`

## 日本語

MomiChan は、籾山ひめりさんのために個人で開発・運営しているファンサイトです。

- YouTube、X、TikTok、SHOWROOM、Instagram の公開情報をまとめて表示
- コンテンツ検索、スケジュール、コミュニティ、お気に入り、通知、アカウント保護に対応
- デスクトップ、モバイル、PWA オフライン表示、3 言語の画面に対応
- 同一オリジンの `/api/v1` から Cloudflare Pages Functions とバックエンドへ接続

## 技术栈 / Stack / 技術スタック

| 分层 / Layer / レイヤー | 技术 / Technology / 技術                             |
| ----------------------- | ---------------------------------------------------- |
| 前端 / Frontend         | Vue 3、TypeScript、Vite、Vue Router、Vue I18n        |
| 状态 / State            | Pinia、pinia-plugin-persistedstate                   |
| 边缘与 PWA / Edge & PWA | Cloudflare Pages、Functions、Workers、Service Worker |
| 测试 / Testing          | Vitest、Puppeteer、Lighthouse、ESLint、Prettier      |

## 架构 / Architecture / アーキテクチャ

```text
Browser / 浏览器 / ブラウザ (Vue SPA + PWA)
└── Same-origin /api/v1
    └── Cloudflare Pages Functions
        └── Internal API Gateway Worker
            └── Backend Services / 后端服务 / バックエンドサービス
```

| 目录 / Path               | 职责 / Responsibility / 役割                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| `src/views/`、`src/hmr/`  | 页面与业务界面 / Pages and domain UI / ページとドメイン UI                                |
| `src/api/`、`src/stores/` | API 请求与共享状态 / API access and shared state / API 通信と共有状態                     |
| `functions/`、`src/edge/` | 同源入口与边缘渲染 / Same-origin facade and edge rendering / 同一オリジン窓口とエッジ描画 |
| `workers/internal-api/`   | 内部后端网关 / Internal backend gateway / 内部バックエンドゲートウェイ                    |

## 运行 / Run / 起動

- Node.js `>=24.11.1 <25`
- Bun `1.3.14`

```bash
bun install --frozen-lockfile
bun run dev
```

本地地址 / Local URL / ローカル URL：`http://127.0.0.1:5173`

## 命令 / Commands / コマンド

```bash
bun run type-check
bun run lint:strict
bun run test:unit
bun run validate:release:prepush
bun run build
```

配置 / Configuration / 設定：[`.env.example`](.env.example) · [`wrangler.toml`](wrangler.toml)

验收 / Validation / 検証：[`VALIDATION.md`](VALIDATION.md)
