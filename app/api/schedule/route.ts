import { Prisma } from "@prisma/client";
import { getRequestUser } from "@/lib/auth";
import type { AuthenticatedUser } from "@/lib/auth";
import { scheduleSchema } from "@/lib/ai/schemas";
import { assertEmailTransportReady } from "@/lib/email";
import { env } from "@/lib/env";
import { getPlatformCharacterLimit } from "@/lib/platform-limits";
import { assertCanScheduleReminder, planLimitErrorResponse } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma/client";
import { createStoredScheduledPost, getStoredProject, listStoredScheduledPosts } from "@/lib/projects/store";
import { addRecastrJob, jobNames } from "@/lib/queue/client";
import { apiError } from "@/lib/api/response";
import { recordAuditLog } from "@/lib/audit-log";
import { processDueScheduledNotifications } from "@/lib/scheduled-notifications";

export const runtime = "nodejs";

type ScheduleRecoveryPayload = {
  projectId?: string;
  projectTitle?: string;
  body?: string;
  originalBody?: string;
  contentType?: string;
  tone?: string;
  platform: string;
};

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    await processDueScheduledNotifications({ userId: user.id });

    const localPosts = shouldUseLocalSchedules()
      ? listStoredScheduledPosts().filter((post) => ["PENDING", "SCHEDULED"].includes(post.status))
      : [];
    if (env.demoMode && !env.requireAuth) {
      return Response.json(groupByDate(localPosts));
    }

    const posts = await prisma.scheduledPost.findMany({
      where: { userId: user.id },
      include: { content: true },
      orderBy: { scheduledAt: "asc" },
    });

    return Response.json(
      groupByDate(
        [
          ...posts.map((post) => ({
            id: post.id,
            outputId: post.contentId,
            contentId: post.contentId,
            platform: post.platform,
            postingMethod: post.postingMethod as "email_reminder" | "direct_post",
            publishAt: post.scheduledAt.toISOString(),
            scheduledAt: post.scheduledAt.toISOString(),
            status: post.status.toUpperCase(),
            title: post.content.contentType,
            timezone: post.timezone,
            verificationRequired: post.verificationRequired,
            verifiedByUser: post.verifiedByUser,
          })),
          ...localPosts,
        ],
      ),
    );
  } catch (error) {
    return apiError(error, "schedule_fetch_failed", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request);
    const payload = scheduleSchema.parse(await request.json());
    const scheduledAt = new Date(payload.scheduledAt ?? payload.publishAt ?? "");
    if (scheduledAt.getTime() <= Date.now()) {
      return Response.json(
        { error: "scheduledAt must be in the future", code: "invalid_schedule_time", status: 400 },
        { status: 400 },
      );
    }
    await assertCanScheduleReminder(user, payload.platform);

    if (payload.postingMethod === "direct_post") {
      return Response.json(
        {
          error: "Direct posting is not enabled yet. Use email reminders for now.",
          code: "direct_posting_not_enabled",
          status: 409,
        },
        { status: 409 },
      );
    }

    const contentId = payload.contentId ?? payload.outputId ?? "";
    if (env.demoMode && !env.requireAuth) {
      const post = createStoredScheduledPost({
        contentId,
        platform: payload.platform,
        scheduledAt,
      });
      return Response.json(
        {
          contentId,
          outputId: contentId,
          platform: payload.platform,
          postingMethod: payload.postingMethod,
          scheduledPostId: post.id,
          publishAt: post.publishAt,
          scheduledAt: post.scheduledAt,
          status: post.status,
          title: payload.contentType ?? "Post",
        },
        { status: 201 },
      );
    }
    let content = await prisma.content.findFirst({
      where: {
        id: contentId,
        project: {
          userId: user.id,
        },
      },
      select: { id: true, body: true, platform: true },
    });

    if (!content && isLocalDemoContent(contentId)) {
      content = await persistStoredContentForScheduling(user, contentId, payload);
    }

    if (!content) {
      return Response.json(
        { error: "Content not found", code: "content_not_found", status: 404 },
        { status: 404 },
      );
    }

    const limit = getPlatformCharacterLimit(content.platform);
    if (content.body.length > limit) {
      return Response.json(
        {
          error: `Content exceeds the ${limit} character limit for ${content.platform}`,
          code: "platform_limit_exceeded",
          status: 422,
        },
        { status: 422 },
      );
    }
    await assertEmailTransportReady();

    const scheduledPost = await prisma.scheduledPost.upsert({
      where: { contentId },
      update: {
        platform: payload.platform,
        postingMethod: payload.postingMethod,
        scheduledAt,
        timezone: payload.timezone,
        verificationRequired: payload.verificationRequired,
        verifiedByUser: payload.postingMethod === "email_reminder",
        verifiedAt: payload.postingMethod === "email_reminder" ? new Date() : null,
        status: "pending",
        publishedAt: null,
        failReason: null,
        attempts: 0,
      },
      create: {
        contentId,
        userId: user.id,
        platform: payload.platform,
        postingMethod: payload.postingMethod,
        scheduledAt,
        timezone: payload.timezone,
        verificationRequired: payload.verificationRequired,
        verifiedByUser: payload.postingMethod === "email_reminder",
        verifiedAt: payload.postingMethod === "email_reminder" ? new Date() : null,
        status: "pending",
      },
    });
    const delay = Math.max(0, scheduledAt.getTime() - Date.now());
    await addRecastrJob(
      jobNames.publishPost,
      { scheduledPostId: scheduledPost.id },
      delay,
      { required: false },
    );
    await recordAuditLog({
      userId: user.id,
      action: "content_scheduled",
      entityType: "scheduled_post",
      entityId: scheduledPost.id,
      metadata: { contentId, platform: payload.platform, scheduledAt: scheduledAt.toISOString() },
      request,
    });

    return Response.json(
      {
        contentId: scheduledPost.contentId,
        outputId: scheduledPost.contentId,
        platform: scheduledPost.platform,
        postingMethod: scheduledPost.postingMethod,
        scheduledPostId: scheduledPost.id,
        publishAt: scheduledAt.toISOString(),
        scheduledAt: scheduledAt.toISOString(),
        status: scheduledPost.status.toUpperCase(),
        title: payload.contentType ?? "Post",
        timezone: scheduledPost.timezone,
        verificationRequired: scheduledPost.verificationRequired,
        verifiedByUser: scheduledPost.verifiedByUser,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Response) return error;
    const planResponse = planLimitErrorResponse(error);
    if (planResponse) return planResponse;
    return apiError(error, "schedule_failed", 400);
  }
}

