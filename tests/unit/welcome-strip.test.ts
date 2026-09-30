// The one-time "Your Shishya is ready" strip (30 Sep 2026, sign-up build 2 —
// src/lib/welcome-strip.ts, src/lib/welcome-strip-copy.ts,
// src/app/api/me/welcome/route.ts, src/components/WelcomeStrip*.tsx).
//
// Pinned:
//   • where it may show: never a Class 1-7 or class-agnostic school page,
//     never mid-paper or right before a paper opens (?start=…), never on
//     sign-in / admin / onboarding — those wait for a later page;
//   • once: the cookie createUser sets, a 2-hour window from the account's
//     creation, and GET /api/me/welcome answers show:false after any
//     "welcome-strip" beacon, for a school-only account and for a guest;
//   • honest lines only: "Daily 5" (headline and line) only for an exam with
//     practice, following a "Change exam" pick; the line only when that
//     mail can reach the account,
//     the chat only when it can be reopened, challenges / alerts only when
//     held; en / hi / te with the same placeholders; no numbers or "rank";
//   • "Change exam": enrols the new exam; REMOVES the old one (never writes
//     active: false) ONLY when it is the sign-up goal (made with the
//     account), never practised and untouched — and a removed exam comes
//     back active through the plain ensureEnrollment the mock paths use;
//   • the panel derives the exam from the server's answer each render (it
//     can mount before GET answers);
//   • mounted in the Header under the orange row, not on admin or
//     childSafe pages.
// No DB, no network. Run: npx vitest run tests/unit/welcome-strip.test.ts

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  WELCOME_COOKIE,
  WELCOME_WINDOW_MS,
  cookieHasWelcome,
  matchExams,
  welcomeCookieClearString,
  welcomeStripAllowedHere,
  welcomeStripNow,
  withinWelcomeWindow,
  type WelcomeData,
} from "@/lib/welcome-strip";
import { WELCOME_STRIP_COPY, welcomeStripHeadline, welcomeStripPoints, withExam } from "@/lib/welcome-strip-copy";
import { dict } from "@/lib/i18n";

describe("where the strip may show", () => {
  it("ordinary pages a new member lands on", () => {
    for (const p of ["/", "/dashboard", "/exams/SSC_CGL", "/exams/SSC_CGL/pyq/2024", "/coach", "/today", "/attempts/abc/results", "/chat", "/hi/exams/SSC_CGL", "/schooling/cbse/class-9"]) {
      expect(welcomeStripAllowedHere(p, ""), p).toBe(true);
    }
  });

  it("never on a Class 1-7 or class-agnostic school page", () => {
    for (const p of ["/schooling", "/schooling/cbse", "/schooling/cbse/class-5", "/schooling/cbse/class-7/mathematics"]) {
      expect(welcomeStripAllowedHere(p, ""), p).toBe(false);
    }
  });

  it("not mid-paper, not right before a paper opens, not on sign-in / admin / onboarding", () => {
    // /c/{token}: a friend's challenge being played (review 30 Sep 2026).
    for (const p of ["/mocks/cm1abc", "/live-test/xyz", "/aptitude", "/c/abc123", "/login", "/logout", "/admin/users", "/onboarding"]) {
      expect(welcomeStripAllowedHere(p, ""), p).toBe(false);
    }
    expect(welcomeStripAllowedHere("/exams/SSC_CGL", "?start=practice")).toBe(false);
    expect(welcomeStripAllowedHere("/exams/SSC_CGL", "?start=diagnostic&x=1")).toBe(false);
    expect(welcomeStripAllowedHere("/exams/SSC_CGL", "?tab=pyq")).toBe(true);
    expect(welcomeStripAllowedHere(null, "")).toBe(false);
  });
});

