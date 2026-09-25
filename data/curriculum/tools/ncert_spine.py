#!/usr/bin/env python3
"""NCERT curriculum spine — mechanical build from ncert.nic.in (25 Sep 2026).

Why this exists: the school expansion keys content by NCERT textbook, class by
class. Every book, chapter number and chapter PDF URL here comes from NCERT's
own index (https://ncert.nic.in/textbook.php) and every chapter title from the
book's own contents page (the "prelims" PDF, <code>ps.pdf) — nothing is typed
from memory. Where NCERT's own text cannot be read reliably (legacy non-Unicode
Hindi/Urdu/Sanskrit fonts, Devanagari with dropped conjuncts, image-only
pages, a 404 PDF) the chapter is listed as UNRESOLVED with the reason, never
guessed.

Steps (each writes files under data/curriculum/; network steps cache raw PDFs
in --cache, which is NOT committed — only hashes and the evidence lines are):

  python data/curriculum/tools/ncert_spine.py fetch-index
  python data/curriculum/tools/ncert_spine.py fetch-prelims    --cache <dir>
  python data/curriculum/tools/ncert_spine.py extract-contents --cache <dir>
  python data/curriculum/tools/ncert_spine.py check-pdfs       --cache <dir>
  python data/curriculum/tools/ncert_spine.py check-includes   --cache <dir>
  python data/curriculum/tools/ncert_spine.py trim-contents    --cache <dir>
  python data/curriculum/tools/ncert_spine.py build             (offline, deterministic)

Chapter titles are transcribed ONCE into data/curriculum/ncert/titles.json from
the contents text (<cache>/contents-full/<code>.txt), because NCERT's contents
pages have no single machine-readable layout (units vs lessons, wrapped lines,
"Chapter" printed without a number).

26 Sep 2026 (review): the repo is public and NCERT's prelims say "all rights
reserved", so the full contents pages stay in the cache. trim-contents commits
only the evidence lines: for each transcribed title, the contents line(s) that
print it plus the next two lines, so tests/unit/school-spine.test.ts can check
both that the title is NCERT's text and that it is complete. Eight titles had
been cut at the end of the first line of a wrapped entry ("Chanda Mama Counts"
for "Chanda Mama Counts the Stars"); trim-contents now refuses a title whose
entry visibly continues (lowercase or ":" / "–" continuation, or a title ending
on "of" / "and" / ":"), and every other line that follows a title must be
recognised (next number, known entry, page, boilerplate, all-caps author) or
carry a reviewed label in BOUNDARY_REVIEWED. Likewise the saved index keeps only
the index script of textbook.php (the page chrome is dropped), with the full
page's sha256 in its header.

Requires Python 3.11+, PyMuPDF (fitz) and xpdf/poppler `pdftotext`.
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import datetime as dt
import hashlib
import json
import os
import re
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]          # data/curriculum
SRC = ROOT / "sources" / "ncert"
OUT = ROOT / "ncert"
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
INDEX_URL = "https://ncert.nic.in/textbook.php"
PDF_BASE = "https://ncert.nic.in/textbook/pdf/"
ROMAN = {1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII"}

# The index page's own JS lists a few books with sectioned numbering instead
# of 1..N (textbook.php, the `pm=="lekl1"` etc. branches). pdfSeq = the NN in
# <code><NN>.pdf that each listed entry opens.
SPECIAL_SEQ = {
    "jhsp1": list(range(1, 15)),
    "lekl1": list(range(1, 6)) + list(range(11, 19)) + list(range(21, 27)) + [31, 32],
    "keww1": list(range(1, 9)) + list(range(11, 20)) + [20, 21, 22] + list(range(31, 38)),
    "lefl1": list(range(1, 9)) + list(range(11, 16)),
    "lhat1": list(range(1, 10)) + list(range(10, 18)),
    "kehb1": list(range(1, 7)) + list(range(11, 17)),
}
# Maths + Science, Classes 6-10 (the first build slice): every chapter PDF is
# downloaded and its first two pages are checked for the title, not just the
# first and last chapter.
FULL_CHECK = {"fegp1", "fecu1", "gegp1", "gegp2", "gecu1", "hegp1", "hegp2", "hecu1", "iemh1", "iesc1", "jemh1", "jesc1"}
# Contents pages the heading regex cannot find (image heading / no "Contents").
CONTENTS_PAGES_OVERRIDE = {"keph1": [13, 14], "legy1": [9], "lehs1": [11, 12]}
LANGUAGE_SUBJECT = {"Hindi": "hi", "Urdu": "ur", "Sanskrit": "sa"}
LANG_WORDS = {
    "english": "en", "hindi": "hi", "urdu": "ur", "sanskrit": "sa", "assamese": "as", "bengali": "bn", "bodo": "brx",
    "dogri": "doi", "gujarati": "gu", "gujrati": "gu", "kannada": "kn", "kashmiri": "ks", "konkani": "kok",
    "maithili": "mai", "maithli": "mai", "malayalam": "ml", "manipuri": "mni", "marathi": "mr", "nepali": "ne",
    "odia": "or", "oriya": "or", "punjabi": "pa", "santhali": "sat", "sindhi": "sd", "tamil": "ta", "telugu": "te",
}
CONTENTS_FULL = "contents-full"      # <cache>/contents-full/<code>.txt: whole contents pages (not committed)
CHAPTER_PDFS = "chapter-pdfs"        # <cache>/chapter-pdfs/<code><NN>.pdf: chapter PDFs kept for re-checks
# Lines after a title that the mechanical rules cannot place, each read by a
# person against the contents page (26 Sep 2026). Key: "<code>#<seq>" for a
# chapter title, "<code>#<seq>/<k>" for its k-th include, "<code>#<seq>:subtitle".
# Value: what that next line is. A title whose next line is not recognised and
# not listed here stops trim-contents, so a new transcription gets looked at.
# "complete: <why>" also clears a flagged run-on after checking the page.
def _reviewed() -> dict[str, str]:
    r: dict[str, str] = {}

    def mark(label: str, *keys: str):
        for k in keys:
            r[k] = label

    # English readers print the author on the line after each title (names checked: Anton Chekhov … Kumudini Lakhia)
    mark("author", *[f"keww1#{n}" for n in range(1, 28)],
         *[f"lefl1#{n}" for n in (1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13)],
         *[f"levt1#{n}" for n in range(1, 6)], "levt1#6/1", "levt1#6/2",
         *[f"kehb1#{n}" for n in range(1, 7)], "kehb1#1/1", "kehb1#3/1", "kehb1#3/2", "kehb1#4/1", "kehb1#6/1")
    # pdftotext runs the chapter's own section list onto the next line
    mark("sub-entry-list", "leac2#1", "leac2#2", "leac2#3", "leca1#1", "leca1#2", "leca1#3")
    mark("sub-entry", "feky1#5")  # "UNIT 5: Yoga", then "Yoga Session Structure" (the unit's first item)
    mark("complete: Chapter 13's whole entry; the next line is Chapter 14", "cemm1#13")
    mark("complete: all-caps chapter title; '–' starts its bulleted section list (PyMuPDF prints each '– SECTION' on its own line)",
         "keec1#1", "keec1#2", "keec1#5", "keec1#6", "keec1#7")
    mark("complete: printed 'SHORT STORIES – INTRODUCTION' etc.; '– Introduction' names the section's opening piece",
         "lekl1#1:section", "lekl1#6:section", "lekl1#14:section", "lekl1#20:section")
    mark("complete: pdftotext interleaves two columns (': Sexual Reproduction in Flowering Plants : Human Reproduction'); PyMuPDF prints the entry alone",
         "lebo1#1")
    return r


BOUNDARY_REVIEWED: dict[str, str] = _reviewed()
CODE_LANG = {  # infix after the class letter in NCERT book codes
    "e": "en", "h": "hi", "u": "ur", "as": "as", "bn": "bn", "bd": "brx", "dg": "doi", "gj": "gu", "kn": "kn",
    "ks": "ks", "ko": "kok", "ml": "ml", "mn": "mni", "mr": "mr", "mt": "mai", "np": "ne", "or": "or", "pn": "pa",
    "sk": "sa", "sn": "sat", "si": "sd", "tm": "ta", "tl": "te",
}


def now_ist() -> str:
    return dt.datetime.now(IST).isoformat(timespec="seconds")


def http(url: str, method: str = "GET", tries: int = 6):
    last = None
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, method=method, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=180) as r:
                body = r.read() if method == "GET" else b""
                return r.status, dict(r.headers), body
        except urllib.error.HTTPError as e:
            if e.code in (403, 404):
                return e.code, {}, b""
            last = e
        except Exception as e:  # connection resets are common on ncert.nic.in
            last = e
        time.sleep(2 + 3 * attempt)
    raise RuntimeError(f"{url}: {last!r}")


# ── index parsing ─────────────────────────────────────────────────────────

def strip_js_comments(s: str) -> str:
    out, i, n, q = [], 0, len(s), None
    while i < n:
        c = s[i]
        if q:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(s[i + 1]); i += 2; continue
            if c == q or c == "\n":
                q = None
            i += 1; continue
        if c in "\"'":
            q = c; out.append(c); i += 1; continue
        if s.startswith("//", i):
            j = s.find("\n", i); i = n if j < 0 else j; continue
        if s.startswith("/*", i):
            j = s.find("*/", i + 2); i = n if j < 0 else j + 2; continue
        out.append(c); i += 1
    return "".join(out)


def parse_index(html: str) -> dict:
    """class value -> [(subject, [ {title, value} ])] exactly as the page's
    change()/change1() JS would show them (commented-out lines dropped, later
    assignments to the same option index win)."""
    a = html.index("function change()")
    b = html.index("function change1(sind)")
    e = html.index("</script>", b)
    subj_js, book_js = strip_js_comments(html[a:b]), strip_js_comments(html[b:e])
    classes: dict[int, list[str]] = {}
    marks = [(m.start(), int(m.group(1))) for m in re.finditer(r"if\s*\(\s*document\.test\.tclass\.value\s*==\s*(-?\d+)\s*\)", subj_js)]
    for k, (p, cl) in enumerate(marks):
        q = marks[k + 1][0] if k + 1 < len(marks) else len(subj_js)
        opts: dict[int, str] = {}
        for m in re.finditer(r"document\.test\.tsubject\.options\[(\d+)\]\.text\s*=\s*\"([^\"]*)\"", subj_js[p:q]):
            opts[int(m.group(1))] = m.group(2).strip()
        if cl >= 1:
            classes[cl] = [opts[i] for i in sorted(opts) if i > 0 and opts[i]]
    books: dict[tuple[int, str], list[dict]] = {}
    marks2 = [(m.start(), int(m.group(1)), m.group(2)) for m in re.finditer(
        r"if\s*\(\s*\(\s*document\.test\.tclass\.value\s*==\s*(\d+)\s*\)\s*&&\s*\(\s*document\.test\.tsubject\.options\[sind\]\.text\s*==\s*\"([^\"]*)\"\s*\)\s*\)", book_js)]
    for k, (p, cl, subj) in enumerate(marks2):
        q = marks2[k + 1][0] if k + 1 < len(marks2) else len(book_js)
        opts: dict[int, dict] = {}
        for m in re.finditer(r"document\.test\.tbook\.options\[(\d+)\]\.(text|value)\s*=\s*\"([^\"]*)\"", book_js[p:q]):
            opts.setdefault(int(m.group(1)), {})[m.group(2)] = m.group(3).strip()
        lst = [{"title": o.get("text", ""), "value": o.get("value", "")} for i, o in sorted(opts.items())
               if i > 0 and (o.get("text") or o.get("value"))]
        books.setdefault((cl, subj), lst)
    return {cl: [(s, books.get((cl, s), [])) for s in subs] for cl, subs in classes.items()}


def parse_value(v: str):
    m = re.match(r"textbook\.php\?([a-z0-9]+)=([a-z0-9]+)-([0-9]+)$", v or "")
    return (m.group(1), int(m.group(3))) if m else (None, None)


def title_language(t: str):
    m = re.search(r"\(\s*([A-Za-z]+)\s*\)\s*$", t)
    return LANG_WORDS.get(m.group(1).lower()) if m else None


def code_language(code: str):
    rest = code[1:]
    for k in sorted(CODE_LANG, key=len, reverse=True):
        if rest.startswith(k):
            return CODE_LANG[k], k
    return None, None


def subject_code(name: str) -> str:
    s = name.replace("&", " and ")
    return re.sub(r"[^A-Z0-9]+", "_", s.upper()).strip("_")


def chapter_seqs(code: str, count: int) -> list[int]:
    return SPECIAL_SEQ.get(code, list(range(1, count + 1)))


def load_index() -> tuple[dict, Path]:
    snaps = sorted(SRC.glob("textbook-php-*.html"))
    if not snaps:
        sys.exit("no index snapshot — run fetch-index")
    path = snaps[-1]
    return parse_index(path.read_text(encoding="utf-8", errors="replace")), path


INDEX_HEAD = re.compile(r"^<!-- NCERT textbook index: (\S+)\n\s*fetched: (\S+)\s+bytes: (\d+)\s+sha256: ([0-9a-f]{64})")


def trim_index_html(html: str, sha: str, nbytes: int, fetched: str) -> str:
    """Keep only the index script of textbook.php (change() … change1() …
    </script>): the class → subject → book lists. The rest of the page is
    NCERT's site chrome, not data, and is not republished."""
    a = html.index("function change()")
    e = html.index("</script>", html.index("function change1(sind)"))
    return (f"<!-- NCERT textbook index: {INDEX_URL}\n     fetched: {fetched}  bytes: {nbytes}  sha256: {sha}\n"
            f"     Only the page's index script is kept (function change() … change1() … </script>); the rest of the page is\n"
            f"     NCERT's site, not data. bytes/sha256 are of the whole page as fetched. -->\n<script>\n{html[a:e]}</script>\n")


