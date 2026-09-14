// This browser's memory for Challenge a friend (14 Sep 2026): the creator
// key of each challenge it made (the key unlocks that challenge's scores)
// and the result of each one it played. localStorage only — every call
// tolerates a private window or blocked storage by doing nothing.

import { CHALLENGE_KEY_RE, newChallengeKey } from "@/lib/challenge";

const MADE = "shishya_challenges_made";
const PLAYED = "shishya_challenges_played";
const PLAYER = "shishya_challenge_player";
const KEEP = 50;

export interface MadeChallenge {
  key: string;
  at: number;
}

export interface PlayedChallenge {
  correct: number;
  total: number;
  creatorCorrect: number;
  /** What this browser picked, in question order — lets the result offer the same questions onward. */
  choices: (string | null)[];
  at: number;
}

function read<T>(name: string): Record<string, T> {
  try {
    const v = JSON.parse(localStorage.getItem(name) ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, T>) : {};
  } catch {
    return {};
  }
}

function write<T extends { at: number }>(name: string, map: Record<string, T>): void {
  try {
    const newest = Object.entries(map)
      .sort((a, b) => (b[1]?.at ?? 0) - (a[1]?.at ?? 0))
      .slice(0, KEEP);
    localStorage.setItem(name, JSON.stringify(Object.fromEntries(newest)));
  } catch {
    /* storage unavailable — the challenge still works; this browser just won't remember it */
  }
}

export function rememberMadeChallenge(token: string, key: string): void {
  write<MadeChallenge>(MADE, { ...read<MadeChallenge>(MADE), [token]: { key, at: Date.now() } });
}

export function madeChallengeKey(token: string): string | null {
  const v = read<MadeChallenge>(MADE)[token];
  return typeof v?.key === "string" && CHALLENGE_KEY_RE.test(v.key) ? v.key : null;
}

export function rememberPlayedChallenge(token: string, result: Omit<PlayedChallenge, "at">): void {
  write<PlayedChallenge>(PLAYED, { ...read<PlayedChallenge>(PLAYED), [token]: { ...result, at: Date.now() } });
}

export function playedChallenge(token: string): PlayedChallenge | null {
  const v = read<PlayedChallenge>(PLAYED)[token];
  return v && typeof v.correct === "number" && typeof v.total === "number" && Array.isArray(v.choices) ? v : null;
}

/** One player key per browser, reused across challenges (the server keeps only its hash). */
export function challengePlayerKey(): string {
  try {
    const existing = localStorage.getItem(PLAYER);
    if (existing && CHALLENGE_KEY_RE.test(existing)) return existing;
    const fresh = newChallengeKey();
    localStorage.setItem(PLAYER, fresh);
    return fresh;
  } catch {
    return newChallengeKey();
  }
}
