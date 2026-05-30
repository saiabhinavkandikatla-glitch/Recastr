import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import type { Prisma } from "@prisma/client";
import { sendPublishedEmail, sendScheduleReminderEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";
import { publishToInstagram } from "@/lib/social/instagram";
import { publishToLinkedIn } from "@/lib/social/linkedin";
import { publishToTwitter } from "@/lib/social/twitter";
import type { PublishingPlatform } from "@/lib/social/types";

export const jobNames = {
  publishPost: "PUBLISH_POST",
  scheduleReminder: "SCHEDULE_REMINDER",
  exportNotion: "EXPORT_NOTION",
  processAudioChunk: "PROCESS_AUDIO_CHUNK",
  extractHooks: "EXTRACT_HOOKS",
} as const;

let connection: IORedis | undefined;
let queue: Queue | undefined;

export function getQueueConnection() {
  if (connection) return connection;
  const redisUrl = env.redisUrl;
  if (!redisUrl) {
    if (env.demoMode) return null;
    throw new Error("REDIS_URL is required when demo mode is off");
  }
  connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
  return connection;
}

export function getQueue(name: string) {
  if (queue) return queue;
  const redis = getQueueConnection();
  if (!redis) return null;
  queue = new Queue(name, { connection: redis as never });
  return queue;
}

export function getRecastrQueue() {
  return getQueue("recastr-jobs");
}

export async function addRecastrJob(name: string, data: object, delay = 0) {
  const recastrQueue = getRecastrQueue();
  if (!recastrQueue) {
    return { id: `demo-job-${Date.now()}` };
  }
  const record = await prisma.jobRecord.create({
    data: { type: name, status: "SCHEDULED", payload: data as Prisma.InputJsonValue },
  });
  return recastrQueue.add(name, { ...data, jobRecordId: record.id }, { delay });
}

export function createRecastrWorker() {
  const redis = getQueueConnection();
  if (!redis) return undefined;
  return new Worker<RecastrJobData>(
    "recastr-jobs",
    async (job) => {
      await markJobRecord(job.data.jobRecordId, "processing", 25);

      if (job.name === jobNames.publishPost) {
        const result = await publishScheduledPost(job.data.scheduledPostId);
        await markJobRecord(job.data.jobRecordId, "complete", 100, result);
        return result;
      }

      if (job.name === jobNames.scheduleReminder) {
        const result = await sendScheduleReminder(job.data.scheduledPostId);
        await markJobRecord(job.data.jobRecordId, "complete", 100, result);
        return result;
      }

      const result = { processed: job.name };
      await markJobRecord(job.data.jobRecordId, "complete", 100, result);
      return result;
    },
    { connection: redis as never },
  );
}

type RecastrJobData = {
  scheduledPostId?: string;
  jobRecordId?: string;
};

async function publishScheduledPost(scheduledPostId: string | undefined) {
  if (!scheduledPostId) throw new Error("scheduledPostId is required");

  const post = await prisma.scheduledPost.findUnique({
    where: { id: scheduledPostId },
    include: {
      content: true,
      user: { include: { socialAccounts: true } },
    },
  });

  if (!post) throw new Error("Scheduled post not found");
  const platform = toPublishingPlatform(post.platform);
  if (!platform) {
    await markScheduledPostFailed(post.id, `${post.platform} publishing is not supported yet`);
    throw new Error(`${post.platform} publishing is not supported yet`);
  }

  const account = post.user.socialAccounts.find((item) => item.platform === platform);
  if (!account) {
    await markScheduledPostFailed(post.id, `No connected ${platform} account`);
    throw new Error(`No connected ${platform} account`);
  }

  try {
    if (platform === "twitter") await publishToTwitter(account, post.content.body);
    if (platform === "linkedin") await publishToLinkedIn(account, post.content.body);
    if (platform === "instagram") await publishToInstagram(account, post.content.body);

    await prisma.scheduledPost.update({
      where: { id: post.id },
      data: { status: "published", publishedAt: new Date(), failReason: null },
    });

    if (post.user.notifyContentReady) {
      await sendPublishedEmail(post.user.email, platform);
    }
    return { published: true, scheduledPostId: post.id, platform };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown publish error";
    await markScheduledPostFailed(post.id, message);
    throw error;
  }
}

async function sendScheduleReminder(scheduledPostId: string | undefined) {
  if (!scheduledPostId) throw new Error("scheduledPostId is required");

  const post = await prisma.scheduledPost.findUnique({
    where: { id: scheduledPostId },
    include: { user: true },
  });

  if (!post || !post.user.notifyScheduleReminder) {
    return { reminded: false, scheduledPostId };
  }

  await sendScheduleReminderEmail(post.user.email, post.platform, post.scheduledAt);
  return { reminded: true, scheduledPostId };
}

async function markScheduledPostFailed(id: string, message: string) {
  await prisma.scheduledPost.update({
    where: { id },
    data: { status: "failed", failReason: message },
  });
}

async function markJobRecord(
  id: string | undefined,
  status: string,
  progress: number,
  result?: object,
) {
  if (!id) return;
  await prisma.jobRecord
    .update({
      where: { id },
      data: {
        status,
        progress,
        result: result ? (result as Prisma.InputJsonValue) : undefined,
      },
    })
    .catch(() => undefined);
}

function toPublishingPlatform(platform: string): PublishingPlatform | null {
  const normalized = platform.toLowerCase();
  if (normalized === "twitter" || normalized === "x") return "twitter";
  if (normalized === "linkedin") return "linkedin";
  if (normalized === "instagram") return "instagram";
  return null;
}
