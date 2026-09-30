// POST /api/chat — streaming chat with the AI tutor.
// Body: { examCode, sessionId?, message, lang?, retry?, turnId?, reviewAttemptId? }
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
// Every turn first passes the study-only pre-filter (27 Sep 2026,
// src/lib/chat-scope.ts): distress and obvious unsafe or injection asks get
// a fixed reply (delta + done with a "scope-…" code) and never reach the
// model.
// 1 Oct 2026 (the 30 Sep credit outage: 12 member questions failed, none
// ever answered): a turn that fails because the AI was unavailable (credit,
// auth, overload, rate limit, 5xx, timeout — src/lib/ai/tutor-failure.ts)
// gets the honest line with a "tutor-unavailable…" code
// (src/lib/tutor-unavailable.ts): a member's question is saved and answered
// here later by /api/cron/tutor-answer-later ("and email you" only when the
// account can receive our mails — src/lib/db/tutor-answer-email.ts); a
// guest's is kept in the browser by the chat. The failed row records why
// (failedReason), the promise (latePromised) and what the late answer needs
// (replyLang, topicCode); the promise is shown only when that mark landed.
// A Retry never overwrites a row the late run holds or has answered (it
// waits for that reply). The turn's context is loaded by
// src/lib/tutor-turn.ts, which the late answer shares.

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
import { historyFromRows, loadTutorTurnContext, tutorStreamArgs, type TutorTurnScope } from "@/lib/tutor-turn";
import { classifyTutorFailure } from "@/lib/ai/tutor-failure";
import { isAiUnavailable, tutorUnavailableCode, tutorUnavailableState, tutorUnavailableText, type TutorFailReason } from "@/lib/tutor-unavailable";
import { tutorAnswerEmailable } from "@/lib/db/tutor-answer-email";
import { LATE_CLAIM_STALE_MS } from "@/lib/tutor-late-answer";
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
import { detectLanguageRequest, langToReplyLanguage, resolvePreferredLocale, TUTOR_LANG_COOKIE } from "@/lib/preferred-lang";
import { schoolOnlyChatPath, schoolOnlyTutorErrorFrame, schoolStudentExamKey } from "@/lib/school/tutor-scope";
import { countSchoolTutorMessagesToday, getSchoolTutorContext } from "@/lib/school/tutor-context";
import { schoolCapFrames, schoolTutorCapReached, schoolUiLang } from "@/lib/school/tutor-cap";
import { isMinorBand, schoolBandOfProfile } from "@/lib/school/student-classes";
import { chatScopeReply, chatScopeFrames, CHAT_SCOPE_CODE } from "@/lib/chat-scope";
import { reviewSnapshot, shouldTouchSession, type ReviewTag } from "@/lib/recent-chats";

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
    // 30 Sep 2026: the attempt a results-page "Explain my mistakes" seed
    // reviews. Sent only with that seed's own turn; when it starts a new
    // conversation of the student's own attempt on this exam, the
    // conversation is tagged with it (contextSnapshot), so the results page
    // can reopen the review later (src/lib/db/recent-chats.ts).
    reviewAttemptId: z.string().min(1).max(64).optional(),
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

/** What a failed turn's row records beside failedAt (1 Oct 2026, src/lib/tutor-late-answer.ts). */
interface FailedTurnExtra {
  /** Why it failed — read by the late answer and future reads. */
  failedReason: TutorFailReason;
  /**
   * The chat told the student this question will be answered here later.
   * Only ever written as true, and the write merges, so a promise once made
   * stays (a later Retry that fails for another reason does not undo it).
   */
  latePromised?: true;
  /** The reply language this turn resolved (the late answer replies in it). */
  replyLang?: string;
  /** The topic / chapter the chat was opened on (the late answer's focus). */
  topicCode?: string;
  /** The chat promised an email for this turn. */
  emailPromised?: boolean;
}

/**
 * Marks a signed-in turn failed (24 Sep 2026 review). An unanswered row with
 * no mark is taken to be still in flight for up to 5½ minutes, and a Retry
 * waits on it; with the mark, a Retry re-sends it at once. Best-effort.
 * 1 Oct 2026: with why it failed and what a late answer needs. The write
 * MERGES into the row's metadata (it used to replace it), so the late-answer
 * fields (lateTries, latePromised) survive a Retry that fails again; and it
 * says whether it landed — the late answer only picks a row that carries
 * failedAt, so the chat promises one only when this returns true (1 Oct 2026
 * review: the promise was made even when this write had failed).
 */
