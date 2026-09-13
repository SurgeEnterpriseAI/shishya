// Index shape (13 Sep 2026): the news story matcher, the writer plan and the
// IndexNow news selection — src/lib/news-dedupe.ts. Pure; no DB, no network.

import { describe, it, expect } from "vitest";
import {
  indexNowWindowMs,
  isSameStory,
  isWordingOnly,
  planNewsWrites,
  selectFreshStories,
  stageToken,
  storyStatus,
  storyTopic,
  textSimilarity,
  SAME_STORY_SIMILARITY,
  type StoredNewsRow,
  type StoryRow,
} from "@/lib/news-dedupe";

const DAY = 86_400_000;
const now = new Date("2026-09-13T06:00:00Z");

describe("story features", () => {
  it("reads the event status — change beats pending beats done", () => {
    expect(storyStatus("SSC CGL Tier 1 exam postponed, new date awaited")).toBe("changed");
    expect(storyStatus("Tier 1 admit card to be released soon")).toBe("pending");
    expect(storyStatus("Tier 1 admit card released")).toBe("done");
    expect(storyStatus("SSC CGL 2026 Tier 1 exam")).toBe("none");
  });

  it("normalises stages, including roman numerals", () => {
    expect(stageToken("SSC CGL Tier-1 dates")).toBe("tier1");
    expect(stageToken("CTET Paper II answer key")).toBe("paper2");
    expect(stageToken("UPSC Prelims result")).toBe("prelims");
    expect(stageToken("SBI PO Main exam")).toBe("mains");
    expect(stageToken("SSC CGL notification")).toBe("");
  });

  it("keys topics with the tracker vocabulary", () => {
    expect(storyTopic("Tier 1 hall ticket out")).toBe("ADMIT_CARD");
    expect(storyTopic("SSC CGL 2026 vacancies revised")).toBe("VACANCY");
    expect(storyTopic("Tier 1 exam dates awaited")).toBe("EXAM");
    expect(storyTopic("SSC names new chairman")).toBeNull();
  });
});

describe("isSameStory", () => {
  it("merges the audit's restatement pair (same exam, same topic + stage, both pending)", () => {
    expect(isSameStory("SSC CGL 2026: Tier 1 exam dates awaited", "SSC CGL 2026 Tier 1 exam date announcement expected soon")).toBe(true);
  });

  it("merges a moved estimate — still the same pending story (re-dated by the plan, below)", () => {
    expect(isSameStory("SSC CGL 2026 notification expected in March", "SSC CGL 2026 notification expected in June")).toBe(true);
  });

  it("keeps a different stage a different story", () => {
    expect(isSameStory("SSC CGL Tier 1 admit card released", "SSC CGL Tier 2 admit card released")).toBe(false);
    // An event needs the exact stage: the unstaged release is not the Tier 2 one.
    expect(isSameStory("SSC CGL admit card released", "SSC CGL Tier 2 admit card released")).toBe(false);
  });

  it("never merges an event into a restatement, or a postponement into a release", () => {
    expect(isSameStory("SSC CGL Tier 1 admit card expected soon", "SSC CGL Tier 1 admit card released")).toBe(false);
    expect(isSameStory("SSC CGL Tier 1 exam date announced", "SSC CGL Tier 1 exam postponed")).toBe(false);
  });

  it("keeps a re-dated event and a different cycle year apart", () => {
    expect(isSameStory("SSC CGL Tier 1 exam date announced: 13 September", "SSC CGL Tier 1 exam date announced: 20 September")).toBe(false);
    expect(isSameStory("SSC CGL 2025 result declared", "SSC CGL 2026 result declared")).toBe(false);
  });

  it("falls back to title similarity ≥ 0.8 when a headline has no topic", () => {
    expect(textSimilarity("SSC names new chairman", "SSC names new chairman today")).toBeGreaterThanOrEqual(SAME_STORY_SIMILARITY);
    expect(isSameStory("SSC names new chairman", "SSC names new chairman today")).toBe(true);
    expect(isSameStory("SSC names new chairman", "Commission website under maintenance")).toBe(false);
  });
});

