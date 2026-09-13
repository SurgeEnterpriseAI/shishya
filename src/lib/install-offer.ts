// Install offer — pure decision logic (13 Sep 2026, phone-first speed).
//
// <InstallOffer /> (src/components/InstallOffer.tsx) shows ONE quiet bar,
// "Add Shishya to your home screen — opens in one tap, no app store", and
// only when all of these hold:
//   • the browser fired `beforeinstallprompt` (so the native install dialog
//     really exists — we never draw an offer the browser can't honour);
//   • Android, not an in-app WebView ("home screen" copy is phone copy);
//   • not already running as the installed app;
//   • this is the visitor's second visit or later (a visit = a tab
//     session, counted once via sessionStorage);
//   • the offer has never been shown before — once shown, dismissed or
//     accepted it never comes back (no re-prompt, no timers, no counters);
//   • not inside a mock / live test / results / sign-in / admin flow;
//   • no other dialog / bottom sheet is on screen (SignupNudge, a drawer,
//     a tour). The bar sits at z-[45] so the z-40 "Suggest a feature" pill
//     can never cover its buttons — and because it is on top, it must never
//     open over (or stay over) another sheet's controls: it steps aside.
//
// No DOM access at import — unit-tested in tests/unit/install-offer.test.ts.

/** localStorage: "shown" | "dismissed" | "accepted" — any value = never again. */
export const INSTALL_OFFER_KEY = "shishya_install_offer";
/** localStorage: number of tab sessions seen. */
export const VISITS_KEY = "shishya_visits";
/** sessionStorage: this tab session has already been counted. */
export const VISIT_COUNTED_KEY = "shishya_visit_counted";
export const MIN_VISITS = 2;

export const INSTALL_OFFER_COPY = "Add Shishya to your home screen — opens in one tap, no app store";

export type OfferState = "shown" | "dismissed" | "accepted" | null;

/** Normalise the stored value. Anything unexpected but non-empty counts as
 *  "shown" — when unsure, stay quiet rather than offer twice. */
export function readOfferState(raw: string | null | undefined): OfferState {
  if (raw == null || raw === "") return null;
  if (raw === "dismissed" || raw === "accepted" || raw === "shown") return raw;
  return "shown";
}

/** Android browser, excluding in-app WebViews (`; wv)` token). iOS never
 *  fires beforeinstallprompt, desktop copy would be wrong. */
export function isAndroidBrowserUA(ua: string | null | undefined): boolean {
  if (!ua) return false;
  if (!/Android/i.test(ua)) return false;
  if (/;\s*wv\)/i.test(ua)) return false;
  return true;
}

export function blockedInstallPath(path: string | null | undefined): boolean {
  const p = path || "/";
  return (
    p.startsWith("/mocks/") ||
    p.startsWith("/live-test/") ||
    p.startsWith("/attempts/") ||
    p.startsWith("/login") ||
    p.startsWith("/logout") ||
    p.startsWith("/admin") ||
    p.startsWith("/onboarding") ||
    p.startsWith("/i/") ||
    p.startsWith("/join/") ||
    p.startsWith("/aptitude")
  );
}

/** Visits after this page load: +1 unless this tab session was counted. */
export function nextVisitCount(stored: string | null | undefined, alreadyCountedThisSession: boolean): number {
  const n = Number(stored ?? "0");
  const base = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  return alreadyCountedThisSession ? base : base + 1;
}

export interface OfferInput {
  visits: number;
  state: OfferState;
  standalone: boolean;
  android: boolean;
  hasPrompt: boolean;
  path: string;
  /** Another dialog / bottom sheet is on screen right now. */
  otherDialogOpen: boolean;
}

export function shouldOfferInstall(i: OfferInput): boolean {
  return (
    i.hasPrompt &&
    i.android &&
    !i.standalone &&
    i.state === null &&
    i.visits >= MIN_VISITS &&
    !i.otherDialogOpen &&
    !blockedInstallPath(i.path)
  );
}

/** The bar is up but must go (for good — "shown" is already stored): the
 *  student navigated into a blocked flow, or another sheet opened. */
export function installOfferMustYield(path: string | null | undefined, otherDialogOpen: boolean): boolean {
  return otherDialogOpen || blockedInstallPath(path);
}
