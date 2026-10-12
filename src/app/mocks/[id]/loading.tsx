import { Header } from "@/components/Header";

export default function MockLoading() {
  return (
    <main className="min-h-screen bg-ink-50/40">
      <div className="nav-progress" aria-hidden />
      {/* 12 Oct 2026 (Release 2 review, round 2; under-13 rule): the
          skeleton cannot know the mock's exam, and a guest on a kids' exam's
          mock is about to be sent to its no-sign-in quiz, so no guest sign-up
          button here, for anyone. Members' header links are unchanged (the
          signed-in branch ignores childSafe); the Ask chip and the
          post-sign-in strips wait for the page's own header. */}
      <Header childSafe />
      <section className="container-prose py-8">
        <div className="skel h-4 w-44" />
        <div className="skel mt-2 h-6 w-72" />

        <div className="mt-6 rounded-md border border-ink-200 bg-white p-6">
          <div className="skel h-3 w-24" />
          <div className="skel mt-3 h-5 w-3/4" />
          <div className="skel mt-2 h-4 w-2/3" />
          <div className="mt-5 space-y-2">
            <div className="skel h-12" />
            <div className="skel h-12" />
            <div className="skel h-12" />
            <div className="skel h-12" />
          </div>
          <div className="mt-6 flex justify-between">
            <div className="skel h-10 w-28" />
            <div className="skel h-10 w-32" />
          </div>
        </div>
      </section>
    </main>
  );
}
