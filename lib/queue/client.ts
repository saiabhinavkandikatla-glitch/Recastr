import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

export const jobNames = {
  publishPost: "PUBLISH_POST",
  exportNotion: "EXPORT_NOTION",
  processAudioChunk: "PROCESS_AUDIO_CHUNK",
  extractHooks: "EXTRACT_HOOKS",
} as const;

let connection: IORedis | undefined;
let queue: Queue | undefined;

export function getQueueConnection() {
  if (connection) return connection;
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {

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
  return new Worker(
    "recastr-jobs",
    async (job) => {

      return { processed: job.name };
    },
    { connection: redis as never },
  );
}
