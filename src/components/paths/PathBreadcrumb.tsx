// Breadcrumb for the life-stage pages (30 Sep 2026, P1 build 1 — agent B).
// Same trail as the page's BreadcrumbList JSON-LD (the model's crumbs, Home
// first); the last crumb is the current page and is not a link. Server
// component.

import Link from "next/link";

export function PathBreadcrumb({ trail, label }: { trail: ReadonlyArray<{ label: string; href: string }>; label: string }) {
  if (trail.length === 0) return null;
  const last = trail.length - 1;
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-x-1 text-xs text-ink-500">
        {trail.map((t, i) => (
          <li key={`${t.href}|${i}`} className="flex items-center gap-x-1">
            {i < last ? (
              <>
                <Link href={t.href} prefetch={false} className="hover:text-ink-800">
                  {t.label}
                </Link>
                <span aria-hidden="true">›</span>
              </>
            ) : (
              <span aria-current="page" className="text-ink-700">
                {t.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
