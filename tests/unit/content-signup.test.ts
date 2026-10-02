// Sign-up invitations on content pages (30 Sep 2026, sign-up build 3 —
// src/lib/content-signup.ts). Pins:
//   (a) the early line (src/components/SignupInline.tsx): honest, localised,
//       exam-specific words; guest-only client island; a real button; ONE
//       per page, right after each content page's first answer block (never
//       before it), never on Class 1-7; no longer inside "Next on Shishya";
//       the long-article cut renders exactly the blocks the whole did;
//   (b) the timed bar (src/components/SignupNudge.tsx): content families
//       only, 45 active seconds OR 60% scroll, slim bar, the old caps kept,
//       beacons with the page family.
// 30 Sep 2026 (build 3 review): the exam line promises mocks only where the
// exam has practice; the in-article and lower mounts appear without a layout
// shift (revealOffscreen) and the article cut needs 800 characters; news
// puts the line after its funnel card; the bar carries the age line, speaks
// Hindi on the Hindi notes and sits above the feedback pill on desktop.
// No DB, no network. Run: npx vitest run tests/unit/content-signup.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import {
  NUDGE_ACTIVE_SECONDS,
  NUDGE_SCROLL_FRACTION,
  SPLIT_MIN_HEAD_CHARS,
  contentFamily,
  fixedPageLocale,
  nudgeBarCopy,
  nudgeTrigger,
  revealWithoutShift,
  scrollDepthReached,
  signupLineCopy,
  splitAfterFirstSection,
} from "@/lib/content-signup";
import * as notesLib from "@/lib/notes-markdown";