def index_source(path: Path) -> dict:
    """sha256/bytes of the whole page as fetched (from the trimmed file's
    header; for an untrimmed snapshot, of the file itself)."""
    raw = path.read_bytes()
    m = INDEX_HEAD.match(raw.decode("utf-8", "replace"))
    if m:
        return {"sha256": m.group(4), "bytes": int(m.group(3)), "fetchedOn": m.group(2)[:10]}
    return {"sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw), "fetchedOn": path.stem.replace("textbook-php-", "")}


def read_tsv(path: Path) -> list[dict]:
    lines = [l for l in path.read_text(encoding="utf-8").splitlines() if l and not l.startswith("#")]
    head = lines[0].split("\t")
    return [dict(zip(head, l.split("\t"))) for l in lines[1:]]


def write_tsv(path: Path, rows: list[dict], cols: list[str], comment: str):
    with path.open("w", encoding="utf-8", newline="\n") as f:
        f.write(f"# {comment}\n")
        f.write("\t".join(cols) + "\n")
        for r in rows:
            f.write("\t".join(str(r.get(c, "") if r.get(c) is not None else "") for c in cols) + "\n")


def primary_candidates(index: dict) -> list[dict]:
    """Books whose chapters we list: English-medium books; in Hindi/Urdu/
    Sanskrit subjects every book; in subjects with no English book, every
    non-regional book. Script checks in `build` then demote any 'English'
    book whose contents page is not Latin script (e.g. lehh1/lehh2)."""
    out = []
    for cl, subs in index.items():
        for subj, bks in subs:
            parsed = []
            for b in bks:
                code, count = parse_value(b["value"])
                if not code:
                    continue
                lang = title_language(b["title"]) or code_language(code)[0]
                parsed.append({"class": cl, "subject": subj, "title": b["title"], "code": code, "count": count, "lang": lang})
            if subj in LANGUAGE_SUBJECT:
                out += parsed
            elif any(p["lang"] == "en" for p in parsed):
                out += [p for p in parsed if p["lang"] == "en"]
            else:
                out += [p for p in parsed if p["lang"] in ("hi", "ur", None)]
    return out


# ── network / extraction steps ───────────────────────────────────────────

def cmd_fetch_index(args):
    status, headers, body = http(INDEX_URL)
    if status != 200:
        sys.exit(f"index HTTP {status}")
    day = dt.datetime.now(IST).date().isoformat()
    path = SRC / f"textbook-php-{day}.html"
    sha = hashlib.sha256(body).hexdigest()
    path.write_text(trim_index_html(body.decode("utf-8", "replace"), sha, len(body), now_ist()), encoding="utf-8", newline="\n")
    print(path, len(body), sha)


def cmd_trim_index(args):
    """One-off (26 Sep 2026): trim an index snapshot saved whole before the
    trimming rule, keeping the whole page's sha256 in the header."""
    for path in sorted(SRC.glob("textbook-php-*.html")):
        raw = path.read_bytes()
        if INDEX_HEAD.match(raw.decode("utf-8", "replace")):
            continue
        day = path.stem.replace("textbook-php-", "")
        path.write_text(trim_index_html(raw.decode("utf-8", "replace"), hashlib.sha256(raw).hexdigest(), len(raw), day),
                        encoding="utf-8", newline="\n")
        print("trimmed", path, len(raw), "->", path.stat().st_size)


def script_ratio(t: str) -> dict:
    lat = sum(1 for ch in t if "A" <= ch <= "Z" or "a" <= ch <= "z")
    dev = sum(1 for ch in t if "ऀ" <= ch <= "ॿ")
    ara = sum(1 for ch in t if "؀" <= ch <= "ۿ" or "ﭐ" <= ch <= "﻿")
    tot = max(1, lat + dev + ara)
    return {"latin": round(lat / tot, 3), "devanagari": round(dev / tot, 3), "arabic": round(ara / tot, 3)}


def cmd_fetch_prelims(args):
    index, _ = load_index()
    cache = Path(args.cache); cache.mkdir(parents=True, exist_ok=True)

    def one(c):
        p = cache / f"{c['code']}ps.pdf"
        meta = cache / f"{c['code']}ps.pdf.meta.json"
        if p.exists() and meta.exists():
            return json.loads(meta.read_text())
        url = f"{PDF_BASE}{c['code']}ps.pdf"
        status, headers, body = http(url)
        m = {"code": c["code"], "url": url, "status": status, "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest(),
             "lastModified": headers.get("Last-Modified"), "fetchedAt": now_ist()}
        if status == 200:
            p.write_bytes(body)
        meta.write_text(json.dumps(m))
        return m

    with cf.ThreadPoolExecutor(4) as ex:
        for m in ex.map(one, primary_candidates(index)):
            print(m["code"], m["status"], m["bytes"])


HEADING = re.compile(r"^\s*(contents|content|table of contents|विषय[-\s]?सूची|विषय[-\s]?क्रम|अनुक्रम|अनुक्रमणिका|विषयानुक्रमणिका|فہرست|فہرست مضامین)\s*$", re.I | re.M)


def pdftotext_page(pdf: Path, page: int) -> str:
    r = subprocess.run(["pdftotext", "-f", str(page), "-l", str(page), "-enc", "UTF-8", str(pdf), "-"], capture_output=True)
    return r.stdout.decode("utf-8", "replace")


def cmd_extract_contents(args):
    import fitz  # PyMuPDF
    index, _ = load_index()
    cache = Path(args.cache)
    titles_path = OUT / "titles.json"
    titles = json.loads(titles_path.read_text(encoding="utf-8"))["books"] if titles_path.exists() else {}
    rows = []
    full_dir = cache / CONTENTS_FULL  # whole contents pages: cache only (the repo gets trim-contents' evidence lines)
    full_dir.mkdir(exist_ok=True)
    for c in primary_candidates(index):
        code = c["code"]
        pdf = cache / f"{code}ps.pdf"
        meta = json.loads((cache / f"{code}ps.pdf.meta.json").read_text())
        doc = fitz.open(pdf)
        pages = [p.get_text() for p in doc]
        hits = [i for i, t in enumerate(pages) if HEADING.search(t)]
        # Keep only contents pages (titles + page numbers are facts; the
        # foreword or "how to use this book" pages are book text and stay
        # out): the heading page, plus the next two pages only when they
        # carry one of this book's transcribed chapter titles.
        known = [norm_text(e["title"]) for e in titles.get(code, [])]
        def carries_titles(k: int) -> bool:
            txt = norm_text(pages[k]) + " " + norm_text(pdftotext_page(pdf, k + 1))
            return any(t in txt for t in known)
        sel = sorted({h for h in hits} | {k for h in hits for k in range(h + 1, min(h + 3, len(pages))) if known and carries_titles(k)})
        if code in CONTENTS_PAGES_OVERRIDE:
            sel = [p - 1 for p in CONTENTS_PAGES_OVERRIDE[code]]
        allt = "".join(pages)
        sr = script_ratio(allt)
        sess = re.search(r"Reprint\s+(20\d\d\s*[-–]\s*\d\d)", allt)
        first_ed = re.search(r"First Edition\s+([A-Z][a-z]+\s+\d{4})", allt)
        rows.append({**meta, "class": c["class"], "subject": c["subject"], "title": c["title"], "pages": len(pages),
                     "contentsPages": ",".join(str(p + 1) for p in sel), **{f"script_{k}": v for k, v in sr.items()},
                     "printedSession": re.sub(r"\s", "", sess.group(1)).replace("–", "-") if sess else "",
                     "firstEdition": re.sub(r"\s+", " ", first_ed.group(1)) if first_ed else ""})
        with (full_dir / f"{code}.txt").open("w", encoding="utf-8", newline="\n") as f:
            f.write(f"# NCERT prelims (contents pages) — {code} — {c['title']} (index class {c['class']}, {c['subject']})\n")
            f.write(f"# source: {meta['url']}\n# fetched: {meta['fetchedAt']}  sha256: {meta['sha256']}  bytes: {meta['bytes']}\n")
            f.write(f"# pages kept: {','.join(str(p + 1) for p in sel) or 'none found'} of {len(pages)}; only these pages are kept (facts: titles, numbers)\n")
            for k in sel:
                f.write(f"\n=== pymupdf page {k + 1} ===\n{pages[k]}")
            for k in sel:
                f.write(f"\n=== pdftotext page {k + 1} ===\n{pdftotext_page(pdf, k + 1)}")
    day = dt.datetime.now(IST).date().isoformat()
    cols = ["code", "class", "subject", "title", "url", "status", "bytes", "sha256", "lastModified", "fetchedAt", "pages",
            "contentsPages", "script_latin", "script_devanagari", "script_arabic", "printedSession", "firstEdition"]
    write_tsv(SRC / f"prelims-{day}.tsv", rows, cols, "NCERT prelims PDFs (<code>ps.pdf) for every primary book; script_* = share of letters by script over the whole PDF text layer")
    print(len(rows), "books")


def norm_text(t: str) -> str:
    t = unicodedata.normalize("NFKC", t)
    out = []
    for l in t.split("\n"):
        l = re.sub(r"[\.…_�]{5,}.*$", "", l.replace("\t", " "))
        l = re.sub(r"\s+", " ", l).strip()
        if not l or re.match(r"^(\d{1,3}(\s*[-–]\s*\d{1,3})?|[ivxlc]{1,6}|\([ivxlc]+\)|reprint 20\d\d-\d\d|=== .* ===|#.*|•|–)$", l, re.I):
            continue
        out.append(l)
    s = " ".join(out)
    for a, b in (("’", "'"), ("‘", "'"), ("“", '"'), ("”", '"')):
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).lower()


