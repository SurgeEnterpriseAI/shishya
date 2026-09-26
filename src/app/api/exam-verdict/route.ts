// /api/exam-verdict — the exam-day "How was the paper?" poll (6 Sep 2026,
// Exam Week Mode).
//
//   POST { examCode, examDate: "YYYY-MM-DD", verdict: EASY|MODERATE|TOUGH, section? }
//        → 200 { ok: true, tally }
//   GET  ?exam=CODE&date=YYYY-MM-DD
//        → 200 { n, easy, moderate, tough, sections: [{ label, n }] }
//
// Below the n >= VERDICT_MIN_N floor both responses carry only n — the
// split and the section votes are zeroed (publicTally) so nobody can read
// a "prediction" out of three votes.
//
// Identity: session userId, else the shishya_anon cookie (the analytics
// beacon's 30-day UUID). A browser without the cookie gets one issued here
// the same way /api/analytics issues it, so a first-visit student on exam
// night can still vote; automation user-agents never get an identity.
// One vote per identity per exam day — re-voting upserts. Never requires
// login. Rate-limited on the "verdict" bucket. No model calls.

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { auth } from "@/lib/auth";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { istDay } from "@/lib/exam-week";
import {
  ISO_DAY_RE,
  SECTION_MAX_LEN,
  examDateFromIso,
  getVerdictTally,
  isVerdict,
  publicTally,
  upsertVerdict,
} from "@/lib/exam-verdict";

export const runtime = "nodejs";

const ANON_COOKIE = "shishya_anon";
const ANON_MAX_AGE_S = 30 * 24 * 3600;
const EXAM_CODE_RE = /^[A-Z0-9_]{2,40}$/;

// Same automation signature /api/analytics uses: a crawler never earns an
// identity, so it can never seed a tally.
const BOT_UA =
  /bot|crawl|spider|slurp|headless|phantomjs|puppeteer|playwright|selenium|scrapy|curl|wget|python-requests|python-httpx|aiohttp|axios|node-fetch|okhttp|java\/|go-http|libwww|lighthouse|pagespeed|gtmetrix|ahrefs|semrush|mj12|dotbot|petalbot|bytespider|dataforseo|screaming.?frog|netcraft|facebookexternalhit|preview|monitoring|uptime|pingdom|statuscake/i;

function isBot(ua: string | null): boolean {
  return !ua || ua.trim().length < 15 || BOT_UA.test(ua);
}

/** A vote is accepted for exam days from 10 days ago up to tomorrow (IST)
 *  — the window/post phases plus the day-after mail link. Anything else
 *  is a stale link or garbage. */
function withinVotingWindow(examDateIso: string, now = new Date()): boolean {
  const today = Date.parse(istDay(now) + "T00:00:00Z");
  const day = Date.parse(examDateIso + "T00:00:00Z");
  const diff = Math.round((day - today) / 86_400_000);
  return diff >= -10 && diff <= 1;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("exam") ?? "";
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!EXAM_CODE_RE.test(code) || !examDateFromIso(date)) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  const exam = await prisma.exam.findUnique({ where: realExamKey({ code }), select: { id: true } }).catch(() => null);
  if (!exam) return NextResponse.json({ error: "unknown exam" }, { status: 404 });
  const tally = publicTally(await getVerdictTally(exam.id, date));
  return NextResponse.json(tally, {
    headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}

export async function POST(req: NextRequest) {
  let body: { examCode?: unknown; examDate?: unknown; verdict?: unknown; section?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const examCode = typeof body.examCode === "string" ? body.examCode : "";
  const examDate = typeof body.examDate === "string" ? body.examDate : "";
  const verdict = body.verdict;
  if (!EXAM_CODE_RE.test(examCode) || !ISO_DAY_RE.test(examDate) || !examDateFromIso(examDate) || !isVerdict(verdict)) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
  if (!withinVotingWindow(examDate)) {
    return NextResponse.json({ error: "voting closed for this exam day" }, { status: 400 });
  }
  // section: undefined = untouched, "" / null = clear, text = set.
  const section =
    body.section === undefined
      ? undefined
      : typeof body.section === "string"
        ? body.section.trim().slice(0, SECTION_MAX_LEN) || null
        : null;

  // Identity — signed-in userId, else the anon cookie, else issue one
  // (browser UA only). The DB unique on (examId, examDate, identityKey)
  // makes the vote idempotent per identity.
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const cookieAnon = req.cookies.get(ANON_COOKIE)?.value?.slice(0, 64) || null;
  let issuedAnon: string | null = null;
  if (!userId && !cookieAnon) {
    if (isBot(req.headers.get("user-agent"))) {
      return NextResponse.json({ error: "no identity" }, { status: 400 });
    }
    issuedAnon = crypto.randomUUID();
  }
  const identityKey = userId ?? cookieAnon ?? issuedAnon!;

  const rl = await checkRateLimit("verdict", userId ?? `anon:${identityKey}`);
  if (!rl.ok) return rateLimited(rl);
  // A cookie-less client mints a fresh identity per request, so the
  // per-identity bucket alone would never fill: also limit issuance per IP.
  if (issuedAnon) {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const rlIp = await checkRateLimit("verdict", `ip:${ip}`);
    if (!rlIp.ok) return rateLimited(rlIp);
  }

  const exam = await prisma.exam
    .findUnique({ where: realExamKey({ code: examCode }), select: { id: true, active: true } })
    .catch(() => null);
  if (!exam || !exam.active) return NextResponse.json({ error: "unknown exam" }, { status: 404 });

  // The hardest-section label must be one of the exam's own subjects —
  // it is echoed into context.md / llms-full.txt, so never free text.
  let sectionChecked = section;
  if (typeof section === "string") {
    const subjects = await prisma.subject
      .findMany({ where: { examId: exam.id }, select: { name: true } })
      .catch(() => [] as { name: string }[]);
    const match = subjects.find((s) => s.name.trim().toLowerCase() === section.toLowerCase());
    sectionChecked = match ? match.name : null;
  }

  try {
    await upsertVerdict({ examId: exam.id, examDateIso: examDate, identityKey, verdict, section: sectionChecked });
  } catch (err) {
    console.error("[exam-verdict] upsert failed:", err);
    return NextResponse.json({ error: "could not save" }, { status: 500 });
  }

  const tally = publicTally(await getVerdictTally(exam.id, examDate));
  const res = NextResponse.json({ ok: true, tally });
  if (issuedAnon) {
    res.cookies.set(ANON_COOKIE, issuedAnon, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ANON_MAX_AGE_S,
      path: "/",
    });
  }
  return res;
}
