// /live-test says what is true (10 Oct 2026, Release 1).
//
// The page promised what the site does not do:
//   • "No fee, no login wall" (Open Graph and X descriptions) — a live test
//     needs a free account: src/lib/guest-paper.ts keeps live tests behind
//     sign-in, and isGuestPaperMock refuses a live-test mock;
//   • "the whole country writes the same 25 questions" / "All-India rank" /
//     "national rank" (title, description, body, JSON-LD, FAQ) — each Sunday
//     paper had 0–4 takers from 30 Aug to 4 Oct 2026.
// What it says now: free, the same paper for everyone who takes it that day,
// sign up free to take it, and a rank among those who have taken it so far
// (the rank shown on submit counts the attempts finished by then).
// Under 13 (review of 10 Oct 2026): a kids' exam's card shows a guest no
// sign-up button (the SZF IOS rehearsal card did).
//
// The scan reads string literals and JSX text only (comments are stripped,
// as in tests/unit/truth-lint.test.ts: the page's own comment says what was
// removed). It uses truth-lint's phrase matcher with this page's own list —
// these phrases still have legitimate or pending uses elsewhere (emails,
// banners, the results page), so they are not on the site-wide list.
// Run: npx vitest run tests/unit/live-test-honesty.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findForbiddenPhrases } from "@/lib/truth-lint";
import { isGuestPaperMock } from "@/lib/guest-paper";
import { isKidsExamCode } from "@/lib/signin-cta";

const ROOT = path.resolve(__dirname, "..", "..");
const PAGE = "src/app/live-test/page.tsx";

/** Comments blanked (line count kept), so only code, strings and JSX text remain. */
function stripComments(src: string): string {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  out = out.replace(/^[ \t]*\/\/.*$/gm, "");
  return out;
}

const raw = fs.readFileSync(path.join(ROOT, PAGE), "utf8");
const code = stripComments(raw);

/** The claims this page made that the site does not back. Matched
 *  case-insensitively as plain substrings over the page's strings. */
const LIVE_TEST_REMOVED_PHRASES: readonly string[] = [
  "no login wall",
  "login wall",
  "whole country",
  "all-india rank",
  "national rank",
  "same paper across india",
  "aspirants across india",
  "predicts selection",
  "like everything on shishya",
];

describe("/live-test: the removed claims stay out", () => {
  it("no removed phrase in any string or JSX text of the page", () => {
    const hits = findForbiddenPhrases(code, PAGE, { phrases: LIVE_TEST_REMOVED_PHRASES }).map((f) => `${f.line}: ${f.detail} — ${f.snippet ?? ""}`);
    expect(hits).toEqual([]);
  });

  it("the matcher would catch them (the old lines, as they were on 9 Oct 2026)", () => {
    const old = [
      'description: "Every Sunday, one shared mock test per top exam — the whole country writes the same paper and gets an All-India rank."',
      "description: 'Same paper, same window, real All-India rank the moment you submit. No fee, no login wall.'",
      '"25 questions · 20 minutes · same paper across India"',
      'title: "All-India Live Test — free Sunday mock with national rank | Shishya"',
    ].join("\n");
    const found = findForbiddenPhrases(old, "old", { phrases: LIVE_TEST_REMOVED_PHRASES }).map((f) => f.detail);
    for (const p of ["no login wall", "whole country", "all-india rank", "national rank", "same paper across india"]) {
      expect(found.some((d) => d.includes(`"${p}"`)), p).toBe(true);
    }
  });
});

