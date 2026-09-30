// In-app browsers and Google sign-in (30 Sep 2026, sign-up build 1).
//
// Google refuses OAuth inside embedded webviews ("disallowed_useragent"),
// so a student who opens Shishya from Instagram, Facebook, LinkedIn, LINE or
// Snapchat — or any Android app's WebView — can tap "Continue with Google"
// and never come back. Nothing on the site knew. Now:
//   • inAppBrowser(ua) names the app family (no raw user agent is stored:
//     the family label is all a beacon or page view carries);
//   • /login and the mock gate show one escape line in those browsers only
//     (src/components/InAppBrowserHint.tsx): open this page in Chrome
//     (Android) or copy the link (everywhere);
//   • the skip-/login test never sends an in-app browser straight to Google
//     (src/lib/direct-signin-ab.ts) — it gets /login and this line.
//
// Not a webview here: ChatGPT's link browser (Chrome Custom Tabs on Android,
// SFSafariViewController on iOS) — Google allows those, and their user
// agents carry none of the markers below. The Android marker is the exact
// "; wv)" token src/lib/install-offer.ts already relies on.
//
// Pure: detection, the Chrome intent link and the copy (en / hi / te).

import type { CopyLocale } from "@/lib/ui-locale-copy";

export type InAppFamily = "instagram" | "facebook" | "linkedin" | "line" | "snapchat" | "webview";

/** The in-app browser family, or null for a normal browser. App markers
 *  first (they also carry "; wv)" on Android), the bare WebView last. */
export function inAppBrowser(ua: string | null | undefined): InAppFamily | null {
  if (typeof ua !== "string" || !ua) return null;
  if (/Instagram/.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB/.test(ua)) return "facebook";
  if (/LinkedInApp/.test(ua)) return "linkedin";
  if (/\bLine\/\d/.test(ua)) return "line";
  if (/Snapchat/.test(ua)) return "snapchat";
  if (/;\s*wv\)/.test(ua)) return "webview";
  return null;
}

/** Android's "open this in Chrome" link for the current page (no hash:
 *  the intent URL uses it). Null when the URL cannot be read. */
export function chromeIntentUrl(href: string): string | null {
  try {
    const u = new URL(href);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(":", "")};package=com.android.chrome;end`;
  } catch {
    return null;
  }
}

export interface InAppCopy {
  title: string;
  /** "{app}" — the app's name, or this locale's "this app". */
  body: string;
  chrome: string;
  copy: string;
  copied: string;
  thisApp: string;
}

const APP_NAME: Readonly<Record<Exclude<InAppFamily, "webview">, string>> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  line: "LINE",
  snapchat: "Snapchat",
};

export const IN_APP_COPY: Readonly<Record<CopyLocale, InAppCopy>> = {
  en: {
    title: "Sign-in may not work inside this app",
    body: "You are reading Shishya inside {app}. Google often blocks sign-in in built-in browsers — open this page in Chrome or Safari, then sign in with Google.",
    chrome: "Open in Chrome →",
    copy: "Copy link",
    copied: "Link copied — paste it into Chrome or Safari.",
    thisApp: "this app",
  },
  hi: {
    title: "इस ऐप के अंदर साइन इन शायद न हो पाए",
    body: "आप Shishya को {app} के अंदर पढ़ रहे हैं। Google अक्सर ऐप के अंदर वाले ब्राउज़र में साइन इन रोक देता है — यह पेज Chrome या Safari में खोलें, फिर Google से साइन इन करें।",
    chrome: "Chrome में खोलें →",
    copy: "लिंक कॉपी करें",
    copied: "लिंक कॉपी हो गया — इसे Chrome या Safari में पेस्ट करें।",
    thisApp: "इस ऐप",
  },
  te: {
    title: "ఈ యాప్ లోపల sign in పని చేయకపోవచ్చు",
    body: "మీరు Shishya ను {app} లోపల చదువుతున్నారు. యాప్‌ల లోపలి బ్రౌజర్‌లో Google తరచూ sign in ను అడ్డుకుంటుంది — ఈ పేజీని Chrome లేదా Safari లో తెరిచి, తర్వాత Google తో sign in చేయండి.",
    chrome: "Chrome లో తెరవండి →",
    copy: "లింక్ కాపీ చేయండి",
    copied: "లింక్ కాపీ అయింది — దాన్ని Chrome లేదా Safari లో పేస్ట్ చేయండి.",
    thisApp: "ఈ యాప్",
  },
};

/** The body with the app named (or "this app" for a bare WebView). */
export function inAppBody(copy: InAppCopy, family: InAppFamily): string {
  const app = family === "webview" ? copy.thisApp : APP_NAME[family];
  return copy.body.replace("{app}", app);
}
