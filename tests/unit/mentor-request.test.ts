// The "talk to a mentor" request and the under-13 rule, and the words it
// says (17 Oct 2026 — src/lib/mentor-request.ts).
//
// Pinned:
//   • no NEW request in a kids' context — the report's exam or one of the
//     account's active exams is a kids' exam (the under-13 guard's own
//     answer): the card offers no form (a request already made still shows
//     its state), POST /api/mentor-sessions refuses before anything is
//     stored or mailed, and fails closed when the goals cannot be read;
//   • the dashboard's two "Talk to a mentor" doors (weak areas, the
//     educator's doubt form) are hidden for an account holding a kids' goal;
//   • the words promise nothing the product does not keep: no "who has
//     cleared this exam / path", no "will pick up / reach you", no set time;
//     the one promise — an email with the session link when a mentor takes
//     the request — is the take route's own mail to the student.
// No DB, no network. Run: npx vitest run tests/unit/mentor-request.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as mentorMod from "@/lib/mentor-request";
import { UNDER13_ENTRY_EXAM_CODES, UNDER13_OLYMPIAD_CODES, under13ExamGuard } from "@/lib/signin-cta";

const { MENTOR_REQUEST_COPY, holdsKidsGoal, mentorRequestOpen } = mentorMod;

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** Source without comments. */
const code = (rel: string) =>
  read(rel)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

// The guard's own lists, plus members of its prefix families — never a list typed here.
const KIDS = [...UNDER13_OLYMPIAD_CODES, ...UNDER13_ENTRY_EXAM_CODES, "SOF_IMO", "SOF_NSO", "SZF_IOM", "NSTSE"];

describe("who may open a mentor request", () => {
  it("the kids' codes used here are kids' exams by the one guard", () => {
    for (const c of KIDS) expect(under13ExamGuard(c), c).toBe(true);
  });

  it("closed when the report's exam is a kids' exam (as sent or lower-case)", () => {
    for (const c of KIDS) {
      expect(mentorRequestOpen({ examCode: c }), c).toBe(false);
      expect(mentorRequestOpen({ examCode: c.toLowerCase() }), c).toBe(false);
    }
  });

  it("closed when ANY of the account's active exams is a kids' exam (a kids' goal)", () => {
    expect(mentorRequestOpen({ examCode: "NDA", goalCodes: ["NDA", "SOF_IMO"] })).toBe(false);
    expect(mentorRequestOpen({ examCode: null, goalCodes: ["PRIL"] })).toBe(false);
    expect(holdsKidsGoal(["SSC_CGL", "SZF_IOM"])).toBe(true);
  });

  it("open for real exams of older students, and with no exam at all", () => {
    expect(mentorRequestOpen({ examCode: "NDA", goalCodes: ["NDA", "IOQM"] })).toBe(true);
    expect(mentorRequestOpen({ examCode: "AP_AMVI" })).toBe(true);
    expect(mentorRequestOpen({ examCode: null, goalCodes: [] })).toBe(true);
    expect(mentorRequestOpen({})).toBe(true);
    expect(holdsKidsGoal([])).toBe(false);
    expect(holdsKidsGoal(null)).toBe(false);
    expect(holdsKidsGoal(["IOQM", "NSEJS", null])).toBe(false);
  });
});

