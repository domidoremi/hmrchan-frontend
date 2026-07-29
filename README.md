# MomiChan

[简体中文](#简体中文) · [English](#english) · [日本語](#日本語)

## 简体中文

MomiChan 是我个人开发和维护的桃山日女梨粉丝站。

- 汇总 YouTube、X、TikTok、SHOWROOM 和 Instagram 的公开动态
- 提供内容搜索、日程、社区、收藏、通知及账号安全功能
- 支持桌面端、移动端、PWA 离线访问和三语界面
- 使用同源 `/api/v1` 连接 Cloudflare Pages Functions 与后端服务

技术栈：Vue 3、TypeScript、Vite、Pinia、Vue Router、Vue I18n、Cloudflare Pages、Vitest。

## English

MomiChan is my personal fan site for Momiyama Himeri, developed and maintained by me.

- Collects public updates from YouTube, X, TikTok, SHOWROOM, and Instagram
- Includes content search, schedules, community, favorites, notifications, and account security
- Supports desktop, mobile, offline PWA use, and three interface languages
- Connects Cloudflare Pages Functions and backend services through same-origin `/api/v1`

Stack: Vue 3, TypeScript, Vite, Pinia, Vue Router, Vue I18n, Cloudflare Pages, and Vitest.

## 日本語

MomiChan は、桃山日女梨さんのために個人で開発・運営しているファンサイトです。

- YouTube、X、TikTok、SHOWROOM、Instagram の公開情報をまとめて表示
- コンテンツ検索、スケジュール、コミュニティ、お気に入り、通知、アカウント保護に対応
- デスクトップ、モバイル、PWA オフライン表示、3 言語の画面に対応
- 同一オリジンの `/api/v1` から Cloudflare Pages Functions とバックエンドへ接続

技術構成：Vue 3、TypeScript、Vite、Pinia、Vue Router、Vue I18n、Cloudflare Pages、Vitest。

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
