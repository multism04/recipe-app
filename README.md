# レシピノート (recipe-app)

レシピのスクリーンショットを Gemini で文字おこしして保存し、検索・並び替えできる PWA。

- 画面: Vite + React + TypeScript（GitHub Pages で公開）
- サーバー: Cloudflare Worker + D1（`worker/`）。Gemini の呼び出しもここで行う（APIキーは端末に置かない）
- 認証: ログインなし。「引き継ぎコード」（32文字のランダム文字列）でデータを紐づける。D1にはコードのSHA-256だけを保存
- スクショ画像は保存しない（文字おこし後に破棄）

## 初回セットアップ（クラウド側）

`worker/` フォルダで実行する。

```bash
npx wrangler d1 create recipe-app-db        # 出力された database_id を wrangler.toml に貼る
npm run db:migrate:remote                   # テーブル作成
npx wrangler secret put GEMINI_API_KEY      # GeminiのAPIキーを貼る
npm run deploy                              # Workerを公開
```

公開されるURLが `https://recipe-app-worker.<アカウント>.workers.dev` 以外なら、`src/api.ts` の URL を直す。

## 画面の公開

1. GitHub に `recipe-app` リポジトリを作り、main に push（GitHub Desktop）
2. リポジトリの Settings → Pages で Source を「GitHub Actions」にする
3. 公開URL: https://multism04.github.io/recipe-app/

`worker/wrangler.toml` の `ALLOWED_ORIGIN` は、このURLのオリジン（`https://multism04.github.io`）。

## ローカル開発

- Worker: `worker/.dev.vars` に `ALLOWED_ORIGIN=http://localhost:5175` と `GEMINI_API_KEY=...` を書き、`npm run db:migrate:local` のあと `npm run dev`
- 画面: `npm run dev -- --port 5175`（開発時のAPI先は `http://localhost:8787`）
- このPC（Windows ARM64）では `npm run build` と oxlint は動かない。型チェックは `npx tsc -b`、本番ビルドはCIで行う。
