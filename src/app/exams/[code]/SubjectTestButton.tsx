"use client";

// Gap-fill #1 — subject-wise tests. Users asked for this verbatim
// ("Instead of these 5-question quizzes, try a 25-question English test,
// 25-question GK test", "Plz give me computer quiz") and the backend has
// supported SUBJECT mocks (10–100 Q) since day one — there was simply no
// button. One tap creates the subject test from the validated pool and
// drops the student into the player. Anonymous users go to login with a
// callback so the intent isn't lost.
// 30 Sep 2026 (sign-up build 1): that 401 sends the site-wide sign-in beacon
// (surface "subject-test-401", src/lib/signin-cta.ts; it sent none) and
// names its door on /login (from=). It stays a /login redirect: the student
// pressed "start", so /login says why an account is needed.
// 3 Oct 2026 (sign-ups-to-100 plan lever 5, "401 doors"; src/lib/signin-cta.ts
// "The 401 doors"): no longer a redirect. The 401 opens the shared "Sign up
// with Google" button in this button's place (PracticeSignUpDoor: the reason
// line, the age line), with the same /login link and the same return to
// #subject-tests, and sends one "signin-door" shown beacon; the button's own
// click sends the "signin-click" (surface "subject-test-401") from then on.
// On a SOF / Silverzone / NSTSE hub the 401 keeps the /login redirect.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginHrefFor, practiceDoorCallback, practiceDoorInline, signinBeacon, signinDoorShownBeacon } from "@/lib/signin-cta";
import { PracticeSignUpDoor } from "./PracticeSignUpDoor";

interface Props {
  examCode: string;
  subjectCode: string;
  subjectName: string;
  /** Validated questions available in this subject. */
  available: number;
  /** The exam's short name (3 Oct 2026): the 401 door's reason line names it. */
  exam?: string;
  /** The hub page's language, for the 401 door's words. */
  locale?: string;
}

export function SubjectTestButton({ examCode, subjectCode, subjectName, available, exam, locale }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // 3 Oct 2026: a guest's 401 opened the inline sign-up (the 401 door).
  const [door, setDoor] = useState(false);
  // 25 questions when the pool allows; otherwise the biggest test the pool
  // supports (API floor is 10).
  const qCount = Math.max(10, Math.min(25, available));

  async function start() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/mocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          examCode,
          request: { type: "SUBJECT", subjectCode, questionCount: qCount },
        }),
      });
      if (res.status === 401) {
        // 3 Oct 2026: the sign-up opens here, in this button's place.
        if (practiceDoorInline(examCode)) {
          signinDoorShownBeacon("subject-test-401", { examCode });
          setDoor(true);
          setBusy(false);
          return;
        }
        // A kids' exam hub (SOF / Silverzone / NSTSE, JNVST): the /login redirect, as before.
        signinBeacon("subject-test-401", { examCode, via: "login" });
        window.location.href = loginHrefFor(practiceDoorCallback("subject-test-401", examCode), "subject-test-401");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error ?? "Couldn't build the test — try again.");
        setBusy(false);
        return;
      }
      router.push(`/mocks/${data.mock.id}`);
    } catch {
      setErr("Network hiccup — try again.");
      setBusy(false);
    }
  }

  // The 401 door (3 Oct 2026): the sign-up in the test button's place.
  if (door) return <PracticeSignUpDoor door="subject-test-401" examCode={examCode} exam={exam} locale={locale} block />;

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="inline-flex w-full items-center justify-center rounded-md bg-saffron-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 disabled:cursor-wait disabled:opacity-70"
      >
        {busy ? "Building your test…" : `${qCount}-question ${subjectName} test →`}
      </button>
      {err && <p className="mt-1 text-xs text-rose-700">{err}</p>}
    </div>
  );
}