describe("isSameStory — two events are one story only when they say the same thing", () => {
  const distinct: [string, string][] = [
    ["SSC CGL 2026 applications opened", "SSC CGL 2026 applications closed"],
    ["SSC CGL 2026 correction window opens", "SSC CGL 2026 correction window closed"],
    ["SSC CGL 2026 Tier 1 answer key released", "SSC CGL 2026 Tier 1 answer key objection window closed"],
    ["SSC CGL 2026 provisional answer key released", "SSC CGL 2026 final answer key released"],
    ["SSC CGL 2026 Tier 1 exam begins", "SSC CGL 2026 Tier 1 exam concluded"],
    ["SSC CGL 2026 Tier 1 exam city slip released", "SSC CGL 2026 Tier 1 admit card released"],
    ["SSC CGL 2026 Southern Region admit card released", "SSC CGL 2026 Northern Region admit card released"],
    ["SSC CGL 2026 Tier 1 exam postponed", "SSC CGL 2026 Tier 1 exam cancelled"],
  ];
  for (const [a, b] of distinct) {
    it(`"${a}" ≠ "${b}"`, () => {
      expect(isSameStory(a, b)).toBe(false);
      expect(isSameStory(b, a)).toBe(false);
    });
  }

  it("still merges a reworded event: same verb family, same content words", () => {
    expect(isSameStory("SSC CGL 2026 notification released", "SSC CGL 2026 notification out")).toBe(true);
    expect(isSameStory("SSC CGL 2026 Tier 1 admit card released", "SSC CGL 2026 Tier 1 admit cards released on regional websites")).toBe(true);
  });
});

describe("planNewsWrites — one permalink per story", () => {
  const stored: StoredNewsRow[] = [
    { id: "L1", title: "SSC CGL 2026: Tier 1 exam dates awaited", body: "Dates not out yet.", url: null, archivedAt: null },
    { id: "L2", title: "SSC CGL 2026 notification released", body: "The notification is out.", url: "https://ssc.gov.in/n", archivedAt: null },
    { id: "L3", title: "SSC CGL 2026 vacancies: 14,582 posts", body: "Tentative vacancy count.", url: null, archivedAt: null },
    {
      id: "A1",
      title: "SSC CGL 2026 Tier 1 admit card expected soon",
      body: "Regional sites will host it.",
      url: null,
      archivedAt: new Date(now.getTime() - 5 * DAY),
    },
  ];
  const incoming = [
    { title: "SSC CGL 2026 Tier 1 exam date announcement expected soon", body: "SSC has not announced Tier 1 dates.", daysAgo: 0, source: null },
    { title: "SSC CGL 2026 notification released", body: "The notification is out.", daysAgo: 9, source: null },
    { title: "SSC CGL 2026 Tier 1 admit card likely next week", body: "Watch the regional sites.", daysAgo: 1, source: null },
    { title: "SSC CGL 2026 Tier 1 exam dates still awaited", body: "Same story again.", daysAgo: 0, source: null },
    { title: "SSC CGL 2026 Tier 2 exam date announced", body: "Tier 2 on 18 Jan 2027.", daysAgo: 2, source: "https://ssc.gov.in/t2" },
  ];
  const plan = planNewsWrites(stored, incoming, now);

  it("updates a restated live story in place — no archive + recreate", () => {
    const u = plan.update.find((x) => x.id === "L1");
    expect(u?.data).toEqual({ title: incoming[0].title, body: incoming[0].body, url: null });
    expect(plan.archive).not.toContain("L1");
  });

  it("writes nothing for a word-for-word restatement and keeps the stored citation", () => {
    expect(plan.unchanged).toEqual(["L2"]);
    expect(plan.update.some((x) => x.id === "L2")).toBe(false);
  });

  it("revives an archived row the story returns to", () => {
    const u = plan.update.find((x) => x.id === "A1");
    expect(u?.data.archivedAt).toBeNull();
    expect(plan.revived).toBe(1);
  });

  it("collapses an in-run restatement and creates only the genuinely new story", () => {
    expect(plan.collapsed).toBe(1);
    expect(plan.create).toHaveLength(1);
    expect(plan.create[0]).toEqual({
      title: incoming[4].title,
      body: incoming[4].body,
      url: "https://ssc.gov.in/t2",
      publishedAt: new Date(now.getTime() - 2 * DAY),
    });
  });

  it("archives only the live story the generation no longer carries; wording-only restatements keep publishedAt", () => {
    expect(plan.archive).toEqual(["L3"]);
    expect(plan.refreshed).toBe(0);
    for (const u of plan.update) expect(Object.keys(u.data)).not.toContain("publishedAt");
  });

  it("claims each stored row at most once and is stable on a re-run", () => {
    const ids = [...plan.update.map((u) => u.id), ...plan.unchanged];
    expect(new Set(ids).size).toBe(ids.length);
    const rerun = planNewsWrites(
      [{ id: "L1", title: incoming[0].title, body: incoming[0].body, url: null, archivedAt: null }],
      [{ ...incoming[0] }],
      new Date(now.getTime() + 6 * 3_600_000),
    );
    expect(rerun).toMatchObject({ create: [], update: [], archive: [], unchanged: ["L1"] });
  });
});

