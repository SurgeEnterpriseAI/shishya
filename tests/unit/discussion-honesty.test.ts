// Discussions: nothing Shishya wrote is listed, served or counted as a
// student's (3 Oct 2026, crawl-audit fix C1).
//
// Every thread stored before 3 Oct 2026 was written by Shishya: 34 threads
// from the seed/discussions*.ts scripts (7-9 May 2026, invented names, every
// reply invented — marked isSeed = TRUE that day by
// scripts/mark-seeded-discussions.ts) and 8 "starter questions" of the
// refresh-discussions cron. 0 students had posted. The rule lives in
// src/lib/discussion-visibility.ts:
//   • a STUDENT thread = a signed-in account started it and it is not a seed;
//   • a thread page / thread API returns a student thread or a study room;
//   • every list and count reads STUDENT_THREAD_WHERE.
// What this pins:
//   1. the rule itself;
//   2. the rendered /discussions list (transpiled with TypeScript and rendered
//      with renderToStaticMarkup, the database, auth and language stubbed —
//      the pattern of tests/unit/paths-views.test.ts): it asks only for
//      student threads, honours ?examCode=, counts student replies, and with
//      no student thread prints no thread link, a plain H1, no
//      CollectionPage, and a noindex head;
//   3. source guards: the list, the three API routes and HomeDiscussions read
//      the rule; the list has no seed chip or seed author branch; the cron route is retired (410, no prisma, no deleteMany, no
//      model); the seed helper, the three seed scripts and the list's
//      loading.tsx are gone; the sitemaps name no /discussions;
//   4. none of the 62 invented seed names is left anywhere under src/.
// The thread page has its own file (tests/unit/discussion-thread-honesty.test.ts).
// No DB, no network. Run: npx vitest run tests/unit/discussion-honesty.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { dict } from "@/lib/i18n";
import * as siteDescription from "@/lib/site-description";
import {
  DISCUSSIONS_INDEXABLE,
  STUDENT_THREAD_WHERE,
  isReadableThread,
  isStudentThread,
  isStudyRoom,
  type ThreadVisibility,
} from "@/lib/discussion-visibility";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel));

// ── 1. The rule ─────────────────────────────────────────────────────────

describe("the visibility rule (src/lib/discussion-visibility.ts)", () => {
  const seedScript: ThreadVisibility = { authorId: null, isSeed: false, topicCode: null };
  const cronStarter: ThreadVisibility = { authorId: null, isSeed: true, topicCode: null };
  const seedWithAccount: ThreadVisibility = { authorId: "u1", isSeed: true, topicCode: null };
  const studyRoom: ThreadVisibility = { authorId: null, isSeed: true, topicCode: "quant.percentage" };
  const student: ThreadVisibility = { authorId: "u1", isSeed: false, topicCode: null };

  it("a Shishya-written thread is neither a student thread nor readable", () => {
    for (const t of [seedScript, cronStarter, seedWithAccount]) {
      expect(isStudentThread(t), JSON.stringify(t)).toBe(false);
      expect(isReadableThread(t), JSON.stringify(t)).toBe(false);
    }
  });

  it("a study room opens by its own link but is not a student thread", () => {
    expect(isStudyRoom(studyRoom)).toBe(true);
    expect(isReadableThread(studyRoom)).toBe(true);
    expect(isStudentThread(studyRoom)).toBe(false);
  });

  it("a thread a signed-in student started is both", () => {
    expect(isStudentThread(student)).toBe(true);
    expect(isReadableThread(student)).toBe(true);
  });

  it("STUDENT_THREAD_WHERE is exactly 'has an account, not a seed'", () => {
    expect(STUDENT_THREAD_WHERE).toEqual({ authorId: { not: null }, isSeed: false });
  });

  it("discussions stay out of search until the founder opens them", () => {
    expect(DISCUSSIONS_INDEXABLE).toBe(false);
  });
});

// ── 2. The rendered list page ───────────────────────────────────────────

interface Row {
  id: string;
  title: string;
  authorId: string | null;
  authorName: string | null;
  isSeed: boolean;
  topicCode: string | null;
  pinned: boolean;
  locked: boolean;
  messageCount: number;
  lastActivityAt: Date;
  createdAt: Date;
  exam: { code: string; shortName: string } | null;
  _count: { messages: number };
}

