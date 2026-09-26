// Ask Shishya's streamed answer, the pure parts (26 Sep 2026, founder: "yes
// show them word by word") — src/lib/ask-stream.ts and the copy it reads.
//
// Pinned:
//   1. frames: sseFrame writes the tutor's `event:` / `data: <JSON>` shape on
//      one data line; the incremental parser reassembles frames split at any
//      byte, CRLF or LF, skips comments and keeps a last frame for flush();
//   2. the panel's reducer: meta → status → delta… → done, reset replacing
//      the draft, Stop freezing the view, late frames after done / Stop
//      ignored, errors with and without Retry; frameToAction drops junk;
//   3. the draft: every link is plain words (label, or host for a bare URL),
//      a half-written link / ** / ` / table rule is hidden, and the reveal
//      goes word by word, faster when behind, never inside a word;
//   4. the engine's text gate: growth → delta, a non-growth change → reset,
//      a first paragraph that may be narration is held until decided, a new
//      turn clears an earlier turn's words;
//   5. the copy: every status key has a line in en / hi / te, in the right
//      script, and a `{x}` line without a name falls back to a generic one.
// Run: npx vitest run tests/unit/ask-stream.test.ts

import { describe, expect, it } from "vitest";
import {
  ASK_SSE_HEADERS,
  ASK_STATUS_KEYS,
  ASK_VIEW_IDLE,
  askReducer,
  askStatusText,
  commonPrefixLength,
  createSseParser,
  createTextGate,
  draftForDisplay,
  frameToAction,
  mayBeNarration,
  revealNext,
  sseFrame,
  type AskAction,
  type AskStreamEvent,
  type AskView,
} from "@/lib/ask-stream";
import { searchCopy } from "@/lib/search-copy";

// ── 1. Frames ──────────────────────────────────────────────────────────

describe("SSE frames", () => {
  it("sseFrame: the tutor's shape, JSON on one data line", () => {
    expect(sseFrame("delta", "Hello\nworld")).toBe('event: delta\ndata: "Hello\\nworld"\n\n');
    expect(sseFrame("status", { key: "web", text: "x" })).toBe('event: status\ndata: {"key":"web","text":"x"}\n\n');
    expect(sseFrame("done", { answer: "a\n\nb" }).split("\n").filter((l) => l.startsWith("data: "))).toHaveLength(1);
  });

  it("the headers stop buffering (no-cache, no-transform, x-accel-buffering no)", () => {
    expect(ASK_SSE_HEADERS["content-type"]).toMatch(/^text\/event-stream/);
    expect(ASK_SSE_HEADERS["cache-control"]).toBe("no-cache, no-transform");
    expect(ASK_SSE_HEADERS["x-accel-buffering"]).toBe("no");
  });

  it("round trip: frames split at every byte come back whole and in order", () => {
    const frames = [
      sseFrame("meta", { locale: "hi", pages: [] }),
      sseFrame("status", { key: "page", text: "शिष्य का SSC CGL पेज पढ़ रहे हैं…" }),
      sseFrame("delta", "**SSC CGL** का "),
      sseFrame("delta", "कटऑफ़ 📌"),
      sseFrame("done", { answer: "ok", pages: [] }),
    ].join("");
    const p = createSseParser();
    const out = [];
    for (const ch of frames) out.push(...p.push(ch));
    out.push(...p.flush());
    expect(out.map((f) => f.event)).toEqual(["meta", "status", "delta", "delta", "done"]);
    expect(JSON.parse(out[2].data) + JSON.parse(out[3].data)).toBe("**SSC CGL** का कटऑफ़ 📌");
  });

  it("CRLF, a CRLF split across chunks, comments, multi-line data and a frame without its blank line", () => {
    const p = createSseParser();
    expect(p.push(": keep-alive\r\n\r\nevent: delta\r\ndata: \"a\"\r")).toEqual([]);
    expect(p.push("\n\r\nevent: x\ndata: 1\ndata: 2\n\n")).toEqual([
      { event: "delta", data: '"a"' },
      { event: "x", data: "1\n2" },
    ]);
    expect(p.push("event: done\ndata: {\"answer\":\"z\"}")).toEqual([]);
    expect(p.flush()).toEqual([{ event: "done", data: '{"answer":"z"}' }]);
    expect(p.flush()).toEqual([]);
  });
});

// ── 2. The panel's reducer ─────────────────────────────────────────────

const run = (actions: AskAction[], from: AskView = ASK_VIEW_IDLE) => actions.reduce(askReducer, from);
const PAGE = { url: "/exams/SSC_CGL", label: "SSC CGL", section: "government" as const };

