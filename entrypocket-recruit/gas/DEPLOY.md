# GAS 自動デプロイ（手貼りゼロ）セットアップ

このフォルダ（`entrypocket-recruit/gas/`）を編集して GitHub に push すると、
GitHub Actions が自動で **clasp push → deploy** し、Apps Script（GAS）に反映します。
**以後の手貼りは不要**です。

準備は **最初の一度だけ**。PC不要、スマホ／PCの**ブラウザだけ**で完結します
（Google Cloud Shell を使うので、パソコンにインストールする物はありません）。

---

## 一度だけの設定（約5分）

### ① スクリプトID を控える
1. 対象のスプレッドシートを開く → メニュー **拡張機能 → Apps Script**
2. Apps Script 画面の左 **⚙️ プロジェクトの設定** を開く
3. **「スクリプト ID」** をコピー（これが `GAS_SCRIPT_ID`）

### ② clasp のトークンを作る（Cloud Shell）
1. ブラウザで **https://shell.cloud.google.com/** を開く（Googleでログイン）
2. 黒いターミナルで次を1行ずつ実行：
   ```bash
   npm i -g @google/clasp@2.4.2
   clasp login --no-localhost
   ```
3. 表示された **URL を開いて許可** → 出てきた**コードを貼り付け**て Enter
4. トークンの中身を表示：
   ```bash
   cat ~/.clasprc.json
   ```
   出力された **`{ ... }` を丸ごとコピー**（これが `CLASPRC_JSON`）

### ③ GitHub に Secrets を登録
GitHub リポジトリ → **Settings → Secrets and variables → Actions → New repository secret**
で 2件登録：

| 名前 | 値 |
|---|---|
| `GAS_SCRIPT_ID` | ①でコピーしたスクリプトID |
| `CLASPRC_JSON` | ②でコピーした `~/.clasprc.json` の中身（丸ごと） |

これで完了。次に誰かが `gas/` を push すると自動でGASに反映されます。

---

## （任意）本番 /exec URL を固定で更新したい場合
「自分のみ」で使っている**公開URL（/exec）**を、push のたびに同じURLで更新したいときは、
デプロイIDを登録します。Cloud Shell で：
```bash
cd ~ && git clone <このリポジトリのURL> repo && cd repo/entrypocket-recruit/gas
printf '{"scriptId":"<GAS_SCRIPT_ID>","rootDir":"."}' > .clasp.json
clasp deployments        # 一覧の先頭 "- AKfyc... @NN" の AKfyc... が デプロイID
```
出てきた **デプロイID** を GitHub Secrets に `GAS_DEPLOYMENT_ID` として登録すれば、
以後 `/exec` が同じURLのまま最新に更新されます（未登録なら push のみ＝ head の /dev は常に最新）。

---

## 注意
- `clasp push -f` は**GAS上のファイルをこのフォルダの内容で上書き**します。
  GAS側だけにあるファイルは消えるので、コードは必ずこのリポジトリ側を正とします。
- **Script Properties（EP_USER / EP_PASS / EP_WRITE_ENABLED など）とトリガーは消えません**
  （ファイルではなくプロジェクト設定のため、push の影響を受けません）。
- 反映状況は GitHub の **Actions → deploy-gas** で確認できます（緑=成功）。