describe("shown once", () => {
  it("the cookie is PII-free and read exactly", () => {
    expect(WELCOME_COOKIE).toBe("shishya_welcome");
    expect(cookieHasWelcome("a=1; shishya_welcome=1; b=2")).toBe(true);
    expect(cookieHasWelcome("shishya_welcome=1")).toBe(true);
    expect(cookieHasWelcome("shishya_welcome=; b=2")).toBe(false);
    expect(cookieHasWelcome("x_shishya_welcome=1")).toBe(false);
    expect(cookieHasWelcome(null)).toBe(false);
    expect(welcomeCookieClearString(true)).toBe("shishya_welcome=; path=/; max-age=0; samesite=lax; secure");
  });

  it("a 2-hour window from the account's creation", () => {
    const t = Date.UTC(2026, 8, 30, 10);
    expect(WELCOME_WINDOW_MS).toBe(2 * 3600_000);
    expect(withinWelcomeWindow(new Date(t), t + 5 * 60_000)).toBe(true);
    expect(withinWelcomeWindow(new Date(t), t + WELCOME_WINDOW_MS + 1)).toBe(false);
    expect(withinWelcomeWindow("not a date", t)).toBe(false);
  });
});

describe("honest lines only", () => {
  it("Daily 5 only when the mail can reach the account; chat only when it can be reopened; links only when held", () => {
    expect(welcomeStripPoints({ dailyFiveEmail: true, hasExam: true, chatHref: null, challenges: 0, alerts: 0 })).toEqual(["weak", "mocks", "daily"]);
    expect(welcomeStripPoints({ dailyFiveEmail: false, hasExam: true, chatHref: null, challenges: 0, alerts: 0 })).toEqual(["weak", "mocks"]);
    expect(welcomeStripPoints({ dailyFiveEmail: true, hasExam: false, chatHref: null, challenges: 0, alerts: 0 })).toEqual(["weak", "mocks"]);
    expect(welcomeStripPoints({ dailyFiveEmail: true, hasExam: true, chatHref: "/chat?examCode=SSC_CGL", challenges: 1, alerts: 2 })).toEqual([
      "weak",
      "mocks",
      "daily",
      "chat",
      "challenges",
      "alerts",
    ]);
  });

  it("en / hi / te: every line present, the same placeholders, in its own script", () => {
    const en = WELCOME_STRIP_COPY.en;
    const ph = (s: string) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort();
    for (const [l, script] of [["hi", /[ऀ-ॿ]/], ["te", /[ఀ-౿]/]] as const) {
      const c = WELCOME_STRIP_COPY[l];
      expect(Object.keys(c).sort()).toEqual(Object.keys(en).sort());
      for (const k of Object.keys(en) as (keyof typeof en)[]) {
        expect(ph(c[k]), `${l}.${k}`).toEqual(ph(en[k]));
        if (k !== "dailyA") expect(c[k], `${l}.${k}`).toMatch(script);
      }
      // The "Today" link reads as the site's own nav word (review 30 Sep 2026).
      expect(c.dailyLink, `${l}.dailyLink`).toBe((dict[l] as Record<string, string>)["nav.today"]);
    }
    expect(withExam(en.exam, "SSC CGL")).toBe("SSC CGL is now your exam — your home page, dashboard, Daily 5 and tutor start from it.");
  });

  it("the headline names Daily 5 only for an exam with practice; 'Choose your exam' never promises it (review 30 Sep 2026)", () => {
    for (const c of Object.values(WELCOME_STRIP_COPY)) {
      const exam = { code: "X_EXAM", shortName: "X Exam" };
      expect(welcomeStripHeadline(c, { exam, practice: true }, false)).toContain("Daily 5");
      expect(welcomeStripHeadline(c, { exam, practice: false }, false)).not.toContain("Daily 5");
      expect(welcomeStripHeadline(c, { exam, practice: false }, false)).toContain("X Exam");
      expect(welcomeStripHeadline(c, { exam: null, practice: false }, false)).toBe(c.noExam);
      expect(c.noExam).not.toContain("Daily 5");
      expect(welcomeStripHeadline(c, { exam, practice: true }, true)).toBe(withExam(c.changeSaved, "X Exam"));
      expect(c.changeSaved).not.toContain("Daily 5");
    }
    expect(WELCOME_STRIP_COPY.en.examNoDaily).toBe("{exam} is now your exam — your home page, dashboard and tutor start from it.");
  });

  it("a goal without practice: no Daily 5 in the headline and no Daily 5 line", () => {
    const data: WelcomeData = { show: true, exam: { code: "NO_PRACTICE", shortName: "NP" }, practice: false, dailyFiveEmail: true, challenges: 0, alerts: 0 };
    const now = welcomeStripNow(data, null);
    // dailyFiveEmail can never outrun practice, even if a server answer said so.
    expect(now).toEqual({ exam: { code: "NO_PRACTICE", shortName: "NP" }, practice: false, dailyFiveEmail: false });
    expect(welcomeStripHeadline(WELCOME_STRIP_COPY.en, now, false)).not.toContain("Daily 5");
    expect(welcomeStripPoints({ dailyFiveEmail: now.dailyFiveEmail, hasExam: !!now.exam, chatHref: null, challenges: 0, alerts: 0 })).not.toContain("daily");
  });

  it("Change exam: the lines follow the NEW exam's practice and mail flags", () => {
    const data: WelcomeData = { show: true, exam: { code: "SSC_CGL", shortName: "SSC CGL" }, practice: true, dailyFiveEmail: true, challenges: 0, alerts: 0 };
    expect(welcomeStripNow(data, null).dailyFiveEmail).toBe(true);
    // → an exam with no practice: the Daily 5 line and the headline's "Daily 5" go.
    const toNone = welcomeStripNow(data, { code: "NO_PRACTICE", shortName: "NP", practice: false, dailyFiveEmail: false });
    expect(toNone).toEqual({ exam: { code: "NO_PRACTICE", shortName: "NP" }, practice: false, dailyFiveEmail: false });
    expect(welcomeStripPoints({ dailyFiveEmail: toNone.dailyFiveEmail, hasExam: true, chatHref: null, challenges: 0, alerts: 0 })).not.toContain("daily");
    expect(welcomeStripHeadline(WELCOME_STRIP_COPY.en, toNone, false)).not.toContain("Daily 5");
    // → from a goal without practice to one with: the line appears.
    const fromNone = welcomeStripNow({ ...data, practice: false, dailyFiveEmail: false }, { code: "RRB_NTPC", shortName: "RRB NTPC", practice: true, dailyFiveEmail: true });
    expect(welcomeStripPoints({ dailyFiveEmail: fromNone.dailyFiveEmail, hasExam: true, chatHref: null, challenges: 0, alerts: 0 })).toContain("daily");
  });

  it("the panel mounted before GET answered (a guest chat imported first) still shows the goal once the answer lands", () => {
    // First render: no answer yet.
    expect(welcomeStripNow(null, null)).toEqual({ exam: null, practice: false, dailyFiveEmail: false });
    // Next render, same panel, the answer in: derived, not a copy taken at mount.
    const data: WelcomeData = { show: true, exam: { code: "SSC_CGL", shortName: "SSC CGL" }, practice: true, dailyFiveEmail: true, challenges: 0, alerts: 0 };
    expect(welcomeStripNow(data, null)).toEqual({ exam: { code: "SSC_CGL", shortName: "SSC CGL" }, practice: true, dailyFiveEmail: true });
  });

  it("no invented numbers, no rank, no 'saved chats', no 'one tap' unsubscribe", () => {
    for (const c of Object.values(WELCOME_STRIP_COPY)) {
      const all = Object.values(c).join(" ");
      expect(all).not.toMatch(/\d+\s*(?:%|seconds?|सेकंड|సెకన్)/i);
      expect(all).not.toMatch(/\brank\b|रैंक|ర్యాంక్/i);
    }
    const en = Object.values(WELCOME_STRIP_COPY.en).join(" ");
    expect(en).not.toMatch(/chats are saved|saved chats|one tap/i);
    expect(WELCOME_STRIP_COPY.en.dailyB).toContain("unsubscribe link");
  });

  it("the Change-exam search: every typed word, short names first, capped", () => {
    const exams = [
      { code: "SSC_CGL", shortName: "SSC CGL", name: "Staff Selection Commission Combined Graduate Level" },
      { code: "SSC_CHSL", shortName: "SSC CHSL", name: "Combined Higher Secondary Level" },
      { code: "NEET_UG", shortName: "NEET UG", name: "National Eligibility cum Entrance Test" },
    ];
    expect(matchExams(exams, "ssc cgl").map((e) => e.code)).toEqual(["SSC_CGL"]);
    expect(matchExams(exams, "ssc").map((e) => e.code)).toEqual(["SSC_CGL", "SSC_CHSL"]);
    expect(matchExams(exams, "entrance").map((e) => e.code)).toEqual(["NEET_UG"]);
    expect(matchExams(exams, "  ")).toEqual([]);
    expect(matchExams(exams, "ssc", 1)).toHaveLength(1);
  });
});

