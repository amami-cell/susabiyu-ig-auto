# 「最新取得」地域タグ — 共有＋保持＋クールダウン（GAS）

PWA確認画面（`pwa/reels.html`）のハッシュタグ選択に「🕘 最新取得」枠がある。
挙動：

- **共有**：1人が「取得」すると結果を**共有ストアに保存**。他アカウントも起動時に読み込む。
- **保持**：最新取得のタグは残る（ページ再訪でも表示）。
- **クールダウン**：IG のタグ検索は7日枠なので、1回取ると **7日間は再取得不可**。
  他の人には「次回取得可能 M/D」と告知（＝無駄打ち防止）。
- **見える化**：更新日時と次回取得可能日を表示。

バックエンド未接続でも、端末保存で同じUX（共有だけ効かない）。接続すると全アカウント共有になる。

## ⚠️ IGの制約（記載済み）
- IG Graph API のハッシュタグ検索は **7日間で30ユニークタグまで**。枠は**投稿処理と共有**。
- リアルタイムの地域トレンドAPIは無い。できるのは候補タグの活発さで並べ替える程度。
- なので「1回取って7日共有」が最も安全。既定は調査済みプールのまま。

---

## フロント⇄GAS 契約
- **読取（peek）**：`?api=regionaltags&region=...&peek=1`
  → `{ ok, tags:[{t,r,inb}], updatedAt:ms, nextAt:ms, live }`（無ければ tags 空）
- **取得（refresh）**：`?api=regionaltags&region=...`
  → クールダウン中なら保存済みをそのまま返す／明けていればIGで取得し保存して返す。
  返却は peek と同じ形＋`cooldown:true/false`。

`updatedAt`/`nextAt` はミリ秒エポック（フロントが `M/D H:MM` 等に整形）。

## Code.gs

`doGet(e)` に分岐を追加：

```javascript
if (api === "regionaltags") {
  return jsonpOut(e, regionalTags_(e.parameter.region || "", e.parameter.peek === "1"));
}
```

本体（共有ストア＝ScriptProperties、クールダウン7日）：

```javascript
function regionalTags_(region, peek) {
  var COOLDOWN_MS = 7 * 24 * 3600 * 1000;   // 7日
  var LIMIT = 10;                            // ライブ調査する候補数（30/7日枠の節約）
  var props = PropertiesService.getScriptProperties();
  var SK = "regstore_" + (region || "default");

  var saved = null;
  try { saved = JSON.parse(props.getProperty(SK) || "null"); } catch (e) {}

  // peek：読むだけ（IGは叩かない）＝全アカウントが起動時に共有分を取得
  if (peek) {
    if (saved) return { ok: true, tags: saved.tags, updatedAt: saved.updatedAt, nextAt: saved.nextAt, live: saved.live, cooldown: Date.now() < saved.nextAt };
    return { ok: true, tags: [], updatedAt: 0, nextAt: 0, live: false, cooldown: false };
  }

  // refresh：クールダウン中は保存済みをそのまま返す（IGを叩かない＝枠を守る）
  if (saved && Date.now() < saved.nextAt) {
    return { ok: true, tags: saved.tags, updatedAt: saved.updatedAt, nextAt: saved.nextAt, live: saved.live, cooldown: true };
  }

  // 候補プール（フロントの REGION_POOL と揃える）
  var POOL = [
    {t:"京都ディナー",r:3},{t:"河原町グルメ",r:3},{t:"京都飲み",r:2},{t:"京都食べ歩き",r:2},
    {t:"河原町ディナー",r:2},{t:"京都寿司",r:2},{t:"京都ランチ",r:2},{t:"三条河原町",r:1},
    {t:"先斗町",r:1},{t:"木屋町グルメ",r:1},{t:"河原町居酒屋",r:1},{t:"京都晩ごはん",r:1},
    {t:"kyotojapan",r:3,inb:1},{t:"kyotofood",r:3,inb:1},{t:"kyotogourmet",r:2,inb:1},
    {t:"japanesefood",r:2,inb:1},{t:"izakaya",r:2,inb:1},{t:"kyotorestaurant",r:1,inb:1},
    {t:"kyotonight",r:1,inb:1},{t:"visitkyoto",r:1,inb:1},{t:"kawaramachi",r:1,inb:1}
  ];

  var TOKEN = getProp_("IG_ACCESS_TOKEN"), IGUSER = getProp_("IG_USER_ID");
  var live = false, scored = [];
  for (var i = 0; i < POOL.length; i++) {
    var tag = POOL[i], score = 0;
    if (TOKEN && IGUSER && i < LIMIT) {
      try {
        var idKey = "hid_" + tag.t, hid = props.getProperty(idKey);
        if (!hid) {
          var sr = UrlFetchApp.fetch("https://graph.facebook.com/v21.0/ig_hashtag_search?user_id=" + IGUSER +
            "&q=" + encodeURIComponent(tag.t) + "&access_token=" + TOKEN, { muteHttpExceptions: true });
          var sd = JSON.parse(sr.getContentText());
          if (sd.data && sd.data[0]) { hid = sd.data[0].id; props.setProperty(idKey, hid); }
        }
        if (hid) {
          var rr = UrlFetchApp.fetch("https://graph.facebook.com/v21.0/" + hid + "/recent_media?user_id=" + IGUSER +
            "&fields=timestamp&limit=5&access_token=" + TOKEN, { muteHttpExceptions: true });
          var rd = JSON.parse(rr.getContentText());
          if (rd.data && rd.data.length) {
            live = true;
            var h = (Date.now() - new Date(rd.data[0].timestamp).getTime()) / 3600000;
            score = (h < 24 ? 30 : h < 72 ? 20 : 10) + rd.data.length;
          }
        }
      } catch (e) {}
    }
    scored.push({ tag: tag, score: score, base: tag.r, idx: i });
  }
  scored.sort(function (a, b) { return (b.score - a.score) || (b.base - a.base) || (a.idx - b.idx); });
  var tags = scored.map(function (s, n) {
    var r = live ? (n < 6 ? 3 : n < 13 ? 2 : 1) : s.base;
    return { t: s.tag.t, r: r, inb: s.tag.inb ? 1 : 0 };
  });

  var now = Date.now();
  var out = { ok: true, tags: tags, updatedAt: now, nextAt: now + COOLDOWN_MS, live: live };
  props.setProperty(SK, JSON.stringify(out));   // ← 共有ストアに保存（全アカウントが読む）
  out.cooldown = false;
  return out;
}

function getProp_(k){ return PropertiesService.getScriptProperties().getProperty(k); }

function jsonpOut(e, obj) {   // 既存のJSONP返却があればそちらを使う
  var cb = e.parameter.cb || e.parameter.callback || "callback";
  return ContentService.createTextOutput(cb + "(" + JSON.stringify(obj) + ")")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
```

## 有効化手順
1. Code.gs に上を追記、`IG_ACCESS_TOKEN`・`IG_USER_ID` をスクリプトプロパティに設定
2. GAS再デプロイ（/exec URLは維持）
3. `pwa/config.js` の `GAS_URL` は本番デプロイ済みのものが実URL（差し替え不要）
4. これで「取得」が共有ストアに保存され、他アカウントも起動時に最新取得を共有・
   「次回取得可能 M/D」の告知が全員に出る。

未設定でも端末保存で動作（共有だけ無効）。強制リセットは ScriptProperties の
`regstore_...` を消せば次回取得で作り直す。
