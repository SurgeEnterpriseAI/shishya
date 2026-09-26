// POST /api/chat — streaming chat with the AI tutor.
// Body: { examCode, sessionId?, message, lang?, retry?, turnId? }
//
// Returns a Server-Sent Events stream:
//   event: meta\ndata: {"sessionId":"..."}\n\n
//   event: delta\ndata: <text chunk>\n\n
//   event: done\ndata: {"messageId":"...","actions":[...]}\n\n
//   event: error\ndata: {"error":"<friendly text>","next":"/exams/..."}\n\n
//     (+ "code" when the chat has its own localised line for it — see
//     src/lib/chat-reply-status.ts; 25 Sep 2026: "still-answering")
// A signed-in turn that was already answered is replayed from the stored
// reply over the same events (done carries replayed: true) — see
// src/lib/chat-turn-dedupe.ts (24 Sep 2026). A turn whose row another run
// is still answering waits for that reply (up to 45 s; then an error event
// asks the student to Retry in a moment).

// Tool-use loops + long Anthropic streams need more than the default 10s. We
// keep this on Node runtime (not edge) because Prisma engines need it.
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { z } from "zod";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { realExamKey } from "@/lib/db/exam-scope";
import { ensureEnrollment } from "@/lib/db/enrollment";
import { tutorStream } from "@/lib/ai";
import { getStudentState } from "@/lib/db/student-state";
import { getStudentJourney } from "@/lib/db/student-journey";
import { getSyllabusContext } from "@/lib/db/syllabus";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";
import { classifyClient } from "@/lib/client-class";
import { CHAT_ERROR_CODE, CHAT_ERROR_COPY } from "@/lib/chat-reply-status";
import {
  decideTurn,
  replayFrames,
  REPLAY_WINDOW_MS,
  sameTurnText,
  settleWait,
  userTurnMeta,
  WAIT_FOR_ANSWER_MS,
  WAIT_POLL_MS,
  type StoredTurn,
  type TurnDecision,
  type UserTurnMeta,
} from "@/lib/chat-turn-dedupe";
import { locales } from "@/lib/i18n";
import { detectLanguageRequest, langToReplyLanguage, resolvePreferredLocale, TUTOR_LANG_COOKIE, tutorMessageFor } from "@/lib/preferred-lang";
import { schoolBandRequiredErrorFrame, schoolOnlyChatPath, schoolOnlyTutorErrorFrame, schoolStudentExamKey } from "@/lib/school/tutor-scope";
import { countSchoolTutorMessagesToday, getSchoolChapterFocus, getSchoolTutorContext } from "@/lib/school/tutor-context";
import { schoolCapFrames, schoolTutorCapReached, schoolUiLang } from "@/lib/school/tutor-cap";
import { isMinorBand, schoolBandOfProfile, schoolReturnPath, type SchoolBand } from "@/lib/school/student-classes";
import type { SchoolChapterFocus } from "@/lib/school/tutor-persona";

const Body = z
  .object({
    // examCode is required for the normal exam-scoped chat. Omitted (or
    // empty) when `general: true` — see chat/page.tsx ?general=1 route.
    examCode: z.string().min(1).optional(),
    general: z.boolean().optional(),
    sessionId: z.string().nullish(),
    message: z.string().min(1).max(2000),
    topicCode: z.string().nullish(),
    // Client-supplied recent history. Used ONLY for anonymous (signed-out)
    // chats, which aren't persisted server-side, so the client sends its
    // last few turns to keep the tutor multi-turn. Ignored for signed-in
    // users (their history comes from the DB ChatSession).
    history: z
      .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) }))
      .max(40)
      .optional(),
    // Explicit reply language for this turn (12 Sep 2026) — the "see
    // English" ability: the client sends lang:"en" to get an English reply
    // whatever the stored preference. A closed enum over the 19 i18n
    // locales, never free text, because the value lands in the prompt
    // line "Reply language: …". Absent → preferredLang (non-EN) > cookie
    // > en, see src/lib/preferred-lang.ts.
    lang: z.enum(locales as unknown as [string, ...string[]]).optional(),
    // The student pressed "Retry" on a turn that got no reply (24 Sep 2026).
    // Lets a signed-in conversation replay a reply that was stored but never
    // reached the screen; see src/lib/chat-turn-dedupe.ts.
    retry: z.boolean().optional(),
    // The client's id for this turn, the same on a Retry of it (24 Sep 2026
    // review). Stored on the signed-in USER row, so a Retry replays only the
    // reply to the turn that failed, never an earlier turn with the same text.
    turnId: z.string().min(1).max(64).optional(),
  })
  .refine((b) => b.general === true || (typeof b.examCode === "string" && b.examCode.length > 0), {
    message: "examCode is required when general is not true",
  });

