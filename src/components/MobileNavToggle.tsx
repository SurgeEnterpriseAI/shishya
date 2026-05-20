"use client";

// Hamburger + slide-in drawer for the primary nav on small screens.
// Hidden on md+ where the inline section row is visible.
//
// Renders nav items grouped by lifecycle stage with visible section
// dividers (LEARNING / NEXT STEPS / DISCOVER) so mobile users can
// mentally chunk the platform's scope at a glance.

import { useState, useEffect } from "react";
import Link from "next/link";
import type { NavGroup, NavItem } from "./Header";

const GROUP_ORDER: NavGroup[] = ["learning", "next-steps", "discover"];
const GROUP_LABEL: Record<NavGroup, string> = {
  "learning":   "LEARNING",
  "next-steps": "NEXT STEPS",
  "discover":   "DISCOVER",
};

export function MobileNavToggle({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  // Lock background scroll when drawer is open.
  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, [open]);

  // Close on route change. We listen via the pathname-based key on
  // Link's onClick rather than a router hook so this component stays
  // dependency-free.
  function handleNavigate() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ink-200 text-ink-700 hover:bg-ink-50 md:hidden"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-0 flex h-screen w-72 max-w-[80vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
              <span className="text-sm font-semibold text-ink-900">Menu</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="-mr-1 rounded-md p-2 text-ink-500 hover:bg-ink-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto p-2 text-sm">
              {GROUP_ORDER.map((group) => {
                const groupItems = items.filter((i) => i.group === group);
                if (groupItems.length === 0) return null;
                return (
                  <li key={group} className="mb-2">
                    <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                      {GROUP_LABEL[group]}
                    </p>
                    <ul>
                      {groupItems.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={handleNavigate}
                            className="block rounded-md px-3 py-2.5 text-ink-800 hover:bg-saffron-50/50 hover:text-saffron-800"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
