// OP/CLOSE の「地（背景）」比較用プレビュー。真っ黒一色が重いというご指摘を受けて、
// 同じロゴ・同じ動きのまま背景だけを変えた3案を短尺（約5.3秒）で見比べられるようにしたもの。
// ここで選んだ案を yoshokuDesign.tsx の STORY_BG に設定すれば、10本すべてのOP/CLOSEに一括反映される。
import { AbsoluteFill, Audio, Sequence, staticFile, interpolate } from "remotion";
import { typoMusic, typoMusicStart } from "./typoData";
import { clamp, StoryOpening, StoryEndroll, STORY_OPEN, STORY_END, STORY_XF, StoryBg } from "./yoshokuDesign";

export const YOP_DUR = STORY_OPEN + STORY_END;

const OpPreview: React.FC<{ bg: StoryBg; storeName?: string; handle?: string; theme?: string }> = ({
  bg, storeName = "ナガグツ", handle = "@nagagutsu0427", theme = "italian",
}) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <Audio src={staticFile(typoMusic)} startFrom={Math.round((typoMusicStart || 0) * 30)}
      volume={(ff) => interpolate(ff, [0, 14, YOP_DUR - 24, YOP_DUR], [0, 0.8, 0.8, 0], clamp)} />
    <Sequence durationInFrames={STORY_OPEN}>
      <StoryOpening storeName={storeName} theme={theme} bg={bg} />
    </Sequence>
    {/* OPの終わりに重ねてCLOSEをじわーっと。本編があるときと同じ見え方にする。 */}
    <Sequence from={STORY_OPEN - STORY_XF} durationInFrames={STORY_END + STORY_XF}>
      <StoryEndroll storeName={storeName} handle={handle} theme={theme} bg={bg} />
    </Sequence>
  </AbsoluteFill>
);

type P = { storeName?: string; handle?: string; theme?: string };

// 案1：料理写真を大きくぼかして敷く（店の色がにじむ／いちばん“お店らしい”）
export const YoshokuOpBlur: React.FC<P> = (p) => <OpPreview bg="blur" {...p} />;
// 案2：モルタル塗り壁＋やわらかいスポット（落ち着いた内装の壁）
export const YoshokuOpMortar: React.FC<P> = (p) => <OpPreview bg="mortar" {...p} />;
// 案3：ボルドー〜黒のグラデ＋光のにじみ（ブランド色に寄せた華やかさ）
export const YoshokuOpWine: React.FC<P> = (p) => <OpPreview bg="wine" {...p} />;
