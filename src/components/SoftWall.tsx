// The sign-up wall experiment (27 Sep 2026) — see src/lib/soft-wall.ts.
// Server component: the registration-wall markup is rendered here, outside
// the client island (a <script> inside the island broke hydration), then
// the full content inside SoftWallClient.

import type { ReactNode } from "react";
import { SOFT_WALL_JSON_LD, SOFT_WALL_ON } from "@/lib/soft-wall";
import { SoftWallClient } from "./SoftWallClient";

export function SoftWall({ children }: { children: ReactNode }) {
  // 29 Sep 2026: experiment stopped (SOFT_WALL_ON) — the page as it is, no markup, no client island.
  if (!SOFT_WALL_ON) return <>{children}</>;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFT_WALL_JSON_LD) }} />
      <SoftWallClient>{children}</SoftWallClient>
    </>
  );
}
