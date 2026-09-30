// Late answers (1 Oct 2026) — a member's question that failed while the AI
// was unavailable is answered in its own conversation once the AI is back,
// and the student is told. The pure rules and the run itself (with its DB and
// model steps passed in, so every rule is tested without a DB or a model).
//
// Why (1 Oct 2026 read): when the organisation's Anthropic credit hit zero
// every tutor call failed at once. 30 Sep 06:47-12:01 IST: 12 member questions
// from 7 people (4 signed up that day) failed and NONE was ever answered; 28
// Sep 09:21-11:35: 9 of 17 failed. A failed member turn is a USER ChatMessage
// row with metadata.failedAt (POST /api/chat, src/lib/chat-turn-dedupe.ts).
// Founder brief: "the next day when they come whatever they wanted to ask …
// will be available"; two-actor rule: every handoff needs "how does the other
// side know?".
//
// The run (GET /api/cron/tutor-answer-later, hourly):
//   • picks member USER rows with failedAt (or a claim a crashed run left
//     behind, older than LATE_CLAIM_STALE_MS), asked in the last 72 hours,
//     that the chat PROMISED a late answer (latePromised; rows from before
//     the promise existed — the 28-30 Sep outages — carry no failedReason and
//     count as promised), with NO later ASSISTANT row in the conversation and
//     not asked again and answered in ANOTHER conversation since (/chat opens
//     a fresh conversation by default, so a student who came back and asked
//     again already has the answer), the account still there, not
//     late-answered already, tries left, never a Class 1-7 container; oldest
//     first, one student's questions together;
//   • makes ONE cheap availability probe first (a 1-token call) and stops at
//     once when it fails — and again at the first answer that fails for an
//     AI-availability reason (credit, auth, overload, rate limit, 5xx,
//     timeout, network): never hammer a dry account; a turn-specific failure
//     ("other") only gives up that turn for this run;
//   • a try is spent only by a failure that may be the question's own (1 Oct
//     2026 review): "other" and a 5xx. An empty balance, a bad key, an
//     overload, a rate limit, a timeout or the network say nothing about the
//     question, so their try is given back — otherwise an outage would use up
//     the oldest question's tries run after run and its promise would be
//     broken. A 5xx still counts: one question the API fails on every time
//     would otherwise stop every run, oldest first, for 72 hours;
//   • hard caps per run: LATE_MAX_ANSWERS answers, LATE_MAX_USD by the AiUsage
//     costs of its own calls. Before each answer the DB step prices THAT
//     request at its worst (lateAnswerWorstUsd: every prompt token a cold
//     cache write, every call filling max_tokens, the whole tool loop) and
//     the answer starts only when that fits in what is left — so the last
//     answer can never take the run past the cap;
//   • a student's questions are one group: a group after the first starts
//     only when all of it fits (answers, a planning cost per answer, time);
//     otherwise the run stops and leaves it whole for the next run. The run's
//     first group always starts (so a student with more questions than one
//     run allows is never starved);
//   • answers with the SAME pipeline and context the student would have got
//     (src/lib/tutor-turn.ts → tutorStream: exam / general / school mode, the
//     student state, the tutor memory, the stored band, the topic or chapter,
//     the reply language the route recorded) — no prompt of its own;
//   • claims each row atomically first (an UPDATE that only succeeds while the
//     row is still failed and unanswered; it also stamps answeringAt, so a
//     Retry from the chat meanwhile WAITS for this answer instead of paying
//     twice — chat-turn-dedupe.ts mayStillBeAnswering), then stores the reply
//     as an ASSISTANT row { lateAnswer: true, answeredAfterMs } dated right
//     after its question (so a conversation with two failed questions reads
//     Q1 → A1 → Q2 → A2), and marks the question lateAnsweredAt — in one
//     transaction that only commits while the claim is still this run's. A
//     second run never answers twice;
//   • tells the student: the thread shows "Answered later — our AI tutor was
//     unavailable when you asked." on that reply; the pick-up card
//     (src/lib/pickup.ts) leads with "Your question is answered"; and ONE
//     email ("Your question is answered", quoting their own question, saying
//     the AI tutor answered it), never more than one such mail per student in
//     24 hours (an EmailTouch guard row, reserved under a per-student lock),
//     and only to accounts the existing student mails reach (an address, not
//     unsubscribed, not a school-only account — src/lib/db/tutor-answer-email.ts).
//     The mail is driven by the questions themselves (1 Oct 2026 review): a
//     late-answered question not yet in a mail (no lateMailAt) is "waiting to
//     be told". A student's mail goes right after their group is done — never
//     after the whole run, so a run that dies later loses no one's mail — and
//     covers every question of theirs still waiting. A group the run could
//     not finish (a cap, the clock, an outage, a claim held elsewhere) sends
//     nothing yet: the rest is answered by a later run and ONE mail then
//     covers all of it (a student whose other questions keep failing is
//     mailed what is answered after LATE_MAIL_WAIT_MAX_MS anyway, and the
//     rest waits for the next day's mail); a student with nothing left to
//     answer but questions still waiting (a run died, a guard held the mail)
//     is told at the end of the next run. A question stays "waiting" for
//     LATE_MAIL_PENDING_MS after its answer, and not once the student has
//     opened that answer (they know). A question is marked told BEFORE its
//     mail is sent (and unmarked when the send fails), so a run that dies
//     between the two can lose that one mail but never sends it twice.
//     A school chat (Class 8-12) gets the late answer in its own class chat
//     and nothing else: the existing mails and the pick-up card never quote a
//     school chat. Guests get none of this (no account to answer into;
//     src/lib/tutor-unavailable.ts).
//
// Pure — no DB, no SDK. DB + model steps: src/lib/db/tutor-late-answer.ts.
// Tests: tests/unit/tutor-late-answer.test.ts

