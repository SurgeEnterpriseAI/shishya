// Cut-off tutor replies get Retry too, and the route's "still being
// answered" error reads in the chat's language (25 Sep 2026).
//
// "Not answered — Retry" (24 Sep) appeared only on an EMPTY reply bubble; a
// reply that streamed some text and then errored or dropped looked finished.
// Now any reply without a done event is failed — empty → "Not answered",
// partial → "Reply incomplete" with its text kept — and Retry on the latest
// turn re-sends the same text and turnId, replacing that bubble. The route's
// English-only wait error carries code "still-answering", which the chat
// shows in en/hi/te, falling back to the server's text.
// Pure — no DOM, no network. Run: npx vitest run tests/unit/chat-reply-status.test.ts

import { describe, it, expect } from "vitest";
import {
  canRetryAt,
  CHAT_ERROR_CODE,
  CHAT_ERROR_COPY,
  chatErrorText,
  failedReplyKind,
  replyStreamFailed,
  retryableTurn,
  withLastReplyFailed,
  type ReplyBubble,
} from "@/lib/chat-reply-status";

type Bubble = ReplyBubble & { id: string };

const user = (content: string, turnId = "t1"): Bubble => ({ id: `u-${turnId}`, role: "user", content, turnId });
const reply = (content: string, over: Partial<Bubble> = {}): Bubble => ({ id: "a1", role: "assistant", content, ...over });

describe("replyStreamFailed", () => {
  it("only a done event with no error event completes a reply", () => {
    expect(replyStreamFailed({ done: true, error: false })).toBe(false);
    // Text streamed, then the connection dropped: no done, no error.
    expect(replyStreamFailed({ done: false, error: false })).toBe(true);
    expect(replyStreamFailed({ done: false, error: true })).toBe(true);
    expect(replyStreamFailed({ done: true, error: true })).toBe(true);
  });
});

describe("withLastReplyFailed", () => {
  it("marks an empty reply failed (as on 24 Sep)", () => {
    const out = withLastReplyFailed([user("What is LCM?"), reply("")]);
    expect(out[1]).toMatchObject({ role: "assistant", content: "", failed: true });
    expect(failedReplyKind(out[1])).toBe("not-answered");
  });

  it("marks a partial reply failed too and keeps its text", () => {
    const partial = "The LCM of 12 and 18 is found by listing prime factors: 12 = 2² × 3,";
    const out = withLastReplyFailed([user("What is LCM of 12 and 18?"), reply(partial)]);
    expect(out[1].content).toBe(partial);
    expect(out[1].failed).toBe(true);
    expect(failedReplyKind(out[1])).toBe("incomplete");
  });

  it("leaves the log alone when the last bubble is a question, or already failed", () => {
    const onlyQuestion = [user("hello")];
    expect(withLastReplyFailed(onlyQuestion)).toBe(onlyQuestion);
    const already = [user("hello"), reply("par", { failed: true })];
    expect(withLastReplyFailed(already)).toBe(already);
    expect(withLastReplyFailed([])).toEqual([]);
  });

  it("does not touch earlier bubbles", () => {
    const earlier = reply("A complete answer.", { id: "a0" });
    const out = withLastReplyFailed([user("q1", "t0"), earlier, user("q2", "t1"), reply("Half")]);
    expect(out[1]).toBe(earlier);
    expect(out[1].failed).toBeUndefined();
  });
});

describe("failedReplyKind", () => {
  it("is null for questions, live replies and complete replies", () => {
    expect(failedReplyKind(user("q"))).toBeNull();
    expect(failedReplyKind(reply(""))).toBeNull(); // still streaming ("Thinking…")
    expect(failedReplyKind(reply("Done."))).toBeNull();
  });

  it("whitespace-only text counts as not answered", () => {
    expect(failedReplyKind(reply("  \n", { failed: true }))).toBe("not-answered");
  });
});

