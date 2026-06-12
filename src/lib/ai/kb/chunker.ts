// Markdown-aware chunker for knowledge ingestion.
//
// Strategy: split on headings so each chunk stays semantically coherent and
// carries its heading breadcrumb (great for both retrieval and display).
// Oversized sections are split on paragraph boundaries with overlap so a
// fact straddling a boundary still lands fully inside at least one chunk.

export interface Chunk {
  seq: number;
  heading: string | null;
  text: string;
  tokenEst: number;
}

/** ~4 chars per token is a good-enough estimate for chunk budgeting. */
function estimateTokens(s: string): number {
  return Math.ceil(s.length / 4);
}

const MAX_TOKENS = 700; // target chunk size
const OVERLAP_TOKENS = 80; // carried between splits of an oversized section

export function chunkMarkdown(doc: string): Chunk[] {
  const lines = doc.split(/\r?\n/);

  // Pass 1: group lines into sections under their heading breadcrumb.
  interface Section {
    breadcrumb: string[];
    lines: string[];
  }
  const sections: Section[] = [];
  let crumb: string[] = [];
  let current: Section = { breadcrumb: [], lines: [] };

  const flush = () => {
    if (current.lines.some((l) => l.trim().length > 0)) sections.push(current);
  };

  for (const line of lines) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) {
      flush();
      const depth = m[1].length;
      crumb = [...crumb.slice(0, depth - 1), m[2].trim()];
      current = { breadcrumb: [...crumb], lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  flush();

  // Pass 2: emit chunks, splitting oversized sections on paragraphs.
  const chunks: Chunk[] = [];
  let seq = 0;
  for (const s of sections) {
    const heading = s.breadcrumb.length ? s.breadcrumb.join(" > ") : null;
    const body = s.lines.join("\n").trim();
    if (!body) continue;

    if (estimateTokens(body) <= MAX_TOKENS) {
      chunks.push({ seq: seq++, heading, text: body, tokenEst: estimateTokens(body) });
      continue;
    }

    const paras = body.split(/\n\s*\n/);
    let buf: string[] = [];
    let bufTokens = 0;
    const emit = () => {
      if (!buf.length) return;
      const text = buf.join("\n\n").trim();
      if (text) chunks.push({ seq: seq++, heading, text, tokenEst: estimateTokens(text) });
    };
    for (const p of paras) {
      const t = estimateTokens(p);
      if (bufTokens + t > MAX_TOKENS && buf.length) {
        emit();
        // overlap: keep the tail paragraph(s) up to OVERLAP_TOKENS
        const tail: string[] = [];
        let tailTokens = 0;
        for (let i = buf.length - 1; i >= 0 && tailTokens < OVERLAP_TOKENS; i--) {
          tail.unshift(buf[i]);
          tailTokens += estimateTokens(buf[i]);
        }
        buf = tail;
        bufTokens = tailTokens;
      }
      buf.push(p);
      bufTokens += t;
    }
    emit();
  }
  return chunks;
}