import { isStudentModeClass, schoolContainerClassOf } from "@/lib/school/student-classes";
import { isAiUnavailable, TUTOR_FAIL_REASONS, type TutorFailReason } from "@/lib/tutor-unavailable";
import { chatResumeHref } from "@/lib/recent-chats";
import { emailQuote } from "@/lib/pickup";
import { looksNativelyIn } from "@/lib/preferred-lang";
import type { Locale } from "@/lib/i18n";

/** Questions older than this are left alone. */
export const LATE_WINDOW_MS = 72 * 3600_000;
/** Answers per run (hard cap). */
export const LATE_MAX_ANSWERS = 20;
/** USD per run (hard cap), by the AiUsage cost of the run's own calls. */
export const LATE_MAX_USD = 1.0;
/**
 * A PLANNING cost per answer, for "does this student's whole group fit in
 * what is left of the run?" (a typical tutor turn is a few cents; a tools-on
 * exam turn at its worst is more). Not the cap's guard: each answer is priced
 * at its own worst case before it starts (lateAnswerWorstUsd).
 */
export const LATE_ANSWER_PLAN_USD = 0.25;
/** The character estimate of a prompt is raised by this much before it is priced (as the question generator's spend guard). */
export const LATE_PROMPT_TOKEN_MARGIN = 1.3;
/** Tool results one tool round may add to the next call's prompt (5 practice questions, 8 weak topics …). */
export const LATE_TOOL_ROUND_TOKENS = 4_000;
/** Late attempts per question before the run gives up on it (only question-specific failures spend one). */
export const LATE_MAX_TRIES = 3;
/** A claim older than this was left by a run that died (the function's limit is 300 s). */
export const LATE_CLAIM_STALE_MS = 10 * 60_000;
/** No new answer starts after this much of the run (maxDuration 300 s; a tools-on answer is up to 4 calls). */
export const LATE_TIME_GUARD_MS = 150_000;
/** A planning time per answer, for "does this student's whole group fit before the time guard?". */
export const LATE_ANSWER_PLAN_MS = 30_000;
/** No mail step starts after this much of the run (the questions stay waiting for the next run). */
export const LATE_MAIL_GUARD_MS = 240_000;
/** A late answer not yet mailed stays "waiting to be told" this long after it was stored. */
export const LATE_MAIL_PENDING_MS = 48 * 3600_000;
/**
 * A student whose other questions keep failing is not kept waiting for their
 * mail longer than this: their answered questions are mailed anyway (the rest
 * then wait for the next day's mail, or the pick-up card).
 */
export const LATE_MAIL_WAIT_MAX_MS = 12 * 3600_000;
/** Rows the selection reads per run (oldest first). */
export const LATE_SELECT_LIMIT = 300;
/** At most one "Your question is answered" mail per student in this window. */
export const ANSWERED_EMAIL_GAP_MS = 24 * 3600_000;
/** The mail's tag (sendEmail logs 'sent:<tag>'; the run's own guard row is '<tag>'). */
export const ANSWERED_EMAIL_TAG = "tutor-answered";
/** AiUsage feature of the run's calls (tutorStream books "<feature>-wrap" for its wrap call). */
export const LATE_USAGE_FEATURE = "tutor-late";
/** The probe's AiUsage feature. */
export const LATE_PROBE_FEATURE = "tutor-late-probe";
/** Questions listed in one mail; the rest are counted. */
export const ANSWERED_EMAIL_MAX_ITEMS = 3;

