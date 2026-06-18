// Stateless answer-key sealing for the generated aptitude test.
//
// The per-candidate key is AES-256-GCM encrypted into an opaque token that
// rides with the test to the browser and comes back on submit. Because it's
// ENCRYPTED (not just signed) the candidate can't read the answers out of
// it, and the GCM auth tag means they can't tamper with it either. Scoring
// happens server-side after decrypt — so results can't be forged and we
// need no DB session table.

import crypto from "crypto";
import { APTITUDE_CONFIG, type AptitudeSection, type KeyItem } from "@/data/aptitude";

// Derive a 32-byte key from a server secret. NEXTAUTH_SECRET is always set
// in this app; APTITUDE_SECRET/CRON_SECRET are accepted as overrides.
const SECRET =
  process.env.APTITUDE_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.CRON_SECRET ||
  "shishya-aptitude-dev-secret";
const AES_KEY = crypto.createHash("sha256").update(SECRET).digest();

export function sealKey(key: KeyItem[]): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", AES_KEY, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(key), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function openKey(token: string): KeyItem[] | null {
  try {
    const buf = Buffer.from(token, "base64url");
    if (buf.length < 28) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", AES_KEY, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
    const arr = JSON.parse(dec);
    if (!Array.isArray(arr)) return null;
    return arr as KeyItem[];
  } catch {
    return null;
  }
}

export interface ScoredResult {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  sections: Record<AptitudeSection, { correct: number; total: number }>;
}

/** Score a submission against its (decrypted) answer key. */
export function scoreFromKey(answers: Record<string, number>, key: KeyItem[]): ScoredResult {
  const sections: ScoredResult["sections"] = {
    QUANT: { correct: 0, total: 0 },
    REASONING: { correct: 0, total: 0 },
    VERBAL: { correct: 0, total: 0 },
  };
  let score = 0;
  for (const k of key) {
    sections[k.section].total++;
    if (answers[k.id] === k.answer) {
      score++;
      sections[k.section].correct++;
    }
  }
  const total = key.length || APTITUDE_CONFIG.totalQuestions;
  const percent = Math.round((score / total) * 100);
  return { score, total, percent, passed: percent >= APTITUDE_CONFIG.passPercent, sections };
}
