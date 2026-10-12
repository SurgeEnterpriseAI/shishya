// Release 2 review fixes (12 Oct 2026; round 2 the same day). The under-13 rule
// (src/lib/signin-cta.ts under13ExamGuard: a kids' exam offers no sign-up and
// collects no data) and the honesty rule, on the surfaces the first Release 2
// build missed:
//   • the /updates FAQ answer "Subscribe to alerts … we'll email you" (and its
//     FAQPage JSON-LD), on an exam whose alert box is gone;
//   • "free email alerts" / "free alerts" in the /live and /reactions tagline,
//     <title>, description and share text, the exam-week block, context.md,
//     llms-full.txt and the .ics download;
//   • the /mocks/{id} sign-in gate and the /c/{token} header sign-up;
//   • the quiz-end challenge card (a stored name) and a friend's score send;
//   • the hub's guest box promising the tutor and an account;
//   • "announced" describing Reported dates, which may be unchecked AI finds.
// Round 2 (ship/verify-under13-honesty.md, ship/verify-regress.md):
//   • the challenger's card, share box and /c/{token} view on a kids' exam,
//     where a friend's score is never sent back, said it would be; and the
//     play API kept a typed name there;
//   • the footer sign-up card (SignupPitch) on a kids' exam's /c/{token};
//   • the /mocks/{id} and /chat loading skeletons' guest sign-up button;
//   • the no-practice dates note, true only inside its box.
//
// How the checks run. Most render the component or call the function twice:
// for a kids' exam (changed) and for SSC CGL (unchanged). Eight are SOURCE
// checks, marked "(source)" in their names: they pin a guard's line where a
// render needs the database or the Next runtime (the /updates FAQ, context.md,
// llms-full.txt, the /mocks/{id} redirect, the /c/{token} header,
// AnonQuizPlayer, the hub's guest box, the header's signed-in branch). They
// show the guard is there, not that SSC CGL's output is unchanged.
// Components render with react-dom/server through a small TSX loader. Where a
// part appears only after mount (the phone-notification button, the
// challenger's view, the sign-up card), the render runs each component's
// effects once, synchronously, as the browser does after mount (`mounted`).
// No DB (an in-memory Prisma stub for the play), no network.

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// ── the play API's storage, against an in-memory Prisma stub ────────────
const db = vi.hoisted(() => ({
  challenge: null as Record<string, unknown> | null,
  inserted: [] as unknown[][],
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join("?");
      if (sql.includes('INSERT INTO "ChallengePlay"')) {
        db.inserted.push(values);
        return [{ id: "play-1" }];
      }
      if (sql.includes('FROM "Challenge" c')) return db.challenge ? [db.challenge] : [];
      return [];
    },
    $executeRaw: async () => 0,
  },
}));
vi.mock("@/lib/anon-quiz", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/anon-quiz")>()),
  getAnonQuiz: async () => ({ replay: true, questions: ["A", "B", "C", "D", "A"].map((answerKey, i) => ({ id: `q${i + 1}`, answerKey })) }),
}));

