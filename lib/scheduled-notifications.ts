import { sendScheduledPostNotificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma/client";

const ACTIVE_STATUSES = ["pending", "scheduled", "PENDING", "SCHEDULED"];
const RETRYABLE_STATUSES = [...ACTIVE_STATUSES, "failed", "FAILED"];
const FAILED_RETRY_DELAY_MS = 10 * 60 * 1000;
const PROCESSING_STALE_AFTER_MS = 10 * 60 * 1000;

type ProcessDueOptions = {
  userId?: string;
  limit?: number;
};

export async function processDueScheduledNotifications({
  userId,
  limit = 25,
}: ProcessDueOptions = {}) {
  const now = new Date();
  const failedRetryCutoff = new Date(now.getTime() - FAILED_RETRY_DELAY_MS);
  const staleProcessingCutoff = new Date(now.getTime() - PROCESSING_STALE_AFTER_MS);
  const duePosts = await prisma.scheduledPost.findMany({
    where: {
      ...(userId ? { userId } : {}),
      postingMethod: "email_reminder",
      scheduledAt: { lte: now },
      OR: [
        { status: { in: ACTIVE_STATUSES } },
        { status: { in: ["failed", "FAILED"] }, updatedAt: { lte: failedRetryCutoff } },
        { status: { in: ["processing", "PROCESSING"] }, updatedAt: { lte: staleProcessingCutoff } },
      ],
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
    select: { id: true, postingMethod: true, status: true, scheduledAt: true, updatedAt: true },
  });

  if (!existing) throw new Error("Scheduled post not found");

  if (existing.postingMethod !== "email_reminder") {
    return {
      skipped: true,
      reason: `posting_method_${existing.postingMethod}`,
      scheduledPostId,
    };
  }

  const normalizedStatus = existing.status.toLowerCase();
  const processingIsStale =
    normalizedStatus === "processing" &&
    existing.updatedAt.getTime() <= Date.now() - PROCESSING_STALE_AFTER_MS;
  const canNotify =
    ["pending", "scheduled", "failed"].includes(normalizedStatus) ||
    processingIsStale;

  if (!canNotify) {
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
      postingMethod: "email_reminder",
      OR: [
        { status: { in: RETRYABLE_STATUSES } },
        { status: { in: ["processing", "PROCESSING"] }, updatedAt: { lte: new Date(Date.now() - PROCESSING_STALE_AFTER_MS) } },
      ],
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
      data: { attempts: { increment: 1 }, status: "notified", publishedAt: new Date(), failReason: null },
    });
    await prisma.postHistory.create({
      data: {
        platform: post.platform,
        postedAt: new Date(),
        scheduledPostId: post.id,
        status: "sent_email",
      },
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
  const post = await prisma.scheduledPost.update({
    where: { id },
    data: { attempts: { increment: 1 }, status: "failed", failReason: message },
    select: { id: true, platform: true },
  });
  await prisma.postHistory.create({
    data: {
      errorDetails: message,
      platform: post.platform,
      scheduledPostId: post.id,
      status: "failed",
    },
  });
}
