// Pure unit tests for src/lib/attempts-sync.ts — the on-device mirror and
// the merge/ack logic that keeps a mock player honest across a 4G blink.
// No DB, no network, no jsdom: storage is an injected stub.

import { describe, it, expect } from "vitest";
import {
  backoffMs,
  clearMirror,
  contentEqual,
  hasContent,
  isAnswered,
  mergeAnswers,
  mirrorKey,
  MIRROR_VERSION,
  readMirror,
  reconcileAck,
  writeMirror,
  type AnswerRecord,
  type StorageLike,
} from "@/lib/attempts-sync";

function rec(questionId: string, patch: Partial<AnswerRecord> = {}): AnswerRecord {
  return { questionId, chosen: null, timeSec: 0, marked: false, ...patch };
}

function memStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
    removeItem: (k) => {
      data.delete(k);
    },
  };
}

function throwingStorage(): StorageLike {
  return {
    getItem: () => {
      throw new Error("SecurityError");
    },
    setItem: () => {
      throw new Error("QuotaExceededError");
    },
    removeItem: () => {
      throw new Error("SecurityError");
    },
  };
}

describe("mirrorKey", () => {
  it("namespaces by user and attempt, defaulting the user segment", () => {
    expect(mirrorKey("att1", "u1")).toBe("shishya:attempt:u1:att1");
    expect(mirrorKey("att1")).toBe("shishya:attempt:anon:att1");
    expect(mirrorKey("att1", null)).toBe("shishya:attempt:anon:att1");
  });
});

describe("mergeAnswers", () => {
  const qids = ["q1", "q2", "q3"];

  it("materialises unanswered questions as empty records", () => {
    const { merged, dirty } = mergeAnswers([], null, qids);
    expect([...merged.keys()]).toEqual(qids);
    expect(merged.get("q2")).toEqual({ questionId: "q2", chosen: null, timeSec: 0, marked: false });
    expect(dirty.size).toBe(0);
  });

  it("server only → server, clean", () => {
    const { merged, dirty } = mergeAnswers([rec("q1", { chosen: "A", timeSec: 12 })], null, qids);
    expect(merged.get("q1")).toEqual(rec("q1", { chosen: "A", timeSec: 12 }));
    expect(dirty.size).toBe(0);
  });

  it("local only with content → local, dirty", () => {
    const { merged, dirty } = mergeAnswers([], [rec("q1", { chosen: "B", updatedAt: 5 })], qids);
    expect(merged.get("q1")?.chosen).toBe("B");
    expect([...dirty]).toEqual(["q1"]);
  });

  it("local only but untouched (empty record) → not dirty", () => {
    const { dirty } = mergeAnswers([], [rec("q1"), rec("q2")], qids);
    expect(dirty.size).toBe(0);
  });

  it("both, local newer and content differs → local, dirty", () => {
    const server = [rec("q1", { chosen: "A", updatedAt: 100 })];
    const local = [rec("q1", { chosen: "C", updatedAt: 200 })];
    const { merged, dirty } = mergeAnswers(server, local, qids);
    expect(merged.get("q1")?.chosen).toBe("C");
    expect([...dirty]).toEqual(["q1"]);
  });

  it("both, local newer but content equal → local, clean", () => {
    const server = [rec("q1", { chosen: "A", timeSec: 9, updatedAt: 100 })];
    const local = [rec("q1", { chosen: "A", timeSec: 9, updatedAt: 200 })];
    const { merged, dirty } = mergeAnswers(server, local, qids);
    expect(merged.get("q1")?.updatedAt).toBe(200);
    expect(dirty.size).toBe(0);
  });

  it("both, server strictly newer → server, clean (another device answered later)", () => {
    const server = [rec("q1", { chosen: "D", updatedAt: 300 })];
    const local = [rec("q1", { chosen: "A", updatedAt: 200 })];
    const { merged, dirty } = mergeAnswers(server, local, qids);
    expect(merged.get("q1")?.chosen).toBe("D");
    expect(dirty.size).toBe(0);
  });

  it("tie on updatedAt → local wins", () => {
    const server = [rec("q1", { chosen: "A", updatedAt: 200 })];
    const local = [rec("q1", { chosen: "B", updatedAt: 200 })];
    const { merged, dirty } = mergeAnswers(server, local, qids);
    expect(merged.get("q1")?.chosen).toBe("B");
    expect([...dirty]).toEqual(["q1"]);
  });

  it("legacy server row without updatedAt loses to a dated local row", () => {
    const server = [rec("q1", { chosen: "A" })];
    const local = [rec("q1", { chosen: "B", updatedAt: 1 })];
    const { merged, dirty } = mergeAnswers(server, local, qids);
    expect(merged.get("q1")?.chosen).toBe("B");
    expect([...dirty]).toEqual(["q1"]);
  });

  it("server row with a stamp beats an unstamped local row", () => {
    const server = [rec("q1", { chosen: "A", updatedAt: 1 })];
    const local = [rec("q1", { chosen: "B" })];
    const { merged, dirty } = mergeAnswers(server, local, qids);
    expect(merged.get("q1")?.chosen).toBe("A");
    expect(dirty.size).toBe(0);
  });

  it("ignores local rows for questions not in this mock", () => {
    const { merged, dirty } = mergeAnswers([], [rec("zzz", { chosen: "A", updatedAt: 1 })], qids);
    expect(merged.has("zzz")).toBe(false);
    expect(dirty.size).toBe(0);
  });

  it("returns copies — mutating the merged map does not touch the inputs", () => {
    const server = [rec("q1", { chosen: "A", updatedAt: 1 })];
    const { merged } = mergeAnswers(server, null, qids);
    merged.get("q1")!.chosen = "Z";
    expect(server[0].chosen).toBe("A");
  });
});

