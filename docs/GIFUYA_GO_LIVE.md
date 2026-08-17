# ぎふや福岡天神 実稼働化 手順書（GO-LIVE Runbook）

`@gifuya_fukuokatenjin` を、すさび湯三条と同じ「実稼働アカウント」にするための残作業一覧。
**コード側の下準備は完了済み**（本ドキュメント §0）。残るのは主に **Google/Meta 側の作成**と、
最後の**有効化フリップ**だけ。ここまでが「実装直前」の状態。

> ⚠️ ストーリー自動投稿は**保留**。§5 のレバーに触れない限り、ぎふやはフィード/リールのみ。

---

## 0. 完了済み（コード側の下準備）

- **予約投稿バックエンド（フィード/リール）** … `susabiyu-remotion/poster.py`（`fresh_token_for` / `guard_account` / `AcctTokens`タブ）、`post_reservations.py`（`予約投稿`タブ J列=account）、`token_guard.py`。
- **ワークフローの秘密鍵配線** … `reservations.yml` / `tokenguard.yml` / `store_master.yml` が `IG_ACCESS_TOKEN_GIFUYATENJIN` を参照済み。`reservations.yml` は 15分毎・`RESV_LIVE=1`。
- **確認アプリ（見本）** … `pwa/gifuyatenjin.html`（確認/見本/レポート）＋ `pwa/gifuya_reels.html`（フィード/リール確認）。三条と同一デザイン。
- **実稼働の受け皿** …
  - `pwa/config.gifuya.js`（`GAS_URL` プレースホルダ＋ `ACCOUNT:"gifuyatenjin"`）。
  - `deploy_pwa.yml` が Secret `GIFUYA_GAS_EXEC_URL` を `config.gifuya.js` に自動注入（未設定なら見本のまま）。
  - 両ページは `config.gifuya.js` を読み込み、`window.GIFUYA_LIVE` を判定（現状 false=見本）。

---

## 1. 外部作成（Google / Meta 側・リポジトリからは実行不可）

1. **ぎふや専用スプレッドシート**を作成（三条の複製が早い）。タブ: `承認待ち` `パターン` `予約投稿`(A–J) `AcctTokens` `インサイト投稿` `インサイト日次` `購読` `Config`。→ `SHEET_ID` を控える。
2. **ぎふや専用 GAS プロジェクト**（Apps Script）を作成し、上記スプレッドシートに紐付け。→ `scriptId` を控える。
   - ソースは三条の `gas/src/コード.js` をベースに、`SHEET_ID`（`:5`）とログイン/管理コード（`APP_KEY`/`OWNER_KEY` `:9,13`）をぎふや用に変更。
   - **予約の店舗振り分け**: `schedCreate_`（`コード.js:727-734`）が現状 A–I しか書かないため、**J列に `"gifuyatenjin"` を書く**よう1行追加（これでPWAからの予約が確実にぎふやアカウントへ）。
3. **Web公開デプロイ**して `/exec` URL を取得。→ `GIFUYA_GAS_EXEC_URL` として控える。
4. **Meta/Instagram**: `@gifuya_fukuokatenjin` のトークンは取得済み。有効期限が近ければ更新（60日）。

## 2. GitHub Secrets 設定

| Secret | 値 | 用途 |
|--------|----|------|
| `GIFUYA_GAS_EXEC_URL` | §1-3 の `/exec` URL | `config.gifuya.js` へ自動注入（実データ連携ON） |
| `IG_ACCESS_TOKEN_GIFUYATENJIN` | ぎふやIGトークン | 予約投稿の実行（設定済みなら確認のみ） |

（任意）ぎふや専用GASを clasp 自動デプロイするなら、三条の `gas_deploy.yml` を複製した
`gas_deploy_gifuya.yml` を追加し、`GIFUYA_GAS_SCRIPT_ID` / `CLASPRC_JSON` を用意。

## 3. 最終フリップ（コード・少量）

1. **実データ連携の front 実装**（本手順の「実装」本体）:
   `gifuyatenjin.html` / `gifuya_reels.html` の `LIVE` 分岐で、`window.GIFUYA.GAS_URL` に対し
   `reels.html` と同じ JSONP で `list` / `act` / `report` / `schedule` を呼び、見本配列の代わりに実データを描画。
   （`LIVE=false` の間は現状の見本のまま＝無害。）
2. **店舗一覧を実稼働に**: `pwa/stores.js:34` の `gifuyatenjin` 行を `live:true`、`short:"見本"`→空 に。
   URL は `./gifuyatenjin.html` のままでよい（同ページが LIVE 判定で実データ表示に切替）。
