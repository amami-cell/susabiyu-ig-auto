# エントリーポケット 求人進捗 自動蓄積システム

エントリーポケットから応募者CSVを毎日自動取得し、Googleスプレッドシートに蓄積して、
スマホから見られるダッシュボードで進捗を追うシステム。**ローカルPCは不要**。

```
GitHub Actions（毎朝8:00 + 手動更新）
   └ Playwright でEPにログイン → CSV出力 → 取得
       └ CP932でパース・正規化
           └ Googleスプレッドシート（7シート）に蓄積
               └ GASウェブアプリでダッシュボード表示
```

> **このリポジトリでの配置**
> 本体は `entrypocket-recruit/` フォルダにまとまっている。GitHub Actions のワークフローだけは
> 仕様上リポジトリ直下にしか置けないため `.github/workflows/entrypocket.yml` にある
> （中で `working-directory: entrypocket-recruit` を指定している）。
> 独立リポジトリに切り出す場合は `entrypocket-recruit/` の中身をルートに移し、
> ワークフローの `working-directory` 行を消せばよい。

---

## セットアップ（所要 約40分）

### ☐ 1. リポジトリ

このシステムは既存リポジトリ `susabiyu-ig-auto` の `entrypocket-recruit/` に同居している。
新規に独立させる場合のみ、private リポジトリを作って中身を push する。

### ☐ 2. スプレッドシートを用意する

1. Googleドライブで新規スプレッドシートを作成（名前は「求人進捗_エントリーポケット」など）
2. URLの `https://docs.google.com/spreadsheets/d/★ここ★/edit` の部分がスプレッドシートID
3. **サービスアカウントのメールアドレスに「編集者」で共有**する

既存の `infomart-bot@infomart-automation-498709.iam.gserviceaccount.com` をそのまま使い回せる。
新しく作る場合は Google Cloud Console → IAM → サービスアカウント → キーを作成（JSON）。

シートは初回実行時に自動生成されるので、手作業でシートを作る必要はない。

### ☐ 3. GitHub Secrets を登録する

リポジトリの **Settings → Secrets and variables → Actions → New repository secret** で6件登録する。

| 名前 | 値 |
|---|---|
| `EP_USER` | エントリーポケットのログインID |
| `EP_PASS` | エントリーポケットのパスワード |
| `EP_LOGIN_URL` | ログイン画面のURL（例 `https://manage.entrypocket.jp/`） |
| `EP_APPLICANT_URL` | 応募者一覧のURL（`config/clients.json` に書いた場合は空でよい） |
| `SPREADSHEET_ID` | 手順2で控えたID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | サービスアカウントのJSONキーの**中身を丸ごと貼り付け** |

> パスワードは Secrets に直接入力すること。ファイルに書いてコミットしない。

### ☐ 4. 初回実行して動作を確かめる

**Actions → エントリーポケット取得 → Run workflow** を押す。

- 緑になれば成功。スプレッドシートに7つのシートができて、データが入っている
- 赤になった場合は次項「セレクタが合わないとき」へ

### ☐ 5. GASウェブアプリを作る

1. スプレッドシートを開き、**拡張機能 → Apps Script**
2. `gas/Code.gs` の中身を `コード.gs` に貼り付け
3. **ファイル＋ → HTML** で `index` という名前のファイルを作り、`gas/index.html` の中身を貼り付け
4. 左メニューの**歯車（プロジェクトの設定）→ スクリプト プロパティ**で4件登録

   | プロパティ | 値 |
   |---|---|
   | `SPREADSHEET_ID` | スプレッドシートID |
   | `GITHUB_OWNER` | GitHubのオーナー名（例 `amami-cell`） |
   | `GITHUB_REPO` | リポジトリ名（このリポジトリなら `susabiyu-ig-auto`） |
   | `GITHUB_PAT` | 次の手順6で発行するトークン |

5. **デプロイ → 新しいデプロイ → 種類「ウェブアプリ」**
   - 次のユーザーとして実行：**自分**
   - アクセスできるユーザー：**同じ組織内の全員**（社外に出さないため）
6. 発行されたURLをスマホのホーム画面に追加する

### ☐ 6. 更新ボタン用のトークンを発行する

ダッシュボードの「更新」ボタンは GitHub Actions を `repository_dispatch` で起動する。
そのためのトークンが要る。

1. GitHub → Settings → Developer settings → **Personal access tokens → Fine-grained tokens**
2. Repository access：このリポジトリのみ
3. Permissions → Repository permissions → **Contents: Read and write**
   （`repository_dispatch` の発火に必要な権限）
