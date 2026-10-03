// The discussion thread page (3 Oct 2026, crawl-audit fix C2).
//
// Before: /discussions/{id} served the 34 seed-script threads (7-9 May 2026)
// with their invented authors in the header and as a JSON-LD Person, every
// invented reply relabelled "Shishya AI", the title "… — Shishya Discussions",
// the description "Aspirants discussing: …" and index, follow — one of them
// gave a wrong SSC CGL admit-card date. A thread Shishya wrote now answers
// not-found and its head never carries its title; a student's thread renders
// with exactly one DiscussionForumPosting whose comment count, like the
// header's, counts student replies only (a reply with no account is Shishya
// AI). A study room still opens by its own link, without a forum posting,
// without the "starter question" chip, and with every student post counted
// (a room has no opening post). The guard at the end sees every read of the
// Discussion model (split-line calls, counts and raw SQL included).
// The page is transpiled with TypeScript and rendered with
// renderToStaticMarkup; the database, auth, language and the sign-up button
// are stubbed (the pattern of tests/unit/paths-views.test.ts).
// No DB, no network. Run: npx vitest run tests/unit/discussion-thread-honesty.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { dict } from "@/lib/i18n";
import { discussionLabelsCopy } from "@/lib/discussion-labels-copy";

const ROOT = process.cwd();
const NOT_FOUND = "NEXT_NOT_FOUND";

interface Msg {
  id: string;
  threadId: string;
  authorId: string | null;
  authorName: string | null;
  content: string;
  createdAt: Date;
}
interface ThreadRow {
  id: string;
  title: string;
  examId: string | null;
  topicCode: string | null;
  authorId: string | null;
  authorName: string | null;
  isSeed: boolean;
  pinned: boolean;
  locked: boolean;
  messageCount: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
  exam: { code: string; shortName: string } | null;
  messages: Msg[];
}

let row: ThreadRow | null = null;
let session: { user: { id: string } } | null = null;
const findUnique = vi.fn(async (_args: unknown) => row);
const queryRaw = vi.fn(async () => [] as unknown[]);

function LinkStub({ href, prefetch, children, ...rest }: { href: string; prefetch?: boolean; children?: React.ReactNode } & Record<string, unknown>) {
  return React.createElement("a", { href, ...rest }, children);
}

const STUBS: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": jsxRuntime,
  "next/link": { __esModule: true, default: LinkStub },
  "next/navigation": {
    notFound: () => {
      throw new Error(NOT_FOUND);
    },
  },
  "@/lib/auth": { auth: async () => session },
  "@/lib/db/prisma": { prisma: { discussion: { findUnique }, $queryRaw: queryRaw } },
  "@/lib/i18n-server": {
    getT: async () => ({ locale: "en", t: (k: string) => (dict.en as Record<string, string>)[k] ?? k }),
  },
  "./ReplyForm": { ReplyForm: () => React.createElement("form", { "data-stub": "reply" }) },
  "@/components/SignUpButton": { SignUpButton: () => React.createElement("a", { "data-stub": "signup" }, "Sign up with Google") },
  "@/lib/signup-place-words": { signUpWords: () => ({}) },
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
  const req = (spec: string): unknown => (spec in STUBS ? STUBS[spec] : loadFile(resolveFile(spec, dir)));
  new Function("require", "module", "exports", "process", out)(req, mod, mod.exports, process);
  return mod.exports;
}

const page = loadFile(path.join(ROOT, "src/app/discussions/[id]/page.tsx")) as {
  default: (p: { params: Promise<{ id: string }> }) => Promise<React.ReactElement>;
  generateMetadata: (p: { params: Promise<{ id: string }> }) => Promise<{
    title: string;
    description?: string;
    robots?: { index: boolean; follow: boolean };
    alternates?: { canonical: string };
  }>;
};

const params = (id: string) => ({ params: Promise.resolve({ id }) });
const renderThread = async (id: string) => renderToStaticMarkup(await page.default(params(id)));
const forumPostings = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1]) as Record<string, unknown>)
    .filter((d) => d["@type"] === "DiscussionForumPosting");

