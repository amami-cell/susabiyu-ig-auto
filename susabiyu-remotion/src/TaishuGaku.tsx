// 大衆・額装（画像投稿）：正式デザイン「のれん」を使用。
// 上部だけ紺のれん＋白抜きロゴ、背景は店内写真のボカシ固定、料理写真は白フチで全体表示。
import { simplePhoto, simplePhrase, simpleBg } from "./simpleData";
import { NorenImgBase, FOOD_TAG } from "./TaishuNorenImg";

export const TaishuGaku: React.FC<{ storeName?: string; handle?: string }> = ({
  handle = "@susabiyu_sanjyo",
}) => {
  // fetch_simpleは料理写真のみを選ぶため、札は料理向けの言葉を回す
  const tag = FOOD_TAG[simplePhrase.length % FOOD_TAG.length];
  return <NorenImgBase photoSrc={simplePhoto} bgSrc={simpleBg} tag={tag} caption={simplePhrase} handle={handle} />;
};
