// 3 Oct 2026: the 42 Shishya-written discussion threads are gone from public pages and
// /discussions is noindex. Tell IndexNow (Bing, and ChatGPT search on top of it) to re-read them.
// Run only after the deploy that hides them is live and its checks pass: sending earlier makes
// the engines re-read the old pages. IndexNow reaches Bing, Yandex, Seznam and Naver — not Google.
// Dry run prints the URLs. Send: npx tsx scripts/indexnow-discussions-retired.ts --send
// Self-contained on purpose: it does not import src/lib/indexnow.ts.
export {};
const HOST = "shishya.in";
const KEY = "7e0b8421fc95cdb98187e2b89a6e2437";
const IDS = [
  // the 34 threads of the retired seed/discussions*.ts scripts (7–9 May 2026)
  "cmoyhvg41001fklilx9f83ywu",
  "cmoyhvfx60019kliltuzpkenq",
  "cmoyhvfr30013klilbj76nuoa",
  "cmoyj7sgt003510lt8znri1yk",
  "cmoyhvfku000xklil4mbwzk2y",
  "cmoyj7saj002z10ltgk2c8dqe",
  "cmoyj7s35002r10lt7or6wu6e",
  "cmoyhvfdf000pkliln0e9vavp",
  "cmoyj7rx2002l10ltj97l1ss9",
  "cmoyj7rqz002f10ltea2ku25u",
  "cmoyhvf5s000hklilma2ld38p",
  "cmoyj7rkr002910ltejifituq",
  "cmoyhveyj0009klil9fpzqzsy",
  "cmoyj7rcq002110ltq9xisztr",
  "cmoyj7r6l001v10ltmkal6btj",
  "cmoyj7qzb001n10ltp9wtr1f9",
  "cmoyhven60001klilvfihsoi3",
  "cmoyj7qt6001h10lte25d2560",
  "cmoyj7qmy001b10ltu6ulxjde",
  "cmoyj7qgc001510ltldjju17h",
  "cmoyj7qa3000z10lt5wb8w4o2",
  "cmoyj7q3n000t10ltlsyl8wg5",
  "cmoyj7pw3000l10ltppq9kgrg",
  "cmoyj7ppu000f10ltqa4pyj59",
  "cmoyj7pi3000710ltg6zdx6jq",
  "cmoyj7p79000110ltdhsem2fg",
  "cmoykr5wz003hrxwbllbgve2c",
  "cmoykr5pe0039rxwbn0308u2k",
  "cmoykr5hq0031rxwbaqupknay",
  "cmoykr55l002prxwb9gxeeukt",
  "cmoykr4xv002hrxwbhr7evw5x",
  "cmoykr4q80029rxwbvd2kijph",
  "cmoykr4jw0023rxwbnuai7m3p",
  "cmoykr4b2001xrxwbf1ayufyh",
  // the 8 "starter questions" of the retired refresh-discussions cron (1 Oct 2026)
  "cmuq2pu7o000fj7zrhid6ku4t",
  "cmuq2pu7n0001j7zruq85pely",
  "cmuq2pu7n000dj7zrn1n1ptyi",
  "cmuq2pu7n000bj7zrbfp1d4j1",
  "cmuq2pu7n0009j7zrzhwtri1j",
  "cmuq2pu7n0007j7zrr5hrjefo",
  "cmuq2pu7n0005j7zryyob7bwg",
  "cmuq2pu7n0003j7zr3r2rscxv",
];
const urls = [`https://${HOST}/discussions`, ...IDS.map((id) => `https://${HOST}/discussions/${id}`)];
async function main() {
  if (urls.length !== 43 || new Set(urls).size !== 43) throw new Error(`expected 43 distinct URLs, have ${urls.length}`);
  console.log(urls.join("\n"));
  if (!process.argv.includes("--send")) { console.log(`DRY RUN — ${urls.length} URLs, nothing sent.`); return; }
  const res = await fetch("https://api.indexnow.org/IndexNow", {
    method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls }),
  });
  console.log("IndexNow status", res.status); // 200 or 202 = accepted
}
main().catch((e) => { console.error(e); process.exit(1); });