const T0 = new Date("2026-05-09T16:42:53.772Z");
const msg = (id: string, authorId: string | null, authorName: string | null, content: string, minutes: number): Msg => ({
  id,
  threadId: "t",
  authorId,
  authorName,
  content,
  createdAt: new Date(T0.getTime() + minutes * 60_000),
});
function thread(over: Partial<ThreadRow>): ThreadRow {
  return {
    id: "t",
    title: "A thread",
    examId: null,
    topicCode: null,
    authorId: null,
    authorName: null,
    isSeed: false,
    pinned: false,
    locked: false,
    messageCount: 0,
    lastActivityAt: T0,
    createdAt: T0,
    updatedAt: T0,
    exam: null,
    messages: [],
    ...over,
  };
}

/** One of the 34 seed-script threads as stored on 9 May 2026: no account, invented names (before DATA-1: isSeed false). */
const SEED_TITLE = "Anyone else's mock score dropped this week? Or just me";
const seedScriptRow = (isSeed: boolean) =>
  thread({
    id: "cmoykr4b2001xrxwbf1ayufyh",
    title: SEED_TITLE,
    examId: "e-ssc",
    authorName: "Sneha M.",
    isSeed,
    messageCount: 2,
    exam: { code: "SSC_CGL", shortName: "SSC CGL" },
    messages: [
      msg("m1", null, "Sneha M.", "My mock score dropped from 150 to 128 this week.", 0),
      msg("m2", null, "Karthik J.", "Same here, the last set was harder.", 1),
    ],
  });
/** A starter question of the retired cron (1 Oct 2026). */
const CRON_TITLE = "Expected cutoff for General category this time? 220+ safe?";
const cronStarterRow = () =>
  thread({ id: "cmuq2pu7n0003j7zr3r2rscxv", title: CRON_TITLE, examId: "e-up", authorName: "Shishya", isSeed: true, exam: { code: "UP_POLICE_CONSTABLE", shortName: "UP Police" } });
/** A thread a signed-in student started, with a student reply, an AI reply and the author's own reply. */
const studentRow = () =>
  thread({
    id: "cm-student-1",
    title: "How do I revise percentages in a week?",
    examId: "e-ssc",
    authorId: "u1",
    authorName: "Ravi Student",
    messageCount: 4,
    exam: { code: "SSC_CGL", shortName: "SSC CGL" },
    messages: [
      msg("s1", "u1", "Ravi Student", "I have a week left. How should I revise percentages?", 0),
      msg("s2", "u2", "Meera Student", "Do one PYQ set a day.", 5),
      msg("s3", null, "Shishya AI", "Start with successive percentage change.", 6),
      msg("s4", "u1", "Ravi Student", "Thanks, will try.", 9),
    ],
  });
/** A topic study room: Shishya-made, opened from its topic page (POST /api/study-room stores it with isSeed TRUE and no message). */
const studyRoomRow = (messages: Msg[] = []) =>
  thread({ id: "room-1", title: "📚 Study room — SSC CGL: Percentage", examId: "e-ssc", topicCode: "quant.percentage", authorName: "Shishya", isSeed: true, exam: { code: "SSC_CGL", shortName: "SSC CGL" }, messageCount: messages.length, messages });

beforeEach(() => {
  row = null;
  session = null;
  findUnique.mockClear();
});

