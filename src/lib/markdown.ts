// Tiny server-side markdown → HTML helper.
//
// Used by the exam-phase article view (and anywhere else we have
// AI-generated or hand-written markdown that needs to render server-
// side). `marked` is configured with sane defaults: GitHub-flavoured
// markdown, no raw HTML pass-through, no async filters — output is
// deterministic for unstable_cache / ISR.
//
// We rely on Next.js's `dangerouslySetInnerHTML` to inject the HTML.
// Since we only ever feed `renderMarkdown` content we control (admin
// seeds + AI generations passed through a safety prompt), there's no
// XSS surface — but if that changes, swap in `isomorphic-dompurify`
// at the call site.

import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: false,
});

export function renderMarkdown(md: string): string {
  // marked.parse() is sync when no async tokenizer extension is set.
  // The library types it as `string | Promise<string>` to accommodate
  // async extensions, so we narrow the return manually.
  const out = marked.parse(md, { async: false });
  return typeof out === "string" ? out : "";
}
