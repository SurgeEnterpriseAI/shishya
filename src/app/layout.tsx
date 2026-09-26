import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { SignupNudge } from "@/components/SignupNudge";
import { SiteFooter } from "@/components/SiteFooter";
import { Suspense } from "react";
import {
  SITE_LANGUAGE_CODES,
  SITE_ORG_ID,
  SITE_SHORT,
  SITE_SLOGAN,
  SITE_TITLE_DEFAULT,
  siteDescriptionStatic,
} from "@/lib/site-description";
import "./globals.css";

// Mobile + cross-browser viewport configuration.
//   width=device-width      — fit the device naturally
//   initialScale=1          — no zoom-in on first paint
//   maximumScale=5          — DO allow pinch zoom (accessibility; never lock)
//   viewportFit=cover       — let content extend into iOS notch / home-indicator
//                              areas; we use env(safe-area-inset-*) where it
//                              matters (FAB, sidebar, footers).
//   themeColor              — sets the URL bar tint on Chrome Android / Safari
//                              for a more "app-like" feel.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff7ed" },
    { media: "(prefers-color-scheme: dark)",  color: "#fff7ed" },
  ],
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  variable: "--font-noto-devanagari",
  display: "swap",
  // 13 Sep 2026 (phone-first audit): this layout is static and cannot know
  // the page locale, so the default preload put ~146 KB of <link
  // rel=preload> Devanagari font on every English and Telugu page.
  // preload:false keeps the self-hosted @font-face rules (unicode-range
  // U+0900-097F…), so the file is fetched only when Devanagari text is
  // actually rendered — the hi / mr pages — and never preloaded elsewhere.
  // Until it arrives (display:swap) and on any device where it can't load,
  // the tailwind `multi` / `hindi` stacks fall back to the system
  // Devanagari font, so the text always renders.
  preload: false,
});

export const metadata: Metadata = {
  // 26 Sep 2026: Shishya is one smart place to study — school, entrance and
  // government exams, colleges, scholarships and careers — not a
  // government-exam site. The default title and description are the shared
  // wording in src/lib/site-description.ts (no typed "170+", no "all TETs").
  title: SITE_TITLE_DEFAULT,
  description: SITE_SHORT,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://shishya.in"),
  // Web app manifest (13 Sep 2026) — src/app/manifest.ts, served at
  // /manifest.webmanifest. Next also auto-links the file; declaring it here
  // keeps the <link rel="manifest"> explicit (one tag either way).
  manifest: "/manifest.webmanifest",
  // Belt-and-suspenders: even though Next App Router auto-detects
  // app/icon.svg + app/apple-icon.svg, declaring them in metadata
  // guarantees the <link> tags are present in the rendered HTML
  // (some crawlers and older browsers ignore the auto-injection).
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/icon.svg"],
  },
  // 26 Sep 2026: no url / title / description here. A page without its own
  // openGraph inherited og:url=https://shishya.in (~319 sitemap URLs told
  // crawlers they were the home page) and the old government-exam title.
  // Next fills og:title / og:description from each page's own title and
  // description when they are absent, and twitter:* from openGraph.
  openGraph: {
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
  // Default Twitter card for every page that doesn't override.
  // summary_large_image makes the auto-fetched og:image render at
  // 1200x630 in Twitter/X timeline previews. @shishyaedu stays until the
  // founder confirms the handle after deploy (26 Sep 2026).
  twitter: {
    card: "summary_large_image",
    site: "@shishyaedu",
    creator: "@shishyaedu",
  },
  // Search engine verification meta tags — set via env so we can
  // paste the GSC/Bing/Yandex tokens once and they appear in <head>
  // on every page. Empty strings get filtered out by Next.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION ?? undefined,
    other: {
      ...(process.env.BING_SITE_VERIFICATION
        ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
        : {}),
    },
  },
};

