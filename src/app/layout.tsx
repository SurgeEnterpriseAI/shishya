import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import { getLocale } from "@/lib/i18n-server";
import { isRtl } from "@/lib/i18n";
import { auth } from "@/lib/auth";
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
  title: "Shishya — Every entrance exam in India, free, with AI tutoring",
  description:
    "163 entrance exams across India — national, state-level, olympiads, civil services, banking, teaching, defence — with previous year papers, expert-curated mocks, and Shishya AI as your personal tutor. Free for every student, in English, Hindi and 17 other Indian languages.",
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
    title: "Shishya — 163 entrance exams across India, free, with AI tutoring",
    description:
      "163 entrance exams across India — national, state-level, olympiads, civil services, banking, teaching, defence. Make Shishya your smart system: it listens to you and handholds you to better ranks, better colleges, and a better career. Free for every student.",
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
    title: "Shishya — Every entrance exam in India, free, with AI tutoring",
    description:
      "163 exams · adaptive mocks · syllabus · previous year papers · AI tutor. Free, in your language.",
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
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_BASE}/exams/browse?q={search_term_string}`,
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
    "Free AI-tutored education platform for Indian students — covering schooling, entrance exams, colleges, scholarships, and study-abroad pathways.",
  sameAs: [
    "https://github.com/SurgeEnterpriseAI/shishya",
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dir = isRtl(locale) ? "rtl" : "ltr";
  // Cheap auth check — the FeedbackWidget itself short-circuits on
  // signed-out users, but doing the check here lets us avoid sending
  // any of the widget's client JS to anonymous visitors at all.
  const session = await auth();
  const signedIn = !!session?.user?.id;
  return (
    <html
      lang={locale}
      dir={dir}
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
        {signedIn && <FeedbackWidget signedIn />}
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
