# GAS 自動デプロイ（手貼りゼロ）

このフォルダ（`entrypocket-recruit/gas/`）を編集して GitHub に push すると、
GitHub Actions が自動で **clasp push → deploy** し、Apps Script（GAS）へ反映して
公開Webアプリ（/exec）を**同じURLのまま**更新します。**以後の手貼り・デプロイは不要**。

## 必要な設定は「1件」だけ
GitHub リポジトリ → **Settings → Secrets and variables → Actions → New repository secret**

| 名前 | 値 |
|---|---|
| `CLASPRC_JSON` | `clasp login` で作られる `~/.clasprc.json` の中身（丸ごと）＝ログイン情報 |

- **スクリプトID / デプロイID** は秘密ではないので `.github/workflows/deploy_gas.yml` に直書き済み
  （別プロジェクトに向ける場合のみ、Secret `GAS_SCRIPT_ID` / `GAS_DEPLOYMENT_ID` で上書き可能）。
- `CLASPRC_JSON` は**パスワード相当**。GitHub Secrets は暗号化保存され、ログにも出ません。

## `CLASPRC_JSON` の取り方（すでに取得済みなら不要）
ブラウザで **https://shell.cloud.google.com/** を開き：
```bash
npm i -g @google/clasp@2.4.2
clasp login --no-localhost   # URLを開いて許可 → コードを貼る
cat ~/.clasprc.json          # 出た { ... } を丸ごとコピー
```
※ この `clasp login` は、**対象の Apps Script を開けるGoogleアカウント**で行うこと。

## 反映の確認
GitHub の **Actions → deploy-gas** が緑になれば成功。数十秒で本番URLが最新になります。

## 注意
- `clasp push -f` は **GAS上のファイルをこのフォルダの内容で上書き**します（リポジトリが正）。
- **Script Properties（EP_USER / EP_PASS / EP_WRITE_ENABLED 等）とトリガーは消えません**
  （ファイルではなくプロジェクト設定のため）。
- 危険なテスト関数 `ep_probe_status.gs` は本番へ送りません（`.claspignore` で除外）。
- Webアプリのアクセス設定（全員公開）・タイムゾーンは `appsscript.json` の内容で固定されます。
