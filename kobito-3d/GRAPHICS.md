# グラフィックの方針と“天井”（正直版）

## 結論
このプロジェクトの土台（**スマホ本命＋無料枠＋0円配布**）では、
**フォトリアル/次世代グラフィックは実現できません。** 理由は動かせない3つ：

1. **描画方式＝`gl_compatibility`（スマホ/Web/古いPCで動かすため）。**
   フォトリアルに必須の SSAO・反射(SSR)・リアルタイムGI(SDFGI)・被写界深度(DOF)・
   ボリューメトリック霧は、この方式では**使えません**（Forward+ 専用）。
2. **想定PCが Vulkan 非対応寄り。** 実際に「起動しても黒画面（古いGPUで素のOpenGLが弾かれる）」
   が起きています。Forward+ は Vulkan 必須なので、その環境では**そもそも起動しません**。
3. **無料素材ゼロ。** フォトリアルはスキャンした実写PBRテクスチャ/モデルが要りますが、
   配布元(ambientCG等)はこの運用方針＆クラウド環境から取得できません。

## いま入れてある“現代的な絵作り”（gl_compatibility の上限）
全機種で安全に動く範囲で、質感をできるだけ上げています。
- **カラーグレーディング**：コントラスト/彩度を少し上げ、締まった発色に。
- **地面のノーマルマップ**：細かい凹凸の陰影。近距離ほど強く、遠景は平ら（ちらつき防止）。
- **PBR寄りの質感**：地面の SPECULAR/ROUGHNESS を回復度で変化（濡れたような弱い照り）。
- **ライティング**：暖色のキーライト＋反対からの青いフィルライトで影を潰さない。
- **影の高精細化**：4分割・4096・ソフトシャドウ。
- **トーンマップ(フィルミック)＋ブルーム**、**霧**、風で揺れる草、発光する花。

## さらに上げたい人向け（任意・別環境）

### 道1：Forward+（“次世代”描画）— Vulkanが動くPC限定
`project.godot` の描画方式を切り替えると、SSAO・DOF・ボリューメトリック霧・SDFGI・
本格PBRが使えます。**ただしスマホ/Web/古いPCでは動かなくなる**ので、
「PCハイエンド専用ビルド」を別に作る人向けです。
```
[rendering]
renderer/rendering_method="forward_plus"   ; ← desktop がForward+になる
renderer/rendering_method.mobile="gl_compatibility"  ; スマホ/Webは据え置き
```
切替後、garden.gd で `RenderingServer.get_rendering_device() != null`（＝Forward+）を見て
`Environment` の `ssao_enabled` / `ssil_enabled` / `sdfgi_enabled` / `volumetric_fog_enabled` /
`dof_blur_far_enabled` を有効化すれば“次世代っぽい”絵になります。
> 注意：あなたの現行PCは Vulkan が厳しいため、これで起動しない可能性が高いです。
> まずは Vulkan 対応PCで試すこと。

### 道2：本物のCC0 PBR素材を入れる（見た目の“リアルさ”の本丸）
手続き生成には限界があります。質感の本命は**実写ベースのPBRテクスチャ/モデル**です。
- テクスチャ：**ambientCG**（CC0・PBRセット：albedo/normal/roughness/ao）
- 植物/小物：**Quaternius / Kenney / Poly Pizza**（CC0）
- 置き方：`assets/` に入れて `assets/README.md` の要領で。地面マテリアルの
  `noisetex`/`normaltex` を実テクスチャに差し替えると一気に密度が上がります。
> このクラウド環境は配布元へ接続できないため、**取得はお手元のPCで**。
> 置いて push すれば、CIのWeb/APK/PC版にも反映されます。

## まとめ
- **今の方針のまま**なら、上の「gl_compatibility の上限」が到達点。スタイライズド寄りの
  “現代的で締まった”絵は出せますが、フォトリアルにはなりません。
- **フォトリアルに寄せる**なら、①Vulkan対応PC＋Forward+ か ②実写PBR素材 の
  どちらか（できれば両方）が必要で、スマホ0円運用とは切り離した“PC専用の別ビルド”になります。
  ここは費用/対応機の再設計になるので、やるなら事前に相談させてください。
