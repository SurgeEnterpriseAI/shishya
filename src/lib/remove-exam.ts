// The dashboard's "Remove this exam" control: its words and its one call
// (7 Oct 2026, inbox fix B5; API: src/app/api/me/exams/[code]/route.ts;
// card: src/app/dashboard/RemovableExamCard.tsx). The words are a COPY map
// next to the surface, the src/lib/ui-locale-copy.ts pattern: en, hi, te,
// English for every other locale. {exam} is the exam's short name.
//
// What the lines promise, and why each is true: the row is kept and only
// turned off, so past mocks and scores stay; starting a mock on the exam
// turns it back on (/api/attempts, /mocks/[id] pass active: true).
// hi / te: founder review.

import { pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";

export interface RemoveExamCopy {
  remove: string;
  removeAria: string;
  confirm: string;
  yes: string;
  keep: string;
  working: string;
  removed: string;
  undo: string;
  undoing: string;
  failed: string;
  undoFailed: string;
}

const COPY: Readonly<Record<CopyLocale, RemoveExamCopy>> = {
  en: {
    remove: "Remove",
    removeAria: "Remove {exam} from your exams",
    confirm: "Remove {exam} from your exams? Your past mocks and scores stay.",
    yes: "Yes, remove",
    keep: "Keep it",
    working: "Removing…",
    removed: "{exam} is off your exams. Your mocks and scores stay; starting a mock on it adds it back.",
    undo: "Undo",
    undoing: "Adding it back…",
    failed: "Could not remove it. Please try again.",
    undoFailed: "Could not add it back. Please try again.",
  },
  hi: {
    remove: "हटाएँ",
    removeAria: "{exam} को अपनी परीक्षाओं से हटाएँ",
    confirm: "{exam} को अपनी परीक्षाओं से हटाएँ? आपके पिछले मॉक और स्कोर बने रहेंगे।",
    yes: "हाँ, हटाएँ",
    keep: "रहने दें",
    working: "हटा रहे हैं…",
    removed: "{exam} आपकी परीक्षाओं से हट गई। आपके मॉक और स्कोर बने रहेंगे; इस पर मॉक शुरू करने से यह वापस जुड़ जाएगी।",
    undo: "वापस जोड़ें",
    undoing: "वापस जोड़ रहे हैं…",
    failed: "हटाया नहीं जा सका। कृपया फिर से कोशिश करें।",
    undoFailed: "वापस नहीं जोड़ा जा सका। कृपया फिर से कोशिश करें।",
  },
  te: {
    remove: "తీసివేయండి",
    removeAria: "{exam}ను మీ పరీక్షల నుంచి తీసివేయండి",
    confirm: "{exam}ను మీ పరీక్షల నుంచి తీసివేయాలా? మీ పాత మాక్‌లు, స్కోర్‌లు అలాగే ఉంటాయి.",
    yes: "అవును, తీసివేయండి",
    keep: "ఉంచండి",
    working: "తీసివేస్తున్నాం…",
    removed: "{exam} మీ పరీక్షల నుంచి తీసివేయబడింది. మీ మాక్‌లు, స్కోర్‌లు అలాగే ఉంటాయి; దీనిపై మాక్ మొదలుపెడితే మళ్లీ జతవుతుంది.",
    undo: "మళ్లీ జత చేయండి",
    undoing: "మళ్లీ జత చేస్తున్నాం…",
    failed: "తీసివేయలేకపోయాం. దయచేసి మళ్లీ ప్రయత్నించండి.",
    undoFailed: "మళ్లీ జత చేయలేకపోయాం. దయచేసి మళ్లీ ప్రయత్నించండి.",
  },
};

export function removeExamCopy(locale: string | null | undefined): RemoveExamCopy {
  return pickCopy(COPY, locale);
}

/** `line` with {exam} filled. */
export function withExam(line: string, exam: string): string {
  return line.split("{exam}").join(exam);
}

/** Take the exam off the student's list (on = false: DELETE) or put it back
 *  (on = true: POST, the Undo). True only when the server answered ok — a
 *  network error, a 401 or a 404 is false, and the card says it failed. */
export async function setExamOnList(code: string, on: boolean, fetchFn: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchFn(`/api/me/exams/${encodeURIComponent(code)}`, { method: on ? "POST" : "DELETE" });
    if (!res.ok) return false;
    const body = (await res.json().catch(() => null)) as { ok?: unknown } | null;
    return body?.ok === true;
  } catch {
    return false;
  }
}
