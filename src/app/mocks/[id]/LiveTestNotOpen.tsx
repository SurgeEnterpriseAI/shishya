// Shown when a student opens an All-India Live Test paper BEFORE its
// window opens (22 Aug 2026). Nothing is created — no attempt, no leak of
// the paper. They see exactly when it opens and a way to get reminded.

import Link from "next/link";

export function LiveTestNotOpen({
  examCode,
  examShort,
  opensAtIso,
}: {
  examCode: string;
  examShort: string;
  opensAtIso: string;
}) {
  const opens = new Date(opensAtIso);
  const label = opens.toLocaleString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-2xl border border-saffron-200 bg-saffron-50 p-6 text-center">
        <div className="text-3xl">🇮🇳</div>
        <h1 className="mt-2 text-lg font-bold text-ink-900">This All-India Live Test hasn&apos;t opened yet</h1>
        <p className="mt-2 text-sm text-ink-700">
          The {examShort} paper goes live on <span className="font-semibold">{label} IST</span>. Everyone
          sits it in the same window, so the national rank is fair — come back then.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href="/live-test"
            className="rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-saffron-600"
          >
            Set a reminder on the Live Test page →
          </Link>
          <Link
            href={`/exams/${examCode}`}
            className="rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-white"
          >
            Practice {examShort} mocks meanwhile
          </Link>
        </div>
      </div>
    </main>
  );
}
