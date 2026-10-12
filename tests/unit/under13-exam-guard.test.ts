// Release 2 (14 Oct 2026), part B: the under-13 rule on children's exam hubs.
//
// A kids' exam (src/lib/signin-cta.ts under13ExamGuard: SOF_*, Silverzone
// SZF_*, NSTSE, PRIL, ZIO, JNVST) shows NO email / phone "Alert me" box, NO
// mentor callback form and NO "Sign up with Google" box, card or door — on any
// of its pages, /hi and /te twins included, and in its guest chat — and the
// alert and mentor-request APIs refuse its code. Content and practice
// stay: a guest's practice press goes to the exam's no-sign-in quiz instead
// of /login. Every surface is checked both ways: hidden for a kids' exam,
// still shown for a 13+ exam (SSC CGL; IOQM / NSEJS stay 13+).
//
// The list is derived from the stored ExamEligibility of every OLYMPIAD exam
// (and every exam whose eligibility names Class 1-7 or a minimum age under
// 13), read SELECT-only on 10 Oct 2026:
//   SOF_IEO, SOF_IMO, SOF_NSO, SZF_IOEL, SZF_IOM, SZF_IOS, NSTSE — Class 1-12
//   SOF_IGKO — Class 1-10 · SOF_IHO — Class 3-10 · PRIL — grades 6-12
//   ZIO — "Class 8 to 12 (some sources mention Class 1-12)": unsure → closed
//   JNVST — Class V (inactive) · SOF_ICO — Class 11-12, closed with its family
//   not kids: IOQM (Class 8-12, min age 12), NSEJS (8-10), NSEA/B/C/P (10-12);
//   the TETs' "Classes 1-5" are the classes their candidates will teach.
// No DB, no network.

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as signinCta from "@/lib/signin-cta";
import {
  UNDER13_ENTRY_EXAM_CODES,
  UNDER13_OLYMPIAD_CODES,
  chatQuestionDoorAllowed,
  examCodeOfPath,
  isKidsExamPath,
  kidsPracticeHref,
  practiceDoorInline,
  under13ExamGuard,
} from "@/lib/signin-cta";
import { pitchAllowedPath } from "@/lib/signup-pitch";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const KIDS = ["NSTSE", "SOF_ICO", "SOF_IEO", "SOF_IGKO", "SOF_IHO", "SOF_IMO", "SOF_NSO", "SZF_IOEL", "SZF_IOM", "SZF_IOS", "PRIL", "ZIO", "JNVST"];
const NOT_KIDS = ["SSC_CGL", "NEET_UG", "IBPS_CLERK", "TN_TNPSC_GROUP4", "IOQM", "NSEJS", "NSEA", "NSEB", "NSEC", "NSEP", "CTET", "AP_TET", "MH_MAHATET"];

// ── 1. the guard list ──────────────────────────────────────────────────────

