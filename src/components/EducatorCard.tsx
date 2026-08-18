// "From your educator" — the student side of the B2B batch layer.
//
// For students enrolled in an educator's batch: the educator's open
// assignments (with a start link when exam-linked) + the doubt channel
// back to the educator. Server component; renders nothing for the 99%
// of students not in any batch, so the dashboard stays clean.

import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { TalkToTeacher } from "@/components/TalkToTeacher";
import { LeaveBatchLink } from "@/components/LeaveBatchLink";

interface Asg {
  id: string;
  title: string;
  instructions: string | null;
  examCode: string | null;
  dueAt: Date | null;
  createdAt: Date;
  batchId: string;
}

export async function EducatorCard({ userId }: { userId: string }) {
  const enrollments = await prisma.batchEnrollment
    .findMany({
      where: { userId, status: "ACTIVE" },
      select: {
        batchId: true,
        batch: {
          select: {
            name: true,
            course: { select: { name: true, institution: { select: { name: true } } } },
          },
        },
      },
    })
    .catch(() => []);
  if (enrollments.length === 0) return null;

  const batchIds = enrollments.map((e) => e.batchId);
  const assignments: Asg[] = await prisma.$queryRaw<Asg[]>`
    SELECT id, title, instructions, "examCode", "dueAt", "createdAt", "batchId"
    FROM "BatchAssignment"
    WHERE "batchId" = ANY(${batchIds})
      AND ("dueAt" IS NULL OR "dueAt" > NOW() - INTERVAL '2 days')
    ORDER BY "createdAt" DESC
    LIMIT 5
  `.catch(() => []);

  const instName =
    enrollments[0].batch.course.institution?.name ?? enrollments[0].batch.course.name;
  const batchName = new Map(enrollments.map((e) => [e.batchId, e.batch.name]));

  return (
    <div className="mt-5 rounded-xl border-2 border-violet-200 bg-gradient-to-r from-violet-50/70 to-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
        🎓 From your educator · {instName}
      </p>

      {assignments.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {assignments.map((a) => (
            <li key={a.id} className="rounded-lg border border-ink-200 bg-white px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-ink-900">{a.title}</p>
                {a.dueAt && (
                  <span className="text-[11px] font-medium text-rose-700">
                    due {new Date(a.dueAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                )}
                {a.examCode && (
                  <Link
                    href={`/exams/${a.examCode}`}
                    className="ml-auto shrink-0 rounded-md bg-violet-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-violet-700"
                  >
                    Start →
                  </Link>
                )}
              </div>
              {a.instructions && (
                <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{a.instructions}</p>
              )}
              <p className="mt-0.5 text-[10px] text-ink-400">{batchName.get(a.batchId)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-ink-600">
          No open assignments right now — keep practising, your educator sees your progress.
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <TalkToTeacher
          surface="batch"
          variant="link"
          linkLabel="🙋 Ask your educator a doubt →"
          contextLabel={`batch: ${enrollments[0].batch.name}`}
        />
        <LeaveBatchLink batchId={enrollments[0].batchId} batchName={enrollments[0].batch.name} />
      </div>
    </div>
  );
}
