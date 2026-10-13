// Quality guards on replies from Surge's own server (13 Oct 2026), built
// from the 12-13 Oct Qwen 27B vs Claude audit's real failing cases: explain
// (a disputed key goes to Claude), coach-day (no "0%" score claims, no
// "notes coming" promises), student-360 (no hours read from app-event
// counts, no mentor brief written to the student, no invented study habit),
// plus the student-360 fix for Claude's reads cut off at max_tokens.
// No DB, no network, no model. Run: npx vitest run tests/unit/local-quality-guards.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/ai/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/client")>()),
  callClaude: vi.fn(),
}));

import { callClaude } from "@/lib/ai/client";
import { explainLocalCheck, explainSolution } from "@/lib/ai/explainer";
import { coachDayLocalCheck, masteryText } from "@/lib/coach-plan";
import { coachReadLocalCheck, coachReadRequest, finishCoachRead, type Student360 } from "@/lib/student-360";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const msg = (text: string, stop = "end_turn") =>
  ({ content: [{ type: "text", text }], model: "local:qwen3.8-27b", stop_reason: stop, usage: { input_tokens: 1, output_tokens: 1 } }) as any;

// ── explain ───────────────────────────────────────────────────────────

// Audit case K:cmozqrmee… (RRB NTPC jumbling, served key A, true key C =
// QPRS): Qwen disputed correctly but said QPRS "is not listed" — it is option C.
const LOCAL_FALSE_DISPUTE = JSON.stringify({
  keyDisputed: true,
  keyDisputeReason:
    "Option A (QRSP) forms the ungrammatical sequence 'the economy has been growing at a steady pace of the country', whereas the only grammatically correct arrangement is QPRS, which is not listed among the options.",
  stepByStep: [],
  whyChosenIsWrong: null,
  similarConcepts: ["Sentence Rearrangement", "Grammar & Usage", "Logical Ordering"],
  practiceTopicCode: "verbal.sentence.rearrangement",
});
// Audit case R:cmp03wlxo… (TNPSC Group 4, time and work): a tie with Claude.
const LOCAL_GOOD_EXPLAIN = JSON.stringify({
  keyDisputed: false,
  keyDisputeReason: null,
  stepByStep: [
    "A's one-day work rate is 1/12 of the total work.",
    "B's one-day work rate is 1/18 of the total work.",
    "Combined one-day work rate is 1/12 + 1/18.",
    "Using LCM of 12 and 18 (which is 36), convert fractions: 3/36 + 2/36 = 5/36.",
    "Total days required = 1 / (5/36) = 36/5 = 7.2 days.",
  ],
  whyChosenIsWrong: "Option C (8 days) is incorrect because the combined rate is 5/36 per day, which results in 7.2 days, not 8.",
  similarConcepts: ["Work & Time", "Rates and Ratios"],
  practiceTopicCode: "math.work_time",
});

describe("explainLocalCheck", () => {
  it("sends a disputed key to Claude (the audit's one English local critical)", () => {
    expect(explainLocalCheck(LOCAL_FALSE_DISPUTE)).toBe("key disputed");
  });
  it("serves a normal explanation, fenced or not", () => {
    expect(explainLocalCheck(LOCAL_GOOD_EXPLAIN)).toBeNull();
    expect(explainLocalCheck("```json\n" + LOCAL_GOOD_EXPLAIN + "\n```")).toBeNull();
  });
  it("sends a reply the app cannot render to Claude", () => {
    expect(explainLocalCheck(LOCAL_GOOD_EXPLAIN.slice(0, 200))).toBe("not JSON");
    expect(explainLocalCheck("Here is the explanation: B is right.")).toBe("not JSON");
    expect(explainLocalCheck(JSON.stringify({ keyDisputed: false, stepByStep: ["Wait, let me reconsider.", "Actually B."] }))).toBe("no steps");
  });
  it("explainSolution hands the check to callClaude, and it reads the local message", async () => {
    vi.mocked(callClaude).mockResolvedValueOnce({ response: msg(LOCAL_GOOD_EXPLAIN), stats: {} as any });
    await explainSolution({
      question: { id: "q1", topicId: "t", topicCode: "", difficulty: 2, body: "Work?", options: [{ key: "A", text: "6" }, { key: "B", text: "7.2" }], answerKey: "B", solution: null, language: "EN" } as any,
      studentChosen: "A",
      language: "EN" as any,
    });
    const opts = vi.mocked(callClaude).mock.calls.at(-1)![0];
    expect(opts.feature).toBe("explain");
    expect(opts.acceptLocal?.(msg(LOCAL_FALSE_DISPUTE))).toBe("key disputed");
    expect(opts.acceptLocal?.(msg(LOCAL_GOOD_EXPLAIN))).toBeNull();
  });
});

