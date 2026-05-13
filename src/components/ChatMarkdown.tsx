"use client";

// Tiny safe markdown renderer for chat / tutor output.
//
// The AI tutor produces markdown (**bold**, ## headings, - bullets,
// `code`, [links](url), 1. numbered) which the original chat UI was
// rendering verbatim — so students saw raw symbols like ** and ## in
// every reply. This renderer parses the common subset cleanly and
// escapes everything else, so we don't need a heavy markdown library
// in the chat bundle.
//
// Supports:
//   #, ##, ### headings
//   - or * bulleted lists
//   1. 2. numbered lists
//   **bold**  *italic*  `inline code`
//   [link text](https://...)
//   blank-line-separated paragraphs
//
// Anything else (e.g. tables, images, html) is rendered as plain text.

import React from "react";

interface ChatMarkdownProps {
  text: string;
}

export function ChatMarkdown({ text }: ChatMarkdownProps) {
  const blocks = parseBlocks(text);
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => renderBlock(b, i))}
    </div>
  );
}

// ─── Block parser ────────────────────────────────────────────────────

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "p"; text: string };

function parseBlocks(src: string): Block[] {
  const lines = src.split(/\r?\n/);
  const out: Block[] = [];
  let paraBuf: string[] = [];
  let ulBuf: string[] = [];
  let olBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length === 0) return;
    out.push({ kind: "p", text: paraBuf.join(" ") });
    paraBuf = [];
  };
  const flushUl = () => {
    if (ulBuf.length === 0) return;
    out.push({ kind: "ul", items: ulBuf });
    ulBuf = [];
  };
  const flushOl = () => {
    if (olBuf.length === 0) return;
    out.push({ kind: "ol", items: olBuf });
    olBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushUl();
      flushOl();
      continue;
    }
    if (/^###\s+/.test(line)) {
      flushPara(); flushUl(); flushOl();
      out.push({ kind: "heading", level: 3, text: line.replace(/^###\s+/, "") });
      continue;
    }
    if (/^##\s+/.test(line)) {
      flushPara(); flushUl(); flushOl();
      out.push({ kind: "heading", level: 2, text: line.replace(/^##\s+/, "") });
      continue;
    }
    if (/^#\s+/.test(line)) {
      flushPara(); flushUl(); flushOl();
      out.push({ kind: "heading", level: 1, text: line.replace(/^#\s+/, "") });
      continue;
    }
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      flushPara(); flushOl();
      ulBuf.push(ulMatch[1]);
      continue;
    }
    const olMatch = line.match(/^\d+[.)]\s+(.*)$/);
    if (olMatch) {
      flushPara(); flushUl();
      olBuf.push(olMatch[1]);
      continue;
    }
    flushUl(); flushOl();
    paraBuf.push(line);
  }
  flushPara(); flushUl(); flushOl();
  return out;
}

function renderBlock(b: Block, key: number): React.ReactNode {
  switch (b.kind) {
    case "heading": {
      const cls = b.level === 1
        ? "text-base font-semibold text-ink-900"
        : b.level === 2
        ? "text-sm font-semibold text-ink-900"
        : "text-sm font-medium text-ink-900";
      const Tag = (`h${b.level + 2}`) as "h3" | "h4" | "h5";
      return <Tag key={key} className={cls}>{renderInline(b.text)}</Tag>;
    }
    case "ul":
      return (
        <ul key={key} className="ml-5 list-disc space-y-1">
          {b.items.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="ml-5 list-decimal space-y-1">
          {b.items.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ol>
      );
    case "p":
      return <p key={key}>{renderInline(b.text)}</p>;
  }
}

// ─── Inline parser ───────────────────────────────────────────────────
// Handles **bold**, *italic*, `code`, [text](url). We tokenise rather
// than regex-replace so nested markers don't trip us up.

interface InlineToken {
  type: "text" | "bold" | "italic" | "code" | "link";
  text: string;
  href?: string;
}

function tokeniseInline(src: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let i = 0;
  let buf = "";
  const flush = () => {
    if (buf) {
      tokens.push({ type: "text", text: buf });
      buf = "";
    }
  };
  while (i < src.length) {
    const ch = src[i];

    // [text](url)
    if (ch === "[") {
      const close = src.indexOf("](", i + 1);
      const end = close > -1 ? src.indexOf(")", close + 2) : -1;
      if (close > -1 && end > -1) {
        const t = src.slice(i + 1, close);
        const href = src.slice(close + 2, end);
        // Only allow http(s) hrefs.
        if (/^https?:\/\//i.test(href)) {
          flush();
          tokens.push({ type: "link", text: t, href });
          i = end + 1;
          continue;
        }
      }
    }

    // **bold**
    if (ch === "*" && src[i + 1] === "*") {
      const close = src.indexOf("**", i + 2);
      if (close > -1) {
        flush();
        tokens.push({ type: "bold", text: src.slice(i + 2, close) });
        i = close + 2;
        continue;
      }
    }

    // *italic*  (but only if not a bullet — we're past block parsing)
    if (ch === "*" && src[i + 1] !== "*") {
      const close = src.indexOf("*", i + 1);
      if (close > -1 && close > i + 1) {
        flush();
        tokens.push({ type: "italic", text: src.slice(i + 1, close) });
        i = close + 1;
        continue;
      }
    }

    // `inline code`
    if (ch === "`") {
      const close = src.indexOf("`", i + 1);
      if (close > -1) {
        flush();
        tokens.push({ type: "code", text: src.slice(i + 1, close) });
        i = close + 1;
        continue;
      }
    }

    buf += ch;
    i += 1;
  }
  flush();
  return tokens;
}

function renderInline(src: string): React.ReactNode {
  const tokens = tokeniseInline(src);
  return tokens.map((t, i) => {
    switch (t.type) {
      case "bold":
        return <strong key={i}>{t.text}</strong>;
      case "italic":
        return <em key={i}>{t.text}</em>;
      case "code":
        return (
          <code key={i} className="rounded bg-ink-200/70 px-1 py-px font-mono text-[0.85em]">
            {t.text}
          </code>
        );
      case "link":
        return (
          <a
            key={i}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-saffron-700 underline hover:text-saffron-800"
          >
            {t.text}
          </a>
        );
      case "text":
      default:
        return <span key={i}>{t.text}</span>;
    }
  });
}
