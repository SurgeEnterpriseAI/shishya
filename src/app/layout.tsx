import type { Metadata } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import { getLocale } from "@/lib/i18n-server";
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
    "Free, AI-tutored mock test platform for SSC, RRB, IBPS, NEET, JEE, UPSC, CUET, GATE, CTET and CAT. Practice. Diagnose. Improve. For every student.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://shishya.in"),
  openGraph: {
    title: "Shishya — Free AI mock tests for India's top entrance exams",
    description:
      "AI-tutored mock test prep for India's top 10 entrance exams. Free for every student.",
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
  return (
    <html lang={locale} className={`${inter.variable} ${notoDevanagari.variable}`}>
      <body className={locale === "hi" ? "font-hindi" : "font-sans"}>{children}</body>
    </html>
  );
}
