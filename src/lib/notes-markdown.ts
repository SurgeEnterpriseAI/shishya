// Study-notes markdown → escaped HTML (26 Sep 2026, discoverability wave 2 G3).
//
// Why: the topic page rendered its notes with a 30-line local renderer that
// knew "## ", "# " and "- " only. The prod read the same day (4,469 notes):
// every note opens with a "# " heading (a second <h1> on every notes page),
// 3,280 carry a GFM table, 2,312 an ordered list, 1,437 "### " headings, 2,963
// *italic* spans and 2,566 "---" rules — all printed as raw text, "**" and
// "|---|" included. Google reads that as a thin, broken page.
//
// This renders the constructs the note generator actually emits: headings
// (#–######; "# " demoted to <h2> on request so the page keeps ONE <h1>),
// paragraphs, - / * / + and 1. / 1) lists (one nested level, items separated
// by blank lines stay one list), GFM tables (wrapped so a phone scrolls the
// table, never the page), --- rules, ``` fences, > quotes, **bold** /
// __bold__, *italic* / _italic_, `code` and [text](https://…) links. Every
// piece of text is HTML-escaped and no markup from the note passes through:
// "<script>" in a note prints as text. Pure — no DOM, no React
// (tests/unit/topic-notes-render.test.ts). src/components/NotesMarkdown.tsx
// uses it behind its optional `rich` prop.