// ── The stored row ─────────────────────────────────────────────────────

/** What a signed-in USER row's metadata may carry (the route's + the run's fields). */
export interface LateTurnMeta {
  turnId?: string;
  answeringAt?: number;
  failedAt?: number;
  /** Why the turn failed (1 Oct 2026, src/lib/ai/tutor-failure.ts). */
  failedReason?: TutorFailReason;
  /** The chat told the student this question would be answered here later (sticky). */
  latePromised?: boolean;
  /** The reply language the route resolved for the turn ("HI", "EN", "kok"). */
  replyLang?: string;
  /** The topic (exam) or chapter (school) the chat was opened on. */
  topicCode?: string;
  /** The chat promised an email for this turn. */
  emailPromised?: boolean;
  /** A run's claim (ms); also the claim's token. */
  lateClaimAt?: number;
  /** Late attempts so far (a claim counts one; an outage gives it back). */
  lateTries?: number;
  /** When the late answer was stored (ms). */
  lateAnsweredAt?: number;
  /** When the mail that told the student about this answer went (ms). */
  lateMailAt?: number;
}

const REPLY_LANG_RE = /^[A-Za-z]{2,3}$/;
const TOPIC_CODE_RE = /^[A-Za-z0-9_.-]{1,80}$/;

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** The fields of a USER row's metadata; anything malformed is dropped. */
export function lateTurnMeta(metadata: unknown): LateTurnMeta {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const m = metadata as Record<string, unknown>;
  const out: LateTurnMeta = {};
  if (typeof m.turnId === "string" && m.turnId) out.turnId = m.turnId;
  for (const k of ["answeringAt", "failedAt", "lateClaimAt", "lateTries", "lateAnsweredAt", "lateMailAt"] as const) {
    const v = num(m[k]);
    if (v !== undefined) out[k] = v;
  }
  if (typeof m.failedReason === "string" && (TUTOR_FAIL_REASONS as readonly string[]).includes(m.failedReason)) {
    out.failedReason = m.failedReason as TutorFailReason;
  }
  if (m.latePromised === true) out.latePromised = true;
  // Both land in the prompt / a keyed read: a closed shape only.
  if (typeof m.replyLang === "string" && REPLY_LANG_RE.test(m.replyLang)) out.replyLang = m.replyLang;
  if (typeof m.topicCode === "string" && TOPIC_CODE_RE.test(m.topicCode)) out.topicCode = m.topicCode;
  if (typeof m.emailPromised === "boolean") out.emailPromised = m.emailPromised;
  return out;
}

/**
 * The chat promised this question a late answer (1 Oct 2026 review): the
 * route recorded latePromised — or the row has no failedReason at all, i.e.
 * it failed before the route recorded reasons (the 28-30 Sep outages, which
 * were credit outages). A turn that failed for any other reason ("other": our
 * own bug, a DB timeout) was told "Something went wrong — please try sending
 * that again" and promised nothing, so it is not answered later. Mirrors the
 * SQL filter in src/lib/db/tutor-late-answer.ts.
 */
export function lateAnswerPromised(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return true;
  const m = metadata as Record<string, unknown>;
  return m.latePromised === true || m.failedReason == null;
}

/** A failed member question as the run's selection reads it. */
export interface LateCandidateRow {
  id: string;
  sessionId: string;
  /** The conversation's owner; null when the account is gone. */
  userId: string | null;
  content: string;
  createdAt: Date;
  metadata: unknown;
  /** An ASSISTANT row is stored after this one in its conversation. */
  laterAssistant: boolean;
  /** The student asked the same text again later, in any conversation, and that got a reply. */
  reAsked?: boolean;
  /** The conversation's exam; null = the general chat. */
  examCode: string | null;
  examCategory: string | null;
}

/** = SCHOOL_CATEGORY (src/lib/db/exam-scope.ts), restated so this file stays import-free of Prisma. */
const SCHOOL_CATEGORY_NAME = "SCHOOL_BOARD";

/** A school conversation (a class container, Class 8-12 by the time it was stored). */
export function isSchoolTurn(row: { examCategory: string | null }): boolean {
  return String(row.examCategory ?? "").toUpperCase() === SCHOOL_CATEGORY_NAME;
}

/** A Class 1-7 container — or any school row whose class is not a student-mode class. */
export function isUnder13SchoolTurn(row: { examCode: string | null; examCategory: string | null }): boolean {
  if (!isSchoolTurn(row)) return false;
  const cls = row.examCode ? schoolContainerClassOf(row.examCode) : null;
  return cls === null || !isStudentModeClass(cls);
}

