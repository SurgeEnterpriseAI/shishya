import { Header } from "@/components/Header";

export default function ChatLoading() {
  return (
    <main className="min-h-screen bg-ink-50/40">
      <div className="nav-progress" aria-hidden />
      <Header />
      <section className="container-prose py-6 sm:py-8" style={{ minHeight: "calc(100vh - 64px)" }}>
        <div className="skel h-3 w-32" />
        <div className="skel mt-2 h-6 w-44" />

        <div className="mt-4 flex flex-1 flex-col rounded-md border border-ink-200 bg-white">
          <div className="flex-1 space-y-4 p-4 sm:p-6" style={{ minHeight: 360 }}>
            <div className="flex justify-end">
              <div className="skel h-10 w-1/2 rounded-lg" />
            </div>
            <div className="flex justify-start">
              <div className="skel h-20 w-2/3 rounded-lg" />
            </div>
            <div className="flex justify-end">
              <div className="skel h-10 w-2/5 rounded-lg" />
            </div>
          </div>
          <div className="border-t border-ink-200 p-3">
            <div className="skel h-10 w-full" />
          </div>
        </div>
      </section>
    </main>
  );
}
