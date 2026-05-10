// POST /api/chat — streaming chat with the AI tutor.
// Body: { examCode, sessionId?, message }
//
// Returns a Server-Sent Events stream:
//   event: delta\ndata: <text chunk>\n\n
//   event: done\ndata: {"messageId":"...","actions":[...]}\n\n

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { tutorStream } from "@/lib/ai";
import { getStudentState } from "@/lib/db/student-state";
import { getSyllabusContext } from "@/lib/db/syllabus";

const Body = z.object({
  examCode: z.string().min(1),
  sessionId: z.string().nullish(),
  message: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "UNAUTHENTICATED" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Ensure exam + enrollment + chat session
  const exam = await prisma.exam.findUnique({ where: { code: body.examCode } });
  if (!exam) {
    return new Response(JSON.stringify({ error: "exam not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }
  await prisma.enrollment.upsert({
    where: { userId_examId: { userId: session.user.id, examId: exam.id } },
    update: {},
    create: { userId: session.user.id, examId: exam.id },
  });

  let chatSession = body.sessionId
    ? await prisma.chatSession.findUnique({ where: { id: body.sessionId } })
    : null;
  if (!chatSession || chatSession.userId !== session.user.id) {
    chatSession = await prisma.chatSession.create({
      data: { userId: session.user.id, examId: exam.id },
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

  const studentState = await getStudentState(session.user.id, body.examCode);
  const syllabus = await getSyllabusContext(body.examCode);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Header line so the client knows the session id
        controller.enqueue(
          encoder.encode(`event: meta\ndata: ${JSON.stringify({ sessionId: chatSession!.id })}\n\n`)
        );

        const ai = tutorStream({
          studentState,
          syllabus,
          history: history.map((m) => ({
            role: m.role === "USER" ? "user" : "assistant",
            content: m.content,
          })),
          userMessage: body.message,
          language: studentState.preferredLang,
          ctx: { userId: session.user.id, examCode: body.examCode },
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