describe("planNewsWrites — the date and the source next to a sentence are the ones it was stated with", () => {
  const row = (id: string, title: string, body: string, url: string | null, archivedAt: Date | null = null): StoredNewsRow => ({
    id,
    title,
    body,
    url,
    archivedAt,
  });

  it("a new event gets its own row — it never lands on the earlier event's date and URL", () => {
    const plan = planNewsWrites(
      [row("k", "SSC CGL 2026 Tier 1 answer key released", "Key out.", "https://ssc.gov.in/key")],
      [{ title: "SSC CGL 2026 Tier 1 answer key objection window closed", body: "Objections closed on 12 Sep; final key awaited.", daysAgo: 1, source: null }],
      now,
    );
    expect(plan.update).toEqual([]);
    expect(plan.create).toEqual([
      {
        title: "SSC CGL 2026 Tier 1 answer key objection window closed",
        body: "Objections closed on 12 Sep; final key awaited.",
        url: null,
        publishedAt: new Date(now.getTime() - DAY),
      },
    ]);
    expect(plan.archive).toEqual(["k"]);
  });

  it("a moved estimate keeps the permalink but is re-dated, and the old citation does not follow it", () => {
    const plan = planNewsWrites(
      [row("m", "SSC CGL 2026 Tier 1 exam date expected in March", "Estimate from the SSC calendar.", "https://ssc.gov.in/calendar")],
      [{ title: "SSC CGL 2026 Tier 1 exam date expected in June", body: "The estimate has moved.", daysAgo: 0, source: null }],
      now,
    );
    expect(plan.update).toEqual([
      { id: "m", data: { title: "SSC CGL 2026 Tier 1 exam date expected in June", body: "The estimate has moved.", url: null, publishedAt: now } },
    ]);
    expect(plan).toMatchObject({ create: [], archive: [], refreshed: 1 });
  });

  it("an estimate that becomes a date, or a changed count, is re-dated with its own citation", () => {
    const toDate = planNewsWrites(
      [row("e", "SSC CGL 2026 Tier 1 exam expected in September", "Going by last cycle.", "https://example.org/old")],
      [{ title: "SSC CGL 2026 Tier 1 exam on 12 September", body: "SSC fixed the date.", daysAgo: 2, source: "https://ssc.gov.in/t1" }],
      now,
    );
    expect(toDate.update[0].data).toMatchObject({ url: "https://ssc.gov.in/t1", publishedAt: new Date(now.getTime() - 2 * DAY) });
    const count = planNewsWrites(
      [row("v", "SSC CGL 2026 vacancies: 14,582 posts", "Tentative count.", null)],
      [{ title: "SSC CGL 2026 vacancies increased to 17,727", body: "Revised count.", daysAgo: 0, source: null }],
      now,
    );
    // Different content ("posts" vs "increased") is still one VACANCY story; the new figure re-dates it.
    expect(count.update[0].data.publishedAt).toEqual(now);
  });

  it("a fact that changes only in the body re-dates the row too", () => {
    const plan = planNewsWrites(
      [row("b", "SSC CGL 2026 vacancies announced", "14,582 posts across ministries.", "https://ssc.gov.in/v")],
      [{ title: "SSC CGL 2026 vacancies announced", body: "17,727 posts across ministries.", daysAgo: 0, source: null }],
      now,
    );
    expect(plan.update[0].data).toEqual({ title: "SSC CGL 2026 vacancies announced", body: "17,727 posts across ministries.", url: null, publishedAt: now });
  });

  it("a wording-only restatement keeps publishedAt and the stored citation", () => {
    const plan = planNewsWrites(
      [row("w", "SSC CGL 2026 notification released", "The notification is out.", "https://ssc.gov.in/n")],
      [{ title: "SSC CGL 2026 notification out", body: "SSC has published the notification.", daysAgo: 3, source: null }],
      now,
    );
    expect(plan.update).toEqual([
      { id: "w", data: { title: "SSC CGL 2026 notification out", body: "SSC has published the notification.", url: "https://ssc.gov.in/n" } },
    ]);
    expect(plan.refreshed).toBe(0);
  });

  it("a revived story with changed facts is revived AND re-dated", () => {
    const plan = planNewsWrites(
      [row("r", "SSC CGL 2026 Tier 1 exam date expected in March", "Estimate.", null, new Date(now.getTime() - 3 * DAY))],
      [{ title: "SSC CGL 2026 Tier 1 exam date expected in June", body: "Estimate moved.", daysAgo: 0, source: null }],
      now,
    );
    expect(plan.update[0].data).toEqual({
      title: "SSC CGL 2026 Tier 1 exam date expected in June",
      body: "Estimate moved.",
      url: null,
      publishedAt: now,
      archivedAt: null,
    });
    expect(plan).toMatchObject({ revived: 1, refreshed: 1 });
  });

  it("isWordingOnly: same status and the same years, numbers and months in title + body", () => {
    expect(isWordingOnly({ title: "Tier 1 dates awaited", body: "Not out." }, { title: "Tier 1 dates expected soon", body: "Still not out." })).toBe(true);
    expect(isWordingOnly({ title: "Tier 1 exam expected in March", body: "" }, { title: "Tier 1 exam expected in June", body: "" })).toBe(false);
    expect(isWordingOnly({ title: "Tier 1 exam expected", body: "" }, { title: "Tier 1 exam on 12 Sep", body: "" })).toBe(false);
    expect(isWordingOnly({ title: "Notification released", body: "Out on 5 Sep." }, { title: "Notification out", body: "Released 5 September." })).toBe(true);
  });
});