def squash(s: str) -> str:
    s = re.sub(r"[‐‑‒–—−-]", "-", s.lower())
    return re.sub(r"[^a-z0-9\-]", "", s)


# ── contents evidence (26 Sep 2026) ───────────────────────────────────────
# What is committed per book is not the contents page but, for every title
# we transcribed, the line(s) that print it and the next two lines. The same
# rules run in tests/unit/school-spine.test.ts (evidence*, boundary*) — keep
# the two in step.

CTRL = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")
PAGE_ONLY = re.compile(r"^(\d{1,3}(-\d{1,3})?|[ivxlc]{1,6}|\([ivxlc]+\)|reprint|(reprint )?20\d\d-\d\d|:)$", re.I)
LEADERS = re.compile(r"[\.…_�·]{2,}")
LONG_LEADERS = re.compile(r"[\.…_�·]{5,}")  # dotted leaders; committed evidence shortens each run to "....."
FUNCTION_WORDS = {"a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "of", "on", "or", "the", "to", "with"}
NUMBERING = re.compile(r"^(((mandatory|optional)\s+)?(chapter|unit|lesson|theme|part|section|module|project)\s*[0-9ivxl]*\s*[:.\-–—]?\s*|\d{1,2}(\.\d{1,2})*\s*[.:)]?(\s+|$)|[ivxl]{1,5}\s*[.)]\s*|[a-h]\s*[.)](\s+|$))", re.I)
# What may stand right before a title on its line: nothing, a number or label
# ("Chapter 8", "11.", "Unit 2:"), a bullet, or a ":" / "-" separator. "Words"
# inside "Carrier of Words" is not the entry "Words".
TITLE_PREFIX = re.compile(r"(^|[\s:])(((mandatory|optional)\s+)?(chapter|unit|lesson|theme|part|section|module|project)\s*[0-9ivxl]*|\d{1,2}(\.\d{1,2})*|[ivxl]{1,5}|[a-h])\s*[.:)\-]?\s*$|^\s*$|[•●▪◦:\-(]\s*$", re.I)
BULLET = re.compile(r"^[•●▪◦\-–—*]\s*")
BOILERPLATE = re.compile(
    r"^(appendi|answers?\b|answer key|glossary|index\b|bibliograph|references?\b|suggested (reading|activities|readings)|further reading|"
    r"notes? (for|to) the teacher|image credits|acknowledg|reprint 20|self[- ]assessment|picture reading|learning material sheets?|"
    r"puzzles?\b|conclusion\b|annexure|guidelines for|glimpses|maps? of india|political map|select one|session structure|form no\.|"
    r"writing skills|reading skills|poetry\b|prose\b|drama\b|fiction\b|non-fiction|short stories|essays?\b|theatre\b|music\b|dance\b|visual arts|"
    r"dance and movement|folk\b|introduction\b|about the book|preface|foreword|contents\b|practical work|project work|question bank|syllabus|graph paper|feedback questionnaire)", re.I)
BOUNDARY_LABELS = {"end", "page", "number", "sub-entry", "known", "boilerplate", "caps-line"} | {"author", "heading", "sub-entry-list", "unit-lesson", "complete"}


def ev_norm(s: str) -> str:
    """Case-kept normalisation (same length as its .lower())."""
    s = unicodedata.normalize("NFKC", CTRL.sub("", s))
    for a, b in (("’", "'"), ("‘", "'"), ("“", '"'), ("”", '"'), ("—", "-"), ("–", "-"), ("‐", "-"), ("‑", "-"), (" ", " "), (" ", " "), (" ", " ")):
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s).strip()


