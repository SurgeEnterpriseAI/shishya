// Saved chats and the mistake review (30 Sep 2026) — source guards on the
// server pages and the chat island, whose rules live in the pure helpers
// tested in tests/unit/recent-chats.test.ts. What they pin:
//   • /chat: Classes 1-7 404 before any saved-chat read; ?session= is read
//     only for a signed-in member, only without a seed, redirected once to
//     its own scope, and reopened only in the branch of that scope (school
//     inside the school chat, general on the general chat, an exam on its
//     exam); lists per branch; the island is keyed by the conversation;
//   • the island: a reopened chat never imports a guest chat over itself;
//     the results seed's attempt rides on that seed's turn only; the quick
//     replies are gated by reviewChipsVisible and the list only shows in the
//     empty state;
//   • the results page: an existing review of THIS attempt is reopened, and a
//     new one carries its attempt; never for a school attempt;
//   • the dashboard lists non-school chats only.
// No DB. Run: npx vitest run tests/unit/saved-chats-source.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8").replace(/\r\n/g, "\n");

describe("/chat page", () => {
  const src = read("src/app/chat/page.tsx");
  const guard = src.indexOf("if (schoolCls !== null && !isStudentModeClass(schoolCls)) notFound();");
  const load = src.indexOf("await loadResumableChat(viewerId, resumeId)");
  const schoolStart = src.indexOf("  if (schoolCls !== null) {");
  const guestStart = src.indexOf("// ── Anonymous tutor — UNGATED");
  const generalStart = src.indexOf("  if (general) {");

  it("Classes 1-7 are 404 before the saved-chat read; the read is signed-in, seed-safe and redirected to its scope", () => {
    expect(guard).toBeGreaterThan(0);
    expect(load).toBeGreaterThan(guard);
    expect(schoolStart).toBeGreaterThan(load);
    expect(src).toContain("const resumeId = viewerId ? resumeSessionParam(sp) : null;");
    expect(src).toContain("if (saved && !isResumeUrlCanonical(sp, saved)) redirect(chatResumeHref({ examCode: saved.examCode, sessionId: saved.id }));");
    expect(src).toContain("saved && saved.examId === examId ? chatResumeView(saved, newChatHref, chatsCopy, now) : null");
  });

  it("each branch reopens only its own scope and lists its own chats", () => {
    const school = src.slice(schoolStart, guestStart);
    expect(school).toContain("const schoolResume = resumeIn(ctx.exam.id,");
    expect(school).toContain("await recentFor({ examId: ctx.exam.id }, schoolResume != null)");
    expect(school).toContain("resume={schoolResume}");
    expect(school).toContain('key={schoolResume?.sessionId ?? "new"}');
    // The guest branch reopens nothing and lists nothing.
    const guest = src.slice(guestStart, src.indexOf("// Analytics — server-side CHAT_OPENED"));
    expect(guest).not.toMatch(/resume=|recentChats=|recentFor\(/);
    const general = src.slice(generalStart, src.indexOf("const examCode = explicitExamCode ?? enrollments[0].exam.code;"));
    expect(general).toContain('const generalResume = resumeIn(null, "/chat?general=1");');
    expect(general).toContain('await recentFor("general", generalResume != null)');
    const exam = src.slice(src.indexOf("const examCode = explicitExamCode ?? enrollments[0].exam.code;"));
    expect(exam).toContain("resumeIn(currentEnrollment.examId,");
    expect(exam).toContain("recentFor({ examId: currentEnrollment.examId }, examResume != null)");
    expect(exam).toContain("reviewAttemptId={reviewAttemptParam(sp)}");
    expect(exam).toContain('key={examResume?.sessionId ?? "new"}');
  });

  it("no list for a seeded or reopened chat, and a failed read lists none", () => {
    expect(src).toContain("if (!viewerId || reopened || (sp.seed && sp.seed.trim())) return null;");
    expect(src).toContain("listRecentChats(viewerId, scope, { limit: RECENT_CHATS_LIMIT, now }).catch(() => [])");
  });
});

describe("the chat island", () => {
  const src = read("src/app/chat/ChatInterface.tsx");

  it("starts from the reopened conversation and never imports a guest chat over it", () => {
    expect(src).toContain("useState<string | null>(resume?.sessionId ?? null)");
    expect(src).toContain("useState<Message[]>(resume?.messages ?? [])");
    expect(src).toContain("if (guestSignInHref || school || resume || importTriedRef.current) return;");
  });

  it("the results seed's attempt rides on that seed's own first turn only", () => {
    expect(src).toContain("void send(seed, reviewAttemptId ? { reviewAttemptId } : {});");
    expect(src).toContain("reviewAttemptId: opts.reviewAttemptId && !sessionId ? opts.reviewAttemptId : undefined,");
    expect(src.match(/reviewAttemptId \?/g)?.length).toBe(1);
  });

  it("quick replies: a mistake review only, never school, gated by reviewChipsVisible; each sends an ordinary turn", () => {
    expect(src).toContain("!school && (resume?.mistakeReview === true || isMistakeReviewOpener(");
    expect(src).toContain("langReady && reviewChipsVisible({ reviewMode, school: !!school, busy, closed: capped || under13, messages })");
    expect(src).toContain("{showReviewChips && (");
    expect(src).toContain("void send(chip);");
  });

  it("the Recent chats list sits in the empty state, under the starters", () => {
    const empty = src.slice(src.indexOf("{messages.length === 0 && ("), src.indexOf("{messages.map((m, i) => {"));
    expect(empty).toContain("{recentChats && recentChats.items.length > 0 && !capped && !under13 && (");
    expect(empty.indexOf("starters.map(")).toBeLessThan(empty.indexOf("recentChats.items.map("));
  });
});

describe("the results page reopens the review of this attempt", () => {
  const src = read("src/app/attempts/[id]/results/page.tsx");
  it("looks it up for an exam attempt with mistakes only, and tags a new review with the attempt", () => {
    expect(src).toContain("!school && wrongCount > 0 && attempt.mock.exam.active\n      ? await findMistakeReviewChat(session.user.id, {");
    expect(src).toContain("seed: mistakeSeed,");
    expect(src).toContain("chatResumeHref({ examCode: attempt.mock.exam.code, sessionId: reviewChat.id })");
    expect(src).toContain("&seed=${encodeURIComponent(mistakeSeed)}&review=${encodeURIComponent(attempt.id)}");
    expect(src).toContain('{reviewChat ? reviewCopy.continueReview : "Explain my mistakes →"}');
    expect(src).toContain('variant: reviewChat ? "mistakes-continue" : "mistakes"');
    // The school card keeps its own seed and link.
    expect(src).toContain("href={schoolTutor(mistakeSeed)}");
  });
});

describe("the dashboard lists recent chats", () => {
  const src = read("src/app/dashboard/page.tsx");
  it("general and real-exam chats only, best-effort", () => {
    expect(src).toContain('listRecentChats(userId, "not-school", { limit: DASHBOARD_CHATS_LIMIT }).catch(() => [])');
    expect(src).toContain("{recentChatItems.length > 0 && (");
  });
});
