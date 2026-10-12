import { Header } from "@/components/Header";

export default function ChatLoading() {
  return (
    <main className="min-h-screen bg-ink-50/40">
      <div className="nav-progress" aria-hidden />
      {/* 12 Oct 2026 (Release 2 review, round 2; under-13 rule): the
          skeleton cannot read ?examCode=, and a guest on a kids' exam is about
          to get the tutor-off line (KidsGuestTutorOff), so no guest sign-up
          button here, for anyone. Members' header links are unchanged (the
          signed-in branch ignores childSafe); the Ask chip and the
          post-sign-in strips wait for the page's own header. */}
      <Header childSafe />
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
