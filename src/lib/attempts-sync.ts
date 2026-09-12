// Client-safe pure helpers that keep a student's mock answers safe across a
// network blink (audit 11 Sep 2026: the player used to clear its dirty set
// BEFORE posting, swallow failures, and mirror nothing locally — a 4G blink
// in the 700 ms debounce window silently dropped the answer, and the student
// was then graded "skipped" on a question they answered).
//
// Nothing here touches React or DOM globals at module scope. The player
// injects window.localStorage; unit tests (vitest env "node") inject an
// in-memory stub. Every storage call is wrapped — private mode, quota and
// "access denied" all degrade to "no mirror", never to a throw.

export interface AnswerRecord {
  questionId: string;
  chosen: string | null;
  timeSec: number;
  marked: boolean;
  /** Client-generated ms epoch of the last change to this record. Absent on
   *  legacy server rows saved before 11 Sep 2026 and on untouched questions. */
  updatedAt?: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const MIRROR_VERSION = 1;

// Error codes the player recognises. They live HERE (not in the route files)
// because Next.js type-checks every app-router route.ts against a closed set
// of allowed exports during `next build` — a bare `export const` in a route
// fails the whole build ("is not a valid Route export field").
/** /answer: not found, not yours, or no longer IN_PROGRESS. */
export const ATTEMPT_NOT_WRITABLE = "ATTEMPT_NOT_WRITABLE";
/** /submit (409): an earlier submit already graded it and this payload differs. */
export const ATTEMPT_ALREADY_GRADED = "ATTEMPT_ALREADY_GRADED";

/** Ceiling for a single question's timeSec (24 h). Anything above it is a
 *  laptop lid closed on an open tab, not exam time — it is CLAMPED, never
 *  rejected: a rejected row used to 400 the whole batch (and every submit
 *  retry with it), which is a permanent failure for the student. */
export const MAX_TIME_SEC = 86400;

export function clampTimeSec(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, MAX_TIME_SEC);
}

interface MirrorBlob {
  v: number;
  attemptId: string;
  userId: string | null;
  savedAt: number;
  answers: AnswerRecord[];
}

/** One mirror per (user, attempt). Attempt ids are already unique per user,
 *  so the userId segment is belt-and-braces for shared devices. */
export function mirrorKey(attemptId: string, userId?: string | null): string {
  return `shishya:attempt:${userId ?? "anon"}:${attemptId}`;
}

function emptyRecord(questionId: string): AnswerRecord {
  return { questionId, chosen: null, timeSec: 0, marked: false };
}

function isRecord(x: unknown): x is AnswerRecord {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  if (typeof r.questionId !== "string" || r.questionId.length === 0) return false;
  if (!(r.chosen === null || typeof r.chosen === "string")) return false;
  if (typeof r.timeSec !== "number" || !Number.isFinite(r.timeSec) || r.timeSec < 0) return false;
  if (typeof r.marked !== "boolean") return false;
  if (r.updatedAt !== undefined && (typeof r.updatedAt !== "number" || !Number.isFinite(r.updatedAt))) return false;
  return true;
}

/** Read the on-device mirror. Returns null for anything that is not a
 *  well-formed v1 blob for THIS attempt — never throws. */
export function readMirror(
  storage: StorageLike | null | undefined,
  key: string,
  attemptId: string,
): AnswerRecord[] | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const blob = JSON.parse(raw) as Partial<MirrorBlob> | null;
    if (!blob || typeof blob !== "object") return null;
    if (blob.v !== MIRROR_VERSION) return null;
    if (blob.attemptId !== attemptId) return null;
    if (!Array.isArray(blob.answers)) return null;
    const out: AnswerRecord[] = [];
    for (const a of blob.answers) {
      if (!isRecord(a)) return null; // one corrupt row = distrust the whole blob
      out.push({
        questionId: a.questionId,
        chosen: a.chosen,
        timeSec: a.timeSec,
        marked: a.marked,
        ...(a.updatedAt !== undefined ? { updatedAt: a.updatedAt } : {}),
      });
    }
    return out;
  } catch {
    return null;
  }
}