export type LateSkip =
  | "outside-window"
  | "no-user"
  | "late-answered"
  | "answered"
  | "re-asked"
  | "no-promise"
  | "class-1-7"
  | "tries"
  | "in-flight"
  | "not-failed";

/** Why a row is not answered now, or null when it is a candidate. */
export function lateCandidateVerdict(row: LateCandidateRow, nowMs: number): LateSkip | null {
  const asked = row.createdAt.getTime();
  if (!Number.isFinite(asked) || asked > nowMs || nowMs - asked > LATE_WINDOW_MS) return "outside-window";
  if (!row.userId) return "no-user";
  const meta = lateTurnMeta(row.metadata);
  if (meta.lateAnsweredAt != null) return "late-answered";
  if (row.laterAssistant) return "answered";
  if (row.reAsked) return "re-asked";
  if (!lateAnswerPromised(row.metadata)) return "no-promise";
  if (isUnder13SchoolTurn(row)) return "class-1-7";
  if ((meta.lateTries ?? 0) >= LATE_MAX_TRIES) return "tries";
  if (meta.failedAt != null) return null;
  if (meta.lateClaimAt != null) return nowMs - meta.lateClaimAt >= LATE_CLAIM_STALE_MS ? null : "in-flight";
  return "not-failed";
}

/** The candidates, oldest first, and the count of each reason a row was left. */
export function selectLateCandidates(
  rows: readonly LateCandidateRow[],
  nowMs: number,
): { picked: LateCandidateRow[]; skipped: Partial<Record<LateSkip, number>> } {
  const picked: LateCandidateRow[] = [];
  const skipped: Partial<Record<LateSkip, number>> = {};
  for (const r of rows) {
    const why = lateCandidateVerdict(r, nowMs);
    if (why) skipped[why] = (skipped[why] ?? 0) + 1;
    else picked.push(r);
  }
  picked.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { picked, skipped };
}

