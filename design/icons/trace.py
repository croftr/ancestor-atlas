# Trace the black-on-white category icons into 24×24 SVG paths (see README.md).
# usage: python3 trace.py <icon-dir> <out.json>
import sys, json, numpy as np
from PIL import Image
import potrace

src, out = sys.argv[1], sys.argv[2]
res = {}
for name in ["species", "culture", "civilization", "event"]:
    im = Image.open(f"{src}/{name}.png").convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    g = np.array(bg.convert("L"))
    # Blank the outer edge: some sources carry a thin frame line there.
    m = 10
    g[:m, :] = 255; g[-m:, :] = 255; g[:, :m] = 255; g[:, -m:] = 255
    dark = g < 128
    ys, xs = np.where(dark)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    w, h = x1 - x0, y1 - y0
    side = max(w, h)
    # Content fills 22 of the 24 units, centred.
    scale = 22 / side
    ox = 1 + (side - w) / 2 * scale
    oy = 1 + (side - h) / 2 * scale
    crop = g[y0:y1, x0:x1]
    bm = potrace.Bitmap(crop > 127)  # True = background; Bitmap inverts so dark is traced
    paths = bm.trace(turdsize=8, alphamax=1.0, opticurve=True, opttolerance=0.4)
    f = lambda p: f"{p.x * scale + ox:.2f} {p.y * scale + oy:.2f}"
    d = []
    for c in paths:
        d.append("M" + f(c.start_point))
        for s in c.segments:
            if s.is_corner:
                d.append("L" + f(s.c) + "L" + f(s.end_point))
            else:
                d.append("C" + f(s.c1) + " " + f(s.c2) + " " + f(s.end_point))
        d.append("Z")
    res[name] = "".join(d).replace(".00", "")
    print(name, len(paths), "curves", len(res[name]), "chars")
json.dump(res, open(out, "w"), indent=1)