// ── coach-day ─────────────────────────────────────────────────────────

const day = (taskIds: string[], note: string) => JSON.stringify({ taskIds, note });

describe("coachDayLocalCheck", () => {
  // The audit's 5 local critical notes (31 real plan-holders), each with its MENU ids.
  const TAMIL = ["fullmock", "daily5", "read:tamil.comprehension", "read:tamil.comprehension.passage", "read:tamil.epics", "read:tamil.epics.silappathikaram"];
  const criticals: [string, string, string[], string][] = [
    [
      "cmub92kwy (TNPSC Group IV): unmeasured 0% called a score",
      day(["read:tamil.comprehension.passage", "read:tamil.epics.silappathikaram", "daily5"], "Your 92% in the subject mock shows you have the core down, but those 0% Tamil comprehension scores are the gap we need to close. Let's tackle the hardest cognitive work first with Unseen Passages, then shift to the epics to keep the momentum going."),
      TAMIL,
      "note quotes 0%",
    ],
    [
      "cmv1ti5v6 (TNPSC, day 4): unmeasured topic presented as measured at 0%",
      day(["read:tamil.comprehension", "read:tamil.epics", "daily5"], "Plan rebuilt for today. Since your comprehension mastery is at 0%, we are starting with the core notes to build a foundation before tackling specific sub-topics like idioms or passages. 📚"),
      TAMIL,
      "note quotes 0%",
    ],
    [
      "cmssof6lf (Karnataka): 0% mastery gaps",
      day(["test:ka.economy.administration", "test:ka.culture.cinema", "daily5"], "Plan rebuilt for today. Let's tackle the 0% mastery gaps in Karnataka Administration and Culture with focused drills to build your foundation."),
      ["fullmock", "daily5", "test:ka.culture.cinema", "test:ka.economy.administration"],
      "note quotes 0%",
    ],
    [
      "cmpseb7bn (AMVI): your 0% mastery",
      day(["test:auto.trans.differential", "test:mv.act.1988", "test:gs.cur.ap"], "Plan rebuilt for today. Let's tackle your 0% mastery on Differential & Final Drive first, then move to the Motor Vehicles Act to build a base before the 59-day mark. 🚀"),
      ["fullmock", "daily5", "test:auto.trans.differential", "test:mv.act.1988", "test:gs.cur.ap"],
      "note quotes 0%",
    ],
    [
      "cmuxrk0vf (WBPSC Clerkship): hints notes are coming",
      day(["test:wb.administration", "test:wb.geography", "daily5"], "Plan rebuilt for today. Since notes are still being prepared, we are using these drills to map out your baseline in WB Administration and Geography. Let's see where the gaps are so we can build the right study notes next."),
      ["fullmock", "daily5", "test:wb.administration", "test:wb.geography"],
      "note promises notes",
    ],
  ];
  for (const [name, text, menu, reason] of criticals) {
    it(`rejects ${name}`, () => expect(coachDayLocalCheck(text, menu)).toBe(reason));
  }

  it("keeps clean local plans (notes mentioned with no promise, real scores quoted)", () => {
    // cmuny8ayy (GATE CSE) and cmtd3iylk (25% mock) — both local wins in the audit.
    expect(coachDayLocalCheck(day(["test:cs.algo.complexity", "test:cs.algo.divide_conquer", "daily5"], "Plan rebuilt for today. Since your notes aren't ready yet, we are using the question drills as your study material to build intuition for Asymptotic Complexity and Divide and Conquer. Let's start with the hardest cognitive work first."), ["daily5", "test:cs.algo.complexity", "test:cs.algo.divide_conquer"])).toBeNull();
    expect(coachDayLocalCheck(day(["test:reason.matrix", "test:quant.geometry", "read:quant.ratio_proportion"], "Your 25% in the recent mock shows we need to stabilize the basics before the final push. We are starting with Matrix-based Coding to build confidence, then moving to Geometry, and finishing with Ratio and Proportion to secure those easy marks. 📈"), ["test:reason.matrix", "test:quant.geometry", "read:quant.ratio_proportion"])).toBeNull();
    expect(coachDayLocalCheck(day(["daily5"], "You scored 100% and 10% this week; today is about steady practice."), ["daily5"])).toBeNull();
  });

  it("sends a reply the app could not use to Claude, not to the rule plan", () => {
    expect(coachDayLocalCheck("Here is your plan for today.", ["daily5"])).toBe("not JSON");
    expect(coachDayLocalCheck(day(["read:quant.geometry"], "Geometry first."), ["test:quant.geometry", "daily5"])).toBe("no MENU id");
    expect(coachDayLocalCheck(day(["daily5"], "x".repeat(401)), ["daily5"])).toBe("note over 400 characters");
  });

  it("masteryText: a topic never measured is never shown to the model as 0%", () => {
    expect(masteryText(null)).toBe("not measured yet");
    expect(masteryText(0)).toBe("0%");
    expect(masteryText(0.456)).toBe("46%");
  });

  it("generateCoachDay checks local replies and prints no unmeasured topic as 0%", () => {
    const src = read("src/lib/coach-plan.ts");
    expect(src).toMatch(/acceptLocal: \(msg\) =>\s*coachDayLocalCheck\(/);
    expect(src).not.toContain("Math.round((t.mastery ?? 0) * 100)");
  });
});

// ── student-360 ───────────────────────────────────────────────────────

function profile(over: Partial<Student360> = {}): Student360 {
  return {
    userId: "u1", name: "Asha", joinedDaysAgo: 5,
    exam: { code: "APPSC_GROUP2", short: "APPSC Group II", name: "APPSC Group II" },
    daysToExam: 83, plan: null,
    totals: { attempts: 2, submitted: 2, avgPct: 31, studyMinutes: 40, tutorQuestions: 0, activeDaysLast30: 2 },
    scoreTrend: [{ d: "01 Oct", pct: 3, exam: "APPSC" }, { d: "10 Oct", pct: 60, exam: "APPSC" }],
    subjects: [{ name: "General Studies and Mental Ability", mastery: 0.75, attempts: 34 }],
    weakTopics: [{ name: "Modern India and Freedom Movement", subject: "GS", mastery: 0.2 }],
    strongTopics: [], revisionDue: 0,
    studyHours: { morning: 0, afternoon: 15, evening: 1, night: 0 },
    tutorThemes: [], lastActiveDaysAgo: 3, coachRead: null,
    ...over,
  };
}

describe("coachReadLocalCheck", () => {
  // Real local reads from the audit, with the student's activeDays30.
  const rejected: [string, string, "self" | "mentor", number, string][] = [
    ["mentor:cmuxvukwk — '16 hours per day' from app events (and a reversed trend)", "This aspirant demonstrates a clear strength in General Studies and Mental Ability, where a 75% mastery level is supported by 34 attempts, indicating a solid foundation in that specific area. The primary risk is the severe lack of consistency, with only two active days in the last month and a recent score trend that dropped from 60 to 3, which suggests that the current study volume of 16 hours per day is not translating into retention or performance. The next step is to immediately address the weak topics in Indian History, specifically the Modern and Medieval periods, by shifting focus from broad coverage to targeted practice on these specific gaps.", "mentor", 2, "states hours"],
    ["mentor:cmv05vi62 — brief written to the student", "With 83 days remaining and only one active day in the last month, the single biggest risk is the severe lack of consistent study momentum, which is currently limiting your average score to just 20%. Your primary strength is your clear self-awareness and initiative, as evidenced by your immediate request for targeted tutoring on Ancient India, which is your identified weakest topic. I would push you to commit to a minimum of three active study days per week starting today to build the necessary consistency before the exam.", "mentor", 1, "mentor brief speaks to the student"],
    ["self:cmuwfu8ul — 'existing 4-hour afternoon study block'", "Your biggest strength is your Reasoning Ability, where you have already reached a 44% mastery level, showing that you can grasp logical concepts effectively. Your single biggest opportunity lies in tackling your weak spots, specifically Quadratic Equations and Word Usage, which are currently dragging down your overall 30% average. To make progress today, commit to your existing 4-hour afternoon study block by dedicating the first hour entirely to solving Quadratic Equations, as this will directly boost your Numerical Ability score.", "self", 1, "states hours"],
    ["self:cmub92kwy — '196 evening study hours'", "Your biggest strength is your consistent engagement, having logged 22 attempts over the last 21 days with a solid 62% average that shows you are actively testing yourself. Your single biggest opportunity lies in closing the gap in Aptitude and Mental Ability, where your 72% mastery is lagging behind your strong 83% in General Tamil, particularly in weak areas like Simplification and Ratio and Proportion. To capitalize on this, use your 196 evening study hours today to focus exclusively on solving 20 targeted Aptitude problems in these specific weak topics rather than reviewing General Studies.", "self", 12, "states hours"],
    ["self:cmuzakftp — 'consistent afternoon study block', active 1 day in 30", "Your single biggest strength is your consistent afternoon study block, which has already built a solid foundation in Reasoning Ability and General Awareness, both sitting at nearly 68% mastery. Your biggest opportunity lies in Computer Knowledge and Hindi and English Language, where your mastery is currently the lowest at 52% and 56%, respectively, despite you having already attempted 14 and 15 questions in those areas. To address this today, spend your next afternoon session specifically drilling the weak topics of Keyboard Shortcuts and Windows Operating System, as these are directly tied to your lowest-scoring subject.", "self", 1, "claims a study habit"],
    ["self:cmuxkm9de — 'consistent morning study habit', active 1 day in 30", "Your biggest strength is your consistent morning study habit, which has already driven your mock scores up from 20 to 52 in just two attempts. Your biggest opportunity lies in leveraging your perfect mastery of English to tackle the weak areas in Bengali Literature and Grammar, where your current mastery is only at 65%. To make the most of your 50 days remaining, your next step today is to review the specific Panchayati Raj and Urban Local Body questions you got wrong in your recent mock to turn those gaps into solid knowledge.", "self", 1, "claims a study habit"],
  ];
  for (const [name, text, audience, active, reason] of rejected) {
    it(`rejects ${name}`, () => expect(coachReadLocalCheck(text, audience, active)).toBe(reason));
  }

  it("serves clean local reads (self and mentor)", () => {
    // self:cmv4wh08p and mentor:cmv3wskia — no critical issue in the audit.
    expect(coachReadLocalCheck("Your biggest strength is your strong foundation in General Awareness, Reasoning, and Languages, where you have already achieved full mastery. Your single biggest opportunity is to tackle the Quantitative Ability subject, which currently shows zero mastery despite your overall 80% average. The one next step to take today is to focus specifically on the \"Ratio and Proportion\" topic you identified as your weakest area in your recent mock test.", "self", 1)).toBeNull();
    expect(coachReadLocalCheck("This aspirant demonstrates exceptional command over Reasoning and Quantitative Aptitude, with mastery scores of 0.96 and 1.0 respectively, indicating a strong foundational strength in logical and numerical problem-solving. The primary risk is the significant underperformance in General Studies, where \"Indian History, Polity, Geography and Economy\" sits at a 0.47 mastery level despite 31 attempts, suggesting a persistent difficulty in retaining or applying static knowledge. The immediate next step is to shift the heavy evening study load toward targeted revision of weak topics like Indian Polity and Economy, leveraging the 69 days remaining to convert this knowledge gap into a competitive advantage.", "mentor", 2)).toBeNull();
    // A habit claim is not flagged for a student who really was active (11 days of 30).
    expect(coachReadLocalCheck("Use your proven afternoon study block to focus on Numerical Ability.", "self", 11)).toBeNull();
  });

  it("sends a local read cut off at max_tokens to Claude", () => {
    expect(coachReadLocalCheck("Your biggest strength is", "self", 9, "max_tokens")).toBe("cut off");
  });
});

describe("finishCoachRead (Claude's reads cut at max_tokens 220: 7 of 25 in the audit)", () => {
  // self:cmtr4ro7a — Claude, stopped at max_tokens mid-sentence.
  const CUT = "Your biggest strength is absolutely **Quantitative Aptitude** with 80% mastery — you've built a rock-solid foundation there that will anchor your score on exam day. However, your opportunity is crystal clear: **General Intelligence and Reasoning sits at just 18% mastery** despite 13 attempts, and topics like Coding-Decoding, Semantic & Figural Analogy, and Non-Verbal Reasoning keep appearing in your recent mock weaknesses. With 49 days left but only 7 active days in the last month, here's your immediate next step: **commit to 30 minutes of focused Reasoning practice TODAY** — pick just one weak topic (start with Coding-Decoding since it's appeared twice recently), solve 15-20 questions with solutions, and then take a 10-question quiz tomorrow morning when you typically study best. You've got the discipline to master difficult topics (Quant proves it), so channel that same energy into Reasoning and you'll see your";

  it("keeps only full sentences of a read that stopped at max_tokens, and drops bold markers", () => {
    const out = finishCoachRead(CUT, "max_tokens")!;
    expect(out.endsWith("when you typically study best.")).toBe(true);
    expect(out).not.toContain("you'll see your");
    expect(out).not.toContain("**");
  });

  it("stores nothing for a report of headings and tables (self:cmucvh3qd, self:cmub92kwy)", () => {
    expect(finishCoachRead("# Your 42-Day SBI Clerk Prep Dashboard\n\n**Days Until Exam:** 42 | **Tests Taken:** 39\n\n---\n\n## Your Progress Snapshot\n\n| Metric | Your Status |\n|--------|-------------|", "max_tokens")).toBeNull();
    expect(finishCoachRead("# Your TNPSC Group IV Prep Report – Day 22\n\n## Where You Stand\n\nYou've built solid momentum over 21 days.", "end_turn")).toBeNull();
  });

  it("keeps the leading paragraph when a heading follows it", () => {
    expect(finishCoachRead("Your Quant is strong. Reasoning is your opportunity. Drill Coding-Decoding today.\n\n## Subject Deep-Dive\n\n**General Tamil** (83%)", "end_turn")).toBe(
      "Your Quant is strong. Reasoning is your opportunity. Drill Coding-Decoding today.",
    );
  });

  it("leaves a complete read alone (two paragraphs become one) and stores nothing when under 2 sentences survive a cut", () => {
    expect(finishCoachRead("Your Quant is strong at 80%.\n\nToday, drill Reasoning for 30 minutes.", "end_turn")).toBe("Your Quant is strong at 80%. Today, drill Reasoning for 30 minutes.");
    expect(finishCoachRead("Your Quant is strong at 0.8 mastery. Today, drill", "max_tokens")).toBeNull();
    expect(finishCoachRead("", "end_turn")).toBeNull();
  });
});

describe("coachReadRequest", () => {
  it("names app-event counts as such, explains every field and leaves room to finish", () => {
    const r = coachReadRequest(profile(), "self");
    const packet = JSON.parse(r.messages[0].content as string);
    expect(packet.appEventsByTimeOfDay).toEqual({ morning: 0, afternoon: 15, evening: 1, night: 0 });
    expect(packet).not.toHaveProperty("studyHours");
    expect(packet.scoreTrend).toEqual([3, 60]);
    expect(Object.keys(packet)).toEqual([
      "exam", "daysToExam", "joinedDaysAgo", "attempts", "avgPct", "activeDays30", "lastActiveDaysAgo",
      "scoreTrend", "subjects", "weakTopics", "appEventsByTimeOfDay", "recentTutorAsks", "planDay",
    ]);
    const sys = r.system[0].text;
    expect(sys).toContain("NOT hours, NOT sessions");
    expect(sys).toContain("oldest first and newest last");
    expect(sys).toContain("never work out new percentages");
    expect(sys).toContain("under 90 words");
    expect(r.maxTokens).toBeGreaterThan(220);
  });

  it("the mentor brief is written about the aspirant, never to them", () => {
    expect(coachReadRequest(profile(), "mentor").system[0].text).toContain("third person");
    expect(coachReadRequest(profile(), "self").system[0].text).toContain("DIRECTLY TO THEM");
  });
});
