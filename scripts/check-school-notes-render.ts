// scripts/check-school-notes-render.ts — every stored school chapter note,
// rendered the way the chapter page renders it, checked for raw markdown
// (3 Oct 2026, school chapter notes).
//
// Why: the chapter page rendered its notes with NotesMarkdown's plain branch,
// so "### Example 1 …", "---" rules and pipe rows printed as text on live
// pages (a Class 12 "Current Electricity" note among them). The page now
// passes `rich demoteH1`. This reads every chapter note the page can show —
// the same rows getSchoolChapterDetail reads (src/lib/school/db.ts: a
// top-level topic under a school container, a note long enough to use), the
// same preparation (prepareSchoolNotes) — renders it BEFORE (the plain
// branch) and AFTER (rich, demoteH1), and counts the notes whose rendered
// text still holds a heading mark, a rule, "**" or a pipe-table row
// (src/lib/notes-raw-check.ts), plus any <h1> (the page has its own).
//
// Read-only: SELECT only, no writes, no AI, nothing printed from the env.
// Exit code 1 when any note still shows raw markdown AFTER, so it can be run
// before a release.
//
//   npx tsx --env-file=.env.local scripts/check-school-notes-render.ts [--list]
//   --list   print each chapter with leftovers (code and the first line found)

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { prisma } from "../src/lib/db/prisma";
import { NotesMarkdown } from "../src/components/NotesMarkdown";
import { rawMarkdownLeft, type RawMarkdownKind } from "../src/lib/notes-raw-check";
import { prepareSchoolNotes } from "../src/lib/school/notes";
import { SCHOOL_CONTAINER_WHERE } from "../src/lib/school/scope";
import { hasUsableNotes } from "../src/lib/topic-notes";

const LIST = process.argv.includes("--list");
const KINDS: RawMarkdownKind[] = ["heading", "rule", "bold", "pipe-row"];

interface Tally {
  notes: number;
  byKind: Record<RawMarkdownKind, number>;
  h1: number;
  codes: string[];
}

function emptyTally(): Tally {
  return { notes: 0, byKind: { heading: 0, rule: 0, bold: 0, "pipe-row": 0 }, h1: 0, codes: [] };
}

function count(t: Tally, code: string, html: string): { line: string } | null {
  const hits = rawMarkdownLeft(html);
  const h1 = /<h1[\s>]/.test(html);
  if (hits.length === 0 && !h1) return null;
  t.notes++;
  t.codes.push(code);
  if (h1) t.h1++;
  for (const k of KINDS) if (hits.some((h) => h.kind === k)) t.byKind[k]++;
  return { line: hits[0] ? `${hits[0].kind}: ${hits[0].line}` : "<h1>" };
}

async function main() {
  const topics = await prisma.topic.findMany({
    where: { parentId: null, teachingNote: { isNot: null }, subject: { exam: SCHOOL_CONTAINER_WHERE } },
    select: { code: true, subject: { select: { exam: { select: { code: true } } } }, teachingNote: { select: { content: true } } },
    orderBy: [{ code: "asc" }],
  });
  const before = emptyTally();
  const after = emptyTally();
  let checked = 0;
  const lines: string[] = [];
  for (const t of topics) {
    const content = t.teachingNote?.content;
    if (!hasUsableNotes(content)) continue;
    const notes = prepareSchoolNotes(content);
    if (!notes) continue;
    checked++;
    const code = `${t.subject.exam.code} ${t.code}`;
    const plain = renderToStaticMarkup(React.createElement(NotesMarkdown, { markdown: notes.markdown }));
    const rich = renderToStaticMarkup(React.createElement(NotesMarkdown, { markdown: notes.markdown, rich: true, demoteH1: true }));
    count(before, code, plain);
    const left = count(after, code, rich);
    if (left && LIST) lines.push(`  AFTER ${code} — ${left.line}`);
  }
  const fmt = (t: Tally) => `${t.notes} notes (heading ${t.byKind.heading}, rule ${t.byKind.rule}, ** ${t.byKind.bold}, pipe row ${t.byKind["pipe-row"]}, <h1> ${t.h1})`;
  console.log(`School chapter notes checked: ${checked}`);
  console.log(`BEFORE (plain renderer) with raw markdown: ${fmt(before)}`);
  console.log(`AFTER  (rich, demoteH1) with raw markdown: ${fmt(after)}`);
  if (LIST) for (const l of lines) console.log(l);
  if (after.notes > 0) {
    console.log(`AFTER leftovers: ${after.codes.slice(0, 20).join(", ")}${after.codes.length > 20 ? " …" : ""}`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 2;
  })
  .finally(() => prisma.$disconnect());
