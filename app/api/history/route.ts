import { ok } from "@/lib/api-response";
import { apiError } from "@/lib/api/response";
import { getRequestUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma/client";
import { listStoredScheduledPosts } from "@/lib/projects/store";
import { processDueScheduledNotifications } from "@/lib/scheduled-notifications";
import type { Platform, PostStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    await processDueScheduledNotifications({ userId: user.id });

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const platform = url.searchParams.get("platform");
    const status = url.searchParams.get("status");
    const pageSize = 20;
    const where = {
      userId: user.id,
      status: {
        in: ["notified", "published", "failed", "cancelled"],
      },
      ...(platform ? { platform: platform.toUpperCase() } : {}),
      ...(status ? { status: status.toLowerCase() } : {}),
    };
    const localItems = shouldUseLocalSchedules()
      ? listStoredScheduledPosts()
          .filter((post) => ["NOTIFIED", "PUBLISHED", "FAILED", "CANCELLED"].includes(post.status))
          .filter((post) => !platform || post.platform === platform.toUpperCase())
          .filter((post) => !status || post.status === status.toUpperCase())
      : [];
    const [items, total] = await withTimeout(
      Promise.all([
        prisma.scheduledPost.findMany({
          where,
          include: { content: true },
          orderBy: { scheduledAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.scheduledPost.count({ where }),
      ]),
      localItems.length ? 1_200 : 4_000,
      [[], 0],
    );
    const mappedItems = [
      ...items.map((post) => ({
          id: post.id,
          outputId: post.contentId,
          contentId: post.contentId,
          platform: post.platform as Platform,
          postingMethod: post.postingMethod as "email_reminder" | "direct_post",
          publishAt: post.scheduledAt.toISOString(),
          scheduledAt: post.scheduledAt.toISOString(),
          status: post.status.toUpperCase() as PostStatus,
          title: post.content.body,
          timezone: post.timezone,
          verificationRequired: post.verificationRequired,
          verifiedByUser: post.verifiedByUser,
          publishedAt: post.publishedAt?.toISOString() ?? null,
          failReason: post.failReason,
        })),
      ...localItems,
    ].sort((a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime());

    return ok({
      items: mappedItems,
      page,
      pageSize,
      total: total + localItems.length,
    });
  } catch (error) {
    return apiError(error, "history_fetch_failed", 500);
  }
}

function shouldUseLocalSchedules() {
  return process.env.NODE_ENV !== "production";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T) {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}