describe("askReducer", () => {
  it("meta → status → delta… → done", () => {
    const s = run([
      { type: "start" },
      { type: "meta", pages: [PAGE] },
      { type: "status", text: "Reading Shishya's SSC CGL page…" },
    ]);
    expect(s).toMatchObject({ phase: "busy", status: "Reading Shishya's SSC CGL page…", metaPages: [PAGE], draft: "" });
    const t = run([{ type: "delta", text: "The " }, { type: "delta", text: "cutoff" }], s);
    expect(t).toMatchObject({ phase: "streaming", draft: "The cutoff" });
    const d = run([{ type: "done", data: { answer: "The cutoff.", pages: [PAGE], next: PAGE } }], t);
    expect(d.phase).toBe("done");
    expect(d.data?.answer).toBe("The cutoff.");
    expect(d.status).toBeNull();
    expect(d.draft).toBe("The cutoff"); // kept: the panel finishes revealing it before the swap
  });

  it("reset replaces the draft (empty → back to busy)", () => {
    const s = run([{ type: "start" }, { type: "delta", text: "Here is" }, { type: "reset", text: "" }]);
    expect(s).toMatchObject({ phase: "busy", draft: "" });
    expect(run([{ type: "reset", text: "New text" }], s)).toMatchObject({ phase: "streaming", draft: "New text" });
  });

  it("Stop freezes the view: later deltas, done and errors change nothing", () => {
    const s = run([{ type: "start" }, { type: "delta", text: "Partial" }, { type: "stop" }]);
    expect(s).toMatchObject({ phase: "stopped", draft: "Partial" });
    expect(run([{ type: "delta", text: " more" }, { type: "done", data: { answer: "x" } }, { type: "error", message: "e", canRetry: true }], s)).toBe(s);
  });

  it("after done, stray frames are ignored; a new start clears everything", () => {
    const d = run([{ type: "start" }, { type: "delta", text: "a" }, { type: "done", data: { answer: "a" } }]);
    expect(run([{ type: "delta", text: "b" }, { type: "status", text: "x" }, { type: "error", message: "e", canRetry: true }], d)).toBe(d);
    expect(run([{ type: "start" }], d)).toEqual({ ...ASK_VIEW_IDLE, phase: "busy" });
  });

  it("errors carry whether Retry fits; idle ignores stream frames", () => {
    expect(run([{ type: "start" }, { type: "error", message: "Busy", canRetry: false }])).toMatchObject({ phase: "error", error: "Busy", canRetry: false });
    expect(run([{ type: "delta", text: "x" }, { type: "status", text: "y" }])).toBe(ASK_VIEW_IDLE);
    // A cached answer (back / forward) goes straight to done.
    expect(run([{ type: "done", data: { answer: "cached" } }]).phase).toBe("done");
  });

  it("frameToAction: the wire frames, and junk dropped", () => {
    expect(frameToAction({ event: "delta", data: '"word "' }, "F")).toEqual({ type: "delta", text: "word " });
    expect(frameToAction({ event: "status", data: '{"key":"web","text":"Checking…"}' }, "F")).toEqual({ type: "status", text: "Checking…" });
    expect(frameToAction({ event: "reset", data: "{}" }, "F")).toEqual({ type: "reset", text: "" });
    expect(frameToAction({ event: "meta", data: JSON.stringify({ pages: [PAGE, { bad: 1 }] }) }, "F")).toEqual({ type: "meta", pages: [PAGE] });
    expect(frameToAction({ event: "error", data: "{}" }, "F")).toEqual({ type: "error", message: "F", canRetry: true });
    expect(frameToAction({ event: "error", data: '{"error":"हिंदी"}' }, "F")).toMatchObject({ message: "हिंदी" });
    expect(frameToAction({ event: "done", data: '{"answer":null,"notice":"no-ai-young-class"}' }, "F")).toMatchObject({ type: "done" });
    expect(frameToAction({ event: "done", data: "{}" }, "F")).toBeNull();
    expect(frameToAction({ event: "delta", data: "not json" }, "F")).toBeNull();
    expect(frameToAction({ event: "delta", data: "{}" }, "F")).toBeNull();
    expect(frameToAction({ event: "tool", data: "{}" }, "F")).toBeNull();
  });
});

// ── 3. The draft on screen ─────────────────────────────────────────────

