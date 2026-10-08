// Late answers reach the student (7 Oct 2026, build B3) — the rules in
// src/lib/late-answer-notice.ts and the seams that use them. What it pins:
//   • plain /chat (the header's Ask Shishya) opens the late answer's
//     conversation; anything the URL names (an exam, the general chat, a
//     topic, a seed, a saved chat, a review, a follow-up) keeps the student's
//     own intent and gets the line at the top instead — so "New chat" and the
//     exam dropdown never send a student back;
//   • the strip under the header: on the pages members came back to on 1-7
//     Oct (/today, results, build-mock, PYQ …), never where the card leads
//     with it already (home, dashboard, an exam hub), never on /chat, during a
//     paper, on sign-in pages or on a page a child may read;
//   • its tab cache (10 minutes) and the API answer's shape;
//   • replayed on the 7 Oct read: every one of the 8 students who came back
//     and never saw their answer is offered it on the first page they opened;
//   • the seams: /chat reads the late answer only for a signed-in member past
//     the 13-17 redirect, opens it only through lateAnswerOpensChat, never in
//     the school branch; the reopened chat's answers are marked seen only
//     after a branch shows it (the loader writes nothing); a guest on a saved
//     chat's link signs in back to it; the island shows the line first; the
//     header mounts the strip off admin and Class 1-7 pages.
// Pure + source reads — no DB. Run: npx vitest run tests/unit/late-answer-notice.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  LATE_STRIP_CACHE_MS,
  lateAnswerOpensChat,
  lateStripCacheValue,
  lateStripPathAllowed,
  lateStripViewOf,
  readLateStripCache,
} from "@/lib/late-answer-notice";
import { PICKUP_ANSWERED_DAYS, lateAnswerView, pickLateAnswer, pickupView } from "@/lib/pickup";
import { RECENT_CHATS_DAYS, RESUME_TURNS, historyToBubbles, replyShownOnReopen, shownUnseenLateIds } from "@/lib/recent-chats";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8").replace(/\r\n/g, "\n");
const code = (file: string) => read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const NOW = new Date("2026-10-07T06:30:00Z");
const DAY = 86_400_000;
const VIEW = {
  label: "Your question is answered",
  text: "Why is 1 not prime?",
  note: "Our AI tutor was unavailable when you asked. It has answered now.",
  meta: "SSC CGL · 5 days ago",
  href: "/chat?examCode=SSC_CGL&session=s_late_001",
  cta: "See the answer →",
};

describe("lateAnswerOpensChat — when /chat opens the answered conversation", () => {
  it("plain /chat (the header's Ask Shishya), UTM params and blanks aside", () => {
    expect(lateAnswerOpensChat({})).toBe(true);
    expect(lateAnswerOpensChat({ seed: "  ", topicCode: "" })).toBe(true);
    expect(lateAnswerOpensChat({ utm_source: "email" } as Record<string, string>)).toBe(true);
  });
  it("anything the URL names is the student's own intent: never opened over it", () => {
    for (const sp of [
      { examCode: "SSC_CGL" },
      { general: "1" },
      { topicCode: "quant.ratio" },
      { seed: "Quiz me on Percentage" },
      { session: "cmg1abcd2000008l4efgh1234" },
      { review: "cmg1attempt00001" },
      { f: "answer" },
    ]) {
      expect(lateAnswerOpensChat(sp), JSON.stringify(sp)).toBe(false);
    }
  });
  it("so 'New chat' (?general=1 / ?examCode=) and the exam dropdown never send the student back to it", () => {
    for (const href of ["/chat?general=1", "/chat?examCode=SSC_CGL", "/chat?examCode=NCERT_C09&topicCode=sci.matter"]) {
      const sp = Object.fromEntries(new URL(href, "https://shishya.in").searchParams.entries());
      expect(lateAnswerOpensChat(sp), href).toBe(false);
    }
  });
});

