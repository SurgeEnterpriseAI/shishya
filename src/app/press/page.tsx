// /press — Shishya's press kit (27 Sep 2026).
//
// Why: founder ask (27 Sep 2026) — make Shishya the platform the market
// slowly recognises, honestly. Journalists, institutions and AI assistants
// asked "what is Shishya, who runs it, can I quote this?" had to piece it
// together from /about, /pricing and /editorial-policy. This page tells the
// story of HOW Shishya is built (grounded in official sources, answer-checked
// with the results published, AI said plainly, school books linked not
// copied), hands over live key facts with their definitions, story angles
// that are data rather than claims, what Shishya is not, the brand files that
// already exist and a contact.
//
// Sources, all read-only:
//   • the shared description (src/lib/site-description.ts), computed by
//     loadSiteDescriptionCounts() like /about, static form when the read fails;
//   • every number from src/lib/public-numbers.ts (the /shishya-in-numbers
//     loaders, cached hourly under the "public-numbers" tag) — none is
//     redefined here; each links back to its definition;
//   • one finding from the latest Shishya Pulse (src/lib/pulse.ts, already
//     gated there): the hardest topic when enough topics pass Pulse's gate,
//     else the most-practised topic (src/lib/press-kit.ts pulseFinding);
//   • copy, company facts and brand files from src/lib/press-kit.ts.
//
// Privacy (founder rule): aggregates only, no printed group under K_MIN, no
// founder name or phone number, dates only. Server component: no cookies(),
// headers() or locale reads, so it stays statically renderable with hourly
// ISR. The only client code is the Copy button (src/components/press/CopyText.tsx).

import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { JsonLd, breadcrumbLd } from "@/components/JsonLd";
import { DefinedNumber } from "@/components/numbers/DefinedNumber";
import { CopyText } from "@/components/press/CopyText";
import { istDayLabel } from "@/lib/iso-week";
import {
  BRAND_ASSETS,
  BRAND_COLOURS,
  BRAND_NAMES,
  BRAND_RULE,
  COMPANY,
  FREE_FACTS,
  NOT_LIST,
  PRESS_DESCRIPTION,
  PRESS_EMAIL_SUBJECT,
  PRESS_MAILTO,
  PRESS_PATH,
  PRESS_TITLE,
  PRESS_URL,
  WHO_RUNS_IT,
  keyFacts,
  methodBlocks,
  pressPageLd,
  pulseCitationLine,
  storyAngles,
  type PressPulse,
} from "@/lib/press-kit";
import { UPCOMING_DAYS, loadPublicNumbers } from "@/lib/public-numbers";
import { NUMBERS_PATH, citationLine } from "@/lib/public-numbers-rules";
import { loadPulseView } from "@/lib/pulse";
import { latestPulseWeek } from "@/lib/pulse-rules";
import { SITE_SHORT, SITE_SLOGAN, siteDescription, siteDescriptionStatic } from "@/lib/site-description";
import { loadSiteDescriptionCounts } from "@/lib/site-description-counts";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: PRESS_TITLE,
  description: PRESS_DESCRIPTION,
  alternates: { canonical: PRESS_URL },
  openGraph: { title: PRESS_TITLE, description: PRESS_DESCRIPTION, url: PRESS_URL, siteName: "Shishya", locale: "en_IN", type: "website" },
};

const JUMPS: [string, string][] = [
  ["in-one-paragraph", "Shishya in one paragraph"],
  ["free", "What is free"],
  ["who", "Who runs it"],
  ["how-built", "How it is built"],
  ["key-facts", "Key facts"],
  ["story-angles", "Story angles"],
  ["not", "What Shishya is not"],
  ["brand", "Brand assets"],
  ["contact", "Contact and citation"],
];

const H2 = "mt-10 scroll-mt-20 text-lg font-semibold text-ink-900";
const LINK = "text-saffron-700 underline";
const BOX = "mt-3 rounded-lg border border-ink-200 bg-white p-4";
const CITE = "mt-1 break-words rounded-lg border border-ink-200 bg-white px-3 py-2 font-mono text-xs text-ink-800";

/** The shared description in its computed form, like /about. */
async function describeShishya(): Promise<string> {
  try {
    return siteDescription(await loadSiteDescriptionCounts());
  } catch (err) {
    console.error("[press] site counts unavailable — static description", err);
    return siteDescriptionStatic();
  }
}

