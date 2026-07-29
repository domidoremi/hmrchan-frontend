<p align="center">
  <img src="public/icons/icon-192x192.png" width="128" height="128" alt="MomiChan" />
</p>

<h1 align="center">MomiChan</h1>

<p align="center"><strong>籾山ひめり</strong>（籾山姫璃 / Momiyama Himeri）</p>

<p align="center">
  <a href="README.md">简体中文</a> ·
  <a href="README.en.md">English</a> ·
  <a href="README.ja.md"><strong>日本語</strong></a>
</p>

<p align="center">
  <img alt="Vue 3" src="https://img.shields.io/badge/Vue_3-42b883?logo=vuedotjs&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646cff?logo=vite&logoColor=white" />
  <img alt="Cloudflare Pages" src="https://img.shields.io/badge/Cloudflare_Pages-f38020?logo=cloudflarepages&logoColor=white" />
  <img alt="Bun 1.3.14" src="https://img.shields.io/badge/Bun-1.3.14-14151a?logo=bun&logoColor=white" />
</p>

> 籾山ひめりさんのために個人で開発・運営しているファンサイトです。

## ✨ 機能

- YouTube、X、TikTok、SHOWROOM、Instagram の公開情報をまとめて表示
- コンテンツ検索、スケジュール、コミュニティ、お気に入り、通知、アカウント保護に対応
- デスクトップ、モバイル、PWA オフライン表示、3 言語の画面に対応
- 同一オリジンの `/api/v1` から Cloudflare Pages Functions とバックエンドへ接続

## 🧩 技術スタック

| レイヤー       | 技術                                                 |
| -------------- | ---------------------------------------------------- |
| フロントエンド | Vue 3、TypeScript、Vite、Vue Router、Vue I18n        |
| 状態管理       | Pinia                                                |
| エッジと PWA   | Cloudflare Pages、Functions、Workers、Service Worker |
| テストと品質   | Vitest、Puppeteer、Lighthouse、ESLint、Prettier      |

## 🏗️ アーキテクチャ

```text
ブラウザ（Vue SPA + PWA）
└── 同一オリジン /api/v1
    └── Cloudflare Pages Functions
        └── Internal API Gateway Worker
            └── バックエンドサービス
```

| パス                      | 役割                                 |
| ------------------------- | ------------------------------------ |
| `src/views/`、`src/hmr/`  | ページとドメイン UI                  |
| `src/api/`、`src/stores/` | API 通信と共有状態                   |
| `functions/`、`src/edge/` | 同一オリジン窓口とエッジレンダリング |
| `workers/internal-api/`   | 内部バックエンドゲートウェイ         |

## 🚀 起動

- Node.js `>=24.11.1 <25`
- Bun `1.3.14`

```bash
bun install --frozen-lockfile
bun run dev
```

ローカル URL：`http://127.0.0.1:5173`

## 🧪 検証

```bash
bun run type-check
bun run lint:strict
bun run test:unit
bun run validate:release:prepush
bun run build
```

環境設定：[`.env.example`](.env.example) · [`wrangler.toml`](wrangler.toml)

検証ガイド：[`VALIDATION.ja.md`](VALIDATION.ja.md)
