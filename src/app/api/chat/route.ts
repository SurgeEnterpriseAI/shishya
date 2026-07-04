// POST /api/chat — streaming chat with the AI tutor.
// Body: { examCode, sessionId?, message }
//
// Returns a Server-Sent Events stream:
//   event: delta\ndata: <text chunk>\n\n
//   event: done\ndata: {"messageId":"...","actions":[...]}\n\n

// Tool-use loops + long Anthropic streams need more than the default 10s. We
// keep this on Node runtime (not edge) because Prisma engines need it.
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { tutorStream } from "@/lib/ai";
import { getStudentState } from "@/lib/db/student-state";
import { getStudentJourney } from "@/lib/db/student-journey";
import { getSyllabusContext } from "@/lib/db/syllabus";
import { checkRateLimit, rateLimited } from "@/lib/rate-limit";

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

export async function POST(req: Request) {
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

  const exam = isGeneral
    ? null
    : await prisma.exam.findUnique({ where: { code: examCodeForChat! } });
  if (!isGeneral && !exam) {
    return new Response(JSON.stringify({ error: "exam not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  // Signed-in only: track enrollment for the exam they're chatting about.
  if (exam && userId) {
    await prisma.enrollment.upsert({
      where: { userId_examId: { userId, examId: exam.id } },
      update: {},
      create: { userId, examId: exam.id },
    });
  }

  // Persisted chat session — signed-in only. ChatSession.userId is
  // required, so anonymous chats aren't stored: they get a throwaway
  // session id and their recent turns ride in the request body instead.
  let chatSession =
    userId && body.sessionId
      ? await prisma.chatSession.findUnique({ where: { id: body.sessionId } })
      : null;
  if (userId && (!chatSession || chatSession.userId !== userId)) {
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
  // persisted, so the client replays its last few for multi-turn).
  const history: { role: "user" | "assistant"; content: string }[] =
    userId && chatSession
      ? (
          await prisma.chatMessage.findMany({
            where: { sessionId: chatSession.id },
            orderBy: { createdAt: "asc" },
            take: 30, // cap context
          })
        ).map((m) => ({
          role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
          content: m.content,
        }))
      : (body.history ?? []).slice(-12);

  // Persist the user's message (signed-in only).
  if (userId && chatSession) {
    await prisma.chatMessage.create({
      data: { sessionId: chatSession.id, role: "USER", content: body.message },
    });
  }

  // Exam-scoped context. The syllabus loads for EVERYONE with an exam so
  // even the anonymous tutor stays scoped to the right syllabus; the
  // personalized state + journey load only for signed-in users (anon has
  // no account data). With connection_limit=5 on the pooled DB URL these
  // fan out in parallel without overflowing the 10s pool timeout.
  const [studentState, syllabus, journey] = exam
    ? await Promise.all([
        userId ? getStudentState(userId, examCodeForChat!) : Promise.resolve(null),
        getSyllabusContext(examCodeForChat!),
        userId ? getStudentJourney(userId, examCodeForChat!) : Promise.resolve(null),
      ])
    : ([null, null, null] as const);

  // For general / anonymous chats we need a minimal StudentState for the
  // tutor's prompt-builder (it needs preferredLang at minimum). Build one
  // from the User row when signed in; anon defaults to EN.
  let generalStudentState = studentState;
  if (!generalStudentState) {
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { preferredLang: true } })
      : null;
    generalStudentState = {
      userId: userId ?? "anon",
      examCode: "",
      examName: "",
      preferredLang: (user?.preferredLang ?? "EN") as any,
      enrolledAt: new Date().toISOString(),
      weaknesses: [],
      strengths: [],
      totalMocksTaken: 0,
    };
  }

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
  if (exam && body.topicCode) {
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
      try {
        // Header line so the client knows the session id
        controller.enqueue(
          encoder.encode(`event: meta\ndata: ${JSON.stringify({ sessionId: sessionIdOut })}\n\n`)
        );

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
          userMessage: body.message,
          language: generalStudentState.preferredLang,
          topicFocus: topicFocus ?? undefined,
          journey: journey ?? undefined,
          generalMode: isGeneral,
          // Tool use needs an exam scope AND a signed-in user to look up
          // the student's mastery / attempts. General mode and anonymous
          // chats pass no ctx, so the tutor goes tools-off and answers
          // from the syllabus + its own knowledge.
          ctx:
            examCodeForChat && userId
              ? { userId, examCode: examCodeForChat }
              : undefined,
        });

        let full = "";
        let actions: any = undefined;
        const toolCalls: any[] = [];
        for await (const chunk of ai) {
          if ("delta" in chunk) {
            full += chunk.delta;
            controller.enqueue(
              encoder.encode(`event: delta\ndata: ${JSON.stringify(chunk.delta)}\n\n`)
            );
          } else if ("tool" in chunk) {
            toolCalls.push(chunk.tool);
            controller.enqueue(
              encoder.encode(`event: tool\ndata: ${JSON.stringify(chunk.tool)}\n\n`)
            );
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

        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({
              messageId,
              actions: actions ?? [],
              toolCalls,
            })}\n\n`
          )
        );
      } catch (err: any) {
        // Never leak upstream internals (API billing/limits errors etc.) to
        // students — we once streamed a raw "credit balance is too low"
        // Anthropic error into the chat UI. Log the real thing, say
        // something human.
        console.error("[chat] tutor stream failed:", err);
        const raw = String(err?.message ?? err);
        const friendly = /credit balance|billing|invalid_request_error/i.test(raw)
          ? "Shishya's tutor is briefly unavailable — the team has been alerted. Please try again in a little while."
          : /overloaded|rate.?limit|429|529/i.test(raw)
            ? "Shishya is helping a lot of students right now — please try again in a minute."
            : "Something went wrong on our side — please try sending that again.";
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ error: friendly })}\n\n`)
        );
      } finally {
        controller.close();
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