// ── GET / POST /api/me/welcome with the session and prisma stubbed ─────

const db = vi.hoisted(() => ({
  userId: "u-1" as string | null,
  user: null as null | { createdAt: Date; email: string; emailOptOut: boolean },
  shown: 0,
  goal: null as null | { exam: { code: string; shortName: string } },
  schoolRows: 0,
  counts: [{ challenges: 0, alerts: 0 }],
  exams: {} as Record<string, { id: string; code: string; shortName: string; category: string; active: boolean }>,
  enrolment: null as null | { active: boolean; createdAt: Date },
  attempts: 0,
  enrolled: [] as { examId: string; patch: unknown }[],
  deleted: [] as unknown[],
  upserts: [] as unknown[],
  practice: new Set(["SSC_CGL", "RRB_NTPC"]) as Set<string> | null,
}));

vi.mock("@/lib/auth", () => ({ auth: async () => (db.userId ? { user: { id: db.userId } } : null) }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: async () => ({ ok: true }), rateLimited: () => new Response(null, { status: 429 }) }));
vi.mock("@/lib/db/enrollment", () => ({
  ensureEnrollment: async (_u: string, exam: { id: string }, patch: unknown) => {
    db.enrolled.push({ examId: exam.id, patch });
    return {};
  },
}));
vi.mock("@/lib/db/exam-practice", () => ({ practiceExamCodes: async () => db.practice }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: async () => db.user },
    analyticsEvent: { count: async () => db.shown },
    enrollment: {
      findFirst: async () => db.goal,
      count: async () => db.schoolRows,
      findUnique: async () => db.enrolment,
      deleteMany: async (a: { where: unknown }) => {
        db.deleted.push(a.where);
        return { count: 1 };
      },
      upsert: async (a: unknown) => {
        db.upserts.push(a);
        return {};
      },
    },
    attempt: { count: async () => db.attempts },
    exam: { findUnique: async (a: { where: { code: string } }) => db.exams[a.where.code] ?? null },
    $queryRaw: async () => db.counts,
  },
}));

