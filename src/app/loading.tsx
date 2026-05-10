// Universal route-loading skeleton.
// Next.js renders this for ANY route under /app while the server component
// is still resolving. Routes can override with their own loading.tsx for a
// more tailored placeholder.

import { Header } from "@/components/Header";

export default function Loading() {
  return (
    <main className="min-h-screen bg-ink-50/40">
      <div className="nav-progress" aria-hidden />
      <Header />
      <section className="container-prose py-10">
        <div className="skel h-3 w-32" />
        <div className="skel mt-3 h-7 w-72" />
        <div className="skel mt-2 h-4 w-1/2" />

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="skel h-20" />
          <div className="skel h-20" />
          <div className="skel h-20" />
        </div>

        <div className="mt-8 space-y-2">
          <div className="skel h-12 w-full" />
          <div className="skel h-12 w-11/12" />
          <div className="skel h-12 w-10/12" />
        </div>
      </section>
    </main>
  );
}
