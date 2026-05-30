import cron from "node-cron";
import { createRecastrWorker } from "@/lib/queue/client";
import { assertEmailConfigured, sendWeeklyDigestEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";

if (!env.demoMode) {
  assertEmailConfigured();
}

const worker = createRecastrWorker();
if (!worker && !env.demoMode) {
  throw new Error("Recastr worker did not start. Check REDIS_URL.");
}

cron.schedule("30 3 * * 1", async () => {
  if (env.demoMode) return;

  const users = await prisma.user.findMany({
    where: { notifyWeeklyDigest: true },
    select: { id: true, email: true },
  });

  for (const user of users) {
    const [projects, content, scheduled] = await Promise.all([
      prisma.project.count({ where: { userId: user.id } }),
      prisma.content.count({ where: { project: { userId: user.id } } }),
      prisma.scheduledPost.count({ where: { userId: user.id } }),
    ]);

    await sendWeeklyDigestEmail(user.email, { projects, content, scheduled });
  }
});
