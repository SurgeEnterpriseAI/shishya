// /me/report/pack — the aspirant's personalised study pack for TODAY.
//
// Founder rule (16 Aug): dynamically generated for THIS aspirant's
// context, different for different aspirants, different for the same
// aspirant on different days as they progress. We achieve that by
// ASSEMBLY, not generation: their current weakest topics (WeaknessMap,
// which moves with every test) select which validated topic notes,
// memory tricks and practice questions go in. Instant, zero AI spend,
// and every ingredient was already human/AI-validated on the platform.
//
// Structure (exam-style): focus note → per weak topic: study notes +
// 3 practice questions (answers withheld) → tricks for those subjects →
// answer key with solutions at the BACK, so it works as a self-test.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { buildStudent360 } from "@/lib/student-360";
import { PrintButton } from "@/components/PrintButton";

export const metadata: Metadata = {
  title: "My study pack — Shishya",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const TOPICS_IN_PACK = 4;
const QS_PER_TOPIC = 3;
const NOTE_CHAR_CAP = 2600;

function mdLite(s: string) {
  // Minimal markdown → HTML for notes/tricks (headings, bold, bullets).
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/^### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^## (.*)$/gm, "<h3>$1</h3>")
    .replace(/^# (.*)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/^[-*] (.*)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "<br/><br/>");
}

export default async function StudyPackPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login?callbackUrl=/me/report");
  const p = await buildStudent360(userId);
  if (!p || !p.exam) redirect("/me/report");

  const dateIst = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

  // Their weakest topics today (fall back to least-practised when the
  // weakness map is still thin — brand-new aspirants get a starter pack).
  const weak = await prisma.$queryRaw<any[]>`
    SELECT t.id, t.name, s.name AS subject, w."masteryScore",
      (SELECT tn.content FROM "TopicTeachingNote" tn WHERE tn."topicId" = t.id LIMIT 1) AS note
    FROM "WeaknessMap" w
    JOIN "Topic" t ON t.id = w."topicId"
    JOIN "Subject" s ON s.id = t."subjectId"
    JOIN "Exam" e ON e.id = w."examId"
    WHERE w."userId" = ${userId} AND e.code = ${p.exam.code}
    ORDER BY w."masteryScore" ASC LIMIT ${TOPICS_IN_PACK}`;
  const topics = weak.length
    ? weak
    : await prisma.$queryRaw<any[]>`
        SELECT t.id, t.name, s.name AS subject, NULL::float AS "masteryScore",
          (SELECT tn.content FROM "TopicTeachingNote" tn WHERE tn."topicId" = t.id LIMIT 1) AS note
        FROM "Topic" t JOIN "Subject" s ON s.id = t."subjectId" JOIN "Exam" e ON e.id = s."examId"
        WHERE e.code = ${p.exam.code} ORDER BY s."orderIdx", t."orderIdx" LIMIT ${TOPICS_IN_PACK}`;

  const topicIds = topics.map((t: any) => t.id);
  const questions = topicIds.length
    ? await prisma.$queryRaw<any[]>`
        SELECT DISTINCT ON (q."topicId", q.id) q.id, q."topicId", q.body, q.options, q."answerKey", q.solution
        FROM "Question" q
        WHERE q."topicId" = ANY(${topicIds}) AND q.validated = TRUE AND q.language = 'EN'
        ORDER BY q."topicId", q.id DESC`
    : [];
  const byTopic = new Map<string, any[]>();
  for (const q of questions) {
    const arr = byTopic.get(q.topicId) ?? [];
    if (arr.length < QS_PER_TOPIC) { arr.push(q); byTopic.set(q.topicId, arr); }
  }

  const tricks = await prisma.$queryRaw<any[]>`
    SELECT et.content FROM "ExamTricks" et JOIN "Exam" e ON e.id = et."examId"
    WHERE e.code = ${p.exam.code} LIMIT 1`;
  const subjectsInPack = [...new Set(topics.map((t: any) => t.subject))];
  const trickSections = (tricks[0]?.content ?? "")
    .split(/^## /m)
    .filter((sec: string) => subjectsInPack.some((s) => sec.toLowerCase().startsWith(String(s).toLowerCase().slice(0, 8))))
    .slice(0, 2);

  let qNo = 0;
  const numbered = topics.map((t: any) => ({
    topic: t,
    qs: (byTopic.get(t.id) ?? []).map((q: any) => ({ ...q, n: ++qNo })),
  }));

  return (
    <main className="mx-auto max-w-3xl bg-white px-6 py-8 print:px-0 print:py-0">
      <style>{`@media print { header, nav, footer { display: none !important; } body { background: white !important; } } .note-md h3,.note-md h4{font-weight:600;margin-top:.6rem} .note-md ul{list-style:disc;padding-left:1.2rem}`}</style>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <a href="/me/report" className="text-sm text-ink-500 hover:text-ink-700">← Back to report</a>
        <PrintButton label="Download this pack as PDF" />
      </div>

      <div className="border-b-2 border-saffron-500 pb-3">
        <p className="text-lg font-bold text-ink-900">Shishya — Your Study Pack for {dateIst}</p>
        <p className="text-sm text-ink-600">
          {p.name} · {p.exam.short}{p.daysToExam != null && ` · ${p.daysToExam} days to exam`}
        </p>
        <p className="mt-1 text-xs text-ink-500">
          Built from your weakest areas as of today — tomorrow's pack will be different because your preparation moves.
        </p>
      </div>

      {p.coachRead && (
        <div className="mt-4 rounded-lg bg-saffron-50 p-3 text-sm text-ink-800 print:border print:border-ink-200">
          <b>Focus today:</b> {p.coachRead}
        </div>
      )}

      {numbered.map(({ topic, qs }, i) => (
        <section key={topic.id} className="mt-6" style={{ breakInside: "avoid-page" as any }}>
          <h2 className="border-b border-ink-200 pb-1 text-base font-bold text-ink-900">
            {i + 1}. {topic.name} <span className="text-sm font-normal text-ink-500">· {topic.subject}
            {topic.masteryScore != null && ` · your mastery ${Math.round(topic.masteryScore * 100)}%`}</span>
          </h2>
          {topic.note ? (
            <div className="note-md mt-2 text-sm leading-relaxed text-ink-700"
              dangerouslySetInnerHTML={{ __html: mdLite(String(topic.note).slice(0, NOTE_CHAR_CAP)) + (String(topic.note).length > NOTE_CHAR_CAP ? "<br/><i>…full notes on shishya.in</i>" : "") }} />
          ) : (
            <p className="mt-2 text-sm text-ink-500">Study notes for this topic are on shishya.in — ask the tutor to teach it.</p>
          )}
          {qs.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-semibold text-ink-800">Practice (answers at the back):</p>
              {qs.map((q: any) => (
                <div key={q.id} className="mt-2 text-sm text-ink-800">
                  <p><b>Q{q.n}.</b> {q.body}</p>
                  <ol className="mt-1 space-y-0.5 pl-5 text-ink-700" style={{ listStyleType: "upper-alpha" }}>
                    {(Array.isArray(q.options) ? q.options : []).map((o: any, j: number) => (
                      <li key={j}>{typeof o === "string" ? o : (o?.text ?? JSON.stringify(o))}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      {trickSections.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b border-ink-200 pb-1 text-base font-bold text-ink-900">Memory tricks for today's subjects</h2>
          {trickSections.map((sec: string, i: number) => (
            <div key={i} className="note-md mt-2 text-sm leading-relaxed text-ink-700"
              dangerouslySetInnerHTML={{ __html: mdLite("## " + sec.slice(0, 1800)) }} />
          ))}
        </section>
      )}

      <section className="mt-8" style={{ breakBefore: "page" as any }}>
        <h2 className="border-b-2 border-ink-300 pb-1 text-base font-bold text-ink-900">Answer key & solutions</h2>
        {numbered.flatMap(({ qs }) => qs).map((q: any) => (
          <div key={q.id} className="mt-3 text-sm text-ink-700">
            <p><b>Q{q.n}: {q.answerKey}</b></p>
            {q.solution && <p className="mt-0.5 text-ink-600">{String(q.solution).slice(0, 500)}</p>}
          </div>
        ))}
      </section>

      <p className="mt-8 border-t border-ink-100 pt-3 text-xs text-ink-400">
        Generated by Shishya (shishya.in) on {dateIst}, personally for {p.name}. Free, always.
      </p>
    </main>
  );
}
