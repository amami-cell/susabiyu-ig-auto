// リール素材クリップ（fetch_reel_clips.py が上書きする）。
// src はローカル(public/clips/xx.mp4)か、httpから始まる公開URL(HF生成物のCDN)のどちらでもよい。
export const clips: { src: string; caption?: string }[] = [];
export const clipMusic = "bgm.mp3";