4. 発行された `github_pat_...` を GASのスクリプトプロパティ `GITHUB_PAT` に貼る

### ☐ 7. ファネル段階を埋める

`master_ステータス` シートを開き、`ファネル段階` 列を確認する。
初回は実データで確認できた4コードだけが入っている。

| コード | 名称 | ファネル段階 |
|---|---|---|
| 1 | 未対応 | 応募 |
| 3 | 連絡中 | 接触 |
| 31 | 面接予約済 | 面接 |
| 83 | 不採用（辞退） | 終了 |

**採用・入社などのコードはまだ実データに出ていない**ので入っていない。
そのステータスの応募者が初めて出た時点で、`要確認 = TRUE` の行が自動追記される。
その行の `ファネル段階` に `応募/接触/面接/内定/入社/終了` のいずれかを手で書き、`要確認` を空にする。

---

## セレクタが合わないとき

このシステムで唯一不確実なのが「ログインフォームとCSV出力ボタンの場所」。
自動検出で当たれば何もしなくていいが、外れた場合は次の手順で直す。

1. Actions の失敗した実行を開き、**Artifacts から `artifacts-xxxxx` をダウンロード**
2. 中の `.png` を見て、どの画面で止まったかを確認する
3. ローカルで実際の操作を録画してセレクタを調べる

   ```
   pip install -r requirements.txt
   python -m playwright install chromium
   python scripts/record_login.py
   ```

   ブラウザが開くので、ログイン → 応募者一覧 → CSV出力 まで手で操作する。
   別ウィンドウに操作に対応するコードが出るので、そこに現れるセレクタを控える。

4. `config/selectors.json` に転記して push する

   ```json
   {
     "login_user": "#_58_login",
     "login_pass": "#_58_password",
     "login_button": "input[type='submit']",
     "csv_button": "a:has-text('CSVダウンロード')"
   }
   ```

5. CSV出力の前に検索条件のセットが必要な場合は `config/search_params.json` に書く

   ```json
   {
     "pre_export_actions": [
       { "type": "select", "selector": "#period", "value": "all" },
       { "type": "click",  "selector": "#searchBtn" },
       { "type": "wait",   "value": 2000 }
     ]
   }
   ```

6. CSVの列名が想定と違う場合は `config/columns.json` の候補を実データのヘッダに合わせる

---

## シート構成

| シート | 役割 |
|---|---|
| `raw_応募者` | 応募者コードを主キーにした最新状態。upsert方式で、消えた応募者も履歴として残る |
| `snapshot_日次` | 日付×応募者×ステータス。ファネルの推移を追うための時系列 |
| `log_ステータス変更` | いつ誰がどのステータスに変えたか。CSVの `変更履歴1` 列から復元 |
| `master_ステータス` | ステータスコード ↔ ファネル段階の対応表。未知コードは自動追記 |
| `master_店舗` | 店舗ID一覧。表示名・ブランド・エリアは人手で補う |
| `dashboard_cache` | 集計済みの値。GASが速く読めるようにするためのキャッシュ |
| `_実行ログ` | 実行履歴。ダッシュボードの更新ボタンはこのシートを見て完了を判定する |

**手で編集していいのは `master_ステータス` と `master_店舗` だけ。**
他のシートは毎回書き換えられるので、直接編集しても次の実行で消える。

---

## 仕様メモ

- CSVは **CP932（Shift-JIS）・62列・DL時点の全件スナップショット**。差分ではない
- 電話番号は `TEL09012345678` の形式で来るので、数字だけに正規化して `tel:` リンクにしている
- **`変更履歴1` 列にステータス遷移がテキストで記録されている**。日次DLだけでは1日の中の遷移が消えるが、この列をパースすることで復元している
- ステータス変更の検知は「変更履歴パース」を主、「前回スナップショットとの比較」を保険として併用。同一イベントは重複登録しない
- 重複フラグ（媒体をまたいだ再応募）はサンプルで29%あった。一覧に「重複」ラベルで表示される
- **勤務可能曜日・時間帯はサンプルCSVでは全件0だった**。バイトル経由の応募ではこの項目が渡ってきていない。ダッシュボードのヒートマップは、この項目が入る媒体・求人が増えるまで空のままになる
- `面接日時` `入社日` もサンプルでは全件空。EP画面上で入力されれば自動で拾う

## ローカルで動かす場合

```
cp .env.example .env      # 値を埋める
pip install -r requirements.txt
python -m playwright install chromium
python -m pytest tests/ -q
python -m src.main
```

`HEADLESS=0` にするとブラウザの動きが見える。
取得済みのCSVを使ってSheets書き込みだけ試すなら `python -m src.main --csv path/to.csv`。
