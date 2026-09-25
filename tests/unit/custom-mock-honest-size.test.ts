// POST /api/mocks/custom — honest size and seen = answered (25 Sep 2026).
//
// The September read: 232 of 370 builder mocks came back short and kept a
// title sized as asked; 41 of 313 repeat mocks re-served only questions the
// student had never answered. Here the route runs against mocked auth,
// rate limit, Prisma and seen history (no DB, no network) and we check what
// it would store and return.
// Run: npx vitest run tests/unit/custom-mock-honest-size.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = { id: string; topicId: string; difficulty: "EASY" | "MEDIUM" | "HARD" };

const state = vi.hoisted(() => ({
  pool: [] as { id: string; topicId: string; difficulty: "EASY" | "MEDIUM" | "HARD" }[],
  history: null as null | { answered: Map<string, number>; shown: Map<string, number> },
  findManyArgs: [] as unknown[],
  created: [] as { title: string; questionIds: string[]; config: Record<string, unknown> }[],
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1" } })) }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => ({ ok: true })),
  rateLimited: vi.fn(() => new Response("limited", { status: 429 })),
}));
vi.mock("@/lib/answered-questions", () => ({ getSeenHistory: vi.fn(async () => state.history) }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    exam: {
      findUnique: vi.fn(async () => ({ id: "e1", shortName: "SBI Clerk", durationMin: 60, totalQuestions: 100 })),
    },
    $queryRaw: vi.fn(async () => [
      { id: "t1", name: "Arithmetic" },
      { id: "t2", name: "Number Series" },
    ]),
    question: {
      findMany: vi.fn(async (args: unknown) => {
        state.findManyArgs.push(args);
        return state.pool;
      }),
    },
    mock: {
      create: vi.fn(async ({ data }: { data: { title: string; questionIds: string[]; config: Record<string, unknown> } }) => {
        state.created.push(data);
        return { id: "m1" };
      }),
    },
  },
}));

import { POST } from "@/app/api/mocks/custom/route";
import { levelMix } from "@/lib/mock-fill";

