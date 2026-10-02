// scripts/repair-late-answer-row.ts (2 Oct 2026, resilience plan D8(a)) — the
// one-row repair for the question first asked 26 Sep 2026 12:03 IST, re-sent
// 1 Oct 11:19 IST, promised a late answer and never picked. The script is
// never run by a test (it reads and, with --apply, writes the production
// database); this file reads its source and pins what makes it safe:
//   • dry by default; the one write sits after the dry-run return;
//   • one conditional UPDATE of one row by id, adding sentAt and nothing else;
//   • it selects by the two times and the failed / promised marks, and
//     refuses unless exactly one row matches;
//   • no model, no mail, no cron; no name, email address or question text is
//     read into the script or printed;
//   • the times it looks for are the ones in the plan, and the row's window
//     (72 hours from the re-send, 7-day hard stop) is what the run applies.
// Run: npx vitest run tests/unit/repair-late-answer-row.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LATE_HARD_STOP_MS, LATE_WINDOW_MS, lateCandidateVerdict, type LateCandidateRow } from "@/lib/tutor-late-answer";

const src = fs.readFileSync(path.join(process.cwd(), "scripts/repair-late-answer-row.ts"), "utf8").replace(/\r\n/g, "\n");
const flat = (s: string) => s.replace(/\s+/g, " ");
/** The script without its comments. */
const code = src
  .split("\n")
  .filter((l) => !/^\s*\/\//.test(l))
  .join("\n");

describe("scripts/repair-late-answer-row.ts", () => {
  it("is dry by default: --apply is the only switch, and the write comes after the dry-run return", () => {
    expect(code).toContain('const APPLY = process.argv.includes("--apply");');
    const dryReturn = code.indexOf("if (!APPLY) {");
    const write = code.indexOf("prisma.$executeRaw`");
    expect(dryReturn).toBeGreaterThan(0);
    expect(write).toBeGreaterThan(dryReturn);
    expect(code.slice(dryReturn, write)).toContain("return;");
    // One write in the whole script, and no other way to change a row.
    expect(code.match(/\$executeRaw/g)).toHaveLength(1);
    expect(code).not.toMatch(/\.(update|updateMany|create|createMany|upsert|delete|deleteMany)\(/);
    expect(code).not.toMatch(/\bINSERT\b|\bDELETE\b|\bDROP\b|\bALTER\b/);
    expect(code.match(/\bUPDATE\b/g)).toHaveLength(1);
  });

  it("the write: one row by id, sentAt and nothing else, only while the row is still as it was read", () => {
    const write = flat(code.slice(code.indexOf("prisma.$executeRaw`")));
    expect(write).toContain(`UPDATE "ChatMessage" SET metadata = metadata || jsonb_build_object('sentAt', \${String(resentMs)}::bigint) WHERE id = \${f.id} AND role = 'USER'`);
    for (const guard of [
      "metadata->>'sentAt' IS NULL",
      "metadata->>'lateAnsweredAt' IS NULL",
      "metadata->>'lateClaimAt' IS NULL",
      "metadata->>'lateTries' IS NULL",
      "metadata->>'latePromised' = 'true'",
      "metadata->>'failedAt' = ${String(resentMs)}",
    ]) {
      expect(write).toContain(guard);
    }
    // It never touches failedAt, the claim or the tries.
    expect(write).not.toMatch(/jsonb_build_object\([^)]*(failedAt|lateClaimAt|lateTries|lateAnsweredAt)/);
  });

  it("selects by the two times and the failed / promised marks, and refuses unless exactly one row matches", () => {
    expect(code).toContain('const ASKED_MS = Date.parse("2026-09-26T06:33:00Z");');
    expect(code).toContain('const RESENT_MS = Date.parse("2026-10-01T05:49:00Z");');
    // 26 Sep 12:03 IST and 1 Oct 11:19 IST.
    const istOf = (iso: string) => new Date(Date.parse(iso) + 330 * 60_000).toISOString().slice(0, 16);
    expect(istOf("2026-09-26T06:33:00Z")).toBe("2026-09-26T12:03");
    expect(istOf("2026-10-01T05:49:00Z")).toBe("2026-10-01T11:19");
    const find = flat(code.slice(code.indexOf("async function find()"), code.indexOf("function asCandidate(")));
    expect(find).toContain(`WHERE m.role = 'USER' AND m."createdAt" >= \${new Date(ASKED_MS - SLACK_MS)} AND m."createdAt" <= \${new Date(ASKED_MS + SLACK_MS)}`);
    expect(find).toContain("m.metadata->>'latePromised' = 'true'");
    expect(find).toContain("m.metadata->>'lateAnsweredAt' IS NULL");
    expect(find).toContain("(m.metadata->>'failedAt')::numeric >= ${String(RESENT_MS - SLACK_MS)}::numeric");
    expect(find).toContain("(m.metadata->>'failedAt')::numeric <= ${String(RESENT_MS + SLACK_MS)}::numeric");
    expect(find).not.toMatch(/\bUPDATE\b/);
    expect(code).toContain("if (found.length !== 1) {");
    const refuse = code.slice(code.indexOf("if (found.length !== 1) {"), code.indexOf("const f = found[0];"));
    expect(refuse).toContain("return;");
  });

  it("calls no model, sends no mail, starts no run; reads no name, email address or question text", () => {
    const imports = code.split("\n").filter((l) => /^import /.test(l) || /^\s*from /.test(l) || /\bfrom "/.test(l));
    expect(imports.join("\n")).not.toMatch(/anthropic|\/ai\/|\/ai"|email|resend|cron|db\/tutor-late-answer/i);
    expect(code).not.toMatch(/anthropic|messages\.create|tutorStream|runLateAnswers|sendEmail|fetch\(/);
    const find = flat(code.slice(code.indexOf("async function find()"), code.indexOf("function asCandidate(")));
    const selected = find.slice(find.indexOf("SELECT"), find.indexOf('FROM "ChatMessage" m'));
    // The question is read as a length only; the account as "is there one".
    expect(selected).toContain("length(m.content)::int AS chars");
    expect(selected).toContain('(u.id IS NOT NULL) AS "hasAccount"');
    expect(selected).not.toMatch(/u\.email|u\.name|u\."?email|m\.content,|u\.id AS/);
    expect(code).not.toMatch(/\.email\b|\.name\b/);
    // What is printed per row comes from the marks and the columns above; the candidate it judges carries no text.
    expect(code).toContain('content: "",');
  });

  it("the row it is written for: outside the window as it stands, a candidate with sentAt, until 3 Oct 12:03 IST", () => {
    const asked = new Date("2026-09-26T06:33:00Z");
    const resent = Date.parse("2026-10-01T05:49:00Z");
    const base: LateCandidateRow = {
      id: "q",
      sessionId: "s",
      userId: "member",
      content: "",
      createdAt: asked,
      metadata: { turnId: "t", failedAt: resent, failedReason: "credit", latePromised: true },
      laterAssistant: false,
      reAsked: false,
      examCode: null,
      examCategory: null,
    };
    const repaired = { ...base, metadata: { ...(base.metadata as object), sentAt: resent } };
    const oct2 = Date.parse("2026-10-02T12:00:00Z"); // 2 Oct 17:30 IST
    expect(lateCandidateVerdict(base, oct2)).toBe("outside-window");
    expect(lateCandidateVerdict(repaired, oct2)).toBeNull();
    const hardStop = asked.getTime() + LATE_HARD_STOP_MS;
    expect(new Date(hardStop + 330 * 60_000).toISOString().slice(0, 16)).toBe("2026-10-03T12:03");
    expect(Math.min(resent + LATE_WINDOW_MS, hardStop)).toBe(hardStop);
    expect(lateCandidateVerdict(repaired, hardStop)).toBeNull();
    expect(lateCandidateVerdict(repaired, hardStop + 1)).toBe("outside-window");
    // The script says so instead of writing once the hard stop has passed.
    expect(code).toContain('after === "outside-window"');
    expect(flat(code)).toContain("Nothing written.");
  });
});
