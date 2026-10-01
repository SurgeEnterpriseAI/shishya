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

// 1 Oct 2026: preferredRegion alone did not move them (x-vercel-id read
// bom1::sin1 — Mumbai edge, Singapore function): the project-level "regions"
// wins. vercel.json's per-function "regions" overrides it for these routes.
describe("vercel.json pins the watch functions to Mumbai", () => {
  it("functions[src/app/api/cron/answer-key-watch/**/route.ts].regions = [bom1]", () => {
    const v = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
    expect(v.regions).toEqual(["sin1"]);
    expect(v.functions["src/app/api/cron/answer-key-watch/**/route.ts"].regions).toEqual(["bom1"]);
  });
});
