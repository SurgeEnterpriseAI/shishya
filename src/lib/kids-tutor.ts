// The guest AI tutor is off on kids' exams (14 Oct 2026, Release 2, build
// kids-crawler — founder decision of 11 Oct 2026: "kids' olympiad guest
// tutor OFF").
//
// A kids' exam is the one guard Release 2 uses for every under-13 rule
// (src/lib/signin-cta.ts under13ExamGuard): the SOF (SOF_*), Silverzone
// (SZF_*) and NSTSE olympiads, the olympiads whose stored eligibility starts
// below Class 8 (PRIL, ZIO) and JNVST. Children from Class 1 sit them, and the
// founder rule is that a child under 13 gives us no data. A guest's tutor
// turn on one of them used to reach the AI and leave an AnonTutorLog row with
// the question in it: 11 rows in the 14 days to 11 Oct 2026 (SOF IEO 3, SOF
// IGKO 3, SOF ICO 2, ZIO 2, SOF NSO 1; 9 of them with no cookie), read
// SELECT-only by scripts/measure-guest-seed-hold.ts.
//
// Now a GUEST on such an exam gets no AI call and nothing is logged — no
// AnonTutorLog row, no question text kept anywhere, no carry into an account:
//   • /chat?examCode=<kids exam> (every "Ask Shishya" link from the exam's
//     hub, topic pages, quiz and exam-week block lands there) renders this
//     short line instead of the chat — the island never mounts, so a seed in
//     the URL is never sent (src/app/chat/KidsGuestTutorOff.tsx);
//   • POST /api/chat refuses the turn on the server before the study-only
//     pre-filter (which logs a guest turn), the exam read and the model: the
//     same line streams as a fixed reply with code "kids-guest-off". A child
//     in distress still gets the pre-filter's helpline reply (Tele-MANAS
//     14416, Childline 1098, 112) — with nothing logged.
// The line points to what needs no account and no data: the exam's free
// practice questions (/exams/{CODE}/quiz, only when the exam has checked
// questions) and the conducting body's own sample papers on the hub (only
// when the hub lists them), else the exam's page. It invites no sign-up — a
// kids' exam's pages offer none (Release 2).
// Signed-in members on kids' exams are unchanged (founder: a separate matter):
// they get the full exam tutor — enrolled on the exam, the conversation kept
// in their account, tools on — as on any exam; the under-13 line ("I am 11")
// still closes a chat and keeps nothing. 37 member questions on SOF exams in
// the 30 days to 11 Oct 2026, from 11 member-exam pairs.
//
// Pure: no React, no Next, no DB.

import { under13ExamGuard } from "@/lib/signin-cta";

/** The done event's code for the refusal (the chat shows it as a fixed reply). */
export const KIDS_GUEST_TUTOR_CODE = "kids-guest-off";

/** True when this turn is a guest's on a kids' exam: no AI, nothing logged.
 *  The code is matched as sent and upper-cased (a lower-case URL reaches the
 *  same hub), so a different spelling can never slip past the guard. */
export function kidsGuestTutorOff(t: { signedIn: boolean; general?: boolean | null; examCode: string | null | undefined }): boolean {
  if (t.signedIn || t.general === true) return false;
  const code = typeof t.examCode === "string" ? t.examCode.trim() : "";
  if (!code) return false;
  return under13ExamGuard(code) || under13ExamGuard(code.toUpperCase());
}

