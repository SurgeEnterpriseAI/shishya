// A guest's tutor chat carried into the account (30 Sep 2026, sign-up
// build 2 — src/lib/guest-chat-carry.ts, src/app/chat/ChatInterface.tsx,
// src/components/WelcomeStrip.tsx).
//
// Audit: 1 save-card tap since 16 Sep and 0 imports ever; the chat page's top
// "Sign in free to save your chats" link kept nothing. Pinned:
//   • what is kept (finished user→assistant pairs, ≤ 24 turns, ≤ 8,000
//     characters a turn) and for how long (30 minutes);
//   • the decision on a signed-in page: import anywhere once, restore (not a
//     second import) on the chat of the same scope, leave another chat's
//     key alone, never on a Class 1-7 page, drop when expired;
//   • any link to /login on the guest chat keeps it (one capture listener),
//     the save card is a full-width button after the FIRST reply, a school
//     chat never keeps one and the under-13 line drops a kept one;
//   • the Header island imports on any other page (not the chat page), only
//     with the signed-in hint, and never on a Class 1-7 page;
//   • signing out drops a kept (or imported) chat, so the next account on a
//     shared phone never sees it restored (review, 30 Sep 2026).
// No DB, no network. Run: npx vitest run tests/unit/guest-chat-carry.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  GUEST_CHAT_MAX_TURNS,
  GUEST_CHAT_TTL_MS,
  carryDecision,
  guestChatHref,
  guestChatTail,
  isLoginLink,
  parseKeptGuestChat,
  type KeptGuestChat,
} from "@/lib/guest-chat-carry";

const u = (content: string) => ({ role: "user", content });
const a = (content: string) => ({ role: "assistant", content });

describe("guestChatTail: what is kept", () => {
  it("finished pairs only — a trailing question with no reply is cut", () => {
    expect(guestChatTail([u("q1"), a("r1"), u("q2")])).toEqual([
      { role: "user", content: "q1" },
      { role: "assistant", content: "r1" },
    ]);
  });

  it("nothing without a reply; empty and oversize turns are left out", () => {
    expect(guestChatTail([u("q1")])).toBeNull();
    expect(guestChatTail([u("q1"), a("")])).toBeNull();
    expect(guestChatTail([u("q1"), a("x".repeat(8001))])).toBeNull();
    expect(guestChatTail([])).toBeNull();
  });

  it("the last 24 turns, starting on a question", () => {
    const many = Array.from({ length: 20 }, (_, i) => [u(`q${i}`), a(`r${i}`)]).flat();
    const tail = guestChatTail(many)!;
    expect(tail.length).toBeLessThanOrEqual(GUEST_CHAT_MAX_TURNS);
    expect(tail[0].role).toBe("user");
    expect(tail[tail.length - 1]).toEqual({ role: "assistant", content: "r19" });
  });
});

describe("parseKeptGuestChat: 30 minutes, well-formed only", () => {
  const now = Date.UTC(2026, 8, 30, 10, 0, 0);
  const kept = (over: Partial<KeptGuestChat> = {}) => JSON.stringify({ v: 1, examCode: "SSC_CGL", savedAt: now - 60_000, turns: [u("q"), a("r")], ...over });

  it("fresh → the value; past 30 minutes → expired", () => {
    expect(parseKeptGuestChat(kept(), now)).toMatchObject({ v: 1, examCode: "SSC_CGL", turns: [{ role: "user" }, { role: "assistant" }] });
    expect(parseKeptGuestChat(kept({ savedAt: now - GUEST_CHAT_TTL_MS - 1 }), now)).toBe("expired");
    expect(GUEST_CHAT_TTL_MS).toBe(30 * 60_000);
  });

  it("keeps the imported session id; malformed → null", () => {
    expect(parseKeptGuestChat(kept({ importedSessionId: "s-1" }), now)).toMatchObject({ importedSessionId: "s-1" });
    for (const raw of [null, "", "{", "null", JSON.stringify({ v: 2, turns: [], savedAt: now }), JSON.stringify({ v: 1, turns: "x", savedAt: now })]) {
      expect(parseKeptGuestChat(raw, now)).toBeNull();
    }
  });
});

describe("carryDecision on a signed-in page", () => {
  const kept: KeptGuestChat = { v: 1, examCode: "SSC_CGL", savedAt: 0, turns: [] };
  const imported: KeptGuestChat = { ...kept, importedSessionId: "s-1" };

  it("any other page imports once; after that it waits for its chat", () => {
    expect(carryDecision(kept, { childPath: false })).toBe("import");
    expect(carryDecision(imported, { childPath: false })).toBe("none");
  });

  it("the chat of the same scope imports, or restores what another page imported", () => {
    expect(carryDecision(kept, { childPath: false, chatScope: { examCode: "SSC_CGL", seeded: false } })).toBe("import");
    expect(carryDecision(imported, { childPath: false, chatScope: { examCode: "SSC_CGL", seeded: false } })).toBe("restore");
  });

  it("another chat's page, a seeded chat and a Class 1-7 page leave it alone", () => {
    expect(carryDecision(kept, { childPath: false, chatScope: { examCode: null, seeded: false } })).toBe("none");
    expect(carryDecision({ ...kept, examCode: null }, { childPath: false, chatScope: { examCode: "SSC_CGL", seeded: false } })).toBe("none");
    expect(carryDecision(kept, { childPath: false, chatScope: { examCode: "SSC_CGL", seeded: true } })).toBe("none");
    expect(carryDecision(kept, { childPath: true })).toBe("none");
  });

  it("expired → drop; nothing kept → none", () => {
    expect(carryDecision("expired", { childPath: false })).toBe("drop");
    expect(carryDecision(null, { childPath: false })).toBe("none");
  });

  it("the chat a kept conversation continues on", () => {
    expect(guestChatHref("SSC_CGL")).toBe("/chat?examCode=SSC_CGL");
    expect(guestChatHref(null)).toBe("/chat?general=1");
  });
});

