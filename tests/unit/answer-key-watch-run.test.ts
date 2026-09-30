// Official watch — the run (30 Sep 2026), src/lib/answer-key-watch-run.ts,
// with fake fetch, fake AI and a fake writer: HTML first; AI only where the
// mode allows (never at noon, hot pairs in the evening, any unsettled pair on
// Monday) and never past the hard cap (charged before each call, trued up to
// the recorded cost); a 4xx from the API stops all AI; every AI URL goes
// through the same gate (a coaching link or a bare PDF is never written);
// ?dry=1 passes dry to the writer, never ensures tables or marks pages; the
// time guard stops cleanly. No DB, no network, no model.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import { runAnswerKeyWatch, type FetchedPage, type WatchRunDeps } from "@/lib/answer-key-watch-run";
import type { DueExamRecord, WatchRow, WriteReleaseArgs } from "@/lib/answer-key-watch-db";
import type { AnswerKeyCheckInput, AnswerKeyCheckResult } from "@/lib/ai/answer-key-check";
import { AI_CHECK_TIMEOUT_MS, AI_START_GUARD_MS, type WatchMode } from "@/lib/answer-key-watch";

const NOW = new Date("2026-09-30T15:30:00Z"); // 21:00 IST
const DAY = 86_400_000;
const todayNo = Math.floor((NOW.getTime() + 330 * 60_000) / DAY);
const isoAgo = (n: number) => new Date((todayNo - n) * DAY).toISOString().slice(0, 10);

function exam(i: number, examDaysAgo: number): DueExamRecord {
  const code = `EX${i}`;
  return {
    examId: `e${i}`,
    code,
    shortName: code,
    name: `Exam Number ${code} Recruitment`,
    portalUrl: `https://board${i}.gov.in`,
    state: null,
    rows: [
      {
        id: `x${i}`,
        label: `${code} 2026 exam`,
        date: new Date(`${isoAgo(examDaysAgo)}T00:00:00Z`),
        isExamDay: true,
        kind: "EXAM",
        confidence: "official",
        url: `https://board${i}.gov.in/notice.pdf`,
        source: "ai-generated:claude",
      },
    ],
    lagDays: {},
  };
}

function watch(i: number, over: Partial<WatchRow> = {}): WatchRow {
  return {
    id: `w${i}`,
    examId: `e${i}`,
    kind: "ANSWER_KEY",
    listingUrl: `https://board${i}.gov.in/answer-keys`,
    host: `board${i}.gov.in`,
    fetchMode: "html",
    singleExam: false,
    heading: "",
    examTerms: [],
    baselineLinks: [`https://board${i}.gov.in/old-2025-key.pdf`],
    lastCycle: null,
    lagDays: null,
    ...over,
  };
}

const html = (body: string): FetchedPage => ({ status: 200, contentType: "text/html", head: "<html>", body, finalUrl: null });
const pdf: FetchedPage = { status: 200, contentType: "application/pdf", head: "%PDF-1.5", body: "", finalUrl: null };
const dead: FetchedPage = { status: 0, contentType: null, head: "", body: "", finalUrl: null, error: "timeout" };

function setup(o: {
  exams: DueExamRecord[];
  watches?: WatchRow[];
  pages?: Record<string, FetchedPage>;
  ai?: (input: AnswerKeyCheckInput) => Promise<AnswerKeyCheckResult>;
  clock?: () => number;
}) {
  const writes: WriteReleaseArgs[] = [];
  const marked: string[] = [];
  const aiCalls: AnswerKeyCheckInput[] = [];
  const fetched: string[] = [];
  let ensured = 0;
  const deps: WatchRunDeps = {
    now: NOW,
    loadDue: async () => o.exams,
    loadWatches: async () => o.watches ?? [],
    loadKnown: async (ids, ws) => new Map(ids.map((id) => [id, new Set(ws.filter((w) => w.examId === id).flatMap((w) => w.baselineLinks))])),
    fetchUrl: async (url) => {
      fetched.push(url);
      return o.pages?.[url] ?? dead;
    },
    aiCheck: o.ai
      ? async (input) => {
          aiCalls.push(input);
          return o.ai!(input);
        }
      : null,
    isStopError: (e) => (e as { status?: number })?.status === 400,
    ensureTables: async () => {
      ensured++;
    },
    writeRelease: async (args) => {
      writes.push(args);
      return { status: args.dry ? "dry-run" : "written", archivedTwins: 0, indexNowUrls: 0 };
    },
    markChecked: async (id, status) => {
      marked.push(`${id}:${status}`);
    },
    clock: o.clock,
  };
  return { deps, writes, marked, aiCalls, fetched, ensured: () => ensured };
}

