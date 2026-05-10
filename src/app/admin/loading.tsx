import { Header } from "@/components/Header";

export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-ink-50/40">
      <div className="nav-progress" aria-hidden />
      <Header admin />
      <section className="container-prose py-10">
        <div className="skel h-7 w-64" />
        <div className="skel mt-2 h-4 w-80" />

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skel h-20" />
          ))}
        </div>

        <div className="mt-10">
          <div className="skel h-4 w-32" />
          <div className="mt-3 overflow-hidden rounded-md border border-ink-200 bg-white">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-b border-ink-100 p-3 last:border-b-0">
                <div className="skel h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