describe("1. the guard: which exams are kids' exams", () => {
  it("pinned: the derived list (a new code here is a decision, not a side effect)", () => {
    expect([...UNDER13_OLYMPIAD_CODES]).toEqual(["PRIL", "ZIO"]);
    expect([...UNDER13_ENTRY_EXAM_CODES]).toEqual(["JNVST"]);
    for (const c of KIDS) expect(under13ExamGuard(c), c).toBe(true);
    for (const c of NOT_KIDS) expect(under13ExamGuard(c), c).toBe(false);
    for (const c of [null, undefined, "", "sof_imo", "PRILX", "XZIO", "NSTSEX"]) expect(under13ExamGuard(c as string), String(c)).toBe(false);
  });

  it("the tutor's doors and the practice doors read the same list", () => {
    for (const c of KIDS) {
      expect(chatQuestionDoorAllowed(c), c).toBe(false);
      expect(practiceDoorInline(c), c).toBe(false);
    }
    for (const c of NOT_KIDS) {
      expect(chatQuestionDoorAllowed(c), c).toBe(true);
      expect(practiceDoorInline(c), c).toBe(true);
    }
  });

  it("a page of a kids' exam, by path — every sub-page and the /hi, /te twins", () => {
    for (const p of [
      "/exams/SOF_IMO",
      "/exams/SOF_IMO/",
      "/exams/SOF_IMO/updates",
      "/exams/SOF_IMO/topics/T1/quiz?n=5",
      "/exams/sof_imo/syllabus",
      "/hi/exams/NSTSE",
      "/te/exams/SZF_IOM/cutoff#x",
      "/exams/PRIL/quiz",
      "/exams/ZIO",
    ]) {
      expect(isKidsExamPath(p), p).toBe(true);
    }
    for (const p of ["/exams/SSC_CGL", "/hi/exams/SSC_CGL/updates", "/exams/browse", "/exams/IOQM", "/exams", "/", "/schooling/cbse/class-9", "/exam-calendar", "/xexams/SOF_IMO", "/ta/exams/SOF_IMO", null, undefined]) {
      expect(isKidsExamPath(p as string), String(p)).toBe(false);
    }
    expect(examCodeOfPath("/te/exams/szf_iom/cutoff")).toBe("SZF_IOM");
    expect(examCodeOfPath("/exams")).toBeNull();
  });

  it("practice stays: a guest's press goes to the no-sign-in quiz", () => {
    expect(kidsPracticeHref("SOF_IMO")).toBe("/exams/SOF_IMO/quiz");
    expect(kidsPracticeHref("SOF_IMO", "IMO_NUMBERS")).toBe("/exams/SOF_IMO/topics/IMO_NUMBERS/quiz");
  });
});

// ── 2. the site-wide offers and the header, by path ───────────────────────

describe("2. SignupPitch / SignupInline / SignupNudge / soft wall / header: no offer on a kids' exam page", () => {
  it("pitchAllowedPath: closed on every kids' exam page, open on a 13+ exam's", () => {
    for (const p of ["/exams/SOF_IMO", "/exams/NSTSE/updates", "/hi/exams/SZF_IOS", "/te/exams/PRIL/syllabus", "/exams/ZIO/cutoff"]) {
      expect(pitchAllowedPath(p), p).toBe(false);
    }
    for (const p of ["/exams/SSC_CGL", "/exams/SSC_CGL/updates", "/hi/exams/NEET_UG", "/exams/IOQM", "/exam-calendar"]) {
      expect(pitchAllowedPath(p), p).toBe(true);
    }
  });

  it("every site-wide offer asks pitchAllowedPath (unchanged callers)", () => {
    expect(read("src/components/SignupPitch.tsx")).toContain("if (!pitchAllowedPath(pathname)) return;");
    expect(read("src/components/SignupInline.tsx")).toContain("if (!pitchAllowedPath(location.pathname)) return;");
    expect(read("src/components/SignupNudge.tsx")).toContain('return !pitchAllowedPath(p) || p.startsWith("/live-test/");');
    expect(read("src/components/SoftWallClient.tsx")).toContain("!pitchAllowedPath(path)");
    expect(read("src/lib/signup-pitch.ts")).toContain("if (isKidsExamPath(p)) return false;");
  });

  it("the header's guest sign-in: a kids' exam page is child-safe", () => {
    const header = read("src/components/HeaderAuthControls.tsx");
    expect(header).toContain("childSafe = childSafe || isKidsExamPath(pathname);");
    expect(header.indexOf("childSafe = childSafe || isKidsExamPath(pathname);")).toBeLessThan(header.indexOf("const guestButton ="));
    // The two branches read childSafe (pinned elsewhere, unchanged).
    expect(header).toContain("const guestButton = !signedIn && !childSafe && !isUnder13SchoolPath(pathname);");
    expect(header).toMatch(/\) : childSafe \|\| isUnder13SchoolPath\(pathname\) \? null : /);
  });
});

// ── 3. components, by exam code ───────────────────────────────────────────

