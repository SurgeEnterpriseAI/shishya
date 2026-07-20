// Minimal markdown renderer for AI-generated study notes (headings,
// bullets, paragraphs — the only constructs the note generator emits).
// Shared by the English topic page and its Hindi twin (/topics/[code]/hi).

import React from "react";

export function NotesMarkdown({ markdown }: { markdown: string }) {
  const lines = markdown.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let buf: string[] = [];
  let inList = false;
  let listBuf: React.ReactNode[] = [];
  const flushPara = () => {
    if (buf.length === 0) return;
    out.push(<p key={`p-${out.length}`}>{buf.join(" ")}</p>);
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
      out.push(<h1 key={`h1-${out.length}`}>{line.slice(2)}</h1>);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      inList = true;
      listBuf.push(<li key={`li-${listBuf.length}`}>{line.replace(/^[-*]\s+/, "")}</li>);
      continue;
    }
    flushList();
    buf.push(line);
  }
  flushPara();
  flushList();
  return <>{out}</>;
}
