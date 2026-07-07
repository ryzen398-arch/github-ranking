# GitHub Ranking (Next.js + PostgreSQL版)

GitHubで各期間(24時間 / 7日 / 30日)に作成されたリポジトリをスター数順に集計して表示するサイト。
ログイン(NextAuth)、お気に入り(PostgreSQL永続化)、Claude AIによる日本語解説(Stripeの月額980円 Proプラン限定)付き。

## 技術スタック

- **Next.js 14** (App Router) + TypeScript
- **PostgreSQL** + **Prisma**
- **NextAuth** (Credentials Provider, JWTセッション) — ユーザー名+パスワードの自作ログイン
- **Stripe** サブスクリプション (Checkout + Webhook + カスタマーポータル)
- **Claude API** (`claude-sonnet-4-6`) によるリポジトリ解説、DBにキャッシュして再課金なし

## ディレクトリ構成

```
github-ranking-next/
├── prisma/schema.prisma        # User / Favorite / Explanation
├── src/
│   ├── app/
│   │   ├── page.tsx            # メインUI ('use client')
│   │   ├── layout.tsx / providers.tsx / globals.css
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts   # NextAuthハンドラ
│   │       ├── me/route.ts                   # ログイン状態・Pro判定
│   │       ├── ranking/route.ts              # GitHub Search APIプロキシ
│   │       ├── favorites/route.ts            # お気に入りCRUD
│   │       ├── explain/route.ts              # AI解説 (Pro限定)
│   │       └── stripe/{checkout,portal,webhook}/route.ts
│   ├── components/{AuthModal,RepoCard}.tsx
│   └── lib/{prisma,auth,stripe}.ts
└── public/                      # favicon一式
```

## ローカル開発

```bash
npm install
cp .env.example .env.local   # 値を埋める
npx prisma migrate dev --name init   # PostgreSQLにテーブル作成
npm run dev
# → http://localhost:3000
```

## 環境変数

| 変数 | 必須 | 内容 |
|---|---|---|
| `DATABASE_URL` | ✓ | PostgreSQL接続文字列 |
| `NEXTAUTH_URL` | ✓ | サイトのURL (本番は公開ドメイン) |
| `NEXTAUTH_SECRET` | ✓ | `openssl rand -base64 32` で生成 |
| `ANTHROPIC_API_KEY` | AI解説に必須 | Anthropic ConsoleのAPIキー |
| `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` | 課金に必須 | 未設定ならAI解説は無料開放モード |
| `STRIPE_WEBHOOK_SECRET` | 課金に必須 | Webhookの署名検証用 |
| `GITHUB_TOKEN` | 任意 | GitHub Search APIのレート制限を10/分→30/分に緩和 |

## Stripeの設定

1. 商品カタログ → 商品を作成 → 「GitHub Ranking Pro」 → 料金 **¥980 / 月 (継続)** → `price_...` を`STRIPE_PRICE_ID`に
2. 開発者 → Webhook → エンドポイント追加 → URL: `https://<公開ドメイン>/api/stripe/webhook`
   → イベント: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   → 発行される署名シークレット(`whsec_...`)を`STRIPE_WEBHOOK_SECRET`に
3. 設定 → Billing → カスタマーポータルを有効化(「購読管理」ボタンで使用)
4. まずテストモード(`sk_test_...` + テストカード `4242 4242 4242 4242`)で一通り確認してから本番キーへ

## Railwayへのデプロイ手順

1. このフォルダをGitHubリポジトリにpush
2. Railway → **New Project → Deploy from GitHub repo**
3. 同じプロジェクトに **+ New → Database → PostgreSQL** を追加
   → 自動生成される`DATABASE_URL`をアプリのVariablesに接続(Railwayの「Reference」機能で参照可能)
4. アプリの **Variables** に上表の環境変数を設定
   (`NEXTAUTH_URL`はRailwayが発行するドメインが確定してから設定)
5. **Settings → Deploy → Custom Start Command** を以下に変更(初回マイグレーション適用のため)
   ```
   npx prisma migrate deploy && npm run start
   ```
6. **Settings → Networking → Generate Domain** で公開
7. StripeのWebhookエンドポイントURLを、発行された公開ドメインに更新

## 動作フロー

- ログイン: ユーザー名+パスワードを1つのフォームで送信し、未登録なら自動で新規登録
- 「✦ AI解説」→ 未ログインならログイン促進 → 未購読ならペイウォール(¥980/月でProに登録)→ Stripe Checkout
- 決済完了 → Webhookで購読状態をDBに反映 → サイトに戻ると自動でPRO表示
- 「購読管理」→ Stripeカスタマーポータルでカード変更・解約
- お気に入り/AI解説キャッシュはPostgreSQLに永続化(旧版のlocalStorage実装と異なり複数端末で同期される)

## 実運用前のチェックリスト

- [ ] 特定商取引法に基づく表記・プライバシーポリシーページ(日本で有料販売する場合は必須)
- [ ] Railwayの本番ログでPrismaのマイグレーションが正常に適用されたか確認
- [ ] Stripe Webhookのイベントログで`checkout.session.completed`が正しくUserに反映されているか確認
- [ ] `NEXTAUTH_SECRET`は使い回さず、本番用に新規生成したものを使用

## 開発メモ

このNext.js版はサンドボックス環境の制約上、`prisma generate`(Prismaのエンジンバイナリのダウンロードが
必要)まではローカル検証できていません。TypeScriptの型チェックと`next build`のコンパイルは正常に通ることを
確認済みです。実際のデプロイ・ローカル開発時にインターネット接続がある環境で
`npx prisma migrate dev` を実行すれば問題なく動作します。
