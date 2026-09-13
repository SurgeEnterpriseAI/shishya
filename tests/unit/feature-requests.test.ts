// Pure unit tests for the /ideas "close the loop" rules
// (src/lib/feature-requests.ts). No DB, no network. Run with: npm test
//
// Under test (13 Sep 2026):
//   * the status transition — SHIPPED needs a one-line note, a shishya.in
//     deep link and the admin's depth check; re-marking keeps the original
//     ship moment; leaving SHIPPED drops the public record;
//   * who is told — the author and upvoters from before the ship moment,
//     nobody else, once per person per request (dedup key + email guard);
//   * the read surfaces — the dashboard card and the public board order.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  BUILT_WITHOUT_RECORD_LINE,
  FEATURE_REQUEST_STATUSES,
  PUBLIC_STATUS_LABEL,
  builtForYouHeading,
  builtForYouShareMessage,
  encodeAdminNote,
  markedBuiltLabel,
  normaliseShipLink,
  normaliseShipNote,
  parseAdminNote,
  planShipEmails,
  planShipNotifications,
  planStatusChange,
  renderShipEmail,
  selectBuiltForYou,
  shipDedupKey,
  shipEmailTag,
  shipRecipients,
  splitIdeasBoard,
  type ShipRecord,
} from "@/lib/feature-requests";

const NOW = new Date("2026-09-13T08:00:00.000Z");
const DAY = 86_400_000;
const iso = (msAgo: number) => new Date(NOW.getTime() - msAgo).toISOString();

const SHIP: ShipRecord = {
  shippedAt: "2026-09-13T08:00:00.000Z",
  note: "Tap the mic on any question to ask the tutor by voice.",
  link: "/chat",
};

const goodShip = {
  status: "SHIPPED",
  shipNote: "Build a mock from any topics you pick, in 3 exams.",
  shipLink: "/exams/SSC_CGL/build-mock",
  depthChecked: true,
};

describe("statuses mirror the Prisma enum", () => {
  it("FEATURE_REQUEST_STATUSES equals enum FeatureRequestStatus in schema.prisma", () => {
    const schema = fs.readFileSync(path.resolve(__dirname, "..", "..", "prisma", "schema.prisma"), "utf8");
    const m = /enum FeatureRequestStatus \{([^}]*)\}/.exec(schema);
    expect(m).not.toBeNull();
    const values = m![1].split(/\s+/).map((s) => s.trim()).filter((s) => s && !s.startsWith("//"));
    expect([...FEATURE_REQUEST_STATUSES]).toEqual(values);
  });
  it("labels every status with its literal state", () => {
    expect(PUBLIC_STATUS_LABEL.SHIPPED).toBe("Built");
    expect(PUBLIC_STATUS_LABEL.OPEN).toBe("Open");
    expect(PUBLIC_STATUS_LABEL.PLANNED).toBe("Planned");
  });
});

describe("ship record codec", () => {
  it("round-trips a ship record and keeps the private note separate", () => {
    const raw = encodeAdminNote(SHIP, "dup of #12, asked twice on WhatsApp")!;
    const parsed = parseAdminNote(raw);
    expect(parsed.ship).toEqual(SHIP);
    expect(parsed.privateNote).toBe("dup of #12, asked twice on WhatsApp");
  });
  it("parses a CRLF-stored block", () => {
    const raw = encodeAdminNote(SHIP, "private")!.replace(/\n/g, "\r\n");
    expect(parseAdminNote(raw).ship).toEqual(SHIP);
  });
  it("treats a legacy free-text note as entirely private", () => {
    const parsed = parseAdminNote("Shipped last week, see mic button");
    expect(parsed.ship).toBeNull();
    expect(parsed.privateNote).toBe("Shipped last week, see mic button");
  });
  it("treats a damaged block (external link) as private, never public", () => {
    const raw = "[[ship v1]]\nat: 2026-09-13T08:00:00.000Z\nnote: A perfectly fine note here\nlink: https://evil.example/x\n[[/ship]]";
    expect(parseAdminNote(raw).ship).toBeNull();
  });
  it("encodes nothing for an empty private note and no ship", () => {
    expect(encodeAdminNote(null, "  ")).toBeNull();
  });
});

