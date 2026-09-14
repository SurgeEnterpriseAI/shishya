// GET /attempts/:id/result-card — the result card PNG (14 Sep 2026).
//
// 1080×1920, a phone screen / WhatsApp Status. Only the attempt's owner gets
// it (it carries their first name and result) and it is never cached; anyone
// else, and any attempt not yet submitted, gets a plain 404. Words and
// honesty rules: src/lib/result-card.ts; layout: ./card.tsx.

import { ImageResponse } from "next/og";
import { auth } from "@/lib/auth";
import { resultCardCopy } from "@/lib/result-card";
import { loadResultCard } from "@/lib/result-card-db";
import { RESULT_CARD_SIZE, ResultCardImage } from "./card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE = { "cache-control": "private, no-store" };

function notFound() {
  return new Response("Not found", { status: 404, headers: PRIVATE });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return notFound();
  const { id } = await params;
  const card = await loadResultCard(id, userId).catch(() => null);
  if (!card) return notFound();
  return new ImageResponse(<ResultCardImage c={resultCardCopy(card)} />, { ...RESULT_CARD_SIZE, headers: PRIVATE });
}
