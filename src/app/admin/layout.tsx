// /admin/** — shared layout (3 Oct 2026, fix C13).
//
// Only the robots tag: every admin page is private, and 10 of the 20 admin
// pages set no robots of their own, so a guest's fetch printed the site
// default "index, follow". A page that sets its own `robots` still wins over
// this one. The X-Robots-Tag header for /admin/:path* is set in
// next.config.ts (fix C1). The children are returned untouched, so
// src/app/admin/loading.tsx keeps working.

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