import { GET, POST } from "@/app/api/me/welcome/route";

const NOW = Date.now();
beforeEach(() => {
  db.userId = "u-1";
  db.user = { createdAt: new Date(NOW - 5 * 60_000), email: "s@example.com", emailOptOut: false };
  db.shown = 0;
  db.goal = { exam: { code: "SSC_CGL", shortName: "SSC CGL" } };
  db.schoolRows = 0;
  db.counts = [{ challenges: 1, alerts: 0 }];
  db.exams = {
    SSC_CGL: { id: "e-ssc", code: "SSC_CGL", shortName: "SSC CGL", category: "GOVT_JOBS", active: true },
    RRB_NTPC: { id: "e-rrb", code: "RRB_NTPC", shortName: "RRB NTPC", category: "GOVT_JOBS", active: true },
  };
  db.enrolment = { active: true, createdAt: new Date(NOW - 5 * 60_000 + 3000) };
  db.attempts = 0;
  db.enrolled = [];
  db.deleted = [];
  db.upserts = [];
  db.practice = new Set(["SSC_CGL", "RRB_NTPC"]);
});

describe("GET /api/me/welcome", () => {
  it("a new member: show, with the goal, the Daily-5 mail flag and what they hold", async () => {
    const j = await (await GET()).json();
    expect(j).toEqual({ show: true, exam: { code: "SSC_CGL", shortName: "SSC CGL" }, practice: true, dailyFiveEmail: true, challenges: 1, alerts: 0 });
  });

  it("shown once: any welcome-strip beacon since the account began → hidden", async () => {
    db.shown = 1;
    expect((await (await GET()).json()).show).toBe(false);
  });

  it("a guest, an account past the window, a school-only account → hidden", async () => {
    db.userId = null;
    expect((await (await GET()).json()).show).toBe(false);
    db.userId = "u-1";
    db.user = { createdAt: new Date(NOW - WELCOME_WINDOW_MS - 60_000), email: "s@example.com", emailOptOut: false };
    expect((await (await GET()).json()).show).toBe(false);
    db.user = { createdAt: new Date(NOW - 60_000), email: "s@example.com", emailOptOut: false };
    db.goal = null;
    db.schoolRows = 1;
    expect((await (await GET()).json()).show).toBe(false);
  });

  it("a goal with no practice, or a failed practice read → no Daily 5 line (nothing on /today to promise)", async () => {
    db.practice = new Set(["RRB_NTPC"]);
    expect(await (await GET()).json()).toMatchObject({ show: true, practice: false, dailyFiveEmail: false });
    db.practice = null;
    expect(await (await GET()).json()).toMatchObject({ show: true, practice: false, dailyFiveEmail: false });
  });

  it("no goal or an opted-out account → no Daily-5 mail line", async () => {
    db.goal = null;
    expect(await (await GET()).json()).toMatchObject({ show: true, exam: null, practice: false, dailyFiveEmail: false });
    db.goal = { exam: { code: "SSC_CGL", shortName: "SSC CGL" } };
    db.user = { createdAt: new Date(NOW - 60_000), email: "s@example.com", emailOptOut: true };
    // Opted out of mail: /today still serves the set, so the headline keeps "Daily 5".
    expect(await (await GET()).json()).toMatchObject({ practice: true, dailyFiveEmail: false });
  });
});

