# assets — 本物のCC0モデルの置き場

このフォルダに **`plant.glb`** を置くと、庭の下草が自動でそのモデルに差し替わります
（無ければ手続き生成の葉が使われます）。ゲーム側のコード変更は不要です。

## どこから取るか（すべて商用可・無料）
- **Kenney** … https://kenney.nl/assets （Nature Kit の草・花・きのこ等）／CC0
- **Quaternius** … https://quaternius.com/ （Stylized Nature 等）／CC0
- **Poly Pizza** … https://poly.pizza/ （検索して .glb をダウンロード）／多くが CC0

## 使い方
1. 上記から低ポリの植物を1つ入手（.glb 推奨。.gltf/.blend でもGodotが取り込めます）。
2. このフォルダに `plant.glb` という名前で置く。
3. Godotで再インポート → 起動すると下草がそのモデルになる。

## メモ
- スケールは Godot 側で自動調整（庭に合う大きさに MultiMesh で並べます）。
- 使ったモデルは必ず `../CREDITS.md` に1行足してください（CC0でも出典を残す）。
- この環境（クラウド）は配布元サイトへ接続できないため、モデルの取得は
  お手元のPCで行ってください。置いて push すれば、CIのWeb/APK/PC版にも反映されます。