def contents_blocks(text: str) -> list[tuple[str, int, list[str]]]:
    """(engine, page, lines) blocks of a contents-full file, pdftotext first."""
    out, cur = [], None
    for l in text.split("\n"):
        m = re.match(r"^=== (pymupdf|pdftotext) page (\d+) ===$", l)
        if m:
            cur = (m.group(1), int(m.group(2)), [])
            out.append(cur)
        elif cur is not None:
            cur[2].append(l)
    return sorted(out, key=lambda b: (b[0] != "pdftotext", b[1]))


def is_page_line(l: str) -> bool:
    t = re.sub(r"\s*-\s*", "-", ev_norm(LEADERS.sub(" ", l))).strip()
    return not t or all(PAGE_ONLY.match(x) for x in t.split(" "))


def locate_all(lines: list[str], title: str):
    """Every place the title is printed: across up to 5 consecutive non-page
    lines, starting in the first. Yields (first_idx, last_idx, rest, pos, acc)
    — acc = the normalised lines joined, pos = where the title starts in it,
    rest = case-kept text after the title. A short title can also sit inside
    a longer line ("Queue" in "4.3 Implementation of Queue using Python"), so
    callers pick the occurrence that is the entry itself."""
    want = ev_norm(title).lower()
    idx = [i for i, l in enumerate(lines) if not is_page_line(l)]
    for k, i in enumerate(idx):
        acc = ""
        first_len = len(ev_norm(lines[i]))
        for j in idx[k:k + 5]:
            acc = (acc + " " + ev_norm(lines[j])).strip()
            low = acc.lower()
            pos = low.find(want)
            while 0 <= pos <= first_len:
                if TITLE_PREFIX.search(low[:pos]):
                    yield i, j, acc[pos + len(want):], pos, acc
                pos = low.find(want, pos + 1)
            if pos > first_len or len(acc) > len(want) + 300:
                break
            if low.find(want) >= 0:
                break