const run = (mode: WatchMode, deps: WatchRunDeps, extra: { dry?: boolean; ai?: boolean; maxUsd?: number } = {}) =>
  runAnswerKeyWatch({ mode, dry: extra.dry ?? false, ai: extra.ai ?? true, maxUsd: extra.maxUsd ?? null }, deps);

const listing1 = html(`<table>
  <tr><td>EX1 2026 exam — Provisional Answer Key</td><td><a href="/keys/ex1-2026.pdf">Download</a></td><td>${isoAgo(2).split("-").reverse().join("/")}</td></tr>
  <tr><td>EX1 2026 — Response sheet</td><td><a href="/keys/ex1-2026-resp.pdf">Download</a></td><td>${isoAgo(2).split("-").reverse().join("/")}</td></tr>
  <tr><td>EX1 2025 exam — Answer Key</td><td><a href="/old-2025-key.pdf">Download</a></td><td>01/10/2025</td></tr>
</table>`);

describe("HTML first", () => {
  it("reads the official listing, writes the first verified release and logs its siblings — no AI needed", async () => {
    const s = setup({
      exams: [exam(1, 5)],
      watches: [watch(1)],
      pages: {
        "https://board1.gov.in/answer-keys": listing1,
        "https://board1.gov.in/keys/ex1-2026.pdf": pdf,
        "https://board1.gov.in/keys/ex1-2026-resp.pdf": pdf,
      },
      ai: async () => ({ candidates: [], costUsd: 0.1 }),
    });
    const r = await run("evening", s.deps);
    expect(s.aiCalls).toHaveLength(0);
    expect(s.writes).toHaveLength(1);
    const w = s.writes[0];
    expect(w.release.url).toBe("https://board1.gov.in/keys/ex1-2026.pdf");
    expect(w.release.dateSource).toBe("printed");
    expect(w.release.releasedOn.toISOString().slice(0, 10)).toBe(isoAgo(2));
    expect(w.label).toBe("Answer key (provisional) — EX1 2026 exam");
    expect(w.siblings!.map((x) => x.url)).toEqual(["https://board1.gov.in/keys/ex1-2026-resp.pdf"]);
    expect(w.dry).toBe(false);
    expect(w.indexNow).toBe(true);
    expect(s.fetched).not.toContain("https://board1.gov.in/old-2025-key.pdf"); // baseline: never even fetched
    expect(s.marked[0]).toMatch(/^w1:ok: 3 links, 2 new answer-key links$/);
    expect(s.ensured()).toBe(1);
    expect(r.released[0]).toMatchObject({ code: "EX1", kind: "ANSWER_KEY", status: "written", via: "html" });
    expect(r.ai.calls).toBe(0);
  });

  it("?dry=1: the writer is told dry, no tables ensured, no page marked, no IndexNow", async () => {
    const s = setup({
      exams: [exam(1, 5)],
      watches: [watch(1)],
      pages: { "https://board1.gov.in/answer-keys": listing1, "https://board1.gov.in/keys/ex1-2026.pdf": pdf, "https://board1.gov.in/keys/ex1-2026-resp.pdf": pdf },
    });
    const r = await run("check", s.deps, { dry: true });
    expect(s.writes).toHaveLength(1);
    expect(s.writes[0].dry).toBe(true);
    expect(s.writes[0].indexNow).toBe(false);
    expect(s.ensured()).toBe(0);
    expect(s.marked).toEqual([]);
    expect(r.released[0].status).toBe("dry-run");
  });

  it("a link whose own fetch fails is never written (gate 2)", async () => {
    const s = setup({ exams: [exam(1, 5)], watches: [watch(1)], pages: { "https://board1.gov.in/answer-keys": listing1 } });
    const r = await run("check", s.deps);
    expect(s.writes).toEqual([]);
    expect(r.rejected.filter((x) => x.gate === 2)).toHaveLength(2);
  });

  it("nothing due → nothing fetched", async () => {
    const s = setup({ exams: [exam(1, 90)], watches: [watch(1)] });
    const r = await run("plan", s.deps);
    expect(r.due).toEqual([]);
    expect(s.fetched).toEqual([]);
  });
});

