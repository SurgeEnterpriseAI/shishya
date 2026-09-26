// Minimal markdown renderer for AI-generated study notes (headings,
// bullets, paragraphs — the only constructs the note generator emits).
// Shared by the English topic page and its Hindi twin (/topics/[code]/hi).
//
// 26 Sep 2026 (discoverability wave 2 G3): two OPTIONAL props, default
// behaviour unchanged for every existing caller. `rich` renders the full
// note shape — tables, ordered lists, ### headings, *italic*, `code`, rules,
// fences — through src/lib/notes-markdown.ts (every piece of text escaped,
// no raw HTML from the note); `demoteH1` renders "# " as <h2> so the page
// keeps its one <h1>. The English topic page uses both.

import React from "react";
import { notesMarkdownHtml } from "@/lib/notes-markdown";

// Render **bold** spans inside a line (the only inline construct the
// generators emit besides plain text). Exported for pages that render
// generator bullets outside the full NotesMarkdown flow (e.g. the
// category-cutoff guidance notes).
export function inlineMd(s: string): React.ReactNode {
  const parts = s.split(/\*\*([^*]+)\*\*/g);
  if (parts.length === 1) return s;
  return parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p));
}

export function NotesMarkdown({
  markdown,
  rich = false,
  demoteH1 = false,
}: {
  markdown: string;
  /** Full note shape via src/lib/notes-markdown.ts (26 Sep 2026). */
  rich?: boolean;
  /** "# " headings render as <h2> (26 Sep 2026). */
  demoteH1?: boolean;
}) {
  if (rich) {
    // One escaped HTML string (src/lib/notes-markdown.ts): nothing from the
    // note reaches the page as markup. `contents` keeps the prose styles
    // applying to the headings, lists and tables as direct children.
    return <div className="contents" dangerouslySetInnerHTML={{ __html: notesMarkdownHtml(markdown, { demoteH1 }) }} />;
  }
  const lines = markdown.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let buf: string[] = [];
  let inList = false;
  let listBuf: React.ReactNode[] = [];
  const flushPara = () => {
    if (buf.length === 0) return;
    out.push(<p key={`p-${out.length}`}>{inlineMd(buf.join(" "))}</p>);
    buf = [];
  };
  const flushList = () => {
    if (!inList) return;
    out.push(
      <ul key={`ul-${out.length}`} className="list-disc pl-5">
        {listBuf}
      </ul>,
    );
    listBuf = [];
    inList = false;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    if (line.startsWith("## ")) {
      flushPara();
      flushList();
      out.push(<h2 key={`h2-${out.length}`}>{line.slice(3)}</h2>);
      continue;
    }
    if (line.startsWith("# ")) {
      flushPara();
      flushList();
      out.push(
        demoteH1 ? <h2 key={`h1-${out.length}`}>{line.slice(2)}</h2> : <h1 key={`h1-${out.length}`}>{line.slice(2)}</h1>,
      );
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      inList = true;
      listBuf.push(<li key={`li-${listBuf.length}`}>{inlineMd(line.replace(/^[-*]\s+/, ""))}</li>);
      continue;
    }
    flushList();
    buf.push(line);
  }
  flushPara();
  flushList();
  return <>{out}</>;
}
