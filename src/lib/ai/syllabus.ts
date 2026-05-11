// AI syllabus generator. For exams whose subjects/topics aren't seeded
// in seed/exams/*.ts yet, Claude approximates the official syllabus
// structure: subjects → top-level topics → optional subtopics.
//
// Used by scripts/seed-syllabus-ai.ts for state-PSC long-tail exams.

import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL } from "./client";

export interface SyllabusInput {
  examCode: string;
  examName: string;
  examShortName: string;
  category: string;
}

export interface SyllabusTopic {
  code: string;
  name: string;
  description?: string;
  subtopics?: Array<{ code: string; name: string; description?: string }>;
}

export interface SyllabusSubject {
  code: string;
  name: string;
  weight: number;
  topics: SyllabusTopic[];
}

export interface SyllabusResult {
  subjects: SyllabusSubject[];
  inputTokens: number;
  outputTokens: number;
}

const SYSTEM = `You generate the canonical syllabus structure for an Indian entrance exam.

OUTPUT STRICT JSON only — no fences, no preamble:
{
  "subjects": [
    {
      "code": "GS",
      "name": "General Studies",
      "weight": 1.5,
      "topics": [
        {
          "code": "gs.ancient_history",
          "name": "Ancient Indian History",
          "description": "Indus Valley Civilisation, Vedic Age, Mauryan & Gupta empires",
          "subtopics": [
            { "code": "gs.ancient_history.indus", "name": "Indus Valley Civilisation" },
            ...
          ]
        }
      ]
    }
  ]
}

RULES:
1. Use the OFFICIAL subject names and topic structure from the exam notification.
2. Code format: subject codes are UPPERCASE_SNAKE (e.g. "GS", "QUANT", "REASONING"). Topic codes are lowercase dot-separated: subject_prefix.topic_name (e.g. "gs.ancient_history", "quant.percentage").
3. Each subject MUST have 5-12 topics. Each topic CAN optionally have 2-5 subtopics for finer granularity.
4. Use realistic weights: GS-heavy exams (UPSC, state PSC) tilt 2-3x toward GS subjects; CET-style entrance exams have balanced weights.
5. Don't invent topics — stick to what's in the official notification you're confident about. Better to return fewer accurate topics than padded fabricated ones.
6. Subject codes must be unique within the exam. Topic codes globally unique within the subject.`;

export async function generateSyllabus(input: SyllabusInput): Promise<SyllabusResult> {
  const userPrompt = `Generate the canonical syllabus structure for this Indian entrance exam.

Exam code:   ${input.examCode}
Exam name:   ${input.examName}
Short name:  ${input.examShortName}
Category:    ${input.category}

Return STRICT JSON per the system schema. 4-7 subjects, 5-12 topics each.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 6000,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.subjects)) {
    throw new Error(`syllabus JSON parse failed for ${input.examCode}: ${text.slice(0, 200)}`);
  }

  const subjects: SyllabusSubject[] = parsed.subjects
    .filter((s: any) => typeof s?.code === "string" && typeof s?.name === "string" && Array.isArray(s?.topics))
    .map((s: any) => ({
      code: String(s.code).slice(0, 32).toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
      name: String(s.name).slice(0, 120),
      weight: Number.isFinite(s.weight) ? Math.max(0.1, Math.min(5, s.weight)) : 1,
      topics: (s.topics as any[])
        .filter((t) => typeof t?.code === "string" && typeof t?.name === "string")
        .map((t) => ({
          code: String(t.code).slice(0, 80).toLowerCase().replace(/[^a-z0-9._-]/g, "_"),
          name: String(t.name).slice(0, 160),
          description: typeof t.description === "string" ? t.description.slice(0, 400) : undefined,
          subtopics: Array.isArray(t.subtopics)
            ? t.subtopics
                .filter((st: any) => typeof st?.code === "string" && typeof st?.name === "string")
                .map((st: any) => ({
                  code: String(st.code).slice(0, 96).toLowerCase().replace(/[^a-z0-9._-]/g, "_"),
                  name: String(st.name).slice(0, 160),
                  description: typeof st.description === "string" ? st.description.slice(0, 400) : undefined,
                }))
            : undefined,
        })),
    }));

  return {
    subjects,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

function extractJson(text: string): any | null {
  let body = text.trim();
  if (body.startsWith("```")) body = body.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  try { return JSON.parse(body); } catch {}
  const first = body.indexOf("{");
  const last = body.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  try { return JSON.parse(body.slice(first, last + 1)); } catch { return null; }
}
