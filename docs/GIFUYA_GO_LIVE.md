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

## 5. ストーリー自動投稿（保留・触らないこと）

- ストーリーは別経路: `poster.py:428-456 ig_post()`（`media_type:"STORIES"`）→ `poster.py:505-519 post()`。
- **`post()` は `fresh_token()`（三条トークン固定）**で、account 引数を持たない（`poster.py:506`）。呼び出しは `post_approved.py:399`＋`post.yml`（三条のみ）。
- ⇒ **`post()`/`ig_post`/`post.yml` に `IG_ACCESS_TOKEN_GIFUYATENJIN` 経路を足さない限り、ぎふやのストーリーは動かない＝保留のまま安全。**
- 解禁する時は: `post()` に `account` 引数を追加し `fresh_token_for("gifuyatenjin")` を使用、ぎふや用 `post_approved`/`post.yml` を用意（本手順書のスコープ外）。

---

### まとめ
「実装直前」= 上記 §0 完了・§1〜§2 の外部作成待ち。外部が揃えば §3 の少量フリップで実稼働。
ストーリーは §5 のレバーに触れない限り保留。
