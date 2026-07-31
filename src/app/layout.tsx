import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { Suspense } from "react";
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
});

export const metadata: Metadata = {
  title: "Shishya — Free Government & Entrance Exam Preparation | 177 exams, in your language",
  description:
    "India's end-to-end free government exam preparation platform. Free mock tests, previous year papers, study notes, live cutoffs and an AI tutor for 177 government and entrance exams — UPSC, SSC, IBPS, RRB, all state PSCs, all TETs, JEE, NEET, GATE, CAT. 100% free, no paywall, no credit card. In English, Hindi and 17 other Indian languages.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://shishya.in"),
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
  openGraph: {
    title: "Shishya — Free Government & Entrance Exam Preparation",
    description:
      "End-to-end free prep for 177 Indian govt & entrance exams. Adaptive mocks, previous year papers, AI tutor, live cutoffs. 100% free, in your language.",
    url: "https://shishya.in",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
  // Default Twitter card for every page that doesn't override.
  // summary_large_image makes the auto-fetched og:image render at
  // 1200x630 in Twitter/X timeline previews.
  twitter: {
    card: "summary_large_image",
    title: "Shishya — Free Government & Entrance Exam Preparation",
    description:
      "End-to-end free prep for 177 Indian govt & entrance exams. Adaptive mocks, previous year papers, AI tutor, live cutoffs. 100% free, in your language.",
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
  // SearchAction now targets Ask Shishya — the AI answer engine IS the
  // site's search. Engines that honor SearchAction (sitelinks search
  // box, AI assistants discovering site capabilities) learn they can
  // pass a natural-language query straight to /ask.
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_BASE}/ask?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Shishya",
  url: SITE_BASE,
  logo: `${SITE_BASE}/icon.svg`,
  description:
    "Shishya is India's end-to-end free government exam preparation platform, covering 177 Indian government and entrance exams — UPSC, SSC, IBPS, RRB, JEE, NEET, GATE, CAT, all state PSCs, all TETs, all Police exams. Adaptive mock tests, previous year papers, study notes, AI tutor, live cutoffs and full syllabus coverage. Verified by students who cleared the same exam. 100% free — no paywall, no credit card, no ads, no affiliate links, no agent referrals. Available in 19 Indian languages.",
  sameAs: [
    "https://github.com/SurgeEnterpriseAI/shishya",
  ],
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
        <FeedbackWidget />
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