describe("reconcileAck", () => {
  it("removes an id when the acked version is the version still held", () => {
    const dirty = new Set(["q1", "q2"]);
    const current = new Map([
      ["q1", rec("q1", { chosen: "A", updatedAt: 10 })],
      ["q2", rec("q2", { chosen: "B", updatedAt: 20 })],
    ]);
    const next = reconcileAck(dirty, [{ questionId: "q1", updatedAt: 10 }], current);
    expect([...next]).toEqual(["q2"]);
  });

  it("keeps an id edited again after it was sent", () => {
    const dirty = new Set(["q1"]);
    const current = new Map([["q1", rec("q1", { chosen: "C", updatedAt: 11 })]]);
    const next = reconcileAck(dirty, [{ questionId: "q1", updatedAt: 10 }], current);
    expect([...next]).toEqual(["q1"]);
  });

  it("treats an unstamped current record as acknowledged", () => {
    const dirty = new Set(["q1"]);
    const current = new Map([["q1", rec("q1", { chosen: "A" })]]);
    const next = reconcileAck(dirty, [{ questionId: "q1", updatedAt: 999 }], current);
    expect(next.size).toBe(0);
  });

  it("ignores acks for ids that are not dirty and malformed acks", () => {
    const dirty = new Set(["q1"]);
    const current = new Map([["q1", rec("q1", { chosen: "A", updatedAt: 1 })]]);
    const next = reconcileAck(
      dirty,
      [{ questionId: "q9", updatedAt: 1 }, { questionId: 5 as unknown as string }, null as unknown as { questionId: string }],
      current,
    );
    expect([...next]).toEqual(["q1"]);
  });

  it("returns a new Set and leaves the input untouched", () => {
    const dirty = new Set(["q1"]);
    const current = new Map([["q1", rec("q1", { chosen: "A", updatedAt: 1 })]]);
    const next = reconcileAck(dirty, [{ questionId: "q1", updatedAt: 1 }], current);
    expect(next).not.toBe(dirty);
    expect(dirty.has("q1")).toBe(true);
    expect(next.has("q1")).toBe(false);
  });
});

describe("backoffMs", () => {
  it("doubles from base and is deterministic with jitter=0", () => {
    expect(backoffMs(0, 1000, 30000, 0)).toBe(1000);
    expect(backoffMs(1, 1000, 30000, 0)).toBe(2000);
    expect(backoffMs(2, 1000, 30000, 0)).toBe(4000);
    expect(backoffMs(3, 1000, 30000, 0)).toBe(8000);
  });

  it("never exceeds the cap, even with jitter", () => {
    expect(backoffMs(10, 1000, 30000, 0)).toBe(30000);
    for (let i = 0; i < 50; i++) {
      const v = backoffMs(6, 1000, 30000, 0.2);
      expect(v).toBeLessThanOrEqual(30000);
      expect(v).toBeGreaterThanOrEqual(30000); // 64000 raw → capped
    }
    for (let i = 0; i < 50; i++) {
      const v = backoffMs(1, 1000, 30000, 0.2);
      expect(v).toBeGreaterThanOrEqual(2000);
      expect(v).toBeLessThanOrEqual(2400);
    }
  });

  it("treats negative / fractional retry counts as step 0", () => {
    expect(backoffMs(-3, 1000, 30000, 0)).toBe(1000);
    expect(backoffMs(0.9, 1000, 30000, 0)).toBe(1000);
  });
});