async function markTurnFailed(turn: TurnRow, extra: FailedTurnExtra): Promise<boolean> {
  if (!turn.id) return false;
  try {
    const patch = { ...turn.meta, failedAt: Date.now(), ...extra };
    const n = await prisma.$executeRaw`
      UPDATE "ChatMessage"
      SET metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb
      WHERE id = ${turn.id}`;
    return n === 1;
  } catch (err) {
    console.error("[chat] could not mark the failed turn:", err);
    return false;
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
    await markTurnFailed(turn, { failedReason: classifyTutorFailure(err) });
    throw err;
  }
}

async function handleChat(req: Request, turn: TurnRow): Promise<Response> {
  const session = await auth();
  // Ungated: the AI tutor is open to signed-out visitors too. `userId` is
  // null for anonymous callers; every account-dependent step below
  // (enrollment, persisted session/messages, personalized context, tools)
  // is branched on it. Anonymous chat is stateless + tools-off and scoped to
  // the exam's syllabus, the class (Class 8-12 school chat, 27 Sep 2026) or
  // general study; the study-only pre-filter and the scope rules hold for
  // every caller.
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
  // /chat and ?general=1 with no exam named (27 Sep 2026: the default chat,
  // for any study question — school, entrance and government exams,
  // college, scholarships, careers). No exam, no syllabus, no student-state
  // — Shishya's persona, scope and safety rules plus the general-mode note
  // (src/lib/ai/prompts.ts GENERAL_MODE_NOTE). 30 Sep 2026: a signed-in
  // general chat does get the journey (the student's own earlier questions).
  const isGeneral = body.general === true;
  const examCodeForChat = isGeneral ? null : body.examCode!;

  // ── School tutor (26 Sep 2026) ────────────────────────────────────
  // A Class 8-12 chat runs on its school container (NCERT_C08..C12 /
  // CISCE_C08..C12 — src/lib/school/tutor-scope.ts), guest or signed in
  // since 27 Sep 2026. The container is read by category through
  // src/lib/school/tutor-context.ts, never through realExamKey(); for a
  // Class 1-7 container or any other code the key is null and the real-exam
  // lookup below runs, under which a school row is an unknown exam: 404,
  // exactly as before.
  // School container (27 Sep 2026: guests too — founder, content first). Pure; the class loads below.
  const schoolKey = schoolStudentExamKey({ code: examCodeForChat });
  const jar = await cookies();
  // Study-only pre-filter (27 Sep 2026) — the /ask checks, before any DB work or model call: distress gets the helplines (Tele-MANAS 14416, Childline 1098, 112), obvious unsafe or injection asks get the one-line study-only answer. Nothing is stored for a member; a guest turn is logged like any guest turn.
  const scopeReply = chatScopeReply(body.message, schoolUiLang(jar.get("shishya-lang")?.value));
  if (scopeReply) {
    // A child who says they are under 13 leaves nothing behind (27 Sep 2026, founder: below 13, no data).
    if (!userId && scopeReply.code !== CHAT_SCOPE_CODE.under13) {
      try {
        await prisma.anonTutorLog.create({ data: { anonId: schoolKey ? null : anonId, examCode: examCodeForChat ?? null, userMessage: body.message.slice(0, 2000), reply: scopeReply.text.slice(0, 1500), replyChars: scopeReply.text.length } });
      } catch (err) { console.error("[chat] anon tutor log failed:", err); }
    }
    return new Response(chatScopeFrames(scopeReply), { headers: SSE_HEADERS });
  }
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
  // a school age band stored before 27 Sep 2026 (src/lib/school/student-classes.ts
  // — onbStage plus the container code in onbPrepCodes) still keeps a
  // declared 13-17 account on the school tutor just below and rides on a
  // school turn; preferredLang feeds the general / school prompt state
  // further down.
  // 27 Sep 2026 (founder, content first): no band is asked or required. A
  // school turn with no stored band — a guest, or an account that never
  // declared one — is served with the school persona's safeguards (the
  // persona treats the person as a student aged 13 to 17).
  const profile = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { preferredLang: true, onbStage: true, onbPrepCodes: true } })
    : null;
  const schoolProfile = schoolBandOfProfile(profile);

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
  // A guest's school turns (27 Sep 2026): the same daily cap, per browser (the analytics cookie) or else per IP, before any model call.
  if (schoolCtx && !userId) {
    const g = await checkRateLimit("schoolGuest", anonId ? `anon:${anonId}` : `anonip:${clientIp(req)}`);
    if (!g.ok) return new Response(schoolCapFrames(null, schoolUiLang(jar.get("shishya-lang")?.value)), { headers: SSE_HEADERS });
  }

  // A declared 13-17 student gets the school tutor ONLY (26 Sep 2026 fixer
  // review — src/lib/school/tutor-scope.ts says why; since 27 Sep 2026 only
  // for accounts that stored the band before then): a general or real-exam
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
  // class page (or the chapter, once known), an exam chat to its hub, a
  // general chat to the home page (27 Sep 2026: every section starts there).
  const backPath = schoolCtx ? schoolCtx.scope.classPath : examCodeForChat ? `/exams/${examCodeForChat}` : "/";

  // Signed-in only: track enrollment for the exam they're chatting about.
  // 26 Sep 2026: `exam` came through realExamKey() (a school container is
  // 404 above, exactly like an unknown code) and the upsert goes through the
  // one enrolment door, so a child's class never enters the mail loops here.
  // A school chat (schoolCtx) enrols nobody, guest or signed in: an
  // account's class enrolment belongs to the school flows
  // (src/lib/school/student-db.ts and the sign-in context marking), not to
  // the chat.
  // 27 Sep 2026 (fixer): an enrolment on an exam with NO practice
  // (src/lib/exam-practice-state.ts) is still made here and by /chat's page
  // (its picker, switcher and scope are built from enrolments), so the
  // readers that would promise practice skip such an exam instead: the
  // Daily-5 mail (src/app/api/cron/daily-five/route.ts), /today and the
  // dashboard card (src/lib/study-day-five.ts pickDailyFive) and the coach
  // intake (src/app/coach/page.tsx, src/app/api/coach/route.ts).
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
  // 1 Oct 2026: the wait is a helper, because a Retry whose row the
  // late-answer run holds waits for that run's reply the same way (below).
  const waitForReply = async (waitingOn: string): Promise<TurnDecision> => {
    let settled: TurnDecision = { kind: "wait", sessionId: "", userRowId: waitingOn };
    const deadline = Date.now() + WAIT_FOR_ANSWER_MS;
    while (settled.kind === "wait" && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, WAIT_POLL_MS));
      const row = await prisma.chatMessage.findUnique({ where: { id: waitingOn } });
      const after = row
        ? await prisma.chatMessage.findFirst({
            where: { sessionId: row.sessionId, createdAt: { gt: row.createdAt } },
            orderBy: { createdAt: "asc" },
          })
        : null;
      settled = settleWait(row, after, Date.now());
    }
    return settled;
  };
  // No meta frame: the chat stays where it was, and Retry asks again.
  // The English line goes with a stable code, and the chat shows its own
  // en/hi/te line for that code (25 Sep 2026 — this was English-only in a
  // localised chat); src/lib/chat-reply-status.ts.
  const stillAnswering = () => {
    const code = CHAT_ERROR_CODE.stillAnswering;
    const error = CHAT_ERROR_COPY[code].en;
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error, code, next: backPath })}\n\n`,
      { headers: SSE_HEADERS },
    );
  };
  if (decision.kind === "wait") {
    decision = await waitForReply(decision.userRowId);
    if (decision.kind === "wait") return stillAnswering();
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

  // A conversation the student named and continues now (not one created below).
  const continuedSession = chatSession;
  if (userId && !chatSession) {
    // 30 Sep 2026: a mistake review started from the results page is tagged
    // with its attempt — only the student's own attempt on this exam (the
    // results page exists for finished ones only), never on a school chat —
    // so "Continue your mistake review" can
    // find it. One keyed read, on the first turn of such a chat only.
    let reviewTag: ReviewTag | null = null;
    if (body.reviewAttemptId && exam && !schoolCtx) {
      const reviewed = await prisma.attempt.findFirst({
        where: { id: body.reviewAttemptId, userId, mock: { examId: exam.id } },
        select: { id: true, mock: { select: { title: true } } },
      });
      if (reviewed) reviewTag = { attemptId: reviewed.id, mockTitle: reviewed.mock.title };
    }
    chatSession = await prisma.chatSession.create({
      data: {
        userId,
        // examId is nullable in the schema — null = general-mode session.
        examId: exam?.id ?? null,
        ...(reviewTag ? { contextSnapshot: reviewSnapshot(reviewTag) } : {}),
      },
    });
  }
  const sessionIdOut = chatSession?.id ?? "anon";

  // History — normalised to {role, content}. From the DB for signed-in
  // users; from the client body for anonymous ones (their turns aren't
  // persisted, so the client replays its last few for multi-turn). A reused
  // USER row is this turn's own message, so it stays out of the history.
  // (1 Oct 2026: the stored rows go through src/lib/tutor-turn.ts
  // historyFromRows, which the late answer uses on the same rows.)
  const history: { role: "user" | "assistant"; content: string }[] =
    userId && chatSession
      ? historyFromRows(rows, reusedRowId)
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
      turn.meta = { ...(turnId ? { turnId } : {}), answeringAt: Date.now() };
      // 1 Oct 2026 review: the late-answer run (/api/cron/tutor-answer-later)
      // may have claimed this very row since it was read above, or stored its
      // answer. So the reuse is ONE conditional write — only while no late
      // answer is stored and no live late claim holds the row (a claim older
      // than LATE_CLAIM_STALE_MS was left by a run that died, and is taken
      // over) — and it MERGES: the late fields (lateTries, latePromised,
      // failedReason …) stay; only failedAt and a stale claim go. When it
      // does not land, this turn waits for the late run's reply exactly as
      // for any row another run is answering, instead of answering (and
      // paying) twice.
      const took = await prisma.$executeRaw`
        UPDATE "ChatMessage"
        SET metadata = (COALESCE(metadata, '{}'::jsonb) - 'failedAt' - 'lateClaimAt') || ${JSON.stringify(turn.meta)}::jsonb
        WHERE id = ${reusedRowId}
          AND metadata->>'lateAnsweredAt' IS NULL
          AND (metadata->>'lateClaimAt' IS NULL OR (metadata->>'lateClaimAt')::bigint < ${String(Date.now() - LATE_CLAIM_STALE_MS)}::bigint)`;
      if (took !== 1) {
        const settled = await waitForReply(reusedRowId);
        return settled.kind === "replay"
          ? new Response(replayFrames(settled.sessionId, settled.reply).join(""), { headers: SSE_HEADERS })
          : stillAnswering();
      }
      turn.id = reusedRowId;
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
    // 30 Sep 2026: a saved chat continued now moves up the Recent chats lists
    // and stays in the tutor's 30-day memory — both read ChatSession.updatedAt,
    // which a new message row never touches. At most once per
    // SESSION_TOUCH_MS per conversation; best-effort.
    if (continuedSession && shouldTouchSession(continuedSession.updatedAt, Date.now())) {
      try {
        await prisma.chatSession.update({ where: { id: continuedSession.id }, data: { updatedAt: new Date() } });
      } catch (err) {
        console.error("[chat] could not mark the conversation active:", err);
      }
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
  // 30 Sep 2026 ("the tutor remembers"): a signed-in GENERAL chat gets the
  // journey too, loaded by userId only (the student's own earlier questions;
  // no brief, mock or topic codes — src/lib/tutor-memory.ts). The
  // conversation being continued is left out of it: its turns are the history.
  // Memory never fails a turn: without it the tutor answers as before.
  // 30 Sep 2026 (review fix): a turn that is one of Shishya's own prompts —
  // the results-page review seed, a weak-topic button, a starter or a review
  // quick reply — never opens with the "answer your earlier question first"
  // offer; the student pressed a button for something specific.
  // For general / anonymous chats the prompt-builder gets a minimal
  // StudentState (preferredLang from the User row read once above; anon EN).
  // 26 Sep 2026: the school tutor also carries the account's declared age
  // band (schoolProfile above) in its turn context. 27 Sep 2026: no band is
  // asked any more, so it is null for a guest or an undeclared account; a
  // band stored before then still rides along.
  // If the chat was opened from a study-notes page (topicCode in URL), the
  // topic record + a short slice of its notes anchor the tutor to what the
  // student is reading; a school chat's focus is the chapter (code, Shishya
  // page, official link, our own notes — src/lib/school/tutor-context.ts),
  // never the exam-page topic read.
  // 1 Oct 2026: all of this is loaded by src/lib/tutor-turn.ts — unchanged,
  // moved so the late answer (/api/cron/tutor-answer-later) builds the very
  // same context for a question an outage left unanswered.
  const turnScope: TutorTurnScope = {
    userId,
    exam,
    schoolCtx,
    examCode: examCodeForChat,
    isGeneral,
    sessionId: chatSession?.id ?? null,
    preferredLang: profile?.preferredLang ?? null,
    schoolBand: schoolProfile?.band ?? null,
    message: body.message,
    topicCode: body.topicCode ?? null,
  };
  const turnContext = await loadTutorTurnContext(turnScope);
  const generalStudentState = turnContext.studentState;
  const schoolFocus = turnContext.schoolFocus;

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

        // The input is built by src/lib/tutor-turn.ts tutorStreamArgs (1 Oct
        // 2026) — general mode's empty syllabus, the "say that again in X"
        // rewrite of a bare language name, the school persona with chapter
        // focus and any stored band (tools off; guests too since 27 Sep
        // 2026), and tools only for a signed-in exam chat — the one builder
        // the late answer uses too.
        const ai = tutorStream(tutorStreamArgs({ scope: turnScope, context: turnContext, history, language: replyLanguage }));

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
          // A guest school chat (27 Sep 2026) keeps no linkable id: the
          // person is likely 13-17.
          anonLogged = true;
          try {
            await prisma.anonTutorLog.create({
              data: {
                anonId: schoolCtx ? null : anonId,
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
        // An outage must not end a new student's first session (16 Sep 2026:
        // signups during the 11-13 Sep credit outages came back at half the
        // usual rate). The practice pages need no AI, so name one.
        // 26 Sep 2026: a school student is sent back to the chapter (or class)
        // page, whose notes and practice need no AI — never to an /exams page.
        const practice = schoolCtx
          ? ` Meanwhile the chapter's notes and practice are open at https://shishya.in${schoolFocus?.path ?? backPath}`
          : examCodeForChat
          ? ` Meanwhile you can still practise without the tutor: free questions and mocks at https://shishya.in/exams/${examCodeForChat}`
          : " Meanwhile Shishya's pages work without the tutor: school chapters at https://shishya.in/schooling, all exams at https://shishya.in/exams/browse, and colleges, scholarships and careers from https://shishya.in.";
        // 1 Oct 2026: WHY it failed comes from the SDK's status / error type
        // (src/lib/ai/tutor-failure.ts), not the message text. The AI being
        // unavailable (credit, auth, overload, rate limit, 5xx, timeout,
        // network) gets the honest line and a code the chat shows in its own
        // language (src/lib/tutor-unavailable.ts): a member's question is
        // saved and answered here by /api/cron/tutor-answer-later, "and email
        // you" only when the account can receive our mails and it is not a
        // school chat (src/lib/db/tutor-answer-email.ts — a failed read
        // promises nothing); a guest's is kept by this browser when it can.
        // Anything else is our fault and promises nothing.
        const reason = classifyTutorFailure(err);
        const unavailable = isAiUnavailable(reason);
        const emailable = unavailable && !!userId && !schoolCtx ? await tutorAnswerEmailable(userId) : false;
        // Signed-in: mark the USER row failed BEFORE the student sees the
        // error, so a quick Retry re-sends it rather than waiting on it as if
        // this run were still answering (24 Sep 2026 review). 1 Oct 2026: with
        // why, the promise, and what the late answer needs to answer it the
        // same way — and the "saved, we'll answer it here" line only when this
        // mark landed (the late answer picks only marked rows); otherwise the
        // student gets the plain line and nothing is promised.
        const marked = userId
          ? await markTurnFailed(turn, {
              failedReason: reason,
              ...(unavailable ? { latePromised: true as const, emailPromised: emailable } : {}),
              replyLang: typeof replyLanguage === "string" ? replyLanguage : undefined,
              ...(body.topicCode ? { topicCode: body.topicCode } : {}),
            })
          : true;
        const code = unavailable && marked ? tutorUnavailableCode({ signedIn: !!userId, emailable }) : null;
        const friendly = code
          ? `${tutorUnavailableText(tutorUnavailableState(code, false), "en")}${practice}`
          : "Something went wrong on our side — please try sending that again.";
        emit(
          `event: error\ndata: ${JSON.stringify({
            error: friendly,
            next: schoolFocus?.path ?? backPath,
            ...(code ? { code, more: practice.trim() } : {}),
          })}\n\n`,
        );
        // A failed guest turn is logged too, with no reply (24 Sep 2026) —
        // failed guest asks used to vanish, so guest failures could not be
        // counted. Same best-effort rule as a successful turn; the student sees
        // the error first.
        if (!userId && !anonLogged) {
          try {
            await prisma.anonTutorLog.create({
              data: {
                anonId: schoolCtx ? null : anonId,
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