describe("draftForDisplay: links are plain words until the answer is checked", () => {
  it("markdown links show their label; bare URLs their host", () => {
    expect(draftForDisplay("See [SSC CGL · Cutoff](https://shishya.in/exams/SSC_CGL/cutoff) — marks")).toBe("See SSC CGL · Cutoff — marks");
    expect(draftForDisplay("Notice: https://ssc.gov.in/notice/2026.pdf today")).toBe("Notice: ssc.gov.in today");
    expect(draftForDisplay("[a (b)](https://x.gov.in/p_(1)) and [c](/exams/X)")).toBe("a (b) and c");
    expect(draftForDisplay("📌 Pages on Shishya for this:\n- [SSC CGL](https://shishya.in/exams/SSC_CGL) — hub")).toBe("📌 Pages on Shishya for this:\n- SSC CGL — hub");
  });

  it("a link still being written shows only its label", () => {
    expect(draftForDisplay("Open [SSC CGL](https://shishya.in/exa")).toBe("Open SSC CGL");
    expect(draftForDisplay("Open [SSC CGL]")).toBe("Open SSC CGL");
    expect(draftForDisplay("Open [SSC C")).toBe("Open SSC C");
    expect(draftForDisplay("Go to https://ssc.g")).toBe("Go to ssc.g");
    // 26 Sep 2026 (integrator): ChatMarkdown's looser grammar, mid-write.
    expect(draftForDisplay("Open [SSC CGL] (/exa")).toBe("Open SSC CGL");
    expect(draftForDisplay("Open [SSC CGL] ")).toBe("Open SSC CGL");
  });

  it("neutralises every link shape ChatMarkdown would render (26 Sep 2026, integrator)", () => {
    // A space (or up to 3 whitespace characters) before "(", a ./ path, spaces inside the href.
    expect(draftForDisplay("See [SSC CGL] (/exams/SSC_CGL) now")).toBe("See SSC CGL now");
    expect(draftForDisplay("See [SSC CGL]  (./exams/SSC_CGL) now")).toBe("See SSC CGL now");
    expect(draftForDisplay("See [Notice](https://ssc.gov.in/a b.pdf) now")).toBe("See Notice now");
    expect(draftForDisplay("See [X]\n(/exams/FAKE) now")).toBe("See X now");
    // Not a link for ChatMarkdown either: left exactly as written.
    expect(draftForDisplay("Tick [Note] (optional) here")).toBe("Tick [Note] (optional) here");
    expect(draftForDisplay("Array a[i] (0-based) here")).toBe("Array a[i] (0-based) here");
  });

  it("half-written markers on the last line are hidden until they close", () => {
    expect(draftForDisplay("Age: **18-27")).toBe("Age: 18-27");
    expect(draftForDisplay("Age: **18-27** years")).toBe("Age: **18-27** years");
    expect(draftForDisplay("Age: *")).toBe("Age: ");
    expect(draftForDisplay("Code `SSC_C")).toBe("Code SSC_C");
    expect(draftForDisplay("| Exam | Age |\n|---|--")).toBe("| Exam | Age |\n");
    // Earlier lines are left alone.
    expect(draftForDisplay("**Bold**\nnext")).toBe("**Bold**\nnext");
  });
});

describe("revealNext: word by word", () => {
  const text = "SSC CGL का कटऑफ़ इस साल ऊपर गया 📈 और";
  it("one word a tick when the stream keeps pace, cutting only at whitespace", () => {
    const steps: string[] = [];
    let n = 0;
    while (n < text.length) {
      n = revealNext(text, n);
      steps.push(text.slice(0, n));
    }
    expect(steps[0]).toBe("SSC");
    expect(steps[1]).toBe("SSC CGL");
    expect(steps).toContain("SSC CGL का कटऑफ़ इस साल ऊपर गया 📈");
    expect(steps.at(-1)).toBe(text);
    for (const s of steps) expect(text.startsWith(s)).toBe(true);
  });

  it("more words a tick when far behind; hurry catches up in a few ticks", () => {
    const long = Array.from({ length: 400 }, (_, i) => `w${i}`).join(" ");
    const one = revealNext(long, 0);
    const behind = revealNext(long, 0) - 0;
    expect(behind).toBeGreaterThan("w0".length); // > 1 word when ~2,000 characters are waiting
    let n = one;
    let ticks = 0;
    while (n < long.length && ticks < 100) {
      n = revealNext(long, n, true);
      ticks++;
    }
    expect(n).toBe(long.length);
    expect(ticks).toBeLessThan(40);
    expect(revealNext("abc", 5)).toBe(3);
  });

  it("commonPrefixLength keeps what a reset shares with the screen", () => {
    expect(commonPrefixLength("Hello world", "Hello there")).toBe(6);
    expect(commonPrefixLength("", "x")).toBe(0);
  });
});

