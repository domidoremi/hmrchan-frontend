# MomiChan

籾山ひめり（籾山姫璃 / Momiyama Himeri）

[简体中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

MomiChan は、籾山ひめりさんのために個人で開発・運営しているファンサイトです。

- YouTube、X、TikTok、SHOWROOM、Instagram の公開情報をまとめて表示
- コンテンツ検索、スケジュール、コミュニティ、お気に入り、通知、アカウント保護に対応
- デスクトップ、モバイル、PWA オフライン表示、3 言語の画面に対応
- 同一オリジンの `/api/v1` から Cloudflare Pages Functions とバックエンドへ接続

## 技術スタック

| レイヤー       | 技術                                                 |
| -------------- | ---------------------------------------------------- |
| フロントエンド | Vue 3、TypeScript、Vite、Vue Router、Vue I18n        |
| 状態管理       | Pinia、pinia-plugin-persistedstate                   |
| エッジと PWA   | Cloudflare Pages、Functions、Workers、Service Worker |
| テストと品質   | Vitest、Puppeteer、Lighthouse、ESLint、Prettier      |

## アーキテクチャ

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

## 起動

- Node.js `>=24.11.1 <25`
- Bun `1.3.14`

```bash
bun install --frozen-lockfile
bun run dev
```

ローカル URL：`http://127.0.0.1:5173`

## コマンド

```bash
bun run type-check
bun run lint:strict
bun run test:unit
bun run validate:release:prepush
bun run build
```

設定：[`.env.example`](.env.example) · [`wrangler.toml`](wrangler.toml)

検証：[`VALIDATION.md`](VALIDATION.md)