// ── A kids' exam NAMED in a guest's question (12 Oct 2026) ─────────────
// The rule above keys on the chat's exam. A guest in the general chat (or on
// another exam's chat) who asks about a kids' exam by name got the AI and an
// AnonTutorLog row: 12 Oct 2026 12:22 IST, "Quiz me on my weakest SOF NSO
// topic" (the hub seed's own words) in the general chat, answered and logged.
// So any signed-out turn whose message names a kids' exam gets the same fixed
// line for that exam — no model call, nothing logged (the chat route checks
// it right after the exam-code rule, before anything is written).
// What counts as naming one — the catalogue's own names, and a short name
// only where the message is clearly about a children's olympiad (review,
// 12 Oct 2026: a bare "NSO" is also the National Statistics Office of GDP and
// PLFS questions, "Navodaya" also the NVS teacher recruitment):
//   • SOF / Silverzone with the olympiad's letters, any case ("SOF NSO",
//     "sof_imo", "Silverzone IOM", "SZF-IOS"), and SOF's / Silverzone's full
//     names ("National Science Olympiad", "International English Olympiad",
//     "International Olympiad of Mathematics" …);
//   • NSTSE / "Science Talent Search Exam(ination)" / Unified Council, PRIL /
//     "Panini Linguistics Olympiad", ZIO / "Zonal Informatics Olympiad",
//     JNVST, IGKO (all unique);
//   • a short name alone — nso, ieo, ico, iho, ios, iom, ioel, nco, isso, any
//     case — only beside "olympiad", "class 1-7" / "grade 1-7" / "1st-7th
//     class" or "level 1/2", and never beside GDP, PLFS, CPI, IIP, NSSO,
//     MoSPI, statistics, survey or "NSO Group";
//   • IMO and "International Mathematics Olympiad" only beside SOF, class /
//     grade 1-7 or level 1/2 — never beside IOQM, INMO or "Mathematical"
//     (the International Mathematical Olympiad of older students);
//   • Navodaya / JNV only beside entrance, admission, selection test or
//     class 6 / 9 — never beside Samiti, NVS, recruitment, TGT, PGT,
//     teacher, staff or vacancy;
//   • SOF / Silverzone alone, any case ("sof olympiad", "Science Olympiad
//     Foundation"): no one exam, so the line names the family and links the
//     exam list.
// "sofa", "software", "pril" inside a word, a bare "IMO" are not names.

const KIDS_CONTEXT = /\bolympiads?\b|\b(?:class|grade|std|standard)\s*[1-7](?:st|nd|rd|th)?\b|\b[1-7](?:st|nd|rd|th)\s+(?:class|grade|std|standard)\b|\blevel\s*[12]\b/i;
const KIDS_CLASS_CONTEXT = /\bSOF\b|\b(?:class|grade|std|standard)\s*[1-7](?:st|nd|rd|th)?\b|\b[1-7](?:st|nd|rd|th)\s+(?:class|grade|std|standard)\b|\blevel\s*[12]\b/i;
const ADULT_STATS = /\b(?:GDP|PLFS|CPI|IIP|NSSO|MoSPI|statistics?|statistical|survey|NSO\s+Group|Pegasus|spyware)\b/i;
const REAL_IMO = /\b(?:IOQM|INMO|RMO|Mathematical)\b/i;
const NAVODAYA_ENTRY = /\b(?:entrance|admission|selection\s+test|lateral\s+entry|class\s*(?:6|vi|9|ix)(?:th)?|6th\s+class|9th\s+class)\b/i;
const NAVODAYA_JOBS = /\b(?:samiti|NVS|recruit\w*|TGT|PGT|teachers?|staff|vacanc\w*|non[-\s]teaching|policy|established|set\s+up)\b/i;