let rows: Row[] = [];
let studentCount = 0;
let session: { user: { id: string } } | null = null;
const findMany = vi.fn(async (_args: unknown) => rows);
const count = vi.fn(async (_args: unknown) => studentCount);
const queryRaw = vi.fn(async () => [] as unknown[]);

function LinkStub({ href, prefetch, children, ...rest }: { href: string; prefetch?: boolean; children?: React.ReactNode } & Record<string, unknown>) {
  return React.createElement("a", { href, ...rest }, children);
}

const STUBS: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": jsxRuntime,
  "next/link": { __esModule: true, default: LinkStub },
  "@/lib/auth": { auth: async () => session },
  "@/lib/db/prisma": { prisma: { discussion: { findMany, count }, $queryRaw: queryRaw } },
  "@/lib/i18n-server": {
    getT: async () => ({ locale: "en", t: (k: string) => (dict.en as Record<string, string>)[k] ?? k }),
  },
};

function resolveFile(spec: string, fromDir: string): string {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(fromDir, spec);
  else throw new Error(`unexpected package: ${spec}`);
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const f = base + ext;
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return path.normalize(f);
  }
  throw new Error(`cannot resolve ${spec} from ${fromDir}`);
}

const PRELOADED = new Map<string, unknown>([[resolveFile("@/lib/site-description", ROOT), siteDescription]]);
const loaded = new Map<string, { exports: Record<string, unknown> }>();

function loadFile(file: string): Record<string, unknown> {
  const hit = loaded.get(file);
  if (hit) return hit.exports;
  const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  loaded.set(file, mod);
  const dir = path.dirname(file);
  const req = (spec: string): unknown => {
    if (spec in STUBS) return STUBS[spec];
    const f = resolveFile(spec, dir);
    return PRELOADED.get(f) ?? loadFile(f);
  };
  new Function("require", "module", "exports", "process", out)(req, mod, mod.exports, process);
  return mod.exports;
}

const listPage = loadFile(path.join(ROOT, "src/app/discussions/page.tsx")) as {
  default: (p: { searchParams: Promise<{ examCode?: string }> }) => Promise<React.ReactElement>;
  generateMetadata: () => Promise<{ title: string; description: string; robots?: { index: boolean; follow: boolean }; alternates: { canonical: string } }>;
};

const renderList = async (examCode?: string) =>
  renderToStaticMarkup(await listPage.default({ searchParams: Promise.resolve(examCode ? { examCode } : {}) }));

const jsonLdTypes = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => (JSON.parse(m[1]) as { "@type": string })["@type"]);

const h1Of = (html: string) => /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1];

function studentRow(over: Partial<Row> = {}): Row {
  const at = new Date("2026-10-03T06:00:00Z");
  return {
    id: "cm-student-1",
    title: "How do I revise percentages?",
    authorId: "u1",
    authorName: "Ravi Student",
    isSeed: false,
    topicCode: null,
    pinned: false,
    locked: false,
    messageCount: 5,
    lastActivityAt: at,
    createdAt: at,
    exam: { code: "SSC_CGL", shortName: "SSC CGL" },
    _count: { messages: 3 },
    ...over,
  };
}

