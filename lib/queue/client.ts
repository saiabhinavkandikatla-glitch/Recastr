import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import type { Prisma } from "@prisma/client";
import { assertEmailConfigured, sendScheduledPostNotificationEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma/client";

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
    throw new Error("REDIS_URL is required to send scheduled post notification emails.");
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

export async function addRecastrJob(
  name: string,
  data: object,
  delay = 0,
  options: { required?: boolean } = {},
) {
  const recastrQueue = getRecastrQueue();
  if (!recastrQueue) {
    if (options.required) {
      throw new Error("Scheduled notifications require REDIS_URL and a running Recastr worker.");
    }
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
        const result = await notifyScheduledPost(job.data.scheduledPostId);
        await markJobRecord(job.data.jobRecordId, "complete", 100, result);
        return result;
      }

      if (job.name === jobNames.scheduleReminder) {
        const result = { ignored: true, reason: "schedule reminders are sent by PUBLISH_POST jobs" };
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

async function notifyScheduledPost(scheduledPostId: string | undefined) {
  if (!scheduledPostId) throw new Error("scheduledPostId is required");
  assertEmailConfigured();

  const post = await prisma.scheduledPost.findUnique({
    where: { id: scheduledPostId },
    include: {
      content: {
        include: { project: true },
      },
      user: {
        select: {
          email: true,
          notifyScheduleReminder: true,
        },
      },
    },
  });

  if (!post) throw new Error("Scheduled post not found");

  if (!["pending", "scheduled"].includes(post.status.toLowerCase())) {
    return {
      skipped: true,
      reason: `status_${post.status}`,
      scheduledPostId: post.id,
    };
  }

  if (post.scheduledAt.getTime() - Date.now() > 60_000) {
    return {
      skipped: true,
      reason: "rescheduled_for_later",
      scheduledPostId: post.id,
      scheduledAt: post.scheduledAt.toISOString(),
    };
  }

  try {
    if (post.user.notifyScheduleReminder) {
      await sendScheduledPostNotificationEmail({
        userEmail: post.user.email,
        platform: post.platform,
        postBody: post.content.body,
        scheduledAt: post.scheduledAt,
        projectTitle: post.content.project.title,
      });
    }

    await prisma.scheduledPost.update({
      where: { id: post.id },
      data: { status: "notified", publishedAt: new Date(), failReason: null },
    });

    return {
      notified: post.user.notifyScheduleReminder,
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