describe("/live-test: what it says instead is what the code does", () => {
  it("a live test needs sign-in: a live-test mock is never a guest paper", () => {
    expect(isGuestPaperMock({ userId: null, generatedBy: "live-test" })).toBe(false);
    // A shared site mock that is not a live test is the guest-paper kind (the contrast).
    expect(isGuestPaperMock({ userId: null, generatedBy: null })).toBe(true);
  });

  it("title, description, share card, body, JSON-LD and FAQ say: free, the same paper that day, sign up free, rank among those who took it", () => {
    const title = code.match(/^\s*title: "([^"]+)",/m)?.[1] ?? "";
    expect(title).toBe("All-India Live Test — free Sunday mock test with your rank | Shishya");
    const description = code.match(/^\s*description:\s*\n\s*"([^"]+)",/m)?.[1] ?? "";
    expect(description).toMatch(/the same paper for everyone who takes it that day/);
    expect(description).toMatch(/Sign up free to take it/);
    expect(description).toMatch(/your rank is among those who took the same paper/);
    const share = code.match(/const SHARE_DESCRIPTION =\s*\n\s*"([^"]+)";/)?.[1] ?? "";
    expect(share).toMatch(/free/);
    expect(share).toMatch(/Sign up free to take it/);
    expect(share).toMatch(/your rank among those who have taken it so far/);
    // Open Graph and X both use it.
    expect(code.match(/description: SHARE_DESCRIPTION,/g)?.length).toBe(2);
    // The page body, as JSX text (one line once whitespace is folded).
    const body = code.replace(/\s+/g, " ");
    expect(body).toContain("one free 25-question paper per exam, the same for everyone who takes it that day. Sign up free to take it. When you submit, you see your rank among those who have taken the same paper so far.");
    expect(body).toContain("one paper for everyone who takes it");
    // JSON-LD: the application's description and the first FAQ answer.
    expect(body).toMatch(/A free sign-up is needed to take it; when you submit, you see your rank among those who have taken it so far\./);
    expect(body).toMatch(/You sign up free to take it\. When you submit, you see your rank among those who have taken the same paper so far; each paper's card shows how many wrote it\./);
    expect(body).toMatch(/The rank is out of however many took that paper/);
  });

  it("the rank shown on submit is a rank so far: every 'when you submit' line says so (liveTestRank counts the in-window attempts finished by then)", () => {
    const strings = [...code.matchAll(/"([^"\n]*[Ww]hen you submit[^"\n]*)"/g)].map((m) => m[1]);
    const jsx = code.replace(/\s+/g, " ").match(/When you submit, you see your rank[^.<]*\./g) ?? [];
    const all = [...strings, ...jsx];
    expect(all.length).toBeGreaterThanOrEqual(4);
    for (const s of all) expect(s, s).toMatch(/so far/);
  });

  it("each card still prints how many wrote the paper, so the rank's base is on the page", () => {
    expect(code).toMatch(/\{r\.participants\}<\/span> wrote it/);
  });
});

// Under 13 (founder rule: content only, no sign-up, no data). On 10 Oct 2026
// the SZF IOS rehearsal card (Silverzone, Class 1-12) offered a guest the
// "Sign up with Google" button. A kids' exam's card now asks a guest for
// nothing; a signed-in member's "Write it now" link is unchanged.
describe("/live-test: no sign-up on a kids' exam card", () => {
  it("the kids' rule (src/lib/signin-cta.ts isKidsExamCode) covers the olympiads that had live papers here", () => {
    for (const c of ["SZF_IOS", "SZF_IOM", "SOF_IGKO", "SOF_IEO", "SOF_IMO", "NSTSE", "JNVST"]) expect(isKidsExamCode(c), c).toBe(true);
    for (const c of ["SSC_CGL", "CTET", "MP_TET", "IBPS_CLERK", "KA_KPSC_KAS"]) expect(isKidsExamCode(c), c).toBe(false);
  });

  it("the guest branch checks the exam before the one sign-up button, and renders nothing for a kids' exam", () => {
    expect(code).toContain('import { isKidsExamCode } from "@/lib/signin-cta";');
    // One sign-up button on the page, inside the card.
    expect(code.match(/<SignUpButton\b/g)?.length).toBe(1);
    const kids = code.indexOf('(state === "open" || state === "rehearsal") && isKidsExamCode(r.code) ? (');
    const member = code.indexOf('(state === "open" || state === "rehearsal") && userId ? (');
    const button = code.indexOf("<SignUpButton");
    expect(member).toBeGreaterThan(0);
    expect(kids).toBeGreaterThan(member); // a signed-in member still gets "Write it now"
    expect(button).toBeGreaterThan(kids); // the guest button comes only after the kids' check
    // The kids' branch is `null`: no button, no link, no line asking for one.
    expect(code.slice(kids, button)).toMatch(/isKidsExamCode\(r\.code\) \? \(\s*null\s*\) : state === "open" \|\| state === "rehearsal" \? \(/);
  });
});