type NamedRule = { re: RegExp; code: string | ((m: RegExpMatchArray) => string); when?: (msg: string) => boolean };
const KIDS_NAMED: ReadonlyArray<NamedRule> = [
  { re: /\bSOF[\s_-]*(IMO|NSO|IEO|IGKO|ICO|IHO)\b/i, code: (m) => `SOF_${m[1].toUpperCase()}` },
  { re: /\b(?:SZF|Silver\s?zone)[\s_-]*(IOS|IOEL|IOM)\b/i, code: (m) => `SZF_${m[1].toUpperCase()}` },
  { re: /\bInternational English Olympiad\b/i, code: "SOF_IEO" },
  { re: /\bNational Science Olympiad\b/i, code: "SOF_NSO" },
  { re: /\bInternational General Knowledge Olympiad\b/i, code: "SOF_IGKO" },
  { re: /\bInternational Commerce Olympiad\b/i, code: "SOF_ICO" },
  { re: /\bInternational Hindi Olympiad\b/i, code: "SOF_IHO" },
  { re: /\bInternational Olympiad of Science\b/i, code: "SZF_IOS" },
  { re: /\bInternational Olympiad of Mathematics\b/i, code: "SZF_IOM" },
  { re: /\bInternational Olympiad of English Language\b/i, code: "SZF_IOEL" },
  { re: /\bNSTSE\b|\bScience Talent Search Exam(?:ination)?\b|\bUnified Council\b/i, code: "NSTSE" },
  { re: /\bPRIL\b|\bPanini Linguistics Olympiad\b/, code: "PRIL" },
  { re: /\bZIO\b|\bZonal Informatics Olympiad\b/, code: "ZIO" },
  { re: /\bJNVST\b/i, code: "JNVST" },
  { re: /\bIGKO\b/i, code: "SOF_IGKO" },
  { re: /\b(NSO|IEO|ICO|IHO)\b/i, code: (m) => `SOF_${m[1].toUpperCase()}`, when: (msg) => KIDS_CONTEXT.test(msg) && !ADULT_STATS.test(msg) },
  { re: /\b(IOS|IOM|IOEL)\b/i, code: (m) => `SZF_${m[1].toUpperCase()}`, when: (msg) => KIDS_CONTEXT.test(msg) && !ADULT_STATS.test(msg) },
  { re: /\bIMO\b|\bInternational Mathematics Olympiad\b/i, code: "SOF_IMO", when: (msg) => KIDS_CLASS_CONTEXT.test(msg) && !REAL_IMO.test(msg) },
  { re: /\bNavodaya\b|\bJNV\b/i, code: "JNVST", when: (msg) => NAVODAYA_ENTRY.test(msg) && !NAVODAYA_JOBS.test(msg) },
];

const KIDS_FAMILY_NAMED: ReadonlyArray<{ re: RegExp; family: string; when?: (msg: string) => boolean }> = [
  { re: /\bSOF\b|\bScience Olympiad Foundation\b/i, family: "SOF olympiads" },
  { re: /\bSZF\b|\bSilver\s?zone\b/i, family: "Silverzone olympiads" },
  { re: /\b(?:NCO|ISSO)\b/i, family: "SOF olympiads", when: (msg) => KIDS_CONTEXT.test(msg) && !ADULT_STATS.test(msg) },
];

/** The kids' exam a message names: `{ code }` for one exam (a code the
 *  under-13 guard covers), `{ family }` for SOF or Silverzone named alone,
 *  or null. Pure; reads only the message. */
export function kidsExamNamedIn(message: string | null | undefined): { code: string } | { family: string } | null {
  if (typeof message !== "string" || !message.trim()) return null;
  for (const n of KIDS_NAMED) {
    const m = message.match(n.re);
    if (!m || (n.when && !n.when(message))) continue;
    const code = typeof n.code === "string" ? n.code : n.code(m);
    if (under13ExamGuard(code)) return { code };
  }
  for (const f of KIDS_FAMILY_NAMED) if (f.re.test(message) && (!f.when || f.when(message))) return { family: f.family };
  return null;
}

/** The first kids' exam named in a guest's conversation: this message, then
 *  its earlier turns (both sides — the kids' line itself names the exam), so
 *  a follow-up after the line is held too (review, 12 Oct 2026). */
export function kidsExamNamedInConversation(
  message: string | null | undefined,
  history: ReadonlyArray<{ role?: string; content?: unknown }> | null | undefined,
): { code: string } | { family: string } | null {
  const now = kidsExamNamedIn(message);
  if (now) return now;
  for (const h of history ?? []) {
    const hit = typeof h?.content === "string" ? kidsExamNamedIn(h.content) : null;
    if (hit) return hit;
  }
  return null;
}

export type KidsTutorLang = "en" | "hi" | "te";

/** hi / te lines are for founder review (14 Oct 2026). {exam} = the exam's short name.
 *  Review, 11 Oct 2026: the line says only what is true of this turn — no
 *  guest tutor here, because children sit the exam. It used to add "Shishya
 *  keeps no questions from children", which a signed-in member's chat on a
 *  kids' exam contradicts (kept in the account: 37 questions in 30 days). */
