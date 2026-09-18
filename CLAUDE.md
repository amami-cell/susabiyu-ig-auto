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

## 自動投稿の鉄則（夜間厳禁・未投稿ゼロ）※全店・新店とも必ず守る
自動投稿(ストーリー/フィード等)は次の2点を**絶対に**満たすこと。新しい店舗を実装する時も同じ。
1. **夜中に投稿しない。** 投稿は許容窓 **10:00〜22:00 JST** の中だけ。窓の外(深夜)では絶対に出さない
   （`post_approved.py` の窓ガード＝`POST_WINDOW_FROM/TO`。各投稿ワークフローで `POST_SCHED_GUARD` をONにして担保）。
2. **「投稿できてない」を起こさない。** GitHubのschedule発火は**数時間遅れる/間引かれる**（実測4〜5.7h）。
   1日数回の疎なcronだと、遅延で発火が窓を飛び越えて**全枠スキップ＝未投稿**になる（実際に起きた事故）。
   → **窓の時間帯を30分おきにポーリング**（`cron: '*/30 1-13 * * *'` ＝ JST 10:00-22:30）し、**毎回その日の全枠を試す**。
   `post_approved.py` のガードが「投稿済み=skip／まだ枠前=skip（早出し防止）／窓外=skip（夜間防止）／大幅遅延=skip」を
   判定するので、**各枠は窓内で最初に回った実行が1回だけ投稿**する（二重投稿しない・未来枠を早出ししない）。
   - 実装パターン：ワークフローは `for HH in <その店のslots>; do python post_approved.py creds.json "$(TZ=Asia/Tokyo date +%F) ${HH}:00" || true; done`。
     手動 workflow_dispatch で日時を明示した時だけガードOFF＝その枠を即投稿（アプリの「即投稿」用）。
   - `POST_MAX_LATE_MIN` は窓幅ぶん（600分）確保。窓(10-22)が実質の上限になるようにする。
   - 各店のslotsは `stores.py`（三条=weekday[16,18,20]/holiday[11,18,20]、ぎふや[11,17,20]、ナガグツ[12,18,20]、GOLD[11,18,20]）。
- 反面教師（2026-09）：疎なcron＋遅延で ナガグツの18/20時枠が毎回窓外スキップ＝ストーリーが全然上がらなかった。

## 店舗情報（住所・営業時間・アクセス・エリア等）は必ずこのスプレッドシートを読む（必須）
**ユーザーに聞かない。下記シートを読む。** 住所・営業時間・アクセス・エリア・電話・予約リンク・
クチコミ・コース等は全店ぶん、この「店舗受付（記入用）」スプレッドシートの **「入力用」タブ**に
オーナーが記入している（K〜AA列）。

- スプレッドシートID: `1SyfW4c6HN4urmVHWLrTA-dHUVr5ZT9nqIFboNKn4BuQ`
  （URL: https://docs.google.com/spreadsheets/d/1SyfW4c6HN4urmVHWLrTA-dHUVr5ZT9nqIFboNKn4BuQ/edit ）
- 読み方: `store_master.py reqdump <上記ID>`（読み取り専用）。`store_master.yml` の
  mode=reqdump / store_id=<ID> でも可。各行の「入っている項目／空の項目」が出る。
- 列: K表示名 / L業態 / Mエリア / N住所 / O営業時間 / Pアクセス / Q電話 / R予約① / S予約② /
  Tクチコミ / U公式URL / V紹介文 / Wキャッチ / X定番タグ / Y IGユーザーID / Z定休日 / AAコース
- ⚠ このシートIDは Secret **`REQ_SHEET_ID`** に未登録のため、`prepare` 等は自動では読めず
  `stores.py` のフォールバックに落ちる。**新店対応や店舗情報を使う作業では、まずこのシートを
  reqdump で読んで実データを確認してから進めること。** 恒久策は REQ_SHEET_ID にこのIDを登録。
- 記録済みの実データ（2026-09 時点）:
  - ナガグツ = 大阪・梅田の店（エリア「梅田・堂山町」／住所 大阪府大阪市北区堂山町8-8 梅田エイトビル1F
    ／営業 日〜木11:30〜24:00・金土祝前11:30〜翌5:00／各線梅田駅 徒歩8分・中崎町駅 徒歩5分）。
    **京都の店ではない**（stores.py の region が長く空で、京都と誤認しやすかった）。

## 見本を焼いたら「確認アプリへの反映」までが1セット（必須）
ユーザーは**確認アプリで見て判断する**。動画・画像を焼いたら、承認を待たずに次を最後まで進めること。

1. レンダリング（`yoshoku_samples.yml` / `list-cats.yml` 等）
2. `pwa/config.<account>.js` の該当テンプレのURL・posterを差し替え
3. `pwa/sw.js` の `VER` を1つ上げる
4. commit → PR → **main にマージ**（`deploy_pwa` が走って初めてアプリに出る）
5. そのうえでチャットに動画を送り、判断を仰ぐ

**「これで良ければアプリに入れます」と言って止まらない。** 入れてから聞く。
差し替えが気に入らなければ戻せばよい（承認済みのファイルURLは config の履歴に残っている）。

> 実例：2026-09-14 の音ハメ作業で、焼いた動画をチャットに送るだけで止めてしまい、
> 「アプリに入ってる？」「アプリに入れた？」「アプリに入れてる？」と3回聞かせた。

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
