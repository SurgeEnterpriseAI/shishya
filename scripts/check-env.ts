// scripts/check-env.ts
//
// Pre-flight verification — run before `npm run dev` or before a deploy.
// Checks every env var required, pings the database, and validates the
// Anthropic API key (cheapest possible call).
//
// Run with:
//   npm run check-env
//
// Exit 0 = ready. Exit 1 = something's wrong; output tells you what.

import { PrismaClient } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
  hint?: string;
}

const results: CheckResult[] = [];

function pass(name: string, detail: string) {
  results.push({ name, ok: true, detail });
}
function fail(name: string, detail: string, hint?: string) {
  results.push({ name, ok: false, detail, hint });
}

// ─────────────────────────────────────────────────────────────────────────
// Env var checks
// ─────────────────────────────────────────────────────────────────────────
const REQUIRED_VARS = [
  { key: "DATABASE_URL", expectsStartsWith: "postgresql://", hint: "Get one from neon.tech (free tier)." },
  { key: "NEXTAUTH_SECRET", minLength: 32, hint: "Generate with: openssl rand -base64 32" },
  { key: "NEXTAUTH_URL", hint: "e.g. http://localhost:3000 (local) or https://shishya.in (prod)" },
  { key: "GOOGLE_CLIENT_ID", expectsContains: ".apps.googleusercontent.com", hint: "Create at console.cloud.google.com → Credentials → OAuth client ID." },
  { key: "GOOGLE_CLIENT_SECRET", minLength: 8 },
  { key: "ANTHROPIC_API_KEY", expectsStartsWith: "sk-ant-", hint: "Create at console.anthropic.com/settings/keys" },
];

const OPTIONAL_VARS = [
  { key: "ADMIN_EMAILS", hint: "Comma-separated list. Without this, /admin will redirect everyone away." },
  { key: "ANTHROPIC_MODEL", hint: "Default is claude-sonnet-4-5-20250929" },
];

function checkEnvVars() {
  for (const v of REQUIRED_VARS) {
    const val = process.env[v.key];
    if (!val) {
      fail(v.key, "missing", v.hint);
      continue;
    }
    if (v.expectsStartsWith && !val.startsWith(v.expectsStartsWith)) {
      fail(v.key, `does not start with "${v.expectsStartsWith}"`, v.hint);
      continue;
    }
    if (v.expectsContains && !val.includes(v.expectsContains)) {
      fail(v.key, `does not contain "${v.expectsContains}"`, v.hint);
      continue;
    }
    if ((v as any).minLength && val.length < (v as any).minLength) {
      fail(v.key, `too short (need ≥${(v as any).minLength} chars)`, v.hint);
      continue;
    }
    pass(v.key, "set");
  }
  for (const v of OPTIONAL_VARS) {
    if (!process.env[v.key]) {
      results.push({ name: v.key, ok: true, detail: "(unset, optional)", hint: v.hint });
    } else {
      pass(v.key, "set");
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Database check
// ─────────────────────────────────────────────────────────────────────────
async function checkDatabase() {
  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL connection", "skipped — DATABASE_URL not set");
    return;
  }
  const prisma = new PrismaClient();
  try {
    // Cheapest possible round-trip
    const examCount = await prisma.exam.count().catch(async (err: any) => {
      // table might not exist if `db push` wasn't run yet
      if (String(err.message ?? "").includes("does not exist")) {
        // Try a simple raw query to check pure connectivity
        await prisma.$queryRaw`SELECT 1`;
        throw new Error("schema not pushed — run `npm run db:push`");
      }
      throw err;
    });
    pass(
      "Database connection",
      `connected · ${examCount} exam(s) seeded · schema present`
    );
    if (examCount === 0) {
      results.push({
        name: "Database content",
        ok: true,
        detail: "(no exams seeded yet)",
        hint: "Run `npm run seed:all` to seed 10 exams + SSC CGL syllabus + sample Qs.",
      });
    }
  } catch (err: any) {
    fail(
      "Database connection",
      err.message ?? String(err),
      "Check DATABASE_URL is correct and your Neon project is awake (visit the dashboard)."
    );
  } finally {
    await prisma.$disconnect();
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Anthropic key check (cheapest call: 1 token output)
// ─────────────────────────────────────────────────────────────────────────
async function checkAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    fail("Anthropic API", "skipped — ANTHROPIC_API_KEY not set");
    return;
  }
  try {
    const client = new Anthropic({ apiKey: key });
    const response = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5-20250929",
      max_tokens: 1,
      messages: [{ role: "user", content: "ok" }],
    });
    pass("Anthropic API", `key valid · model ${response.model}`);
  } catch (err: any) {
    const msg = err.message ?? String(err);
    fail(
      "Anthropic API",
      msg,
      msg.includes("invalid x-api-key")
        ? "Key is wrong. Check console.anthropic.com/settings/keys."
        : msg.includes("404") || msg.includes("model")
        ? "Model name might be wrong. Default to `claude-sonnet-4-5-20250929`."
        : "Network or rate-limit issue. Try again."
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\nShishya — environment check");
  console.log("───────────────────────────");

  checkEnvVars();
  await checkDatabase();
  await checkAnthropic();

  let any = false;
  for (const r of results) {
    const icon = r.ok ? "✓" : "✗";
    const colour = r.ok ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";
    console.log(`${colour}${icon}${reset} ${r.name.padEnd(28)} ${r.detail}`);
    if (!r.ok) {
      any = true;
      if (r.hint) console.log(`    \x1b[2m↳ ${r.hint}${reset}`);
    } else if (r.detail.includes("(unset") && r.hint) {
      console.log(`    \x1b[2m↳ ${r.hint}\x1b[0m`);
    }
  }

  console.log("");
  if (any) {
    console.log("\x1b[31mEnvironment NOT ready — fix the items above and re-run.\x1b[0m");
    process.exit(1);
  } else {
    console.log("\x1b[32mEnvironment ready. You can run `npm run dev`.\x1b[0m");
  }
}

main().catch((err) => {
  console.error("\nUnexpected check-env failure:", err);
  process.exit(2);
});
