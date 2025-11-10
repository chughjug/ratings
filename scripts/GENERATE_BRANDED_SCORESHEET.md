# Branded Chess Scoresheet Generator

`generate_branded_scoresheet.py` embeds a tournament logo directly into the
official chess scoresheet HTML so you can hand out or print a branded pairing
sheet in a couple of clicks.

## Prerequisites

- Python 3.9+ (already ships with `argparse`, `mimetypes`, and `base64`)
- A PNG, JPG, SVG, or GIF logo file

## Usage

Run the script from the repository root so the relative paths line up:

```bash
python scripts/generate_branded_scoresheet.py \
  --logo /absolute/path/to/td-logo.png \
  --output /absolute/path/to/branded_scoresheet.html \
  --pdf-output /absolute/path/to/branded_scoresheet.pdf \
  --title "Fall Classic Score Sheet"
```

Key flags:

- `--logo` (required) – the tournament director logo file
- `--output` – destination HTML file (defaults to `branded_scoresheet.html`)
- `--pdf-output` – optional PDF export (requires `pip install weasyprint`)
- `--title` – optional document title for the browser tab
- `--logo-alt` – alt text for accessibility (defaults to `Tournament Logo`)

The layout is a compact 6.5" width sheet with aligned header cells, smaller
signature blocks, and a fill-in result line at the bottom. The generated HTML
stores the image inline using a data URI, so you can email it, open it offline,
or print it without shipping separate assets. The exported PDF stacks two identical
scoresheets back-to-back so you can print and cut or distribute paired copies.

