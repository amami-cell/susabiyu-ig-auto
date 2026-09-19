# kobito 協力プレイの中継（Cloudflare Worker）

携帯2台“だけ”で協力プレイをするための小さな中継サーバです。

## なぜ要るの？

携帯（ブラウザ）は WebSocket の「待ち受け（サーバ）」を作れません。だから携帯2台だけ
では、どちらもホストになれず、直接はつながれません。そこで **両方の携帯がこの中継へ
出ていって、中継が橋渡し** します。中継へは外向きの接続なので、モバイル回線でも・
別々の回線どうしでもつながります。

- 費用: **¥0**（Cloudflare Workers の無料枠。Durable Object も SQLite 版は無料枠内）
- 常時稼働・管理不要（VMを持たなくてよい）

## 一度だけの準備（アカウントと鍵）

1. 無料の [Cloudflare アカウント](https://dash.cloudflare.com/sign-up) を作る。
2. **API トークン**を作る：ダッシュボード → 右上のアイコン → *My Profile* → *API Tokens*
   → *Create Token* → テンプレート **「Edit Cloudflare Workers」** を選んで作成。
   出てきた文字列をコピー（これが `CF_API_TOKEN`）。
3. **アカウントID**を控える：Workers & Pages の画面右側に出る *Account ID*（これが `CF_ACCOUNT_ID`）。
4. GitHub のこのリポジトリ → *Settings* → *Secrets and variables* → *Actions* →
   *New repository secret* で次の2つを登録：
   - `CF_API_TOKEN` … 手順2のトークン
   - `CF_ACCOUNT_ID` … 手順3のID

## デプロイ（自動）

`relay/` を変更して push すると、GitHub Actions **`deploy-relay`** が `wrangler deploy` を
実行し、中継が公開されます（手貼り不要）。手動で動かすなら Actions から
`deploy-relay` を *Run workflow*。

デプロイ後の公開URLは次の形です（`<サブドメイン>` はあなたのアカウント固有）：

```
https://kobito-relay.<サブドメイン>.workers.dev
```

動作確認：ブラウザでそのURLを開いて `kobito relay ok` と出ればOK。

## ゲーム側へURLを教える（最後の1回）

ゲームがこの中継を使えるように、`kobito-3d/autoload/net.gd` の

```gdscript
const RELAY_BASE := ""
```

を、上のURLの **`https` を `wss` に変えたもの** にします：

```gdscript
const RELAY_BASE := "wss://kobito-relay.<サブドメイン>.workers.dev"
```

これを push すると Web版が中継対応になり、**携帯2台だけで協力プレイ**ができます
（片方が「みんなで遊ぶ」で“あいことば”を作り、もう片方が同じ言葉で参加）。

> メモ: `RELAY_BASE` を書き換えなくても、端末ごとに `user://settings.cfg` の
> `[net] relay` で上書きできます（テスト・差し替え用）。

## ローカルで試す（任意）

```bash
cd relay
npm install
npm run dev      # wrangler dev。ws://127.0.0.1:8787/r?room=TEST&role=host など
```
