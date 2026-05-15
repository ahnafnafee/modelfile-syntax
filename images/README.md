# Images

This directory hosts the Marketplace assets.

## Required before tagging v0.1.0

- `icon.png` — **128×128** PNG (256×256 for Retina works too). Marketplace listing image. Convert from `icon.svg` via any vector → raster tool:
  ```bash
  # via rsvg-convert (librsvg)
  rsvg-convert -w 256 -h 256 icon.svg -o icon.png
  # or via Inkscape
  inkscape icon.svg --export-type=png --export-width=256 --export-filename=icon.png
  ```
- `banner-marketplace.png` — **1280×640** PNG. Header image on the Marketplace listing.
- `demo.gif` — 5–8 second GIF showing the extension in action (open a Modelfile, see colors, trigger a linter warning, hover for docs). Record with `peek` (Linux), `LICEcap` (Mac/Win), or `ScreenToGif` (Win). Optimize with `gifsicle -O3`.

The `.svg` placeholder is kept for source / version control. Only the `.png` is actually referenced from `package.json` and `README.md`.