def boundary(title: str, rest: str, after: list[str], known: set[str]) -> tuple[str | None, list[str]]:
    """(label or None if unrecognised, hard problems). Hard problems mean the
    printed entry visibly goes on past the title."""
    problems = []
    r = LEADERS.sub(" ", rest).strip()
    r = re.sub(r"^(\d{1,3}(\s*[-–]\s*\d{1,3})?\s+)+", "", r + " ").strip()
    r = re.sub(r"^[\"'”’)\]]+", "", r).strip()
    t = ev_norm(title)
    if r and (r[0].islower() or r[0] in ":-,&/"):
        problems.append(f"the entry goes on after the title on the same line: {r[:60]!r}")
    if t and (t[-1] in ":-,&/" or t.split(" ")[-1].lower() in FUNCTION_WORDS):
        problems.append("the title ends on a connector or function word")
    nxt = next((ev_norm(LEADERS.sub(" ", a)) for a in after if not is_page_line(a)), "")
    if nxt and nxt[0].islower():
        problems.append(f"the next contents line continues in lowercase: {nxt[:60]!r}")
    if r and not problems:
        nxt = r  # a same-line follower (next entry / author) is judged like a next line
    if not nxt:
        return ("end" if not after else "page"), problems
    low = nxt.lower()
    body = NUMBERING.sub("", BULLET.sub("", low)).strip()
    if NUMBERING.match(low) and body != low:
        return "number", problems
    if BULLET.match(nxt) or nxt.startswith("("):
        return "sub-entry", problems
    if any(body.startswith(k) or (len(body) > 3 and k.startswith(body)) for k in known if k and k != t.lower()):
        return "known", problems
    if BOILERPLATE.match(body):
        return "boilerplate", problems
    letters = re.sub(r"[^A-Za-z]", "", nxt)
    if letters and letters.isupper() and not re.sub(r"[^A-Za-z]", "", t).isupper():
        return "caps-line", problems
    return None, problems


def contents_items(code: str, entries: list[dict]):
    """(key, what, text) for every transcribed string of a book, in order."""
    seen_sections = set()
    for n, e in enumerate(entries, start=1):
        if e.get("source") == "chapter-pdf":
            continue
        yield f"{code}#{n}", "title", e["title"]
        if e.get("subtitle"):
            yield f"{code}#{n}:subtitle", "subtitle", e["subtitle"]
        if e.get("section") and e["section"] not in seen_sections:
            seen_sections.add(e["section"])
            yield f"{code}#{n}:section", "section", e["section"]
        for k, inc in enumerate(e.get("includes", []), start=1):
            yield f"{code}#{n}/{k}", "include", inc["title"]


def cmd_trim_contents(args):
    """Write sources/ncert/contents/<code>.txt: header + one evidence block per
    transcribed string (chapter title, subtitle, section, include). Stops on a
    title whose entry visibly continues, or whose next line is unrecognised
    and not in BOUNDARY_REVIEWED."""
    index, _ = load_index()
    cache = Path(args.cache)
    titles = json.loads((OUT / "titles.json").read_text(encoding="utf-8"))["books"]
    out_dir = SRC / "contents"
    out_dir.mkdir(exist_ok=True)
    failures, unreviewed, used_reviews = [], [], set()
    written = 0
    for c in primary_candidates(index):
        code = c["code"]
        full = (cache / CONTENTS_FULL / f"{code}.txt").read_text(encoding="utf-8")
        head = [l for l in full.split("\n")[:5] if l.startswith("# source:") or l.startswith("# fetched:")]
        head += [re.sub(r"^# pages kept: (.*?); only these pages.*$", r"# contents pages of the PDF: \1", l)
                 for l in full.split("\n")[:5] if l.startswith("# pages kept:")]
        blocks = contents_blocks(full)
        entries = titles.get(code, [])
        known = {ev_norm(x).lower() for _, _, x in contents_items(code, entries)}
        known |= {ev_norm(e["title"]).lower() for e in entries}
        full_sha = hashlib.sha256(full.encode("utf-8")).hexdigest()
        lines_out = [
            f"# NCERT contents evidence — {code} — {c['title']} (index class {c['class']}, {c['subject']})",
            *head,
            f"# 26 Sep 2026: evidence lines only — for each title in data/curriculum/ncert/titles.json, the contents line(s) that print it",
            f"# and the next two lines ('+'). The whole contents text stays in the builder cache (sha256 {full_sha});",
            f"# the repo is public and NCERT's prelims say all rights reserved. Control characters are removed.",
        ]
        if not entries:
            lines_out.append("# no titles transcribed for this book (see the book's unresolved reason in ncert/class-*.json)")
        for key, what, text in contents_items(code, entries):
            hits = []
            for eng in ("pdftotext", "pymupdf"):
                found = []
                for engine, page, lines in blocks:
                    if engine != eng:
                        continue
                    for i, j, rest, pos, acc in locate_all(lines, text):
                        after = [l for l in lines[j + 1:] if l.strip()][:2]
                        found.append((engine, page, lines, i, j, rest, after, pos, acc))
                # per extraction, the entry itself = the first occurrence that
                # does not run on (a short title also sits inside longer lines);
                # if every occurrence runs on, the first one fails below
                clean = [h for h in found if not boundary(text, h[5], h[6], known)[1]]
                if found:
                    hits.append((clean or found)[0])
            if not hits:
                failures.append(f"{key} {what} {text!r}: not found in the contents text")
                continue
            review_full = BOUNDARY_REVIEWED.get(key)
            review = review_full.split(":", 1)[0] if review_full else None
            # a continuation in ANY extraction counts (the two extractions break and order lines differently)
            probs = [f"[{h[0]} p{h[1]}] " + "; ".join(p) for h in hits for p in [boundary(text, h[5], h[6], known)[1]] if p]
            if probs and review != "complete":
                failures.append(f"{key} {what} {text!r}: " + " | ".join(probs))
            # the committed evidence: the cleanest extraction (empty same-line rest first, then pdftotext)
            engine, page, lines, i, j, rest, after, pos, acc = sorted(hits, key=lambda h: (bool(LEADERS.sub(" ", h[5]).strip(" 0123456789")), h[0] != "pdftotext"))[0]
            lab, _ = boundary(text, rest, after, known)
            if review == "complete" and probs:
                lab = "complete"
            elif lab is None and review:
                lab = review
            if review and lab == review:
                used_reviews.add(key)
            if lab is None:
                follower = rest.strip() or next((a.strip() for a in after if not is_page_line(a)), "")
                unreviewed.append(f"{key} {what} {text!r} [{engine} p{page}] next: {follower[:70]!r}")
                lab = "?"
            why = f" (reviewed: {review_full.split(':', 1)[1].strip()})" if review_full and ":" in review_full and lab == review else ""
            lines_out.append(f"@{key} {what} [{engine} p{page}] next={lab}{why}")
            if len(acc) > 240:
                # pdftotext can run a whole contents page into one line: keep a
                # window of it (normalised text, "~ "): 60 characters before the
                # title, the title, 100 after — enough for the boundary rules,
                # without re-committing the page
                lines_out.append("~ " + LONG_LEADERS.sub(".....", acc[max(0, pos - 60):pos + len(ev_norm(text)) + 100]).strip())
            else:
                for l in lines[i:j + 1]:
                    if l.strip():
                        lines_out.append("  " + LONG_LEADERS.sub(".....", CTRL.sub("", l)).rstrip())
            for l in after:
                lines_out.append("+ " + LONG_LEADERS.sub(".....", CTRL.sub("", l)).rstrip()[:160])
        (out_dir / f"{code}.txt").write_text("\n".join(lines_out) + "\n", encoding="utf-8", newline="\n")
        written += 1
    stale = sorted(set(BOUNDARY_REVIEWED) - used_reviews)
    for s in stale:
        print("unused BOUNDARY_REVIEWED entry:", s)
    if failures or unreviewed:
        for f in failures:
            print("CONTINUES:", f)
        for u in unreviewed:
            print("UNREVIEWED:", u)
        sys.exit(f"{len(failures)} continuing titles, {len(unreviewed)} unreviewed boundaries")
    print(written, "evidence files")


