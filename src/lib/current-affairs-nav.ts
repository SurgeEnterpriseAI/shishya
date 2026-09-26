// Previous / next day links on /current-affairs/[date] (26 Sep 2026).
//
// The digest has gaps: 46 dated days between 2026-07-22 and 2026-09-26 (67
// calendar days) — 09-15, 09-17, 09-22 and 09-25 among the missing, and
// /current-affairs/2026-09-25 is (correctly) a 404. So "previous day" is
// never date − 1: it is the newest date BEFORE this one that has rows, and
// "next day" the oldest date AFTER it — two small SELECTs over the same
// table the sitemap lists (CurrentAffair.date). A link shows only when such
// a row exists. The month capsule (/current-affairs/capsule/YYYY-MM) always
// exists for a date that has rows, since the capsule lists that month's rows.

import { prisma } from "@/lib/db/prisma";

export interface CaNeighbours {
  prev: string | null;
  next: string | null;
}

export interface CaNavLink {
  href: string;
  label: string;
  rel?: "prev" | "next";
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The nearest dated digests before and after `date` (YYYY-MM-DD). A failed
 *  read gives no links rather than a guessed one. */
export async function loadCaNeighbours(date: string): Promise<CaNeighbours> {
  if (!DAY_RE.test(date)) return { prev: null, next: null };
  const one = (sql: string) =>
    prisma
      .$queryRawUnsafe<{ d: string | null }[]>(sql, date)
      .then((r) => (r[0]?.d && DAY_RE.test(r[0].d) ? r[0].d : null))
      .catch(() => null);
  const [prev, next] = await Promise.all([
    one(`SELECT to_char(MAX(date), 'YYYY-MM-DD') AS d FROM "CurrentAffair" WHERE date < $1::date`),
    one(`SELECT to_char(MIN(date), 'YYYY-MM-DD') AS d FROM "CurrentAffair" WHERE date > $1::date`),
  ]);
  return { prev, next };
}

/** "22 July 2026" for a YYYY-MM-DD day. */
export function caPrettyDate(d: string): string {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** "2026-09" for a YYYY-MM-DD day. */
export function caCapsuleMonth(date: string): string {
  return date.slice(0, 7);
}

/** The nav row under a day's digest: previous day with rows, the month
 *  capsule, next day with rows, and every government and entrance exam. */
export function caNavLinks(date: string, n: CaNeighbours): CaNavLink[] {
  const month = caCapsuleMonth(date);
  const monthLabel = new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
  const out: CaNavLink[] = [];
  if (n.prev) out.push({ href: `/current-affairs/${n.prev}`, label: `← ${caPrettyDate(n.prev)}`, rel: "prev" });
  out.push({ href: `/current-affairs/capsule/${month}`, label: `${monthLabel} capsule` });
  if (n.next) out.push({ href: `/current-affairs/${n.next}`, label: `${caPrettyDate(n.next)} →`, rel: "next" });
  out.push({ href: "/exams/browse", label: "Government and entrance exams" });
  return out;
}
