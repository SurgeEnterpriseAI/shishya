// Static prompt building blocks. Anything here is cached via cache_control
// when sent to Claude — keep it stable across requests.

export const PLATFORM_PERSONA = `You are Shishya — a free, community-driven learning companion that handholds Indian students through every stage of education: schooling, entrance exams, colleges, scholarships, jobs and study abroad.

Your job is to help every student — especially those without access to expensive coaching — reach their goal with confidence. You combine extensive information with service-oriented, patient handholding. You speak in the student's preferred language (English, Hindi, or other Indian languages). You are warm, patient, and direct. You never talk down. You assume the student is smart but may have gaps in foundation.

Core values:
- Free and equal access — every student gets the same quality of help.
- Honest feedback — tell students exactly where they stand. No false praise.
- Practical — every explanation should connect to how the concept appears in the actual exam.
- Respectful of effort — celebrate genuine progress; don't fake-cheer.
- Concise — students have limited time; prefer structured, scannable answers.

You always ground your responses in the student's actual data: their weaknesses, recent attempts, the syllabus of their target exam. Never invent statistics about the student.`;

export const ANSWER_FORMAT_RULES = `Output formatting:
- Use short paragraphs (2–4 sentences) and bullet lists.
- For math: write step-by-step. Use plain text math, not LaTeX, unless asked.
- When you reference a topic, say its name in the syllabus exactly (e.g., "Profit & Loss", "Time, Speed and Distance").
- If you cite a fact, only cite from the provided syllabus or student state — do not invent rankings, percentile data, or historical exam stats.
- Match the student's preferred language. If preferredLang is HI, reply in conversational Hindi (Devanagari script). If EN, reply in English. Bilingual ok if it helps clarity.`;

export const SAFETY_RULES = `Hard rules:
- Do NOT generate content that could leak the actual current-year exam paper or claim to know unreleased questions.
- Do NOT make claims about which institutions are "best" or push paid coaching products.
- Do NOT give medical, legal, or financial advice unrelated to exam prep.
- If a student is in distress (mentions self-harm, severe burnout), respond with empathy and recommend they talk to a trusted adult or a mental health helpline (iCall: 9152987821; Vandrevala: 1860-2662-345). Do not attempt to provide therapy.
- Refuse politely if asked to write someone's actual exam application or impersonate them.`;

/**
 * Compose a syllabus block for cache_control. We render the syllabus as
 * structured text so Claude can reason about it directly.
 */
export function syllabusBlock(args: {
  examCode: string;
  examName: string;
  subjects: Array<{
    code: string;
    name: string;
    weight: number;
    topics: Array<{
      code: string;
      name: string;
      description?: string;
      subtopics?: Array<{ code: string; name: string; description?: string }>;
    }>;
  }>;
}): string {
  const lines: string[] = [];
  lines.push(`# Syllabus — ${args.examName} (${args.examCode})`);
  for (const subject of args.subjects) {
    lines.push(`\n## ${subject.name} [${subject.code}]  (weight ${subject.weight})`);
    for (const topic of subject.topics) {
      lines.push(`- **${topic.name}** [\`${topic.code}\`]${topic.description ? ` — ${topic.description}` : ""}`);
      if (topic.subtopics?.length) {
        for (const sub of topic.subtopics) {
          lines.push(`  - ${sub.name} [\`${sub.code}\`]${sub.description ? ` — ${sub.description}` : ""}`);
        }
      }
    }
  }
  return lines.join("\n");
}

/**
 * Cross-session "recent journey" block — the tutor's persistent memory.
 *
 * Without this, every new chat session is a blank slate. With it, the tutor
 * knows: what we talked about across the last N sessions, today's brief, the
 * last mock score, and any recommended actions left dangling from prior
 * replies. Renders compactly to keep dynamic-prompt cost bounded.
 */
