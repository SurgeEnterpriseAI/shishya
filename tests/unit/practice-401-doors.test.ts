// The 401 doors (3 Oct 2026, sign-ups-to-100 plan lever 5; src/lib/signin-cta.ts
// "The 401 doors"). A guest who presses the hub's five-question diagnostic, a
// subject test or "Generate my mock" got 401 from /api/mocks and was sent to
// /login at once (2 of 10 such presses became an account in 2 hours). Now the
// 401 opens the shared "Sign up with Google" button in the pressed button's
// place, with the reason line the per-place table gives that door and the age
// line, the same /login link (same callback, same from=), one "signin-door"
// shown beacon — and never on a SOF / Silverzone / NSTSE hub or a school class
// container, where the old redirect stays.
// No DB, no network. Run: npx vitest run tests/unit/practice-401-doors.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as reactDom from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";
import * as copyMod from "@/lib/signup-cta-copy";
import * as hooksMod from "@/lib/use-signup-words";
import * as signinCtaMod from "@/lib/signin-cta";
import * as ctaBeaconMod from "@/lib/cta-beacon";
import * as sessionHintMod from "@/lib/session-hint";
import * as inAppMod from "@/lib/in-app-browser";
import * as directMod from "@/lib/direct-signin-ab";
import * as tipPlaceMod from "@/lib/signup-tip-place";
import * as contentSignupMod from "@/lib/content-signup";
import {
  PRACTICE_401_DOORS,
  SIGNIN_DOOR_CTA,
  UNDER13_ENTRY_EXAM_CODES,
  isKidsExamCode,
  isKidsOlympiadCode,
  isSigninSurface,
  loginHrefFor,
  practiceDoorCallback,
  practiceDoorInline,
  signinDoorShownBeacon,
} from "@/lib/signin-cta";
import { inDirectSigninTest } from "@/lib/direct-signin-ab";
import { signUpPlaceFor, type SignUpPlaceInput } from "@/lib/signup-place";
import { SIGNUP_TABLES, signUpPlaceWords, signUpWords } from "@/lib/signup-place-words";
import { nudgeBarCopy } from "@/lib/content-signup";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** Source with comments removed (JSX comments, block comments, whole-line comments). */
const code = (rel: string) =>
  read(rel)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const LANGS = ["en", "hi", "te"] as const;
const EXAM = { exam: "SSC CGL", examCode: "SSC_CGL" } as const;
const HUB = "/exams/SSC_CGL";
const FILES = {
  "hub-start-401": "src/app/exams/[code]/StartMockButton.tsx",
  "subject-test-401": "src/app/exams/[code]/SubjectTestButton.tsx",
  "custom-mock-401": "src/app/exams/[code]/CustomMockBuilder.tsx",
} as const;
const DOOR_FILE = "src/app/exams/[code]/PracticeSignUpDoor.tsx";

// The Exam rows of category OLYMPIAD, read from production on 3 Oct 2026 (SELECT only,
// scripts/tmp-doors-utm-read.ts). The kids' olympiads are SOF, Silverzone and NSTSE.
const KIDS_OLYMPIADS = ["NSTSE", "SOF_ICO", "SOF_IEO", "SOF_IGKO", "SOF_IHO", "SOF_IMO", "SOF_NSO", "SZF_IOEL", "SZF_IOM", "SZF_IOS"];
const OTHER_OLYMPIADS = ["IOQM", "NSEA", "NSEB", "NSEC", "NSEJS", "NSEP", "PRIL", "ZIO"];

// ── 1. the rules ─────────────────────────────────────────────────────────

