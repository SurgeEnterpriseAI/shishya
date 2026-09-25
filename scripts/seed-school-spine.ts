// scripts/seed-school-spine.ts
//
// Seeds the official school curriculum spine (data/curriculum/, built from
// ncert.nic.in / cbseacademic.nic.in / cisce.org on 25 Sep 2026) into the
// existing Exam → Subject → Topic tree, per product.md §1.2:
//   • one Exam per (curriculum, class), category SCHOOL_BOARD:
//     NCERT_C01..NCERT_C12, CISCE_C01..CISCE_C12 — created INACTIVE;
//   • one Subject per NCERT / CISCE subject;
//   • one top-level Topic per NCERT chapter whose title AND PDF were both
//     verified (unresolved chapters — legacy-font Hindi/Urdu/Sanskrit books,
//     404 PDFs — get no Topic, they are only counted);
//   • one child Topic per piece printed inside a chapter PDF (26 Sep 2026:
//     First Flight's poems, Poorvi's unit lessons …), code <chapter>.pNN;
//   • one KnowledgeSource link row per official PDF (chapter PDF for NCERT,
//     syllabus / regulations PDF for CISCE): url + examCode + topicCode, tier
//     STANDARD_TEXT / OFFICIAL, and NO chunks — nothing from a textbook is
//     ingested (NCERT forbids reproducing or summarising its books).
//
// Additive and idempotent: upserts by Exam.code, (examId, code),
// (subjectId, code) and KnowledgeSource.contentHash. Never deletes, never
// changes an existing row's `active`, refuses to touch an Exam code that is
// not SCHOOL_BOARD, and will not rename a Topic that already has questions or
// a teaching note (reported as a conflict instead — a renamed chapter under
// the same code means NCERT reissued the book; give it an editionTag).
//
// Dry run by default (reads the DB to show create / update / unchanged);
// --apply writes; --offline skips the DB and prints the plan only.
//   npx tsx --env-file=.env.local scripts/seed-school-spine.ts [--offline] [--apply --chat-gate-checked]
//
// 26 Sep 2026 (review): inactive rows are NOT invisible everywhere. The exam
// and topic pages 404 them and the crons filter them, but /api/chat
// (src/app/api/chat/route.ts) finds the exam by code alone and upserts an
// Enrollment — so once these rows exist, a request with examCode NCERT_C09
// reaches the paid tutor with the exam-prep persona and enrols the user
// (product.md §1.3). --apply therefore also needs --chat-gate-checked, i.e.
// someone confirmed that route 404s inactive / SCHOOL_BOARD exams and skips
// the Enrollment for them.

import { PrismaClient, type Language, type Prisma } from "@prisma/client";
import { buildSchoolSpinePlan, type PlannedExam, type PlannedLink, type PlannedSubject, type PlannedTopic } from "../src/lib/school/seed-plan";
import { CISCE, NCERT_CLASS_FILES } from "../src/lib/school/spine";

const APPLY = process.argv.includes("--apply");
const OFFLINE = process.argv.includes("--offline");
if (APPLY && OFFLINE) {
  console.error("--apply needs the DB; drop --offline");
  process.exit(1);
}
if (APPLY && !process.argv.includes("--chat-gate-checked")) {
  console.error(
    "--apply refused: /api/chat must first 404 inactive / SCHOOL_BOARD exams and skip their Enrollment upsert " +
      "(src/app/api/chat/route.ts, exam lookup by code). Once that ships, re-run with --apply --chat-gate-checked.",
  );
  process.exit(1);
}

type Tally = { create: number; update: number; same: number; conflict: number };
const tally = (): Tally => ({ create: 0, update: 0, same: 0, conflict: 0 });