describe("/discussions lists student threads only", () => {
  beforeEach(() => {
    rows = [];
    studentCount = 0;
    session = null;
    findMany.mockClear();
    count.mockClear();
  });

  it("asks the database for student threads only, with student-only reply counts", async () => {
    await renderList();
    expect(findMany).toHaveBeenCalledTimes(1);
    const args = findMany.mock.calls[0][0] as { where: Record<string, unknown>; include: { _count: unknown } };
    expect(args.where).toMatchObject(STUDENT_THREAD_WHERE);
    expect(args.where).not.toHaveProperty("exam");
    expect(args.include._count).toEqual({ select: { messages: { where: { authorId: { not: null } } } } });
  });

  it("?examCode= scopes the list to that exam (the exam-day links pass it)", async () => {
    await renderList("SSC_CGL");
    const args = findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(args.where).toEqual({ ...STUDENT_THREAD_WHERE, exam: { code: "SSC_CGL" } });
  });

  it("with no student thread: no thread link, H1 'Discussions', the empty line, no CollectionPage", async () => {
    for (const signedIn of [false, true]) {
      session = signedIn ? { user: { id: "u9" } } : null;
      const html = await renderList();
      expect(html).not.toMatch(/href="\/discussions\/(?!new")/);
      expect(h1Of(html)).toBe("Discussions");
      expect(html).toContain(dict.en["disc.empty"]);
      expect(jsonLdTypes(html)).toEqual(["BreadcrumbList"]);
    }
  });

  it("with no student thread the head says so, and is noindex", async () => {
    const meta = await listPage.generateMetadata();
    expect(count).toHaveBeenCalledWith({ where: STUDENT_THREAD_WHERE });
    expect(meta.title).toBe("Discussions — ask your study question | Shishya");
    expect(meta.description).toBe(
      "Ask a study or exam question on Shishya. No student has posted yet. Replies signed Shishya AI are written by AI, not by a student.",
    );
    expect(meta.robots?.index).toBe(false);
    expect(meta.robots?.follow).toBe(true);
    expect(meta.alternates.canonical).toBe("https://shishya.in/discussions");
  });

  it("a failed count reads as no student thread (never the 'students' description)", async () => {
    count.mockRejectedValueOnce(new Error("db down"));
    const meta = await listPage.generateMetadata();
    expect(meta.description).toContain("No student has posted yet");
    expect(meta.robots?.index).toBe(false);
  });

  it("once students post: their description, still noindex while DISCUSSIONS_INDEXABLE is false", async () => {
    studentCount = 2;
    const meta = await listPage.generateMetadata();
    expect(meta.description).toBe(
      "Questions and answers from students on Shishya — doubts, strategy and exam-day experiences. Free to read; sign up free to reply.",
    );
    expect(meta.description).not.toMatch(/Live discussions|aspirants/i);
    expect(meta.robots?.index).toBe(false);
  });

  it("a student thread is listed with its student reply count (opening post and AI replies not counted)", async () => {
    rows = [studentRow({ messageCount: 5, _count: { messages: 3 } })];
    const html = await renderList();
    expect(html).toContain('href="/discussions/cm-student-1"');
    expect(html).toContain("Ravi Student");
    expect(html).toContain(`2 ${dict.en["disc.replies"]}`);
    expect(html).not.toContain(`5 ${dict.en["disc.replies"]}`);
    expect(h1Of(html)).toBe(dict.en["disc.title"]);
    expect(jsonLdTypes(html)).toEqual(["CollectionPage", "BreadcrumbList"]);
    expect(html).not.toMatch(/Live discussions among/);
  });
});

// ── 3. Source guards ────────────────────────────────────────────────────