/** One student's questions per group, oldest first inside; students in the order of their oldest question. */
export function studentGroups(pickedOldestFirst: readonly LateCandidateRow[]): LateCandidateRow[][] {
  const groups = new Map<string, LateCandidateRow[]>();
  for (const r of pickedOldestFirst) {
    const k = r.userId ?? "";
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  return [...groups.values()];
}

/** Oldest first, one student's questions together (students in the order of their oldest question). */
export function orderByStudent(pickedOldestFirst: readonly LateCandidateRow[]): LateCandidateRow[] {
  return studentGroups(pickedOldestFirst).flat();
}

/**
 * The language to answer a row in when the route recorded none (rows from
 * before 1 Oct 2026): the script the question is written in, when it is a
 * native Indian script (a Devanagari question is answered in Hindi, a Telugu
 * one in Telugu …), else null — the caller then falls back to the account's
 * language. The cookie language of that visit cannot be recovered.
 */
const SCRIPT_LOCALES: readonly Locale[] = ["hi", "te", "ta", "kn", "ml", "gu", "pa", "bn", "or", "ur"];
export function questionScriptLocale(text: string): Locale | null {
  for (const l of SCRIPT_LOCALES) if (looksNativelyIn(text, l)) return l;
  return null;
}

// ── Cost ───────────────────────────────────────────────────────────────

/** A model's list prices, USD per million tokens (src/lib/ai/usage.ts PRICING). */
export interface LateModelPrice {
  in: number;
  out: number;
  cacheW: number;
}

/**
 * The most one tutor answer can cost, before it is asked (1 Oct 2026 review):
 * every call of the tool loop (maxCalls — 4 with tools, 1 without) fills
 * maxTokens; the system blocks and tool definitions are priced as a cold
 * 1-hour cache write on EVERY call (2× the input price — the dearest way a
 * prompt token can bill); the conversation at the input price; and each call
 * after the first carries the previous reply plus LATE_TOOL_ROUND_TOKENS of
 * tool results more. Token counts are character estimates raised by
 * LATE_PROMPT_TOKEN_MARGIN.
 */
export function lateAnswerWorstUsd(a: {
  systemTokens: number;
  messageTokens: number;
  maxCalls: number;
  maxTokens: number;
  price: LateModelPrice;
}): number {
  const sys = Math.ceil(Math.max(0, a.systemTokens) * LATE_PROMPT_TOKEN_MARGIN);
  const msg = Math.ceil(Math.max(0, a.messageTokens) * LATE_PROMPT_TOKEN_MARGIN);
  const sysRate = Math.max(a.price.in * 2, a.price.cacheW, a.price.in);
  const calls = Math.max(1, Math.floor(a.maxCalls));
  let usd = 0;
  for (let i = 0; i < calls; i++) {
    const grown = msg + i * (a.maxTokens + LATE_TOOL_ROUND_TOKENS);
    usd += (sys / 1e6) * sysRate + (grown / 1e6) * a.price.in + (a.maxTokens / 1e6) * a.price.out;
  }
  return usd;
}

// ── The run ────────────────────────────────────────────────────────────

export interface LateAnswerOk {
  ok: true;
  text: string;
  actions: unknown;
  toolCalls: unknown[];
  costUsd: number;
}

export interface LateAnswerFail {
  ok: false;
  reason: TutorFailReason;
  costUsd: number;
  /** Never try this question again (its conversation is gone, a school row the tutor would refuse …). */
  final?: boolean;
  /** For the report: why a final failure was final. */
  note?: string;
}

/** The answer's worst case does not fit in what is left of the run: not asked, nothing spent. */
export interface LateAnswerOverBudget {
  ok: false;
  overBudget: true;
  worstUsd: number;
  costUsd: 0;
}

export type LateAnswerOutcome = LateAnswerOk | LateAnswerFail | LateAnswerOverBudget;

export function isOverBudget(o: LateAnswerOutcome): o is LateAnswerOverBudget {
  return o.ok === false && (o as LateAnswerOverBudget).overBudget === true;
}

/**
 * A failure that says nothing about the question itself — the account (credit,
 * auth), the API's capacity (overload, rate limit) or the way there (timeout,
 * network): its try is given back. "other" and a 5xx may be the question's
 * own, so they spend one (see the header).
 */
export function lateFailRefundsTry(reason: TutorFailReason): boolean {
  return reason === "credit" || reason === "auth" || reason === "overloaded" || reason === "rate-limit" || reason === "timeout" || reason === "network";
}

/** How a claimed row is given back. */
export interface LateRelease {
  /** Why it failed; null = it was never asked (over budget). */
  reason: TutorFailReason | null;
  /** Never try it again (spends all its tries). */
  final: boolean;
  /** Give back the try the claim took. */
  refundTry: boolean;
}

export type LateProbe = { ok: true; costUsd: number } | { ok: false; reason: TutorFailReason };

export interface LateEmailTarget {
  userId: string;
  to: string;
  name: string | null;
}

export interface LateEmailItem {
  sessionId: string;
  examCode: string | null;
  question: string;
  askedAt: Date;
}

/** A late-answered question not told yet, as the mail step reads it (never a school chat). */
export interface LatePendingRow {
  /** The question's row. */
  id: string;
  userId: string;
  sessionId: string;
  examCode: string | null;
  content: string;
  createdAt: Date;
  /** When the late answer was stored (the question's lateAnsweredAt). */
  answeredAt: Date;
}

export interface LateAnswerDeps {
  /** USER rows asked since `sinceMs` that may be candidates (the SQL pre-filter). */
  loadRows(sinceMs: number, nowMs: number): Promise<LateCandidateRow[]>;
  /** One tiny call: can the tutor be served right now? */
  probe(): Promise<LateProbe>;
  /** Atomic: true only when this run now owns the row (still failed, unanswered, unclaimed or stale). */
  claim(row: LateCandidateRow, claimMs: number): Promise<boolean>;
  /** The tutor's answer through the chat's own pipeline, only when its worst case fits in `remainingUsd`. Never throws. */
  answer(row: LateCandidateRow, remainingUsd: number): Promise<LateAnswerOutcome>;
  /** Store the reply and mark the question, only while the claim is still ours. */
  save(row: LateCandidateRow, claimMs: number, answer: LateAnswerOk, nowMs: number): Promise<boolean>;
  /** Give the row back as failed (it stays a candidate for a later run unless `final`). */
  release(row: LateCandidateRow, claimMs: number, how: LateRelease, nowMs: number): Promise<void>;
  /** Late-answered questions answered since `sinceMs`, not mailed, not a school chat, not opened — of these students, or everyone's (null). */
  pendingMail(sinceMs: number, userIds: string[] | null): Promise<LatePendingRow[]>;
  /** Of these students, the ones the mail may reach (address, not unsubscribed, not school-only). */
  emailTargets(userIds: string[]): Promise<LateEmailTarget[]>;
  /** Reserve today's one mail for this student; null when one went (or is going) in the last 24 hours. */
  reserveEmail(userId: string): Promise<string | null>;
  /** Drop a reservation whose mail was not sent. */
  unreserveEmail(guardId: string): Promise<void>;
  /** Mark these questions told (lateMailAt), BEFORE the send: a run that dies after sending never mails them twice. */
  markMailed(questionIds: string[], atMs: number): Promise<void>;
  /** Undo markMailed after a send that failed. */
  unmarkMailed(questionIds: string[], atMs: number): Promise<void>;
  sendEmail(target: LateEmailTarget, items: LateEmailItem[]): Promise<boolean>;
  clock?: () => number;
}

export interface LateRunOptions {
  now: Date;
  dry?: boolean;
  /** A lower cap for this run (never above LATE_MAX_ANSWERS). */
  maxAnswers?: number | null;
  /** A lower USD cap for this run (never above LATE_MAX_USD). */
  maxUsd?: number | null;
}

export type LateStop = "max-answers" | "max-usd" | "time" | TutorFailReason;

export interface LateRunReport {
  ok: true;
  dry: boolean;
  rows: number;
  candidates: number;
  students: number;
  skipped: Partial<Record<LateSkip, number>>;
  probe: "ok" | "not-needed" | "dry" | TutorFailReason;
  answered: number;
  failed: number;
  /** Answers whose claim was lost before they could be stored, or whose store failed (discarded). */
  notStored: number;
  /** Rows another run held when this one tried to claim them. */
  claimedElsewhere: number;
  /** DB steps that threw (a claim, a save, a mail read); the run went on. */
  errors: number;
  stopped: LateStop | null;
  capUsd: number;
  maxAnswers: number;
  spentUsd: number;
  /** Minutes from question to answer, per answer (no text, no ids of people). */
  answeredAfterMin: number[];
  emails: {
    sent: number;
    failed: number;
    notEligible: number;
    mailedToday: number;
    /** Late answers in a school chat: never mailed. */
    schoolOnly: number;
    /** Students whose questions are not all answered yet: their one mail waits for a later run. */
    deferred: number;
    /** Dry run: students with late answers waiting to be told. */
    waiting: number;
  };
}

/** The run's caps: the hard caps, or lower ones the caller asked for. */
export function lateRunCaps(opts: { maxAnswers?: number | null; maxUsd?: number | null }): { maxAnswers: number; capUsd: number } {
  const a = opts.maxAnswers;
  const u = opts.maxUsd;
  return {
    maxAnswers: typeof a === "number" && Number.isFinite(a) ? Math.max(0, Math.min(LATE_MAX_ANSWERS, Math.floor(a))) : LATE_MAX_ANSWERS,
    capUsd: typeof u === "number" && Number.isFinite(u) ? Math.max(0, Math.min(LATE_MAX_USD, u)) : LATE_MAX_USD,
  };
}

/**
 * Whether a student's whole group (after the run's first) may start: null,
 * or the cap it would cross. Planning figures only — the cap's real guard is
 * each answer's own worst case; a group the plan let in can still be cut, and
 * then its mail waits for the rest (see the header).
 */
export function groupAdmission(a: {
  size: number;
  answered: number;
  maxAnswers: number;
  spentUsd: number;
  capUsd: number;
  elapsedMs: number;
}): LateStop | null {
  if (a.answered + a.size > a.maxAnswers) return "max-answers";
  if (a.spentUsd + a.size * LATE_ANSWER_PLAN_USD > a.capUsd + 1e-9) return "max-usd";
  if (a.elapsedMs + a.size * LATE_ANSWER_PLAN_MS > LATE_TIME_GUARD_MS) return "time";
  return null;
}

/** Whether another "Your question is answered" mail may go to a student last mailed at `lastSentAt`. */
export function answeredEmailAllowed(lastSentAt: Date | null | undefined, now: Date): boolean {
  if (!lastSentAt) return true;
  const gap = now.getTime() - lastSentAt.getTime();
  return !(gap >= 0 && gap < ANSWERED_EMAIL_GAP_MS);
}

const failedOther = (): LateAnswerFail => ({ ok: false, reason: "other", costUsd: 0 });

export async function runLateAnswers(deps: LateAnswerDeps, opts: LateRunOptions): Promise<LateRunReport> {
  const clock = deps.clock ?? (() => Date.now());
  const started = clock();
  const nowMs = opts.now.getTime();
  const pendingSince = nowMs - LATE_MAIL_PENDING_MS;
  const { maxAnswers, capUsd } = lateRunCaps(opts);
  const report: LateRunReport = {
    ok: true,
    dry: opts.dry === true,
    rows: 0,
    candidates: 0,
    students: 0,
    skipped: {},
    probe: "not-needed",
    answered: 0,
    failed: 0,
    notStored: 0,
    claimedElsewhere: 0,
    errors: 0,
    stopped: null,
    capUsd,
    maxAnswers,
    spentUsd: 0,
    answeredAfterMin: [],
    emails: { sent: 0, failed: 0, notEligible: 0, mailedToday: 0, schoolOnly: 0, deferred: 0, waiting: 0 },
  };

  const rows = await deps.loadRows(nowMs - LATE_WINDOW_MS, nowMs);
  report.rows = rows.length;
  const { picked, skipped } = selectLateCandidates(rows, nowMs);
  report.skipped = skipped;
  report.candidates = picked.length;
  report.students = new Set(picked.map((r) => r.userId)).size;
  const groups = studentGroups(picked);

  if (report.dry) {
    // Count only: no model call, nothing written.
    if (picked.length > 0) report.probe = "dry";
    try {
      report.emails.waiting = new Set((await deps.pendingMail(pendingSince, null)).map((r) => r.userId)).size;
    } catch {
      report.errors++;
    }
    return report;
  }

  /** Students with a promised question still unanswered after this run: their mail waits. */
  const deferred = new Set<string>();
  /** Students whose mail step ran in this run. */
  const told = new Set<string>();
  const deferFrom = (i: number) => {
    for (const g of groups.slice(i)) if (g[0]?.userId) deferred.add(g[0].userId);
  };

  /** Tell one student about every late answer of theirs still waiting: ONE mail. */
  const tell = async (userId: string, preloaded?: LatePendingRow[]): Promise<void> => {
    told.add(userId);
    let items = preloaded;
    if (!items) {
      try {
        items = (await deps.pendingMail(pendingSince, [userId])).filter((r) => r.userId === userId);
      } catch {
        report.errors++;
        return;
      }
    }
    if (items.length === 0) return;
    let target: LateEmailTarget | undefined;
    try {
      target = (await deps.emailTargets([userId])).find((t) => t.userId === userId);
    } catch {
      report.errors++;
      return;
    }
    if (!target) {
      report.emails.notEligible++;
      return;
    }
    let guard: string | null;
    try {
      guard = await deps.reserveEmail(userId);
    } catch {
      report.errors++;
      return;
    }
    if (!guard) {
      // A mail went in the last 24 hours: these stay waiting (until LATE_MAIL_PENDING_MS, or until opened).
      report.emails.mailedToday++;
      return;
    }
    const ids = items.map((r) => r.id);
    const at = clock();
    try {
      await deps.markMailed(ids, at);
    } catch {
      report.emails.failed++;
      await deps.unreserveEmail(guard).catch(() => {});
      return;
    }
    const sent = await deps
      .sendEmail(
        target,
        items.map((r) => ({ sessionId: r.sessionId, examCode: r.examCode, question: r.content, askedAt: r.createdAt })),
      )
      .catch(() => false);
    if (sent) report.emails.sent++;
    else {
      report.emails.failed++;
      await deps.unreserveEmail(guard).catch(() => {});
      await deps.unmarkMailed(ids, at).catch(() => {});
    }
  };

  let spent = 0;
  const canAffordOne = maxAnswers > 0 && capUsd >= LATE_ANSWER_PLAN_USD;
  if (picked.length > 0 && !canAffordOne) {
    report.stopped = maxAnswers === 0 ? "max-answers" : "max-usd";
    deferFrom(0);
  } else if (picked.length > 0) {
    // ONE cheap probe; a dry or refused account ends the answering before any claim.
    const probe = await deps.probe();
    if (!probe.ok) {
      report.probe = probe.reason;
      report.stopped = probe.reason;
      deferFrom(0);
    } else {
      report.probe = "ok";
      spent = Math.max(0, probe.costUsd || 0);
      for (let gi = 0; gi < groups.length; gi++) {
        const group = groups[gi];
        const userId = group[0].userId ?? "";
        if (gi > 0) {
          const stop = groupAdmission({ size: group.length, answered: report.answered, maxAnswers, spentUsd: spent, capUsd, elapsedMs: clock() - started });
          if (stop) {
            report.stopped = stop;
            deferFrom(gi);
            break;
          }
        }
        // One student's questions, oldest first.
        let cut = false;
        let told1 = 0;
        let stop: LateStop | null = null;
        for (const row of group) {
          if (report.answered >= maxAnswers) {
            stop = "max-answers";
            cut = true;
            break;
          }
          if (clock() - started > LATE_TIME_GUARD_MS) {
            stop = "time";
            cut = true;
            break;
          }
          const claimMs = clock();
          let claimed = false;
          try {
            claimed = await deps.claim(row, claimMs);
          } catch {
            report.errors++;
            cut = true;
            continue;
          }
          if (!claimed) {
            // Another run holds it: that run (or the next) tells this student.
            report.claimedElsewhere++;
            cut = true;
            continue;
          }
          const out = await deps.answer(row, Math.max(0, capUsd - spent)).catch(failedOther);
          spent += Math.max(0, out.costUsd || 0);
          if (isOverBudget(out)) {
            // Never asked: back as it was, its try given back; the cap is reached.
            await deps.release(row, claimMs, { reason: null, final: false, refundTry: true }, clock()).catch(() => {});
            stop = "max-usd";
            cut = true;
            break;
          }
          if (!out.ok) {
            report.failed++;
            const final = out.final === true;
            await deps.release(row, claimMs, { reason: out.reason, final, refundTry: !final && lateFailRefundsTry(out.reason) }, clock()).catch(() => {});
            // The AI is unavailable again: stop now, never hammer it.
            if (isAiUnavailable(out.reason)) {
              stop = out.reason;
              cut = true;
              break;
            }
            continue;
          }
          const savedAt = clock();
          let saved = false;
          try {
            saved = await deps.save(row, claimMs, out, savedAt);
          } catch {
            // Nothing stored (one transaction): the row goes back as failed, this try spent.
            report.errors++;
            report.notStored++;
            await deps.release(row, claimMs, { reason: "other", final: false, refundTry: false }, clock()).catch(() => {});
            cut = true;
            continue;
          }
          if (saved) {
            report.answered++;
            report.answeredAfterMin.push(Math.round((savedAt - row.createdAt.getTime()) / 60_000));
            if (isSchoolTurn(row)) report.emails.schoolOnly++;
            else told1++;
          } else {
            // The claim was lost (a Retry took over a claim gone stale) or the
            // conversation got a reply meanwhile: that reply stands, ours is dropped.
            report.notStored++;
          }
        }
        // Tell this student now — before the next group — unless some of their
        // questions are still to be answered: then one later mail covers all.
        if (cut) deferred.add(userId);
        else if (told1 > 0 && userId) await tell(userId);
        if (stop) {
          report.stopped = stop;
          deferFrom(gi + 1);
          break;
        }
      }
    }
  }
  report.spentUsd = Number(spent.toFixed(4));

  // Students with late answers still waiting to be told and nothing left to
  // answer: a run that died after answering, a mail the 24-hour guard held
  // back, the rest of a group a later run finished elsewhere.
  if (clock() - started <= LATE_MAIL_GUARD_MS) {
    let waiting: LatePendingRow[] = [];
    try {
      waiting = await deps.pendingMail(pendingSince, null);
    } catch {
      report.errors++;
    }
    const byUser = new Map<string, LatePendingRow[]>();
    for (const r of waiting) {
      if (!r.userId || told.has(r.userId)) continue;
      const list = byUser.get(r.userId) ?? [];
      list.push(r);
      byUser.set(r.userId, list);
    }
    for (const [userId, items] of byUser) {
      // Still questions of theirs to answer: their one mail waits for those —
      // but not past LATE_MAIL_WAIT_MAX_MS after their oldest waiting answer.
      if (deferred.has(userId) && nowMs - Math.min(...items.map((r) => r.answeredAt.getTime())) < LATE_MAIL_WAIT_MAX_MS) continue;
      if (clock() - started > LATE_MAIL_GUARD_MS) break;
      await tell(userId, items);
    }
  }
  report.emails.deferred = [...deferred].filter((u) => !told.has(u)).length;
  return report;
}

// ── The mail ───────────────────────────────────────────────────────────

const IST_MS = 5.5 * 3600_000;
const istDayNo = (ms: number) => Math.floor((ms + IST_MS) / 86_400_000);

/** "Earlier today" / "Yesterday" / "Two days ago" / "3 days ago", by IST calendar day. */
export function askedWhen(askedAt: Date, now: Date): string {
  const d = istDayNo(now.getTime()) - istDayNo(askedAt.getTime());
  if (d <= 0) return "Earlier today";
  if (d === 1) return "Yesterday";
  if (d === 2) return "Two days ago";
  return `${d} days ago`;
}

export interface AnsweredEmailLine {
  /** The student's own question: control characters out, at most 60 characters. */
  quote: string;
  when: string;
  /** Their conversation, reopened (sendEmail adds utm_source / medium / campaign). */
  url: string;
}

/** The mail's lines, oldest question first; questions with no quotable text are left out. */
export function answeredEmailLines(items: readonly LateEmailItem[], now: Date): AnsweredEmailLine[] {
  return [...items]
    .sort((a, b) => a.askedAt.getTime() - b.askedAt.getTime())
    .map((it) => {
      const href = chatResumeHref({ examCode: it.examCode, sessionId: it.sessionId });
      return {
        quote: emailQuote(it.question),
        when: askedWhen(it.askedAt, now),
        url: `https://shishya.in${href}&utm_content=${ANSWERED_EMAIL_TAG}`,
      };
    })
    .filter((l) => l.quote.length > 0);
}
