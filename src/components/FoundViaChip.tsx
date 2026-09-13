// Server wrapper for the "How did you find Shishya?" chip (13 Sep 2026).
//
// One primary-key read per dashboard render: the strip is offered only to
// users ≤7 days old who have never answered or dismissed it (their
// CTA_CLICKED {cta:'found-via'} event is the record). The CASE
// short-circuits, so a user older than 7 days costs the PK lookup and no
// EXISTS probe. The client half (FoundViaChipClient) adds the per-device
// localStorage check and does the tap.

// Labels (13 Sep 2026): resolved with getT() only AFTER the show check, so
// the ~all dashboard renders that never show the strip pay nothing extra.
// Brand options (ChatGPT, Google, Bing, Telegram, YouTube) stay as the
// client's defaults in every language; only the words are translated.

import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { FoundViaChipClient } from "./FoundViaChipClient";

export async function FoundViaChip({ userId }: { userId: string }) {
  const rows = await prisma.$queryRaw<{ show: boolean }[]>`
    SELECT CASE
      WHEN u."createdAt" >= NOW() - INTERVAL '7 days' THEN NOT EXISTS (
        SELECT 1 FROM "AnalyticsEvent" e
        WHERE e."userId" = u.id
          AND e.kind = 'CTA_CLICKED'::"EventKind"
          AND e.props->>'cta' = 'found-via')
      ELSE FALSE
    END AS show
    FROM "User" u WHERE u.id = ${userId}`.catch(() => [] as { show: boolean }[]);
  if (!rows[0]?.show) return null;
  const { t } = await getT();
  return (
    <FoundViaChipClient
      labels={{
        title: t("foundVia.title"),
        sub: t("foundVia.sub"),
        thanks: t("foundVia.thanks"),
        skip: t("foundVia.skip"),
        whatsapp: t("foundVia.whatsapp"),
        other: t("foundVia.other"),
      }}
    />
  );
}