describe("lateStripPathAllowed — where the strip under the header shows", () => {
  it("the pages members came back to", () => {
    for (const p of [
      "/today",
      "/attempts/cmus1qz7c00033fhbkfwpu066/results",
      "/exams/IBPS_PO/build-mock",
      "/exams/UK_UKSSSC/pyq/2023",
      "/exams/AP_APPSC_GROUP2/topics/gs.indian_history",
      "/exams/browse",
      "/exams/entrance",
      "/coach",
      "/me",
      "/current-affairs",
      "/hi/exams/SSC_CGL/syllabus",
    ]) {
      expect(lateStripPathAllowed(p), p).toBe(true);
    }
  });
  it("not where the pick-up card leads with it (home, dashboard, an exam hub), not on /chat or during a paper", () => {
    for (const p of ["/", "/dashboard", "/exams/SSC_CGL", "/exams/MP_MPESB/", "/hi/exams/SSC_CGL", "/te", "/chat", "/chat?examCode=SSC_CGL", "/mocks/cmus1qx2j00063i4t8s9wpqfp"]) {
      expect(lateStripPathAllowed(p), p).toBe(false);
    }
  });
  it("never on sign-in, onboarding, admin, API or invite pages, nor where a child may read", () => {
    for (const p of [
      "/login",
      "/login?callbackUrl=%2Fchat",
      "/logout",
      "/onboarding/exam",
      "/admin/questions",
      "/api/me/late-answer",
      "/join/abc",
      "/i/dashboard",
      "/unsubscribe",
      "/schooling",
      "/schooling/cbse",
      "/schooling/cbse/class-5",
      "/schooling/cbse/class-7/maths/fractions",
    ]) {
      expect(lateStripPathAllowed(p), p).toBe(false);
    }
    for (const bad of [null, undefined, "", "today", "https://shishya.in/today"]) expect(lateStripPathAllowed(bad as string)).toBe(false);
  });
});

describe("the strip's tab cache and the API answer", () => {
  it("a fresh copy is used (a line, or nothing to show); a stale, future-dated or malformed one asks again", () => {
    const t = NOW.getTime();
    expect(readLateStripCache(lateStripCacheValue(VIEW, t), t + 60_000)).toEqual({ view: VIEW });
    expect(readLateStripCache(lateStripCacheValue(null, t), t + 60_000)).toEqual({ view: null });
    expect(readLateStripCache(lateStripCacheValue(VIEW, t), t + LATE_STRIP_CACHE_MS + 1)).toBeNull();
    expect(readLateStripCache(lateStripCacheValue(VIEW, t), t - 1)).toBeNull();
    for (const raw of [null, undefined, "", "{", "[]", '{"at":"x","view":null}', JSON.stringify({ at: t, view: { ...VIEW, href: "https://evil.example/" } })]) {
      expect(readLateStripCache(raw, t), String(raw)).toBeNull();
    }
  });
  it("lateStripViewOf: the API's { answered } when it is a whole line into /chat, else nothing", () => {
    expect(lateStripViewOf({ answered: VIEW })).toEqual(VIEW);
    expect(lateStripViewOf({ answered: null })).toBeNull();
    expect(lateStripViewOf({ answered: { ...VIEW, cta: 3 } })).toBeNull();
    expect(lateStripViewOf({ answered: { ...VIEW, href: "/login" } })).toBeNull();
    expect(lateStripViewOf(null)).toBeNull();
  });
});

describe("the line is the card's own line", () => {
  it("lateAnswerView = the card's answered line; 14 days on the card (the Recent chats window)", () => {
    const la = { sessionId: "s_late_001", examCode: "SSC_CGL", examShort: "SSC CGL", answeredAt: new Date(NOW.getTime() - 5 * DAY), question: "Why is 1 not prime?" };
    expect(lateAnswerView(la, "en", NOW)).toEqual(VIEW);
    expect(pickupView({ thread: null, mock: null, lateAnswer: la }, "en", NOW)!.answered).toEqual(VIEW);
    expect(PICKUP_ANSWERED_DAYS).toBe(RECENT_CHATS_DAYS);
    expect(PICKUP_ANSWERED_DAYS).toBe(14);
  });
});