const post = (body: unknown) => POST(new Request("https://shishya.in/api/me/welcome", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/me/welcome — Change exam", () => {
  it("enrols the new exam and REMOVES the untouched sign-up goal (never writes active: false)", async () => {
    const j = await (await post({ to: "RRB_NTPC", from: "SSC_CGL" })).json();
    expect(j).toEqual({ ok: true, exam: { code: "RRB_NTPC", shortName: "RRB NTPC" }, dropped: true, practice: true, dailyFiveEmail: true });
    expect(db.enrolled).toEqual([{ examId: "e-rrb", patch: { active: true } }]);
    // Only the untouched row: no shift day, target date or goal score set since.
    expect(db.deleted).toEqual([{ userId: "u-1", examId: "e-ssc", shiftDate: null, targetDate: null, goalScore: null }]);
  });

  it("a removed goal comes back ACTIVE through the plain ensureEnrollment every mock / attempt path calls", async () => {
    await post({ to: "RRB_NTPC", from: "SSC_CGL" });
    expect(db.deleted).toHaveLength(1);
    const real = await vi.importActual<typeof import("@/lib/db/enrollment")>("@/lib/db/enrollment");
    await real.ensureEnrollment("u-1", { id: "e-ssc", category: "GOVT_JOBS", code: "SSC_CGL" });
    // The row is gone, so the upsert CREATES it — no active: false to carry over …
    expect(db.upserts).toEqual([{ where: { userId_examId: { userId: "u-1", examId: "e-ssc" } }, update: {}, create: { userId: "u-1", examId: "e-ssc" } }]);
    // … and a created Enrollment is active by default.
    const root = path.resolve(__dirname, "../..");
    const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
    expect(schema).toMatch(/model Enrollment \{[^}]*\bactive\s+Boolean\s+@default\(true\)/);
    // The route never writes active: false on an enrolment.
    const route = fs.readFileSync(path.join(root, "src/app/api/me/welcome/route.ts"), "utf8");
    expect(route).not.toMatch(/ensureEnrollment\([^)]*active:\s*false/);
  });

  it("a change to an exam with no practice answers no Daily 5 (the strip drops the line and the headline's word)", async () => {
    db.practice = new Set(["SSC_CGL"]);
    const j = await (await post({ to: "RRB_NTPC", from: "SSC_CGL" })).json();
    expect(j).toMatchObject({ exam: { code: "RRB_NTPC" }, practice: false, dailyFiveEmail: false });
    db.practice = new Set(["RRB_NTPC"]);
    db.user = { createdAt: new Date(NOW - 5 * 60_000), email: "s@example.com", emailOptOut: true };
    expect(await (await post({ to: "RRB_NTPC" })).json()).toMatchObject({ practice: true, dailyFiveEmail: false });
  });

  it("never turns off an exam the student practised, or one not made with the account", async () => {
    db.attempts = 1;
    expect((await (await post({ to: "RRB_NTPC", from: "SSC_CGL" })).json()).dropped).toBe(false);
    db.attempts = 0;
    db.enrolment = { active: true, createdAt: new Date(NOW) }; // enrolled later, by the student
    expect((await (await post({ to: "RRB_NTPC", from: "SSC_CGL" })).json()).dropped).toBe(false);
    expect(db.deleted).toEqual([]);
    expect(db.enrolled.filter((e) => (e.patch as { active: boolean }).active === false)).toEqual([]);
  });

  it("an unknown exam 404s; signed out 401s; a bad body 400s", async () => {
    expect((await post({ to: "NOPE_EXAM" })).status).toBe(404);
    expect((await post({})).status).toBe(400);
    db.userId = null;
    expect((await post({ to: "RRB_NTPC" })).status).toBe(401);
    expect(db.enrolled).toEqual([]);
  });
});