describe("every discussion surface reads the rule; seeding is retired", () => {
  it("the list, the three API routes and HomeDiscussions import discussion-visibility", () => {
    for (const f of [
      "src/app/discussions/page.tsx",
      "src/app/api/discussions/route.ts",
      "src/app/api/discussions/[id]/route.ts",
      "src/app/api/discussions/[id]/messages/route.ts",
      "src/components/HomeDiscussions.tsx",
    ]) {
      expect(read(f), f).toContain("discussion-visibility");
    }
  });

  it("the thread APIs answer not-found for a hidden thread; the list API lists student threads only", () => {
    expect(read("src/app/api/discussions/route.ts")).toMatch(/const where: any = \{ \.\.\.STUDENT_THREAD_WHERE \};/);
    expect(read("src/app/api/discussions/[id]/route.ts")).toMatch(/if \(!thread \|\| !isReadableThread\(thread\)\) return notFound\("discussion"\);/);
    const messages = read("src/app/api/discussions/[id]/messages/route.ts");
    expect(messages).toMatch(/isSeed: true, topicCode: true/);
    expect(messages).toMatch(/if \(!isReadableThread\(thread\)\) return notFound\("discussion"\);/);
    // the check comes before the reply is written and before the AI auto-reply is scheduled
    expect(messages.indexOf("isReadableThread(thread)")).toBeLessThan(messages.indexOf("discussionMessage.create"));
    expect(messages.indexOf("isReadableThread(thread)")).toBeLessThan(messages.indexOf("maybeScheduleAiReply({"));
  });

  it("the cron route is retired: 410, no prisma, no deleteMany, no seed helper", () => {
    const f = "src/app/api/cron/refresh-discussions/route.ts";
    const src = read(f);
    expect(src).toMatch(/NOT scheduled since 2 Oct 2026/);
    expect(src).toMatch(/status: 410/);
    expect(src).toContain("retired 3 Oct 2026 — Shishya no longer writes discussion threads");
    expect(src).not.toMatch(/deleteMany/);
    expect(src).not.toMatch(/generateSeedThreads/);
    expect(src).not.toMatch(/prisma/);
    // the cron secret is still checked first
    expect(src.indexOf("CRON_SECRET")).toBeLessThan(src.indexOf("status: 410"));
  });

  it("the seed helper, the three seed scripts and the list's loading.tsx are gone", () => {
    for (const f of [
      "src/lib/ai/seed-discussions.ts",
      "seed/discussions.ts",
      "seed/discussions-extra.ts",
      "seed/discussions-followups.ts",
      // a streamed loading shell made a hidden or missing thread answer 200
      "src/app/discussions/loading.tsx",
    ]) {
      expect(exists(f), f).toBe(false);
    }
  });

  it("the list carries no seed branch: no 'starter question' chip, no 'Shishya' author swap (only isSeed false rows are listed)", () => {
    const list = read("src/app/discussions/page.tsx");
    expect(list).not.toMatch(/th\.isSeed/);
    expect(list).not.toMatch(/D\.starter/);
    expect(list).toContain("<span>{th.authorName ?? D.anonymous}</span>");
  });

  it("the sitemaps name no /discussions URL", () => {
    expect(read("src/app/sitemap.ts")).not.toContain("/discussions");
    expect(read("src/lib/sitemap-sections.ts")).not.toContain("/discussions");
  });

  it("the exam-day 'Talk to other candidates' box needs a student thread of that exam", () => {
    const src = read("src/components/exam-phase/PhaseArticleView.tsx");
    expect(src).toContain("prisma.discussion.count({ where: { ...STUDENT_THREAD_WHERE, examId: exam.id } }).catch(() => 0)");
    expect(src).toMatch(/\{studentThreads > 0 && \(\s*<section[^>]*>\s*<h3[^>]*>\s*\{fillTemplate\(t\("phase\.disc\.h2"\)/);
  });

  it("the site-search row does not promise student threads", () => {
    const row = read("src/lib/search/landings.ts").split("\n").find((l) => l.includes('path: "/discussions"'));
    expect(row).toContain('sub: "Ask a study question; read what students ask"');
  });
});

// ── 4. No invented name is left under src/ ──────────────────────────────

/** The 62 invented names on the seed threads and their messages (the
 *  database read of 3 Oct 2026, fix-spec discussions/db1.txt; "Shishya AI"
 *  is the platform's own name and is not in the list). */
const SEED_NAMES = [
  "Anita G.", "Lakshmi V.", "Mohammed F.", "Manish K.", "Vikash D.", "Karthik J.", "Vikram T.", "Pooja S.",
  "Akash R.", "Sneha R.", "Neha P.", "Karthik N.", "Aisha B.", "Aman R.", "Dr. (aspiring) Suresh", "Imran S.",
  "Rohit V.", "Manish P.", "Sushma D.", "Shravya R.", "Aisha P.", "Deepak Y.", "Ravi K.", "Tushar V.",
  "Asha N.", "Divya N.", "Pooja M.", "Imran A.", "Asha B.", "Karthik R.", "Bhavna R.", "Priya S.",
  "Geetha K.", "Meena G.", "Aman J.", "Pranav K.", "Sneha M.", "Priya M.", "Sneha B.", "Arjun B.",
  "Rajesh G.", "Kavya M.", "Rakesh K.", "Sneha P.", "Suresh L.", "Kavya N.", "Aditya M.", "Mohammed A.",
  "Nikhil P.", "Ravi P.", "Vikram L.", "Dr. Imran (PG)", "Sushma N.", "Rohan T.", "Rajesh K.", "Tushar N.",
  "Aarav T.", "Dr. Ramesh (Faculty)", "Nikhil S.", "Shreya M.", "Sai T.", "Geetha P.",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

describe("none of the invented seed names is left in the source", () => {
  it("the list holds 62 distinct names", () => {
    expect(new Set(SEED_NAMES).size).toBe(62);
  });

  it("no file under src/ contains one", () => {
    const hits: string[] = [];
    for (const abs of walk(path.join(ROOT, "src"))) {
      const text = fs.readFileSync(abs, "utf8");
      for (const name of SEED_NAMES) if (text.includes(name)) hits.push(`${path.relative(ROOT, abs)} :: ${name}`);
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
