import { Header } from "@/components/Header";

export default function ResultsLoading() {
  return (
    <main className="min-h-screen bg-ink-50/40">
      <div className="nav-progress" aria-hidden />
      <Header />
      <section className="container-prose py-10">
        <div className="skel h-3 w-32" />
        <div className="skel mt-2 h-7 w-72" />

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="skel h-24" />
          <div className="skel h-24" />
          <div className="skel h-24" />
          <div className="skel h-24" />
        </div>

        <div className="mt-8 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skel h-20" />
          ))}
        </div>
      </section>
    </main>
  );
}