describe("normaliseShipLink / normaliseShipNote", () => {
  it.each([
    ["/exams/SSC_CGL/build-mock", "/exams/SSC_CGL/build-mock"],
    ["https://shishya.in/exams/x?y=1#z", "/exams/x?y=1#z"],
    ["https://www.shishya.in", "/"],
  ])("accepts %s", (input, out) => {
    expect(normaliseShipLink(input)).toBe(out);
  });
  it.each([
    "https://shishya.in.evil.com/x",
    "https://evil.com/x",
    "https://shishya.in@evil.com/",
    "//evil.com/x",
    "https://shishya.in//evil.com",
    "https://shishya.in//exams/SSC_CGL/build-mock",
    "https://www.shishya.in///x",
    "javascript:alert(1)",
    "exams/x",
    "/a b",
    '/x"onmouseover=1',
    "",
  ])("rejects %s", (input) => {
    expect(normaliseShipLink(input)).toBeNull();
  });
  it("is idempotent: every accepted link normalises to itself and survives the stored round-trip", () => {
    const inputs = [
      "/exams/SSC_CGL/build-mock",
      "https://shishya.in/exams/x?y=1#z",
      "https://www.shishya.in",
      "HTTP://SHISHYA.IN/chat",
      "/a//b",
      "https://shishya.in/a//b",
      "https://shishya.in//x",
      "//x",
    ];
    for (const input of inputs) {
      const once = normaliseShipLink(input);
      if (once === null) continue;
      expect(normaliseShipLink(once)).toBe(once);
      const raw = encodeAdminNote({ ...SHIP, link: once }, null);
      expect(parseAdminNote(raw).ship?.link).toBe(once);
    }
  });
  it("SHIPPED with a double-slash absolute link is rejected before anyone is told", () => {
    const p = planStatusChange(
      { status: "OPEN", adminNote: null },
      { ...goodShip, shipLink: "https://shishya.in//exams/SSC_CGL/build-mock" },
      NOW,
    );
    expect(p.ok).toBe(false);
  });
  it("collapses a note to one line and enforces 8–160 characters", () => {
    expect(normaliseShipNote("  Mic input\n on every   question ")).toBe("Mic input on every question");
    expect(normaliseShipNote("too short")).toBe("too short");
    expect(normaliseShipNote("short")).toBeNull();
    expect(normaliseShipNote("x".repeat(161))).toBeNull();
  });
});

describe("planStatusChange", () => {
  const open = { status: "OPEN" as const, adminNote: "private triage" };

  it("rejects an unknown status", () => {
    expect(planStatusChange(open, { status: "DONE" }, NOW)).toEqual({ ok: false, error: "Unknown status." });
  });
  it("rejects an empty update", () => {
    expect(planStatusChange(open, {}, NOW).ok).toBe(false);
  });
  it("rejects SHIPPED without a note", () => {
    const p = planStatusChange(open, { ...goodShip, shipNote: "" }, NOW);
    expect(p.ok).toBe(false);
  });
  it("rejects SHIPPED with a link off shishya.in", () => {
    const p = planStatusChange(open, { ...goodShip, shipLink: "https://example.com/x" }, NOW);
    expect(p.ok).toBe(false);
  });
  it("rejects SHIPPED without the depth check", () => {
    expect(planStatusChange(open, { ...goodShip, depthChecked: false }, NOW).ok).toBe(false);
    expect(planStatusChange(open, { ...goodShip, depthChecked: undefined }, NOW).ok).toBe(false);
  });
  it("marks SHIPPED: stamps now, keeps the private note, asks for delivery", () => {
    const p = planStatusChange(open, goodShip, NOW);
    if (!p.ok) throw new Error(p.error);
    expect(p.status).toBe("SHIPPED");
    expect(p.notify).toBe(true);
    expect(p.enteredShipped).toBe(true);
    expect(p.ship).toEqual({ shippedAt: NOW.toISOString(), note: goodShip.shipNote, link: goodShip.shipLink });
    expect(parseAdminNote(p.adminNote)).toEqual({ ship: p.ship, privateNote: "private triage" });
  });
  it("re-marking keeps the ORIGINAL ship moment and is not a new entry", () => {
    const earlier = { ...SHIP, shippedAt: iso(5 * DAY) };
    const shipped = { status: "SHIPPED" as const, adminNote: encodeAdminNote(earlier, "p") };
    const p = planStatusChange(shipped, { ...goodShip, shipNote: "Edited: topic mocks in 3 exams." }, NOW);
    if (!p.ok) throw new Error(p.error);
    expect(p.ship!.shippedAt).toBe(earlier.shippedAt);
    expect(p.ship!.note).toBe("Edited: topic mocks in 3 exams.");
    expect(p.enteredShipped).toBe(false);
    expect(p.notify).toBe(true); // delivery is idempotent; retries failed mails only
  });
  it("a legacy SHIPPED row (no record) gets its record stamped now", () => {
    const p = planStatusChange({ status: "SHIPPED", adminNote: "old free text" }, goodShip, NOW);
    if (!p.ok) throw new Error(p.error);
    expect(p.ship!.shippedAt).toBe(NOW.toISOString());
    expect(parseAdminNote(p.adminNote).privateNote).toBe("old free text");
  });
  it("a private-note edit on a built request keeps the record and notifies nobody", () => {
    const shipped = { status: "SHIPPED" as const, adminNote: encodeAdminNote(SHIP, "old") };
    const p = planStatusChange(shipped, { privateNote: "new private" }, NOW);
    if (!p.ok) throw new Error(p.error);
    expect(p.notify).toBe(false);
    expect(parseAdminNote(p.adminNote)).toEqual({ ship: SHIP, privateNote: "new private" });
  });
  it("leaving SHIPPED drops the public record but keeps the private note", () => {
    const shipped = { status: "SHIPPED" as const, adminNote: encodeAdminNote(SHIP, "keep me") };
    const p = planStatusChange(shipped, { status: "PLANNED" }, NOW);
    if (!p.ok) throw new Error(p.error);
    expect(p.notify).toBe(false);
    expect(p.ship).toBeNull();
    expect(p.adminNote).toBe("keep me");
  });
  it("other statuses never notify", () => {
    for (const s of ["OPEN", "UNDER_REVIEW", "PLANNED", "DECLINED"]) {
      const p = planStatusChange(open, { status: s }, NOW);
      expect(p.ok && p.notify).toBe(false);
    }
  });
});