describe("AI: where the mode allows, never past the cap", () => {
  const unreadable = (count: number, daysAgo: number) => Array.from({ length: count }, (_, i) => exam(i + 1, daysAgo));
  const noHit = async (): Promise<AnswerKeyCheckResult> => ({ candidates: [], costUsd: 0.12 });

  it("the noon check never calls AI, even for a hot exam with no readable page", async () => {
    const s = setup({ exams: unreadable(3, 3), ai: noHit });
    const r = await run("check", s.deps);
    expect(s.aiCalls).toHaveLength(0);
    expect(r.ai).toMatchObject({ allowed: false, capUsd: 0 });
  });

  it("the evening check: hot exams only, at most 6, $0.90", async () => {
    const s = setup({ exams: [...unreadable(8, 3), exam(20, 30)], ai: noHit });
    const r = await run("evening", s.deps);
    expect(s.aiCalls).toHaveLength(6);
    expect(s.aiCalls.map((c) => c.examCode)).not.toContain("EX20"); // 30 days after the exam: not hot
    expect(r.ai.spentUsd).toBeCloseTo(0.9, 6);
    expect(r.ai.stopped).toMatch(/cap reached/);
  });

  it("the Monday plan: hot pairs only, $3.00 → at most 20 calls", async () => {
    const s = setup({ exams: [...unreadable(25, 3), exam(40, 20)], ai: noHit });
    const r = await run("plan", s.deps);
    expect(s.aiCalls).toHaveLength(20);
    expect(s.aiCalls.map((c) => c.examCode)).not.toContain("EX40"); // 20 days after the exam: not hot
    expect(r.ai.spentUsd).toBeLessThanOrEqual(3.0 + 1e-9);
    const cold = setup({ exams: unreadable(5, 20), ai: noHit });
    await run("plan", cold.deps);
    expect(cold.aiCalls).toHaveLength(0);
  });

  it("a call that cost more than its estimate is trued up, so the cap still holds", async () => {
    const s = setup({ exams: unreadable(5, 3), ai: async () => ({ candidates: [], costUsd: 0.5 }) });
    const r = await run("evening", s.deps);
    expect(s.aiCalls).toHaveLength(2); // 0.5 → +0.15 fits → 1.0 spent → no third
    expect(r.ai.spentUsd).toBeCloseTo(1.0, 6);
  });

  it("?maxUsd lowers the cap, never raises it", async () => {
    const lower = setup({ exams: unreadable(5, 3), ai: noHit });
    await run("evening", lower.deps, { maxUsd: 0.3 });
    expect(lower.aiCalls).toHaveLength(2);
    const higher = setup({ exams: unreadable(9, 3), ai: noHit });
    await run("evening", higher.deps, { maxUsd: 50 });
    expect(higher.aiCalls).toHaveLength(6);
  });

  it("?ai=0 → no AI", async () => {
    const s = setup({ exams: unreadable(3, 3), ai: noHit });
    await run("plan", s.deps, { ai: false });
    expect(s.aiCalls).toHaveLength(0);
  });

  it("a 4xx from the API (credit balance) stops all AI for the run", async () => {
    const s = setup({
      exams: unreadable(4, 3),
      ai: async () => {
        throw Object.assign(new Error("Your credit balance is too low"), { status: 400 });
      },
    });
    const r = await run("evening", s.deps);
    expect(s.aiCalls).toHaveLength(1);
    expect(r.ai.stopped).toMatch(/API refused \(400\)/);
  });

  it("an exam whose official page was read and showed nothing new costs no AI", async () => {
    const s = setup({
      exams: [exam(1, 3)],
      watches: [watch(1)],
      pages: { "https://board1.gov.in/answer-keys": html(`<ul><li><a href="/old-2025-key.pdf">EX1 2025 Answer Key</a></li></ul>`) },
      ai: noHit,
    });
    await run("evening", s.deps);
    expect(s.aiCalls).toHaveLength(0);
  });
});

