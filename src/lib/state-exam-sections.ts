// State exam pages: government recruitment vs admission tests, the state's
// own-script name, and the links into the state's colleges, school boards
// and scholarships (26 Sep 2026).
//
// Why:
//   • /exams/state/{slug} called every state exam a "government exam", but
//     28 of the 128 STATE_LEVEL rows are state admission tests (KCET,
//     MHT-CET, EAMCET, KEAM, WBJEE, POLYCETs, BCECE …) — src/lib/exam-kind.ts
//     STATE_CET_CODES, confirmed in the DB. The pages now title a state with
//     at least one as "government and entrance exams" and list the two
//     groups separately;
//   • the pages linked no other section, though ChatGPT's crawler reads them
//     heavily (OAI-SearchBot fetched exams:state 1,005 times in 30 days) and
//     the data for the state's colleges (/colleges/state/{slug}), its school
//     boards (/schooling/{board}) and its scholarships exists;
//   • the state's own-script name (STATES[].nativeName) never reached the
//     meta description or the JSON-LD, so a search in Kannada or Tamil script
//     had nothing to match beyond the H1 subline.
// Every link here resolves to a slug or id that exists in the data
// (tests/unit/state-exams-entrance.test.ts); no machine translation, no new
// language twins.
//
// Pure: data arrays only, no DB.

import { isStateCetCode } from "@/lib/exam-kind";
import { COLLEGES, NIRF_SOURCE_YEAR } from "@/lib/colleges-data";
import { BOARDS } from "@/lib/schooling-data";
import { SCHOLARSHIPS } from "@/data/scholarships";
import { stateSlug } from "@/lib/state-info";

/** Scholarship links a state page shows (plus the finder). */
export const STATE_SCHOLARSHIP_LINKS_MAX = 4;

/** The state's exams split into government recruitment exams and state
 *  admission tests (CETs), each keeping its input order. */
export function splitStateExams<T extends { code: string }>(exams: readonly T[]): { recruitment: T[]; admission: T[] } {
  const recruitment: T[] = [];
  const admission: T[] = [];
  for (const e of exams) (isStateCetCode(e.code) ? admission : recruitment).push(e);
  return { recruitment, admission };
}

/** Number of state admission tests (CETs) among the exams. */
export function stateEntranceCount(exams: readonly { code: string }[]): number {
  return exams.filter((e) => isStateCetCode(e.code)).length;
}

/** True when the name has letters outside the Latin script (ಕರ್ನಾಟಕ,
 *  तमिलनाडु) — "Mizoram" or "Ladakh" as a native name adds nothing. */
export function hasNonLatinScript(s: string): boolean {
  return /[^\u0000-ɏ -⁯]/.test(s);
}

/** "Karnataka (ಕರ್ನಾಟಕ)" — the English name with its own-script name when
 *  that is in another script; the English name alone otherwise. */
export function stateNameWithNative(st: { name: string; nativeName: string }): string {
  return hasNonLatinScript(st.nativeName) && st.nativeName !== st.name ? `${st.name} (${st.nativeName})` : st.name;
}

/** schema.org State node for the page's JSON-LD: the English name, with the
 *  own-script and Hindi names as alternates (distinct, never the English
 *  name again). */
export function stateJsonLd(st: { name: string; nativeName: string; hindiName: string }): {
  "@type": "State";
  name: string;
  alternateName: string[];
} {
  const alternateName = [...new Set([st.nativeName, st.hindiName])].filter((n) => n && n !== st.name);
  return { "@type": "State", name: st.name, alternateName };
}

export interface StateAlsoLabels {
  /** "{state}", "{year}" placeholders. */
  colleges: string;
  /** "{board}" placeholder. */
  board: string;
  scholarshipMatch: string;
}

export interface StateAlsoLink {
  href: string;
  label: string;
}

const fillVars = (t: string, vars: Record<string, string | number>) =>
  t.replace(/\{(\w+)\}/g, (m, k: string) => (Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m));

/** "Also for {State} students": the state's NIRF colleges page when a
 *  listed college is in the state, its school boards' pages (official board
 *  links — never a notes claim), up to four of its scholarships and the
 *  scholarship finder. `stateName` is the name in the reader's script. */
export function stateAlsoLinks(stateCode: string, stateName: string, labels: StateAlsoLabels): StateAlsoLink[] {
  const out: StateAlsoLink[] = [];
  if (COLLEGES.some((c) => c.state === stateCode)) {
    out.push({ href: `/colleges/state/${stateSlug(stateCode)}`, label: fillVars(labels.colleges, { state: stateName, year: NIRF_SOURCE_YEAR }) });
  }
  for (const b of BOARDS) {
    if (b.state === stateCode) out.push({ href: `/schooling/${b.slug}`, label: fillVars(labels.board, { board: b.shortName }) });
  }
  const schol = SCHOLARSHIPS.filter((s) => s.state === stateCode).slice(0, STATE_SCHOLARSHIP_LINKS_MAX);
  for (const s of schol) out.push({ href: `/scholarships/${s.id}`, label: s.name });
  out.push({ href: "/scholarships/match", label: labels.scholarshipMatch });
  return out;
}
