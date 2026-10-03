// The next step on a Class 8-12 chapter page (3 Oct 2026, school growth: 86%
// of chapter visitors left after one page, 0 signed up) — after the notes and
// the guest quiz, in place of the 27 Sep save line, so a guest sees one
// sign-up block. src/components/school/SchoolStudentEntry.tsx, slot "next".
//
// What is pinned:
//   • only a Class 8-12 chapter with checked practice (5+), and only for a
//     known guest — nothing in the cached / crawler HTML;
//   • a guest: "Practise this chapter", the set's real size with the age line,
//     and the shared sign-up button — door "school-save", its /login link back
//     to this chapter, no {n}, no fixed entry — so its words are the per-place
//     table's CBSE school entry (family.schoolCbse) with the caption that is
//     true on every school page (src/lib/signup-place.ts rule 6);
//   • signed in: nothing — the one practise button is the top entry's;
//   • the tutor and save slots are unchanged (the page no longer renders save).
// The island is transpiled with TypeScript and rendered with
// renderToStaticMarkup; React's useState is replaced so the probe's answer
// can be set (the first state of the island is "signed in?"), and the shared
// button is a stub that records its props. No DB, no network.
// Run: npx vitest run tests/unit/school-chapter-next-step.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import * as studentClasses from "@/lib/school/student-classes";
import * as studentCopy from "@/lib/school/student-copy";
import { STUDENT_ENTRY_COPY as C } from "@/lib/school/student-copy";
import { callbackOfLoginHref } from "@/lib/signin-cta";
import { signUpPlaceFor } from "@/lib/signup-place";
import { signUpPlaceWords } from "@/lib/signup-place-words";

const ROOT = process.cwd();

let probe: boolean | null = null;
let stateCalls = 0;
const reactStub = {
  ...React,
  // The island's first useState is "signed in?" — set by the test; every other state keeps its initial value.
  useState: (init: unknown) => {
    stateCalls++;
    return [stateCalls === 1 ? probe : init, () => {}];
  },
  useEffect: () => {},
};

interface ButtonProps {
  href: string;
  surface: string;
  vars?: unknown;
  place?: unknown;
  context?: unknown;
  explain?: string;
  rel?: string;
  beaconProps?: Record<string, unknown>;
}
const buttons: ButtonProps[] = [];

function LinkStub({ href, prefetch, children, ...rest }: { href: string; prefetch?: boolean; children?: React.ReactNode } & Record<string, unknown>) {
  void prefetch;
  return React.createElement("a", { href, ...rest }, children);
}
const STUBS: Record<string, unknown> = {
  react: reactStub,
  "react/jsx-runtime": jsxRuntime,
  "next/link": { __esModule: true, default: LinkStub },
  "next/navigation": { useRouter: () => ({ push: () => {} }) },
  "@/lib/session-hint": { fetchSignedIn: async () => false },
  "@/lib/school/student-classes": studentClasses,
  "@/lib/school/student-copy": studentCopy,
  "@/components/SignUpButton": {
    SignUpButton: (p: ButtonProps) => {
      buttons.push(p);
      return React.createElement("span", { "data-signup": p.surface });
    },
  },
};

function loadTsx(rel: string): Record<string, unknown> {
  const file = path.join(ROOT, rel);
  const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  const req = (spec: string): unknown => {
    if (spec in STUBS) return STUBS[spec];
    throw new Error(`${rel} imports an unexpected module: ${spec}`);
  };
  new Function("require", "module", "exports", "process", out)(req, mod, mod.exports, process);
  return mod.exports;
}
const { SchoolStudentEntry } = loadTsx("src/components/school/SchoolStudentEntry.tsx") as { SchoolStudentEntry: (p: Record<string, unknown>) => React.ReactElement | null };

const PATH = "/schooling/cbse/class-10/science/life-processes";
function render(signedIn: boolean | null, over: Record<string, unknown> = {}): string {
  probe = signedIn;
  stateCalls = 0;
  buttons.length = 0;
  return renderToStaticMarkup(
    React.createElement(SchoolStudentEntry, {
      slot: "next",
      variant: "chapter",
      cls: 10,
      examCode: "NCERT_C10",
      pagePath: PATH,
      topicCode: "jesc1.ch05",
      chapterName: "Life Processes",
      subjectName: "Science",
      validatedQuestions: 30,
      ...over,
    }),
  );
}
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();