describe("a thread Shishya wrote answers not-found", () => {
  const cases: Array<[string, () => ThreadRow, string]> = [
    ["seed-script row as stored in May (isSeed false)", () => seedScriptRow(false), SEED_TITLE],
    ["seed-script row after DATA-1 (isSeed true)", () => seedScriptRow(true), SEED_TITLE],
    ["cron starter question", cronStarterRow, CRON_TITLE],
  ];

  for (const [name, make, title] of cases) {
    it(`${name}: the page rejects with not-found, signed out and signed in`, async () => {
      for (const s of [null, { user: { id: "u9" } }]) {
        session = s;
        row = make();
        await expect(page.default(params(row.id))).rejects.toThrow(NOT_FOUND);
      }
    });

    it(`${name}: the head is noindex and never carries the thread title`, async () => {
      row = make();
      const meta = await page.generateMetadata(params(row.id));
      expect(meta.robots?.index).toBe(false);
      expect(meta.title).toBe("Discussion — Shishya");
      expect(meta.title).not.toContain(title);
      expect(JSON.stringify(meta)).not.toContain(title);
      expect(JSON.stringify(meta)).not.toMatch(/Aspirants discussing/);
    });
  }

  it("a missing thread: not-found and a noindex head", async () => {
    row = null;
    await expect(page.default(params("zzzz-not-a-thread"))).rejects.toThrow(NOT_FOUND);
    const meta = await page.generateMetadata(params("zzzz-not-a-thread"));
    expect(meta.robots?.index).toBe(false);
  });

  it("a failed read in the head is treated as missing", async () => {
    findUnique.mockRejectedValueOnce(new Error("db down"));
    const meta = await page.generateMetadata(params("x"));
    expect(meta).toEqual({ title: "Discussion — Shishya", robots: { index: false, follow: false } });
  });
});

