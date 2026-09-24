// Duplicate and failed tutor turns (24 Sep 2026): a fresh chat repeating an
// answered message replays the stored reply; a failed turn sent again reuses
// its USER row; inside a conversation a repeated text ("B", "B") is a real
// turn unless the client re-sends the very turn that failed (Retry, same
// turnId). Review, same day: no fresh-chat replay after an attempt since; a
// row another run may still be answering is waited on, not re-sent.
// Pure — no DB. Run: npx vitest run tests/unit/chat-turn-dedupe.test.ts

import { describe, it, expect } from "vitest";
import {
  ANSWERING_MS,
  decideTurn,
  mayStillBeAnswering,
  replayFrames,
  sameTurnText,
  settleWait,
  userTurnMeta,
  type StoredTurn,
} from "@/lib/chat-turn-dedupe";

const SEED = "I just took a TS Police PC mock and got 8 questions wrong — review my mistakes.";
const NOW = Date.UTC(2026, 8, 24, 6, 0, 0);
/** Long enough ago that no run can still be answering it. */
const OLD = new Date(NOW - ANSWERING_MS - 1_000);

const user = (content: string, over: Partial<StoredTurn> = {}): StoredTurn => ({
  id: "u1",
  sessionId: "s1",
  role: "USER",
  content,
  createdAt: OLD,
  ...over,
});
const reply = (content: string, over: Partial<StoredTurn> = {}): StoredTurn => ({
  id: "a1",
  sessionId: "s1",
  role: "ASSISTANT",
  content,
  metadata: { actions: [{ kind: "TAKE_MOCK", reason: "r" }], toolCalls: [] },
  ...over,
});
const base = { continuing: false, retry: false, now: NOW };

describe("decideTurn — fresh chat (no conversation named)", () => {
  it("replays the stored reply when the same message was already answered", () => {
    const r = reply("Here is your review…");
    expect(decideTurn({ ...base, message: SEED, latestUser: user(SEED), next: r })).toEqual({
      kind: "replay",
      sessionId: "s1",
      reply: r,
    });
  });

  it("ignores surrounding whitespace when matching", () => {
    const d = decideTurn({ ...base, message: `  ${SEED}\n`, latestUser: user(SEED), next: reply("ok") });
    expect(d.kind).toBe("replay");
  });

  it("does not replay when an attempt was started or finished since (the reply describes an older record)", () => {
    const r = reply("You haven't taken any mocks yet… [Take it now](/mocks/m1)");
    expect(decideTurn({ ...base, message: SEED, stateChanged: true, latestUser: user(SEED), next: r })).toEqual({ kind: "new" });
    expect(decideTurn({ ...base, message: SEED, stateChanged: false, latestUser: user(SEED), next: r }).kind).toBe("replay");
  });

  it("a Retry of this very turn (same turnId) replays its reply even after an attempt since", () => {
    const r = reply("Here is your review…");
    const row = user(SEED, { metadata: { turnId: "t1" } });
    expect(
      decideTurn({ ...base, retry: true, turnId: "t1", message: SEED, stateChanged: true, latestUser: row, next: r }),
    ).toEqual({ kind: "replay", sessionId: "s1", reply: r });
  });

  it("reuses the USER row of a failed turn (no reply after it) and continues in its conversation", () => {
    const want = { kind: "reuse", sessionId: "s1", userRowId: "u1" };
    // Marked failed, however recent.
    expect(
      decideTurn({ ...base, message: SEED, latestUser: user(SEED, { createdAt: new Date(NOW - 5_000), metadata: { failedAt: NOW - 4_000 } }), next: null }),
    ).toEqual(want);
    // Older than any run can last.
    expect(decideTurn({ ...base, message: SEED, latestUser: user(SEED), next: null })).toEqual(want);
    // An attempt since does not matter: the model is called afresh on that row.
    expect(decideTurn({ ...base, message: SEED, stateChanged: true, latestUser: user(SEED), next: null })).toEqual(want);
  });

  it("waits on a row another run may still be answering (a second tab re-sent the seed)", () => {
    const row = user(SEED, { createdAt: new Date(NOW - 20_000) });
    expect(decideTurn({ ...base, message: SEED, latestUser: row, next: null })).toEqual({
      kind: "wait",
      sessionId: "s1",
      userRowId: "u1",
    });
    // …unless an attempt since makes a new answer the right one.
    expect(decideTurn({ ...base, message: SEED, stateChanged: true, latestUser: row, next: null })).toEqual({ kind: "new" });
  });

  it("is a new turn when the text differs or there is no recent message", () => {
    expect(decideTurn({ ...base, message: "Teach me Percentage", latestUser: user(SEED), next: reply("ok") })).toEqual({ kind: "new" });
    expect(decideTurn({ ...base, message: SEED, latestUser: null, next: null })).toEqual({ kind: "new" });
    // Case matters: only whitespace is ignored.
    expect(decideTurn({ ...base, message: SEED.toUpperCase(), latestUser: user(SEED), next: reply("ok") }).kind).toBe("new");
  });

  it("never replays an empty stored reply", () => {
    expect(decideTurn({ ...base, message: SEED, latestUser: user(SEED), next: reply("   ") })).toEqual({ kind: "new" });
  });

  it("is a new turn when the row after it is not an assistant reply", () => {
    expect(decideTurn({ ...base, message: SEED, latestUser: user(SEED), next: user(SEED, { id: "u2" }) })).toEqual({ kind: "new" });
    expect(decideTurn({ ...base, message: SEED, latestUser: user(SEED), next: reply("x", { role: "TOOL" }) })).toEqual({ kind: "new" });
  });

  it("never matches a non-USER row given as the latest user turn", () => {
    expect(decideTurn({ ...base, message: SEED, latestUser: reply(SEED), next: null })).toEqual({ kind: "new" });
  });
});

