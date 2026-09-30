// The tutor entry on the life-stage pages (30 Sep 2026, P1 build 1, spec §5).
// Pure. Run: npx vitest run tests/unit/stage-tutor.test.ts
//
// What this pins:
//   1. the href is the general tutor's seeded link, /chat?general=1&seed=…,
//      the same shape src/lib/landing-actions.ts builds (P1 adds no chat code);
//   2. every seed is encoded, at most 280 characters, in the student's voice,
//      with no numbers other than class numbers (no facts);
//   3. no entry for a stage that may include children ("school"), for any
//      node reached from a Class 1-7 page, or for exams / careers / unknown
//      nodes (they have their own tutors or none);
//   4. the button and the line under it say what the spec says.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COURSE_FAMILIES, PATH_STAGES, STREAM_OPTION_SLUGS } from "@/data/paths";
import { strayDigits } from "@/data/paths";
import {
  TUTOR_MIN_CLASS,
  TUTOR_SEED_MAX,
  generalTutorHref,
  stageTutorHref,
  stageTutorLabels,
  stageTutorSeed,
} from "@/lib/paths/stage-tutor";

const ROOT = process.cwd();

/** Every node that should carry an entry. */
function tutorNodes(): string[] {
  return [
    ...PATH_STAGES.filter((s) => !s.mayIncludeChildren).map((s) => `stage:${s.id}`),
    ...STREAM_OPTION_SLUGS.map((s) => `stream:${s}`),
    ...COURSE_FAMILIES.map((f) => `course:${f.id}`),
  ];
}

describe("stage tutor — href shape", () => {
  it("is /chat?general=1&seed=<encoded seed>", () => {
    for (const id of tutorNodes()) {
      const href = stageTutorHref(id);
      expect(href, id).toMatch(/^\/chat\?general=1&seed=[^&\s]+$/);
      const seed = decodeURIComponent(href!.slice("/chat?general=1&seed=".length));
      expect(seed).toBe(stageTutorSeed(id));
      expect(href).toBe(generalTutorHref(seed));
    }
  });

  it("matches the general-chat shape landing-actions.ts builds (no new chat code in P1)", () => {
    const src = fs.readFileSync(path.join(ROOT, "src/lib/landing-actions.ts"), "utf8");
    expect(src).toContain("`/chat?general=1&seed=${encodeURIComponent(seed)}`");
    expect(generalTutorHref("a b&c")).toBe("/chat?general=1&seed=a%20b%26c");
  });
});

describe("stage tutor — seeds", () => {
  it("every seed fits in 280 characters", () => {
    expect(TUTOR_SEED_MAX).toBe(280);
    for (const id of tutorNodes()) {
      const seed = stageTutorSeed(id);
      expect(seed, id).toBeTruthy();
      expect(seed!.length, id).toBeLessThanOrEqual(TUTOR_SEED_MAX);
    }
  });

  it("seeds are questions in the student's voice, with no digits other than class numbers", () => {
    for (const id of tutorNodes()) {
      const seed = stageTutorSeed(id)!;
      expect(seed, id).toMatch(/\bI\b|\bme\b|\bmy\b/);
      expect(strayDigits(seed), `${id}: ${seed}`).toBe("");
      expect(seed, id).not.toMatch(/%|₹|salary|\bbest\b/i);
    }
  });

  it("a stream seed names the option in both vocabularies", () => {
    expect(stageTutorSeed("stream:mpc-pcm")).toContain("MPC / PCM");
    expect(stageTutorSeed("stream:bipc-pcb")).toContain("BiPC / PCB");
  });
});

describe("stage tutor — children and other nodes", () => {
  it("no entry for a stage that may include children ('school')", () => {
    const school = PATH_STAGES.find((s) => s.id === "school")!;
    expect(school.mayIncludeChildren).toBe(true);
    expect(stageTutorHref("stage:school")).toBeNull();
    expect(stageTutorSeed("stage:school")).toBeNull();
  });

  it("no entry for any node reached from a Class 1-7 page; Class 8 and above keep it", () => {
    expect(TUTOR_MIN_CLASS).toBe(8);
    for (let cls = 1; cls <= 7; cls++) {
      for (const id of ["stage:after-10th", "stream:mpc-pcm", "course:engineering"]) {
        expect(stageTutorHref(id, { fromClass: cls }), `${id} from Class ${cls}`).toBeNull();
      }
    }
    for (const cls of [8, 9, 10, 11, 12]) expect(stageTutorHref("stream:mpc-pcm", { fromClass: cls })).not.toBeNull();
    expect(stageTutorHref("stream:mpc-pcm", { fromClass: null })).not.toBeNull();
  });

  it("no entry for exams, careers, college streams or unknown nodes", () => {
    for (const id of ["exam:JEE_MAIN", "career:software-engineer", "college-stream:engineering", "career-cat:law", "stream:nope", "course:nope", "stage:nope", "nonsense"]) {
      expect(stageTutorHref(id), id).toBeNull();
    }
  });
});

describe("stage tutor — labels", () => {
  it("button and line as the spec words them", () => {
    expect(stageTutorLabels()).toEqual({
      button: "Ask about your options",
      line: "AI tutor. It explains; confirm dates and rules on the official site.",
    });
  });
});

describe("stage tutor — course seeds follow the family's level", () => {
  it("a family after Class 10 is asked about from Class 10, one after Class 12 from Class 12", () => {
    for (const f of COURSE_FAMILIES) {
      const seed = stageTutorSeed(`course:${f.id}`)!;
      if (f.after === "10th") expect(seed.startsWith("I finished Class 10"), f.id).toBe(true);
      if (f.after === "12th") expect(seed.startsWith("I finished Class 12"), f.id).toBe(true);
    }
  });
});
