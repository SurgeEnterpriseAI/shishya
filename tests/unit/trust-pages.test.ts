// 26 Sep 2026: pins the trust-page rewrite — /verification, /recognition and
// /results may only say what the DB and the code back. The 26 Sep fixture
// below is the read-only prod probe of that day (a test input, not page copy).

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  BADGE_PAGE_SECTIONS,
  describeVerificationState,
  FACT_STATUS_LABEL,
  FACT_STATUS_RULES,
  type VerificationStats,
} from "@/lib/verification-state";
import { recognitionCopy } from "@/lib/recognition-copy";
import { recognitionStatus, RECOGNITION_ACTIVATION } from "@/lib/db/recognition";
import { resultsIntro, RESULTS_LIMIT, RESULTS_WINDOW_DAYS } from "@/lib/results-copy";

const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** Same comment stripping as the truth-lint source scan: only code, strings
 *  and JSX text remain (a dated comment quoting the old claim is not a claim). */
function stripComments(src: string): string {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  out = out.replace(/^[ \t]*\/\/.*$/gm, "");
  return out;
}

const SEP26: VerificationStats = {
  sections: [
    { section: "COLLEGE", facts: 381, pages: 77 },
    { section: "SCHOLARSHIP", facts: 96, pages: 24 },
    { section: "BOARD", facts: 49, pages: 20 },
  ],
  statuses: [
    { section: "COLLEGE", status: "AI", facts: 381 },
    { section: "SCHOLARSHIP", status: "AI", facts: 96 },
    { section: "BOARD", status: "AI", facts: 49 },
  ],
  recentlyChecked: [],
  aiChecks: 0,
  lastAiCheckAt: null,
  confirmations: 2,
  confirmers: 1,
  flags: 0,
  suggestions: 0,
  levels: {},
};

const BANNED_CLAIMS = [
  "community-confirmed",
  "every fact",
  "verified students and professionals",
  "trusted verifiers",
  "domain experts,",
  "celebrates the top community contributors",
  "thousands of facts",
  "cleared upsc",
  "cleared the same",
  "all declared",
  "every declared",
  "every few days",
];

function allText(copy: ReturnType<typeof describeVerificationState>): string {
  return [...copy.rows.flatMap((r) => [r.label, r.value]), copy.levelsClause, copy.seniorTiersSentence].join("\n");
}
const rowValue = (copy: ReturnType<typeof describeVerificationState>, label: string) =>
  copy.rows.find((r) => r.label === label)?.value;

describe("/verification state copy — computed from Fact / Verification / AiCheck / User rows", () => {
  it("26 Sep 2026 snapshot: badges on college + board pages only, no re-check yet, no levels", () => {
    const c = describeVerificationState(SEP26);
    expect(rowValue(c, "Facts with a badge")).toBe("381 facts on 77 college pages · 49 facts on 20 school-board pages");
    expect(rowValue(c, "Badge state today")).toBe("All 430 show “Sourced”");
    expect(rowValue(c, "Automated source re-checks run")).toBe("0 — not running yet");
    expect(rowValue(c, "Student confirmations")).toBe("2 from 1 student");
    expect(rowValue(c, "Flags · suggested updates")).toBe("0 · 0");
    expect(rowValue(c, "Badge levels awarded")).toBe("None yet");
    expect(c.badgedFacts).toBe(430);
    expect(c.perStatus.AI).toBe(430);
    expect(c.perStatus.VERIFIED + c.perStatus.FULLY).toBe(0);
    expect(c.recheckRunning).toBe(false);
    expect(c.upperTiersReachable).toBe(false);
    expect(c.levelsClause).toBe("none has been awarded yet");
    expect(c.seniorTiersSentence).toMatch(/not yet awarded/);
    // Scholarship facts exist in the DB but no page shows them.
    expect(allText(c).toLowerCase()).not.toContain("scholarship");
  });

  it("moves with the data once re-checks run and levels are awarded", () => {
    const c = describeVerificationState({
      ...SEP26,
      statuses: [
        { section: "COLLEGE", status: "AI", facts: 351 },
        { section: "COLLEGE", status: "VERIFIED", facts: 30 },
        { section: "BOARD", status: "AI", facts: 49 },
        { section: "SCHOLARSHIP", status: "DISPUTED", facts: 5 },
      ],
      recentlyChecked: [{ section: "COLLEGE", facts: 40 }],
      aiChecks: 1200,
      lastAiCheckAt: new Date("2026-10-02T03:00:00Z"),
      confirmations: 1,
      confirmers: 1,
      levels: { CONTRIBUTOR: 3, TRUSTED_VERIFIER: 1 },
    });
    expect(rowValue(c, "Badge state today")).toBe("400 “Sourced” · 30 “Verified”");
    expect(rowValue(c, "Automated source re-checks run")).toBe("1,200, latest on 2026-10-02");
    expect(rowValue(c, "Badge levels awarded")).toBe("3 Contributor · 1 Trusted Verifier");
    expect(c.perStatus.DISPUTED).toBe(0); // scholarship rows are not badged
    expect(c.recheckRunning).toBe(true);
    expect(c.upperTiersReachable).toBe(true);
    expect(c.levelsClause).toBe("awarded so far: 3 Contributor, 1 Trusted Verifier");
    expect(c.seniorTiersSentence).toBe("Awarded so far: 1 Trusted Verifier, 0 Domain Expert.");
  });

  it("a Trusted Verifier alone makes the upper tiers reachable; empty tables say so plainly", () => {
    expect(describeVerificationState({ ...SEP26, levels: { TRUSTED_VERIFIER: 1 } }).upperTiersReachable).toBe(true);
    const empty = describeVerificationState({ ...SEP26, sections: [], statuses: [], confirmations: 0, confirmers: 0 });
    expect(rowValue(empty, "Facts with a badge")).toBe("None yet");
    expect(rowValue(empty, "Badge state today")).toBeUndefined();
    expect(rowValue(empty, "Student confirmations")).toBe("0 from 0 students");
  });

  it("never prints a banned trust claim", () => {
    for (const s of [SEP26, { ...SEP26, levels: { DOMAIN_EXPERT: 2, TRUSTED_VERIFIER: 2 } }]) {
      const text = allText(describeVerificationState(s)).toLowerCase();
      for (const b of BANNED_CLAIMS) expect(text, b).not.toContain(b);
    }
  });
});

