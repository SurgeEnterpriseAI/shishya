// /exam-alerts/unsubscribe?e=&x=&t=&c= — confirm page for exam-tracker
// alerts. GET changes nothing (mail clients prefetch links); the button
// POSTs to /api/exam-alerts/unsubscribe, which redirects back here with
// ?done=unsub|resub.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { verifyAlertToken, normaliseEmail } from "@/lib/exam-alerts";

export const metadata: Metadata = {
  title: "Exam alerts — unsubscribe | Shishya",
  robots: { index: false, follow: false },
};

export default async function ExamAlertUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? "";
  const email = normaliseEmail(get("e"));
  const examId = get("x");
  const token = get("t");
  const code = get("c");
  const done = get("done");
  const valid = !!email && !!examId && verifyAlertToken(email, examId, token);

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-12">
        <div className="mx-auto max-w-md rounded-xl border border-ink-200 bg-white p-6">
          {!valid ? (
            <>
              <h1 className="text-xl font-bold text-ink-900">This link isn&apos;t valid</h1>
              <p className="mt-2 text-sm text-ink-600">
                Open the link from your alert email again, or manage alerts from the exam&apos;s
                tracker page.
              </p>
            </>
          ) : done === "unsub" ? (
            <>
              <h1 className="text-xl font-bold text-ink-900">Unsubscribed</h1>
              <p className="mt-2 text-sm text-ink-600">
                You won&apos;t get alerts for this exam at <span className="font-medium">{email}</span>{" "}
                any more. Changed your mind?
              </p>
              <form method="post" action="/api/exam-alerts/unsubscribe" className="mt-4">
                <input type="hidden" name="e" value={email} />
                <input type="hidden" name="x" value={examId} />
                <input type="hidden" name="t" value={token} />
                <input type="hidden" name="c" value={code} />
                <input type="hidden" name="resub" value="1" />
                <button type="submit" className="rounded-lg border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50">
                  Re-subscribe
                </button>
              </form>
            </>
          ) : done === "resub" ? (
            <>
              <h1 className="text-xl font-bold text-ink-900">You&apos;re back on the list</h1>
              <p className="mt-2 text-sm text-ink-600">Alerts for this exam will reach {email} again.</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-ink-900">Stop exam alerts?</h1>
              <p className="mt-2 text-sm text-ink-600">
                This stops notification / admit-card / result alerts for this exam at{" "}
                <span className="font-medium">{email}</span>. Other emails you asked for are not
                affected.
              </p>
              <form method="post" action="/api/exam-alerts/unsubscribe" className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="e" value={email} />
                <input type="hidden" name="x" value={examId} />
                <input type="hidden" name="t" value={token} />
                <input type="hidden" name="c" value={code} />
                <button type="submit" className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ink-800">
                  Yes, unsubscribe
                </button>
                {code && (
                  <Link
                    href={`/exams/${code}/updates`}
                    className="rounded-lg border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-800 hover:bg-ink-50"
                  >
                    Keep alerts
                  </Link>
                )}
              </form>
            </>
          )}
          <p className="mt-6 text-xs text-ink-500">
            <Link href="/" className="hover:text-ink-800">← Back to Shishya</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
