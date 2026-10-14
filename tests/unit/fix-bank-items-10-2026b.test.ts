// The 31 bank fixes of 14 Oct 2026 (scripts/fix-bank-items-10-2026b.ts): the
// targets and their facts, the selection and its guards, the dry run, the
// apply (translations cleared in the same transaction through
// clearQuestionTranslations, all of them logged) and the undo, on a fake DB —
// no network, no production database.
//   • targets: 31 rows, one per group, each with a reason, a reference and a
//     correction line; every after-state passes its own re-check (first line
//     names the key and its text, no stale phrase, the family's rule);
//   • facts pinned: BRICS (Argentina not a member, the other options are),
//     Lok Sabha 550 (no 552 option left unless re-keyed away from it),
//     Anglo-Indian nomination in the past tense, the 2023 CEC committee,
//     High Court in Nainital, Gairsain the summer capital, Mir Qasim of
//     Bengal, Raichur against Bijapur, Periyar and Vaikom;
//   • selection: exact stem within exam and topic, the 14 Oct options and
//     key; a row missing, already fixed, matched twice, held by another id,
//     changed, withdrawn, or an exact copy outside the script is a problem
//     line, never a guess; a same-stem row with other options is info only;
//   • dry run by default, writes nothing; --apply needs --only; unknown
//     flags and names refused (--keep-translations is gone);
//   • apply: the log is on disk ("pending") before the first write; one
//     transaction; questions only updated; the cache cleared only if it is
//     exactly what the log holds; a row changed since the plan stops the run;
//   • undo puts every field back (metadata null included), removes
//     translations made since the fix and re-creates the logged ones;
//   • the scan report sorts matches into in script / borderline / fine /
//     not served / NOT in this script.
// The fixture rows are the live rows read on 14 Oct 2026 (SELECT); the old
// solutions are stand-ins.
// Run: npx vitest run tests/unit/fix-bank-items-10-2026b.test.ts

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WITHDRAWN_TAG } from "@/lib/question-withdrawn";
import {
  BORDERLINE,
  BRICS_MEMBERS,
  FAMILIES,
  FIX_DAY,
  GROUPS,
  KEPT_AS_IS,
  LOG_STEM,
  READ_14_OCT,
  REVIEWED_OK,
  SCAN_SQL,
  TAG,
  TARGETS,
  afterQuestion,
  applyPlanned,
  canonical,
  checkTarget,
  fieldsOf,
  indexNowUrls,
  lsSolution,
  parseCli,
  plan,
  run,
  scanFate,
  scanHits,
  selectTargets,
  type Db,
  type LogFile,
  type Option,
  type Row,
  type ScanRow,
  type Target,
  type TrRow,
} from "../../scripts/fix-bank-items-10-2026b";

const NOW = new Date("2026-10-14T06:30:00Z"); // 12:00 IST, the day of the read
const target = (g: string) => TARGETS.find((t) => t.group === g)!;
const strip = (s: string) => s.split(`Correction (${FIX_DAY}):`)[0]; // the solution without its correction line

function q(group: string, extra: Partial<Row> = {}): Row {
  const t = target(group);
  return {
    id: t.id,
    body: t.body,
    options: t.options.map((o) => ({ ...o })),
    answerKey: t.answerKey,
    solution: `old solution of ${group}`,
    validated: true,
    tags: group.startsWith("ls-") ? ["gk.polity", "gen:2026-05-10"] : [],
    metadata: group === "raichur" ? null : { factoryVerify: { at: "2026-09-26T07:01:16.854Z", decision: "ACCEPT", correctKey: t.answerKey } },
    exam: { code: t.exam },
    topic: { code: t.topic },
    ...extra,
  };
}
/** Rows of the bank that are not targets. */
function others(): Row[] {
  const base = { solution: "s", validated: true, tags: [] as string[], metadata: null, topic: { code: "gk.polity" } };
  const ls = target("ls-sscgd");
  return [
    // Same stem as ls-sscgd with other options and not served (the live cmozuztnw… row).
    { ...base, id: "q-ls-copy-unserved", exam: { code: "UP_POLICE_CONSTABLE" }, validated: false, body: ls.body, options: [{ key: "A", text: "530 members" }, { key: "B", text: "545 members" }, { key: "C", text: "550 members" }, { key: "D", text: "552 members" }], answerKey: "D", solution: "… the maximum constitutional limit remains 552 in the Lok Sabha." },
    // Borderline (listed, never written); the solution is a stand-in that the scan matches.
    { ...base, id: "cmp1l6pre01ebtvg76pjp2rsx", exam: { code: "MN_MPSC" }, body: "The BRICS group of nations includes Brazil, Russia, India, China and South Africa. Which organization did BRICS establish as an alternative to the World Bank and IMF?", options: [{ key: "A", text: "Asian Infrastructure Investment Bank" }, { key: "B", text: "New Development Bank" }, { key: "C", text: "BRICS Reserve Fund" }, { key: "D", text: "Contingency Reserve Arrangement" }], answerKey: "B", solution: "BRICS is an association of five major emerging economies; it set up the New Development Bank in 2014." },
    // Fine (CJI only as a wrong option).
    { ...base, id: "cmp1q6dvo002r8sixl7dckwe7", exam: { code: "TS_TSPSC_GROUP1" }, body: "Who appoints the Chief Election Commissioner of India?", options: [{ key: "A", text: "Prime Minister" }, { key: "B", text: "President" }, { key: "C", text: "Chief Justice of India" }, { key: "D", text: "Parliament" }], answerKey: "B", solution: "The President of India appoints the Chief Election Commissioner and other Election Commissioners as per Article 324." },
    // Unrelated maths row with 552 (no pattern).
    { ...base, id: "q-math-552", exam: { code: "CDS" }, body: "A man buys a book for ₹480 and sells it at a profit of 15%. What is the selling price?", options: [{ key: "A", text: "₹542" }, { key: "B", text: "₹552" }], answerKey: "B", solution: "480 + 72 = 552." },
  ];
}
function seed(): Row[] {
  return [...GROUPS.map((g) => q(g)), ...others()];
}
function tr(questionId: string, locale: string, extra: Partial<TrRow> = {}): TrRow {
  return { id: `tr-${questionId.slice(-6)}-${locale}`, questionId, locale, body: `old ${locale} stem`, options: [{ key: "A", text: "x" }], solution: `old ${locale} solution`, hints: null, generator: "claude-haiku-4-5/translator-v1-backfill", createdAt: "2026-05-17T17:06:58.978Z", ...extra };
}
function seedTr(): TrRow[] {
  return [
    tr(target("brics-kas").id, "hi"),
    tr(target("brics-kas").id, "mr", { generator: "claude-sonnet-4-5/translator-v1", createdAt: "2026-10-04T10:00:00.000Z" }),
    tr(target("plassey-pet").id, "hi"),
    tr(target("ls-mptet").id, "hi"),
    tr(target("anglo-art333").id, "hi"),
    tr(target("anglo-art333").id, "mr"),
    tr(target("raichur").id, "pa"),
  ];
}

