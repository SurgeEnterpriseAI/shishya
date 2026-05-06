// GET /api/admin/questions — list questions (default: pending validation)
// Filters via query params: examCode, topicCode, source, validated, q (search)

import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/admin";
import { ok, forbidden, serverError } from "@/lib/http";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const examCode = url.searchParams.get("examCode");
    const topicCode = url.searchParams.get("topicCode");
    const source = url.searchParams.get("source");
    const validatedParam = url.searchParams.get("validated");
    const q = url.searchParams.get("q");
    const take = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
    const skip = parseInt(url.searchParams.get("offset") ?? "0", 10);

    const where: any = {};
    if (examCode) where.exam = { code: examCode };
    if (topicCode) where.topic = { code: topicCode };
    if (source) where.source = source;
    if (validatedParam === "true") where.validated = true;
    if (validatedParam === "false") where.validated = false;
    if (q) where.body = { contains: q, mode: "insensitive" };

    const [items, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          exam: { select: { code: true, shortName: true } },
          topic: { select: { code: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
        take,
        skip,
      }),
      prisma.question.count({ where }),
    ]);

    return ok({ items, total, take, skip });
  } catch (err: any) {
    if (err?.status === 403) return forbidden();
    return serverError(err);
  }
}
