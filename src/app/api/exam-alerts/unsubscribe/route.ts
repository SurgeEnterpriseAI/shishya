// POST /api/exam-alerts/unsubscribe?e=<email>&x=<examId>&t=<token>
// State change on POST only (the GET confirm page lives at
// /exam-alerts/unsubscribe). Accepts the RFC 8058 one-click form body
// from mail clients (List-Unsubscribe-Post), a plain form post from the
// confirm page, or JSON. Token = HMAC(email, examId) — see
// src/lib/exam-alerts.ts. Idempotent.

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { normaliseEmail, verifyAlertToken } from "@/lib/exam-alerts";

export const runtime = "nodejs";

async function readParams(req: NextRequest): Promise<{ e: string; x: string; t: string; c: string; resub: boolean; oneClick: boolean }> {
  const sp = req.nextUrl.searchParams;
  let e = sp.get("e") ?? "";
  let x = sp.get("x") ?? "";
  let t = sp.get("t") ?? "";
  let c = sp.get("c") ?? "";
  let resub = sp.get("resub") === "1";
  let oneClick = false;
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      const j = await req.json();
      e = j.e ?? j.email ?? e;
      x = j.x ?? j.examId ?? x;
      t = j.t ?? j.token ?? t;
      c = j.c ?? c;
      resub = j.resub === true || j.resub === "1" || resub;
    } else if (ct.includes("form")) {
      const f = await req.formData();
      // RFC 8058 one-click: mail clients POST `List-Unsubscribe=One-Click`
      // as the form body and expect a 2xx, never a redirect.
      oneClick = f.get("List-Unsubscribe") === "One-Click";
      e = String(f.get("e") ?? e);
      x = String(f.get("x") ?? x);
      t = String(f.get("t") ?? t);
      c = String(f.get("c") ?? c);
      resub = f.get("resub") === "1" || resub;
    }
  } catch {
    /* fall back to query params */
  }
  return { e, x, t, c, resub, oneClick };
}

export async function POST(req: NextRequest) {
  const { e, x, t, c, resub, oneClick } = await readParams(req);
  const email = normaliseEmail(e);
  if (!email || !x || !verifyAlertToken(email, x, t)) {
    return NextResponse.json({ error: "invalid link" }, { status: 400 });
  }
  const ok = await prisma
    .$executeRaw`
      UPDATE "ExamAlert" SET "unsubscribedAt" = ${resub ? null : new Date()}
      WHERE email = ${email} AND "examId" = ${x}`
    .then(() => true)
    .catch((err) => {
      console.error("exam-alert unsubscribe failed:", err);
      return false;
    });
  if (!ok) return NextResponse.json({ error: "try again" }, { status: 500 });

  // HTML clients (the confirm page's form, mail-client one-click) get a
  // redirect back to the page with a done flag; API clients get JSON.
  const accept = req.headers.get("accept") ?? "";
  if (!oneClick && accept.includes("text/html")) {
    const url = new URL("/exam-alerts/unsubscribe", req.nextUrl.origin);
    url.searchParams.set("e", email);
    url.searchParams.set("x", x);
    url.searchParams.set("t", t);
    if (c) url.searchParams.set("c", c);
    url.searchParams.set("done", resub ? "resub" : "unsub");
    return NextResponse.redirect(url, 303);
  }
  return NextResponse.json({ ok: true, unsubscribed: !resub });
}