// The 7 Oct 2026 read: the first page each of the 8 students opened after their
// late answer, and the day it was (answers stored 1-2 Oct). None saw it then.
describe("replayed on the 7 Oct read: every returning student is offered the answer on their first page", () => {
  const firstVisits: Array<{ path: string; day: number; hubEnrolled?: boolean }> = [
    { path: "/today", day: 0.4 },
    { path: "/exams/TS_POLICE_PC/build-mock", day: 1.5 },
    { path: "/exams/MP_MPESB", day: 3.3, hubEnrolled: true },
    { path: "/mocks/cmup6xuxt0003113hnap3uua6", day: 0 }, // a paper: then its results page, below
    { path: "/attempts/cmum9wx5c0007umylx6jgzpqy/results", day: 0.3 },
    { path: "/exams/IBPS_CLERK", day: 4.5, hubEnrolled: true },
    { path: "/exams/UK_UKSSSC/pyq/2023", day: 1 },
    { path: "/exams/IBPS_PO/build-mock", day: 0.01 },
  ];
  it("the strip, or the hub's card (now 14 days, any exam), or — during a paper — the results page right after", () => {
    for (const v of firstVisits) {
      const answeredAt = NOW.getTime() - v.day * DAY;
      const row = { sessionId: "s", ownerId: "u1", examCode: "SSC_CGL", examShort: "SSC CGL", examCategory: "GOVT_JOBS", metadata: { lateAnswer: true, lateAnsweredAt: answeredAt - 1 } };
      const onCard = pickLateAnswer([row], "u1", NOW) !== null;
      const offered = lateStripPathAllowed(v.path) || (v.hubEnrolled === true && onCard) || (v.path.startsWith("/mocks/") && lateStripPathAllowed("/attempts/x/results"));
      expect(offered, v.path).toBe(true);
      // The hubs were reached after the card's old 3 days.
      if (v.hubEnrolled) expect(v.day).toBeGreaterThan(3);
    }
  });
  it("and on /chat: the right exam's chat, another exam's chat or a results-page seed show the line; the header's Ask Shishya opens it", () => {
    expect(lateAnswerOpensChat({ examCode: "TS_POLICE_PC" })).toBe(false); // opened 6 times on answer day: now the line, first
    expect(lateAnswerOpensChat({ examCode: "AP_APPSC_GROUP1" })).toBe(false); // the answer was in GROUP2: now the line
    expect(lateAnswerOpensChat({})).toBe(true);
  });
});

// B3 review: every offer (card, strip, /chat line, plain /chat, "new answer")
// must open onto the answer, and the seen mark must follow what is shown.
describe("an offered late answer is one the reopened chat shows", () => {
  /** A conversation: the question, its late answer 1 ms after it, then `after` rows; the chat's window of RESUME_TURNS rows. */
  const windowFor = (after: number) => {
    const all = [
      { id: "q", role: "USER", content: "Why is 1 not prime?" },
      { id: "late", role: "ASSISTANT", content: "Because…", metadata: { lateAnswer: true, lateAnsweredAt: NOW.getTime() } },
      ...Array.from({ length: after }, (_, i) => ({ id: `r${i}`, role: i % 2 ? "ASSISTANT" : "USER", content: `m${i}` })),
    ];
    return all.slice(-RESUME_TURNS);
  };
  it("replyShownOnReopen(rowsAfter) ⇔ the chat's bubbles hold it ⇔ the loader names it for the seen mark", () => {
    for (let after = 0; after <= RESUME_TURNS + 2; after++) {
      const rows = windowFor(after);
      const shown = historyToBubbles(rows).some((b) => b.id === "h-late");
      expect(replyShownOnReopen(after), String(after)).toBe(shown);
      expect(shownUnseenLateIds(rows).includes("late"), String(after)).toBe(shown);
    }
    expect(replyShownOnReopen(RESUME_TURNS - 2)).toBe(true);
    expect(replyShownOnReopen(RESUME_TURNS - 1)).toBe(false);
    for (const bad of [-1, 1.5, Number.NaN]) expect(replyShownOnReopen(bad)).toBe(false);
  });
  it("only unseen late answers are named; a window with no question names none", () => {
    const rows = [
      { id: "q", role: "USER", content: "Q" },
      { id: "seen", role: "ASSISTANT", content: "A", metadata: { lateAnswer: true, lateSeenAt: 1 } },
      { id: "live", role: "ASSISTANT", content: "B", metadata: { actions: null } },
      { id: "new", role: "ASSISTANT", content: "C", metadata: { lateAnswer: true } },
    ];
    expect(shownUnseenLateIds(rows)).toEqual(["new"]);
    expect(shownUnseenLateIds(rows.slice(1))).toEqual([]);
  });
});

