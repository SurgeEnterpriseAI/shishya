// Small server pieces the /schooling pages share (26 Sep 2026): the
// breadcrumb line, the official-link buttons and the chapter status pill.
// No client code, no session, nothing stored — the school pages are public
// and cached, and carry no tutor, sign-in or account entry (Anthropic
// minors policy; the parent-consent layer is not built).

import Link from "next/link";
import { chapterStatusLabel } from "@/lib/school/copy";

export interface Crumb {
  label: string;
  href?: string;
}

/** "Home · Schooling · CBSE · Class 6 · Mathematics" — the last crumb is the page. */
export function SchoolCrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <p className="text-xs text-ink-500">
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${i}`}>
          {i > 0 && " · "}
          {c.href ? (
            <Link href={c.href} className="hover:text-ink-800">
              {c.label}
            </Link>
          ) : (
            c.label
          )}
        </span>
      ))}
    </p>
  );
}

/** A link to an official page on the board's or NCERT's own site. */
export function OfficialLink({ href, children, primary = false }: { href: string; children: React.ReactNode; primary?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        primary
          ? "inline-flex items-center gap-1 rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
          : "inline-flex items-center gap-1 rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
      }
    >
      {children}
    </a>
  );
}

/** What a chapter has, from its rows: "Notes + practice", "Notes",
 *  "Practice" or "Official chapter only". */
export function ChapterStatusPill({ hasNotes, quiz }: { hasNotes: boolean; quiz: boolean }) {
  const label = chapterStatusLabel({ hasNotes, quiz });
  const ours = hasNotes || quiz;
  return (
    <span
      className={
        ours
          ? "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800"
          : "inline-flex rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-600"
      }
    >
      {label}
    </span>
  );
}