// ── Mount (source) ───────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

describe("mounted in the Header, inline, never for a child", () => {
  it("under the orange row, not on admin or childSafe pages", () => {
    const src = read("src/components/Header.tsx");
    expect(src).toContain('import { WelcomeStrip } from "./WelcomeStrip";');
    expect(src).toContain("      {!admin && !childSafe && <WelcomeStrip />}\n    </header>");
  });

  it("the island asks the server only with the cookie, keeps it when the answer or the page is gone, and beacons shown", () => {
    const src = read("src/components/WelcomeStrip.tsx");
    expect(src.startsWith('"use client";')).toBe(true);
    expect(src).toContain("if (hasCookie && welcomeStripAllowedHere(path, search)) {");
    expect(src).toContain("if (!j || !alive) return;");
    expect(src).toContain('ctaBeacon(WELCOME_CTA, { action: "shown", examCode: j.exam?.code ?? null });');
    // The panel (words + search) loads only when there is something to show.
    expect(src).toContain('dynamic(() => import("./WelcomeStripPanel")');
  });

  it("the panel is inline (role=status), dismissible, and beacons change / changed / dismiss", () => {
    const src = read("src/components/WelcomeStripPanel.tsx");
    expect(src).toContain('role="status"');
    // Derived each render, never seeded from the first props (review 30 Sep 2026).
    expect(src).not.toMatch(/useState\(data\?\./);
    expect(src).toContain("const now = welcomeStripNow(data, picked);");
    expect(src).toContain('{welcomeStripHeadline(c, now, status === "saved")}');
    expect(src).toContain("dailyFiveEmail: now.dailyFiveEmail,");
    expect(src).not.toMatch(/fixed inset-0|role="dialog"|aria-modal/);
    for (const action of ['action: "dismiss"', 'action: "change"', 'action: "changed"']) expect(src).toContain(action);
  });
});