describe("seams", () => {
  const page = code("src/app/chat/page.tsx");
  const guestStart = page.indexOf("if (!session?.user?.id) {");
  const schoolStart = page.indexOf("if (schoolCls !== null) {");
  const minor = page.indexOf("if (schoolProfile && isMinorBand(schoolProfile.band)) redirect(");
  const lateRead = page.indexOf("const late = await loadPickupLateAnswer(session.user.id, { now }).catch(() => null);");

  it("/chat reads the late answer only for a signed-in member, after the 13-17 redirect, and opens it only on plain /chat", () => {
    expect(lateRead).toBeGreaterThan(guestStart);
    expect(lateRead).toBeGreaterThan(minor);
    expect(lateRead).toBeLessThan(page.indexOf("let enrollments = await prisma.enrollment.findMany("));
    expect(page).toContain("if (late && lateAnswerOpensChat(sp)) redirect(chatResumeHref({ examCode: late.examCode, sessionId: late.sessionId }));");
    expect(page.match(/loadPickupLateAnswer\(/g)).toHaveLength(1);
    // The line skips the conversation already on screen.
    expect(page).toContain("late && late.sessionId !== shown?.sessionId ? lateAnswerView(late, locale, now) : null");
    expect(page).toContain("lateAnswer={lateLine(generalResume)}");
    expect(page).toContain("lateAnswer={lateLine(examResume)}");
  });

  it("the school branch never gets the line (school chats: the class chat's own list only)", () => {
    const school = page.slice(schoolStart, guestStart);
    expect(school).not.toMatch(/lateAnswer=|lateLine\(|loadPickupLateAnswer/);
  });

  it("seen is marked only after a branch shows the conversation; the loader writes nothing", () => {
    expect(page).toContain("if (view && saved && saved.lateUnseenIds.length > 0) await markLateAnswersSeen(saved.lateUnseenIds, Date.now());");
    expect(page.match(/markLateAnswersSeen\(/g)).toHaveLength(1);
    for (const [resume, make] of [
      ["schoolResume", "const schoolResume = resumeIn("],
      ["generalResume", "const generalResume = resumeIn("],
      ["examResume", "const examResume = currentEnrollment ? resumeIn("],
    ] as const) {
      const at = page.indexOf(make);
      expect(at, resume).toBeGreaterThan(0);
      expect(page.indexOf(`await markShown(${resume});`), resume).toBeGreaterThan(at);
    }
    const db = code("src/lib/db/recent-chats.ts");
    const loader = db.slice(db.indexOf("export async function loadResumableChat("), db.indexOf("export async function findMistakeReviewChat("));
    expect(loader).not.toContain("markLateAnswersSeen(");
    expect(loader).not.toContain("$executeRaw");
    expect(loader).toContain("lateUnseenIds: shownUnseenLateIds(rows),");
  });

  it("a guest on a saved chat's link: the reason line says to sign in with the same account, and sign-in returns to that chat", () => {
    const guest = page.slice(guestStart, page.indexOf("const chatOpenedProps = {"));
    expect(guest).toContain("const guestResumeId = resumeSessionParam(sp);");
    expect(guest).toContain("guestResumeId ? `${guestBack}&session=${encodeURIComponent(guestResumeId)}` : guestBack");
    expect(guest).toMatch(/text: guestResumeId\s*\? chatsCopy\.signInToOpen\s*:/);
    // Still nothing reopened or listed for a guest.
    expect(guest).not.toMatch(/resume=|recentChats=|recentFor\(|lateAnswer=/);
  });

  it("the island shows the line first, never in a school chat nor once the under-13 line closed it; the list marks 'new answer' in green", () => {
    const chat = code("src/app/chat/ChatInterface.tsx");
    const line = chat.indexOf("{lateAnswer && !school && !under13 && (");
    expect(line).toBeGreaterThan(0);
    expect(line).toBeLessThan(chat.indexOf("{resume && ("));
    expect(chat).toContain('onClick={() => beacon({ cta: "late-answer-open", surface: "chat", examCode })}');
    expect(chat).toContain('c.answered ? "font-semibold text-emerald-700" : c.unanswered ? "text-rose-700" : "text-ink-500"');
  });

  it("the header mounts the strip off admin and Class 1-7 pages; the strip asks only for a member, only where allowed", () => {
    const header = code("src/components/Header.tsx");
    expect(header).toContain("{!admin && !childSafe && <LateAnswerStrip />}");
    const strip = read("src/components/LateAnswerStrip.tsx");
    expect(strip).toMatch(/^"use client";/);
    expect(strip).toContain("if (!lateStripPathAllowed(pathname)) {");
    expect(strip).toContain("fetchSignedIn().then((signedIn) => {");
    expect(strip).toContain("if (!alive || signedIn !== true) return;");
    expect(strip).toContain("fetch(`/api/me/late-answer?lang=${encodeURIComponent(clientUiLocale())}`");
    expect(strip).toContain('ctaBeacon("late-answer-open", { surface: "header-strip" });');
    // B3 review: without the signed-in hint (after sign-out) the tab's copy is dropped before
    // any read of it — a guest or the next account on a shared phone never sees the last member's question.
    const noHint = strip.indexOf("if (!hasSessionHint()) dropCache();");
    expect(noHint).toBeGreaterThan(0);
    expect(noHint).toBeLessThan(strip.indexOf("readLateStripCache("));
    expect(noHint).toBeLessThan(strip.indexOf("if (!lateStripPathAllowed(pathname)) {"));
    // The route writes nothing.
    const route = code("src/app/api/me/late-answer/route.ts");
    expect(route).not.toMatch(/\$executeRaw|\.update\(|\.create\(|markLateAnswersSeen/);
  });
});
