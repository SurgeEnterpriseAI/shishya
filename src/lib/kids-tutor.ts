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