# ── chapter PDF headings (26 Sep 2026) ────────────────────────────────────
# The 25 Sep check asked only "is the title somewhere on pages 1-2", which a
# cut-short title also passes ("Predicting What Comes Next: Exploring
# Sequences" is inside "... Sequences and Progressions"). title_heading()
# asks for the whole heading: a run of large-type lines on pages 1-2 that
# spells the title exactly (a leading "Chapter 8" / "11." is allowed).

HEADING_NUMBER = re.compile(r"^\s*(?:(?:chapter|unit|lesson|theme)\s+[0-9ivx]+|[0-9]{1,2}|[ivx]{1,4}\.)\s*[.:]?\s*", re.I)


def heading_blocks(doc, pages: int = 2) -> list[str]:
    """Runs of consecutive lines set in one of the three largest type sizes of
    their page (page 1, then page 2)."""
    out = []
    for pno in range(min(pages, doc.page_count)):
        ls = []
        for b in doc[pno].get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                txt = "".join(s["text"] for s in l["spans"]).strip()
                if txt:
                    ls.append((round(max(s["size"] for s in l["spans"])), txt))
        sizes = sorted({s for s, _ in ls}, reverse=True)[:3]
        cur, cur_size = [], None
        for s, t in ls:
            if s in sizes and (cur_size is None or abs(s - cur_size) <= 1):
                cur.append(t)
                cur_size = s
            else:
                if cur:
                    out.append(" ".join(cur))
                cur, cur_size = ([t], s) if s in sizes else ([], None)
        if cur:
            out.append(" ".join(cur))
    return out


def title_heading(doc, title: str) -> str:
    """'exact' = pages 1-2 print the whole title as a heading (1-3 adjacent
    large-type runs); 'contained' = the title's words are there but not as the
    whole heading; 'no' = not in the text layer (often an image heading)."""
    want = squash(title)
    blocks = heading_blocks(doc)
    for i in range(len(blocks)):
        for strip in (True, False):
            acc = ""
            for j in range(i, min(i + 3, len(blocks))):
                acc += squash(HEADING_NUMBER.sub("", blocks[j]) if strip and j == i else blocks[j])
                if acc == want:
                    return "exact"
                if not want.startswith(acc):
                    break
    first = "\n".join(doc[k].get_text() for k in range(min(2, doc.page_count)))
    return "contained" if want in squash(norm_text(first)) else "no"


def cmd_check_includes(args):
    """Download the chapter PDFs of every chapter that has `includes` (plus
    --also stems, e.g. chapters whose title was corrected) into
    <cache>/chapter-pdfs, and record in sources/ncert/chapter-checks-<day>.tsv:
    the chapter title's heading check, and for each include the PDF pages that
    carry it. Only facts go in the TSV (titles, page numbers, hashes)."""
    import fitz
    index, _ = load_index()
    titles = json.loads((OUT / "titles.json").read_text(encoding="utf-8"))["books"]
    cache = Path(args.cache) / CHAPTER_PDFS
    cache.mkdir(parents=True, exist_ok=True)
    counts = {c["code"]: c["count"] for c in primary_candidates(index)}
    also = {s.strip() for s in (args.also or "").split(",") if s.strip()}
    todo = []
    for code, entries in titles.items():
        seqs = chapter_seqs(code, counts[code])
        for i, e in enumerate(entries):
            stem = f"{code}{seqs[i]:02d}"
            if e.get("includes") or stem in also:
                todo.append((code, seqs[i], e, stem))

    def one(item):
        code, seq, e, stem = item
        pdf, meta_p = cache / f"{stem}.pdf", cache / f"{stem}.pdf.meta.json"
        if not (pdf.exists() and meta_p.exists()):
            url = f"{PDF_BASE}{stem}.pdf"
            status, headers, body = http(url)
            meta = {"url": url, "status": status, "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest() if body else "",
                    "lastModified": headers.get("Last-Modified", ""), "fetchedAt": now_ist()}
            if status == 200:
                pdf.write_bytes(body)
            meta_p.write_text(json.dumps(meta))
        meta = json.loads(meta_p.read_text())
        base = {"code": code, "pdfSeq": seq, "url": meta["url"], "status": meta["status"], "bytes": meta["bytes"],
                "sha256": meta["sha256"], "fetchedAt": meta["fetchedAt"]}
        if meta["status"] != 200:
            return [{**base, "item": "title", "text": e["title"], "result": f"http-{meta['status']}", "pages": ""}]
        doc = fitz.open(pdf)
        rows = [{**base, "item": "title", "text": e["title"], "result": title_heading(doc, e["title"]), "pages": ""}]
        texts = [squash(doc[k].get_text()) for k in range(doc.page_count)]
        for inc in e.get("includes", []):
            want = squash(inc["title"])
            pages = [k + 1 for k, t in enumerate(texts) if want and want in t]
            rows.append({**base, "item": "include", "text": inc["title"], "result": "found" if pages else "missing",
                         "pages": ",".join(map(str, pages))})
        return rows

    with cf.ThreadPoolExecutor(4) as ex:
        rows = [r for rs in ex.map(one, todo) for r in rs]
    day = dt.datetime.now(IST).date().isoformat()
    cols = ["code", "pdfSeq", "url", "status", "bytes", "sha256", "fetchedAt", "item", "text", "result", "pages"]
    write_tsv(SRC / f"chapter-checks-{day}.tsv", rows, cols,
              "chapter PDFs downloaded 26 Sep 2026 for chapters with includes (pieces printed inside the chapter PDF) and chapters whose title was corrected: "
              "item=title → result exact (pages 1-2 print the whole title as the heading) / contained (words present, not the whole heading) / no (image heading); "
              "item=include → the PDF pages whose text carries that piece's title")
    bad = [r for r in rows if r["result"] in ("missing",) or r["result"].startswith("http-")]
    print(len(todo), "chapters,", len(rows), "rows,", len(bad), "missing/failed")
    for r in bad:
        print("  ", r["code"], r["pdfSeq"], r["item"], r["text"], r["result"])