describe("/verification rules mirror the code that sets fact status", () => {
  const route = read("src/app/api/facts/[id]/verify/route.ts");
  const num = (re: RegExp) => {
    const m = route.match(re);
    expect(m, String(re)).not.toBeNull();
    return Number(m![1]);
  };

  it("thresholds equal the verify route's inline numbers", () => {
    expect(num(/f\.flagCount >= (\d+)/)).toBe(FACT_STATUS_RULES.disputedFlags);
    expect(num(/aiFresh30 = [^;]*< (\d+) \* 86_400_000/)).toBe(FACT_STATUS_RULES.fullyRecheckDays);
    expect(num(/aiFresh60 = [^;]*< (\d+) \* 86_400_000/)).toBe(FACT_STATUS_RULES.verifiedRecheckDays);
    expect(num(/aiFresh30 &&\s*\(f\.communityVerificationsCount >= (\d+)/)).toBe(FACT_STATUS_RULES.fullyCommunity);
    expect(num(/f\.trustedVerifierCount >= 1 && f\.communityVerificationsCount >= (\d+)/)).toBe(FACT_STATUS_RULES.fullyTrustedPlusCommunity);
    expect(num(/aiFresh60 && f\.communityVerificationsCount >= (\d+)/)).toBe(FACT_STATUS_RULES.verifiedCommunity);
  });

  it("state labels are the ones the badge prints", () => {
    const badge = read("src/components/VerificationBadge.tsx");
    const block = badge.match(/const STATUS_LABELS[\s\S]*?\n\};/);
    expect(block).not.toBeNull();
    for (const label of Object.values(FACT_STATUS_LABEL)) expect(block![0], label).toContain(`"${label}"`);
  });

  it("BADGE_PAGE_SECTIONS lists exactly the page families that render per-fact badges", () => {
    const SECTION_ROUTE: Record<string, string> = { COLLEGE: "colleges", BOARD: "schooling" };
    const found = new Set<string>();
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name)) {
          for (const m of fs.readFileSync(p, "utf8").matchAll(/getFactMap\(`\/([a-z-]+)\//g)) found.add(m[1]);
        }
      }
    };
    walk(path.join(ROOT, "src", "app"));
    expect([...found].sort()).toEqual(BADGE_PAGE_SECTIONS.map((b) => SECTION_ROUTE[b.section]).sort());
  });
});

describe("/recognition copy — future tense until the first window opens", () => {
  const A = RECOGNITION_ACTIVATION;
  const all = (c: ReturnType<typeof recognitionCopy>) => [c.title, c.description, c.ldName, c.intro].join("\n");

  it("before the first window (26 Sep 2026)", () => {
    const status = recognitionStatus(new Date("2026-09-26T06:00:00Z"));
    const c = recognitionCopy(status);
    expect(status.kind).toBe("DORMANT");
    expect(c.title).toBe(`Annual Recognition — opens November ${A.FIRST_YEAR} | Shishya`);
    expect(c.description.startsWith(`From 1 November ${A.FIRST_YEAR}, Shishya will recognise`)).toBe(true);
    expect(c.description).toContain(`top-${A.TOP_N} list open until 31 December`);
    expect(c.intro).toContain("will recognise");
  });

  it("during a window", () => {
    const c = recognitionCopy(recognitionStatus(new Date("2026-11-15T06:00:00Z")));
    expect(c.title).toBe("Annual Recognition 2026 — top contributors | Shishya");
    expect(c.description).toContain("open until 31 December");
    expect(c.ldName).toBe("Annual Recognition 2026");
  });

  it("after the first window has run", () => {
    const c = recognitionCopy(recognitionStatus(new Date("2027-01-10T06:00:00Z")));
    expect(c.title).toBe("Annual Recognition — next list opens November 2027 | Shishya");
    expect(c.description).toContain("The next list opens on 1 November 2027");
    expect(all(c)).not.toContain("will recognise");
  });

  it("never names tiers nobody holds or claims a celebration that has not happened", () => {
    for (const d of ["2026-09-26", "2026-11-15", "2027-01-10", "2027-06-01"]) {
      const text = all(recognitionCopy(recognitionStatus(new Date(`${d}T06:00:00Z`)))).toLowerCase();
      for (const b of [...BANNED_CLAIMS, "celebrates", "trusted verifier", "domain expert"]) expect(text, `${d}: ${b}`).not.toContain(b);
    }
  });
});

describe("/results intro — computed count, never 'all' or 'every'", () => {
  it("states the listed count, the window and the exam count", () => {
    const rows = ["a", "b", "b", "c", "d", "e", "f", "g"].map((code) => ({ code }));
    expect(resultsIntro(rows)).toBe(
      `8 results declared in the last ${RESULTS_WINDOW_DAYS} days, across 7 government and entrance exams — each with the official link, an honest cutoff read and exactly what to do next. Updated every morning.`,
    );
    expect(resultsIntro([{ code: "a" }]).startsWith(`1 result declared in the last ${RESULTS_WINDOW_DAYS} days, across 1 government and entrance exam —`)).toBe(true);
  });

  it("says 'the latest N' when the row cap is hit, and stays number-free when empty", () => {
    const capped = Array.from({ length: RESULTS_LIMIT }, (_, i) => ({ code: `x${i % 30}` }));
    expect(resultsIntro(capped).startsWith(`The latest ${RESULTS_LIMIT} results`)).toBe(true);
    const empty = resultsIntro([]);
    expect(empty).not.toMatch(/\d/);
    expect(empty).toContain("we track");
  });
});

describe("trust page sources — no retired claim ships", () => {
  const PAGES = ["src/app/verification/page.tsx", "src/app/recognition/page.tsx", "src/app/results/page.tsx"];

  it("the three pages are clean of the retired claims", () => {
    for (const rel of PAGES) {
      const text = stripComments(read(rel)).toLowerCase();
      for (const b of [...BANNED_CLAIMS, "ai-verified", 'lastcheckedat="20']) expect(text, `${rel}: ${b}`).not.toContain(b);
    }
  });

  it("/verification and /recognition take their copy from the computed modules", () => {
    const v = read("src/app/verification/page.tsx");
    expect(v).toContain("loadVerificationStats()");
    expect(v).toContain("describeVerificationState(stats)");
    expect(v).toMatch(/export const revalidate = \d+;/);
    const r = read("src/app/recognition/page.tsx");
    expect(r).toContain("export async function generateMetadata()");
    expect(r).toContain("recognitionCopy(recognitionStatus())");
    expect(r).toContain("name: copy.ldName");
    expect(r).toContain("description: copy.description");
  });

  it("/results lists the same window its intro states", () => {
    const src = read("src/app/results/page.tsx");
    expect(src).toContain("${RESULTS_WINDOW_DAYS}::int * INTERVAL '1 day'");
    expect(src).toContain("LIMIT ${RESULTS_LIMIT}");
    expect(src).not.toContain("INTERVAL '60 days'");
    expect(src).toContain("resultsIntro(plain)");
  });
});
