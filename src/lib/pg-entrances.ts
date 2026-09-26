// PG entrance exams — the admission tests for a master's-level programme
// (26 Sep 2026, entry points).
//
// Why: the home page's "Graduation, PG & PhD — being built" cell gains one
// link, "PG entrance exams on Shishya ({n}) → /post-graduation#pg-entrances",
// and its count must be computed from the active exam rows, never typed.
// This list says which codes count. Only admission tests for a master's
// programme belong here:
//   • GATE (M.Tech / ME), CAT (MBA / PGDM), NEET PG (MD / MS), CUET PG
//     (central-university master's), IIT JAM (M.Sc at the IITs / IISc).
//   • NOT UPSC Prelims — a recruitment exam, not an admission test.
//   • NOT UGC NET / CSIR NET — they need a master's already (lectureship,
//     JRF, PhD admission); the post-graduation page lists them under research.
//   • NOT CMI Admission — one test for its B.Sc and its M.Sc / PhD alike.
// A code with no active row (CUET PG and IIT JAM on 26 Sep 2026 — probe
// scripts/tmp-w2-entry-points.ts: active were CAT, GATE_CSE and NEET_PG)
// simply does not count, so a new row joins the count by itself.
// src/app/post-graduation/page.tsx imports this list (27 Sep 2026,
// integration), so the section the home link opens holds exactly the
// counted exams.
// Pure: no DB (tests/unit/home-door-links.test.ts).

export const PG_ENTRANCE_CODES = ["GATE_CSE", "CAT", "NEET_PG", "CUET_PG", "IIT_JAM"] as const;

const PG_SET: ReadonlySet<string> = new Set(PG_ENTRANCE_CODES);

/** The PG entrance exams among the given (active) rows, in their order. */
export function pgEntranceRows<E extends { code: string }>(rows: readonly E[]): E[] {
  return rows.filter((r) => PG_SET.has(r.code));
}

/** How many PG entrance exams the given (active) rows hold. */
export function pgEntranceCount(rows: readonly { code: string }[]): number {
  return pgEntranceRows(rows).length;
}