describe("the next step after the notes", () => {
  it("nothing until the session probe has answered — the cached and crawler HTML carry no next step", () => {
    expect(render(null)).toBe("");
    expect(buttons).toEqual([]);
  });

  it("a guest: 'Practise this chapter', the set's real size with the age line, and the shared sign-up button", () => {
    const html = render(false);
    expect(html).toContain('<h2 id="school-next-step" class="text-base font-semibold text-ink-900">Practise this chapter</h2>');
    expect(text(html)).toContain(C.nextGuest(10));
    expect(C.nextGuest(10)).toBe("10 of Shishya's own answer-checked questions on this chapter, in one set, with your score saved to your account. For students 13 and above.");
    expect(buttons).toHaveLength(1);
    const b = buttons[0];
    expect(b.surface).toBe("school-save");
    expect(b.href).toBe(studentClasses.schoolSignInHref(PATH));
    expect(b.rel).toBe("nofollow");
    expect(b.beaconProps).toEqual({ examCode: "NCERT_C10", slot: "next" });
    // No {n}, no fixed entry, no alias, the default visible caption: the button's own rules choose the words.
    expect(b.vars).toBeUndefined();
    expect(b.place).toBeUndefined();
    expect(b.context).toBeUndefined();
    expect(b.explain).toBeUndefined();
  });

  it("the button's words: the CBSE school entry (family.schoolCbse) with the caption true on every school page", () => {
    render(false);
    const b = buttons[0];
    const place = signUpPlaceFor({ surface: b.surface, callback: callbackOfLoginHref(b.href) });
    expect(place).toEqual({ key: "family.schoolCbse", cap: "family.schoolOtherBoard" });
    const words = signUpPlaceWords("en", place);
    expect(words.text).toContain("'Practise this chapter' builds your own set of answer-checked questions and saves your score");
    expect(words.text).toContain("For students 13 and above.");
    expect(words.short).toBe("No forms. Saved practice is on CBSE chapters for now.");
  });

  it("signed in: nothing — one practise button on the page, the top entry's (with the chapter's count)", () => {
    expect(render(true)).toBe("");
    expect(buttons).toEqual([]);
    const top = render(true, { slot: "tutor" });
    expect(text(top)).toContain(C.practiceButton(10));
    expect(top.match(/<button\b/g)).toHaveLength(1);
  });

  it("the real size, at most 10: 7 checked questions → a set of 7", () => {
    expect(text(render(false, { cls: 12, validatedQuestions: 7 }))).toContain(C.nextGuest(7));
    expect(render(true, { cls: 12, validatedQuestions: 7 })).toBe("");
    expect(text(render(true, { cls: 12, validatedQuestions: 7, slot: "tutor" }))).toContain(C.practiceButton(7));
  });

  it("no next step on a chapter under 5 checked questions, and nothing on Class 1-7", () => {
    for (const signedIn of [null, false, true]) {
      expect(render(signedIn, { validatedQuestions: 4 }), `4 questions, ${signedIn}`).toBe("");
      for (const cls of [1, 6, 7]) {
        for (const slot of ["next", "save", "tutor"]) expect(render(signedIn, { cls, slot }), `class ${cls} ${slot} ${signedIn}`).toBe("");
      }
    }
    expect(buttons).toEqual([]);
  });

  it("the other slots are unchanged: the save line keeps door.school-save's {n}; the guest tutor entry has no sign-up button", () => {
    render(false, { slot: "save" });
    expect(buttons).toHaveLength(1);
    expect(buttons[0].vars).toEqual({ n: 10 });
    expect(signUpPlaceFor({ surface: "school-save", callback: callbackOfLoginHref(buttons[0].href), vars: { n: 10 } }).key).toBe("door.school-save");
    const tutor = render(false, { slot: "tutor" });
    expect(buttons).toEqual([]);
    expect(tutor).toContain(C.guestHeading);
  });
});
