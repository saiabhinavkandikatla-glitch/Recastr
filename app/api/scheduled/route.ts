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
    void processDueScheduledNotifications({ userId: user.id }).catch((error) => {
      console.error("Failed to process due scheduled notifications in background:", error);
    });

    const url = new URL(request.url);
    const filter = url.searchParams.get("filter") ?? "all";
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const localPosts = shouldUseLocalSchedules()
      ? listStoredScheduledPosts().filter((post) => ["PENDING", "SCHEDULED"].includes(post.status))
      : [];
    const posts = await withTimeout(
      prisma.scheduledPost.findMany({
      where: {
        userId: user.id,
        status: { in: ["pending", "scheduled", "processing"] },
      },
      include: { content: true },
      orderBy: { scheduledAt: "asc" },
      }),
      localPosts.length ? 1_200 : 4_000,
      [],
    );

    return ok(
      [
        ...posts.map((post) => ({
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
        ...localPosts,
      ]
        .filter((post) => {
          const scheduledAt = new Date(post.publishAt);
          const timestamp = scheduledAt.getTime();
          if (filter === "upcoming") return timestamp >= now;
          if (filter === "today") return scheduledAt.toDateString() === new Date().toDateString();
          if (filter === "week") return timestamp >= now && timestamp <= now + week;
          return true;
        })
        .sort((a, b) => new Date(a.publishAt).getTime() - new Date(b.publishAt).getTime()),
    );
  } catch (error) {
    return apiError(error, "scheduled_fetch_failed", 500);
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