import * as i18nMod from "@/lib/i18n";
import { dict, fillTemplate, type Locale, type StringKey } from "@/lib/i18n";
import { examDayClaim, phaseArticleCopy, phaseArticleMeta, type ExamNightSummary } from "@/lib/phase-article-copy";
import { buildExamNightFacts, examNightShareMessage, type ExamNightInput } from "@/lib/exam-night-facts";
import { examWeekAeoLines, type ExamWeekExam } from "@/lib/exam-week-aeo";
import { computeExamWeekState } from "@/lib/exam-week";
import { buildExamWeekIcs, examWeekCalendarRows } from "@/lib/exam-week-ics";
import { EXAM_HUB_COPY } from "@/lib/exam-hub-copy";
import { NO_PRACTICE_COPY } from "@/lib/no-practice-copy";
import { STATE_COPY } from "@/lib/state-exams-copy";
import type { TimelineInput } from "@/lib/exam-timeline";
import * as challengeMod from "@/lib/challenge";
import * as challengeCopyMod from "@/lib/challenge-copy";
import { challengeLabels } from "@/lib/challenge-copy";
import { recordChallengePlay } from "@/lib/challenge-db";
import * as shareUrlMod from "@/lib/share-url";
import * as signinCtaMod from "@/lib/signin-cta";
import * as signupPitchMod from "@/lib/signup-pitch";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const tOf = (locale: Locale) => (key: StringKey) => (dict[locale] as Record<string, string>)[key] ?? dict.en[key];
const ALERT = { en: /alert|e-?mail|subscribe/i, hi: /अलर्ट|ईमेल|सब्सक्राइब/, te: /అలర్ట్|ఈమెయిల్|సబ్‌స్క్రైబ్/ } as const;

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── a small TSX loader (tests/unit/signup-cta.test.ts's, trimmed) ───────
/** When true, each component's effects run once, synchronously, during the
 *  static render (their state updates re-render it before it is written),
 *  as a browser runs them after mount. React's server renderer ignores
 *  effects otherwise. Reset per render. */
let mounted = false;
const ran = new Set<string>();
const ReactWithEffects = {
  ...React,
  useEffect: (fn: React.EffectCallback) => {
    if (!mounted) return;
    const key = fn.toString();
    if (ran.has(key)) return;
    ran.add(key);
    fn();
  },
};

function LinkStub({ href, prefetch, children, ...rest }: { href: string; prefetch?: boolean; children?: React.ReactNode } & Record<string, unknown>) {
  void prefetch;
  return React.createElement("a", { href, ...rest }, children);
}

function loaderWith(stubs: Record<string, unknown>) {
  const loaded = new Map<string, { exports: Record<string, unknown> }>();
  const load = (rel: string): Record<string, unknown> => {
    const file = path.normalize(path.join(ROOT, rel));
    const hit = loaded.get(file);
    if (hit) return hit.exports;
    const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      fileName: file,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const mod = { exports: {} as Record<string, unknown> };
    loaded.set(file, mod);
    const req = (spec: string): unknown => {
      if (spec in stubs) return stubs[spec];
      if (spec.startsWith("@/components/")) return load(`src/components/${spec.slice("@/components/".length)}.tsx`);
      throw new Error(`${rel} imports an unexpected module: ${spec}`);
    };
    new Function("require", "module", "exports", "process", out)(req, mod, mod.exports, process);
    return mod.exports;
  };
  return load;
}

type FC<P> = (p: P) => React.ReactElement | null;
function render<P extends object>(C: unknown, props: P, opts: { mounted?: boolean } = {}): string {
  mounted = opts.mounted === true;
  ran.clear();
  try {
    return renderToStaticMarkup(React.createElement(C as FC<P>, props));
  } finally {
    mounted = false;
  }
}
const textOf = (html: string) =>
  html
    .replace(/<svg[\s\S]*?<\/svg>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

describe("B1. the /updates FAQ on a kids' exam offers no alerts", () => {
  it("a no-alerts answer exists in en, hi and te, and names no alert, email or sign-up", () => {
    for (const lc of ["en", "hi", "te"] as const) {
      const v = (dict[lc] as Record<string, string>)["tracker.faq.a.unknownNoAlerts"];
      expect(v, lc).toBeTruthy();
      expect(v, lc).not.toMatch(ALERT[lc]);
      expect(v, lc).not.toMatch(/sign|साइन|సైన్/i);
      // the old answer still offers them (13+ exams keep their alert box)
      expect((dict[lc] as Record<string, string>)["tracker.faq.a.unknown"], lc).toMatch(ALERT[lc]);
    }
  });

  it("(source) the page picks it by under13ExamGuard, so the FAQPage JSON-LD (built from the same answers) follows", () => {
    const page = read("src/app/exams/[code]/updates/page.tsx");
    expect(page).toContain('import { under13ExamGuard } from "@/lib/signin-cta";');
    expect(page).toContain('if (!row) a = t(under13ExamGuard(exam.code) ? "tracker.faq.a.unknownNoAlerts" : "tracker.faq.a.unknown");');
    expect(page).not.toMatch(/a = t\("tracker\.faq\.a\.unknown"\)/);
    expect(page).toContain('mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } }))');
  });
});

// ── /live and /reactions ─────────────────────────────────────────────────
const row = (id: string, day: string): TimelineInput => ({
  id,
  label: "Exam",
  date: `${day}T00:00:00.000Z`,
  isExamDay: true,
  kind: "EXAM",
  confidence: "official",
  url: "https://sofworld.org/n",
  source: "official-research:test",
});
const TONIGHT = new Date("2026-10-23T13:00:00Z");
const claim = examDayClaim([row("a", "2026-10-23")], "https://sofworld.org", TONIGHT);
const later = examDayClaim([row("a", "2026-11-20")], "https://sofworld.org", new Date("2026-10-12T04:00:00Z"));
const none = examDayClaim([], "https://sofworld.org", TONIGHT);
const NOTHING: ExamNightSummary = {
  poll: false,
  tally: false,
  keyStatus: false,
  questionPaper: false,
  cutoffEstimate: false,
  estimator: false,
  pyq: false,
  nextStage: false,
  article: false,
};
const SOME: ExamNightSummary = { ...NOTHING, poll: true, keyStatus: true, pyq: true };

/** buildExamNightFacts' input for one exam: one official exam day, 23 Oct. */
function nightInput(code: string, shortName: string, phase: "LIVE" | "REACTIONS" = "LIVE"): ExamNightInput {
  return {
    exam: { id: `e-${code}`, code, shortName, name: shortName, active: true, totalQuestions: 50, scoredQuestions: null, totalMarks: 60, marksPerQ: 1, description: "" },
    rows: [row("a", "2026-10-23")],
    officialUrl: "https://sofworld.org",
    tally: null,
    phase,
    subjects: [],
    pyq: null,
    fullMockId: null,
    hasCutoffPage: false,
    strictArticle: { LIVE: false, REACTIONS: false },
  };
}

describe("B2. /live and /reactions on a kids' exam name no alerts", () => {
  it("the tagline, in en, hi and te, with something on the page and with nothing", () => {
    for (const lc of ["en", "hi", "te"] as const) {
      const t = tOf(lc);
      for (const phase of ["LIVE", "REACTIONS"] as const) {
        for (const c of [claim, later, none]) {
          const kids = phaseArticleCopy(phase, "SOF IMO", c, { ...SOME, alerts: false }, t);
          expect(kids.tagline, `${lc} ${phase}`).not.toMatch(ALERT[lc]);
          const adult = phaseArticleCopy(phase, "SSC CGL", c, SOME, t);
          expect(adult.tagline, `${lc} ${phase}`).toContain(t("phase.holds.alerts"));
          // nothing else on the page: no empty "On this page: ." sentence
          const bare = phaseArticleCopy(phase, "SOF IMO", c, { ...NOTHING, alerts: false }, t);
          expect(bare.tagline, `${lc} ${phase}`).not.toContain(t("phase.onThisPage").split("{list}")[0].trim());
          expect(bare.tagline.trim().length).toBeGreaterThan(0);
          expect(bare.tagline).not.toMatch(/\s$/);
        }
      }
    }
  });

  it("the <title>, description and og lines", () => {
    const exam = { shortName: "SOF IMO", name: "International Mathematics Olympiad" };
    for (const phase of ["LIVE", "REACTIONS"] as const) {
      for (const c of [claim, later, none]) {
        for (const sm of [SOME, NOTHING]) {
          const kids = phaseArticleMeta(phase, exam, c, { ...sm, alerts: false });
          for (const [k, v] of Object.entries(kids)) {
            expect(v, `${phase} ${k}`).not.toMatch(/alert/i);
            expect(v.trim(), `${phase} ${k}`).toBe(v);
            expect(v.length, `${phase} ${k}`).toBeGreaterThan(0);
          }
          const adult = phaseArticleMeta(phase, exam, c, sm);
          expect(adult.description, phase).toMatch(/free email alerts\.$/);
          expect(adult.ogDescription, phase).toMatch(/free email alerts\.$/);
        }
      }
    }
    // no summary flag at all = as before (the alert box renders)
    expect(phaseArticleMeta("LIVE", exam, none, NOTHING).title).toContain("free alerts");
    expect(phaseArticleMeta("LIVE", exam, none, { ...NOTHING, alerts: false }).title).not.toContain("alerts");
  });

  it("the share text", () => {
    for (const lc of ["en", "hi", "te"] as const) {
      const t = tOf(lc);
      const kids = examNightShareMessage("SOF IMO", { examDay: null, summary: { ...NOTHING, alerts: false } } as never, t);
      expect(kids, lc).not.toMatch(ALERT[lc]);
      expect(kids, lc).toContain(t("ew.night.share.defaultNoAlerts"));
      expect(examNightShareMessage("SSC CGL", { examDay: null, summary: NOTHING } as never, t), lc).toContain(t("ew.night.share.default"));
    }
  });

  // Round 2: this was a source pin of the flag's line; now the built facts.
  it("the summary sets alerts from the exam code: buildExamNightFacts for SOF_IMO and SSC_CGL, through to the tagline and meta", () => {
    const fmt = { tierWord: (tier: string) => tier, now: TONIGHT };
    for (const phase of ["LIVE", "REACTIONS"] as const) {
      const kids = buildExamNightFacts(nightInput("SOF_IMO", "SOF IMO", phase), fmt);
      const adult = buildExamNightFacts(nightInput("SSC_CGL", "SSC CGL", phase), fmt);
      expect(kids.summary.alerts, phase).toBe(false);
      expect(adult.summary.alerts, phase).toBe(true);
      // the rest of the summary does not depend on the exam code
      expect({ ...kids.summary, alerts: true }, phase).toEqual(adult.summary);
      for (const lc of ["en", "hi", "te"] as const) {
        const t = tOf(lc);
        expect(phaseArticleCopy(phase, "SOF IMO", claim, kids.summary, t).tagline, `${lc} ${phase}`).not.toMatch(ALERT[lc]);
        expect(phaseArticleCopy(phase, "SSC CGL", claim, adult.summary, t).tagline, `${lc} ${phase}`).toContain(t("phase.holds.alerts"));
        expect(examNightShareMessage("SOF IMO", kids, t), `${lc} ${phase}`).not.toMatch(ALERT[lc]);
      }
      const exam = { shortName: "SOF IMO", name: "SOF IMO" };
      for (const v of Object.values(phaseArticleMeta(phase, exam, claim, kids.summary))) expect(v, phase).not.toMatch(/alert/i);
      expect(phaseArticleMeta(phase, { shortName: "SSC CGL", name: "SSC CGL" }, claim, adult.summary).description, phase).toMatch(/free email alerts\.$/);
    }
  });
});

// ── machine-readable files ───────────────────────────────────────────────
const NOW = new Date("2026-10-22T11:00:00Z"); // the eve of a 23 Oct exam day
const weekExam = (code: string, shortName: string): ExamWeekExam => ({
  id: `e-${code}`,
  code,
  shortName,
  name: shortName,
  officialUrl: "https://example.org",
  state: computeExamWeekState(
    [{ id: "x", label: "Exam", date: "2026-10-23T00:00:00.000Z", isExamDay: true, kind: "EXAM", confidence: "official", url: "https://example.org/n.pdf", source: "official-research:test" }],
    "https://example.org",
    NOW,
  ),
  scheme: { totalQuestions: 50, scoredQuestions: null, totalMarks: 60, marksPerQ: 1, negativeMark: 0, description: "" },
});

describe("S2. context.md, llms-full.txt, the exam-week block and the .ics offer no alerts for a kids' exam", () => {
  it("the exam-week block (context.md and llms-full.txt print it)", () => {
    const kids = examWeekAeoLines(weekExam("SOF_IMO", "SOF IMO"), { now: NOW }).join("\n");
    expect(kids).toContain("https://shishya.in/exams/SOF_IMO/updates");
    expect(kids).not.toMatch(/alert/i);
    const adult = examWeekAeoLines(weekExam("SSC_CGL", "SSC CGL"), { now: NOW }).join("\n");
    expect(adult).toContain("free email alerts for official answer key / result");
  });

  it("the .ics description", () => {
    const rows = [{ id: "d1", label: "Exam", date: "2026-10-23T00:00:00.000Z", isExamDay: true, kind: "EXAM", confidence: "official", url: "https://example.org/n.pdf", source: "official-research:test" }];
    const events = examWeekCalendarRows(rows, "https://example.org", NOW);
    const unfold = (s: string) => s.replace(/\r\n[ \t]/g, "");
    const kids = unfold(buildExamWeekIcs({ code: "SOF_IMO", shortName: "SOF IMO", name: "SOF IMO" }, events, NOW));
    expect(kids).toContain("Tracker (every date with its source tier): https://shishya.in/exams/SOF_IMO/updates");
    expect(kids).not.toMatch(/alert/i);
    const adult = unfold(buildExamWeekIcs({ code: "SSC_CGL", shortName: "SSC CGL", name: "SSC CGL" }, events, NOW));
    expect(adult).toContain("free alerts");
  });

  it("(source) context.md: no alerts, no coach plan and no chat sign-in line for a kids' exam", () => {
    const src = read("src/app/exams/[code]/context.md/route.ts");
    expect(src).toContain('import { under13ExamGuard } from "@/lib/signin-cta";');
    expect(src).toContain('`- Live tracker (all milestones${under13ExamGuard(exam.code) ? "" : ", alerts"}): ${SITE}/exams/${exam.code}/updates`');
    expect(src).toContain('`- Date/admit-card/result tracker${under13ExamGuard(exam.code) ? "" : " + free email alerts"}: ${SITE}/exams/${exam.code}/updates`');
    expect(src).toContain("if (practice.hasPractice && !under13ExamGuard(exam.code)) L.push(`- Free day-by-day study plan (personal coach): ${SITE}/coach`);");
    expect(src).toMatch(/if \(!under13ExamGuard\(exam\.code\)\) \{\n\s+L\.push\(`- Chat tutor \(free;/);
    expect(src).not.toMatch(/free email alerts: \$\{SITE\}/);
  });

  it("(source) llms-full.txt: the per-exam tracker line", () => {
    const src = read("src/app/llms-full.txt/route.ts");
    expect(src).toContain('import { under13ExamGuard } from "@/lib/signin-cta";');
    expect(src).toContain('(official vs expected${under13ExamGuard(e.code) ? "" : ", email alerts"})');
    expect(src).not.toContain("(official vs expected, email alerts)");
  });
});

describe("B2. no sign-in page or header sign-up for a guest on a kids' exam's mock or challenge", () => {
  it("(source) /mocks/{id}: a guest on a kids' exam goes to the no-sign-in quiz before any gate, paper or /login bounce", () => {
    const page = read("src/app/mocks/[id]/page.tsx");
    const guest = page.slice(page.indexOf("if (!session?.user?.id) {"));
    const kids = guest.indexOf("if (under13ExamGuard(guestMock.exam.code)) redirect(kidsPracticeHref(guestMock.exam.code));");
    expect(kids).toBeGreaterThan(guest.indexOf("if (!guestMock) notFound();"));
    for (const later of ["if (guestMock.userId) redirect(gateLoginRedirectPath(", "if (GUEST_WHOLE_PAPER_OPEN", "<MockRebuilding", "<MockGate"]) {
      expect(guest.indexOf(later), later).toBeGreaterThan(kids);
    }
    expect(page).toContain('import { kidsPracticeHref, under13ExamGuard } from "@/lib/signin-cta";');
  });

  it("(source) /c/{token}: the header is child-safe for a kids' exam", () => {
    const page = read("src/app/c/[token]/page.tsx");
    expect(page).toContain("<Header childSafe={under13ExamGuard(ch.examCode)} />");
    expect(page).not.toMatch(/<Header \/>/);
  });
});

// ── the challenge components, rendered ───────────────────────────────────
let madeKey: string | null = null;
let played: { correct: number; creatorCorrect: number; total: number; choices: (string | null)[] } | null = null;
const loadChallenge = loaderWith({
  react: ReactWithEffects,
  "react/jsx-runtime": jsxRuntime,
  "next/link": { __esModule: true, default: LinkStub },
  "@/lib/i18n": i18nMod,
  "@/lib/challenge": challengeMod,
  "@/lib/challenge-copy": challengeCopyMod,
  "@/lib/challenge-local": { rememberMadeChallenge: () => undefined, madeChallengeKey: () => madeKey, playedChallenge: () => played },
  // a phone where web push works (the button's own test, after mount)
  "@/lib/push-client": { pushSupported: () => true, subscribeThisDevice: async () => ({ ok: false, reason: "dismissed" }) },
  "@/lib/share-url": shareUrlMod,
  "@/lib/signin-cta": signinCtaMod,
  "@/components/AnonQuizPlayer": { AnonQuizPlayer: () => null },
  "@/components/SignUpButton": { SignUpButton: () => null },
});
const CC = loadChallenge("src/components/ChallengeCard.tsx") as { ChallengeCard: unknown; ChallengeShare: unknown };
const CL = loadChallenge("src/app/c/[token]/ChallengeLanding.tsx") as { ChallengeLanding: unknown };
const L = challengeLabels(tOf("en"));
const KIDS_TOKEN = "FaGSzMzJX7"; // a live SOF IEO challenge on 12 Oct (made from a member's mock)
const CGL_TOKEN = "s5TzJRCEVV";
const landingData = (token: string, examCode: string) => ({
  token,
  examCode,
  examShort: examCode.replace("_", " "),
  questionCount: 5,
  creatorName: null,
  creatorCorrect: 3,
  fromMock: true,
  expiresAt: "2026-11-02T08:06:02.355Z",
});

describe("S3. no name field and nothing sent from a kids' exam's quiz or challenge", () => {
  it("(source) AnonQuizPlayer: no challenge card and no 'send your score' step", () => {
    const src = read("src/components/AnonQuizPlayer.tsx");
    expect(src).toContain("if (challenge && !under13ExamGuard(quiz.examCode)) setAskToSend(true);");
    expect(src).toContain("{qs.length >= CHALLENGE_MIN_QUESTIONS && !kidsExam && (");
    expect(src.indexOf("const kidsExam = under13ExamGuard(quiz.examCode);")).toBeLessThan(src.indexOf("!kidsExam && ("));
  });

  it("ChallengeLanding, a friend's first view: no 'you choose whether to send' line on a kids' exam; SSC CGL keeps it", () => {
    const kids = textOf(render(CL.ChallengeLanding, { data: landingData(KIDS_TOKEN, "SOF_IEO"), quiz: {}, isCreatorSession: false, labels: L, quizLabels: {}, locale: "en" }));
    const adult = textOf(render(CL.ChallengeLanding, { data: landingData(CGL_TOKEN, "SSC_CGL"), quiz: {}, isCreatorSession: false, labels: L, quizLabels: {}, locale: "en" }));
    expect(kids).toContain(fillTemplate(L["challenge.intro.start"], { n: 5 }));
    expect(kids).not.toContain(L["challenge.intro.choice"]);
    expect(adult).toContain(L["challenge.intro.choice"]);
  });

  it("ChallengeLanding, after a friend played: no chain card (its name field) on a kids' exam; SSC CGL keeps it", () => {
    played = { correct: 4, creatorCorrect: 3, total: 5, choices: ["A", "B", "C", "D", null] };
    try {
      const kids = render(CL.ChallengeLanding, { data: landingData(KIDS_TOKEN, "SOF_IEO"), quiz: {}, isCreatorSession: false, labels: L, quizLabels: {}, locale: "en" }, { mounted: true });
      const adult = render(CL.ChallengeLanding, { data: landingData(CGL_TOKEN, "SSC_CGL"), quiz: {}, isCreatorSession: false, labels: L, quizLabels: {}, locale: "en" }, { mounted: true });
      expect(textOf(kids)).toContain(L["challenge.played.kicker"]);
      expect(kids).not.toContain('id="challenge-name-challenge"');
      expect(textOf(adult)).toContain(L["challenge.played.kicker"]);
      expect(adult).toContain('id="challenge-name-challenge"');
    } finally {
      played = null;
    }
  });
});

describe("B1 (round 2). the challenger's copy on a kids' exam says friends' scores are not sent back", () => {
  it("the three new lines exist in en, hi and te; the old ones still promise replies", () => {
    for (const lc of ["en", "hi", "te"] as const) {
      const D = dict[lc] as Record<string, string>;
      for (const k of ["challenge.card.fineNoReplies", "challenge.card.fineNameNoReplies", "challenge.share.descNoReplies"] as const) {
        expect(D[k]?.trim(), `${lc} ${k}`).toBeTruthy();
        // a reply-free line: nothing about sending a score back to you
        expect(D[k], `${lc} ${k}`).not.toBe(D[k.replace("NoReplies", "")]);
        if (lc !== "en") expect(D[k], `${lc} ${k}`).not.toBe(dict.en[k]);
      }
      expect(D["challenge.share.descNoReplies"], lc).toContain("{total}");
    }
    expect(dict.en["challenge.card.fineNoReplies"]).toBe("Friends see your score and play the same questions free, with no sign-in. On this exam their scores are not sent back.");
    expect(dict.en["challenge.card.fine"]).toContain("can send you their score");
    expect(challengeCopyMod.CHALLENGE_I18N_KEYS).toEqual(expect.arrayContaining(["challenge.card.fineNoReplies", "challenge.card.fineNameNoReplies", "challenge.share.descNoReplies"]));
  });

  it("ChallengeCard: the small print, kids' exam vs SSC CGL", () => {
    const card = (examCode: string) =>
      textOf(render(CC.ChallengeCard, { from: { source: "mock", attemptId: "a1" }, examCode, examShort: "X", surface: "results", heading: "H", labels: L, locale: "en" }));
    const kids = card("SOF_IEO");
    expect(kids).toContain(L["challenge.card.fineNoReplies"]);
    expect(kids).not.toContain("can send you their score");
    const adult = card("SSC_CGL");
    expect(adult).toContain(L["challenge.card.fine"]);
    expect(adult).not.toContain("not sent back");
    // the hi / te card picks the same keys
    for (const lc of ["hi", "te"] as const) {
      const Lx = challengeLabels(tOf(lc));
      const html = textOf(render(CC.ChallengeCard, { from: { source: "mock", attemptId: "a1" }, examCode: "SOF_IGKO", examShort: "X", surface: "results", heading: "H", labels: Lx, locale: lc }));
      expect(html, lc).toContain(Lx["challenge.card.fineNoReplies"]);
      expect(html, lc).not.toContain(Lx["challenge.card.fine"]);
    }
  });

  it("ChallengeShare (after mount, on a phone with web push): no notification button and no 'See who played' on a kids' exam; SSC CGL keeps both", () => {
    const share = (token: string, examCode: string) =>
      render(CC.ChallengeShare, { token, creatorKey: "k", examCode, examShort: "X", correct: 3, total: 5, fromMock: true, title: "T", labels: L }, { mounted: true });
    const kids = share(KIDS_TOKEN, "SOF_IEO");
    expect(textOf(kids)).toContain(fillTemplate(L["challenge.share.descNoReplies"], { total: 5 }));
    expect(textOf(kids)).not.toContain(L["challenge.watch.button"]);
    expect(kids).not.toContain(`href="/c/${KIDS_TOKEN}"`);
    expect(textOf(kids)).not.toContain(L["challenge.share.seeScores"]);
    const adult = share(CGL_TOKEN, "SSC_CGL");
    expect(textOf(adult)).toContain(fillTemplate(L["challenge.share.desc"], { total: 5 }));
    expect(textOf(adult)).toContain(L["challenge.watch.button"]);
    expect(adult).toContain(`href="/c/${CGL_TOKEN}"`);
    expect(textOf(adult)).toContain(L["challenge.share.seeScores"]);
  });

  it("/c/{token}, the challenger's view (after mount): the no-replies line instead of the plays, 'scores appear here' and 'friends who chose to send'", () => {
    vi.stubGlobal("fetch", () => new Promise(() => {})); // the plays request never answers here
    madeKey = "k";
    try {
      const view = (token: string, examCode: string) =>
        textOf(render(CL.ChallengeLanding, { data: landingData(token, examCode), quiz: {}, isCreatorSession: false, labels: L, quizLabels: {}, locale: "en" }, { mounted: true }));
      const h1 = fillTemplate(L["challenge.creator.h1Mock"], { correct: 3, n: 5 });
      const footer = L["challenge.creator.footer"].split("{date}")[0].split(".")[0];
      const kids = view(KIDS_TOKEN, "SOF_IEO");
      expect(kids).toContain(h1);
      expect(kids).toContain(L["challenge.card.fineNoReplies"]);
      expect(kids).not.toContain(L["challenge.creator.loading"]);
      expect(kids).not.toContain(L["challenge.creator.none"].split(".")[0]);
      expect(kids).not.toContain(footer);
      expect(kids).not.toContain(L["challenge.watch.button"]);
      expect(kids).toContain(fillTemplate(L["challenge.share.descNoReplies"], { total: 5 }));
      const adult = view(CGL_TOKEN, "SSC_CGL");
      expect(adult).toContain(h1);
      expect(adult).toContain(L["challenge.creator.loading"]);
      expect(adult).toContain(footer);
      expect(adult).toContain(L["challenge.watch.button"]);
      expect(adult).not.toContain("not sent back");
    } finally {
      madeKey = null;
    }
  });

  it("/api/challenge/{token}/play (recordChallengePlay): nothing stored on a kids' exam (so no notify); SSC CGL stores the play with its name", async () => {
    const challengeRow = (examCode: string) => ({
      id: KIDS_TOKEN,
      examId: "e1",
      examCode,
      examShort: examCode,
      examName: examCode,
      examCategory: "X",
      source: "quiz",
      sourceRef: null,
      questionIds: ["q1", "q2", "q3", "q4", "q5"],
      creatorUserId: "creator",
      creatorAnonId: null,
      creatorKeyHash: "x",
      creatorName: null,
      creatorCorrect: 3,
      questionCount: 5,
      locale: "en",
      createdAt: new Date("2026-10-12T00:00:00Z"),
      expiresAt: new Date(Date.now() + 86_400_000),
      lastEmailAt: null,
      lastPushAt: null,
    });
    for (const examCode of ["SOF_IEO", "SOF_IGKO"]) {
      db.challenge = challengeRow(examCode);
      db.inserted = [];
      const r = await recordChallengePlay(KIDS_TOKEN, { playerKey: "p".repeat(32), choices: ["A", "B", null, null, null], name: "Ravi" }, { userId: null, anonId: null });
      // graded for the player, but no row: the route's notify runs only when stored
      expect(r.ok, examCode).toBe(true);
      expect(r.ok && r.stored, examCode).toBe(false);
      expect(r.ok && r.correct, examCode).toBe(2);
      expect(db.inserted, examCode).toHaveLength(0);
    }
    db.challenge = challengeRow("SSC_CGL");
    db.inserted = [];
    const adult = await recordChallengePlay(KIDS_TOKEN, { playerKey: "p".repeat(32), choices: ["A", "B", null, null, null], name: "Ravi" }, { userId: null, anonId: null });
    expect(adult.ok && adult.stored).toBe(true);
    expect(db.inserted).toHaveLength(1);
    // VALUES (id, challengeId, playerUserId, playerAnonId, playerKeyHash, playerName, choices, correct)
    expect(db.inserted[0][5]).toBe("Ravi");
    expect(db.inserted[0][7]).toBe(2);
    db.challenge = null;
  });
});

describe("S1 (round 2). the footer sign-up card: none on a kids' exam's challenge page", () => {
  let pageData: { code?: string | null } | null = null;
  const loadPitch = loaderWith({
    react: ReactWithEffects,
    "react/jsx-runtime": jsxRuntime,
    "next/navigation": { usePathname: () => `/c/${KIDS_TOKEN}` },
    // a guest: the session check answers "signed out" (synchronously here)
    "@/lib/session-hint": { fetchSignedIn: () => ({ then: (ok: (v: boolean) => void) => (ok(false), { catch: () => undefined }) }) },
    "@/lib/ui-locale-copy": { clientUiLocale: () => "en" },
    "@/lib/signup-pitch": signupPitchMod,
    "@/components/SignUpButton": { SignUpButton: () => React.createElement("a", { "data-stub": "sign-up" }, "BUTTON") },
    "@/lib/signin-cta": signinCtaMod,
    "@/lib/use-signup-words": { useSignUpPageData: () => pageData },
  });
  const P = loadPitch("src/components/SignupPitch.tsx") as { SignupPitch: unknown };
  const title = signupPitchMod.signupPitchCopy("en").title;

  it("a guest on /c/{token}: no card when the page says the exam is a kids' one; the card for SSC CGL and before the page says", () => {
    vi.stubGlobal("location", { pathname: `/c/${KIDS_TOKEN}`, search: "" });
    const at = (code: string | null) => {
      pageData = code === null ? null : { code };
      try {
        return render(P.SignupPitch, {}, { mounted: true });
      } finally {
        pageData = null;
      }
    };
    expect(at("SOF_IEO")).toBe("");
    expect(at("SOF_IGKO")).toBe("");
    const adult = at("SSC_CGL");
    expect(textOf(adult)).toContain(title);
    expect(adult).toContain('data-stub="sign-up"');
    // the page's island has not said yet (null): as before, the card
    expect(textOf(at(null))).toContain(title);
  });

  it("nothing on the server (no effects run), as before", () => {
    pageData = { code: "SSC_CGL" };
    try {
      expect(render(P.SignupPitch, {})).toBe("");
    } finally {
      pageData = null;
    }
  });
});

describe("S2 (round 2). the /mocks/{id} and /chat loading skeletons ask for the child-safe header", () => {
  it("each skeleton renders <Header childSafe />", () => {
    for (const rel of ["src/app/mocks/[id]/loading.tsx", "src/app/chat/loading.tsx"]) {
      const seen: Record<string, unknown>[] = [];
      const load = loaderWith({
        react: React,
        "react/jsx-runtime": jsxRuntime,
        "@/components/Header": { Header: (p: Record<string, unknown>) => (seen.push(p), null) },
      });
      const mod = load(rel) as { default: unknown };
      render(mod.default, {});
      expect(seen, rel).toEqual([{ childSafe: true }]);
    }
  });

  it("(source) childSafe drops only the guest branch of the header's account controls: the signed-in branch comes first", () => {
    const src = read("src/components/HeaderAuthControls.tsx");
    const jsx = src.slice(src.indexOf("<LangSwitcher current={safeLocale}"));
    expect(jsx.indexOf("{signedIn ? (")).toBeGreaterThan(0);
    expect(jsx.indexOf("{signedIn ? (")).toBeLessThan(jsx.indexOf(") : childSafe || isUnder13SchoolPath(pathname) ? null"));
  });
});

describe("S1. the hub's guest box on a kids' exam names no tutor and no account", () => {
  const TUTOR_OR_ACCOUNT = /ask|tutor|account|plan|sign up|पूछ|अकाउंट|प्लान|అకౌంట్|ప్లాన్|అడగ/i;
  it("its words, en / hi / te", () => {
    for (const lc of ["en", "hi", "te"] as const) {
      const H = EXAM_HUB_COPY[lc];
      expect(H.coachTitleKids, lc).toContain("{short}");
      expect(`${H.coachTitleKids} ${H.coachBodyKids}`, lc).not.toMatch(TUTOR_OR_ACCOUNT);
      expect(`${H.coachTitleKids} ${H.coachBodyKids}`, lc).not.toMatch(/mock|मॉक|మాక్/i);
      expect(H.coachBodyKids, lc).toContain("AI");
      expect(H.coachBodyKids, lc).toContain("5");
      // the 13+ box is unchanged
      expect(`${H.coachBodyA} ${H.coachBodyB}`, lc).toMatch(TUTOR_OR_ACCOUNT);
    }
  });

  it("(source) the hub uses them by under13ExamGuard inside the guest box", () => {
    const hub = read("src/app/exams/[code]/page.tsx");
    expect(hub).toContain("const kidsHub = under13ExamGuard(exam.code);");
    const box = hub.slice(hub.indexOf("{!userId && hasContent && ("));
    expect(box.indexOf("kidsHub ? H.coachTitleKids : ctaCopy?.coachTitle ?? H.coachTitle")).toBeGreaterThan(0);
    expect(box.indexOf("{H.coachBodyKids}")).toBeGreaterThan(0);
    expect(box.indexOf("{H.coachBodyKids}")).toBeLessThan(box.indexOf("<HubSignInLink"));
  });
});

describe("S4. 'announced' no longer describes Reported dates (which may be unchecked AI finds)", () => {
  it("the no-practice panel's dates note and the state page's heading", () => {
    const ANNOUNCED = { en: /announced/i, hi: /घोषित/, te: /ప్రకటించ/ } as const;
    for (const lc of ["en", "hi", "te"] as const) {
      expect(NO_PRACTICE_COPY[lc].datesNote, lc).not.toMatch(ANNOUNCED[lc]);
      expect(STATE_COPY[lc].upcomingHeading, lc).not.toMatch(ANNOUNCED[lc]);
    }
    expect(NO_PRACTICE_COPY.en.datesNote).toContain("reported (not yet checked against an official notice)");
    expect(STATE_COPY.en.upcomingHeading).toBe("Upcoming dates");
  });

  it("(round 2) the note speaks for its own box, and names each tier with the word the box prints (ew.tier.*)", () => {
    expect(NO_PRACTICE_COPY.en.datesNote).toMatch(/^No estimated dates are listed in this box; /);
    expect(NO_PRACTICE_COPY.hi.datesNote).toMatch(/^इस बॉक्स में /);
    expect(NO_PRACTICE_COPY.te.datesNote).toMatch(/^ఈ బాక్స్‌లో /);
    for (const lc of ["en", "hi", "te"] as const) {
      const t = tOf(lc);
      expect(NO_PRACTICE_COPY[lc].datesNote, lc).toContain(`${t("ew.tier.official")} (`);
      expect(NO_PRACTICE_COPY[lc].datesNote, lc).toContain(`${t("ew.tier.reported")} (`);
    }
    expect(NO_PRACTICE_COPY.te.datesNote).toContain("నివేదిత (");
    expect(NO_PRACTICE_COPY.te.datesNote).not.toContain("రిపోర్టెడ్");
  });
});
