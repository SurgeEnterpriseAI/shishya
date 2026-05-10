import { Header } from "@/components/Header";

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-ink-50/40">
      <div className="nav-progress" aria-hidden />
      <Header />
      <section className="container-prose py-10">
        <div className="skel h-7 w-56" />
        <div className="skel mt-2 h-4 w-72" />

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="skel h-20" />
          <div className="skel h-20" />
          <div className="skel h-20" />
          <div className="skel h-20" />
        </div>

        <div className="mt-10">
          <div className="skel h-4 w-40" />
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="skel h-32" />
            <div className="skel h-32" />
            <div className="skel h-32" />
          </div>
        </div>
      </section>
    </main>
  );
}
