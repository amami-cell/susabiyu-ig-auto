# 応募者CSV 取り込みブックマークレット（Safari/Chrome から直接取得）

## なぜこれが必要か
エントリーポケット（`manage.entrypocket.jp`）は 2026-08-22 頃から
**Googleのサーバー用IPアドレスからのアクセスを 403 で拒否**するようになりました。
GAS（＝Googleのサーバー）から自動ログインして CSV を取りに行くと、
ログイン画面・応募者ページ・CSVダウンロードすべてが 403 になります。
（ユーザー側の設定・パスワード・コードは無関係。IPレベルのブロックです。）

**回避策**：ブロックされていない「自分のスマホ/PCのブラウザ」から CSV を取得し、
その中身をアプリ（GAS Web App）に送信する。これがこのブックマークレットです。
一度タップするだけで「取得 → アプリへ送信 → 各シート更新」まで自動で走ります。

## 使い方
1. 下の「本番用（1行）」を**まるごと**コピーし、Safari/Chrome のブックマークとして保存
   （名前は「求人取り込み」など）。URL欄にこの1行を貼り付けます。
2. **エントリーポケットにログインし、応募者一覧（CSVボタンが見える画面）を開く。**
3. ブックマーク「求人取り込み」をタップ。
4. `✅ 応募者CSVをアプリへ送信しました（◯KB）` と出れば成功。
   30〜60秒後にアプリ側で「最新化」して反映を確認。
5. 失敗した場合はポップアップの**診断テキストをそのまま**共有してください（原因特定に使います）。

## 本番用（1行・これをブックマークのURLに貼る）
```
javascript:(async()=>{try{var L=[],G='https://script.google.com/macros/s/AKfycbz6i36c7UjbM3S44kl1kEcsI0CSjYo9jL-W-T4BJUAr9jmBlVXj-vnQTUwQbGoxcHYT/exec',C=[];document.querySelectorAll('form').forEach(function(f){if(/p_p_lifecycle=2/.test(f.action||'')){C.push({u:f.action,m:(f.method||'POST').toUpperCase(),b:new URLSearchParams(new FormData(f)).toString()})}});document.querySelectorAll('a[href]').forEach(function(a){var h=a.href;if(/p_p_lifecycle=2/.test(h)||/downloadCSV/i.test(h)||/csv/i.test(a.textContent||'')){C.push({u:h,m:'GET'})}});var NS='_applycontrol_WAR_MYNApplyControlportlet_',pa=(window.Liferay&&Liferay.authToken)?('&p_auth='+Liferay.authToken):'';C.push({u:'https://manage.entrypocket.jp'+location.pathname+'?p_p_id=applycontrol_WAR_MYNApplyControlportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_cacheability=cacheLevelPage'+pa+'&'+NS+'part=downloadCSV',m:'POST'});var got=null;for(var i=0;i<C.length&&!got;i++){try{var c=C[i],o={credentials:'include',method:c.m,headers:{'X-Requested-With':'XMLHttpRequest'}};if(c.m==='POST'){o.headers['Content-Type']='application/x-www-form-urlencoded';o.body=c.b||''}var r=await fetch(c.u,o),buf=await r.arrayBuffer(),b=new Uint8Array(buf),hd=String.fromCharCode.apply(null,Array.prototype.slice.call(b.slice(0,200))).toLowerCase();L.push('#'+i+' '+r.status+' '+buf.byteLength+'B');if(buf.byteLength>200&&hd.indexOf('<!doctype')<0&&hd.indexOf('<html')<0){got=b;break}}catch(e){L.push('#'+i+' ERR '+(e.message||e))}}if(!got){alert('❌ CSVを取得できませんでした。応募者一覧（CSVボタンが見える画面）で開いてから、もう一度タップしてください。\n\n診断:\n'+L.join('\n'));return}var bin='';for(var j=0;j<got.length;j++)bin+=String.fromCharCode(got[j]);var b64=btoa(bin);await fetch(G,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({api:'importcsv',b64:b64})});alert('✅ 応募者CSVをアプリへ送信しました（'+Math.round(got.length/1024)+'KB）。\n30〜60秒後にアプリで「最新化」してご確認ください。')}catch(e){alert('取り込み失敗: '+(e&&e.message||e))}})();
```

