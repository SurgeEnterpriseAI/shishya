import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { readOrAssignBucket, softWallCopy, softWallFamily, SOFT_WALL_KEY, SOFT_WALL_JSON_LD } from "@/lib/soft-wall";
import { loginIntent } from "@/lib/login-intent";

// 27 Sep 2026 — sign-up wall experiment on the pages search visitors left after one page.

describe("softWallFamily — only the leaking families", () => {
  it.each([
    ["/exams/UK_TET/updates", "exam-updates"],
    ["/hi/exams/UK_TET/updates", "exam-updates"],
    ["/exams/IOQM/cutoff", "exam-cutoff"],
    ["/current-affairs/capsule/2026-09", "ca-capsule"],
    ["/current-affairs/2026-09-21", "ca-daily"],
    ["/scholarships/adani-foundation", "scholarship"],
    ["/careers/intelligence-officer", "career"],
  ])("%s → %s", (p, fam) => {
    expect(softWallFamily(p)).toBe(fam);
  });
  it.each(["/", "/exams/SSC_CGL", "/exams/SSC_CGL/syllabus", "/scholarships", "/scholarships/match", "/scholarships/closing-soon", "/careers", "/current-affairs", "/schooling/cbse/class-9", "/chat"])(
    "%s is not walled",
    (p) => {
      expect(softWallFamily(p)).toBeNull();
    },
  );
});

describe("readOrAssignBucket", () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
  };
  it("draws 50/50 once and keeps the arm", () => {
    const s = mem();
    expect(readOrAssignBucket(s, () => 0.2)).toBe("wall");
    expect(s.m.get(SOFT_WALL_KEY)).toBe("wall");
    expect(readOrAssignBucket(s, () => 0.9)).toBe("wall");
    const t = mem();
    expect(readOrAssignBucket(t, () => 0.7)).toBe("open");
  });
  it("no storage, or storage that throws or does not keep the value → open", () => {
    expect(readOrAssignBucket(null)).toBe("open");
    expect(readOrAssignBucket({ getItem: () => { throw new Error("x"); }, setItem: () => {} })).toBe("open");
    expect(readOrAssignBucket({ getItem: () => null, setItem: () => {} }, () => 0.1)).toBe("open");
  });
});

describe("copy, markup and the sign-in page", () => {
  it("en/hi/te say it is free and name the sign-in", () => {
    for (const l of ["en", "hi", "te"]) expect(softWallCopy(l).title.length).toBeGreaterThan(5);
    expect(softWallCopy("en").title).toMatch(/free/);
  });
  it("marks the walled part for search engines", () => {
    expect(SOFT_WALL_JSON_LD.hasPart.cssSelector).toBe(".shishya-wall");
    expect(SOFT_WALL_JSON_LD.isAccessibleForFree).toBe(false);
  });
  it("pitch and wall sign-ins get the plain sign-in page, not 'your mock is one tap away'", () => {
    expect(loginIntent("/exams/SSC_CGL", "pitch").kind).toBeNull();
    expect(loginIntent("/exams/SSC_CGL", "wall").kind).toBeNull();
    expect(loginIntent("/exams/SSC_CGL", null).kind).toBe("mock");
  });
});

// 29 Sep 2026 (founder: "stop blur"): the experiment is off — no wall, no registration-wall markup.
describe("stopped", () => {
  const ROOT = path.resolve(__dirname, "../..");
  it("SOFT_WALL_ON is false and <SoftWall> renders its children only", async () => {
    const { SOFT_WALL_ON } = await import("@/lib/soft-wall");
    expect(SOFT_WALL_ON).toBe(false);
    const src = fs.readFileSync(path.join(ROOT, "src/components/SoftWall.tsx"), "utf8");
    expect(src).toContain("if (!SOFT_WALL_ON) return <>{children}</>;");
    expect(src.indexOf("if (!SOFT_WALL_ON)")).toBeLessThan(src.indexOf("application/ld+json"));
  });
});

describe("placement and gates (source)", () => {
  const ROOT = path.resolve(__dirname, "../..");
  const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");
  it.each([
    "src/app/exams/[code]/updates/page.tsx",
    "src/app/exams/[code]/cutoff/page.tsx",
    "src/app/current-affairs/capsule/[month]/page.tsx",
    "src/app/current-affairs/[date]/page.tsx",
    "src/app/scholarships/[id]/page.tsx",
    "src/app/careers/[slug]/page.tsx",
  ])("%s wraps the part below the answer", (f) => {
    const src = read(f);
    expect(src).toContain("<SoftWall>");
    expect(src).toContain("</SoftWall>");
    expect(src.indexOf("<LandingActions")).toBeLessThan(src.indexOf("<SoftWall>"));
  });
  it("the wall shows only to a signed-out human in the wall arm on a walled page", () => {
    const src = read("src/components/SoftWallClient.tsx");
    expect(src).toContain('if (!family || !pitchAllowedPath(path) || classifyClient(navigator.userAgent) === "bot") return;');
    expect(src).toContain("if (!alive || signedIn !== false) return;");
    expect(src).toContain('if (bucket !== "wall") return;');
    expect(src).toContain('beacon("softwall-exposed", { bucket, surface: family });');
  });
});