describe("1. which hubs open the inline door, and where its link returns", () => {
  it("the three doors are the existing door ids — unchanged, and still outside the skip-/login test", () => {
    expect([...PRACTICE_401_DOORS]).toEqual(["hub-start-401", "subject-test-401", "custom-mock-401"]);
    for (const d of PRACTICE_401_DOORS) {
      expect(isSigninSurface(d), d).toBe(true);
      expect(inDirectSigninTest(d), d).toBe(false);
    }
    expect(SIGNIN_DOOR_CTA).toBe("signin-door");
    // No new door id was added for this build.
    expect(signinCtaMod.SIGNIN_SURFACES.filter((s) => /-401$/.test(s))).toEqual(["hub-start-401", "subject-test-401", "topic-quiz-401", "custom-mock-401", "descriptive-401"]);
  });

  it("never on a SOF / Silverzone / NSTSE hub, nor a school class container (any class): there the redirect stays", () => {
    for (const c of KIDS_OLYMPIADS) {
      expect(isKidsOlympiadCode(c), c).toBe(true);
      expect(practiceDoorInline(c), c).toBe(false);
    }
    for (const c of ["NCERT_C01", "NCERT_C05", "NCERT_C07", "NCERT_C08", "NCERT_C09", "CISCE_C10", "NCERT_C12"]) expect(practiceDoorInline(c), c).toBe(false);
    // Fails closed on anything that is not an exam code.
    for (const c of ["", null, undefined, "SSC CGL", "../x", "a".repeat(65)]) expect(practiceDoorInline(c as string), String(c)).toBe(false);
  });

  it("never on an under-13 entry test either (3 Oct 2026 review): JNVST — inactive today, closed before anyone switches it on", () => {
    expect([...UNDER13_ENTRY_EXAM_CODES]).toEqual(["JNVST"]);
    expect(isKidsOlympiadCode("JNVST")).toBe(false);
    expect(isKidsExamCode("JNVST")).toBe(true);
    expect(practiceDoorInline("JNVST")).toBe(false);
    for (const c of KIDS_OLYMPIADS) expect(isKidsExamCode(c), c).toBe(true);
    // Exact code only: a code that merely contains it is not it.
    for (const c of ["JNVST_X", "XJNVST", "jnvst"]) expect(isKidsExamCode(c), c).toBe(false);
  });

  it("every exam code the repo knows for under-13s is classified on purpose and kept closed", () => {
    // The codes the repo names (the search aliases and the practice-state table). A code whose
    // name looks like a children's exam — the SOF / Silverzone / NSTSE olympiads, Navodaya (JNV…),
    // Sainik School (AISSEE / SAINIK…), Rashtriya Military School (RMS…), RIMC — must be in the
    // pinned list below; a new one fails this test until someone decides where it belongs.
    const src = read("src/lib/exam-aliases.ts") + "\n" + read("src/lib/exam-practice-state.ts");
    const codes = new Set<string>();
    for (const m of src.matchAll(/codes:\s*\[([^\]]*)\]/g)) for (const q of m[1].matchAll(/"([A-Z0-9_]+)"/g)) codes.add(q[1]);
    for (const m of src.matchAll(/^\s*([A-Z][A-Z0-9_]+):\s*\[/gm)) codes.add(m[1]);
    const KIDS_NAME = /^(?:SOF_|SZF_|NSTSE|JNV|AISSEE|SAINIK|RMS_|RIMC)/;
    const found = [...codes].filter((c) => KIDS_NAME.test(c)).sort();
    // Pinned (3 Oct 2026): the olympiad codes (two are the alias table's prefix entries) and JNVST.
    expect(found).toEqual(["JNVST", "NSTSE", "SOF_", "SOF_IEO", "SOF_IGKO", "SOF_IMO", "SOF_NSO", "SZF_", "SZF_IOEL", "SZF_IOM", "SZF_IOS"]);
    for (const c of found) expect(practiceDoorInline(c), c).toBe(false);
    // The production catalogue's kids' olympiads (section header) are all closed too.
    for (const c of KIDS_OLYMPIADS) expect(practiceDoorInline(c), c).toBe(false);
  });

  it("opens on a real exam's hub — the other olympiads included (their sentence is the olympiad entry, section 2)", () => {
    for (const c of ["SSC_CGL", "TNPSC_GROUP_4", "UP_UPSSSC_PET", "IBPS_CLERK", "NEET_UG", ...OTHER_OLYMPIADS]) {
      expect(isKidsOlympiadCode(c), c).toBe(false);
      expect(practiceDoorInline(c), c).toBe(true);
    }
    // A code that only starts like one is not one.
    expect(isKidsOlympiadCode("NSTSEX")).toBe(false);
    expect(isKidsOlympiadCode("SOFTWARE_X")).toBe(false);
  });

  it("the link is the one the redirect used: same callback (back to start that test), same from=", () => {
    expect(practiceDoorCallback("hub-start-401", "SSC_CGL")).toBe("/exams/SSC_CGL?start=diagnostic");
    expect(practiceDoorCallback("subject-test-401", "SSC_CGL")).toBe("/exams/SSC_CGL#subject-tests");
    expect(practiceDoorCallback("custom-mock-401", "SSC_CGL")).toBe("/exams/SSC_CGL#custom-mock");
    expect(loginHrefFor(practiceDoorCallback("hub-start-401", "SSC_CGL"), "hub-start-401")).toBe("/login?callbackUrl=%2Fexams%2FSSC_CGL%3Fstart%3Ddiagnostic&from=hub-start-401");
    expect(loginHrefFor(practiceDoorCallback("subject-test-401", "SSC_CGL"), "subject-test-401")).toBe("/login?callbackUrl=%2Fexams%2FSSC_CGL%23subject-tests&from=subject-test-401");
    expect(loginHrefFor(practiceDoorCallback("custom-mock-401", "SSC_CGL"), "custom-mock-401")).toBe("/login?callbackUrl=%2Fexams%2FSSC_CGL%23custom-mock&from=custom-mock-401");
    // ?start=diagnostic is what the hub's guarded auto-start turns into the diagnostic, for every member.
    expect(signinCtaMod.hubAutoStart("diagnostic", false)).toBe("diagnostic");
    expect(signinCtaMod.hubAutoStart("diagnostic", true)).toBe("diagnostic");
  });
});