const ROOT = path.resolve(__dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const stripComments = (s: string) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// ── (a) words ──────────────────────────────────────────────────────────

describe("the early line's words", () => {
  it("names the page's exam in English, Hindi and Telugu", () => {
    const en = signupLineCopy("en", "SSC CGL", true);
    expect(en.lead).toBe("Preparing for SSC CGL?");
    expect(en.line).toBe("Sign in free — Shishya keeps your SSC CGL mocks, scores and weak topics, and picks up where you left off next time.");
    // 2 Oct 2026: the one shared label (src/lib/signup-cta-copy.ts).
    expect(en.cta).toBe("Sign up with Google");
    for (const l of ["hi", "te"]) {
      const c = signupLineCopy(l, "SSC CGL", true);
      expect(c.lead, l).toContain("SSC CGL");
      expect(c.line, l).toContain("SSC CGL");
      expect(c.line, l).not.toBe(en.line);
      expect(c.cta, l).toContain("Google");
    }
  });

  // 30 Sep 2026 (review): twelve live hubs (AILET, NEET PG, NIFT …) hold no
  // checked question and no shared mock (src/lib/exam-practice-state.ts).
  it("an exam without practice is never promised mocks, scores or weak topics — nor is an unknown one", () => {
    const noPromise = /mock|score|weak|मॉक|स्कोर|कमज़ोर|మాక్|స్కోర్|బలహీన/i;
    for (const l of ["en", "hi", "te"]) {
      for (const c of [signupLineCopy(l, "AILET", false), signupLineCopy(l, "AILET"), signupLineCopy(l, "AILET", null)]) {
        expect(c.lead, l).toContain("AILET");
        expect(c.line, l).toContain("AILET");
        expect([c.lead, c.line, c.cta].join(" "), l).not.toMatch(noPromise);
      }
      expect(signupLineCopy(l, "AILET", false)).toEqual(signupLineCopy(l, "AILET"));
      expect(signupLineCopy(l, "AILET", false).line, l).not.toBe(signupLineCopy(l, "AILET", true).line);
    }
    expect(signupLineCopy("en", "AILET", false).line).toBe("Sign in free — Shishya keeps AILET as your exam and picks up where you left off next time.");
  });

  it("without an exam it is the general 'make Shishya yours' line; unknown locales read English", () => {
    const en = signupLineCopy("en", null);
    expect(en.lead).toBe("Make Shishya yours — free.");
    expect(en.line).toContain("keeps your exam, your mocks, scores and weak topics");
    expect(signupLineCopy("en", "  ")).toEqual(en);
    expect(signupLineCopy("ta", null)).toEqual(en);
    for (const l of ["hi", "te"]) expect(Object.keys(signupLineCopy(l, null)).sort()).toEqual(Object.keys(en).sort());
  });

  it("claims only what an account does: no counts, rank, chats, alerts or speed", () => {
    for (const l of ["en", "hi", "te"]) {
      for (const c of [signupLineCopy(l, "SSC CGL", true), signupLineCopy(l, "AILET", false), signupLineCopy(l, null)]) {
        const all = [c.lead, c.line, c.cta].join(" ");
        expect(all, l).not.toMatch(/\d/);
        expect(all, l).not.toMatch(/rank|alert|chat|second|guarantee|#1|best|रैंक|ర్యాంక్/i);
        // What Google shares, that it is free, and the age line.
        expect(c.privacy, l).toMatch(/13/);
      }
    }
    const p = signupLineCopy("en", "X").privacy;
    expect(p).toMatch(/name, email and profile picture/);
    expect(p).toMatch(/Free/);
    expect(p).toMatch(/13 and above/);
  });

  it("the timed bar says one honest line in each language", () => {
    const en = nudgeBarCopy("en");
    expect(en.line).toBe("Shishya can remember your exam and weak topics.");
    // 2 Oct 2026: the one shared label (src/lib/signup-cta-copy.ts).
    expect(en.cta).toBe("Sign up with Google");
    for (const l of ["hi", "te"]) {
      const c = nudgeBarCopy(l);
      expect(Object.keys(c).sort()).toEqual(Object.keys(en).sort());
      expect(c.line).not.toBe(en.line);
      expect(c.privacy).not.toBe(en.privacy);
    }
    for (const l of ["en", "hi", "te"]) {
      const { privacy, privacyMore, ...rest } = nudgeBarCopy(l);
      expect(Object.values(rest).join(" ")).not.toMatch(/\d|rank|chat|alert/i);
      expect(`${privacy}${privacyMore}`).not.toMatch(/rank|chat|alert/i);
    }
    expect(nudgeBarCopy(undefined)).toBe(en);
  });

  // 30 Sep 2026 (review): "signup-nudge" is in the skip-/login test, so the
  // bar itself carries the free + age line (and what Google shares, sm+).
  it("the timed bar carries free + the age line in every language, and what Google shares", () => {
    expect(nudgeBarCopy("en").privacy).toBe("Free · For students 13 and above");
    expect(nudgeBarCopy("en").privacyMore).toBe(" · Google shares only your name, email and profile picture");
    for (const l of ["en", "hi", "te"]) {
      const c = nudgeBarCopy(l);
      expect(c.privacy, l).toMatch(/13/);
      expect(c.privacyMore.startsWith(" · "), l).toBe(true);
      expect(c.privacyMore, l).toContain("Google");
    }
  });

  it("the native Hindi notes page speaks Hindi whatever the cookie says; nothing else is fixed", () => {
    expect(fixedPageLocale("/exams/SSC_CGL/topics/ssc-cgl-percentages/hi")).toBe("hi");
    expect(fixedPageLocale("/exams/SSC_CGL/topics/ssc-cgl-percentages/hi/")).toBe("hi");
    expect(fixedPageLocale("/exams/SSC_CGL/topics/ssc-cgl-percentages/hi?x=1")).toBe("hi");
    for (const p of ["/exams/SSC_CGL/topics/ssc-cgl-percentages", "/hi/exams/SSC_CGL/syllabus", "/exams/SSC_CGL/topics/hi", "/exams/SSC_CGL/topics/x/quiz", "/", null, undefined]) {
      expect(fixedPageLocale(p), String(p)).toBeNull();
    }
  });
});

// ── content families ───────────────────────────────────────────────────

describe("contentFamily — where the bar may show (and the pages' placement ids)", () => {
  it.each([
    ["/exams/SSC_CGL/syllabus", "exam-syllabus"],
    ["/exams/SSC_CGL/updates", "exam-updates"],
    ["/hi/exams/SSC_CGL/cutoff", "exam-cutoff"],
    ["/te/exams/SSC_CGL/guide", "guide"],
    ["/exams/SSC_CGL/tricks", "tricks"],
    ["/exams/SSC_CGL/archive", "exam-archive"],
    ["/exams/SSC_CGL/checklist", "exam-checklist"],
    ["/exams/SSC_CGL/topics/ssc-cgl-percentages", "topic"],
    ["/exams/SSC_CGL/topics/ssc-cgl-percentages/hi", "topic"],
    ["/exams/SSC_CGL/news/ck123abc", "news"],
    ["/current-affairs", "current-affairs"],
    ["/current-affairs/2026-09-30", "ca-daily"],
    ["/current-affairs/capsule/2026-09", "ca-capsule"],
    ["/scholarships", "scholarships"],
    ["/scholarships/for/sc-st", "scholarships"],
    ["/scholarships/csss", "scholarship"],
    ["/careers", "careers"],
    ["/careers/intelligence-officer", "career"],
    ["/colleges", "colleges"],
    ["/colleges/state/tamil-nadu", "colleges"],
    ["/colleges/iit-madras", "college"],
    ["/exam-calendar", "exam-calendar"],
    ["/hi/exam-calendar", "exam-calendar"],
    ["/jobs-map", "jobs-map"],
    ["/ask?q=neet", "ask"],
    ["/schooling/cbse/class-8", "school"],
    ["/schooling/cbse/class-10/science/light", "school"],
  ])("%s → %s", (p, fam) => {
    expect(contentFamily(p)).toBe(fam);
  });

  it.each([
    "/",
    "/hi",
    "/exams/SSC_CGL", // the hub: its own box converts
    "/hi/exams/SSC_CGL",
    "/exams/SSC_CGL/quiz",
    "/exams/SSC_CGL/build-mock",
    "/exams/SSC_CGL/pyq/2024",
    "/exams/SSC_CGL/topics/x/quiz",
    "/exams/SSC_CGL/live",
    "/exams/browse",
    "/mocks/ck12345678",
    "/attempts/x/results",
    "/live-test",
    "/chat",
    "/chat?examCode=SSC_CGL",
    "/login?callbackUrl=%2F",
    "/dashboard",
    "/scholarships/match",
    "/schooling",
    "/schooling/cbse",
    "/schooling/cbse/class-1",
    "/schooling/cbse/class-7",
    "/schooling/cbse/class-5/science/x",
    "not-a-path",
  ])("never on %s", (p) => {
    expect(contentFamily(p)).toBeNull();
  });
  it("nothing for a missing path", () => {
    expect(contentFamily(null)).toBeNull();
    expect(contentFamily(undefined)).toBeNull();
  });
});

// ── (b) trigger ────────────────────────────────────────────────────────

describe("the bar's trigger: 45 active seconds OR 60% scroll, whichever is first", () => {
  it("the numbers", () => {
    expect(NUDGE_ACTIVE_SECONDS).toBe(45);
    expect(NUDGE_SCROLL_FRACTION).toBe(0.6);
  });
  it("time", () => {
    expect(nudgeTrigger(0, false)).toBeNull();
    expect(nudgeTrigger(44, false)).toBeNull();
    expect(nudgeTrigger(45, false)).toBe("time");
  });
  it("scroll wins when it comes first", () => {
    expect(nudgeTrigger(3, true)).toBe("scroll");
    expect(nudgeTrigger(60, true)).toBe("scroll");
  });
  it("scroll depth needs a real scroll and the screen's bottom past 60% of the page", () => {
    expect(scrollDepthReached(0, 800, 1000)).toBe(false); // a short page at load: no scroll yet
    expect(scrollDepthReached(100, 800, 4000)).toBe(false);
    expect(scrollDepthReached(1599, 800, 4000)).toBe(false);
    expect(scrollDepthReached(1600, 800, 4000)).toBe(true);
    expect(scrollDepthReached(NaN, 800, 4000)).toBe(false);
    expect(scrollDepthReached(100, 0, 4000)).toBe(false);
  });
});

// ── (a) appearing without a layout shift ───────────────────────────────

describe("revealWithoutShift — where the early line may appear with nothing on screen moving", () => {
  it("below the screen: always", () => {
    expect(revealWithoutShift(812, 812, 812, false)).toBe(true);
    expect(revealWithoutShift(2400, 2400, 812, true)).toBe(true);
  });
  it("on screen: never (that is the shift)", () => {
    expect(revealWithoutShift(0, 0, 812, true)).toBe(false);
    expect(revealWithoutShift(400, 400, 812, true)).toBe(false);
    expect(revealWithoutShift(811, 811, 812, true)).toBe(false);
  });
  it("above the screen: only where scroll anchoring keeps the reader's place", () => {
    expect(revealWithoutShift(-300, -300, 812, true)).toBe(true);
    expect(revealWithoutShift(-300, -300, 812, false)).toBe(false);
  });
  it("nothing without a real measurement", () => {
    expect(revealWithoutShift(900, 900, 0, true)).toBe(false);
    expect(revealWithoutShift(NaN, NaN, 812, true)).toBe(false);
  });
});

// ── the long-article cut ───────────────────────────────────────────────

const para = (w: string, n = 12) => Array.from({ length: n }, (_, i) => `${w} sentence ${i} of the notes.`).join(" ");
const NOTE = [
  "# Percentages",
  "",
  para("Intro", 30),
  "",
  "## Key ideas",
  "",
  "- A **bold** point",
  "- Another point",
  "",
  para("Ideas"),
  "| Form | Value |",
  "|---|---|",
  "| 1/2 | 50% |",
  "## Worked examples",
  "",
  "```",
  "## not a heading inside a fence",
  "```",
  "",
  "1. First",
  "2. Second",
  "",
  para("Examples"),
  "",
  "## Practice",
  "",
  para("Practice"),
].join("\n");

function loadNotesMarkdown(): (p: { markdown: string; rich?: boolean; demoteH1?: boolean }) => React.ReactElement {
  const out = ts.transpileModule(read("src/components/NotesMarkdown.tsx"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const stubs: Record<string, unknown> = { react: React, "react/jsx-runtime": jsxRuntime, "@/lib/notes-markdown": notesLib };
  const mod = { exports: {} as Record<string, unknown> };
  const req = (id: string) => {
    if (!(id in stubs)) throw new Error(`NotesMarkdown imports an unexpected module: ${id}`);
    return stubs[id];
  };
  new Function("require", "module", "exports", "process", out)(req, mod, mod.exports, process);
  return mod.exports.NotesMarkdown as (p: { markdown: string; rich?: boolean; demoteH1?: boolean }) => React.ReactElement;
}
const NotesMarkdown = loadNotesMarkdown();
const md = (markdown: string, rich = false) => renderToStaticMarkup(React.createElement(NotesMarkdown, { markdown, rich, demoteH1: rich }));

describe("splitAfterFirstSection", () => {
  it("cuts before the first section heading once the opening has substance", () => {
    const parts = splitAfterFirstSection(NOTE);
    expect(parts).not.toBeNull();
    expect(parts![0]).toContain("Intro sentence 29");
    expect(parts![0]).not.toContain("## Key ideas");
    expect(parts![1].startsWith("## Key ideas")).toBe(true);
    expect(parts![0] + "\n" + parts![1]).toBe(NOTE);
  });

  it("the two parts render exactly the blocks the whole did (both renderers)", () => {
    const [a, b] = splitAfterFirstSection(NOTE)!;
    // rich (topic notes): one escaped HTML string per part, blocks joined by "\n"
    expect(notesLib.notesMarkdownHtml(a, { demoteH1: true }) + "\n" + notesLib.notesMarkdownHtml(b, { demoteH1: true })).toBe(
      notesLib.notesMarkdownHtml(NOTE, { demoteH1: true }),
    );
    // plain (guide, tricks): a fragment of elements — the page HTML is byte-identical
    expect(md(a) + md(b)).toBe(md(NOTE));
  });

  it("never cuts inside a fence, before a pipe line, or when little follows", () => {
    // Each opening is long enough that only the named rule stops the cut.
    const fenced = ["```", para("Code", 40), "## inside", para("More code", 20), "```", "", "## After", "", "tail"].join("\n");
    expect(splitAfterFirstSection(fenced)).toBeNull(); // the only real heading has a short tail
    const piped = [para("Opening", 40), "## A | B", para("Tail", 20)].join("\n");
    expect(splitAfterFirstSection(piped)).toBeNull();
    expect(splitAfterFirstSection(piped.replace("## A | B", "## A and B"))).not.toBeNull();
    const shortHead = ["# T", "", "Short intro.", "", "## Next", "", para("Tail", 20)].join("\n");
    expect(splitAfterFirstSection(shortHead)).toBeNull();
    expect(splitAfterFirstSection([para("Head", 40), "", "## Last", "", "One line."].join("\n"))).toBeNull();
    expect(splitAfterFirstSection("")).toBeNull();
    expect(splitAfterFirstSection(null)).toBeNull();
  });

  // 30 Sep 2026 (review): after 300 characters the cut often fell inside the
  // first phone screen (a layout shift on the topic-notes family).
  it("the opening must hold about a phone screen of text (800 characters) before the cut", () => {
    expect(SPLIT_MIN_HEAD_CHARS).toBe(800);
    const mid = [para("Head", 16), "", "## Next", "", para("Tail", 20)].join("\n"); // ~480 characters, then a section
    expect(splitAfterFirstSection(mid)).toBeNull();
    expect(splitAfterFirstSection(mid, 300)).not.toBeNull();
    expect(splitAfterFirstSection([para("Head", 30), "", "## Next", "", para("Tail", 20)].join("\n"))).not.toBeNull();
  });

  it("reads CRLF notes the same", () => {
    const parts = splitAfterFirstSection(NOTE.replace(/\n/g, "\r\n"));
    expect(parts?.[1].startsWith("## Key ideas")).toBe(true);
  });
});

// ── (a) the island ─────────────────────────────────────────────────────

describe("SignupInline (source)", () => {
  const src = read("src/components/SignupInline.tsx");
  const code = stripComments(src);
  it("is a client island: nothing on the server, guests only, never where the site offer may not show", () => {
    expect(src.startsWith('"use client";')).toBe(true);
    expect(code).toContain("if (!pitchAllowedPath(location.pathname)) return;");
    expect(code).toContain("if (!alive || signedIn !== false) return;");
    expect(code).toContain("if (!copy) return null;");
    expect(code).toContain("const lc = locale ?? clientUiLocale();");
    expect(code).toContain("setCopy(signupLineCopy(lc, exam, practice));");
  });
  // 30 Sep 2026 (review): no layout shift from the in-article and lower mounts.
  it("revealOffscreen: an empty zero-height marker first, shown only where nothing on screen moves", () => {
    expect(code).toContain("if (!revealOffscreen) setShown(true);");
    expect(code).toContain('if (!shown) return <div ref={marker} aria-hidden="true" style={{ height: 0, margin: 0 }} />;');
    const layout = code.slice(code.indexOf("useLayoutEffect(() => {"), code.indexOf("}, [copy, shown]);"));
    expect(layout).toContain("if (!copy || shown || !el) return;");
    expect(layout).toContain("return revealWithoutShift(r.top, r.bottom, window.innerHeight, anchoring);");
    // Measured before paint: off screen now → at once.
    expect(layout.indexOf("if (safe()) {")).toBeLessThan(layout.indexOf("new IntersectionObserver("));
    // On screen: only once the marker has left the screen AND the spot is safe; no observer → never.
    expect(layout).toContain('if (typeof IntersectionObserver === "undefined") return;');
    expect(layout).toContain("if (entries.some((e) => !e.isIntersecting) && safe()) {");
    expect(code).toContain('return typeof CSS !== "undefined" && CSS.supports("overflow-anchor", "auto");');
    // "seen" counts the real block only.
    expect(code).toContain('if (!shown || !el || typeof IntersectionObserver === "undefined") return;');
  });
  it("a real button (full width on phones) through build 1's sign-in, placement = page family", () => {
    // 2 Oct 2026 (founder, standing): the one shared "Sign up with Google"
    // button (Google's white button with the "G"; SignInLink underneath) —
    // still full width on phones (block; auto from sm), placement = family.
    expect(code).toMatch(/<SignUpButton\s+href=\{href\}\s+surface="signup-inline"\s+locale=\{lang\}\s+exam=\{exam\}\s+practice=\{practice\}\s+explain="own"\s+block/);
    expect(code).toContain('className="mt-3 shrink-0 sm:mt-0 sm:w-auto"');
    expect(code).toContain("beaconProps={{ placement: surface }}");
    expect(code).not.toContain("bg-saffron-500");
    expect(code).toContain("data-signup-inline={surface}");
    expect(code).toContain("print:hidden");
  });
  it("one 'seen' beacon, the first time it is on screen", () => {
    const seen = code.slice(code.indexOf("new IntersectionObserver("));
    expect(seen.indexOf("io.disconnect();")).toBeLessThan(seen.indexOf("ctaBeacon("));
    expect(code).toContain('ctaBeacon("signup-inline", { action: "seen", surface: "signup-inline", placement: surface });');
  });
  it("left 'Next on Shishya': the box is links only now", () => {
    const la = read("src/components/LandingActions.tsx");
    expect(stripComments(la)).not.toContain("SignupInline");
    expect(la).not.toMatch(/signup\?: boolean/);
  });
});

describe("one early line per content page, right after its first answer block", () => {
  const mounts = (src: string) => (stripComments(src).match(/<SignupInline\b/g) ?? []).length;
  const before = (src: string, a: string, b: string) => {
    const c = stripComments(src);
    expect(c.indexOf(a), a).toBeGreaterThan(-1);
    expect(c.indexOf(b), b).toBeGreaterThan(-1);
    expect(c.indexOf(a), `${a} before ${b}`).toBeLessThan(c.indexOf(b));
  };

  it.each([
    // file, surface, the answer before it, what follows it, its other props
    ["src/app/exams/[code]/syllabus/page.tsx", "exam-syllabus", "{lead && <p", "<LandingActions", "exam={exam.shortName} practice={practice.hasPractice}"],
    ["src/app/exams/[code]/updates/page.tsx", "exam-updates", "{updatesLeadText && <p", "<LandingActions", "exam={short} practice={practice.hasPractice}"],
    ["src/app/exams/[code]/cutoff/page.tsx", "exam-cutoff", "{lead && <p", "<LandingActions", "exam={short} practice={practice.hasPractice}"],
    ["src/app/careers/[slug]/page.tsx", "career", "{c.dek}</p>", "<LandingActions", ""],
    ["src/app/scholarships/[id]/page.tsx", "scholarship", "{leadLine}", "<LandingActions", ""],
    // 30 Sep 2026 (review): after the funnel card — both open with "Preparing for {exam}?".
    ["src/app/exams/[code]/news/[id]/page.tsx", "news", "Preparing for {row.exam.shortName}? Everything on Shishya is free.", "</section>", "exam={row.exam.shortName} practice={practice.hasPractice} revealOffscreen"],
    ["src/app/colleges/[slug]/page.tsx", "college", "{c.blurb}</p>", "Streams &amp; faculty", "revealOffscreen"],
    ["src/app/jobs-map/page.tsx", "jobs-map", "{STATE.map((t) => (", "How to read this map", "revealOffscreen"],
  ])("%s mounts it once (%s), after the answer", (file, surface, answer, next, props) => {
    const src = read(file);
    expect(src).toContain('import { SignupInline } from "@/components/SignupInline";');
    expect(mounts(src)).toBe(1);
    const tag = `<SignupInline surface="${surface}"${props ? ` ${props}` : ""} />`;
    expect(src).toContain(tag);
    before(src, answer, tag);
    before(src, tag, next);
  });

  it("news: the funnel card's own \"Preparing for {exam}?\" box comes first, then the line", () => {
    const src = stripComments(read("src/app/exams/[code]/news/[id]/page.tsx"));
    const card = src.indexOf("Preparing for {row.exam.shortName}? Everything on Shishya is free.");
    const line = src.indexOf("<SignupInline");
    expect(src.slice(src.indexOf("</article>"), card)).not.toContain("<SignupInline");
    expect(line).toBeGreaterThan(src.indexOf("{newsPermalinkCopy(row.exam.shortName, hasNotes).syllabusLabel}"));
  });

  it("current affairs: after the first category (daily) / first day (capsule), inside the list", () => {
    const daily = read("src/app/current-affairs/[date]/page.tsx");
    expect(mounts(daily)).toBe(1);
    expect(daily).toContain('{ci === 0 && <SignupInline surface="ca-daily" revealOffscreen />}');
    before(daily, "{r.summary}", "{ci === 0 && <SignupInline");
    before(daily, "<LandingActions", "{ci === 0 && <SignupInline");
    const cap = read("src/app/current-affairs/capsule/[month]/page.tsx");
    expect(mounts(cap)).toBe(1);
    expect(cap).toContain('{di === 0 && <SignupInline surface="ca-capsule" revealOffscreen />}');
    before(cap, "{it.summary}", "{di === 0 && <SignupInline");
  });

  it("exam calendar: after this week's dates, else after the first month — never both", () => {
    const src = read("src/app/exam-calendar/page.tsx");
    expect(mounts(src)).toBe(2);
    expect(src).toContain('{thisWeek.length > 0 && <SignupInline surface="exam-calendar" revealOffscreen />}');
    expect(src).toContain('{mi === 0 && thisWeek.length === 0 && <SignupInline surface="exam-calendar" revealOffscreen />}');
    before(src, "{thisWeek.map((r) => (", "{thisWeek.length > 0 && <SignupInline");
  });

  it.each([
    ["src/app/exams/[code]/guide/page.tsx", "guideMd", "guideParts", '<SignupInline surface="guide" exam={exam.shortName} practice={practice.hasPractice} revealOffscreen />', "<NotesMarkdown markdown={guideParts[0]} />", "<NotesMarkdown markdown={guideParts[1]} />"],
    ["src/app/exams/[code]/tricks/page.tsx", "tricksMd", "tricksParts", '<SignupInline surface="tricks" exam={exam.shortName} practice={practice.hasPractice} revealOffscreen />', "<NotesMarkdown markdown={tricksParts[0]} />", "<NotesMarkdown markdown={tricksParts[1]} />"],
    ["src/app/exams/[code]/topics/[topicCode]/hi/page.tsx", "hiMd", "hiParts", '<SignupInline surface="topic" exam={exam.shortName} practice={examHasPractice} locale="hi" revealOffscreen />', "<NotesMarkdown markdown={hiParts[0]} rich demoteH1 />", "<NotesMarkdown markdown={hiParts[1]} rich demoteH1 />"],
  ])("%s: between the article's first section and the rest, else after the article", (file, mdVar, parts, tag, first, second) => {
    const src = read(file);
    expect(src).toContain(`const ${parts} = splitAfterFirstSection(${mdVar});`);
    expect(mounts(src)).toBe(2);
    before(src, first, tag);
    before(src, tag, second);
    // the fallback only when there is no cut
    expect(src).toContain(`{!${parts} && ${tag}}`);
    before(src, "</article>", `{!${parts} && `);
  });

  it("topic page: after the notes' first section, else after the notes→quiz bridge; no notes → after the questions", () => {
    const src = read("src/app/exams/[code]/topics/[topicCode]/page.tsx");
    const tag = '<SignupInline surface="topic" exam={exam.shortName} practice={examHasPractice} revealOffscreen />';
    expect(mounts(src)).toBe(3);
    expect(src).toContain("const notesParts = splitAfterFirstSection(notesMd);");
    before(src, "<NotesMarkdown markdown={notesParts[0]} rich demoteH1 />", tag);
    before(src, tag, "<NotesMarkdown markdown={notesParts[1]} rich demoteH1 />");
    // The bridge stays first after the notes (its own 27 Sep rule).
    before(src, "<InlineTopicQuestion", `{!notesParts && ${tag}}`);
    before(src, `{!notesParts && ${tag}}`, "questions={shownQs.slice(1)}");
    // No notes: the questions come first.
    const noNotes = src.slice(src.indexOf("questions={shownQs}"));
    expect(noNotes).toContain(tag);
  });

  it("never on the hub, PYQ, quiz, build-mock or any school page (their own buttons, or no sign-in at all)", () => {
    for (const f of [
      "src/app/exams/[code]/page.tsx",
      "src/app/exams/[code]/pyq/[year]/page.tsx",
      "src/app/exams/[code]/build-mock/page.tsx",
      "src/app/page.tsx",
    ]) {
      expect(read(f), f).not.toContain("<SignupInline");
    }
    const schooling = path.join(ROOT, "src/app/schooling");
    const walk = (d: string): string[] =>
      fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".tsx") ? [path.join(d, e.name)] : []));
    for (const f of walk(schooling)) expect(fs.readFileSync(f, "utf8"), f).not.toContain("<SignupInline");
  });

  it("every placement id is the page's content family", () => {
    const ids: [string, string][] = [
      ["exam-syllabus", "/exams/X/syllabus"],
      ["exam-updates", "/exams/X/updates"],
      ["exam-cutoff", "/exams/X/cutoff"],
      ["career", "/careers/x"],
      ["scholarship", "/scholarships/x"],
      ["news", "/exams/X/news/y"],
      ["college", "/colleges/x"],
      ["jobs-map", "/jobs-map"],
      ["ca-daily", "/current-affairs/2026-09-30"],
      ["ca-capsule", "/current-affairs/capsule/2026-09"],
      ["exam-calendar", "/exam-calendar"],
      ["guide", "/exams/X/guide"],
      ["tricks", "/exams/X/tricks"],
      ["topic", "/exams/X/topics/y"],
    ];
    for (const [id, p] of ids) expect(contentFamily(p), p).toBe(id);
  });

  // Every page that mounts the line, found by walking src/app.
  const pagesWithLine = (): [string, string][] => {
    const walk = (d: string): string[] =>
      fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".tsx") ? [path.join(d, e.name)] : []));
    return walk(path.join(ROOT, "src/app"))
      .map((f) => [path.relative(ROOT, f).replace(/\\/g, "/"), stripComments(fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n"))] as [string, string])
      .filter(([, src]) => src.includes("<SignupInline"));
  };

  // 30 Sep 2026 (review): "{exam} mocks, scores and weak topics" only where the
  // exam has practice (src/lib/exam-practice-state.ts) — every exam-named mount
  // passes the page's practice state, read through the one cached rule.
  it("every mount that names an exam also passes that exam's practice state", () => {
    const pages = pagesWithLine();
    expect(pages.length).toBeGreaterThanOrEqual(14);
    let examMounts = 0;
    for (const [file, src] of pages) {
      for (const tag of src.match(/<SignupInline\b[^>]*\/>/g) ?? []) {
        if (!/\sexam=/.test(tag)) continue;
        examMounts += 1;
        expect(tag, file).toMatch(/\spractice=\{(?:practice\.hasPractice|examHasPractice)\}/);
        expect(src, file).toContain('import { examPracticeState } from "@/lib/db/exam-practice";');
        expect(src, file).toMatch(/examPracticeState\((?:exam|row\.exam)\.code\)/);
      }
    }
    expect(examMounts).toBe(13);
    // tricks reads the practice rule (fails closed), not the buildMock gate (fails open).
    expect(stripComments(read("src/app/exams/[code]/tricks/page.tsx"))).toMatch(/const \[rows, gates, practice\] = await Promise\.all\(\[[\s\S]*?examPageGates\(exam\.code\),\s*examPracticeState\(exam\.code\),\s*\]\);/);
    for (const f of ["src/app/exams/[code]/topics/[topicCode]/page.tsx", "src/app/exams/[code]/topics/[topicCode]/hi/page.tsx"]) {
      expect(read(f), f).toContain("const examHasPractice = (await examPracticeState(exam.code)).hasPractice;");
    }
  });

  // 30 Sep 2026 (review): the in-article and lower mounts wait for a spot where
  // nothing on screen moves; the lead-paragraph pages keep the early, visible line.
  it("revealOffscreen on every mount except the lead-paragraph pages", () => {
    const lead = new Set([
      "src/app/exams/[code]/syllabus/page.tsx",
      "src/app/exams/[code]/updates/page.tsx",
      "src/app/exams/[code]/cutoff/page.tsx",
      "src/app/careers/[slug]/page.tsx",
      "src/app/scholarships/[id]/page.tsx",
      // 2 Oct 2026: /ask?q= had a line under the AI answer for a few hours;
      // removed the same day (review) — nothing sat between it and the site
      // card. Pinned in tests/unit/signup-cta.test.ts.
    ]);
    const pages = pagesWithLine();
    for (const f of lead) expect(pages.map(([p]) => p), f).toContain(f);
    for (const [file, src] of pages) {
      for (const tag of src.match(/<SignupInline\b[^>]*\/>/g) ?? []) {
        if (lead.has(file)) expect(tag, file).not.toContain("revealOffscreen");
        else expect(tag, file).toMatch(/\srevealOffscreen \/>$/);
      }
    }
  });
});

// ── (b) the bar ────────────────────────────────────────────────────────

describe("SignupNudge (source)", () => {
  const src = read("src/components/SignupNudge.tsx");
  const code = stripComments(src);
  it("content pages only; no stored counters; the old 5-minute + 3-page rule is gone", () => {
    expect(code).toContain("return blockedPath(p) ? null : contentFamily(p);");
    expect(code).not.toMatch(/5 \* 60|MIN_PAGEVIEWS|SS_VIEWS|SS_SECONDS|sessionStorage/);
    expect(code).toContain("const trigger = nudgeTrigger(pageSeconds.current, scrolledPast.current);");
    expect(code).toContain("if (!trigger || inlineOnScreen()) return;");
    expect(code).toContain("scrollDepthReached(window.scrollY, window.innerHeight, document.documentElement.scrollHeight)");
    // A new page starts its own count.
    expect(code).toMatch(/useEffect\(\(\) => \{\s*pageSeconds\.current = 0;\s*scrolledPast\.current = false;\s*\}, \[pathname\]\);/);
    // Navigating off a content page hides it (another content page keeps it, under its own family).
    expect(code).toMatch(/const here = nudgePlacement\(pathname\);\s*if \(here !== show\) setShow\(here\);/);
  });
  it("keeps the caps: once a day, 3 dismissals, gone after 1 click, the forced guest check", () => {
    expect(code).toContain("const MAX_DISMISSALS = 3;");
    expect(code).toContain("if (localStorage.getItem(LS_DONE)) return;");
    expect(code).toContain('if (Number(localStorage.getItem(LS_DISMISS) ?? "0") >= MAX_DISMISSALS) return;');
    expect(code).toContain("if (localStorage.getItem(LS_LAST) === today) return;");
    expect(code).toContain("localStorage.setItem(LS_LAST, today);");
    expect(code).toMatch(/onSignInClick=\{\(\) => \{\s*try \{ localStorage\.setItem\(LS_DONE, "1"\); \}/);
    expect(code).toContain("fetchSignedIn({ force: true })");
  });
  it("beacons carry the page family: shown (+ trigger), dismissed, and build 1's click", () => {
    expect(code).toContain('beacon("shown", { placement: here, trigger });');
    expect(code).toContain('beacon("dismissed", { placement: show });');
    expect(code).toMatch(/surface="signup-nudge"[\s\S]{0,600}beaconProps=\{\{ placement: show \}\}/);
    expect(code).toContain('props: { cta: "signup-nudge", surface: "signup-nudge", action, ...extra }');
  });
  it("a slim bar: bottom on phones, a small corner on desktop, the ✕ kept, still a (non-modal) dialog", () => {
    expect(code).toContain('className="fixed inset-x-0 bottom-0 z-40 print:hidden sm:inset-x-auto sm:bottom-16 sm:right-4 sm:max-w-md"');
    expect(code).toContain('role="dialog"');
    expect(code).not.toContain("aria-modal");
    expect(code).toContain("line-clamp-2");
    expect(code).toMatch(/aria-label=\{copy\.later\}[\s\S]{0,200}✕/);
  });
  // 30 Sep 2026 (review): the desktop card sat exactly on FeedbackWidget's pill.
  it("the desktop card sits above the 'Suggest a feature' pill, not on it", () => {
    expect(stripComments(read("src/components/FeedbackWidget.tsx"))).toContain('className="fixed bottom-4 right-4 z-40 ');
    expect(code).not.toContain("sm:bottom-4");
  });
  it("the free + age line on every screen, what Google shares on wider ones", () => {
    expect(code).toMatch(/\{copy\.privacy\}\s*<span className="hidden sm:inline">\{copy\.privacyMore\}<\/span>/);
    // not clamped away with the line
    const para = /<p className="([^"]*)">\s*\{copy\.privacy\}/.exec(code)?.[1] ?? "";
    expect(para).not.toMatch(/hidden|line-clamp|truncate/);
  });
  it("the native Hindi notes get the Hindi bar; everywhere else the reader's language", () => {
    expect(code).toContain("const barLocale = fixedPageLocale(pathname) ?? clientUiLocale();");
    expect(code).toContain("const copy = nudgeBarCopy(barLocale);");
    // 2 Oct 2026: the button follows the same language.
    expect(code).toContain("locale={barLocale}");
  });
});
