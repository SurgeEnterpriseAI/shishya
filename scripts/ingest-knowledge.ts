// Ingest documents into the knowledge spine.
//
// USAGE
//   tsx scripts/ingest-knowledge.ts --file docs/ssc-cgl-2026-notification.md \
//     --title "SSC CGL 2026 Official Notification" --tier OFFICIAL \
//     --publisher SSC --exam SSC_CGL --url https://ssc.gov.in/... --published 2026-04-01
//
//   tsx scripts/ingest-knowledge.ts --dir seed/knowledge/ssc-cgl --tier CURATED --exam SSC_CGL
//
// FLAGS
//   --file <path>          single markdown/text file
//   --dir <path>           ingest every .md/.txt in a directory (title = first
//                          heading or filename)
//   --title <s>            source title (required with --file)
//   --tier <T>             OFFICIAL | STANDARD_TEXT | PYQ | CURATED | COMMUNITY (required)
//   --publisher <s>        e.g. SSC, NTA, NCERT, Shishya
//   --exam <CODE>          scope to an exam (omit for cross-exam, e.g. NCERT)
//   --topic <code>         scope to a topic
//   --url <u>              canonical source URL
//   --published <date>     ISO date the source was published
//
// Re-ingesting identical content is a no-op. Changed content under the same
// title+scope archives the old source so retrieval never mixes versions.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { PrismaClient, SourceReliability } from "@prisma/client";
import { ingestDocument } from "../src/lib/ai/kb/ingest";

interface Args {
  file?: string;
  dir?: string;
  title?: string;
  tier?: string;
  publisher?: string;
  exam?: string;
  topic?: string;
  url?: string;
  published?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 2; i < argv.length; i++) {
    const next = () => argv[++i];
    switch (argv[i]) {
      case "--file": args.file = next(); break;
      case "--dir": args.dir = next(); break;
      case "--title": args.title = next(); break;
      case "--tier": args.tier = next(); break;
      case "--publisher": args.publisher = next(); break;
      case "--exam": args.exam = next(); break;
      case "--topic": args.topic = next(); break;
      case "--url": args.url = next(); break;
      case "--published": args.published = next(); break;
      default: console.warn(`(warn) unknown flag: ${argv[i]}`);
    }
  }
  return args;
}

const VALID_TIERS = ["OFFICIAL", "STANDARD_TEXT", "PYQ", "CURATED", "COMMUNITY"];

function titleFromContent(content: string, fallback: string): string {
  const m = /^#\s+(.+)$/m.exec(content);
  return m ? m[1].trim() : fallback;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.tier || !VALID_TIERS.includes(args.tier)) {
    throw new Error(`--tier is required and must be one of: ${VALID_TIERS.join(", ")}`);
  }
  if (!args.file && !args.dir) throw new Error("pass --file <path> or --dir <path>");
  if (args.file && !args.title) throw new Error("--title is required with --file");

  const tier = args.tier as SourceReliability;
  const prisma = new PrismaClient();

  const targets: Array<{ path: string; title: string }> = [];
  if (args.file) {
    targets.push({ path: args.file, title: args.title! });
  } else {
    for (const f of readdirSync(args.dir!)) {
      const p = join(args.dir!, f);
      if (!statSync(p).isFile()) continue;
      if (![".md", ".txt"].includes(extname(f).toLowerCase())) continue;
      const content = readFileSync(p, "utf8");
      targets.push({ path: p, title: titleFromContent(content, basename(f, extname(f))) });
    }
    if (!targets.length) throw new Error(`no .md/.txt files found in ${args.dir}`);
  }

  try {
    let totalChunks = 0;
    for (const t of targets) {
      const content = readFileSync(t.path, "utf8");
      const result = await ingestDocument(prisma, {
        title: t.title,
        content,
        tier,
        url: args.url,
        publisher: args.publisher,
        examCode: args.exam,
        topicCode: args.topic,
        publishedAt: args.published ? new Date(args.published) : undefined,
      });
      totalChunks += result.chunks;
      if (result.skipped) {
        console.log(`= ${t.title} — unchanged, skipped`);
      } else {
        console.log(
          `✓ ${t.title} — ${result.chunks} chunks` +
            (result.supersededSourceId ? ` (superseded old version)` : ""),
        );
      }
    }
    console.log(`\nDone. ${targets.length} source(s), ${totalChunks} new chunk(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌ ingest failed:", err.message ?? err);
  process.exit(1);
});
