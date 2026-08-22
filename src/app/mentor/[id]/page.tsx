// /mentor/[id] — one student, everything a counsellor needs before the
// call: the full Student-360 (consent-verified), the student's own ask,
// the session room link, and the next-steps note that closes the loop.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { buildStudent360 } from "@/lib/student-360";
import { Student360View } from "@/components/Student360View";
import { TakeButton, DoneForm } from "@/components/MentorActions";
import { SessionThread, type ThreadMsg } from "@/components/SessionThread";

export const metadata: Metadata = { title: "Student — Mentor desk", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MentorStudent({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/mentor");
  const mentors = await prisma.$queryRaw<any[]>`
    SELECT id, name FROM "MentorApplication"
    WHERE status = 'APPROVED' AND ("userId" = ${session.user.id} OR (email IS NOT NULL AND email = ${session.user.email ?? null}))
    LIMIT 1`;
  const mentor = mentors[0];
  if (!mentor) redirect("/mentor");

  const { id } = await params;
  const rows = await prisma.$queryRaw<any[]>`
    SELECT r.*, u.name AS student_name FROM "MentorSessionRequest" r
    JOIN "User" u ON u.id = r."userId"
    WHERE r.id = ${id} AND r.consent = TRUE LIMIT 1`;
  const r = rows[0];
  if (!r) notFound();
  // A TAKEN/DONE request is visible only to the mentor who holds it.
  if (r.status !== "NEW" && r.mentorId !== mentor.id) redirect("/mentor");

  const p = await buildStudent360(r.userId, "mentor");
  if (!p) notFound();

  const msgs = await prisma.$queryRaw<any[]>`
    SELECT "from", body, to_char("createdAt" + interval '5.5 hours', 'DD Mon HH24:MI') AS at
    FROM "MentorSessionMessage" WHERE "requestId" = ${r.id} ORDER BY "createdAt" ASC LIMIT 100`;
  const thread: ThreadMsg[] = msgs.map((m) => ({ from: m.from, body: m.body, at: m.at }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/mentor" className="text-sm text-ink-500 hover:text-ink-700">← Mentor desk</Link>

      <div className="mt-4 rounded-xl border-2 border-saffron-300 bg-saffron-50 p-5">
        {r.note && <p className="text-sm text-ink-800"><span className="font-semibold">Their ask:</span> “{r.note}”</p>}
        {r.status === "NEW" && (
          <div className="mt-3"><TakeButton id={r.id} /></div>
        )}
        {r.status === "TAKEN" && (
          <div className="mt-2">
            <p className="text-sm text-ink-700">
              Session room{r.feeDue && !r.paidAt ? " (unlocks for the student after the ₹9 payment)" : " (shared with the student by email)"}:{" "}
              <a className="font-semibold text-saffron-700 underline" href={r.meetUrl} target="_blank" rel="noopener noreferrer">{r.meetUrl}</a>
            </p>
            {r.feeDue && !r.paidAt && (
              <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                ⏳ Awaiting the student&apos;s ₹9 — the room link is withheld from them until it&apos;s paid
                (your &quot;Invite to join now&quot; won&apos;t include the link yet).
              </p>
            )}
            {/* Room link is passed to the invite preset ONLY once nothing is owed —
                otherwise the mentor's one-tap invite leaked the URL past the
                payment gate (review 22 Aug 2026). */}
            <SessionThread
              requestId={r.id}
              messages={thread}
              viewer="MENTOR"
              meetUrl={r.feeDue && !r.paidAt ? null : r.meetUrl}
            />
            <DoneForm id={r.id} />
          </div>
        )}
        {r.status === "NEW" && thread.length > 0 && (
          <SessionThread requestId={r.id} messages={thread} viewer="MENTOR" meetUrl={null} />
        )}
        {r.status === "DONE" && r.sessionNote && (
          <p className="mt-2 text-sm text-ink-700"><span className="font-semibold">Next steps sent:</span> {r.sessionNote}</p>
        )}
      </div>

      <div className="mt-6">
        <Student360View p={p} viewer="mentor" />
      </div>
    </main>
  );
}
