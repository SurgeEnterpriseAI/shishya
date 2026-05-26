// AI-generated "sample" discussion threads.
//
// The right-rail (DiscussionsSidebar) lives on the homepage and looks
// dead when there's no recent activity. For a freshly-upcoming exam,
// real student threads might not exist yet — especially in the first
// 24 h after an exam-day or before a niche state PSC paper. We seed
// 6-8 plausible thread TITLES via Claude so the rail always feels
// populated; each is stored with isSeed=true and labeled "sample" in
// the UI so visitors know it's starter content, not actual posts.
//
// Each run replaces the previous batch — never accumulates. Real
// user-created threads are untouched.

import { anthropic, MODEL } from "./client";

export interface SeedThreadTitle {
  /** A plausible, realistic student question — 60-120 chars. */
  title: string;
}

const SYSTEM_PROMPT = `You are writing sample discussion thread TITLES for an Indian exam-prep platform's homepage right-rail.

GOAL
Generate 6 plausible thread titles that real student aspirants might post about the upcoming exam. The titles seed the discussion sidebar with realistic-looking activity for an exam that's about to happen — these are CLEARLY LABELED as "sample" in the UI, so don't try to fake authenticity, just write what real students actually ask.

STYLE
- Match how Indian students actually phrase questions: mix of English with occasional Hindi/Telugu/Tamil words is fine.
- Vary the question types: cutoff predictions, mock score worries, last-minute revision asks, syllabus clarification, "anyone from <state>" connect threads, anxiety/pep, strategy questions.
- 60-120 characters per title.
- NO marketing language. NO "Click here" / "Win prizes". These look like real student posts.

DO NOT
- Don't use the same opening word for every title.
- Don't make them all positive or all worried — mix the emotional range.
- Don't include "Sample" or "AI-generated" in the title itself; the UI handles labeling.`;

const TOOL = {
  name: "publish_seed_threads",
  description: "Submit the 6 sample thread titles for this exam.",
  input_schema: {
    type: "object",
    properties: {
      threads: {
        type: "array",
        minItems: 6,
        maxItems: 8,
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "60-120 char student-style question title." },
          },
          required: ["title"],
        },
      },
    },
    required: ["threads"],
  },
} as const;

export async function generateSeedThreads({
  examShortName,
  examName,
  daysFromExam,
}: {
  examShortName: string;
  examName: string;
  daysFromExam: number; // negative = past, positive = future
}): Promise<SeedThreadTitle[]> {
  // Frame the temporal context for Claude so titles match the moment.
  let context: string;
  if (daysFromExam <= 0 && daysFromExam >= -3) {
    context = `The ${examShortName} exam just ran ${Math.abs(Math.round(daysFromExam))} day(s) ago. Aspirants are sharing reactions: difficulty verdict, expected cutoff, answer-key disputes, anxiety, comparisons with previous years.`;
  } else if (daysFromExam === 0) {
    context = `The ${examShortName} exam is happening TODAY. Aspirants are: comparing how shifts went, asking about specific tricky questions, panic about CSAT/qualifying paper, waiting for unofficial answer keys.`;
  } else if (daysFromExam <= 7) {
    context = `The ${examShortName} exam is ${Math.round(daysFromExam)} day(s) away. Aspirants are asking: last-minute revision priority, what to carry, mock score worries, sleep / exam-day routine, can-I-clear questions.`;
  } else if (daysFromExam <= 30) {
    context = `The ${examShortName} exam is roughly ${Math.round(daysFromExam)} day(s) away. Aspirants are asking: study plans, mock test strategy, weak-topic remediation, comparing coaching, doubts about syllabus changes.`;
  } else {
    context = `The ${examShortName} exam is several months away. Aspirants are asking: long-term prep strategy, choice between attempts, optional subject selection, foundation-building questions.`;
  }

  const userPrompt = `EXAM
Name:      ${examName}
Shortname: ${examShortName}

CONTEXT
${context}

Generate 6-8 sample thread titles via the publish_seed_threads tool.`;

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
    });
    const toolUse = res.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") return [];
    const input = toolUse.input as { threads?: Array<{ title?: string }> };
    if (!Array.isArray(input.threads)) return [];
    return input.threads
      .filter((t): t is { title: string } => typeof t?.title === "string" && t.title.length >= 20)
      .map((t) => ({ title: t.title.slice(0, 200) }))
      .slice(0, 8);
  } catch (err) {
    console.error("[seed-discussions] Claude call failed:", err);
    return [];
  }
}
