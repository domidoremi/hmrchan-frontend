# 検証フロー

[简体中文](VALIDATION.md) · [English](VALIDATION.en.md) · [日本語](VALIDATION.ja.md)

このリポジトリでは `validate:release` を唯一の検証エントリーポイントとします。
GitHub Actions は使用せず、検証状態はローカルの統合 runner だけが判定します。

## エントリーポイント

```bash
bun run validate:release
bun run validate:release --mode hook
bun run validate:release:hook
bun run validate:release --mode prepush
bun run validate:release:prepush
bun run validate:release --mode prepush-full
bun run validate:release:prepush:full
bun run validate:release --mode local
bun run validate:release --mode local --quiet
bun run validate:release:local:quiet
bun run validate:release --mode candidate
bun run validate:release --mode production
```

| モード         | 用途                                                             |
| -------------- | ---------------------------------------------------------------- |
| `hook`         | 中負荷の Git hook。build、全 unit、Docker、ブラウザは実行しない  |
| `prepush`      | `hook` の互換エイリアス                                          |
| `prepush-full` | 全 unit、production build、build security を含む完全な静的ゲート |
| `local`        | ローカルブラウザ段階を含む完全なローカル release gate            |
| `candidate`    | 制御対象サイトの候補検証と production precheck                   |
| `production`   | `main` デプロイ後の最終検証。deep regression を含む              |

既定モードは `local` です。artifact は `output/validation/<timestamp>/` に出力され、
`summary.json`、`summary.md`、`stages/*.json` を必ず含みます。`--quiet` はコンソール出力だけを
減らし、各コマンドの stdout と stderr は artifact に保存します。

Windows では共有コマンド実行器が `bun.exe` または `bun.cmd` を解決します。Bun のパスを固定する
必要がある場合だけ `BUN_EXECUTABLE` を設定します。

## ローカルの正本

- `pre-commit` は最小限のフォーマットと staged file の確認だけを行います。
- `pre-push` は常に `bun run validate:release --mode hook --quiet` を実行します。
- hook は worktree を書き換えず、全リポジトリへの `prettier --write` や `eslint --fix` を実行しません。
- `prepush-full` は明示的に実行する強い静的ゲートで、既定 hook には含まれません。
- `local`、`candidate`、`production` は各デリバリー段階で明示的に実行します。
- runner の失敗を個別コマンドの口頭報告で置き換えることはできません。

## 段階定義

### `hook` / `prepush`

1. Contract self-check
2. 中負荷 hook static gate

静的ゲートは `format:check`、`audit:light`、`type-check`、`lint:strict`、
`src/__tests__/scripts/*.spec.ts` の管理テストを実行します。成功しても push gate の通過だけを意味し、
完全な release validation ではありません。

### `prepush-full`

1. Contract self-check
2. 完全なローカル static gate

`format:check`、`audit:light`、`type-check`、`lint:strict`、`test:unit`、`build`、
`build:security-check` を実行します。Docker と browser gate は起動しません。

### `local`

1. Contract self-check
2. 完全なローカル static gate
3. ローカル browser gate

### `candidate`

1. Contract self-check
2. 完全なローカル static gate
3. ローカル browser gate
4. 制御対象サイト gate
5. Production precheck

candidate が成功しても production deep regression が未実行のため状態は `incomplete` です。

### `production`

1. Contract self-check
2. 完全なローカル static gate
3. ローカル browser gate
4. 制御対象サイト gate
5. Production precheck
6. Production deep regression

すべて成功した `production` だけが最終的な `passed` を記録します。

## 必須入力

runner は次の入力を記録して各段階へ渡します。

- `BASE_URL`
- `CONTROLLED_BASE_URL`
- `PRIMARY_USERNAME`
- `PRIMARY_PASSWORD`
- `SECONDARY_EMAIL_MODE=user-assisted`
- 任意の `ARTIFACT_DIR`
- 任意の `QA_PREFIX`

`candidate` と `production` には `CONTROLLED_BASE_URL` が必要です。production の既定対象は
`https://<public-site-origin>` です。`SECONDARY_EMAIL_MODE` は `user-assisted` に固定します。

## 状態の意味

- `passed`: 必須段階がすべて成功。`hook`、`prepush`、`prepush-full`、`production` で使用します。
- `failed`: 必須段階が失敗したか、予期せず skip されました。
- `incomplete`: 検証自体は成功しましたが production deep regression が未完了です。主に `local` と
  `candidate` で使用します。

## ローカル環境のブロック

ローカル browser gate には Docker Desktop、ローカル backend stack、local audit bridge が必要です。
`UPSTREAM_TIMEOUT` や `UPSTREAM_UNREACHABLE` は backend contract の回帰ではなく、ローカル監査環境の
ブロックとして報告します。

非対話環境では低出力コマンドを使用します。

