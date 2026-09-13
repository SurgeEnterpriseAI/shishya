// POST /api/webhooks/resend — mail open/click/delivery readout (13 Sep 2026).
//
// Resend posts one event per delivery / open / click; this route verifies
// the Svix signature and writes an EmailTouch row per (user, event, mail
// tag) so /admin/loops can show sends → delivered → opens → clicks by mail
// kind. Rows: 'delivered:<tag>' / 'open:<tag>' / 'click:<tag>' where <tag>
// is the mail's Resend tag (`kind`, set in src/lib/email.ts sendEmail).
//
// SETUP (Resend dashboard → Webhooks → Add):
//   endpoint  https://shishya.in/api/webhooks/resend
//   events    email.delivered, email.opened, email.clicked
//   secret    the webhook's Signing Secret (whsec_…) → Vercel env
//             RESEND_WEBHOOK_SECRET — set it BEFORE creating the webhook,
//             or every delivery 401s and Resend disables the endpoint.
//   tracking  open + click tracking must be switched on for the sending
//             domain (Resend → Domains); without it only 'delivered:' rows
//             ever arrive and the page shows opens/clicks as '–'.
//
// Fail closed: no secret → 401 for everything. Signature: HMAC-SHA256 over
// `${svix-id}.${svix-timestamp}.${raw body}` keyed with the base64 part
// after `whsec_`, compared constant-time against every `v1,<sig>` entry;
// 5-minute timestamp tolerance. No `svix` package — node:crypto only.
//
// Dedupe: one row per user per event per tag per 20 h (Resend fires opened
// on every open and on Gmail's proxy prefetch; one row per user-day is the
// honest unit). A DB throw → 500 so Resend retries; the dedupe makes the
// retry idempotent. Unknown recipients (exam-alert subscribers without an
// account, mentors' external addresses) → 200 skipped.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";

const TOLERANCE_S = 300;

function verify(secret: string, id: string, ts: string, sig: string, raw: string): boolean {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${ts}.${raw}`).digest("base64");
  const exp = Buffer.from(expected);
  for (const entry of sig.split(" ")) {
    const [version, s] = entry.split(",");
    if (version !== "v1" || !s) continue;
    const got = Buffer.from(s);
    if (got.length !== exp.length) continue;
    try {
      if (timingSafeEqual(got, exp)) return true;
    } catch {
      /* length mismatch already excluded; ignore */
    }
  }
  return false;
}

function tagOf(tags: unknown): string {
  // Resend echoes tags as {kind: "…"} (object) — tolerate the [{name,value}]
  // array form too so a payload-shape change never drops the readout.
  let v: unknown = undefined;
  if (Array.isArray(tags)) {
    const hit = tags.find((t) => t && typeof t === "object" && (t as { name?: unknown }).name === "kind");
    v = hit ? (hit as { value?: unknown }).value : undefined;
  } else if (tags && typeof tags === "object") {
    v = (tags as { kind?: unknown }).kind;
  }
  return String(v ?? "email")
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .slice(0, 64);
}

function recipientOf(to: unknown): string {
  const first = Array.isArray(to) ? to[0] : to;
  const s = String(first ?? "").trim();
  return (s.match(/<([^>]+)>/)?.[1] ?? s).trim();
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET unset — refusing");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const raw = await req.text();
  const id = req.headers.get("svix-id");
  const ts = req.headers.get("svix-timestamp");
  const sig = req.headers.get("svix-signature");
  if (!id || !ts || !sig) return NextResponse.json({ ok: false }, { status: 401 });
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > TOLERANCE_S) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!verify(secret, id, ts, sig, raw)) return NextResponse.json({ ok: false }, { status: 401 });

  let body: { type?: string; data?: Record<string, unknown> };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const type = String(body?.type ?? "");
  const ev = type === "email.delivered" ? "delivered" : type === "email.opened" ? "open" : type === "email.clicked" ? "click" : null;
  if (!ev) return NextResponse.json({ ignored: type });

  const data = body.data ?? {};
  const tag = tagOf(data.tags);
  // The founder's wave copy is not a student touch.
  if (tag === "founder-copy") return NextResponse.json({ skipped: "founder-copy" });
  if (ev === "click") {
    const link = String((data.click as { link?: unknown } | undefined)?.link ?? "");
    // An unsubscribe tap or a one-click POST target is not engagement.
    if (link.includes("/unsubscribe") || link.includes("/api/")) return NextResponse.json({ skipped: "not-engagement" });
  }

  const addr = recipientOf(data.to);
  if (!addr) return NextResponse.json({ skipped: "no-recipient" });

  try {
    // We send User.email verbatim, so the exact match hits the unique
    // index; the lower() fallback covers a client that re-cased it.
    let users = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE email = ${addr} LIMIT 1`;
    if (users.length === 0) {
      users = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE lower(email) = lower(${addr}) LIMIT 1`;
    }
    const uid = users[0]?.id;
    if (!uid) return NextResponse.json({ skipped: "no-user" });

    const touch = `${ev}:${tag}`;
    const dup = await prisma.$queryRaw<{ one: number }[]>`
      SELECT 1 AS one FROM "EmailTouch"
      WHERE "userId" = ${uid} AND tag = ${touch} AND "sentAt" >= NOW() - INTERVAL '20 hours'
      LIMIT 1`;
    if (dup.length > 0) return NextResponse.json({ dup: true });

    await prisma.$executeRaw`
      INSERT INTO "EmailTouch" (id, "userId", tag) VALUES (${randomUUID()}, ${uid}, ${touch})`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[resend-webhook] write failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