describe("a student's thread", () => {
  it("renders the student's name and exactly one DiscussionForumPosting, a Person", async () => {
    row = studentRow();
    const html = await renderThread(row.id);
    expect(html).toContain("Ravi Student");
    const ld = forumPostings(html);
    expect(ld).toHaveLength(1);
    expect(ld[0].author).toEqual({ "@type": "Person", name: "Ravi Student" });
    expect(ld[0].headline).toBe("How do I revise percentages in a week?");
  });

  it("the comment count — JSON-LD and header — ignores the opening post and every reply without an account", async () => {
    row = studentRow();
    const html = await renderThread(row.id);
    const ld = forumPostings(html)[0] as { interactionStatistic: { userInteractionCount: number } };
    expect(ld.interactionStatistic.userInteractionCount).toBe(2);
    expect(html).toContain(`2 ${dict.en["disc.replies"]}`);
    expect(html).not.toContain(`4 ${dict.en["disc.replies"]}`);
    expect(html).not.toContain(`3 ${dict.en["disc.replies"]}`);
  });

  it("its head: the student description, canonical, noindex while DISCUSSIONS_INDEXABLE is false", async () => {
    row = studentRow();
    const meta = await page.generateMetadata(params(row.id));
    expect(meta.title).toBe("How do I revise percentages in a week? — Shishya Discussions");
    expect(meta.description).toBe("A student's question on Shishya: How do I revise percentages in a week?. Read the thread; sign up free to reply.");
    expect(meta.alternates?.canonical).toBe("https://shishya.in/discussions/cm-student-1");
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});

describe("a study room opens by its own link", () => {
  it("renders, with no DiscussionForumPosting and no 'student's question' head", async () => {
    row = studyRoomRow();
    const html = await renderThread(row.id);
    expect(html).toContain("Study room — SSC CGL: Percentage");
    expect(forumPostings(html)).toHaveLength(0);
    const meta = await page.generateMetadata(params(row.id));
    expect(meta.description).not.toMatch(/student's question/);
    expect(meta.robots?.index).toBe(false);
  });

  it("is not labelled a starter question: its author line reads Shishya and it carries no chip", async () => {
    row = studyRoomRow();
    const html = await renderThread(row.id);
    expect(html).not.toContain(discussionLabelsCopy("en").starter);
    expect(html).toMatch(/<span class="font-medium text-ink-700">Shishya<\/span>/);
  });

  it("counts every student post, the first one included (a room has no opening post); AI replies are not counted", async () => {
    row = studyRoomRow([
      msg("r1", "u1", "Ravi Student", "Which percentage questions should we do first?", 0),
      msg("r2", null, "Shishya AI", "Start with successive change.", 1),
    ]);
    const html = await renderThread(row.id);
    expect(html).toContain(`1 ${dict.en["disc.reply"]}<`);
    expect(html).not.toContain(`0 ${dict.en["disc.replies"]}`);
    expect(html).not.toContain(`2 ${dict.en["disc.replies"]}`);
  });
});

describe("every thread read under src/ goes through the visibility rule", () => {
  function walk(dir: string, out: string[] = []): string[] {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(d.name)) out.push(p);
    }
    return out;
  }

  const rel = (abs: string) => path.relative(ROOT, abs).split(path.sep).join("/");

  // Any read of the Discussion model — findMany, findUnique, findFirst (and
  // their OrThrow forms), count, aggregate, groupBy — on prisma or a
  // transaction client, also when the call is split over lines
  // (`prisma.discussion\n    .findUnique(`, as the thread page's head reads).
  const MODEL_READ = /\.\s*discussion\s*\.\s*(findMany|findUnique(?:OrThrow)?|findFirst(?:OrThrow)?|count|aggregate|groupBy)\s*\(/;

  it("each file that reads the Discussion model imports discussion-visibility", () => {
    const readers: string[] = [];
    const missing: string[] = [];
    for (const abs of walk(path.join(ROOT, "src"))) {
      const src = fs.readFileSync(abs, "utf8");
      if (!MODEL_READ.test(src)) continue;
      readers.push(rel(abs));
      if (!src.includes("discussion-visibility")) missing.push(rel(abs));
    }
    // The scan sees every reader of 3 Oct 2026, the split-line one and the counts included.
    expect(readers).toEqual(
      expect.arrayContaining([
        "src/app/discussions/page.tsx",
        "src/app/discussions/[id]/page.tsx",
        "src/app/api/discussions/route.ts",
        "src/app/api/discussions/[id]/route.ts",
        "src/app/api/discussions/[id]/messages/route.ts",
        "src/components/HomeDiscussions.tsx",
        "src/components/exam-phase/PhaseArticleView.tsx",
        "src/app/exams/[code]/checklist/page.tsx",
      ]),
    );
    expect(missing, missing.join("\n")).toEqual([]);
  });

  it("the split-line form is seen: a reader written that way without the rule would be caught", () => {
    expect(MODEL_READ.test("const n = await prisma.discussion\n    .count({ where: {} });")).toBe(true);
    expect(MODEL_READ.test("await tx.discussion.findFirst({ where: { id } })")).toBe(true);
    expect(MODEL_READ.test("prisma.discussion.update({ where: { id } })")).toBe(false);
  });

  it("raw SQL that reads \"Discussion\" names isSeed or authorId (the study-room lookup by exam and topic is the one exception)", () => {
    const RAW = /\$queryRaw(?:Unsafe)?[^`(]*`([^`]*)`/g;
    const READS = /\b(FROM|JOIN)\s+"Discussion"(?=[\s;)]|$)/;
    const EXCEPT = "src/app/api/study-room/route.ts";
    const seen: string[] = [];
    const bad: string[] = [];
    for (const abs of walk(path.join(ROOT, "src"))) {
      const src = fs.readFileSync(abs, "utf8");
      for (const m of src.matchAll(RAW)) {
        if (!READS.test(m[1])) continue;
        seen.push(rel(abs));
        if (rel(abs) !== EXCEPT && !/"isSeed"|"authorId"/.test(m[1])) bad.push(`${rel(abs)} :: ${m[1].trim().slice(0, 80)}`);
      }
    }
    // The scan finds the one raw reader there is today (so it can find a new one).
    expect(seen).toContain(EXCEPT);
    expect(bad, bad.join("\n")).toEqual([]);
  });

  it("the thread page checks the rule before it renders, and prints no Organization author", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/app/discussions/[id]/page.tsx"), "utf8").replace(/\r\n/g, "\n");
    expect(src).toContain("if (!thread || !isReadableThread(thread)) notFound();");
    expect(src).not.toMatch(/"@type": "Organization"/);
    expect(src).not.toMatch(/Aspirants discussing/);
  });

  it("the checklist's 'Talk to other candidates' box needs a student thread of that exam", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/app/exams/[code]/checklist/page.tsx"), "utf8").replace(/\r\n/g, "\n");
    expect(src).toContain("prisma.discussion.count({ where: { ...STUDENT_THREAD_WHERE, examId: exam.id } }).catch(() => 0)");
    expect(src).toMatch(/\{studentThreads > 0 && \(\s*<section[^>]*>\s*<h2[^>]*>\{fillTemplate\(t\("chk\.disc\.h2"\)/);
  });
});