describe("AI candidates go through the same gate", () => {
  it("coaching links and bare PDFs are rejected; the official listing that links the file makes it a release", async () => {
    const s = setup({
      exams: [exam(1, 3)],
      pages: {
        "https://board1.gov.in/notices": html(
          `<ul><li>EX1 2026 exam Final Answer Key <a href="/k/final-2026.pdf">PDF</a> ${isoAgo(1).split("-").reverse().join(".")}</li></ul>`,
        ),
        "https://board1.gov.in/k/final-2026.pdf": pdf,
        "https://board1.gov.in/k/bare-2026.pdf": pdf,
      },
      ai: async () => ({
        candidates: [
          { kind: "ANSWER_KEY", url: "https://www.adda247.com/ex1-answer-key-2026.pdf", listingUrl: null },
          { kind: "ANSWER_KEY", url: "https://board1.gov.in/k/bare-2026.pdf", listingUrl: null },
          { kind: "ANSWER_KEY", url: "https://board1.gov.in/k/final-2026.pdf", listingUrl: "https://board1.gov.in/notices" },
        ],
        costUsd: 0.14,
      }),
    });
    const r = await run("evening", s.deps);
    expect(s.aiCalls).toHaveLength(1);
    expect(s.aiCalls[0].officialHosts).toEqual(["board1.gov.in"]);
    expect(s.writes).toHaveLength(1);
    expect(s.writes[0].release).toMatchObject({ url: "https://board1.gov.in/k/final-2026.pdf", via: "ai", dateSource: "printed" });
    expect(s.writes[0].label).toBe("Answer key (final) — EX1 2026 exam");
    const rej = r.rejected.map((x) => x.url);
    expect(rej).toContain("https://www.adda247.com/ex1-answer-key-2026.pdf");
    expect(rej).toContain("https://board1.gov.in/k/bare-2026.pdf");
    expect(r.rejected.find((x) => x.url.includes("adda247"))).toMatchObject({ gate: 1, via: "ai" });
    expect(s.fetched.some((u) => u.includes("adda247"))).toBe(false); // never even requested
    expect(s.fetched).not.toContain("https://board1.gov.in/k/bare-2026.pdf"); // a bare PDF is not fetched as a notice page
  });
});

// Review, 30 Sep 2026 (blocker 1, should-fix 3): the AI path had no baseline
// and no sitting check — any official link naming the exam and year was
// written "first seen today".
describe("AI candidates: a page with no baseline needs a printed date; another sitting never passes", () => {
  const notices = (row: string): FetchedPage => html(`<ul><li>${row} <a href="/k/key-2026.pdf">PDF</a></li></ul>`);
  const aiOnce = async (): Promise<AnswerKeyCheckResult> => ({
    candidates: [{ kind: "ANSWER_KEY", url: "https://board1.gov.in/k/key-2026.pdf", listingUrl: "https://board1.gov.in/notices" }],
    costUsd: 0.1,
  });
  const pages = (row: string) => ({ "https://board1.gov.in/notices": notices(row), "https://board1.gov.in/k/key-2026.pdf": pdf });

  it("no watch rows + no printed date → rejected at gate 5, nothing written", async () => {
    const s = setup({ exams: [exam(1, 3)], pages: pages("EX1 2026 exam Answer Key"), ai: aiOnce });
    const r = await run("evening", s.deps);
    expect(s.aiCalls).toHaveLength(1);
    expect(s.writes).toEqual([]);
    expect(r.rejected.find((x) => x.url.endsWith("key-2026.pdf"))).toMatchObject({ gate: 5, via: "ai" });
  });
  it("the same candidate with a printed in-range date is written", async () => {
    const s = setup({ exams: [exam(1, 3)], pages: pages(`EX1 2026 exam Answer Key ${isoAgo(1).split("-").reverse().join("/")}`), ai: aiOnce });
    await run("evening", s.deps);
    expect(s.writes).toHaveLength(1);
    expect(s.writes[0].release.dateSource).toBe("printed");
  });
  it("…and on a watch page WITH a baseline, an undated new link may be 'first seen'", async () => {
    const s = setup({
      exams: [exam(1, 3)],
      watches: [watch(1, { listingUrl: "https://board1.gov.in/notices", fetchMode: "browser-only" })],
      pages: pages("EX1 2026 exam Answer Key"),
      ai: aiOnce,
    });
    await run("evening", s.deps);
    expect(s.writes).toHaveLength(1);
    expect(s.writes[0].release.dateSource).toBe("first-seen");
  });
  it("an AI candidate for another sitting of the same exam and year is rejected (gate 3)", async () => {
    const ex = exam(1, 3);
    ex.rows[0].label = "EX1 2 2026 exam";
    const s = setup({ exams: [ex], pages: pages(`EX1 (I) 2026 Answer Key ${isoAgo(1).split("-").reverse().join("/")}`), ai: aiOnce });
    const r = await run("evening", s.deps);
    expect(s.writes).toEqual([]);
    expect(r.rejected.find((x) => x.url.endsWith("key-2026.pdf"))).toMatchObject({ gate: 3, via: "ai" });
  });
});

