// Seed initial Fact rows from the curated reference datasets.
//
// Uses raw SQL via $executeRaw instead of the typed Prisma client —
// `prisma generate` is currently blocked locally by a Windows file
// lock on query_engine-windows.dll.node, so the typed `prisma.fact.*`
// methods aren't yet available locally. Production (Vercel) regenerates
// the client cleanly on every deploy and will pick up the typed API
// for runtime queries.
//
// Idempotent — uses deterministic Fact.id (derived from pageId +
// claimKey) so re-runs UPDATE instead of INSERT.

import { prisma } from "../src/lib/db/prisma";
import { COLLEGES, formatNirfRanks, NIRF_SOURCE_URL, NIRF_SOURCE_YEAR } from "../src/lib/colleges-data";
import { BOARDS } from "../src/lib/schooling-data";
import { SCHOLARSHIPS } from "../src/data/scholarships";
import { stateInfo } from "../src/lib/state-info";

type Section = "EXAM" | "COLLEGE" | "SCHOLARSHIP" | "BOARD" | "UNIVERSITY" | "VISA" | "CAREER" | "GENERAL";

function factIdFor(pageId: string, claimKey: string): string {
  const safe = `${pageId}::${claimKey}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `fkt-${safe}`;
}

async function upsertFact(args: {
  pageId: string;
  section: Section;
  claimKey: string;
  claimText: string;
  claimValue: string;
  sourceUrl: string;
  sourceName: string;
}) {
  const id = factIdFor(args.pageId, args.claimKey);
  // Raw SQL UPSERT via ON CONFLICT (id). The Prisma migration created
  // the table with snake-case → camelCase mapping; column names are
  // exactly as declared in schema.prisma.
  await prisma.$executeRaw`
    INSERT INTO "Fact" (
      "id", "pageId", "section", "claimText", "claimValue",
      "sourceUrl", "sourceName", "originalIngestionDate",
      "lastAiCheckDate", "lastAiCheckResult", "aiCheckCount",
      "status", "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${args.pageId}, ${args.section}::"FactSection",
      ${args.claimText}, ${args.claimValue},
      ${args.sourceUrl}, ${args.sourceName}, NOW(),
      NOW(), 'VERIFIED'::"AICheckResult", 1,
      'AI'::"FactStatus", NOW(), NOW()
    )
    ON CONFLICT ("id") DO UPDATE SET
      "claimText"  = EXCLUDED."claimText",
      "claimValue" = EXCLUDED."claimValue",
      "sourceUrl"  = EXCLUDED."sourceUrl",
      "sourceName" = EXCLUDED."sourceName",
      "updatedAt"  = NOW()
  `;
}

async function seedColleges() {
  let created = 0;
  for (const c of COLLEGES) {
    const pageId = `/colleges/${c.slug}`;
    const st = stateInfo(c.state);

    if (formatNirfRanks(c.nirf)) {
      await upsertFact({
        pageId,
        section: "COLLEGE",
        claimKey: "nirf_rank",
        claimText: `NIRF ${NIRF_SOURCE_YEAR} ranking`,
        claimValue: formatNirfRanks(c.nirf),
        sourceUrl: NIRF_SOURCE_URL,
        sourceName: `NIRF ${NIRF_SOURCE_YEAR}`,
      });
      created++;
    }
    await upsertFact({
      pageId,
      section: "COLLEGE",
      claimKey: "established_year",
      claimText: "Year of establishment",
      claimValue: String(c.established),
      sourceUrl: c.website,
      sourceName: `${c.shortName} official site`,
    });
    created++;
    await upsertFact({
      pageId,
      section: "COLLEGE",
      claimKey: "location",
      claimText: "Location",
      claimValue: `${c.city}, ${st?.name ?? c.state}`,
      sourceUrl: c.website,
      sourceName: `${c.shortName} official site`,
    });
    created++;
    await upsertFact({
      pageId,
      section: "COLLEGE",
      claimKey: "institution_type",
      claimText: "Institution type",
      claimValue: c.type,
      sourceUrl: c.website,
      sourceName: `${c.shortName} official site`,
    });
    created++;
    await upsertFact({
      pageId,
      section: "COLLEGE",
      claimKey: "official_website",
      claimText: "Official website URL",
      claimValue: c.website,
      sourceUrl: c.website,
      sourceName: `${c.shortName} official site`,
    });
    created++;
  }
  console.log(`seeded ${created} college facts across ${COLLEGES.length} colleges`);
}

async function seedBoards() {
  let created = 0;
  for (const b of BOARDS) {
    const pageId = `/schooling/${b.slug}`;
    await upsertFact({
      pageId,
      section: "BOARD",
      claimKey: "official_website",
      claimText: "Official board website",
      claimValue: b.websiteUrl,
      sourceUrl: b.websiteUrl,
      sourceName: b.shortName,
    });
    created++;
    if (b.syllabusUrl) {
      await upsertFact({
        pageId,
        section: "BOARD",
        claimKey: "syllabus_url",
        claimText: "Syllabus / curriculum page",
        claimValue: b.syllabusUrl,
        sourceUrl: b.syllabusUrl,
        sourceName: b.shortName,
      });
      created++;
    }
    if (b.samplePaperUrl) {
      await upsertFact({
        pageId,
        section: "BOARD",
        claimKey: "sample_paper_url",
        claimText: "Sample papers page",
        claimValue: b.samplePaperUrl,
        sourceUrl: b.samplePaperUrl,
        sourceName: b.shortName,
      });
      created++;
    }
    await upsertFact({
      pageId,
      section: "BOARD",
      claimKey: "classes_covered",
      claimText: "Classes covered",
      claimValue: `Class ${b.classes[0]} to Class ${b.classes[b.classes.length - 1]}`,
      sourceUrl: b.websiteUrl,
      sourceName: b.shortName,
    });
    created++;
  }
  console.log(`seeded ${created} board facts across ${BOARDS.length} boards`);
}

async function seedScholarships() {
  let created = 0;
  for (const s of SCHOLARSHIPS as any[]) {
    // Existing src/data/scholarships.ts uses `id` (not slug) and
    // `applyUrl` (not officialUrl). Match both shapes for forward-
    // compat with the newer scholarships-data.ts I drafted earlier.
    const slug = s.slug ?? s.id;
    if (!slug) continue;
    const pageId = `/scholarships#${slug}`;

    const officialUrl = s.officialUrl ?? s.applyUrl ?? s.applicationUrl ?? "";
    const issuer = s.issuer ?? s.source ?? s.awardingBody ?? "Issuer official site";
    if (officialUrl) {
      await upsertFact({
        pageId,
        section: "SCHOLARSHIP",
        claimKey: "official_url",
        claimText: "Official application URL",
        claimValue: officialUrl,
        sourceUrl: officialUrl,
        sourceName: issuer,
      });
      created++;
    }
    if (s.amount) {
      await upsertFact({
        pageId,
        section: "SCHOLARSHIP",
        claimKey: "amount",
        claimText: "Scholarship amount",
        claimValue: String(s.amount),
        sourceUrl: officialUrl,
        sourceName: issuer,
      });
      created++;
    }
    if (s.applicationWindow ?? s.deadline) {
      await upsertFact({
        pageId,
        section: "SCHOLARSHIP",
        claimKey: "application_window",
        claimText: "Application window",
        claimValue: String(s.applicationWindow ?? s.deadline ?? ""),
        sourceUrl: officialUrl,
        sourceName: issuer,
      });
      created++;
    }
    if (s.eligibility) {
      await upsertFact({
        pageId,
        section: "SCHOLARSHIP",
        claimKey: "eligibility",
        claimText: "Eligibility criteria",
        claimValue: typeof s.eligibility === "string"
          ? s.eligibility
          : JSON.stringify(s.eligibility).slice(0, 400),
        sourceUrl: officialUrl,
        sourceName: issuer,
      });
      created++;
    }
  }
  console.log(`seeded ${created} scholarship facts across ${SCHOLARSHIPS.length} scholarships`);
}

async function main() {
  const t0 = Date.now();
  await seedColleges();
  await seedBoards();
  await seedScholarships();
  const finalCount = await prisma.$queryRaw<Array<{n: bigint}>>`SELECT COUNT(*)::bigint AS n FROM "Fact"`;
  const sec = Math.round((Date.now() - t0) / 1000);
  console.log(`\ndone in ${sec}s — total facts in DB: ${finalCount[0]?.n}`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