// ── 4. The engine's text gate ──────────────────────────────────────────

describe("createTextGate", () => {
  const collect = () => {
    const ev: AskStreamEvent[] = [];
    return { ev, gate: createTextGate((e) => ev.push(e)) };
  };

  it("growth is sent as deltas", () => {
    const { ev, gate } = collect();
    gate.update("The");
    gate.update("The cutoff");
    gate.update("The cutoff");
    expect(ev).toEqual([
      { type: "delta", text: "The" },
      { type: "delta", text: " cutoff" },
    ]);
  });

  it("a first paragraph that may be narration is held; a real paragraph after it is sent alone", () => {
    const { ev, gate } = collect();
    gate.update("Le");
    gate.update("Let me check");
    gate.update("Let me check Shishya's page.");
    expect(ev).toEqual([]);
    // finalText drops the narration once a second paragraph starts: the gate sees only the answer.
    gate.update("SSC CGL");
    expect(ev).toEqual([{ type: "delta", text: "SSC CGL" }]);
  });

  it("a short answer that only looked like narration is released when the turn ends", () => {
    const { ev, gate } = collect();
    gate.update("Checking is done on the official site.");
    expect(ev).toEqual([]);
    gate.update("Checking is done on the official site.", true);
    expect(ev).toEqual([{ type: "delta", text: "Checking is done on the official site." }]);
  });

  it("a change that is not growth is a reset carrying the new text; a new turn clears the old turn's words", () => {
    const { ev, gate } = collect();
    gate.update("Shishya has the page.");
    gate.update(""); // the model then called a tool: those words were narration
    expect(ev.at(-1)).toEqual({ type: "reset", text: "" });
    gate.update("Answer A");
    gate.update("Answer B");
    expect(ev.at(-1)).toEqual({ type: "reset", text: "Answer B" });
    gate.newTurn();
    expect(ev.at(-1)).toEqual({ type: "reset", text: "" });
    expect(gate.sent).toBe("");
    const n = ev.length;
    gate.newTurn(); // nothing sent: no reset
    expect(ev.length).toBe(n);
  });

  it("mayBeNarration: short, single-paragraph, narration-shaped openings only", () => {
    for (const s of ["", "L", "let", "Let me", "I’ll look", "i will", "Searching", "First, let"]) expect(mayBeNarration(s), s).toBe(true);
    for (const s of ["SSC CGL", "In Bihar", "If you", "Let me\n\nSSC", "Let me ".padEnd(220, "x"), "कटऑफ़"]) expect(mayBeNarration(s), s).toBe(false);
  });
});

// ── 5. The copy ────────────────────────────────────────────────────────

describe("stream copy (en / hi / te)", () => {
  it("every status key has a line in every locale, in its own script; {x} only in the named lines", () => {
    for (const l of ["en", "hi", "te"] as const) {
      const c = searchCopy(l).stream;
      for (const k of ASK_STATUS_KEYS) expect(c.status[k], `${l}.${k}`).toBeTruthy();
      expect(Object.keys(c.status).sort()).toEqual([...ASK_STATUS_KEYS].sort());
      for (const k of ASK_STATUS_KEYS) expect(c.status[k].includes("{x}"), `${l}.${k}`).toBe(k === "page" || k === "examPages");
      for (const v of [c.writing, c.stop, c.stopped, c.retry, c.linksSoon, c.official, c.otherSite, ...Object.values(c.status)]) {
        if (l === "hi") expect(/[ऀ-ॿ]/.test(v), v).toBe(true);
        if (l === "te") expect(/[ఀ-౿]/.test(v), v).toBe(true);
      }
    }
  });

  it("askStatusText fills {x} with a clean name, and falls back without one", () => {
    const en = searchCopy("en").stream.status;
    expect(askStatusText(en, "page", "SSC CGL")).toBe("Reading Shishya's SSC CGL page…");
    expect(askStatusText(en, "page", "**[SSC](x)**")).toBe("Reading Shishya's SSCx page…");
    expect(askStatusText(en, "page")).toBe(en.pages);
    expect(askStatusText(en, "web")).toBe("Checking official sources on the web…");
    expect(askStatusText(searchCopy("hi").stream.status, "page", "SSC CGL")).toBe("शिष्य का SSC CGL पेज पढ़ रहे हैं…");
  });
});