export interface NotesHtmlOptions {
  /** Render "# " headings as <h2> (the page already has its <h1>). */
  demoteH1?: boolean;
}

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function escapeHtml(s: string): string {
  return (s ?? "").replace(/[&<>"']/g, (c) => ESC[c] ?? c);
}

const isWordChar = (c: string | undefined) => !!c && /[\p{L}\p{N}_]/u.test(c);

/** Inline markdown → escaped HTML. */
export function inlineHtml(s: string): string {
  let out = "";
  let i = 0;
  const text = s ?? "";
  while (i < text.length) {
    const c = text[i];
    // `code`
    if (c === "`") {
      const j = text.indexOf("`", i + 1);
      if (j > i + 1) {
        out += `<code>${escapeHtml(text.slice(i + 1, j))}</code>`;
        i = j + 1;
        continue;
      }
    }
    // **bold** / __bold__
    if ((c === "*" || c === "_") && text[i + 1] === c) {
      const mark = c + c;
      const j = text.indexOf(mark, i + 2);
      const opensOk = c === "*" || !isWordChar(text[i - 1]);
      if (opensOk && j > i + 2 && text[i + 2] !== " " && text[j - 1] !== " ") {
        out += `<strong>${inlineHtml(text.slice(i + 2, j))}</strong>`;
        i = j + 2;
        continue;
      }
    }
    // *italic* / _italic_ — the opener is followed and the closer preceded by
    // a non-space, so "2 * 3 * 4" stays arithmetic; "_" only at word edges,
    // so snake_case_words stay whole.
    if ((c === "*" || c === "_") && text[i + 1] !== c && text[i + 1] !== undefined && text[i + 1] !== " ") {
      const opensOk = c === "*" || !isWordChar(text[i - 1]);
      if (opensOk) {
        let j = i + 1;
        let found = -1;
        while ((j = text.indexOf(c, j)) !== -1) {
          const closeOk = text[j - 1] !== " " && text[j + 1] !== c && (c === "*" || !isWordChar(text[j + 1]));
          if (closeOk && j > i + 1) {
            found = j;
            break;
          }
          j += 1;
        }
        if (found !== -1) {
          out += `<em>${inlineHtml(text.slice(i + 1, found))}</em>`;
          i = found + 1;
          continue;
        }
      }
    }
    // [text](https://…) — a link only for an absolute http(s) URL.
    if (c === "[") {
      const m = /^\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/.exec(text.slice(i));
      if (m) {
        out += `<a href="${escapeHtml(m[2])}" rel="nofollow noopener" target="_blank">${inlineHtml(m[1])}</a>`;
        i += m[0].length;
        continue;
      }
    }
    out += escapeHtml(c);
    i += 1;
  }
  return out;
}

const HEADING_RE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR_RE = /^(?:-{3,}|\*{3,}|_{3,})\s*$/;
const FENCE_RE = /^(```|~~~)/;
const OL_RE = /^(\s*)(\d{1,3})[.)]\s+(.*)$/;
const UL_RE = /^(\s*)[-*+]\s+(.*)$/;
const TABLE_SEP_RE = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

function splitCells(line: string): string[] {
  let l = line.trim();
  if (l.startsWith("|")) l = l.slice(1);
  if (l.endsWith("|") && !l.endsWith("\\|")) l = l.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  for (let i = 0; i < l.length; i++) {
    if (l[i] === "\\" && l[i + 1] === "|") {
      cur += "|";
      i += 1;
    } else if (l[i] === "|") {
      cells.push(cur.trim());
      cur = "";
    } else cur += l[i];
  }
  cells.push(cur.trim());
  return cells;
}

function alignOf(sep: string): string {
  const s = sep.trim();
  if (s.startsWith(":") && s.endsWith(":")) return "center";
  if (s.endsWith(":")) return "right";
  return "";
}

interface ListItem {
  text: string[];
  children: { ordered: boolean; start: number; items: string[] } | null;
}

function listHtml(ordered: boolean, start: number, items: ListItem[]): string {
  const tag = ordered ? "ol" : "ul";
  const startAttr = ordered && start !== 1 ? ` start="${start}"` : "";
  const lis = items
    .map((it) => {
      const kids = it.children
        ? `<${it.children.ordered ? "ol" : "ul"}>${it.children.items.map((t) => `<li>${inlineHtml(t)}</li>`).join("")}</${it.children.ordered ? "ol" : "ul"}>`
        : "";
      return `<li>${inlineHtml(it.text.join(" "))}${kids}</li>`;
    })
    .join("");
  return `<${tag}${startAttr}>${lis}</${tag}>`;
}

/** Study-notes markdown → escaped HTML (see the header). */
export function notesMarkdownHtml(markdown: string, opts: NotesHtmlOptions = {}): string {
  const lines = (markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) out.push(`<p>${inlineHtml(para.join(" "))}</p>`);
    para = [];
  };
  let i = 0;
  const nextNonBlank = (from: number) => {
    let k = from;
    while (k < lines.length && !lines[k].trim()) k++;
    return k;
  };
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) {
      flushPara();
      i++;
      continue;
    }
    // Fenced code: everything up to the closing fence, verbatim (escaped).
    if (FENCE_RE.test(line)) {
      flushPara();
      const fence = line.slice(0, 3);
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) body.push(lines[i++]);
      i++; // the closing fence (or the end)
      out.push(`<pre><code>${escapeHtml(body.join("\n"))}</code></pre>`);
      continue;
    }
    const h = HEADING_RE.exec(line);
    if (h) {
      flushPara();
      let level = h[1].length;
      if (level === 1 && opts.demoteH1) level = 2;
      out.push(`<h${level}>${inlineHtml(h[2])}</h${level}>`);
      i++;
      continue;
    }
    if (HR_RE.test(line)) {
      flushPara();
      out.push("<hr>");
      i++;
      continue;
    }
    // GFM table: a pipe row followed by a separator row.
    if (line.includes("|") && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1].trim())) {
      flushPara();
      const head = splitCells(line);
      const aligns = splitCells(lines[i + 1]).map(alignOf);
      i += 2;
      const body: string[][] = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) body.push(splitCells(lines[i++]));
      const cell = (tag: "th" | "td", text: string, k: number) =>
        `<${tag}${aligns[k] ? ` style="text-align:${aligns[k]}"` : ""}>${inlineHtml(text)}</${tag}>`;
      const thead = `<thead><tr>${head.map((c, k) => cell("th", c, k)).join("")}</tr></thead>`;
      const tbody = `<tbody>${body
        .map((r) => `<tr>${head.map((_, k) => cell("td", r[k] ?? "", k)).join("")}</tr>`)
        .join("")}</tbody>`;
      out.push(`<div class="overflow-x-auto"><table>${thead}${tbody}</table></div>`);
      continue;
    }
    if (line.startsWith(">")) {
      flushPara();
      const q: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) q.push(lines[i++].trim().replace(/^>\s?/, ""));
      out.push(`<blockquote><p>${inlineHtml(q.join(" "))}</p></blockquote>`);
      continue;
    }
    const ol = OL_RE.exec(raw);
    const ul = ol ? null : UL_RE.exec(raw);
    if (ol || ul) {
      flushPara();
      const ordered = !!ol;
      const start = ol ? Number(ol[2]) : 1;
      const baseIndent = (ol ? ol[1] : ul![1]).length;
      const items: ListItem[] = [];
      while (i < lines.length) {
        const r = lines[i];
        const t = r.trim();
        if (!t) {
          // A blank line ends the list unless the next line carries it on
          // (items spaced apart, or a nested item).
          const k = nextNonBlank(i);
          const nr = lines[k] ?? "";
          const nextOl = OL_RE.exec(nr);
          const nextUl = nextOl ? null : UL_RE.exec(nr);
          const nextIndent = (nextOl?.[1] ?? nextUl?.[1] ?? "").length;
          const sameKind = ordered ? !!nextOl : !!nextUl;
          if (k < lines.length && ((sameKind && nextIndent <= baseIndent) || ((nextOl || nextUl) && nextIndent > baseIndent))) {
            i = k;
            continue;
          }
          break;
        }
        const mo = OL_RE.exec(r);
        const mu = mo ? null : UL_RE.exec(r);
        const indent = (mo?.[1] ?? mu?.[1] ?? "").length;
        if ((mo || mu) && indent > baseIndent && items.length) {
          // One nested level; deeper levels flatten into it.
          const last = items[items.length - 1];
          if (!last.children) last.children = { ordered: !!mo, start: mo ? Number(mo[2]) : 1, items: [] };
          last.children.items.push(mo ? mo[3] : mu![2]);
          i++;
          continue;
        }
        if ((ordered && mo) || (!ordered && mu)) {
          items.push({ text: [mo ? mo[3] : mu![2]], children: null });
          i++;
          continue;
        }
        if (mo || mu || HEADING_RE.test(t) || HR_RE.test(t) || FENCE_RE.test(t) || t.startsWith(">") || t.startsWith("|")) break;
        // A continuation line belongs to the item above it.
        if (items.length) items[items.length - 1].text.push(t);
        i++;
      }
      out.push(listHtml(ordered, start, items));
      continue;
    }
    para.push(line);
    i++;
  }
  flushPara();
  return out.join("\n");
}
