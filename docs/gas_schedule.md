# 予約投稿の自動実行 — つなぎ方（GAS + 有効化）

確認画面(PWA)で「日時を決めて予約」した投稿を、その時刻に自動でInstagramへ本投稿する。

## 全体像
```
PWA(reels.html) --schedule--> GAS --書込--> Sheet「予約投稿」タブ
                                                   ↑ 15分ごと
GitHub Actions (reservations.yml) --> post_reservations.py --> 時刻が来た行をIG本投稿
```
- 既存の自動スロット投稿(post.yml / 承認待ちタブ)には**一切触れない**。専用タブ「予約投稿」だけを使う。
- **実投稿は Variables の `RESV_LIVE=1` のときだけ**。未設定＝DRY-RUN（ログのみ・投稿しない）。安全側の既定。
- フロントは GAS 未接続でも壊れない（「（下書き）予約しました」表示にフォールバック）。

## 「予約投稿」タブ（列 A〜I）
`post_reservations.py` が自動作成。列：
`token / when(YYYY-MM-DD HH:MM JST) / kind(feed|reel) / media_url / caption / hashtags / status / created_at / note`
- status: `scheduled`→`posting`→`posted` / `failed` / `canceled` / `expired`
- media_url は公開URL（jsDelivr/R2）。ローカルパスなら投稿時に `poster.up()` で公開化。

## フロント⇄GAS 契約（reels.html が呼ぶ）
- **予約作成** `?api=schedule&kind=feed&name=..&when=YYYY-MM-DD HH:MM&media=..&caption=..&hashtags=%23a %23b`
  → `{ ok:true, token }`（行を1つ追加）
- **予約一覧** `?api=schedlist` → `{ ok:true, items:[{token,kind,name,copy,media,when}] }`（status=scheduledのみ）
- **予約取消** `?api=schedcancel&token=...` → `{ ok:true }`（status→canceled）

## Code.gs（doGetに追記）
```javascript
if (api === "schedule")   return jsonpOut(e, schedCreate_(e.parameter));
if (api === "schedlist")  return jsonpOut(e, schedList_());
if (api === "schedcancel")return jsonpOut(e, schedCancel_(e.parameter.token));
```
```javascript
var RESV_TAB = "予約投稿";
function schedSheet_(){ var ss=SpreadsheetApp.openById(SHEET_ID); var sh=ss.getSheetByName(RESV_TAB);
  if(!sh){ sh=ss.insertSheet(RESV_TAB); sh.appendRow(["token","when","kind","media_url","caption","hashtags","status","created_at","note"]); }
  return sh; }
function schedCreate_(p){
  var sh=schedSheet_();
  var token="R"+Utilities.formatDate(new Date(),"Asia/Tokyo","yyyyMMddHHmmss")+"_"+Math.floor(Math.random()*1000);
  var kind=(p.kind==="reel")?"reel":"feed";
  var when=String(p.when||"").slice(0,16);
  sh.appendRow([token, when, kind, p.media||"", p.caption||"", p.hashtags||"", "scheduled",
                Utilities.formatDate(new Date(),"Asia/Tokyo","yyyy-MM-dd HH:mm"), ""]);
  return { ok:true, token:token };
}
function schedList_(){
  var sh=schedSheet_(); var v=sh.getDataRange().getValues(); var out=[];
  for(var i=1;i<v.length;i++){ if(String(v[i][6]).trim()!=="scheduled") continue;
    out.push({ token:v[i][0], when:v[i][1], kind:v[i][2], media:v[i][3],
               name:(v[i][4]||"").split("\n")[0].slice(0,24), copy:"" }); }
  out.sort(function(a,b){ return String(a.when)<String(b.when)?-1:1; });
  return { ok:true, items:out };
}
function schedCancel_(token){
  var sh=schedSheet_(); var v=sh.getDataRange().getValues();
  for(var i=1;i<v.length;i++){ if(v[i][0]===token){ sh.getRange(i+1,7).setValue("canceled"); return { ok:true }; } }
  return { ok:false, error:"not found" };
}
```

## 有効化手順
1. Code.gs に上を追記 → GAS再デプロイ（/exec URLは維持）
2. `pwa/config.js` の `GAS_URL` は本番デプロイ済みのものが実URL（差し替え不要）
3. GitHub の **Settings → Secrets and variables → Actions → Variables** に `RESV_LIVE = 1` を追加
   （これで `reservations.yml` が実投稿に切替。未設定のうちは15分ごとにDRY-RUNログのみ）
4. 動作確認：`reservations.yml` を「Run workflow」→ `mode=dry` でログ確認 → 問題なければ `live`

## 注意（重要）
- **フィード/リールの本投稿は今回新規**（従来はストーリーのみ）。まず `mode=dry` で
  「何を投稿しようとするか」を必ず確認してから `RESV_LIVE=1`。
- 予約の media は、確認画面が**実データ**を持つようになって初めて実写真/実動画になる
  （今はサンプル画像。確認画面のバックエンド接続が前提）。
- クールダウン/取りこぼし：`when` が24時間以上過去の予約は投稿せず `expired`（無言の遅延投稿を防止）。
