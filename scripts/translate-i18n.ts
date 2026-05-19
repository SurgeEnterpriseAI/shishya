// scripts/translate-i18n.ts
// Walks the EN dict in src/lib/i18n.ts and translates every key into the
// 17 remaining locales (hi, as, bn, gu, kn, kok, ks, ml, mni, mr, ne, or,
// pa, sa, sd, ta, te, ur). Skips keys that already have a non-empty
// translation in a given locale so we don't overwrite curated copy.
//
// Output: prints a single TypeScript fragment per locale to stdout. Pipe
// to a file or paste back into src/lib/i18n.ts.
//
// Run:
//   npx tsx scripts/translate-i18n.ts                       # all locales
//   npx tsx scripts/translate-i18n.ts te ta bn              # subset
//   npx tsx scripts/translate-i18n.ts --overwrite ta bn     # retranslate
//     existing keys too (use when locale's existing copy is stale)
//   npx tsx scripts/translate-i18n.ts --overwrite --keep=hi # all locales
//     fresh except Hindi (which has curated copy we want to preserve)
//
// Cost: ~5k input + ~3k output per locale per batch of ~80 keys. About
// 4-5 batches per locale. ~25c per locale on Sonnet 4.5. All 17 locales
// is ~$4-5.

import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const I18N_PATH = path.resolve(__dirname, "../src/lib/i18n.ts");
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929";
const BATCH = 80;
const TARGET_LOCALES_DEFAULT = [
  "hi", "as", "bn", "gu", "kn", "kok", "ks",
  "ml", "mni", "mr", "ne", "or", "pa", "sa", "sd", "ta", "te", "ur",
] as const;