## 動作の中身（読みやすい版）
```js
javascript:(async () => {
  try {
    const L = [];                       // 診断ログ
    const G = 'https://script.google.com/macros/s/AKfycbz6i36c7UjbM3S44kl1kEcsI0CSjYo9jL-W-T4BJUAr9jmBlVXj-vnQTUwQbGoxcHYT/exec';
    const C = [];                       // 試すダウンロード候補

    // 1) ページ内の CSV ダウンロード用フォーム（Liferay serveResource = lifecycle=2）
    document.querySelectorAll('form').forEach(f => {
      if (/p_p_lifecycle=2/.test(f.action || '')) {
        C.push({ u: f.action, m: (f.method || 'POST').toUpperCase(), b: new URLSearchParams(new FormData(f)).toString() });
      }
    });
    // 2) CSV っぽいリンク
    document.querySelectorAll('a[href]').forEach(a => {
      const h = a.href;
      if (/p_p_lifecycle=2/.test(h) || /downloadCSV/i.test(h) || /csv/i.test(a.textContent || '')) {
        C.push({ u: h, m: 'GET' });
      }
    });
    // 3) 予備：組み立てた serveResource URL
    const NS = '_applycontrol_WAR_MYNApplyControlportlet_';
    const pa = (window.Liferay && Liferay.authToken) ? ('&p_auth=' + Liferay.authToken) : '';
    C.push({ u: 'https://manage.entrypocket.jp' + location.pathname +
      '?p_p_id=applycontrol_WAR_MYNApplyControlportlet&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_cacheability=cacheLevelPage' +
      pa + '&' + NS + 'part=downloadCSV', m: 'POST' });

    // 候補を順に試し、HTML(エラー画面)ではなく本物のCSVバイト列が来たら採用
    let got = null;
    for (let i = 0; i < C.length && !got; i++) {
      try {
        const c = C[i];
        const o = { credentials: 'include', method: c.m, headers: { 'X-Requested-With': 'XMLHttpRequest' } };
        if (c.m === 'POST') { o.headers['Content-Type'] = 'application/x-www-form-urlencoded'; o.body = c.b || ''; }
        const r = await fetch(c.u, o);
        const buf = await r.arrayBuffer(), b = new Uint8Array(buf);
        const hd = String.fromCharCode.apply(null, Array.prototype.slice.call(b.slice(0, 200))).toLowerCase();
        L.push('#' + i + ' ' + r.status + ' ' + buf.byteLength + 'B');
        if (buf.byteLength > 200 && hd.indexOf('<!doctype') < 0 && hd.indexOf('<html') < 0) { got = b; break; }
      } catch (e) { L.push('#' + i + ' ERR ' + (e.message || e)); }
    }
    if (!got) { alert('❌ CSVを取得できませんでした…\n\n診断:\n' + L.join('\n')); return; }

    // バイト列を base64 にして GAS へ送信（応答は no-cors のため読めないので、確認はアプリ側で）
    let bin = ''; for (let j = 0; j < got.length; j++) bin += String.fromCharCode(got[j]);
    const b64 = btoa(bin);
    await fetch(G, { method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ api: 'importcsv', b64 }) });
    alert('✅ 応募者CSVをアプリへ送信しました（' + Math.round(got.length / 1024) + 'KB）。');
  } catch (e) { alert('取り込み失敗: ' + (e && e.message || e)); }
})();
```

## 送信先（アプリ側の受け口）
- `POST {exec}` に `{"api":"importcsv","b64":"<CSVのbase64>"}` を送る。
- GAS の `doPost` → `epImportCsvB64(b64)` が UTF-8/Shift_JIS を判定して取り込み、
  7枚のシート更新・新着通知・ダッシュボードキャッシュ更新まで実行。
- `_実行ログ` に「手動CSV」の行が増えれば取り込み成功（アプリの「最新化」で反映）。

## それでも失敗する場合の次の一手
- 診断テキスト（`#0 403 …` 等）を共有 → 実際のダウンロードURL/パラメータに合わせて調整。
- 恒久策：iPhoneショートカットで毎日自動タップ、または店舗PCの常駐取得に切替。
- 併せて EntryPocket 運営へ「特定IPの許可」または「CSVエクスポートAPI」を照会。