describe("mirror read / write / clear", () => {
  const key = mirrorKey("att1", "u1");

  it("round-trips a blob and keeps per-record updatedAt", () => {
    const s = memStorage();
    const okWrite = writeMirror(s, key, {
      attemptId: "att1",
      userId: "u1",
      answers: [rec("q1", { chosen: "A", updatedAt: 7 }), rec("q2")],
    });
    expect(okWrite).toBe(true);
    const back = readMirror(s, key, "att1");
    expect(back).toEqual([rec("q1", { chosen: "A", updatedAt: 7 }), rec("q2")]);
    const blob = JSON.parse(s.data.get(key)!);
    expect(blob.v).toBe(MIRROR_VERSION);
    expect(typeof blob.savedAt).toBe("number");
  });

  it("accepts an iterator of answers (Map.values())", () => {
    const s = memStorage();
    const m = new Map([["q1", rec("q1", { chosen: "B" })]]);
    writeMirror(s, key, { attemptId: "att1", userId: "u1", answers: m.values() });
    expect(readMirror(s, key, "att1")).toEqual([rec("q1", { chosen: "B" })]);
  });

  it("returns null for a blob of another attempt", () => {
    const s = memStorage();
    writeMirror(s, key, { attemptId: "att1", userId: "u1", answers: [rec("q1", { chosen: "A" })] });
    expect(readMirror(s, key, "att2")).toBeNull();
  });

  it("returns null for a wrong version, corrupt JSON, or a malformed record", () => {
    const s = memStorage();
    s.setItem(key, JSON.stringify({ v: 99, attemptId: "att1", answers: [] }));
    expect(readMirror(s, key, "att1")).toBeNull();
    s.setItem(key, "{not json");
    expect(readMirror(s, key, "att1")).toBeNull();
    s.setItem(
      key,
      JSON.stringify({ v: 1, attemptId: "att1", answers: [{ questionId: "q1", chosen: 4, timeSec: 0, marked: false }] }),
    );
    expect(readMirror(s, key, "att1")).toBeNull();
    s.setItem(key, JSON.stringify({ v: 1, attemptId: "att1", answers: "nope" }));
    expect(readMirror(s, key, "att1")).toBeNull();
  });

  it("never throws on a throwing storage (quota, private mode) or a missing one", () => {
    const t = throwingStorage();
    expect(readMirror(t, key, "att1")).toBeNull();
    expect(writeMirror(t, key, { attemptId: "att1", userId: null, answers: [] })).toBe(false);
    expect(() => clearMirror(t, key)).not.toThrow();
    expect(readMirror(null, key, "att1")).toBeNull();
    expect(writeMirror(undefined, key, { attemptId: "att1", userId: null, answers: [] })).toBe(false);
    expect(() => clearMirror(null, key)).not.toThrow();
  });

  it("clearMirror removes the blob", () => {
    const s = memStorage();
    writeMirror(s, key, { attemptId: "att1", userId: "u1", answers: [rec("q1")] });
    clearMirror(s, key);
    expect(readMirror(s, key, "att1")).toBeNull();
  });
});

describe("record predicates", () => {
  it("isAnswered / hasContent / contentEqual", () => {
    expect(isAnswered(rec("q", { chosen: "A" }))).toBe(true);
    expect(isAnswered(rec("q", { chosen: "" }))).toBe(false);
    expect(isAnswered(rec("q"))).toBe(false);
    expect(isAnswered(null)).toBe(false);
    expect(hasContent(rec("q", { marked: true }))).toBe(true);
    expect(hasContent(rec("q", { timeSec: 1 }))).toBe(true);
    expect(hasContent(rec("q"))).toBe(false);
    expect(contentEqual(rec("q", { chosen: "A", updatedAt: 1 }), rec("q", { chosen: "A", updatedAt: 2 }))).toBe(true);
    expect(contentEqual(rec("q", { chosen: "A" }), rec("q", { chosen: "B" }))).toBe(false);
    expect(contentEqual(rec("q", { timeSec: 1 }), rec("q", { timeSec: 2 }))).toBe(false);
  });
});
