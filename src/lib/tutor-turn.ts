// One tutor turn's context and the tutorStream() input — shared by POST
// /api/chat and the late-answer run (1 Oct 2026).
//
// Why: the late-answer run (src/lib/tutor-late-answer.ts, cron
// /api/cron/tutor-answer-later) must answer a question that failed during an
// outage with the SAME pipeline and context the student would have got — exam
// / general / school mode, the student's state and tutor memory (the journey,
// "the tutor remembers", 30 Sep 2026), the school persona with any stored age
// band, the chapter or topic focus. So the route's context loading moved here
// unchanged and both callers use it; the prompts stay in src/lib/ai/tutor.ts
// and nothing here writes one. What stays in the route: request-only inputs
// (auth, cookies for the reply language, rate limits, the stored rows).
//
// Semantics carried over from src/app/api/chat/route.ts as they were:
//   • a school chat (Class 8-12 container) has no student state or journey;
//     its syllabus is the class; its focus is the chapter
//     (getSchoolChapterFocus), never the exam-page topic read;
//   • an exam chat loads the syllabus for everyone, and the student state and
//     journey for a signed-in student only; memory never fails a turn;
//   • a signed-in GENERAL chat gets the journey by userId only; the
//     conversation being continued is left out of it (its turns are the
//     history);
//   • a turn that is one of Shishya's own prompts never opens with the
//     "answer your earlier question first" offer;
//   • a general / guest / school turn gets a minimal student state carrying
//     preferredLang (anon = EN); a school turn carries the stored band.

import { prisma } from "@/lib/db/prisma";
import { getStudentState } from "@/lib/db/student-state";
import { getStudentJourney } from "@/lib/db/student-journey";
import { getSyllabusContext } from "@/lib/db/syllabus";
import { getSchoolChapterFocus, type SchoolTutorContext } from "@/lib/school/tutor-context";
import type { SchoolBand } from "@/lib/school/student-classes";
import type { SchoolChapterFocus } from "@/lib/school/tutor-persona";
import { isOurTutorPrompt } from "@/lib/tutor-templates";
import { tutorMessageFor } from "@/lib/preferred-lang";
import type { StudentState, SyllabusContext, TutorInput } from "@/lib/ai/types";
import type { tutorStream } from "@/lib/ai/tutor";

export interface TutorTurnScope {
  /** Null = a guest. */
  userId: string | null;
  /** The exam row (a real exam, or the school container); null = general. */
  exam: { id: string; code: string; category: string } | null;
  /** Set for a Class 8-12 school chat. */
  schoolCtx: SchoolTutorContext | null;
  /** The exam code of a non-general chat (the container's code for school). */
  examCode: string | null;
  isGeneral: boolean;
  /** The conversation this turn belongs to (left out of the journey). */
  sessionId: string | null;
  /** User.preferredLang, when signed in. */
  preferredLang: string | null;
  /** A school age band the account stored before 27 Sep 2026, if any. */
  schoolBand: SchoolBand | null;
  /** The student's message, as stored. */
  message: string;
  /** The topic (exam) or chapter (school) the chat was opened on. */
  topicCode: string | null;
}

export interface TopicFocus {
  code: string;
  name: string;
  subjectName: string;
  notesExcerpt: string | null;
}

export interface TutorTurnContext {
  /** The student state the prompt builder gets (a minimal one for general / guest / school). */
  studentState: StudentState;
  syllabus: SyllabusContext | null;
  /** The journey for THIS turn (the offer dropped for our own prompts). */
  journey: TutorInput["journey"] | null;
  band: SchoolBand | null;
  topicFocus: TopicFocus | null;
  schoolFocus: SchoolChapterFocus | null;
}