describe("shipRecipients — only people who asked or upvoted before the ship", () => {
  it("author first, then upvoters in vote order, late upvoters excluded", () => {
    const r = shipRecipients({
      authorId: "author",
      upvotes: [
        { userId: "late", createdAt: new Date(NOW.getTime() + 1000) },
        { userId: "u2", createdAt: iso(1 * DAY) },
        { userId: "u1", createdAt: iso(3 * DAY) },
      ],
      shippedAt: NOW.toISOString(),
    });
    expect(r).toEqual([
      { userId: "author", role: "asked" },
      { userId: "u1", role: "upvoted" },
      { userId: "u2", role: "upvoted" },
    ]);
  });
  it("an author who also upvoted is told once, as the asker", () => {
    const r = shipRecipients({
      authorId: "a",
      upvotes: [{ userId: "a", createdAt: iso(DAY) }],
      shippedAt: NOW.toISOString(),
    });
    expect(r).toEqual([{ userId: "a", role: "asked" }]);
  });
  it("a signed-out author and no upvotes means nobody", () => {
    expect(shipRecipients({ authorId: null, upvotes: [], shippedAt: NOW.toISOString() })).toEqual([]);
  });
});

describe("notification dedupe", () => {
  const recipients = [
    { userId: "a", role: "asked" as const },
    { userId: "b", role: "upvoted" as const },
    { userId: "b", role: "upvoted" as const },
  ];
  it("one notice per person, all on the one per-request key", () => {
    const n = planShipNotifications({ id: "req1", title: "Mic input for doubts" }, SHIP, recipients);
    expect(n.map((x) => x.userId)).toEqual(["a", "b"]);
    expect(new Set(n.map((x) => x.dedupKey))).toEqual(new Set(["feature:req1:SHIPPED"]));
    expect(shipDedupKey("req1")).toBe("feature:req1:SHIPPED");
    expect(n.every((x) => x.link === SHIP.link && x.type === "SUGGESTION_ACCEPTED")).toBe(true);
  });
  it("the same request always yields the same key (a re-mark inserts nothing new)", () => {
    const first = planShipNotifications({ id: "req1", title: "t" }, SHIP, recipients);
    const again = planShipNotifications({ id: "req1", title: "t" }, { ...SHIP, note: "Edited note text" }, recipients);
    expect(again.map((x) => `${x.userId}|${x.dedupKey}`)).toEqual(first.map((x) => `${x.userId}|${x.dedupKey}`));
  });
  it("copy says asked vs upvoted, never more", () => {
    const n = planShipNotifications({ id: "r", title: "Mic input" }, SHIP, recipients);
    expect(n[0].title).toMatch(/You asked/);
    expect(n[1].title).toMatch(/upvoted/);
    expect(n[1].title).not.toMatch(/You asked/);
  });
  it("email tag is Resend-safe", () => {
    expect(shipEmailTag("ck:1/2")).toBe("idea-shipped-ck-1-2");
  });
});

