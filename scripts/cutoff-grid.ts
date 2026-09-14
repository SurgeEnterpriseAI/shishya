// scripts/cutoff-grid.ts — pdfplumber's reading of a PDF's ruled tables for
// the cutoff grid proof (verifyCutoffRowByGrid in src/lib/official-cutoffs.ts).
// Used by scripts/import-official-cutoffs.ts.

import { execFileSync } from "node:child_process";
import { prepareCutoffGrid, type CutoffGrid, type CutoffGridPage } from "../src/lib/official-cutoffs";

/** Every ruled table, page by page, with the text printed above it (where a
 *  table's title — "Annexure-II … female candidates" — sits). pdfplumber
 *  leaves the positions a merged cell covers empty (None); each such position
 *  takes the text of the cell whose box physically reaches over it — the
 *  nearest cell to its left if that box extends past the column's centre
 *  ("<"), else the nearest above if its box extends below the row's centre
 *  ("^"). So "LD" printed once over five sub-columns heads all five. */
export const GRID_PY = `import sys, json, pdfplumber

def expand(t):
    texts = t.extract()
    rows = t.rows
    n = max((len(r.cells) for r in rows), default=0)
    centers = []
    for j in range(n):
        xs = sorted((r.cells[j][0] + r.cells[j][2]) / 2 for r in rows if j < len(r.cells) and r.cells[j] is not None)
        centers.append(xs[len(xs) // 2] if xs else None)
    out, spans = [], []
    for i, r in enumerate(rows):
        ry = (r.bbox[1] + r.bbox[3]) / 2
        line, mark = [], []
        for j in range(n):
            cell = r.cells[j] if j < len(r.cells) else None
            if cell is not None:
                line.append(texts[i][j] or "")
                mark.append("")
                continue
            text, m = "", ""
            k = next((k for k in range(j - 1, -1, -1) if k < len(r.cells) and r.cells[k] is not None), None)
            if k is not None and centers[j] is not None and r.cells[k][2] > centers[j]:
                text, m = texts[i][k] or "", "<"
            else:
                h = next((h for h in range(i - 1, -1, -1) if j < len(rows[h].cells) and rows[h].cells[j] is not None), None)
                if h is not None and rows[h].cells[j][3] > ry:
                    text, m = texts[h][j] or "", "^"
            line.append(text)
            mark.append(m)
        out.append(line)
        spans.append(mark)
    return out, spans

def printed_lines(p):
    words = p.extract_words(keep_blank_chars=False, use_text_flow=False)
    lines = []
    for w in sorted(words, key=lambda w: ((w["top"] + w["bottom"]) / 2, w["x0"])):
        yc = (w["top"] + w["bottom"]) / 2
        if lines and abs(lines[-1][0] - yc) <= 3:
            lines[-1][1].append(w)
        else:
            lines.append([yc, [w]])
    return [" ".join(x["text"] for x in sorted(ws, key=lambda w: w["x0"])) for _, ws in lines]

out = []
with pdfplumber.open(sys.argv[1]) as pdf:
    for i, p in enumerate(pdf.pages):
        tables, prev = [], 0
        for t in sorted(p.find_tables(), key=lambda t: t.bbox[1]):
            above = ""
            if t.bbox[1] - prev > 1:
                try:
                    above = p.crop((0, prev, p.width, t.bbox[1])).extract_text() or ""
                except Exception:
                    above = ""
            rows, spans = expand(t)
            tables.append({"rows": rows, "spans": spans, "above": above})
            prev = max(prev, t.bbox[3])
        out.append({"page": i + 1, "text": p.extract_text() or "", "lines": printed_lines(p), "tables": tables})
json.dump(out, sys.stdout, ensure_ascii=False)
`;

export function readPdfGrid(file: string): CutoffGridPage[] {
  const json = execFileSync("python", ["-c", GRID_PY, file], {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
    // An 88-page annexure takes minutes; on a busy machine far longer (13 Sep:
    // three parallel runs pushed SSC CHSL past 20 minutes and its rows were refused).
    timeout: 60 * 60_000,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  return JSON.parse(json) as CutoffGridPage[];
}

export function pdfplumberGrid(file: string): CutoffGrid | null {
  try {
    return prepareCutoffGrid(readPdfGrid(file));
  } catch (err) {
    console.log(`    ! grid read failed for ${file}: ${(err as Error).message.split("\n")[0]}`);
    return null;
  }
}