describe("decideTurn — inside a conversation", () => {
  const inConv = { ...base, continuing: true };

  it('a repeated answered text ("B" to two quiz questions) is a real turn, not a replay', () => {
    expect(decideTurn({ ...inConv, message: "B", latestUser: user("B"), next: reply("Correct! Q2: …") })).toEqual({ kind: "new" });
  });

  it("a Retry of the turn that failed (same turnId; reply stored but never shown) replays it", () => {
    const r = reply("Correct! Q2: …");
    expect(
      decideTurn({ ...inConv, retry: true, turnId: "t2", message: "B", latestUser: user("B", { metadata: { turnId: "t2" } }), next: r }),
    ).toEqual({ kind: "replay", sessionId: "s1", reply: r });
  });

  it("a Retry whose send never reached the server does not replay an earlier answer to the same text", () => {
    // Q1 "B" was answered; Q2 "B" (turn t2) failed before it was stored.
    const q1 = user("B", { metadata: { turnId: "t1" } });
    const q1Reply = reply("Correct! … Q2: …");
    expect(decideTurn({ ...inConv, retry: true, turnId: "t2", message: "B", latestUser: q1, next: q1Reply })).toEqual({ kind: "new" });
    // Rows stored before turnIds existed, or a client that sent none: never replayed in a conversation.
    expect(decideTurn({ ...inConv, retry: true, turnId: "t2", message: "B", latestUser: user("B"), next: q1Reply })).toEqual({ kind: "new" });
    expect(decideTurn({ ...inConv, retry: true, message: "B", latestUser: q1, next: q1Reply })).toEqual({ kind: "new" });
  });

  it("the same text after a failed turn reuses that USER row, retry flag or not", () => {
    const want = { kind: "reuse", sessionId: "s1", userRowId: "u1" };
    expect(decideTurn({ ...inConv, retry: true, turnId: "t1", message: SEED, latestUser: user(SEED), next: null })).toEqual(want);
    expect(decideTurn({ ...inConv, message: SEED, latestUser: user(SEED), next: null })).toEqual(want);
  });

  it("a Retry right after a dropped connection waits for the run that is still answering", () => {
    const row = user(SEED, { createdAt: new Date(NOW - 8_000), metadata: { turnId: "t1" } });
    expect(decideTurn({ ...inConv, retry: true, turnId: "t1", message: SEED, latestUser: row, next: null })).toEqual({
      kind: "wait",
      sessionId: "s1",
      userRowId: "u1",
    });
  });

  it("a re-sent row is judged by when it was re-sent (answeringAt), not when it was first stored", () => {
    const row = user(SEED, { createdAt: OLD, metadata: { turnId: "t1", answeringAt: NOW - 10_000 } });
    expect(decideTurn({ ...inConv, retry: true, turnId: "t1", message: SEED, latestUser: row, next: null }).kind).toBe("wait");
  });

  it("a different text after a failed turn is a new turn", () => {
    expect(decideTurn({ ...inConv, retry: true, message: "Explain it again", latestUser: user(SEED), next: null })).toEqual({ kind: "new" });
  });
});

