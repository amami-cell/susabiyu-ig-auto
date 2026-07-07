# -*- coding: utf-8 -*-
"""専用プレビュー納品：動画をR2の pv-<sha256(コード)>/ に置き、一覧(index.js)を更新する。

・コードは private リポの preview_code.txt（公開側には一切出ない）
・置き場所のパスはコードのハッシュ＝コードを知らないと場所すら算出できない
・index.js は JSONP形式（__pvCb({v:[...]})）→ アプリが<script>で読む（CORS不要）

使い方: python preview_up.py <file1.mp4> "タイトル1" [<file2.mp4> "タイトル2" ...]
        python preview_up.py --list        … 現在の一覧を表示（納品なし・index再生成のみ）
"""
import os, sys, json, hashlib, datetime

JST = datetime.timezone(datetime.timedelta(hours=9))


def _code():
    for p in ("preview_code.txt", "../preview_code.txt"):
        if os.path.exists(p):
            c = open(p, encoding="utf-8").read().strip()
            if c:
                return c
    print("[PV] preview_code.txt がありません"); sys.exit(1)


def _s3():
    import boto3
    from botocore.config import Config as _Cfg
    acct = os.environ["R2_ACCOUNT_ID"]
    return boto3.client("s3",
        endpoint_url="https://%s.r2.cloudflarestorage.com" % acct,
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto", config=_Cfg(signature_version="s3v4"))


def main():
    args = sys.argv[1:]
    code = _code()
    h = hashlib.sha256(code.encode()).hexdigest()
    prefix = "pv-" + h
    bkt = os.environ["R2_BUCKET"]
    base = os.environ["R2_PUBLIC_BASE"].rstrip("/")
    s3 = _s3()

    # 既存メタ（キー→タイトル）を取得
    meta = {}
    try:
        obj = s3.get_object(Bucket=bkt, Key=prefix + "/meta.json")
        meta = json.loads(obj["Body"].read().decode("utf-8"))
    except Exception:
        pass

    # 納品（file title のペア）
    pairs = []
    if args and args[0] != "--list":
        it = iter(args)
        for f in it:
            t = next(it, "")
            pairs.append((f, t))
    now = datetime.datetime.now(JST)
    for f, title in pairs:
        name = os.path.basename(f)
        key = "%s/%s_%s" % (prefix, now.strftime("%Y%m%d%H%M%S"), name)
        s3.upload_file(f, bkt, key, ExtraArgs={
            "ContentType": "video/mp4",
            "CacheControl": "public, max-age=31536000"})
        meta[key] = {"t": title or name, "d": now.strftime("%m/%d %H:%M")}
        print("[PV] 納品: %s ← %s (%s)" % (key.split("/")[-1], f, title))

    # 一覧を再生成（プレフィックス配下の動画すべて・新しい順）
    vids = []
    token = None
    while True:
        kw = {"Bucket": bkt, "Prefix": prefix + "/"}
        if token:
            kw["ContinuationToken"] = token
        r = s3.list_objects_v2(**kw)
        for o in r.get("Contents", []):
            k = o["Key"]
            if k.endswith(".mp4") or k.endswith(".mov"):
                m = meta.get(k, {})
                vids.append({"u": base + "/" + k,
                             "t": m.get("t", k.split("/")[-1]),
                             "d": m.get("d", o["LastModified"].astimezone(JST).strftime("%m/%d %H:%M")),
                             "k": k})
        if r.get("IsTruncated"):
            token = r.get("NextContinuationToken")
        else:
            break
    vids.sort(key=lambda v: v["k"], reverse=True)
    for v in vids:
        del v["k"]

    # meta.json / index.js を更新（indexはキャッシュさせない）
    s3.put_object(Bucket=bkt, Key=prefix + "/meta.json",
        Body=json.dumps(meta, ensure_ascii=False).encode("utf-8"),
        ContentType="application/json", CacheControl="no-cache")
    idx = "__pvCb(" + json.dumps({"v": vids}, ensure_ascii=False) + ")"
    s3.put_object(Bucket=bkt, Key=prefix + "/index.js",
        Body=idx.encode("utf-8"),
        ContentType="application/javascript", CacheControl="no-cache")
    print("[PV] 一覧更新: %d 本" % len(vids))
    print("[PV] 完了（場所はコードを知る人しか算出できません）")


if __name__ == "__main__":
    main()