describe("planShipEmails", () => {
  it("skips the already-mailed, the address-less, and anyone over the cap", () => {
    const plan = planShipEmails(
      [
        { userId: "a", role: "asked", email: "a@x.in" },
        { userId: "b", role: "upvoted", email: "b@x.in" },
        { userId: "c", role: "upvoted", email: null },
        { userId: "d", role: "upvoted", email: "d@x.in" },
        { userId: "e", role: "upvoted", email: "e@x.in" },
        { userId: "a", role: "asked", email: "a@x.in" },
      ],
      new Set(["b"]),
      2,
    );
    expect(plan.send.map((s) => s.userId)).toEqual(["a", "d"]);
    expect(plan.skippedAlreadySent).toBe(1);
    expect(plan.skippedNoAddress).toBe(1);
    expect(plan.skippedOverCap).toBe(1);
  });
});

describe("renderShipEmail", () => {
  it("quotes the asker's own words and links the absolute deep link", () => {
    const m = renderShipEmail({
      role: "asked",
      requestTitle: "Mic input",
      askedText: "Please let me ask doubts by voice",
      askedAt: "2026-08-28T06:00:00.000Z",
      ship: SHIP,
    });
    expect(m.subject).toMatch(/^You asked for this/);
    expect(m.text).toContain("Please let me ask doubts by voice");
    expect(m.text).toContain("28 Aug 2026");
    expect(m.text).toContain("https://shishya.in/chat");
  });
  it("tells an upvoter only that they upvoted, never someone else's words as theirs", () => {
    const m = renderShipEmail({
      role: "upvoted",
      requestTitle: "Mic input",
      askedText: "the author's private phrasing",
      askedAt: NOW,
      ship: SHIP,
    });
    expect(m.text).toContain("You upvoted");
    expect(m.text).not.toContain("the author's private phrasing");
    expect(m.text).not.toMatch(/you suggested/i);
  });
  it("escapes HTML from student text and the note", () => {
    const m = renderShipEmail({
      role: "asked",
      requestTitle: "<b>x</b>",
      askedText: "<script>alert(1)</script>",
      askedAt: NOW,
      ship: { ...SHIP, note: "Note with <img src=x> inside it" },
    });
    expect(m.html).not.toContain("<script>");
    expect(m.html).not.toContain("<img");
    expect(m.html).toContain("&lt;script&gt;");
  });
});

describe("student copy is sequence-neutral and dates are marking dates", () => {
  // A marked item may have existed before the ask, or been built weeks
  // before it was marked. No copy may claim it was built because they
  // asked, that it is newly built, or print the marking date as a build date.
  const CLAIMS = /we built it|it'?s built|built now|is built|are built|to build this|built because|built (on )?\d/i;

  it("notice titles, email subjects and bodies make no build-sequence claim", () => {
    for (const role of ["asked", "upvoted"] as const) {
      const [n] = planShipNotifications({ id: "r", title: "Mic input" }, SHIP, [{ userId: "u", role }]);
      expect(n.title).not.toMatch(CLAIMS);
      const m = renderShipEmail({ role, requestTitle: "Mic input", askedText: "voice please", askedAt: NOW, ship: SHIP });
      expect(m.subject).not.toMatch(CLAIMS);
      expect(m.text.replace(SHIP.note, "")).not.toMatch(CLAIMS);
      expect(m.html.replace(SHIP.note, "")).not.toMatch(CLAIMS);
      expect(m.text).toContain("It's on Shishya.");
    }
  });
  it("dashboard heading covers every role mix without a build claim", () => {
    const mixes: Array<Array<"asked" | "upvoted">> = [
      ["asked"], ["upvoted"], ["asked", "asked"], ["upvoted", "upvoted"], ["asked", "upvoted", "upvoted"],
    ];
    const headings = mixes.map((m) => builtForYouHeading(m));
    expect(headings).toEqual([
      "You asked for this — it's on Shishya",
      "An idea you upvoted is on Shishya",
      "Ideas you asked for are on Shishya",
      "Ideas you upvoted are on Shishya",
      "Ideas you asked for or upvoted are on Shishya",
    ]);
    for (const h of headings) expect(h).not.toMatch(CLAIMS);
  });
  it("share messages never say Shishya built it because of the ask", () => {
    expect(builtForYouShareMessage("asked", "Mic input")).toBe("I asked Shishya for this and it's there now: Mic input");
    expect(builtForYouShareMessage("upvoted", "Mic input")).toBe("Students asked Shishya for this and it's there now: Mic input");
    for (const r of ["asked", "upvoted"] as const) expect(builtForYouShareMessage(r, "x")).not.toMatch(CLAIMS);
  });
  it("the ship date is only ever printed as a marking date", () => {
    expect(markedBuiltLabel("2026-09-14T06:00:00.000Z")).toMatch(/^Marked built 14 Sep/);
    expect(markedBuiltLabel("2026-09-14T06:00:00.000Z", { capital: false })).toMatch(/^marked built 14 Sep/);
    expect(BUILT_WITHOUT_RECORD_LINE).toMatch(/^Marked built without a note/);
  });
});

