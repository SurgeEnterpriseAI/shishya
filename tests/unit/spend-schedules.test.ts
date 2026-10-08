// Schedules after "stop paying for work nobody uses" (2 Oct 2026, resilience
// plan build 2).
//
// Why: the credit balance is topped up by hand and is sometimes zero. Two
// schedules were spending it on work nobody used:
//   • .github/workflows/refresh-portal.yml fired the exam-week article job
//     three more times a day, 2.5 to 8 hours late, on top of Vercel's own
//     runs. Its schedule is deleted; the manual button stays.
//   • seed discussion threads (8 threads, 0 replies, 12 page views in ten
//     days): the Vercel cron entry and the GitHub step are gone.
// The late GitHub run was also the only run after 18:00 IST, when an exam
// day turns "evening", so it wrote the evening pages. vercel.json therefore
// gains a 21:00 IST slot for the article job.
// Not changed by this build: the daily brief's schedule, the functions block
// and the tutor answer-later job.
// 7 Oct 2026 (decision D2 taken): exam news and dates run twice a day.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { TODAY_PM_IST_HOUR } from "@/lib/exam-week";
import { indexNowWindowMs } from "@/lib/news-dedupe";

const ROOT = path.resolve(__dirname, "..", "..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");

interface VercelJson {
  regions: string[];
  functions: Record<string, { regions?: string[] }>;
  crons: Array<{ path: string; schedule: string }>;
}
const vercel = JSON.parse(read("vercel.json")) as VercelJson;
const schedulesOf = (p: string) => vercel.crons.filter((c) => c.path === p).map((c) => c.schedule);

/** IST clock times ("07:00") of a "M H1,H2 * * *" schedule written in UTC. */
function istTimes(schedule: string): string[] {
  const [minute, hours, ...rest] = schedule.split(" ");
  expect(rest).toEqual(["*", "*", "*"]);
  return hours.split(",").map((h) => {
    const total = (Number(h) * 60 + Number(minute) + 330) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  });
}

describe("vercel.json: the exam-week article job runs in the evening too", () => {
  it("one entry, at 07:00, 12:00 and 21:00 IST", () => {
    expect(schedulesOf("/api/cron/refresh-phase-articles")).toEqual(["30 1,6,15 * * *"]);
    expect(istTimes("30 1,6,15 * * *")).toEqual(["07:00", "12:00", "21:00"]);
  });

  it("at least one run falls after an exam day turns evening, so the evening pages are still written", () => {
    const hours = istTimes(schedulesOf("/api/cron/refresh-phase-articles")[0]).map((t) => Number(t.slice(0, 2)));
    expect(hours.some((h) => h >= TODAY_PM_IST_HOUR)).toBe(true);
    // the two runs that existed before had none
    expect(istTimes("30 1,6 * * *").map((t) => Number(t.slice(0, 2))).some((h) => h >= TODAY_PM_IST_HOUR)).toBe(false);
  });

  it("the route's header names the schedule vercel.json has", () => {
    const route = read("src/app/api/cron/refresh-phase-articles/route.ts");
    expect(route).toContain(`vercel.json "${schedulesOf("/api/cron/refresh-phase-articles")[0]}"`);
    expect(route).toContain("07:00, 12:00 and 21:00 IST");
  });
});

describe("vercel.json: seed discussion threads are no longer scheduled", () => {
  it("has no cron entry for the seed job", () => {
    expect(schedulesOf("/api/cron/refresh-discussions")).toEqual([]);
    expect(read("vercel.json")).not.toContain("refresh-discussions");
  });

  it("the route says so (it still answers a manual call)", () => {
    expect(fs.existsSync(path.join(ROOT, "src/app/api/cron/refresh-discussions/route.ts"))).toBe(true);
    expect(read("src/app/api/cron/refresh-discussions/route.ts")).toMatch(/NOT scheduled since 2 Oct 2026/);
  });
});

