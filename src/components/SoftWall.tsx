// The sign-up wall experiment (27 Sep 2026) — see src/lib/soft-wall.ts.
// Server component: the registration-wall markup is rendered here, outside
// the client island (a <script> inside the island broke hydration), then
// the full content inside SoftWallClient.

import type { ReactNode } from "react";
import { SOFT_WALL_JSON_LD } from "@/lib/soft-wall";
import { SoftWallClient } from "./SoftWallClient";

export function SoftWall({ children }: { children: ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFT_WALL_JSON_LD) }} />
      <SoftWallClient>{children}</SoftWallClient>
    </>
  );
}