describe("selectBuiltForYou — the dashboard card", () => {
  const row = (id: string, over: Partial<Parameters<typeof selectBuiltForYou>[0][number]> = {}, shippedAgo = DAY) => ({
    id,
    title: `Idea ${id}`,
    status: "SHIPPED",
    adminNote: encodeAdminNote({ ...SHIP, shippedAt: iso(shippedAgo) }, "private"),
    authorId: "me",
    myUpvoteAt: null,
    ...over,
  });

  it("shows at most 3, newest ship first", () => {
    const out = selectBuiltForYou(
      [row("a", {}, 5 * DAY), row("b", {}, 1 * DAY), row("c", {}, 3 * DAY), row("d", {}, 2 * DAY)],
      "me",
      NOW,
    );
    expect(out.map((i) => i.id)).toEqual(["b", "d", "c"]);
  });
  it("drops ships older than 30 days and future-dated records", () => {
    const out = selectBuiltForYou([row("old", {}, 31 * DAY), row("future", {}, -DAY), row("ok", {}, 29 * DAY)], "me", NOW);
    expect(out.map((i) => i.id)).toEqual(["ok"]);
  });
  it("needs THIS student to have asked, or upvoted before the ship", () => {
    const out = selectBuiltForYou(
      [
        row("theirs", { authorId: "someone-else" }),
        row("upvotedBefore", { authorId: "someone-else", myUpvoteAt: iso(3 * DAY) }),
        row("upvotedAfter", { authorId: "someone-else", myUpvoteAt: iso(0) }),
      ],
      "me",
      NOW,
    );
    expect(out.map((i) => [i.id, i.role])).toEqual([["upvotedBefore", "upvoted"]]);
  });
  it("never shows a legacy built row without a record, or a non-SHIPPED row", () => {
    const out = selectBuiltForYou(
      [row("legacy", { adminNote: "free text" }), row("planned", { status: "PLANNED" })],
      "me",
      NOW,
    );
    expect(out).toEqual([]);
  });
  it("carries the note and link, never the private note", () => {
    const [item] = selectBuiltForYou([row("a")], "me", NOW);
    expect(item.note).toBe(SHIP.note);
    expect(item.link).toBe(SHIP.link);
    expect(JSON.stringify(item)).not.toContain("private");
  });
});

describe("splitIdeasBoard — built first, open after", () => {
  it("orders built by ship date (legacy last), open by upvotes, hides declined", () => {
    const d = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * DAY);
    const rows = [
      { id: "open-low", status: "OPEN", adminNote: null, upvoteCount: 1, createdAt: d(1) },
      { id: "declined", status: "DECLINED", adminNote: null, upvoteCount: 9, createdAt: d(1) },
      { id: "built-old", status: "SHIPPED", adminNote: encodeAdminNote({ ...SHIP, shippedAt: iso(10 * DAY) }, null), upvoteCount: 0, createdAt: d(40) },
      { id: "planned-high", status: "PLANNED", adminNote: null, upvoteCount: 5, createdAt: d(2) },
      { id: "built-legacy", status: "SHIPPED", adminNote: "free", upvoteCount: 0, createdAt: d(3) },
      { id: "built-new", status: "SHIPPED", adminNote: encodeAdminNote({ ...SHIP, shippedAt: iso(1 * DAY) }, null), upvoteCount: 0, createdAt: d(50) },
      { id: "review-low", status: "UNDER_REVIEW", adminNote: null, upvoteCount: 1, createdAt: d(0.5) },
    ];
    const { built, open } = splitIdeasBoard(rows);
    expect(built.map((b) => b.row.id)).toEqual(["built-new", "built-old", "built-legacy"]);
    expect(built[2].ship).toBeNull();
    expect(open.map((o) => o.id)).toEqual(["planned-high", "review-low", "open-low"]);
  });
});