export async function loadTutorTurnContext(s: TutorTurnScope): Promise<TutorTurnContext> {
  const { userId, exam, schoolCtx } = s;
  const journeyOpts = { excludeSessionId: s.sessionId ?? null };
  const journeyFailed = (err: unknown) => {
    console.error("[chat] tutor memory read failed:", err);
    return null;
  };
  const [studentState, syllabus, journey] = exam
    ? schoolCtx
      ? ([null, schoolCtx.syllabus, null] as const)
      : await Promise.all([
          userId ? getStudentState(userId, s.examCode!) : Promise.resolve(null),
          getSyllabusContext(s.examCode!),
          userId ? getStudentJourney(userId, s.examCode!, journeyOpts).catch(journeyFailed) : Promise.resolve(null),
        ])
    : ([null, null, userId ? await getStudentJourney(userId, null, journeyOpts).catch(journeyFailed) : null] as const);
  const journeyForTurn = journey && isOurTutorPrompt(s.message) ? { ...journey, offer: null } : journey;

  let generalStudentState: StudentState | null = studentState;
  let band: SchoolBand | null = null;
  if (!generalStudentState) {
    if (schoolCtx) band = s.schoolBand ?? null;
    generalStudentState = {
      userId: userId ?? "anon",
      examCode: "",
      examName: "",
      preferredLang: (s.preferredLang ?? "EN") as any,
      enrolledAt: new Date().toISOString(),
      weaknesses: [],
      strengths: [],
      totalMocksTaken: 0,
    };
  }

  let schoolFocus: SchoolChapterFocus | null = null;
  if (schoolCtx && s.topicCode) {
    schoolFocus = await getSchoolChapterFocus(schoolCtx.exam.code, s.topicCode);
  }
  let topicFocus: TopicFocus | null = null;
  if (exam && !schoolCtx && s.topicCode) {
    const topic = await prisma.topic.findFirst({
      where: { code: s.topicCode, subject: { examId: exam.id } },
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

  return { studentState: generalStudentState, syllabus: syllabus ?? null, journey: journeyForTurn ?? null, band, topicFocus, schoolFocus };
}

/** A stored ChatMessage row, as much of it as the history needs. */
export interface HistoryRow {
  id: string;
  role: string;
  content: string;
}

/**
 * Stored rows (oldest first) → the model's history: the turn's own USER row
 * left out, roles normalised, and leading assistant turns trimmed (the
 * Messages API requires the first turn to be a user turn; a failed reply
 * leaves an unpaired USER row, so a window can start on an ASSISTANT row).
 */
export function historyFromRows(rows: readonly HistoryRow[], excludeId: string | null): { role: "user" | "assistant"; content: string }[] {
  const history = rows
    .filter((m) => m.id !== excludeId)
    .map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));
  while (history.length && history[0].role === "assistant") history.shift();
  return history;
}

/** The tutorStream() input for a turn — the one place both callers build it. */
export function tutorStreamArgs(a: {
  scope: TutorTurnScope;
  context: TutorTurnContext;
  history: { role: "user" | "assistant"; content: string }[];
  language: TutorInput["language"];
}): Parameters<typeof tutorStream>[0] {
  const { scope, context, history } = a;
  const { userId, schoolCtx, examCode: examCodeForChat } = scope;
  const { schoolFocus, band } = context;
  return {
    studentState: context.studentState,
    // Use empty syllabus for general mode — tutor.ts skips the
    // syllabus block when subjects is empty.
    syllabus: context.syllabus ?? {
      examCode: "",
      examName: "General",
      examShortName: "General",
      subjects: [],
    },
    // history is already normalised to {role, content}.
    history,
    // A bare language name after an answer means "say that again in X"
    // (stored as typed; only the model sees the explicit request).
    userMessage: tutorMessageFor(scope.message, history.some((t) => t.role === "assistant")),
    language: a.language,
    topicFocus: context.topicFocus ?? undefined,
    journey: context.journey ?? undefined,
    generalMode: scope.isGeneral,
    // 26 Sep 2026: the school persona, class block, chapter focus and
    // any stored band (src/lib/school/tutor-persona.ts); tools stay
    // off. Guests too since 27 Sep 2026.
    school: schoolCtx ? { scope: schoolCtx.scope, focus: schoolFocus, band } : undefined,
    // Tool use needs an exam scope AND a signed-in user to look up
    // the student's mastery / attempts. General mode, anonymous and
    // school chats pass no ctx, so the tutor goes tools-off and answers
    // from the syllabus + its own knowledge.
    ctx:
      examCodeForChat && userId && !schoolCtx
        ? { userId, examCode: examCodeForChat }
        : undefined,
  };
}
