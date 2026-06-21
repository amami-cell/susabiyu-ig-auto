import subprocess, os

WORK = r"C:\Users\Owner\OneDrive\デスクトップ\susabiyu_ig"
REPO = "amami-cell/susabiyu-ig-auto"
os.chdir(WORK)

def run(cmd):
    print(f">>> {cmd}")
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if r.stdout.strip(): print(r.stdout.strip())
    if r.returncode != 0 and r.stderr.strip(): print(r.stderr.strip())
    return r.returncode

# Git setup & push
run("git init")
run("git add auto_story_cloud.py .github/workflows/story.yml .gitignore")
run('git commit -m "auto story posting system"')
run("git branch -M main")
run(f"gh repo set-default {REPO}")
run(f"git remote remove origin")
run(f"git remote add origin https://github.com/{REPO}.git")
run("git push -u origin main --force")

# Read secrets from local files
secrets = {}

# creds
with open("creds_b64.txt") as f:
    secrets["GOOGLE_CREDS_B64"] = f.read().strip()

# token
with open(".env") as f:
    secrets["IG_ACCESS_TOKEN"] = f.read().split("=", 1)[1].strip()

# drive config
for line in open("drive_config.txt"):
    k, v = line.strip().split("=", 1)
    if k == "SHEET_ID":
        secrets["SHEET_ID"] = v
    elif k.startswith("GENRE_"):
        secrets[k] = v

# Set secrets via gh
for name, value in secrets.items():
    print(f">>> Setting secret: {name}")
    p = subprocess.Popen(
        f"gh secret set {name} --repo {REPO}",
        shell=True, stdin=subprocess.PIPE, text=True
    )
    p.communicate(input=value)

print("\n=== ALL DEPLOYED ===")
print(f"Repo: https://github.com/{REPO}")
print(f"Actions: https://github.com/{REPO}/actions")
print("毎日 10:00/19:00/21:00 JST に自動投稿されます")
