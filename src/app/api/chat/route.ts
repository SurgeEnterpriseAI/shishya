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
  })
  .refine((b) => b.general === true || (typeof b.examCode === "string" && b.examCode.length > 0), {
    message: "examCode is required when general is not true",
  });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "UNAUTHENTICATED" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  // Rate limit before doing any DB work. Catches retry-storms early and keeps
  // a misbehaving client from burning Anthropic credits or Postgres CPU.
  const rl = await checkRateLimit("chat", session.user.id);
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
  if (exam) {
    await prisma.enrollment.upsert({
      where: { userId_examId: { userId: session.user.id, examId: exam.id } },
      update: {},
      create: { userId: session.user.id, examId: exam.id },
    });
  }

  let chatSession = body.sessionId
    ? await prisma.chatSession.findUnique({ where: { id: body.sessionId } })
    : null;
  if (!chatSession || chatSession.userId !== session.user.id) {
    chatSession = await prisma.chatSession.create({
      data: {
        userId: session.user.id,
        // examId is nullable in the schema — null = general-mode session.
        examId: exam?.id ?? null,
      },
    });
  }

  // Load history
  const history = await prisma.chatMessage.findMany({
    where: { sessionId: chatSession.id },
    orderBy: { createdAt: "asc" },
    take: 30, // cap context
  });

  await prisma.chatMessage.create({
    data: { sessionId: chatSession.id, role: "USER", content: body.message },
  });

  // Exam-scoped context (student state + syllabus + journey) only loads
  // when we have an exam. General mode skips these and falls back to a
  // minimal student-state stub built from the User row.
  //
  // We SERIALIZE these three calls rather than running them in parallel.
  // Each function itself fans out into 2-5 internal Prisma queries, and
  // the pooled Neon URL uses connection_limit=1 per serverless
  // function. Firing 3 wrappers in parallel produces ~10 concurrent
  // Prisma calls queued behind a single connection, which exhausts the
  // default 10s connection-pool timeout and dumps a P2024 to the
  // student. Sequential is slower wall-clock (~+200ms) but reliable.
  const studentState = exam ? await getStudentState(session.user.id, examCodeForChat!) : null;
  const syllabus = exam ? await getSyllabusContext(examCodeForChat!) : null;
  const journey = exam ? await getStudentJourney(session.user.id, examCodeForChat!) : null;

  // For general mode we need a minimal StudentState for the tutor's
  // prompt-builder (it needs preferredLang at minimum). Build one from
  // the User row.
  let generalStudentState = studentState;
  if (!generalStudentState) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferredLang: true },
    });
    generalStudentState = {
      userId: session.user.id,
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
        notes: true,
        subject: { select: { name: true } },
      },
    });
    if (topic) {
      const notes = (topic as any).notes as string | null;
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
          encoder.encode(`event: meta\ndata: ${JSON.stringify({ sessionId: chatSession!.id })}\n\n`)
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
          history: history.map((m) => ({
            role: m.role === "USER" ? "user" : "assistant",
            content: m.content,
          })),
          userMessage: body.message,
          language: generalStudentState.preferredLang,
          topicFocus: topicFocus ?? undefined,
          journey: journey ?? undefined,
          generalMode: isGeneral,
          // Tool use needs an exam scope to look up the student's
          // mastery / questions on a topic — in general mode the tools
          // would have nothing to query, so we pass no ctx and the
          // tutor goes tools-off.
          ctx: examCodeForChat
            ? { userId: session.user.id, examCode: examCodeForChat }
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

        const saved = await prisma.chatMessage.create({
          data: {
            sessionId: chatSession!.id,
            role: "ASSISTANT",
            content: full,
            metadata: { actions: actions ?? null, toolCalls },
          },
        });

        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({
              messageId: saved.id,
              actions: actions ?? [],
              toolCalls,
            })}\n\n`
          )
        );
      } catch (err: any) {
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ error: String(err) })}\n\n`)
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
