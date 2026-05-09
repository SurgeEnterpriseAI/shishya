import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import { getLocale } from "@/lib/i18n-server";
import { isRtl } from "@/lib/i18n";
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
  title: "Shishya — Free expert-curated mocks for India's top entrance exams",
  description:
    "Free expert-curated mock test platform for SSC, RRB, IBPS, NEET, JEE, UPSC, CUET, GATE, CTET, CAT and more — supported by Shishya AI as your personal tutor. In English, Hindi and 17 other Indian languages. Practice. Diagnose. Improve. For every student.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://shishya.in"),
  openGraph: {
    title: "Shishya — Free expert-curated mocks for India's top 20 exams",
    description:
      "Expert-curated mocks for India's top 20 entrance exams, supported by Shishya AI. In all 18 scheduled languages. Free for every student.",
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
  return (
    <html
      lang={locale}
      dir={dir}
      className={`${inter.variable} ${notoDevanagari.variable}`}
    >
      <body className="font-multi">{children}</body>
    </html>
  );
}
