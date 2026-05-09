import type { Metadata } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import { getLocale } from "@/lib/i18n-server";
import { isRtl } from "@/lib/i18n";
import "./globals.css";

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
  title: "Shishya — Free AI mock tests for India's top entrance exams",
  description:
    "Free, AI-tutored mock test platform for SSC, RRB, IBPS, NEET, JEE, UPSC, CUET, GATE, CTET, CAT and more. In English, Hindi and 17 other Indian languages. Practice. Diagnose. Improve. For every student.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://shishya.in"),
  openGraph: {
    title: "Shishya — Free AI mock tests for India's top 20 exams",
    description:
      "AI-tutored mock test prep for India's top 20 entrance exams. In all 18 scheduled languages. Free for every student.",
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