function rows(prefix: string, topicId: string, n: number, difficulty: Row["difficulty"] = "MEDIUM"): Row[] {
  return Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i + 1}`, topicId, difficulty }));
}

async function build(body: Record<string, unknown>) {
  const res = await POST(
    new Request("http://x/api/mocks/custom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ examCode: "SBI_CLERK", topicIds: ["t1", "t2"], difficulty: "MIXED", ...body }),
    }),
  );
  return { status: res.status, data: await res.json() };
}

beforeEach(() => {
  state.pool = [];
  state.history = { answered: new Map(), shown: new Map() };
  state.findManyArgs = [];
  state.created = [];
});

describe("title and size come from the questions actually picked", () => {
  it("25 asked, 18 available → an 18-question mock titled with 18, and the response says so", async () => {
    state.pool = [...rows("a", "t1", 10), ...rows("b", "t2", 8)];
    const { status, data } = await build({ count: 25 });
    expect(status).toBe(200);
    expect(data.count).toBe(18);
    expect(data.requested).toBe(25);
    expect(data.short).toBe(true);
    expect(data.line).toBe("Only 18 questions were available for these topics, so this mock has 18, not 25.");
    expect(data.title).toBe("SBI Clerk — Custom: Arithmetic, Number Series · 18 questions");
    const stored = state.created[0];
    expect(stored.title).toBe(data.title);
    expect(stored.questionIds).toHaveLength(18);
    expect(new Set(stored.questionIds).size).toBe(18);
    expect(stored.config).toMatchObject({ count: 18, requestedCount: 25 });
  });

  it("a full set is not short and still states its real size", async () => {
    state.pool = [...rows("a", "t1", 30), ...rows("b", "t2", 30)];
    const { data } = await build({ count: 25 });
    expect(data.count).toBe(25);
    expect(data.short).toBe(false);
    expect(data.line).toBeNull();
    expect(data.title.endsWith("· 25 questions")).toBe(true);
  });

  it("accepts the builder's 'All N' size (any 5-50)", async () => {
    state.pool = [...rows("a", "t1", 10), ...rows("b", "t2", 8)];
    const { status, data } = await build({ count: 18 });
    expect(status).toBe(200);
    expect(data.count).toBe(18);
    expect(data.short).toBe(false);
  });

  it("under 5 questions → 422 with the real number, nothing stored", async () => {
    state.pool = rows("a", "t1", 3);
    const { status, data } = await build({ count: 10 });
    expect(status).toBe(422);
    expect(data.available).toBe(3);
    expect(data.error).toContain("Only 3 questions");
    expect(state.created).toHaveLength(0);
  });

  it("withdrawn questions (tag 'rejected') are excluded from the pool query", async () => {
    state.pool = rows("a", "t1", 12);
    await build({ count: 10 });
    expect(state.findManyArgs[0]).toMatchObject({
      where: { validated: true, NOT: { tags: { has: "rejected" } } },
    });
  });
});

describe("seen = answered", () => {
  it("unanswered questions of an abandoned mock come before answered ones and are not repeats", async () => {
    // 12 questions: 4 never shown, 4 shown but never answered, 4 answered.
    state.pool = rows("a", "t1", 12);
    state.history = {
      answered: new Map(["a1", "a2", "a3", "a4"].map((id, i) => [id, i + 1])),
      shown: new Map(["a5", "a6", "a7", "a8"].map((id, i) => [id, 10 + i])),
    };
    const { data } = await build({ topicIds: ["t1"], count: 10 });
    const ids = new Set(state.created[0].questionIds);
    // Every never-shown and every shown-only question is in; only 2 answered.
    for (const id of ["a5", "a6", "a7", "a8", "a9", "a10", "a11", "a12"]) expect(ids.has(id)).toBe(true);
    expect(["a1", "a2", "a3", "a4"].filter((id) => ids.has(id))).toEqual(["a1", "a2"]);
    expect(data.bank).toMatchObject({ size: 12, seen: 4, repeats: 2 });
    expect(data.bank.line).toContain("You have answered 4 of the 12");
  });

  it("no repeats while never-shown or shown-only questions remain", async () => {
    state.pool = rows("a", "t1", 12);
    state.history = { answered: new Map([["a1", 1]]), shown: new Map([["a2", 2]]) };
    const { data } = await build({ topicIds: ["t1"], count: 10 });
    expect(state.created[0].questionIds).not.toContain("a1");
    expect(data.bank.repeats).toBe(0);
  });

  it("a failed seen query still builds the set but reports no numbers", async () => {
    state.pool = rows("a", "t1", 12);
    state.history = null;
    const { status, data } = await build({ topicIds: ["t1"], count: 10 });
    expect(status).toBe(200);
    expect(data.bank).toBeNull();
    expect(state.created[0].config.seen).toBeUndefined();
  });
});

// The builder's Easy / Hard note (src/lib/mock-fill.ts levelMix) must hold
// for what this route really stores: never more chosen-level questions than
// maxStrict, never fewer MEDIUM than minMedium. The first note said "4 hard
// questions first, then 35 medium" — the 35 was the whole MEDIUM pool, and a
// student who had answered the 4 hard ones got 25 medium.
describe("the builder's Easy / Hard note matches what the route builds", () => {
  function tally(ids: string[], difficulty: "EASY" | "HARD") {
    const byId = new Map(state.pool.map((r) => [r.id, r.difficulty]));
    let strict = 0;
    let medium = 0;
    for (const id of ids) {
      const d = byId.get(id);
      if (d === difficulty) strict++;
      else if (d === "MEDIUM") medium++;
    }
    return { strict, medium };
  }
  function answeredCounts() {
    const c = { EASY: 0, MEDIUM: 0, HARD: 0 };
    for (const r of state.pool) if (state.history?.answered.has(r.id)) c[r.difficulty]++;
    return c;
  }
  function bankCounts() {
    const c = { EASY: 0, MEDIUM: 0, HARD: 0 };
    for (const r of state.pool) c[r.difficulty]++;
    return c;
  }

  it("E20 / M35 / H4, Hard, 25, nothing answered → 4 hard + 21 medium, as the note says", async () => {
    state.pool = [...rows("e", "t1", 20, "EASY"), ...rows("m", "t1", 35, "MEDIUM"), ...rows("h", "t1", 4, "HARD")];
    const mix = levelMix(bankCounts(), answeredCounts(), "HARD", 25)!;
    await build({ difficulty: "HARD", count: 25 });
    expect(tally(state.created[0].questionIds, "HARD")).toEqual({ strict: 4, medium: 21 });
    expect(mix).toMatchObject({ maxStrict: 4, minMedium: 21 });
  });

  it("same bank, the 4 hard ones answered → 25 medium and 0 hard, as the note says", async () => {
    state.pool = [...rows("e", "t1", 20, "EASY"), ...rows("m", "t1", 35, "MEDIUM"), ...rows("h", "t1", 4, "HARD")];
    state.history = { answered: new Map(["h1", "h2", "h3", "h4"].map((id, i) => [id, i + 1])), shown: new Map() };
    const mix = levelMix(bankCounts(), answeredCounts(), "HARD", 25)!;
    await build({ difficulty: "HARD", count: 25 });
    expect(tally(state.created[0].questionIds, "HARD")).toEqual({ strict: 0, medium: 25 });
    expect(mix).toMatchObject({ maxStrict: 0, minMedium: 25, answeredFirst: true });
  });

  it("the bounds hold for random banks, histories and sizes (two topics, shown + answered)", async () => {
    let s = 7;
    const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
    let checked = 0;
    for (let run = 0; run < 150; run++) {
      state.created = [];
      state.pool = [];
      for (const t of ["t1", "t2"]) {
        for (const d of ["EASY", "MEDIUM", "HARD"] as const) state.pool.push(...rows(`${t}${d[0]}`, t, int(0, 14), d));
      }
      const answered = new Map<string, number>();
      const shown = new Map<string, number>();
      for (const r of state.pool) {
        const x = rnd();
        if (x < 0.3) answered.set(r.id, int(1, 1000));
        else if (x < 0.5) shown.set(r.id, int(1, 1000));
      }
      state.history = { answered, shown };
      const difficulty = rnd() < 0.5 ? "EASY" : "HARD";
      const bank = bankCounts();
      const available = bank[difficulty] + bank.MEDIUM;
      if (available < 5) continue;
      const count = int(5, Math.min(50, available));
      const mix = levelMix(bank, answeredCounts(), difficulty, count);
      const { status } = await build({ difficulty, count });
      expect(status).toBe(200);
      const got = tally(state.created[0].questionIds, difficulty);
      expect(got.strict + got.medium).toBe(count);
      if (mix) {
        expect(mix.size).toBe(count);
        expect(got.strict).toBeLessThanOrEqual(mix.maxStrict);
        expect(got.medium).toBeGreaterThanOrEqual(mix.minMedium);
        checked++;
      }
    }
    // Enough runs actually exercised a note.
    expect(checked).toBeGreaterThan(20);
  });
});
