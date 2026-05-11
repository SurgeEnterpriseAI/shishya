// scripts/splice-i18n.ts
// Companion to translate-i18n.ts. Reads every tmp-i18n-<locale>.txt
// fragment from the project root and replaces the matching locale block
// in src/lib/i18n.ts in place.
//
// Run:
//   npx tsx scripts/splice-i18n.ts                # all tmp fragments
//   npx tsx scripts/splice-i18n.ts ta te bn       # subset
//
// Safety:
//   - Backs up src/lib/i18n.ts to src/lib/i18n.ts.bak before writing
//   - Refuses to splice if the existing block can't be located exactly

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const I18N_PATH = path.join(ROOT, "src/lib/i18n.ts");

async function main() {
  const requested = process.argv.slice(2);
  let src = await fs.readFile(I18N_PATH, "utf8");
  await fs.writeFile(I18N_PATH + ".bak", src, "utf8");
  console.error(`Backed up i18n.ts -> i18n.ts.bak`);

  const files = (await fs.readdir(ROOT))
    .filter((f) => /^tmp-i18n-[a-z]+\.txt$/.test(f))
    .filter((f) => {
      if (requested.length === 0) return true;
      const lc = f.replace(/^tmp-i18n-/, "").replace(/\.txt$/, "");
      return requested.includes(lc);
    });

  if (files.length === 0) {
    console.error("No tmp-i18n-*.txt fragments found. Run scripts/translate-i18n.ts first.");
    process.exit(1);
  }

  let spliced = 0;
  for (const f of files) {
    const lc = f.replace(/^tmp-i18n-/, "").replace(/\.txt$/, "");
    const fragment = (await fs.readFile(path.join(ROOT, f), "utf8")).trimEnd();
    // Match the existing locale block exactly:
    //   "\n  <lc>: {\n...\n  },\n" (with optional comma)
    const blockRe = new RegExp(`\\n {2}${lc}:\\s*\\{[\\s\\S]*?\\n {2}\\},?\\n`);
    const match = blockRe.exec(src);
    if (!match) {
      console.error(`[${lc}] could not locate existing block — skipped`);
      continue;
    }
    // The rendered fragment ends with `  },` already (renderBlock writes
    // the trailing comma). We only need to terminate the line with a
    // newline before the next locale block — DO NOT add another comma
    // here or we end up with `},,` which is a TS parse error.
    src = src.slice(0, match.index) + "\n" + fragment + "\n" + src.slice(match.index + match[0].length);
    spliced += 1;
    console.error(`[${lc}] spliced`);
  }

  await fs.writeFile(I18N_PATH, src, "utf8");
  console.error(`\nWrote ${spliced} blocks into i18n.ts. Backup at i18n.ts.bak.`);
  console.error(`Verify with: npx tsc --noEmit`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
