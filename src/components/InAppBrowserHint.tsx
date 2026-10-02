"use client";

// The in-app-browser escape line (30 Sep 2026, sign-up build 1) — see
// src/lib/in-app-browser.ts. Renders NOTHING on the server and nothing in a
// normal browser: only after mount, and only when the user agent names an
// embedded webview (Instagram, Facebook, LinkedIn, LINE, Snapchat, an
// Android WebView), one line above the Google button says sign-in may not
// work here and offers the way out — "Open in Chrome" on Android (an intent
// link) and "Copy link" everywhere. Mounted on /login and above the
// straight-to-Google gate buttons (src/components/GuestQuizGate.tsx
// GateSignInButton): the mock gate's top button (once per page — its quiz-end
// button passes inAppHint={false}) and the build-mock gate's quiz-end button.
// A person reaches each only by asking to sign in (or finishing the guest
// quiz under a sign-in); never on a Class 1-7 page.
// Its taps send CTA_CLICKED "inapp-escape" with the family label and the
// action — no raw user agent.
// 2 Oct 2026 (review of the sentences pass): `signIn` — the line's last
// words follow the button under it (src/lib/in-app-browser.ts).

import { useEffect, useState } from "react";
import { ctaBeacon } from "@/lib/cta-beacon";
import { chromeIntentUrl, inAppBody, inAppBrowser, IN_APP_COPY, type InAppFamily } from "@/lib/in-app-browser";
import { clientUiLocale, pickCopy } from "@/lib/ui-locale-copy";

export function InAppBrowserHint({
  className = "",
  signIn = false,
}: {
  className?: string;
  /** The Google button under this line reads "Continue with Google", not
   *  "Sign up with Google" — /login's "Welcome back" card, or a language
   *  other than en / hi / te. The line then ends "then sign in with Google". */
  signIn?: boolean;
}) {
  const [hint, setHint] = useState<null | { family: InAppFamily; intent: string | null; url: string }>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const family = inAppBrowser(navigator.userAgent);
      if (!family) return;
      const url = location.href;
      setHint({ family, intent: /Android/i.test(navigator.userAgent) ? chromeIntentUrl(url) : null, url });
      ctaBeacon("inapp-escape", { inApp: family, action: "shown" });
    } catch {
      /* no hint */
    }
  }, []);

  if (!hint) return null;
  const c = pickCopy(IN_APP_COPY, clientUiLocale());

  const copyLink = async () => {
    ctaBeacon("inapp-escape", { inApp: hint.family, action: "copy" });
    try {
      await navigator.clipboard.writeText(hint.url);
      setCopied(true);
    } catch {
      // No clipboard (older webviews): show the link to copy by hand.
      window.prompt(c.copy, hint.url);
    }
  };

  return (
    <div role="note" className={`mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ${className}`}>
      <p className="font-semibold">{c.title}</p>
      <p className="mt-0.5 text-xs leading-relaxed">{inAppBody(c, hint.family, signIn)}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {hint.intent && (
          <a
            href={hint.intent}
            onClick={() => ctaBeacon("inapp-escape", { inApp: hint.family, action: "chrome" })}
            className="inline-flex min-h-[40px] items-center rounded-md bg-amber-600 px-3 text-xs font-bold text-white hover:bg-amber-700"
          >
            {c.chrome}
          </a>
        )}
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex min-h-[40px] items-center rounded-md border border-amber-400 bg-white px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100"
        >
          {c.copy}
        </button>
      </div>
      {copied && <p className="mt-1.5 text-xs font-medium">{c.copied}</p>}
    </div>
  );
}
