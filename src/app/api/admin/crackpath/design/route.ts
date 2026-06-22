// POST /api/admin/crackpath/design — Gemini (architect) designs the Crack
// Path build plan and seeds CrackPathTask rows. Bearer ${CRON_SECRET}.
//
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
//        "https://shishya.in/api/admin/crackpath/design"
//
// Idempotent-ish: by default it only designs if no tasks exist yet. Pass
// ?more=1 to ask Gemini to design ADDITIONAL tasks beyond the current plan.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { prisma } from "@/lib/db/prisma";
import { designCrackPath } from "@/lib/crackpath/architect";

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const more = new URL(req.url).searchParams.get("more") === "1";

  const existing = await prisma.crackPathTask.findMany({ select: { title: true, status: true, seq: true } });
  if (existing.length && !more) {
    return Response.json({ ok: true, skipped: true, message: `${existing.length} tasks already designed. Pass ?more=1 to design additional ones.` });
  }

  const tasks = await designCrackPath(more ? existing.map((t) => ({ title: t.title, status: t.status })) : null);
  if (!tasks || !tasks.length) {
    return Response.json({ ok: false, error: "Gemini returned no design (check GEMINI_API_KEY + logs)." }, { status: 502 });
  }

  const seqOffset = existing.length ? Math.max(...existing.map((t) => t.seq)) : 0;
  const created = await prisma.$transaction(
    tasks.map((t, i) =>
      prisma.crackPathTask.create({
        data: {
          phase: t.phase,
          seq: more ? seqOffset + i + 1 : t.seq,
          title: t.title,
          spec: t.spec,
          acceptanceCriteria: t.acceptanceCriteria,
          effort: t.effort,
          status: "designed",
        },
        select: { id: true, phase: true, title: true, effort: true },
      })
    )
  );

  return Response.json({ ok: true, designed: created.length, tasks: created });
}
