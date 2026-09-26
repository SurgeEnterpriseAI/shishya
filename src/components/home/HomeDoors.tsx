// The doors (26 Sep 2026): five equal, independent sections — School,
// Entrance exams, Government exams, College & scholarships, Careers — and a
// quiet dashed "being built" cell for graduation / PG / PhD study, which
// does not exist yet and links nowhere. Server component, no JS.
//
// Honesty, per door (verified 26 Sep 2026 against the routes and, for the
// two exam doors, a read-only catalogue probe — scripts/tmp-home-fixer-probe.ts):
//   • School: /schooling, /schooling/cbse, /schooling/cbse/class-N and
//     /schooling/icse-cisce exist (src/app/schooling/**). CBSE chapters link
//     the official NCERT book; ICSE / ISC subjects link the official
//     syllabus; other boards get official links. Shishya's own notes and
//     practice are being written — the door says so and claims nothing more.
//   • Entrance exams (review, 26 Sep 2026): no page lists admission tests
//     alone — /exams/browse takes one ?category= and, unfiltered, leads with
//     the 128 state-level government exams — so this door is its own hub:
//     one-tap chips for the exams present in the loaded catalogue (JEE Main,
//     NEET UG, CUET UG, NDA — src/lib/home-doors.ts ENTRANCE_DOOR_CODES),
//     Olympiads (?category=OLYMPIAD, a FILTER_CATEGORIES value) and the
//     catalogue. It has NO whole-card link: a tap that landed on state PSCs
//     would read as government exams under another name. CLAT is not named
//     anywhere — it has no exam row, so /exams/CLAT is a 404.
//   • Government exams (review, 26 Sep 2026): the whole card opens the
//     catalogue, /exams/browse. Its ?category=GOVT_JOBS is SSC / RRB only —
//     9 of 180 rows — so the card never carries that filter. No count on
//     this door: the catalogue count is government AND entrance exams
//     (117 of 180 were government-job exams on the probe day), so the live
//     count sits on the finder's "Browse all {n} exams" link, which is
//     exactly the page it counts.
//   • College: /colleges, /scholarships, /distance-learning exist. No
//     graduation-course study is claimed.
//   • Careers: /careers, /jobs-map, /jobs/internships exist; the count is
//     CAREERS.length (src/data/careers.ts), never typed, and the card opens
//     the page that lists all of them.

import Link from "next/link";
import type { ReactNode } from "react";
import type { ExamCard } from "@/components/ExamPicker";
import type { HomeDoorsCopy } from "@/lib/home-doors-copy";
import { fillHome } from "@/lib/home-strip-copy";
import { cbseClassHref, type HomeDoorId } from "@/lib/home-doors";

const CHIP =
  "inline-flex min-h-[32px] items-center rounded-full border border-saffron-200 bg-saffron-50 px-3 text-[13px] font-semibold text-saffron-800 transition-colors hover:border-saffron-300 hover:bg-saffron-100";
const GO = "inline-flex min-h-[32px] items-center pl-1 text-[13px] font-semibold text-ink-500 transition-colors hover:text-ink-800";

const CARD = "relative flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-[18px] shadow-sm sm:p-[22px]";
// The lift on hover only where the whole card is a tap.
const CARD_LINKED = " transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-md";

function Chip({ href, cta, children, go = false }: { href: string; cta: string; children: ReactNode; go?: boolean }) {
  return (
    <Link href={href} prefetch={false} data-home-cta={cta} className={go ? GO : CHIP}>
      {children}
    </Link>
  );
}

/** One exam as a chip: the catalogue's own shortName, the exam page. `door`
 *  is the beacon prefix (entrance-JEE_MAIN, govt-SSC_CGL). */
function ExamChip({ exam, door }: { exam: ExamCard; door: string }) {
  return (
    <Chip href={`/exams/${exam.code}`} cta={`${door}-${exam.code}`}>
      {exam.shortName}
    </Chip>
  );
}

function Door({
  id,
  icon,
  title,
  badge,
  body,
  href,
  children,
}: {
  id: HomeDoorId;
  icon: string;
  title: string;
  badge?: string;
  body: string;
  /** The section's hub page. Omitted when no such page exists (Entrance
   *  exams): the door's chips are then the taps. */
  href?: string;
  children?: ReactNode;
}) {
  const head = (
    <>
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-saffron-50 text-2xl">
          {icon}
        </span>
        <h2 className="text-lg font-semibold tracking-tight text-ink-900">
          {title}
          {badge && (
            <span className="ml-2 inline-block rounded-full border border-saffron-200 bg-saffron-50 px-2 py-px align-[2px] text-[11px] font-semibold tabular-nums text-saffron-700">
              {badge}
            </span>
          )}
        </h2>
      </div>
      <p className="mt-2.5 text-sm leading-relaxed text-ink-600">{body}</p>
    </>
  );
  return (
    <li id={id} className="scroll-mt-4">
      <article className={`${CARD}${href ? CARD_LINKED : ""}`}>
        {href ? (
          /* The title link covers the whole card (one tap anywhere opens the
             section); the chips below sit above it. */
          <Link
            href={href}
            data-home-cta={`door-${id}`}
            className="block after:absolute after:inset-0 after:rounded-2xl focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-saffron-300"
          >
            {head}
          </Link>
        ) : (
          <div>{head}</div>
        )}
        {children && <div className="relative z-[1] mt-3.5">{children}</div>}
      </article>
    </li>
  );
}

