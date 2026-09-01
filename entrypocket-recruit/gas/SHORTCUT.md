# iPhoneショートカットで「毎朝タップ不要の自動取得」

## 狙い
EntryPocket は Google/GitHub 等の**データセンターIPを403で拒否**する。
一方 **iPhoneのモバイル/自宅WiFi回線は普通の生活回線なので通る**（＝昨日ブックマークで1006KB取得できたのがその証拠）。
そこで、**iPhone自身がEntryPocketにログイン→CSV取得→アプリ(GAS)へ送信**する「ショートカット」を作り、
iPhoneの「オートメーション」で毎朝定刻に自動実行する。サーバーは一切EntryPocketに触らない（GASは受け取るだけ）。

## 全体の流れ（ショートカット内の順番）
1. ログインページを取得（GET）→ HTML内の `Liferay.authToken`（CSRFトークン p_auth）を取り出す
2. `/c/portal/login` に login/password/p_auth を **POST**（＝ログイン。以降クッキーは同一実行内で共有される）
3. 応募者ページを取得（GET）→ 最新の `authToken`(p_auth2) を取り出す
4. CSVダウンロードURLに `part=downloadCSV`＋p_auth2 を付けて **POST** → CSV本体（Shift_JIS）を得る
5. CSVを **Base64エンコード**
6. GASの /exec に `{"api":"importcsv","b64":"..."}` を **POST**（アプリが7シート更新）
7. 通知で結果表示

## 使う固定値
- ログインURL: `https://manage.entrypocket.jp/web/-/login`
- ログイン送信先: `https://manage.entrypocket.jp/c/portal/login`
- 応募者ページ: `https://manage.entrypocket.jp/web/8sin-saiyo/applicant`
- CSV URL（末尾までコピペ）:
  `https://manage.entrypocket.jp/web/8sin-saiyo/applicant?p_p_id=applycontrol_WAR_MYNApplyControlportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_cacheability=cacheLevelPage&p_p_col_id=column-1&p_p_col_count=1&_applycontrol_WAR_MYNApplyControlportlet_part=downloadCSV`
- GAS /exec: `https://script.google.com/macros/s/AKfycbz6i36c7UjbM3S44kl1kEcsI0CSjYo9jL-W-T4BJUAr9jmBlVXj-vnQTUwQbGoxcHYT/exec`
- ログインフォーム項目: `login`（ログインID）, `password`（パスワード）, `rememberMe=false`, `p_auth`（手順1で取得）
- authToken抽出の正規表現: `authToken['"]?\s*[:=]\s*['"]([0-9A-Za-z_-]+)`（グループ1がトークン）

## ショートカットの作り方（iPhone「ショートカット」アプリ → 新規＋）
順に「アクションを追加」で以下を並べる。⟶ は前アクションの結果を入力に使う意味。

1. **URLの内容を取得**
   - URL = ログインURL / 方法 = GET
2. **テキストを一致**（Match Text）
   - 入力 = 手順1の「URLの内容を取得」の結果
   - 正規表現 = `authToken['"]?\s*[:=]\s*['"]([0-9A-Za-z_-]+)`
3. **一致テキストからグループを取得**（Get Group from Matched Text）
   - グループのインデックス = 1 →（これを p_auth と呼ぶ）
4. **URLの内容を取得**（ログイン）
   - URL = ログイン送信先（/c/portal/login）
   - 方法 = POST / 本文を要求 = **フォーム**
     - `login` = あなたのEntryPocketログインID
     - `password` = あなたのパスワード
     - `rememberMe` = `false`
     - `p_auth` = 手順3のグループ（p_auth）
   - ヘッダ: `Referer` = ログインURL
5. **URLの内容を取得**（応募者ページ）
   - URL = 応募者ページ / 方法 = GET
6. **テキストを一致** … 入力 = 手順5の結果 / 正規表現 = 同上
7. **一致テキストからグループを取得** … インデックス=1 →（p_auth2）
8. **テキスト**（CSV URLを組み立て）
   - 内容 = 上のCSV URL の末尾に `&p_auth=` と p_auth2 を足した文字列
     （例: `……part=downloadCSV&p_auth=` の後ろに手順7のグループを差し込む）
9. **URLの内容を取得**（CSV取得）
   - URL = 手順8のテキスト / 方法 = POST
   - ヘッダ: `Referer`=応募者ページ / `X-Requested-With`=`XMLHttpRequest`
   →（結果＝CSV本体）
10. **Base64エンコード**（入力 = 手順9の結果）
11. **テキスト**（送信JSONを組み立て）
    - 内容 = `{"api":"importcsv","b64":"` + 手順10の結果 + `"}`
12. **URLの内容を取得**（GASへ送信）
    - URL = GAS /exec / 方法 = POST
    - ヘッダ: `Content-Type` = `text/plain`
    - 本文を要求 = **ファイル/テキスト** = 手順11のテキスト
13. **通知を表示**（内容 = 手順12の結果＝ `{"ok":true,...}` が出れば成功）

### 失敗を弾く保険（任意・おすすめ）
手順9のあと・10の前に：
- **If**（もし）… 手順9の結果に「403」または「\<html」が**含まれる**なら → 通知「ログイン失敗（403/HTML）」→ ショートカット停止。
  含まれないときだけ 10以降へ進む。これで壊れたデータをアプリに送らない。

## 毎朝の自動実行（タップ不要にする）
1. ショートカットアプリ下部の**「オートメーション」**タブ →「＋」→**「個人用オートメーション」**
2. **「時刻」**を選び、例：毎日 **8:30** に設定
3. 動作に**「ショートカットを実行」**→ 上で作ったショートカットを選ぶ
4. **「実行前に尋ねる」をオフ**（これで確認なしに自動実行）
※ iOSの仕様上、実行時に一瞬アプリが立ち上がる/通知が出ることがあるが、タップは不要。

## うまくいかない時の切り分け
- 手順13の通知が `{"ok":true,...}` → 成功（数十秒後アプリで反映）。
- `403`/`Forbidden`/`<html` が見えた → **ログイン失敗**。手順4のID/パスワード、手順2/3のp_auth抽出を確認。
- CSVが極端に小さい（数百バイト）→ ログインできておらず応募者ページがログイン画面になっている。
- それでも不明なら、手順9の結果の先頭200字を通知に出して共有 → こちらで原因特定。

## フォールバック（保険）
このショートカットが不調でも、**Safariのブックマークレット（BOOKMARKLET.md）を1タップ**すれば従来どおり取り込める。
自動化が安定するまではブックマークも残しておくと安心。
