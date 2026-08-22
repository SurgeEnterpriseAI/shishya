// POST /api/unsubscribe — the ONLY place the opt-out state changes.
//
// Review 22 Aug 2026: the old /unsubscribe page flipped emailOptOut on a
// plain GET, so link-scanning mail gateways (Outlook Safe Links, ISP
// prefetchers) and a stray click could silently unsubscribe students.
// Now: GET /unsubscribe renders a confirm button (no state change); the
// button POSTs here. RFC 8058 one-click (List-Unsubscribe-Post) also
// POSTs here directly — still one click from a mail client, never from
// a crawler following links.
//
// Body: form (u, t, resub?) or JSON {u, t, resub?}. Signed token verified.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyUnsubToken } from "@/lib/email-unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readBody(req: Request): Promise<{ u?: string; t?: string; resub?: string }> {
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) return (await req.json()) ?? {};
    const form = await req.formData();
    return {
      u: form.get("u")?.toString(),
      t: form.get("t")?.toString(),
      resub: form.get("resub")?.toString(),
    };
  } catch {
    // One-click clients may send an empty body with params in the URL.
    const url = new URL(req.url);
    return { u: url.searchParams.get("u") ?? undefined, t: url.searchParams.get("t") ?? undefined, resub: url.searchParams.get("resub") ?? undefined };
  }
}

export async function POST(req: Request) {
  const body = await readBody(req);
  const url = new URL(req.url);
  const u = body.u ?? url.searchParams.get("u") ?? "";
  const t = body.t ?? url.searchParams.get("t") ?? "";
  const resub = (body.resub ?? url.searchParams.get("resub")) === "1";
  if (!u || !t || !verifyUnsubToken(u, t)) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  if (resub) {
    await prisma.$executeRaw`UPDATE "User" SET "emailOptOut" = FALSE, "emailOptOutAt" = NULL WHERE id = ${u}`;
  } else {
    await prisma.$executeRaw`UPDATE "User" SET "emailOptOut" = TRUE, "emailOptOutAt" = NOW() WHERE id = ${u}`;
  }
  // Browser form posts get bounced to the confirmation page; API/one-click
  // callers get JSON.
  const accept = req.headers.get("accept") ?? "";
  if (accept.includes("text/html")) {
    return NextResponse.redirect(
      new URL(`/unsubscribe?u=${encodeURIComponent(u)}&t=${encodeURIComponent(t)}&done=${resub ? "resub" : "unsub"}`, req.url),
      303,
    );
  }
  return NextResponse.json({ ok: true, optedOut: !resub });
}