describe("vercel.json: what this build must not change", () => {
  it("the functions block still pins the answer-key watch to Mumbai, and the default region is unchanged", () => {
    expect(vercel.regions).toEqual(["sin1"]);
    expect(vercel.functions["src/app/api/cron/answer-key-watch/**/route.ts"]).toEqual({ regions: ["bom1"] });
  });

  it("the tutor answer-later job still runs every 15 minutes", () => {
    expect(schedulesOf("/api/cron/tutor-answer-later")).toEqual(["5,20,35,50 * * * *"]);
  });

  it("the daily brief is still written every night", () => {
    expect(schedulesOf("/api/cron/daily-brief")).toEqual(["30 20 * * *"]);
  });

  it("exam news and dates: two full runs a day (06:45 and 18:45 IST) and the 20:15 exam-evening lane (D2, 7 Oct 2026)", () => {
    // The 12:45 run is cut: over 23 Sep-7 Oct it found the fewest first-seen,
    // current official dates that stuck (6, against 12 at 06:45 and 15 at
    // 18:45) for the same ~$1.65 a run (scripts/tmp-fix-b2-examinfo.ts).
    expect(schedulesOf("/api/cron/refresh-exam-data")).toEqual(["15 1,13 * * *"]);
    expect(istTimes("15 1,13 * * *")).toEqual(["06:45", "18:45"]);
    expect(schedulesOf("/api/cron/refresh-exam-data/today-pm")).toEqual(["45 14 * * *"]);
    expect(istTimes("45 14 * * *")).toEqual(["20:15"]);
  });

  it("the refresh route's header names the schedule vercel.json has", () => {
    const route = read("src/app/api/cron/refresh-exam-data/route.ts");
    expect(route).toContain(`vercel.json "${schedulesOf("/api/cron/refresh-exam-data")[0]}"`);
  });

  it("every cron path still has a route file", () => {
    for (const c of vercel.crons) {
      expect(fs.existsSync(path.join(ROOT, "src", "app", ...c.path.split("/").filter(Boolean), "route.ts")), c.path).toBe(true);
    }
  });
});

describe(".github/workflows/refresh-portal.yml: a manual button, not a second scheduler", () => {
  const yml = read(".github/workflows/refresh-portal.yml");
  /** The workflow without its comment lines: what GitHub acts on. */
  const live = yml
    .split("\n")
    .filter((l) => !l.trim().startsWith("#"))
    .join("\n");

  it("has no schedule", () => {
    expect(live).not.toMatch(/^\s*schedule\s*:/m);
    expect(live).not.toMatch(/cron\s*:/);
  });

  it("keeps the manual trigger as its only trigger", () => {
    expect(live).toMatch(/^on:\n\s+workflow_dispatch:\s*$/m);
  });

  it("still calls the exam-week article job with the cron secret, and no longer calls the seed job", () => {
    expect(live).toContain('"https://shishya.in/api/cron/refresh-phase-articles"');
    expect(live).toContain('-H "Authorization: Bearer ${CRON_SECRET}"');
    expect(live).not.toContain("refresh-discussions");
    expect(live.match(/curl /g)).toHaveLength(1);
  });

  it("no other workflow schedules either job", () => {
    const dir = path.join(ROOT, ".github", "workflows");
    for (const name of fs.readdirSync(dir).filter((n) => /\.ya?ml$/.test(n))) {
      const text = fs
        .readFileSync(path.join(dir, name), "utf8")
        .split(/\r?\n/)
        .filter((l) => !l.trim().startsWith("#"))
        .join("\n");
      if (!/^\s*schedule\s*:/m.test(text)) continue;
      expect(text, name).not.toContain("/api/cron/refresh-phase-articles");
      expect(text, name).not.toContain("/api/cron/refresh-discussions");
    }
  });
});

// 3 Oct 2026 (fix C15): IndexNow runs daily, and current affairs gets two
// more same-day chances (since 6 Oct the route skips a day already written
// and makes at most one paid call per slot, under a per-date lock —
// tests/unit/current-affairs-catch-up.test.ts).
describe("vercel.json: IndexNow daily, current affairs three times a day", () => {
  it("the IndexNow news scope runs every day at 02:00 UTC, so its window is 30 hours", () => {
    expect(schedulesOf("/api/cron/indexnow")).toEqual(["0 2 * * *"]);
    expect(indexNowWindowMs("0 2 * * *")).toBe(30 * 3_600_000);
  });

  it("current affairs runs at 06:30, 14:30 and 20:30 IST (one entry)", () => {
    expect(schedulesOf("/api/cron/daily-current-affairs")).toEqual(["0 1,9,15 * * *"]);
    expect(istTimes("0 1,9,15 * * *")).toEqual(["06:30", "14:30", "20:30"]);
  });

  it("the live-test job that shared the old expression keeps it", () => {
    expect(schedulesOf("/api/cron/live-test-create")).toEqual(["0 1 * * *"]);
  });
});
