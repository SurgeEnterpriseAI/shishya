// Source families (27 Sep 2026): the TypeScript classifier and its SQL twin
// must agree on every case. The SQL is interpreted here by a tiny CASE
// evaluator (the generated text is regular: WHEN (<col> <> '' AND <col> ~*
// '<pattern>' [AND NOT (<col> ~* '<unless>')]) THEN '<family>'), so a rule
// added to one form and not the other fails this test. No DB, no network.

import { describe, expect, it } from "vitest";
import {
  MEDIUM_RULES,
  REF_RULES,
  SOURCE_FAMILIES,
  SOURCE_FAMILY_LABEL,
  UTM_RULES,
  isNamedSource,
  sourceFamily,
  sourceFamilySqlText,
  type SourceFamily,
} from "@/lib/source-family";

type Row = { u: string | null; m: string | null; r: string | null };

/** Evaluate sourceFamilySqlText(u, m, r) for one row, the way Postgres would. */
function evalSql(sql: string, row: Row): string {
  const cols: Record<string, string> = { 'COALESCE(u, \'\')': row.u ?? "", 'COALESCE(m, \'\')': row.m ?? "", 'COALESCE(r, \'\')': row.r ?? "" };
  const body = sql.replace(/^\(CASE /, "").replace(/ END\)$/, "");
  const elseM = / ELSE '([a-z]+)'$/.exec(body);
  if (!elseM) throw new Error("no ELSE");
  for (const part of body.replace(/ ELSE '[a-z]+'$/, "").split(/ (?=WHEN )/)) {
    const whenM = /^WHEN \((COALESCE\([umr], ''\)) <> '' AND \1 ~\* '([^']*)'(?: AND NOT \(\1 ~\* '([^']*)'\))?\) THEN '([a-z]+)'$/.exec(part);
    if (whenM) {
      const v = cols[whenM[1]];
      if (v !== "" && new RegExp(whenM[2], "i").test(v) && !(whenM[3] && new RegExp(whenM[3], "i").test(v))) return whenM[4];
      continue;
    }
    const otherM = /^WHEN COALESCE\(u, ''\) <> '' OR COALESCE\(r, ''\) <> '' THEN '([a-z]+)'$/.exec(part);
    if (otherM) {
      if (cols["COALESCE(u, '')"] !== "" || cols["COALESCE(r, '')"] !== "") return otherM[1];
      continue;
    }
    throw new Error(`unparsed CASE part: ${part}`);
  }
  return elseM[1];
}

