# -*- coding: utf-8 -*-
"""Pack Runeguard art for the web: cut PNGs (RGBA) -> trimmed webp + manifest.json in the art site folder.

Use:  python pack_web.py             pack only (look at site-art2 first)
      python pack_web.py --publish   pack, commit + push the `art` branch, then write src/js/12a-art-data.js (rev + sizes)
Sources (outside the repo):  ...\\output\\Runeguard\\art\\cut_v1\\*.png, cut_v2\\*.png (BiRefNet), prod_v2\\gr_*.png (ground)
Target (outside the repo):   ...\\output\\Runeguard\\site-art\\v2\\<key>.webp + manifest.json
The site-art folder is its own git repo pushed to the orphan branch `art` of github.com/chatcpeg/runeguard and served by
jsDelivr (cdn.jsdelivr.net/gh/chatcpeg/runeguard@<commit>/v2/...). Generated media never goes into D:\\AntigravityRepo.

manifest.json = {"v": 2, "a": {key: [w, h, split]}}   split = canopy/body bottom as a fraction of h (trees, mountains, tall props)
"""
import json, os, re, subprocess, sys
import numpy as np
from PIL import Image

ART = r"D:\Comfy-Desktop\ComfyUI-Shared\output\Runeguard\art"
SITE = r"D:\Comfy-Desktop\ComfyUI-Shared\output\Runeguard\site-art"
VER = "v2"
BOSS = re.compile(r"^(b_|fb_|gb_|sb_|ob_)")


def key_of(fn):
    k = re.sub(r"_\d{5}_\.png$", "", fn)
    return k


def trim(im, thr=10, pad=2):
    a = np.asarray(im.split()[-1])
    a2 = np.where(a < thr, 0, a).astype(np.uint8)
    rgba = np.asarray(im).copy(); rgba[..., 3] = a2
    im = Image.fromarray(rgba, "RGBA")
    bb = Image.fromarray(a2).getbbox()
    if not bb: return im
    x0, y0, x1, y1 = bb
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


def fit(im, side):
    s = side / max(im.size)
    if s >= 1: return im
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)


def split_of(im):
    """bottom of the canopy (trees) as a fraction of height: the lowest row that is still wider than 45% of the widest row,
    scanning up from the trunk. Props without a narrow foot get 1.0 (drawn whole under the actors)."""
    a = np.asarray(im.split()[-1]) > 40
    w = a.sum(axis=1).astype(float)
    if w.max() <= 0: return 1.0
    h = len(w); wide = w > w.max() * .45
    rows = np.nonzero(wide)[0]
    last = rows.max()
    return round(min(1.0, (last + 1) / h), 3)


def seamless(im, side=512):
    im = im.convert("RGB").resize((side, side), Image.LANCZOS)
    A = np.asarray(im).astype(np.float32)
    B = np.roll(np.roll(A, side // 2, 0), side // 2, 1)
    t = np.sin(np.linspace(0, np.pi, side)) ** .7
    m = np.outer(t, t)[..., None]
    T = A * m + B * (1 - m)
    return Image.fromarray(np.clip(T, 0, 255).astype(np.uint8), "RGB")


def main():
    out = os.path.join(SITE, VER); os.makedirs(out, exist_ok=True)
    man = {"v": 2, "a": {}}
    srcs = []
    for sub in ("cut_v1", "cut_v2"):
        d = os.path.join(ART, sub)
        if os.path.isdir(d):
            srcs += [(os.path.join(d, f), key_of(f)) for f in sorted(os.listdir(d)) if f.endswith(".png")]
    seen = {}
    for p, k in srcs: seen[k] = p                                 # cut_v2 wins over cut_v1 for the same key
    for k, p in sorted(seen.items()):
        if k.endswith("_b"): continue                             # alternate takes stay out
        im = trim(Image.open(p).convert("RGBA"))
        side = 512 if k.startswith("t_mount") else 384 if (BOSS.match(k) or k.startswith("t_")) else 256
        im = fit(im, side)
        sp = split_of(im) if (k.startswith("t_tree") or k.startswith("t_mount") or k in ("t_tower_orc", "t_portal")) else 1.0
        im.save(os.path.join(out, k + ".webp"), "WEBP", quality=82, method=6)
        man["a"][k] = [im.width, im.height, sp]
    gd = os.path.join(ART, "prod_v2")
    if os.path.isdir(gd):
        for f in sorted(os.listdir(gd)):
            if f.startswith("gr_") and f.endswith(".png"):
                k = key_of(f); im = seamless(Image.open(os.path.join(gd, f)))
                im.save(os.path.join(out, k + ".webp"), "WEBP", quality=80, method=6)
                man["a"][k] = [im.width, im.height, 1.0]
    json.dump(man, open(os.path.join(out, "manifest.json"), "w"), separators=(",", ":"))
    tot = sum(os.path.getsize(os.path.join(out, f)) for f in os.listdir(out))
    print(len(man["a"]), "images ·", round(tot / 1024), "KB ->", out)


DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "src", "js", "12a-art-data.js")


def publish():
    g = lambda *a: subprocess.run(["git", "-C", SITE] + list(a), check=True, capture_output=True, text=True, encoding="utf-8").stdout.strip()
    g("add", "-A")
    if g("status", "--porcelain"):
        g("commit", "-q", "-m", "art %s: อัปเดตภาพ\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" % VER)
    g("push", "-q", "origin", "art")
    rev = g("rev-parse", "HEAD")
    man = json.load(open(os.path.join(SITE, VER, "manifest.json")))
    rows = ",".join('%s:[%d,%d,%s]' % (k, w, h, ("%g" % sp)) for k, (w, h, sp) in sorted(man["a"].items()))
    js = ("/* ================= 12a-art-data.js · GENERATED by tools/art/pack_web.py --publish · do not edit by hand ================= */\n"
          "// art branch commit (jsDelivr serves it forever under this id) + each image: [width, height, split]\n"
          "// (split = bottom of the canopy / body as a fraction of the height · 1 = draw it whole)\n"
          "const ART_REV='%s', ART_VER='%s';\nconst ART_DIM={%s};\n" % (rev, VER, rows))
    open(DATA, "w", encoding="utf-8", newline="\n").write(js)
    print("published", rev, "->", os.path.normpath(DATA))


if __name__ == "__main__":
    main()
    if "--publish" in sys.argv: publish()
