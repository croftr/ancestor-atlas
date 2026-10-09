# Category icons

Source drawings for the species / culture / civilization / event icons (the badge before an
entity's name, and the side menu). Black silhouettes on white, made with an image model.

The app doesn't load these PNGs. They're traced into SVG paths, which live in
`src/ui/CategoryIcon.tsx`, so the icons stay sharp at any size and take the colour of
wherever they're used.

To redo an icon: replace its PNG here (same file name, black on white, roughly square), then

```sh
pip install --target /tmp/potrace potracer pillow numpy
PYTHONPATH=/tmp/potrace python3 design/icons/trace.py design/icons /tmp/traced.json
```

and paste the new path from `/tmp/traced.json` into `CATEGORY_PATH` in `src/ui/CategoryIcon.tsx`.