const CASES: [Row, SourceFamily][] = [
  [{ u: "chatgpt.com", m: null, r: null }, "ai"],
  [{ u: null, m: null, r: "chatgpt.com" }, "ai"],
  [{ u: null, m: null, r: "www.perplexity.ai" }, "ai"],
  [{ u: null, m: null, r: "gemini.google.com" }, "ai"],
  [{ u: null, m: null, r: "copilot.microsoft.com" }, "ai"],
  [{ u: null, m: null, r: "edgeservices.bing.com" }, "ai"],
  [{ u: null, m: null, r: "claude.ai" }, "ai"],
  [{ u: "grok", m: null, r: null }, "ai"],
  // A tag wins over a referrer.
  [{ u: "chatgpt.com", m: null, r: "www.google.com" }, "ai"],
  [{ u: "whatsapp", m: null, r: "chatgpt.com" }, "social"],
  [{ u: null, m: null, r: "www.google.com" }, "search"],
  [{ u: null, m: null, r: "www.google.co.in" }, "search"],
  [{ u: null, m: null, r: "com.google.android.googlequicksearchbox" }, "search"],
  [{ u: null, m: null, r: "www.bing.com" }, "search"],
  [{ u: "bing", m: null, r: null }, "search"],
  [{ u: null, m: null, r: "duckduckgo.com" }, "search"],
  [{ u: null, m: null, r: "search.brave.com" }, "search"],
  [{ u: null, m: null, r: "com.google.android.gm" }, "email"],
  [{ u: null, m: null, r: "mail.google.com" }, "email"],
  [{ u: "email", m: null, r: null }, "email"],
  [{ u: "copy", m: null, r: null }, "social"],
  [{ u: "native", m: null, r: null }, "social"],
  [{ u: "anything", m: "share", r: null }, "social"],
  [{ u: null, m: null, r: "l.facebook.com" }, "social"],
  [{ u: null, m: null, r: "t.co" }, "social"],
  [{ u: null, m: null, r: "x.com" }, "social"],
  [{ u: null, m: null, r: "www.youtube.com" }, "social"],
  [{ u: null, m: null, r: "web.whatsapp.com" }, "social"],
  // Our own hosts, the installed app and Google sign-in are direct.
  [{ u: null, m: null, r: "shishya.in" }, "direct"],
  [{ u: null, m: null, r: "accounts.google.com" }, "direct"],
  [{ u: "pwa", m: null, r: null }, "direct"],
  // 27 Sep 2026 (fixer review): the "direct" sentinel User.signupReferrerHost
  // carries for a visit with no referrer and no tag (src/middleware.ts,
  // src/lib/signup-attribution.ts). The sign-up fallback passes that column
  // as both the tag and the referrer; it was counted as "Other websites".
  [{ u: "direct", m: null, r: "direct" }, "direct"],
  [{ u: null, m: null, r: "direct" }, "direct"],
  [{ u: "DIRECT", m: null, r: null }, "direct"],
  // Only the whole value: a real host that contains the word is not direct.
  [{ u: null, m: null, r: "directory.example" }, "other"],
  [{ u: null, m: null, r: null }, "direct"],
  [{ u: "", m: "", r: "" }, "direct"],
  // Named but unknown → other; an unknown tag falls through to the referrer.
  [{ u: null, m: null, r: "someblog.example" }, "other"],
  [{ u: null, m: null, r: "netflix.com" }, "other"],
  [{ u: "partner-newsletter-x", m: null, r: null }, "other"],
  [{ u: "some-campaign", m: null, r: "www.google.com" }, "search"],
];

describe("sourceFamily", () => {
  it.each(CASES)("%o → %s", (row, fam) => {
    expect(sourceFamily(row.u, row.m, row.r)).toBe(fam);
  });

  it("the SQL CASE classifies every case exactly as TypeScript does", () => {
    const sql = sourceFamilySqlText("u", "m", "r");
    for (const [row, fam] of CASES) expect([row, evalSql(sql, row)]).toEqual([row, fam]);
  });

  it("builds from the same rule lists, in order, with no quotes in any pattern", () => {
    const sql = sourceFamilySqlText("u", "m", "r");
    const rules = [...MEDIUM_RULES, ...UTM_RULES, ...REF_RULES];
    let at = 0;
    for (const rule of rules) {
      // No quotes (inlined into SQL) and no backslashes (a lost escape turns
      // "\." into "." — 27 Sep 2026: "netflix.com" matched x.com that way).
      expect(rule.pattern).not.toMatch(/['\\]/);
      if (rule.unless) expect(rule.unless).not.toMatch(/['\\]/);
      expect(() => new RegExp(rule.pattern, "i")).not.toThrow();
      const i = sql.indexOf(`~* '${rule.pattern}'`, at);
      expect(i).toBeGreaterThan(-1);
      at = i;
    }
  });

  it("refuses a column expression that is not an identifier", () => {
    expect(() => sourceFamilySqlText(`x); DROP TABLE "User"; --`, "m", "r")).toThrow();
    expect(sourceFamilySqlText(`fa."utmSource"`, "NULL", `us."signupReferrerHost"`)).toContain(`COALESCE(fa."utmSource", '')`);
  });

  it("the stored 'direct' sentinel is never a named source (27 Sep 2026)", () => {
    expect(isNamedSource(sourceFamily("direct", null, "direct"))).toBe(false);
  });

  it("labels every family and treats only Direct or unknown as unnamed", () => {
    for (const f of SOURCE_FAMILIES) expect(SOURCE_FAMILY_LABEL[f].length).toBeGreaterThan(0);
    expect(SOURCE_FAMILIES.filter((f) => !isNamedSource(f))).toEqual(["direct"]);
  });
});