def cmd_check_pdfs(args):
    """HEAD every chapter PDF of every primary book; GET the first and last
    (and all of FULL_CHECK) and record whether the chapter's own title is on
    its first two pages. Only the title lines of chapters whose title comes
    from the chapter PDF are kept as text."""
    import fitz
    index, _ = load_index()
    titles = json.loads((OUT / "titles.json").read_text(encoding="utf-8"))["books"]
    cache = Path(args.cache) / "chapters"; cache.mkdir(parents=True, exist_ok=True)
    items = []
    for c in primary_candidates(index):
        seqs = chapter_seqs(c["code"], c["count"])
        for i, s in enumerate(seqs):
            dl = c["code"] in titles and (c["code"] in FULL_CHECK or i in (0, len(seqs) - 1)
                                          or (titles[c["code"]][i].get("source") == "chapter-pdf"))
            items.append((c["code"], i, s, dl))

    def one(item):
        code, idx, seq, dl = item
        url = f"{PDF_BASE}{code}{seq:02d}.pdf"
        cached = cache / f"{code}{seq:02d}.json"
        if cached.exists():
            return json.loads(cached.read_text(encoding="utf-8"))
        status, headers, body = http(url, "GET" if dl else "HEAD")
        r = {"code": code, "pdfSeq": seq, "url": url, "method": "GET" if dl else "HEAD", "status": status,
             "contentLength": headers.get("Content-Length", ""), "lastModified": headers.get("Last-Modified", ""),
             "checkedAt": now_ist(), "sha256": hashlib.sha256(body).hexdigest() if body else "", "titleOnFirstPages": ""}
        if body:
            doc = fitz.open(stream=body, filetype="pdf")
            first = "\n".join(doc[i].get_text() for i in range(min(2, doc.page_count)))
            if code in titles:
                e = titles[code][idx]
                # 26 Sep 2026: the whole heading, not a substring (a cut-short title passed the old check)
                r["titleOnFirstPages"] = {"exact": "yes", "contained": "contained", "no": "no"}[title_heading(doc, e["title"])]
                if e.get("source") == "chapter-pdf":
                    head = [l.strip() for l in first.split("\n") if l.strip()][:3]
                    (SRC / "chapter-title-lines" / f"{code}{seq:02d}.txt").write_text(
                        f"# first 3 text lines of {url} (fetched {r['checkedAt']}, sha256 {r['sha256']})\n" + "\n".join(head) + "\n",
                        encoding="utf-8")
        cached.write_text(json.dumps(r), encoding="utf-8")
        return r

    with cf.ThreadPoolExecutor(6) as ex:
        rows = list(ex.map(one, items))
    day = dt.datetime.now(IST).date().isoformat()
    cols = ["code", "pdfSeq", "url", "method", "status", "contentLength", "lastModified", "checkedAt", "sha256", "titleOnFirstPages"]
    write_tsv(SRC / f"chapter-pdfs-{day}.tsv", rows, cols,
              "every chapter PDF of every primary NCERT book: HEAD, or GET for first/last chapter (all chapters of Maths/Science 6-10); titleOnFirstPages = yes when PDF pages 1-2 print the chapter's whole title as the heading, contained when its words are there but not as the whole heading")
    print(len(rows), "chapters;", sum(1 for r in rows if int(r["status"]) != 200), "not 200")


# ── build (offline) ───────────────────────────────────────────────────────