describe("listing pages that redirect off the official host", () => {
  it("are unreadable: no candidate is taken from them", async () => {
    const moved = { ...listing1, finalUrl: "https://www.careerpower.in/board1-keys" };
    const s = setup({
      exams: [exam(1, 5)],
      watches: [watch(1)],
      pages: { "https://board1.gov.in/answer-keys": moved, "https://board1.gov.in/keys/ex1-2026.pdf": pdf },
    });
    const r = await run("check", s.deps);
    expect(s.writes).toEqual([]);
    expect(r.pagesUnreadable[0].status).toMatch(/^redirected off the official host/);
    expect(s.fetched).not.toContain("https://board1.gov.in/keys/ex1-2026.pdf");
  });
});

describe("time guard", () => {
  it("no AI call starts after AI_START_GUARD_MS (165 s), well before the 240 s guard", async () => {
    expect(AI_START_GUARD_MS).toBe(165_000);
    const times = [0, 170_000];
    const s = setup({ exams: [exam(1, 3)], ai: async () => ({ candidates: [], costUsd: 0.1 }), clock: () => times.shift() ?? 170_000 });
    const r = await run("evening", s.deps);
    expect(s.aiCalls).toHaveLength(0);
    expect(r.timeGuardHit).toBe(true);
    const early = [0, 100_000];
    const ok = setup({ exams: [exam(1, 3)], ai: async () => ({ candidates: [], costUsd: 0.1 }), clock: () => early.shift() ?? 100_000 });
    await run("evening", ok.deps);
    expect(ok.aiCalls).toHaveLength(1);
  });
  it("the cron awaits the AiUsage row; the AI call has a hard timeout and no SDK retries", () => {
    const runSrc = fs.readFileSync(path.join(process.cwd(), "src/lib/answer-key-watch-run.ts"), "utf8");
    expect(runSrc).toMatch(/aiMod\.checkAnswerKeyWithAi\(input, \{ awaitUsage: true \}\)/);
    const check = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/answer-key-check.ts"), "utf8");
    expect(check).toMatch(/\{ timeout: AI_CHECK_TIMEOUT_MS, maxRetries: 0 \}/);
    expect(AI_CHECK_TIMEOUT_MS).toBe(60_000);
  });
  it("stops cleanly and says so", async () => {
    let t = 0;
    const s = setup({
      exams: [exam(1, 3), exam(2, 3)],
      watches: [watch(1), watch(2)],
      pages: { "https://board1.gov.in/answer-keys": html("<p>nothing</p>"), "https://board2.gov.in/answer-keys": html("<p>nothing</p>") },
      ai: async () => ({ candidates: [], costUsd: 0.1 }),
      clock: () => (t += 200_000),
    });
    const r = await run("evening", s.deps);
    expect(r.timeGuardHit).toBe(true);
    expect(s.aiCalls).toHaveLength(0);
  });
});
