#!/usr/bin/env python3
"""Web版(iPhone想定)を同じWi-Fiの端末へ配るための、いちばん小さいサーバ。

なぜ必要か
----------
ブラウザは https のページから ws:// を張れない（混在コンテンツとして遮断される）。
なので「Web版をどこかの https に置く」と、通信のために wss（＝証明書）が要る＝手間か費用。

家の中で遊ぶだけなら、ホスト役の機械が **http で Web版も配る** のがいちばん安い。
ページも通信も同じ相手・同じ http になるので、ブラウザは何も文句を言わない。追加費用は0円。

使い方
------
    python3 tools/serve_web.py            # build/web を配る
    python3 tools/serve_web.py 該当フォルダ --port 8080

出てきた URL を iPhone の Safari で開く。ゲーム側は
「ホストする」を PC/Android で押してから、Safari 側で「ホストに参加する」。
"""

from __future__ import annotations

import argparse
import http.server
import mimetypes
import socket
import socketserver
from pathlib import Path

# Python の標準テーブルに .wasm が無い版があるので明示しておく。
# ここを間違えるとブラウザが wasm を実行してくれない。
mimetypes.add_type("application/wasm", ".wasm")
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/manifest+json", ".webmanifest")


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        # 作り直したビルドが古いキャッシュに負けないように
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        print("  %s" % (fmt % args))


def lan_ip() -> str:
    """このマシンが同じWi-Fiの中で名乗っているIPを調べる（外へは何も送らない）。"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("192.0.2.1", 9))  # 到達しないテスト用アドレス
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Web版をLANへ配る簡易サーバ")
    parser.add_argument("directory", nargs="?", default="build/web", help="配るフォルダ")
    parser.add_argument("--port", type=int, default=8080)
    args = parser.parse_args()

    root = Path(args.directory).resolve()
    if not (root / "index.html").exists():
        print(f"× {root} に index.html がありません。")
        print("  先に Web版を書き出してください（GitHub Actions の成果物 kobito-web でも可）。")
        return 1

    socketserver.TCPServer.allow_reuse_address = True
    handler = lambda *a, **kw: Handler(*a, directory=str(root), **kw)  # noqa: E731
    with socketserver.ThreadingTCPServer(("0.0.0.0", args.port), handler) as httpd:
        url = f"http://{lan_ip()}:{args.port}/"
        print("=" * 56)
        print(f"  配信中: {root}")
        print(f"  この端末から      : http://localhost:{args.port}/")
        print(f"  同じWi-Fiの他端末 : {url}")
        print()
        print("  iPhone は Safari でこのURLを開く → 「ホストに参加する」")
        print("  （先に PC か Android で「ホストする」を押しておく）")
        print("  止めるときは Ctrl+C")
        print("=" * 56)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n止めました。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