function sameLanguages(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

async function main() {
  const plan = buildSchoolSpinePlan();
  const prisma = OFFLINE ? null : new PrismaClient();

  const perExam = new Map<string, { exam: Tally; subjects: Tally; topics: Tally; links: Tally }>();
  for (const e of plan.exams) perExam.set(e.code, { exam: tally(), subjects: tally(), topics: tally(), links: tally() });
  const conflicts: string[] = [];

  if (prisma) {
    try {
      const codes = plan.exams.map((e) => e.code);
      const existingExams = await prisma.exam.findMany({
        where: { code: { in: codes } },
        select: { id: true, code: true, category: true, name: true, shortName: true, description: true, languages: true, active: true },
      });
      const examByCode = new Map(existingExams.map((e) => [e.code, e]));
      const subjects = await prisma.subject.findMany({
        where: { examId: { in: existingExams.map((e) => e.id) } },
        select: { id: true, examId: true, code: true, name: true, orderIdx: true },
      });
      const subjectByKey = new Map(subjects.map((s) => [`${s.examId}|${s.code}`, s]));
      const topics = await prisma.topic.findMany({
        where: { subjectId: { in: subjects.map((s) => s.id) } },
        select: { id: true, subjectId: true, code: true, name: true, orderIdx: true, parentId: true, _count: { select: { questions: true } }, teachingNote: { select: { id: true } } },
      });
      const topicByKey = new Map(topics.map((t) => [`${t.subjectId}|${t.code}`, t]));
      const hashes = plan.links.map((l) => l.contentHash);
      const existingLinks = new Map<string, { id: string; title: string; url: string | null; examCode: string | null; topicCode: string | null }>();
      for (let i = 0; i < hashes.length; i += 500) {
        const rows = await prisma.knowledgeSource.findMany({
          where: { contentHash: { in: hashes.slice(i, i + 500) } },
          select: { id: true, contentHash: true, title: true, url: true, examCode: true, topicCode: true },
        });
        for (const r of rows) existingLinks.set(r.contentHash, r);
      }

      // ── diff ──────────────────────────────────────────────────────────
      for (const e of plan.exams) {
        const t = perExam.get(e.code)!;
        const cur = examByCode.get(e.code);
        if (!cur) t.exam.create++;
        else if (cur.category !== "SCHOOL_BOARD") {
          t.exam.conflict++;
          conflicts.push(`${e.code}: exists with category ${cur.category} — not a school container, refusing`);
        } else if (cur.name === e.name && cur.shortName === e.shortName && cur.description === e.description && sameLanguages(cur.languages, e.languages)) t.exam.same++;
        else t.exam.update++;
      }
      const examId = (code: string) => examByCode.get(code)?.id;
      for (const s of plan.subjects) {
        const t = perExam.get(s.examCode)!;
        const id = examId(s.examCode);
        const cur = id ? subjectByKey.get(`${id}|${s.code}`) : undefined;
        if (!cur) t.subjects.create++;
        else if (cur.name === s.name && cur.orderIdx === s.orderIdx) t.subjects.same++;
        else t.subjects.update++;
      }
      for (const tp of plan.topics) {
        const t = perExam.get(tp.examCode)!;
        const id = examId(tp.examCode);
        const subj = id ? subjectByKey.get(`${id}|${tp.subjectCode}`) : undefined;
        const cur = subj ? topicByKey.get(`${subj.id}|${tp.code}`) : undefined;
        const wantParent = tp.parentCode && subj ? topicByKey.get(`${subj.id}|${tp.parentCode}`)?.id ?? "(new)" : null;
        if (!cur) t.topics.create++;
        else if (cur.name === tp.name && cur.orderIdx === tp.orderIdx && cur.parentId === wantParent) t.topics.same++;
        else if (cur.name !== tp.name && (cur._count.questions > 0 || cur.teachingNote)) {
          t.topics.conflict++;
          conflicts.push(`${tp.examCode} ${tp.code}: DB name "${cur.name}" ≠ NCERT "${tp.name}" and the topic has content — not renamed`);
        } else t.topics.update++;
      }
      for (const l of plan.links) {
        const t = perExam.get(l.examCode)!;
        const cur = existingLinks.get(l.contentHash);
        if (!cur) t.links.create++;
        else if (cur.title === l.title && cur.url === l.url && cur.examCode === l.examCode && cur.topicCode === l.topicCode) t.links.same++;
        else t.links.update++;
      }

      if (APPLY) {
        if (conflicts.some((c) => c.includes("refusing"))) throw new Error("exam-code conflict — nothing written");
        await apply(prisma, plan.exams, plan.subjects, plan.topics, plan.links, conflicts);
      }
    } finally {
      await prisma.$disconnect();
    }
  }

  // ── report ────────────────────────────────────────────────────────────
  const pad = (s: string | number, n: number) => String(s).padEnd(n);
  const f = (t: Tally) => `${t.create}/${t.update}/${t.same}${t.conflict ? `/!${t.conflict}` : ""}`;
  console.log(
    `School spine ${APPLY ? "APPLY" : OFFLINE ? "plan (offline)" : "dry run"} — data/curriculum: NCERT index read ${NCERT_CLASS_FILES[0].source.fetchedOn}, CISCE read ${CISCE.fetchedOn}`,
  );
  console.log(pad("exam", 11) + pad("subjects", 9) + pad("books", 6) + pad("chapters", 9) + pad("pieces", 7) + pad("unresolved", 11) + pad("links", 6) + (OFFLINE ? "" : "DB create/update/same: exam | subjects | topics+pieces | links"));
  for (const s of plan.summary) {
    const t = perExam.get(s.examCode)!;
    console.log(
      pad(s.examCode, 11) + pad(s.subjects, 9) + pad(s.books, 6) + pad(s.topics, 9) + pad(s.pieces, 7) + pad(s.unresolvedChapters, 11) + pad(s.links, 6) +
        (OFFLINE ? "" : `${f(t.exam)} | ${f(t.subjects)} | ${f(t.topics)} | ${f(t.links)}`),
    );
  }
  const tot = (k: "subjects" | "books" | "topics" | "pieces" | "unresolvedChapters" | "links") => plan.summary.reduce((a, s) => a + s[k], 0);
  console.log(`TOTAL      ${pad(tot("subjects"), 9)}${pad(tot("books"), 6)}${pad(tot("topics"), 9)}${pad(tot("pieces"), 7)}${pad(tot("unresolvedChapters"), 11)}${tot("links")}`);
  const reasons: Record<string, number> = {};
  for (const s of plan.summary) for (const [k, v] of Object.entries(s.unresolvedByReason)) reasons[k] = (reasons[k] ?? 0) + v;
  console.log("unresolved chapters by reason (no Topic row; the XI & XII combined books count in both classes):");
  for (const [k, v] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) console.log(`  ${pad(k, 24)} ${v}`);
  console.log(`rows planned: ${plan.exams.length} exams (all active=false), ${plan.subjects.length} subjects, ${plan.topics.filter((t) => !t.parentCode).length} chapter topics + ${plan.topics.filter((t) => t.parentCode).length} piece topics, ${plan.links.length} link rows`);
  if (conflicts.length) {
    console.log(`conflicts (${conflicts.length}):`);
    for (const c of conflicts.slice(0, 30)) console.log("  " + c);
  }
  if (!APPLY) console.log("\ndry run — nothing written. Writing needs --apply --chat-gate-checked (see the header: /api/chat must gate school exams first).");
}

async function apply(prisma: PrismaClient, exams: PlannedExam[], subjects: PlannedSubject[], topics: PlannedTopic[], links: PlannedLink[], conflicts: string[]) {
  const skipTopic = new Set(conflicts.filter((c) => c.includes("not renamed")).map((c) => c.split(":")[0]));
  for (const e of exams) {
    const data = {
      name: e.name, shortName: e.shortName, description: e.description, durationMin: e.durationMin,
      totalQuestions: e.totalQuestions, totalMarks: e.totalMarks, marksPerQ: e.marksPerQ, negativeMark: e.negativeMark,
      languages: e.languages as Language[],
    };
    // `active` is set only on create — an existing row keeps whatever it has.
    const exam = await prisma.exam.upsert({
      where: { code: e.code },
      create: { code: e.code, category: "SCHOOL_BOARD", active: false, ...data },
      update: data,
      select: { id: true },
    });
    for (const s of subjects.filter((x) => x.examCode === e.code)) {
      const subject = await prisma.subject.upsert({
        where: { examId_code: { examId: exam.id, code: s.code } },
        create: { examId: exam.id, code: s.code, name: s.name, orderIdx: s.orderIdx },
        update: { name: s.name, orderIdx: s.orderIdx },
        select: { id: true },
      });
      // chapters first, then the pieces inside them (child Topics need the parent's id)
      const ids = new Map<string, string>();
      const own = topics.filter((x) => x.examCode === e.code && x.subjectCode === s.code);
      for (const t of [...own.filter((x) => !x.parentCode), ...own.filter((x) => x.parentCode)]) {
        if (skipTopic.has(`${e.code} ${t.code}`)) continue;
        const parentId = t.parentCode ? ids.get(t.parentCode) ?? null : null;
        if (t.parentCode && !parentId) continue; // parent skipped as a conflict → leave its pieces too
        const row = await prisma.topic.upsert({
          where: { subjectId_code: { subjectId: subject.id, code: t.code } },
          create: { subjectId: subject.id, code: t.code, name: t.name, orderIdx: t.orderIdx, parentId },
          update: { name: t.name, orderIdx: t.orderIdx, parentId },
          select: { id: true },
        });
        ids.set(t.code, row.id);
      }
    }
    for (const l of links.filter((x) => x.examCode === e.code)) {
      const data: Prisma.KnowledgeSourceUncheckedCreateInput = {
        contentHash: l.contentHash, title: l.title, url: l.url, publisher: l.publisher, tier: l.tier,
        examCode: l.examCode, topicCode: l.topicCode, language: l.language,
      };
      await prisma.knowledgeSource.upsert({ where: { contentHash: l.contentHash }, create: data, update: data });
    }
    console.log(`applied ${e.code}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