export function journeyBlock(journey: {
  examCode: string;
  threads: Array<{
    startedAt: string;
    examShort: string;
    openingMessage: string;
    topicCodes: string[];
  }>;
  topAskedTopics: Array<{ topicCode: string; count: number }>;
  todayBrief: { reflection: string; mockTitle: string | null } | null;
  lastMock: { date: string; scorePct: number; mockTitle: string; examShort: string } | null;
  openActions: Array<{ kind: string; topicCode?: string; reason: string }>;
}): string {
  const empty =
    journey.threads.length === 0 &&
    !journey.todayBrief &&
    !journey.lastMock &&
    journey.openActions.length === 0;
  if (empty) return "";

  const lines: string[] = [];
  lines.push(`# Recent journey (cross-session memory — use this to feel continuous)`);

  if (journey.todayBrief) {
    lines.push(`\n## Today's brief (overnight reflection by you)`);
    lines.push(journey.todayBrief.reflection.trim());
    if (journey.todayBrief.mockTitle) {
      lines.push(`(Recommended mock for today: "${journey.todayBrief.mockTitle}")`);
    }
  }

  if (journey.lastMock) {
    const when = formatDateAgo(journey.lastMock.date);
    lines.push(
      `\n## Last mock\n${when}: ${(journey.lastMock.scorePct).toFixed(1)}% on "${journey.lastMock.mockTitle}" (${journey.lastMock.examShort})`,
    );
  }

  if (journey.threads.length > 0) {
    lines.push(`\n## Past chats (most recent first — refer back if relevant)`);
    for (const t of journey.threads) {
      const when = formatDateAgo(t.startedAt);
      const topics = t.topicCodes.length ? ` · topics: ${t.topicCodes.map((c) => `\`${c}\``).join(", ")}` : "";
      lines.push(`- ${when} (${t.examShort}): "${t.openingMessage}"${topics}`);
    }
  }

  if (journey.topAskedTopics.length > 0) {
    lines.push(
      `\n## Topics asked most lately\n` +
        journey.topAskedTopics
          .map((t) => `\`${t.topicCode}\` (×${t.count})`)
          .join(", "),
    );
  }

  if (journey.openActions.length > 0) {
    lines.push(`\n## Open recommended actions (from prior replies — pick up where we left off if relevant)`);
    for (const a of journey.openActions) {
      const target = a.topicCode ? ` [\`${a.topicCode}\`]` : "";
      lines.push(`- ${a.kind}${target}: ${a.reason}`);
    }
  }

  lines.push(
    `\nUse this memory implicitly — reference it naturally when relevant ("last week we discussed X", "your earlier mock showed Y"). Don't list it back at the student verbatim.`,
  );

  return lines.join("\n");
}

function formatDateAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const days = Math.floor((now - then) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return `1 week ago`;
  return `${Math.floor(days / 7)} weeks ago`;
}

/**
 * Compact student-state summary used in dynamic (non-cached) prompt blocks.
 * Keep it short — every token counts on the dynamic side.
 */
export function studentStateBlock(state: {
  examCode: string;
  weaknesses: Array<{ topicCode: string; topicName: string; masteryScore: number }>;
  strengths: Array<{ topicCode: string; topicName: string; masteryScore: number }>;
  totalMocksTaken: number;
  lastMockScorePct?: number;
  bestMockScorePct?: number;
  recentTrend?: string;
}): string {
  const lines: string[] = [];
  lines.push(`# Student state`);
  lines.push(`- Exam: ${state.examCode}`);
  lines.push(`- Total mocks taken: ${state.totalMocksTaken}`);
  if (state.lastMockScorePct != null) lines.push(`- Last mock %: ${state.lastMockScorePct.toFixed(1)}`);
  if (state.bestMockScorePct != null) lines.push(`- Best mock %: ${state.bestMockScorePct.toFixed(1)}`);
  if (state.recentTrend) lines.push(`- Recent trend: ${state.recentTrend}`);
  if (state.weaknesses.length) {
    lines.push(`- Weaknesses (lowest mastery first):`);
    for (const w of state.weaknesses.slice(0, 6)) {
      lines.push(`  - ${w.topicName} [\`${w.topicCode}\`] — mastery ${(w.masteryScore * 100).toFixed(0)}%`);
    }
  }
  if (state.strengths.length) {
    lines.push(`- Strengths:`);
    for (const s of state.strengths.slice(0, 4)) {
      lines.push(`  - ${s.topicName} [\`${s.topicCode}\`] — mastery ${(s.masteryScore * 100).toFixed(0)}%`);
    }
  }
  return lines.join("\n");
}
