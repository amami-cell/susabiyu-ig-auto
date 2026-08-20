# 小人一家と汚れた世界 — kobito-3d

Godot 4.7 / GDScript。**オンライン協力プレイ・スマホ本命・当面は無料アセット** の方針で組んだ土台です。

いまの状態で、**ロビー → 庭 → 歩く・殴る・虫を倒す・レベルが上がる・ゴミを押し出す・地面が緑に戻る** まで
一本つながっています。夫婦2台での接続も、CIで毎回自動確認しています。

---

## 1. すぐ動かす

1. [godotengine.org](https://godotengine.org/download) から **Godot 4.7 系 Standard版**（C#不要）をダウンロード。
   インストール不要、実行ファイル1個です。
2. Godot を起動 → **インポート** → この `kobito-3d` フォルダの `project.godot` を選ぶ。
3. ▶（右上の再生）を押す。
4. 「**ひとりで始める**」を押す。庭が出ます。

操作（PCで確認するとき）:

| 操作 | キー | スマホ |
|---|---|---|
| 移動 | WASD / 矢印 | 画面**左半分**をドラッグ（仮想スティック） |
| カメラ | — | 画面**右半分**をドラッグ |
| こうげき | J | 右下ボタン |
| つかむ／押す | E | 右下ボタン |
| 跳ぶ・飛ぶ | Space（Lv3で長押し飛行） | 右下ボタン |
| ロビーへ戻る | Esc | Android の戻る |

> PCでもマウスでタッチ操作を試せます（`emulate_touch_from_mouse` を有効にしてあります）。

## 2. 2人でつなぐ

### 同じWi-Fi（まずここから・費用0円）
1. ホスト側：「**ホストする**」を押す。画面下に自分のIP（例 `192.168.1.5`）が出ます。
2. 参加側：そのIPを入力して「**参加する**」。

### 離れた場所から
家のWi-Fiの外に出ると、スマホ回線は途中の網（CGNAT）に阻まれて直接はつながりません。**中継が要ります。**
無料のまま行くなら次の順で検討してください（詳細は `ROADMAP.md` の「オンラインを家の外へ出す」）。

1. どちらかの家に**ポート開放**（`24567/UDP`）— 追加費用0円。まずこれで十分。
2. **Tailscale / ZeroTier**（個人利用は無料枠）で2台を同じ仮想LANに入れる。設定が一番ラク。
3. **常時稼働の中継サーバ**（Oracle Cloud Always Free など）に headless の Godot をホストとして常駐。

`Net.transport` を **WebSocket** に切り替えると、ブラウザ版でも通信できます（PC/Androidアプリなら ENet のほうが低遅延）。

## 3. フォルダの見取り図

```
kobito-3d/
├─ project.godot          … 設定。入力キー・描画方式(gl_compatibility=スマホ安全側)
├─ autoload/
│  ├─ net.gd              … Net：ホスト/参加・名簿。1人プレイも「自分だけのホスト」
│  └─ world_state.gd      … WorldState：環境回復度（このゲームの魂）
├─ data/                  … 敵の数値を .tres に外出し（＝表を触るだけで調整できる）
│  ├─ enemy_stats.gd  ant.tres  beetle.tres
└─ scenes/
   ├─ main.tscn/.gd       … ロビー⇄ゲームの切替、CI用の自己点検
   ├─ world/garden.tscn   … 庭（縦切りの舞台）
   ├─ actors/player.*     … 小人。状態機械・タッチ/キー共通入力・位置同期
   ├─ actors/bug.*        … 虫。頭脳はサーバだけが持つ
   ├─ props/trash.*       … 押せるゴミ（物理）
   └─ ui/                 … lobby / hud / touch_pad
```

## 4. オンラインの決めごと（ここだけ読めば迷わない）

- **1人プレイもホスト。** `Net.start_solo()` は `host()` の別名。だから「1人用を作ってから多人数化する」作り直しが発生しません。
- **正しい値はサーバが持つ。** HP・敵の位置・環境回復度・ゴミの物理は全部サーバ。
  クライアントは「そう見えるように寄せる」だけ。ズレたら必ずサーバが勝ちます。
- **他人の姿は補間。** 20Hz（敵は10Hz）で届く点を lerp でつなぐので、スマホ回線でもカクつきません。
- **後から参加できる。** 参加者には「今いる全員・今の虫・今の回復度」がまとめて配られます。
  （※ここは実際に2台つないだテストで最初に壊れた箇所です。`--selftest-host/join` がそれを毎回見張っています。）

## 5. 壊れていないか自動で確かめる

```bash
# ひとりぶんの通し確認（庭・虫・戦闘・経験値・環境回復度）
godot --headless --path kobito-3d -- --selftest

# 2台つなぐ確認（ホスト側と参加側を別々に起動する）
godot --headless --path kobito-3d -- --selftest-host
godot --headless --path kobito-3d -- --selftest-join
```

GitHub に push すると `.github/workflows/kobito_build.yml`（**kobito-build**）が同じことを自動でやり、
**Web版**と**Android APK**を成果物として吐きます。Actions の画面からダウンロードしてスマホに入れられます。
`kobito-3d/**` を変更したときだけ動くので、募集システムやインスタ投稿の仕組みには一切触れません。

## 6. 見た目をどうするか（当面は無料アセット）

箱のままで開発を進め、面白さが固まってから差し替えます。全部 **商用可・無料** です。

| 用途 | 場所 | ライセンス |
|---|---|---|
| 小物・地形パーツ | [Kenney](https://kenney.nl/assets) | CC0（表記不要） |
| ローポリのキャラ・植物 | [Quaternius](https://quaternius.com/) | CC0 |
| 3Dモデル検索 | [Poly Pizza](https://poly.pizza/) | 多くが CC0 / CC-BY |
| 人型のモーション | [Mixamo](https://www.mixamo.com/) | 無料（Adobeアカウント） |
| テクスチャ | [ambientCG](https://ambientcg.com/) | CC0 |
| 効果音 | [Kenney Audio](https://kenney.nl/assets?q=audio) / [Freesound](https://freesound.org/) | CC0 / 要確認 |

使ったものは `CREDITS.md` に追記してください（CC0でも、どこから来たか分かるようにしておくと後で助かります）。

---

### メモ: Androidのパッケージ名
`jp.co.eightsin.kobito` にしてあります（`export_presets.cfg`）。
Androidの規則で **各セグメントを数字で始められない** ため、`8sin` はそのまま使えません。
一度ストアに出すと変更できない値なので、公開前に決め直すならこのタイミングで。