export const KIDS_GUEST_TUTOR_COPY: Record<KidsTutorLang, { line: string; quiz: string; samples: string; hub: string; browse: string }> = {
  en: {
    line: "The AI tutor is not open to guests on {exam}, because children sit this exam. Practise free instead, with no account:",
    quiz: "Free practice questions →",
    samples: "Official sample papers →",
    hub: "{exam} page →",
    browse: "All exams →",
  },
  hi: {
    line: "{exam} पर AI ट्यूटर बिना अकाउंट वाले मेहमानों के लिए खुला नहीं है, क्योंकि यह परीक्षा बच्चे देते हैं। बिना अकाउंट मुफ़्त अभ्यास करें:",
    quiz: "मुफ़्त अभ्यास प्रश्न →",
    samples: "आधिकारिक सैंपल पेपर →",
    hub: "{exam} पेज →",
    browse: "सभी परीक्षाएँ →",
  },
  te: {
    line: "{exam} లో AI ట్యూటర్ అకౌంట్ లేని అతిథులకు అందుబాటులో లేదు, ఎందుకంటే ఈ పరీక్షను పిల్లలు రాస్తారు. అకౌంట్ లేకుండానే ఉచితంగా ప్రాక్టీస్ చేయండి:",
    quiz: "ఉచిత ప్రాక్టీస్ ప్రశ్నలు →",
    samples: "అధికారిక శాంపిల్ పేపర్లు →",
    hub: "{exam} పేజీ →",
    browse: "అన్ని పరీక్షలు →",
  },
};

export function kidsTutorLang(v: string | null | undefined): KidsTutorLang {
  return v === "hi" || v === "te" ? v : "en";
}

export interface KidsTutorOffer {
  /** The exam's code as stored (the hub's URL). */
  examCode: string;
  /** The exam's short name, or the code when unknown. */
  exam: string;
  /** The exam has checked questions, so /exams/{CODE}/quiz serves some. */
  hasQuestions: boolean;
  /** The hub lists the body's own sample papers (#official-sample-papers). */
  hasSamplePapers: boolean;
  /** No active exam has this code (an inactive one such as JNVST): no hub to send to. */
  unknown?: true;
}

/** The offer for a code no active exam has: the line names the code, the link is the exam list. */
export function unknownKidsTutorOffer(code: string): KidsTutorOffer {
  return { examCode: code, exam: code, hasQuestions: false, hasSamplePapers: false, unknown: true };
}

export interface KidsTutorLink {
  kind: "quiz" | "samples" | "hub" | "browse";
  href: string;
  label: string;
}

const fill = (s: string, exam: string) => s.split("{exam}").join(exam);

/** The line and its links, in order: practice, sample papers, and the exam's
 *  page only when neither exists (there is always somewhere to go — the exam
 *  list when no active exam has the code). */
export function kidsGuestTutorView(offer: KidsTutorOffer, lang: KidsTutorLang): { line: string; links: KidsTutorLink[] } {
  const c = KIDS_GUEST_TUTOR_COPY[lang];
  const code = encodeURIComponent(offer.examCode);
  const links: KidsTutorLink[] = [];
  if (offer.unknown) return { line: fill(c.line, offer.exam), links: [{ kind: "browse", href: "/exams/browse", label: c.browse }] };
  if (offer.hasQuestions) links.push({ kind: "quiz", href: `/exams/${code}/quiz`, label: c.quiz });
  if (offer.hasSamplePapers) links.push({ kind: "samples", href: `/exams/${code}#official-sample-papers`, label: c.samples });
  if (links.length === 0) links.push({ kind: "hub", href: `/exams/${code}`, label: fill(c.hub, offer.exam) });
  return { line: fill(c.line, offer.exam), links };
}

/** The refusal as the chat's reply text (markdown links, absolute so a copied answer still works). */
export function kidsGuestTutorText(offer: KidsTutorOffer, lang: KidsTutorLang): string {
  const v = kidsGuestTutorView(offer, lang);
  return [v.line, ...v.links.map((l) => `- [${l.label.replace(/\s*→$/, "")}](https://shishya.in${l.href})`)].join("\n");
}

/** The route's frames: the line as a fixed reply (no meta frame — no conversation, nothing stored). */
export function kidsGuestTutorFrames(text: string): string {
  return (
    `event: delta\ndata: ${JSON.stringify(text)}\n\n` +
    `event: done\ndata: ${JSON.stringify({ messageId: "kids", actions: [], toolCalls: [], code: KIDS_GUEST_TUTOR_CODE })}\n\n`
  );
}
