import { getRequestUser } from "@/lib/auth";
import { ok } from "@/lib/api-response";
import { apiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma/client";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    if (process.env.RECASTR_DEMO_MODE === "true") {
      return ok({ projects: 3, contentCount: 42, scheduled: 6 });
    }

    const [projects, contentCount, scheduled] = await Promise.all([
      prisma.project.count({ where: { userId: user.id } }),
      prisma.content.count({ where: { project: { userId: user.id } } }),
      prisma.scheduledPost.count({
        where: { userId: user.id, status: { in: ["pending", "scheduled"] } },
      }),
    ]);

    return ok({ projects, contentCount, scheduled });
  } catch (error) {
    return apiError(error, "usage_fetch_failed", 500);
  }
}
