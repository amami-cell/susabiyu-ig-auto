import subprocess, sys, os, random, tempfile

FFMPEG = "ffmpeg"
FONT = "C:/Windows/Fonts/HGRGY.TTC"
W, H, FPS = 1080, 1920, 30
EFFECTS = ["zoom_in", "zoom_out", "pan_right", "pan_left"]

def zp(fx, fr):
    b = f"d={fr}:s={W}x{H}:fps={FPS}"
    cx, cy = "x='iw/2-(iw/zoom/2)'", "y='ih/2-(ih/zoom/2)'"
    if fx == "zoom_in":  return f"zoompan=z='min(zoom+0.001,1.2)':{cx}:{cy}:{b}"
    if fx == "zoom_out": return f"zoompan=z='if(lte(on,0),1.2,max(zoom-0.001,1.0))':{cx}:{cy}:{b}"
    if fx == "pan_right": return f"zoompan=z='1.15':x='(iw-iw/zoom)*on/{fr}':{cy}:{b}"
    if fx == "pan_left":  return f"zoompan=z='1.15':x='(iw-iw/zoom)*(1-on/{fr})':{cy}:{b}"
    return f"zoompan=z='min(zoom+0.001,1.2)':{cx}:{cy}:{b}"

def esc(p):
    return p.replace("\\","/").replace(":","\\:")

def main():
    img = sys.argv[1] if len(sys.argv)>1 else "test.jpg"
    logo = sys.argv[2] if len(sys.argv)>2 else "logo.png"
    telop_file = sys.argv[3] if len(sys.argv)>3 else "telop.txt"
    out = sys.argv[4] if len(sys.argv)>4 else "story_out.mp4"

    if not os.path.exists(img):
        print(f"not found: {img}"); return
    if not os.path.exists(logo):
        print(f"not found: {logo}"); return
    if not os.path.exists(telop_file):
        print(f"not found: {telop_file}"); return

    dur = round(random.uniform(5.0, 7.0), 1)
    fr = int(dur * FPS)
    fx = random.choice(EFFECTS)

    # filter complex
    fc = (
        # photo: scale, crop, motion, fade
        f"[0]scale={W}:{H}:force_original_aspect_ratio=increase,"
        f"crop={W}:{H},{zp(fx,fr)},"
        f"fade=t=in:d=0.5,fade=t=out:st={dur-0.5:.1f}:d=0.5[bg];"

        # logo: shrink, remove white bg, semi-transparent
        f"[1]scale=350:-1,colorkey=white:0.3:0.2,"
        f"format=rgba,colorchannelmixer=aa=0.5[logo];"

        # overlay logo top-right, then add text
        f"[bg][logo]overlay=W-w-40:60,"
        f"drawtext=fontfile='{esc(FONT)}':"
        f"textfile='{esc(os.path.abspath(telop_file))}':"
        f"fontcolor=white:fontsize=72:"
        f"borderw=3:bordercolor=black@0.7:"
        f"shadowcolor=black@0.4:shadowx=2:shadowy=2:"
        f"x=(w-text_w)/2:y=h*0.74:"
        f"alpha='if(lt(t,1.2),t/1.2,1)'"
    )

    cmd = [
        FFMPEG, "-y",
        "-loop", "1", "-i", img,
        "-i", logo,
        "-t", str(dur),
        "-filter_complex", fc,
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-r", str(FPS), "-movflags", "+faststart", out
    ]

    print(f"effect: {fx} / duration: {dur}s")
    print(f"telop: {open(telop_file,'r',encoding='utf-8').read()}")
    print(f"output: {out}")
    try:
        subprocess.run(cmd, check=True)
        print(f"OK: {os.path.abspath(out)}")
    except subprocess.CalledProcessError as e:
        print("NG:", e)

if __name__ == "__main__":
    main()