export function HomeDoors({
  copy,
  careersCount,
  cbseClasses,
  entranceChips,
  governmentChips,
}: {
  copy: HomeDoorsCopy;
  /** CAREERS.length. */
  careersCount: number;
  /** CBSE classes offered as one-tap tiles, 1..12. */
  cbseClasses: number[];
  /** The Entrance door's exams, from the loaded catalogue (doorExamChips). */
  entranceChips: ExamCard[];
  /** The Government door's exams, from the loaded catalogue (doorExamChips). */
  governmentChips: ExamCard[];
}) {
  const D = copy.doors;
  return (
    <section className="mt-9 sm:mt-11" aria-label={copy.kicker.label}>
      {/* The independence line sits under the hero pills (HomeHero); here
          only the grid's name, so the two never read twice on a phone. */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-500">{copy.kicker.label}</p>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <Door id="school" icon="🏫" title={D.school.title} body={D.school.body} href="/schooling">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{D.school.cbse}</p>
          <ul className="mt-1.5 grid grid-cols-6 gap-1.5">
            {cbseClasses.map((n) => (
              <li key={n}>
                <Link
                  href={cbseClassHref(n)}
                  prefetch={false}
                  aria-label={fillHome(D.school.classTile, { n })}
                  data-home-cta={`school-class-${n}`}
                  className="flex h-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-sm font-semibold tabular-nums text-ink-800 transition-colors hover:border-saffron-400 hover:bg-saffron-50"
                >
                  {n}
                </Link>
              </li>
            ))}
          </ul>
          {/* Code-honest: no notes or practice is claimed until it ships. */}
          <p className="mt-2 text-xs text-ink-500">{D.school.being}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip href="/schooling/icse-cisce" cta="school-icse">{D.school.icse}</Chip>
            <Chip href="/schooling" cta="school-all" go>{D.school.all}</Chip>
          </div>
        </Door>

        {/* No hub page for admission tests exists (see the header), so this
            door has no whole-card link: its chips are the section. */}
        <Door id="entrance" icon="🎯" title={D.entrance.title} body={D.entrance.body}>
          <div className="flex flex-wrap gap-2">
            {entranceChips.map((e) => (
              <ExamChip key={e.code} exam={e} door="entrance" />
            ))}
            <Chip href="/exams/browse?category=OLYMPIAD" cta="entrance-olympiads">{D.entrance.olympiads}</Chip>
            <Chip href="/exams/browse" cta="entrance-browse" go>{D.entrance.browse}</Chip>
          </div>
        </Door>

        <Door id="government" icon="🏛️" title={D.government.title} body={D.government.body} href="/exams/browse">
          <div className="flex flex-wrap gap-2">
            {governmentChips.map((e) => (
              <ExamChip key={e.code} exam={e} door="govt" />
            ))}
            <Chip href="/exams/browse?category=BANKING" cta="govt-banking">{D.government.banking}</Chip>
            <Chip href="/exams/state" cta="govt-state">{D.government.state}</Chip>
            <Chip href="/exams/browse" cta="govt-all" go>{D.government.all}</Chip>
          </div>
        </Door>

        <Door id="college" icon="🎓" title={D.college.title} body={D.college.body} href="/colleges">
          <div className="flex flex-wrap gap-2">
            <Chip href="/colleges" cta="college-colleges">{D.college.colleges}</Chip>
            <Chip href="/scholarships" cta="college-scholarships">{D.college.scholarships}</Chip>
            <Chip href="/distance-learning" cta="college-distance">{D.college.distance}</Chip>
          </div>
        </Door>

        <Door
          id="careers"
          icon="🧭"
          title={D.careers.title}
          badge={fillHome(D.careers.count, { n: careersCount })}
          body={D.careers.body}
          href="/careers"
        >
          <div className="flex flex-wrap gap-2">
            <Chip href="/careers" cta="careers-paths">{D.careers.paths}</Chip>
            <Chip href="/jobs-map" cta="careers-map">{D.careers.map}</Chip>
            <Chip href="/jobs/internships" cta="careers-internships">{D.careers.internships}</Chip>
          </div>
        </Door>

        {/* Graduation-course, PG and PhD study do not exist yet: a dashed,
            unlinked cell that says so, never a door. */}
        <li aria-label={D.soon.tag}>
          <div className="flex h-full flex-col rounded-2xl border border-dashed border-ink-300 p-[18px] sm:p-[22px]">
            <div className="flex items-center gap-3">
              <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-xl text-ink-400">
                🛠️
              </span>
              <h2 className="text-lg font-semibold tracking-tight text-ink-500">
                {D.soon.title}
                <span className="ml-2 inline-block rounded-full bg-ink-100 px-2 py-0.5 align-[2px] text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                  {D.soon.tag}
                </span>
              </h2>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-500">{D.soon.body}</p>
          </div>
        </li>
      </ul>
    </section>
  );
}
