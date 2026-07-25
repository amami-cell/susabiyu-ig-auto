# これだけコピペ（GAS 1回だけの作業）

この1ファイルを貼れば **予約投稿の自動実行** と **地域タグの共有** が本番で動きます。
所要2〜3分。/exec URL は変わりません（config.js の差し替え不要）。

---

## 手順（4ステップ）
1. 対象のスプレッドシートを開く → 拡張機能 → **Apps Script**
2. 既存の `Code.gs` の **doGet(e) の中**に、下の【A】5行を貼る（他の `api===` 判定の並びに）
3. `Code.gs` の **一番下**に、下の【B】を丸ごと貼る
4. 右上 **デプロイ → デプロイを管理 → 鉛筆 → バージョン「新しいバージョン」→ デプロイ**

これで完了。あとは私の側で用意済みの cron / フロントが自動で使います。

> ※ `SHEET_ID` 変数と `jsonpOut` 関数が既存にあればそれを使ってOK（【B】末尾の
> `jsonpOut` は無い場合の保険。二重定義になるなら消してください）。
> `IG_ACCESS_TOKEN` と `IG_USER_ID` はスクリプトプロパティにあれば地域タグが“実データ”に、
> 無くても“調査済みプール”で動きます（予約投稿には不要）。

---

## 【A】doGet(e) の中に貼る5行
```javascript
  if (api === "schedule")    return jsonpOut(e, schedCreate_(e.parameter));
  if (api === "schedlist")   return jsonpOut(e, schedList_());
  if (api === "schedcancel") return jsonpOut(e, schedCancel_(e.parameter.token));
  if (api === "regionaltags")return jsonpOut(e, regionalTags_(e.parameter.region||"", e.parameter.peek==="1"));
```

## 【B】Code.gs の一番下に貼る
```javascript
/* ===== 予約投稿 ===== */
var RESV_TAB = "予約投稿";
function schedSheet_(){ var ss=SpreadsheetApp.openById(SHEET_ID); var sh=ss.getSheetByName(RESV_TAB);
  if(!sh){ sh=ss.insertSheet(RESV_TAB); sh.appendRow(["token","when","kind","media_url","caption","hashtags","status","created_at","note"]); }
  return sh; }
function schedCreate_(p){
  var sh=schedSheet_();
  var token="R"+Utilities.formatDate(new Date(),"Asia/Tokyo","yyyyMMddHHmmss")+"_"+Math.floor(Math.random()*1000);
  var kind=(p.kind==="reel")?"reel":"feed";
  sh.appendRow([token, String(p.when||"").slice(0,16), kind, p.media||"", p.caption||"", p.hashtags||"",
    "scheduled", Utilities.formatDate(new Date(),"Asia/Tokyo","yyyy-MM-dd HH:mm"), ""]);
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
  for(var i=1;i<v.length;i++){ if(v[i][0]===token){ sh.getRange(i+1,7).setValue("canceled"); return {ok:true}; } }
  return { ok:false, error:"not found" };
}

/* ===== 地域タグ（共有ストア＋7日クールダウン） ===== */
function regionalTags_(region, peek){
  var COOLDOWN_MS=7*24*3600*1000, LIMIT=10;
  var props=PropertiesService.getScriptProperties(), SK="regstore_"+(region||"default");
  var saved=null; try{ saved=JSON.parse(props.getProperty(SK)||"null"); }catch(e){}
  if(peek){ return saved ? {ok:true,tags:saved.tags,updatedAt:saved.updatedAt,nextAt:saved.nextAt,live:saved.live,cooldown:Date.now()<saved.nextAt}
                         : {ok:true,tags:[],updatedAt:0,nextAt:0,live:false,cooldown:false}; }
  if(saved && Date.now()<saved.nextAt){ return {ok:true,tags:saved.tags,updatedAt:saved.updatedAt,nextAt:saved.nextAt,live:saved.live,cooldown:true}; }
  var POOL=[
    {t:"京都ディナー",r:3},{t:"河原町グルメ",r:3},{t:"京都飲み",r:2},{t:"京都食べ歩き",r:2},
    {t:"河原町ディナー",r:2},{t:"京都寿司",r:2},{t:"京都ランチ",r:2},{t:"三条河原町",r:1},
    {t:"先斗町",r:1},{t:"木屋町グルメ",r:1},{t:"河原町居酒屋",r:1},{t:"京都晩ごはん",r:1},
    {t:"kyotojapan",r:3,inb:1},{t:"kyotofood",r:3,inb:1},{t:"kyotogourmet",r:2,inb:1},
    {t:"japanesefood",r:2,inb:1},{t:"izakaya",r:2,inb:1},{t:"kyotorestaurant",r:1,inb:1},
    {t:"kyotonight",r:1,inb:1},{t:"visitkyoto",r:1,inb:1},{t:"kawaramachi",r:1,inb:1}];
  var TOKEN=props.getProperty("IG_ACCESS_TOKEN"), IGUSER=props.getProperty("IG_USER_ID");
  var live=false, scored=[];
  for(var i=0;i<POOL.length;i++){ var tag=POOL[i], score=0;
    if(TOKEN&&IGUSER&&i<LIMIT){ try{
      var idKey="hid_"+tag.t, hid=props.getProperty(idKey);
      if(!hid){ var sr=UrlFetchApp.fetch("https://graph.facebook.com/v21.0/ig_hashtag_search?user_id="+IGUSER+"&q="+encodeURIComponent(tag.t)+"&access_token="+TOKEN,{muteHttpExceptions:true});
        var sd=JSON.parse(sr.getContentText()); if(sd.data&&sd.data[0]){ hid=sd.data[0].id; props.setProperty(idKey,hid); } }
      if(hid){ var rr=UrlFetchApp.fetch("https://graph.facebook.com/v21.0/"+hid+"/recent_media?user_id="+IGUSER+"&fields=timestamp&limit=5&access_token="+TOKEN,{muteHttpExceptions:true});
        var rd=JSON.parse(rr.getContentText()); if(rd.data&&rd.data.length){ live=true;
          var h=(Date.now()-new Date(rd.data[0].timestamp).getTime())/3600000; score=(h<24?30:h<72?20:10)+rd.data.length; } }
    }catch(e){} }
    scored.push({tag:tag,score:score,base:tag.r,idx:i}); }
  scored.sort(function(a,b){ return (b.score-a.score)||(b.base-a.base)||(a.idx-b.idx); });
  var tags=scored.map(function(s,n){ var r=live?(n<6?3:n<13?2:1):s.base; return {t:s.tag.t,r:r,inb:s.tag.inb?1:0}; });
  var now=Date.now(), out={ok:true,tags:tags,updatedAt:now,nextAt:now+COOLDOWN_MS,live:live};
  props.setProperty(SK, JSON.stringify(out)); out.cooldown=false; return out;
}

/* 既存に jsonpOut があれば、この関数は消してください（二重定義回避） */
function jsonpOut(e, obj){
  var cb=e.parameter.cb||e.parameter.callback||"callback";
  return ContentService.createTextOutput(cb+"("+JSON.stringify(obj)+")")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
```

---

## 貼った後の確認（任意・私側でも可）
- 予約：確認画面で「日時を決めて予約」→ 予約済み一覧に出る／シート「予約投稿」に行が増える
- 実投稿ON：GitHub → Settings → Secrets and variables → Actions → **Variables** に `RESV_LIVE=1`
  （その前に Actions の「susabiyu-reservations」を **mode=dry** で1回回してログ確認を推奨）