describe("retryableTurn / canRetryAt", () => {
  it("a cut-off latest reply is retried with its question's text and turnId", () => {
    const log = [user("q1", "t0"), reply("Answer one.", { id: "a0" }), user("Explain ratio", "t7"), reply("Ratio compares", { failed: true })];
    expect(retryableTurn(log)).toEqual({ text: "Explain ratio", turnId: "t7" });
    expect(canRetryAt(log, 3)).toBe(true);
    expect(canRetryAt(log, 1)).toBe(false);
  });

  it("an empty failed reply is retried the same way", () => {
    const log = [user("Explain ratio", "t7"), reply("", { failed: true })];
    expect(retryableTurn(log)).toEqual({ text: "Explain ratio", turnId: "t7" });
  });

  it("only the latest turn, only a failed reply, only after its question", () => {
    // A failed reply that is no longer the latest bubble.
    const moved = [user("q1", "t0"), reply("Half", { id: "a0", failed: true }), user("q2", "t1"), reply("Full answer.")];
    expect(retryableTurn(moved)).toBeNull();
    expect(canRetryAt(moved, 1)).toBe(false);
    // A complete latest reply.
    expect(retryableTurn([user("q"), reply("Done.")])).toBeNull();
    // A reply with no question before it (e.g. an imported chat's first bubble).
    expect(retryableTurn([reply("Half", { failed: true })])).toBeNull();
  });

  it("Retry replaces the partial bubble: the send path swaps the last bubble for a placeholder", () => {
    // Mirrors ChatInterface.send({ retry: true }): [...m.slice(0, -1), placeholder]
    // and the history snapshot m.slice(0, -2) — the failed turn stays out.
    const log = [user("q1", "t0"), reply("Answer one.", { id: "a0" }), user("q2", "t1"), reply("Half of an ans", { failed: true })];
    const turn = retryableTurn(log)!;
    const afterRetry = [...log.slice(0, -1), reply("", { id: "a-new" })];
    expect(afterRetry).toHaveLength(4);
    expect(afterRetry.some((m) => m.content === "Half of an ans")).toBe(false);
    expect(afterRetry[2]).toMatchObject({ role: "user", content: turn.text, turnId: "t1" });
    expect(log.slice(0, -2).map((m) => m.content)).toEqual(["q1", "Answer one."]);
  });
});

describe("chatErrorText", () => {
  const serverEnglish = "Your earlier message is still being answered. Tap Retry again in a moment to see the reply.";

  it("the route's English line is unchanged (it sends CHAT_ERROR_COPY.en)", () => {
    expect(CHAT_ERROR_COPY[CHAT_ERROR_CODE.stillAnswering].en).toBe(serverEnglish);
  });

  it("shows the chat's own line for the still-answering code in the UI language", () => {
    const payload = { error: serverEnglish, code: "still-answering", next: "/exams/SBI_CLERK" };
    expect(chatErrorText(payload, "en", "Chat stream error")).toBe(serverEnglish);
    const hi = chatErrorText(payload, "hi", "Chat stream error");
    const te = chatErrorText(payload, "te", "Chat stream error");
    expect(hi).not.toBe(serverEnglish);
    expect(te).not.toBe(serverEnglish);
    // Each names that language's Retry button label.
    expect(hi).toContain("फिर से भेजें");
    expect(te).toContain("మళ్లీ పంపండి");
  });

  it("falls back to the server's text for an unknown or missing code", () => {
    const outage = "Shishya is helping a lot of students right now — please try again in a minute.";
    expect(chatErrorText({ error: outage }, "hi", "Chat stream error")).toBe(outage);
    expect(chatErrorText({ error: outage, code: "some-future-code" }, "te", "x")).toBe(outage);
  });

  it("falls back to the given text when the payload is unusable", () => {
    expect(chatErrorText(null, "en", "Chat stream error")).toBe("Chat stream error");
    expect(chatErrorText("not json", "hi", "Chat stream error")).toBe("Chat stream error");
    expect(chatErrorText({ error: "   " }, "en", "Chat stream error")).toBe("Chat stream error");
    expect(chatErrorText({ code: "toString" }, "en", "Chat stream error")).toBe("Chat stream error");
  });
});