describe("the report page and the API (source)", () => {
  it("/me/report reads the account's active exams and passes allowNew — a failed read offers no form", () => {
    const page = code("src/app/me/report/page.tsx");
    expect(page).toContain('import { mentorRequestOpen } from "@/lib/mentor-request";');
    expect(page).toMatch(/const goalCodes = await prisma\.enrollment\s*\.findMany\(\{ where: \{ userId, active: true \}/);
    expect(page).toContain(".catch(() => null);");
    expect(page).toContain("const mentorOpen = goalCodes !== null && mentorRequestOpen({ examCode: p.exam?.code ?? null, goalCodes });");
    expect(page).toContain("<MentorRequestCard examCode={p.exam?.code ?? null} existing={existing} allowNew={mentorOpen} />");
  });

  it("POST /api/mentor-sessions refuses a kids' context before it reads open requests, stores or mails anything", () => {
    const api = code("src/app/api/mentor-sessions/route.ts");
    const guard = api.indexOf("if (!mentorRequestOpen({ examCode })) {");
    const goals = api.indexOf("if (goalCodes === null || !mentorRequestOpen({ examCode, goalCodes })) {");
    expect(guard).toBeGreaterThan(0);
    expect(goals).toBeGreaterThan(guard);
    for (const later of ['FROM "MentorSessionRequest"', 'INSERT INTO "MentorSessionRequest"', "sendEmail({"]) {
      expect(api.indexOf(later), later).toBeGreaterThan(goals);
    }
    expect(api.match(/error: "kids-exam" \}, \{ status: 403 \}/g)).toHaveLength(2);
  });
});

describe("the dashboard's mentor doors (source)", () => {
  const dash = code("src/app/dashboard/page.tsx");

  it("an account holding a kids' goal gets neither the weak-areas link nor the educator's doubt form", () => {
    expect(dash).toContain("const kidsGoal = holdsKidsGoal(enrollments.map((e) => e.exam.code));");
    expect(dash).toMatch(/\{!kidsGoal && \(\s*<div className="mt-2">\s*<TalkToTeacher\s+surface="weak-areas"/);
    expect(dash).toContain("<EducatorCard userId={session.user.id} doubtForm={!kidsGoal} />");
    const card = code("src/components/EducatorCard.tsx");
    expect(card).toMatch(/\{doubtForm \? \(\s*<TalkToTeacher\s+surface="batch"/);
    // Every other TalkToTeacher mount passes an exam code the component's own guard reads.
    expect(code("src/components/TalkToTeacher.tsx")).toContain("if (under13ExamGuard(props.examCode)) return null;");
  });

  it("the report link no longer promises a mentor", () => {
    expect(read("src/app/dashboard/page.tsx")).not.toContain("a mentor to talk them through");
  });
});

// ── The card, rendered ──────────────────────────────────────────────────

type CardProps = { examCode: string | null; existing: Record<string, unknown> | null; allowNew?: boolean };
function loadCard(): (p: CardProps) => React.ReactElement | null {
  const file = path.join(ROOT, "src/components/MentorRequestCard.tsx");
  const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  const stubs: Record<string, unknown> = { "react/jsx-runtime": jsxRuntime, react: React, "@/lib/mentor-request": mentorMod };
  const req = (spec: string): unknown => {
    if (spec in stubs) return stubs[spec];
    throw new Error(`unexpected import ${spec}`);
  };
  new Function("require", "module", "exports", out)(req, mod, mod.exports);
  return mod.exports.MentorRequestCard as (p: CardProps) => React.ReactElement | null;
}
const Card = loadCard();
const html = (p: CardProps) => renderToStaticMarkup(React.createElement(Card, p));
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

describe("the card", () => {
  it("in a kids' context with no request: nothing at all (no form, no consent box)", () => {
    expect(html({ examCode: "SOF_IMO", existing: null, allowNew: false })).toBe("");
    expect(html({ examCode: "NDA", existing: { status: "DONE", meetUrl: null, mentorName: null, sessionNote: "x" }, allowNew: false })).toBe("");
  });

  it("a request the student already has still shows its state, form or not", () => {
    const sent = text(html({ examCode: "SOF_IMO", existing: { status: "NEW", meetUrl: null, mentorName: null, sessionNote: null }, allowNew: false }));
    expect(sent).toContain(MENTOR_REQUEST_COPY.sentTitle);
    expect(sent).toContain(MENTOR_REQUEST_COPY.sentBody);
    const taken = text(html({ examCode: "SOF_IMO", existing: { status: "TAKEN", meetUrl: "https://meet.jit.si/x", mentorName: "M", sessionNote: null }, allowNew: false }));
    expect(taken).toContain("Join the session room");
  });

  it("elsewhere: the form, with the honest words and the consent box", () => {
    const h = html({ examCode: "NDA", existing: null });
    const t = text(h);
    expect(t).toContain(MENTOR_REQUEST_COPY.formTitle);
    expect(t).toContain(MENTOR_REQUEST_COPY.formBody);
    expect(t).toContain(MENTOR_REQUEST_COPY.fee);
    expect(h).toContain('type="checkbox"');
    expect(t).toContain("Request a mentor session");
  });
});

describe("the words keep only what the product keeps", () => {
  const all = Object.values(MENTOR_REQUEST_COPY).join(" ");
  const card = code("src/components/MentorRequestCard.tsx"); // the words, not the comments that quote the old ones

  it("no 'cleared this exam / path', no 'will pick up / reach you', no response time", () => {
    for (const s of [all, card]) {
      expect(s).not.toMatch(/cleared (?:this|your) (?:exam|path)|who cleared|who has cleared/i);
      expect(s).not.toMatch(/will pick up|will reach you|will contact you|will call you|within \d/i);
    }
    // No waiting time in the words (the card's placeholder "exam in 30 days" is the student's own example).
    expect(all).not.toMatch(/\d+\s*(?:hours?|hrs?|days?)\b/i);
  });

  it("says the network is small, there is no set time, and there may be no mentor for the exam yet", () => {
    expect(MENTOR_REQUEST_COPY.formBody).toMatch(/new and small/);
    expect(MENTOR_REQUEST_COPY.formBody).toMatch(/no set waiting time/);
    expect(MENTOR_REQUEST_COPY.formBody).toMatch(/may be no mentor for your exam yet/);
    expect(MENTOR_REQUEST_COPY.sentBody).toMatch(/no set time/);
  });

  it("the one promise — an email with the session link when a mentor takes it — is the take route's own mail to the student", () => {
    expect(MENTOR_REQUEST_COPY.formBody).toMatch(/When a mentor takes your request, you get an email with the session link — for a later session, with the ₹9 step that unlocks it\./);
    expect(MENTOR_REQUEST_COPY.sentBody).toMatch(/When a mentor takes it, you get an email with the session link — for a later session, the ₹9 step that unlocks it — and it shows on this page/);
    const take = code("src/app/api/mentor-sessions/[id]/route.ts");
    const branch = take.slice(take.indexOf('if (body?.action === "take") {'), take.indexOf('if (body?.action === "done") {'));
    expect(branch).toContain("SET status = 'TAKEN'");
    expect(branch).toContain("if (reqRow.student_email) {");
    expect(branch).toContain("to: reqRow.student_email,");
    // Both versions of that mail carry the way in: the room link, or the payment link that unlocks it on the report.
    expect(branch).toContain('<a href="${meetUrl}">${meetUrl}</a>');
    expect(branch).toContain("https://shishya.in/me/report");
    // A later session (one DONE before) gets the ₹9 payment link, not the room — the words say "the ₹9 step".
    expect(branch).toContain("let feeDue = (prior[0]?.n ?? 0) >= 1;");
    expect(branch).toContain('<a href="${payLink.shortUrl}">');
    // … and say only that a mentor took it.
    expect(branch).not.toMatch(/cleared this path|who cleared your exam/);
    // "it shows on this page": the report reads the TAKEN request and the card shows the room.
    expect(card).toContain('if (existing?.status === "TAKEN") {');
  });

  it("the release mail (a session that could not happen) sets no time and claims no queue place or free session", () => {
    const route = code("src/app/api/mentor-sessions/[id]/route.ts");
    const release = route.slice(route.indexOf('if (body?.action === "release") {'));
    expect(release).toContain("sendEmail({");
    expect(release).not.toMatch(/shortly|front of the queue|free session is still yours|add a line/i);
    expect(release).toContain("Mentors take requests as they are available, so there is no set time.");
  });

  it("/pricing, /about and /terms promise no mentor 'who has cleared your exam' (any approved mentor takes any exam's request)", () => {
    for (const f of ["src/app/pricing/page.tsx", "src/app/about/page.tsx", "src/app/terms/page.tsx"]) {
      const src = code(f);
      expect(src, f).not.toMatch(/who has cleared (?:your|that|this) exam|someone who has cleared/i);
      expect(src, f).toMatch(/mentor network/);
    }
  });
});