3. **確認フィード生成**: 三条の `prepare.py` は単一 `SHEET_ID` 固定のため、ぎふやの `承認待ち` を
   生成する経路（account 対応 or ぎふや専用実行）を用意（フィード/リールのみ。ストーリーは §5 で保留）。
4. **レポート**: `insights.yml` / `insights.py` を account 対応にし、ぎふやのインサイトタブへ収集。

## 4. 動作確認

- `raw.githubusercontent.com/.../app/config.gifuya.js` に実URLが入っているか（見本文字列でないか）。
- 確認アプリの表示が「実データ連携」（ヘッダ右上）になるか。
- `予約投稿` に J=gifuyatenjin の行を1件入れ、`reservations.yml`（15分毎）で実投稿されるか（まずは `mode=dry` 推奨）。

## 5. ストーリー自動投稿（自己完結版・スプレッドシート/GAS 不要）

**方針変更：** 承認フロー（Sheet/GAS）を使わず、**採用中のぎふやストーリー動画（CDN公開済み）をローテーションで自動投稿**する自己完結版にした。運用者の準備は **トークン1個だけ**。

**実装済み：**
- `susabiyu-remotion/post_gifuya_story.py` … ぎふやストーリー動画（`dv_01/03/04/05/07/08/09/12/14/15`）を日付ベースのローテーションで選び、`poster.ig_post()` で `media_type:STORIES` 投稿。Sheet/GAS/生成パイプライン不要。
- `.github/workflows/post_gifuya.yml` … cron **11:00 / 17:00 / 20:00 JST**（UTC 02/08/11）。`gate` で **`IG_ACCESS_TOKEN_GIFUYATENJIN` が設定されている時だけ**実行（未設定なら即スキップ＝安全）。
- 動画URLは既定で jsDelivr（`cdn.jsdelivr.net/gh/amami-cell/susabiyu-media@main/app/gifuya/…`）。必要なら変数 `GIFUYA_MEDIA_BASE` で差し替え可。
- 三条の投稿パイプライン（`post.yml` / `post_approved.py` / `poster.post` 既定）は**一切無変更**。`poster.post(account=…)` 等の account 対応は追加のみ。

**トークン自動延命（三条と同じ・実装済み）：**
- `post_gifuya_story.py` はトークンを **`poster.fresh_token_for("gifuyatenjin")`** で取得。三条の既存スプレッドシートの **`AcctTokens` タブ**に“延命済みトークン”を保存し、**7日ごとに自動更新**する（60日で切れない）。Secret `IG_ACCESS_TOKEN_GIFUYATENJIN` は最初の“種”。
- さらに `tokenguard.yml`（毎日07:00 JST）の `token_guard.py` が `IG_ACCESS_TOKEN_*` を検出して**毎日 `guard_account` で各店舗トークンを点検＆延命**（ぎふやも対象）。死んだ時だけLINEで1回通知。
- `post_gifuya.yml` に `SHEET_ID` / `GOOGLE_CREDS_B64` を渡して `AcctTokens` に読み書き（三条の既存シートを再利用＝**新しいGoogleセットアップ不要**。トークンは店舗別に分離保存）。

**運用者がやること（これだけ）：**
1. Meta（ぎふやのFB/IG）で **アクセストークンを発行** → GitHub Secret **`IG_ACCESS_TOKEN_GIFUYATENJIN`** に登録（済）。
   → 登録した瞬間から 11/17/20 で自動投稿。以後は **自動延命され、原則ずっと切れない**。
2. （復旧時のみ）万一トークンが完全に無効化されたら（IG側でパスワード変更等）、Secret を新トークンで再登録 → `tokenguard.yml` を `reset` 実行で `AcctTokens` を種から取り直し。
3. （任意）動画セット/順番を変える → `post_gifuya_story.py` の `STORIES` を編集。
4. （任意・テスト）Actions → gifuya-post → Run workflow → `dry=1` でURL確認 / `dry=0` で即時テスト投稿。

---

### まとめ
フィード/リール確認画面・ハッシュタグ取得＝実装・反映済み（見本モード、GAS接続で実データ化）。
**ストーリー自動投稿（11/17/20）＝実装・GitHub登録済み・本番投稿確認済み。トークンは三条と同じく `AcctTokens`＋`token_guard` で自動延命**（新規Googleセットアップ不要／三条は一切無変更）。