function loadComponent(rel: string, name: string, stubs: Record<string, unknown>): React.FC<Record<string, unknown>> {
  const file = path.join(ROOT, rel);
  const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  const all: Record<string, unknown> = { "react/jsx-runtime": jsxRuntime, react: React, "@/lib/signin-cta": signinCta, ...stubs };
  const req = (spec: string): unknown => {
    if (spec in all) return all[spec];
    throw new Error(`unexpected import ${spec}`);
  };
  new Function("require", "module", "exports", out)(req, mod, mod.exports);
  return mod.exports[name] as React.FC<Record<string, unknown>>;
}

const ALERT_LABELS = {
  title: "Get alerted for {exam}",
  body: "One email when something real happens.",
  emailPlaceholder: "your@email.com",
  btn: "Alert me",
  btnSigned: "Alert me about it",
  done: "Done",
  invalid: "Invalid",
  err: "Error",
};

describe("3. the components hide themselves for a kids' exam", () => {
  it("ExamAlertBox: nothing for a kids' exam; the box for a 13+ exam", () => {
    const ExamAlertBox = loadComponent("src/components/ExamAlertBox.tsx", "ExamAlertBox", {});
    const html = (examCode: string) => renderToStaticMarkup(React.createElement(ExamAlertBox, { examCode, signedIn: false, labels: ALERT_LABELS }));
    for (const c of ["SOF_IMO", "NSTSE", "SZF_IOM", "PRIL", "ZIO"]) expect(html(c), c).toBe("");
    for (const c of ["SSC_CGL", "IOQM"]) {
      expect(html(c), c).toContain("Get alerted for {exam}");
      expect(html(c), c).toContain("Alert me");
    }
  });

  it("CoachEntry (the plan needs an account): nothing for a kids' exam; the door for a 13+ exam", () => {
    const Link = ({ href, className, children }: { href: string; className?: string; children?: React.ReactNode }) => React.createElement("a", { href, className }, children);
    const CoachEntry = loadComponent("src/components/CoachEntry.tsx", "CoachEntry", { "next/link": { __esModule: true, default: Link } });
    const html = (examCode: string) => renderToStaticMarkup(React.createElement(CoachEntry, { examCode, examShort: examCode }));
    expect(html("SOF_NSO")).toBe("");
    expect(html("SSC_CGL")).toContain('href="/coach?exam=SSC_CGL"');
  });

  it("HubSignInLink (the hub's sign-up box button) and the shared SignUpButton net", () => {
    const start = read("src/app/exams/[code]/StartMockButton.tsx");
    expect(start).toMatch(/export function HubSignInLink\([\s\S]{0,600}?if \(under13ExamGuard\(examCode\)\) return null;\s*return <SignUpButton href=\{href\} surface="hub-box"/);
    const button = read("src/components/SignUpButton.tsx");
    expect(button).toContain("if (under13ExamGuard(examCode) || isKidsExamPath(callbackOfLoginHref(href)) || under13ExamGuard(page?.code)) return null;");
    // After every hook: the net is the last statement before the render.
    const net = button.indexOf("if (under13ExamGuard(examCode) || isKidsExamPath(");
    expect(button.indexOf("const failed = useSignUpWordsFailed(locale);")).toBeLessThan(net);
    expect(button.indexOf("return (\n    <SignUpShell", net)).toBeGreaterThan(net);
  });

  it("the practice 401s: a kids' exam goes to the no-sign-in quiz, never /login; a 13+ exam opens the door as before", () => {
    const islands: Record<string, string> = {
      "src/app/exams/[code]/StartMockButton.tsx": "hub-start-401",
      "src/app/exams/[code]/SubjectTestButton.tsx": "subject-test-401",
      "src/app/exams/[code]/CustomMockBuilder.tsx": "custom-mock-401",
    };
    for (const [file, door] of Object.entries(islands)) {
      const src = read(file);
      const at401 = src.slice(src.indexOf("if (res.status === 401) {"));
      const doorOpen = at401.indexOf("setDoor(true);");
      const kids = at401.indexOf("if (under13ExamGuard(examCode)) {\n          window.location.href = kidsPracticeHref(examCode);\n          return;\n        }");
      const login = at401.indexOf(`window.location.href = loginHrefFor(practiceDoorCallback("${door}", examCode), "${door}");`);
      expect(doorOpen, file).toBeGreaterThan(0);
      expect(kids, file).toBeGreaterThan(doorOpen);
      expect(login, file).toBeGreaterThan(kids);
    }
    const topic = read("src/app/exams/[code]/topics/[topicCode]/TopicQuizButton.tsx");
    const t401 = topic.slice(topic.indexOf("if (res.status === 401) {"));
    expect(t401.indexOf("window.location.href = kidsPracticeHref(examCode, topicCode);")).toBeGreaterThan(0);
    expect(t401.indexOf("window.location.href = kidsPracticeHref(examCode, topicCode);")).toBeLessThan(t401.indexOf("loginHrefFor(cb"));
  });

  it("the quiz end screen, the hub's try-one card and the cutoff nudge drop their sign-up (the quiz links stay)", () => {
    const quiz = read("src/components/AnonQuizPlayer.tsx");
    expect(quiz).toContain("const kidsExam = under13ExamGuard(quiz.examCode);");
    expect(quiz).toContain("{kidsExam ? null : signInSlot ? (");
    expect(quiz).toContain("{!good && !kidsExam && (");
    const tryOne = read("src/app/exams/[code]/TryOneQuestion.tsx");
    expect(tryOne.match(/\{!under13ExamGuard\(examCode\) && \(/g)).toHaveLength(2);
    expect(tryOne).toContain("or try 5 more questions — no signup needed →");
    const nudge = read("src/components/AnonExamNudge.tsx");
    expect(nudge).toContain("{!under13ExamGuard(examCode) && (");
    expect(nudge.indexOf("{!under13ExamGuard(examCode) && (")).toBeLessThan(nudge.indexOf('<p data-su-reason className="text-xs text-ink-700">'));
  });

  it("TalkToTeacher (its callback form takes phone, name, email, city): nothing for a kids' exam; the card for a 13+ exam (review, 10 Oct)", () => {
    const Stub = () => null;
    const TalkToTeacher = loadComponent("src/components/TalkToTeacher.tsx", "TalkToTeacher", { "@/components/TeacherFollowUp": { TeacherFollowUp: Stub } });
    const html = (examCode: string | null, variant: "card" | "link" = "card") => renderToStaticMarkup(React.createElement(TalkToTeacher, { surface: "topic", examCode, variant }));
    for (const c of ["SOF_IMO", "NSTSE", "SZF_IOS", "PRIL", "ZIO", "JNVST"]) {
      expect(html(c), c).toBe("");
      expect(html(c, "link"), c).toBe("");
    }
    for (const c of ["SSC_CGL", "IOQM", null]) {
      expect(html(c), String(c)).toContain("Talk to a mentor");
      expect(html(c, "link"), String(c)).toContain("Talk to a mentor");
    }
  });

  it("the kids' exam chat: no guest banner, no sign-up card, no guest sign-in in the header; the tutor stays (review, 10 Oct)", () => {
    const chat = read("src/app/chat/ChatInterface.tsx");
    const net = chat.indexOf("if (under13ExamGuard(examCode)) guestBanner = null;");
    expect(net).toBeGreaterThan(0);
    expect(net).toBeLessThan(chat.indexOf("{guestBanner && guestSignInHref && !school && !under13 && !kidsOff && ("));
    // The save card and the first-answer card come from guestChatOffer (null on a kids' exam — tests/unit/chat-first-answer.test.ts).
    expect(chat).toContain('{guestSignInHref && !school && !under13 && !busy && guestOffer === "save" && (');
    expect(read("src/lib/chat-first-answer.ts")).toContain("if (under13ExamGuard(a.examCode)) return null;");
    expect(read("src/app/chat/page.tsx")).toContain("<Header childSafe={under13ExamGuard(anonExamCode)} />");
  });

  it("the Telegram /exam card offers no alert button for a kids' exam", () => {
    expect(read("src/app/api/telegram/webhook/route.ts")).toContain("under13ExamGuard(exam.code)\n      ? [{ text: \"📅 Full tracker\"");
  });
});

// ── 4. the alert APIs refuse a kids' exam ─────────────────────────────────

const state = vi.hoisted(() => ({ authCalls: 0, dbCalls: 0 }));
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => {
    state.authCalls++;
    return null;
  }),
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(async () => ({ ok: true })), rateLimited: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: new Proxy(
    {},
    {
      get() {
        state.dbCalls++;
        throw new Error("the database must not be read");
      },
    },
  ),
}));
vi.mock("@/lib/web-push", () => ({ pushConfigured: vi.fn(() => true), sendPush: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendTeacherRequestEmail: vi.fn() }));