describe("settleWait — a waiting turn, looked at again", () => {
  const row = user("B", { createdAt: new Date(NOW - 20_000) });

  it("replays the reply once it lands — even inside a conversation", () => {
    const r = reply("Correct! Q3: …");
    expect(settleWait(row, r, NOW)).toEqual({ kind: "replay", sessionId: "s1", reply: r });
  });

  it("keeps waiting while the row is still in flight", () => {
    expect(settleWait(row, null, NOW)).toEqual({ kind: "wait", sessionId: "s1", userRowId: "u1" });
  });

  it("re-sends the row when that run failed or can no longer be running", () => {
    const want = { kind: "reuse", sessionId: "s1", userRowId: "u1" };
    expect(settleWait(user("B", { createdAt: new Date(NOW - 20_000), metadata: { failedAt: NOW - 1_000 } }), null, NOW)).toEqual(want);
    expect(settleWait(row, null, NOW + ANSWERING_MS)).toEqual(want);
  });

  it("is a new turn when the row is gone or something other than a reply followed it", () => {
    expect(settleWait(null, null, NOW)).toEqual({ kind: "new" });
    expect(settleWait(row, user("C", { id: "u2" }), NOW)).toEqual({ kind: "new" });
    expect(settleWait(row, reply(""), NOW)).toEqual({ kind: "new" });
  });
});

describe("userTurnMeta / mayStillBeAnswering", () => {
  it("reads only well-formed turn fields", () => {
    expect(userTurnMeta(null)).toEqual({});
    expect(userTurnMeta([1])).toEqual({});
    expect(userTurnMeta({ actions: [], toolCalls: [] })).toEqual({});
    expect(userTurnMeta({ turnId: "t1", answeringAt: 5, failedAt: 6, x: 1 })).toEqual({ turnId: "t1", answeringAt: 5, failedAt: 6 });
    expect(userTurnMeta({ turnId: "", answeringAt: "5", failedAt: NaN })).toEqual({});
  });

  it("in flight = not marked failed and (re)sent within ANSWERING_MS; no time to judge by = not in flight", () => {
    expect(mayStillBeAnswering(user("x", { createdAt: new Date(NOW - 1_000) }), NOW)).toBe(true);
    expect(mayStillBeAnswering(user("x", { createdAt: new Date(NOW - ANSWERING_MS) }), NOW)).toBe(false);
    expect(mayStillBeAnswering(user("x", { createdAt: (NOW - 1_000) as number }), NOW)).toBe(true);
    expect(mayStillBeAnswering(user("x", { createdAt: new Date(NOW - 1_000).toISOString() }), NOW)).toBe(true);
    expect(mayStillBeAnswering(user("x", { createdAt: new Date(NOW - 1_000), metadata: { failedAt: NOW } }), NOW)).toBe(false);
    expect(mayStillBeAnswering(user("x", { createdAt: undefined }), NOW)).toBe(false);
  });
});

describe("sameTurnText", () => {
  it("ignores only surrounding whitespace", () => {
    expect(sameTurnText(" B ", "B")).toBe(true);
    expect(sameTurnText("B", "b")).toBe(false);
    expect(sameTurnText("a  b", "a b")).toBe(false);
  });
});

describe("replayFrames", () => {
  function parse(frames: string[]) {
    return frames.map((f) => {
      expect(f.endsWith("\n\n")).toBe(true);
      const [ev, data] = f.trimEnd().split("\n");
      expect(ev.startsWith("event: ")).toBe(true);
      expect(data.startsWith("data: ")).toBe(true);
      return { event: ev.slice(7), data: JSON.parse(data.slice(6)) };
    });
  }

  it("speaks the live stream's meta / delta / done protocol", () => {
    const frames = parse(replayFrames("s9", reply("Line one\nLine two — \"quoted\"", { id: "a9" })));
    expect(frames.map((f) => f.event)).toEqual(["meta", "delta", "done"]);
    expect(frames[0].data).toEqual({ sessionId: "s9" });
    expect(frames[1].data).toBe('Line one\nLine two — "quoted"');
    expect(frames[2].data).toEqual({
      messageId: "a9",
      actions: [{ kind: "TAKE_MOCK", reason: "r" }],
      toolCalls: [],
      replayed: true,
    });
  });

  it("falls back to empty actions / toolCalls when the metadata is missing or odd", () => {
    for (const metadata of [null, undefined, "x", [1], { actions: null, toolCalls: "no" }]) {
      const done = parse(replayFrames("s1", reply("ok", { metadata })))[2].data;
      expect(done.actions).toEqual([]);
      expect(done.toolCalls).toEqual([]);
    }
  });
});