/** The latest complete Pulse week and its topic tables (gated in pulse.ts). */
async function loadPressPulse(now: Date): Promise<PressPulse | null> {
  const week = latestPulseWeek(now);
  if (!week) return null;
  const view = await loadPulseView(week);
  return {
    week,
    windowLabel: view?.windowLabel ?? null,
    computedDay: view?.computedDay ?? null,
    hardest: view?.hardestTopics ?? null,
    practised: view?.practisedTopics ?? null,
  };
}

export default async function PressPage() {
  const now = new Date();
  const [description, p, pulse] = await Promise.all([describeShishya(), loadPublicNumbers(), loadPressPulse(now)]);
  const facts = keyFacts(p);
  const methods = methodBlocks(p, { upcomingDays: UPCOMING_DAYS });
  const angles = storyAngles(p, pulse);
  const pulseCite = pulseCitationLine(pulse, p.today);

  return (
    <main className="min-h-screen bg-ink-50/40">
      <JsonLd data={[pressPageLd(p.today), breadcrumbLd([["Press kit", PRESS_PATH]])]} />
      <Header />
      <section className="container-prose max-w-3xl py-10 text-sm leading-relaxed text-ink-700">
        <h1 className="text-2xl font-bold text-ink-900">Press kit</h1>
        <p className="mt-3">
          Facts, method, brand files and a contact for writing about Shishya. Every number here is read from Shishya&apos;s
          database when the page is built and links to its definition on{" "}
          <Link href={NUMBERS_PATH} className={LINK}>Shishya in numbers</Link>; computed on <b>{istDayLabel(p.today)}</b> (IST),
          refreshed hourly.
        </p>
        <nav aria-label="On this page" className="mt-4">
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {JUMPS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className={LINK}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        {/* 1. Shishya in one paragraph */}
        <h2 id="in-one-paragraph" className={H2}>Shishya in one paragraph</h2>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-saffron-700">{SITE_SLOGAN}</p>
        <div className={BOX}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">One line</h3>
            <CopyText text={SITE_SHORT} label="Copy line" />
          </div>
          <p className="mt-2 text-ink-800">{SITE_SHORT}</p>
        </div>
        <div className={BOX}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">One paragraph</h3>
            <CopyText text={description} label="Copy paragraph" />
          </div>
          <p className="mt-2 text-ink-800">{description}</p>
        </div>

        {/* 2. What is free */}
        <h2 id="free" className={H2}>What is free</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          {FREE_FACTS.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink-600">
          The same facts are on <Link href="/pricing" className={LINK}>Pricing</Link>,{" "}
          <Link href="/about" className={LINK}>About</Link> and the{" "}
          <Link href="/editorial-policy" className={LINK}>editorial policy</Link>.
        </p>

        {/* 3. Who runs it */}
        <h2 id="who" className={H2}>Who runs it</h2>
        <p className="mt-2">{WHO_RUNS_IT}</p>
        <ul className="mt-2 space-y-1 text-xs">
          <li>
            Company website:{" "}
            <a href={COMPANY.url} className={LINK} target="_blank" rel="noopener noreferrer">{COMPANY.url.replace(/^https:\/\//, "")}</a>
          </li>
          <li>
            Email: <a href={`mailto:${COMPANY.email}`} className={LINK}>{COMPANY.email}</a>
          </li>
          <li>
            Every other way to reach the team: <Link href="/contact" className={LINK}>contact page</Link>
          </li>
        </ul>

        {/* 4. How Shishya is built */}
        <h2 id="how-built" className={H2}>How Shishya is built</h2>
        <p className="mt-2">The story is the method, not the size. Each part links to where it can be checked.</p>
        {methods.map((m) => (
          <div key={m.id} id={m.id} className={`${BOX} scroll-mt-20`}>
            <h3 className="font-semibold text-ink-900">{m.title}</h3>
            {m.body.map((s) => (
              <p key={s} className="mt-2">{s}</p>
            ))}
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {m.links.map((l) => (
                <Link key={l.href + l.label} href={l.href} className={LINK}>{l.label}</Link>
              ))}
            </p>
          </div>
        ))}

        {/* 5. Key facts (live) */}
        <h2 id="key-facts" className={H2}>Key facts</h2>
        <p className="mt-2">
          Counted from the database when the page is built, each with its definition, period and date. Share-based numbers are
          floors: people who study signed out are not seen.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {facts.map((f) => (
            <DefinedNumber
              key={f.id}
              id={f.id}
              label={f.label}
              value={f.value}
              sub={f.sub}
              definition={f.definition}
              period={f.period}
              asOf={f.asOf}
              href={f.href}
            />
          ))}
        </div>

        {/* 6. Story angles */}
        <h2 id="story-angles" className={H2}>Story angles</h2>
        <p className="mt-2">Data a story can start from. Students are the subject; every figure links to its definition.</p>
        <ul className="mt-3 space-y-3">
          {angles.map((a) => (
            <li key={a.id} id={a.id} className="scroll-mt-20 rounded-lg border border-ink-200 bg-white p-4">
              <h3 className="font-semibold text-ink-900">{a.title}</h3>
              <p className="mt-1">{a.body}</p>
              <p className="mt-2 text-xs">
                <Link href={a.href} className={LINK}>{a.linkLabel}</Link>
              </p>
            </li>
          ))}
        </ul>

        {/* 7. What Shishya is not */}
        <h2 id="not" className={H2}>What Shishya is not</h2>
        <dl className="mt-2 space-y-3">
          {NOT_LIST.map((n) => (
            <div key={n.title}>
              <dt className="font-semibold text-ink-900">{n.title}</dt>
              <dd className="mt-0.5">{n.body}</dd>
            </div>
          ))}
        </dl>

        {/* 8. Brand assets */}
        <h2 id="brand" className={H2}>Brand assets</h2>
        <p className="mt-2">
          Names: {BRAND_NAMES.map((n, i) => (
            <span key={n}>
              {i > 0 ? ", " : null}
              <b>{n}</b>
            </span>
          ))}
          . Slogan: <b>{SITE_SLOGAN}</b>.
        </p>
        <ul className="mt-3 divide-y divide-ink-100 rounded-lg border border-ink-200 bg-white">
          {BRAND_ASSETS.map((a) => (
            <li key={a.path} className="flex gap-3 px-3 py-3">
              <div className="w-16 shrink-0">
                {a.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.path}
                    alt={`Preview of ${a.path}`}
                    width={a.width}
                    height={a.height}
                    loading="lazy"
                    className="h-auto w-16 rounded border border-ink-100"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <a href={a.path} className={`${LINK} break-all font-medium`}>{a.path}</a>
                <p className="text-xs text-ink-500">
                  {a.format} · {a.width} × {a.height}
                </p>
                <p className="mt-1 text-xs">{a.use}</p>
                {a.note ? <p className="mt-1 text-[11px] text-ink-500">{a.note}</p> : null}
              </div>
            </li>
          ))}
        </ul>
        <ul className="mt-3 flex flex-wrap gap-3 text-xs">
          {BRAND_COLOURS.map((c) => (
            <li key={c.hex} className="flex items-center gap-2">
              <span aria-hidden="true" className="inline-block h-5 w-5 rounded border border-ink-200" style={{ backgroundColor: c.hex }} />
              <span>
                <b>{c.name}</b> <code className="font-mono">{c.hex}</code> — {c.where}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-600">{BRAND_RULE}</p>

        {/* 9. Contact and citation */}
        <h2 id="contact" className={H2}>Contact and citation</h2>
        <p className="mt-2">
          Press questions: <a href={PRESS_MAILTO} className={LINK}>{COMPANY.email}</a> with &ldquo;{PRESS_EMAIL_SUBJECT}&rdquo; in
          the subject, or the <Link href="/contact" className={LINK}>contact page</Link>.
        </p>
        <p className="mt-3 text-xs font-semibold text-ink-800">How to cite the numbers</p>
        <p className={CITE}>{citationLine(p.today)}</p>
        {pulseCite ? (
          <>
            <p className="mt-3 text-xs font-semibold text-ink-800">How to cite the latest Shishya Pulse</p>
            <p className={CITE}>{pulseCite}</p>
          </>
        ) : null}
        <p className="mt-4 text-xs">
          <Link href={NUMBERS_PATH} className={LINK}>Shishya in numbers</Link> ·{" "}
          <Link href="/pulse" className={LINK}>Shishya Pulse</Link> ·{" "}
          <Link href="/editorial-policy" className={LINK}>Editorial policy</Link> ·{" "}
          <Link href="/about" className={LINK}>About Shishya</Link>
        </p>
      </section>
    </main>
  );
}