const post = (url: string, body: unknown) =>
  new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) as never;

describe("4. /api/exam-alerts, /api/push/subscribe and /api/teacher-request take no contact for a kids' exam", () => {
  beforeEach(() => {
    state.authCalls = 0;
    state.dbCalls = 0;
  });

  it("email alert: 403 for a kids' exam before anything is read; a 13+ exam goes on as before", async () => {
    const { POST } = await import("@/app/api/exam-alerts/route");
    for (const examCode of ["SOF_IMO", "NSTSE", "PRIL"]) {
      const res = await POST(post("https://shishya.in/api/exam-alerts", { examCode, email: "kid@example.com" }));
      expect(res.status, examCode).toBe(403);
      expect(await res.json()).toEqual({ error: "Alerts are not offered for this exam." });
    }
    expect(state.authCalls).toBe(0);
    expect(state.dbCalls).toBe(0);
    // 13+ exam: past the guard (no email, no session → the old 400).
    const ok = await POST(post("https://shishya.in/api/exam-alerts", { examCode: "SSC_CGL" }));
    expect(ok.status).toBe(400);
    expect(await ok.json()).toEqual({ error: "Add your email so we can alert you." });
    expect(state.authCalls).toBe(1);
  });

  it("mentor request (/api/teacher-request): 403 for a kids' exam before anything is read; a 13+ exam goes on as before (review, 10 Oct)", async () => {
    const { POST } = await import("@/app/api/teacher-request/route");
    const body = (examCode: string) => ({ message: "Please help me with fractions", surface: "topic", examCode, contactPhone: "9000000000", contactName: "A", city: "B" });
    for (const examCode of ["SOF_IMO", "NSTSE", "SZF_IOM", "JNVST"]) {
      const res = await POST(post("https://shishya.in/api/teacher-request", body(examCode)));
      expect(res.status, examCode).toBe(403);
      expect(await res.json()).toEqual({ error: "Mentor requests are not taken for this exam." });
    }
    expect(state.authCalls).toBe(0);
    expect(state.dbCalls).toBe(0);
    // 13+ exam: past the guard (the session is read; the stub database then refuses).
    await POST(post("https://shishya.in/api/teacher-request", body("SSC_CGL"))).catch(() => null);
    expect(state.authCalls).toBe(1);
  });

  it("phone alert: 403 for a kids' exam; a 13+ exam goes on as before", async () => {
    const { POST } = await import("@/app/api/push/subscribe/route");
    const sub = { endpoint: "https://not-a-push-service.example/x", keys: { p256dh: "a".repeat(20), auth: "b".repeat(10) } };
    const kid = await POST(post("https://shishya.in/api/push/subscribe", { examCode: "SZF_IOS", subscription: sub }));
    expect(kid.status).toBe(403);
    expect(state.dbCalls).toBe(0);
    // 13+ exam: past the guard, to the endpoint check that was always there.
    const ok = await POST(post("https://shishya.in/api/push/subscribe", { examCode: "SSC_CGL", subscription: sub }));
    expect(ok.status).not.toBe(403);
  });
});
