# 飲食店ドットコム 応募者CSV 取り込みブックマークレット

## なぜこれ？
飲食店ドットコム（`www.inshokuten.com`）は **データセンターIP（GitHub Actions/Google）を403で拒否**するため、
サーバー（自動）からは取得できない。一方、**自分のスマホ/PCのブラウザ（生活回線）なら通る**。
そこで、ログイン中の応募者ページで**1タップ**して、CSVをアプリ(GAS)へ送る。取り込み先は媒体=飲食店ドットコム。

## 使い方
1. 下の「本番用（1行）」をコピーし、Safari/Chromeのブックマークとして保存（名前は「飲食店com取り込み」など）。
2. 飲食店ドットコムにログインし、**応募者一覧（entryData等のCSVが出せる画面）**を開く。
3. ブックマークをタップ。`✅ 送信しました（◯KB）` が出れば成功（30〜60秒後にアプリで反映）。
4. 失敗時はポップアップの診断（`#0 …`）をそのまま共有 → CSVの出し先に合わせて調整する。

## 本番用（1行・ブックマークのURLに貼る）
```
javascript:(async()=>{try{var L=[],G='https://script.google.com/macros/s/AKfycbz6i36c7UjbM3S44kl1kEcsI0CSjYo9jL-W-T4BJUAr9jmBlVXj-vnQTUwQbGoxcHYT/exec',C=[];document.querySelectorAll('a[href]').forEach(function(a){var h=a.href,t=(a.textContent||'');if(/csv|ダウンロード|entryData|download|出力/i.test(h+t)){C.push({u:h,m:'GET'})}});document.querySelectorAll('form').forEach(function(f){var h=(f.action||'')+' '+(f.textContent||'');if(/csv|ダウンロード|download|出力/i.test(h)){var b=new URLSearchParams(new FormData(f)).toString();C.push({u:f.action,m:(f.method||'GET').toUpperCase(),b:b})}});if(!C.length){alert('❌ CSVの書き出しリンクが見つかりません。応募者一覧（CSVボタンがある画面）で開いてタップしてください。');return}var got=null;for(var i=0;i<C.length&&!got;i++){try{var c=C[i],o={credentials:'include',method:c.m,headers:{'X-Requested-With':'XMLHttpRequest'}};if(c.m==='POST'){o.headers['Content-Type']='application/x-www-form-urlencoded';o.body=c.b||''}var r=await fetch(c.u,o),buf=await r.arrayBuffer(),b=new Uint8Array(buf),hd=String.fromCharCode.apply(null,Array.prototype.slice.call(b.slice(0,200))).toLowerCase();L.push('#'+i+' '+r.status+' '+buf.byteLength+'B');if(buf.byteLength>200&&hd.indexOf('<!doctype')<0&&hd.indexOf('<html')<0){got=b;break}}catch(e){L.push('#'+i+' ERR '+(e.message||e))}}if(!got){alert('❌ CSVを取得できませんでした。\n\n診断:\n'+L.join('\n'));return}var bin='';for(var j=0;j<got.length;j++)bin+=String.fromCharCode(got[j]);var b64=btoa(bin);await fetch(G,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({api:'media_importcsv',media:'inshoku',b64:b64})});alert('✅ 飲食店ドットコムの応募者CSVを送信しました（'+Math.round(got.length/1024)+'KB）。30〜60秒後にアプリでご確認ください。')}catch(e){alert('取り込み失敗: '+(e&&e.message||e))}})();
```

## 送信先
`POST {exec}` に `{"api":"media_importcsv","media":"inshoku","b64":"<CSVのbase64>"}` を送る。
→ GAS `doPost` → `mediaImportCsvB64('inshoku', b64)` が Shift_JIS を判定して取り込み、`他媒体_応募` シートへ蓄積・新着通知。

## それでも自動にしたい場合
飲食店ドットコムはサーバー拒否のため、完全自動には「あなたの回線で動く常駐環境（PCでPlaywright等）」が必要。
まずはこの1タップで運用し、必要なら常駐自動化を検討する。
