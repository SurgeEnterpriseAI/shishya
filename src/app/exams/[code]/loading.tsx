// Tailored skeleton for /exams/[code] — the heaviest route in the app.
// Mirrors the real layout: header, action panel, PYQ row, mocks row,
// shishya prompts, rank stats, syllabus block.

import { Header } from "@/components/Header";

export default function ExamPageLoading() {
  return (
    <main className="min-h-screen bg-ink-50/40">
      <div className="nav-progress" aria-hidden />
      <Header />
      <section className="container-prose py-10">
        {/* Crumb + title */}
        <div className="skel h-3 w-40" />
        <div className="skel mt-3 h-8 w-48" />
        <div className="skel mt-2 h-4 w-72" />
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="skel h-7 w-24 rounded-full" />
          <div className="skel h-7 w-20 rounded-full" />
          <div className="skel h-7 w-24 rounded-full" />
          <div className="skel h-7 w-28 rounded-full" />
        </div>

        {/* Action panel */}
        <div className="mt-8 rounded-md border border-ink-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="skel h-4 w-1/3" />
              <div className="skel h-3 w-1/2" />
            </div>
            <div className="skel h-11 w-44" />
          </div>
        </div>

        {/* Previous papers */}
        <div className="mt-10">
          <div className="skel h-4 w-44" />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skel h-20" />
            ))}
          </div>
        </div>

        {/* Mock tests */}
        <div className="mt-10">
          <div className="skel h-4 w-32" />
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skel h-24" />
            ))}
          </div>
        </div>

        {/* Shishya */}
        <div className="mt-10">
          <div className="skel h-4 w-40" />
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skel h-16" />
            ))}
          </div>
        </div>

        {/* Rank */}
        <div className="mt-10">
          <div className="skel h-4 w-28" />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="skel h-20" />
            <div className="skel h-20" />
            <div className="skel h-20" />
          </div>
          <div className="skel mt-4 h-48 w-full" />
        </div>

        {/* Syllabus */}
        <div className="mt-10">
          <div className="skel h-4 w-24" />
          <div className="mt-3 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="skel h-4 w-40" />
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="skel h-12" />
                  <div className="skel h-12" />
                  <div className="skel h-12" />
                  <div className="skel h-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