describe("IndexNow news selection", () => {
  const row = (id: string, examId: string, title: string, body: string, hoursAgo: number): StoryRow => ({
    id,
    examId,
    title,
    body,
    createdAt: new Date(now.getTime() - hoursAgo * 3_600_000),
  });

  it("submits only genuinely new stories — restatements and body near-duplicates are withheld", () => {
    const earlier = [
      row("e1", "A", "SSC CGL 2026 Tier 1 exam dates awaited", "Dates not announced yet by SSC.", 200),
      row("e2", "A", "Commission leadership change", "The Staff Selection Commission has appointed a new chairman who takes charge this week.", 100),
    ];
    const fresh = [
      row("f1", "A", "SSC CGL 2026: Tier 1 exam date announcement expected soon", "Still no dates from SSC for Tier 1.", 20),
      row("f2", "A", "SSC CGL 2026 Tier 1 admit card released", "Download from the regional websites.", 10),
      row("f3", "A", "SSC CGL 2026 Tier 1 admit card released on regional websites", "Candidates can download now.", 5),
      row("f4", "B", "IBPS PO 2026 notification released", "Apply online on ibps.in.", 8),
      row("f5", "A", "SSC names new chairman", "The Staff Selection Commission has appointed a new chairman who takes charge this week.", 3),
      row("f6", "A", "SSC CGL 2026 Tier 1 admit card objection window closed", "A new event, not a restatement of the release.", 2),
    ];
    const { keep, nearDuplicate } = selectFreshStories(fresh, earlier);
    expect(keep.sort()).toEqual(["f2", "f4", "f6"]);
    expect(nearDuplicate.sort()).toEqual(["f1", "f3", "f5"]);
  });

  it("derives the window from the triggering schedule, with 25% overlap", () => {
    expect(indexNowWindowMs("0 2 * * 1")).toBe(7 * DAY * 1.25);
    expect(indexNowWindowMs("15 2 * * *")).toBe(DAY * 1.25);
    expect(indexNowWindowMs(null)).toBe(DAY * 1.25);
    expect(indexNowWindowMs("0 2 * * 1", "6")).toBe(6 * 3_600_000);
    expect(indexNowWindowMs("", "9999")).toBe(14 * DAY);
    expect(indexNowWindowMs("15 2 * * *", "abc")).toBe(DAY * 1.25);
  });
});
