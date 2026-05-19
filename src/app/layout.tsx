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
