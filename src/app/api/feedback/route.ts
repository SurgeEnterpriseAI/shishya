// POST /api/feedback  — create a new feature request (signed-in users)
// GET  /api/feedback  — paginated list, optional filter by area
//
// The route is part of the in-product feedback loop: students click a
// small "💡 Suggest a feature" pill on any page, type what they want,
// and the request gets tagged with the route + area they were on. The
// public /ideas page reads from this same endpoint.

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { bad, ok, parseBody, serverError, unauth } from "@/lib/http";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const KNOWN_AREAS = new Set([
  "Mock tests",
  "AI Tutor",
  "Translations",
  "Results & Rank",
  "UI / Navigation",
  "Other",
]);

const Body = z.object({
  body: z.string().min(8).max(2000),
  area: z.string().max(60).optional(),
  routePath: z.string().min(1).max(500),
  examCode: z.string().max(60).optional().nullable(),
});

function deriveTitle(text: string): string {
  // First sentence, capped to ~80 chars, used for compact card titles.
  const first = text.split(/[.!?]\s|\n/, 1)[0]?.trim() ?? text.slice(0, 80);
  return first.length > 80 ? first.slice(0, 77) + "…" : first;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return unauth();

    // Reuse the per-user "explain" bucket (~20/min) — feedback is cheap
    // server-side but we don't want spam.
    const rl = await checkRateLimit("explain", session.user.id);
    if (!rl.ok) return rateLimited(rl);

    const body = await parseBody(req, Body);
    const area = body.area && KNOWN_AREAS.has(body.area) ? body.area : "Other";

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    const created = await prisma.featureRequest.create({
      data: {
        title: deriveTitle(body.body),
        body: body.body,
        area,
        routePath: body.routePath,
        examCode: body.examCode ?? null,
        authorId: session.user.id,
        authorName: user?.name ?? null,
        authorEmail: user?.email ?? null,
      },
      select: { id: true, title: true, area: true, createdAt: true },
    });

    // Signal the team on submit — otherwise a feature request sat unseen
    // until someone happened to open /admin (audit 18 Aug 2026).
    const notifyTo =
      process.env.TEACHER_REQUEST_NOTIFY_EMAIL ??
      (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean)[0] ??
      null;
    if (notifyTo) {
      // Escape every user-controlled field — routePath/body/name were
      // interpolated raw into the admin inbox (review 22 Aug 2026).
      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const { after } = await import("next/server");
      after(async () => {
        await sendEmail({
          to: notifyTo,
          subject: `💡 Feature request (${area}) — ${created.title.replace(/[\r\n]/g, " ").slice(0, 120)}`,
          html: `<p><b>${esc(user?.name ?? "A student")}</b> (${esc(user?.email ?? "—")}) suggested:</p>
<blockquote style="border-left:3px solid #f59e0b;padding-left:10px">${esc(body.body)}</blockquote>
<p>Area: ${esc(area)} · from ${esc(body.routePath)}<br/>Review: https://shishya.in/admin/feedback</p>`,
          tag: "feature-request",
        }).catch(() => {});
      });
    }
    return ok({ request: created });
  } catch (err: any) {
    if (err?.status === 400) return bad(err.message);
    return serverError(err);
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const area = url.searchParams.get("area") ?? undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "30", 10), 100);
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const where: any = { status: { not: "DECLINED" as const } };
    if (area && KNOWN_AREAS.has(area)) where.area = area;

    const items = await prisma.featureRequest.findMany({
      where,
      orderBy: [{ upvoteCount: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        title: true,
        body: true,
        area: true,
        examCode: true,
        routePath: true,
        authorName: true,
        upvoteCount: true,
        status: true,
        createdAt: true,
      },
    });

    // If signed in, mark which requests the user already upvoted so the
    // UI can render filled vs empty thumbs without a separate request.
    const myUpvotes = userId
      ? new Set(
          (
            await prisma.featureRequestUpvote.findMany({
              where: { userId, requestId: { in: items.map((i) => i.id) } },
              select: { requestId: true },
            })
          ).map((u) => u.requestId),
        )
      : new Set<string>();

    return ok({
      items: items.map((i) => ({
        ...i,
        createdAt: i.createdAt.toISOString(),
        upvotedByMe: myUpvotes.has(i.id),
      })),
    });
  } catch (err) {
    return serverError(err);
  }
}
