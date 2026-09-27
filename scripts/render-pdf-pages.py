"""Render a PDF's pages to PNG for the scanned-cutoff second reading (27 Sep 2026).

Used by scripts/import-official-cutoffs.ts --scanned-reviewed. NTA publishes
the NEET UG and JEE Main cut-off tables as scanned page images with no text
layer; the importer sends each rendered page to a vision model for a second,
blind reading (src/lib/scanned-cutoff.ts).

    python scripts/render-pdf-pages.py <file.pdf> <out-dir> [--dpi 200] [--max-pages 8]

Prints one JSON object on stdout:
    {"pageCount": n, "pages": [{"page": 1, "file": "...png", "width": w,
      "height": h, "dpi": 196.4, "textChars": 0, "sha256": "..."}]}

textChars = non-space characters in the page's own text layer (pdfium); a
scan-only page has 0. The render is ~200 dpi, scaled down only as far as the
vision model's high-resolution limit needs (long edge <= 2576 px and
<= 3.7 megapixels), so the model sees the pixels we send instead of
resizing them itself.
"""

import hashlib
import json
import os
import sys

import pypdfium2 as pdfium

MAX_LONG_EDGE = 2576
MAX_PIXELS = 3_700_000


def arg(name, default):
    if name in sys.argv:
        i = sys.argv.index(name)
        if i + 1 < len(sys.argv):
            return sys.argv[i + 1]
    return default


def main():
    if len(sys.argv) < 3:
        print("usage: render-pdf-pages.py <file.pdf> <out-dir> [--dpi 200] [--max-pages 8]", file=sys.stderr)
        sys.exit(2)
    src, out_dir = sys.argv[1], sys.argv[2]
    dpi = float(arg("--dpi", "200"))
    max_pages = int(arg("--max-pages", "8"))
    os.makedirs(out_dir, exist_ok=True)

    pdf = pdfium.PdfDocument(src)
    count = len(pdf)
    pages = []
    for i in range(min(count, max_pages)):
        page = pdf[i]
        w_pt, h_pt = page.get_size()
        textpage = page.get_textpage()
        text = textpage.get_text_range() or ""
        text_chars = sum(1 for ch in text if not ch.isspace())
        textpage.close()

        scale = dpi / 72.0
        w_px, h_px = w_pt * scale, h_pt * scale
        shrink = min(1.0, MAX_LONG_EDGE / max(w_px, h_px), (MAX_PIXELS / (w_px * h_px)) ** 0.5)
        scale *= shrink
        image = page.render(scale=scale).to_pil()
        file = os.path.join(out_dir, f"page-{i + 1}.png")
        image.save(file, format="PNG", optimize=True)
        with open(file, "rb") as fh:
            digest = hashlib.sha256(fh.read()).hexdigest()
        pages.append(
            {
                "page": i + 1,
                "file": file,
                "width": image.width,
                "height": image.height,
                "dpi": round(scale * 72.0, 1),
                "textChars": text_chars,
                "sha256": digest,
            }
        )
        page.close()
    pdf.close()
    print(json.dumps({"pageCount": count, "pages": pages}))


if __name__ == "__main__":
    main()
