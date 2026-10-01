// 1 Oct 2026: the answer-key watch crons run from Mumbai (bom1). From the
// project's Singapore region (sin1) the first scheduled check could not reach
// IBPS, RRB, TNPSC, KEA, MP ESB, MPPSC or GSSSB.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const ROUTES = [
  "src/app/api/cron/answer-key-watch/route.ts",
  "src/app/api/cron/answer-key-watch/plan/route.ts",
  "src/app/api/cron/answer-key-watch/evening/route.ts",
];

describe("answer-key watch crons run in India", () => {
  it.each(ROUTES)("%s sets preferredRegion bom1 on the Node.js runtime", (rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    expect(src).toContain(`export const preferredRegion = "bom1";`);
    expect(src).toContain(`export const runtime = "nodejs";`);
  });
});