// ── 2. the reason line: an existing entry of the table, no new words ─────

describe("2. the reason line is the entry the per-place table gives the door", () => {
  const key = (i: SignUpPlaceInput) => signUpPlaceFor(i).key;
  const START = `${HUB}?start=diagnostic`;

  it("the diagnostic's door: door.hub-box ('a five-question test opens for you') for an exam that can serve a mock", () => {
    expect(key({ surface: "hub-start-401", callback: START, ...EXAM, practice: "canServe" })).toBe("door.hub-box");
    // What the hub page said about itself carries the practice value (the island passes none).
    expect(key({ surface: "hub-start-401", callback: START, ...EXAM, page: { exam: "SSC CGL", code: "SSC_CGL", practice: "canServe" } })).toBe("door.hub-box");
    // Not known, or another exam's facts: the exam's entry that promises no mock.
    expect(key({ surface: "hub-start-401", callback: START, ...EXAM })).toBe("family.exam.unknown");
    expect(key({ surface: "hub-start-401", callback: START, ...EXAM, page: { exam: "SBI PO", code: "SBI_PO", practice: "canServe" } })).toBe("family.exam.unknown");
    // A link that does not return to ?start=diagnostic never says the test opens by itself.
    expect(key({ surface: "hub-start-401", callback: HUB, ...EXAM, practice: "canServe" })).toBe("family.exam.practice");
    // A door never says "no practice questions yet" (it stands beside a practice button).
    expect(key({ surface: "hub-start-401", callback: START, ...EXAM, practice: "none" })).toBe("family.exam.unknown");
  });

  it("a subject test and 'Generate my mock': the exam's family entry", () => {
    for (const [door, cb] of [["subject-test-401", `${HUB}#subject-tests`], ["custom-mock-401", `${HUB}#custom-mock`]] as const) {
      expect(key({ surface: door, callback: cb, ...EXAM, practice: "canServe" }), door).toBe("family.exam.practice");
      expect(key({ surface: door, callback: cb, ...EXAM, page: { exam: "SSC CGL", code: "SSC_CGL", practice: "canServe" } }), door).toBe("family.exam.practice");
      expect(key({ surface: door, callback: cb, ...EXAM }), door).toBe("family.exam.unknown");
      expect(key({ surface: door, callback: cb, ...EXAM, practice: "none" }), door).toBe("family.exam.unknown");
    }
  });

  it("fails closed: no name → nothing named; an olympiad → the olympiad entry (with the age sentence); a school code → school words", () => {
    for (const door of PRACTICE_401_DOORS) {
      const cb = practiceDoorCallback(door, "SSC_CGL");
      expect(key({ surface: door, callback: cb, examCode: "SSC_CGL", practice: "canServe" }), door).toBe("family.examPath");
      // A name passed for another exam than the link's: not named (the exam page's sentence that names nothing).
      expect(key({ surface: door, callback: cb, exam: "SBI PO", examCode: "SBI_PO", practice: "canServe" }), door).toBe("family.examPath");
      // IOQM, NSEJS … — the door opens there, and speaks to a school student.
      const ioqm = practiceDoorCallback(door, "IOQM");
      expect(key({ surface: door, callback: ioqm, exam: "IOQM", examCode: "IOQM", page: { exam: "IOQM", code: "IOQM", practice: "canServe", olympiad: true } }), door).toBe("family.examOlympiad");
      expect(key({ surface: door, callback: ioqm, exam: "IOQM", examCode: "IOQM", olympiad: true }), door).toBe("family.examOlympiad");
      expect(SIGNUP_TABLES.en.places["family.examOlympiad"].age).toBe(true);
    }
    expect(key({ surface: "subject-test-401", callback: "/exams/NCERT_C09#subject-tests", exam: "Class 9", examCode: "NCERT_C09", practice: "canServe" })).toBe("family.schoolCbse");
  });

  it("/login (from=…-401) shows the same sentence as the button that sent them", () => {
    for (const door of PRACTICE_401_DOORS) {
      const callback = practiceDoorCallback(door, "SSC_CGL");
      const atLogin = signUpPlaceFor({ surface: "login", from: door, callback, ...EXAM, practice: "canServe" });
      expect(atLogin, door).toEqual(signUpPlaceFor({ surface: door, callback, ...EXAM, practice: "canServe" }));
    }
    expect(signUpPlaceFor({ surface: "login", from: "hub-start-401", callback: `${HUB}?start=diagnostic`, ...EXAM, practice: "canServe" }).key).toBe("door.hub-box");
    // "Welcome back" still wins.
    expect(signUpPlaceFor({ surface: "login", returning: true, from: "hub-start-401", callback: `${HUB}?start=diagnostic`, ...EXAM }).key).toBe("door.login.returning");
  });

  it("the words are the table's, in en / hi / te, with the exam named and no hole left", () => {
    for (const l of LANGS) {
      const start = signUpWords(l, { surface: "hub-start-401", callback: `${HUB}?start=diagnostic`, ...EXAM, practice: "canServe" });
      expect(start, l).toEqual(signUpPlaceWords(l, { key: "door.hub-box", vars: { exam: "SSC CGL" } }));
      for (const door of ["subject-test-401", "custom-mock-401"] as const) {
        const w = signUpWords(l, { surface: door, callback: practiceDoorCallback(door, "SSC_CGL"), ...EXAM, practice: "canServe" });
        expect(w, `${l}/${door}`).toEqual(signUpPlaceWords(l, { key: "family.exam.practice", vars: { exam: "SSC CGL" } }));
        expect(w.text + w.short, `${l}/${door}`).toContain("SSC CGL");
        expect(w.text + w.short, `${l}/${door}`).not.toMatch(/[{}]/);
      }
    }
    // English, as the reader sees it.
    expect(signUpWords("en", { surface: "hub-start-401", callback: `${HUB}?start=diagnostic`, ...EXAM, practice: "canServe" }).short).toBe("No forms. A five-question SSC CGL test opens for you.");
    expect(signUpWords("en", { surface: "subject-test-401", callback: `${HUB}#subject-tests`, ...EXAM, practice: "canServe" }).short).toBe("No forms. SSC CGL mocks with every score kept.");
  });
});

