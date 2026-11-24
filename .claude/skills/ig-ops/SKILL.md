---
name: ig-ops
description: >-
  すさび湯グループの Instagram 自動運用（三条/ぎふや福岡/ナガグツ/GOLD/鮨処すさび湯/こまつ原）を
  操作するための運用ランブック。ストーリー/フィードの生成・再レンダ、承認待ちの確認、DM監視、
  LPアクセスレポート、店舗パラメータ(stores.py)の調整、プレビュー取得の手順をまとめる。
  「投稿を回す」「フィード/ストーリーを焼き直す」「DMを確認」「新店を追加」「料理名/リボン/地名の
  見た目を直す」等のときに読む。絶対ルールは必ず CLAUDE.md を併読すること。
---

# すさび湯IG運用ランブック（ig-ops）

対象リポ: `amami-cell/susabiyu-ig-auto`。開発ブランチ: `claude/epic-maxwell-mj7dkg`。
反映は **commit → PR → main マージ → 対象ワークフローを dispatch** が基本（CLAUDE.md準拠）。

## 0. 先に CLAUDE.md の絶対ルール（要約・詳細は本体）
- 手貼りさせない（自分で編集→commit→push）。
- 自動投稿は **10:00–22:00 JST のみ・夜間厳禁**。`reservations.yml` を窓内で毎時 live 起動して担保。
- 公開LPのURLは中立ドメイン `https://yoyaku-pocket.github.io/<スラッグ>/`。`amami-cell...app/` は案内しない。
- 無料枠維持（公開リポのまま・1cronで全店ループ・従量/有料要素を入れない）。
- 募集システムGAS(`1OuDuD9…`)と承認アプリGAS `susabiyu承認`(`1m-nPhRR…`)は**触らない**。
- コミット/PR/コードに**モデル名を書かない**。

## 1. 店舗レジストリ = `susabiyu-remotion/stores.py`
全店の設定は STORES の1エントリ。account キー → 三条="" / gifuyatenjin / nagagutsu / goldporta /
karasuma / komatsubara。主な項目:
- `folders.food` … Driveの料理写真フォルダID（`GENRE_FOOD_ID` として fetch へ）。`music_*` はBGM。
- `patterns` … 使うテンプレ（FOOD_ONLY_PATTERNS=和の大衆 / YOSHOKU_PATTERNS=洋食おしゃれ）。
- `exclude_cats` … **フォルダ名とファイル名**の部分一致で除外（例: ロゴ/外観/コース、混入写真の料理名ワード）。
- `feed_style` … "gifuya"＝短冊型フィード(render_tanzaku) / 既定＝YoshokuFeed(ナガグツ型)。
- `feed_ribbon` / `feed_ribbon_size` … フィード右上の赤短冊リボン文字とpx。
- `region` / `region_scale` … ストーリー屋号下の地名と、その**フォント倍率(既定1)**。
- `dish_name_size` / `dish_name_wrap` … 縦書き料理名のpx(既定40)と、2列折返し閾値(文字数, 既定0=折返さない)。
- `render_props(store)` が storeName/handle/region/theme/regionScale/nameSize/nameWrap を Remotion へ注入
  （`prepare.py` が `--props=out/_props.json`）。他店は既定値のため影響なし＝1店だけ安全に調整できる。

## 2. 主要ワークフロー（GitHub Actions / dispatch で回す）
MCP: `actions_run_trigger`(method=run_workflow, owner=amami-cell, repo=susabiyu-ig-auto, ref=main, workflow_id=…)。
- `reservations.yml` inputs `{"mode":"live"}` … 全店の承認待ちを見て、窓内の枠を1回だけ本投稿（担保用に毎時）。
- `dm_notify.yml` inputs `{"mode":"diag","account":""}` … 全店DM監視。ログの `[DM][MON]` 行
  （店名 / 一覧タブ累計 / 直近24h / 最新時刻）を読む。トークン未設定店(鮨処すさび湯/こまつ原)はSKIP。
- `<account>_prepare.yml`（komatsubara_prepare.yml 等）… 対象日の各枠(11/18/20時)のストーリーを
  Drive写真から新規レンダ→承認待ちタブへ登録。input `date`(例 2026-11-27 / 空=実行日+2日), `quiet`。
  パターンは `allowed[(ordinal*3 + slotIndex) % len]` で決定的（FOOD_ONLYなら ordinal 奇数日の
  11時=短冊(taishutanzaku)/18時=お品書き(oshinatate)＝地名が出る回）。
- `komatsubara_feed.yml`（他店は `<account>_feed.yml` / nagagutsu_feed.py）… フィード画像(fd_*.jpg)と
  feed.json を生成→pwa/<account> へ commit→deploy_pwa を dispatch（アプリに反映）。
- `lp_report.yml` inputs `{"days":"7"}` … LP作成店のアクセスレポート。ログの `[LP]…` 行を読む。
  末尾注記必須:「ユニーク訪問＝重複を除いたおおよその実人数(端末数)」。

## 3. 承認待ち/プレビューの確認
- 承認待ちシート: `13zKaUblOwmgZ-lgCfxylCLlW2Fqutqct5h5TvMRWv30`、タブ `承認待ち<_account>`。
- プレビューは `susabiyu-media`(公開リポ) に push され jsdelivr `/gh/amami-cell/susabiyu-media@<sha>/preview/*.(jpg|mp4)`。
  **egressプロキシが jsdelivr/gh を弾く**ため、CDNではなく git で取る:
  `git init; git remote add origin https://github.com/amami-cell/susabiyu-media.git;`
  `git fetch --depth 1 --filter=blob:none origin <preview_commit_sha>;`
  `git cat-file -p <sha>:preview/<file> > out`（blobだけ遅延取得）。mp4は ffmpeg で `-ss` 終盤フレーム化して確認。
- **検証は必ず「全カードが出揃うフレーム」で**（prepareの still は frame45＝アニメ途中で1枚しか出ない）。

## 4. よくある修正レシピ
- **他店の混入写真を外す**: Driveを直接見て該当ファイルの料理名ワードを `exclude_cats` に追加
  （`_walk` はファイル名にも部分一致）。全料理名を確認し誤爆ゼロを担保してから push。
- **地名を大きく/小さく**: `region_scale`（既定1）を調整（TaishuTanzaku/OshinaTate のみ地名表示）。
- **料理名が大きすぎ/途切れる**: `dish_name_size`（px）を下げ、`dish_name_wrap`（閾値）で縦2列に折返す。
- **フィードのリボン文字/大きさ**: `feed_ribbon` / `feed_ribbon_size`。
- どれも **他店は既定値で無影響**。変更後は PR→main→該当 `*_feed.yml`/`*_prepare.yml` を回して検証まで。

## 5. 新店を足す
`stores.py` の STORES に1エントリ追加（account/store_name/handle/region/tab_suffix/folders/patterns/
exclude_cats/feed_style等）→ `<account>_prepare.yml`/`<account>_feed.yml` を用意→ Driveフォルダ投入→
生成→承認待ちで確認→中立ドメインでLP公開まで1セット（CLAUDE.md）。店舗情報は
スプレッドシート `1SyfW4c6HN4urmVHWLrTA-dHUVr5ZT9nqIFboNKn4BuQ` の「入力用」タブを読む（ユーザーに聞かない）。