/** Best-effort client IP for anonymous rate-limiting (Vercel sets x-forwarded-for). */
function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

const SSE_HEADERS = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  "x-accel-buffering": "no",
};

/** The signed-in USER row this request stored or re-sent, and the metadata written on it. */
interface TurnRow {
  id: string | null;
  meta: UserTurnMeta;
}

/**
 * Marks a signed-in turn failed (24 Sep 2026 review). An unanswered row with
 * no mark is taken to be still in flight for up to 5½ minutes, and a Retry
 * waits on it; with the mark, a Retry re-sends it at once. Best-effort.
 */
async function markTurnFailed(turn: TurnRow): Promise<void> {
  if (!turn.id) return;
  try {
    await prisma.chatMessage.update({
      where: { id: turn.id },
      data: { metadata: { ...turn.meta, failedAt: Date.now() } },
    });
  } catch (err) {
    console.error("[chat] could not mark the failed turn:", err);
  }
}

export async function POST(req: Request) {
  // A turn that throws after its USER row is stored (a DB timeout while the
  // context loads, before the stream starts) is marked failed too, so its
  // Retry is not left waiting on a run that no longer exists.
  const turn: TurnRow = { id: null, meta: {} };
  try {
    return await handleChat(req, turn);
  } catch (err) {
    await markTurnFailed(turn);
    throw err;
  }
}