```bash
bun run validate:release --mode hook --quiet
bun run validate:release --mode prepush --quiet
bun run validate:release --mode prepush-full --quiet
bun run validate:release --mode local --quiet
```

`local --quiet` は Docker、backend、audit bridge、Puppeteer、Chrome、または release stage を省略しません。
環境が利用できない場合は失敗として診断可能な結果を残し、完全な成功として扱いません。環境復旧後は
次を実行します。

```bash
bun run check:frontend
bun run test:e2e
bun run validate:release --mode local
```

## ローカル機能チェーンのアカウント行列

アカウント行列は既定の pre-push と local release runner には含まれない、明示的な低出力ゲートです。
ローカル backend、Pages facade、ブラウザ session の動作を検証します。

```bash
PRIMARY_USERNAME='<primary-user>' \
PRIMARY_PASSWORD='<primary-password>' \
PEER_USERNAME='<peer-user>' \
PEER_PASSWORD='<peer-password>' \
ADMIN_USERNAME='<admin-user>' \
ADMIN_PASSWORD='<admin-password>' \
LOCKED_USERNAME='<locked-user>' \
LOCKED_PASSWORD='<locked-password>' \
DISABLED_USERNAME='<disabled-user>' \
DISABLED_PASSWORD='<disabled-password>' \
bun run test:functional-chain:local
```

- login entry point は `POST /api/v1/auth/login` に固定します。
- 認証情報は環境変数だけで渡し、tracked file へ保存しません。
- artifact は `output/functional-chain/<timestamp>/summary.json` と `summary.md` に出力します。
- `FUNCTIONAL_CHAIN_BASE_URL` は起動済みローカル frontend を指定できます。未設定時は Pages preview を
  build して起動します。
- Docker、backend、audit bridge が利用できない場合は `environment-blocked` を記録します。
- 現在の行列は login、`/auth/session:resolve`、session 分離、locked/inactive の 403、誤った password を
  対象とします。複数アカウントの comment、like、notification は別の検証バッチが必要です。

## Contract 入力

runner はリポジトリの正本から contract を導出します。

- Route と detail readiness: [`scripts/lib/release-route-contract.js`](../scripts/lib/release-route-contract.js)
- 認証 warmup probe: [`scripts/lib/auth-bootstrap.js`](../scripts/lib/auth-bootstrap.js)
- Production contract と Pages 環境規則: [`scripts/lib/production-contract-env.js`](../scripts/lib/production-contract-env.js)
- Frontend auth surface と UUIDv7 guard: [`scripts/lib/frontend-contract-audit.js`](../scripts/lib/frontend-contract-audit.js)
- Generated fallback input: [`src/fallbacks/generated/publicSnapshots.ts`](../src/fallbacks/generated/publicSnapshots.ts)
- Snapshot refresh: [`scripts/refresh-public-snapshots.mjs`](../scripts/refresh-public-snapshots.mjs)
- Snapshot contract: [`scripts/lib/public-snapshot-contract.js`](../scripts/lib/public-snapshot-contract.js)
- Runner と影響分類: [`scripts/validate-release.mjs`](../scripts/validate-release.mjs)、[`scripts/lib/validate-release.js`](../scripts/lib/validate-release.js)

hard cutover 後の public resource ID は UUIDv7 文字列だけを使用します。`src/api`、detail route、fallback
snapshot、Service Worker cache key を変更する場合は guard、test、release audit も更新します。checked-in
snapshot に旧 UUIDv4 や数値 ID を含めてはいけません。fallback refresh は `public/snapshot-media/` も
更新する可能性があるため、UUIDv7 contract を満たす backend が必要です。

リスク要約は次のパスを重視します。

- `src/views`、`src/components`、`src/router`
- `src/api`、`src/stores`、`src/services`
- `src/edge`、`functions`、`workers`、`wrangler.toml`
- 検証 contract と runner 自体

## 実行順序

既定検証：

```bash
bun run validate:release
```

候補検証：

```bash
CONTROLLED_BASE_URL=https://controlled.example.com \
bun run validate:release --mode candidate
```

`main` を Pages へデプロイした後：

```bash
BASE_URL=https://<public-site-origin> \
CONTROLLED_BASE_URL=https://controlled.example.com \
PRIMARY_USERNAME=... \
PRIMARY_PASSWORD=... \
SECONDARY_EMAIL_MODE=user-assisted \
bun run validate:release --mode production
```

## 受け入れ規則

- `local` 成功：ローカル static gate と browser gate は成功。release 状態は incomplete のままです。
- `candidate` 成功：制御対象サイトの検証は成功。release 状態は incomplete のままです。
- `production` 成功：デプロイ済み `main` の変更検証が完了しました。
- 必須段階の失敗または skip は failed か incomplete とし、口頭で免除できません。
