// System mocks for SSC CGL — visible to every enrolled user.
// Run: npx tsx seed/mocks/ssc-cgl-system.ts

import { PrismaClient } from "@prisma/client";
import { seedSystemMock } from "./_seed";
import type { SystemMock } from "./_types";

const prisma = new PrismaClient();

const mocks: SystemMock[] = [
  {
    examCode: "SSC_CGL",
    slug: "ssc-cgl-2024-shift1",
    title: "SSC CGL 2024 — Tier 1 (Shift 1)",
    type: "PYQ_FULL",
    description:
      "Actual SSC CGL Tier 1 paper from 9 Sep 2024, Shift 1. Source: ssc.nic.in.",
    durationMin: 60,
    picker: {
      kind: "PRESET_IDS",
      questionTags: ["pyq:SSC_CGL:2024:Tier 1 — Shift 1:q01-percentage",
                      "pyq:SSC_CGL:2024:Tier 1 — Shift 1:q02-blood-relations",
                      "pyq:SSC_CGL:2024:Tier 1 — Shift 1:q03-sentence-correction"],
    },
  },
  {
    examCode: "SSC_CGL",
    slug: "quant-arithmetic-warmup",
    title: "Quant — Arithmetic Warm-up",
    type: "TOPIC_DRILL",
    description: "10 mixed arithmetic questions to refresh percentage, ratio, and time-work basics.",
    durationMin: 15,
    picker: {
      kind: "TOPIC_FILTER",
      topicCodes: [
        "quant.percentage",
        "quant.ratio",
        "quant.time_work",
        "quant.profit_loss",
      ],
      difficultyMix: { EASY: 6, MEDIUM: 4, HARD: 0 },
      count: 10,
    },
  },
];

async function main() {
  for (const m of mocks) {
    try {
      await seedSystemMock(m);
    } catch (err: any) {
      console.error(`✗ ${m.slug}: ${err?.message ?? err}`);
    }
  }
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