// ── 3. the beacon ────────────────────────────────────────────────────────

describe("3. the press that hits the 401 sends one 'signin-door' shown beacon; the click is the button's", () => {
  let sent: { url: string; body: Blob }[];
  beforeEach(() => {
    sent = [];
    vi.stubGlobal("navigator", { sendBeacon: (url: string, body: Blob) => (sent.push({ url, body }), true) });
    vi.stubGlobal("location", { pathname: "/exams/SSC_CGL" });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("one CTA_CLICKED { cta: signin-door, action: shown, surface, examCode } — the door id wins over extras", async () => {
    signinDoorShownBeacon("hub-start-401", { examCode: "SSC_CGL", kind: "DIAGNOSTIC", surface: "spoofed", action: "spoofed" });
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe("/api/analytics");
    expect(JSON.parse(await sent[0].body.text())).toEqual({
      kind: "CTA_CLICKED",
      path: "/exams/SSC_CGL",
      props: { cta: "signin-door", examCode: "SSC_CGL", kind: "DIAGNOSTIC", action: "shown", surface: "hub-start-401" },
    });
  });

  it("each island sends it once, when the door opens (the door replaces the button, so it cannot be pressed again)", () => {
    for (const [door, file] of Object.entries(FILES)) {
      const src = code(file);
      expect(src.match(/signinDoorShownBeacon\(/g), file).toHaveLength(1);
      expect(src, file).toMatch(new RegExp(`if \\(practiceDoorInline\\(examCode\\)\\) \\{\\s*signinDoorShownBeacon\\("${door}", \\{ examCode(?:, kind)? \\}\\);\\s*setDoor\\(true\\);\\s*setBusy\\(false\\);\\s*return;\\s*\\}`));
      // The old redirect (and its "signin-click" at the 401) only where the door may not open.
      const at401 = src.slice(src.indexOf("if (res.status === 401) {"));
      expect(at401.indexOf(`signinBeacon("${door}"`), file).toBeGreaterThan(at401.indexOf("setDoor(true);"));
      expect(src, file).toContain(`window.location.href = loginHrefFor(practiceDoorCallback("${door}", examCode), "${door}");`);
    }
  });
});

// ── 4. the islands and the door ──────────────────────────────────────────

describe("4. the door takes the pressed button's place; the hub page hands it the exam's name and language", () => {
  it("each island renders the door, under its own id, instead of its button", () => {
    const start = code(FILES["hub-start-401"]);
    // 3 Oct 2026 (review): full width on a phone, its own width from sm — as HubSignInLink.
    expect(start).toContain('if (door) {\n    return <PracticeSignUpDoor door="hub-start-401" examCode={examCode} exam={exam} locale={locale ?? cookieLocale} align="end" block className="sm:w-auto" />;\n  }');
    // … before either of the two start layouts.
    expect(start.indexOf("<PracticeSignUpDoor")).toBeLessThan(start.indexOf("if (!hasHistory) {"));
    const subject = code(FILES["subject-test-401"]);
    expect(subject).toContain('if (door) return <PracticeSignUpDoor door="subject-test-401" examCode={examCode} exam={exam} locale={locale} block />;');
    const custom = code(FILES["custom-mock-401"]);
    // As wide as the "Generate my mock" button it replaces: full width on a phone, its own width from sm
    // (the column lets it shrink from sm; a plain block would stretch it across the card).
    expect(custom).toMatch(
      /\) : door \? \(\s*<div className="mt-4 flex flex-col sm:items-start">\s*<PracticeSignUpDoor door="custom-mock-401" examCode=\{examCode\} exam=\{exam\} locale=\{locale\} block className="sm:w-auto" \/>\s*<\/div>\s*\) : \(\s*<button/,
    );
    expect(custom).toMatch(/<button[^>]*className="mt-4 inline-flex w-full [^"]*sm:w-auto"/);
    for (const file of Object.values(FILES)) {
      expect(code(file), file).toContain('import { PracticeSignUpDoor } from "./PracticeSignUpDoor";');
      // The door only opens on a 401: nothing changes for a guest who presses nothing, or for a member.
      expect(code(file).match(/setDoor\(true\)/g), file).toHaveLength(1);
    }
  });

  it("the hub page passes the exam's short name and the page's language to the three islands (no practice value: the page context gives it)", () => {
    const hub = code("src/app/exams/[code]/page.tsx");
    expect(hub).toMatch(/<StartMockButton locale=\{locale\}\s+examCode=\{exam\.code\}\s+exam=\{exam\.shortName\}/);
    expect(hub).toMatch(/<SubjectTestButton[\s\S]{0,400}?exam=\{exam\.shortName\}\s+locale=\{locale\}\s*\/>/);
    expect(hub).toContain("<CustomMockBuilder examCode={exam.code} exam={exam.shortName} locale={locale} />");
    // The page context the door's practice value and olympiad flag come from.
    expect(hub).toContain("<SignUpPageContext exam={exam.shortName} code={exam.code} practice={signUpPracticeOf(practice)} olympiad={String(exam.category) === OLYMPIAD_CATEGORY} />");
    const door = code(DOOR_FILE);
    const tag = door.match(/<SignUpButton\b[\s\S]*?\/>/)?.[0] ?? "";
    expect(tag).not.toMatch(/\bpractice=|\bolympiad=|\bcontext=|\bplace=|\btext=|\bshort=|\bexplain=/);
    expect(tag).toContain("surface={door}");
    expect(tag).toContain("href={loginHrefFor(practiceDoorCallback(door, examCode), door)}");
  });

  it("on the hub's action row the door comes FIRST, before the tutor button (3 Oct 2026 review; the rule in SignUpButton.tsx)", () => {
    const hub = code("src/app/exams/[code]/page.tsx");
    // The row: the tutor link, then the start button's span — in the source and, without a door, on screen.
    const row = hub.match(/<div className="([^"]*)">\s*<Link\s+rel="nofollow" href=\{`\/chat\?examCode=\$\{exam\.code\}`\}\s+data-tour="exam-ask"[\s\S]*?<\/Link>\s*<span data-tour="exam-start-mock">\s*<StartMockButton /);
    expect(row, "the action row: tutor link, then the start button").toBeTruthy();
    const cls = row![1].split(/\s+/);
    // Today's layout, unchanged for every page without a door …
    for (const c of ["flex", "flex-col", "items-stretch", "gap-2", "sm:flex-row", "sm:items-center"]) expect(cls, c).toContain(c);
    // … turned around while the row holds a door: above the tutor button on a phone, to its left from sm.
    expect(cls).toContain("has-[[data-signin-door]]:flex-col-reverse");
    expect(cls).toContain("sm:has-[[data-signin-door]]:flex-row-reverse");
    // The attribute the row looks for is the door's own outer element.
    expect(code(DOOR_FILE)).toContain("<div data-signin-door={door}>");
    // The tutor button stays the quiet 1 px outline it was.
    expect(row![0]).toContain('className="btn-secondary !py-2 !px-4 text-xs sm:text-sm"');
    // Tailwind builds the has-[…] variant (3.4 and later) and reads the hub page's folder.
    const [maj, min] = (JSON.parse(fs.readFileSync(path.join(ROOT, "node_modules/tailwindcss/package.json"), "utf8")).version as string).split(".").map(Number);
    expect(maj > 3 || (maj === 3 && min >= 4)).toBe(true);
    expect(read("tailwind.config.ts")).toContain('"./src/app/**/*.{ts,tsx}"');
  });

  it("the door checks the rule again and is in no school page", () => {
    const door = code(DOOR_FILE);
    expect(door).toMatch(/^\s*"use client";/);
    expect(door).toContain("if (!practiceDoorInline(examCode)) return null;");
    const walk = (d: string): string[] =>
      fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : [])) : [];
    for (const f of [...walk(path.join(ROOT, "src/app/schooling")), ...walk(path.join(ROOT, "src/components/school"))]) {
      expect(fs.readFileSync(f, "utf8"), f).not.toMatch(/PracticeSignUpDoor/);
    }
    // Who mounts it: the three islands on the exam hub, nothing else (the hub page only names it in a comment).
    const users = walk(path.join(ROOT, "src"))
      .filter((f) => /<PracticeSignUpDoor\b/.test(fs.readFileSync(f, "utf8")))
      .map((f) => path.relative(ROOT, f).replace(/\\/g, "/"))
      .filter((f) => f !== DOOR_FILE && f !== "src/lib/signin-cta.ts");
    expect(users.sort()).toEqual(Object.values(FILES).slice().sort());
  });
});