// Global JSON-LD: WebSite (with SearchAction so Google can render a
// sitelinks search box) + Organization. Rendered in the root layout's
// <body> so every page emits it. Per-page schemas (Course / Article /
// CollegeOrUniversity / FAQPage / BreadcrumbList) stack on top of these.
const SITE_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://shishya.in";

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Shishya",
  alternateName: "शिष्य",
  url: SITE_BASE,
  // 26 Sep 2026: SearchAction targets the whole-platform search — the same
  // URL the home search strip and the /ask box submit. /ask?q= resolves the
  // query over Shishya's page index with no model call: a clear match 307s
  // to its page (school class / subject / chapter, exam and its sub-pages,
  // college, scholarship, career), anything else is a noindex list of real
  // pages; the AI answers there only on a person's action. This is the one
  // WebSite node on every page, "/" included — the home page adds none.
  // Google stopped showing the sitelinks search box in Nov 2024; the
  // schema stays valid for other engines and AI agents.
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_BASE}/ask?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

// 26 Sep 2026: one Organization entity for the whole-education platform.
// "@id" lets every page's publisher / provider / author node (JsonLd.tsx,
// /about) point at this one node; description is the shared static form
// (src/lib/site-description.ts) — no typed "170+", no "all state PSCs, all
// TETs, all Police exams". knowsLanguage is the locales list itself.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "@id": SITE_ORG_ID,
  name: "Shishya",
  alternateName: ["शिष्य", "Shishya.in"],
  slogan: SITE_SLOGAN,
  url: SITE_BASE,
  logo: { "@type": "ImageObject", url: `${SITE_BASE}/icons/icon-512.png`, width: 512, height: 512 },
  description: `${siteDescriptionStatic()} Exam content is AI-drafted, grounded in official notifications and re-checked when a student reports an error. No credit card, no ads, no affiliate links, no agent referrals.`,
  areaServed: { "@type": "Country", name: "India" },
  knowsAbout: [
    "CBSE",
    "NCERT",
    "CISCE",
    "JEE",
    "NEET",
    "CUET",
    "NDA",
    "olympiads",
    "UPSC",
    "SSC",
    "banking exams",
    "railway exams",
    "state PSC exams",
    "teacher eligibility tests",
    "colleges in India",
    "scholarships in India",
    "careers",
  ],
  knowsLanguage: [...SITE_LANGUAGE_CODES],
  sameAs: [
    "https://github.com/SurgeEnterpriseAI/shishya",
  ],
  // Real-entity signals (25 Aug 2026, E-E-A-T): who operates the site,
  // where, and how to reach them — same facts as /about and /terms.
  parentOrganization: {
    "@type": "Organization",
    name: "Surge Software Solutions Pvt Ltd",
    legalName: "Surge Software Solutions Pvt Ltd",
    email: "corp@surgesoftware.co.in",
    url: "https://surgesoftware.co.in",
    address: { "@type": "PostalAddress", addressLocality: "Bengaluru", addressRegion: "Karnataka", addressCountry: "IN" },
  },
  contactPoint: { "@type": "ContactPoint", email: "corp@surgesoftware.co.in", contactType: "customer support", availableLanguage: ["en", "hi", "te"] },
};

// Root layout is intentionally synchronous and free of cookies()/auth()
// calls so individual pages can opt into static rendering (and edge
// caching) when they don't have their own dynamic dependencies. The
// `<html lang>` defaults to "en" — the LangSwitcher client component
// updates the rendered locale post-hydration based on the saved cookie.
//
// FeedbackWidget is always rendered; it has its own internal auth-aware
// gate that hides the widget for anonymous visitors. Slight cost (a few
// KB of client JS for anonymous visitors) is more than paid back by
// making every page edge-cacheable.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${inter.variable} ${notoDevanagari.variable}`}
    >
      <body className="font-multi">
        {/* Global JSON-LD — WebSite with SearchAction + EducationalOrganization.
            Per-page Course / Article / CollegeOrUniversity schemas stack on top. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {children}
        <SiteFooter />
        <FeedbackWidget />
        {/* Engagement-triggered signup nudge for anonymous visitors —
            5 active minutes + 3 pageviews, hard courtesy caps inside. */}
        <SignupNudge />
        {/* First-party analytics tracker (no 3rd-party network calls).
            Wrapped in Suspense because useSearchParams() must be inside
            a Suspense boundary in App Router. */}
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
      </body>
    </html>
  );
}
