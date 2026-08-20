# このリポジトリで作業するAIへの指示

## 最重要：ユーザーにコードを手貼りさせない
ユーザーは Apps Script エディタへの手動コピペを望んでいません。
**コードを書いたら、ファイルを編集 → commit → push まで自分で行うこと。**
「このコードを貼り付けてください」「デプロイしてください」とユーザーに依頼しない。

## 募集システム（エントリーポケット）のGASは自動デプロイ済み
- 対象コード: `entrypocket-recruit/gas/`（`ep_fetch.gs` / `ep_write.gs` / `ep_result.gs` / `dashboard.gs` / `index.html` / `appsscript.json`）
- 仕組み: `entrypocket-recruit/gas/**` を push すると GitHub Actions **`deploy-gas`** が
  `clasp push` → `clasp deploy` を実行し、GAS本体と公開Webアプリ(/exec)を**同じURLのまま自動更新**する。
- つまり**編集して push するだけで本番反映**される。手貼り不要。
- 反映確認: GitHub → Actions → `deploy-gas` が緑になればOK（数十秒）。詳細は `entrypocket-recruit/gas/DEPLOY.md`。

> ⚠️ 注意（バージョンの食い違い）：`main` の `entrypocket-recruit/gas/` には旧い単一ファイル版
> `Code.gs` が残っていることがあります。**ライブで動作しているのは上記の分割ファイル版**
> （`ep_fetch.gs` ほか、Script ID `1OuDuD9…`）です。触るときは**分割ファイル版を正**とし、
> `Code.gs` は統合対象として扱うこと（分割版を push で上書き反映するのが安全）。

### 対象プロジェクトの固定値（他プロジェクトへ誤爆させない）
- 募集システム Script ID: `1OuDuD9HShlXgSR4oyNrnKXOcsy0qOHvkfupAil9mB52PfUOLdhevBWVZ`
- 募集システム /exec Deployment ID: `AKfycbz6i36c7UjbM3S44kl1kEcsI0CSjYo9jL-W-T4BJUAr9jmBlVXj-vnQTUwQbGoxcHYT`
- 認証は GitHub Secret **`EP_CLASPRC_JSON`** の1件のみ（clasp login トークン）。
- ⚠️ 汎用名シークレット `GAS_SCRIPT_ID` / `GAS_DEPLOYMENT_ID` は**別プロジェクト（インスタ承認アプリ `susabiyu承認`）を指すことがある**。
  募集システムのデプロイでこれらを参照してはいけない（`deploy_gas.yml` は固定値を使い、参照しない設計）。

### セッション内で直接デプロイしたい場合（任意）
`clasp` が使える環境なら、`entrypocket-recruit/gas/` を rootDir に上記 Script ID を指定して
`clasp push -f` → `clasp deploy --deploymentId <上記> ` で即時反映も可能。
その際も**対象が募集システムか（`epRun` 等の存在）を確認してから** push すること。

## インスタ投稿システム（別系統・GASではない）
- `susabiyu-remotion/`（Python + Remotion）＋ GitHub Actions（`post.yml` ほか）で動く。
- 投稿は Instagram Graph API（`IG_ACCESS_TOKEN`）経由。**clasp や `EP_CLASPRC_JSON` とは無関係。**
- 承認アプリ `susabiyu承認`（GAS, Script ID `1m-uNPhRRwNgzdFsX3J4H5lsvCp_n2gE_MMOMGk4-3EL3Ppz65RYWPnie`）は
  インスタ運用の一部。募集システムの作業で**絶対に触らない・上書きしない**こと。

## コード提示のしかた
やむを得ずコードを提示する場合も、原則は「自分で編集・push して自動反映」。
全文提示は最後の手段。

## 無料枠を維持する原則（恒久・重要）
運用は「ずっと無料枠の中」で回す方針。以下を必ず守ること。
- **このリポジトリは必ず公開(public)のままにする。** GitHub Actions は公開リポなら標準ランナーが無料・無制限。
  非公開(private)にすると無料枠は月2,000分で、現在のcron頻度（予約投稿は5分ごと等）では足りなくなる。
- **予約投稿(`reservations.yml`)は「1回のcronで全店舗をまとめて処理する1ループ」を維持。**
  店舗が増えてもActions実行回数は増えない設計。店舗ごとに別cronを増やさない（＝店舗数に比例して課金しない）。
- **画像配信はCDN(jsDelivr)経由、将来的にはR2(`R2_PUBLIC_BASE`)へ。** GitHub Pagesへ大量画像を直置きして
  容量・帯域(1GB/100GB等)を圧迫しない。増えたらR2へ逃がす。
- **有料前提の要素を新規導入しない**（有料ランナー、従量課金API、課金前提の外部SaaS等）。必要なら必ず事前相談。
- **画像キャッシュを毎回消さない（写真の再ダウンロード防止）。** `pwa/sw.js` の画像キャッシュは固定名 `susabiyu-media` で
  アプリ更新（VER変更）でも消さない設計。画像URLの `?v=` は**画像の中身が変わった時だけ**上げる（＝`gifuya_photos.py` の sync/fetch のみ）。
  **コードだけの変更では `?v` を上げない**（`sw.js` の VER だけ上げる）。これを破ると更新のたびに全写真を再DLして「写真が遅い」に戻る。
- 50店舗規模で詰まりうるのは Actions費用ではなく **①GAS同時実行/クォータ ②画像配信(Pages→R2) ③IGアプリ全体レート上限** の3点。
  ここは無料枠内の最適化（確認アプリのポーリング間隔・GAS分割・R2移行）で対応する。まずは現構成のままでよい。