// ── 5. rendered ──────────────────────────────────────────────────────────

function LinkStub({ href, prefetch, children, ...rest }: { href: string; prefetch?: boolean; children?: React.ReactNode } & Record<string, unknown>) {
  void prefetch;
  return React.createElement("a", { href, ...rest }, children);
}
const STUBS: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": jsxRuntime,
  "react-dom": reactDom,
  "next/link": { __esModule: true, default: LinkStub },
  "@/lib/signup-tip-place": tipPlaceMod,
  "@/lib/signup-cta-copy": copyMod,
  "@/lib/use-signup-words": hooksMod,
  "@/lib/signin-cta": signinCtaMod,
  "@/lib/cta-beacon": ctaBeaconMod,
  "@/lib/session-hint": sessionHintMod,
  "@/lib/in-app-browser": inAppMod,
  "@/lib/direct-signin-ab": directMod,
  "@/lib/content-signup": contentSignupMod,
  "@/lib/google-handoff": { goToGoogle: async () => {}, warmGoogleHandoff: async () => {} },
};
const loaded = new Map<string, { exports: Record<string, unknown> }>();
function load(relPath: string): Record<string, unknown> {
  const file = path.normalize(path.join(ROOT, relPath));
  const hit = loaded.get(file);
  if (hit) return hit.exports;
  const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  loaded.set(file, mod);
  const req = (spec: string): unknown => {
    if (spec in STUBS) return STUBS[spec];
    if (spec.startsWith("@/components/")) return load(`src/components/${spec.slice("@/components/".length)}.tsx`);
    throw new Error(`${relPath} imports an unexpected module: ${spec}`);
  };
  new Function("require", "module", "exports", "process", out)(req, mod, mod.exports, process);
  return mod.exports;
}
type FC<P> = (p: P) => React.ReactElement | null;
const render = <P extends object>(C: unknown, props: P) => renderToStaticMarkup(React.createElement(C as FC<P>, props));
const unescape = (html: string) => html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const ui = load(DOOR_FILE) as { PracticeSignUpDoor: unknown };