function shouldUseLocalSchedules() {
  return process.env.NODE_ENV !== "production" || env.demoMode;
}

function isLocalDemoContent(contentId: string) {
  return /^(demo|youtube|text|blog|podcast)-/.test(contentId);
}

async function persistStoredContentForScheduling(
  user: AuthenticatedUser,
  contentId: string,
  payload: ScheduleRecoveryPayload,
) {
  const rawProjectId = payload.projectId ?? projectIdFromContentId(contentId);
  if (!rawProjectId) return null;

  const project = getStoredProject(rawProjectId);
  const storedContent = project?.contents?.find((item) => item.id === contentId);
  const body = payload.body ?? storedContent?.body;
  if (!body) return null;

  const originalBody = payload.originalBody ?? storedContent?.originalBody ?? body;
  const contentType = payload.contentType ?? storedContent?.contentType ?? "Post";
  const tone = payload.tone ?? storedContent?.tone ?? "casual";
  const platform = payload.platform;
  const title = project?.title ?? payload.projectTitle ?? "Recovered scheduled content";
  const transcript = project?.transcript ?? body;
  const sourceType = project?.sourceType.toLowerCase() ?? "text";
  const summary = project?.summary ? (project.summary as Prisma.InputJsonValue) : undefined;

  // Suffix the IDs if it is a demo project to isolate it per user in the database
  const projectId = rawProjectId.startsWith("demo-") ? `${rawProjectId}-${user.id}` : rawProjectId;
  const dbContentId = contentId.startsWith("demo-") ? `${contentId}-${user.id}` : contentId;

  const existingProject = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  });
  if (existingProject && existingProject.userId !== user.id) return null;

  await prisma.project.upsert({
    where: { id: projectId },
    update: {
      title,
      sourceUrl: project?.sourceUrl,
      sourceType,
      thumbnailUrl: project?.thumbnailUrl,
      transcript,
      summary,
      duration: project?.duration,
      wordCount: project?.wordCount ?? body.split(/\s+/).filter(Boolean).length,
    },
    create: {
      id: projectId,
      userId: user.id,
      title,
      sourceUrl: project?.sourceUrl,
      sourceType,
      thumbnailUrl: project?.thumbnailUrl,
      transcript,
      summary,
      duration: project?.duration,
      wordCount: project?.wordCount ?? body.split(/\s+/).filter(Boolean).length,
    },
  });

  await prisma.content.upsert({
    where: { id: dbContentId },
    update: {
      projectId,
      
      platform,
      contentType,
      body,
      originalBody,
      tone,
      approved: storedContent?.approved ?? false,
      order: storedContent?.order ?? 0,
    },
    create: {
      id: dbContentId,
      projectId,
      
      platform,
      contentType,
      body,
      originalBody,
      tone,
      approved: storedContent?.approved ?? false,
      order: storedContent?.order ?? 0,
    },
  });

  return {
    id: dbContentId,
    body,
    platform,
  };
}

function projectIdFromContentId(contentId: string) {
  return contentId.match(/^(.*)-content-\d+$/)?.[1];
}

function groupByDate<T extends { publishAt: string }>(posts: T[]) {
  return posts.reduce<Record<string, T[]>>((acc, post) => {
    const date = post.publishAt.slice(0, 10);
    acc[date] = [...(acc[date] ?? []), post];
    return acc;
  }, {});
}
