// Retired (26 Sep 2026, AI builder). The old /ask client auto-fired POST
// /api/ask on every page load with ?q= — so a crawler following the WebSite
// SearchAction or an llms.txt deep link (/ask?q=…) started a model call. /ask
// now renders the pages Shishya has on the server (src/app/ask/page.tsx) and
// asks the AI only from AskAnswer: on a click, or for a search a person just
// typed in this tab (the strip's sessionStorage intent token). Nothing imports
// this file; the name is kept as an alias so an old import still compiles.

export { AskAnswer as AskClient } from "./AskAnswer";