/** Write the mirror. Returns false when storage is unavailable or full. */
export function writeMirror(
  storage: StorageLike | null | undefined,
  key: string,
  blob: { attemptId: string; userId: string | null; answers: Iterable<AnswerRecord> },
): boolean {
  if (!storage) return false;
  try {
    const payload: MirrorBlob = {
      v: MIRROR_VERSION,
      attemptId: blob.attemptId,
      userId: blob.userId,
      savedAt: Date.now(),
      answers: [...blob.answers],
    };
    storage.setItem(key, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearMirror(storage: StorageLike | null | undefined, key: string): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    /* nothing to do — a stale mirror is harmless, it is keyed by attempt */
  }
}

export function isAnswered(a: AnswerRecord | null | undefined): boolean {
  return !!a && a.chosen != null && a.chosen !== "";
}

/** True when the record carries anything worth syncing. */
export function hasContent(a: AnswerRecord | null | undefined): boolean {
  return !!a && (isAnswered(a) || a.marked || a.timeSec > 0);
}

export function contentEqual(a: AnswerRecord, b: AnswerRecord): boolean {
  return (
    (a.chosen ?? null) === (b.chosen ?? null) &&
    a.timeSec === b.timeSec &&
    a.marked === b.marked
  );
}

/**
 * Merge what the server has with what this device kept.
 *
 * Per question:
 *  - neither side → empty record
 *  - server only → server (clean)
 *  - local only → local; dirty when it carries content (an untouched local
 *    row equals the empty record, nothing to send)
 *  - both → server wins ONLY when its stamp is strictly newer; ties and
 *    unstamped server rows go to local (the device the student is on).
 *    When local wins and the content differs the question is dirty.
 *
 * Local rows for questions not in this mock are ignored.
 */
export function mergeAnswers(
  server: AnswerRecord[],
  local: AnswerRecord[] | null,
  questionIds: string[],
): { merged: Map<string, AnswerRecord>; dirty: Set<string> } {
  const s = new Map<string, AnswerRecord>();
  for (const a of server) if (a && a.questionId) s.set(a.questionId, a);
  const l = new Map<string, AnswerRecord>();
  for (const a of local ?? []) if (a && a.questionId) l.set(a.questionId, a);

  const merged = new Map<string, AnswerRecord>();
  const dirty = new Set<string>();
  for (const qid of questionIds) {
    const sv = s.get(qid);
    const lv = l.get(qid);
    if (!sv && !lv) {
      merged.set(qid, emptyRecord(qid));
      continue;
    }
    if (sv && !lv) {
      merged.set(qid, { ...sv });
      continue;
    }
    if (lv && !sv) {
      merged.set(qid, { ...lv });
      if (hasContent(lv)) dirty.add(qid);
      continue;
    }
    // both present
    const serverNewer = (sv!.updatedAt ?? 0) > (lv!.updatedAt ?? 0);
    if (serverNewer) {
      merged.set(qid, { ...sv! });
    } else {
      merged.set(qid, { ...lv! });
      if (!contentEqual(sv!, lv!)) dirty.add(qid);
    }
  }
  return { merged, dirty };
}

/**
 * Drop from the dirty set only the ids whose acknowledged version is the
 * version still held locally. A question edited again after it was sent
 * stays dirty; acks for ids that are not dirty are ignored. Returns a NEW
 * set — the input is untouched.
 */
export function reconcileAck(
  dirty: Set<string>,
  acked: Array<{ questionId: string; updatedAt?: number }>,
  current: Map<string, AnswerRecord>,
): Set<string> {
  const next = new Set(dirty);
  for (const ack of acked) {
    if (!ack || typeof ack.questionId !== "string") continue;
    if (!next.has(ack.questionId)) continue;
    const cur = current.get(ack.questionId);
    if (!cur) {
      next.delete(ack.questionId);
      continue;
    }
    // Every local mutation stamps updatedAt, so a record with no stamp has
    // not been touched since it was sent (it came from the server seed).
    if (cur.updatedAt == null || cur.updatedAt === ack.updatedAt) next.delete(ack.questionId);
  }
  return next;
}

/** Exponential backoff, hard-capped so a bad deploy can never turn every
 *  open Sunday-paper tab into a hammer. jitter is a fraction of the delay
 *  (0.2 → up to +20 %), applied BEFORE the cap; jitter=0 is deterministic. */
export function backoffMs(retry: number, base = 1000, cap = 30000, jitter = 0): number {
  const step = Math.max(0, Math.floor(retry));
  const raw = base * Math.pow(2, step);
  const withJitter = jitter > 0 ? raw * (1 + jitter * Math.random()) : raw;
  return Math.round(Math.min(cap, withJitter));
}
