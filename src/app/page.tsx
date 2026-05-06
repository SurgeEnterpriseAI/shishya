// Landing page — public, mobile-first, bilingual (English + Hindi).
// Server Component — reads locale from cookie/session via getT().

import Link from "next/link";
import { getT } from "@/lib/i18n-server";
import { LangSwitcher } from "@/components/LangSwitcher";

export default async function HomePage() {
  const { locale, t } = await getT();
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <SiteHeader locale={locale} t={t} />
      <Hero t={t} />
      <ValueProps t={t} />
      <HowItWorks t={t} />
      <ExamsGrid t={t} />
      <SocialImpact t={t} />
      <Footer t={t} />
    </main>
  );
}

type T = (k: any) => string;

// ─────────────────────────────────────────────────────────────────────────
// Header (landing-specific so it can show LangSwitcher even when logged out)
// ─────────────────────────────────────────────────────────────────────────
function SiteHeader({ locale, t }: { locale: any; t: T }) {
  return (
    <header className="border-b border-ink-200/50 bg-white/70 backdrop-blur">
      <div className="container-prose flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-saffron-500 text-lg font-bold text-white">
            शि
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink-900">Shishya</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-ink-700 sm:flex">
          <a href="#exams" className="hover:text-ink-900">{t("nav.exams")}</a>
          <a href="#how" className="hover:text-ink-900">{t("nav.howItWorks")}</a>
          <a href="#impact" className="hover:text-ink-900">{t("nav.whyFree")}</a>
        </nav>
        <div className="flex items-center gap-3">
          <LangSwitcher current={locale} />
          <Link href="/api/auth/signin" className="btn-primary !py-2 !px-4 text-xs sm:text-sm">
            {t("nav.signin")}
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────────────────
function Hero({ t }: { t: T }) {
  return (
    <section className="container-prose pt-12 pb-20 sm:pt-20 sm:pb-28">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-saffron-200 bg-saffron-100/60 px-3 py-1 text-xs font-medium text-saffron-800">
          <span className="h-1.5 w-1.5 rounded-full bg-saffron-500" />
          {t("hero.badge")}
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-6xl">
          {t("hero.h1.line1")}
          <span className="block bg-gradient-to-r from-saffron-600 to-saffron-400 bg-clip-text text-transparent">
            {t("hero.h1.line2")}
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-600">
          {t("hero.body")} <span className="font-medium text-ink-800">{t("hero.body.bold")}</span>
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/api/auth/signin" className="btn-primary w-full sm:w-auto">
            {t("hero.cta.primary")}
          </Link>
          <a href="#how" className="btn-secondary w-full sm:w-auto">
            {t("hero.cta.secondary")}
          </a>
        </div>
        <p className="mt-6 text-xs text-ink-500">
          {t("hero.smallprint")}{" "}
          <a className="underline hover:text-ink-700" href="https://surgesoftware.co.in">Surge</a>
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Value props
// ─────────────────────────────────────────────────────────────────────────
function ValueProps({ t }: { t: T }) {
  const items: Array<[string, string]> = [
    ["values.diag.title", "values.diag.body"],
    ["values.adapt.title", "values.adapt.body"],
    ["values.expl.title", "values.expl.body"],
    ["values.tutor.title", "values.tutor.body"],
  ];
  return (
    <section className="border-y border-ink-200/50 bg-white py-16">
      <div className="container-prose">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(([title, body]) => (
            <div key={title}>
              <h3 className="text-base font-semibold text-ink-900">{t(title)}</h3>
              <p className="mt-2 text-sm text-ink-600">{t(body)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// How it works
// ─────────────────────────────────────────────────────────────────────────
function HowItWorks({ t }: { t: T }) {
  const steps: Array<[string, string, string]> = [
    ["01", "how.s1.title", "how.s1.body"],
    ["02", "how.s2.title", "how.s2.body"],
    ["03", "how.s3.title", "how.s3.body"],
    ["04", "how.s4.title", "how.s4.body"],
    ["05", "how.s5.title", "how.s5.body"],
    ["06", "how.s6.title", "how.s6.body"],
  ];

  return (
    <section id="how" className="container-prose py-20 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          {t("how.h2")}
        </h2>
        <p className="mt-4 text-base text-ink-600">{t("how.body")}</p>
      </div>
      <ol className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map(([n, title, body]) => (
          <li key={n} className="rounded-lg border border-ink-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-mono font-medium text-saffron-600">{n}</div>
            <h3 className="mt-2 text-lg font-semibold text-ink-900">{t(title)}</h3>
            <p className="mt-2 text-sm text-ink-600">{t(body)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Exams grid
// ─────────────────────────────────────────────────────────────────────────
const EXAMS = [
  { code: "SSC_CGL",      name: "SSC CGL",      cat: "Govt Jobs",      vol: "30L+/yr",  liveKey: true },
  { code: "RRB_NTPC",     name: "RRB NTPC",     cat: "Railways",       vol: "1.25Cr/yr", liveKey: false },
  { code: "IBPS_PO",      name: "IBPS PO",      cat: "Banking",        vol: "15L/yr",   liveKey: false },
  { code: "NEET_UG",      name: "NEET UG",      cat: "Medical",        vol: "24L/yr",   liveKey: false },
  { code: "JEE_MAIN",     name: "JEE Main",     cat: "Engineering",    vol: "14L/yr",   liveKey: false },
  { code: "UPSC_PRELIMS", name: "UPSC Prelims", cat: "Civil Services", vol: "11L/yr",   liveKey: false },
  { code: "CUET_UG",      name: "CUET UG",      cat: "University",     vol: "14L/yr",   liveKey: false },
  { code: "CTET",         name: "CTET",         cat: "Teaching",       vol: "30L/yr",   liveKey: false },
  { code: "GATE_CSE",     name: "GATE CSE",     cat: "Engineering",    vol: "1L/yr",    liveKey: false },
  { code: "CAT",          name: "CAT",          cat: "MBA",            vol: "3.5L/yr",  liveKey: false },
] as const;

function ExamsGrid({ t }: { t: T }) {
  return (
    <section id="exams" className="border-t border-ink-200/50 bg-white py-20 sm:py-28">
      <div className="container-prose">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            {t("exams.h2")}
          </h2>
          <p className="mt-4 text-base text-ink-600">{t("exams.body")}</p>
        </div>
        <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {EXAMS.map((e) => (
            <li
              key={e.code}
              className="group flex items-start justify-between rounded-md border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:shadow-sm"
            >
              <div>
                <p className="text-sm font-semibold text-ink-900">{e.name}</p>
                <p className="mt-0.5 text-xs text-ink-500">{e.cat} · {e.vol}</p>
              </div>
              <span
                className={
                  e.liveKey
                    ? "rounded-full bg-saffron-100 px-2 py-0.5 text-xs font-medium text-saffron-800"
                    : "rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600"
                }
              >
                {e.liveKey ? t("exams.status.live") : t("exams.status.coming")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Social impact
// ─────────────────────────────────────────────────────────────────────────
function SocialImpact({ t }: { t: T }) {
  return (
    <section id="impact" className="bg-ink-900 py-20 text-white sm:py-28">
      <div className="container-prose">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("impact.h2")}</h2>
          <p className="mt-6 text-base text-ink-200">{t("impact.body1")}</p>
          <p className="mt-4 text-base text-ink-200">
            {t("impact.body2.prefix")}{" "}
            <a className="underline" href="https://surgesoftware.co.in">Surge</a> {t("impact.body2.middle")}{" "}
            <span className="font-medium text-white">{t("impact.body2.brand")}</span>{t("impact.body2.suffix")}
          </p>
          <p className="mt-8 text-sm text-ink-400">
            <span className="font-medium text-ink-100">{t("impact.signoff.hi")}</span>
            <span className="mx-2">·</span>
            {t("impact.signoff.en")}
          </p>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────────────
function Footer({ t }: { t: T }) {
  return (
    <footer className="border-t border-ink-200 bg-white py-12">
      <div className="container-prose flex flex-col items-center justify-between gap-4 text-sm text-ink-500 sm:flex-row">
        <p>© {new Date().getFullYear()} Shishya · {t("footer.built")}</p>
        <div className="flex items-center gap-4">
          <a href="https://github.com/SurgeEnterpriseAI" className="hover:text-ink-800">{t("footer.github")}</a>
          <a href="mailto:venumuvva@surgesoftware.co.in" className="hover:text-ink-800">{t("footer.contact")}</a>
          <a href="https://surgesoftware.co.in" className="hover:text-ink-800">{t("footer.surge")}</a>
        </div>
      </div>
    </footer>
  );
}
