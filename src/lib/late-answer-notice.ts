// Late answers reach the student (7 Oct 2026, build B3) — where a member who
// comes back is shown a late answer they have not opened, and when /chat
// opens it for them. The late answer itself: src/lib/tutor-late-answer.ts;
// its line ("Your question is answered"): src/lib/pickup.ts lateAnswerView.
//
// Why (7 Oct 2026 read of all 33 late answers, 19 students, 1–2 Oct): 2 were
// ever opened (lateSeenAt) — one through the mail's link, one through the
// Recent chats list on /chat, two days and 13 chat opens after its answer.
// 9 students never came back. The other 8 came back and never saw theirs:
//   • none of the 10 who came back opened the home page or the dashboard,
//     where the pick-up card leads with the answer. They landed on /today, a
//     mock, a results page, an exam's build-mock or PYQ page, an exam hub;
//   • the hub's card showed the hub's own exam only (one student read
//     another exam's hub 7 times), and dropped the answer after 3 days (two
//     reached the right hub on day 3.3 and 4.5);
//   • /chat starts a NEW conversation and named the answer nowhere: an exam
//     chat lists only that exam's chats (two students opened another exam's
//     chat), a seeded chat from a results page lists none, and the one list
//     that did hold it said nothing about an answer — one student opened the
//     right exam's chat 6 times on the day of the answer.
// Now, for a signed-in member with a late answer not opened yet (the card's
// scope: general chats and active real exams — never a school chat):
//   • plain /chat — the header's Ask Shishya: no exam, no seed, no topic, no
//     saved chat named — OPENS that conversation (lateAnswerOpensChat). Once:
//     the reopened chat marks the answer seen. Every "New chat" link and the
//     exam dropdown carry ?general=1 or ?examCode=, so a student who wants a
//     fresh chat is never sent back;
//   • any other /chat (an exam's chat, a topic, a results-page seed, another
//     saved chat) shows "Your question is answered" at the top of the chat;
//   • other member pages show the same line in a thin strip under the header
//     (src/components/LateAnswerStrip.tsx, GET /api/me/late-answer) — not on
//     the pages whose pick-up card already leads with it (home, dashboard, an
//     exam hub), not on /chat, not during a paper, never on a Class 1-7 or
//     school-list page (lateStripPathAllowed);
//   • the Recent chats lists say "new answer" on that conversation and list it first;
//   • the seen mark is set only when a page shows the conversation.
// A Class 8-12 class chat's late answer is marked "new answer" in that class
// chat's own list, and nowhere else. Classes 1-7 have no tutor and no late answer.
//
// Pure — no DB, no React. Tests: tests/unit/late-answer-notice.test.ts

import type { PickupAnsweredView } from "@/lib/pickup";
import { isChildSchoolPath } from "@/lib/signup-pitch";
import { isUnder13SchoolPath } from "@/lib/school/student-classes";

/** The /chat search params these rules read. */
export interface ChatEntryParams {
  examCode?: string | null;
  topicCode?: string | null;
  seed?: string | null;
  general?: string | null;
  session?: string | null;
  review?: string | null;
  f?: string | null;
}

const given = (v: unknown) => typeof v === "string" && v.trim() !== "";

/**
 * Whether /chat opens the late answer's conversation: only plain /chat (UTM
 * and other unknown params aside). Anything the URL names — an exam, the
 * general chat, a topic, a seed, a saved chat, a review, a follow-up — is
 * the student's own intent and gets the line at the top instead.
 */
export function lateAnswerOpensChat(sp: ChatEntryParams): boolean {
  return ![sp.examCode, sp.general, sp.topicCode, sp.seed, sp.session, sp.review, sp.f].some(given);
}

/** An exam hub's own page (/exams/SSC_CGL): exam codes are upper case; /exams/browse, /exams/entrance … are lists. */
const HUB_ROOT = /^\/exams\/[A-Z][A-Z0-9_-]*$/;
/** /chat has its own line; /mocks/<id> is a paper in progress; the rest are no place for it. */
const NO_STRIP = ["/chat", "/mocks", "/login", "/logout", "/onboarding", "/admin", "/api", "/i", "/join", "/unsubscribe"];

/** Where the strip under the header may show the line. */
export function lateStripPathAllowed(p: string | null | undefined): boolean {
  if (typeof p !== "string" || !p.startsWith("/")) return false;
  const path = p.split(/[?#]/)[0].replace(/^\/(hi|te)(?=\/|$)/, "").replace(/\/+$/, "") || "/";
  // The pick-up card leads with it there already.
  if (path === "/" || path === "/dashboard" || path.startsWith("/dashboard/") || HUB_ROOT.test(path)) return false;
  // A child may be reading (Class 1-7 pages, /schooling and a board's class list).
  if (isChildSchoolPath(path) || isUnder13SchoolPath(path)) return false;
  return !NO_STRIP.some((x) => path === x || path.startsWith(`${x}/`));
}

/** sessionStorage: the strip asks the server at most once per tab in this long. */
export const LATE_STRIP_CACHE_KEY = "shishya-late-answer";
export const LATE_STRIP_CACHE_MS = 10 * 60_000;

function isAnsweredView(v: unknown): v is PickupAnsweredView {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    ["label", "text", "note", "meta", "href", "cta"].every((k) => typeof o[k] === "string") &&
    String(o.href).startsWith("/chat?")
  );
}

/** A fresh cached answer of the strip's read: { view } (view null = nothing to show), or null = ask the server. */
export function readLateStripCache(raw: string | null | undefined, nowMs: number): { view: PickupAnsweredView | null } | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as { at?: unknown; view?: unknown };
    if (typeof o.at !== "number" || !Number.isFinite(o.at)) return null;
    const age = nowMs - o.at;
    if (age < 0 || age > LATE_STRIP_CACHE_MS) return null;
    if (o.view === null) return { view: null };
    return isAnsweredView(o.view) ? { view: o.view } : null;
  } catch {
    return null;
  }
}

export function lateStripCacheValue(view: PickupAnsweredView | null, nowMs: number): string {
  return JSON.stringify({ at: nowMs, view });
}

/** The API's answer → the line to show, or null (anything malformed shows nothing). */
export function lateStripViewOf(json: unknown): PickupAnsweredView | null {
  const v = json && typeof json === "object" ? (json as { answered?: unknown }).answered : null;
  return isAnsweredView(v) ? v : null;
}
