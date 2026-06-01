import { sendScheduledPostNotificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma/client";

const ACTIVE_STATUSES = ["pending", "scheduled", "PENDING", "SCHEDULED"];

type ProcessDueOptions = {
  userId?: string;
  limit?: number;
};

export async function processDueScheduledNotifications({
  userId,
  limit = 25,
}: ProcessDueOptions = {}) {
  const duePosts = await prisma.scheduledPost.findMany({
    where: {
      ...(userId ? { userId } : {}),
      status: { in: ACTIVE_STATUSES },
      scheduledAt: { lte: new Date() },
    },
    orderBy: { scheduledAt: "asc" },
    select: { id: true },
    take: limit,
  });

  const results = [];
  for (const post of duePosts) {
    try {
      results.push(await notifyScheduledPost(post.id));
    } catch (error) {
      results.push({
        failed: true,
        scheduledPostId: post.id,
        error: error instanceof Error ? error.message : "Unknown notification error",
      });
    }
  }

  return {
    processed: results.length,
    results,
  };
}

export async function notifyScheduledPost(scheduledPostId: string | undefined) {
  if (!scheduledPostId) throw new Error("scheduledPostId is required");

  const existing = await prisma.scheduledPost.findUnique({
    where: { id: scheduledPostId },
    select: { id: true, status: true, scheduledAt: true },
  });

  if (!existing) throw new Error("Scheduled post not found");

  if (!["pending", "scheduled"].includes(existing.status.toLowerCase())) {
    return {
      skipped: true,
      reason: `status_${existing.status}`,
      scheduledPostId,
    };
  }

  if (existing.scheduledAt.getTime() - Date.now() > 60_000) {
    return {
      skipped: true,
      reason: "rescheduled_for_later",
      scheduledPostId,
      scheduledAt: existing.scheduledAt.toISOString(),
    };
  }

  const claim = await prisma.scheduledPost.updateMany({
    where: {
      id: scheduledPostId,
      status: { in: ACTIVE_STATUSES },
    },
    data: {
      status: "processing",
      failReason: null,
    },
  });

  if (claim.count === 0) {
    const current = await prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId },
      select: { status: true },
    });
    return {
      skipped: true,
      reason: current ? `status_${current.status}` : "not_found",
      scheduledPostId,
    };
  }

  const post = await prisma.scheduledPost.findUnique({
    where: { id: scheduledPostId },
    include: {
      content: {
        include: { project: true },
      },
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!post) throw new Error("Scheduled post not found");

  try {
    await sendScheduledPostNotificationEmail({
      userEmail: post.user.email,
      platform: post.platform,
      postBody: post.content.body,
      scheduledAt: post.scheduledAt,
      projectTitle: post.content.project.title,
    });

    await prisma.scheduledPost.update({
      where: { id: post.id },
      data: { status: "notified", publishedAt: new Date(), failReason: null },
    });

    return {
      notified: true,
      scheduledPostId: post.id,
      platform: post.platform,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown notification error";
    await markScheduledPostFailed(post.id, message);
    throw error;
  }
}

async function markScheduledPostFailed(id: string, message: string) {
  await prisma.scheduledPost.update({
    where: { id },
    data: { status: "failed", failReason: message },
  });
}
