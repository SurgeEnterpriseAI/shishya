import { Header } from "@/components/Header";

export default function DiscussionsLoading() {
  return (
    <main className="min-h-screen bg-ink-50/40">
      <div className="nav-progress" aria-hidden />
      <Header />
      <section className="container-prose py-10">
        <div className="skel h-7 w-56" />
        <div className="skel mt-2 h-4 w-72" />

        <div className="mt-8 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skel h-20" />
          ))}
        </div>
      </section>
    </main>
  );
}