async function handleChat(req: Request, turn: TurnRow): Promise<Response> {
  const session = await auth();
  // Ungated: the AI tutor is open to signed-out visitors too. `userId` is
  // null for anonymous callers; every account-dependent step below
  // (enrollment, persisted session/messages, personalized context, tools)
  // is branched on it. Anonymous chat is stateless + tools-off + scoped to
  // the exam syllabus only.
  const userId = session?.user?.id ?? null;
  // Pseudonymous anon id (shishya_anon cookie UUID) — used only to GROUP an
  // anonymous tutor conversation for product analysis. Not PII.
  const anonId = userId
    ? null
    : (req.headers.get("cookie") || "").match(/(?:^|;\s*)shishya_anon=([^;]+)/)?.[1] ?? null;

  // Crawlers off the guest tutor (24 Sep 2026). JS-running bots load the
  // /chat?seed=… links and the seed auto-fired a guest turn for them: ~188
  // guest-tutor AI replies in September went to crawlers. Signed-out only,
  // and before the rate limiter, DB and model: a signed-in student is never
  // judged by their user-agent.
  if (!userId && classifyClient(req.headers.get("user-agent")) === "bot") {
    return new Response(JSON.stringify({ error: "unavailable" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });
  }

  // Rate limit before any DB work. By user when signed in, else by a coarse
  // IP key so open tutor access can't be abused to burn Anthropic credits.
  const rl = await checkRateLimit("chat", userId ?? `anon:${clientIp(req)}`);
  if (!rl.ok) return rateLimited(rl);

  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // ── General mode (no exam scope) ──────────────────────────────────
  // Reached via the "General Interaction" tile or ?general=1. No exam,
  // no syllabus, no student-state, no journey injection — just a
  // direct Q&A with Shishya's persona + safety rules.
  const isGeneral = body.general === true;
  const examCodeForChat = isGeneral ? null : body.examCode!;

  // ── School tutor (26 Sep 2026) ────────────────────────────────────
  // A signed-in student of Class 8-12 may chat on their school container
  // (NCERT_C08..C12 / CISCE_C08..C12 — src/lib/school/tutor-scope.ts). The
  // container is read by category through src/lib/school/tutor-context.ts,
  // never through realExamKey(); for a guest, a Class 1-7 container or any
  // other code the key is null and the real-exam lookup below runs, under
  // which a school row is an unknown exam: 404, exactly as before.
  const schoolKey = schoolStudentExamKey({ code: examCodeForChat, userId });
  const schoolCtx = schoolKey ? await getSchoolTutorContext(schoolKey.code) : null;

  const exam: { id: string; code: string; category: string } | null = isGeneral
    ? null
    : schoolCtx
      ? schoolCtx.exam
      : await prisma.exam.findUnique({ where: realExamKey({ code: examCodeForChat! }) });
  if (!isGeneral && !exam) {
    return new Response(JSON.stringify({ error: "exam not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  // The signed-in account's profile, read once (26 Sep 2026 fixer review):
  // the school age band (src/lib/school/student-classes.ts — onbStage plus
  // the container code in onbPrepCodes, written once by the school profile
  // flow) gates the exam tutor just below and rides on a school turn;
  // preferredLang feeds the general / school prompt state further down.
  const profile = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { preferredLang: true, onbStage: true, onbPrepCodes: true } })
    : null;
  const schoolProfile = schoolBandOfProfile(profile);
  const jar = await cookies();

  // The one-time age band is a safety requirement (founder, 26 Sep 2026 —
  // integrator; src/lib/school/tutor-scope.ts says why): a school turn from
  // an account that has not declared it is refused with the localised line
  // and the page that asks — before the cap read, before any write, with no
  // model call — so the persona is never told a declaration that was not
  // made. /chat shows its band card first; this is the rule for a direct call.
  if (schoolCtx && userId && !schoolProfile?.band) {
    return new Response(
      schoolBandRequiredErrorFrame(schoolReturnPath(schoolCtx.scope.classPath), schoolUiLang(jar.get("shishya-lang")?.value)),
      { headers: SSE_HEADERS },
    );
  }

  // The school tutor's daily cap (src/lib/school/tutor-cap.ts): 20 USER
  // messages per account per IST day, counted from the stored rows of the
  // account's school sessions — checked before anything is written or asked
  // of the model. Over it, the friendly end-of-day line streams as a reply
  // in the site UI language and the chat disables its composer.
  if (schoolCtx && userId) {
    const usedToday = await countSchoolTutorMessagesToday(userId);
    if (schoolTutorCapReached(usedToday)) {
      return new Response(schoolCapFrames(body.sessionId ?? null, schoolUiLang(jar.get("shishya-lang")?.value)), {
        headers: SSE_HEADERS,
      });
    }
  }

  // A declared 13-17 student gets the school tutor ONLY (26 Sep 2026 fixer
  // review — src/lib/school/tutor-scope.ts says why): a general or real-exam
  // turn from such an account is refused here with the localised line and
  // the way to its class chat — before enrolment (a real-exam turn used to
  // enrol the child on that exam), before any write, and with no model call.
  // /chat sends the account to the same place; this is the rule for a direct
  // call. Adult school bands (18+, parent, teacher) keep the exam tutor.
  if (userId && !schoolCtx && schoolProfile && isMinorBand(schoolProfile.band)) {
    return new Response(
      schoolOnlyTutorErrorFrame(schoolOnlyChatPath(schoolProfile.classCodes, examCodeForChat), schoolUiLang(jar.get("shishya-lang")?.value)),
      { headers: SSE_HEADERS },
    );
  }
  // Where an error event sends the student back to: a school chat to its
  // class page (or the chapter, once known), an exam chat to its hub.
  const backPath = schoolCtx ? schoolCtx.scope.classPath : examCodeForChat ? `/exams/${examCodeForChat}` : "/exams";

  // Signed-in only: track enrollment for the exam they're chatting about.
  // 26 Sep 2026: `exam` came through realExamKey() (a school container is
  // 404 above, exactly like an unknown code) and the upsert goes through the
  // one enrolment door, so a child's class never enters the mail loops here.
  // A school chat (schoolCtx) enrols nobody: the student's class enrolment
  // belongs to the school profile flow (src/lib/school/student-db.ts), not
  // to the chat.
  if (exam && userId && !schoolCtx) {
    await ensureEnrollment(userId, exam);
  }

  // Persisted chat session — signed-in only. ChatSession.userId is
  // required, so anonymous chats aren't stored: they get a throwaway
  // session id and their recent turns ride in the request body instead.
  let chatSession =
    userId && body.sessionId
      ? await prisma.chatSession.findUnique({ where: { id: body.sessionId } })
      : null;
  if (chatSession && chatSession.userId !== userId) chatSession = null;
  // The conversation the client named must be of THIS turn's scope — the
  // same school container, the same exam, or general (examId null) — 26 Sep
  // 2026 fixer review. The school daily cap counts USER rows on SCHOOL
  // sessions only (countSchoolTutorMessagesToday), so a school turn carried
  // into a general or exam session by its sessionId would never count and
  // the cap could be walked around with one request field; the reverse put
  // an exam turn's rows under the cap. A session of another scope is dropped
  // and a fresh one of the right scope is created below. The chat island only
  // ever sends the id its own page's meta event gave it, so nothing a student
  // does in the UI is dropped.
  if (chatSession && chatSession.examId !== (exam?.id ?? null)) chatSession = null;

  // The LAST 30 turns of a conversation, oldest-first. (Was asc/take 30 =
  // the FIRST 30 turns of the session: long sessions lost their recent
  // turns and re-sent the same stale head every time.)
  const lastTurns = async (sessionId: string) =>
    (
      await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: "desc" },
        take: 30, // cap context
      })
    ).reverse();
  let rows = userId && chatSession ? await lastTurns(chatSession.id) : [];

  // Duplicate and failed turns (24 Sep 2026) — signed-in only, decided
  // before anything is written; rules and September numbers in
  // src/lib/chat-turn-dedupe.ts. A conversation the client named is judged
  // on its own latest USER row; a fresh chat on the student's latest message
  // of the last 10 minutes in a conversation of the same exam scope.
  // Review, same day: a fresh-chat repeat is not replayed when an attempt was
  // started or finished since it was sent — the stored reply would describe
  // the student's older record (24 of 308 would-be replays in Aug–Sep).
  let decision: TurnDecision = { kind: "new" };
  if (userId) {
    let latestUser: StoredTurn | null = null;
    let next: StoredTurn | null = null;
    let stateChanged = false;
    if (chatSession) {
      const i = rows.map((r) => r.role).lastIndexOf("USER");
      if (i >= 0) {
        latestUser = rows[i];
        next = rows[i + 1] ?? null;
      }
    } else {
      const recent = await prisma.chatMessage.findFirst({
        where: {
          role: "USER",
          createdAt: { gte: new Date(Date.now() - REPLAY_WINDOW_MS) },
          session: { userId, examId: exam?.id ?? null },
        },
        orderBy: { createdAt: "desc" },
      });
      if (recent && sameTurnText(recent.content, body.message)) {
        latestUser = recent;
        const since = recent.createdAt;
        [next, stateChanged] = await Promise.all([
          prisma.chatMessage.findFirst({
            where: { sessionId: recent.sessionId, createdAt: { gt: since } },
            orderBy: { createdAt: "asc" },
          }),
          prisma.attempt
            .findFirst({
              where: { userId, OR: [{ startedAt: { gt: since } }, { finishedAt: { gt: since } }] },
              select: { id: true },
            })
            .then((a) => a != null),
        ]);
      }
    }
    decision = decideTurn({
      message: body.message,
      continuing: chatSession != null,
      retry: body.retry === true,
      turnId: body.turnId ?? null,
      stateChanged,
      latestUser,
      next,
    });
  }

  // Another run may still be answering that very row: the student's
  // connection dropped mid-answer (the server carries on and stores the
  // reply) and they pressed Retry, or a second tab re-sent the seed. Wait for
  // that reply instead of paying the model twice and storing two replies
  // (24 Sep 2026 review). The student sees "Thinking…" meanwhile.
  if (decision.kind === "wait") {
    const waitingOn = decision.userRowId;
    const deadline = Date.now() + WAIT_FOR_ANSWER_MS;
    while (decision.kind === "wait" && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, WAIT_POLL_MS));
      const row = await prisma.chatMessage.findUnique({ where: { id: waitingOn } });
      const after = row
        ? await prisma.chatMessage.findFirst({
            where: { sessionId: row.sessionId, createdAt: { gt: row.createdAt } },
            orderBy: { createdAt: "asc" },
          })
        : null;
      decision = settleWait(row, after, Date.now());
    }
    if (decision.kind === "wait") {
      // No meta frame: the chat stays where it was, and Retry asks again.
      // The English line goes with a stable code, and the chat shows its own
      // en/hi/te line for that code (25 Sep 2026 — this was English-only in a
      // localised chat); src/lib/chat-reply-status.ts.
      const code = CHAT_ERROR_CODE.stillAnswering;
      const error = CHAT_ERROR_COPY[code].en;
      return new Response(
        `event: error\ndata: ${JSON.stringify({ error, code, next: backPath })}\n\n`,
        { headers: SSE_HEADERS },
      );
    }
    // The conversation may have moved on while this turn waited.
    if (chatSession) rows = await lastTurns(chatSession.id);
  }

  // Already answered: the stored reply again, over the same events — no
  // model call, nothing written, and the chat carries on in that conversation.
  if (decision.kind === "replay") {
    return new Response(replayFrames(decision.sessionId, decision.reply).join(""), {
      headers: SSE_HEADERS,
    });
  }
  // A failed turn sent again from a fresh chat: continue in its conversation.
  if (decision.kind === "reuse" && chatSession?.id !== decision.sessionId) {
    chatSession = await prisma.chatSession.findUnique({ where: { id: decision.sessionId } });
    rows = chatSession ? await lastTurns(chatSession.id) : [];
  }
  const reusedRowId = decision.kind === "reuse" && chatSession ? decision.userRowId : null;

  if (userId && !chatSession) {
    chatSession = await prisma.chatSession.create({
      data: {
        userId,
        // examId is nullable in the schema — null = general-mode session.
        examId: exam?.id ?? null,
      },
    });
  }
  const sessionIdOut = chatSession?.id ?? "anon";

  // History — normalised to {role, content}. From the DB for signed-in
  // users; from the client body for anonymous ones (their turns aren't
  // persisted, so the client replays its last few for multi-turn). A reused
  // USER row is this turn's own message, so it stays out of the history.
  const history: { role: "user" | "assistant"; content: string }[] =
    userId && chatSession
      ? rows
          .filter((m) => m.id !== reusedRowId)
          .map((m) => ({
            role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
            content: m.content,
          }))
      : (body.history ?? []).slice(-12);
  // The Messages API requires the first turn to be a user turn. A failed
  // reply leaves an unpaired USER row, so a 30-newest window can start on
  // an ASSISTANT row — trim leading assistant turns.
  while (history.length && history[0].role === "assistant") history.shift();

  // Persist the user's message (signed-in only) — unless this turn reuses
  // the stored row of a failed attempt at the same message. The row carries
  // the client's turnId (a Retry is matched by it); a reused row is stamped
  // answeringAt and loses its failed mark, so a second Retry during this run
  // waits for it instead of starting another (24 Sep 2026 review).
  if (userId && chatSession) {
    if (reusedRowId) {
      const turnId = body.turnId ?? userTurnMeta(rows.find((r) => r.id === reusedRowId)?.metadata).turnId;
      turn.id = reusedRowId;
      turn.meta = { ...(turnId ? { turnId } : {}), answeringAt: Date.now() };
      await prisma.chatMessage.update({ where: { id: reusedRowId }, data: { metadata: { ...turn.meta } } });
    } else {
      turn.meta = body.turnId ? { turnId: body.turnId } : {};
      const created = await prisma.chatMessage.create({
        data: {
          sessionId: chatSession.id,
          role: "USER",
          content: body.message,
          ...(body.turnId ? { metadata: { turnId: body.turnId } } : {}),
        },
      });
      turn.id = created.id;
    }
  }

  // Exam-scoped context. The syllabus loads for EVERYONE with an exam so
  // even the anonymous tutor stays scoped to the right syllabus; the
  // personalized state + journey load only for signed-in users (anon has
  // no account data). With connection_limit=5 on the pooled DB URL these
  // fan out in parallel without overflowing the 10s pool timeout.
  // 26 Sep 2026: a school chat has no student state or journey (no mocks,
  // mastery or briefs for a class); its syllabus is the class, built by the
  // school context loader, and the real-exam-keyed getStudentState /
  // getStudentJourney are never called for it.
  const [studentState, syllabus, journey] = exam
    ? schoolCtx
      ? ([null, schoolCtx.syllabus, null] as const)
      : await Promise.all([
          userId ? getStudentState(userId, examCodeForChat!) : Promise.resolve(null),
          getSyllabusContext(examCodeForChat!),
          userId ? getStudentJourney(userId, examCodeForChat!) : Promise.resolve(null),
        ])
    : ([null, null, null] as const);

  // For general / anonymous chats we need a minimal StudentState for the
  // tutor's prompt-builder (it needs preferredLang at minimum). Build one
  // from the User row (read once above) when signed in; anon defaults to EN.
  let generalStudentState = studentState;
  // 26 Sep 2026: the school tutor also carries the account's declared age
  // band (schoolProfile above) in its turn context; /chat shows the band
  // card until it exists.
  let band: SchoolBand | null = null;
  if (!generalStudentState) {
    if (schoolCtx) band = schoolProfile?.band ?? null;
    generalStudentState = {
      userId: userId ?? "anon",
      examCode: "",
      examName: "",
      preferredLang: (profile?.preferredLang ?? "EN") as any,
      enrolledAt: new Date().toISOString(),
      weaknesses: [],
      strengths: [],
      totalMocksTaken: 0,
    };
  }

  // Reply language (12 Sep 2026): explicit body.lang > stored non-EN
  // preferredLang > shishya-lang cookie > en. Until this wave every turn —
  // Devanagari input included — told the tutor "Reply language: EN",
  // because the column defaulted to EN for everyone and the cookie was
  // never read here. Enum code when the locale has one ("HI"), else the
  // locale itself ("kok") — same contract as /api/explain.
  //
  // 15 Sep 2026: a language asked for in the message itself ("Marathi",
  // "hindi me btao", "explain in telugu") is the most explicit choice of all
  // (a student typing "Marathi" was told "I'll reply in English from now on").
  // It is remembered for the tutor alone, in its own cookie, so the site's
  // interface language does not change under the student.
  const cookieLang = jar.get("shishya-lang")?.value ?? null;
  const tutorLang = jar.get(TUTOR_LANG_COOKIE)?.value ?? null;
  const requestedLang = detectLanguageRequest(body.message);
  if (requestedLang) {
    jar.set(TUTOR_LANG_COOKIE, requestedLang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  const replyLanguage = langToReplyLanguage(
    resolvePreferredLocale({
      explicit: requestedLang ?? body.lang ?? tutorLang,
      preferredLang: generalStudentState.preferredLang,
      cookie: cookieLang,
    }),
  ) as any;

  // If the chat was opened from a study-notes page (topicCode in URL), grab
  // the topic record + a short slice of its notes. The tutor uses this as
  // a focus anchor so it teaches the topic the student is actively reading
  // rather than reverting to generic exam-level chat.
  let topicFocus: {
    code: string;
    name: string;
    subjectName: string;
    notesExcerpt: string | null;
  } | null = null;
  // 26 Sep 2026: a school chat's focus is the chapter — code, Shishya page,
  // official link, our own notes — from src/lib/school/tutor-context.ts,
  // never this exam-page topic read.
  let schoolFocus: SchoolChapterFocus | null = null;
  if (schoolCtx && body.topicCode) {
    schoolFocus = await getSchoolChapterFocus(schoolCtx.exam.code, body.topicCode);
  }
  if (exam && !schoolCtx && body.topicCode) {
    const topic = await prisma.topic.findFirst({
      where: { code: body.topicCode, subject: { examId: exam.id } },
      select: {
        code: true,
        name: true,
        teachingNote: { select: { content: true } },
        subject: { select: { name: true } },
      },
    });
    if (topic) {
      const notes = topic.teachingNote?.content ?? null;
      topicFocus = {
        code: topic.code,
        name: topic.name,
        subjectName: topic.subject.name,
        // Cap notes excerpt at ~1.5k chars so we stay well under prompt budget.
        notesExcerpt: notes ? notes.slice(0, 1500) : null,
      };
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // A student who leaves mid-answer cancels this stream, and enqueue then
      // throws — which aborted the turn before its reply was stored (one more
      // "no reply" row, and the next load paid for the answer again). Frames
      // for a reader that has gone are dropped; the turn still finishes and
      // is stored (24 Sep 2026).
      const emit = (frame: string) => {
        try {
          controller.enqueue(encoder.encode(frame));
        } catch {
          /* reader gone */
        }
      };
      let full = "";
      let anonLogged = false;
      try {
        // Header line so the client knows the session id
        emit(`event: meta\ndata: ${JSON.stringify({ sessionId: sessionIdOut })}\n\n`);

        const ai = tutorStream({
          studentState: generalStudentState,
          // Use empty syllabus for general mode — tutor.ts skips the
          // syllabus block when subjects is empty.
          syllabus: syllabus ?? {
            examCode: "",
            examName: "General",
            examShortName: "General",
            subjects: [],
          },
          // history is already normalised to {role, content}.
          history,
          // A bare language name after an answer means "say that again in X"
          // (stored as typed; only the model sees the explicit request).
          userMessage: tutorMessageFor(body.message, history.some((t) => t.role === "assistant")),
          language: replyLanguage,
          topicFocus: topicFocus ?? undefined,
          journey: journey ?? undefined,
          generalMode: isGeneral,
          // 26 Sep 2026: the school persona, class block, chapter focus and
          // declared band (src/lib/school/tutor-persona.ts); tools stay off.
          school: schoolCtx ? { scope: schoolCtx.scope, focus: schoolFocus, band } : undefined,
          // Tool use needs an exam scope AND a signed-in user to look up
          // the student's mastery / attempts. General mode, anonymous and
          // school chats pass no ctx, so the tutor goes tools-off and answers
          // from the syllabus + its own knowledge.
          ctx:
            examCodeForChat && userId && !schoolCtx
              ? { userId, examCode: examCodeForChat }
              : undefined,
        });

        let actions: any = undefined;
        const toolCalls: any[] = [];
        for await (const chunk of ai) {
          if ("delta" in chunk) {
            full += chunk.delta;
            emit(`event: delta\ndata: ${JSON.stringify(chunk.delta)}\n\n`);
          } else if ("tool" in chunk) {
            toolCalls.push(chunk.tool);
            emit(`event: tool\ndata: ${JSON.stringify(chunk.tool)}\n\n`);
          } else if ("done" in chunk) {
            actions = chunk.done.suggestedActions;
          }
        }

        // Persist the assistant turn — signed-in only (full ChatMessage).
        let messageId = "anon";
        if (userId && chatSession) {
          const saved = await prisma.chatMessage.create({
            data: {
              sessionId: chatSession.id,
              role: "ASSISTANT",
              content: full,
              metadata: { actions: actions ?? null, toolCalls },
            },
          });
          messageId = saved.id;
        } else if (!userId) {
          // Anonymous tutor turn — log it (pseudonymous anonId, capped text)
          // so the ungated-tutor experience is analysable. Best-effort.
          anonLogged = true;
          try {
            await prisma.anonTutorLog.create({
              data: {
                anonId,
                examCode: examCodeForChat ?? null,
                userMessage: body.message.slice(0, 2000),
                reply: full.slice(0, 1500),
                replyChars: full.length,
              },
            });
          } catch (err) {
            console.error("[chat] anon tutor log failed:", err);
          }
        }

        emit(
          `event: done\ndata: ${JSON.stringify({
            messageId,
            actions: actions ?? [],
            toolCalls,
          })}\n\n`
        );
      } catch (err: any) {
        // Never leak upstream internals (API billing/limits errors etc.) to
        // students — we once streamed a raw "credit balance is too low"
        // Anthropic error into the chat UI. Log the real thing, say
        // something human.
        console.error("[chat] tutor stream failed:", err);
        const raw = String(err?.message ?? err);
        // An outage must not end a new student's first session (16 Sep 2026:
        // signups during the 11-13 Sep credit outages came back at half the
        // usual rate). The practice pages need no AI, so name one.
        // 26 Sep 2026: a school student is sent back to the chapter (or class)
        // page, whose notes and practice need no AI — never to an /exams page.
        const practice = schoolCtx
          ? ` Meanwhile the chapter's notes and practice are open at https://shishya.in${schoolFocus?.path ?? backPath}`
          : examCodeForChat
          ? ` Meanwhile you can still practise without the tutor: free questions and mocks at https://shishya.in/exams/${examCodeForChat}`
          : " Meanwhile you can still practise without the tutor: pick your exam at https://shishya.in/exams and take a free quiz or mock.";
        const friendly = /credit balance|billing|invalid_request_error/i.test(raw)
          ? `Shishya's tutor is briefly unavailable. Please try again in a little while.${practice}`
          : /overloaded|rate.?limit|429|529/i.test(raw)
            ? "Shishya is helping a lot of students right now — please try again in a minute."
            : "Something went wrong on our side — please try sending that again.";
        // Signed-in: mark the USER row failed BEFORE the student sees the
        // error, so a quick Retry re-sends it rather than waiting on it as if
        // this run were still answering (24 Sep 2026 review).
        if (userId) await markTurnFailed(turn);
        emit(`event: error\ndata: ${JSON.stringify({ error: friendly, next: schoolFocus?.path ?? backPath })}\n\n`);
        // A failed guest turn is logged too, with no reply (24 Sep 2026) —
        // failed guest asks used to vanish, so guest failures could not be
        // counted. Same best-effort rule as a successful turn; the student sees
        // the error first.
        if (!userId && !anonLogged) {
          try {
            await prisma.anonTutorLog.create({
              data: {
                anonId,
                examCode: examCodeForChat ?? null,
                userMessage: body.message.slice(0, 2000),
                reply: full ? full.slice(0, 1500) : null,
                replyChars: full.length,
              },
            });
          } catch (logErr) {
            console.error("[chat] anon tutor log failed:", logErr);
          }
        }
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed by a reader that left */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
