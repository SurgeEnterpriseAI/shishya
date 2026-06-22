// The Gemini ARCHITECT for the Crack Path design loop. SERVER-ONLY.
//
// Two roles, both played by Gemini:
//   designCrackPath()        → designs the feature: a sequenced list of
//                              build tasks, each with a spec + acceptance
//                              criteria for Claude to implement.
//   reviewBuild(task, report) → reviews Claude's build of a task against
//                              the original design intent + acceptance
//                              criteria, and returns approve / needs-changes.
//
// Uses the Gemini REST API directly (no SDK), with retry + model fallback
// (same hardening as the growth loop). Needs GEMINI_API_KEY in the env.

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

/** Call Gemini and parse a JSON response, with retry + model fallback. */
async function geminiJSON(prompt: string): Promise<any | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("[crackpath] GEMINI_API_KEY not set — skipping.");
    return null;
  }
  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.5, responseMimeType: "application/json", maxOutputTokens: 8192 },
  });
  for (const model of [...new Set([MODEL, "gemini-2.0-flash"])]) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          { method: "POST", headers: { "content-type": "application/json" }, body }
        );
        if (!res.ok) {
          console.error(`[crackpath] ${model} attempt ${attempt} HTTP ${res.status}:`, (await res.text()).slice(0, 300));
          continue;
        }
        const data = await res.json();
        const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          console.error(`[crackpath] ${model} attempt ${attempt}: no text`);
          continue;
        }
        return JSON.parse(text);
      } catch (err) {
        console.error(`[crackpath] ${model} attempt ${attempt} failed:`, err);
      }
    }
  }
  return null;
}

export interface DesignTask {
  phase: string; // "Learn" | "Plan" | "Habit" | ...
  seq: number;
  title: string;
  spec: string;
  acceptanceCriteria: string[];
  effort: "S" | "M" | "L";
}

const PLATFORM_CONTEXT = `Shishya is a free Indian exam-prep platform (163 entrance/government exams). CURRENT INFRASTRUCTURE (what already exists — design ON TOP of it, don't re-build it):
- 29,875 VALIDATED practice questions; adaptive CAT/IRT mock engine; per-topic question pools.
- WeaknessMap (per-topic mastery), FSRS spaced-repetition (ReviewState), study streaks, a daily-brief cron.
- An AI tutor ("Ask Shishya") now open to signed-out users, scoped to exam syllabus, with on-demand doubt-solving.
- Exam discovery: per-exam pages, full syllabus (Subject→Topic tree, 13k topics), PYQs, cutoffs, news, phase articles (checklist/live/reactions).
- An AI content factory (Claude tool-use) that can generate validated questions AND topic teaching-notes at scale.
- Onboarding wizard capturing stage + state + target exams; Next.js 15 App Router + Prisma + Neon Postgres; ships from main on Vercel.

THE GAP (what's missing for a FRESH aspirant to go zero-to-crack, and what the Crack Path must add):
1. LEARN: only ~5% of the 13k topics have teaching notes — no sequenced learning path; a beginner can practice but can't LEARN the syllabus in order.
2. PLAN: no personalized, time-bound study roadmap ("you have N months → here's your week-by-week march through the syllabus → today's tasks").
3. HABIT/GLUE: streaks + daily-brief exist but aren't wired into a plan — there's no "open app → today's plan → learn+practice+revise → progress %" daily loop.`;

export async function designCrackPath(priorTasks: { title: string; status: string }[] | null): Promise<DesignTask[] | null> {
  const prompt = `You are the PRODUCT ARCHITECT for Shishya. Design the "Crack Path" — the learn → plan → daily-habit layer that takes a FRESH, motivated aspirant from zero to cracking their exam, keeping them glued daily. A separate AI engineer ("Claude") will implement each task you specify in the codebase and ship it; you will later review whether each build matches your design.

${PLATFORM_CONTEXT}

${priorTasks && priorTasks.length ? `Tasks already in the plan (do NOT duplicate; design what's still missing):\n${priorTasks.map((t) => `- [${t.status}] ${t.title}`).join("\n")}` : "This is the first design pass."}

Design a SEQUENCED build plan: concrete, shippable tasks grouped by phase (Learn, Plan, Habit, and any others you deem essential). Order them so each builds on the last and an aspirant gets value early. Reuse the existing infrastructure (questions, mocks, FSRS, tutor, content factory, streaks) — specify how each task wires into it. Keep it to 6-12 high-leverage tasks total.

Return STRICT JSON:
{
  "tasks": [
    {
      "phase": "Learn|Plan|Habit|...",
      "seq": 1,
      "title": "short imperative build title",
      "spec": "a concrete engineering brief: what to build, which models/routes/components, how it uses existing infra. Detailed enough for Claude to implement cold.",
      "acceptanceCriteria": ["specific, checkable criteria you'll judge the build against"],
      "effort": "S|M|L"
    }
  ]
}`;
  const parsed = await geminiJSON(prompt);
  if (!parsed?.tasks || !Array.isArray(parsed.tasks)) return null;
  return parsed.tasks
    .filter((t: any) => t && t.title && t.spec)
    .map((t: any, i: number) => ({
      phase: String(t.phase || "Crack Path"),
      seq: Number.isFinite(t.seq) ? Number(t.seq) : i + 1,
      title: String(t.title),
      spec: String(t.spec),
      acceptanceCriteria: Array.isArray(t.acceptanceCriteria) ? t.acceptanceCriteria.map(String) : [],
      effort: ["S", "M", "L"].includes(t.effort) ? t.effort : "M",
    }));
}

export interface ReviewVerdict {
  approved: boolean;
  feedback: string;
  requiredChanges: string[];
}

export async function reviewBuild(task: {
  title: string;
  spec: string;
  acceptanceCriteria: string[];
  buildReport: string;
  commit?: string | null;
  iteration: number;
}): Promise<ReviewVerdict | null> {
  const prompt = `You are the PRODUCT ARCHITECT reviewing an engineer's ("Claude") implementation of a Crack Path task YOU designed. Judge ONLY whether the build matches your design intent and meets the acceptance criteria. Be a fair but rigorous reviewer — approve when the criteria are genuinely met; otherwise list precise, minimal required changes.

${PLATFORM_CONTEXT}

TASK YOU DESIGNED
Title: ${task.title}
Spec: ${task.spec}
Acceptance criteria:
${task.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

CLAUDE'S BUILD REPORT (iteration ${task.iteration}${task.commit ? `, commit ${task.commit}` : ""})
${task.buildReport}

Return STRICT JSON:
{
  "approved": true|false,
  "feedback": "1-4 sentences: does it match the design? what's strong, what's missing.",
  "requiredChanges": ["if not approved: specific, minimal changes Claude must make. empty array if approved."]
}`;
  const parsed = await geminiJSON(prompt);
  if (!parsed || typeof parsed.approved !== "boolean") return null;
  return {
    approved: Boolean(parsed.approved),
    feedback: String(parsed.feedback ?? ""),
    requiredChanges: Array.isArray(parsed.requiredChanges) ? parsed.requiredChanges.map(String) : [],
  };
}