const NAMES: Record<string, string> = {
  hi: "Hindi", as: "Assamese", bn: "Bengali", gu: "Gujarati",
  kn: "Kannada", kok: "Konkani", ks: "Kashmiri", ml: "Malayalam",
  mni: "Manipuri (Meitei script if natural, otherwise Bengali script)",
  mr: "Marathi", ne: "Nepali", or: "Odia", pa: "Punjabi (Gurmukhi)",
  sa: "Sanskrit", sd: "Sindhi (Perso-Arabic script)",
  ta: "Tamil", te: "Telugu", ur: "Urdu",
};

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY not set");
  process.exit(1);
}
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Parse i18n.ts into per-locale dicts ─────────────────────────────────
async function loadDicts(): Promise<Record<string, Record<string, string>>> {
  const src = await fs.readFile(I18N_PATH, "utf8");
  // Naive locale-block extraction. Each block looks like:
  //   <locale>: {
  //     "key": "value",
  //     ...
  //   },
  // We rely on the source's stable formatting (one key per line, double
  // quotes, no trailing semicolons inside blocks).
  const dicts: Record<string, Record<string, string>> = {};
  const blockRe = /\n {2}([a-z]+):\s*\{\n([\s\S]*?)\n {2}\},?\n/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(src))) {
    const [, locale, body] = m;
    const lineRe = /"([^"]+)":\s*"((?:[^"\\]|\\.)*)"/g;
    const dict: Record<string, string> = {};
    let lm: RegExpExecArray | null;
    while ((lm = lineRe.exec(body))) {
      dict[lm[1]] = lm[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    if (Object.keys(dict).length) dicts[locale] = dict;
  }
  return dicts;
}

function chunks<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// ── Translate one batch of (key -> EN) entries into target locale ───────
async function translateBatch(
  targetLocale: string,
  batch: Array<[string, string]>,
): Promise<Record<string, string>> {
  const targetName = NAMES[targetLocale] ?? targetLocale;
  const payload = Object.fromEntries(batch);
  const system =
    `You translate UI strings for Shishya — a free, community-driven Indian education platform covering schooling, entrance exams, colleges, scholarships, jobs and study abroad.\n\n` +
    `Rules:\n` +
    `- Translate the VALUES into ${targetName}. Keep KEYS exactly as given.\n` +
    `- Preserve placeholders and substitutions exactly (e.g. "{count}", "%s", "→", numbers, exam names like "SSC CGL", "NEET UG", "JEE Main").\n` +
    `- Brand name "Shishya" stays in Latin script (not transliterated).\n` +
    `- Anglicisms common in Indian exam-prep ("mock test", "syllabus", "MBA", "SSC", "UPSC") may stay if natural — prefer them over awkward purist translations.\n` +
    `- Match the original tone: concise, warm, action-oriented.\n` +
    `- DO NOT add quotes, commentary, or any text outside the JSON.\n\n` +
    `Output: a single JSON object mapping each key to its ${targetName} translation. No prose.`;

  const user = `Translate this UI string dictionary into ${targetName}.\n\nJSON:\n${JSON.stringify(payload, null, 2)}`;

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = res.content.find((b) => b.type === "text")?.text ?? "";
  // Extract the first {...} block in the response defensively.
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON in response for ${targetLocale}`);
  return JSON.parse(jsonMatch[0]);
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const overwrite = args.includes("--overwrite");
  const keepArg = args.find((a) => a.startsWith("--keep="));
  const keepLocales = new Set(keepArg ? keepArg.slice("--keep=".length).split(",") : []);
  const requested = args.filter((s) => !s.startsWith("-"));
  const targets = (requested.length ? requested : [...TARGET_LOCALES_DEFAULT]).filter(
    (lc) => lc !== "en" && NAMES[lc],
  );
  if (targets.length === 0) {
    console.error("No valid target locales given. Got:", requested);
    process.exit(1);
  }

  const dicts = await loadDicts();
  const en = dicts.en;
  if (!en) throw new Error("EN dict not found in i18n.ts");
  const enKeys = Object.keys(en);
  console.error(`EN has ${enKeys.length} keys. overwrite=${overwrite} keep=[${[...keepLocales].join(",")}]`);

  for (const lc of targets) {
    const existing = dicts[lc] ?? {};
    // If --overwrite is set AND this locale isn't in --keep list, translate
    // every EN key fresh; otherwise only fill in missing keys.
    const shouldOverwrite = overwrite && !keepLocales.has(lc);
    const missing = shouldOverwrite
      ? enKeys
      : enKeys.filter((k) => !existing[k] || existing[k].trim() === "");
    if (missing.length === 0) {
      console.error(`[${lc}] already complete — skipping`);
      continue;
    }
    console.error(
      `[${lc}] ${NAMES[lc]} — translating ${missing.length}/${enKeys.length} missing keys` +
        ` (preserving ${Object.keys(existing).length} curated)`,
    );

    const translated: Record<string, string> = {};
    const batches = chunks(missing.map((k) => [k, en[k]] as [string, string]), BATCH);
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const out = await translateBatch(lc, batch);
        let kept = 0;
        for (const [k, v] of Object.entries(out)) {
          if (typeof v === "string" && v.trim()) {
            translated[k] = v;
            kept += 1;
          }
        }
        console.error(`  batch ${i + 1}/${batches.length}: ${kept}/${batch.length} OK`);
      } catch (err) {
        console.error(`  batch ${i + 1}/${batches.length} FAILED:`, (err as Error).message);
      }
    }

    // Merge curated + translated and emit a TypeScript fragment.
    // When --overwrite is on for this locale, fresh AI translations win
    // (used for locales whose existing copy is stale stub). Otherwise
    // existing curated copy wins (Hindi).
    const merged = shouldOverwrite
      ? { ...existing, ...translated } // fresh wins
      : { ...translated, ...existing }; // curated wins
    const fragment = renderBlock(lc, merged, enKeys);
    const outPath = path.resolve(__dirname, `../tmp-i18n-${lc}.txt`);
    await fs.writeFile(outPath, fragment, "utf8");
    console.error(`[${lc}] wrote ${outPath}  (${Object.keys(merged).length} keys)`);
  }

  console.error("\nDone. To apply: copy each tmp-i18n-<lc>.txt body into the matching block of src/lib/i18n.ts.");
}

function escStr(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function renderBlock(locale: string, dict: Record<string, string>, ordering: string[]): string {
  const lines: string[] = [];
  lines.push(`  ${locale}: {`);
  for (const k of ordering) {
    const v = dict[k];
    if (typeof v !== "string") continue;
    lines.push(`    "${k}": "${escStr(v)}",`);
  }
  lines.push(`  },`);
  return lines.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