def cmd_build(args):
    index, index_path = load_index()
    prelims = {r["code"]: r for r in read_tsv(sorted(SRC.glob("prelims-*.tsv"))[-1])}
    checks_path = sorted(SRC.glob("chapter-pdfs-*.tsv"))[-1]
    checks = {(r["code"], int(r["pdfSeq"])): r for r in read_tsv(checks_path)}
    titles = json.loads((OUT / "titles.json").read_text(encoding="utf-8"))["books"]
    src_meta = index_source(index_path)  # the whole page's sha256, also for the trimmed snapshot
    index_sha, fetched = src_meta["sha256"], src_meta["fetchedOn"]
    cands = {c["code"]: c for c in primary_candidates(index)}
    # 26 Sep 2026: heading checks of re-downloaded chapter PDFs supersede the
    # 25 Sep substring check for those chapters (their titles were corrected
    # or they carry includes)
    headings = {}
    for hp in sorted(SRC.glob("chapter-checks-*.tsv")):
        for r in read_tsv(hp):
            if r["item"] == "title":
                headings[(r["code"], int(r["pdfSeq"]))] = r["result"]

    def unresolved_reason(code: str) -> str:
        p = prelims[code]
        lat, dev, ara = float(p["script_latin"]), float(p["script_devanagari"]), float(p["script_arabic"])
        if lat + dev + ara == 0:
            return "no-text-layer: the prelims PDF has no extractable text (scanned pages)"
        if dev >= 0.5:
            return "devanagari-unverified: the PDF text layer drops or reorders conjuncts/matras (e.g. पुषप for पुष्प), so titles cannot be taken verbatim; needs a human check against the PDF"
        if ara >= 0.5:
            return "urdu-script-unverified: Urdu text layer not verified against the rendered page; needs a human check"
        if cands[code]["subject"] in LANGUAGE_SUBJECT or cands[code]["lang"] in ("hi", "ur", "sa"):
            return "legacy-font: the PDF uses a non-Unicode Indic font, so the text layer is Latin gibberish; titles need a human reading of the PDF"
        return "contents-not-parsed: no verifiable contents text"

    files = {}
    for cl, subs in sorted(index.items()):
        if cl > 13:
            continue
        subjects = []
        for subj, bks in subs:
            parsed = []
            for b in bks:
                code, count = parse_value(b["value"])
                parsed.append({"title": b["title"], "value": b["value"], "code": code, "count": count})
            primary = [p for p in parsed if p["code"] in cands and cands[p["code"]]["class"] == cl]
            # demote an 'English' book whose own text is not Latin script (lehh1/lehh2 are Hindi Home Science)
            demoted = [p for p in primary if subj not in LANGUAGE_SUBJECT and cands[p["code"]]["lang"] == "en"
                       and float(prelims[p["code"]]["script_devanagari"]) >= 0.5]
            primary = [p for p in primary if p not in demoted]
            books = []
            linked = set()
            for p in primary:
                code = p["code"]
                seqs = chapter_seqs(code, p["count"])
                pre = prelims[code]
                lang = LANGUAGE_SUBJECT.get(subj) or cands[code]["lang"] or "und"
                book = {
                    "code": code, "title": p["title"], "language": lang, "indexValue": p["value"],
                    "bookUrl": f"https://ncert.nic.in/{p['value']}", "indexChapterCount": p["count"],
                    "listedChapterCount": len(seqs), "zipUrl": f"{PDF_BASE}{code}dd.zip",
                    "prelims": {"url": pre["url"], "sha256": pre["sha256"], "fetchedAt": pre["fetchedAt"],
                                "printedSession": pre["printedSession"] or None, "firstEdition": pre.get("firstEdition") or None,
                                "contentsSnapshot": f"data/curriculum/sources/ncert/contents/{code}.txt"},
                    "chapters": [], "unresolved": [], "editions": [],
                }
                cur = titles.get(code)
                if cur is not None and len(cur) != len(seqs):
                    sys.exit(f"{code}: titles.json has {len(cur)} entries, NCERT lists {len(seqs)}")
                for i, s in enumerate(seqs):
                    url = f"{PDF_BASE}{code}{s:02d}.pdf"
                    chk = checks.get((code, s))
                    status = int(chk["status"]) if chk else 0
                    base = {"seq": i + 1, "pdfSeq": s, "pdfUrl": url}
                    if cur is None:
                        why = unresolved_reason(code)
                        if status != 200:
                            why += f"; the chapter PDF also returned HTTP {status or 'unchecked'} on {checks_path.stem[-10:]}"
                        book["unresolved"].append({**base, "reason": why})
                        continue
                    e = cur[i]
                    ch = {**base, "number": e.get("n"), "kind": e["kind"], "title": e["title"]}
                    for k in ("subtitle", "section"):
                        if e.get(k):
                            ch[k] = e[k]
                    if e.get("includes"):
                        ch["includes"] = [{k: x[k] for k in ("kind", "n", "title", "page") if x.get(k)} for x in e["includes"]]
                    ch["titleSource"] = e.get("source", "contents")
                    if (code, s) in headings:
                        ch["titleHeading"] = headings[(code, s)]
                    elif chk and chk.get("titleOnFirstPages"):
                        ch["titleOnFirstPages"] = chk["titleOnFirstPages"] == "yes"
                    if status != 200:
                        book["unresolved"].append({**base, "number": e.get("n"), "titleCandidate": e["title"],
                                                   "reason": f"pdf-http-{status or 'unchecked'}: chapter PDF did not return 200 on {checks_path.stem[-10:]}"})
                    else:
                        book["chapters"].append(ch)
                # editions: same class letter, code ends with this book's stem
                stem = code[2:]
                for q in parsed:
                    if not q["code"] or q["code"] == code or q in primary:
                        continue
                    if q["code"][0] == code[0] and q["code"].endswith(stem) and 1 <= len(q["code"]) - len(stem) - 1 <= 3:
                        ql = title_language(q["title"]) or code_language(q["code"])[0]
                        book["editions"].append({"code": q["code"], "title": q["title"], "language": ql or "und",
                                                 "languageFrom": "title" if title_language(q["title"]) else "code",
                                                 "chapterCount": q["count"], "bookUrl": f"https://ncert.nic.in/{q['value']}"})
                        linked.add(q["code"])
                books.append(book)
            unlinked = []
            not_yet = []
            for q in parsed:
                if not q["code"]:
                    not_yet.append({"title": q["title"], "indexValue": q["value"]})
                    continue
                if q["code"] in linked or q in primary:
                    continue
                ql = "hi" if q in demoted else (title_language(q["title"]) or code_language(q["code"])[0])
                unlinked.append({"code": q["code"], "title": q["title"], "language": ql or "und", "chapterCount": q["count"],
                                 "bookUrl": f"https://ncert.nic.in/{q['value']}",
                                 "note": "Devanagari text: Hindi-medium book, not matched to an English book by NCERT code" if q in demoted
                                 else "no English-medium book in this subject shares its NCERT code stem"})
            subjects.append({"name": subj, "code": subject_code(subj), "books": books,
                             **({"unlinkedEditions": unlinked} if unlinked else {}),
                             **({"notYetPublished": not_yet} if not_yet else {})})
        label = "Class XI & XII Combined" if cl == 13 else f"Class {ROMAN[cl]}"
        doc = {
            "curriculum": "NCERT", "indexClassValue": cl, "classes": [11, 12] if cl == 13 else [cl], "classLabel": label,
            "source": {"indexUrl": INDEX_URL, "snapshot": f"data/curriculum/sources/ncert/{index_path.name}",
                       "snapshotSha256": index_sha, "fetchedOn": fetched},
            "subjects": subjects,
        }
        allb = [b for s in subjects for b in s["books"]]
        doc["counts"] = {"subjects": len(subjects), "books": len(allb),
                         "chapters": sum(len(b["chapters"]) for b in allb),
                         "unresolvedChapters": sum(len(b["unresolved"]) for b in allb),
                         "editions": sum(len(b["editions"]) for b in allb) + sum(len(s.get("unlinkedEditions", [])) for s in subjects)}
        name = "class-11-12-combined.json" if cl == 13 else f"class-{cl:02d}.json"
        files[name] = doc
    for name, doc in files.items():
        (OUT / name).write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
        c = doc["counts"]
        print(f"{name}: {c['subjects']} subjects, {c['books']} books, {c['chapters']} chapters, {c['unresolvedChapters']} unresolved, {c['editions']} other-language editions")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    sp.add_parser("fetch-index")
    sp.add_parser("trim-index")
    for name in ("fetch-prelims", "extract-contents", "check-pdfs", "check-includes", "trim-contents"):
        p = sp.add_parser(name)
        p.add_argument("--cache", required=True, help="directory for raw PDFs and full contents text (not committed)")
        if name == "check-includes":
            p.add_argument("--also", help="extra chapter PDF stems to check, comma-separated (e.g. iemh108,kesp101)")
    sp.add_parser("build")
    args = ap.parse_args()
    {"fetch-index": cmd_fetch_index, "trim-index": cmd_trim_index, "fetch-prelims": cmd_fetch_prelims,
     "extract-contents": cmd_extract_contents, "check-pdfs": cmd_check_pdfs, "check-includes": cmd_check_includes,
     "trim-contents": cmd_trim_contents, "build": cmd_build}[args.cmd](args)


if __name__ == "__main__":
    main()