/** jsonb keeps its own key order: the fake stores objects with keys reversed. */
function reorder(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(reorder);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().reverse().map((k) => [k, reorder((v as any)[k])]));
  return v;
}
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const likeToRe = (p: string) => new RegExp(p.split("%").map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*"), "is");

function fakeDb(opts: { rows?: Row[]; trs?: TrRow[]; beforeWrite?: () => void; failOnUpdate?: number } = {}) {
  const rows = opts.rows ?? seed();
  const trs = opts.trs ?? seedTr();
  const calls = { update: 0, deleteMany: 0, create: 0, raw: [] as string[] };
  const question = {
    findMany: async (a: any) => {
      const inList: string[] = a?.where?.body?.in ?? [];
      return clone(rows.filter((r) => inList.includes(r.body)));
    },
    findUnique: async (a: any) => {
      const r = rows.find((x) => x.id === a.where.id);
      return r ? clone(r) : null;
    },
    update: async (a: any) => {
      opts.beforeWrite?.();
      calls.update++;
      if (opts.failOnUpdate && calls.update === opts.failOnUpdate) throw new Error("disk full (test)");
      const r = rows.find((x) => x.id === a.where.id);
      if (!r) throw new Error("no row");
      const d = a.data;
      Object.assign(r, {
        body: d.body,
        options: reorder(clone(d.options)),
        answerKey: d.answerKey,
        solution: d.solution,
        validated: d.validated,
        tags: [...d.tags.set],
        metadata: d.metadata === Prisma.DbNull ? null : reorder(clone(d.metadata)),
      });
      return clone(r);
    },
    delete: async () => {
      throw new Error("question.delete called");
    },
    deleteMany: async () => {
      throw new Error("question.deleteMany called");
    },
  };
  const questionTranslation = {
    findMany: async (a: any) => clone(trs.filter((t) => t.questionId === a.where.questionId).sort((x, y) => (x.locale < y.locale ? -1 : 1))).map((t) => ({ ...t, createdAt: new Date(t.createdAt) })),
    deleteMany: async (a: any) => {
      opts.beforeWrite?.();
      calls.deleteMany++;
      if (!a?.where?.questionId) throw new Error("deleteMany without a questionId");
      const before = trs.length;
      for (let i = trs.length - 1; i >= 0; i--) if (trs[i].questionId === a.where.questionId) trs.splice(i, 1);
      return { count: before - trs.length };
    },
    create: async (a: any) => {
      calls.create++;
      if (trs.some((x) => x.questionId === a.data.questionId && x.locale === a.data.locale)) throw new Error("unique (questionId, locale)");
      const d = a.data;
      const t: TrRow = { id: d.id, questionId: d.questionId, locale: d.locale, body: d.body, options: d.options, solution: d.solution, hints: d.hints === Prisma.DbNull ? null : d.hints, generator: d.generator, createdAt: new Date(d.createdAt).toISOString() };
      trs.push(t);
      return t;
    },
  };
  const mocks = [
    { id: "m-kas", title: "KPSC KAS — Full-Length Mock", userId: null, questionIds: ["x1", target("brics-kas").id], _count: { attempts: 2 } },
    { id: "m-user", title: "My quiz", userId: "u1", questionIds: [target("plassey-pet").id], _count: { attempts: 1 } },
  ];
  const mock = { findMany: async (a: any) => clone(mocks.filter((m) => m.questionIds.includes(a.where.questionIds.has))) };
  const $queryRawUnsafe = async (sql: string, patterns: string[]) => {
    calls.raw.push(sql);
    const res = rows.filter((r) => patterns.some((p) => likeToRe(p).test(`${r.body} ${r.solution} ${JSON.stringify(r.options)}`)));
    return clone(res).map((r) => ({ id: r.id, body: r.body, options: r.options, answerKey: r.answerKey, solution: r.solution, validated: r.validated, tags: r.tags, exam: r.exam.code }));
  };
  const db: any = {
    question,
    questionTranslation,
    mock,
    $queryRawUnsafe,
    $transaction: async (fn: (tx: any) => Promise<unknown>) => {
      const snapRows = clone(rows);
      const snapTrs = clone(trs);
      try {
        return await fn(db);
      } catch (e) {
        rows.splice(0, rows.length, ...snapRows);
        trs.splice(0, trs.length, ...snapTrs);
        throw e;
      }
    },
  };
  return { db: db as Db, rows, trs, calls };
}

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fix-bank-items-b-"));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});
const logs = () => fs.readdirSync(tmp).map((f) => ({ f, log: JSON.parse(fs.readFileSync(path.join(tmp, f), "utf8")) as LogFile }));
const quiet = { now: NOW, say: () => {} };
const byId = (rows: Row[], id: string) => rows.find((r) => r.id === id)!;
const opts = (t: Target) => afterQuestion(t).options;
const keyed = (t: Target) => opts(t).find((o) => o.key === afterQuestion(t).answerKey)!.text;

describe("the 31 targets", () => {
  it("one row per group, every family used, a reason, a reference and a correction line each", () => {
    expect(TARGETS).toHaveLength(31);
    expect(new Set(TARGETS.map((t) => t.id)).size).toBe(31);
    expect(new Set(GROUPS).size).toBe(31);
    expect(new Set(TARGETS.map((t) => t.family))).toEqual(new Set(FAMILIES));
    for (const t of TARGETS) {
      expect(READ_14_OCT[t.id], t.group).toMatchObject({ exam: t.exam, topic: t.topic, body: t.body, answerKey: t.answerKey });
      expect(t.why.length, t.group).toBeGreaterThan(40);
      expect(t.ref.length, t.group).toBeGreaterThan(10);
      expect(t.solution, t.group).toContain(`Correction (${FIX_DAY}): `);
      expect(t.solution, t.group).not.toMatch(/\b(wait|let me re-?check|hmm)\b/i);
      expect(t.newBody || t.newOptions || t.newAnswerKey || t.solution, t.group).toBeTruthy();
      expect(checkTarget(t), t.group).toBeNull();
    }
    // Nothing is withdrawn; 5 re-keys, all in the Lok Sabha family.
    expect(TARGETS.filter((t) => t.newAnswerKey && t.newAnswerKey !== t.answerKey).map((t) => t.group)).toEqual(["ls-upsssc-a", "ls-upsssc-b", "ls-mptet", "ls-wbpolice", "ls-aplawcet"]);
    // No key disagreement is both fixed and kept.
    for (const k of KEPT_AS_IS) expect(TARGETS.some((t) => t.id === k.id), k.id).toBe(false);
  });

  it("BRICS: Argentina is the one non-member; no stem says BRICS is five", () => {
    for (const g of ["brics-kas", "brics-tspsc"]) {
      const t = target(g);
      expect(t.body).toBe(READ_14_OCT[target("brics-kas").id].body); // the two exact copies
      expect(keyed(t)).toBe("Argentina");
      expect(BRICS_MEMBERS).not.toContain("Argentina");
      for (const o of opts(t).filter((o) => o.key !== "C")) expect(BRICS_MEMBERS as readonly string[]).toContain(o.text);
      expect(BRICS_MEMBERS).toContain("Indonesia");
    }
    for (const t of TARGETS.filter((x) => x.family === "brics")) expect(afterQuestion(t).body).not.toMatch(/\bis an association of five\b/i);
    expect(target("brics-uppsc").newBody).toMatch(/joined the group in 2010/);
    // Not "began as five … the last of the original five to join" (BRIC began as four).
    expect(target("brics-mpesb-joined").newBody).toBe("Until BRICS expanded in 2024, it had five members. Which of these five was the last to join the group?");
    expect(strip(target("brics-mpesb-ndb").solution)).not.toMatch(/consists of five/i);
  });

  it("Lok Sabha: the keyed option reads 550, and only a re-keyed row still shows 552 (as a wrong option)", () => {
    const ls = TARGETS.filter((t) => t.family === "loksabha" && t.group !== "ls-brtet");
    expect(ls).toHaveLength(11);
    for (const t of ls) {
      expect(keyed(t), t.group).toMatch(/^550\b/);
      const has552 = opts(t).some((o) => /^552\b/.test(o.text));
      expect(has552, t.group).toBe(!!t.newAnswerKey);
      expect(textOf(t.options, t.answerKey), t.group).toMatch(/^552\b/); // keyed 552 as read
      expect(t.solution).toMatch(/530 \+ 20 = 550/);
      expect(t.solution).toMatch(/25 January 2020/);
    }
    expect(target("ls-mptet")).toMatchObject({ answerKey: "B", newAnswerKey: "C" });
    expect(target("ls-sscgd").newOptions!.find((o) => o.key === "D")!.text).toBe("550 members");
    expect(target("ls-brtet").solution).toMatch(/Lok Sabha's maximum is now 550/);
    // The builder explains every other option.
    const s = lsSolution([{ key: "A", text: "500" }, { key: "B", text: "530" }, { key: "C", text: "545" }, { key: "D", text: "550" }], "D", "x");
    expect(s).toMatch(/^Answer: D \(550\)\./);
    expect(s).toMatch(/- A \(500\): not the maximum today\./);
    expect(s).toMatch(/- B \(530\): the cap for members chosen from the States alone\./);
    expect(s).toMatch(/- C \(545\): the House's full strength until 2019/);
  });

  it("Anglo-Indian nomination, CEC, Uttarakhand, Plassey, Raichur, Periyar: the corrected facts", () => {
    expect(target("anglo-tnpolice").newBody).toMatch(/^Until January 2020/);
    // Labelled PYQ 2025 but a PYQ-pattern build (fresh wording): the stem goes to the past in both languages.
    expect(target("anglo-art333").newBody).toMatch(/^जानेवारी 2020 पर्यंत /);
    expect(target("anglo-art333").newBody).toMatch(/करू शकत होते\?\n\nUntil January 2020, under which Article of the Indian Constitution could the Governor nominate a member of the Anglo-Indian community to the State Legislative Assembly\?$/);
    expect(target("anglo-art333").newBody).not.toMatch(/करू शकतो\?|\bcan the Governor\b/);
    expect(strip(target("anglo-art333").solution)).toMatch(/since 25 January 2020 no Governor can make such a nomination/);
    expect(target("anglo-art333").solution).not.toMatch(/kept as stored/);
    expect(strip(target("anglo-telangana").solution)).toMatch(/119 elected members/);
    expect(strip(target("anglo-telangana").solution)).not.toMatch(/118/);
    expect(strip(target("cec-kas").solution)).toMatch(/a Union Cabinet Minister nominated by the Prime Minister/);
    expect(strip(target("cec-kas").solution)).toMatch(/replaced the Chief Justice/);
    expect(strip(target("uk-interim").solution)).toMatch(/Nainital is the seat of the Uttarakhand High Court/);
    expect(strip(target("uk-interim").solution)).not.toMatch(/Dehradun[^.]*high court/i);
    expect(strip(target("uk-capital").solution)).toMatch(/summer capital/);
    expect(strip(target("uk-capital").solution)).not.toMatch(/Gairsain[^.]*winter/i);
    expect(textOf(opts(target("plassey-pet")), "C")).toBe("Shuja-ud-Daulah of Awadh");
    expect(strip(target("plassey-pet").solution)).toMatch(/Mir Qasim of Bengal/);
    expect(strip(target("plassey-uppolice").solution)).toMatch(/Mir Qasim replaced him in 1760/);
    expect(target("raichur").newBody).toMatch(/Ismail Adil Shah of Bijapur/);
    expect(target("raichur").newBody).not.toMatch(/Bahmani/);
    expect(strip(target("selfrespect").solution)).toMatch(/Kanchipuram/);
    expect(strip(target("selfrespect").solution)).toMatch(/not the reason he left the Congress/);
  });

  it("the four rows the review added (14 Oct): BPSC and UPSSSC PET BRICS, CUET CEC, KSRP gold", () => {
    const bpsc = target("brics-bpsc");
    expect(afterQuestion(bpsc).body).toMatch(/initials of its first five members/);
    expect(afterQuestion(bpsc).body).not.toMatch(/\bincludes\b/);
    expect(keyed(bpsc)).toBe("South Africa");
    expect(textOf(opts(bpsc), "D")).toBe("Saudi Arabia"); // still a distractor: not one of the five initials
    const pet = target("brics-upsssc-pet");
    expect(keyed(pet)).toBe("BRICS - admitted Egypt, Ethiopia, Iran and the UAE");
    expect(opts(pet).some((o) => /Saudi/.test(o.text))).toBe(false);
    expect(afterQuestion(pet).body).not.toMatch(/regional organi[sz]ation|which other country/i);
    expect(strip(pet.solution)).toMatch(/has not publicly confirmed that it joined/);
    expect(checkTarget({ ...pet, newOptions: pet.options, solution: pet.solution.replace("Answer: B (BRICS - admitted Egypt, Ethiopia, Iran and the UAE)", `Answer: B (${textOf(pet.options, "B")})`) })).toMatch(/Saudi/);
    const cuet = target("cec-cuet");
    expect(afterQuestion(cuet).body).toBe("Who was the Chief Election Commissioner of India in May 2023?");
    expect(keyed(cuet)).toBe("Rajiv Kumar");
    expect(strip(cuet.solution)).toMatch(/15 May 2022/);
    expect(checkTarget({ ...cuet, newBody: cuet.body })).toMatch(/still matches|appointed/);
    const kgf = target("kgf-ksrp");
    expect(kgf.newBody ?? kgf.newOptions ?? kgf.newAnswerKey).toBeUndefined();
    expect(strip(kgf.solution)).toMatch(/Kolar district/);
    expect(strip(kgf.solution)).toMatch(/28 February 2001/);
    expect(strip(kgf.solution)).not.toMatch(/KGF mining operations have reduced/);
    // None of the four is still listed as borderline.
    for (const g of ["brics-bpsc", "brics-upsssc-pet", "cec-cuet", "kgf-ksrp"]) expect(BORDERLINE[target(g).id], g).toBeUndefined();
  });

  it("the re-check catches a broken plan", () => {
    const base = target("plassey-pet");
    expect(checkTarget({ ...base, solution: base.solution.replace("Answer: B", "Answer: C") })).toMatch(/does not name B/);
    expect(checkTarget({ ...base, newOptions: withOpt(base.options, "C", "Mir Qasim of Awadh") })).toMatch(/still matches|names Mir Qasim/);
    expect(checkTarget({ ...base, solution: base.solution.split("Correction")[0] })).toMatch(/no correction line/);
    expect(checkTarget({ ...base, newOptions: withOpt(base.options, "C", "Siraj-ud-Daulah of Bengal") })).toMatch(/two options read the same/);
    const kas = target("brics-kas");
    expect(checkTarget({ ...kas, newOptions: withOpt(kas.options, "C", "Indonesia"), solution: kas.solution.replace("Answer: C (Argentina)", "Answer: C (Indonesia)") })).toMatch(/is a BRICS member/);
    const ls = target("ls-appsc");
    expect(checkTarget({ ...ls, newOptions: undefined, solution: ls.solution.replace("Answer: D (550)", "Answer: D (552)") })).toMatch(/not 550/);
  });
});

function textOf(o: readonly Option[], key: string) {
  return o.find((x) => x.key === key)!.text;
}
function withOpt(o: readonly Option[], key: string, text: string): Option[] {
  return o.map((x) => (x.key === key ? { key, text } : { ...x }));
}

describe("selection: exact stem, never guessed", () => {
  it("picks all 31 rows as read on 14 Oct; the unserved same-stem row is info only", () => {
    const { picks, problems, info } = selectTargets(seed(), [...GROUPS]);
    expect(problems).toEqual([]);
    expect(picks.map((p) => p.row.id)).toEqual(TARGETS.map((t) => t.id));
    expect(info.join("\n")).toMatch(/ls-sscgd: q-ls-copy-unserved \(UP_POLICE_CONSTABLE, not served\) has the same stem but other options/);
    expect(info.join("\n")).toMatch(/ls-wbpolice: q-ls-copy-unserved \(UP_POLICE_CONSTABLE, not served\) is an exact copy \(stem and options\), already out of every pool/);
  });

  it("a missing, fixed, doubled, re-homed, changed or withdrawn row, or an exact copy outside the script, is a problem line", () => {
    const rows = seed();
    byId(rows, target("ls-mptet").id).answerKey = "C"; // already re-keyed
    byId(rows, target("raichur").id).body = target("raichur").newBody!; // already fixed
    rows.push({ ...q("cec-kas"), id: "cec-copy" }); // matched twice in its exam and topic
    byId(rows, target("uk-capital").id).id = "someone-else"; // another id holds the stem
    byId(rows, target("selfrespect").id).tags = [WITHDRAWN_TAG]; // withdrawn since
    byId(rows, target("anglo-telangana").id).options = [{ key: "A", text: "99" }]; // changed
    rows.splice(rows.findIndex((r) => r.id === target("uk-interim").id), 1); // missing
    rows.push({ ...q("plassey-uppolice"), id: "plassey-twin", exam: { code: "WB_POLICE_PC" } }); // exact copy elsewhere
    const { picks, problems } = selectTargets(rows, [...GROUPS]);
    expect(picks).toHaveLength(31 - 7);
    const text = problems.join("\n");
    expect(text).toMatch(/ls-mptet: the new solution \/ options \/ key are already in place/);
    expect(text).toMatch(/raichur: the new stem is already in place/);
    expect(text).toMatch(/cec-kas: 2 rows match the stem/);
    expect(text).toMatch(/uk-capital: the stem is held by someone-else/);
    expect(text).toMatch(/selfrespect: no longer served/);
    expect(text).toMatch(/anglo-telangana: options or key changed since the 14 Oct read/);
    expect(text).toMatch(/uk-interim: no UK_UKSSSC uk.formation row with the stem/);
    expect(text).toMatch(/plassey-uppolice: plassey-twin \(WB_POLICE_PC, served\) is an exact copy/);
    expect(problems.filter((p) => !p.includes("exact copy")).every((p) => p.endsWith("skipped"))).toBe(true);
  });

  it("the same stem in another exam or topic is not the target", () => {
    const rows = [{ ...q("raichur"), exam: { code: "SSC_CGL" } }];
    expect(selectTargets(rows, ["raichur"]).picks).toEqual([]);
  });
});

describe("the command line: dry run by default", () => {
  it("no flag is a dry run of all 31; --only takes all, families and groups; --apply needs --only", () => {
    expect(parseCli([])).toMatchObject({ apply: false, groups: [...GROUPS], only: "all" });
    expect(parseCli(["--apply", "--only", "brics,plassey-pet"]).groups).toEqual(["brics-kas", "brics-tspsc", "brics-uppsc", "brics-mpesb-joined", "brics-mpesb-ndb", "brics-bpsc", "brics-upsssc-pet", "plassey-pet"]);
    expect(parseCli(["--only", "kgf,cec"]).groups).toEqual(["cec-kas", "cec-cuet", "kgf-ksrp"]);
    expect(parseCli(["--only", "loksabha"]).groups).toHaveLength(12);
    expect(() => parseCli(["--apply"])).toThrow(/--apply needs --only/);
    expect(() => parseCli(["--only", "everything"])).toThrow(/unknown family or group/);
    expect(() => parseCli(["--keep-translations"])).toThrow(/unknown argument/);
    expect(() => parseCli(["--force"])).toThrow(/unknown argument/);
    expect(() => parseCli(["--only"])).toThrow(/needs a value/);
    expect(() => parseCli(["--undo", "x.json", "--only", "all"])).toThrow(/--undo takes the log file only/);
  });

  it("a dry run writes nothing and no log, and prints the plan, the kept keys, the scan and IndexNow", async () => {
    const { db, calls } = fakeDb();
    const lines: string[] = [];
    const r = await run([], db, { now: NOW, say: (s) => lines.push(s), logDir: tmp });
    expect(r.applied).toBe(false);
    expect(r.planned).toHaveLength(31);
    expect(r.problems).toEqual([]);
    expect([calls.update, calls.deleteMany, calls.create]).toEqual([0, 0, 0]);
    expect(fs.readdirSync(tmp)).toEqual([]);
    const out = lines.join("\n");
    expect(out).toMatch(/DRY RUN \(nothing is written\)/);
    expect(out).toMatch(/Planned 31; problems 0\./);
    expect(out).toMatch(/\[brics-kas\] FIX KA_KPSC_KAS/);
    expect(out).toMatch(/translations removed .*hi .*mr/);
    expect(out).toMatch(/"KPSC KAS — Full-Length Mock" slot 2, 2 attempt\(s\)/);
    expect(out).toMatch(/KEY DISAGREEMENTS KEPT AS KEYED/);
    expect(out).toMatch(/Rudraprayag/);
    expect(out).toMatch(/borderline \(left\)\s+MN_MPSC\s+cmp1l6pre01ebtvg76pjp2rsx/);
    expect(out).toMatch(/in script\s+BR_BPSC_CCE\s+cmp1jz3nq00bbtvg75iup0hga \[brics-includes-one-more\] — group brics-bpsc/);
    expect(out).toMatch(/checked, fine\s+TS_TSPSC_GROUP1/);
    expect(out).toMatch(/not served \(left\)\s+UP_POLICE_CONSTABLE\s+q-ls-copy-unserved/);
    expect(out).not.toMatch(/^\s+NOT in this script/m);
    expect(out).toMatch(/https:\/\/shishya\.in\/hi\/exams\/UP_UPSSSC_PET\/topics\/history\.british_rule/);
    expect(out).toMatch(/Totals: 31 rows \(5 re-keyed, 11 stems, 10 option sets, every solution rewritten\); 7 cached translation\(s\) removed; 0 problem\(s\)\./);
    expect(calls.raw).toEqual([SCAN_SQL]);
  });
});

describe("apply: one transaction, undo log first, questions only updated", () => {
  it("--only plassey-pet fixes option C and the solution, clears its cached translation; the log is pending before the write", async () => {
    let statusAtFirstWrite: string | null = null;
    const { db, rows, trs, calls } = fakeDb({
      beforeWrite: () => {
        if (statusAtFirstWrite === null) statusAtFirstWrite = logs()[0]?.log.status ?? "no log";
      },
    });
    const r = await run(["--apply", "--only", "plassey-pet"], db, { ...quiet, logDir: tmp });
    expect(r.applied).toBe(true);
    expect(statusAtFirstWrite).toBe("pending");
    const p = byId(rows, target("plassey-pet").id);
    expect(p).toMatchObject({ answerKey: "B", validated: true, body: target("plassey-pet").body, solution: target("plassey-pet").solution });
    expect(canonical(p.options)).toBe(canonical(target("plassey-pet").newOptions));
    expect(p.metadata).toMatchObject({ factoryVerify: { decision: "ACCEPT" }, bankFix: { by: TAG, group: "plassey-pet", prevAnswerKey: "B", prevSolution: "old solution of plassey-pet", prevOptions: target("plassey-pet").options } });
    expect((p.metadata as any).rekeyedBy).toBeUndefined();
    expect(trs.filter((t) => t.questionId === p.id)).toEqual([]);
    expect(trs).toHaveLength(seedTr().length - 1);
    expect(calls.deleteMany).toBe(1);
    for (const g of GROUPS.filter((x) => x !== "plassey-pet")) expect(byId(rows, target(g).id)).toEqual(q(g));
    const [{ f, log }] = logs();
    expect(f).toMatch(new RegExp(`^${LOG_STEM}\\.plassey-pet\\.2026-10-14T06-30-00-000Z\\.json$`));
    expect(log).toMatchObject({ kind: "apply", status: "applied", only: "plassey-pet" });
    expect(log.entries[0].translations.map((t) => t.locale)).toEqual(["hi"]);
  });

  it("--only all: re-keys carry rekeyedBy/From, null metadata survives as an object, every cache row goes; a second run finds nothing to do", async () => {
    const { db, rows, trs, calls } = fakeDb();
    await run(["--apply", "--only", "all"], db, { ...quiet, logDir: tmp });
    expect(calls.update).toBe(31);
    expect(trs).toEqual([]);
    const m = byId(rows, target("ls-mptet").id);
    expect(m.answerKey).toBe("C");
    expect(m.metadata).toMatchObject({ rekeyedBy: TAG, rekeyedFrom: "B", bankFix: { prevAnswerKey: "B" } });
    expect(byId(rows, target("raichur").id).metadata).toMatchObject({ bankFix: { prevBody: target("raichur").body } });
    expect(byId(rows, target("brics-tspsc").id)).toMatchObject({ body: target("brics-tspsc").newBody, answerKey: "C" });
    for (const t of TARGETS) expect(byId(rows, t.id).validated, t.group).toBe(true);
    const again = await run([], db, { ...quiet, logDir: tmp });
    expect(again.planned).toEqual([]);
    expect(again.problems).toHaveLength(31);
    expect(again.problems.every((p) => /already/.test(p))).toBe(true);
  });

  it("a failed write rolls the transaction back and leaves the log 'failed'", async () => {
    const { db, rows, trs } = fakeDb({ failOnUpdate: 5 });
    await expect(run(["--apply", "--only", "all"], db, { ...quiet, logDir: tmp })).rejects.toThrow(/disk full/);
    expect(rows).toEqual(seed());
    expect(trs).toEqual(seedTr());
    expect(logs()[0].log.status).toBe("failed");
  });

  it("a question changed, a translation changed or a new translation since the plan stops the whole run", async () => {
    for (const change of ["question", "translation", "new translation"] as const) {
      const { db, rows, trs } = fakeDb();
      const { picks } = selectTargets(rows, [...GROUPS]);
      const trMap = new Map<string, TrRow[]>();
      for (const t of clone(trs)) trMap.set(t.questionId, [...(trMap.get(t.questionId) ?? []), t]);
      const planned = plan(picks, trMap, NOW);
      if (change === "question") byId(rows, target("cec-kas").id).solution = "edited by hand after the plan";
      else if (change === "translation") trs.find((t) => t.locale === "mr")!.solution = "re-translated after the plan";
      else trs.push(tr(target("raichur").id, "hi", { createdAt: "2026-10-14T06:31:00.000Z" }));
      const snapshot = JSON.stringify({ rows, trs });
      const file = path.join(tmp, `${change}.json`);
      await expect(applyPlanned(db, planned, file, "all", () => {})).rejects.toThrow(/changed since the plan/);
      expect(JSON.stringify({ rows, trs })).toBe(snapshot);
      expect((JSON.parse(fs.readFileSync(file, "utf8")) as LogFile).status).toBe("failed");
    }
  });

  it("the source: questions are only updated, the cache only cleared through the helper in the same transaction, the scan only SELECTs", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "scripts/fix-bank-items-10-2026b.ts"), "utf8");
    const writes = [...src.matchAll(/(\w+)\.(\w+)\.(delete|deleteMany|create|createMany|update|updateMany|upsert)\s*\(/g)].map((m) => `${m[2]}.${m[3]}`);
    expect(writes.sort()).toEqual(["question.update", "question.update", "questionTranslation.create"]);
    expect(src).not.toMatch(/DELETE\s+FROM/i);
    expect(src).not.toMatch(/\$executeRaw/);
    // Every $transaction callback that updates a question calls clearQuestionTranslations on the same client.
    const tx = [...src.matchAll(/\$transaction\(\s*async \((\w+)\) => \{([\s\S]*?)\n {6}\},\n {6}\{ timeout/g)];
    expect(tx).toHaveLength(2);
    for (const [, param, body] of tx) {
      expect(body).toMatch(new RegExp(`${param}\\.question\\.update\\(`));
      expect(body).toMatch(new RegExp(`clearQuestionTranslations\\(${param}, `));
    }
    expect(SCAN_SQL.trim()).toMatch(/^SELECT\b/);
    expect(SCAN_SQL).not.toMatch(/\b(insert|update|delete|merge|alter|drop|create|truncate|grant|set)\b/i);
  });
});

describe("undo", () => {
  it("is a dry run without --apply; with it every question and translation goes back exactly, and translations of the fixed text go", async () => {
    const { db, rows, trs } = fakeDb();
    await run(["--apply", "--only", "all"], db, { ...quiet, logDir: tmp });
    const [{ f }] = logs();
    const file = path.join(tmp, f);
    // A reader translated a fixed row since the fix.
    trs.push(tr(target("ls-mptet").id, "hi", { id: "tr-new-hi", solution: "fresh translation of the fixed row", createdAt: "2026-10-15T03:00:00.000Z" }));
    const lines: string[] = [];
    await run(["--undo", file], db, { now: NOW, say: (s) => lines.push(s), logDir: tmp });
    expect(byId(rows, target("ls-mptet").id).answerKey).toBe("C");
    expect(lines.join("\n")).toMatch(/remove translation hi \(tr-new-hi\), made since the fix/);
    await run(["--undo", file, "--apply"], db, { ...quiet, logDir: tmp });
    for (const g of GROUPS) expect(canonical(fieldsOf(byId(rows, target(g).id))), g).toBe(canonical(fieldsOf(q(g))));
    expect(byId(rows, target("raichur").id).metadata).toBeNull();
    const sortTr = (x: TrRow[]) => canonical([...x].sort((a, b) => (a.id < b.id ? -1 : 1)));
    expect(sortTr(trs)).toBe(sortTr(seedTr()));
    const undoLog = logs().find((x) => x.f.includes(".undo."))!.log;
    expect(undoLog).toMatchObject({ kind: "undo", status: "applied", undoOf: file });
    expect(undoLog.entries.find((e) => e.questionId === target("ls-mptet").id)!.translations.map((t) => t.id)).toEqual(["tr-new-hi"]);
  });

  it("skips a question changed since the fix", async () => {
    const { db, rows } = fakeDb();
    await run(["--apply", "--only", "cec,raichur"], db, { ...quiet, logDir: tmp });
    const [{ f }] = logs();
    byId(rows, target("cec-kas").id).solution = "hand edit";
    const lines: string[] = [];
    await run(["--undo", path.join(tmp, f), "--apply"], db, { now: NOW, say: (s) => lines.push(s), logDir: tmp });
    expect(lines.join("\n")).toMatch(/\[cec-kas\]: changed since this script wrote it — skipped/);
    expect(byId(rows, target("cec-kas").id).solution).toBe("hand edit");
    expect(byId(rows, target("raichur").id).body).toBe(target("raichur").body);
  });

  it("refuses a file that is not an applied log of this script", async () => {
    const { db } = fakeDb();
    const bad = path.join(tmp, "other.json");
    fs.writeFileSync(bad, JSON.stringify({ script: "fix-bank-items-10-2026", kind: "apply", status: "applied", entries: [] }));
    await expect(run(["--undo", bad], db, { ...quiet, logDir: tmp })).rejects.toThrow(/not an applied log/);
  });
});

describe("the scan report", () => {
  const row = (extra: Partial<ScanRow>): ScanRow => ({ id: "x", body: "", options: [], answerKey: "A", solution: "", validated: true, tags: [], exam: "E", ...extra });
  it("matches the faults and sorts the rows", () => {
    expect(scanHits(row({ body: "BRICS is an association of five major emerging economies." }))).toContain("brics-five");
    expect(scanHits(row({ body: "Maximum strength of the Lok Sabha?", options: [{ key: "D", text: "552" }] }))).toContain("lok-sabha-552");
    expect(scanHits(row({ body: "Profit of ₹552" }))).toEqual([]);
    expect(scanHits(row({ options: [{ key: "C", text: "Mir Qasim of Awadh" }] }))).toContain("mir-qasim-awadh");
    expect(scanHits(row({ solution: "the combined armies of Mir Qasim (Bengal), Shuja-ud-Daulah (Awadh), and Shah Alam II" }))).toEqual([]);
    expect(scanHits(row({ solution: "a winter capital at Gairsain (declared in 2020)" }))).toContain("gairsain-winter");
    expect(scanHits(row({ solution: "Periyar started this after leaving the Congress party due to discrimination at Vaikom." }))).toContain("vaikom-congress");
    expect(scanFate(row({ id: TARGETS[0].id }))).toBe("in script");
    expect(scanFate(row({ id: Object.keys(BORDERLINE)[0] }))).toBe("borderline (left)");
    expect(scanFate(row({ id: Object.keys(REVIEWED_OK)[0] }))).toBe("checked, fine");
    expect(scanFate(row({ id: "new", validated: false }))).toBe("not served (left)");
    expect(scanFate(row({ id: "new", tags: [WITHDRAWN_TAG] }))).toBe("not served (left)");
    expect(scanFate(row({ id: "new" }))).toBe("NOT in this script (read it by hand)");
  });
});

describe("IndexNow", () => {
  it("lists each topic page and its hi twin once", () => {
    expect(indexNowUrls([{ exam: "SSC_GD", topic: "gd.gk.polity" }, { exam: "SSC_GD", topic: "gd.gk.polity" }])).toEqual([
      "https://shishya.in/exams/SSC_GD/topics/gd.gk.polity",
      "https://shishya.in/hi/exams/SSC_GD/topics/gd.gk.polity",
    ]);
  });
});
