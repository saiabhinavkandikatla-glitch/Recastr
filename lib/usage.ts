import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

export async function recordUsageEvent({
  userId,
  eventType,
  metadata,
}: {
  userId: string;
  eventType: string;
  metadata?: Prisma.InputJsonValue;
}) {

  await prisma.usageEvent
    .create({
      data: {
        userId,
        eventType,
        metadata,
      },
    })
    .catch(() => undefined);
}
