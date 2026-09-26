import type { MetadataRoute } from "next";
import { SITE_SHORT, SITE_SLOGAN } from "@/lib/site-description";

// Web app manifest (13 Sep 2026, phone-first speed). Served by Next at
// /manifest.webmanifest and linked from the root layout's metadata.
//
// start_url carries utm_source=pwa so opens from the home-screen icon show
// up as their own channel. It is the PUBLIC home page, not /today: guests
// get the install offer too (and Chrome's menu "Install app" works for
// anyone), and /today redirects every guest to /login — an installed icon
// that opens on a sign-in wall is the "sign in before value" door the
// 11 Sep signup-leak audit removed, and it would drop the utm (it only
// survives inside callbackUrl). "/" renders for guests and signed-in
// students alike, and the header's Today link is one tap away for the
// latter. Keep id "/" so a start_url change never creates a second
// installed app. No service worker and no push this wave — Chrome on Android
// still fires beforeinstallprompt on a valid manifest, and <InstallOffer />
// only appears when it does.
//
// Colours match the page's meta theme-color (#fff7ed, layout viewport) so
// the installed app's status bar does not flash a different tint on open.
// Icons are generated from public/icon.svg by scripts/make-icons.ts.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    // 26 Sep 2026: the whole-education name and the shared short
    // description (src/lib/site-description.ts), not "Government Exam Prep".
    name: `Shishya — ${SITE_SLOGAN}`,
    short_name: "Shishya",
    description: SITE_SHORT,
    start_url: "/?utm_source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#fff7ed",
    theme_color: "#fff7ed",
    lang: "en-IN",
    dir: "ltr",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