describe("5. rendered: the shared button under the door's id, its /login link, the caption's line and the age line", () => {
  it.each(PRACTICE_401_DOORS.map((d) => [d] as const))("%s", (door) => {
    const html = unescape(render(ui.PracticeSignUpDoor, { door, examCode: "SSC_CGL", exam: "SSC CGL", locale: "en" }));
    const a = html.match(/<a\b[^>]*>/)?.[0] ?? "";
    expect(a).toContain(`href="${loginHrefFor(practiceDoorCallback(door, "SSC_CGL"), door)}"`);
    expect(a).toContain(`data-signin-surface="${door}"`);
    // The button counts its own click (the layout's /login listener skips it).
    expect(a).toContain('data-signin-beacon="self"');
    expect(a).toContain('class="su-google');
    expect(html).toContain("<span>Sign up with Google</span>");
    // A client island: the reason line arrives with the reader's language (held open until then).
    expect(html).toContain('<span class="su-cap"> </span>');
    // The age line, under the button.
    expect(html).toMatch(/<\/span><p class="mt-1 text-\[11px\] text-ink-500">Free · For students 13 and above<\/p><\/div>$/);
    expect(html.startsWith(`<div data-signin-door="${door}">`)).toBe(true);
  });

  it("the age line and the label follow the page's language", () => {
    for (const l of LANGS) {
      const html = unescape(render(ui.PracticeSignUpDoor, { door: "subject-test-401", examCode: "SSC_CGL", exam: "SSC CGL", locale: l, block: true }));
      expect(html, l).toContain(nudgeBarCopy(l).privacy);
      expect(nudgeBarCopy(l).privacy, l).toMatch(/13/);
      expect(html, l).toContain(`<span>${copyMod.signUpLabel(l)}</span>`);
    }
  });

  it("block + sm:w-auto (the diagnostic's and the custom mock's doors): a full-width button on a phone, its own width from sm", () => {
    const html = unescape(render(ui.PracticeSignUpDoor, { door: "hub-start-401", examCode: "SSC_CGL", exam: "SSC CGL", locale: "en", block: true, className: "sm:w-auto", align: "end" }));
    // The frame takes the caller's class after its own (one class each, so sm:w-auto wins from sm) …
    expect(html).toMatch(/<span class="su-wrap su-block sm:w-auto"[^>]*data-su-align="end"/);
    // … and the button fills it.
    expect(html.match(/<a\b[^>]*>/)?.[0] ?? "").toMatch(/class="su-google[^"]*\bw-full\b/);
    // Without them: the button's own width, as before.
    const plain = unescape(render(ui.PracticeSignUpDoor, { door: "hub-start-401", examCode: "SSC_CGL", exam: "SSC CGL", locale: "en" }));
    expect(plain).toMatch(/<span class="su-wrap"/);
    expect(plain.match(/<a\b[^>]*>/)?.[0] ?? "").not.toMatch(/\bw-full\b/);
  });

  it("renders nothing on a kids' exam or a school class container", () => {
    for (const examCode of ["SOF_IMO", "SZF_IOM", "NSTSE", "JNVST", "NCERT_C06", "NCERT_C09", ""]) {
      expect(render(ui.PracticeSignUpDoor, { door: "hub-start-401", examCode, exam: "X", locale: "en" }), examCode).toBe("");
    }
  });
});