describe("isLoginLink: any sign-in the guest starts", () => {
  const origin = "https://shishya.in";
  it("every /login link on the site", () => {
    for (const href of ["/login", "/login?callbackUrl=%2Fchat%3FexamCode%3DSSC_CGL&from=header", "https://shishya.in/login?callbackUrl=%2Fchat"]) {
      expect(isLoginLink(href, origin), href).toBe(true);
    }
  });
  it("not another page, another site or nothing", () => {
    for (const href of ["/logout", "/login-help", "/exams/SSC_CGL", "https://evil.example/login", "", null]) {
      expect(isLoginLink(href as string | null, origin), String(href)).toBe(false);
    }
  });
});

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

describe("the chat island keeps the chat on any sign-in (source)", () => {
  const src = read("src/app/chat/ChatInterface.tsx");

  it("one capture listener: a click on any /login link keeps the guest chat", () => {
    expect(src).toContain('document.addEventListener("click", onClick, true);');
    expect(src).toContain('if (a && isLoginLink(a.getAttribute("href"), location.origin)) keepGuestChatForSignIn();');
    expect(src).toContain("if (!guestSignInHref || school) return;");
  });

  it("never for a school chat or after the under-13 line; the under-13 line drops a kept one", () => {
    expect(src).toContain("if (!guestSignInHref || school || under13Ref.current) return;");
    expect(src).toContain("if (under13) dropKeptGuestChat();");
  });

  it("the save card: a full-width button once the tutor has answered — from the second answer on, the first-answer card before it", () => {
    // 8 Oct 2026 (src/lib/chat-first-answer.ts guestChatOffer): "save" is every state the old
    // condition (a finished reply, nothing streaming) covered, but the first answered turn
    // while it is the latest — there the first-answer card stands in its place (one invitation
    // a screen). Its press keeps the chat the same way (onSignInClick={keepGuestChatForSignIn}).
    expect(src).toContain('{guestSignInHref && !school && !under13 && !busy && guestOffer === "save" && (');
    expect(src).toContain("onSignInClick={keepGuestChatForSignIn}");
    // 2 Oct 2026: the one shared "Sign up with Google" button, full width (block), with the tutor words in its tooltip.
    expect(src).toMatch(/<SignUpButton\s+href=\{examCode == null \? `\/login\?callbackUrl=\$\{encodeURIComponent\("\/chat\?general=1"\)\}` : guestSignInHref\}\s+surface="chat-save"\s+locale=\{navLang\}\s+exam=\{examShortName\}\s+examCode=\{examCode\}\s+explain="own"\s+side="top"\s+block/);
    expect(src).toMatch(/onSignInClick=\{\(\) => \{\s*keepGuestChatForSignIn\(\);\s*beacon\(\{ cta: "chat-guest-save", surface: "chat", examCode \}\);/);
    expect(src).not.toContain(".length >= 2 && (\n          <div className=\"rounded-md border border-saffron-200");
  });

  it("signed in: the shared decision, and a conversation imported elsewhere is restored, not imported twice", () => {
    expect(src).toContain("const action = carryDecision(kept, {");
    expect(src).toContain('if (action === "restore" && kept.importedSessionId) {');
    expect(src).toContain('if (r.status === "retry") return; // the key stays for a later visit');
  });

  it("the save card's words are honest in en / hi / te (no 'remembers it tomorrow')", () => {
    const block = src.slice(src.indexOf("const SAVE_COPY = {"), src.indexOf("} as const;", src.indexOf("const SAVE_COPY = {")));
    for (const k of ["button:", "buttonGeneral:", "sub:", "subGeneral:", "saved:"]) expect(block.split(k).length - 1, k).toBe(3);
    expect(block).not.toMatch(/remember/i);
  });
});

describe("the Header island imports on the page the sign-in lands on (source)", () => {
  const src = read("src/components/WelcomeStrip.tsx");

  it("signed in (the hint), not on the chat page (it imports itself), once per load", () => {
    expect(src).toContain("if (!carryStarted && hasSessionHint() && !isChatPath(path)) {");
    expect(src).toContain('const action = carryDecision(kept, { childPath: false, chatScope: null });');
    expect(src).toContain("markGuestChatImported(kept, r.sessionId, r.turns);");
  });

  it("nothing at all on a Class 1-7 or class-agnostic school page", () => {
    const guard = src.indexOf("if (isChildSchoolPath(path) || isUnder13SchoolPath(path)) return;");
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(src.indexOf("readKeptGuestChat()"));
    expect(guard).toBeLessThan(src.indexOf('fetch("/api/me/welcome"'));
  });
});

describe("signing out drops the kept chat (source; review 30 Sep 2026)", () => {
  it("LogoutConfirm clears it before signOut, so a second account on this browser never restores it", () => {
    const src = read("src/app/logout/LogoutConfirm.tsx");
    expect(src).toContain('import { dropKeptGuestChat } from "@/lib/guest-chat-carry";');
    const drop = src.indexOf("dropKeptGuestChat();");
    expect(drop).toBeGreaterThan(0);
    expect(drop).toBeLessThan(src.indexOf('signOut({ callbackUrl: "/" });'));
  });
});
